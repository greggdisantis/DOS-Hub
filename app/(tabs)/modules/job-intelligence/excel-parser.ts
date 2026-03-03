/**
 * Job Intelligence Module - Excel Parser
 * Parses Service Fusion Sales Revenue Report exports
 */

import * as XLSX from 'xlsx';

export interface ParsedJob {
  // Basic Info
  jobStartDate: Date | null;
  status: string;
  jobCategory: string;
  customer: string;
  serviceLocation: string;
  contractDate: Date | null;
  salesRep: string;
  projectSupervisor: string;
  isCombinationJob: boolean;

  // Permit Info
  permitStatus: string;
  permitResponsibility: string;
  permitEstimatedApprovalDate: Date | null;
  permitActualApprovalDate: Date | null;
  permitSubmissionDate: Date | null;

  // StruXure Info
  struXureMaterialWaiver: boolean;
  struXureSF: number | null;
  struXureNumberOfZones: number | null;
  struXureMaterialStatus: string;
  struXureOrderDate: Date | null;
  struXureEstimatedMaterialReceiveDate: Date | null;
  struXureActualMaterialReceivedDate: Date | null;
  struXureEstimatedReadyMonth: string;

  // Screens Info
  screensManufacturer: string;
  screensQuantity: number | null;
  screensMaterialStatus: string;
  screensOrderDate: Date | null;
  screensEstimatedMaterialReceiveDate: Date | null;
  screensActualMaterialReceivedDate: Date | null;
  screensEstimatedReadyMonth: string;

  // Pergotenda Info
  pergotendaSF: number | null;
  pergotendaMaterialStatus: string;
  pergotendaOrderDate: Date | null;
  pergotendaEstimatedMaterialReceiveDate: Date | null;
  pergotendaActualMaterialReceivedDate: Date | null;
  pergotendaEstimatedReadyMonth: string;

  // Awning Info
  awningMaterialStatus: string;
  awningOrderDate: Date | null;
  awningActualMaterialReceivedDate: Date | null;
  awningEstimatedReadyMonth: string;

  // Other
  preConDate: Date | null;
  finalWalkThruStruXure: Date | null;
  finalWalkThruScreens: Date | null;
  finalWalkThruPergotenda: Date | null;
  finalWalkThruAwning: Date | null;
}

/**
 * Parse Excel file from Service Fusion
 */
export async function parseServiceFusionExcel(file: File): Promise<ParsedJob[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file');

        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (rows.length < 2) {
          throw new Error('Excel file is empty or invalid');
        }

        // Find header row (skip title rows)
        let headerRowIndex = 0;
        let headerRow: string[] = [];

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (row && row[0] === 'Job Start Date') {
            headerRowIndex = i;
            headerRow = row.map((cell) => String(cell || '').trim());
            break;
          }
        }

        if (headerRow.length === 0) {
          throw new Error('Could not find header row in Excel file');
        }

        // Create column index map
        const columnMap = createColumnMap(headerRow);

        // Parse data rows
        const jobs: ParsedJob[] = [];
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue; // Skip empty rows

          try {
            const job = parseJobRow(row, columnMap);
            if (job.customer) {
              // Only add jobs with a customer name
              jobs.push(job);
            }
          } catch (error) {
            console.warn(`Error parsing row ${i}:`, error);
            // Continue parsing other rows
          }
        }

        resolve(jobs);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Create a map of column names to indices
 */
function createColumnMap(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};

  for (let i = 0; i < headerRow.length; i++) {
    const header = headerRow[i].toLowerCase().trim();
    map[header] = i;
  }

  return map;
}

/**
 * Parse a single job row
 */
function parseJobRow(row: any[], columnMap: Record<string, number>): ParsedJob {
  const getCell = (columnName: string) => {
    const index = columnMap[columnName.toLowerCase()];
    return index !== undefined ? row[index] : undefined;
  };

  const parseDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value === 'number') {
      // Excel date serial number
      return new Date((value - 25569) * 86400 * 1000);
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  const parseNumber = (value: any): number | null => {
    if (!value) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  const parseBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
    }
    return false;
  };

  return {
    jobStartDate: parseDate(getCell('job start date')),
    status: String(getCell('status') || '').trim(),
    jobCategory: String(getCell('job category') || '').trim(),
    customer: String(getCell('customer') || '').trim(),
    serviceLocation: String(getCell('service location address 1') || '').trim(),
    contractDate: parseDate(getCell('contract date')),
    salesRep: String(getCell('sales rep') || '').trim(),
    projectSupervisor: String(getCell('project supervisor') || '').trim(),
    isCombinationJob: parseBoolean(getCell('is this a combonation job? (screens included)')),

    permitStatus: String(getCell('permit: status') || '').trim(),
    permitResponsibility: String(getCell('permit: responsibility') || '').trim(),
    permitEstimatedApprovalDate: parseDate(getCell('permit: estimated approval date')),
    permitActualApprovalDate: parseDate(getCell('permit: actual appoval date')),
    permitSubmissionDate: parseDate(getCell('permit: submission date')),

    struXureMaterialWaiver: parseBoolean(getCell('struxure: material waiver')),
    struXureSF: parseNumber(getCell('struxure: sf')),
    struXureNumberOfZones: parseNumber(getCell('struxure: # of zones')),
    struXureMaterialStatus: String(getCell('struxure: material status') || '').trim(),
    struXureOrderDate: parseDate(getCell('struxure: order date')),
    struXureEstimatedMaterialReceiveDate: parseDate(getCell('struxure: estimated material receive date')),
    struXureActualMaterialReceivedDate: parseDate(getCell('struxure: actual material received date')),
    struXureEstimatedReadyMonth: String(getCell('struxure - installation: estimated ready month') || '').trim(),

    screensManufacturer: String(getCell('screens: manufacturer') || '').trim(),
    screensQuantity: parseNumber(getCell('screens: qnty')),
    screensMaterialStatus: String(getCell('screens: material status') || '').trim(),
    screensOrderDate: parseDate(getCell('screens: order date')),
    screensEstimatedMaterialReceiveDate: parseDate(getCell('screens: estimated material receive date')),
    screensActualMaterialReceivedDate: parseDate(getCell('screens: actual material received date')),
    screensEstimatedReadyMonth: String(getCell('screens - installation: estimated ready month') || '').trim(),

    pergotendaSF: parseNumber(getCell('pergotenda: sf')),
    pergotendaMaterialStatus: String(getCell('pergotenda: material status') || '').trim(),
    pergotendaOrderDate: parseDate(getCell('pergotenda: order date')),
    pergotendaEstimatedMaterialReceiveDate: parseDate(getCell('pergotenda: estimated material receive date')),
    pergotendaActualMaterialReceivedDate: parseDate(getCell('pergotenda: actual material received date')),
    pergotendaEstimatedReadyMonth: String(getCell('pergotenda - installation: estimated ready month') || '').trim(),

    awningMaterialStatus: String(getCell('awning: material status') || '').trim(),
    awningOrderDate: parseDate(getCell('awning: order date')),
    awningActualMaterialReceivedDate: parseDate(getCell('awning: actual material received date')),
    awningEstimatedReadyMonth: String(getCell('awning - installation: estimated ready month') || '').trim(),

    preConDate: parseDate(getCell('pre-con date')),
    finalWalkThruStruXure: parseDate(getCell('final walk-thru: struxure')),
    finalWalkThruScreens: parseDate(getCell('final walk thru: screens')),
    finalWalkThruPergotenda: parseDate(getCell('final walk-thru: pergotenda')),
    finalWalkThruAwning: parseDate(getCell('final walk-thru: awning')),
  };
}
