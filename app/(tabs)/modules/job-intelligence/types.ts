/**
 * Job Intelligence Module - Core Types
 * Represents jobs and their material readiness calculations
 */

export enum ProductCategory {
  StruXure = 'StruXure',
  Screens = 'Screens',
  Pergotenda = 'Pergotenda',
  Awnings = 'Awnings',
}

export enum PermitStatus {
  Prep = 'Permit Prep',
  Submitted = 'Permit Submitted',
  Hold = 'Permit Hold',
  VarianceRequired = 'Permit Variance Required',
  ApprovedPendingC = 'Permit Approved, Pend. C',
  Received = 'Permit Received',
  NotRequired = 'Permit Not Required',
  ByOthers = 'Permit By Others',
}

export enum MaterialStatus {
  NotYetOrdered = 'Not Yet Ordered',
  ReadyToOrder = 'Ready to Order',
  Ordered = 'Ordered',
  InWarehouse = 'In Warehouse',
  Received = 'Received',
  DeliveredToSite = 'Delivered to Site',
}

export enum ScreenManufacturer {
  DOS = 'DOS Screens',
  MagnaTrack = 'MagnaTrack',
}

export enum Confidence {
  HARD = 'HARD',
  FORECAST = 'FORECAST',
  BLOCKED = 'BLOCKED',
}

/**
 * Represents a single job with all relevant fields
 */
export interface CanonicalJob {
  // Identifiers
  Customer: string;
  JobCategory?: string;
  ProjectSupervisor?: string;

  // Dates
  ContractSignedDate?: Date | null;
  PermitSubmissionDate?: Date | null;
  PermitEstimatedApprovalDate?: Date | null;
  PermitActualApprovalDate?: Date | null;
  StruXureOrderDate?: Date | null;
  StruXureEstimatedMaterialReceiveDate?: Date | null;
  StruXureActualMaterialReceivedDate?: Date | null;
  PreConCompletedDate?: Date | null;
  ScreensEstimatedMaterialReceiveDate?: Date | null;
  ScreensActualMaterialReceivedDate?: Date | null;
  InstallEstimatedReadyMonth?: string | null; // YYYY-MM

  // Permit Info
  PermitStatus?: string;
  PermitResponsibility?: string;

  // StruXure Info
  StruXureMaterialStatus?: string;
  StruXureSquareFootage?: number | null;
  StruXureNumberOfZones?: number | null;
  StruXureMaterialWaiver?: boolean;

  // Screens Info
  ScreensMaterialStatus?: string;
  ScreensManufacturer?: string;
  ScreensQuantity?: number | null;

  // Pergotenda Info
  PergotendaMaterialStatus?: string;
  PergotendaSquareFootage?: number | null;
  PergotendaMaterialWaiver?: boolean;

  // Awning Info
  AwningMaterialStatus?: string;

  // Combination Job Info
  IsThisACombinationJob: boolean;
}

/**
 * Result of readiness calculation for a single product
 */
export interface ReadinessResult {
  readyMonth: string | null; // YYYY-MM
  confidence: Confidence;
  sourceLabel: string;
  detailTrace: string;
  exceptions: string[];
}

/**
 * Processed job with readiness calculations
 */
export interface ProcessedJob {
  canonical: CanonicalJob;
  readiness: {
    [key in ProductCategory]?: ReadinessResult;
  };
}

/**
 * Enabled product categories for a job
 */
export interface EnabledCategories {
  StruXure: boolean;
  Pergotenda: boolean;
  Awnings: boolean;
  Screens: boolean;
}

/**
 * Job saved to database
 */
export interface SavedJob extends ProcessedJob {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  revisionNumber: number;
  status: 'draft' | 'submitted' | 'approved' | 'archived';
}
