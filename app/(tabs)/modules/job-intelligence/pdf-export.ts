/**
 * Job Intelligence Module - PDF Export
 * Generates professional PDF reports for job readiness analysis
 */

import type { ProcessedJob } from './types';
import { Confidence } from './types';
import { formatReadableDate, formatYearMonth } from './dateUtils';

/**
 * Generates HTML for a job readiness PDF report
 */
export function generateJobIntelligencePdfHtml(job: ProcessedJob): string {
  const canonical = job.canonical;
  const readiness = job.readiness;

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HARD':
        return '#22C55E';
      case 'FORECAST':
        return '#F59E0B';
      case 'BLOCKED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
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
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Not provided';
    return formatReadableDate(date);
  };

  const renderProductReadiness = (product: string, result: any) => {
    if (!result) return '';

    return `
      <div style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${product}</h3>
          <span style="background-color: ${getConfidenceColor(result.confidence)}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">
            ${getConfidenceLabel(result.confidence)}
          </span>
        </div>

        ${result.readyMonth ? `
          <div style="margin-bottom: 8px;">
            <strong style="color: #374151;">Ready Month:</strong>
            <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${result.readyMonth}</span>
          </div>
        ` : ''}

        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Source:</strong>
          <span style="color: #6b7280; font-size: 14px;">${result.sourceLabel}</span>
        </div>

        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Calculation Trace:</strong>
          <div style="color: #6b7280; font-size: 12px; line-height: 1.6; background-color: #f9fafb; padding: 8px; border-radius: 4px; margin-top: 4px;">
            ${result.detailTrace.split(' -> ').map((step: string) => `<div>→ ${step}</div>`).join('')}
          </div>
        </div>

        ${result.exceptions.length > 0 ? `
          <div style="margin-top: 12px; padding: 8px; background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
            <strong style="color: #991b1b; font-size: 12px;">Issues:</strong>
            <ul style="margin: 4px 0 0 0; padding-left: 20px; color: #991b1b; font-size: 12px;">
              ${result.exceptions.map((exc: string) => `<li>${exc}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Job Intelligence Report - ${canonical.Customer}</title>
      <style>
        @page {
          size: letter;
          margin: 0.5in;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: white;
        }
        .header {
          border-bottom: 2px solid #0a7ea4;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .header h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
          color: #0a7ea4;
        }
        .header p {
          margin: 4px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .section {
          margin-bottom: 24px;
        }
        .section h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #1f2937;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .info-item {
          background-color: #f9fafb;
          padding: 12px;
          border-radius: 6px;
        }
        .info-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 14px;
          color: #1f2937;
          font-weight: 500;
        }
        .readiness-summary {
          background-color: #f0fdf4;
          border: 1px solid #dcfce7;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .readiness-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #dcfce7;
        }
        .readiness-item:last-child {
          border-bottom: none;
        }
        .readiness-product {
          font-weight: 600;
          color: #1f2937;
        }
        .readiness-status {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .readiness-month {
          font-weight: 600;
          color: #1f2937;
          min-width: 80px;
          text-align: right;
        }
        .badge {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          color: white;
        }
        .badge-hard {
          background-color: #22C55E;
        }
        .badge-forecast {
          background-color: #F59E0B;
        }
        .badge-blocked {
          background-color: #EF4444;
        }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Job Intelligence Report</h1>
        <p><strong>Customer:</strong> ${canonical.Customer}</p>
        ${canonical.ProjectSupervisor ? `<p><strong>Project Supervisor:</strong> ${canonical.ProjectSupervisor}</p>` : ''}
        <p><strong>Generated:</strong> ${formatReadableDate(new Date())}</p>
      </div>

      <div class="section">
        <h2>Job Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Customer</div>
            <div class="info-value">${canonical.Customer}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Project Supervisor</div>
            <div class="info-value">${canonical.ProjectSupervisor || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Job Category</div>
            <div class="info-value">${canonical.JobCategory || 'Not specified'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Combination Job</div>
            <div class="info-value">${canonical.IsThisACombinationJob ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Permit Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Permit Status</div>
            <div class="info-value">${canonical.PermitStatus || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Permit Responsibility</div>
            <div class="info-value">${canonical.PermitResponsibility || 'Not specified'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Permit Submission Date</div>
            <div class="info-value">${formatDate(canonical.PermitSubmissionDate)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Permit Actual Approval Date</div>
            <div class="info-value">${formatDate(canonical.PermitActualApprovalDate)}</div>
          </div>
        </div>
      </div>

      ${canonical.StruXureMaterialStatus ? `
        <div class="section">
          <h2>StruXure Configuration</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Material Status</div>
              <div class="info-value">${canonical.StruXureMaterialStatus}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Material Waiver</div>
              <div class="info-value">${canonical.StruXureMaterialWaiver ? 'Yes' : 'No'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Square Footage</div>
              <div class="info-value">${canonical.StruXureSquareFootage || 'Not provided'}</div>
            </div>
            <div class="info-item">
              <div class="info-label"># of Zones</div>
              <div class="info-value">${canonical.StruXureNumberOfZones || 'Not provided'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Order Date</div>
              <div class="info-value">${formatDate(canonical.StruXureOrderDate)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Actual Material Received Date</div>
              <div class="info-value">${formatDate(canonical.StruXureActualMaterialReceivedDate)}</div>
            </div>
          </div>
        </div>
      ` : ''}

      ${canonical.ScreensMaterialStatus ? `
        <div class="section">
          <h2>Screens Configuration</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Material Status</div>
              <div class="info-value">${canonical.ScreensMaterialStatus}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Manufacturer</div>
              <div class="info-value">${canonical.ScreensManufacturer || 'Not specified'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Quantity</div>
              <div class="info-value">${canonical.ScreensQuantity || 'Not provided'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Actual Material Received Date</div>
              <div class="info-value">${formatDate(canonical.ScreensActualMaterialReceivedDate)}</div>
            </div>
          </div>
        </div>
      ` : ''}

      ${canonical.PergotendaMaterialStatus ? `
        <div class="section">
          <h2>Pergotenda Configuration</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Material Status</div>
              <div class="info-value">${canonical.PergotendaMaterialStatus}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Material Waiver</div>
              <div class="info-value">${canonical.PergotendaMaterialWaiver ? 'Yes' : 'No'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Square Footage</div>
              <div class="info-value">${canonical.PergotendaSquareFootage || 'Not provided'}</div>
            </div>
          </div>
        </div>
      ` : ''}

      ${canonical.AwningMaterialStatus ? `
        <div class="section">
          <h2>Awning Configuration</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Material Status</div>
              <div class="info-value">${canonical.AwningMaterialStatus}</div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="section">
        <h2>Material Readiness Analysis</h2>
        <div class="readiness-summary">
          ${Object.entries(readiness).map(([product, result]) => {
            if (!result) return '';
            return `
              <div class="readiness-item">
                <div class="readiness-product">${product}</div>
                <div class="readiness-status">
                  ${result.readyMonth ? `<div class="readiness-month">${result.readyMonth}</div>` : ''}
                  <div class="badge badge-${result.confidence.toLowerCase()}">
                    ${getConfidenceLabel(result.confidence)}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${Object.entries(readiness).map(([product, result]) => {
        if (!result) return '';
        return `
          <div class="section">
            <h2>${product} Readiness Details</h2>
            ${renderProductReadiness(product, result)}
          </div>
        `;
      }).join('')}

      <div class="footer">
        <p>This report was automatically generated by DOS Hub Job Intelligence Module</p>
        <p>Generated on ${formatReadableDate(new Date())} at ${new Date().toLocaleTimeString()}</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Exports job readiness report as PDF
 * On web: Opens print dialog
 * On native: Uses expo-print and expo-sharing
 */
export async function exportJobIntelligencePdf(job: ProcessedJob) {
  const html = generateJobIntelligencePdfHtml(job);
  const filename = `Job_Intelligence_${job.canonical.Customer.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

  if (typeof window !== 'undefined') {
    // Web: Use print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  } else {
    // Native: Would use expo-print and expo-sharing
    // This is a placeholder - actual implementation would use native APIs
    console.log('PDF export on native would use expo-print');
  }
}
