/**
 * Preconstruction Checklist — shared types for all form sections.
 * The full form data is stored as JSON in the DB under `formData`.
 */

export interface AccessoryItem {
  checked: boolean;
  qty: string;
  location: string;
}

export interface DecorativeFeature {
  postBases: boolean;
  postCapitals: boolean;
  postWraps: boolean;
  ledStripGutter: boolean;
  ledStripTrax: boolean;
  pergolaCuts: boolean;
  oneStepCornice: boolean;
  twoStepCornice: boolean;
  traxRise: boolean;
  other: string;
}

export interface WireItem {
  checked: boolean;
  qty: string;
}

export interface WorkItem {
  needed: boolean | null; // null = not answered
  additionalCost: boolean | null;
  addendumNeeded: boolean | null;
  responsibleParty: "CUSTOMER" | "DOS" | "OTHER" | null;
  contractor: string;
  scopeOfWork: string;
}

export interface PreconFormData {
  // Section 1 — Project Info (stored at top level, not in formData)
  // projectName, projectAddress, meetingDate, supervisorName are top-level DB fields

  // Section 2 — StruXure Details
  paymentReviewed: boolean;
  materialDropOffLocation: string;
  stagingAreaLocation: string;
  siteWillBeClear: boolean;
  planReviewed: boolean;
  futureAddOnsDiscussed: boolean;
  struxureZones: string;
  controlBoxLocation: string;
  rainSensorLocation: string;
  windSensorLocation: string;
  accessories: {
    accessoryBeams: AccessoryItem;
    receptacles: AccessoryItem;
    motorizedScreens: AccessoryItem;
    lights: AccessoryItem & { switchLocation: string };
    fans: AccessoryItem & { switchLocation: string };
    heaters: AccessoryItem & { switchLocation: string };
    sconceLighting: AccessoryItem;
    systemDownspouts: AccessoryItem;
  };

  // Section 3 — Decorative Features
  decorative: DecorativeFeature;

  // Section 4 — Pergola Review
  pergola: {
    locationReviewed: boolean;
    height: string;
    slope: string;
    drainElevation: string;
    wiringPostsLabeled: boolean;
    wireDiagramReviewed: boolean;
    wireFeetPerPost: string;
  };

  // Section 5 — Client Expectations
  expectations: {
    constructionTimeReviewed: boolean;
    aluminumShavingsReviewed: boolean;
    minorLeaksReviewed: boolean;
    contractChangesReviewed: boolean;
    addendumsIdentified: boolean;
  };

  // Section 6 — Photos Taken
  photos: {
    driveway: boolean;
    stagingArea: boolean;
    pergolLocation: boolean;
    workArea: boolean;
    postLocations: boolean;
    priorDamage: boolean;
    installationProhibitions: boolean;
  };

  // Section 6b — Photo URIs per line item (keyed by section.lineIndex)
  // Example: "photos.driveway" -> ["file://...", "file://..."]
  photoUris: Record<string, string[]>;

  // Section 7 — Materials Needed
  materials: {
    ledgerBoard: boolean;
    downspoutPipe: boolean;
    downspoutQty: string;
    jChannel: boolean;
    flashing: boolean;
    deckBlocking: boolean;
    wire14_2: WireItem;
    wire12_2: WireItem;
    wireMotor: WireItem;
    wire10_3: WireItem;
    otherItems: string;
  };

  // Section 8 — Work Items
  workItems: {
    electrical: WorkItem;
    footings: WorkItem;
    patioAlterations: WorkItem;
    deckAlterations: WorkItem;
    houseGutterAlterations: WorkItem;
  };

  // Section 9 — Notes
  projectNotes: string;
  clientRemarks: string;
}

export const defaultWorkItem = (): WorkItem => ({
  needed: null,
  additionalCost: null,
  addendumNeeded: null,
  responsibleParty: null,
  contractor: "",
  scopeOfWork: "",
});

export const defaultFormData = (): PreconFormData => ({
  paymentReviewed: false,
  materialDropOffLocation: "",
  stagingAreaLocation: "",
  siteWillBeClear: false,
  planReviewed: false,
  futureAddOnsDiscussed: false,
  struxureZones: "",
  controlBoxLocation: "",
  rainSensorLocation: "",
  windSensorLocation: "",
  accessories: {
    accessoryBeams: { checked: false, qty: "", location: "" },
    receptacles: { checked: false, qty: "", location: "" },
    motorizedScreens: { checked: false, qty: "", location: "" },
    lights: { checked: false, qty: "", location: "", switchLocation: "" },
    fans: { checked: false, qty: "", location: "", switchLocation: "" },
    heaters: { checked: false, qty: "", location: "", switchLocation: "" },
    sconceLighting: { checked: false, qty: "", location: "" },
    systemDownspouts: { checked: false, qty: "", location: "" },
  },
  decorative: {
    postBases: false,
    postCapitals: false,
    postWraps: false,
    ledStripGutter: false,
    ledStripTrax: false,
    pergolaCuts: false,
    oneStepCornice: false,
    twoStepCornice: false,
    traxRise: false,
    other: "",
  },
  pergola: {
    locationReviewed: false,
    height: "",
    slope: "",
    drainElevation: "",
    wiringPostsLabeled: false,
    wireDiagramReviewed: false,
    wireFeetPerPost: "",
  },
  expectations: {
    constructionTimeReviewed: false,
    aluminumShavingsReviewed: false,
    minorLeaksReviewed: false,
    contractChangesReviewed: false,
    addendumsIdentified: false,
  },
  photos: {
    driveway: false,
    stagingArea: false,
    pergolLocation: false,
    workArea: false,
    postLocations: false,
    priorDamage: false,
    installationProhibitions: false,
  },
  photoUris: {},
  materials: {
    ledgerBoard: false,
    downspoutPipe: false,
    downspoutQty: "",
    jChannel: false,
    flashing: false,
    deckBlocking: false,
    wire14_2: { checked: false, qty: "" },
    wire12_2: { checked: false, qty: "" },
    wireMotor: { checked: false, qty: "" },
    wire10_3: { checked: false, qty: "" },
    otherItems: "",
  },
  workItems: {
    electrical: defaultWorkItem(),
    footings: defaultWorkItem(),
    patioAlterations: defaultWorkItem(),
    deckAlterations: defaultWorkItem(),
    houseGutterAlterations: defaultWorkItem(),
  },
  projectNotes: "",
  clientRemarks: "",
});
