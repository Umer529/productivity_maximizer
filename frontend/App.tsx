import React from 'react';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppDataProvider } from './src/contexts/AppDataContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <AppNavigator />
      </AppDataProvider>
    </AuthProvider>
  );
}
