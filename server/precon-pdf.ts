/**
 * Preconstruction Meeting Checklist PDF Generator — complete rewrite.
 *
 * Design rules:
 *  - NO footers anywhere (they caused blank-page bugs)
 *  - One PDFDocument, margins: top=90 bottom=60 left=50 right=50
 *  - Header is drawn ONCE per page via a helper; cursor is reset to top+12 after
 *  - Page breaks are managed by a single `ensureSpace(pts)` helper
 *  - Content is grouped into logical pages:
 *      Page 1 : Project Info, General Checklist, StruXure Details, Accessories
 *      Page 2 : Decorative Features, Pergola Review, Expectations
 *      Page 3+ : Photos Were Taken Of
 *      Next   : Additional Work Items + Notes
 *      Last   : Signatures
 */
import PDFDocument from "pdfkit";
import { PreconFormData } from "../app/(tabs)/modules/precon/types";

// ─── Palette ────────────────────────────────────────────────────────────────
const BRAND_BLUE = "#1E3A5F";
const MID_GRAY   = "#6B7280";
const LIGHT_GRAY = "#F3F4F6";
const DARK       = "#111827";
const SUCCESS    = "#16A34A";
const PAGE_W     = 612; // LETTER width in pts
const MARGIN_L   = 50;
const MARGIN_R   = 50;
const CONTENT_W  = PAGE_W - MARGIN_L - MARGIN_R;
const HEADER_H   = 72;
const CONTENT_TOP = HEADER_H + 16; // where body starts after header
const BOTTOM_LIMIT = 732; // 792 - 60 bottom margin

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(d?: string | null): string {
  if (!d) return "—";
  if (d.includes("-")) {
    const [y, m, day] = d.split("-");
    return `${m}/${day}/${y}`;
  }
  return d;
}

function drawHeader(doc: PDFKit.PDFDocument, projectName: string) {
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(BRAND_BLUE);
  doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold")
    .text("Distinctive Outdoor Structures", MARGIN_L, 20, { width: 340 });
  doc.fillColor("#93C5FD").fontSize(9).font("Helvetica")
    .text("PRE-CONSTRUCTION MEETING CHECKLIST", MARGIN_L, 46, { width: 340 });
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica")
    .text(projectName || "—", PAGE_W - 220, 30, { width: 170, align: "right" });
  // Reset cursor below header
  doc.y = CONTENT_TOP;
  doc.fillColor(DARK).font("Helvetica");
}

/** Add a new page, redraw header, reset cursor. */
function newPage(doc: PDFKit.PDFDocument, projectName: string) {
  doc.addPage();
  drawHeader(doc, projectName);
}

/** If less than `pts` remain before the bottom limit, start a new page. */
function ensureSpace(doc: PDFKit.PDFDocument, pts: number, projectName: string) {
  if (doc.y + pts > BOTTOM_LIMIT) {
    newPage(doc, projectName);
  }
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string, projectName: string) {
  ensureSpace(doc, 30, projectName);
  const y = doc.y + 6;
  doc.rect(MARGIN_L, y, CONTENT_W, 20).fill(BRAND_BLUE);
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold")
    .text(title, MARGIN_L + 8, y + 5, { width: CONTENT_W - 16 });
  doc.fillColor(DARK).font("Helvetica");
  doc.y = y + 26; // 20 header + 6 gap
}

function checkRow(doc: PDFKit.PDFDocument, label: string, checked: boolean, projectName: string) {
  ensureSpace(doc, 16, projectName);
  const y = doc.y;
  const mark = checked ? "&" : "&";
  doc.fontSize(10).fillColor(checked ? SUCCESS : DARK).font("Helvetica-Bold")
    .text(mark, MARGIN_L + 8, y, { width: 16, lineBreak: false });
  doc.fillColor(DARK).font("Helvetica")
    .text(label, MARGIN_L + 26, y, { width: CONTENT_W - 36 });
  doc.y = doc.y + 3;
}

function ynRow(doc: PDFKit.PDFDocument, label: string, value: boolean | null | undefined, projectName: string) {
  ensureSpace(doc, 16, projectName);
  const y = doc.y;
  const yn = value === true ? "Y" : value === false ? "N" : "—";
  const color = value === true ? SUCCESS : value === false ? "#EF4444" : MID_GRAY;
  doc.fontSize(9).fillColor(color).font("Helvetica-Bold")
    .text(`[${yn}]`, MARGIN_L + 8, y, { width: 28, lineBreak: false });
  doc.fillColor(DARK).font("Helvetica")
    .text(label, MARGIN_L + 40, y, { width: CONTENT_W - 50 });
  doc.y = doc.y + 3;
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string | null | undefined, projectName: string) {
  if (!value) return;
  ensureSpace(doc, 14, projectName);
  const y = doc.y;
  doc.fontSize(9).fillColor(MID_GRAY).font("Helvetica")
    .text(`${label}: `, MARGIN_L + 8, y, { continued: true });
  doc.fillColor(DARK).font("Helvetica-Bold").text(value);
  doc.y = doc.y + 2;
}

function accessoryRow(
  doc: PDFKit.PDFDocument,
  label: string,
  item: { checked: boolean; qty: string; location: string; switchLocation?: string },
  projectName: string,
) {
  ensureSpace(doc, 16, projectName);
  const y = doc.y;
  const mark = item.checked ? "&" : "&";
  doc.fontSize(10).fillColor(item.checked ? SUCCESS : DARK).font("Helvetica-Bold")
    .text(mark, MARGIN_L + 8, y, { width: 14, lineBreak: false });
  doc.fillColor(DARK).font("Helvetica").fontSize(9)
    .text(label, MARGIN_L + 24, y, { width: 140, lineBreak: false });
  doc.fillColor(MID_GRAY)
    .text(`Qty: ${item.qty || "—"}`, MARGIN_L + 172, y, { width: 70, lineBreak: false });
  doc.text(`Loc: ${item.location || "—"}`, MARGIN_L + 248, y, { width: 120, lineBreak: false });
  if (item.switchLocation !== undefined) {
    doc.text(`Switch: ${item.switchLocation || "—"}`, MARGIN_L + 374, y, { width: 90, lineBreak: false });
  }
  doc.fillColor(DARK).fontSize(10);
  doc.y = y + 16;
}

function workItemBlock(
  doc: PDFKit.PDFDocument,
  title: string,
  item: {
    needed: boolean | null;
    additionalCost: boolean | null;
    addendumNeeded: boolean | null;
    responsibleParty: string | null;
    contractor: string;
    scopeOfWork: string;
  },
  projectName: string,
) {
  ensureSpace(doc, 60, projectName);
  const y = doc.y + 4;
  doc.rect(MARGIN_L, y, CONTENT_W, 18).fill(LIGHT_GRAY);
  doc.fillColor(DARK).fontSize(9).font("Helvetica-Bold")
    .text(title, MARGIN_L + 8, y + 4, { width: CONTENT_W - 16 });
  doc.y = y + 22;
  const yn = (v: boolean | null) => (v === true ? "Y" : v === false ? "N" : "—");
  doc.fillColor(MID_GRAY).font("Helvetica").fontSize(9)
    .text(
      `Needed: ${yn(item.needed)}   Additional Cost: ${yn(item.additionalCost)}   Addendum: ${yn(item.addendumNeeded)}   Responsible: ${item.responsibleParty ?? "—"}`,
      MARGIN_L + 8, doc.y, { width: CONTENT_W - 16 },
    );
  doc.y = doc.y + 4;
  if (item.contractor) labelValue(doc, "Contractor", item.contractor, projectName);
  if (item.scopeOfWork) {
    ensureSpace(doc, 14, projectName);
    doc.fontSize(9).fillColor(MID_GRAY).text("Scope: ", MARGIN_L + 8, doc.y, { continued: true });
    doc.fillColor(DARK).text(item.scopeOfWork, { width: CONTENT_W - 60 });
  }
  doc.y = doc.y + 8;
}

// ─── Main export ────────────────────────────────────────────────────────────
export async function generatePreconPdf(checklist: any): Promise<Buffer> {
  const fd: PreconFormData = { ...(checklist.formData ?? {}) } as any;
  // Merge photoUris from dedicated photoData column (stored separately to avoid 65KB JSON limit)
  if (checklist.photoData) {
    try {
      (fd as any).photoUris = JSON.parse(checklist.photoData);
    } catch {}
  }
  const projectName  = checklist.projectName  ?? "—";
  const projectAddress = checklist.projectAddress ?? "—";
  const supervisor   = checklist.supervisorName ?? "—";
  const meetingDate  = checklist.meetingDate   ?? "—";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: CONTENT_TOP, bottom: 60, left: MARGIN_L, right: MARGIN_R },
      autoFirstPage: false,
    });
    const chunks: Buffer[] = [];
    doc.on("data",  (c: Buffer) => chunks.push(c));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── PAGE 1: Project Info, General Checklist, StruXure, Accessories ──────
    doc.addPage();
    drawHeader(doc, projectName);

    // Project Information
    sectionHeader(doc, "Project Information", projectName);
    labelValue(doc, "Project Name",       projectName,           projectName);
    labelValue(doc, "Address",            projectAddress,        projectName);
    labelValue(doc, "Project Supervisor", supervisor,            projectName);
    labelValue(doc, "Meeting Date",       fmtDate(meetingDate),  projectName);
    doc.y += 8;

    // General Checklist
    sectionHeader(doc, "General Checklist", projectName);
    checkRow(doc, "Project Payment outline is reviewed and start of work payment collected as per contract", fd.paymentReviewed ?? false, projectName);
    if (fd.materialDropOffLocation) labelValue(doc, "Location of Material Drop Off", fd.materialDropOffLocation, projectName);
    if (fd.stagingAreaLocation)     labelValue(doc, "Location of Work Staging Area", fd.stagingAreaLocation, projectName);
    checkRow(doc, "Area of installation to be clear of obstacles prior to start of work", fd.siteWillBeClear ?? false, projectName);
    checkRow(doc, "Review Plan and all components", fd.planReviewed ?? false, projectName);
    checkRow(doc, "Discuss Future Optional Add-ons to ensure provisions are in place", fd.futureAddOnsDiscussed ?? false, projectName);
    doc.y += 8;

    // StruXure Details
    sectionHeader(doc, "StruXure Details", projectName);
    if (fd.struxureZones)       labelValue(doc, "# of StruXure Zones",     fd.struxureZones,       projectName);
    if (fd.controlBoxLocation)  labelValue(doc, "Control Box Location",    fd.controlBoxLocation,  projectName);
    if (fd.rainSensorLocation)  labelValue(doc, "Rain Sensor Location",    fd.rainSensorLocation,  projectName);
    if (fd.windSensorLocation)  labelValue(doc, "Wind Sensor Location",    fd.windSensorLocation,  projectName);
    doc.y += 8;

    // Accessories
    sectionHeader(doc, "Accessories (Qty & Location)", projectName);
    const acc = fd.accessories;
    if (acc) {
      accessoryRow(doc, "Accessory Beam(s)",   acc.accessoryBeams   ?? { checked: false, qty: "", location: "" }, projectName);
      accessoryRow(doc, "Add. Receptacle(s)",  acc.receptacles      ?? { checked: false, qty: "", location: "" }, projectName);
      accessoryRow(doc, "Motorized Screen(s)", acc.motorizedScreens ?? { checked: false, qty: "", location: "" }, projectName);
      accessoryRow(doc, "Light(s)",   { ...(acc.lights   ?? { checked: false, qty: "", location: "" }), switchLocation: (acc.lights as any)?.switchLocation   ?? "" }, projectName);
      accessoryRow(doc, "Fan(s)",     { ...(acc.fans     ?? { checked: false, qty: "", location: "" }), switchLocation: (acc.fans   as any)?.switchLocation   ?? "" }, projectName);
      accessoryRow(doc, "Heater(s)", { ...(acc.heaters  ?? { checked: false, qty: "", location: "" }), switchLocation: (acc.heaters as any)?.switchLocation  ?? "" }, projectName);
      accessoryRow(doc, "Sconce Lighting",     acc.sconceLighting    ?? { checked: false, qty: "", location: "" }, projectName);
      accessoryRow(doc, "System Downspouts",   acc.systemDownspouts  ?? { checked: false, qty: "", location: "" }, projectName);
    }

    // ── PAGE 2: Decorative Features, Pergola Review, Expectations ───────────
    newPage(doc, projectName);

    // Decorative Features
    sectionHeader(doc, "Decorative Features", projectName);
    const dec = fd.decorative;
    if (dec) {
      const features: [string, boolean][] = [
        ["Post Bases",              dec.postBases],
        ["Post Capitals",           dec.postCapitals],
        ["Post Wraps",              dec.postWraps],
        ["Pergola Cuts",            dec.pergolaCuts],
        ["1-Step Cornice",          dec.oneStepCornice],
        ["2-Step Cornice",          dec.twoStepCornice],
        ["TRAX Rise",               dec.traxRise],
        ["LED Strip Light (Gutter)",dec.ledStripGutter],
        ["LED Strip Lights (TRAX)", dec.ledStripTrax],
      ];
      for (let i = 0; i < features.length; i += 2) {
        ensureSpace(doc, 16, projectName);
        const y = doc.y;
        const [l1, v1] = features[i];
        const [l2, v2] = features[i + 1] ?? ["", null as any];
        doc.fontSize(10).fillColor(v1 ? SUCCESS : DARK).font("Helvetica-Bold")
          .text(v1 ? "&" : "&", MARGIN_L + 8, y, { width: 14, lineBreak: false });
        doc.fillColor(DARK).font("Helvetica").fontSize(10)
          .text(l1, MARGIN_L + 26, y, { width: 200, lineBreak: false });
        if (l2) {
          doc.fillColor(v2 ? SUCCESS : DARK).font("Helvetica-Bold")
            .text(v2 ? "&" : "&", MARGIN_L + 240, y, { width: 14, lineBreak: false });
          doc.fillColor(DARK).font("Helvetica").fontSize(10)
            .text(l2, MARGIN_L + 258, y, { width: 200, lineBreak: false });
        }
        doc.y = y + 16;
      }
      if (dec.other) labelValue(doc, "Other", dec.other, projectName);
    }
    doc.y += 8;

    // Pergola Review
    sectionHeader(doc, "Pergola Review", projectName);
    const perg = fd.pergola;
    if (perg) {
      checkRow(doc, "Location of Pergola reviewed", perg.locationReviewed ?? false, projectName);
      if (perg.height)          labelValue(doc, "Height of Pergola",                        perg.height,          projectName);
      if (perg.slope)           labelValue(doc, "Slope of Pergola",                         perg.slope,           projectName);
      if (perg.drainElevation)  labelValue(doc, "Elevation drain lines will exit posts",    perg.drainElevation,  projectName);
      checkRow(doc, "Labeled the Posts that the Wiring will Enter Pergola", perg.wiringPostsLabeled ?? false, projectName);
      checkRow(doc, "Wire Diagram reviewed", perg.wireDiagramReviewed ?? false, projectName);
      if (perg.wireFeetPerPost) labelValue(doc, "Amount (in Feet) of Wire for all items",  perg.wireFeetPerPost, projectName);
    }
    doc.y += 8;

    // Expectations
    sectionHeader(doc, "Reviewed with Client — Expectations", projectName);
    const exp = fd.expectations;
    if (exp) {
      checkRow(doc, "Approximate Time of Construction reviewed", exp.constructionTimeReviewed ?? false, projectName);
      checkRow(doc, "Aluminum shavings will be cleaned — minor pieces may remain", exp.aluminumShavingsReviewed ?? false, projectName);
      checkRow(doc, "Minor leaks may occur after installation — will be addressed promptly", exp.minorLeaksReviewed ?? false, projectName);
      checkRow(doc, "Reviewed any changes or alterations to the original contract", exp.contractChangesReviewed ?? false, projectName);
      checkRow(doc, "Identified any addendums needed for additional work outside contract scope", exp.addendumsIdentified ?? false, projectName);
    }

    // ── PAGE 3+: Photos ──────────────────────────────────────────────────────
    newPage(doc, projectName);

    sectionHeader(doc, "Photos Were Taken Of", projectName);
    doc.fontSize(9).fillColor(MID_GRAY)
      .text("Check each area where photos were taken prior to installation.", MARGIN_L + 8, doc.y, { width: CONTENT_W - 16 });
    doc.y += 8;

    const ph = fd.photos;
    const photoUris: Record<string, string[]> = (fd as any).photoUris ?? {};

    const photoItems: [string, boolean, string][] = [
      ["Driveway & Access Conditions",  ph?.driveway               ?? false, "driveway"],
      ["Location of Staging Area",       ph?.stagingArea            ?? false, "stagingArea"],
      ["Location of Pergola",            ph?.pergolLocation         ?? false, "pergolLocation"],
      ["Location of Work Area",          ph?.workArea               ?? false, "workArea"],
      ["Location of the Posts to be Installed", ph?.postLocations   ?? false, "postLocations"],
      ["Any and all Photos of any Damage to the Property or Dwelling Prior to Starting Work", ph?.priorDamage ?? false, "priorDamage"],
      ["Any Circumstance that will Prohibit the Installation of the Pergola", ph?.installationProhibitions ?? false, "installationProhibitions"],
    ];

    // Render checkbox list (no inline photos here)
    for (const [label, checked] of photoItems) {
      checkRow(doc, label, checked, projectName);
    }

    // ── Dedicated Photo Pages: one page per section that has photos ──────────
    // Photos are stored with key "photos.driveway", "photos.stagingArea", etc.
    const IMG_W = 240;
    const IMG_H = 180;
    const GAP_X = 24;
    const GAP_Y = 32; // extra gap for label above each photo
    const COLS  = 2;
    const LABEL_H = 16;

    for (const [label, , key] of photoItems) {
      // Try both "photos.key" (client format) and bare "key" (legacy format)
      const uris = photoUris[`photos.${key}`] ?? photoUris[key] ?? [];
      if (uris.length === 0) continue;

      // Each photo gets its own labeled block; multiple photos per section flow down
      newPage(doc, projectName);
      sectionHeader(doc, `Photos: ${label}`, projectName);
      doc.y += 8;

      uris.forEach((dataUri, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const x = MARGIN_L + col * (IMG_W + GAP_X);
        const y = doc.y + row * (IMG_H + LABEL_H + GAP_Y);

        // If this row would overflow, start a new page
        if (y + IMG_H + LABEL_H > BOTTOM_LIMIT) {
          newPage(doc, projectName);
          sectionHeader(doc, `Photos: ${label} (cont.)`, projectName);
          doc.y += 8;
        }

        const labelY = doc.y + row * (IMG_H + LABEL_H + GAP_Y);
        const imgY   = labelY + LABEL_H;

        // Photo label
        doc.fontSize(9).fillColor(MID_GRAY).font("Helvetica-Bold")
          .text(`${label} — Photo #${idx + 1}`, x, labelY, { width: IMG_W });
        doc.fillColor(DARK).font("Helvetica");

        // Photo image
        try {
          const base64Match = dataUri.match(/^data:image\/(jpeg|png|jpg);base64,(.+)$/);
          if (base64Match) {
            const imgBuffer = Buffer.from(base64Match[2], "base64");
            doc.image(imgBuffer, x, imgY, { width: IMG_W, height: IMG_H, fit: [IMG_W, IMG_H] });
          } else {
            // Not a valid data URI — draw placeholder
            doc.rect(x, imgY, IMG_W, IMG_H).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
            doc.fontSize(8).fillColor(MID_GRAY)
              .text("[Photo unavailable]", x + 4, imgY + IMG_H / 2 - 6, { width: IMG_W - 8, align: "center" });
          }
        } catch (imgErr) {
          doc.rect(x, imgY, IMG_W, IMG_H).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
          doc.fontSize(8).fillColor(MID_GRAY)
            .text("[Photo error]", x + 4, imgY + IMG_H / 2 - 6, { width: IMG_W - 8, align: "center" });
        }

        // After the last column in a row, advance doc.y
        if (col === COLS - 1 || idx === uris.length - 1) {
          doc.y = imgY + IMG_H + 16;
        }
      });
    }

    // ── Additional Work Items + Notes ────────────────────────────────────────
    newPage(doc, projectName);

    sectionHeader(doc, "Additional Work Items", projectName);
    const wi = fd.workItems;
    const emptyWork = { needed: null, additionalCost: null, addendumNeeded: null, responsibleParty: null, contractor: "", scopeOfWork: "" };
    if (wi) {
      workItemBlock(doc, "Electrical Work",          wi.electrical           ?? emptyWork, projectName);
      workItemBlock(doc, "Footings",                 wi.footings             ?? emptyWork, projectName);
      workItemBlock(doc, "Patio Alterations",        wi.patioAlterations     ?? emptyWork, projectName);
      workItemBlock(doc, "Deck Alterations",         wi.deckAlterations      ?? emptyWork, projectName);
      workItemBlock(doc, "House Gutter Alterations", wi.houseGutterAlterations ?? emptyWork, projectName);
    }

    if (fd.projectNotes || fd.clientRemarks) {
      ensureSpace(doc, 60, projectName);
      sectionHeader(doc, "Project Notes", projectName);
      if (fd.projectNotes) {
        doc.fontSize(9).fillColor(MID_GRAY).text("StruXure Project Notes:", MARGIN_L + 8, doc.y);
        doc.fillColor(DARK).fontSize(10).text(fd.projectNotes, MARGIN_L + 8, doc.y, { width: CONTENT_W - 16 });
        doc.y += 6;
      }
      if (fd.clientRemarks) {
        doc.fontSize(9).fillColor(MID_GRAY).text("Client Remarks / Requests:", MARGIN_L + 8, doc.y);
        doc.fillColor(DARK).fontSize(10).text(fd.clientRemarks, MARGIN_L + 8, doc.y, { width: CONTENT_W - 16 });
        doc.y += 6;
      }
    }

    // ── Signature Page ───────────────────────────────────────────────────────
    newPage(doc, projectName);

    doc.fontSize(10).fillColor(DARK).font("Helvetica")
      .text(
        "We kindly request your acknowledgment by signing below, confirming your understanding of the items discussed on this Pre-Construction checklist. Your signature will serve as a clear indication that you are aware of and in agreement with the points covered in this checklist, helping ensure a successful and smooth pre-construction process. Thank you for your cooperation and commitment to a successful project.",
        MARGIN_L + 8, doc.y,
        { width: CONTENT_W - 16, align: "justify" },
      );
    doc.y += 36;

    // Supervisor
    const sigY1 = doc.y;
    doc.moveTo(MARGIN_L + 8, sigY1).lineTo(280, sigY1).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(MID_GRAY).text("Project Supervisor Signature", MARGIN_L + 8, sigY1 + 4);
    doc.moveTo(300, sigY1).lineTo(PAGE_W - MARGIN_R - 8, sigY1).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.text("Print Name / Date", 300, sigY1 + 4);
    if (checklist.supervisorSignedName) {
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11)
        .text(checklist.supervisorSignedName, 300, sigY1 - 14, { width: 220 });
    }
    doc.y = sigY1 + 40;

    // Client 1
    const sigY2 = doc.y;
    doc.moveTo(MARGIN_L + 8, sigY2).lineTo(280, sigY2).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(MID_GRAY).text("Client / Authorized Signature", MARGIN_L + 8, sigY2 + 4);
    doc.moveTo(300, sigY2).lineTo(PAGE_W - MARGIN_R - 8, sigY2).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.text("Print Name / Date", 300, sigY2 + 4);
    if (checklist.client1SignedName) {
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11)
        .text(checklist.client1SignedName, 300, sigY2 - 14, { width: 220 });
    }
    doc.y = sigY2 + 40;

    // Client 2
    const sigY3 = doc.y;
    doc.moveTo(MARGIN_L + 8, sigY3).lineTo(280, sigY3).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(MID_GRAY).text("Client / Authorized Signature (2nd)", MARGIN_L + 8, sigY3 + 4);
    doc.moveTo(300, sigY3).lineTo(PAGE_W - MARGIN_R - 8, sigY3).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.text("Print Name / Date", 300, sigY3 + 4);
    if (checklist.client2SignedName) {
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11)
        .text(checklist.client2SignedName, 300, sigY3 - 14, { width: 220 });
    }

    doc.end();
  });
}
