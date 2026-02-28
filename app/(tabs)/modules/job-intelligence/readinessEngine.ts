/**
 * Job Intelligence Module - Readiness Calculation Engine
 * Calculates when materials will be ready for each product category
 */

import type { CanonicalJob, ProcessedJob, ReadinessResult, EnabledCategories } from './types';
import { ProductCategory, Confidence, ScreenManufacturer } from './types';
import { addBusinessDays, addWeeks, formatYearMonth, formatReadableDate, getCurrentMonth } from './dateUtils';
import { LEAD_TIMES_WEEKS, PERMIT_APPROVAL_BUSINESS_DAYS } from './constants';

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').toLowerCase().trim();
  return s === 'true' || s === 'yes' || s === 'y' || s === '1';
}

function isPermitApprovedLike(statusLower: string): boolean {
  return statusLower.includes('approved') || statusLower.includes('received');
}

function getEnabledCategories(job: CanonicalJob): EnabledCategories {
  const jc = String(job.JobCategory ?? '').toLowerCase().trim();
  const combo = toBoolean(job.IsThisACombinationJob);

  const isScreenOnly = jc.includes('02: master - screen only');
  const isStruxure = jc.includes('01: master - struxure project');
  const isPergotenda = jc.includes('03: master - pergotenda project');
  const isAwning = jc.includes('04: master - awning');

  if (isScreenOnly) return { StruXure: false, Pergotenda: false, Awnings: false, Screens: true };
  if (isStruxure) return { StruXure: true, Pergotenda: false, Awnings: false, Screens: combo };
  if (isPergotenda) return { StruXure: false, Pergotenda: true, Awnings: false, Screens: combo };
  if (isAwning) return { StruXure: false, Pergotenda: false, Awnings: true, Screens: false };

  return { StruXure: false, Pergotenda: false, Awnings: false, Screens: combo };
}

function createResult(
  readyMonth: string,
  confidence: Confidence,
  sourceLabel: string,
  detailTrace: string[],
  exceptions: string[] = []
): ReadinessResult {
  return { readyMonth, confidence, sourceLabel, detailTrace: detailTrace.join(' -> '), exceptions };
}

function createBlockedResult(reason: string, trace: string[], exceptions: string[]): ReadinessResult {
  trace.push(`BLOCKED: ${reason}`);
  return {
    readyMonth: null,
    confidence: Confidence.BLOCKED,
    sourceLabel: 'Blocked',
    detailTrace: trace.join(' -> '),
    exceptions,
  };
}

export function runReadinessEngine(job: CanonicalJob): ProcessedJob {
  const enabled = getEnabledCategories(job);

  const processed: ProcessedJob = {
    canonical: job,
    readiness: {},
  };

  const struxure = enabled.StruXure ? calculateStruxureReadiness(job) : undefined;
  const pergotenda = enabled.Pergotenda ? calculatePergotendaReadiness(job) : undefined;

  const structureForScreens = enabled.StruXure ? struxure : enabled.Pergotenda ? pergotenda : undefined;

  processed.readiness.StruXure = struxure;
  processed.readiness.Pergotenda = pergotenda;
  processed.readiness.Awnings = enabled.Awnings ? calculateAwningsReadiness(job) : undefined;
  processed.readiness.Screens = enabled.Screens ? calculateScreensReadiness(job, structureForScreens) : undefined;

  return processed;
}

function calculateStruxureReadiness(job: CanonicalJob): ReadinessResult {
  const trace: string[] = [];
  const exceptions: string[] = [];
  const matStatus = String(job.StruXureMaterialStatus ?? '').toLowerCase();
  const permitStatus = String(job.PermitStatus ?? '').toLowerCase();

  const manual = job.InstallEstimatedReadyMonth;
  if (manual) {
    return createResult(String(manual), Confidence.HARD, 'Manual Override', ['Using Install Estimated Ready Month field.']);
  }

  if (matStatus.includes('received') || matStatus.includes('delivered')) {
    const receivedDate = job.StruXureActualMaterialReceivedDate;
    trace.push(`Material status is '${matStatus}'.`);
    if (receivedDate) {
      trace.push(`Using actual received date: ${formatReadableDate(receivedDate)}`);
      return createResult(formatYearMonth(receivedDate), Confidence.HARD, 'Material Received', trace);
    }
    trace.push('Actual received date missing, using current month.');
    return createResult(getCurrentMonth(), Confidence.HARD, 'Material Received (No Date)', trace);
  }

  const orderDate = job.StruXureOrderDate;
  if (orderDate) {
    trace.push(`Material ordered on ${formatReadableDate(orderDate)}.`);
    const readyDate = addWeeks(orderDate, 7);
    trace.push('Adding 6-8 weeks lead time (using 7w midpoint).');
    return createResult(formatYearMonth(readyDate), Confidence.HARD, 'Ordered +7w', trace);
  }

  if (matStatus.includes('ready to order')) {
    trace.push('Status is "Ready to Order".');

    const isWaiver = job.StruXureMaterialWaiver === true;
    const permitByOthers = String(job.PermitResponsibility ?? '').toLowerCase().includes('by others');
    const permitNotRequired = permitStatus.includes('not required');

    if (isWaiver) {
      trace.push('Material waiver is active.');
      const preConDate = job.PreConCompletedDate;
      if (!preConDate) {
        exceptions.push('WAIVER_REQUIRES_PRECON');
        return createBlockedResult('Ready to Order (Waiver) but Pre-Con date is missing.', trace, exceptions);
      }
      trace.push(`Using Pre-Con date: ${formatReadableDate(preConDate)}`);
      const readyDate = addWeeks(preConDate, 7);
      trace.push('Ready to Order (Waiver): Pre-Con + 6-8w midpoint');
      return createResult(formatYearMonth(readyDate), Confidence.HARD, 'RTO (Waiver) +7w', trace, exceptions);
    }

    trace.push('No material waiver.');

    if (permitStatus.includes('submitted')) {
      const subDate = job.PermitSubmissionDate;
      if (!subDate) {
        exceptions.push('MISSING_PERMIT_SUBMISSION_DATE');
        return createBlockedResult('Permit Submitted but submission date is missing.', trace, exceptions);
      }
      trace.push(`Permit submitted on ${formatReadableDate(subDate)}.`);
      const estApproval = addBusinessDays(subDate, PERMIT_APPROVAL_BUSINESS_DAYS);
      trace.push(`Estimated approval: ${formatReadableDate(estApproval)} (+${PERMIT_APPROVAL_BUSINESS_DAYS} business days).`);
      const readyDate = addWeeks(estApproval, 7);
      trace.push('Adding 6-8 weeks lead time (using 7w midpoint).');
      return createResult(formatYearMonth(readyDate), Confidence.HARD, 'RTO (Permit Sub) +10d +7w', trace, exceptions);
    }

    if (isPermitApprovedLike(permitStatus)) {
      const appDate = job.PermitActualApprovalDate;
      if (!appDate) {
        exceptions.push('MISSING_PERMIT_APPROVAL_DATE');
        return createBlockedResult('Permit Approved/Received but approval date is missing.', trace, exceptions);
      }
      trace.push(`Permit approved/received on ${formatReadableDate(appDate)}.`);
      const readyDate = addWeeks(appDate, 7);
      trace.push('Adding 6-8 weeks lead time (using 7w midpoint).');
      exceptions.push('PERMIT_APPROVED_NOT_ORDERED');
      return createResult(formatYearMonth(readyDate), Confidence.HARD, 'RTO (Permit App/Rec) +7w', trace, exceptions);
    }

    if (permitByOthers || permitNotRequired) {
      const preConDate = job.PreConCompletedDate;
      if (!preConDate) {
        exceptions.push('WAIVER_REQUIRES_PRECON');
        return createBlockedResult('Permit Not Required/By Others but Pre-Con date is missing.', trace, exceptions);
      }
      trace.push(`Permit Not Required/By Others, using Pre-Con date: ${formatReadableDate(preConDate)}.`);
      const readyDate = addWeeks(preConDate, 7);
      trace.push('Adding 6-8 weeks lead time (using 7w midpoint).');
      return createResult(formatYearMonth(readyDate), Confidence.HARD, 'RTO (No Permit) +7w', trace, exceptions);
    }

    if (permitStatus.includes('prep') || permitStatus.includes('hold') || permitStatus.includes('variance')) {
      exceptions.push('STRUCTURE_NOT_READY_TO_ORDER');
      return createBlockedResult(`Permit status '${permitStatus}' is blocking order.`, trace, exceptions);
    }
  }

  trace.push(`Permit status: '${permitStatus}'.`);

  if (permitStatus.includes('submitted')) {
    const subDate = job.PermitSubmissionDate;
    if (!subDate) {
      exceptions.push('MISSING_PERMIT_SUBMISSION_DATE');
      return createBlockedResult('Permit Submitted but submission date is missing.', trace, exceptions);
    }
    trace.push(`Permit submitted on ${formatReadableDate(subDate)}.`);
    const estApproval = addBusinessDays(subDate, PERMIT_APPROVAL_BUSINESS_DAYS);
    trace.push(`Estimated approval: ${formatReadableDate(estApproval)} (+${PERMIT_APPROVAL_BUSINESS_DAYS} business days).`);
    const readyDate = addWeeks(estApproval, 7);
    trace.push('Adding 7 weeks lead time.');
    return createResult(formatYearMonth(readyDate), Confidence.HARD, 'Permit Submitted +10d +7w', trace, exceptions);
  }

  if (isPermitApprovedLike(permitStatus)) {
    const appDate = job.PermitActualApprovalDate;
    if (!appDate) {
      exceptions.push('MISSING_PERMIT_APPROVAL_DATE');
      return createBlockedResult('Permit Approved/Received but approval date is missing.', trace, exceptions);
    }
    trace.push(`Permit approved/received on ${formatReadableDate(appDate)}.`);
    const readyDate = addWeeks(appDate, 7);
    trace.push('Adding 7 weeks lead time.');
    return createResult(formatYearMonth(readyDate), Confidence.HARD, 'Permit Approved/Received +7w', trace, exceptions);
  }

  if (
    job.StruXureMaterialWaiver === true ||
    String(job.PermitResponsibility ?? '').toLowerCase().includes('by others') ||
    permitStatus.includes('not required')
  ) {
    const preConDate = job.PreConCompletedDate;
    if (!preConDate) {
      exceptions.push('WAIVER_REQUIRES_PRECON');
      return createBlockedResult('Permit/Material waived but Pre-Con date is missing.', trace, exceptions);
    }
    trace.push(`Permit/Material waived, using Pre-Con date: ${formatReadableDate(preConDate)}.`);
    const readyDate = addWeeks(preConDate, 7);
    trace.push('Adding 7 weeks lead time.');
    return createResult(formatYearMonth(readyDate), Confidence.HARD, 'Permit/Waiver +7w', trace, exceptions);
  }

  exceptions.push('STRUCTURE_NOT_READY_TO_ORDER');
  return createBlockedResult(`Permit status '${permitStatus}' is blocking progress.`, trace, exceptions);
}

function calculatePergotendaReadiness(job: CanonicalJob): ReadinessResult {
  const trace: string[] = [];
  const exceptions: string[] = [];
  const matStatus = String(job.PergotendaMaterialStatus ?? '').toLowerCase();
  const permitStatus = String(job.PermitStatus ?? '').toLowerCase();

  const manual = job.InstallEstimatedReadyMonth;
  if (manual) {
    return createResult(String(manual), Confidence.HARD, 'Manual Override', ['Using Install Estimated Ready Month field.']);
  }

  if (matStatus.includes('received') || matStatus.includes('delivered')) {
    trace.push(`Material status is '${matStatus}'.`);
    trace.push('Actual received date not available for this product, using current month.');
    return createResult(getCurrentMonth(), Confidence.HARD, 'Material Received (No Date)', trace);
  }

  const orderDate = job.StruXureOrderDate;
  if (orderDate) {
    trace.push(`Material ordered on ${formatReadableDate(orderDate)}.`);
    const readyDate = addWeeks(orderDate, 7);
    trace.push('Adding 6-8 weeks lead time (using 7w midpoint).');
    return createResult(formatYearMonth(readyDate), Confidence.HARD, 'Ordered +7w', trace);
  }

  if (matStatus.includes('ready to order')) {
    trace.push('Status is "Ready to Order".');

    const isWaiver = job.PergotendaMaterialWaiver === true;
    const permitByOthers = String(job.PermitResponsibility ?? '').toLowerCase().includes('by others');
    const permitNotRequired = permitStatus.includes('not required');

    if (isWaiver) {
      trace.push('Material waiver is active.');
      const preConDate = job.PreConCompletedDate;
      if (!preConDate) {
        exceptions.push('WAIVER_REQUIRES_PRECON');
        return createBlockedResult('Ready to Order (Waiver) but Pre-Con date is missing.', trace, exceptions);
      }
      trace.push(`Using Pre-Con date: ${formatReadableDate(preConDate)}`);
      const readyDate = addWeeks(preConDate, 7);
      trace.push('Ready to Order (Waiver): Pre-Con + 6-8w midpoint');
      return createResult(formatYearMonth(readyDate), Confidence.HARD, 'RTO (Waiver) +7w', trace, exceptions);
    }

    trace.push('No material waiver.');

    if (permitStatus.includes('submitted')) {
      const subDate = job.PermitSubmissionDate;
      if (!subDate) {
        exceptions.push('MISSING_PERMIT_SUBMISSION_DATE');
        return createBlockedResult('Permit Submitted but submission date is missing.', trace, exceptions);
      }
      trace.push(`Permit submitted on ${formatReadableDate(subDate)}.`);
      const estApproval = addBusinessDays(subDate, PERMIT_APPROVAL_BUSINESS_DAYS);
      trace.push(`Estimated approval: ${formatReadableDate(estApproval)} (+${PERMIT_APPROVAL_BUSINESS_DAYS} business days).`);
      const readyDate = addWeeks(estApproval, 7);
      trace.push('Adding 6-8 weeks lead time (using 7w midpoint).');
      return createResult(formatYearMonth(readyDate), Confidence.HARD, 'RTO (Permit Sub) +10d +7w', trace, exceptions);
    }

    if (isPermitApprovedLike(permitStatus)) {
      const appDate = job.PermitActualApprovalDate;
      if (!appDate) {
        exceptions.push('MISSING_PERMIT_APPROVAL_DATE');
        return createBlockedResult('Permit Approved/Received but approval date is missing.', trace, exceptions);
      }
      trace.push(`Permit approved/received on ${formatReadableDate(appDate)}.`);
      const readyDate = addWeeks(appDate, 7);
      trace.push('Adding 6-8 weeks lead time (using 7w midpoint).');
      exceptions.push('PERMIT_APPROVED_NOT_ORDERED');
      return createResult(formatYearMonth(readyDate), Confidence.HARD, 'RTO (Permit App/Rec) +7w', trace, exceptions);
    }

    if (permitByOthers || permitNotRequired) {
      const preConDate = job.PreConCompletedDate;
      if (!preConDate) {
        exceptions.push('WAIVER_REQUIRES_PRECON');
        return createBlockedResult('Permit Not Required/By Others but Pre-Con date is missing.', trace, exceptions);
      }
      trace.push(`Permit Not Required/By Others, using Pre-Con date: ${formatReadableDate(preConDate)}.`);
      const readyDate = addWeeks(preConDate, 7);
      trace.push('Adding 6-8 weeks lead time (using 7w midpoint).');
      return createResult(formatYearMonth(readyDate), Confidence.HARD, 'RTO (No Permit) +7w', trace, exceptions);
    }

    if (permitStatus.includes('prep') || permitStatus.includes('hold') || permitStatus.includes('variance')) {
      exceptions.push('STRUCTURE_NOT_READY_TO_ORDER');
      return createBlockedResult(`Permit status '${permitStatus}' is blocking order.`, trace, exceptions);
    }
  }

  trace.push(`Permit status: '${permitStatus}'.`);

  if (permitStatus.includes('submitted')) {
    const subDate = job.PermitSubmissionDate;
    if (!subDate) {
      exceptions.push('MISSING_PERMIT_SUBMISSION_DATE');
      return createBlockedResult('Permit Submitted but submission date is missing.', trace, exceptions);
    }
    trace.push(`Permit submitted on ${formatReadableDate(subDate)}.`);
    const estApproval = addBusinessDays(subDate, PERMIT_APPROVAL_BUSINESS_DAYS);
    trace.push(`Estimated approval: ${formatReadableDate(estApproval)} (+${PERMIT_APPROVAL_BUSINESS_DAYS} business days).`);
    const readyDate = addWeeks(estApproval, 7);
    trace.push('Adding 7 weeks lead time.');
    return createResult(formatYearMonth(readyDate), Confidence.HARD, 'Permit Submitted +10d +7w', trace, exceptions);
  }

  if (isPermitApprovedLike(permitStatus)) {
    const appDate = job.PermitActualApprovalDate;
    if (!appDate) {
      exceptions.push('MISSING_PERMIT_APPROVAL_DATE');
      return createBlockedResult('Permit Approved/Received but approval date is missing.', trace, exceptions);
    }
    trace.push(`Permit approved/received on ${formatReadableDate(appDate)}.`);
    const readyDate = addWeeks(appDate, 7);
    trace.push('Adding 7 weeks lead time.');
    return createResult(formatYearMonth(readyDate), Confidence.HARD, 'Permit Approved/Received +7w', trace, exceptions);
  }

  if (
    job.PergotendaMaterialWaiver === true ||
    String(job.PermitResponsibility ?? '').toLowerCase().includes('by others') ||
    permitStatus.includes('not required')
  ) {
    const preConDate = job.PreConCompletedDate;
    if (!preConDate) {
      exceptions.push('WAIVER_REQUIRES_PRECON');
      return createBlockedResult('Permit/Material waived but Pre-Con date is missing.', trace, exceptions);
    }
    trace.push(`Permit/Material waived, using Pre-Con date: ${formatReadableDate(preConDate)}.`);
    const readyDate = addWeeks(preConDate, 7);
    trace.push('Adding 7 weeks lead time.');
    return createResult(formatYearMonth(readyDate), Confidence.HARD, 'Permit/Waiver +7w', trace, exceptions);
  }

  exceptions.push('STRUCTURE_NOT_READY_TO_ORDER');
  return createBlockedResult(`Permit status '${permitStatus}' is blocking progress.`, trace, exceptions);
}

function calculateScreensReadiness(job: CanonicalJob, structureReadiness?: ReadinessResult): ReadinessResult {
  const trace: string[] = [];
  const exceptions: string[] = [];

  const manufacturer = String(job.ScreensManufacturer ?? 'Unknown');
  const leadTimeWeeks = manufacturer.match(/dos/i) ? 3 : 7;
  trace.push(`Screen manufacturer: ${manufacturer} (${leadTimeWeeks}w lead).`);

  const isCombo = toBoolean(job.IsThisACombinationJob);
  if (isCombo) {
    trace.push('Combination job detected, dependent on structure readiness.');
    if (structureReadiness?.readyMonth) {
      const structureDate = new Date(`${structureReadiness.readyMonth}-01T12:00:00Z`);
      const screenReadyDate = addWeeks(structureDate, leadTimeWeeks);
      trace.push(`Structure ready: ${structureReadiness.readyMonth}. Adding ${leadTimeWeeks} weeks.`);
      return createResult(
        formatYearMonth(screenReadyDate),
        structureReadiness.confidence,
        `Structure +${leadTimeWeeks}w`,
        trace
      );
    }
    exceptions.push('SCREENS_DEPEND_ON_STRUCTURE');
    return createBlockedResult('Structure readiness could not be determined.', trace, exceptions);
  }

  const contractDate = job.ContractSignedDate;
  if (!contractDate) {
    exceptions.push('MISSING_CONTRACT_SIGNED_DATE');
    return createBlockedResult('Contract Signed Date is missing for standalone screen job.', trace, exceptions);
  }

  trace.push(`Using Contract Signed Date: ${formatReadableDate(contractDate)}.`);
  const readyDate = addWeeks(contractDate, leadTimeWeeks);
  trace.push(`Adding ${leadTimeWeeks} weeks lead time.`);
  return createResult(formatYearMonth(readyDate), Confidence.HARD, `Contract +${leadTimeWeeks}w`, trace);
}

function calculateAwningsReadiness(job: CanonicalJob): ReadinessResult {
  const trace: string[] = [];
  const exceptions: string[] = [];

  const contractDate = job.ContractSignedDate;
  if (!contractDate) {
    exceptions.push('MISSING_CONTRACT_SIGNED_DATE');
    return createBlockedResult('Contract Signed Date is missing.', trace, exceptions);
  }

  trace.push(`Using Contract Signed Date: ${formatReadableDate(contractDate)}.`);
  const readyDate = addWeeks(contractDate, 3);
  trace.push('Adding 3 weeks lead time.');
  return createResult(formatYearMonth(readyDate), Confidence.HARD, 'Contract +3w', trace);
}
