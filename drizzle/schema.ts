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
  /** Role hierarchy: pending (unapproved) → technician → manager → admin */
  role: mysqlEnum("role", ["user", "admin", "pending", "technician", "manager"]).default("pending").notNull(),
  /** Whether the user has been approved by an admin */
  approved: boolean("approved").default(false).notNull(),
  companyId: int("companyId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
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
  imageUrl: text("imageUrl"),
  workOrderNumber: varchar("workOrderNumber", { length: 64 }),
  jobName: varchar("jobName", { length: 255 }),
  poNumber: varchar("poNumber", { length: 64 }),
  materialCategory: mysqlEnum("materialCategory", ["Structures", "Screens", "Electrical", "Miscellaneous", "Fuel", "Tools"]).default("Miscellaneous"),
  expenseType: mysqlEnum("expenseType", ["JOB", "OVERHEAD"]).default("JOB"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
export type ZoningLookup = typeof zoningLookups.$inferSelect;
export type InsertZoningLookup = typeof zoningLookups.$inferInsert;
