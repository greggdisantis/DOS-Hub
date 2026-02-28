/**
 * Screen Ordering Module — Structural Calculation Engine
 * Migrated from the Google AI Studio Motorized Screens Ordering Tool (v3)
 */
import type { ScreenMeasurements, ScreenCalculations } from "./types";
import { isUChannelNeeded, getBuildOutType, type ScreenManufacturer } from "./constants";

/**
 * Performs all structural calculations for a single screen based on its 9 measurement points.
 */
export function calculateScreen(
  measurements: ScreenMeasurements,
  manufacturer: ScreenManufacturer
): ScreenCalculations | null {
  const { upperLeft, lowerLeft, overallLeft, upperRight, lowerRight, overallRight, top, middle, bottom } = measurements;

  // Need at least the core measurements to calculate
  if (upperLeft == null || upperRight == null || top == null || bottom == null) {
    return null;
  }

  // 1. Upper Slope (S) = |UL - UR|
  const upperSlopeIn = Math.abs(upperLeft - upperRight);

  // 2. Left Height — use overallLeft if provided, otherwise upperLeft
  const leftHeightIn = overallLeft ?? upperLeft;

  // 3. Right Height — use overallRight if provided, otherwise upperRight
  const rightHeightIn = overallRight ?? upperRight;

  // 4. Slope Direction
  let slopeDirection: "Left" | "Right" | "Level";
  if (upperLeft > upperRight) {
    slopeDirection = "Left";
  } else if (upperRight > upperLeft) {
    slopeDirection = "Right";
  } else {
    slopeDirection = "Level";
  }

  // 5. High Side
  let highSide: "Left" | "Right" | "Level";
  if (leftHeightIn > rightHeightIn) {
    highSide = "Left";
  } else if (rightHeightIn > leftHeightIn) {
    highSide = "Right";
  } else {
    highSide = "Level";
  }

  // 6. Track to Track = Middle measurement (the width between tracks)
  const trackToTrackIn = middle ?? top;

  // 7. T-B Diff = |Top - Bottom|
  const tbDiffIn = bottom != null ? Math.abs(top - bottom) : 0;

  // 8. U-Channel
  const uChannelNeeded = isUChannelNeeded(manufacturer, tbDiffIn);

  // 9. Build-out
  const buildOutType = getBuildOutType(upperSlopeIn);

  return {
    upperSlopeIn,
    leftHeightIn,
    rightHeightIn,
    slopeDirection,
    highSide,
    trackToTrackIn,
    tbDiffIn,
    uChannelNeeded,
    buildOutType,
  };
}

/**
 * Format inches as feet and inches string (e.g., 65.5 -> 5' 5 1/2")
 */
export function formatInches(inches: number | null): string {
  if (inches == null) return "—";
  const ft = Math.floor(inches / 12);
  const remainIn = inches % 12;
  const wholeIn = Math.floor(remainIn);
  const frac = remainIn - wholeIn;

  let fracStr = "";
  if (frac > 0) {
    // Find closest 1/16th
    const sixteenths = Math.round(frac * 16);
    if (sixteenths > 0 && sixteenths < 16) {
      const g = gcd(sixteenths, 16);
      fracStr = ` ${sixteenths / g}/${16 / g}`;
    }
  }

  if (ft > 0) {
    return `${ft}' ${wholeIn}${fracStr}"`;
  }
  return `${wholeIn}${fracStr}"`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
