/**
 * Job Intelligence - PDF Report Export
 * Generates professional PDF reports for each report type
 */

import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { type JobData, type ReportType } from './report-types';

export async function exportReportToPDF(
  reportTitle: string,
  jobs: JobData[],
  reportType: ReportType
): Promise<void> {
  try {
    const html = generateReportHTML(reportTitle, jobs, reportType);
    const { uri } = await Print.printToFileAsync({ html });

    const filename = `${reportTitle.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    const destinationUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.copyAsync({
      from: uri,
      to: destinationUri,
    });

    await Sharing.shareAsync(destinationUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${reportTitle}`,
    });
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
}

function generateReportHTML(
  reportTitle: string,
  jobs: JobData[],
  reportType: ReportType
): string {
  const timestamp = new Date().toLocaleString();
  const tableHTML = generateTableHTML(jobs, reportType);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
            color: #1a1a1a;
            line-height: 1.4;
          }
          .container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.5in;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1in;
            border-bottom: 3px solid #0A7EA4;
            padding-bottom: 0.5in;
          }
          .header-left h1 {
            font-size: 24px;
            color: #0A7EA4;
            margin-bottom: 0.2in;
          }
          .header-left p {
            font-size: 12px;
            color: #666;
          }
          .header-right {
            text-align: right;
            font-size: 11px;
            color: #666;
          }
          .report-title {
            font-size: 20px;
            font-weight: bold;
            color: #0A7EA4;
            margin: 0.3in 0;
          }
          .report-meta {
            font-size: 11px;
            color: #999;
            margin-bottom: 0.3in;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0.3in;
          }
          thead {
            background-color: #0A7EA4;
            color: white;
          }
          th {
            padding: 0.15in;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            border: 1px solid #0A7EA4;
          }
          td {
            padding: 0.12in;
            font-size: 10px;
            border: 1px solid #e0e0e0;
          }
          tbody tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tbody tr:hover {
            background-color: #f0f0f0;
          }
          .status-blocked {
            color: #ef4444;
            font-weight: bold;
          }
          .status-confirmed {
            color: #22c55e;
            font-weight: bold;
          }
          .status-estimated {
            color: #f59e0b;
            font-weight: bold;
          }
          .footer {
            margin-top: 0.5in;
            padding-top: 0.3in;
            border-top: 1px solid #e0e0e0;
            font-size: 9px;
            color: #999;
            text-align: center;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .container {
              margin: 0;
              padding: 0.5in;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <h1>DOS Hub</h1>
              <p>Job Intelligence Report</p>
            </div>
            <div class="header-right">
              <p><strong>${reportTitle}</strong></p>
              <p>${timestamp}</p>
            </div>
          </div>

          <div class="report-title">${reportTitle}</div>
          <div class="report-meta">
            Generated: ${timestamp} | Total Records: ${jobs.length}
          </div>

          ${tableHTML}

          <div class="footer">
            <p>© 2026 DOS Hub. All rights reserved.</p>
            <p>This report was automatically generated and contains confidential information.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateTableHTML(jobs: JobData[], reportType: ReportType): string {
  let headers: string[] = [];
  let rows: string[] = [];

  switch (reportType) {
    case 'final':
      headers = ['Customer', 'Supervisor', 'Final Ready Month', 'Confidence', 'Products'];
      rows = jobs.map((job) => `
        <tr>
          <td>${job.customer}</td>
          <td>${job.projectSupervisor || '—'}</td>
          <td>${getEarliestReadyMonth(job)}</td>
          <td class="status-${getConfidenceClass(getOverallConfidence(job))}">
            ${getOverallConfidence(job)}
          </td>
          <td>${getProductList(job).join(', ')}</td>
        </tr>
      `);
      break;

    case 'blocked':
      headers = ['Customer', 'Supervisor', 'Blocked Products', 'Status'];
      rows = jobs
        .filter((job) => hasBlockedProducts(job))
        .map((job) => `
          <tr>
            <td>${job.customer}</td>
            <td>${job.projectSupervisor || '—'}</td>
            <td class="status-blocked">${getBlockedProducts(job).join(', ')}</td>
            <td>Blocked</td>
          </tr>
        `);
      break;

    case 'permit-date-list':
      headers = ['Customer', 'Permit Status', 'Est. Approval Date', 'Supervisor'];
      rows = jobs.map((job) => `
        <tr>
          <td>${job.customer}</td>
          <td>${job.permitStatus || '—'}</td>
          <td>${job.permitApprovalDate || '—'}</td>
          <td>${job.projectSupervisor || '—'}</td>
        </tr>
      `);
      break;

    case 'permit-status':
      headers = ['Customer', 'Permit Status', 'Ready Month'];
      rows = jobs.map((job) => `
        <tr>
          <td>${job.customer}</td>
          <td>${job.permitStatus || '—'}</td>
          <td>${getEarliestReadyMonth(job)}</td>
        </tr>
      `);
      break;

    case 'material-status':
      headers = ['Customer', 'Product', 'Status', 'Ready Month'];
      rows = [];
      jobs.forEach((job) => {
        const products = getProductsWithStatus(job);
        products.forEach((product) => {
          rows.push(`
            <tr>
              <td>${job.customer}</td>
              <td>${product.name}</td>
              <td>${product.status}</td>
              <td>${product.readyMonth}</td>
            </tr>
          `);
        });
      });
      break;

    case 'supervisor-workload':
      headers = ['Supervisor', 'Customer', 'Ready Month', 'Confidence'];
      rows = jobs.map((job) => `
        <tr>
          <td>${job.projectSupervisor || 'Unassigned'}</td>
          <td>${job.customer}</td>
          <td>${getEarliestReadyMonth(job)}</td>
          <td class="status-${getConfidenceClass(getOverallConfidence(job))}">
            ${getOverallConfidence(job)}
          </td>
        </tr>
      `);
      break;

    case 'struXure':
      headers = ['Customer', 'Ready Month', 'Confidence', 'Status'];
      rows = jobs
        .filter((job) => job.struXure)
        .map((job) => `
          <tr>
            <td>${job.customer}</td>
            <td>${job.struXure?.readyMonth || '—'}</td>
            <td class="status-${getConfidenceClass(job.struXure?.confidence || '')}">
              ${getConfidenceLabel(job.struXure?.confidence || '')}
            </td>
            <td>${job.struXure?.status || '—'}</td>
          </tr>
        `);
      break;

    case 'screens':
      headers = ['Customer', 'Ready Month', 'Confidence', 'Status'];
      rows = jobs
        .filter((job) => job.screens)
        .map((job) => `
          <tr>
            <td>${job.customer}</td>
            <td>${job.screens?.readyMonth || '—'}</td>
            <td class="status-${getConfidenceClass(job.screens?.confidence || '')}">
              ${getConfidenceLabel(job.screens?.confidence || '')}
            </td>
            <td>${job.screens?.status || '—'}</td>
          </tr>
        `);
      break;

    case 'pergotenda':
      headers = ['Customer', 'Ready Month', 'Confidence', 'Status'];
      rows = jobs
        .filter((job) => job.pergotenda)
        .map((job) => `
          <tr>
            <td>${job.customer}</td>
            <td>${job.pergotenda?.readyMonth || '—'}</td>
            <td class="status-${getConfidenceClass(job.pergotenda?.confidence || '')}">
              ${getConfidenceLabel(job.pergotenda?.confidence || '')}
            </td>
            <td>${job.pergotenda?.status || '—'}</td>
          </tr>
        `);
      break;

    case 'awnings':
      headers = ['Customer', 'Ready Month', 'Confidence', 'Status'];
      rows = jobs
        .filter((job) => job.awning)
        .map((job) => `
          <tr>
            <td>${job.customer}</td>
            <td>${job.awning?.readyMonth || '—'}</td>
            <td class="status-${getConfidenceClass(job.awning?.confidence || '')}">
              ${getConfidenceLabel(job.awning?.confidence || '')}
            </td>
            <td>${job.awning?.status || '—'}</td>
          </tr>
        `);
      break;

    case 'dos-magnatrack':
      headers = ['Customer', 'DOS', 'MagnaTrack', 'Ready Month'];
      rows = jobs
        .filter((job) => job.dosScreens || job.magnaTrackScreens)
        .map((job) => `
          <tr>
            <td>${job.customer}</td>
            <td>${job.dosScreens ? '✓' : '—'}</td>
            <td>${job.magnaTrackScreens ? '✓' : '—'}</td>
            <td>${getEarliestReadyMonth(job)}</td>
          </tr>
        `);
      break;

    case 'exceptions':
      headers = ['Customer', 'Exception Type', 'Details'];
      rows = jobs
        .filter((job) => job.exceptions?.length || hasBlockedProducts(job))
        .map((job) => `
          <tr>
            <td>${job.customer}</td>
            <td>${job.exceptions?.length ? 'Exceptions' : 'Blocked'}</td>
            <td>${job.exceptions?.join('; ') || getBlockedProducts(job).join(', ')}</td>
          </tr>
        `);
      break;
  }

  const headerRow = headers.map((h) => `<th>${h}</th>`).join('');
  const bodyRows = rows.join('');

  return `
    <table>
      <thead>
        <tr>${headerRow}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  `;
}

// Helper functions
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

function getConfidenceClass(confidence: string): string {
  switch (confidence) {
    case 'Confirmed':
    case 'HARD':
      return 'confirmed';
    case 'Estimated':
    case 'FORECAST':
      return 'estimated';
    case 'Blocked':
    case 'BLOCKED':
      return 'blocked';
    default:
      return 'estimated';
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
  if (job.struXure) {
    products.push({
      name: 'StruXure',
      status: job.struXure.status,
      readyMonth: job.struXure.readyMonth,
    });
  }
  if (job.screens) {
    products.push({
      name: 'Screens',
      status: job.screens.status,
      readyMonth: job.screens.readyMonth,
    });
  }
  if (job.pergotenda) {
    products.push({
      name: 'Pergotenda',
      status: job.pergotenda.status,
      readyMonth: job.pergotenda.readyMonth,
    });
  }
  if (job.awning) {
    products.push({
      name: 'Awning',
      status: job.awning.status,
      readyMonth: job.awning.readyMonth,
    });
  }
  if (job.dosScreens) {
    products.push({
      name: 'DOS',
      status: job.dosScreens.status,
      readyMonth: job.dosScreens.readyMonth,
    });
  }
  if (job.magnaTrackScreens) {
    products.push({
      name: 'MagnaTrack',
      status: job.magnaTrackScreens.status,
      readyMonth: job.magnaTrackScreens.readyMonth,
    });
  }
  return products;
}
