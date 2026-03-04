/**
 * Server-side Pre-Construction Meeting Checklist PDF generator.
 * Produces a DOS-branded PDF matching the original Word document layout.
 */
import PDFDocument from "pdfkit";
import { PreconFormData } from "../app/(tabs)/modules/precon/types";

const BRAND_BLUE = "#1E3A5F";
const LIGHT_GRAY = "#F3F4F6";
const MID_GRAY = "#6B7280";
const DARK = "#111827";
const SUCCESS = "#16A34A";

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  // Parse and format date as MM/DD/YYYY
  if (d.length === 4 && /^\d{4}$/.test(d)) {
    // If it's just 4 digits (like "1212"), assume MMDD format
    return `${d.substring(0, 2)}/${d.substring(2, 4)}`;
  }
  if (d.includes("-")) {
    // If it's ISO format (YYYY-MM-DD), convert to MM/DD/YYYY
    const [year, month, day] = d.split("-");
    return `${month}/${day}/${year}`;
  }
  return d;
}

function drawHeader(doc: PDFKit.PDFDocument, projectName: string) {
  const HEADER_H = 72;
  doc.rect(0, 0, doc.page.width, HEADER_H).fill(BRAND_BLUE);
  doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold")
    .text("Distinctive Outdoor Structures", 40, 20, { width: 320 });
  doc.fillColor("#93C5FD").fontSize(9).font("Helvetica")
    .text("PRE-CONSTRUCTION MEETING CHECKLIST", 40, 46, { width: 320 });
  const rightX = doc.page.width - 220;
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica")
    .text(projectName || "—", rightX, 30, { width: 180, align: "right" });
  doc.fillColor(DARK).font("Helvetica");
  // Position cursor below header with proper spacing
  doc.y = HEADER_H + 12;
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  const y = doc.y + 10;
  doc.rect(50, y, doc.page.width - 100, 20).fill(BRAND_BLUE);
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold").text(title, 58, y + 5);
  doc.fillColor(DARK).font("Helvetica").moveDown(0.5);
}

function checkRow(doc: PDFKit.PDFDocument, label: string, checked: boolean) {
  const y = doc.y;
  const box = checked ? "&" : "&";
  doc.fontSize(10).fillColor(checked ? SUCCESS : DARK).font("Helvetica-Bold").text(box, 58, y, { width: 16 });
  doc.fillColor(DARK).font("Helvetica").text(label, 78, y, { width: doc.page.width - 140 });
  doc.moveDown(0.15);
}

function ynRow(doc: PDFKit.PDFDocument, label: string, value: boolean | null | undefined) {
  const y = doc.y;
  const yn = value === true ? "Y" : value === false ? "N" : "—";
  const color = value === true ? SUCCESS : value === false ? "#EF4444" : MID_GRAY;
  doc.fontSize(9).fillColor(color).font("Helvetica-Bold").text(`[${yn}]`, 58, y, { width: 28 });
  doc.fillColor(DARK).font("Helvetica").text(label, 90, y, { width: doc.page.width - 150 });
  doc.moveDown(0.15);
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string | null | undefined) {
  if (!value) return;
  doc.fontSize(9).fillColor(MID_GRAY).font("Helvetica").text(label + ": ", 58, doc.y, { continued: true });
  doc.fillColor(DARK).font("Helvetica-Bold").text(value || "—");
}

function accessoryRow(
  doc: PDFKit.PDFDocument,
  label: string,
  item: { checked: boolean; qty: string; location: string; switchLocation?: string },
) {
  const y = doc.y;
  const box = item.checked ? "&" : "&";
  doc.fontSize(10).fillColor(item.checked ? SUCCESS : DARK).font("Helvetica-Bold").text(box, 58, y, { width: 14 });
  doc.fillColor(DARK).font("Helvetica").fontSize(10).text(label, 76, y, { width: 140 });
  doc.fillColor(MID_GRAY).font("Helvetica").fontSize(8).text(`Qty: ${item.qty || "—"}`, 230, y, { width: 50 });
  doc.text(`Loc: ${item.location || "—"}`, 290, y, { width: 110 });
  if (item.switchLocation !== undefined) {
    doc.text(`Switch: ${item.switchLocation || "—"}`, 410, y, { width: 80 });
  }
  doc.fillColor(DARK).fontSize(10).moveDown(0.18);
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
) {
  if (doc.y > doc.page.height - 160) doc.addPage();
  const y = doc.y + 6;
  doc.rect(50, y, doc.page.width - 100, 18).fill(LIGHT_GRAY);
  doc.fillColor(DARK).fontSize(9).font("Helvetica-Bold").text(title, 58, y + 4);
  doc.fillColor(DARK).font("Helvetica").moveDown(0.2);

  const yn = (v: boolean | null) => (v === true ? "Y" : v === false ? "N" : "—");
  doc.fontSize(9).fillColor(MID_GRAY).text(
    `Needed: ${yn(item.needed)}   Additional Cost: ${yn(item.additionalCost)}   Addendum: ${yn(item.addendumNeeded)}   Responsible: ${item.responsibleParty ?? "—"}`,
    58,
    doc.y,
    { width: doc.page.width - 120 },
  );
  if (item.contractor) labelValue(doc, "Contractor", item.contractor);
  if (item.scopeOfWork) {
    doc.fontSize(9).fillColor(MID_GRAY).text("Scope: ", 58, doc.y, { continued: true });
    doc.fillColor(DARK).text(item.scopeOfWork, { width: doc.page.width - 130 });
  }
  doc.moveDown(0.4);
}

function pageFooter(doc: PDFKit.PDFDocument) {
  // Position footer near bottom of page (respecting bottom margin of 60pt)
  // Page height is 792pt (11 inches), so footer should be at 792 - 60 - 20 = 712pt to stay within margin
  const footerY = doc.page.height - 70;
  doc.moveTo(50, footerY).lineTo(150, footerY).strokeColor(DARK).lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor(MID_GRAY).text("Client Initials", 50, footerY + 3);
  const rightX = doc.page.width - 200;
  doc.fontSize(8).fillColor(MID_GRAY).text("DOS - PRE-CONSTRUCTION MEETING CHECKLIST", rightX, footerY + 3, { width: 160, align: "right" });
}

export async function generatePreconPdf(checklist: any): Promise<Buffer> {
  const fd: PreconFormData = { ...(checklist.formData ?? {}) } as any;
  const projectName = checklist.projectName ?? "—";
  const projectAddress = checklist.projectAddress ?? "—";
  const supervisor = checklist.supervisorName ?? "—";
  const meetingDate = checklist.meetingDate ?? "—";

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margins: { top: 90, bottom: 60, left: 50, right: 50 } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Page 1 ──────────────────────────────────────────────────────────────
    drawHeader(doc, projectName);
    doc.moveDown(0.5);

    // Project Info
    sectionHeader(doc, "Project Information");
    labelValue(doc, "Project Name", projectName);
    labelValue(doc, "Address", projectAddress);
    labelValue(doc, "Project Supervisor", supervisor);
    labelValue(doc, "Meeting Date", fmtDate(meetingDate));
    doc.moveDown(0.4);

    // General Checklist
    sectionHeader(doc, "General Checklist");
    checkRow(doc, "Project Payment outline is reviewed and start of work payment collected as per contract", fd.paymentReviewed ?? false);
    if (fd.materialDropOffLocation) labelValue(doc, "Location of Material Drop Off", fd.materialDropOffLocation);
    if (fd.stagingAreaLocation) labelValue(doc, "Location of Work Staging Area", fd.stagingAreaLocation);
    checkRow(doc, "Area of installation to be clear of obstacles prior to start of work", fd.siteWillBeClear ?? false);
    checkRow(doc, "Review Plan and all components", fd.planReviewed ?? false);
    checkRow(doc, "Discuss Future Optional Add-ons to ensure provisions are in place", fd.futureAddOnsDiscussed ?? false);
    doc.moveDown(0.4);

    // StruXure Details
    sectionHeader(doc, "StruXure Details");
    if (fd.struxureZones) labelValue(doc, "# of StruXure Zones", fd.struxureZones);
    if (fd.controlBoxLocation) labelValue(doc, "Control Box Location", fd.controlBoxLocation);
    if (fd.rainSensorLocation) labelValue(doc, "Rain Sensor Location", fd.rainSensorLocation);
    if (fd.windSensorLocation) labelValue(doc, "Wind Sensor Location", fd.windSensorLocation);
    doc.moveDown(0.4);

    // Accessories
    sectionHeader(doc, "Accessories (Qty & Location)");
    const acc = fd.accessories;
    if (acc) {
      accessoryRow(doc, "Accessory Beam(s)", acc.accessoryBeams ?? { checked: false, qty: "", location: "" });
      accessoryRow(doc, "Add. Receptacle(s)", acc.receptacles ?? { checked: false, qty: "", location: "" });
      accessoryRow(doc, "Motorized Screen(s)", acc.motorizedScreens ?? { checked: false, qty: "", location: "" });
      accessoryRow(doc, "Light(s)", { ...(acc.lights ?? { checked: false, qty: "", location: "" }), switchLocation: (acc.lights as any)?.switchLocation ?? "" });
      accessoryRow(doc, "Fan(s)", { ...(acc.fans ?? { checked: false, qty: "", location: "" }), switchLocation: (acc.fans as any)?.switchLocation ?? "" });
      accessoryRow(doc, "Heater(s)", { ...(acc.heaters ?? { checked: false, qty: "", location: "" }), switchLocation: (acc.heaters as any)?.switchLocation ?? "" });
      accessoryRow(doc, "Sconce Lighting", acc.sconceLighting ?? { checked: false, qty: "", location: "" });
      accessoryRow(doc, "System Downspouts", acc.systemDownspouts ?? { checked: false, qty: "", location: "" });
    }
    pageFooter(doc);

    // ── Page 2 ──────────────────────────────────────────────────────────────
    doc.addPage();
    drawHeader(doc, projectName);
    doc.y = 90 + 12;  // Ensure cursor is below header
    doc.moveDown(0.5);

    // Decorative Features
    sectionHeader(doc, "Decorative Features");
    const dec = fd.decorative;
    if (dec) {
      const features = [
        ["Post Bases", dec.postBases],
        ["Post Capitals", dec.postCapitals],
        ["Post Wraps", dec.postWraps],
        ["Pergola Cuts", dec.pergolaCuts],
        ["1-Step Cornice", dec.oneStepCornice],
        ["2-Step Cornice", dec.twoStepCornice],
        ["TRAX Rise", dec.traxRise],
        ["LED Strip Light (Gutter)", dec.ledStripGutter],
        ["LED Strip Lights (TRAX)", dec.ledStripTrax],
      ] as [string, boolean][];
      // 2-column layout
      for (let i = 0; i < features.length; i += 2) {
        const y = doc.y;
        const [l1, v1] = features[i];
        const [l2, v2] = features[i + 1] ?? ["", null];
        const b1 = v1 ? "&" : "&";
        const b2 = v2 === null ? "" : v2 ? "&" : "&";
        doc.fontSize(10).fillColor(v1 ? SUCCESS : DARK).font("Helvetica-Bold").text(b1, 58, y, { width: 14 });
        doc.fillColor(DARK).font("Helvetica").fontSize(10).text(l1, 76, y, { width: 170 });
        if (l2) {
          doc.fillColor(v2 ? SUCCESS : DARK).font("Helvetica-Bold").text(b2, 270, y, { width: 14 });
          doc.fillColor(DARK).font("Helvetica").fontSize(10).text(l2, 288, y, { width: 170 });
        }
        doc.moveDown(0.22);
      }
      if (dec.other) labelValue(doc, "Other", dec.other);
    }
    doc.moveDown(0.4);

    // Pergola Review
    sectionHeader(doc, "Pergola Review");
    const perg = fd.pergola;
    if (perg) {
      checkRow(doc, "Location of Pergola reviewed", perg.locationReviewed ?? false);
      if (perg.height) labelValue(doc, "Height of Pergola", perg.height);
      if (perg.slope) labelValue(doc, "Slope of Pergola", perg.slope);
      if (perg.drainElevation) labelValue(doc, "Elevation drain lines will exit posts", perg.drainElevation);
      checkRow(doc, "Labeled the Posts that the Wiring will Enter Pergola", perg.wiringPostsLabeled ?? false);
      checkRow(doc, "Wire Diagram reviewed", perg.wireDiagramReviewed ?? false);
      if (perg.wireFeetPerPost) labelValue(doc, "Amount (in Feet) of Wire for all items", perg.wireFeetPerPost);
    }
    doc.moveDown(0.4);

    // Client Expectations
    sectionHeader(doc, "Reviewed with Client — Expectations");
    const exp = fd.expectations;
    if (exp) {
      checkRow(doc, "Approximate Time of Construction reviewed", exp.constructionTimeReviewed ?? false);
      checkRow(doc, "Aluminum shavings will be cleaned — minor pieces may remain", exp.aluminumShavingsReviewed ?? false);
      checkRow(doc, "Minor leaks may occur after installation — will be addressed promptly", exp.minorLeaksReviewed ?? false);
      checkRow(doc, "Reviewed any changes or alterations to the original contract", exp.contractChangesReviewed ?? false);
      checkRow(doc, "Identified any addendums needed for additional work outside contract scope", exp.addendumsIdentified ?? false);
    }
    pageFooter(doc);

    // ── Page 3 ──────────────────────────────────────────────────────────────
    doc.addPage();
    drawHeader(doc, projectName);
    doc.y = 90 + 12;  // Ensure cursor is below header
    doc.moveDown(0.5);

    // Photos
    sectionHeader(doc, "Photos Were Taken Of");
    const ph = fd.photos;
    if (ph) {
      checkRow(doc, "Driveway & Access Conditions", ph.driveway ?? false);
      checkRow(doc, "Location of Staging Area", ph.stagingArea ?? false);
      checkRow(doc, "Location of Pergola", ph.pergolLocation ?? false);
      checkRow(doc, "Location of Work Area", ph.workArea ?? false);
      checkRow(doc, "Location of the Posts to be Installed", ph.postLocations ?? false);
      checkRow(doc, "Any and all Photos of any Damage to the Property or Dwelling Prior to Starting Work", ph.priorDamage ?? false);
      checkRow(doc, "Any Circumstance that will Prohibit the Installation of the Pergola", ph.installationProhibitions ?? false);
    }
    doc.moveDown(0.4);

    pageFooter(doc);

    // ── Page 4 ──────────────────────────────────────────────────────────────
    doc.addPage();
    drawHeader(doc, projectName);
    doc.y = 90 + 12;  // Ensure cursor is below header
    doc.moveDown(0.5);

    // Work Items
    sectionHeader(doc, "Additional Work Items");
    const wi = fd.workItems;
    if (wi) {
      workItemBlock(doc, "Electrical Work", wi.electrical ?? { needed: null, additionalCost: null, addendumNeeded: null, responsibleParty: null, contractor: "", scopeOfWork: "" });
      workItemBlock(doc, "Footings", wi.footings ?? { needed: null, additionalCost: null, addendumNeeded: null, responsibleParty: null, contractor: "", scopeOfWork: "" });
      workItemBlock(doc, "Patio Alterations", wi.patioAlterations ?? { needed: null, additionalCost: null, addendumNeeded: null, responsibleParty: null, contractor: "", scopeOfWork: "" });
      workItemBlock(doc, "Deck Alterations", wi.deckAlterations ?? { needed: null, additionalCost: null, addendumNeeded: null, responsibleParty: null, contractor: "", scopeOfWork: "" });
      workItemBlock(doc, "House Gutter Alterations", wi.houseGutterAlterations ?? { needed: null, additionalCost: null, addendumNeeded: null, responsibleParty: null, contractor: "", scopeOfWork: "" });
    }

    // Notes
    if (fd.projectNotes || fd.clientRemarks) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      sectionHeader(doc, "Project Notes");
      if (fd.projectNotes) {
        doc.fontSize(9).fillColor(MID_GRAY).text("StruXure Project Notes:", 58, doc.y);
        doc.fillColor(DARK).fontSize(10).text(fd.projectNotes, 58, doc.y, { width: doc.page.width - 120 });
        doc.moveDown(0.4);
      }
      if (fd.clientRemarks) {
        doc.fontSize(9).fillColor(MID_GRAY).text("Client Remarks / Requests:", 58, doc.y);
        doc.fillColor(DARK).fontSize(10).text(fd.clientRemarks, 58, doc.y, { width: doc.page.width - 120 });
        doc.moveDown(0.4);
      }
    }
    pageFooter(doc);

    // ── Signature Page ───────────────────────────────────────────────────────
    doc.addPage();
    drawHeader(doc, projectName);
    doc.y = 90 + 12;  // Ensure cursor is below header
    doc.moveDown(1);

    doc.fontSize(10).fillColor(DARK).font("Helvetica")
      .text(
        "We kindly request your acknowledgment by signing below, confirming your understanding of the items discussed on this Pre-Construction checklist. Your signature will serve as a clear indication that you are aware of and in agreement with the points covered in this checklist, helping ensure a successful and smooth pre-construction process. Thank you for your cooperation and commitment to a successful project.",
        58,
        doc.y,
        { width: doc.page.width - 120, align: "justify" },
      );
    doc.moveDown(2);

    // Supervisor signature
    const sigY1 = doc.y;
    doc.moveTo(58, sigY1).lineTo(280, sigY1).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(MID_GRAY).text("Project Supervisor Signature", 58, sigY1 + 4);
    doc.moveTo(300, sigY1).lineTo(520, sigY1).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.text("Print Name / Date", 300, sigY1 + 4);
    if (checklist.supervisorSignedName) {
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11).text(checklist.supervisorSignedName, 300, sigY1 - 14, { width: 220 });
    }
    doc.moveDown(2.5);

    // Client 1 signature
    const sigY2 = doc.y;
    doc.moveTo(58, sigY2).lineTo(280, sigY2).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(MID_GRAY).text("Client / Authorized Signature", 58, sigY2 + 4);
    doc.moveTo(300, sigY2).lineTo(520, sigY2).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.text("Print Name / Date", 300, sigY2 + 4);
    if (checklist.client1SignedName) {
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11).text(checklist.client1SignedName, 300, sigY2 - 14, { width: 220 });
    }
    doc.moveDown(2.5);

    // Client 2 signature (optional)
    const sigY3 = doc.y;
    doc.moveTo(58, sigY3).lineTo(280, sigY3).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(MID_GRAY).text("Client / Authorized Signature (2nd)", 58, sigY3 + 4);
    doc.moveTo(300, sigY3).lineTo(520, sigY3).strokeColor(DARK).lineWidth(0.5).stroke();
    doc.text("Print Name / Date", 300, sigY3 + 4);
    if (checklist.client2SignedName) {
      doc.fillColor(DARK).font("Helvetica-Bold").fontSize(11).text(checklist.client2SignedName, 300, sigY3 - 14, { width: 220 });
    }
    pageFooter(doc);

    doc.end();
  });
}
