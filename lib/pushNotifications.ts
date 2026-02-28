import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Requests push permission and returns the raw APNs device token (iOS only).
 * Uses getDevicePushTokenAsync — no EAS project ID required.
 * Returns null if permission is denied or not on iOS.
 */
export async function registerForPushAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    if (Platform.OS !== 'ios') return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push] Permission denied by user');
      return null;
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    if (tokenData.type !== 'ios' || typeof tokenData.data !== 'string') {
      console.warn('[Push] Unexpected token format:', tokenData);
      return null;
    }

    console.log('[Push] Device token registered:', tokenData.data.slice(0, 8) + '…');
    return tokenData.data;
  } catch (err) {
    console.error('[Push] Registration failed:', err);
    return null;
  }
}

/**
 * Sends a push notification via the Supabase Edge Function (send-push).
 * The Edge Function signs and delivers directly to APNs.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('[Push] No active session — skipping push');
      return;
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('[Push] EXPO_PUBLIC_SUPABASE_URL is not set');
      return;
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ deviceToken, title, body, data: data ?? {} }),
    });

    if (!res.ok) {
      console.error('[Push] Edge Function error:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[Push] sendPushNotification failed:', err);
  }
}
