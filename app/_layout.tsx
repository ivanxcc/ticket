import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppStore } from '@/store';
import { supabase } from '@/lib/supabase';

type AuthState = 'loading' | 'unauthenticated' | 'no-household' | 'ready';

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);
  const _hydrated = useAppStore((state) => state._hydrated);
  const householdId = useAppStore((state) => state.householdId);
  const { setUserId, initFromSupabase, clearAuth, stopRealtimeSync } = useAppStore();

  const [authState, setAuthState] = useState<AuthState>('loading');

  const isDark =
    themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  useEffect(() => {
    if (!_hydrated) return;

    // Check existing session on startup
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setAuthState('unauthenticated');
        return;
      }
      setUserId(session.user.id);
      await initFromSupabase();
      const hid = useAppStore.getState().householdId;
      setAuthState(hid ? 'ready' : 'no-household');
    });

    // Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          stopRealtimeSync();
          clearAuth();
          setAuthState('unauthenticated');
          return;
        }
        if (event === 'SIGNED_IN') {
          setUserId(session.user.id);
          await initFromSupabase();
          const hid = useAppStore.getState().householdId;
          setAuthState(hid ? 'ready' : 'no-household');
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [_hydrated]);

  // Redirect when auth state changes
  useEffect(() => {
    if (authState === 'unauthenticated') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(auth)/sign-in' as any);
    } else if (authState === 'no-household') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(auth)/setup' as any);
    } else if (authState === 'ready') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(tabs)' as any);
    }
  }, [authState]);

  // Move to ready once household is set (setup screen completes)
  useEffect(() => {
    if (authState === 'no-household' && householdId) {
      setAuthState('ready');
    }
  }, [householdId, authState]);

  const spinnerColor = isDark ? '#F0F0F0' : '#111111';

  if (!_hydrated || authState === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#0C0C0C' : '#F4F4EF',
        }}
      >
        <ActivityIndicator color={spinnerColor} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen
            name="create"
            options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="ticket/[id]"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
