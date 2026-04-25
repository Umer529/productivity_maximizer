/**
 * Connectivity Debug Component
 * 
 * A simple UI for checking backend connectivity and debugging network issues.
 * Can be added to the app for development/testing purposes.
 * 
 * Usage:
 * import { ConnectivityDebug } from './ConnectivityDebug';
 * 
 * // Add to your app:
 * <ConnectivityDebug />
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { runConnectivityCheck, formatConnectivityStatus, type ConnectivityStatus } from '../lib/connectivityChecker';
import { getApiBaseUrl } from '../lib/apiClient';

export const ConnectivityDebug: React.FC = () => {
  const [status, setStatus] = useState<ConnectivityStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const result = await runConnectivityCheck();
      setStatus(result);
      console.log('Connectivity Check:', result);
    } catch (err) {
      console.error('Check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (isHealthy: boolean) => (isHealthy ? '#4CAF50' : '#F44336');
  const getCheckIcon = (isPassed: boolean) => (isPassed ? '✓' : '✗');

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>🔧 Connectivity Diagnostics</Text>

        {/* API URL Display */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Configuration</Text>
          <View style={styles.infoBox}>
            <Text style={styles.label}>API Base URL:</Text>
            <Text style={styles.value}>{getApiBaseUrl()}</Text>
          </View>
        </View>

        {/* Main Check Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCheck}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.buttonText}>Running Check...</Text>
            </>
          ) : (
            <Text style={styles.buttonText}>🔍 Check Connectivity</Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {status && (
          <View style={styles.section}>
            <View style={[styles.statusBox, { borderLeftColor: getStatusColor(status.isHealthy) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(status.isHealthy) }]}>
                {status.isHealthy ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}
              </Text>
            </View>

            {/* Individual Checks */}
            <View style={styles.checksContainer}>
              <View style={styles.checkItem}>
                <Text style={styles.checkLabel}>
                  {getCheckIcon(status.checks.backendReachable)} Backend Reachable
                </Text>
              </View>
              <View style={styles.checkItem}>
                <Text style={styles.checkLabel}>
                  {getCheckIcon(status.checks.apiHealthy)} API Healthy
                </Text>
              </View>
              <View style={styles.checkItem}>
                <Text style={styles.checkLabel}>
                  {getCheckIcon(status.checks.corsWorking)} CORS Working
                </Text>
              </View>
            </View>

            {/* Message */}
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{status.checks.message}</Text>
            </View>

            {/* Diagnostics */}
            {status.diagnostics && (
              <View style={styles.diagnosticsBox}>
                <Text style={styles.diagnosticsTitle}>Diagnostics</Text>
                <Text style={styles.diagnosticsItem}>
                  Platform: {status.diagnostics.platform}
                </Text>
                {status.diagnostics.responseTime && (
                  <Text style={styles.diagnosticsItem}>
                    Response Time: {status.diagnostics.responseTime}
                  </Text>
                )}
                {status.diagnostics.lastError && (
                  <Text style={[styles.diagnosticsItem, styles.errorText]}>
                    Error: {status.diagnostics.lastError}
                  </Text>
                )}
                <Text style={styles.timestamp}>
                  Checked: {new Date(status.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            )}

            {/* Raw Output for Debugging */}
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => {
                console.log(formatConnectivityStatus(status));
              }}
            >
              <Text style={styles.copyButtonText}>📋 View Full Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        <View style={[styles.section, styles.instructionsSection]}>
          <Text style={styles.sectionTitle}>What This Checks</Text>
          <Text style={styles.instructionText}>
            • Backend Reachable: Can connect to the API server{'\n'}
            • API Healthy: Server responds to health check{'\n'}
            • CORS Working: Cross-Origin requests are allowed
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    paddingVertical: 20,
  },
  scrollView: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64b5f6',
    marginBottom: 10,
  },
  infoBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: 13,
    color: '#4CAF50',
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBox: {
    backgroundColor: '#1a1a2e',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checksContainer: {
    marginBottom: 12,
  },
  checkItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    marginBottom: 6,
  },
  checkLabel: {
    fontSize: 13,
    color: '#ccc',
  },
  messageBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 12,
    color: '#e0e0e0',
    lineHeight: 18,
  },
  diagnosticsBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  diagnosticsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64b5f6',
    marginBottom: 8,
  },
  diagnosticsItem: {
    fontSize: 11,
    color: '#aaa',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  errorText: {
    color: '#F44336',
  },
  timestamp: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  copyButton: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#64b5f6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#64b5f6',
    fontSize: 13,
    fontWeight: '500',
  },
  instructionsSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
  },
  instructionText: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 18,
  },
  spacer: {
    height: 20,
  },
});

export default ConnectivityDebug;
