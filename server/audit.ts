import * as db from "./db";
import { auditLogs, superAdminNotifications } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Log a super-admin action to the audit trail
 */
export async function logAuditAction(
  superAdminId: number,
  actionType: string,
  description: string,
  affectedUserId?: number,
  details?: Record<string, any>
) {
  try {
    const database = await db.getDb();
    if (!database) {
      console.warn("[Audit] Cannot log: database not available");
      return;
    }

    await database.insert(auditLogs).values({
      superAdminId,
      actionType,
      description,
      affectedUserId,
      details,
      clientInfo: null,
    });

    console.log(`[Audit] Logged: ${actionType} by super-admin ${superAdminId}`);
  } catch (error) {
    console.error("[Audit] Failed to log action:", error);
  }
}

/**
 * Create a super-admin notification
 */
export async function createSuperAdminNotification(
  notificationType: string,
  title: string,
  message: string,
  severity: "info" | "warning" | "critical" = "info",
  data?: Record<string, any>
) {
  try {
    const database = await db.getDb();
    if (!database) {
      console.warn("[Notifications] Cannot create: database not available");
      return;
    }

    await database.insert(superAdminNotifications).values({
      notificationType,
      title,
      message,
      severity,
      data,
      isRead: false,
    });

    console.log(`[Notifications] Created: ${notificationType}`);
  } catch (error) {
    console.error("[Notifications] Failed to create notification:", error);
  }
}

/**
 * Get all audit logs (paginated)
 */
export async function getAuditLogs(limit: number = 100, offset: number = 0) {
  try {
    const database = await db.getDb();
    if (!database) {
      console.warn("[Audit] Cannot get logs: database not available");
      return [];
    }

    const logs = await database
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return logs;
  } catch (error) {
    console.error("[Audit] Failed to get logs:", error);
    return [];
  }
}

/**
 * Get unread super-admin notifications
 */
export async function getUnreadNotifications() {
  try {
    const database = await db.getDb();
    if (!database) {
      console.warn("[Notifications] Cannot get: database not available");
      return [];
    }

    const notifications = await database
      .select()
      .from(superAdminNotifications)
      .where(eq(superAdminNotifications.isRead, false))
      .orderBy(desc(superAdminNotifications.createdAt));

    return notifications;
  } catch (error) {
    console.error("[Notifications] Failed to get notifications:", error);
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: number, readBy: number) {
  try {
    const database = await db.getDb();
    if (!database) {
      console.warn("[Notifications] Cannot mark as read: database not available");
      return;
    }

    await database
      .update(superAdminNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
        readBy,
      })
      .where(eq(superAdminNotifications.id, notificationId));

    console.log(`[Notifications] Marked notification ${notificationId} as read`);
  } catch (error) {
    console.error("[Notifications] Failed to mark as read:", error);
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getAuditLogsForUser(affectedUserId: number, limit: number = 50) {
  try {
    const database = await db.getDb();
    if (!database) {
      console.warn("[Audit] Cannot get logs: database not available");
      return [];
    }

    const logs = await database
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.affectedUserId, affectedUserId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return logs;
  } catch (error) {
    console.error("[Audit] Failed to get logs for user:", error);
    return [];
  }
}

/**
 * Get audit logs for a specific super-admin
 */
export async function getAuditLogsBySuperAdmin(superAdminId: number, limit: number = 50) {
  try {
    const database = await db.getDb();
    if (!database) {
      console.warn("[Audit] Cannot get logs: database not available");
      return [];
    }

    const logs = await database
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.superAdminId, superAdminId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return logs;
  } catch (error) {
    console.error("[Audit] Failed to get logs for super-admin:", error);
    return [];
  }
}
