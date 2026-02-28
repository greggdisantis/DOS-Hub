/**
 * Screen Ordering Module — Type Definitions
 */
import type { ScreenManufacturer } from "./constants";

export interface ProjectInfo {
  name: string;
  submitterName: string;
  date: string;
  address: string;
  jobNumber: string;
}

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

export type ScreenMeasurements = Record<MeasurementPoint, number | null>;

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

export interface ScreenCalculations {
  upperSlopeIn: number | null;
  leftHeightIn: number | null;
  rightHeightIn: number | null;
  slopeDirection: "Left" | "Right" | "Level" | null;
  highSide: "Left" | "Right" | "Level" | null;
  trackToTrackIn: number | null;
  tbDiffIn: number | null;
  uChannelNeeded: boolean;
  buildOutType: "None" | "1x2" | "2x2" | "FLAG";
}

export interface ScreenConfig {
  id: string;
  description: string;
  specialInstructions: string;
  selections: ScreenSelections;
  measurements: ScreenMeasurements;
  calculations: ScreenCalculations | null;
}

export interface OrderState {
  project: ProjectInfo;
  manufacturer: ScreenManufacturer;
  screens: ScreenConfig[];
  applyUChannelToAll: boolean;
}

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
    description: `Screen ${index + 1}`,
    specialInstructions: "",
    selections: createEmptySelections(),
    measurements: createEmptyMeasurements(),
    calculations: null,
  };
}
