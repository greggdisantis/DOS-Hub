/**
 * Screen Ordering Module — Structural Calculation Engine
 * Migrated from the Google AI Studio Motorized Screens Ordering Tool (v3)
 *
 * All calculations match the original source exactly:
 * - snapToSixteenth rounding on all intermediate values
 * - Left/Right height adjusted by subtracting slope from the HIGH side
 * - Track-to-Track: with U-channel = min(T-1/8, M, B) - 1; without = T - 1/8
 * - Extended Hood: complex rules based on manufacturer, mount, U-channel
 * - Bias = slope / 2
 * - Side mismatch detection (UL+LL vs OL, UR+LR vs OR)
 */
import type {
  ScreenMeasurements,
  ScreenCalculations,
  BuildOutType,
  MeasurementPoint,
} from "./types";
import { isUChannelNeeded, type ScreenManufacturer } from "./constants";

// ─── Precision Helpers ──────────────────────────────────────────────────────

const MISMATCH_TOLERANCE_IN = 0.125; // 1/8"

/** Round to nearest 1/16th of an inch */
export function snapToSixteenth(totalInches: number): number {
  if (isNaN(totalInches)) return 0;
  return Math.round(totalInches * 16) / 16;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/** Format total inches as "X Y/Z" with reduced fractions (e.g., 120.4375 -> "120 7/16\"") */
export function formatInchesFrac(totalInches: number | null | undefined): string {
  if (totalInches == null || isNaN(totalInches)) return "—";
  const snapped = snapToSixteenth(totalInches);
  const wholeInches = Math.floor(snapped);
  const fraction = snapped - wholeInches;
  const frac16 = Math.round(fraction * 16);

  let result = `${wholeInches}`;
  if (frac16 > 0 && frac16 < 16) {
    const d = gcd(frac16, 16);
    result += ` ${frac16 / d}/${16 / d}`;
  }
  result += '"';
  return result;
}

/** Format total inches as feet + inches (e.g., 65.5 -> "5' 5 1/2\"") */
export function formatFtInFrac(totalInches: number | null | undefined): string {
  if (totalInches == null || isNaN(totalInches)) return "—";
  const snapped = snapToSixteenth(totalInches);
  const ft = Math.floor(snapped / 12);
  const remainingInches = snapped - ft * 12;
  let inch = Math.floor(remainingInches);
  const fraction = remainingInches - inch;
  let frac16 = Math.round(fraction * 16);
  if (frac16 === 16) {
    inch += 1;
    frac16 = 0;
  }

  let result = `${ft}' ${inch}`;
  if (frac16 > 0) {
    const d = gcd(frac16, 16);
    result += ` ${frac16 / d}/${16 / d}`;
  }
  result += '"';
  return result;
}

// Keep backward compat alias
export const formatInches = formatInchesFrac;

// ─── Calculation Engine ─────────────────────────────────────────────────────

export interface CalculateScreenOptions {
  measurements: ScreenMeasurements;
  manufacturer: ScreenManufacturer;
  installMount: string;
  reverseMeasurements?: boolean;
}

/**
 * Performs all structural calculations for a single screen.
 * Matches the original Google AI Studio v3 logic exactly.
 */
export function calculateScreen(
  measurements: ScreenMeasurements,
  manufacturer: ScreenManufacturer,
  installMount?: string,
  reverseMeasurements?: boolean
): ScreenCalculations {
  // Apply reverse if needed
  const rawUl = measurements.upperLeft;
  const rawLl = measurements.lowerLeft;
  const rawOl = measurements.overallLeft;
  const rawUr = measurements.upperRight;
  const rawLr = measurements.lowerRight;
  const rawOr = measurements.overallRight;

  const rev = reverseMeasurements ?? false;
  const ul = rev ? rawUr : rawUl;
  const ur = rev ? rawUl : rawUr;
  const ll = rev ? rawLr : rawLl;
  const lr = rev ? rawLl : rawLr;
  const ol = rev ? rawOr : rawOl;
  const or_ = rev ? rawOl : rawOr;

  const t = measurements.top;
  const m = measurements.middle;
  const b = measurements.bottom;

  const mount = installMount ?? "Undermount";

  // ─── 1. Upper Slope (S) ────────────────────────────────────────────
  let sRaw = 0;
  let upperSlopeIn: number | null = null;
  let slopeDirection: "Left" | "Right" | "Level" | null = null;
  let highSide: "Left" | "Right" | "Level" | null = null;
  let lowSide: "Left" | "Right" | "Level" | null = null;

  if (ul != null && ur != null) {
    sRaw = snapToSixteenth(Math.abs(ur - ul));
    upperSlopeIn = sRaw;
    if (ul > ur) {
      slopeDirection = "Left";
      highSide = "Left";
      lowSide = "Right";
    } else if (ur > ul) {
      slopeDirection = "Right";
      highSide = "Right";
      lowSide = "Left";
    } else {
      slopeDirection = "Level";
      highSide = "Level";
      lowSide = "Level";
    }
  }

  // ─── 2. Left Height ────────────────────────────────────────────────
  let leftHeightIn: number | null = null;
  if (ol != null && ul != null && ur != null) {
    let lh = ol;
    if (sRaw === 0) {
      lh = ol;
    } else if (ul > ur) {
      // High Side == "Left" → subtract slope
      lh = ol - sRaw;
    } else {
      // High Side == "Right" → use OL as-is
      lh = ol;
    }
    leftHeightIn = snapToSixteenth(Math.max(0, lh));
  }

  // ─── 3. Right Height ──────────────────────────────────────────────
  let rightHeightIn: number | null = null;
  if (or_ != null && ul != null && ur != null) {
    let rh = or_;
    if (sRaw === 0) {
      rh = or_;
    } else if (ur > ul) {
      // High Side == "Right" → subtract slope
      rh = or_ - sRaw;
    } else {
      // High Side == "Left" → use OR as-is
      rh = or_;
    }
    rightHeightIn = snapToSixteenth(Math.max(0, rh));
  }

  // ─── 4. T-B Diff & U-Channel ──────────────────────────────────────
  let tbDiffIn: number | null = null;
  let uChannelNeeded = false;
  if (t != null && b != null) {
    tbDiffIn = snapToSixteenth(Math.abs(t - b));
    uChannelNeeded = isUChannelNeeded(manufacturer, tbDiffIn);
  }

  // ─── 5. Build-out ─────────────────────────────────────────────────
  let buildOutNeeded = false;
  let buildOutType: BuildOutType = "None";
  if (ul != null && ur != null) {
    if (sRaw >= 0.4375 && sRaw <= 0.75) {
      buildOutNeeded = true;
      buildOutType = "1x2";
    } else if (sRaw >= 0.8125 && sRaw <= 1.75) {
      buildOutNeeded = true;
      buildOutType = "2x2";
    } else if (sRaw > 1.75) {
      buildOutNeeded = true;
      buildOutType = "FLAG";
    }
  }

  // ─── 6. Track to Track ────────────────────────────────────────────
  let trackToTrackIn: number | null = null;
  if (uChannelNeeded) {
    // With U-channel: min(T-1/8, M, B) - 1
    if (t != null && m != null && b != null) {
      const A = t - 0.125;
      const B1 = m;
      const C = b;
      const minVal = Math.min(A, B1, C);
      trackToTrackIn = snapToSixteenth(minVal - 1.0);
    }
  } else {
    // Without U-channel: T - 1/8
    if (t != null) {
      trackToTrackIn = snapToSixteenth(t - 0.125);
    }
  }

  // ─── 7. Extended Hood ─────────────────────────────────────────────
  let extendedHoodIn: number | null = null;
  if (manufacturer === "DOS Screens" && mount === "Undermount") {
    extendedHoodIn = null; // Suppressed for DOS + Undermount
  } else if (mount === "Undermount" && manufacturer === "MagnaTrack" && uChannelNeeded) {
    if (t != null) {
      extendedHoodIn = snapToSixteenth(t - 0.125);
    }
  } else if (mount === "Undermount" && !uChannelNeeded) {
    extendedHoodIn = null; // Suppressed
  } else {
    // Default: M + 4.5
    if (m != null) {
      extendedHoodIn = snapToSixteenth(m + 4.5);
    }
  }

  // ─── 8. Bias ──────────────────────────────────────────────────────
  let biasIn: number | null = null;
  if (ul != null && ur != null) {
    biasIn = snapToSixteenth(sRaw / 2);
  }

  // ─── 9. Orderable dimensions ──────────────────────────────────────
  const orderableWidthIn = m ?? 0;
  const orderableHeightIn = Math.max(leftHeightIn ?? 0, rightHeightIn ?? 0);

  // ─── 10. Side mismatch detection ──────────────────────────────────
  const leftSideMismatch =
    rawUl != null && rawOl != null && rawLl != null
      ? Math.abs(rawUl + rawLl - rawOl) > MISMATCH_TOLERANCE_IN
      : false;
  const rightSideMismatch =
    rawUr != null && rawOr != null && rawLr != null
      ? Math.abs(rawUr + rawLr - rawOr) > MISMATCH_TOLERANCE_IN
      : false;

  return {
    upperSlopeIn,
    leftHeightIn,
    rightHeightIn,
    slopeDirection,
    highSide,
    lowSide,
    trackToTrackIn,
    tbDiffIn,
    uChannelNeeded,
    buildOutNeeded,
    buildOutType,
    extendedHoodIn,
    biasIn,
    orderableWidthIn,
    orderableHeightIn,
    leftSideMismatch,
    rightSideMismatch,
  };
}
