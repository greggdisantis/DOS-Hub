import { describe, it, expect } from "vitest";
import { generateOrderPdfHtml, generateScreenPdfHtml } from "../lib/screen-ordering/pdf-template";
import { createEmptyScreen, createEmptyGlobalMaterial } from "../lib/screen-ordering/types";
import { calculateScreen } from "../lib/screen-ordering/calculations";
import type { OrderState } from "../lib/screen-ordering/types";

function createTestState(): OrderState {
  const screen = createEmptyScreen(0);
  screen.description = "Middle Area";
  screen.measurements = {
    upperLeft: 60,
    lowerLeft: 60.5625,
    overallLeft: 61,
    upperRight: 60,
    lowerRight: 60.25,
    overallRight: 120.25,
    top: 120.5625,
    middle: 121,
    bottom: 122,
  };
  screen.selections.installMount = "Undermount";
  screen.selections.motorSide = "Left";
  screen.calculations = calculateScreen(
    screen.measurements,
    "DOS Screens",
    "Undermount",
    false
  );

  return {
    project: {
      name: "gregg",
      submitterName: "Gregg",
      date: "2026-02-28",
      address: "2192",
      jobNumber: "1131",
    },
    manufacturer: "DOS Screens",
    globalMotorType: "",
    inputUnits: "Inches + 1/16\"",
    allSame: true,
    globalMaterial: {
      ...createEmptyGlobalMaterial(),
      screenType: "Twichell Solar",
      series: "95 Nano",
      screenColor: "Bone",
      frameColorCollection: "DOS",
      frameColor: "Stark White",
    },
    screens: [screen],
    applyUChannelToAll: false,
  };
}

describe("PDF Template — Full Order", () => {
  it("generates valid HTML with all sections", () => {
    const state = createTestState();
    const html = generateOrderPdfHtml(state);

    // Check it's valid HTML
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html>");
    expect(html).toContain("</html>");

    // Check header
    expect(html).toContain("Distinctive Outdoor Structures");
    expect(html).toContain("Motorized Screen Form");

    // Check project info
    expect(html).toContain("gregg");
    expect(html).toContain("Gregg");
    expect(html).toContain("2026-02-28");
    expect(html).toContain("2192");
    expect(html).toContain("1131");

    // Check screen info
    expect(html).toContain("Middle Area");
    expect(html).toContain("1 of 1");

    // Check Section 1 — Screen & Frame Config
    expect(html).toContain("Section 1");
    expect(html).toContain("Screen &amp; Frame Config");
    expect(html).toContain("Twichell Solar");
    expect(html).toContain("95 Nano");
    expect(html).toContain("Bone");
    expect(html).toContain("DOS");
    expect(html).toContain("Stark White");

    // Check Section 2 — Motor Config
    expect(html).toContain("Section 2");
    expect(html).toContain("Motor Config");
    expect(html).toContain("Left");
    expect(html).toContain("Undermount");

    // Check Section 3 — Order Measurements
    expect(html).toContain("Section 3");
    expect(html).toContain("Order Measurements");
    expect(html).toContain("Left Height");
    expect(html).toContain("Right Height");
    expect(html).toContain("Track to Track");
    // Left Height = 61" (esc() converts " to &quot;)
    expect(html).toContain('61&quot;');
    // Right Height = 120 1/4"
    expect(html).toContain('120 1/4&quot;');
    // Track to Track = 120 7/16"
    expect(html).toContain('120 7/16&quot;');

    // Check Section 4 — Materials
    expect(html).toContain("Section 4");
    expect(html).toContain("Materials");
    expect(html).toContain("U-Channel Required?");
    expect(html).toContain("Build-Out Required?");

    // Check Section 5 — Misc
    expect(html).toContain("Section 5");
    expect(html).toContain("Misc");

    // Check Raw Measurements
    expect(html).toContain("Raw Measurements");
    expect(html).toContain("Calc Summary");
    expect(html).toContain("Upper Slope (S)");
    expect(html).toContain("Slope Direction");
    expect(html).toContain("Level");
    expect(html).toContain('1 7/16&quot;'); // T-B Diff
  });

  it("includes left side mismatch warning", () => {
    const state = createTestState();
    const html = generateOrderPdfHtml(state);

    // UL + LL = 60 + 60.5625 = 120.5625, OL = 61 → mismatch
    expect(html).toContain("Left side check");
  });
});

describe("PDF Template — Single Screen", () => {
  it("generates HTML for a single screen", () => {
    const state = createTestState();
    const html = generateScreenPdfHtml(state, 0);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Middle Area");
    expect(html).toContain("Screen #1");
  });

  it("returns empty string for invalid index", () => {
    const state = createTestState();
    const html = generateScreenPdfHtml(state, 5);
    expect(html).toBe("");
  });
});

describe("PDF Template — Multiple Screens", () => {
  it("generates separate pages for each screen", () => {
    const state = createTestState();
    // Add a second screen
    const screen2 = createEmptyScreen(1);
    screen2.description = "Left Area";
    screen2.measurements = {
      upperLeft: 50, lowerLeft: 50, overallLeft: 50,
      upperRight: 52, lowerRight: 52, overallRight: 52,
      top: 100, middle: 99, bottom: 98,
    };
    screen2.selections.installMount = "Face-mount";
    screen2.selections.motorSide = "Right";
    screen2.calculations = calculateScreen(
      screen2.measurements,
      "DOS Screens",
      "Face-mount",
      false
    );
    state.screens.push(screen2);

    const html = generateOrderPdfHtml(state);

    // Should have two page divs
    expect(html).toContain("1 of 2");
    expect(html).toContain("2 of 2");
    expect(html).toContain("Middle Area");
    expect(html).toContain("Left Area");
    expect(html).toContain("Face-mount");
  });
});
