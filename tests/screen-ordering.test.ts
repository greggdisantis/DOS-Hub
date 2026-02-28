import { describe, it, expect } from "vitest";
import {
  calculateScreen,
  formatInchesFrac,
  formatFtInFrac,
  snapToSixteenth,
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

// ─── Constants ──────────────────────────────────────────────────────────────

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

// ─── Precision Helpers ──────────────────────────────────────────────────────

describe("Screen Ordering — snapToSixteenth", () => {
  it("rounds to nearest 1/16th", () => {
    expect(snapToSixteenth(1.03)).toBeCloseTo(1.0); // rounds down to 1
    expect(snapToSixteenth(1.04)).toBeCloseTo(1.0625); // rounds up to 1 1/16
    expect(snapToSixteenth(0.5)).toBe(0.5);
    expect(snapToSixteenth(0.0)).toBe(0);
  });

  it("handles NaN", () => {
    expect(snapToSixteenth(NaN)).toBe(0);
  });
});

// ─── Formatting ─────────────────────────────────────────────────────────────

describe("Screen Ordering — formatInchesFrac", () => {
  it("formats null as dash", () => {
    expect(formatInchesFrac(null)).toBe("—");
  });

  it("formats whole inches", () => {
    expect(formatInchesFrac(6)).toBe('6"');
    expect(formatInchesFrac(120)).toBe('120"');
  });

  it("formats fractions correctly", () => {
    expect(formatInchesFrac(6.5)).toBe('6 1/2"');
    expect(formatInchesFrac(120.4375)).toBe('120 7/16"');
    expect(formatInchesFrac(60.5625)).toBe('60 9/16"');
    expect(formatInchesFrac(60.25)).toBe('60 1/4"');
  });

  it("formats zero", () => {
    expect(formatInchesFrac(0)).toBe('0"');
  });
});

describe("Screen Ordering — formatFtInFrac", () => {
  it("formats feet and inches", () => {
    expect(formatFtInFrac(65)).toBe("5' 5\"");
    expect(formatFtInFrac(120.25)).toBe("10' 0 1/4\"");
  });
});

// ─── Core Calculations ─────────────────────────────────────────────────────

describe("Screen Ordering — Calculations", () => {
  it("calculates all fields when all measurements provided", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 120;
    m.upperRight = 118;
    m.overallLeft = 125;
    m.overallRight = 123;
    m.lowerLeft = 5;
    m.lowerRight = 5;
    m.top = 144;
    m.middle = 143;
    m.bottom = 143.5;

    const result = calculateScreen(m, "DOS Screens", "Undermount");
    expect(result).not.toBeNull();
    expect(result.upperSlopeIn).toBe(2);
    expect(result.slopeDirection).toBe("Left");
    expect(result.highSide).toBe("Left");
    expect(result.lowSide).toBe("Right");
    // Left height: OL - slope = 125 - 2 = 123 (high side is left)
    expect(result.leftHeightIn).toBe(123);
    // Right height: OR as-is = 123 (low side)
    expect(result.rightHeightIn).toBe(123);
    // T-B Diff = |144 - 143.5| = 0.5
    expect(result.tbDiffIn).toBeCloseTo(0.5);
    // U-channel: DOS threshold 1.5, diff 0.5 → not needed
    expect(result.uChannelNeeded).toBe(false);
    // Track to Track: T - 1/8 = 144 - 0.125 = 143.875
    expect(result.trackToTrackIn).toBeCloseTo(143.875);
    // Build-out: slope 2 > 1.75 → FLAG
    expect(result.buildOutType).toBe("FLAG");
    expect(result.buildOutNeeded).toBe(true);
    // Bias = slope / 2 = 1
    expect(result.biasIn).toBe(1);
  });

  it("returns nulls when core measurements are missing", () => {
    const m = createEmptyMeasurements();
    const result = calculateScreen(m, "DOS Screens");
    expect(result.upperSlopeIn).toBeNull();
    expect(result.leftHeightIn).toBeNull();
    expect(result.trackToTrackIn).toBeNull();
    expect(result.uChannelNeeded).toBe(false);
  });

  it("detects level when UL equals UR", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 100;
    m.upperRight = 100;
    m.overallLeft = 100;
    m.overallRight = 100;
    m.top = 120;
    m.bottom = 120;

    const result = calculateScreen(m, "DOS Screens");
    expect(result.slopeDirection).toBe("Level");
    expect(result.highSide).toBe("Level");
    expect(result.lowSide).toBe("Level");
    expect(result.upperSlopeIn).toBe(0);
    // When level, heights = OL and OR directly
    expect(result.leftHeightIn).toBe(100);
    expect(result.rightHeightIn).toBe(100);
  });

  it("calculates right height correctly when high side is right", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.upperRight = 62;
    m.overallLeft = 65;
    m.overallRight = 67;
    m.top = 120;
    m.bottom = 119;

    const result = calculateScreen(m, "DOS Screens");
    expect(result.slopeDirection).toBe("Right");
    expect(result.highSide).toBe("Right");
    // Left height: OL as-is = 65 (low side)
    expect(result.leftHeightIn).toBe(65);
    // Right height: OR - slope = 67 - 2 = 65 (high side)
    expect(result.rightHeightIn).toBe(65);
  });
});

// ─── Track to Track with U-Channel ─────────────────────────────────────────

describe("Screen Ordering — Track to Track", () => {
  it("without U-channel: T - 1/8", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.upperRight = 60;
    m.overallLeft = 60;
    m.overallRight = 60;
    m.top = 120.5625; // 120 9/16"
    m.middle = 121;
    m.bottom = 122;

    const result = calculateScreen(m, "DOS Screens");
    // T-B diff = |120.5625 - 122| = 1.4375 (< 1.5 for DOS → no U-channel)
    expect(result.uChannelNeeded).toBe(false);
    // Track to Track = T - 1/8 = 120.5625 - 0.125 = 120.4375
    expect(result.trackToTrackIn).toBeCloseTo(120.4375);
  });

  it("with U-channel (MagnaTrack): min(T-1/8, M, B) - 1", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.upperRight = 60;
    m.overallLeft = 60;
    m.overallRight = 60;
    m.top = 120;
    m.middle = 119;
    m.bottom = 118;

    const result = calculateScreen(m, "MagnaTrack");
    // T-B diff = |120 - 118| = 2 (> 0.375 for MagnaTrack → U-channel needed)
    expect(result.uChannelNeeded).toBe(true);
    // min(120-0.125, 119, 118) - 1 = min(119.875, 119, 118) - 1 = 118 - 1 = 117
    expect(result.trackToTrackIn).toBe(117);
  });
});

// ─── Extended Hood ──────────────────────────────────────────────────────────

describe("Screen Ordering — Extended Hood", () => {
  it("DOS + Undermount: suppressed (null)", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.upperRight = 60;
    m.overallLeft = 60;
    m.overallRight = 60;
    m.top = 120;
    m.middle = 119;
    m.bottom = 118;

    const result = calculateScreen(m, "DOS Screens", "Undermount");
    expect(result.extendedHoodIn).toBeNull();
  });

  it("Face-mount: M + 4.5", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.upperRight = 60;
    m.overallLeft = 60;
    m.overallRight = 60;
    m.top = 120;
    m.middle = 119;
    m.bottom = 118;

    const result = calculateScreen(m, "DOS Screens", "Face-mount");
    // M + 4.5 = 119 + 4.5 = 123.5
    expect(result.extendedHoodIn).toBe(123.5);
  });
});

// ─── Side Mismatch Detection ────────────────────────────────────────────────

describe("Screen Ordering — Side Mismatch", () => {
  it("detects left side mismatch when UL + LL != OL", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.lowerLeft = 60;
    m.overallLeft = 121; // UL + LL = 120, OL = 121 → diff = 1 > 0.125
    m.upperRight = 60;
    m.overallRight = 60;
    m.top = 120;
    m.bottom = 120;

    const result = calculateScreen(m, "DOS Screens");
    expect(result.leftSideMismatch).toBe(true);
  });

  it("no mismatch when within tolerance", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.lowerLeft = 60;
    m.overallLeft = 120.0625; // diff = 0.0625 < 0.125
    m.upperRight = 60;
    m.lowerRight = 60;
    m.overallRight = 120.0625;
    m.top = 120;
    m.bottom = 120;

    const result = calculateScreen(m, "DOS Screens");
    expect(result.leftSideMismatch).toBe(false);
    expect(result.rightSideMismatch).toBe(false);
  });
});

// ─── Build-out Logic ────────────────────────────────────────────────────────

describe("Screen Ordering — Build-out Logic (original thresholds)", () => {
  it("None for small slopes (< 7/16)", () => {
    expect(getBuildOutType(0.375)).toBe("None"); // 3/8"
    expect(getBuildOutType(0.3)).toBe("None");
  });

  it("1x2 for 7/16 to 3/4", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.upperRight = 60.5; // slope = 0.5 (between 7/16 and 3/4)
    m.overallLeft = 60;
    m.overallRight = 60.5;
    m.top = 120;
    m.bottom = 120;

    const result = calculateScreen(m, "DOS Screens");
    expect(result.buildOutType).toBe("1x2");
  });

  it("2x2 for 13/16 to 1 3/4", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.upperRight = 61; // slope = 1 (between 13/16 and 1 3/4)
    m.overallLeft = 60;
    m.overallRight = 61;
    m.top = 120;
    m.bottom = 120;

    const result = calculateScreen(m, "DOS Screens");
    expect(result.buildOutType).toBe("2x2");
  });

  it("FLAG for > 1 3/4", () => {
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.upperRight = 62; // slope = 2 (> 1 3/4)
    m.overallLeft = 60;
    m.overallRight = 62;
    m.top = 120;
    m.bottom = 120;

    const result = calculateScreen(m, "DOS Screens");
    expect(result.buildOutType).toBe("FLAG");
  });
});

// ─── U-Channel Logic ────────────────────────────────────────────────────────

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

// ─── Real Data Validation (from user's PDF example) ─────────────────────────

describe("Screen Ordering — Real Data from User's PDF", () => {
  it("matches the user's 'Middle Area' screen calculations", () => {
    // From the PDF:
    // UL=60, LL=60.5625, OL=61, UR=60, LR=60.25, OR=120.25
    // T=120.5625, M=121, B=122
    const m = createEmptyMeasurements();
    m.upperLeft = 60;
    m.lowerLeft = 60.5625;  // 60 9/16"
    m.overallLeft = 61;
    m.upperRight = 60;
    m.lowerRight = 60.25;   // 60 1/4"
    m.overallRight = 120.25; // 120 1/4"
    m.top = 120.5625;       // 120 9/16"
    m.middle = 121;
    m.bottom = 122;

    const result = calculateScreen(m, "DOS Screens", "Undermount");

    // Upper Slope = |UL - UR| = |60 - 60| = 0
    expect(result.upperSlopeIn).toBe(0);
    expect(result.slopeDirection).toBe("Level");
    expect(result.highSide).toBe("Level");
    expect(result.lowSide).toBe("Level");

    // Left Height = OL = 61 (level, no slope subtraction)
    expect(result.leftHeightIn).toBe(61);

    // Right Height = OR = 120.25 (level, no slope subtraction)
    expect(result.rightHeightIn).toBe(120.25);

    // T-B Diff = |120.5625 - 122| = 1.4375 (1 7/16")
    expect(result.tbDiffIn).toBeCloseTo(1.4375);
    expect(formatInchesFrac(result.tbDiffIn)).toBe('1 7/16"');

    // U-Channel: DOS threshold 1.5, diff 1.4375 → not needed
    expect(result.uChannelNeeded).toBe(false);

    // Track to Track = T - 1/8 = 120.5625 - 0.125 = 120.4375 (120 7/16")
    expect(result.trackToTrackIn).toBeCloseTo(120.4375);
    expect(formatInchesFrac(result.trackToTrackIn)).toBe('120 7/16"');

    // Build-out: slope 0 → None
    expect(result.buildOutType).toBe("None");
    expect(result.buildOutNeeded).toBe(false);

    // Extended Hood: DOS + Undermount → suppressed
    expect(result.extendedHoodIn).toBeNull();

    // Bias = 0 / 2 = 0
    expect(result.biasIn).toBe(0);

    // Side mismatch: UL + LL = 60 + 60.5625 = 120.5625, OL = 61 → |120.5625 - 61| = 59.5625 > 0.125 → mismatch
    expect(result.leftSideMismatch).toBe(true);
  });
});

// ─── Type Helpers ───────────────────────────────────────────────────────────

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
  });
});
