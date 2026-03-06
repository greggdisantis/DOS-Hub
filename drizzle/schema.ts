import { boolean, int, json, mediumtext, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

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
   * - admin: full access to all features and admin tools
   * - super-admin: unrestricted access to everything, can promote others to super-admin
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
  /** Whether this user is an employee eligible for PTO tracking in the Time Off module */
  isEmployee: boolean("isEmployee").default(false).notNull(),
  /** Expo push notification token for sending remote notifications */
  expoPushToken: varchar("expoPushToken", { length: 255 }),
  /**
   * Notification preferences — JSON map of notification type -> boolean.
   * e.g. { cmr_new: true, order_status: false, material_delivery: true }
   * Null means all notifications are enabled (default).
   */
  notificationPrefs: json("notification_prefs").$type<Record<string, boolean>>(),
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
  /** Whether this receipt has been marked as processed/archived by an admin or manager */
  archived: boolean("archived").default(false).notNull(),
  /** When the receipt was archived */
  archivedAt: timestamp("archivedAt"),
  /** Who archived the receipt (userId) */
  archivedBy: int("archivedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * AquaClean Receipts table — separate from standard Receipt Capture for AquaClean-specific expense tracking.
 * Same schema as receipts but stores in a separate table for data isolation.
 */
export const aquacleanReceipts = mysqlTable("aquaclean_receipts", {
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
  lineItems: json("lineItems").$type<Array<{ description: string; quantity: number; unitPrice: number; lineTotal: number }>>(),
  workOrderNumber: varchar("workOrderNumber", { length: 64 }),
  jobName: varchar("jobName", { length: 255 }),
  poNumber: varchar("poNumber", { length: 64 }),
  materialCategory: varchar("materialCategory", { length: 64 }).default("Miscellaneous"),
  expenseType: mysqlEnum("expenseType", ["JOB", "OVERHEAD"]).default("JOB"),
  overheadCategory: varchar("overheadCategory", { length: 128 }),
  notes: text("notes"),
  fileName: varchar("fileName", { length: 255 }),
  archived: boolean("archived").default(false).notNull(),
  archivedAt: timestamp("archivedAt"),
  archivedBy: int("archivedBy"),
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
 * Project Material Delivery checklists table.
 * Stores the full multi-step checklist workflow for project material delivery.
 */
export const projectMaterialChecklists = mysqlTable("project_material_checklists", {
  id: int("id").autoincrement().primaryKey(),
  /** The user who created this checklist */
  createdByUserId: int("createdByUserId").notNull(),
  createdByName: varchar("createdByName", { length: 255 }),
  /** Project details */
  projectName: varchar("projectName", { length: 255 }).notNull(),
  clientName: varchar("clientName", { length: 255 }),
  projectLocation: text("projectLocation"),
  /** Assigned project supervisor (userId) */
  supervisorUserId: int("supervisorUserId"),
  supervisorName: varchar("supervisorName", { length: 255 }),
  /**
   * Workflow status:
   * draft -> ready_for_supervisor -> awaiting_main_office -> awaiting_warehouse
   * -> final_review -> complete -> closed
   */
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  /** Full inventory data as JSON (boxed items, delivery items, project specific items) */
  boxedItems: json("boxedItems").$type<Record<string, unknown>>(),
  deliveryItems: json("deliveryItems").$type<Record<string, unknown>>(),
  projectSpecificItems: json("projectSpecificItems").$type<Record<string, unknown>>(),
  /** Warehouse check-off state (which boxed items have been pulled) */
  warehouseCheckoffs: json("warehouseCheckoffs").$type<Record<string, boolean>>(),
  /** Audit trail — array of {userId, userName, action, timestamp} */
  auditTrail: json("auditTrail").$type<Array<{ userId: number; userName: string; action: string; timestamp: string }>>(),
  /** Uploaded file URLs (purchase order PDFs, delivery photos) */
  attachments: json("attachments").$type<Array<{ url: string; name: string; type: string; uploadedByName: string; uploadedAt: string }>>(),
  /** Photos uploaded when materials are loaded */
  materialsLoadedPhotos: json("materialsLoadedPhotos").$type<string[]>(),
  /** Photos uploaded when materials are delivered */
  materialsDeliveredPhotos: json("materialsDeliveredPhotos").$type<string[]>(),
  /** Whether materials have been loaded onto truck */
  materialsLoaded: boolean("materialsLoaded").default(false).notNull(),
  /** Whether materials have been delivered */
  materialsDelivered: boolean("materialsDelivered").default(false).notNull(),
  /** Name of the user who checked off Materials Loaded */
  materialsLoadedByName: varchar("materialsLoadedByName", { length: 255 }),
  /** Timestamp when Materials Loaded was checked off */
  materialsLoadedAt: timestamp("materialsLoadedAt"),
  /** Name of the user who checked off Materials Delivered */
  materialsDeliveredByName: varchar("materialsDeliveredByName", { length: 255 }),
  /** Timestamp when Materials Delivered was checked off */
  materialsDeliveredAt: timestamp("materialsDeliveredAt"),
  /** Whether this checklist has been archived (managers/admins only) */
  archived: boolean("archived").default(false).notNull(),
  /** When the checklist was archived */
  archivedAt: timestamp("archivedAt"),
  /** Name of the user who archived the checklist */
  archivedByName: varchar("archivedByName", { length: 255 }),
  companyId: int("companyId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * In-app notifications table — stores all notifications sent to users.
 * Used for the notification center and unread badge count.
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  /** The user this notification is for */
  userId: int("user_id").notNull(),
  /** Short title shown in notification center */
  title: varchar("title", { length: 255 }).notNull(),
  /** Full notification body */
  body: text("body").notNull(),
  /**
   * Notification type — used for filtering and preferences:
   * cmr_new, order_status, material_delivery_status, material_delivery_warehouse
   */
  type: varchar("type", { length: 100 }).notNull().default("general"),
  /** Optional extra data (e.g. { checklistId: 42 }) for deep-linking */
  data: json("data").$type<Record<string, unknown>>(),
  /** Whether the user has read this notification */
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Pre-Construction Meeting Checklists table.
 * Supervisors fill this out during the pre-construction meeting with the client.
 */
export const preconChecklists = mysqlTable("preconstruction_checklists", {
  id: int("id").autoincrement().primaryKey(),
  /** The supervisor who created this checklist */
  userId: int("userId").notNull(),
  supervisorName: varchar("supervisorName", { length: 255 }),
  companyId: int("companyId"),
  /** Project info */
  projectName: varchar("projectName", { length: 255 }),
  projectAddress: text("projectAddress"),
  meetingDate: varchar("meetingDate", { length: 10 }),
  /** Status: draft | completed | signed */
  status: varchar("status", { length: 32 }).default("draft").notNull(),
  /**
   * All form data stored as JSON:
   * { section1, section2_struxure, section3_decorative, section4_pergola,
   *   section5_expectations, section6_photos, section7_materials,
   *   section8_workItems, section9_notes, section10_signatures }
   */
  formData: json("formData").$type<Record<string, unknown>>(),
  /**
   * Photo data stored separately as mediumtext (supports up to 16MB).
   * Stored as JSON: Record<string, string[]> where key = photoKey, value = array of base64 data URIs.
   */
  photoData: mediumtext("photoData"),
  /** Supervisor signature data URL */
  supervisorSignature: text("supervisorSignature"),
  supervisorSignedName: varchar("supervisorSignedName", { length: 255 }),
  supervisorSignedAt: timestamp("supervisorSignedAt"),
  /** Client 1 signature */
  client1Signature: text("client1Signature"),
  client1SignedName: varchar("client1SignedName", { length: 255 }),
  client1SignedAt: timestamp("client1SignedAt"),
  /** Client 2 signature (optional) */
  client2Signature: text("client2Signature"),
  client2SignedName: varchar("client2SignedName", { length: 255 }),
  client2SignedAt: timestamp("client2SignedAt"),
  /** Whether this checklist has been archived (managers/admins only) */
  archived: boolean("archived").default(false).notNull(),
  /** When the checklist was archived */
  archivedAt: timestamp("archivedAt"),
  /** Name of the user who archived the checklist */
  archivedByName: varchar("archivedByName", { length: 255 }),
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
export type ProjectMaterialChecklist = typeof projectMaterialChecklists.$inferSelect;
export type InsertProjectMaterialChecklist = typeof projectMaterialChecklists.$inferInsert;
export type ModulePermission = typeof modulePermissions.$inferSelect;
export type InsertModulePermission = typeof modulePermissions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type PreconChecklist = typeof preconChecklists.$inferSelect;
export type InsertPreconChecklist = typeof preconChecklists.$inferInsert;

// System role type
export type SystemRole = 'pending' | 'guest' | 'member' | 'manager' | 'admin';

// ─── TIME OFF ─────────────────────────────────────────────────────────────────

/** Per-user PTO policy: how many days/hours allowed per period and when it resets */
export const timeOffPolicies = mysqlTable("time_off_policies", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  /** Total paid days allowed per period (e.g. 10) */
  totalDaysAllowed: decimal("totalDaysAllowed", { precision: 5, scale: 2 }).default("0"),
  /** Total paid hours allowed per period (alternative to days) */
  totalHoursAllowed: decimal("totalHoursAllowed", { precision: 6, scale: 2 }).default("0"),
  /** Start date of the current PTO period (YYYY-MM-DD) */
  periodStartDate: varchar("periodStartDate", { length: 10 }),
  /** End date of the current PTO period (YYYY-MM-DD) */
  periodEndDate: varchar("periodEndDate", { length: 10 }),
  /** Admin notes about this employee's PTO package */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

/** Individual time off request submitted by an employee */
export const timeOffRequests = mysqlTable("time_off_requests", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  /** Type of time off: vacation, sick, personal, bereavement, unpaid, other */
  requestType: varchar("requestType", { length: 50 }).default("vacation").notNull(),
  /** Start date of the time off (YYYY-MM-DD) */
  startDate: varchar("startDate", { length: 10 }).notNull(),
  /** End date of the time off (YYYY-MM-DD) */
  endDate: varchar("endDate", { length: 10 }).notNull(),
  /** Optional start time (HH:MM) for partial-day requests */
  startTime: varchar("startTime", { length: 5 }),
  /** Optional end time (HH:MM) for partial-day requests */
  endTime: varchar("endTime", { length: 5 }),
  /** Total number of days requested */
  totalDays: decimal("totalDays", { precision: 5, scale: 2 }).default("0"),
  /** Total number of hours requested */
  totalHours: decimal("totalHours", { precision: 6, scale: 2 }).default("0"),
  /** Employee's reason for the request */
  reason: text("reason"),
  /** Status: pending, approved, denied, cancelled */
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  /** UserId of the manager who reviewed */
  reviewedBy: int("reviewedBy"),
  /** When the request was reviewed */
  reviewedAt: timestamp("reviewedAt"),
  /** Manager's note on approval/denial */
  reviewNotes: text("reviewNotes"),
  /** Which PTO period year this request belongs to (e.g. "2025-2026") */
  periodYear: varchar("periodYear", { length: 20 }),
   createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
  /** Soft-delete timestamp — set when admin deletes, null means active. Hard-delete runs after 30s undo window. */
  deletedAt: timestamp("deletedAt"),
});
export type TimeOffPolicy = typeof timeOffPolicies.$inferSelect;
export type InsertTimeOffPolicy = typeof timeOffPolicies.$inferInsert;
export type TimeOffRequest = typeof timeOffRequests.$inferSelect;
export type InsertTimeOffRequest = typeof timeOffRequests.$inferInsert;

// ─── SUPER-ADMIN AUDIT & NOTIFICATIONS ─────────────────────────────────────────

/**
 * Audit log table — tracks all super-admin actions for compliance and security.
 * Records role changes, user approvals, system modifications, and other critical actions.
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** ID of the super-admin who performed the action */
  superAdminId: int("superAdminId").notNull(),
  /** Type of action: role_change, user_approval, user_rejection, permission_update, module_permission_change, etc. */
  actionType: varchar("actionType", { length: 64 }).notNull(),
  /** ID of the user affected by the action (if applicable) */
  affectedUserId: int("affectedUserId"),
  /** Human-readable description of what was changed */
  description: text("description").notNull(),
  /** JSON object containing before/after values for the change */
  details: json("details").$type<Record<string, any>>(),
  /** IP address or client identifier (optional) */
  clientInfo: varchar("clientInfo", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Super-admin notifications table — stores critical system events that only super-admins can see.
 * Examples: unusual activity, security alerts, system health warnings, bulk user actions.
 */
export const superAdminNotifications = mysqlTable("super_admin_notifications", {
  id: int("id").autoincrement().primaryKey(),
  /** Type of notification: security_alert, system_health, user_activity, bulk_action, etc. */
  notificationType: varchar("notificationType", { length: 64 }).notNull(),
  /** Severity level: info, warning, critical */
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  /** Title of the notification */
  title: varchar("title", { length: 255 }).notNull(),
  /** Detailed message */
  message: text("message").notNull(),
  /** JSON object with additional context/data */
  data: json("data").$type<Record<string, any>>(),
  /** Whether the notification has been read by any super-admin */
  isRead: boolean("isRead").default(false).notNull(),
  /** When the notification was marked as read */
  readAt: timestamp("readAt"),
  /** ID of the super-admin who read it (if applicable) */
  readBy: int("readBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Export types
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type SuperAdminNotification = typeof superAdminNotifications.$inferSelect;
export type InsertSuperAdminNotification = typeof superAdminNotifications.$inferInsert;
