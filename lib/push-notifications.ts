// lib/push-notifications.ts
//
// Registers this device for Expo push notifications, saves the token
// onto the logged-in user's profile, and exposes listeners so the app
// can react to notifications received in foreground/background/closed.
//
// Requires: expo-notifications, expo-device, expo-constants
//   npx expo install expo-notifications expo-device expo-constants

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabaseClient";

// Show a banner + sound even if the notification arrives while the
// app is open in the foreground (default behavior is to hide it).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permission, grabs this device's Expo push
 * token, and saves it onto the current user's profile row. Call this
 * once right after login (or on app start if a session already exists).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device (not a simulator).");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push notification permission was not granted.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1B4332",
    });
  }

  // projectId comes from app.json (expo.extra.eas.projectId) once you've
  // run `eas init` / configured EAS — required for push tokens in SDK 49+.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenResponse.data;

  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await supabase
      .from("profiles")
      .update({ expo_push_token: token })
      .eq("id", userData.user.id);
  }

  return token;
}

/**
 * Clears the push token on logout so a stale token doesn't get used
 * to notify the next person who logs into this device.
 */
export async function unregisterPushToken(userId: string) {
  await supabase.from("profiles").update({ expo_push_token: null }).eq("id", userId);
}

/**
 * Wires up listeners for notifications received while the app is open,
 * and for when the user taps a notification (foreground, background, or
 * killed-and-relaunched). Call this once near the root of the app
 * (e.g. in your root layout) and clean up on unmount.
 *
 * Usage in app/_layout.tsx:
 *   useEffect(() => {
 *     const cleanup = setupNotificationListeners({
 *       onReceive: (n) => console.log("received", n),
 *       onTap: (response) => {
 *         const { transactionId } = response.notification.request.content.data;
 *         router.push(`/transactions?highlight=${transactionId}`);
 *       },
 *     });
 *     return cleanup;
 *   }, []);
 */
export function setupNotificationListeners(handlers: {
  onReceive?: (notification: Notifications.Notification) => void;
  onTap?: (response: Notifications.NotificationResponse) => void;
}) {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    handlers.onReceive?.(notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    handlers.onTap?.(response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}