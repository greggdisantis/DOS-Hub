import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with approval status and DOS-specific roles.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /**
   * System role — controls app-wide access level:
   * - pending: no access until approved by Admin
   * - guest: read-only preview of permitted modules, no save/export/reports/settings
   * - member: full access to own work only (soft-delete goes to bin)
   * - manager: full access to all work + modifications, no admin tools
   * - admin: no restrictions
   */
  role: varchar("role", { length: 32 }).default("pending").notNull(),
  /** Whether the user has been approved by an admin */
  approved: boolean("approved").default(false).notNull(),
  companyId: int("companyId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** First name — required on first login */
  firstName: varchar("firstName", { length: 128 }),
  /** Last name — required on first login */
  lastName: varchar("lastName", { length: 128 }),
  /** DOS-specific job roles (array of strings from the 17-role list) */
  dosRoles: json("dosRoles").$type<string[]>(),
  /** Legacy per-user module permissions (superseded by module_permissions table for job-role-based access) */
  permissions: json("permissions").$type<Record<string, boolean>>(),
});

/**
 * Module permissions table — maps each DOS Hub module to the job roles that have access.
 * Managed exclusively by Owner-role users via the Module Permissions admin screen.
 * Owner job role always has access to all modules regardless of this table.
 */
export const modulePermissions = mysqlTable("module_permissions", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique slug matching the Expo Router module path (e.g. "receipt-capture") */
  moduleKey: varchar("moduleKey", { length: 64 }).notNull().unique(),
  /** Human-readable display name */
  moduleName: varchar("moduleName", { length: 128 }).notNull(),
  /** Array of job role names (from the 17-role list) that have access to this module */
  allowedJobRoles: json("allowedJobRoles").$type<string[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Companies table for white-label multi-tenancy.
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logoUrl"),
  primaryColor: varchar("primaryColor", { length: 7 }).default("#1E3A5F"),
  secondaryColor: varchar("secondaryColor", { length: 7 }),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "basic", "pro", "enterprise"]).default("free").notNull(),
  subscriptionActive: boolean("subscriptionActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Projects table for tracking work across modules.
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  status: mysqlEnum("status", ["active", "completed", "on_hold", "cancelled"]).default("active").notNull(),
  hubspotDealId: varchar("hubspotDealId", { length: 64 }),
  serviceFusionJobId: varchar("serviceFusionJobId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Screen orders table — stores the full order data as JSON.
 * Each order is linked to a user and optionally a project.
 */
export const screenOrders = mysqlTable("screen_orders", {
  id: int("id").autoincrement().primaryKey(),
  /** The user who created this order */
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  projectId: int("projectId"),
  /** Display title for the order (project name + date) */
  title: varchar("title", { length: 255 }).notNull(),
  /** Current status of the order */
  status: mysqlEnum("status", ["draft", "submitted", "approved", "rejected", "completed"]).default("draft").notNull(),
  /** The full order state as JSON (OrderState from screen-ordering types) */
  orderData: json("orderData").notNull(),
  /** Total number of screens in this order */
  screenCount: int("screenCount").default(1).notNull(),
  /** The manufacturer selected */
  manufacturer: varchar("manufacturer", { length: 64 }),
  /** Notes from the submitter */
  submitterNotes: text("submitterNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Order revisions table — audit trail for every change.
 * When a manager or admin edits an order, a new revision is created
 * preserving the previous state. The original is always revision 1.
 */
export const orderRevisions = mysqlTable("order_revisions", {
  id: int("id").autoincrement().primaryKey(),
  /** The order this revision belongs to */
  orderId: int("orderId").notNull(),
  /** Sequential revision number (1 = original, 2 = first edit, etc.) */
  revisionNumber: int("revisionNumber").notNull(),
  /** Who made this revision */
  editedByUserId: int("editedByUserId").notNull(),
  /** Name of the editor at time of edit */
  editedByName: varchar("editedByName", { length: 255 }),
  /** What was changed (brief description) */
  changeDescription: text("changeDescription"),
  /** The full order state snapshot at this revision */
  orderData: json("orderData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Receipts table for expense tracking.
 */
export const receipts = mysqlTable("receipts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  projectId: int("projectId"),
  submitterName: varchar("submitterName", { length: 255 }),
  vendorName: varchar("vendorName", { length: 255 }),
  vendorLocation: text("vendorLocation"),
  purchaseDate: varchar("purchaseDate", { length: 10 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  tax: decimal("tax", { precision: 10, scale: 2 }),
  total: decimal("total", { precision: 10, scale: 2 }),
  /** S3 URL of the uploaded receipt image */
  imageUrl: text("imageUrl"),
  /** Line items extracted from the receipt */
  lineItems: json("lineItems").$type<Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number }>>(),
  workOrderNumber: varchar("workOrderNumber", { length: 64 }),
  jobName: varchar("jobName", { length: 255 }),
  poNumber: varchar("poNumber", { length: 64 }),
  materialCategory: varchar("materialCategory", { length: 64 }).default("Miscellaneous"),
  expenseType: mysqlEnum("expenseType", ["JOB", "OVERHEAD"]).default("JOB"),
  /** Category for overhead expenses */
  overheadCategory: varchar("overheadCategory", { length: 128 }),
  notes: text("notes"),
  /** Generated filename: VendorName_D-M-YYYY_HHmmss */
  fileName: varchar("fileName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Client Meeting Reports table — synced from device AsyncStorage to allow
 * admin/manager cross-user reporting in the CMR Reports dashboard.
 */
export const cmrReports = mysqlTable("cmr_reports", {
  id: int("id").autoincrement().primaryKey(),
  /** The local AsyncStorage ID (cmr_TIMESTAMP_RANDOM) */
  localId: varchar("localId", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  consultantName: varchar("consultantName", { length: 255 }),
  consultantUserId: varchar("consultantUserId", { length: 64 }),
  clientName: varchar("clientName", { length: 255 }),
  appointmentDate: varchar("appointmentDate", { length: 10 }),
  weekOf: varchar("weekOf", { length: 10 }),
  dealStatus: varchar("dealStatus", { length: 64 }),
  outcome: varchar("outcome", { length: 16 }).default("open"),
  purchaseConfidencePct: int("purchaseConfidencePct"),
  originalPcPct: int("originalPcPct"),
  estimatedContractValue: decimal("estimatedContractValue", { precision: 12, scale: 2 }),
  soldAt: varchar("soldAt", { length: 32 }),
  /** Full report JSON blob */
  reportData: json("reportData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Zoning lookups table for property research history.
 */
export const zoningLookups = mysqlTable("zoning_lookups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  projectId: int("projectId"),
  address: text("address"),
  county: varchar("county", { length: 128 }),
  municipality: varchar("municipality", { length: 128 }),
  state: varchar("state", { length: 2 }),
  zoningCode: varchar("zoningCode", { length: 64 }),
  zoningStatus: mysqlEnum("zoningStatus", ["CONFIRMED", "UNVERIFIED", "UNKNOWN"]).default("UNKNOWN"),
  parcelId: varchar("parcelId", { length: 64 }),
  lotSqft: decimal("lotSqft", { precision: 12, scale: 2 }),
  permitSummaryUrl: text("permitSummaryUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type ScreenOrder = typeof screenOrders.$inferSelect;
export type InsertScreenOrder = typeof screenOrders.$inferInsert;
export type OrderRevision = typeof orderRevisions.$inferSelect;
export type InsertOrderRevision = typeof orderRevisions.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;
export type CmrReport = typeof cmrReports.$inferSelect;
export type InsertCmrReport = typeof cmrReports.$inferInsert;
export type ZoningLookup = typeof zoningLookups.$inferSelect;
export type InsertZoningLookup = typeof zoningLookups.$inferInsert;
export type ModulePermission = typeof modulePermissions.$inferSelect;
export type InsertModulePermission = typeof modulePermissions.$inferInsert;

// System role type
export type SystemRole = 'pending' | 'guest' | 'member' | 'manager' | 'admin';
