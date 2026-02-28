/**
 * Screen Ordering Module — Constants & Business Logic
 * Migrated from the Google AI Studio Motorized Screens Ordering Tool (v3)
 */

// ─── Manufacturer ───────────────────────────────────────────────────────────
export type ScreenManufacturer = "DOS Screens" | "MagnaTrack";

// ─── Motor Types ────────────────────────────────────────────────────────────
export const MOTOR_TYPES: Record<ScreenManufacturer, string[]> = {
  "DOS Screens": ["Alpha", "Somfy"],
  MagnaTrack: ["Gaposa", "Somfy (Simu)"],
};

export const REMOTE_OPTIONS: Record<string, string[]> = {
  Somfy: ["1-Channel", "5-Channel", "16-Channel"],
  "Somfy (Simu)": ["1-Channel", "5-Channel", "16-Channel"],
  Alpha: ["1-Channel", "4-Channel", "8-Channel", "16-Channel"],
  Gaposa: ["1-Channel", "5-Channel", "16-Channel"],
};

// ─── Install & Motor Side ───────────────────────────────────────────────────
export const INSTALL_MOUNT_OPTIONS = ["Undermount", "Face-mount"];
export const FACE_MOUNT_SIDES = ["Left Only", "Right Only", "Both Sides"];
export const MOTOR_SIDE_OPTIONS = ["Left", "Right"];

// ─── Frame Colors ───────────────────────────────────────────────────────────
export const FRAME_COLOR_COLLECTIONS: Record<ScreenManufacturer, string[]> = {
  "DOS Screens": ["DOS", "StruXure"],
  MagnaTrack: ["MagnaTrack", "StruXure"],
};

export const FRAME_COLORS: Record<string, string[]> = {
  DOS: [
    "Stark White Texture", "Stark White", "Mid-Knight Black Texture",
    "Mid-Knight Black", "Oil Rubbed Bronze", "Oil Rubbed Bronze Texture",
    "Ash Gray", "Desert Sand", "Classic Linen Texture", "Rust",
    "Olive Green", "Champagne", "Glacier Blue", "Grey-Bronze", "Ash Gray Texture",
  ],
  MagnaTrack: [
    "White", "Beige", "Night Sky", "Bronze", "Dark Grey",
    "Ivory", "Mill Finish", "Silver Pearl",
  ],
  StruXure: [
    "StruXure White", "StruXure Black", "StruXure Gray",
    "StruXure Bronze", "StruXure Tan", "StruXure Adobe",
  ],
};

// ─── Screen Types & Colors ──────────────────────────────────────────────────
export const SCREEN_TYPES_BASE = [
  "Twichell Solar", "Twichell Insect", "Vinyl", "Ferrari Soltis",
];

export const TWICHELL_SOLAR_SERIES = ["80 Tex", "90 Tex", "95 Nano", "97 Nano", "99 Nano"];
export const FERRARI_SOLTIS_SERIES = ["VeoZip", "Proof 502"];

export const SCREEN_COLORS: Record<string, string[]> = {
  "Twichell Solar_80 Tex": ["Black", "Black/Brown", "Desert Sand", "White", "Brown", "Dusk Grey", "Sandstone"],
  "Twichell Solar_90 Tex": ["Black", "Black/Brown", "Desert Sand", "White", "Brown", "Dusk Grey", "Sandstone"],
  "Twichell Solar_95 Nano": [
    "Flat Black", "White", "Bone", "Sable", "Stone Texture", "Shadow Texture",
    "Espresso Texture", "Granite", "Tobacco", "Charcoal", "Desert Sand",
    "Almond", "Café", "Tumbleweed",
  ],
  "Twichell Solar_97 Nano": [
    "Flat Black", "Granite", "Espresso Texture", "Tobacco", "Charcoal",
    "White", "Bone", "Sable", "Desert Sand", "Almond", "Café",
    "Stone Texture", "Shadow Texture", "Tumbleweed Texture",
  ],
  "Twichell Solar_99 Nano": ["Flat Black", "Granite", "Espresso Texture", "Tobacco", "Charcoal"],
  "Twichell Insect": ["Black", "White"],
  "Ferrari Soltis_VeoZip": [
    "Graphite Black", "Grey Pepper", "Sandalwood", "Volcano", "Shadow",
    "Sea Urchin", "Sea Lion", "Lunar Surface", "Tundra", "Mistral",
    "Macadamia", "Natural", "Cumulus", "Edelweiss", "Frost White",
  ],
  "Ferrari Soltis_Proof 502": [
    "White", "Boulder", "Concrete", "Black", "Champagne", "Hemp",
    "Pepper", "Lemon", "Buttercup", "Orange", "Raspberry", "Poppy",
    "Burgundy", "Porcelain Green", "Tennis Green", "Lagoon",
    "Victoria Blue", "Midnight Blue", "Marine", "Aluminum",
  ],
  "Defender Series": ["White", "White & Tan", "Black & Tan", "Bronze", "Granite", "Grey", "Black"],
};

// ─── Vinyl Options ──────────────────────────────────────────────────────────
export const VINYL_WINDOW_CONFIGS = [
  "1 Window", "2 Windows",
  "Full Clear Vinyl w/ 6\" Solid Border",
  "Custom Config – See special instructions",
];
export const VINYL_ORIENTATIONS = ["Horizontal", "Vertical"];

// ─── Build-out Thresholds (inches) ──────────────────────────────────────────
export const BUILDOUT_TRIGGER = 3 / 8;     // 0.375"
export const BUILDOUT_1X2_MAX = 3 / 4;     // 0.75"
export const BUILDOUT_2X2_MAX = 1 + 7 / 8; // 1.875"

// ─── U-Channel Thresholds (inches) ──────────────────────────────────────────
export const UCHANNEL_THRESHOLD_DOS = 1.5;
export const UCHANNEL_THRESHOLD_MAGNA = 0.375;

// ─── Helper Functions ───────────────────────────────────────────────────────

export function getScreenTypes(manufacturer: ScreenManufacturer): string[] {
  const types = [...SCREEN_TYPES_BASE];
  if (manufacturer === "MagnaTrack") types.push("Defender Series");
  return types;
}

export function getScreenColorOptions(screenType: string, series?: string): string[] {
  const key = series ? `${screenType}_${series}` : screenType;
  return SCREEN_COLORS[key] ?? [];
}

export function isUChannelNeeded(manufacturer: ScreenManufacturer, tbDiffInches: number): boolean {
  const threshold = manufacturer === "MagnaTrack" ? UCHANNEL_THRESHOLD_MAGNA : UCHANNEL_THRESHOLD_DOS;
  return tbDiffInches > threshold;
}

export function getBuildOutType(slopeInches: number): "None" | "1x2" | "2x2" | "FLAG" {
  const abs = Math.abs(slopeInches);
  if (abs <= BUILDOUT_TRIGGER) return "None";
  if (abs <= BUILDOUT_1X2_MAX) return "1x2";
  if (abs <= BUILDOUT_2X2_MAX) return "2x2";
  return "FLAG";
}

// ─── Fraction Helpers ───────────────────────────────────────────────────────
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export const FRACTION_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  if (i === 0) return { value: 0, label: "0" };
  const d = gcd(i, 16);
  return { value: i / 16, label: `${i / d}/${16 / d}` };
});
