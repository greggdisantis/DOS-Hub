/**
 * Client Meeting Report — PDF Export
 *
 * Web:    html2pdf.js captures the actual visible report DOM element → direct download
 * Native: expo-print + expo-sharing → share sheet
 */

import { Platform } from 'react-native';
import {
  ClientMeetingReport,
  DEAL_STATUS_LABELS,
  LEAD_SOURCE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  VALUE_COMMUNICATED_OPTIONS,
  OBJECTION_OPTIONS,
  MESSAGING_OPTIONS,
} from './types';

// ── Filename ──────────────────────────────────────────────────────────────────

function buildFilename(clientName: string): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const safe = clientName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
  return `DOS_Hub _ Client_Meeting_Report _ ${safe} _ ${mm}-${dd}-${yyyy}.pdf`;
}

// ── Main export entry ─────────────────────────────────────────────────────────

export async function exportMeetingReportPDF(
  report: ClientMeetingReport,
  reportElement?: HTMLElement | null,
): Promise<void> {
  const filename = buildFilename(report.clientName || 'Unknown_Client');

  if (Platform.OS === 'web') {
    if (reportElement) {
      await exportWebPDFFromElement(reportElement, filename);
    } else {
      const html = generateReportHTML(report);
      await exportWebPDFFallback(html, filename);
    }
  } else {
    const html = generateReportHTML(report);
    await exportNativePDF(html, filename, report.clientName);
  }
}

// ── Web: capture visible element ──────────────────────────────────────────────

async function exportWebPDFFromElement(el: HTMLElement, filename: string): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;

  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .pdf-export, .pdf-export * {
      color: #1a1a1a !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .pdf-export {
      background-color: #ffffff !important;
      padding: 16px !important;
    }
    .pdf-export div, .pdf-export span {
      overflow: visible !important;
      text-overflow: clip !important;
      line-height: 1.5 !important;
    }
  `;
  document.head.appendChild(styleTag);
  el.classList.add('pdf-export');

  try {
    await (html2pdf() as any).set({
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        letterRendering: true,
        windowWidth: el.scrollWidth + 40,
      },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(el).save();
  } finally {
    el.classList.remove('pdf-export');
    document.head.removeChild(styleTag);
  }
}

async function exportWebPDFFallback(html: string, filename: string): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;

  // Use opacity:0 + pointer-events:none so html2canvas CAN capture it
  // (visibility:hidden / display:none cause blank output)
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.minHeight = '1000px';
  container.style.background = '#ffffff';
  container.style.opacity = '0.01'; // near-invisible but still rendered by browser
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  container.style.overflow = 'visible';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Give browser two full paint cycles to lay out and render the content
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise(resolve => setTimeout(resolve, 400));

    await (html2pdf() as any).set({
      margin: [10, 10, 10, 10],
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        removeContainer: false,
      },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] },
    }).from(container).save();
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

// ── Native: expo-print + sharing ──────────────────────────────────────────────

async function exportNativePDF(html: string, filename: string, clientName: string): Promise<void> {
  const Print = await import('expo-print');
  const FileSystem = await import('expo-file-system/legacy');
  const Sharing = await import('expo-sharing');

  const { uri } = await Print.printToFileAsync({ html });
  const dest = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: `Share ${clientName} Report` });
}

// ── HTML generator ────────────────────────────────────────────────────────────

function label(options: { value: string; label: string }[], values: string[]): string {
  return values.map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ') || '—';
}

function fmt(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function row(key: string, value: string): string {
  return `<tr><td class="key">${key}</td><td class="val">${value || '—'}</td></tr>`;
}

export function generateReportHTML(report: ClientMeetingReport): string {
  const dealLabel = report.dealStatus ? (DEAL_STATUS_LABELS[report.dealStatus] ?? report.dealStatus) : '—';
  const isMarketingLead = report.source === 'marketing-in-home' || report.source === 'marketing-showroom';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Client Meeting Report — ${report.clientName}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; margin: 0; padding: 0; }
  .page { padding: 28px 32px; max-width: 760px; margin: 0 auto; }
  h1 { font-size: 17px; font-weight: bold; color: #0a3d6b; margin: 0 0 2px; }
  .subtitle { font-size: 11px; color: #555; margin-bottom: 18px; }
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section-title {
    font-size: 11px; font-weight: bold; text-transform: uppercase;
    letter-spacing: 0.08em; color: #0a3d6b;
    border-bottom: 1.5px solid #0a3d6b; padding-bottom: 3px; margin-bottom: 8px;
  }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 6px; vertical-align: top; }
  td.key { width: 38%; color: #555; font-weight: 600; }
  td.val { color: #1a1a1a; }
  tr:nth-child(even) td { background: #f7f9fc; }
  .pc-badge {
    display: inline-block; background: #0a3d6b; color: #fff;
    font-size: 14px; font-weight: bold; padding: 4px 14px; border-radius: 20px;
  }
  .footer { margin-top: 24px; font-size: 9px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 8px; }
</style>
</head>
<body>
<div class="page">
  <h1>Consultants Weekly Sales Report</h1>
  <div class="subtitle">DOS Hub &nbsp;·&nbsp; Generated ${new Date().toLocaleString()}</div>

  <!-- Section 1: Client Info -->
  <div class="section">
    <div class="section-title">Client Information</div>
    <table>
      ${row('Consultant', report.consultantName)}
      ${row('Week Of', fmt(report.weekOf))}
      ${row('Source', report.source === 'marketing-in-home' ? 'Marketing – In-Home' : report.source === 'marketing-showroom' ? 'Marketing – Showroom' : report.source === 'self-generated' ? 'Self-Generated' : '—')}
      ${row('Client', report.clientName)}
      ${row('Address', report.address)}
      ${row('Client Type', report.clientType === 'residential' ? 'Residential' : report.clientType === 'commercial' ? 'Commercial' : '—')}
      ${row('Appointment Date', fmt(report.appointmentDate))}
      ${row('Appointment Type', report.appointmentType === 'in-home' ? 'In-Home' : report.appointmentType === 'showroom' ? 'Showroom' : report.appointmentType === 'phone' ? 'Phone' : '—')}
      ${report.appointmentType === 'phone' ? row('Converted to In-Person?', report.convertedToInPerson ? `Yes — ${report.convertedType ?? ''} on ${fmt(report.convertedDate)}` : 'No') : ''}
      ${row('Lead Source(s)', label(LEAD_SOURCE_OPTIONS, report.leadSources))}
      ${row('Project Type(s)', label(PROJECT_TYPE_OPTIONS, report.projectTypes))}
    </table>
  </div>

  <!-- Section 2: Deal Status -->
  <div class="section">
    <div class="section-title">Deal Status</div>
    <table>
      ${row('Status', dealLabel)}
      ${report.dealStatus === 'working-design' ? row('Follow-Up Date', report.followUpDate ? fmt(report.followUpDate) : (report.noFollowUpReason ? `Not set — ${report.noFollowUpReason}` : '—')) : ''}
      ${report.dealStatus === 'proposal-presented' ? row('Proposal Date', fmt(report.proposalDate)) : ''}
      ${report.dealStatus === 'lost' ? row('Lost Reason', report.lostReason ?? '—') : ''}
      ${row('Estimated Close Timeline', report.closeTimeline ? `${report.closeTimeline} days` : '—')}
      ${row('Summary of Last Conversation', report.lastConversationSummary)}
    </table>
  </div>

  <!-- Section 3: Purchase Confidence -->
  <div class="section">
    <div class="section-title">Purchase Confidence</div>
    <table>
      <tr><td class="key">PC %</td><td class="val"><span class="pc-badge">${report.purchaseConfidencePct}%</span></td></tr>
      ${row('Decision Makers Involved', report.decisionMakers)}
      ${row('Main Motivation', report.mainMotivation)}
      ${row('Main Hesitation / Objection', report.mainHesitation)}
      ${row('PC Notes', report.pcNotes)}
    </table>
  </div>

  <!-- Section 4: Value & Objections -->
  <div class="section">
    <div class="section-title">Value Communicated &amp; Objections</div>
    <table>
      ${row('Financing Discussed?', report.financingDiscussed === true ? 'Yes' : report.financingDiscussed === false ? 'No' : '—')}
      ${report.financingDiscussed ? row('Client Reaction', report.financingReaction === 'interested' ? 'Interested' : report.financingReaction === 'needs-followup' ? 'Needs Follow-Up' : report.financingReaction === 'declined' ? 'Declined' : '—') : ''}
      ${row('Value Communicated', label(VALUE_COMMUNICATED_OPTIONS, report.valueCommunicated))}
      ${row('Client Response', report.clientResponse === 'strong-alignment' ? 'Strong Alignment' : report.clientResponse === 'neutral' ? 'Neutral' : report.clientResponse === 'price-focused' ? 'Price-Focused' : report.clientResponse === 'comparing-online' ? 'Comparing Online/Low-Cost' : '—')}
      ${row('Objections', label(OBJECTION_OPTIONS, report.objections))}
      ${row('Objection Notes', report.objectionNotes)}
    </table>
  </div>

  <!-- Section 5: Next Steps -->
  <div class="section">
    <div class="section-title">Next Steps</div>
    <table>
      ${row('Next Action(s)', report.nextActions.map((a) => ({
        'followup-call': 'Follow-Up Call',
        'design-revision': 'Design Revision',
        'financing-followup': 'Financing Follow-Up',
        'showroom-visit': 'Showroom Visit',
        'site-revisit': 'Site Revisit',
      }[a] ?? a)).join(', ') || '—')}
      ${row('Next Follow-Up Date', fmt(report.nextFollowUpDate))}
    </table>
  </div>

  ${isMarketingLead ? `
  <!-- Section 6: Marketing Feedback -->
  <div class="section">
    <div class="section-title">Marketing Feedback</div>
    <table>
      ${row('Lead Quality', report.leadQuality ? report.leadQuality.charAt(0).toUpperCase() + report.leadQuality.slice(1) : '—')}
      ${row('Expectation Alignment', report.expectationAlignment === 'yes' ? 'Yes – Expectations aligned' : report.expectationAlignment === 'somewhat' ? 'Somewhat' : report.expectationAlignment === 'no' ? 'No – Mismatch' : '—')}
      ${row('Messaging Referenced', label(MESSAGING_OPTIONS, report.messagingReferenced))}
      ${row('Budget Alignment', report.budgetAlignment === 'aligned' ? 'Aligned' : report.budgetAlignment === 'slightly-below' ? 'Slightly below realistic range' : report.budgetAlignment === 'significantly-below' ? 'Significantly below realistic range' : '—')}
      ${row('Marketing Notes', report.marketingNotes)}
    </table>
  </div>
  ` : ''}

  <div class="footer">DOS Hub &nbsp;·&nbsp; Client Meeting Report &nbsp;·&nbsp; ${report.clientName} &nbsp;·&nbsp; ${fmt(report.appointmentDate)}</div>
</div>
</body>
</html>`;
}
