import { describe, it, expect, vi, beforeEach } from "vitest";
import { quickHealthCheck } from "@/lib/auto-wake";

// Mock fetch globally
global.fetch = vi.fn();

describe("Auto-Wake Health Check - Core Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("quickHealthCheck", () => {
    it("should return true when server is healthy", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const result = await quickHealthCheck();
      expect(result).toBe(true);
    });

    it("should return false when server is down", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Connection refused"));

      const result = await quickHealthCheck();
      expect(result).toBe(false);
    });

    it("should return false when response is not ok", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result = await quickHealthCheck();
      expect(result).toBe(false);
    });

    it("should call the health check endpoint", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await quickHealthCheck();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/health"),
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    it("should handle network errors gracefully", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const result = await quickHealthCheck();
      expect(result).toBe(false);
    });

    it("should handle timeout errors gracefully", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Request timeout"));

      const result = await quickHealthCheck();
      expect(result).toBe(false);
    });
  });

  describe("Auto-Wake Integration", () => {
    it("should export performAutoWake function", async () => {
      const { performAutoWake } = await import("@/lib/auto-wake");
      expect(typeof performAutoWake).toBe("function");
    });

    it("should export quickHealthCheck function", async () => {
      const { quickHealthCheck: check } = await import("@/lib/auto-wake");
      expect(typeof check).toBe("function");
    });
  });
});
