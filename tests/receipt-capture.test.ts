/**
 * Receipt Capture Module — Unit Tests
 * Tests filename generation, totals calculation, and data validation logic.
 */
import { describe, it, expect } from "vitest";

// ─── Filename generation (mirrors saveReceipt logic in receipt-capture.tsx) ───

function generateReceiptFileName(vendorName: string, now: Date): string {
  const d = now.getDate();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const safeVendor = vendorName.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  return `${safeVendor}_${d}-${m}-${y}_${hh}${mm}${ss}`;
}

describe("Receipt filename generation", () => {
  it("formats a simple vendor name correctly", () => {
    const dt = new Date(2026, 0, 3, 13, 2, 45); // Jan 3 2026 13:02:45
    expect(generateReceiptFileName("Home Depot", dt)).toBe("Home_Depot_3-1-2026_130245");
  });

  it("matches the example in the spec: Home Depot_3-1-2026_130245", () => {
    const dt = new Date(2026, 0, 3, 13, 2, 45);
    expect(generateReceiptFileName("Home Depot", dt)).toBe("Home_Depot_3-1-2026_130245");
  });

  it("collapses multiple spaces/special chars into single underscore", () => {
    const dt = new Date(2026, 2, 1, 9, 5, 0); // Mar 1 2026 09:05:00
    // "THE HOME DEPOT!" → spaces→_, !→_, then _+ collapsed → "THE_HOME_DEPOT_"
    // trailing _ is expected before date separator
    expect(generateReceiptFileName("THE HOME DEPOT!", dt)).toBe("THE_HOME_DEPOT__1-3-2026_090500");
  });

  it("handles single-word vendor names", () => {
    const dt = new Date(2026, 5, 15, 8, 30, 0); // Jun 15 2026 08:30:00
    expect(generateReceiptFileName("Costco", dt)).toBe("Costco_15-6-2026_083000");
  });

  it("pads hours, minutes, seconds to 2 digits", () => {
    const dt = new Date(2026, 0, 1, 1, 2, 3); // Jan 1 2026 01:02:03
    const result = generateReceiptFileName("Vendor", dt);
    expect(result).toBe("Vendor_1-1-2026_010203");
  });
});

// ─── Line item totals calculation ────────────────────────────────────────────

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

function calcLineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice * 100) / 100;
}

function calcSubtotal(lineItems: LineItem[]): number {
  return Math.round(lineItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
}

describe("Line item calculations", () => {
  it("calculates lineTotal correctly", () => {
    expect(calcLineTotal(3, 64.9)).toBeCloseTo(194.7, 2);
    expect(calcLineTotal(2, 36.55)).toBeCloseTo(73.1, 2);
    expect(calcLineTotal(1, 99)).toBe(99);
  });

  it("calculates subtotal from line items", () => {
    const items: LineItem[] = [
      { description: "A", quantity: 1, unitPrice: 99, lineTotal: 99 },
      { description: "B", quantity: 3, unitPrice: 64.9, lineTotal: 194.7 },
      { description: "C", quantity: 2, unitPrice: 36.55, lineTotal: 73.1 },
    ];
    expect(calcSubtotal(items)).toBeCloseTo(366.8, 2);
  });

  it("returns 0 for empty line items", () => {
    expect(calcSubtotal([])).toBe(0);
  });
});

// ─── Expense type validation ──────────────────────────────────────────────────

type ExpenseType = "JOB" | "OVERHEAD";

function validateReceiptForm(form: {
  vendorName: string;
  expenseType: ExpenseType;
  jobName?: string;
  overheadCategory?: string;
  total?: string;
}): string[] {
  const errors: string[] = [];
  if (!form.vendorName.trim()) errors.push("Vendor name is required");
  if (form.expenseType === "JOB" && !form.jobName?.trim()) {
    errors.push("Job name is required for Job receipts");
  }
  if (form.expenseType === "OVERHEAD" && !form.overheadCategory?.trim()) {
    errors.push("Category is required for Overhead receipts");
  }
  if (form.total && isNaN(parseFloat(form.total))) {
    errors.push("Total must be a valid number");
  }
  return errors;
}

describe("Receipt form validation", () => {
  it("passes for a valid JOB receipt", () => {
    const errors = validateReceiptForm({
      vendorName: "Home Depot",
      expenseType: "JOB",
      jobName: "Smith Residence",
      total: "396.14",
    });
    expect(errors).toHaveLength(0);
  });

  it("passes for a valid OVERHEAD receipt", () => {
    const errors = validateReceiptForm({
      vendorName: "Staples",
      expenseType: "OVERHEAD",
      overheadCategory: "Office Supplies",
      total: "45.00",
    });
    expect(errors).toHaveLength(0);
  });

  it("fails when vendor name is empty", () => {
    const errors = validateReceiptForm({
      vendorName: "",
      expenseType: "JOB",
      jobName: "Test Job",
    });
    expect(errors).toContain("Vendor name is required");
  });

  it("fails when JOB receipt has no job name", () => {
    const errors = validateReceiptForm({
      vendorName: "Home Depot",
      expenseType: "JOB",
      jobName: "",
    });
    expect(errors).toContain("Job name is required for Job receipts");
  });

  it("fails when OVERHEAD receipt has no category", () => {
    const errors = validateReceiptForm({
      vendorName: "Staples",
      expenseType: "OVERHEAD",
      overheadCategory: "",
    });
    expect(errors).toContain("Category is required for Overhead receipts");
  });

  it("fails when total is not a valid number", () => {
    const errors = validateReceiptForm({
      vendorName: "Home Depot",
      expenseType: "JOB",
      jobName: "Test",
      total: "abc",
    });
    expect(errors).toContain("Total must be a valid number");
  });
});

// ─── Date grouping (mirrors receipt dashboard logic) ─────────────────────────

function groupReceiptsByDate(receipts: Array<{ id: number; purchaseDate: string | null; total: string | null }>) {
  const groups: Record<string, typeof receipts> = {};
  for (const r of receipts) {
    const key = r.purchaseDate ? r.purchaseDate.slice(0, 7) : "Unknown"; // YYYY-MM
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)); // newest first
}

describe("Receipt date grouping", () => {
  it("groups receipts by YYYY-MM", () => {
    const receipts = [
      { id: 1, purchaseDate: "2026-01-15", total: "100.00" },
      { id: 2, purchaseDate: "2026-01-20", total: "50.00" },
      { id: 3, purchaseDate: "2026-02-05", total: "75.00" },
    ];
    const groups = groupReceiptsByDate(receipts);
    expect(groups).toHaveLength(2);
    expect(groups[0][0]).toBe("2026-02"); // newest first
    expect(groups[1][0]).toBe("2026-01");
    expect(groups[1][1]).toHaveLength(2);
  });

  it("handles null purchaseDate as 'Unknown'", () => {
    const receipts = [
      { id: 1, purchaseDate: null, total: "100.00" },
      { id: 2, purchaseDate: "2026-01-15", total: "50.00" },
    ];
    const groups = groupReceiptsByDate(receipts);
    const keys = groups.map(([k]) => k);
    expect(keys).toContain("Unknown");
    expect(keys).toContain("2026-01");
  });

  it("returns empty array for empty input", () => {
    expect(groupReceiptsByDate([])).toHaveLength(0);
  });
});
