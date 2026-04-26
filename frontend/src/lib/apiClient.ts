import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ============================================================================
// EXPO-CONSTANTS — optional import with fallback
// expo-constants ships as a transitive dependency of 'expo' and is always
// present in Expo managed workflow. We use a dynamic require so that the
// module never crashes if, for any reason, it isn't resolvable.
// ============================================================================
let _Constants: any = null;
try {
  _Constants = require('expo-constants').default;
} catch {
  // expo-constants not available — IP auto-detection will be skipped
}

const BACKEND_PORT = 5000;

// ============================================================================
// BASE URL RESOLUTION
//
// Priority for native (iOS / Android) platforms:
//   1. EXPO_PUBLIC_API_URL — only if it does NOT contain 'localhost' or
//      '127.0.0.1', so a web-only .env.local never poisons mobile requests.
//   2. Expo dev-server host extracted from expo-constants — when Expo Go
//      connects to your dev server, Constants carries the host IP (e.g.
//      192.168.1.100). We reuse that IP to reach the backend on the same
//      machine, so no manual config is needed on physical devices.
//   3. Android-emulator fallback  → 10.0.2.2 (special loopback alias)
//   4. Final fallback             → localhost (iOS sim / last resort)
//
// For web the env var (or localhost) is used directly — no auto-detection.
// ============================================================================

function getDevServerHost(): string | null {
  if (!_Constants) return null;
  try {
    // Expo SDK 46 + new manifest format
    const hostUri: unknown = _Constants.expoConfig?.hostUri;
    if (typeof hostUri === 'string' && hostUri) {
      const host = hostUri.split(':')[0];
      if (host && !isLoopback(host)) return host;
    }

    // Classic Expo manifest (SDK < 46 / older Expo Go builds)
    const debuggerHost: unknown = _Constants.manifest?.debuggerHost;
    if (typeof debuggerHost === 'string' && debuggerHost) {
      const host = debuggerHost.split(':')[0];
      if (host && !isLoopback(host)) return host;
    }

    // Derive IP from the exp:// linking URI  (e.g. exp://192.168.1.100:8081)
    const linkingUri: unknown = _Constants.linkingUri;
    if (typeof linkingUri === 'string' && linkingUri.startsWith('exp://')) {
      const match = linkingUri.match(/^exp:\/\/([^:\/]+)/);
      if (match?.[1] && !isLoopback(match[1])) return match[1];
    }
  } catch {
    // ignore — Constants API shape differs between SDK versions
  }
  return null;
}

function isLoopback(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2';
}

function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  // ── Web: always use env var or localhost ──────────────────────────────────
  if (Platform.OS === 'web') {
    return envUrl || `http://localhost:${BACKEND_PORT}/api/v1`;
  }

  // ── Native ────────────────────────────────────────────────────────────────

  // 1. Non-localhost explicit env var (e.g. .env.expo-go with a real IP)
  if (envUrl && !/localhost|127\.0\.0\.1/.test(envUrl)) {
    return envUrl;
  }

  // 2. Auto-detect host IP from Expo dev server (Expo Go on physical device)
  const devHost = getDevServerHost();
  if (devHost) {
    return `http://${devHost}:${BACKEND_PORT}/api/v1`;
  }

  // 3. Android emulator — host machine is always reachable via 10.0.2.2
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}/api/v1`;
  }

  // 4. iOS simulator / unknown — use localhost
  return `http://localhost:${BACKEND_PORT}/api/v1`;
}

let BASE_URL: string = resolveBaseUrl();

if (__DEV__) {
  console.log('[API Client] Resolved base URL:', BASE_URL, '| Platform:', Platform.OS);
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

const TOKEN_KEY = 'focusflow_token';
let _tokenCache: string | null = null;

export async function setToken(token: string): Promise<void> {
  _tokenCache = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function loadToken(): Promise<string | null> {
  if (_tokenCache !== null) return _tokenCache;
  const val = await AsyncStorage.getItem(TOKEN_KEY);
  _tokenCache = val;
  return val;
}

export async function clearToken(): Promise<void> {
  _tokenCache = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ============================================================================
// REQUEST ENGINE — retry with exponential back-off
// ============================================================================

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT = 15000; // 15 s — tighter than the old 30 s for faster failure feedback
const DEFAULT_RETRIES = 2;     // 3 total attempts

async function requestWithRetry<T>(
  path: string,
  options: RequestOptions = {},
  attempt = 1,
): Promise<T> {
  const {
    method = 'GET',
    body,
    params,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
  } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const q = qs.toString();
    if (q) url += `?${q}`;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await loadToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Invalid JSON response (HTTP ${res.status}) from ${url}`);
    }

    if (!res.ok) {
      throw new Error(data?.message ?? `Request failed (HTTP ${res.status})`);
    }

    return data as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const e = err instanceof Error ? err : new Error(String(err));
    const isAbort = e.name === 'AbortError';
    const isNetwork =
      isAbort ||
      e.message.includes('Network request failed') ||
      e.message.includes('Failed to fetch');

    // Retry transient errors with exponential back-off
    if (isNetwork && attempt <= retries) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1 s, 2 s, …
      if (__DEV__) {
        console.warn(
          `[API Client] ${e.message} — retrying in ${delay}ms (attempt ${attempt}/${retries + 1})`,
        );
      }
      await new Promise((r) => setTimeout(r, delay));
      return requestWithRetry<T>(path, options, attempt + 1);
    }

    if (isAbort) {
      throw new Error(
        `Request timed out after ${timeout / 1000}s.\n` +
          `Target: ${BASE_URL}\n` +
          `Check that the backend server is running and reachable.`,
      );
    }

    if (isNetwork) {
      throw new Error(
        `Cannot reach the server.\n\n` +
          `Tried: ${BASE_URL}\n\n` +
          `Possible causes:\n` +
          `  • Backend server is not running (start it with: npm run dev)\n` +
          `  • Phone and PC are on different Wi-Fi networks\n` +
          `  • Firewall is blocking port ${BACKEND_PORT}\n\n` +
          `Quick fix — in frontend/.env.local set:\n` +
          `  EXPO_PUBLIC_API_URL=http://<your-pc-ip>:${BACKEND_PORT}/api/v1`,
      );
    }

    throw e;
  }
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    requestWithRetry<T>(path, { params }),
  post: <T>(path: string, body?: unknown) =>
    requestWithRetry<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) =>
    requestWithRetry<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) =>
    requestWithRetry<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) =>
    requestWithRetry<T>(path, { method: 'DELETE' }),
};

// ============================================================================
// CONNECTIVITY UTILITIES
// ============================================================================

export function getApiBaseUrl(): string {
  return BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  BASE_URL = url;
  if (__DEV__) console.log('[API Client] Base URL overridden to:', BASE_URL);
}

/** Ping the health endpoint — useful for debugging connectivity. */
export async function checkBackendConnectivity(): Promise<{
  isReachable: boolean;
  url: string;
  message: string;
}> {
  const healthUrl = BASE_URL.replace(/\/api\/v1\/?$/, '') + '/api/v1/health';
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
    clearTimeout(tid);
    return {
      isReachable: res.ok,
      url: healthUrl,
      message: res.ok
        ? `Backend reachable at ${healthUrl}`
        : `Backend returned HTTP ${res.status}`,
    };
  } catch (err) {
    clearTimeout(tid);
    return {
      isReachable: false,
      url: healthUrl,
      message: `Cannot reach ${healthUrl} — ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
