import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Requests push permission and returns an Expo push token.
 * Returns null if permission is denied or EAS project ID is not configured.
 *
 * Prerequisites:
 *  1. Run `npx eas-cli@latest login` then `npx eas-cli@latest init`
 *  2. Add the project ID to app.json under expo.extra.eas.projectId
 *  3. Upload APNs key via `npx eas-cli@latest credentials`
 *  4. Run `pod install` in ios/ and rebuild in Xcode
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

    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;

    if (!projectId) {
      console.error(
        '[Push] No EAS project ID found.\n' +
        '  1. Run: npx eas-cli@latest login\n' +
        '  2. Run: npx eas-cli@latest init\n' +
        '  3. Add to app.json under expo.extra.eas.projectId\n' +
        '  4. Upload APNs key: npx eas-cli@latest credentials\n' +
        '  5. Rebuild the app in Xcode'
      );
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] Token registered successfully:', tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.error('[Push] Registration failed:', err);
    return null;
  }
}

/**
 * Sends a push notification via Expo's push gateway.
 * Fire-and-forget — errors are logged but not thrown.
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: expoPushToken,
        title,
        body,
        data: data ?? {},
        sound: 'default',
      }),
    });

    const result = await response.json() as {
      data?: { status?: string; message?: string; details?: unknown };
    };

    if (result.data?.status === 'error') {
      console.error('[Push] Expo gateway error:', result.data.message, result.data.details);
    }
  } catch (err) {
    console.error('[Push] Send failed:', err);
  }
}
