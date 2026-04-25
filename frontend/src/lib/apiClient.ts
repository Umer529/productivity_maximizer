import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ============================================================================
// ENVIRONMENT-BASED API URL RESOLUTION
// ============================================================================
// Priority order:
//   1. EXPO_PUBLIC_API_URL (from .env.local)
//   2. Auto-detection based on platform & environment
//   3. Fallback to localhost (web) or configured IP
//
// Supported scenarios:
//   - Web browser:        http://localhost:5000/api/v1
//   - Android emulator:   http://10.0.2.2:5000/api/v1
//   - Physical device:    http://<YOUR_PC_IP>:5000/api/v1 (via env var)
//   - iOS simulator:      http://localhost:5000/api/v1
// ============================================================================

function getBaseUrl(): string {
  // Check for explicit env var first (highest priority)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl;
  }

  // Auto-detection for different environments
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  
  // Check if running on Android emulator (common emulator marker)
  if (isAndroid) {
    try {
      // On Android emulator, use 10.0.2.2 to reach the host machine
      return 'http://10.0.2.2:5000/api/v1';
    } catch (err) {
      console.warn('[API Client] Android detection failed, using fallback');
    }
  }

  // Web or iOS - use localhost
  if (isWeb || Platform.OS === 'ios') {
    return 'http://localhost:5000/api/v1';
  }

  // Final fallback: environment variable or localhost
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
}

let BASE_URL: string = getBaseUrl();
const TOKEN_KEY = 'focusflow_token';

let _tokenCache: string | null = null;

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

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
// API RETRY & ERROR HANDLING
// ============================================================================

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 3;

/**
 * Retry logic with exponential backoff
 */
async function requestWithRetry<T>(
  path: string,
  options: RequestOptions = {},
  attempt: number = 1
): Promise<T> {
  const { method = 'GET', body, params, timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) query.set(k, String(v));
    }
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await loadToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Invalid JSON response from server (${res.status})`);
    }

    if (!res.ok) {
      const message = data?.message || `Request failed (${res.status})`;
      throw new Error(message);
    }

    return data as T;
  } catch (err) {
    const isNetworkError = err instanceof Error && (
      err.message.includes('Network request failed') ||
      err.message.includes('Failed to fetch') ||
      err.name === 'AbortError'
    );

    const isTimeoutError = err instanceof Error && err.name === 'AbortError';

    // Retry on network errors or timeouts (but not on the last attempt)
    if ((isNetworkError || isTimeoutError) && attempt < retries) {
      const delayMs = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
      console.warn(
        `[API Client] Request failed (attempt ${attempt}/${retries}), retrying in ${delayMs}ms...`,
        err instanceof Error ? err.message : 'Unknown error'
      );
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return requestWithRetry<T>(path, options, attempt + 1);
    }

    // Handle specific error scenarios
    if (err instanceof Error) {
      if (isNetworkError) {
        throw new Error(
          `Unable to connect to server. Please ensure:\n` +
          `• Backend is running on http://<server-ip>:5000\n` +
          `• You're connected to the same network\n` +
          `• EXPO_PUBLIC_API_URL is set correctly (current: ${BASE_URL})`
        );
      }
      if (isTimeoutError) {
        throw new Error('Request timeout. The server is taking too long to respond.');
      }
      throw err;
    }

    throw new Error('An unexpected error occurred during the API request');
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestWithRetry<T>(path, options);
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ============================================================================
// CONNECTIVITY UTILITIES
// ============================================================================

/**
 * Get the current API base URL (useful for debugging)
 */
export function getApiBaseUrl(): string {
  return BASE_URL;
}

/**
 * Update the API base URL at runtime (useful for testing/switching servers)
 */
export function setApiBaseUrl(url: string): void {
  BASE_URL = url;
  console.log('[API Client] Base URL updated to:', BASE_URL);
}

/**
 * Check if the backend is reachable (useful before making requests)
 */
export async function checkBackendConnectivity(): Promise<{ isReachable: boolean; message: string }> {
  try {
    const response = await fetch(`${BASE_URL.replace('/api/v1', '')}/api/v1/health`, {
      method: 'GET',
      timeout: 10000,
    });
    
    if (response.ok) {
      return {
        isReachable: true,
        message: `✓ Backend is reachable at ${BASE_URL}`,
      };
    }

    return {
      isReachable: false,
      message: `✗ Backend responded with status ${response.status}`,
    };
  } catch (err) {
    return {
      isReachable: false,
      message: `✗ Cannot reach backend at ${BASE_URL}. Error: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`,
    };
  }
}
