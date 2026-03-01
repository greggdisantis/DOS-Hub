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

    /** Delete a receipt (admin only) */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Unauthorized: admin role required");
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

    /** Get analytics for the finance dashboard */
    analytics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      return db.getReceiptAnalytics();
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
