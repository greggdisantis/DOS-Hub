/**
 * Job Intelligence - PDF Report Export
 *
 * Web:    html2pdf.js — renders report HTML into a hidden DOM element,
 *         captures it as canvas, and triggers a direct browser download.
 *         No print dialog. Matches the Google AI Studio implementation.
 *
 * Native: expo-print + expo-sharing — generates HTML, prints to file, shares.
 */

import { Platform } from 'react-native';
import { type JobData, type ReportType } from './report-types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MATERIAL_STATUSES = [
  'Not Yet Ordered',
  'Ordered',
  'In Warehouse',
  'Material Received',
  'Delivered to Site',
];

const PERMIT_STATUS_ORDER = [
  'Permit Prep',
  'Permit Submitted',
  'Permit Hold',
  'Permit Variance Required',
  'Permit Approved, Pend. C',
  'Permit Received',
  'Permit Not Required',
  'Permit By Others',
];

type ProductKey = 'struXure' | 'screens' | 'pergotenda' | 'awning';

// ─── Filename builder ─────────────────────────────────────────────────────────

function buildFilename(reportTitle: string): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  return `Service Fusion _ Project Reporting _ ${reportTitle} _ ${month}-${day}-${year}.pdf`;
}

// ─── Main export entry point ──────────────────────────────────────────────────

export async function exportReportToPDF(
  reportTitle: string,
  jobs: JobData[],
  reportType: ReportType,
): Promise<void> {
  const filename = buildFilename(reportTitle);
  const html = generateReportHTML(reportTitle, jobs, reportType);

  if (Platform.OS === 'web') {
    await exportWebPDF(html, filename);
  } else {
    await exportNativePDF(html, filename, reportTitle);
  }
}

// ─── Web export via html2pdf.js ───────────────────────────────────────────────

async function exportWebPDF(html: string, filename: string): Promise<void> {
  // Dynamically import html2pdf.js (web only, avoids Metro bundling issues on native)
  const html2pdf = (await import('html2pdf.js')).default;

  // Create a hidden container in the DOM with the report HTML
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '850px';
  container.style.background = '#ffffff';
  container.style.color = '#1a1a1a';
  container.style.fontFamily = 'Arial, sans-serif';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const options = {
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    await (html2pdf() as any).set(options).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}

// ─── Native export (expo-print + sharing) ────────────────────────────────────

async function exportNativePDF(
  html: string,
  filename: string,
  reportTitle: string,
): Promise<void> {
  try {
    const Print = await import('expo-print');
    const FileSystem = await import('expo-file-system/legacy');
    const Sharing = await import('expo-sharing');

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

// ─── HTML generator (shared between web and native) ───────────────────────────

export function generateReportHTML(
  reportTitle: string,
  jobs: JobData[],
  reportType: ReportType,
): string {
  const timestamp = new Date().toLocaleString();
  let bodyContent = '';

  if (jobs.length === 0) {
    bodyContent = '<p style="color:#999;padding:20px">No data available for this report.</p>';
  } else {
    switch (reportType) {

      // ── Product reports: grouped by ready month ──────────────────────────
      case 'struXure':
      case 'screens':
      case 'pergotenda':
      case 'awnings': {
        const productKey: ProductKey = reportType === 'awnings' ? 'awning' : (reportType as ProductKey);
        const isScreens = productKey === 'screens';
        const isStruXure = productKey === 'struXure';

        const monthMap = new Map<string, JobData[]>();
        for (const job of jobs) {
          const p = job[productKey];
          if (!p) continue;
          const m = p.readyMonth || 'BLOCKED';
          if (!monthMap.has(m)) monthMap.set(m, []);
          monthMap.get(m)!.push(job);
        }
        const groups = Array.from(monthMap.entries()).sort(([a], [b]) => {
          if (a === 'BLOCKED') return 1;
          if (b === 'BLOCKED') return -1;
          return a.localeCompare(b);
        });

        for (const [month, groupJobs] of groups) {
          const totalQty = isScreens ? groupJobs.reduce((s, j) => s + (j.screens?.quantity ?? 0), 0) : 0;
          const totalSF = isStruXure ? groupJobs.reduce((s, j) => s + ((j.struXure as any)?.sf ?? 0), 0) : 0;
          const totalZones = isStruXure ? groupJobs.reduce((s, j) => s + ((j.struXure as any)?.zones ?? 0), 0) : 0;
          const summary = isScreens
            ? `${groupJobs.length} Jobs${totalQty ? ` &nbsp;|&nbsp; ${totalQty} Screens` : ''}`
            : isStruXure
            ? `${groupJobs.length} Jobs${totalSF ? ` &nbsp;|&nbsp; ${totalSF} SF` : ''}${totalZones ? ` &nbsp;|&nbsp; ${totalZones} Zones` : ''}`
            : `${groupJobs.length} Jobs`;

          bodyContent += `
            <div class="section-header">
              <span>${escHtml(month)}</span>
              <span class="muted">${summary}</span>
            </div>
            <table>
              <thead><tr>
                <th>Customer</th>
                ${isScreens ? '<th>Qty</th><th>Manufacturer</th>' : ''}
                ${isStruXure ? '<th>SF</th><th>Zones</th>' : ''}
                <th>Supervisor</th>
                <th>Source</th>
                <th>Confidence</th>
              </tr></thead>
              <tbody>`;

          groupJobs.forEach((job, idx) => {
            const p = job[productKey]!;
            const confClass = p.confidence === 'HARD' ? 'conf-green' : p.confidence === 'FORECAST' ? 'conf-amber' : 'conf-red';
            bodyContent += `<tr class="${idx % 2 === 0 ? 'alt' : ''}">
              <td><strong>${escHtml(job.customer)}</strong></td>
              ${isScreens ? `<td>${p.quantity ?? '—'}</td><td>${escHtml(p.manufacturer || '—')}</td>` : ''}
              ${isStruXure ? `<td>${(p as any).sf ?? '—'}</td><td>${(p as any).zones ?? '—'}</td>` : ''}
              <td>${escHtml(job.projectSupervisor || '—')}</td>
              <td>${escHtml(p.sourceLabel || p.status)}</td>
              <td class="${confClass}">${escHtml(p.confidence)}</td>
            </tr>`;
          });
          bodyContent += '</tbody></table>';
        }
        break;
      }

      // ── Supervisor Workload ──────────────────────────────────────────────
      case 'supervisor-workload': {
        const supMap = new Map<string, JobData[]>();
        for (const job of jobs) {
          const sup = job.projectSupervisor || 'Unassigned';
          if (!supMap.has(sup)) supMap.set(sup, []);
          supMap.get(sup)!.push(job);
        }

        for (const [supervisor, supJobs] of Array.from(supMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
          const totalUnits = supJobs.reduce((sum, job) => {
            let c = 0;
            if (job.struXure) c++;
            if (job.screens) c++;
            if (job.pergotenda) c++;
            if (job.awning) c++;
            return sum + c;
          }, 0);

          bodyContent += `<div class="section-header"><span>${escHtml(supervisor)}</span><span class="muted">${supJobs.length} Jobs &nbsp;·&nbsp; ${totalUnits} Units</span></div>`;

          const blockedJobs = supJobs.filter(
            (j) => j.struXure?.confidence === 'BLOCKED' || j.screens?.confidence === 'BLOCKED' ||
                   j.pergotenda?.confidence === 'BLOCKED' || j.awning?.confidence === 'BLOCKED',
          );
          const activeJobs = supJobs.filter((j) => !blockedJobs.includes(j));

          const monthMap = new Map<string, { job: JobData; products: string[] }[]>();
          for (const job of activeJobs) {
            const months = [
              job.struXure?.readyMonth, job.screens?.readyMonth,
              job.pergotenda?.readyMonth, job.awning?.readyMonth,
            ].filter(Boolean) as string[];
            const month = months.sort()[0] || 'TBD';
            if (!monthMap.has(month)) monthMap.set(month, []);
            const products: string[] = [];
            if (job.struXure) products.push('StruXure');
            if (job.screens) products.push('Screens');
            if (job.pergotenda) products.push('Pergotenda');
            if (job.awning) products.push('Awning');
            monthMap.get(month)!.push({ job, products });
          }

          for (const [month, entries] of Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
            bodyContent += `<div class="sub-header">${escHtml(month)} (${entries.length})</div><ul>`;
            entries.forEach(({ job, products }) => {
              bodyContent += `<li>${escHtml(job.customer)} <span class="muted">(${products.join(', ')})</span></li>`;
            });
            bodyContent += '</ul>';
          }

          if (blockedJobs.length > 0) {
            bodyContent += `<div class="sub-header conf-red">BLOCKED (${blockedJobs.length})</div><ul>`;
            blockedJobs.forEach((job) => {
              const bp: string[] = [];
              if (job.struXure?.confidence === 'BLOCKED') bp.push('StruXure');
              if (job.screens?.confidence === 'BLOCKED') bp.push('Screens');
              if (job.pergotenda?.confidence === 'BLOCKED') bp.push('Pergotenda');
              if (job.awning?.confidence === 'BLOCKED') bp.push('Awning');
              bodyContent += `<li>${escHtml(job.customer)} <span class="conf-red">(${bp.join(', ')})</span></li>`;
            });
            bodyContent += '</ul>';
          }
        }
        break;
      }

      // ── Material Status ──────────────────────────────────────────────────
      case 'material-status': {
        const PRODUCT_TYPES: { key: ProductKey; label: string }[] = [
          { key: 'struXure', label: 'StruXure' },
          { key: 'screens', label: 'Screens' },
          { key: 'pergotenda', label: 'Pergotenda' },
          { key: 'awning', label: 'Awning' },
        ];

        for (const { key, label } of PRODUCT_TYPES) {
          const productJobs = jobs.filter((j) => j[key]);
          if (productJobs.length === 0) continue;

          const statusGroups = new Map<string, JobData[]>();
          for (const job of productJobs) {
            const status = job[key]!.materialStatus || 'Not Yet Ordered';
            if (!statusGroups.has(status)) statusGroups.set(status, []);
            statusGroups.get(status)!.push(job);
          }
          const sortedGroups = MATERIAL_STATUSES.map((s) => ({
            status: s, groupJobs: statusGroups.get(s) || [],
          })).filter((g) => g.groupJobs.length > 0);
          for (const [status, groupJobs] of statusGroups.entries()) {
            if (!MATERIAL_STATUSES.includes(status)) sortedGroups.push({ status, groupJobs });
          }

          bodyContent += `<div class="section-header"><span>${escHtml(label)}</span><span class="muted">${productJobs.length} Jobs</span></div>`;

          for (const { status, groupJobs } of sortedGroups) {
            bodyContent += `<div class="sub-header">${escHtml(status)} (${groupJobs.length})</div>`;
            bodyContent += '<div class="two-col">';
            groupJobs.forEach((job) => {
              bodyContent += `<div>${escHtml(job.customer)}</div>`;
            });
            bodyContent += '</div>';
          }
        }
        break;
      }

      // ── Permit Status ────────────────────────────────────────────────────
      case 'permit-status': {
        const statusMap = new Map<string, JobData[]>();
        for (const job of jobs) {
          const status = job.permitStatus || 'Unknown';
          if (!statusMap.has(status)) statusMap.set(status, []);
          statusMap.get(status)!.push(job);
        }
        const sortedGroups = PERMIT_STATUS_ORDER.map((s) => ({
          status: s, groupJobs: statusMap.get(s) || [],
        })).filter((g) => g.groupJobs.length > 0);
        for (const [status, groupJobs] of statusMap.entries()) {
          if (!PERMIT_STATUS_ORDER.includes(status)) sortedGroups.push({ status, groupJobs });
        }

        bodyContent += '<div class="permit-grid">';
        for (const { status, groupJobs } of sortedGroups) {
          bodyContent += `<div class="permit-col">
            <div class="permit-col-header">${escHtml(status)} (${groupJobs.length})</div>`;
          groupJobs.forEach((job) => {
            bodyContent += `<div class="permit-item">${escHtml(job.customer)}</div>`;
          });
          bodyContent += '</div>';
        }
        bodyContent += '</div>';
        break;
      }

      // ── Permit Date List ─────────────────────────────────────────────────
      case 'permit-date-list': {
        const sorted = [...jobs].sort((a, b) => {
          const da = a.permitApprovalDate || 'ZZZZ';
          const db = b.permitApprovalDate || 'ZZZZ';
          return da.localeCompare(db);
        });
        bodyContent += `<table><thead><tr>
          <th>Customer</th><th>Permit Status</th><th>Approval Date</th>
        </tr></thead><tbody>`;
        sorted.forEach((job, idx) => {
          bodyContent += `<tr class="${idx % 2 === 0 ? 'alt' : ''}">
            <td><strong>${escHtml(job.customer)}</strong></td>
            <td>${escHtml(job.permitStatus || '—')}</td>
            <td>${escHtml(job.permitApprovalDate || 'TBD')}</td>
          </tr>`;
        });
        bodyContent += '</tbody></table>';
        break;
      }

      // ── Blocked ──────────────────────────────────────────────────────────
      case 'blocked': {
        bodyContent += `<table><thead><tr>
          <th>Customer</th><th>Supervisor</th><th>Blocked Products</th>
        </tr></thead><tbody>`;
        jobs.forEach((job, idx) => {
          const blocked: string[] = [];
          if (job.struXure?.confidence === 'BLOCKED') blocked.push('StruXure');
          if (job.screens?.confidence === 'BLOCKED') blocked.push('Screens');
          if (job.pergotenda?.confidence === 'BLOCKED') blocked.push('Pergotenda');
          if (job.awning?.confidence === 'BLOCKED') blocked.push('Awning');
          bodyContent += `<tr class="${idx % 2 === 0 ? 'alt' : ''}">
            <td><strong>${escHtml(job.customer)}</strong></td>
            <td>${escHtml(job.projectSupervisor || '—')}</td>
            <td class="conf-red">${escHtml(blocked.join(', '))}</td>
          </tr>`;
        });
        bodyContent += '</tbody></table>';
        break;
      }

      // ── All other reports (flat table) ───────────────────────────────────
      default: {
        bodyContent += `<table><thead><tr>
          <th>Customer</th><th>Supervisor</th><th>Ready Month</th>
          <th>Confidence</th><th>Products</th>
        </tr></thead><tbody>`;
        jobs.forEach((job, idx) => {
          const months = [
            job.struXure?.readyMonth, job.screens?.readyMonth,
            job.pergotenda?.readyMonth, job.awning?.readyMonth,
          ].filter(Boolean) as string[];
          const readyMonth = months.sort().reverse()[0] || 'N/A';
          const confidences = [
            job.struXure?.confidence, job.screens?.confidence,
            job.pergotenda?.confidence, job.awning?.confidence,
          ].filter(Boolean);
          const conf = confidences.includes('BLOCKED') ? 'BLOCKED'
            : confidences.includes('FORECAST') ? 'FORECAST' : 'HARD';
          const confClass = conf === 'HARD' ? 'conf-green' : conf === 'FORECAST' ? 'conf-amber' : 'conf-red';
          const products: string[] = [];
          if (job.struXure) products.push('StruXure');
          if (job.screens) products.push('Screens');
          if (job.pergotenda) products.push('Pergotenda');
          if (job.awning) products.push('Awning');
          bodyContent += `<tr class="${idx % 2 === 0 ? 'alt' : ''}">
            <td><strong>${escHtml(job.customer)}</strong></td>
            <td>${escHtml(job.projectSupervisor || '—')}</td>
            <td>${escHtml(readyMonth)}</td>
            <td class="${confClass}">${escHtml(conf)}</td>
            <td>${escHtml(products.join(', '))}</td>
          </tr>`;
        });
        bodyContent += '</tbody></table>';
        break;
      }
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #1a1a1a;
      font-size: 11px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container { max-width: 780px; margin: 0 auto; padding: 20px; }

    /* Header */
    .header {
      background: #0A7EA4;
      color: #ffffff;
      padding: 14px 20px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 4px;
    }
    .header h1 { font-size: 18px; font-weight: 700; }
    .header p { font-size: 9px; opacity: 0.85; margin-top: 2px; }
    .header-right { text-align: right; }
    .header-right strong { font-size: 12px; }
    .header-right span { font-size: 9px; opacity: 0.85; display: block; margin-top: 2px; }

    /* Report title */
    .report-title { font-size: 15px; font-weight: 700; color: #0A7EA4; margin-bottom: 2px; }
    .report-meta { font-size: 9px; color: #999999; margin-bottom: 14px; }

    /* Section headers */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid #1a1a1a;
      padding: 12px 0 4px;
      margin-top: 18px;
      font-size: 13px;
      font-weight: 700;
    }
    .sub-header {
      font-size: 11px;
      font-weight: 600;
      padding: 7px 0 3px;
      border-bottom: 1px solid #dddddd;
      margin-top: 8px;
      color: #1a1a1a;
    }
    .muted { color: #999999; font-weight: 400; font-size: 10px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    thead { background: #0A7EA4; color: #ffffff; }
    th { padding: 6px 8px; font-size: 9px; text-align: left; font-weight: 700; }
    td { padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #eeeeee; }
    tr.alt td { background: #f9f9f9; }

    /* Confidence colors */
    .conf-green { color: #16a34a; font-weight: 600; }
    .conf-amber { color: #d97706; font-weight: 600; }
    .conf-red   { color: #ef4444; font-weight: 600; }

    /* Lists */
    ul { list-style: none; padding: 0; margin: 0; }
    li { padding: 4px 8px; border-bottom: 1px solid #f0f0f0; font-size: 10px; }

    /* Two-column layout (material status) */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 16px;
      padding: 4px 0;
    }
    .two-col div { font-size: 10px; padding: 3px 0; border-bottom: 1px solid #f5f5f5; }

    /* Permit status grid */
    .permit-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 10px;
    }
    .permit-col-header {
      font-size: 11px;
      font-weight: 700;
      border-bottom: 1.5px solid #1a1a1a;
      padding-bottom: 4px;
      margin-bottom: 5px;
    }
    .permit-item { font-size: 10px; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }

    /* Page breaks */
    .section-header { page-break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }

    /* Footer */
    .footer {
      margin-top: 24px;
      border-top: 1px solid #eeeeee;
      padding-top: 10px;
      font-size: 8px;
      color: #aaaaaa;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>DOS Hub</h1>
        <p>Service Fusion — Job Intelligence Report</p>
      </div>
      <div class="header-right">
        <strong>${escHtml(reportTitle)}</strong>
        <span>${escHtml(timestamp)}</span>
      </div>
    </div>

    <div class="report-title">${escHtml(reportTitle)}</div>
    <div class="report-meta">Generated: ${escHtml(timestamp)} &nbsp;|&nbsp; Total Records: ${jobs.length}</div>

    ${bodyContent}

    <div class="footer">
      <p>© 2026 DOS Hub. All rights reserved. &nbsp;|&nbsp; Service Fusion Project Reporting</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── HTML escape helper ───────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
