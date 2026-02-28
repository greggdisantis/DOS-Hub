/**
 * Job Intelligence Module - Constants
 */

import { PermitStatus, MaterialStatus, ScreenManufacturer, ProductCategory } from './types';

export const PERMIT_STATUSES = [
  PermitStatus.Prep,
  PermitStatus.Submitted,
  PermitStatus.Hold,
  PermitStatus.VarianceRequired,
  PermitStatus.ApprovedPendingC,
  PermitStatus.Received,
  PermitStatus.NotRequired,
  PermitStatus.ByOthers,
];

export const MATERIAL_STATUSES = [
  MaterialStatus.NotYetOrdered,
  MaterialStatus.ReadyToOrder,
  MaterialStatus.Ordered,
  MaterialStatus.InWarehouse,
  MaterialStatus.Received,
  MaterialStatus.DeliveredToSite,
];

export const SCREEN_MANUFACTURERS = [
  ScreenManufacturer.DOS,
  ScreenManufacturer.MagnaTrack,
];

export const JOB_CATEGORIES = [
  '02: master - screen only',
  '01: master - struxure project',
  '03: master - pergotenda project',
  '04: master - awning',
];

export const PERMIT_RESPONSIBILITIES = [
  'By Others',
  'By DOS',
  'Shared',
];

/**
 * Lead times in weeks for each product
 */
export const LEAD_TIMES_WEEKS = {
  [ProductCategory.StruXure]: 7,
  [ProductCategory.Pergotenda]: 7,
  [ProductCategory.Screens]: {
    [ScreenManufacturer.DOS]: 3,
    [ScreenManufacturer.MagnaTrack]: 7,
  },
  [ProductCategory.Awnings]: 3,
};

/**
 * Business days to add for permit approval estimates
 */
export const PERMIT_APPROVAL_BUSINESS_DAYS = 10;

/**
 * Exception codes and descriptions
 */
export const EXCEPTION_DESCRIPTIONS: Record<string, string> = {
  WAIVER_REQUIRES_PRECON: 'Material waiver is active but Pre-Con completion date is missing',
  MISSING_PERMIT_SUBMISSION_DATE: 'Permit submitted but submission date is missing',
  MISSING_PERMIT_APPROVAL_DATE: 'Permit approved but approval date is missing',
  PERMIT_APPROVED_NOT_ORDERED: 'Permit approved but order has not been placed yet',
  STRUCTURE_NOT_READY_TO_ORDER: 'Permit status is blocking the order',
  MISSING_CONTRACT_SIGNED_DATE: 'Contract signed date is required but missing',
  SCREENS_DEPEND_ON_STRUCTURE: 'Screens are part of combination job but structure readiness cannot be determined',
};

/**
 * Confidence level colors for UI display
 */
export const CONFIDENCE_COLORS = {
  HARD: '#22C55E', // Green
  FORECAST: '#F59E0B', // Amber
  BLOCKED: '#EF4444', // Red
};

/**
 * Confidence level labels
 */
export const CONFIDENCE_LABELS = {
  HARD: 'Confirmed',
  FORECAST: 'Estimated',
  BLOCKED: 'Blocked',
};
