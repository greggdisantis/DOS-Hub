import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

// System roles available in the app
const SYSTEM_ROLES = ["pending", "guest", "member", "manager", "admin"] as const;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── USER MANAGEMENT (admin only) ──────────────────────────────────────────
  users: router({
    /** Get all users (admin/manager only) */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: admin or manager role required");
      }
      return db.getAllUsers();
    }),

    /** Get pending (unapproved) users */
    pending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized: admin role required");
      }
      return db.getPendingUsers();
    }),

    /** Approve a user and set their system role */
    approve: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(SYSTEM_ROLES),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: admin role required");
        }
        await db.approveUser(input.userId, input.role);
        return { success: true };
      }),

    /** Reject (delete) a pending user */
    reject: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: admin role required");
        }
        await db.rejectUser(input.userId);
        return { success: true };
      }),

    /** Update a user's system role */
    updateRole: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(SYSTEM_ROLES),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: admin role required");
        }
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    /** Update the logged-in user's first and last name */
    updateName: protectedProcedure
      .input(z.object({ firstName: z.string().min(1).max(128), lastName: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserName(ctx.user.id, input.firstName, input.lastName);
        return { success: true };
      }),

    /** Update a user's DOS job roles (multi-select from 17-role list) */
    updateDosRoles: protectedProcedure
      .input(z.object({ userId: z.number(), dosRoles: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: admin role required");
        }
        await db.updateDosRoles(input.userId, input.dosRoles);
        return { success: true };
      }),

    /** Update a user's legacy per-user module permissions */
    updatePermissions: protectedProcedure
      .input(z.object({ userId: z.number(), permissions: z.record(z.string(), z.boolean()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: admin role required");
        }
        await db.updatePermissions(input.userId, input.permissions);
        return { success: true };
      }),
  }),

  // ─── MODULE PERMISSIONS (Owner job role only) ──────────────────────────────
  modulePermissions: router({
    /** Get all module permission settings */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized: admin role required");
      }
      return db.getAllModulePermissions();
    }),

    /** Set which job roles can access a module */
    set: protectedProcedure
      .input(z.object({ moduleKey: z.string(), allowedJobRoles: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: admin role required");
        }
        // Only Owner job role users can modify module permissions
        const dosRoles = (ctx.user.dosRoles as string[]) ?? [];
        if (!dosRoles.includes("Owner")) {
          throw new Error("Unauthorized: Owner job role required to modify module permissions");
        }
        await db.setModulePermissions(input.moduleKey, input.allowedJobRoles);
        return { success: true };
      }),
  }),

  // ─── SCREEN ORDERS ─────────────────────────────────────────────────────────
  orders: router({
    /** Create a new screen order */
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          orderData: z.any(),
          screenCount: z.number().min(1).default(1),
          manufacturer: z.string().optional(),
          submitterNotes: z.string().optional(),
          projectId: z.number().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orderId = await db.createScreenOrder({
          userId: ctx.user.id,
          companyId: ctx.user.companyId,
          title: input.title,
          status: "draft",
          orderData: input.orderData,
          screenCount: input.screenCount,
          manufacturer: input.manufacturer,
          submitterNotes: input.submitterNotes,
          projectId: input.projectId,
        });
        return { orderId };
      }),

    /** Update an existing order (creates a revision) */
    update: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          title: z.string().min(1).max(255).optional(),
          orderData: z.any().optional(),
          screenCount: z.number().min(1).optional(),
          manufacturer: z.string().optional(),
          status: z.enum(["draft", "submitted", "approved", "rejected", "completed"]).optional(),
          submitterNotes: z.string().optional(),
          changeDescription: z.string().default("Updated order"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const order = await db.getScreenOrder(input.orderId);
        if (!order) throw new Error("Order not found");

        const isOwner = order.userId === ctx.user.id;
        const isManagerOrAdmin = ctx.user.role === "manager" || ctx.user.role === "admin";

        if (!isOwner && !isManagerOrAdmin) {
          throw new Error("Unauthorized: you can only edit your own orders");
        }

        const { orderId, changeDescription, ...updateData } = input;
        await db.updateScreenOrder(
          orderId,
          updateData,
          ctx.user.id,
          ctx.user.name,
          changeDescription,
        );
        return { success: true };
      }),

    /** Get a single order by ID */
    get: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const order = await db.getScreenOrder(input.orderId);
        if (!order) throw new Error("Order not found");

        const isOwner = order.userId === ctx.user.id;
        const isManagerOrAdmin = ctx.user.role === "manager" || ctx.user.role === "admin";

        if (!isOwner && !isManagerOrAdmin) {
          throw new Error("Unauthorized");
        }

        return order;
      }),

    /** List orders — members see their own, managers/admins see all */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "manager" || ctx.user.role === "admin") {
        return db.getAllScreenOrders();
      }
      return db.getUserScreenOrders(ctx.user.id);
    }),

    /** Get revision history for an order */
    revisions: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const order = await db.getScreenOrder(input.orderId);
        if (!order) throw new Error("Order not found");

        const isOwner = order.userId === ctx.user.id;
        const isManagerOrAdmin = ctx.user.role === "manager" || ctx.user.role === "admin";

        if (!isOwner && !isManagerOrAdmin) {
          throw new Error("Unauthorized");
        }

        return db.getOrderRevisions(input.orderId);
      }),

    /** Delete an order (admin only) */
    delete: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Unauthorized: admin role required");
        }
        await db.deleteScreenOrder(input.orderId);
        return { success: true };
      }),
  }),

  // ─── DASHBOARD ANALYTICS ─────────────────────────────────────────────────────
  dashboard: router({
    /** Get dashboard stats (manager/admin only) */
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      return db.getDashboardStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
