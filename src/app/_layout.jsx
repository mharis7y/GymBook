import '../global.css';

import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';

import { AuthProvider, useAuth } from '@/store/AuthContext';
import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isSetupComplete, isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSetupComplete) {
      if (segments[1] !== 'onboarding') {
        router.replace('/(auth)/onboarding');
      }
    } else if (!isAuthenticated) {
      if (segments[1] !== 'login' && segments[1] !== 'reset-pin') {
        router.replace('/(auth)/login');
      }
    } else {
      if (inAuthGroup || segments.length === 0) {
        router.replace('/(tabs)');
      }
    }
  }, [isLoading, isSetupComplete, isAuthenticated, segments]);

  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Slot />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
