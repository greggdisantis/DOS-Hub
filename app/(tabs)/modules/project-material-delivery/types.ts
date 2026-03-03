// ─── Project Material Delivery Types ─────────────────────────────────────────

export type ChecklistStatus =
  | "draft"
  | "ready_for_supervisor"
  | "awaiting_main_office"
  | "awaiting_warehouse"
  | "final_review"
  | "complete"
  | "closed";

export const STATUS_LABELS: Record<ChecklistStatus, string> = {
  draft: "Draft",
  ready_for_supervisor: "Waiting on Project Supervisor",
  awaiting_main_office: "Awaiting Main Office Review",
  awaiting_warehouse: "Awaiting Warehouse",
  final_review: "Final Review Needed",
  complete: "Checklist Complete",
  closed: "Closed",
};

export const STATUS_COLORS: Record<ChecklistStatus, string> = {
  draft: "#6B7280",
  ready_for_supervisor: "#F59E0B",
  awaiting_main_office: "#3B82F6",
  awaiting_warehouse: "#8B5CF6",
  final_review: "#EF4444",
  complete: "#10B981",
  closed: "#9CA3AF",
};

export const OSI_QUAD_MAX_COLORS = [
  "000 Clear",
  "CM 003 Black",
  "CM 004 White",
  "CM 201 Bronze",
  "CM 301 Clay",
  "CM 427 Tan",
  "CM 501 Gray",
];

// ─── Boxed Items ─────────────────────────────────────────────────────────────

export interface PvcBoxedItem {
  scupper6: number | null;
  scupper8: number | null;
  coupling3: number | null;
  reducer3to2: number | null;
  coupling3b: number | null;
  coupling2: number | null;
  custom: string;
  customQty: number | null;
}

export interface ScreenScrewsItem {
  size1_5: number | null;
  size2: number | null;
}

export interface LedgerLocksItem {
  size2_7_8: number | null;
  size4_5: number | null;
  size6: number | null;
}

export interface WedgeAnchorsItem {
  size5_5: number | null;
  custom: string;
  customQty: number | null;
}

export interface FoamTapeItem {
  tapeRoll: number | null;
  dot3m: number | null;
  flashingTape: number | null;
}

export interface CaulkSealantsItem {
  osiQuadMaxColor: string;
  osiQuadMaxQty: number | null;
  flexSealColor: string;
  flexSealQty: number | null;
  ruscoe12_3Qty: number | null;
  customName: string;
  customColor: string;
  customQty: number | null;
}

export interface LedLightsItem {
  hasLights: boolean;
  type: string;
  color: string;
  qty: number | null;
}

export interface BoxedItems {
  pvc: PvcBoxedItem;
  screenScrews: ScreenScrewsItem;
  ledgerLocks: LedgerLocksItem;
  wedgeAnchors: WedgeAnchorsItem;
  foamTape: FoamTapeItem;
  caulkSealants: CaulkSealantsItem;
  ledLights: LedLightsItem;
  notes: string;
}

// ─── Delivery Items ───────────────────────────────────────────────────────────

export interface FansItem {
  hasFans: boolean;
  type: string;
  color: string;
  qty: number | null;
}

export interface PvcDeliveryItem {
  pipe3_10ft: number | null;
  pipe2_10ft: number | null;
  custom: string;
  customQty: number | null;
}

export interface AzekItem {
  size5_4: number | null;
  size3_4: number | null;
  other: string;
  otherQty: number | null;
}

export interface WireItem {
  wire18_5_sizeRoll: string;
  wire18_5_qty: number | null;
  wire12_2_sizeRoll: string;
  wire12_2_qty: number | null;
  wire10_2_sizeRoll: string;
  wire10_2_qty: number | null;
  custom: string;
  customSizeRoll: string;
  customQty: number | null;
}

export interface MiscItem {
  custom: string;
  customQty: number | null;
}

export interface DeliveryItems {
  fans: FansItem;
  pvc: PvcDeliveryItem;
  azek: AzekItem;
  wire: WireItem;
  misc: MiscItem;
  notes: string;
}

// ─── Project Specific Items ───────────────────────────────────────────────────

export interface HeatersItem {
  hasHeaters: boolean;
  type: string;
  color: string;
  qty: number | null;
  relayPanelNeeded: boolean;
}

export interface OtherProjectItem {
  jChannelQty: number | null;
  jChannelNote: string;
  lumberQty: number | null;
  lumberNote: string;
  trimCoilQty: number | null;
  trimCoilNote: string;
  custom1: string;
  custom1Qty: number | null;
  custom1Note: string;
  custom2: string;
  custom2Qty: number | null;
  custom2Note: string;
}

export interface ProjectSpecificItems {
  heaters: HeatersItem;
  otherItems: OtherProjectItem;
  notes: string;
}

// ─── Full Checklist ───────────────────────────────────────────────────────────

export interface ProjectMaterialChecklist {
  id: number;
  createdByUserId: number;
  createdByName: string | null;
  projectName: string;
  clientName: string | null;
  projectLocation: string | null;
  supervisorUserId: number | null;
  supervisorName: string | null;
  status: ChecklistStatus;
  boxedItems: BoxedItems | null;
  deliveryItems: DeliveryItems | null;
  projectSpecificItems: ProjectSpecificItems | null;
  warehouseCheckoffs: Record<string, boolean> | null;
  auditTrail: Array<{ userId: number; userName: string; action: string; timestamp: string }> | null;
  attachments: Array<{ url: string; name: string; type: string; uploadedByName: string; uploadedAt: string }> | null;
  materialsLoadedPhotos: string[] | null;
  materialsDeliveredPhotos: string[] | null;
  materialsLoaded: boolean;
  materialsDelivered: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Default empty states ─────────────────────────────────────────────────────

export const DEFAULT_BOXED_ITEMS: BoxedItems = {
  pvc: { scupper6: null, scupper8: null, coupling3: null, reducer3to2: null, coupling3b: null, coupling2: null, custom: "", customQty: null },
  screenScrews: { size1_5: null, size2: null },
  ledgerLocks: { size2_7_8: null, size4_5: null, size6: null },
  wedgeAnchors: { size5_5: null, custom: "", customQty: null },
  foamTape: { tapeRoll: null, dot3m: null, flashingTape: null },
  caulkSealants: { osiQuadMaxColor: "", osiQuadMaxQty: null, flexSealColor: "", flexSealQty: null, ruscoe12_3Qty: null, customName: "", customColor: "", customQty: null },
  ledLights: { hasLights: false, type: "", color: "", qty: null },
  notes: "",
};

export const DEFAULT_DELIVERY_ITEMS: DeliveryItems = {
  fans: { hasFans: false, type: "", color: "", qty: null },
  pvc: { pipe3_10ft: null, pipe2_10ft: null, custom: "", customQty: null },
  azek: { size5_4: null, size3_4: null, other: "", otherQty: null },
  wire: { wire18_5_sizeRoll: "", wire18_5_qty: null, wire12_2_sizeRoll: "", wire12_2_qty: null, wire10_2_sizeRoll: "", wire10_2_qty: null, custom: "", customSizeRoll: "", customQty: null },
  misc: { custom: "", customQty: null },
  notes: "",
};

export const DEFAULT_PROJECT_SPECIFIC_ITEMS: ProjectSpecificItems = {
  heaters: { hasHeaters: false, type: "", color: "", qty: null, relayPanelNeeded: false },
  otherItems: { jChannelQty: null, jChannelNote: "", lumberQty: null, lumberNote: "", trimCoilQty: null, trimCoilNote: "", custom1: "", custom1Qty: null, custom1Note: "", custom2: "", custom2Qty: null, custom2Note: "" },
  notes: "",
};
