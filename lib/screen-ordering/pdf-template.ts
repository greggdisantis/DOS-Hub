/**
 * Screen Ordering Module — PDF HTML Template
 * Generates HTML that matches the original Distinctive Outdoor Structures
 * Motorized Screen Form PDF layout exactly.
 */
import type {
  OrderState,
  ScreenConfig,
  GlobalMaterialSelections,
} from "./types";
import { formatInchesFrac } from "./calculations";

// ─── Helpers ────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return "—";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMeasure(v: number | null | undefined): string {
  return formatInchesFrac(v);
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const CSS = `
  @page { margin: 40px 50px; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 12px;
    color: #333;
    line-height: 1.4;
  }
  .page {
    page-break-after: always;
    padding: 20px 0;
  }
  .page:last-child { page-break-after: auto; }

  /* Header */
  .header { text-align: center; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: 700; color: #222; margin-bottom: 2px; }
  .header h2 { font-size: 14px; font-weight: 400; color: #555; }

  /* Info grid */
  .info-grid { display: flex; flex-wrap: wrap; gap: 0; margin-bottom: 8px; }
  .info-field { flex: 1; min-width: 30%; padding: 4px 0; }
  .info-field.full { flex: 0 0 100%; }
  .info-field.half { flex: 0 0 50%; }
  .info-label { font-size: 10px; color: #888; text-transform: none; margin-bottom: 1px; }
  .info-value {
    font-size: 13px; font-weight: 600; color: #222;
    border-bottom: 1px solid #ccc; padding-bottom: 3px;
  }

  /* Colored divider */
  .divider { height: 2px; background: #e8732a; margin: 16px 0; }
  .divider-light { height: 1px; background: #ddd; margin: 12px 0; }

  /* Section */
  .section { margin-bottom: 16px; }
  .section-title {
    font-size: 13px; font-weight: 700; text-transform: uppercase;
    color: #333; border-bottom: 2px solid #555; padding-bottom: 4px;
    margin-bottom: 12px; letter-spacing: 0.3px;
  }
  .section-row { display: flex; gap: 20px; margin-bottom: 8px; }
  .section-col { flex: 1; }
  .field { margin-bottom: 8px; }
  .field-label { font-size: 10px; color: #888; }
  .field-value {
    font-size: 12px; font-weight: 600; color: #222;
    border-bottom: 1px solid #ccc; padding-bottom: 2px;
  }

  /* Raw Measurements + Calc Summary */
  .raw-section { margin-top: 8px; }
  .raw-title {
    font-size: 12px; font-weight: 700; text-transform: uppercase;
    margin-bottom: 8px; color: #333;
  }
  .raw-grid { display: flex; gap: 24px; }
  .raw-col { flex: 1; }
  .raw-col-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    color: #555; margin-bottom: 6px;
  }

  /* Warning */
  .warning {
    background: #fff3cd; border: 1px solid #ffcc02; border-radius: 4px;
    padding: 6px 10px; margin: 4px 0; font-size: 11px; color: #856404;
  }
`;

// ─── Field Pair ─────────────────────────────────────────────────────────────

function fieldHtml(label: string, value: string): string {
  return `<div class="field">
    <div class="field-label">${esc(label)}</div>
    <div class="field-value">${esc(value)}</div>
  </div>`;
}

function infoFieldHtml(label: string, value: string, cls = ""): string {
  return `<div class="info-field ${cls}">
    <div class="info-label">${esc(label)}</div>
    <div class="info-value">${esc(value)}</div>
  </div>`;
}

// ─── Per-Screen Page ────────────────────────────────────────────────────────

function screenPageHtml(
  state: OrderState,
  screen: ScreenConfig,
  screenIndex: number,
  material: {
    screenType: string; series: string; screenColor: string;
    frameColorCollection: string; frameColor: string;
    vinylWindowConfig: string; vinylOrientation: string;
  }
): string {
  const c = screen.calculations;
  const sel = screen.selections;
  const m = screen.measurements;
  const totalScreens = state.screens.length;

  return `<div class="page">
    <!-- Header -->
    <div class="header">
      <h1>Distinctive Outdoor Structures</h1>
      <h2>Motorized Screen Form</h2>
    </div>

    <!-- Project Info -->
    <div class="info-grid">
      ${infoFieldHtml("Project Name", state.project.name)}
      ${infoFieldHtml("Date", state.project.date)}
      ${infoFieldHtml("Address", state.project.address)}
    </div>
    <div class="info-grid">
      ${infoFieldHtml("Submitter", state.project.submitterName, "full")}
    </div>
    <div class="info-grid">
      ${infoFieldHtml("Job Number", state.project.jobNumber, "full")}
    </div>
    <div class="info-grid">
      ${infoFieldHtml("Screen Manufacturer", state.manufacturer)}
      ${infoFieldHtml("Total # of Screens", String(totalScreens))}
      ${infoFieldHtml("Screen #", `${screenIndex + 1} of ${totalScreens}`)}
    </div>
    <div class="info-grid">
      ${infoFieldHtml("Description", screen.description || "—", "full")}
    </div>

    <div class="divider"></div>

    <!-- Section 1: Screen &amp; Frame Config -->
    <div class="section">
      <div class="section-title">Section 1 — Screen &amp; Frame Config</div>
      <div class="section-row">
        <div class="section-col">
          ${fieldHtml("Screen Type", material.screenType)}
          ${material.series ? fieldHtml("Series", material.series) : ""}
          ${fieldHtml("Screen Color", material.screenColor)}
          ${material.vinylWindowConfig ? fieldHtml("Window Config", material.vinylWindowConfig) : ""}
          ${material.vinylOrientation ? fieldHtml("Orientation", material.vinylOrientation) : ""}
        </div>
        <div class="section-col">
          ${fieldHtml("Frame Color Collection", material.frameColorCollection)}
          ${fieldHtml("Frame Color", material.frameColor)}
        </div>
      </div>
    </div>

    <!-- Section 2: Motor Config -->
    <div class="section">
      <div class="section-title">Section 2 — Motor Config</div>
      <div class="section-row">
        <div class="section-col">
          ${fieldHtml("Motor Type", state.globalMotorType)}
          ${fieldHtml("Motor Side", sel.motorSide)}
        </div>
        <div class="section-col">
          ${fieldHtml("Remote", sel.remoteOption)}
          ${fieldHtml("Install Mount Type", sel.installMount)}
          ${sel.installMount === "Face-mount" ? fieldHtml("Face Mount Sides", sel.faceMountSides) : ""}
        </div>
      </div>
    </div>

    <!-- Section 3: Order Measurements -->
    <div class="section">
      <div class="section-title">Section 3 — Order Measurements</div>
      <div class="section-row">
        <div class="section-col">
          ${fieldHtml("Left Height", fmtMeasure(c?.leftHeightIn))}
          ${fieldHtml("Track to Track", fmtMeasure(c?.trackToTrackIn))}
          ${c?.extendedHoodIn != null ? fieldHtml("Extended Hood", fmtMeasure(c.extendedHoodIn)) : ""}
        </div>
        <div class="section-col">
          ${fieldHtml("Right Height", fmtMeasure(c?.rightHeightIn))}
        </div>
      </div>
    </div>

    <!-- Section 4: Materials -->
    <div class="section">
      <div class="section-title">Section 4 — Materials</div>
      <div class="section-row">
        <div class="section-col">
          ${fieldHtml("U-Channel Required?", c?.uChannelNeeded ? "Yes" : "No")}
          ${fieldHtml("Build-Out Required?", c?.buildOutNeeded ? "Yes" : "No")}
          ${fieldHtml("Build Out Color", screen.buildOutColor)}
        </div>
        <div class="section-col">
          ${fieldHtml("U-Channel Notes", screen.uChannelNotes)}
          ${fieldHtml("Build-Out Type", c?.buildOutType ?? "None")}
          ${fieldHtml("Build Out Notes", screen.buildOutNotes)}
        </div>
      </div>
    </div>

    <!-- Section 5: Misc -->
    <div class="section">
      <div class="section-title">Section 5 — Misc</div>
      <div class="section-row">
        <div class="section-col">
          ${fieldHtml("Number of Cuts", screen.numberOfCuts)}
        </div>
        <div class="section-col">
          ${fieldHtml("Special Instructions", screen.specialInstructions)}
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <!-- Raw Measurements + Calc Summary -->
    <div class="raw-section">
      <div class="raw-title">Raw Measurements + Calc Summary</div>
      <div class="raw-grid">
        <!-- Raw Measurements (Inputs) — Left column -->
        <div class="raw-col">
          <div class="raw-col-title">Raw Measurements (Inputs)</div>
          ${fieldHtml("UL", fmtMeasure(m.upperLeft))}
          ${fieldHtml("LL", fmtMeasure(m.lowerLeft))}
          ${fieldHtml("OL", fmtMeasure(m.overallLeft))}
          ${fieldHtml("UR", fmtMeasure(m.upperRight))}
          ${fieldHtml("LR", fmtMeasure(m.lowerRight))}
          ${fieldHtml("OR", fmtMeasure(m.overallRight))}
        </div>
        <!-- Horizontal measurements — Middle column -->
        <div class="raw-col">
          <div class="raw-col-title">&nbsp;</div>
          ${fieldHtml("T", fmtMeasure(m.top))}
          ${fieldHtml("M", fmtMeasure(m.middle))}
          ${fieldHtml("B", fmtMeasure(m.bottom))}
        </div>
        <!-- Calc Summary — Right column -->
        <div class="raw-col">
          <div class="raw-col-title">Calc Summary (Calculated)</div>
          ${fieldHtml("Upper Slope (S)", fmtMeasure(c?.upperSlopeIn))}
          ${fieldHtml("Slope Direction", c?.slopeDirection ?? "—")}
          ${fieldHtml("High Side / Low Side", `${c?.highSide ?? "—"} / ${c?.lowSide ?? "—"}`)}
          ${fieldHtml("T-B Diff", fmtMeasure(c?.tbDiffIn))}
          ${fieldHtml("Bias", fmtMeasure(c?.biasIn))}
        </div>
      </div>
    </div>

    ${c?.leftSideMismatch || c?.rightSideMismatch ? `
      <div style="margin-top: 8px;">
        ${c?.leftSideMismatch ? '<div class="warning">⚠ Left side check: UL + LL ≠ OL (difference exceeds 1/8"). Please verify.</div>' : ""}
        ${c?.rightSideMismatch ? '<div class="warning">⚠ Right side check: UR + LR ≠ OR (difference exceeds 1/8"). Please verify.</div>' : ""}
      </div>
    ` : ""}
  </div>`;
}

// ─── Full PDF HTML ──────────────────────────────────────────────────────────

export function generateOrderPdfHtml(state: OrderState): string {
  const pages = state.screens.map((screen, i) => {
    const material = state.allSame
      ? state.globalMaterial
      : {
          screenType: screen.selections.screenType,
          series: screen.selections.series,
          screenColor: screen.selections.screenColor,
          frameColorCollection: screen.selections.frameColorCollection,
          frameColor: screen.selections.frameColor,
          vinylWindowConfig: screen.selections.vinylWindowConfig,
          vinylOrientation: screen.selections.vinylOrientation,
        };
    return screenPageHtml(state, screen, i, material);
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Motorized Screen Form — ${esc(state.project.name)}</title>
  <style>${CSS}</style>
</head>
<body>
  ${pages.join("\n")}
</body>
</html>`;
}

/**
 * Generate HTML for a single screen's PDF preview.
 */
export function generateScreenPdfHtml(state: OrderState, screenIndex: number): string {
  const screen = state.screens[screenIndex];
  if (!screen) return "";
  const material = state.allSame
    ? state.globalMaterial
    : {
        screenType: screen.selections.screenType,
        series: screen.selections.series,
        screenColor: screen.selections.screenColor,
        frameColorCollection: screen.selections.frameColorCollection,
        frameColor: screen.selections.frameColor,
        vinylWindowConfig: screen.selections.vinylWindowConfig,
        vinylOrientation: screen.selections.vinylOrientation,
      };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Screen #${screenIndex + 1} — ${esc(screen.description || "Untitled")}</title>
  <style>${CSS}</style>
</head>
<body>
  ${screenPageHtml(state, screen, screenIndex, material)}
</body>
</html>`;
}
