/**
 * Job Intelligence - PDF Report Export
 * Web: uses jsPDF to generate and auto-download PDF directly (no print dialog)
 * Native: uses expo-print + expo-sharing
 */

import { Platform } from 'react-native';
import { type JobData, type ReportType } from './report-types';

// ─── Filename builder ────────────────────────────────────────────────────────

function buildFilename(reportTitle: string): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  return `Service Fusion _ Project Reporting _ ${reportTitle} _ ${month}-${day}-${year}.pdf`;
}

// ─── Main export function ────────────────────────────────────────────────────

export async function exportReportToPDF(
  reportTitle: string,
  jobs: JobData[],
  reportType: ReportType
): Promise<void> {
  const filename = buildFilename(reportTitle);

  if (Platform.OS === 'web') {
    await exportWebPDF(reportTitle, jobs, reportType, filename);
  } else {
    await exportNativePDF(reportTitle, jobs, reportType, filename);
  }
}

// ─── Web export (jsPDF text API — no print dialog) ───────────────────────────

async function exportWebPDF(
  reportTitle: string,
  jobs: JobData[],
  reportType: ReportType,
  filename: string
): Promise<void> {
  // Dynamic import so Metro doesn't bundle pdf-lib for native
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Letter size: 612 x 792 pt
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BRAND = rgb(10 / 255, 126 / 255, 164 / 255);
  const WHITE = rgb(1, 1, 1);
  const DARK = rgb(0.12, 0.12, 0.12);
  const GRAY = rgb(0.63, 0.63, 0.63);
  const LIGHT_BG = rgb(0.976, 0.976, 0.976);
  const RED = rgb(0.937, 0.267, 0.267);
  const GREEN = rgb(0.133, 0.773, 0.369);
  const AMBER = rgb(0.961, 0.624, 0.043);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const { headers, rows } = buildTableData(jobs, reportType);

  const addPage = () => {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    // Header bar
    page.drawRectangle({ x: 0, y: PAGE_H - 56, width: PAGE_W, height: 56, color: BRAND });
    page.drawText('DOS Hub', { x: MARGIN, y: PAGE_H - 24, font: helveticaBold, size: 16, color: WHITE });
    page.drawText('Service Fusion — Job Intelligence Report', { x: MARGIN, y: PAGE_H - 42, font: helvetica, size: 9, color: rgb(0.9, 0.9, 0.9) });
    page.drawText(reportTitle, { x: PAGE_W - MARGIN - helveticaBold.widthOfTextAtSize(reportTitle, 10), y: PAGE_H - 24, font: helveticaBold, size: 10, color: WHITE });
    page.drawText(dateStr, { x: PAGE_W - MARGIN - helvetica.widthOfTextAtSize(dateStr, 9), y: PAGE_H - 42, font: helvetica, size: 9, color: rgb(0.9, 0.9, 0.9) });
    return page;
  };

  let page = addPage();
  let y = PAGE_H - 80;

  // Report title
  page.drawText(reportTitle, { x: MARGIN, y, font: helveticaBold, size: 15, color: BRAND });
  y -= 16;
  page.drawText(`Generated: ${now.toLocaleString()} | Total Records: ${jobs.length}`, { x: MARGIN, y, font: helvetica, size: 8, color: GRAY });
  y -= 20;

  if (headers.length === 0 || rows.length === 0) {
    page.drawText('No data available for this report.', { x: MARGIN, y, font: helvetica, size: 11, color: DARK });
  } else {
    const colCount = headers.length;
    const colWidth = CONTENT_W / colCount;
    const ROW_H = 18;
    const HDR_H = 22;

    const drawHeader = (pg: ReturnType<typeof addPage>, startY: number) => {
      pg.drawRectangle({ x: MARGIN, y: startY, width: CONTENT_W, height: HDR_H, color: BRAND });
      headers.forEach((h, i) => {
        pg.drawText(h.toUpperCase(), { x: MARGIN + i * colWidth + 5, y: startY + 7, font: helveticaBold, size: 7.5, color: WHITE });
      });
      return startY - HDR_H;
    };

    y = drawHeader(page, y);

    rows.forEach((row, rowIdx) => {
      if (y - ROW_H < MARGIN + 20) {
        // Footer on current page
        page.drawLine({ start: { x: MARGIN, y: MARGIN + 16 }, end: { x: PAGE_W - MARGIN, y: MARGIN + 16 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
        page.drawText('© 2026 DOS Hub. Confidential.', { x: MARGIN, y: MARGIN + 4, font: helvetica, size: 7, color: GRAY });
        page = addPage();
        y = PAGE_H - 80;
        y = drawHeader(page, y);
      }

      // Alternating row bg
      if (rowIdx % 2 === 0) {
        page.drawRectangle({ x: MARGIN, y: y - ROW_H, width: CONTENT_W, height: ROW_H, color: LIGHT_BG });
      }
      // Row border
      page.drawLine({ start: { x: MARGIN, y: y - ROW_H }, end: { x: MARGIN + CONTENT_W, y: y - ROW_H }, thickness: 0.3, color: rgb(0.87, 0.87, 0.87) });

      row.forEach((cell, colIdx) => {
        const cellText = String(cell ?? '—');
        const maxChars = Math.floor(colWidth / 4.8);
        const truncated = cellText.length > maxChars ? cellText.substring(0, maxChars - 1) + '…' : cellText;
        let cellColor = DARK;
        if (cellText === 'Blocked' || cellText === 'BLOCKED') cellColor = RED;
        else if (cellText === 'Confirmed' || cellText === 'HARD') cellColor = GREEN;
        else if (cellText === 'Estimated' || cellText === 'FORECAST') cellColor = AMBER;
        page.drawText(truncated, { x: MARGIN + colIdx * colWidth + 5, y: y - ROW_H + 5, font: helvetica, size: 7.5, color: cellColor });
      });

      y -= ROW_H;
    });

    // Bottom border
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_W, y }, thickness: 0.5, color: rgb(0.78, 0.78, 0.78) });
  }

  // Footer on last page
  page.drawLine({ start: { x: MARGIN, y: MARGIN + 16 }, end: { x: PAGE_W - MARGIN, y: MARGIN + 16 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  page.drawText('© 2026 DOS Hub. Confidential.', { x: MARGIN, y: MARGIN + 4, font: helvetica, size: 7, color: GRAY });

  // ── Download ──────────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

// ─── Native export (expo-print + sharing) ────────────────────────────────────

async function exportNativePDF(
  reportTitle: string,
  jobs: JobData[],
  reportType: ReportType,
  filename: string
): Promise<void> {
  try {
    const Print = await import('expo-print');
    const FileSystem = await import('expo-file-system/legacy');
    const Sharing = await import('expo-sharing');

    const html = generateReportHTML(reportTitle, jobs, reportType);
    const { uri } = await Print.printToFileAsync({ html });
    const destinationUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: destinationUri });
    await Sharing.shareAsync(destinationUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${reportTitle}`,
    });
  } catch (error) {
    console.error('Native PDF export error:', error);
    throw error;
  }
}

// ─── Table data builder ───────────────────────────────────────────────────────

function buildTableData(
  jobs: JobData[],
  reportType: ReportType
): { headers: string[]; rows: string[][] } {
  switch (reportType) {
    case 'final':
      return {
        headers: ['Customer', 'Supervisor', 'Ready Month', 'Confidence', 'Products'],
        rows: jobs.map((job) => [
          job.customer,
          job.projectSupervisor || '—',
          getEarliestReadyMonth(job),
          getOverallConfidence(job),
          getProductList(job).join(', '),
        ]),
      };

    case 'blocked':
      return {
        headers: ['Customer', 'Supervisor', 'Blocked Products', 'Status'],
        rows: jobs
          .filter((job) => hasBlockedProducts(job))
          .map((job) => [
            job.customer,
            job.projectSupervisor || '—',
            getBlockedProducts(job).join(', '),
            'Blocked',
          ]),
      };

    case 'permit-date-list':
      return {
        headers: ['Customer', 'Permit Status', 'Est. Approval Date', 'Supervisor'],
        rows: jobs.map((job) => [
          job.customer,
          job.permitStatus || '—',
          job.permitApprovalDate || '—',
          job.projectSupervisor || '—',
        ]),
      };

    case 'permit-status':
      return {
        headers: ['Customer', 'Permit Status', 'Ready Month'],
        rows: jobs.map((job) => [
          job.customer,
          job.permitStatus || '—',
          getEarliestReadyMonth(job),
        ]),
      };

    case 'material-status': {
      const rows: string[][] = [];
      jobs.forEach((job) => {
        getProductsWithStatus(job).forEach((p) => {
          rows.push([job.customer, p.name, p.status, p.readyMonth]);
        });
      });
      return { headers: ['Customer', 'Product', 'Status', 'Ready Month'], rows };
    }

    case 'supervisor-workload':
      return {
        headers: ['Supervisor', 'Customer', 'Ready Month', 'Confidence'],
        rows: jobs.map((job) => [
          job.projectSupervisor || 'Unassigned',
          job.customer,
          getEarliestReadyMonth(job),
          getOverallConfidence(job),
        ]),
      };

    case 'struXure':
      return {
        headers: ['Customer', 'Ready Month', 'Confidence', 'Status'],
        rows: jobs
          .filter((job) => job.struXure)
          .map((job) => [
            job.customer,
            job.struXure?.readyMonth || '—',
            getConfidenceLabel(job.struXure?.confidence || ''),
            job.struXure?.status || '—',
          ]),
      };

    case 'screens':
      return {
        headers: ['Customer', 'Ready Month', 'Confidence', 'Status'],
        rows: jobs
          .filter((job) => job.screens)
          .map((job) => [
            job.customer,
            job.screens?.readyMonth || '—',
            getConfidenceLabel(job.screens?.confidence || ''),
            job.screens?.status || '—',
          ]),
      };

    case 'pergotenda':
      return {
        headers: ['Customer', 'Ready Month', 'Confidence', 'Status'],
        rows: jobs
          .filter((job) => job.pergotenda)
          .map((job) => [
            job.customer,
            job.pergotenda?.readyMonth || '—',
            getConfidenceLabel(job.pergotenda?.confidence || ''),
            job.pergotenda?.status || '—',
          ]),
      };

    case 'awnings':
      return {
        headers: ['Customer', 'Ready Month', 'Confidence', 'Status'],
        rows: jobs
          .filter((job) => job.awning)
          .map((job) => [
            job.customer,
            job.awning?.readyMonth || '—',
            getConfidenceLabel(job.awning?.confidence || ''),
            job.awning?.status || '—',
          ]),
      };

    case 'dos-magnatrack':
      return {
        headers: ['Customer', 'DOS', 'MagnaTrack', 'Ready Month'],
        rows: jobs
          .filter((job) => job.dosScreens || job.magnaTrackScreens)
          .map((job) => [
            job.customer,
            job.dosScreens ? 'Yes' : '—',
            job.magnaTrackScreens ? 'Yes' : '—',
            getEarliestReadyMonth(job),
          ]),
      };

    case 'exceptions':
      return {
        headers: ['Customer', 'Exception Type', 'Details'],
        rows: jobs
          .filter((job) => job.exceptions?.length || hasBlockedProducts(job))
          .map((job) => [
            job.customer,
            job.exceptions?.length ? 'Exceptions' : 'Blocked',
            job.exceptions?.join('; ') || getBlockedProducts(job).join(', '),
          ]),
      };

    default:
      return { headers: [], rows: [] };
  }
}

// ─── HTML generator (native only) ────────────────────────────────────────────

function generateReportHTML(
  reportTitle: string,
  jobs: JobData[],
  reportType: ReportType
): string {
  const timestamp = new Date().toLocaleString();
  const { headers, rows } = buildTableData(jobs, reportType);
  const headerRow = headers.map((h) => `<th>${h}</th>`).join('');
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, sans-serif; background:#fff; color:#1a1a1a; }
    .container { max-width:8.5in; margin:0 auto; padding:0.5in; }
    .header { background:#0A7EA4; color:#fff; padding:16px 24px; margin-bottom:24px; }
    .header h1 { font-size:22px; } .header p { font-size:11px; opacity:0.85; }
    .report-title { font-size:18px; font-weight:bold; color:#0A7EA4; margin-bottom:4px; }
    .report-meta { font-size:10px; color:#999; margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; }
    thead { background:#0A7EA4; color:#fff; }
    th { padding:8px 10px; font-size:10px; text-align:left; }
    td { padding:7px 10px; font-size:9.5px; border-bottom:1px solid #eee; }
    tr:nth-child(even) td { background:#f9f9f9; }
    .footer { margin-top:24px; border-top:1px solid #eee; padding-top:12px; font-size:8px; color:#aaa; text-align:center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>DOS Hub</h1><p>Service Fusion — Job Intelligence Report</p></div>
    <div class="report-title">${reportTitle}</div>
    <div class="report-meta">Generated: ${timestamp} | Total Records: ${jobs.length}</div>
    <table>
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div class="footer"><p>© 2026 DOS Hub. All rights reserved.</p></div>
  </div>
</body>
</html>`;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function getEarliestReadyMonth(job: JobData): string {
  const months = [
    job.struXure?.readyMonth,
    job.screens?.readyMonth,
    job.pergotenda?.readyMonth,
    job.awning?.readyMonth,
    job.dosScreens?.readyMonth,
    job.magnaTrackScreens?.readyMonth,
  ].filter(Boolean) as string[];
  return months.length > 0 ? months.sort().reverse()[0] : 'N/A';
}

function getOverallConfidence(job: JobData): string {
  const confidences = [
    job.struXure?.confidence,
    job.screens?.confidence,
    job.pergotenda?.confidence,
    job.awning?.confidence,
    job.dosScreens?.confidence,
    job.magnaTrackScreens?.confidence,
  ].filter(Boolean);
  if (confidences.includes('BLOCKED')) return 'Blocked';
  if (confidences.includes('FORECAST')) return 'Estimated';
  return 'Confirmed';
}

function getConfidenceLabel(confidence: string): string {
  switch (confidence) {
    case 'HARD': return 'Confirmed';
    case 'FORECAST': return 'Estimated';
    case 'BLOCKED': return 'Blocked';
    default: return 'Unknown';
  }
}

function getProductList(job: JobData): string[] {
  const products = [];
  if (job.struXure) products.push('StruXure');
  if (job.screens) products.push('Screens');
  if (job.pergotenda) products.push('Pergotenda');
  if (job.awning) products.push('Awning');
  if (job.dosScreens) products.push('DOS');
  if (job.magnaTrackScreens) products.push('MagnaTrack');
  return products;
}

function getBlockedProducts(job: JobData): string[] {
  const blocked = [];
  if (job.struXure?.confidence === 'BLOCKED') blocked.push('StruXure');
  if (job.screens?.confidence === 'BLOCKED') blocked.push('Screens');
  if (job.pergotenda?.confidence === 'BLOCKED') blocked.push('Pergotenda');
  if (job.awning?.confidence === 'BLOCKED') blocked.push('Awning');
  if (job.dosScreens?.confidence === 'BLOCKED') blocked.push('DOS');
  if (job.magnaTrackScreens?.confidence === 'BLOCKED') blocked.push('MagnaTrack');
  return blocked;
}

function hasBlockedProducts(job: JobData): boolean {
  return getBlockedProducts(job).length > 0;
}

function getProductsWithStatus(
  job: JobData
): Array<{ name: string; status: string; readyMonth: string }> {
  const products = [];
  if (job.struXure) products.push({ name: 'StruXure', status: job.struXure.status, readyMonth: job.struXure.readyMonth });
  if (job.screens) products.push({ name: 'Screens', status: job.screens.status, readyMonth: job.screens.readyMonth });
  if (job.pergotenda) products.push({ name: 'Pergotenda', status: job.pergotenda.status, readyMonth: job.pergotenda.readyMonth });
  if (job.awning) products.push({ name: 'Awning', status: job.awning.status, readyMonth: job.awning.readyMonth });
  if (job.dosScreens) products.push({ name: 'DOS', status: job.dosScreens.status, readyMonth: job.dosScreens.readyMonth });
  if (job.magnaTrackScreens) products.push({ name: 'MagnaTrack', status: job.magnaTrackScreens.status, readyMonth: job.magnaTrackScreens.readyMonth });
  return products;
}
