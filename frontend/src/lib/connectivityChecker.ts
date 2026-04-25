/**
 * Connectivity Checker Utility
 * 
 * Provides utilities for checking backend connectivity and diagnosing network issues.
 * Useful for debugging cross-platform setup issues.
 */

import { api, getApiBaseUrl, checkBackendConnectivity } from './apiClient';

export interface ConnectivityStatus {
  isHealthy: boolean;
  timestamp: string;
  apiUrl: string;
  checks: {
    backendReachable: boolean;
    apiHealthy: boolean;
    corsWorking: boolean;
    message: string;
  };
  diagnostics?: {
    platform: string;
    apiEndpoint: string;
    attemptedConnections: string[];
    lastError?: string;
  };
}

/**
 * Run a comprehensive connectivity check
 * @returns Promise with full diagnostic information
 */
export async function runConnectivityCheck(): Promise<ConnectivityStatus> {
  const startTime = Date.now();
  const apiUrl = getApiBaseUrl();
  const checks = {
    backendReachable: false,
    apiHealthy: false,
    corsWorking: false,
    message: 'Starting connectivity checks...',
  };

  try {
    // Check 1: Can we reach the backend?
    const healthCheckResult = await checkBackendConnectivity();
    checks.backendReachable = healthCheckResult.isReachable;

    if (!checks.backendReachable) {
      return {
        isHealthy: false,
        timestamp: new Date().toISOString(),
        apiUrl,
        checks: {
          ...checks,
          message: healthCheckResult.message,
        },
        diagnostics: {
          platform: getPlatformInfo(),
          apiEndpoint: apiUrl,
          attemptedConnections: [apiUrl],
          lastError: healthCheckResult.message,
        },
      };
    }

    // Check 2: Is the API actually responding correctly?
    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        timeout: 10000,
      });
      checks.apiHealthy = response.ok;

      if (response.ok) {
        const data = await response.json();
        checks.message = `✓ API is healthy: ${data.message || 'Backend responding'}`;
      }
    } catch (err) {
      checks.apiHealthy = false;
      checks.message = `✗ API health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }

    // Check 3: CORS working?
    try {
      // Make an actual API call to check CORS
      await api.get('/health');
      checks.corsWorking = true;
      checks.message = '✓ Backend is fully operational';
    } catch (err) {
      // Check if it's a CORS error
      const error = err instanceof Error ? err.message : String(err);
      if (error.includes('CORS') || error.includes('Access')) {
        checks.corsWorking = false;
        checks.message = `✗ CORS error detected: ${error}`;
      } else {
        // Other error, but not CORS
        checks.corsWorking = true; // CORS itself isn't the issue
        checks.message = `Connected but got: ${error}`;
      }
    }

    const elapsedMs = Date.now() - startTime;

    return {
      isHealthy: checks.backendReachable && checks.apiHealthy,
      timestamp: new Date().toISOString(),
      apiUrl,
      checks,
      diagnostics: {
        platform: getPlatformInfo(),
        apiEndpoint: apiUrl,
        attemptedConnections: [apiUrl],
        responseTime: `${elapsedMs}ms`,
      },
    };
  } catch (err) {
    const elapsedMs = Date.now() - startTime;

    return {
      isHealthy: false,
      timestamp: new Date().toISOString(),
      apiUrl,
      checks: {
        ...checks,
        message: `✗ Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      },
      diagnostics: {
        platform: getPlatformInfo(),
        apiEndpoint: apiUrl,
        attemptedConnections: [apiUrl],
        responseTime: `${elapsedMs}ms`,
        lastError: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

/**
 * Get platform information for diagnostics
 */
function getPlatformInfo(): string {
  if (typeof window === 'undefined') {
    return 'Unknown';
  }

  const userAgent = navigator.userAgent;
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';

  return 'Unknown';
}

/**
 * Format connectivity status for display
 */
export function formatConnectivityStatus(status: ConnectivityStatus): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CONNECTIVITY CHECK REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️  Timestamp:  ${status.timestamp}
🌐 API URL:    ${status.apiUrl}
📱 Platform:   ${status.diagnostics?.platform || 'Unknown'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CHECKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Backend Reachable: ${status.checks.backendReachable ? 'YES' : 'NO'}
✓ API Healthy:      ${status.checks.apiHealthy ? 'YES' : 'NO'}
✓ CORS Working:     ${status.checks.corsWorking ? 'YES' : 'NO'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OVERALL STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${status.isHealthy ? '✅ ALL SYSTEMS OPERATIONAL' : '❌ ISSUES DETECTED'}

${status.checks.message}

${status.diagnostics?.lastError ? `Error: ${status.diagnostics.lastError}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

/**
 * Quick connectivity test (returns simple boolean)
 */
export async function isBackendConnected(): Promise<boolean> {
  const status = await runConnectivityCheck();
  return status.isHealthy;
}

/**
 * Retry logic for operations that depend on network
 * Usage: retryWithBackoff(() => api.get('/endpoint'), maxRetries, delayMs)
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(
          `[Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${delayMs}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
