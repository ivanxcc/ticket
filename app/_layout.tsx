import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, AppState, type AppStateStatus } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { registerForPushAsync } from '@/lib/pushNotifications';
import { APP_VERSION } from '@/constants/version';

// Show push alerts/sounds even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type AuthState = 'loading' | 'unauthenticated' | 'no-household' | 'ready';

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);
  const _hydrated = useAppStore((state) => state._hydrated);
  const householdId = useAppStore((state) => state.householdId);
  const { setUserId, initFromSupabase, clearAuth, stopRealtimeSync } = useAppStore();

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [hasCheckedChangelog, setHasCheckedChangelog] = useState(false);

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

  // Re-sync when app returns to foreground (fixes stale realtime connections)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    if (authState !== 'ready') return;

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        const store = useAppStore.getState();
        if (store.userId) {
          store.stopRealtimeSync();
          store.initFromSupabase();
        }
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [authState]);

  // Show changelog on first launch after a version update
  useEffect(() => {
    if (authState !== 'ready' || hasCheckedChangelog) return;
    setHasCheckedChangelog(true);
    AsyncStorage.getItem('lastSeenVersion').then((seen) => {
      if (seen !== APP_VERSION) {
        setTimeout(() => router.push('/changelog' as any), 600);
      }
    });
  }, [authState, hasCheckedChangelog]);

  // Register for push notifications and handle tap-to-navigate
  useEffect(() => {
    if (authState !== 'ready') return;

    // Register device and save token to profile
    registerForPushAsync().then(async (token) => {
      if (!token) return;
      const { userId } = useAppStore.getState();
      if (userId) {
        await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
      }
    });

    // Navigate to ticket when user taps a push notification
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const ticketId = response.notification.request.content.data?.ticketId as string | undefined;
      if (ticketId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.push(`/ticket/${ticketId}` as any);
      }
    });

    return () => responseSub.remove();
  }, [authState]);

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
          <Stack.Screen
            name="notifications"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ticket/edit"
            options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="changelog"
            options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
          />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
