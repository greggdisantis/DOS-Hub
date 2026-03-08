import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./password-auth";
import { getDb, getUserByEmail, updateUserLastSignedIn } from "./db";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

/**
 * Email/Password Authentication Router
 * Replaces GitHub OAuth with direct email/password login
 */
export const authRouter = router({
  /**
   * Login with email and password
   * Returns session token and user info
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;
      console.log("[AUTH-ROUTER] login start:", email);

      // Find user by email
      const user = await getUserByEmail(email);

      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Check if user has a password hash (email/password auth enabled)
      if (!user.password_hash) {
        throw new Error("This account does not support password login. Please use OAuth.");
      }

      // Verify password
      const passwordValid = await verifyPassword(password, user.password_hash);
      if (!passwordValid) {
        throw new Error("Invalid email or password");
      }

      // Check if user is approved
      if (!user.approved) {
        throw new Error("Your account is pending approval. Please contact an administrator.");
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(user.openId || user.email, {
        name: user.name || user.email,
        expiresInMs: ONE_YEAR_MS,
      });

      // Update last signed in
      await updateUserLastSignedIn(user.id);

      return {
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          approved: user.approved,
        },
      };
    }),

  /**
   * Set password for a user (used during onboarding or password reset)
   */
  setPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        resetToken: z.string().optional(), // For password reset flow
      }),
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;

      // Find user by email
      const user = await getUserByEmail(email);

      if (!user) {
        throw new Error("User not found");
      }

      // Hash the new password
      const passwordHash = await hashPassword(password);

      // Update user with password hash
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.execute(sql`
        UPDATE users 
        SET password_hash = ${passwordHash}
        WHERE id = ${user.id}
      `);

      return { success: true };
    }),

  /**
   * Request password reset
   * In production, this would send an email with reset link
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const { email } = input;

      // Find user by email
      const user = await getUserByEmail(email);

      if (!user) {
        // Don't reveal if email exists (security best practice)
        return { success: true, message: "If email exists, reset link sent" };
      }

      // TODO: In production, generate reset token and send email
      // For now, just return success
      console.log(`[Auth] Password reset requested for ${email}`);

      return { success: true, message: "Password reset link sent to your email" };
    }),
});

/**
 * Register email/password authentication routes with Express
 */
export function registerPasswordAuthRoutes(app: Express) {
  /**
   * POST /api/auth/login
   * Login with email and password
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      // Find user by email
      const user = await getUserByEmail(email);

      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Check if user has password hash
      if (!user.password_hash) {
        res.status(401).json({ error: "This account does not support password login" });
        return;
      }

      // Verify password
      const passwordValid = await verifyPassword(password, user.password_hash);
      if (!passwordValid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Check if user is approved
      if (!user.approved) {
        res.status(403).json({ error: "Your account is pending approval" });
        return;
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(user.openId || user.email, {
        name: user.name || user.email,
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Update last signed in
      await updateUserLastSignedIn(user.id);

      res.json({
        success: true,
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          approved: user.approved,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
}
