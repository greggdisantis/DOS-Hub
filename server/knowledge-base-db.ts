import { eq, desc } from "drizzle-orm";
import { getDb } from "./_core/index";
import { aiKnowledgeBase, InsertAIKnowledgeBase } from "../drizzle/schema";

/**
 * Get all knowledge base files, optionally filtered by category
 */
export async function getKnowledgeBaseFiles(category?: string) {
  const database = await getDb();
  if (!database) return [];

  let query = database.select().from(aiKnowledgeBase).where(eq(aiKnowledgeBase.isActive, true));
  
  if (category) {
    query = database.select().from(aiKnowledgeBase).where(
      eq(aiKnowledgeBase.category, category)
    );
  }

  return query.orderBy(desc(aiKnowledgeBase.createdAt));
}

/**
 * Get all unique categories
 */
export async function getKnowledgeBaseCategories() {
  const database = await getDb();
  if (!database) return [];

  const files = await database.select({ category: aiKnowledgeBase.category }).from(aiKnowledgeBase).where(
    eq(aiKnowledgeBase.isActive, true)
  );

  const categories = [...new Set(files.map(f => f.category))];
  return categories.sort();
}

/**
 * Upload a new knowledge base file
 */
export async function createKnowledgeBaseFile(data: InsertAIKnowledgeBase) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const result = await database.insert(aiKnowledgeBase).values(data);
  return result.insertId;
}

/**
 * Get a single knowledge base file by ID
 */
export async function getKnowledgeBaseFileById(id: number) {
  const database = await getDb();
  if (!database) return null;

  const result = await database.select().from(aiKnowledgeBase).where(eq(aiKnowledgeBase.id, id));
  return result[0] || null;
}

/**
 * Delete a knowledge base file (soft delete by marking inactive)
 */
export async function deleteKnowledgeBaseFile(id: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database.update(aiKnowledgeBase).set({ isActive: false }).where(eq(aiKnowledgeBase.id, id));
}

/**
 * Update knowledge base file metadata
 */
export async function updateKnowledgeBaseFile(id: number, data: Partial<InsertAIKnowledgeBase>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database.update(aiKnowledgeBase).set(data).where(eq(aiKnowledgeBase.id, id));
}
