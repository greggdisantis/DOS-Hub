import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { sendPushNotifications, notifyUsers, MATERIAL_DELIVERY_NOTIFICATIONS } from "./push-notifications";
import { generateCmrPDF } from "./cmr-pdf";
import { storagePut } from "./storage";
import { logAuditAction, createSuperAdminNotification } from "./audit";
import { superAdminRouter } from "./super-admin-routers";

/**
 * Filter a list of user IDs by their notification preference for a given type.
 * If a user has no preference set (null), they receive the notification by default.
 */
async function filterByPref(userIds: number[], prefKey: string): Promise<number[]> {
  const filtered: number[] = [];
  for (const userId of userIds) {
    const prefs = await db.getNotificationPrefs(userId);
    if (!prefs || prefs[prefKey] !== false) {
      filtered.push(userId);
    }
  }
  return filtered;
}

// System roles available in the app
const SYSTEM_ROLES = ["pending", "guest", "member", "manager", "admin", "super-admin"] as const;

export const appRouter = router({
  system: systemRouter,
  superAdmin: superAdminRouter,

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
    /** Get all users (admin/manager/super-admin only) */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin, manager, or super-admin role required");
      }
      return db.getAllUsers();
    }),

    /** Get pending (unapproved) users */
    pending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin or super-admin role required");
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
          throw new Error("Unauthorized: admin or super-admin role required");
        }
        // Only super-admin can approve someone as super-admin
        if (input.role === "super-admin" && ctx.user.role !== "super-admin") {
          throw new Error("Unauthorized: only super-admin can promote to super-admin");
        }
        await db.approveUser(input.userId, input.role);
        
        // Log audit trail if super-admin
        if (ctx.user.role === "super-admin") {
          await logAuditAction(
            ctx.user.id,
            "user_approval",
            `Approved user ${input.userId} with role ${input.role}`,
            input.userId,
            { role: input.role }
          );
        }
        
        return { success: true };
      }),

    /** Reject (delete) a pending user */
    reject: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
          throw new Error("Unauthorized: admin or super-admin role required");
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
          throw new Error("Unauthorized: admin or super-admin role required");
        }
        // Only super-admin can update someone to super-admin
        if (input.role === "super-admin" && ctx.user.role !== "super-admin") {
          throw new Error("Unauthorized: only super-admin can promote to super-admin");
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
        if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
          throw new Error("Unauthorized: admin role required");
        }
        await db.updateDosRoles(input.userId, input.dosRoles);
        return { success: true };
      }),

    /** List approved users (for consultant picker in CMR filters) */
    listConsultants: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === 'admin' || ctx.user.role === 'manager' || ctx.user.role === 'super-admin';
      if (!isAdmin) throw new Error('Unauthorized: manager or admin role required');
      const all = await db.getAllUsers();
      return all
        .filter((u) => u.approved && u.firstName)
        .map((u) => ({
          id: u.id,
          name: u.name || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || 'Unknown',
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
        }));
    }),

    /** Update a user's legacy per-user module permissions */
    updatePermissions: protectedProcedure
      .input(z.object({ userId: z.number(), permissions: z.record(z.string(), z.boolean()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
          throw new Error("Unauthorized: admin role required");
        }
        await db.updatePermissions(input.userId, input.permissions);
        return { success: true };
      }),

    /** Toggle whether a user is marked as an employee (for Time Off tracking) */
    setIsEmployee: protectedProcedure
      .input(z.object({ userId: z.number(), isEmployee: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
          throw new Error("Unauthorized: admin role required");
        }
        await db.setIsEmployee(input.userId, input.isEmployee);
        return { success: true };
      }),

    /** Get all users marked as employees */
    listEmployees: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin role required");
      }
      return db.getEmployeeUsers();
    }),
  }),

  // ─── MODULE PERMISSIONS (Owner job role only) ──────────────────────────────
  modulePermissions: router({
    /** Get all module permission settings */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin role required");
      }
      return db.getAllModulePermissions();
    }),

    /** Set which job roles can access a module */
    set: protectedProcedure
      .input(z.object({ moduleKey: z.string(), moduleName: z.string().optional(), allowedJobRoles: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
          throw new Error("Unauthorized: admin role required");
        }
        // Only Owner job role users can modify module permissions
        const dosRoles = (ctx.user.dosRoles as string[]) ?? [];
        if (!dosRoles.includes("Owner") && ctx.user.role !== "super-admin") {
          throw new Error("Unauthorized: Owner job role required to modify module permissions");
        }
        await db.setModulePermissions(input.moduleKey, input.allowedJobRoles, input.moduleName);
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

        // Notify managers/admins when a new order is created
        try {
          const managers = await db.getManagersAndAdminsWithPushToken();
          const allManagerIds = managers.map((m: any) => m.id as number);
          const targetIds = await filterByPref(allManagerIds, 'order_status');
          if (targetIds.length > 0) {
            const submitterName = ctx.user.name ?? 'A team member';
            await notifyUsers(
              targetIds,
              'New Screen Order Submitted',
              `${submitterName} submitted a new order: "${input.title}".`,
              'order_status',
              { screen: 'orders', orderId },
            );
          }
        } catch (notifError) {
          console.error('[PushNotifications] Screen order create notification failed:', notifError);
        }

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

        const prevStatus = order.status;
        const { orderId, changeDescription, ...updateData } = input;
        await db.updateScreenOrder(
          orderId,
          updateData,
          ctx.user.id,
          ctx.user.name,
          changeDescription,
        );

        // Notify the order owner when a manager/admin changes the status
        const newStatus = input.status;
        if (newStatus && newStatus !== prevStatus && isManagerOrAdmin && !isOwner) {
          try {
            const targetIds = await filterByPref([order.userId], 'order_status');
            if (targetIds.length > 0) {
              const statusMessages: Record<string, string> = {
                approved: `Your order "${order.title}" has been approved.`,
                rejected: `Your order "${order.title}" has been rejected. Please review and resubmit.`,
                completed: `Your order "${order.title}" has been marked as completed.`,
                submitted: `Your order "${order.title}" has been submitted for review.`,
              };
              const body = statusMessages[newStatus] ?? `Your order "${order.title}" status changed to ${newStatus}.`;
              await notifyUsers(
                targetIds,
                'Screen Order Update',
                body,
                'order_status',
                { screen: 'orders', orderId },
              );
            }
          } catch (notifError) {
            console.error('[PushNotifications] Screen order status notification failed:', notifError);
          }
        }

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

  // ─── RECEIPTS ──────────────────────────────────────────────────────────────
  receipts: router({
    /** Analyze a receipt image with AI and extract structured data */
    analyzeImage: protectedProcedure
      .input(z.object({ imageUrl: z.string() }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a receipt data extraction assistant. Extract all data from the receipt image and return it as JSON. Be precise with numbers.`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract all data from this receipt image. Return JSON with: vendorName, vendorLocation, purchaseDate (YYYY-MM-DD format), lineItems (array of {description, quantity, unitPrice, lineTotal}), subtotal, tax, total. If a field is not visible, return null." },
                { type: "image_url", image_url: { url: input.imageUrl } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0].message.content;
        return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      }),

    /** Create a new receipt */
    create: protectedProcedure
      .input(
        z.object({
          submitterName: z.string().optional(),
          vendorName: z.string().optional(),
          vendorLocation: z.string().optional(),
          purchaseDate: z.string().optional(),
          expenseType: z.enum(["JOB", "OVERHEAD"]).default("JOB"),
          jobName: z.string().optional(),
          workOrderNumber: z.string().optional(),
          poNumber: z.string().optional(),
          overheadCategory: z.string().optional(),
          materialCategory: z.string().optional(),
          lineItems: z.array(z.object({
            description: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            lineTotal: z.number(),
          })).optional(),
          subtotal: z.number().optional(),
          tax: z.number().optional(),
          total: z.number().optional(),
          notes: z.string().optional(),
          imageUrl: z.string().optional(),
          fileName: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createReceipt({
          userId: ctx.user.id,
          companyId: ctx.user.companyId,
          submitterName: input.submitterName,
          vendorName: input.vendorName,
          vendorLocation: input.vendorLocation,
          purchaseDate: input.purchaseDate,
          expenseType: input.expenseType,
          jobName: input.jobName,
          workOrderNumber: input.workOrderNumber,
          poNumber: input.poNumber,
          overheadCategory: input.overheadCategory,
          materialCategory: input.materialCategory || "Miscellaneous",
          lineItems: input.lineItems,
          subtotal: input.subtotal?.toString(),
          tax: input.tax?.toString(),
          total: input.total?.toString(),
          notes: input.notes,
          imageUrl: input.imageUrl,
          fileName: input.fileName,
        });
        return { id };
      }),

    /** List receipts — members see own, managers/admins see all */
    list: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        vendorName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        if (isAdmin && input && (input.userId || input.vendorName || input.startDate || input.endDate)) {
          return db.getReceiptsWithFilters(input);
        }
        if (isAdmin) return db.getAllReceipts();
        return db.getUserReceipts(ctx.user.id);
      }),

    /** Get a single receipt */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const receipt = await db.getReceipt(input.id);
        if (!receipt) throw new Error("Receipt not found");
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        if (!isAdmin && receipt.userId !== ctx.user.id) throw new Error("Unauthorized");
        return receipt;
      }),

    /** Delete a receipt — admins/managers can delete any; members can delete their own */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        if (!isAdmin) {
          // Members can only delete their own receipts
          const receipt = await db.getReceipt(input.id);
          if (!receipt) throw new Error("Receipt not found");
          if (receipt.userId !== ctx.user.id) throw new Error("Unauthorized: you can only delete your own receipts");
        }
        await db.deleteReceipt(input.id);
        return { success: true };
      }),

    /** Generate PDF for a receipt and return as base64 data URI */
    generatePDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const receipt = await db.getReceipt(input.id);
        if (!receipt) throw new Error("Receipt not found");
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        if (!isAdmin && receipt.userId !== ctx.user.id) throw new Error("Unauthorized");

        const { generateReceiptPDF } = await import("./receipt-pdf");
        const pdfBuffer = await generateReceiptPDF({
          fileName: receipt.fileName || `${receipt.vendorName || 'Receipt'}_${receipt.purchaseDate || 'unknown'}`,
          submitterName: receipt.submitterName,
          expenseType: receipt.expenseType,
          jobName: receipt.jobName,
          workOrderNumber: receipt.workOrderNumber,
          poNumber: receipt.poNumber,
          overheadCategory: receipt.overheadCategory,
          vendorName: receipt.vendorName,
          vendorLocation: receipt.vendorLocation,
          purchaseDate: receipt.purchaseDate,
          materialCategory: receipt.materialCategory,
          lineItems: receipt.lineItems,
          subtotal: receipt.subtotal,
          tax: receipt.tax,
          total: receipt.total,
          notes: receipt.notes,
          imageUrl: receipt.imageUrl,
          createdAt: receipt.createdAt,
        });

        // Upload to S3 so the mobile client can open it via URL
        const { storagePut } = await import("./storage");
        const fileKey = `receipts/pdf/${receipt.fileName || `receipt-${receipt.id}`}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
        return { url, fileName: (receipt.fileName || `receipt-${receipt.id}`) + ".pdf" };
      }),

    /** Upload receipt image to S3 and return URL */
    uploadImage: protectedProcedure
      .input(z.object({ base64: z.string(), mimeType: z.string().default("image/jpeg"), fileName: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import("./storage");
        const ext = input.mimeType === "image/png" ? "png" : "jpg";
        const key = `receipts/images/${ctx.user.id}-${Date.now()}.${ext}`;
        const buf = Buffer.from(input.base64, "base64");
        const { url } = await storagePut(key, buf, input.mimeType);
        return { url };
      }),

    /** Archive a receipt — marks it as processed (admin/manager only) */
    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        if (!isAdmin) throw new Error("Unauthorized: manager or admin role required");
        const receipt = await db.getReceipt(input.id);
        if (!receipt) throw new Error("Receipt not found");
        await db.archiveReceipt(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Unarchive a receipt — restores it to the main list (admin/manager only) */
    unarchive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        if (!isAdmin) throw new Error("Unauthorized: manager or admin role required");
        await db.unarchiveReceipt(input.id);
        return { success: true };
      }),

    /** List archived receipts — admin/manager only */
    listArchived: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        vendorName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        if (!isAdmin) throw new Error("Unauthorized: manager or admin role required");
        if (input && (input.userId || input.vendorName || input.startDate || input.endDate)) {
          return db.getArchivedReceiptsWithFilters(input);
        }
        return db.getArchivedReceipts();
      }),

    /** Get analytics for the finance dashboard — includes archived receipts */
    analytics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      return db.getReceiptAnalytics();
    }),
  }),

  // ─── AQUACLEAN RECEIPTS ───────────────────────────────────────────────────────
  aquacleanReceipts: router({
    /** Analyze a receipt image with AI and extract structured data */
    analyzeImage: protectedProcedure
      .input(z.object({ imageUrl: z.string() }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("./_core/llm");
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a receipt data extraction assistant. Extract all data from the receipt image and return it as JSON. Be precise with numbers.`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract all data from this receipt image. Return JSON with: vendorName, vendorLocation, purchaseDate (YYYY-MM-DD format), lineItems (array of {description, quantity, unitPrice, lineTotal}), subtotal, tax, total. If a field is not visible, return null." },
                { type: "image_url", image_url: { url: input.imageUrl } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0].message.content;
        return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      }),

    /** Create a new AquaClean receipt */
    create: protectedProcedure
      .input(
        z.object({
          submitterName: z.string().optional(),
          vendorName: z.string().optional(),
          vendorLocation: z.string().optional(),
          purchaseDate: z.string().optional(),
          expenseType: z.enum(["JOB", "OVERHEAD"]).default("JOB"),
          jobName: z.string().optional(),
          workOrderNumber: z.string().optional(),
          poNumber: z.string().optional(),
          overheadCategory: z.string().optional(),
          materialCategory: z.string().optional(),
          lineItems: z.array(z.object({
            description: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            lineTotal: z.number(),
          })).optional(),
          subtotal: z.string().optional(),
          tax: z.string().optional(),
          total: z.string().optional(),
          notes: z.string().optional(),
          imageUrl: z.string().optional(),
          fileName: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createAquacleanReceipt({
          userId: ctx.user.id,
          companyId: ctx.user.companyId,
          submitterName: input.submitterName,
          vendorName: input.vendorName,
          vendorLocation: input.vendorLocation,
          purchaseDate: input.purchaseDate,
          expenseType: input.expenseType,
          jobName: input.jobName,
          workOrderNumber: input.workOrderNumber,
          poNumber: input.poNumber,
          overheadCategory: input.overheadCategory,
          materialCategory: input.materialCategory || "Miscellaneous",
          lineItems: input.lineItems,
          subtotal: input.subtotal,
          tax: input.tax,
          total: input.total,
          notes: input.notes,
          imageUrl: input.imageUrl,
          fileName: input.fileName,
        });
        return { id };
      }),

    /** List AquaClean receipts */
    list: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        vendorName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        if (input && (input.userId || input.vendorName || input.startDate || input.endDate)) {
          const filters = isAdmin ? input : { ...input, userId: ctx.user.id };
          return db.getAquacleanReceiptsWithFilters(filters);
        }
        return isAdmin ? db.getAllAquacleanReceipts() : db.getUserAquacleanReceipts(ctx.user.id);
      }),

    /** Get a single AquaClean receipt */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        const receipt = await db.getAquacleanReceipt(input.id);
        if (!receipt) throw new Error("Receipt not found");
        if (!isAdmin && receipt.userId !== ctx.user.id) throw new Error("Unauthorized");
        return receipt;
      }),

    /** Delete an AquaClean receipt */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        if (!isAdmin) {
          const receipt = await db.getAquacleanReceipt(input.id);
          if (!receipt) throw new Error("Receipt not found");
          if (receipt.userId !== ctx.user.id) throw new Error("Unauthorized: you can only delete your own receipts");
        }
        await db.deleteAquacleanReceipt(input.id);
        return { success: true };
      }),

    /** Generate PDF for an AquaClean receipt */
    generatePDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const receipt = await db.getAquacleanReceipt(input.id);
        if (!receipt) throw new Error("Receipt not found");
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
        if (!isAdmin && receipt.userId !== ctx.user.id) throw new Error("Unauthorized");
        const { generateAquacleanReceiptPDF } = await import("./aquaclean-receipt-pdf");
        const pdfBuffer = await generateAquacleanReceiptPDF({
          fileName: receipt.fileName || `${receipt.vendorName || 'Receipt'}_${receipt.purchaseDate || 'unknown'}`,
          submitterName: receipt.submitterName,
          expenseType: receipt.expenseType,
          jobName: receipt.jobName,
          workOrderNumber: receipt.workOrderNumber,
          poNumber: receipt.poNumber,
          overheadCategory: receipt.overheadCategory,
          vendorName: receipt.vendorName,
          vendorLocation: receipt.vendorLocation,
          purchaseDate: receipt.purchaseDate,
          materialCategory: receipt.materialCategory,
          lineItems: receipt.lineItems,
          subtotal: receipt.subtotal,
          tax: receipt.tax,
          total: receipt.total,
          notes: receipt.notes,
          imageUrl: receipt.imageUrl,
          createdAt: receipt.createdAt,
        });
        const { storagePut } = await import("./storage");
        const fileKey = `aquaclean-receipts/pdf/${receipt.fileName || `receipt-${receipt.id}`}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
        return { url, fileName: (receipt.fileName || `receipt-${receipt.id}`) + ".pdf" };
      }),

    /** Upload AquaClean receipt image to S3 */
    uploadImage: protectedProcedure
      .input(z.object({ base64: z.string(), mimeType: z.string().default("image/jpeg"), fileName: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import("./storage");
        const ext = input.mimeType === "image/png" ? "png" : "jpg";
        const key = `aquaclean-receipts/images/${ctx.user.id}-${Date.now()}.${ext}`;
        const buf = Buffer.from(input.base64, "base64");
        const { url } = await storagePut(key, buf, input.mimeType);
        return { url };
      }),

    /** Get analytics for the AquaClean finance dashboard */
    analytics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      return db.getAquacleanReceiptAnalytics();
    }),
  }),

  // ─── CMR REPORTS ──────────────────────────────────────────────────────────────
  cmr: router({
    /** Upsert a CMR report (create or update by localId) */
    upsert: protectedProcedure
      .input(z.object({
        localId: z.string(),
        consultantName: z.string().optional(),
        consultantUserId: z.string().optional(),
        clientName: z.string().optional(),
        appointmentDate: z.string().optional(),
        weekOf: z.string().optional(),
        dealStatus: z.string().optional(),
        outcome: z.string().optional(),
        purchaseConfidencePct: z.number().optional(),
        originalPcPct: z.number().optional(),
        estimatedContractValue: z.number().optional(),
        soldAt: z.string().optional(),
        reportData: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if this is a new report (no existing record with this localId)
        const existingReports = await db.getUserCmrReports(ctx.user.id);
        const isNew = !existingReports.some((r: any) => r.localId === input.localId);

        await db.upsertCmrReport({
          localId: input.localId,
          userId: ctx.user.id,
          companyId: ctx.user.companyId,
          consultantName: input.consultantName,
          consultantUserId: input.consultantUserId,
          clientName: input.clientName,
          appointmentDate: input.appointmentDate,
          weekOf: input.weekOf,
          dealStatus: input.dealStatus,
          outcome: input.outcome ?? 'open',
          purchaseConfidencePct: input.purchaseConfidencePct,
          originalPcPct: input.originalPcPct,
          estimatedContractValue: input.estimatedContractValue?.toString(),
          soldAt: input.soldAt,
          reportData: input.reportData,
        });

        // Notify managers/admins when a new CMR report is submitted
        if (isNew) {
          try {
            const managers = await db.getManagersAndAdminsWithPushToken();
            const allManagerIds = managers.map((m: any) => m.id as number);
            const targetIds = await filterByPref(allManagerIds, 'cmr_new');
            if (targetIds.length > 0) {
              const clientDisplay = input.clientName ?? 'a client';
              const consultantDisplay = input.consultantName ?? ctx.user.name ?? 'A consultant';
              await notifyUsers(
                targetIds,
                'New CMR Report Submitted',
                `${consultantDisplay} submitted a report for ${clientDisplay}.`,
                'cmr_new',
                { screen: 'cmr', localId: input.localId },
              );
            }
          } catch (notifError) {
            console.error('[PushNotifications] CMR notification failed:', notifError);
          }
        }

        return { success: true };
      }),

    /** List CMR reports — if userId is provided, always filter to that user; otherwise admins see all */
    list: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        outcome: z.string().optional(),
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
        minPc: z.number().optional(),
        maxPc: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === 'admin' || ctx.user.role === 'manager';
        // If a specific userId is requested, filter to that user (respects admin viewing own reports)
        if (input?.userId !== undefined) {
          return db.getUserCmrReports(input.userId);
        }
        // Non-admins always see only their own reports
        if (!isAdmin) {
          return db.getUserCmrReports(ctx.user.id);
        }
        // Admins with other filters
        if (input && Object.values(input).some((v) => v !== undefined)) {
          return db.getCmrReportsWithFilters(input);
        }
        return db.getAllCmrReports();
      }),

    /** Delete a CMR report (admin only) */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new Error('Unauthorized: admin role required');
        await db.deleteCmrReport(input.id);
        return { success: true };
      }),
    /** Export a CMR report as a PDF — generates server-side and returns an S3 URL */
    exportPDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const reports = await db.getAllCmrReports();
        const report = (reports as any[]).find((r: any) => r.id === input.id);
        if (!report) throw new Error('CMR report not found');
        const isAdmin = ctx.user.role === 'admin' || ctx.user.role === 'manager';
        if (!isAdmin && report.userId !== ctx.user.id) throw new Error('Unauthorized');
        const rd: any = report.reportData ?? {};
        const pdfBuffer = await generateCmrPDF({
          clientName: report.clientName,
          consultantName: report.consultantName,
          appointmentDate: report.appointmentDate,
          weekOf: report.weekOf,
          source: rd.source,
          address: rd.address,
          clientType: rd.clientType,
          appointmentType: rd.appointmentType,
          leadSources: rd.leadSources,
          projectTypes: rd.projectTypes,
          dealStatus: report.dealStatus,
          closeTimeline: rd.closeTimeline,
          followUpDate: rd.followUpDate,
          proposalDate: rd.proposalDate,
          lostReason: rd.lostReason,
          lastConversationSummary: rd.lastConversationSummary,
          purchaseConfidencePct: report.purchaseConfidencePct,
          originalPcPct: report.originalPcPct,
          estimatedContractValue: report.estimatedContractValue,
          decisionMakers: rd.decisionMakers,
          mainMotivation: rd.mainMotivation,
          mainHesitation: rd.mainHesitation,
          pcNotes: rd.pcNotes,
          financingDiscussed: rd.financingDiscussed,
          financingReaction: rd.financingReaction,
          valueCommunicated: rd.valueCommunicated,
          clientResponse: rd.clientResponse,
          objections: rd.objections,
          objectionNotes: rd.objectionNotes,
          nextActions: rd.nextActions,
          nextFollowUpDate: rd.nextFollowUpDate,
          leadQuality: rd.leadQuality,
          expectationAlignment: rd.expectationAlignment,
          messagingReferenced: rd.messagingReferenced,
          budgetAlignment: rd.budgetAlignment,
          marketingNotes: rd.marketingNotes,
          progressNotes: rd.progressNotes ?? [],
        });
        const safeName = (report.clientName ?? 'CMR').replace(/[^a-zA-Z0-9_-]/g, '_');
        const dateStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
        const ts = Date.now();
        const fileKey = `cmr/pdf/${safeName}_${dateStr}_${report.id}_${ts}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
        const fileName = `DOS_Hub_CMR_${safeName}_${dateStr}.pdf`;
        return { url, fileName };
      }),
  }),

  // ─── PROJECT MATERIAL DELIVERY ────────────────────────────────────────────
  projectMaterial: router({
    /** Create a new checklist (manager/admin only) */
    create: protectedProcedure
      .input(z.object({
        projectName: z.string(),
        clientName: z.string().optional(),
        projectLocation: z.string().optional(),
        supervisorUserId: z.number().optional(),
        supervisorName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Unauthorized: manager or admin role required');
        }
        const createdByName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') || ctx.user.name || ctx.user.email || 'Unknown';
        return db.createProjectMaterialChecklist({
          createdByUserId: ctx.user.id,
          createdByName,
          projectName: input.projectName,
          clientName: input.clientName,
          projectLocation: input.projectLocation,
          supervisorUserId: input.supervisorUserId,
          supervisorName: input.supervisorName,
          status: 'draft',
          auditTrail: [{ userId: ctx.user.id, userName: createdByName, action: 'Created checklist', timestamp: new Date().toISOString() }],
        });
      }),

    /** List all checklists */
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getAllProjectMaterialChecklists();
    }),

    /** Get a single checklist by ID */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getProjectMaterialChecklist(input.id);
      }),

    /** Update checklist inventory data */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        boxedItems: z.any().optional(),
        deliveryItems: z.any().optional(),
        projectSpecificItems: z.any().optional(),
        supervisorUserId: z.number().optional(),
        supervisorName: z.string().optional(),
        warehouseCheckoffs: z.any().optional(),
        attachments: z.any().optional(),
        materialsLoaded: z.boolean().optional(),
        materialsDelivered: z.boolean().optional(),
        materialsLoadedPhotos: z.array(z.string()).optional(),
        materialsDeliveredPhotos: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') || ctx.user.name || ctx.user.email || 'Unknown';
        await db.updateProjectMaterialChecklist(id, updates, { userId: ctx.user.id, userName });
        return { success: true };
      }),

    /** Advance the status of a checklist */
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string(),
        action: z.string(),
        projectName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') || ctx.user.name || ctx.user.email || 'Unknown';
        await db.updateProjectMaterialChecklistStatus(input.id, input.status, { userId: ctx.user.id, userName, action: input.action });

        // Send push notifications + in-app notifications for this status transition
        const notifConfig = MATERIAL_DELIVERY_NOTIFICATIONS[input.status];
        if (notifConfig) {
          const projectName = input.projectName ?? 'a project';
          const { title, body, targetRole } = notifConfig;
          // Determine which pref key applies to this notification type
          const prefKey = targetRole === 'Warehouse Manager'
            ? 'material_delivery_warehouse'
            : 'material_delivery_status';

          let candidateIds: number[] = [];
          if (targetRole) {
            // Users with the specific DOS job role
            const allUsers = await db.getAllUsers();
            candidateIds = allUsers
              .filter((u) => {
                const roles: string[] = (u.dosRoles as string[]) ?? [];
                return roles.includes(targetRole);
              })
              .map((u) => u.id);
          } else {
            // All admins and managers
            const allUsers = await db.getAllUsers();
            candidateIds = allUsers
              .filter((u) => u.role === 'admin' || u.role === 'manager')
              .map((u) => u.id);
          }

          const targetIds = await filterByPref(candidateIds, prefKey);
          if (targetIds.length > 0) {
            notifyUsers(targetIds, title, body(projectName), prefKey, {
              screen: '/(tabs)/modules/project-material-delivery',
              checklistId: input.id,
            }).catch(console.error);
          }
        }

        return { success: true };
      }),

    /** Upload a file attachment (purchase order PDF or photo) */
    uploadFile: protectedProcedure
      .input(z.object({
        id: z.number(),
        fileUrl: z.string(),
        fileName: z.string(),
        fileType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') || ctx.user.name || ctx.user.email || 'Unknown';
        await db.addProjectMaterialAttachment(input.id, {
          url: input.fileUrl,
          name: input.fileName,
          type: input.fileType,
          uploadedByName: userName,
          uploadedAt: new Date().toISOString(),
        });
        return { success: true };
      }),

    /** Delete a checklist (manager/admin only) */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Unauthorized: manager or admin role required');
        }
        await db.deleteProjectMaterialChecklist(input.id);
        return { success: true };
      }),

    /** Move status backward (manager/admin only) */
    revertStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string(),
        action: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Unauthorized: manager or admin role required');
        }
        const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') || ctx.user.name || ctx.user.email || 'Unknown';
        await db.updateProjectMaterialChecklistStatus(input.id, input.status, { userId: ctx.user.id, userName, action: input.action });
        return { success: true };
      }),

    /** Archive a checklist (manager/admin only) */
    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Unauthorized: manager or admin role required');
        }
        const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') || ctx.user.name || ctx.user.email || 'Unknown';
        await db.archiveProjectMaterialChecklist(input.id, { userName });
        return { success: true };
      }),

    /** Unarchive a checklist (manager/admin only) */
    unarchive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Unauthorized: manager or admin role required');
        }
        const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') || ctx.user.name || ctx.user.email || 'Unknown';
        await db.unarchiveProjectMaterialChecklist(input.id, { userName });
        return { success: true };
      }),

    /** Generate a PDF for a material delivery checklist */
    generatePdf: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const checklist = await db.getProjectMaterialChecklist(input.id);
        if (!checklist) throw new Error('Checklist not found');
        const { generateMaterialDeliveryPDF } = await import('./material-delivery-pdf');
        const { storagePut } = await import('./storage');
        const pdfBuffer = await generateMaterialDeliveryPDF({
          projectName: checklist.projectName,
          clientName: checklist.clientName,
          projectLocation: checklist.projectLocation,
          supervisorName: checklist.supervisorName,
          createdByName: checklist.createdByName,
          createdAt: checklist.createdAt,
          status: checklist.status,
          boxedItems: checklist.boxedItems,
          deliveryItems: checklist.deliveryItems,
          projectSpecificItems: checklist.projectSpecificItems,
          warehouseCheckoffs: checklist.warehouseCheckoffs as Record<string, boolean> | undefined,
          materialsLoaded: checklist.materialsLoaded ?? false,
          materialsDelivered: checklist.materialsDelivered ?? false,
          materialsLoadedByName: (checklist as any).materialsLoadedByName ?? null,
          materialsLoadedAt: (checklist as any).materialsLoadedAt ?? null,
          materialsDeliveredByName: (checklist as any).materialsDeliveredByName ?? null,
          materialsDeliveredAt: (checklist as any).materialsDeliveredAt ?? null,
          materialsLoadedPhotos: (checklist.materialsLoadedPhotos as string[] | null) ?? null,
          materialsDeliveredPhotos: (checklist.materialsDeliveredPhotos as string[] | null) ?? null,
          attachments: checklist.attachments as any,
          auditTrail: checklist.auditTrail as any,
        });
        const safeProjectName = (checklist.projectName || 'checklist').replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const fileKey = `material-delivery/pdf/${safeProjectName}-${input.id}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
        return { url, fileName: `${safeProjectName}-checklist.pdf` };
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

  notifications: router({
    /** Register or update the Expo push token for the current user */
    registerToken: protectedProcedure
      .input((input: unknown) => {
        const { z } = require("zod");
        return z.object({ token: z.string().min(1) }).parse(input);
      })
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPushToken(ctx.user.id, input.token);
        return { success: true };
      }),

    /** Get all in-app notifications for the current user */
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserNotifications(ctx.user.id);
    }),

    /** Get unread notification count for the current user */
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const count = await db.getUnreadNotificationCount(ctx.user.id);
      return { count };
    }),

    /** Mark a specific notification as read */
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Mark all notifications as read for the current user */
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),

    /** Delete a notification */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteNotification(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Get notification preferences for the current user */
    getPrefs: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await db.getNotificationPrefs(ctx.user.id);
      return prefs ?? {};
    }),

     /** Update notification preferences for the current user */
    updatePrefs: protectedProcedure
      .input(z.object({ prefs: z.record(z.string(), z.boolean()) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateNotificationPrefs(ctx.user.id, input.prefs);
        return { success: true };
      }),
  }),

  // ─── PRECONSTRUCTION CHECKLISTS ────────────────────────────────────────────
  precon: router({
    /** Create a new preconstruction checklist */
    create: protectedProcedure
      .input(z.object({
        projectName: z.string(),
        projectAddress: z.string().optional(),
        meetingDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const supervisorName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') || ctx.user.name || ctx.user.email || 'Unknown';
        const result = await db.createPreconChecklist({
          userId: ctx.user.id,
          supervisorName,
          companyId: (ctx.user as any).companyId ?? null,
          projectName: input.projectName,
          projectAddress: input.projectAddress,
          meetingDate: input.meetingDate,
        });
        return result;
      }),

    /** Get a single checklist by ID */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const checklist = await db.getPreconChecklist(input.id);
        if (!checklist) return undefined;
        // Merge photoData back into formData.photoUris so the client can display photos
        if (checklist.photoData) {
          try {
            const photoUris = JSON.parse(checklist.photoData as string);
            checklist.formData = { ...(checklist.formData ?? {}), photoUris } as any;
          } catch {}
        }
        return checklist;
      }),

    /** List all checklists (managers/admins see all, others see own) */
    list: protectedProcedure.query(async ({ ctx }) => {
      const isManagerOrAdmin = ctx.user.role === 'admin' || ctx.user.role === 'manager';
      return db.listPreconChecklists(isManagerOrAdmin ? undefined : { userId: ctx.user.id });
    }),

    /** Update form data and/or status */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectName: z.string().optional(),
        projectAddress: z.string().optional(),
        meetingDate: z.string().optional(),
        status: z.string().optional(),
        formData: z.record(z.string(), z.unknown()).optional(),
        supervisorSignature: z.string().optional(),
        supervisorSignedName: z.string().optional(),
        client1Signature: z.string().optional(),
        client1SignedName: z.string().optional(),
        client2Signature: z.string().optional(),
        client2SignedName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const now = new Date();
        const patch: any = { ...updates };
        // Extract photoUris from formData and store in dedicated photoData column
        // This avoids the 65KB JSON column limit for base64 photo data
        if (updates.formData && typeof updates.formData === 'object') {
          const fd = updates.formData as Record<string, unknown>;
          if (fd.photoUris) {
            patch.photoData = JSON.stringify(fd.photoUris);
            // Remove photoUris from formData to keep it small
            const { photoUris, ...restFormData } = fd;
            patch.formData = restFormData;
          }
        }
        if (updates.supervisorSignature && !patch.supervisorSignedAt) patch.supervisorSignedAt = now;
        if (updates.client1Signature && !patch.client1SignedAt) patch.client1SignedAt = now;
        if (updates.client2Signature && !patch.client2SignedAt) patch.client2SignedAt = now;
        await db.updatePreconChecklist(id, patch);
        return { success: true };
      }),

    /** Delete a checklist (manager/admin or owner) */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const checklist = await db.getPreconChecklist(input.id);
        if (!checklist) throw new Error('Not found');
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager' && checklist.userId !== ctx.user.id) {
          throw new Error('Unauthorized');
        }
        await db.deletePreconChecklist(input.id);
        return { success: true };
      }),

    /** Generate PDF for a checklist */
    generatePdf: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const checklist = await db.getPreconChecklist(input.id);
        if (!checklist) throw new Error('Checklist not found');
        const { generatePreconPdf } = await import('./precon-pdf.js');
        const pdfBuffer = await generatePreconPdf(checklist);
        const base64 = pdfBuffer.toString('base64');
        return { base64, mimeType: 'application/pdf' };
      }),

    /** List all checklists for dashboard (managers/admins), optionally including archived */
    listAll: protectedProcedure
      .input(z.object({ includeArchived: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        const isManagerOrAdmin = ctx.user.role === 'admin' || ctx.user.role === 'manager';
        return db.listPreconChecklists(
          isManagerOrAdmin ? undefined : { userId: ctx.user.id },
          { includeArchived: input.includeArchived ?? false }
        );
      }),

    /** Archive a checklist (managers/admins only) */
    archive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Only managers and admins can archive checklists');
        }
        const archivedByName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(' ') || ctx.user.name || 'Unknown';
        await db.updatePreconChecklist(input.id, {
          archived: true,
          archivedAt: new Date(),
          archivedByName,
        } as any);
        return { success: true };
      }),

    /** Unarchive a checklist (managers/admins only) */
    unarchive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Only managers and admins can unarchive checklists');
        }
        await db.updatePreconChecklist(input.id, {
          archived: false,
          archivedAt: null,
          archivedByName: null,
        } as any);
        return { success: true };
      }),
  }),
  // ─── TIME OFF ──────────────────────────────────────────────────────────────
  timeOff: router({
    /** Get the current user's PTO policy */
    getMyPolicy: protectedProcedure.query(async ({ ctx }) => {
      return db.getTimeOffPolicy(ctx.user.id);
    }),

    /** Admin: get all PTO policies with user info */
    getAllPolicies: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
        throw new Error('Only managers and admins can view all policies');
      }
      const policies = await db.getAllTimeOffPolicies();
      const users = await db.getAllUsers();
      return policies.map((p) => {
        const user = users.find((u) => u.id === p.userId);
        return { ...p, userName: user?.name || user?.email || `User #${p.userId}` };
      });
    }),

    /** Admin: get PTO policy for a specific user */
    getPolicyForUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Only managers and admins can view user policies');
        }
        return db.getTimeOffPolicy(input.userId);
      }),
    /** Admin: upsert a PTO policy for a user */
    upsertPolicy: protectedProcedure
      .input(z.object({
        userId: z.number(),
        totalDaysAllowed: z.string().optional(),
        totalHoursAllowed: z.string().optional(),
        periodStartDate: z.string().optional(),
        periodEndDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Only managers and admins can update PTO policies');
        }
        const id = await db.upsertTimeOffPolicy({
          userId: input.userId,
          totalDaysAllowed: input.totalDaysAllowed,
          totalHoursAllowed: input.totalHoursAllowed,
          periodStartDate: input.periodStartDate,
          periodEndDate: input.periodEndDate,
          notes: input.notes,
        });
        return { id };
      }),

    /** Submit a new time off request */
    submitRequest: protectedProcedure
      .input(z.object({
        requestType: z.string().default('vacation'),
        startDate: z.string(),
        endDate: z.string(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        totalDays: z.string().optional(),
        totalHours: z.string().optional(),
        reason: z.string().optional(),
        periodYear: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createTimeOffRequest({
          userId: ctx.user.id,
          companyId: ctx.user.companyId ?? null,
          requestType: input.requestType,
          startDate: input.startDate,
          endDate: input.endDate,
          startTime: input.startTime,
          endTime: input.endTime,
          totalDays: input.totalDays,
          totalHours: input.totalHours,
          reason: input.reason,
          periodYear: input.periodYear,
          status: 'pending',
        });
        return { id };
      }),

    /** Get the current user's own requests */
    getMyRequests: protectedProcedure
      .input(z.object({ periodYear: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        if (input?.periodYear) {
          return db.getUserTimeOffRequestsByPeriod(ctx.user.id, input.periodYear);
        }
        return db.getUserTimeOffRequests(ctx.user.id);
      }),

    /** Admin/manager: get all requests with optional filters */
    getAllRequests: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
        status: z.string().optional(),
        periodYear: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Only managers and admins can view all requests');
        }
        const requests = await db.getAllTimeOffRequests(input || {});
        const users = await db.getAllUsers();
        return requests.map((r) => {
          const user = users.find((u) => u.id === r.userId);
          return { ...r, userName: user?.name || user?.email || `User #${r.userId}` };
        });
      }),

    /** Admin/manager: approve or deny a request */
    reviewRequest: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['approved', 'denied']),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Only managers and admins can review requests');
        }
        await db.reviewTimeOffRequest(input.id, input.status, ctx.user.id, input.reviewNotes);
        return { success: true };
      }),

    /** Employee: cancel own pending request */
    cancelRequest: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const req = await db.getTimeOffRequest(input.id);
        if (!req) throw new Error('Request not found');
        if (req.userId !== ctx.user.id && ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Not authorized');
        }
        await db.cancelTimeOffRequest(input.id);
        return { success: true };
      }),

    /** Get used PTO days for current user in a period */
    getUsedDays: protectedProcedure
      .input(z.object({ periodYear: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const used = await db.getUsedPTODays(ctx.user.id, input?.periodYear);
        return { usedDays: used };
      }),

    /** Admin: get used PTO days for any user */
    getUserUsedDays: protectedProcedure
      .input(z.object({ userId: z.number(), periodYear: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
          throw new Error('Not authorized');
        }
        const used = await db.getUsedPTODays(input.userId, input.periodYear);
        return { usedDays: used };
      }),
     /** Admin/manager/Owner only: permanently delete a time off request */
    deleteRequest: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dosRoles = (ctx.user.dosRoles as string[]) ?? [];
        const isAuthorized =
          ctx.user.role === 'admin' ||
          ctx.user.role === 'manager' ||
          dosRoles.includes('Owner') ||
          dosRoles.includes('Operations Manager') ||
          dosRoles.includes('Project Manager');
        if (!isAuthorized) {
          throw new Error('Only admins, managers, and Owners can delete time off requests');
        }
        await db.deleteTimeOffRequest(input.id);
        return { success: true };
      }),
    /** Soft-delete: marks deletedAt so the record is hidden but restorable within 30s */
    softDelete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dosRoles = (ctx.user.dosRoles as string[]) ?? [];
        const isAuthorized =
          ctx.user.role === 'admin' ||
          ctx.user.role === 'manager' ||
          dosRoles.includes('Owner') ||
          dosRoles.includes('Operations Manager') ||
          dosRoles.includes('Project Manager');
        if (!isAuthorized) throw new Error('Not authorized');
        await db.softDeleteTimeOffRequest(input.id);
        return { success: true };
      }),
    /** Restore a soft-deleted request (undo delete within 30s window) */
    restoreRequest: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dosRoles = (ctx.user.dosRoles as string[]) ?? [];
        const isAuthorized =
          ctx.user.role === 'admin' ||
          ctx.user.role === 'manager' ||
          dosRoles.includes('Owner') ||
          dosRoles.includes('Operations Manager') ||
          dosRoles.includes('Project Manager');
        if (!isAuthorized) throw new Error('Not authorized');
        await db.restoreTimeOffRequest(input.id);
        return { success: true };
      }),
    /** Admin/manager: change the status of any request at any time (override after approval) */
    changeStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'approved', 'denied', 'cancelled']),
        reviewNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dosRoles = (ctx.user.dosRoles as string[]) ?? [];
        const isAuthorized =
          ctx.user.role === 'admin' ||
          ctx.user.role === 'manager' ||
          dosRoles.includes('Owner') ||
          dosRoles.includes('Operations Manager');
        if (!isAuthorized) throw new Error('Not authorized');
        await db.reviewTimeOffRequest(input.id, input.status as any, ctx.user.id, input.reviewNotes);
        return { success: true };
      }),

    /** Admin/manager: get all requests for calendar display (approved + pending, with user info) */
    getCalendarRequests: protectedProcedure
      .query(async ({ ctx }) => {
        const dosRoles = (ctx.user.dosRoles as string[]) ?? [];
        const isAuthorized =
          ctx.user.role === 'admin' ||
          ctx.user.role === 'manager' ||
          dosRoles.includes('Owner') ||
          dosRoles.includes('Operations Manager');
        if (!isAuthorized) throw new Error('Not authorized');
        const allRequests = await db.getAllTimeOffRequests({});
        const calendarRequests = allRequests.filter(
          (r) => r.status === 'approved' || r.status === 'pending'
        );
        const users = await db.getAllUsers();
        return calendarRequests.map((r) => {
          const user = users.find((u) => u.id === r.userId);
          return {
            ...r,
            userName: user?.name || user?.email || `User #${r.userId}`,
            userEmail: user?.email || '',
          };
        });
      }),
  }),
});
export type AppRouter = typeof appRouter;
