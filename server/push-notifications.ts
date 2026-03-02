/**
 * Server-side push notification sender using the Expo Push API.
 * Sends notifications to users via their stored Expo push tokens,
 * and simultaneously stores them in the database for the in-app notification center.
 */

import * as db from "./db";

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Send push notifications to one or more Expo push tokens.
 * Uses the Expo Push API (https://exp.host/--/api/v2/push/send).
 * Silently logs errors rather than throwing to avoid breaking the main flow.
 */
export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const validTokens = tokens.filter(
    (t) => t && (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[")),
  );

  if (validTokens.length === 0) {
    console.log("[PushNotifications] No valid Expo push tokens to send to");
    return;
  }

  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    title,
    body,
    data: data ?? {},
    sound: "default",
    channelId: "dos-hub",
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error("[PushNotifications] Expo API error:", response.status, await response.text());
      return;
    }

    const result = await response.json() as { data: ExpoPushTicket[] };
    const tickets = result.data ?? [];

    tickets.forEach((ticket, i) => {
      if (ticket.status === "error") {
        console.error(`[PushNotifications] Failed for token ${validTokens[i]?.substring(0, 30)}:`, ticket.message);
      } else {
        console.log(`[PushNotifications] Sent OK, ticket: ${ticket.id}`);
      }
    });
  } catch (error) {
    console.error("[PushNotifications] Failed to send notifications:", error);
  }
}

/**
 * Send push notifications AND store in-app notifications for a list of user IDs.
 * This is the preferred function to use when you have user IDs (not just tokens).
 * It handles both push delivery and in-app notification center storage.
 *
 * @param userIds - Array of user IDs to notify
 * @param title - Notification title
 * @param body - Notification body text
 * @param type - Notification type key (e.g. 'cmr_new', 'order_status', 'material_delivery_status')
 * @param data - Optional extra data for deep-linking
 */
export async function notifyUsers(
  userIds: number[],
  title: string,
  body: string,
  type: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (userIds.length === 0) return;

  // Store in-app notifications for all users
  try {
    await db.createNotificationsForUsers(userIds, { title, body, type, data: data ?? null, isRead: false });
  } catch (err) {
    console.error("[PushNotifications] Failed to store in-app notifications:", err);
  }

  // Get push tokens for all users and send push notifications
  try {
    const allUsers = await db.getAllUsers();
    const tokens = allUsers
      .filter((u) => userIds.includes(u.id) && u.expoPushToken)
      .map((u) => u.expoPushToken as string);
    if (tokens.length > 0) {
      await sendPushNotifications(tokens, title, body, data);
    }
  } catch (err) {
    console.error("[PushNotifications] Failed to send push notifications:", err);
  }
}

/**
 * Notification messages for each status transition in the Material Delivery workflow.
 */
export const MATERIAL_DELIVERY_NOTIFICATIONS: Record<
  string,
  { title: string; body: (projectName: string) => string; targetRole: string | null }
> = {
  ready_for_supervisor: {
    title: "Material Checklist Ready for Review",
    body: (p) => `"${p}" is ready for your supervisor review.`,
    targetRole: "Project Supervisor",
  },
  awaiting_main_office: {
    title: "Material Checklist Awaiting Main Office",
    body: (p) => `"${p}" has been approved by the supervisor and awaits main office review.`,
    targetRole: null, // Notify admins/managers — handled separately
  },
  awaiting_warehouse: {
    title: "Warehouse Pull List Ready",
    body: (p) => `"${p}" is ready for warehouse pull. Please check the pull list.`,
    targetRole: "Warehouse Manager",
  },
  final_review: {
    title: "Material Delivery: Final Review",
    body: (p) => `"${p}" is ready for final review before completion.`,
    targetRole: null, // Notify admins/managers
  },
  complete: {
    title: "Material Delivery Complete",
    body: (p) => `"${p}" has been marked as complete.`,
    targetRole: null,
  },
};
