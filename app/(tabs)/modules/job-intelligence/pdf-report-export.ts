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
  // Dynamic import so Metro doesn't bundle jsPDF for native
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(10, 126, 164); // #0A7EA4
  doc.rect(0, 0, pageWidth, 56, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DOS Hub', margin, 36);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Service Fusion — Job Intelligence Report', margin, 50);

  // Report title (right-aligned in header)
  doc.setFontSize(10);
  doc.text(reportTitle, pageWidth - margin, 36, { align: 'right' });
  const now = new Date();
  doc.text(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), pageWidth - margin, 50, { align: 'right' });

  y = 80;

  // ── Report title ────────────────────────────────────────────────────────────
  doc.setTextColor(10, 126, 164);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle, margin, y);
  y += 18;

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${now.toLocaleString()} | Total Records: ${jobs.length}`, margin, y);
  y += 20;

  // ── Table ───────────────────────────────────────────────────────────────────
  const { headers, rows } = buildTableData(jobs, reportType);

  if (headers.length === 0 || rows.length === 0) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    doc.text('No data available for this report.', margin, y);
  } else {
    const colCount = headers.length;
    const colWidth = contentWidth / colCount;
    const rowHeight = 20;
    const headerHeight = 24;

    // Header row
    doc.setFillColor(10, 126, 164);
    doc.rect(margin, y, contentWidth, headerHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => {
      doc.text(h, margin + i * colWidth + 6, y + 16);
    });
    y += headerHeight;

    // Data rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    rows.forEach((row, rowIdx) => {
      // Check for page overflow
      if (y + rowHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        // Repeat header on new page
        doc.setFillColor(10, 126, 164);
        doc.rect(margin, y, contentWidth, headerHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        headers.forEach((h, i) => {
          doc.text(h, margin + i * colWidth + 6, y + 16);
        });
        y += headerHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      // Alternating row background
      if (rowIdx % 2 === 0) {
        doc.setFillColor(249, 249, 249);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      // Row border
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, contentWidth, rowHeight, 'S');

      // Cell text
      row.forEach((cell, colIdx) => {
        const cellText = String(cell ?? '—');
        const maxChars = Math.floor(colWidth / 5.2);
        const truncated = cellText.length > maxChars ? cellText.substring(0, maxChars - 1) + '…' : cellText;

        // Color-code confidence/status values
        if (cellText === 'BLOCKED' || cellText === 'Blocked') {
          doc.setTextColor(239, 68, 68);
        } else if (cellText === 'HARD' || cellText === 'Confirmed') {
          doc.setTextColor(34, 197, 94);
        } else if (cellText === 'FORECAST' || cellText === 'Estimated') {
          doc.setTextColor(245, 158, 11);
        } else {
          doc.setTextColor(30, 30, 30);
        }

        doc.text(truncated, margin + colIdx * colWidth + 6, y + 13);
      });

      y += rowHeight;
    });

    // Bottom border for table
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, margin + contentWidth, y);
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(8);
    doc.text('© 2026 DOS Hub. Confidential.', margin, pageHeight - 14);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 14, { align: 'right' });
  }

  // ── Download ─────────────────────────────────────────────────────────────────
  doc.save(filename);
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
