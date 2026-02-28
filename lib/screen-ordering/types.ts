/**
 * Screen Ordering Module — Type Definitions
 * Matches the original Google AI Studio Motorized Screens Ordering Tool (v3)
 */
import type { ScreenManufacturer } from "./constants";

// ─── Project Info ───────────────────────────────────────────────────────────

export interface ProjectInfo {
  name: string;
  submitterName: string;
  date: string;
  address: string;
  jobNumber: string;
}

// ─── Measurement Points ─────────────────────────────────────────────────────

export type MeasurementPoint =
  | "upperLeft" | "lowerLeft" | "overallLeft"
  | "upperRight" | "lowerRight" | "overallRight"
  | "top" | "middle" | "bottom";

export const MEASUREMENT_POINTS: MeasurementPoint[] = [
  "upperLeft", "lowerLeft", "overallLeft",
  "upperRight", "lowerRight", "overallRight",
  "top", "middle", "bottom",
];

export const MEASUREMENT_LABELS: Record<MeasurementPoint, string> = {
  upperLeft: "Upper Left",
  lowerLeft: "Lower Left",
  overallLeft: "Overall Left",
  upperRight: "Upper Right",
  lowerRight: "Lower Right",
  overallRight: "Overall Right",
  top: "Top",
  middle: "Middle",
  bottom: "Bottom",
};

export const MEASUREMENT_SHORT_LABELS: Record<MeasurementPoint, string> = {
  upperLeft: "UL",
  lowerLeft: "LL",
  overallLeft: "OL",
  upperRight: "UR",
  lowerRight: "LR",
  overallRight: "OR",
  top: "T",
  middle: "M",
  bottom: "B",
};

export type ScreenMeasurements = Record<MeasurementPoint, number | null>;

// ─── Build-out Types ────────────────────────────────────────────────────────

export type BuildOutType = "None" | "1x2" | "2x2" | "FLAG";

// ─── Screen Selections ─────────────────────────────────────────────────────

export interface ScreenSelections {
  screenType: string;
  series: string;
  screenColor: string;
  frameColorCollection: string;
  frameColor: string;
  motorType: string;
  remoteOption: string;
  installMount: string;
  faceMountSides: string;
  motorSide: string;
  vinylWindowConfig: string;
  vinylOrientation: string;
  windowBorderMaterial: string;
  windowBorderSeries: string;
  windowBorderColor: string;
}

// ─── Calculation Results ────────────────────────────────────────────────────

export interface ScreenCalculations {
  // Core structural calculations
  upperSlopeIn: number | null;
  leftHeightIn: number | null;
  rightHeightIn: number | null;
  slopeDirection: "Left" | "Right" | "Level" | null;
  highSide: "Left" | "Right" | "Level" | null;
  lowSide: "Left" | "Right" | "Level" | null;
  trackToTrackIn: number | null;
  tbDiffIn: number | null;

  // Material requirements
  uChannelNeeded: boolean;
  buildOutNeeded: boolean;
  buildOutType: BuildOutType;

  // Additional calculations
  extendedHoodIn: number | null;
  biasIn: number | null;
  orderableWidthIn: number;
  orderableHeightIn: number;

  // Validation flags
  leftSideMismatch: boolean;
  rightSideMismatch: boolean;
}

// ─── Screen Config ──────────────────────────────────────────────────────────

export interface ScreenConfig {
  id: string;
  description: string;
  specialInstructions: string;
  uChannelNotes: string;
  buildOutColor: string;
  buildOutNotes: string;
  numberOfCuts: string;
  reversedMeasurements: boolean;
  selections: ScreenSelections;
  measurements: ScreenMeasurements;
  calculations: ScreenCalculations | null;
}

// ─── Order State ────────────────────────────────────────────────────────────

export interface OrderState {
  project: ProjectInfo;
  manufacturer: ScreenManufacturer;
  screens: ScreenConfig[];
  applyUChannelToAll: boolean;
  allSame: boolean;
}

// ─── Factory Functions ──────────────────────────────────────────────────────

export function createEmptyMeasurements(): ScreenMeasurements {
  return {
    upperLeft: null, lowerLeft: null, overallLeft: null,
    upperRight: null, lowerRight: null, overallRight: null,
    top: null, middle: null, bottom: null,
  };
}

export function createEmptySelections(): ScreenSelections {
  return {
    screenType: "", series: "", screenColor: "",
    frameColorCollection: "", frameColor: "",
    motorType: "", remoteOption: "",
    installMount: "Undermount", faceMountSides: "",
    motorSide: "", vinylWindowConfig: "", vinylOrientation: "",
    windowBorderMaterial: "", windowBorderSeries: "", windowBorderColor: "",
  };
}

export function createEmptyScreen(index: number): ScreenConfig {
  return {
    id: `screen-${Date.now()}-${index}`,
    description: "",
    specialInstructions: "",
    uChannelNotes: "",
    buildOutColor: "",
    buildOutNotes: "",
    numberOfCuts: "",
    reversedMeasurements: false,
    selections: createEmptySelections(),
    measurements: createEmptyMeasurements(),
    calculations: null,
  };
}
