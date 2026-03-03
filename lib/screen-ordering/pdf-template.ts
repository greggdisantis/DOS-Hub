/**
 * Screen Ordering Module — PDF HTML Template
 * Generates HTML that matches the original Distinctive Outdoor Structures
 * Motorized Screen Form PDF layout.
 *
 * Each screen gets its own page with a clear SCREEN #N label.
 * Uploaded photos follow each screen's data page.
 */
import type {
  OrderState,
  ScreenConfig,
  ScreenPhoto,
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
  @page { margin: 36px 44px; size: letter portrait; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 11px;
    color: #333;
    line-height: 1.35;
  }
  .page-break-section {
    page-break-after: always;
    padding: 10px 0;
  }
  .page-break-section:last-child { page-break-after: auto; }

  /* Running page header — repeats on every printed page within a screen section */
  .screen-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0 8px 0;
    border-bottom: 2px solid #1B3A5C;
    margin-bottom: 12px;
  }
  .screen-badge {
    display: inline-block;
    background: #1B3A5C;
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    padding: 5px 14px;
    border-radius: 5px;
    letter-spacing: 1px;
  }
  .screen-page-header-right {
    font-size: 10px;
    color: #666;
    text-align: right;
  }
  .screen-page-header-right strong {
    color: #333;
  }

  /* Header */
  .header { text-align: center; margin-bottom: 12px; }
  .header h1 { font-size: 20px; font-weight: 700; color: #222; margin-bottom: 1px; }
  .header h2 { font-size: 13px; font-weight: 400; color: #555; }

  /* Info grid */
  .info-grid { display: flex; flex-wrap: wrap; gap: 0; margin-bottom: 4px; }
  .info-field { flex: 1; min-width: 30%; padding: 2px 0; }
  .info-field.full { flex: 0 0 100%; }
  .info-field.half { flex: 0 0 50%; }
  .info-label { font-size: 9px; color: #888; text-transform: none; margin-bottom: 0; }
  .info-value {
    font-size: 11px; font-weight: 600; color: #222;
    border-bottom: 1px solid #ccc; padding-bottom: 2px;
  }

  /* Colored divider */
  .divider { height: 2px; background: #e8732a; margin: 8px 0; }
  .divider-light { height: 1px; background: #ddd; margin: 6px 0; }

  /* Section */
  .section { margin-bottom: 8px; }
  .section-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    color: #333; border-bottom: 2px solid #555; padding-bottom: 3px;
    margin-bottom: 6px; letter-spacing: 0.3px;
  }
  .section-row { display: flex; gap: 16px; margin-bottom: 3px; }
  .section-col { flex: 1; }
  .field { margin-bottom: 4px; }
  .field-label { font-size: 9px; color: #888; }
  .field-value {
    font-size: 11px; font-weight: 600; color: #222;
    border-bottom: 1px solid #ccc; padding-bottom: 1px;
  }

  /* Raw Measurements + Calc Summary */
  .raw-section { margin-top: 4px; }
  .raw-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    margin-bottom: 6px; color: #333;
  }
  .raw-grid { display: flex; gap: 20px; }
  .raw-col { flex: 1; }
  .raw-col-title {
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    color: #555; margin-bottom: 4px;
  }

  /* Warning */
  .warning {
    background: #fff3cd; border: 1px solid #ffcc02; border-radius: 4px;
    padding: 6px 10px; margin: 4px 0; font-size: 11px; color: #856404;
  }

  /* Photos page */
  .photos-page-title {
    font-size: 16px; font-weight: 700; color: #222; margin-bottom: 16px;
  }
  .photos-grid {
    display: flex; flex-wrap: wrap; gap: 12px;
  }
  .photo-item {
    width: 48%;
    margin-bottom: 12px;
  }
  .photo-item img {
    width: 100%;
    max-height: 360px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 6px;
  }
  .photo-caption {
    font-size: 10px; color: #888; margin-top: 4px; text-align: center;
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

// ─── Per-Screen Data Page ──────────────────────────────────────────────────

function screenDataPageHtml(
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

  return `<div class="page-break-section">
    <!-- Screen Page Header (visible at top of every printed page) -->
    <div class="screen-page-header">
      <div class="screen-badge">SCREEN #${screenIndex + 1}</div>
      <div class="screen-page-header-right">
        <strong>Distinctive Outdoor Structures</strong> &mdash; Motorized Screen Form<br/>
        ${esc(state.project.name) !== "\u2014" ? esc(state.project.name) + " | " : ""}Screen ${screenIndex + 1} of ${totalScreens}
      </div>
    </div>

    <!-- Project Info -->
    <div class="info-grid">
      ${infoFieldHtml("Project Name", state.project.name)}
      ${infoFieldHtml("Date", state.project.date)}
      ${infoFieldHtml("Address", state.project.address)}
    </div>
    <div class="info-grid">
      ${infoFieldHtml("Submitter", state.project.submitterName)}
      ${infoFieldHtml("Job Number", state.project.jobNumber)}
    </div>
    <div class="info-grid">
      ${infoFieldHtml("Screen Manufacturer", state.manufacturer)}
      ${infoFieldHtml("Total # of Screens", String(totalScreens))}
      ${infoFieldHtml("Description", screen.description || "\u2014")}
    </div>

    <div class="divider"></div>

    <!-- Section 1: Screen & Frame Config -->
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
        <div class="raw-col">
          <div class="raw-col-title">Raw Measurements (Inputs)</div>
          ${fieldHtml("UL", fmtMeasure(m.upperLeft))}
          ${fieldHtml("LL", fmtMeasure(m.lowerLeft))}
          ${fieldHtml("OL", fmtMeasure(m.overallLeft))}
          ${fieldHtml("UR", fmtMeasure(m.upperRight))}
          ${fieldHtml("LR", fmtMeasure(m.lowerRight))}
          ${fieldHtml("OR", fmtMeasure(m.overallRight))}
        </div>
        <div class="raw-col">
          <div class="raw-col-title">&nbsp;</div>
          ${fieldHtml("T", fmtMeasure(m.top))}
          ${fieldHtml("M", fmtMeasure(m.middle))}
          ${fieldHtml("B", fmtMeasure(m.bottom))}
        </div>
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

// ─── Photos Page ────────────────────────────────────────────────────────────

function photosPageHtml(
  screenIndex: number,
  description: string,
  photos: ScreenPhoto[]
): string {
  if (!photos || photos.length === 0) return "";

  const photoItems = photos.map((photo, i) => {
    // Use base64 data URI if available, otherwise use the file URI
    const src = photo.base64DataUri || photo.uri;
    return `<div class="photo-item">
      <img src="${src}" alt="Screen ${screenIndex + 1} - Photo ${i + 1}" />
      <div class="photo-caption">Photo ${i + 1}</div>
    </div>`;
  }).join("\n");

  return `<div class="page-break-section">
    <div class="screen-page-header">
      <div class="screen-badge">SCREEN #${screenIndex + 1} — PHOTOS</div>
      <div class="screen-page-header-right">
        <strong>${esc(description) || `Screen ${screenIndex + 1}`}</strong><br/>Measurement Photos
      </div>
    </div>
    <div class="photos-grid">
      ${photoItems}
    </div>
  </div>`;
}

// ─── Full PDF HTML ──────────────────────────────────────────────────────────

export function generateOrderPdfHtml(state: OrderState): string {
  const pages: string[] = [];

  state.screens.forEach((screen, i) => {
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

    // Data page for this screen
    pages.push(screenDataPageHtml(state, screen, i, material));

    // Photos page(s) for this screen (immediately after the data page)
    const photosHtml = photosPageHtml(i, screen.description, screen.photos);
    if (photosHtml) {
      pages.push(photosHtml);
    }
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
 * Generate HTML for a single screen's PDF preview (data + photos).
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

  const dataPage = screenDataPageHtml(state, screen, screenIndex, material);
  const photosPage = photosPageHtml(screenIndex, screen.description, screen.photos);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Screen #${screenIndex + 1} — ${esc(screen.description || "Untitled")}</title>
  <style>${CSS}</style>
</head>
<body>
  ${dataPage}
  ${photosPage}
</body>
</html>`;
}
