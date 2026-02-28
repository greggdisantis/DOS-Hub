/**
 * Job Intelligence Module - Readiness Calculator
 * Calculates material readiness for each job based on parsed data
 */

import type { ParsedJob } from './excel-parser';

export interface ReadinessResult {
  product: string;
  readyMonth: string | null;
  confidence: 'HARD' | 'FORECAST' | 'BLOCKED';
  status: string;
  sourceLabel: string;
}

export interface JobReadiness {
  customer: string;
  jobCategory: string;
  projectSupervisor: string;
  struXure: ReadinessResult | null;
  screens: ReadinessResult | null;
  pergotenda: ReadinessResult | null;
  awning: ReadinessResult | null;
}

/**
 * Calculate readiness for a single job
 */
export function calculateJobReadiness(job: ParsedJob): JobReadiness {
  const result: JobReadiness = {
    customer: job.customer,
    jobCategory: job.jobCategory,
    projectSupervisor: job.projectSupervisor,
    struXure: null,
    screens: null,
    pergotenda: null,
    awning: null,
  };

  // Determine which products are in this job
  const hasStruXure = job.jobCategory.includes('StruXure') || job.jobCategory.includes('01:');
  const hasScreens = job.isCombinationJob || job.jobCategory.includes('Screen') || job.jobCategory.includes('02:');
  const hasPergotenda = job.jobCategory.includes('Pergotenda') || job.jobCategory.includes('03:');
  const hasAwning = job.jobCategory.includes('Awning') || job.jobCategory.includes('04:');

  if (hasStruXure) {
    result.struXure = calculateStruXureReadiness(job);
  }

  if (hasScreens) {
    result.screens = calculateScreensReadiness(job, result.struXure);
  }

  if (hasPergotenda) {
    result.pergotenda = calculatePergotendaReadiness(job);
  }

  if (hasAwning) {
    result.awning = calculateAwningReadiness(job);
  }

  return result;
}

/**
 * Calculate StruXure readiness
 */
function calculateStruXureReadiness(job: ParsedJob): ReadinessResult {
  // If manual override exists, use it
  if (job.struXureEstimatedReadyMonth) {
    return {
      product: 'StruXure',
      readyMonth: job.struXureEstimatedReadyMonth,
      confidence: 'HARD',
      status: 'Manual Override',
      sourceLabel: 'Manual Override',
    };
  }

  // If material already received
  if (job.struXureMaterialStatus === 'Delivered to Site' || job.struXureMaterialStatus === 'Material Received') {
    const readyDate = job.struXureActualMaterialReceivedDate || job.struXureEstimatedMaterialReceiveDate;
    return {
      product: 'StruXure',
      readyMonth: readyDate ? formatYearMonth(readyDate) : null,
      confidence: 'HARD',
      status: job.struXureMaterialStatus,
      sourceLabel: `${job.struXureMaterialStatus}`,
    };
  }

  // Check permit status
  if (job.permitStatus === 'Permit Prep' || job.permitStatus === 'Permit Hold') {
    return {
      product: 'StruXure',
      readyMonth: null,
      confidence: 'BLOCKED',
      status: 'Blocked - Permit Not Ready',
      sourceLabel: `Blocked: ${job.permitStatus}`,
    };
  }

  // If material waiver, use pre-con date
  if (job.struXureMaterialWaiver) {
    if (job.preConDate) {
      const readyDate = addWeeks(job.preConDate, 7);
      return {
        product: 'StruXure',
        readyMonth: formatYearMonth(readyDate),
        confidence: 'HARD',
        status: 'Ready to Order (Waiver)',
        sourceLabel: `Pre-Con +7w: ${formatYearMonth(readyDate)}`,
      };
    } else {
      return {
        product: 'StruXure',
        readyMonth: null,
        confidence: 'BLOCKED',
        status: 'Blocked - Waiver Requires Pre-Con',
        sourceLabel: 'Blocked: Material Waiver without Pre-Con Date',
      };
    }
  }

  // Calculate from permit approval
  if (job.permitStatus === 'Permit Received' || job.permitStatus === 'Permit Approved, Pend. C') {
    if (job.permitActualApprovalDate) {
      const readyDate = addWeeks(job.permitActualApprovalDate, 7);
      return {
        product: 'StruXure',
        readyMonth: formatYearMonth(readyDate),
        confidence: 'HARD',
        status: 'Permit Approved',
        sourceLabel: `Permit Approved +7w: ${formatYearMonth(readyDate)}`,
      };
    }
  }

  // Calculate from permit submission (add 10 business days + 7 weeks)
  if (job.permitStatus === 'Permit Submitted') {
    if (job.permitSubmissionDate) {
      const approvalDate = addBusinessDays(job.permitSubmissionDate, 10);
      const readyDate = addWeeks(approvalDate, 7);
      return {
        product: 'StruXure',
        readyMonth: formatYearMonth(readyDate),
        confidence: 'FORECAST',
        status: 'Permit Submitted',
        sourceLabel: `Permit Submitted +10d +7w: ${formatYearMonth(readyDate)}`,
      };
    }
  }

  // Calculate from order date
  if (job.struXureOrderDate && (job.struXureMaterialStatus === 'Ordered' || job.struXureMaterialStatus === 'Ready to Order')) {
    const readyDate = addWeeks(job.struXureOrderDate, 7);
    return {
      product: 'StruXure',
      readyMonth: formatYearMonth(readyDate),
      confidence: 'HARD',
      status: job.struXureMaterialStatus,
      sourceLabel: `Ordered +7w: ${formatYearMonth(readyDate)}`,
    };
  }

  // Not ready to order
  return {
    product: 'StruXure',
    readyMonth: null,
    confidence: 'BLOCKED',
    status: 'Not Ready to Order',
    sourceLabel: 'Blocked: Not ready to order',
  };
}

/**
 * Calculate Screens readiness
 */
function calculateScreensReadiness(job: ParsedJob, struXureReadiness: ReadinessResult | null): ReadinessResult {
  // If manual override exists, use it
  if (job.screensEstimatedReadyMonth) {
    return {
      product: 'Screens',
      readyMonth: job.screensEstimatedReadyMonth,
      confidence: 'HARD',
      status: 'Manual Override',
      sourceLabel: 'Manual Override',
    };
  }

  // If material already received
  if (job.screensMaterialStatus === 'Delivered to Site' || job.screensMaterialStatus === 'Material Received') {
    const readyDate = job.screensActualMaterialReceivedDate || job.screensEstimatedMaterialReceiveDate;
    return {
      product: 'Screens',
      readyMonth: readyDate ? formatYearMonth(readyDate) : null,
      confidence: 'HARD',
      status: job.screensMaterialStatus,
      sourceLabel: `${job.screensMaterialStatus}`,
    };
  }

  // For combination jobs, screens depend on structure
  if (job.isCombinationJob && struXureReadiness) {
    if (struXureReadiness.confidence === 'BLOCKED') {
      return {
        product: 'Screens',
        readyMonth: null,
        confidence: 'BLOCKED',
        status: 'Blocked - Waiting for Structure',
        sourceLabel: 'Blocked: Structure not ready',
      };
    }

    if (struXureReadiness.readyMonth) {
      const struXureDate = parseYearMonth(struXureReadiness.readyMonth);
      const leadWeeks = job.screensManufacturer === 'DOS Screens' ? 3 : 7;
      const readyDate = addWeeks(struXureDate, leadWeeks);
      return {
        product: 'Screens',
        readyMonth: formatYearMonth(readyDate),
        confidence: 'HARD',
        status: 'Dependent on Structure',
        sourceLabel: `Structure +${leadWeeks}w: ${formatYearMonth(readyDate)}`,
      };
    }
  }

  // Standalone screens - calculate from contract date
  if (job.contractDate) {
    const leadWeeks = job.screensManufacturer === 'DOS Screens' ? 3 : 7;
    const readyDate = addWeeks(job.contractDate, leadWeeks);
    return {
      product: 'Screens',
      readyMonth: formatYearMonth(readyDate),
      confidence: 'HARD',
      status: 'Contract Signed',
      sourceLabel: `Contract +${leadWeeks}w: ${formatYearMonth(readyDate)}`,
    };
  }

  return {
    product: 'Screens',
    readyMonth: null,
    confidence: 'BLOCKED',
    status: 'Not Ready',
    sourceLabel: 'Blocked: No contract date',
  };
}

/**
 * Calculate Pergotenda readiness
 */
function calculatePergotendaReadiness(job: ParsedJob): ReadinessResult {
  // If manual override exists, use it
  if (job.pergotendaEstimatedReadyMonth) {
    return {
      product: 'Pergotenda',
      readyMonth: job.pergotendaEstimatedReadyMonth,
      confidence: 'HARD',
      status: 'Manual Override',
      sourceLabel: 'Manual Override',
    };
  }

  // If material already received
  if (job.pergotendaMaterialStatus === 'Delivered to Site' || job.pergotendaMaterialStatus === 'Material Received') {
    const readyDate = job.pergotendaActualMaterialReceivedDate || job.pergotendaEstimatedMaterialReceiveDate;
    return {
      product: 'Pergotenda',
      readyMonth: readyDate ? formatYearMonth(readyDate) : null,
      confidence: 'HARD',
      status: job.pergotendaMaterialStatus,
      sourceLabel: `${job.pergotendaMaterialStatus}`,
    };
  }

  // Calculate from order date
  if (job.pergotendaOrderDate && job.pergotendaMaterialStatus === 'Ordered') {
    const readyDate = addWeeks(job.pergotendaOrderDate, 7);
    return {
      product: 'Pergotenda',
      readyMonth: formatYearMonth(readyDate),
      confidence: 'HARD',
      status: 'Ordered',
      sourceLabel: `Ordered +7w: ${formatYearMonth(readyDate)}`,
    };
  }

  return {
    product: 'Pergotenda',
    readyMonth: null,
    confidence: 'BLOCKED',
    status: 'Not Ready',
    sourceLabel: 'Blocked: Not ordered',
  };
}

/**
 * Calculate Awning readiness
 */
function calculateAwningReadiness(job: ParsedJob): ReadinessResult {
  // If manual override exists, use it
  if (job.awningEstimatedReadyMonth) {
    return {
      product: 'Awning',
      readyMonth: job.awningEstimatedReadyMonth,
      confidence: 'HARD',
      status: 'Manual Override',
      sourceLabel: 'Manual Override',
    };
  }

  // If material already received
  if (job.awningMaterialStatus === 'Delivered to Site' || job.awningMaterialStatus === 'Material Received') {
    const readyDate = job.awningActualMaterialReceivedDate;
    return {
      product: 'Awning',
      readyMonth: readyDate ? formatYearMonth(readyDate) : null,
      confidence: 'HARD',
      status: job.awningMaterialStatus,
      sourceLabel: `${job.awningMaterialStatus}`,
    };
  }

  // Calculate from contract date (3 week lead time)
  if (job.contractDate) {
    const readyDate = addWeeks(job.contractDate, 3);
    return {
      product: 'Awning',
      readyMonth: formatYearMonth(readyDate),
      confidence: 'HARD',
      status: 'Contract Signed',
      sourceLabel: `Contract +3w: ${formatYearMonth(readyDate)}`,
    };
  }

  return {
    product: 'Awning',
    readyMonth: null,
    confidence: 'BLOCKED',
    status: 'Not Ready',
    sourceLabel: 'Blocked: No contract date',
  };
}

// ============================================================================
// Date Utilities
// ============================================================================

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function addBusinessDays(date: Date, days: number): Date {
  let count = 0;
  let current = new Date(date);

  while (count < days) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday or Saturday
      count++;
    }
  }

  return current;
}

function formatYearMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseYearMonth(yearMonth: string): Date {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month - 1, 1);
}
