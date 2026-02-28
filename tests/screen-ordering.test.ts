import { describe, it, expect } from "vitest";
import {
  calculateScreen,
  formatInches,
} from "../lib/screen-ordering/calculations";
import {
  getScreenTypes,
  getScreenColorOptions,
  isUChannelNeeded,
  getBuildOutType,
  MOTOR_TYPES,
  REMOTE_OPTIONS,
  FRAME_COLOR_COLLECTIONS,
  FRAME_COLORS,
  FRACTION_OPTIONS,
} from "../lib/screen-ordering/constants";
import {
  createEmptyScreen,
  createEmptyMeasurements,
  createEmptySelections,
  MEASUREMENT_POINTS,
} from "../lib/screen-ordering/types";

describe("Screen Ordering — Constants", () => {
  it("returns correct screen types per manufacturer", () => {
    const dosTypes = getScreenTypes("DOS Screens");
    expect(dosTypes).toContain("Twichell Solar");
    expect(dosTypes).toContain("Vinyl");
    expect(dosTypes).not.toContain("Defender Series");

    const magnaTypes = getScreenTypes("MagnaTrack");
    expect(magnaTypes).toContain("Defender Series");
  });

  it("returns motor types for each manufacturer", () => {
    expect(MOTOR_TYPES["DOS Screens"]).toContain("Alpha");
    expect(MOTOR_TYPES["MagnaTrack"]).toContain("Gaposa");
  });

  it("returns remote options for each motor type", () => {
    expect(REMOTE_OPTIONS["Somfy"]).toContain("5-Channel");
    expect(REMOTE_OPTIONS["Alpha"]).toContain("16-Channel");
  });

  it("returns frame color collections per manufacturer", () => {
    expect(FRAME_COLOR_COLLECTIONS["DOS Screens"]).toContain("DOS");
    expect(FRAME_COLOR_COLLECTIONS["MagnaTrack"]).toContain("MagnaTrack");
  });

  it("returns frame colors for each collection", () => {
    expect(FRAME_COLORS["DOS"].length).toBeGreaterThan(5);
    expect(FRAME_COLORS["MagnaTrack"].length).toBeGreaterThan(3);
    expect(FRAME_COLORS["StruXure"].length).toBeGreaterThan(3);
  });

  it("returns screen colors for valid type/series combos", () => {
    const colors95 = getScreenColorOptions("Twichell Solar", "95 Nano");
    expect(colors95).toContain("Flat Black");
    expect(colors95.length).toBeGreaterThan(5);

    const insectColors = getScreenColorOptions("Twichell Insect");
    expect(insectColors).toEqual(["Black", "White"]);
  });

  it("generates 16 fraction options", () => {
    expect(FRACTION_OPTIONS.length).toBe(16);
    expect(FRACTION_OPTIONS[0]).toEqual({ value: 0, label: "0" });
    expect(FRACTION_OPTIONS[8].value).toBeCloseTo(0.5);
  });
});

describe("Screen Ordering — Calculations", () => {
  it("returns null when core measurements are missing", () => {
    const m = createEmptyMeasurements();
    expect(calculateScreen(m, "DOS Screens")).toBeNull();
  });

  it("calculates slope and heights correctly", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 120; // 10'
    m.upperRight = 118; // 9' 10"
    m.top = 144; // 12'
    m.bottom = 143.5;

    const result = calculateScreen(m, "DOS Screens");
    expect(result).not.toBeNull();
    expect(result!.upperSlopeIn).toBe(2);
    expect(result!.slopeDirection).toBe("Left");
    expect(result!.leftHeightIn).toBe(120);
    expect(result!.rightHeightIn).toBe(118);
    expect(result!.tbDiffIn).toBeCloseTo(0.5);
  });

  it("detects level when UL equals UR", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 100;
    m.upperRight = 100;
    m.top = 120;
    m.bottom = 120;

    const result = calculateScreen(m, "DOS Screens");
    expect(result!.slopeDirection).toBe("Level");
    expect(result!.highSide).toBe("Level");
  });

  it("uses overallLeft/Right when provided", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 100;
    m.upperRight = 98;
    m.overallLeft = 105;
    m.overallRight = 103;
    m.top = 120;
    m.bottom = 119;

    const result = calculateScreen(m, "DOS Screens");
    expect(result!.leftHeightIn).toBe(105);
    expect(result!.rightHeightIn).toBe(103);
  });
});

describe("Screen Ordering — U-Channel Logic", () => {
  it("DOS: not needed when diff <= 1.5", () => {
    expect(isUChannelNeeded("DOS Screens", 1.0)).toBe(false);
    expect(isUChannelNeeded("DOS Screens", 1.5)).toBe(false);
  });

  it("DOS: needed when diff > 1.5", () => {
    expect(isUChannelNeeded("DOS Screens", 1.6)).toBe(true);
  });

  it("MagnaTrack: needed when diff > 0.375", () => {
    expect(isUChannelNeeded("MagnaTrack", 0.375)).toBe(false);
    expect(isUChannelNeeded("MagnaTrack", 0.5)).toBe(true);
  });
});

describe("Screen Ordering — Build-out Logic", () => {
  it("returns None for small slopes", () => {
    expect(getBuildOutType(0.3)).toBe("None");
    expect(getBuildOutType(0.375)).toBe("None");
  });

  it("returns 1x2 for moderate slopes", () => {
    expect(getBuildOutType(0.5)).toBe("1x2");
    expect(getBuildOutType(0.75)).toBe("1x2");
  });

  it("returns 2x2 for larger slopes", () => {
    expect(getBuildOutType(1.0)).toBe("2x2");
    expect(getBuildOutType(1.875)).toBe("2x2");
  });

  it("returns FLAG for extreme slopes", () => {
    expect(getBuildOutType(2.0)).toBe("FLAG");
    expect(getBuildOutType(5.0)).toBe("FLAG");
  });
});

describe("Screen Ordering — Format Inches", () => {
  it("formats null as dash", () => {
    expect(formatInches(null)).toBe("—");
  });

  it("formats whole inches", () => {
    expect(formatInches(6)).toBe("6\"");
  });

  it("formats feet and inches", () => {
    expect(formatInches(65)).toBe("5' 5\"");
  });

  it("formats fractions", () => {
    const result = formatInches(6.5);
    expect(result).toContain("1/2");
  });
});

describe("Screen Ordering — Type Helpers", () => {
  it("creates empty measurements with all null", () => {
    const m = createEmptyMeasurements();
    for (const pt of MEASUREMENT_POINTS) {
      expect(m[pt]).toBeNull();
    }
  });

  it("creates empty selections with empty strings", () => {
    const s = createEmptySelections();
    expect(s.screenType).toBe("");
    expect(s.installMount).toBe("Undermount");
  });

  it("creates empty screen with unique id", () => {
    const s1 = createEmptyScreen(0);
    const s2 = createEmptyScreen(1);
    expect(s1.id).not.toBe(s2.id);
    expect(s1.description).toBe("Screen 1");
    expect(s2.description).toBe("Screen 2");
  });
});
