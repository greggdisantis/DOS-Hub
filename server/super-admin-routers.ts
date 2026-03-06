import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as audit from "./audit";
import { z } from "zod";

/**
 * Super-admin specific endpoints for dashboard, audit logs, and notifications
 */
export const superAdminRouter = router({
  /**
   * Get audit logs (super-admin only)
   */
  getAuditLogs: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: super-admin role required");
      }
      return audit.getAuditLogs(input.limit, input.offset);
    }),

  /**
   * Get unread super-admin notifications
   */
  getUnreadNotifications: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super-admin") {
      throw new Error("Unauthorized: super-admin role required");
    }
    return audit.getUnreadNotifications();
  }),

  /**
   * Mark a notification as read
   */
  markNotificationAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: super-admin role required");
      }
      await audit.markNotificationAsRead(input.notificationId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Get system-wide statistics
   */
  getSystemStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super-admin") {
      throw new Error("Unauthorized: super-admin role required");
    }

    const allUsers = await db.getAllUsers();
    const totalUsers = allUsers.length;
    const pendingUsers = allUsers.filter((u) => !u.approved).length;
    const superAdmins = allUsers.filter((u) => u.role === "super-admin").length;
    const admins = allUsers.filter((u) => u.role === "admin").length;
    const managers = allUsers.filter((u) => u.role === "manager").length;
    const members = allUsers.filter((u) => u.role === "member").length;

    return {
      totalUsers,
      pendingUsers,
      superAdmins,
      admins,
      managers,
      members,
      approvedUsers: totalUsers - pendingUsers,
    };
  }),

  /**
   * Get audit logs for a specific user
   */
  getAuditLogsForUser: protectedProcedure
    .input(z.object({ userId: z.number(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: super-admin role required");
      }
      return audit.getAuditLogsForUser(input.userId, input.limit);
    }),

  /**
   * Get audit logs by a specific super-admin
   */
  getAuditLogsBySuperAdmin: protectedProcedure
    .input(z.object({ superAdminId: z.number(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: super-admin role required");
      }
      return audit.getAuditLogsBySuperAdmin(input.superAdminId, input.limit);
    }),
});
