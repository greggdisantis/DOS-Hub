/**
 * Hook to register for Expo push notifications and store the token on the server.
 * Call this once from the root layout after the user is authenticated.
 */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device/build/Device";
import Constants from "expo-constants";
import { trpc } from "@/lib/trpc";

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(isAuthenticated: boolean) {
  const registerTokenMutation = trpc.notifications.registerToken.useMutation();
  const hasRegistered = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || hasRegistered.current || Platform.OS === "web") return;

    async function registerForPushNotifications() {
      try {
        // Only works on physical devices
        if (!Device.isDevice) {
          console.log("[PushNotifications] Skipping — not a physical device");
          return;
        }

        // Set up Android notification channel
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("dos-hub", {
            name: "DOS Hub",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#1E3A5F",
          });
        }

        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          console.log("[PushNotifications] Permission denied");
          return;
        }

        // Get the Expo push token
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;

        let token: string;
        if (projectId) {
          const result = await Notifications.getExpoPushTokenAsync({ projectId });
          token = result.data;
        } else {
          // Fallback: use device push token (works without EAS project ID in dev)
          const result = await Notifications.getDevicePushTokenAsync();
          token = result.data as string;
        }

        console.log("[PushNotifications] Token obtained:", token.substring(0, 30) + "...");

        // Save token to server
        await registerTokenMutation.mutateAsync({ token });
        hasRegistered.current = true;
        console.log("[PushNotifications] Token registered on server");
      } catch (error) {
        console.error("[PushNotifications] Registration failed:", error);
      }
    }

    registerForPushNotifications();
  }, [isAuthenticated]);
}
