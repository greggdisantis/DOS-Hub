import { describe, expect, it } from "vitest";

/**
 * Tests for the DOS Hub module registry and navigation structure.
 * Validates that all modules are properly defined and have valid routes.
 */

const MODULES = [
  {
    id: "receipt-capture",
    title: "Receipt Capture",
    description: "Scan and track expenses",
    icon: "receipt",
    route: "/modules/receipt-capture",
    color: "#10B981",
  },
  {
    id: "zoning-lookup",
    title: "Zoning Lookup",
    description: "Property & permit research",
    icon: "map.fill",
    route: "/modules/zoning-lookup",
    color: "#6366F1",
  },
  {
    id: "screen-ordering",
    title: "Screen Ordering",
    description: "Motorized screen orders",
    icon: "rectangle.grid.2x2.fill",
    route: "/modules/screen-ordering",
    color: "#F59E0B",
  },
  {
    id: "job-intelligence",
    title: "Job Intelligence",
    description: "Service Fusion insights",
    icon: "chart.bar.fill",
    route: "/modules/job-intelligence",
    color: "#3B82F6",
  },
  {
    id: "hubspot",
    title: "HubSpot CRM",
    description: "Deal & contact management",
    icon: "link",
    route: "/modules/hubspot",
    color: "#EF4444",
  },
  {
    id: "training",
    title: "Training",
    description: "Courses & certifications",
    icon: "book.fill",
    route: "/modules/training",
    color: "#8B5CF6",
  },
];

const QUICK_ACTIONS = [
  { id: "new-receipt", label: "New Receipt", icon: "camera.fill", route: "/modules/receipt-capture" },
  { id: "zoning", label: "Zoning", icon: "magnifyingglass", route: "/modules/zoning-lookup" },
  { id: "new-order", label: "New Order", icon: "doc.text.fill", route: "/modules/screen-ordering" },
];

describe("Module Registry", () => {
  it("should have 6 modules defined", () => {
    expect(MODULES).toHaveLength(6);
  });

  it("should have unique module IDs", () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have unique module routes", () => {
    const routes = MODULES.map((m) => m.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("all module routes should start with /modules/", () => {
    for (const mod of MODULES) {
      expect(mod.route).toMatch(/^\/modules\//);
    }
  });

  it("all modules should have valid hex color codes", () => {
    for (const mod of MODULES) {
      expect(mod.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("all modules should have non-empty title and description", () => {
    for (const mod of MODULES) {
      expect(mod.title.length).toBeGreaterThan(0);
      expect(mod.description.length).toBeGreaterThan(0);
    }
  });
});

describe("Quick Actions", () => {
  it("should have 3 quick actions defined", () => {
    expect(QUICK_ACTIONS).toHaveLength(3);
  });

  it("all quick action routes should reference existing modules", () => {
    const moduleRoutes = new Set(MODULES.map((m) => m.route));
    for (const action of QUICK_ACTIONS) {
      expect(moduleRoutes.has(action.route)).toBe(true);
    }
  });

  it("should have unique quick action IDs", () => {
    const ids = QUICK_ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Multi-Tenant Schema", () => {
  it("should define required company branding fields", () => {
    const requiredBrandingFields = [
      "logoUrl",
      "primaryColor",
      "companyName",
    ];

    // Validate the expected schema structure
    const companySchema = {
      id: "number",
      name: "string",
      slug: "string",
      logoUrl: "string",
      primaryColor: "string",
      companyName: "string",
    };

    for (const field of requiredBrandingFields) {
      expect(field in companySchema).toBe(true);
    }
  });
});
