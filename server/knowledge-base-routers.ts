import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as knowledgeBaseDb from "./knowledge-base-db";
import { storagePut } from "./storage";

/**
 * Knowledge Base Router — manages AI training documents
 * Only accessible to super-admins and admins
 */
export const knowledgeBaseRouter = router({
  /**
   * List all knowledge base files
   */
  list: protectedProcedure
    .input(z.object({ category: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      // Check if user is admin or super-admin
      if (!["admin", "super-admin"].includes(ctx.user.role)) {
        throw new Error("UNAUTHORIZED");
      }

      return knowledgeBaseDb.getKnowledgeBaseFiles(input?.category);
    }),

  /**
   * Get all unique categories
   */
  categories: protectedProcedure.query(async ({ ctx }) => {
    if (!["admin", "super-admin"].includes(ctx.user.role)) {
      throw new Error("UNAUTHORIZED");
    }

    return knowledgeBaseDb.getKnowledgeBaseCategories();
  }),

  /**
   * Upload a new knowledge base file
   */
  upload: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        category: z.string().min(1).max(128),
        description: z.string().optional(),
        fileBuffer: z.string(), // Base64 encoded file data
        mimeType: z.string().min(1).max(128),
        fileSize: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only super-admin and admin can upload
      if (!["admin", "super-admin"].includes(ctx.user.role)) {
        throw new Error("UNAUTHORIZED");
      }

      // Decode base64 file data
      const fileBuffer = Buffer.from(input.fileBuffer, "base64");

      // Create storage key with category prefix
      const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const timestamp = Date.now();
      const storageKey = `ai-knowledge/${input.category}/${timestamp}-${sanitizedFileName}`;

      // Upload to storage
      const { url } = await storagePut(storageKey, fileBuffer, input.mimeType);

      // Save metadata to database
      const fileId = await knowledgeBaseDb.createKnowledgeBaseFile({
        fileName: input.fileName,
        category: input.category,
        storageKey,
        fileUrl: url,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        description: input.description,
        uploadedBy: ctx.user.id,
        isActive: true,
      });

      return {
        id: fileId,
        fileName: input.fileName,
        category: input.category,
        fileUrl: url,
        storageKey,
      };
    }),

  /**
   * Delete a knowledge base file
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      // Only super-admin and admin can delete
      if (!["admin", "super-admin"].includes(ctx.user.role)) {
        throw new Error("UNAUTHORIZED");
      }

      const file = await knowledgeBaseDb.getKnowledgeBaseFileById(input.id);
      if (!file) {
        throw new Error("File not found");
      }

      await knowledgeBaseDb.deleteKnowledgeBaseFile(input.id);

      return { success: true, id: input.id };
    }),

  /**
   * Update knowledge base file metadata
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        description: z.string().optional(),
        category: z.string().max(128).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only super-admin and admin can update
      if (!["admin", "super-admin"].includes(ctx.user.role)) {
        throw new Error("UNAUTHORIZED");
      }

      const file = await knowledgeBaseDb.getKnowledgeBaseFileById(input.id);
      if (!file) {
        throw new Error("File not found");
      }

      await knowledgeBaseDb.updateKnowledgeBaseFile(input.id, {
        description: input.description,
        category: input.category,
      });

      return { success: true, id: input.id };
    }),
});
