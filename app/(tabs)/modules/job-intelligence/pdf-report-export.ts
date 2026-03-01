/**
 * Job Intelligence - PDF Report Export
 *
 * Web:    pdf-lib — generates PDF in-browser and auto-downloads (no print dialog)
 * Native: expo-print + expo-sharing
 *
 * PDF layout mirrors the on-screen grouped display exactly:
 *  - Product reports (StruXure/Screens/Pergotenda/Awnings): grouped by ready month
 *  - Supervisor Workload: grouped by supervisor → sub-grouped by month, BLOCKED section
 *  - Material Status: grouped by product type → sub-grouped by material status
 *  - Permit Status: two-column grid grouped by permit status category
 *  - Permit Date List / Blocked / Exceptions / Final: flat table
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
  if (Platform.OS === 'web') {
    await exportWebPDF(reportTitle, jobs, reportType, filename);
  } else {
    await exportNativePDF(reportTitle, jobs, reportType, filename);
  }
}

// ─── Web export ───────────────────────────────────────────────────────────────

async function exportWebPDF(
  reportTitle: string,
  jobs: JobData[],
  reportType: ReportType,
  filename: string,
): Promise<void> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const pdfDoc = await PDFDocument.create();
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const C = {
    brand: rgb(10 / 255, 126 / 255, 164 / 255),
    white: rgb(1, 1, 1),
    dark: rgb(0.12, 0.12, 0.12),
    gray: rgb(0.55, 0.55, 0.55),
    lightBg: rgb(0.97, 0.97, 0.97),
    surface: rgb(0.94, 0.94, 0.94),
    border: rgb(0.82, 0.82, 0.82),
    red: rgb(0.93, 0.27, 0.27),
    green: rgb(0.13, 0.77, 0.37),
    amber: rgb(0.96, 0.62, 0.04),
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const addPage = () => {
    const pg = pdfDoc.addPage([PAGE_W, PAGE_H]);
    // Brand header bar
    pg.drawRectangle({ x: 0, y: PAGE_H - 52, width: PAGE_W, height: 52, color: C.brand });
    pg.drawText('DOS Hub', { x: MARGIN, y: PAGE_H - 22, font: bold, size: 15, color: C.white });
    pg.drawText('Service Fusion — Job Intelligence Report', {
      x: MARGIN, y: PAGE_H - 38, font: regular, size: 8.5, color: rgb(0.88, 0.88, 0.88),
    });
    const titleW = bold.widthOfTextAtSize(reportTitle, 10);
    const dateW = regular.widthOfTextAtSize(dateStr, 8.5);
    pg.drawText(reportTitle, { x: PAGE_W - MARGIN - titleW, y: PAGE_H - 22, font: bold, size: 10, color: C.white });
    pg.drawText(dateStr, { x: PAGE_W - MARGIN - dateW, y: PAGE_H - 38, font: regular, size: 8.5, color: rgb(0.88, 0.88, 0.88) });
    // Footer
    pg.drawLine({ start: { x: MARGIN, y: 28 }, end: { x: PAGE_W - MARGIN, y: 28 }, thickness: 0.4, color: C.border });
    pg.drawText('© 2026 DOS Hub. Confidential.', { x: MARGIN, y: 14, font: regular, size: 7, color: C.gray });
    return pg;
  };

  // Mutable drawing state
  let page = addPage();
  let y = PAGE_H - 68;

  // ── Page title ──────────────────────────────────────────────────────────────
  page.drawText(reportTitle, { x: MARGIN, y, font: bold, size: 14, color: C.brand });
  y -= 14;
  page.drawText(
    `Generated: ${now.toLocaleString()} | Total Records: ${jobs.length}`,
    { x: MARGIN, y, font: regular, size: 7.5, color: C.gray },
  );
  y -= 18;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const checkPage = (needed: number) => {
    if (y - needed < 40) {
      page = addPage();
      y = PAGE_H - 68;
    }
  };

  const drawSectionHeader = (title: string, right?: string) => {
    checkPage(28);
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y: y - 2 }, end: { x: PAGE_W - MARGIN, y: y - 2 }, thickness: 1.2, color: C.dark });
    page.drawText(title, { x: MARGIN, y: y + 8, font: bold, size: 12, color: C.dark });
    if (right) {
      const rw = regular.widthOfTextAtSize(right, 8.5);
      page.drawText(right, { x: PAGE_W - MARGIN - rw, y: y + 8, font: regular, size: 8.5, color: C.gray });
    }
    y -= 18;
  };

  const drawSubHeader = (title: string, count?: number) => {
    checkPage(22);
    y -= 4;
    const label = count !== undefined ? `${title} (${count})` : title;
    page.drawText(label, { x: MARGIN, y, font: bold, size: 10, color: C.dark });
    y -= 4;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.4, color: C.border });
    y -= 10;
  };

  const ROW_H = 17;
  const HDR_H = 20;

  const drawTableHeader = (cols: { label: string; w: number }[]) => {
    checkPage(HDR_H + ROW_H);
    page.drawRectangle({ x: MARGIN, y, width: CONTENT_W, height: HDR_H, color: C.brand });
    let cx = MARGIN + 4;
    for (const col of cols) {
      page.drawText(col.label.toUpperCase(), { x: cx, y: y + 6, font: bold, size: 7, color: C.white });
      cx += col.w;
    }
    y -= HDR_H;
  };

  const drawTableRow = (
    cols: { text: string; w: number; color?: any }[],
    rowIdx: number,
  ) => {
    checkPage(ROW_H);
    if (rowIdx % 2 === 0) {
      page.drawRectangle({ x: MARGIN, y: y - ROW_H + HDR_H, width: CONTENT_W, height: ROW_H, color: C.lightBg });
    }
    page.drawLine({ start: { x: MARGIN, y: y - ROW_H + HDR_H }, end: { x: PAGE_W - MARGIN, y: y - ROW_H + HDR_H }, thickness: 0.25, color: C.border });
    let cx = MARGIN + 4;
    for (const col of cols) {
      const maxChars = Math.max(4, Math.floor(col.w / 5.0));
      const text = col.text.length > maxChars ? col.text.substring(0, maxChars - 1) + '…' : col.text;
      const textColor = col.color ?? C.dark;
      page.drawText(text, { x: cx, y: y - ROW_H + HDR_H + 4, font: regular, size: 7.5, color: textColor });
      cx += col.w;
    }
    y -= ROW_H;
  };

  const confidenceColor = (conf: string) => {
    if (conf === 'HARD' || conf === 'Confirmed') return C.green;
    if (conf === 'FORECAST' || conf === 'Estimated') return C.amber;
    if (conf === 'BLOCKED' || conf === 'Blocked') return C.red;
    return C.dark;
  };

  // ── Render by report type ───────────────────────────────────────────────────

  if (jobs.length === 0) {
    page.drawText('No data available for this report.', { x: MARGIN, y, font: regular, size: 11, color: C.gray });
  } else {
    switch (reportType) {

      // ── Product month-grouped (StruXure / Screens / Pergotenda / Awnings) ──
      case 'struXure':
      case 'screens':
      case 'pergotenda':
      case 'awnings': {
        const productKey: ProductKey =
          reportType === 'awnings' ? 'awning' : (reportType as ProductKey);
        const isScreens = productKey === 'screens';
        const isStruXure = productKey === 'struXure';

        // Group by readyMonth
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
          const totalSF = isStruXure ? groupJobs.reduce((s, j) => s + (j.struXure?.sf ?? 0), 0) : 0;
          const totalZones = isStruXure ? groupJobs.reduce((s, j) => s + (j.struXure?.zones ?? 0), 0) : 0;
          const rightSummary = isScreens
            ? `${groupJobs.length} Jobs${totalQty ? ` | ${totalQty} Screens` : ''}`
            : isStruXure
            ? `${groupJobs.length} Jobs${totalSF ? ` | ${totalSF} SF` : ''}${totalZones ? ` | ${totalZones} Zones` : ''}`
            : `${groupJobs.length} Jobs`;

          drawSectionHeader(month, rightSummary);

          if (isScreens) {
            drawTableHeader([
              { label: 'Customer', w: 140 },
              { label: 'Qty', w: 36 },
              { label: 'Manufacturer', w: 90 },
              { label: 'Supervisor', w: 90 },
              { label: 'Source', w: 90 },
              { label: 'Conf', w: 86 },
            ]);
            groupJobs.forEach((job, idx) => {
              const p = job.screens!;
              drawTableRow([
                { text: job.customer, w: 140 },
                { text: p.quantity ? String(p.quantity) : '—', w: 36 },
                { text: p.manufacturer || '—', w: 90 },
                { text: job.projectSupervisor || '—', w: 90 },
                { text: p.sourceLabel || p.status, w: 90 },
                { text: p.confidence, w: 86, color: confidenceColor(p.confidence) },
              ], idx);
            });
          } else if (isStruXure) {
            drawTableHeader([
              { label: 'Customer', w: 150 },
              { label: 'SF', w: 40 },
              { label: 'Zones', w: 44 },
              { label: 'Supervisor', w: 90 },
              { label: 'Source', w: 90 },
              { label: 'Conf', w: 118 },
            ]);
            groupJobs.forEach((job, idx) => {
              const p = job.struXure!;
              drawTableRow([
                { text: job.customer, w: 150 },
                { text: p.sf ? String(p.sf) : '—', w: 40 },
                { text: p.zones ? String(p.zones) : '—', w: 44 },
                { text: job.projectSupervisor || '—', w: 90 },
                { text: p.sourceLabel || p.status, w: 90 },
                { text: p.confidence, w: 118, color: confidenceColor(p.confidence) },
              ], idx);
            });
          } else {
            drawTableHeader([
              { label: 'Customer', w: 180 },
              { label: 'Supervisor', w: 120 },
              { label: 'Source', w: 120 },
              { label: 'Conf', w: 112 },
            ]);
            groupJobs.forEach((job, idx) => {
              const p = job[productKey]!;
              drawTableRow([
                { text: job.customer, w: 180 },
                { text: job.projectSupervisor || '—', w: 120 },
                { text: p.sourceLabel || p.status, w: 120 },
                { text: p.confidence, w: 112, color: confidenceColor(p.confidence) },
              ], idx);
            });
          }
        }
        break;
      }

      // ── Supervisor Workload ─────────────────────────────────────────────────
      case 'supervisor-workload': {
        const supMap = new Map<string, JobData[]>();
        for (const job of jobs) {
          const sup = job.projectSupervisor || 'Unassigned';
          if (!supMap.has(sup)) supMap.set(sup, []);
          supMap.get(sup)!.push(job);
        }
        const supGroups = Array.from(supMap.entries()).sort(([a], [b]) => a.localeCompare(b));

        for (const [supervisor, supJobs] of supGroups) {
          const totalUnits = supJobs.reduce((sum, job) => {
            let c = 0;
            if (job.struXure) c++;
            if (job.screens) c++;
            if (job.pergotenda) c++;
            if (job.awning) c++;
            return sum + c;
          }, 0);

          drawSectionHeader(supervisor, `${supJobs.length} Jobs · ${totalUnits} Units`);

          const blockedJobs = supJobs.filter(
            (j) =>
              j.struXure?.confidence === 'BLOCKED' ||
              j.screens?.confidence === 'BLOCKED' ||
              j.pergotenda?.confidence === 'BLOCKED' ||
              j.awning?.confidence === 'BLOCKED',
          );
          const activeJobs = supJobs.filter((j) => !blockedJobs.includes(j));

          // Group active by earliest ready month
          const monthMap = new Map<string, { job: JobData; products: string[] }[]>();
          for (const job of activeJobs) {
            const months = [
              job.struXure?.readyMonth,
              job.screens?.readyMonth,
              job.pergotenda?.readyMonth,
              job.awning?.readyMonth,
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
          const sortedMonths = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b));

          for (const [month, entries] of sortedMonths) {
            drawSubHeader(month, entries.length);
            entries.forEach(({ job, products }, idx) => {
              checkPage(ROW_H);
              if (idx % 2 === 0) {
                page.drawRectangle({ x: MARGIN, y: y - ROW_H + HDR_H, width: CONTENT_W, height: ROW_H, color: C.lightBg });
              }
              page.drawLine({ start: { x: MARGIN, y: y - ROW_H + HDR_H }, end: { x: PAGE_W - MARGIN, y: y - ROW_H + HDR_H }, thickness: 0.25, color: C.border });
              page.drawText(job.customer, { x: MARGIN + 12, y: y - ROW_H + HDR_H + 4, font: regular, size: 8, color: C.dark });
              const prodStr = `(${products.join(', ')})`;
              const prodW = regular.widthOfTextAtSize(prodStr, 7.5);
              page.drawText(prodStr, { x: PAGE_W - MARGIN - prodW, y: y - ROW_H + HDR_H + 4, font: regular, size: 7.5, color: C.gray });
              y -= ROW_H;
            });
          }

          if (blockedJobs.length > 0) {
            drawSubHeader('BLOCKED', blockedJobs.length);
            blockedJobs.forEach((job, idx) => {
              const blockedProducts: string[] = [];
              if (job.struXure?.confidence === 'BLOCKED') blockedProducts.push('StruXure');
              if (job.screens?.confidence === 'BLOCKED') blockedProducts.push('Screens');
              if (job.pergotenda?.confidence === 'BLOCKED') blockedProducts.push('Pergotenda');
              if (job.awning?.confidence === 'BLOCKED') blockedProducts.push('Awning');
              checkPage(ROW_H);
              if (idx % 2 === 0) {
                page.drawRectangle({ x: MARGIN, y: y - ROW_H + HDR_H, width: CONTENT_W, height: ROW_H, color: C.lightBg });
              }
              page.drawLine({ start: { x: MARGIN, y: y - ROW_H + HDR_H }, end: { x: PAGE_W - MARGIN, y: y - ROW_H + HDR_H }, thickness: 0.25, color: C.border });
              page.drawText(job.customer, { x: MARGIN + 12, y: y - ROW_H + HDR_H + 4, font: regular, size: 8, color: C.dark });
              const prodStr = `(${blockedProducts.join(', ')})`;
              const prodW = regular.widthOfTextAtSize(prodStr, 7.5);
              page.drawText(prodStr, { x: PAGE_W - MARGIN - prodW, y: y - ROW_H + HDR_H + 4, font: regular, size: 7.5, color: C.red });
              y -= ROW_H;
            });
          }
        }
        break;
      }

      // ── Material Status ─────────────────────────────────────────────────────
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
            status: s,
            groupJobs: statusGroups.get(s) || [],
          })).filter((g) => g.groupJobs.length > 0);
          for (const [status, groupJobs] of statusGroups.entries()) {
            if (!MATERIAL_STATUSES.includes(status)) sortedGroups.push({ status, groupJobs });
          }

          drawSectionHeader(label, `${productJobs.length} Jobs`);

          for (const { status, groupJobs } of sortedGroups) {
            drawSubHeader(status, groupJobs.length);

            // Two-column layout
            const colW = CONTENT_W / 2;
            for (let i = 0; i < groupJobs.length; i += 2) {
              checkPage(ROW_H);
              const left = groupJobs[i].customer;
              const right = groupJobs[i + 1]?.customer;
              if (i % 4 === 0) {
                page.drawRectangle({ x: MARGIN, y: y - ROW_H + HDR_H, width: CONTENT_W, height: ROW_H, color: C.lightBg });
              }
              page.drawLine({ start: { x: MARGIN, y: y - ROW_H + HDR_H }, end: { x: PAGE_W - MARGIN, y: y - ROW_H + HDR_H }, thickness: 0.25, color: C.border });
              const maxChars = Math.floor(colW / 5.0) - 2;
              const leftTxt = left.length > maxChars ? left.substring(0, maxChars - 1) + '…' : left;
              page.drawText(leftTxt, { x: MARGIN + 4, y: y - ROW_H + HDR_H + 4, font: regular, size: 7.5, color: C.dark });
              if (right) {
                const rightTxt = right.length > maxChars ? right.substring(0, maxChars - 1) + '…' : right;
                page.drawText(rightTxt, { x: MARGIN + colW + 4, y: y - ROW_H + HDR_H + 4, font: regular, size: 7.5, color: C.dark });
              }
              y -= ROW_H;
            }
          }
        }
        break;
      }

      // ── Permit Status ───────────────────────────────────────────────────────
      case 'permit-status': {
        const statusMap = new Map<string, JobData[]>();
        for (const job of jobs) {
          const status = job.permitStatus || 'Unknown';
          if (!statusMap.has(status)) statusMap.set(status, []);
          statusMap.get(status)!.push(job);
        }

        const sortedGroups = PERMIT_STATUS_ORDER.map((s) => ({
          status: s,
          groupJobs: statusMap.get(s) || [],
        })).filter((g) => g.groupJobs.length > 0);
        for (const [status, groupJobs] of statusMap.entries()) {
          if (!PERMIT_STATUS_ORDER.includes(status)) sortedGroups.push({ status, groupJobs });
        }

        // Two-column grid: each status category side-by-side
        const colW = CONTENT_W / 2;
        for (let gi = 0; gi < sortedGroups.length; gi += 2) {
          const left = sortedGroups[gi];
          const right = sortedGroups[gi + 1];
          const maxRows = Math.max(left.groupJobs.length, right?.groupJobs.length ?? 0);
          const blockH = 20 + maxRows * 14 + 12;
          checkPage(blockH);

          // Left column header
          page.drawText(`${left.status} (${left.groupJobs.length})`, {
            x: MARGIN, y, font: bold, size: 10, color: C.dark,
          });
          page.drawLine({ start: { x: MARGIN, y: y - 3 }, end: { x: MARGIN + colW - 8, y: y - 3 }, thickness: 0.8, color: C.dark });

          // Right column header
          if (right) {
            page.drawText(`${right.status} (${right.groupJobs.length})`, {
              x: MARGIN + colW, y, font: bold, size: 10, color: C.dark,
            });
            page.drawLine({ start: { x: MARGIN + colW, y: y - 3 }, end: { x: PAGE_W - MARGIN, y: y - 3 }, thickness: 0.8, color: C.dark });
          }
          y -= 16;

          for (let ri = 0; ri < maxRows; ri++) {
            const lJob = left.groupJobs[ri];
            const rJob = right?.groupJobs[ri];
            if (lJob) {
              const txt = lJob.customer.length > 28 ? lJob.customer.substring(0, 27) + '…' : lJob.customer;
              page.drawText(txt, { x: MARGIN + 2, y, font: regular, size: 8, color: C.dark });
            }
            if (rJob) {
              const txt = rJob.customer.length > 28 ? rJob.customer.substring(0, 27) + '…' : rJob.customer;
              page.drawText(txt, { x: MARGIN + colW + 2, y, font: regular, size: 8, color: C.dark });
            }
            y -= 13;
          }
          y -= 10;
        }
        break;
      }

      // ── Permit Date List ────────────────────────────────────────────────────
      case 'permit-date-list': {
        const sorted = [...jobs].sort((a, b) => {
          const da = a.permitApprovalDate || 'ZZZZ';
          const db = b.permitApprovalDate || 'ZZZZ';
          return da.localeCompare(db);
        });
        drawTableHeader([
          { label: 'Customer', w: 220 },
          { label: 'Permit Status', w: 160 },
          { label: 'Approval Date', w: 152 },
        ]);
        sorted.forEach((job, idx) => {
          drawTableRow([
            { text: job.customer, w: 220 },
            { text: job.permitStatus || '—', w: 160 },
            { text: job.permitApprovalDate || 'TBD', w: 152 },
          ], idx);
        });
        break;
      }

      // ── Blocked ─────────────────────────────────────────────────────────────
      case 'blocked': {
        drawTableHeader([
          { label: 'Customer', w: 200 },
          { label: 'Supervisor', w: 140 },
          { label: 'Blocked Products', w: 192 },
        ]);
        jobs.forEach((job, idx) => {
          const blocked: string[] = [];
          if (job.struXure?.confidence === 'BLOCKED') blocked.push('StruXure');
          if (job.screens?.confidence === 'BLOCKED') blocked.push('Screens');
          if (job.pergotenda?.confidence === 'BLOCKED') blocked.push('Pergotenda');
          if (job.awning?.confidence === 'BLOCKED') blocked.push('Awning');
          drawTableRow([
            { text: job.customer, w: 200 },
            { text: job.projectSupervisor || '—', w: 140 },
            { text: blocked.join(', '), w: 192, color: C.red },
          ], idx);
        });
        break;
      }

      // ── Final / All Jobs / Exceptions / DOS-MagnaTrack (flat table) ─────────
      default: {
        drawTableHeader([
          { label: 'Customer', w: 180 },
          { label: 'Supervisor', w: 120 },
          { label: 'Ready Month', w: 90 },
          { label: 'Confidence', w: 80 },
          { label: 'Products', w: 62 },
        ]);
        jobs.forEach((job, idx) => {
          const months = [
            job.struXure?.readyMonth,
            job.screens?.readyMonth,
            job.pergotenda?.readyMonth,
            job.awning?.readyMonth,
          ].filter(Boolean) as string[];
          const readyMonth = months.sort().reverse()[0] || 'N/A';
          const confidences = [
            job.struXure?.confidence,
            job.screens?.confidence,
            job.pergotenda?.confidence,
            job.awning?.confidence,
          ].filter(Boolean);
          const conf = confidences.includes('BLOCKED')
            ? 'BLOCKED'
            : confidences.includes('FORECAST')
            ? 'FORECAST'
            : 'HARD';
          const products: string[] = [];
          if (job.struXure) products.push('SX');
          if (job.screens) products.push('SC');
          if (job.pergotenda) products.push('PG');
          if (job.awning) products.push('AW');
          drawTableRow([
            { text: job.customer, w: 180 },
            { text: job.projectSupervisor || '—', w: 120 },
            { text: readyMonth, w: 90 },
            { text: conf, w: 80, color: confidenceColor(conf) },
            { text: products.join('/'), w: 62 },
          ], idx);
        });
        break;
      }
    }
  }

  // ── Download ──────────────────────────────────────────────────────────────
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
  filename: string,
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

// ─── HTML generator (native only) ────────────────────────────────────────────

function generateReportHTML(
  reportTitle: string,
  jobs: JobData[],
  reportType: ReportType,
): string {
  const timestamp = new Date().toLocaleString();
  let bodyContent = '';

  if (jobs.length === 0) {
    bodyContent = '<p style="color:#999">No data available for this report.</p>';
  } else {
    switch (reportType) {
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
          const totalSF = isStruXure ? groupJobs.reduce((s, j) => s + (j.struXure?.sf ?? 0), 0) : 0;
          const totalZones = isStruXure ? groupJobs.reduce((s, j) => s + (j.struXure?.zones ?? 0), 0) : 0;
          const summary = isScreens
            ? `${groupJobs.length} Jobs${totalQty ? ` | ${totalQty} Screens` : ''}`
            : isStruXure
            ? `${groupJobs.length} Jobs${totalSF ? ` | ${totalSF} SF` : ''}${totalZones ? ` | ${totalZones} Zones` : ''}`
            : `${groupJobs.length} Jobs`;
          bodyContent += `<div class="section-header"><span>${month}</span><span class="muted">${summary}</span></div>`;
          bodyContent += '<table><thead><tr>';
          if (isScreens) bodyContent += '<th>Customer</th><th>Qty</th><th>Manufacturer</th><th>Supervisor</th><th>Source</th><th>Conf.</th>';
          else if (isStruXure) bodyContent += '<th>Customer</th><th>SF</th><th>Zones</th><th>Supervisor</th><th>Source</th><th>Conf.</th>';
          else bodyContent += '<th>Customer</th><th>Supervisor</th><th>Source</th><th>Conf.</th>';
          bodyContent += '</tr></thead><tbody>';
          groupJobs.forEach((job, idx) => {
            const p = job[productKey]!;
            const confClass = p.confidence === 'HARD' ? 'green' : p.confidence === 'FORECAST' ? 'amber' : 'red';
            bodyContent += `<tr class="${idx % 2 === 0 ? 'alt' : ''}">`;
            bodyContent += `<td><strong>${job.customer}</strong></td>`;
            if (isScreens) {
              bodyContent += `<td>${p.quantity ?? '—'}</td><td>${p.manufacturer || '—'}</td>`;
            } else if (isStruXure) {
              bodyContent += `<td>${(p as any).sf ?? '—'}</td><td>${(p as any).zones ?? '—'}</td>`;
            }
            bodyContent += `<td>${job.projectSupervisor || '—'}</td><td>${p.sourceLabel || p.status}</td>`;
            bodyContent += `<td class="${confClass}">${p.confidence}</td></tr>`;
          });
          bodyContent += '</tbody></table>';
        }
        break;
      }

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
          bodyContent += `<div class="section-header"><span>${supervisor}</span><span class="muted">${supJobs.length} Jobs · ${totalUnits} Units</span></div>`;
          const blockedJobs = supJobs.filter(j => j.struXure?.confidence === 'BLOCKED' || j.screens?.confidence === 'BLOCKED' || j.pergotenda?.confidence === 'BLOCKED' || j.awning?.confidence === 'BLOCKED');
          const activeJobs = supJobs.filter(j => !blockedJobs.includes(j));
          const monthMap = new Map<string, { job: JobData; products: string[] }[]>();
          for (const job of activeJobs) {
            const months = [job.struXure?.readyMonth, job.screens?.readyMonth, job.pergotenda?.readyMonth, job.awning?.readyMonth].filter(Boolean) as string[];
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
            bodyContent += `<div class="sub-header">${month} (${entries.length})</div>`;
            bodyContent += '<ul>';
            entries.forEach(({ job, products }) => {
              bodyContent += `<li>${job.customer} <span class="muted">(${products.join(', ')})</span></li>`;
            });
            bodyContent += '</ul>';
          }
          if (blockedJobs.length > 0) {
            bodyContent += `<div class="sub-header red">BLOCKED (${blockedJobs.length})</div><ul>`;
            blockedJobs.forEach(job => {
              const bp: string[] = [];
              if (job.struXure?.confidence === 'BLOCKED') bp.push('StruXure');
              if (job.screens?.confidence === 'BLOCKED') bp.push('Screens');
              if (job.pergotenda?.confidence === 'BLOCKED') bp.push('Pergotenda');
              if (job.awning?.confidence === 'BLOCKED') bp.push('Awning');
              bodyContent += `<li>${job.customer} <span class="red">(${bp.join(', ')})</span></li>`;
            });
            bodyContent += '</ul>';
          }
        }
        break;
      }

      case 'material-status': {
        const PRODUCT_TYPES: { key: ProductKey; label: string }[] = [
          { key: 'struXure', label: 'StruXure' },
          { key: 'screens', label: 'Screens' },
          { key: 'pergotenda', label: 'Pergotenda' },
          { key: 'awning', label: 'Awning' },
        ];
        for (const { key, label } of PRODUCT_TYPES) {
          const productJobs = jobs.filter(j => j[key]);
          if (productJobs.length === 0) continue;
          const statusGroups = new Map<string, JobData[]>();
          for (const job of productJobs) {
            const status = job[key]!.materialStatus || 'Not Yet Ordered';
            if (!statusGroups.has(status)) statusGroups.set(status, []);
            statusGroups.get(status)!.push(job);
          }
          const sortedGroups = MATERIAL_STATUSES.map(s => ({ status: s, groupJobs: statusGroups.get(s) || [] })).filter(g => g.groupJobs.length > 0);
          for (const [status, groupJobs] of statusGroups.entries()) {
            if (!MATERIAL_STATUSES.includes(status)) sortedGroups.push({ status, groupJobs });
          }
          bodyContent += `<div class="section-header"><span>${label}</span><span class="muted">${productJobs.length} Jobs</span></div>`;
          for (const { status, groupJobs } of sortedGroups) {
            bodyContent += `<div class="sub-header">${status} (${groupJobs.length})</div>`;
            bodyContent += '<div class="two-col">';
            groupJobs.forEach(job => { bodyContent += `<div>${job.customer}</div>`; });
            bodyContent += '</div>';
          }
        }
        break;
      }

      case 'permit-status': {
        const statusMap = new Map<string, JobData[]>();
        for (const job of jobs) {
          const status = job.permitStatus || 'Unknown';
          if (!statusMap.has(status)) statusMap.set(status, []);
          statusMap.get(status)!.push(job);
        }
        const sortedGroups = PERMIT_STATUS_ORDER.map(s => ({ status: s, groupJobs: statusMap.get(s) || [] })).filter(g => g.groupJobs.length > 0);
        for (const [status, groupJobs] of statusMap.entries()) {
          if (!PERMIT_STATUS_ORDER.includes(status)) sortedGroups.push({ status, groupJobs });
        }
        bodyContent += '<div class="permit-grid">';
        for (const { status, groupJobs } of sortedGroups) {
          bodyContent += `<div class="permit-col"><div class="permit-col-header">${status} (${groupJobs.length})</div>`;
          groupJobs.forEach(job => { bodyContent += `<div class="permit-item">${job.customer}</div>`; });
          bodyContent += '</div>';
        }
        bodyContent += '</div>';
        break;
      }

      default: {
        bodyContent += '<table><thead><tr><th>Customer</th><th>Supervisor</th><th>Permit Status</th><th>Approval Date</th></tr></thead><tbody>';
        jobs.forEach((job, idx) => {
          bodyContent += `<tr class="${idx % 2 === 0 ? 'alt' : ''}"><td><strong>${job.customer}</strong></td><td>${job.projectSupervisor || '—'}</td><td>${job.permitStatus || '—'}</td><td>${job.permitApprovalDate || 'TBD'}</td></tr>`;
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
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,sans-serif; background:#fff; color:#1a1a1a; font-size:11px; }
    .container { max-width:8.5in; margin:0 auto; padding:0.5in; }
    .header { background:#0A7EA4; color:#fff; padding:14px 24px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; }
    .header h1 { font-size:20px; } .header p { font-size:10px; opacity:0.85; }
    .header-right { text-align:right; }
    .report-title { font-size:16px; font-weight:bold; color:#0A7EA4; margin-bottom:3px; }
    .report-meta { font-size:9px; color:#999; margin-bottom:14px; }
    .section-header { display:flex; justify-content:space-between; align-items:baseline; border-bottom:1.5px solid #1a1a1a; padding:12px 0 4px; margin-top:16px; font-size:13px; font-weight:700; }
    .sub-header { font-size:11px; font-weight:600; padding:8px 0 3px; border-bottom:0.5px solid #ddd; margin-top:6px; }
    .sub-header.red { color:#ef4444; }
    .muted { color:#999; font-weight:400; font-size:10px; }
    table { width:100%; border-collapse:collapse; margin-top:4px; }
    thead { background:#0A7EA4; color:#fff; }
    th { padding:6px 8px; font-size:9px; text-align:left; }
    td { padding:5px 8px; font-size:10px; border-bottom:0.5px solid #eee; }
    tr.alt td { background:#f9f9f9; }
    .green { color:#16a34a; font-weight:600; }
    .amber { color:#d97706; font-weight:600; }
    .red { color:#ef4444; font-weight:600; }
    ul { list-style:none; padding:0; margin:0; }
    li { padding:4px 8px; border-bottom:0.5px solid #f0f0f0; font-size:10px; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:2px 16px; padding:4px 0; }
    .two-col div { font-size:10px; padding:3px 0; border-bottom:0.5px solid #f5f5f5; }
    .permit-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:8px; }
    .permit-col-header { font-size:11px; font-weight:700; border-bottom:1px solid #1a1a1a; padding-bottom:3px; margin-bottom:4px; }
    .permit-item { font-size:10px; padding:2px 0; border-bottom:0.5px solid #f0f0f0; }
    .footer { margin-top:20px; border-top:0.5px solid #eee; padding-top:10px; font-size:8px; color:#aaa; text-align:center; }
    @media print { body { -webkit-print-color-adjust:exact; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div><h1>DOS Hub</h1><p>Service Fusion — Job Intelligence Report</p></div>
      <div class="header-right"><strong>${reportTitle}</strong><br><span style="font-size:10px;opacity:0.85">${timestamp}</span></div>
    </div>
    <div class="report-title">${reportTitle}</div>
    <div class="report-meta">Generated: ${timestamp} | Total Records: ${jobs.length}</div>
    ${bodyContent}
    <div class="footer"><p>© 2026 DOS Hub. All rights reserved.</p></div>
  </div>
</body>
</html>`;
}
