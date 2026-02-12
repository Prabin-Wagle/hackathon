import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Buffer } from 'buffer';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import '../utils/polyfill'; // ABSOLUTE FIRST IMPORT

// @ts-ignore
global.Buffer = Buffer;

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWallet, WalletProvider } from '@/hooks/use-wallet';
import { bluetoothService } from '@/services/bluetooth';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLoggedIn, isLoading } = useWallet();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Request permissions early for Bluetooth functionality
    bluetoothService.requestPermissions();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const isAuthRoute = segments[0] === 'login' || segments[0] === 'register';

    console.log('Navigation State:', { isLoggedIn, segments, inTabsGroup, isAuthRoute });

    if (!isLoggedIn && inTabsGroup) {
      router.replace('/login');
    } else if (isLoggedIn && isAuthRoute) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, isLoading, segments]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#F8FAFC',
        contentStyle: { backgroundColor: '#0F172A' }
      }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Wallet Info' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <WalletProvider>
      <RootLayoutNav />
    </WalletProvider>
  );
}
