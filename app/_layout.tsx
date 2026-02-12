import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWallet } from '@/hooks/use-wallet';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isLoggedIn, isLoading } = useWallet();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (!isLoggedIn && inTabsGroup) {
      router.replace('/login');
    } else if (isLoggedIn && !inTabsGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, isLoading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Wallet Info' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
