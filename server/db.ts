import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertScreenOrder,
  InsertOrderRevision,
  users,
  screenOrders,
  orderRevisions,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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

export async function approveUser(userId: number, role: "technician" | "manager" | "admin") {
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

export async function updateUserRole(userId: number, role: "pending" | "technician" | "manager" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
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

export async function deleteScreenOrder(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete revisions first (foreign key)
  await db.delete(orderRevisions).where(eq(orderRevisions.orderId, orderId));
  await db.delete(screenOrders).where(eq(screenOrders.id, orderId));
}
