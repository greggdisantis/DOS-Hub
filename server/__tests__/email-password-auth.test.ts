import { describe, it, expect, beforeAll } from "vitest";
import bcrypt from "bcryptjs";
import { verifyPassword, hashPassword } from "../password-auth";

describe("Email/Password Authentication", () => {
  describe("Password hashing and verification", () => {
    it("should hash a password", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20); // bcrypt hashes are long
    });

    it("should verify a correct password", async () => {
      const password = "TestPassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const password = "TestPassword123!";
      const wrongPassword = "WrongPassword456!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it("should handle Zachary's actual password", async () => {
      const zacharyPassword = "Login8003$";
      const hash = await hashPassword(zacharyPassword);

      const isValid = await verifyPassword(zacharyPassword, hash);
      expect(isValid).toBe(true);

      // Wrong password should fail
      const isInvalid = await verifyPassword("WrongPassword", hash);
      expect(isInvalid).toBe(false);
    });

    it("should create different hashes for the same password", async () => {
      const password = "TestPassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // Hashes should be different due to salt
      expect(hash1).not.toBe(hash2);

      // But both should verify the same password
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe("Sample user passwords from document", () => {
    const testUsers = [
      { email: "zacharyd@distinctiveos.com", password: "Login8003$" },
      { email: "gdisantis@distinctiveos.com", password: "Pa$%$w0rdGcd#8541" },
      { email: "judyantonucci32@salsnursery.com", password: "Secure5644$" },
      { email: "maksymm26@gmail.com", password: "DosHub4934!" },
      { email: "BThornton@DistinctiveOS.com", password: "Team5365!" },
    ];

    testUsers.forEach(({ email, password }) => {
      it(`should hash and verify password for ${email}`, async () => {
        const hash = await hashPassword(password);
        const isValid = await verifyPassword(password, hash);
        expect(isValid).toBe(true);
      });
    });
  });
});
