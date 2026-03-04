import { and, desc, eq, gte, lte, like, ne, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertScreenOrder,
  InsertOrderRevision,
  InsertReceipt,
  InsertCmrReport,
  InsertProjectMaterialChecklist,
  InsertNotification,
  SystemRole,
  users,
  screenOrders,
  orderRevisions,
  modulePermissions,
  receipts,
  cmrReports,
  projectMaterialChecklists,
  notifications,
  preconChecklists,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _connectionPool: any = null;

// Lazily create the drizzle instance with proper connection pooling
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const mysql = await import("mysql2");
      
      // Create connection pool with proper configuration to avoid ECONNRESET
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 10,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });
      
      _connectionPool = pool;
      _db = drizzle(pool);
      
      console.log("[Database] Connected with pool (limit: 5, queue: 10)");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _connectionPool = null;
    }
  }
  return _db;
}

// Close database connection on shutdown
export async function closeDb() {
  if (_connectionPool) {
    try {
      await _connectionPool.end();
      console.log("[Database] Connection pool closed");
      _db = null;
      _connectionPool = null;
    } catch (error) {
      console.warn("[Database] Failed to close pool:", error);
    }
  }
}

// ─── USER QUERIES ───────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    // Owner always gets admin role and auto-approved
    if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      values.approved = true;
      updateSet.role = "admin";
      updateSet.approved = true;
    } else if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.approved, false)).orderBy(desc(users.createdAt));
}

export async function approveUser(userId: number, role: SystemRole) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ approved: true, role }).where(eq(users.id, userId));
}

export async function rejectUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete the user record entirely
  await db.delete(users).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: SystemRole) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserName(userId: number, firstName: string, lastName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  await db.update(users).set({ firstName: firstName.trim(), lastName: lastName.trim(), name: fullName }).where(eq(users.id, userId));
}

// ── Module Permissions ────────────────────────────────────────────────────────

export async function getAllModulePermissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(modulePermissions).orderBy(modulePermissions.moduleName);
}

export async function setModulePermissions(moduleKey: string, allowedJobRoles: string[]) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(modulePermissions)
    .set({ allowedJobRoles })
    .where(eq(modulePermissions.moduleKey, moduleKey));
}

/** Check if a user’s job roles grant access to a module. Owner always has access. */
export async function checkModuleAccess(moduleKey: string, userDosRoles: string[]): Promise<boolean> {
  if (userDosRoles.includes('Owner')) return true;
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(modulePermissions)
    .where(eq(modulePermissions.moduleKey, moduleKey))
    .limit(1);
  if (result.length === 0) return false;
  const allowed = (result[0].allowedJobRoles as string[]) ?? [];
  return userDosRoles.some((r) => allowed.includes(r));
}

export async function updateDosRoles(userId: number, dosRoles: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ dosRoles }).where(eq(users.id, userId));
}

export async function updatePermissions(userId: number, permissions: Record<string, boolean>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ permissions }).where(eq(users.id, userId));
}

// ─── SCREEN ORDER QUERIES ───────────────────────────────────────────────────

export async function createScreenOrder(data: InsertScreenOrder): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(screenOrders).values(data).$returningId();
  const orderId = result.id;

  // Create the initial revision (revision 1 = original)
  await db.insert(orderRevisions).values({
    orderId,
    revisionNumber: 1,
    editedByUserId: data.userId,
    editedByName: null,
    changeDescription: "Original submission",
    orderData: data.orderData,
  });

  return orderId;
}

export async function updateScreenOrder(
  orderId: number,
  data: Partial<InsertScreenOrder>,
  editedByUserId: number,
  editedByName: string | null,
  changeDescription: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the current max revision number
  const revisions = await db
    .select()
    .from(orderRevisions)
    .where(eq(orderRevisions.orderId, orderId))
    .orderBy(desc(orderRevisions.revisionNumber))
    .limit(1);

  const nextRevision = revisions.length > 0 ? revisions[0].revisionNumber + 1 : 1;

  // Update the order
  await db.update(screenOrders).set(data).where(eq(screenOrders.id, orderId));

  // Create a revision record if orderData changed
  if (data.orderData) {
    await db.insert(orderRevisions).values({
      orderId,
      revisionNumber: nextRevision,
      editedByUserId,
      editedByName,
      changeDescription,
      orderData: data.orderData,
    });
  }
}

export async function getScreenOrder(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(screenOrders).where(eq(screenOrders.id, orderId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserScreenOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(screenOrders)
    .where(eq(screenOrders.userId, userId))
    .orderBy(desc(screenOrders.updatedAt));
}

export async function getAllScreenOrders() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(screenOrders).orderBy(desc(screenOrders.updatedAt));
}

export async function getOrderRevisions(orderId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(orderRevisions)
    .where(eq(orderRevisions.orderId, orderId))
    .orderBy(desc(orderRevisions.revisionNumber));
}

// ─── DASHBOARD ANALYTICS ────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalOrders: 0, byStatus: {}, recentOrders: [], techPerformance: [] };

  // Get all orders with user info
  const allOrders = await db.select().from(screenOrders).orderBy(desc(screenOrders.updatedAt));
  const allUsers = await db.select().from(users);
  const allRevisions = await db.select().from(orderRevisions);

  // Status counts
  const byStatus: Record<string, number> = { draft: 0, submitted: 0, approved: 0, rejected: 0, completed: 0 };
  for (const o of allOrders) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  }

  // Total screens across all orders
  const totalScreens = allOrders.reduce((sum, o) => sum + (o.screenCount || 0), 0);

  // Recent orders (last 20) with user name
  const userMap = new Map(allUsers.map((u) => [u.id, u.name || u.email || "Unknown"]));
  const recentOrders = allOrders.slice(0, 20).map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    screenCount: o.screenCount,
    manufacturer: o.manufacturer,
    userName: userMap.get(o.userId) || "Unknown",
    userId: o.userId,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }));

  // Technician performance
  const techOrders = new Map<number, { name: string; total: number; byStatus: Record<string, number>; totalScreens: number; revisionCount: number }>();
  for (const o of allOrders) {
    if (!techOrders.has(o.userId)) {
      techOrders.set(o.userId, {
        name: userMap.get(o.userId) || "Unknown",
        total: 0,
        byStatus: { draft: 0, submitted: 0, approved: 0, rejected: 0, completed: 0 },
        totalScreens: 0,
        revisionCount: 0,
      });
    }
    const tech = techOrders.get(o.userId)!;
    tech.total += 1;
    tech.byStatus[o.status] = (tech.byStatus[o.status] || 0) + 1;
    tech.totalScreens += o.screenCount || 0;
  }

  // Count revisions per technician (revisions > 1 means edits were made)
  for (const rev of allRevisions) {
    const order = allOrders.find((o) => o.id === rev.orderId);
    if (order && techOrders.has(order.userId)) {
      techOrders.get(order.userId)!.revisionCount += 1;
    }
  }

  const techPerformance = Array.from(techOrders.entries()).map(([userId, data]) => ({
    userId,
    name: data.name,
    totalOrders: data.total,
    totalScreens: data.totalScreens,
    completedOrders: data.byStatus.completed || 0,
    approvedOrders: data.byStatus.approved || 0,
    pendingOrders: (data.byStatus.draft || 0) + (data.byStatus.submitted || 0),
    rejectedOrders: data.byStatus.rejected || 0,
    revisionCount: data.revisionCount,
    completionRate: data.total > 0 ? Math.round(((data.byStatus.completed || 0) / data.total) * 100) : 0,
  })).sort((a, b) => b.totalOrders - a.totalOrders);

  return {
    totalOrders: allOrders.length,
    totalScreens,
    byStatus,
    recentOrders,
    techPerformance,
  };
}

export async function deleteScreenOrder(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete revisions first (foreign key)
  await db.delete(orderRevisions).where(eq(orderRevisions.orderId, orderId));
  await db.delete(screenOrders).where(eq(screenOrders.id, orderId));
}

// ─── RECEIPT QUERIES ─────────────────────────────────────────────────────────

export async function createReceipt(data: InsertReceipt): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(receipts).values(data).$returningId();
  return result.id;
}

export async function getReceipt(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserReceipts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Exclude archived receipts from the main list
  return db.select().from(receipts)
    .where(and(eq(receipts.userId, userId), or(eq(receipts.archived, false), isNull(receipts.archived))))
    .orderBy(desc(receipts.createdAt));
}

export async function getAllReceipts() {
  const db = await getDb();
  if (!db) return [];
  // Exclude archived receipts from the main list
  return db.select().from(receipts)
    .where(or(eq(receipts.archived, false), isNull(receipts.archived)))
    .orderBy(desc(receipts.createdAt));
}

export async function getReceiptsWithFilters(filters: {
  userId?: number;
  vendorName?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  // Always exclude archived from main list
  const conditions: any[] = [or(eq(receipts.archived, false), isNull(receipts.archived))];
  if (filters.userId) conditions.push(eq(receipts.userId, filters.userId));
  if (filters.vendorName) conditions.push(like(receipts.vendorName, `%${filters.vendorName}%`));
  if (filters.startDate) conditions.push(gte(receipts.purchaseDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(receipts.purchaseDate, filters.endDate));

  return db.select().from(receipts).where(and(...conditions)).orderBy(desc(receipts.createdAt));
}

export async function getArchivedReceipts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(receipts)
    .where(eq(receipts.archived, true))
    .orderBy(desc(receipts.archivedAt));
}

export async function getArchivedReceiptsWithFilters(filters: {
  userId?: number;
  vendorName?: string;
  startDate?: string;
  endDate?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [eq(receipts.archived, true)];
  if (filters.userId) conditions.push(eq(receipts.userId, filters.userId));
  if (filters.vendorName) conditions.push(like(receipts.vendorName, `%${filters.vendorName}%`));
  if (filters.startDate) conditions.push(gte(receipts.purchaseDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(receipts.purchaseDate, filters.endDate));

  return db.select().from(receipts).where(and(...conditions)).orderBy(desc(receipts.archivedAt));
}

export async function archiveReceipt(id: number, archivedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(receipts)
    .set({ archived: true, archivedAt: new Date(), archivedBy } as any)
    .where(eq(receipts.id, id));
}

export async function unarchiveReceipt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(receipts)
    .set({ archived: false, archivedAt: null, archivedBy: null } as any)
    .where(eq(receipts.id, id));
}

export async function deleteReceipt(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(receipts).where(eq(receipts.id, id));
}

// ─── CMR REPORTS ────────────────────────────────────────────────────────────

export async function upsertCmrReport(data: InsertCmrReport): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cmrReports).values(data).onDuplicateKeyUpdate({
    set: {
      consultantName: data.consultantName,
      clientName: data.clientName,
      appointmentDate: data.appointmentDate,
      weekOf: data.weekOf,
      dealStatus: data.dealStatus,
      outcome: data.outcome,
      purchaseConfidencePct: data.purchaseConfidencePct,
      originalPcPct: data.originalPcPct,
      estimatedContractValue: data.estimatedContractValue,
      soldAt: data.soldAt,
      reportData: data.reportData,
    },
  });
}

export async function getAllCmrReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cmrReports).orderBy(desc(cmrReports.appointmentDate));
}

export async function getUserCmrReports(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cmrReports).where(eq(cmrReports.userId, userId)).orderBy(desc(cmrReports.appointmentDate));
}

export async function getCmrReportsWithFilters(filters: {
  userId?: number;
  startDate?: string;
  endDate?: string;
  outcome?: string;
  minValue?: number;
  maxValue?: number;
  minPc?: number;
  maxPc?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.userId) conditions.push(eq(cmrReports.userId, filters.userId));
  if (filters.startDate) conditions.push(gte(cmrReports.appointmentDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(cmrReports.appointmentDate, filters.endDate));
  if (filters.outcome) conditions.push(eq(cmrReports.outcome, filters.outcome));
  if (filters.minValue != null) conditions.push(gte(cmrReports.estimatedContractValue, filters.minValue.toString()));
  if (filters.maxValue != null) conditions.push(lte(cmrReports.estimatedContractValue, filters.maxValue.toString()));
  if (filters.minPc != null) conditions.push(gte(cmrReports.purchaseConfidencePct, filters.minPc));
  if (filters.maxPc != null) conditions.push(lte(cmrReports.purchaseConfidencePct, filters.maxPc));
  const q = db.select().from(cmrReports).orderBy(desc(cmrReports.appointmentDate));
  return conditions.length > 0 ? q.where(and(...conditions)) : q;
}

export async function deleteCmrReport(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cmrReports).where(eq(cmrReports.id, id));
}

export async function getReceiptAnalytics() {
  const db = await getDb();
  if (!db) return { totalSpend: 0, byUser: [], byVendor: [], byCategory: [], monthlyTrend: [] };

  const allReceipts = await db.select().from(receipts).orderBy(desc(receipts.createdAt));
  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u.name || u.email || "Unknown"]));

  const totalSpend = allReceipts.reduce((sum, r) => sum + parseFloat(String(r.total ?? "0")), 0);

  // By user
  const userSpend = new Map<number, { name: string; total: number; count: number }>();
  for (const r of allReceipts) {
    if (!userSpend.has(r.userId)) {
      userSpend.set(r.userId, { name: userMap.get(r.userId) || "Unknown", total: 0, count: 0 });
    }
    const u = userSpend.get(r.userId)!;
    u.total += parseFloat(String(r.total ?? "0"));
    u.count += 1;
  }
  const byUser = Array.from(userSpend.entries())
    .map(([userId, d]) => ({ userId, name: d.name, total: d.total, count: d.count }))
    .sort((a, b) => b.total - a.total);

  // By vendor
  const vendorSpend = new Map<string, { total: number; count: number }>();
  for (const r of allReceipts) {
    const vendor = r.vendorName || "Unknown";
    if (!vendorSpend.has(vendor)) vendorSpend.set(vendor, { total: 0, count: 0 });
    const v = vendorSpend.get(vendor)!;
    v.total += parseFloat(String(r.total ?? "0"));
    v.count += 1;
  }
  const byVendor = Array.from(vendorSpend.entries())
    .map(([vendor, d]) => ({ vendor, total: d.total, count: d.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // By category (expenseType + overheadCategory)
  const catSpend = new Map<string, { total: number; count: number }>();
  for (const r of allReceipts) {
    const cat = r.expenseType === "OVERHEAD" ? (r.overheadCategory || "Overhead/General") : (r.materialCategory || "Job");
    if (!catSpend.has(cat)) catSpend.set(cat, { total: 0, count: 0 });
    const c = catSpend.get(cat)!;
    c.total += parseFloat(String(r.total ?? "0"));
    c.count += 1;
  }
  const byCategory = Array.from(catSpend.entries())
    .map(([category, d]) => ({ category, total: d.total, count: d.count }))
    .sort((a, b) => b.total - a.total);

  // Monthly trend (last 12 months)
  const monthlyMap = new Map<string, number>();
  for (const r of allReceipts) {
    const date = r.purchaseDate || r.createdAt.toISOString().slice(0, 10);
    const month = date.slice(0, 7); // YYYY-MM
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + parseFloat(String(r.total ?? "0")));
  }
  const monthlyTrend = Array.from(monthlyMap.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  return { totalSpend, byUser, byVendor, byCategory, monthlyTrend };
}

// ─── PROJECT MATERIAL CHECKLIST QUERIES ──────────────────────────────────────

export async function createProjectMaterialChecklist(
  data: InsertProjectMaterialChecklist,
): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectMaterialChecklists).values({
    ...data,
    auditTrail: data.auditTrail ?? [],
    attachments: [],
    materialsLoadedPhotos: [],
    materialsDeliveredPhotos: [],
    warehouseCheckoffs: {},
  });

  // Return the inserted ID
  const rows = await db
    .select({ id: projectMaterialChecklists.id })
    .from(projectMaterialChecklists)
    .where(eq(projectMaterialChecklists.createdByUserId, data.createdByUserId))
    .orderBy(desc(projectMaterialChecklists.createdAt))
    .limit(1);

  return { id: rows[0]?.id ?? 0 };
}

export async function getAllProjectMaterialChecklists(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(projectMaterialChecklists)
    .orderBy(desc(projectMaterialChecklists.updatedAt));
}

export async function getProjectMaterialChecklist(id: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(projectMaterialChecklists)
    .where(eq(projectMaterialChecklists.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateProjectMaterialChecklist(
  id: number,
  updates: Partial<InsertProjectMaterialChecklist>,
  actor: { userId: number; userName: string },
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Append to audit trail
  const current = await getProjectMaterialChecklist(id);
  const existingAudit: any[] = current?.auditTrail ?? [];
  const auditEntries: any[] = [];

  const now = new Date();

  // Auto-capture who/when toggled materialsLoaded
  if (updates.materialsLoaded !== undefined && updates.materialsLoaded !== current?.materialsLoaded) {
    const action = updates.materialsLoaded ? "Marked Materials Loaded" : "Unmarked Materials Loaded";
    auditEntries.push({ userId: actor.userId, userName: actor.userName, action, timestamp: now.toISOString() });
    if (updates.materialsLoaded) {
      updates.materialsLoadedByName = actor.userName;
      updates.materialsLoadedAt = now;
    } else {
      updates.materialsLoadedByName = null as any;
      updates.materialsLoadedAt = null as any;
    }
  }

  // Auto-capture who/when toggled materialsDelivered
  if (updates.materialsDelivered !== undefined && updates.materialsDelivered !== current?.materialsDelivered) {
    const action = updates.materialsDelivered ? "Marked Materials Delivered" : "Unmarked Materials Delivered";
    auditEntries.push({ userId: actor.userId, userName: actor.userName, action, timestamp: now.toISOString() });
    if (updates.materialsDelivered) {
      updates.materialsDeliveredByName = actor.userName;
      updates.materialsDeliveredAt = now;
    } else {
      updates.materialsDeliveredByName = null as any;
      updates.materialsDeliveredAt = null as any;
    }
  }

  if (auditEntries.length === 0) {
    auditEntries.push({ userId: actor.userId, userName: actor.userName, action: "Updated checklist", timestamp: now.toISOString() });
  }

  const newAudit = [...existingAudit, ...auditEntries];

  await db
    .update(projectMaterialChecklists)
    .set({ ...updates, auditTrail: newAudit })
    .where(eq(projectMaterialChecklists.id, id));
}

export async function updateProjectMaterialChecklistStatus(
  id: number,
  status: string,
  actor: { userId: number; userName: string; action: string },
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const current = await getProjectMaterialChecklist(id);
  const existingAudit: any[] = current?.auditTrail ?? [];
  const newAudit = [
    ...existingAudit,
    { userId: actor.userId, userName: actor.userName, action: actor.action, timestamp: new Date().toISOString() },
  ];

  await db
    .update(projectMaterialChecklists)
    .set({ status, auditTrail: newAudit })
    .where(eq(projectMaterialChecklists.id, id));
}

export async function addProjectMaterialAttachment(
  id: number,
  attachment: { url: string; name: string; type: string; uploadedByName: string; uploadedAt: string },
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const current = await getProjectMaterialChecklist(id);
  const existing: any[] = current?.attachments ?? [];

  await db
    .update(projectMaterialChecklists)
    .set({ attachments: [...existing, attachment] })
    .where(eq(projectMaterialChecklists.id, id));
}

/** Delete a project material checklist by ID */
export async function deleteProjectMaterialChecklist(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(projectMaterialChecklists).where(eq(projectMaterialChecklists.id, id));
}

/** Archive a project material checklist */
export async function archiveProjectMaterialChecklist(
  id: number,
  actor: { userName: string },
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const current = await getProjectMaterialChecklist(id);
  const existingAudit: any[] = current?.auditTrail ?? [];
  const newAudit = [
    ...existingAudit,
    { userId: 0, userName: actor.userName, action: 'Archived checklist', timestamp: new Date().toISOString() },
  ];
  await db.update(projectMaterialChecklists)
    .set({ archived: true, archivedAt: new Date(), archivedByName: actor.userName, auditTrail: newAudit } as any)
    .where(eq(projectMaterialChecklists.id, id));
}

/** Unarchive a project material checklist */
export async function unarchiveProjectMaterialChecklist(
  id: number,
  actor: { userName: string },
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const current = await getProjectMaterialChecklist(id);
  const existingAudit: any[] = current?.auditTrail ?? [];
  const newAudit = [
    ...existingAudit,
    { userId: 0, userName: actor.userName, action: 'Unarchived checklist', timestamp: new Date().toISOString() },
  ];
  await db.update(projectMaterialChecklists)
    .set({ archived: false, archivedAt: null, archivedByName: null, auditTrail: newAudit } as any)
    .where(eq(projectMaterialChecklists.id, id));
}

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────

/** Save or update the Expo push token for a user */
export async function updateUserPushToken(userId: number, token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ expoPushToken: token })
    .where(eq(users.id, userId));
}

/** Get all users who have a specific DOS job role and a push token registered */
export async function getUsersWithPushTokenByDosRole(
  dosRole: string,
): Promise<Array<{ id: number; name: string | null; expoPushToken: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  const allUsers = await db
    .select({ id: users.id, name: users.name, dosRoles: users.dosRoles, expoPushToken: users.expoPushToken })
    .from(users);
  return allUsers.filter((u) => {
    if (!u.expoPushToken) return false;
    const roles: string[] = (u.dosRoles as string[]) ?? [];
    return roles.includes(dosRole);
  });
}

/** Get all managers and admins who have a push token registered */
export async function getManagersAndAdminsWithPushToken(): Promise<
  Array<{ id: number; name: string | null; expoPushToken: string | null }>
> {
  const db = await getDb();
  if (!db) return [];
  const allUsers = await db
    .select({ id: users.id, name: users.name, role: users.role, expoPushToken: users.expoPushToken })
    .from(users);
  return allUsers.filter(
    (u) => u.expoPushToken && (u.role === "manager" || u.role === "admin"),
  );
}

/** Get a single user's push token by user ID */
export async function getUserPushToken(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ expoPushToken: users.expoPushToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result[0]?.expoPushToken ?? null;
}

// ─── IN-APP NOTIFICATIONS ────────────────────────────────────────────────────

/** Store an in-app notification for a user */
export async function createNotification(data: InsertNotification): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

/** Store in-app notifications for multiple users at once */
export async function createNotificationsForUsers(
  userIds: number[],
  notification: Omit<InsertNotification, 'userId'>,
): Promise<void> {
  if (userIds.length === 0) return;
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({ ...notification, userId })),
  );
}

/** Get all notifications for a user, newest first */
export async function getUserNotifications(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
}

/** Count unread notifications for a user */
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result.length;
}

/** Mark a specific notification as read */
export async function markNotificationRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

/** Mark all notifications for a user as read */
export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

/** Delete a notification */
export async function deleteNotification(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

// ─── NOTIFICATION PREFERENCES ────────────────────────────────────────────────

/** Get notification preferences for a user */
export async function getNotificationPrefs(userId: number): Promise<Record<string, boolean> | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ notificationPrefs: users.notificationPrefs })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return (result[0]?.notificationPrefs as Record<string, boolean>) ?? null;
}

/** Update notification preferences for a user */
export async function updateNotificationPrefs(
  userId: number,
  prefs: Record<string, boolean>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ notificationPrefs: prefs }).where(eq(users.id, userId));
}

// ─── PRECONSTRUCTION CHECKLIST QUERIES ───────────────────────────────────────

export async function createPreconChecklist(data: {
  userId: number;
  supervisorName: string;
  companyId?: number | null;
  projectName: string;
  projectAddress?: string;
  meetingDate?: string;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(preconChecklists).values({
    userId: data.userId,
    supervisorName: data.supervisorName,
    companyId: data.companyId ?? null,
    projectName: data.projectName,
    projectAddress: data.projectAddress ?? null,
    meetingDate: data.meetingDate ?? null,
    status: "draft",
    formData: {},
  }).$returningId();
  return { id: result.id };
}

export async function getPreconChecklist(id: number): Promise<any | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(preconChecklists).where(eq(preconChecklists.id, id)).limit(1);
  return result[0];
}

export async function listPreconChecklists(filters?: { userId?: number }): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.userId) conditions.push(eq(preconChecklists.userId, filters.userId));
  const query = db.select().from(preconChecklists);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(preconChecklists.createdAt));
  }
  return query.orderBy(desc(preconChecklists.createdAt));
}

export async function updatePreconChecklist(id: number, updates: Partial<{
  projectName: string;
  projectAddress: string;
  meetingDate: string;
  status: string;
  formData: Record<string, unknown>;
  supervisorSignature: string;
  supervisorSignedName: string;
  supervisorSignedAt: Date;
  client1Signature: string;
  client1SignedName: string;
  client1SignedAt: Date;
  client2Signature: string;
  client2SignedName: string;
  client2SignedAt: Date;
}>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(preconChecklists).set(updates as any).where(eq(preconChecklists.id, id));
}

export async function deletePreconChecklist(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(preconChecklists).where(eq(preconChecklists.id, id));
}
