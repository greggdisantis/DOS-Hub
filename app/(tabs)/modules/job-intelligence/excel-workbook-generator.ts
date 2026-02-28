/**
 * Job Intelligence Module - Excel Workbook Generator
 * Creates professional multi-tab Excel reports with DOS Hub branding
 */

import ExcelJS from 'exceljs';
import type { JobReadiness } from './readiness-calculator';

export interface ExcelExportOptions {
  logoUrl?: string;
  companyName?: string;
  generatedDate?: Date;
}

const DEFAULT_OPTIONS: ExcelExportOptions = {
  companyName: 'DOS Hub',
  generatedDate: new Date(),
};

/**
 * Generate professional multi-tab Excel workbook
 */
export async function generateExcelWorkbook(
  jobs: JobReadiness[],
  options: ExcelExportOptions = {}
): Promise<ExcelJS.Workbook> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const workbook = new ExcelJS.Workbook();

  // Remove default sheet
  if (workbook.worksheets.length > 0) {
    workbook.removeWorksheet(workbook.worksheets[0].id);
  }

  // Create all report sheets
  createFinalReportSheet(workbook, jobs, opts);
  createBlockedReportSheet(workbook, jobs, opts);
  createPermitDateListSheet(workbook, jobs, opts);
  createPermitStatusSheet(workbook, jobs, opts);
  createMaterialStatusSheet(workbook, jobs, opts);
  createSupervisorWorkloadSheet(workbook, jobs, opts);
  createStruXureSheet(workbook, jobs, opts);
  createScreensSheet(workbook, jobs, opts);
  createPergotendaSheet(workbook, jobs, opts);
  createAwningsSheet(workbook, jobs, opts);

  return workbook;
}

/**
 * Apply professional header styling to worksheet
 */
function applyHeaderStyle(worksheet: ExcelJS.Worksheet, title: string, opts: ExcelExportOptions) {
  // Add title row
  const titleRow = worksheet.insertRow(1, []);
  titleRow.height = 30;
  const titleCell = titleRow.getCell(1);
  titleCell.value = title;
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF0A7EA4' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells('A1:J1');

  // Add generated date
  const dateRow = worksheet.insertRow(2, []);
  dateRow.height = 16;
  const dateCell = dateRow.getCell(1);
  dateCell.value = `Generated: ${opts.generatedDate?.toLocaleDateString()}`;
  dateCell.font = { size: 10, color: { argb: 'FF666666' } };
  dateCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.mergeCells('A2:J2');

  // Add blank row for spacing
  worksheet.insertRow(3, []);

  return 4; // Return starting row for data
}

/**
 * Apply professional table header styling
 */
function applyTableHeaderStyle(headerRow: ExcelJS.Row) {
  headerRow.height = 20;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A7EA4' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  for (let i = 1; i <= headerRow.cellCount; i++) {
    const cell = headerRow.getCell(i);
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  }
}

/**
 * Apply professional data row styling
 */
function applyDataRowStyle(row: ExcelJS.Row, isAlternate: boolean = false) {
  row.height = 18;
  row.font = { size: 10, color: { argb: 'FF000000' } };
  if (isAlternate) {
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } } as any;
  }
  row.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

  for (let i = 1; i <= row.cellCount; i++) {
    const cell = row.getCell(i);
    (cell.border as any) = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    };
  }
}

/**
 * Create Final Report sheet with all jobs
 */
function createFinalReportSheet(workbook: ExcelJS.Workbook, jobs: JobReadiness[], opts: ExcelExportOptions) {
  const sheet = workbook.addWorksheet('Final Report');
  let rowNum = applyHeaderStyle(sheet, 'Final Report - All Jobs', opts);

  // Table headers
  const headers = ['Customer', 'Supervisor', 'Final Ready Month', 'Confidence', 'StruXure', 'Screens', 'Pergotenda', 'Awning'];
  const headerRow = sheet.insertRow(rowNum, headers);
  applyTableHeaderStyle(headerRow);
  rowNum++;

  // Data rows
  jobs.forEach((job, index) => {
    const readyMonth = getEarliestReadyMonth(job);
    const confidence = getOverallConfidence(job);

    const row = sheet.insertRow(rowNum, [
      job.customer,
      job.projectSupervisor || '',
      readyMonth,
      confidence,
      job.struXure ? `${job.struXure.readyMonth} (${getConfidenceLabel(job.struXure.confidence)})` : '',
      job.screens ? `${job.screens.readyMonth} (${getConfidenceLabel(job.screens.confidence)})` : '',
      job.pergotenda ? `${job.pergotenda.readyMonth} (${getConfidenceLabel(job.pergotenda.confidence)})` : '',
      job.awning ? `${job.awning.readyMonth} (${getConfidenceLabel(job.awning.confidence)})` : '',
    ]);

    applyDataRowStyle(row, index % 2 === 1);
    rowNum++;
  });

  // Set column widths
  sheet.columns = [
    { width: 25 },
    { width: 18 },
    { width: 16 },
    { width: 12 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];
}

/**
 * Create Blocked Report sheet
 */
function createBlockedReportSheet(workbook: ExcelJS.Workbook, jobs: JobReadiness[], opts: ExcelExportOptions) {
  const sheet = workbook.addWorksheet('Blocked Report');
  let rowNum = applyHeaderStyle(sheet, 'Blocked Report - Jobs with Blocked Products', opts);

  const blockedJobs = jobs.filter((job) => {
    return (
      (job.struXure?.confidence === 'BLOCKED') ||
      (job.screens?.confidence === 'BLOCKED') ||
      (job.pergotenda?.confidence === 'BLOCKED') ||
      (job.awning?.confidence === 'BLOCKED')
    );
  });

  const headers = ['Customer', 'Supervisor', 'Blocked Product', 'Status', 'Reason'];
  const headerRow = sheet.insertRow(rowNum, headers);
  applyTableHeaderStyle(headerRow);
  rowNum++;

  blockedJobs.forEach((job, index) => {
    const blockedProducts = [];
    if (job.struXure?.confidence === 'BLOCKED') blockedProducts.push({ product: 'StruXure', status: job.struXure.status });
    if (job.screens?.confidence === 'BLOCKED') blockedProducts.push({ product: 'Screens', status: job.screens.status });
    if (job.pergotenda?.confidence === 'BLOCKED') blockedProducts.push({ product: 'Pergotenda', status: job.pergotenda.status });
    if (job.awning?.confidence === 'BLOCKED') blockedProducts.push({ product: 'Awning', status: job.awning.status });

    blockedProducts.forEach((bp) => {
      const row = sheet.insertRow(rowNum, [
        job.customer,
        job.projectSupervisor || '',
        bp.product,
        bp.status,
        '',
      ]);
      applyDataRowStyle(row, index % 2 === 1);
      rowNum++;
    });
  });

  sheet.columns = [{ width: 25 }, { width: 18 }, { width: 15 }, { width: 25 }, { width: 30 }];
}

/**
 * Create Permit Date List sheet
 */
function createPermitDateListSheet(workbook: ExcelJS.Workbook, jobs: JobReadiness[], opts: ExcelExportOptions) {
  const sheet = workbook.addWorksheet('Permit Date List');
  let rowNum = applyHeaderStyle(sheet, 'Permit Date List', opts);

  const headers = ['Customer', 'Permit Status', 'Est. Approval Date', 'Source'];
  const headerRow = sheet.insertRow(rowNum, headers);
  applyTableHeaderStyle(headerRow);
  rowNum++;

  jobs.forEach((job, index) => {
    const row = sheet.insertRow(rowNum, [
      job.customer,
      '',
      '',
      '',
    ]);
    applyDataRowStyle(row, index % 2 === 1);
    rowNum++;
  });

  sheet.columns = [{ width: 25 }, { width: 18 }, { width: 18 }, { width: 25 }];
}

/**
 * Create Permit Status sheet
 */
function createPermitStatusSheet(workbook: ExcelJS.Workbook, jobs: JobReadiness[], opts: ExcelExportOptions) {
  const sheet = workbook.addWorksheet('Permit Status');
  let rowNum = applyHeaderStyle(sheet, 'Permit Status Report', opts);

  const headers = ['Customer', 'Status', 'Ready Month'];
  const headerRow = sheet.insertRow(rowNum, headers);
  applyTableHeaderStyle(headerRow);
  rowNum++;

  jobs.forEach((job, index) => {
    const row = sheet.insertRow(rowNum, [job.customer, '', '']);
    applyDataRowStyle(row, index % 2 === 1);
    rowNum++;
  });

  sheet.columns = [{ width: 25 }, { width: 20 }, { width: 16 }];
}

/**
 * Create Material Status sheet
 */
function createMaterialStatusSheet(workbook: ExcelJS.Workbook, jobs: JobReadiness[], opts: ExcelExportOptions) {
  const sheet = workbook.addWorksheet('Material Status');
  let rowNum = applyHeaderStyle(sheet, 'Material Status Report', opts);

  const headers = ['Customer', 'Product', 'Material Status', 'Ready Month'];
  const headerRow = sheet.insertRow(rowNum, headers);
  applyTableHeaderStyle(headerRow);
  rowNum++;

  jobs.forEach((job, index) => {
    const products = [
      { name: 'StruXure', result: job.struXure },
      { name: 'Screens', result: job.screens },
      { name: 'Pergotenda', result: job.pergotenda },
      { name: 'Awning', result: job.awning },
    ].filter((p) => p.result);

    products.forEach((p) => {
      const row = sheet.insertRow(rowNum, [
        job.customer,
        p.name,
        p.result?.status || '',
        p.result?.readyMonth || '',
      ]);
      applyDataRowStyle(row, index % 2 === 1);
      rowNum++;
    });
  });

  sheet.columns = [{ width: 25 }, { width: 15 }, { width: 20 }, { width: 16 }];
}

/**
 * Create Supervisor Workload sheet
 */
function createSupervisorWorkloadSheet(workbook: ExcelJS.Workbook, jobs: JobReadiness[], opts: ExcelExportOptions) {
  const sheet = workbook.addWorksheet('Supervisor Workload');
  let rowNum = applyHeaderStyle(sheet, 'Supervisor Workload', opts);

  const headers = ['Supervisor', 'Customer', 'Ready Month', 'Confidence'];
  const headerRow = sheet.insertRow(rowNum, headers);
  applyTableHeaderStyle(headerRow);
  rowNum++;

  const supervisors = new Map<string, JobReadiness[]>();
  jobs.forEach((job) => {
    const supervisor = job.projectSupervisor || 'Unassigned';
    if (!supervisors.has(supervisor)) {
      supervisors.set(supervisor, []);
    }
    supervisors.get(supervisor)!.push(job);
  });

  let index = 0;
  supervisors.forEach((jobList, supervisor) => {
    jobList.forEach((job) => {
      const readyMonth = getEarliestReadyMonth(job);
      const confidence = getOverallConfidence(job);
      const row = sheet.insertRow(rowNum, [supervisor, job.customer, readyMonth, confidence]);
      applyDataRowStyle(row, index % 2 === 1);
      rowNum++;
      index++;
    });
  });

  sheet.columns = [{ width: 20 }, { width: 25 }, { width: 16 }, { width: 12 }];
}

/**
 * Create StruXure sheet
 */
function createStruXureSheet(workbook: ExcelJS.Workbook, jobs: JobReadiness[], opts: ExcelExportOptions) {
  const sheet = workbook.addWorksheet('StruXure');
  let rowNum = applyHeaderStyle(sheet, 'StruXure Material Readiness', opts);

  const struXureJobs = jobs.filter((j) => j.struXure);
  const headers = ['Customer', 'Supervisor', 'Ready Month', 'Confidence', 'Status'];
  const headerRow = sheet.insertRow(rowNum, headers);
  applyTableHeaderStyle(headerRow);
  rowNum++;

  struXureJobs.forEach((job, index) => {
    const row = sheet.insertRow(rowNum, [
      job.customer,
      job.projectSupervisor || '',
      job.struXure?.readyMonth || '',
      getConfidenceLabel(job.struXure?.confidence || ''),
      job.struXure?.status || '',
    ]);
    applyDataRowStyle(row, index % 2 === 1);
    rowNum++;
  });

  sheet.columns = [{ width: 25 }, { width: 18 }, { width: 16 }, { width: 12 }, { width: 25 }];
}

/**
 * Create Screens sheet
 */
function createScreensSheet(workbook: ExcelJS.Workbook, jobs: JobReadiness[], opts: ExcelExportOptions) {
  const sheet = workbook.addWorksheet('Screens');
  let rowNum = applyHeaderStyle(sheet, 'Screens Material Readiness', opts);

  const screensJobs = jobs.filter((j) => j.screens);
  const headers = ['Customer', 'Supervisor', 'Ready Month', 'Confidence', 'Status'];
  const headerRow = sheet.insertRow(rowNum, headers);
  applyTableHeaderStyle(headerRow);
  rowNum++;

  screensJobs.forEach((job, index) => {
    const row = sheet.insertRow(rowNum, [
      job.customer,
      job.projectSupervisor || '',
      job.screens?.readyMonth || '',
      getConfidenceLabel(job.screens?.confidence || ''),
      job.screens?.status || '',
    ]);
    applyDataRowStyle(row, index % 2 === 1);
    rowNum++;
  });

  sheet.columns = [{ width: 25 }, { width: 18 }, { width: 16 }, { width: 12 }, { width: 25 }];
}

/**
 * Create Pergotenda sheet
 */
function createPergotendaSheet(workbook: ExcelJS.Workbook, jobs: JobReadiness[], opts: ExcelExportOptions) {
  const sheet = workbook.addWorksheet('Pergotenda');
  let rowNum = applyHeaderStyle(sheet, 'Pergotenda Material Readiness', opts);

  const pergotendaJobs = jobs.filter((j) => j.pergotenda);
  const headers = ['Customer', 'Supervisor', 'Ready Month', 'Confidence', 'Status'];
  const headerRow = sheet.insertRow(rowNum, headers);
  applyTableHeaderStyle(headerRow);
  rowNum++;

  pergotendaJobs.forEach((job, index) => {
    const row = sheet.insertRow(rowNum, [
      job.customer,
      job.projectSupervisor || '',
      job.pergotenda?.readyMonth || '',
      getConfidenceLabel(job.pergotenda?.confidence || ''),
      job.pergotenda?.status || '',
    ]);
    applyDataRowStyle(row, index % 2 === 1);
    rowNum++;
  });

  sheet.columns = [{ width: 25 }, { width: 18 }, { width: 16 }, { width: 12 }, { width: 25 }];
}

/**
 * Create Awnings sheet
 */
function createAwningsSheet(workbook: ExcelJS.Workbook, jobs: JobReadiness[], opts: ExcelExportOptions) {
  const sheet = workbook.addWorksheet('Awnings');
  let rowNum = applyHeaderStyle(sheet, 'Awnings Material Readiness', opts);

  const awningJobs = jobs.filter((j) => j.awning);
  const headers = ['Customer', 'Supervisor', 'Ready Month', 'Confidence', 'Status'];
  const headerRow = sheet.insertRow(rowNum, headers);
  applyTableHeaderStyle(headerRow);
  rowNum++;

  awningJobs.forEach((job, index) => {
    const row = sheet.insertRow(rowNum, [
      job.customer,
      job.projectSupervisor || '',
      job.awning?.readyMonth || '',
      getConfidenceLabel(job.awning?.confidence || ''),
      job.awning?.status || '',
    ]);
    applyDataRowStyle(row, index % 2 === 1);
    rowNum++;
  });

  sheet.columns = [{ width: 25 }, { width: 18 }, { width: 16 }, { width: 12 }, { width: 25 }];
}

// ============================================================================
// Helper Functions
// ============================================================================

function getConfidenceLabel(confidence: string): string {
  switch (confidence) {
    case 'HARD':
      return 'Confirmed';
    case 'FORECAST':
      return 'Estimated';
    case 'BLOCKED':
      return 'Blocked';
    default:
      return 'Unknown';
  }
}

function getEarliestReadyMonth(job: JobReadiness): string {
  const months = [
    job.struXure?.readyMonth,
    job.screens?.readyMonth,
    job.pergotenda?.readyMonth,
    job.awning?.readyMonth,
  ].filter(Boolean) as string[];

  if (months.length === 0) return 'N/A';
  return months.sort().reverse()[0]; // Latest month (most conservative estimate)
}

function getOverallConfidence(job: JobReadiness): string {
  const confidences = [
    job.struXure?.confidence,
    job.screens?.confidence,
    job.pergotenda?.confidence,
    job.awning?.confidence,
  ].filter(Boolean);

  if (confidences.includes('BLOCKED')) return 'Blocked';
  if (confidences.includes('FORECAST')) return 'Estimated';
  return 'Confirmed';
}
