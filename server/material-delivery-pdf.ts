/**
 * Server-side Material Delivery Checklist PDF generator.
 * Produces a DOS-branded PDF with:
 *   - Cover page: project info + status
 *   - Boxed Items section
 *   - Delivery Items section
 *   - Project Specific Items section
 *   - Warehouse checkoffs (if applicable)
 *   - Loading & Delivery photos (if applicable)
 *   - Attached PO PDFs appended at the end
 */
import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve logo relative to this file (server/ directory -> assets/images/)
const DOS_LOGO_PATH = path.resolve(__dirname, "../assets/images/dos-logo.jpg");

const BRAND_BLUE = "#1E3A5F";
const ACCENT = "#2563EB";
const LIGHT_GRAY = "#F3F4F6";
const MID_GRAY = "#6B7280";
const DARK = "#111827";
const SUCCESS = "#16A34A";

function fmtDate(d?: string | Date | null): string {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function drawHeader(doc: PDFKit.PDFDocument, title: string) {
  // Header background — taller to fit logo + two lines of text
  const HEADER_H = 88;
  doc.rect(0, 0, doc.page.width, HEADER_H).fill(BRAND_BLUE);

  // DOS logo (white background area on left side)
  try {
    // Logo is 2048×471 px — scale to fit height 64 px inside header
    const logoH = 60;
    const logoW = Math.round((2048 / 471) * logoH); // ≈ 261 px
    // Draw a white pill behind the logo so it reads on the dark blue
    doc.roundedRect(40, 14, logoW + 12, logoH + 4, 4).fill("#FFFFFF");
    doc.image(DOS_LOGO_PATH, 46, 16, { height: logoH });
  } catch {
    // Fallback: just show text if logo fails to load
    doc.fillColor("#FFFFFF").fontSize(22).font("Helvetica-Bold").text("DOS Hub", 50, 18);
  }

  // Right side: document title (project name) and subtitle
  const rightX = doc.page.width - 260;
  const rightW = 220;
  doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold")
    .text("Material Delivery Checklist", rightX, 22, { width: rightW, align: "right" });
  // Status / project name — wrap if long
  doc.fillColor("#93C5FD").fontSize(9).font("Helvetica")
    .text(title, rightX, 40, { width: rightW, align: "right", lineBreak: false, ellipsis: true });

  doc.fillColor(DARK).font("Helvetica");
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  const y = doc.y + 12;
  doc.rect(50, y, doc.page.width - 100, 22).fill(BRAND_BLUE);
  doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold").text(title, 58, y + 6);
  doc.fillColor(DARK).font("Helvetica").moveDown(0.2);
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string | null | undefined) {
  if (!value) return;
  doc.fontSize(9).fillColor(MID_GRAY).font("Helvetica").text(label + ": ", { continued: true });
  doc.fillColor(DARK).font("Helvetica-Bold").text(value || "—");
}

function itemRow(doc: PDFKit.PDFDocument, label: string, qty: string | number | null | undefined, note?: string) {
  if (!qty && qty !== 0) return;
  const y = doc.y;
  doc.rect(50, y, doc.page.width - 100, 18).fill(LIGHT_GRAY);
  doc.fillColor(DARK).fontSize(9).font("Helvetica").text(label, 58, y + 5, { width: 280 });
  doc.font("Helvetica-Bold").text(String(qty), 340, y + 5, { width: 60, align: "right" });
  if (note) {
    doc.fillColor(MID_GRAY).font("Helvetica").fontSize(8).text(note, 410, y + 5, { width: 140 });
  }
  doc.fillColor(DARK).moveDown(0.1);
}

export interface MaterialDeliveryPDFData {
  projectName: string;
  clientName?: string | null;
  projectLocation?: string | null;
  supervisorName?: string | null;
  createdByName?: string | null;
  createdAt?: Date | string | null;
  status: string;
  boxedItems?: any;
  deliveryItems?: any;
  projectSpecificItems?: any;
  warehouseCheckoffs?: Record<string, boolean>;
  materialsLoaded?: boolean;
  materialsDelivered?: boolean;
  materialsLoadedByName?: string | null;
  materialsLoadedAt?: Date | string | null;
  materialsDeliveredByName?: string | null;
  materialsDeliveredAt?: Date | string | null;
  attachments?: Array<{ url: string; name: string; type: string; uploadedByName: string; uploadedAt: string }>;
  auditTrail?: Array<{ userName: string; action: string; timestamp: string }>;
}

export async function generateMaterialDeliveryPDF(data: MaterialDeliveryPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER", autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Cover / Project Info ──────────────────────────────────────────────────
    drawHeader(doc, data.projectName);
    doc.y = 90 + 14; // position below the taller header

    // Status badge — wide enough for long status text
    const statusLabel = data.status.replace(/_/g, " ").toUpperCase();
    const badgeW = Math.max(140, statusLabel.length * 7 + 20);
    const badgeY = doc.y;
    doc.rect(50, badgeY, badgeW, 22).fill(ACCENT);
    doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold")
      .text(statusLabel, 58, badgeY + 6, { width: badgeW - 16 });
    doc.fillColor(DARK).moveDown(0.8);

    // Project details
    sectionHeader(doc, "Project Information");
    doc.moveDown(0.4);
    labelValue(doc, "Project Name", data.projectName);
    labelValue(doc, "Client", data.clientName);
    labelValue(doc, "Location", data.projectLocation);
    labelValue(doc, "Supervisor", data.supervisorName);
    labelValue(doc, "Created By", data.createdByName);
    labelValue(doc, "Created", fmtDate(data.createdAt));

    // Loaded / Delivered status with checkoff attribution
    if (data.materialsLoaded !== undefined) {
      doc.moveDown(0.4);
      const loadedColor = data.materialsLoaded ? SUCCESS : "#DC2626";
      const deliveredColor = data.materialsDelivered ? SUCCESS : "#DC2626";

      // Materials Loaded
      doc.fontSize(9).fillColor(MID_GRAY).font("Helvetica").text("Materials Loaded: ", { continued: true });
      doc.fillColor(loadedColor).font("Helvetica-Bold").text(data.materialsLoaded ? "YES ✓" : "NO",
        { continued: !!data.materialsLoadedByName });
      if (data.materialsLoadedByName) {
        const loadedAt = data.materialsLoadedAt ? fmtDate(data.materialsLoadedAt) : "";
        doc.fillColor(MID_GRAY).font("Helvetica").fontSize(8)
          .text(`  — by ${data.materialsLoadedByName}${loadedAt ? " on " + loadedAt : ""}`);
      }

      // Materials Delivered
      doc.fontSize(9).fillColor(MID_GRAY).font("Helvetica").text("Materials Delivered: ", { continued: true });
      doc.fillColor(deliveredColor).font("Helvetica-Bold").text(data.materialsDelivered ? "YES ✓" : "NO",
        { continued: !!data.materialsDeliveredByName });
      if (data.materialsDeliveredByName) {
        const deliveredAt = data.materialsDeliveredAt ? fmtDate(data.materialsDeliveredAt) : "";
        doc.fillColor(MID_GRAY).font("Helvetica").fontSize(8)
          .text(`  — by ${data.materialsDeliveredByName}${deliveredAt ? " on " + deliveredAt : ""}`);
      }

      doc.fillColor(DARK).font("Helvetica");
    }

    // ── Boxed Items ───────────────────────────────────────────────────────────
    const b = data.boxedItems;
    if (b) {
      doc.addPage();
      drawHeader(doc, data.projectName);
      doc.y = 90 + 14;
      sectionHeader(doc, "Boxed Items — PVC Fittings");
      doc.moveDown(0.4);
      itemRow(doc, '6" Scupper', b.pvc?.scupper6);
      itemRow(doc, '8" Scupper', b.pvc?.scupper8);
      itemRow(doc, '3" Coupling', b.pvc?.coupling3);
      itemRow(doc, '3" to 2" Reducer', b.pvc?.reducer3to2);
      itemRow(doc, '3" Coupling (B)', b.pvc?.coupling3b);
      itemRow(doc, '2" Coupling', b.pvc?.coupling2);
      if (b.pvc?.custom) itemRow(doc, b.pvc.custom, b.pvc.customQty);

      sectionHeader(doc, "Boxed Items — Screen Screws");
      doc.moveDown(0.4);
      itemRow(doc, '1.5" Screen Screws', b.screenScrews?.size1_5);
      itemRow(doc, '2" Screen Screws', b.screenScrews?.size2);

      sectionHeader(doc, "Boxed Items — Ledger Locks");
      doc.moveDown(0.4);
      itemRow(doc, '2-7/8" Ledger Locks', b.ledgerLocks?.size2_7_8);
      itemRow(doc, '4.5" Ledger Locks', b.ledgerLocks?.size4_5);
      itemRow(doc, '6" Ledger Locks', b.ledgerLocks?.size6);

      sectionHeader(doc, "Boxed Items — Wedge Anchors");
      doc.moveDown(0.4);
      itemRow(doc, '5.5" Wedge Anchors', b.wedgeAnchors?.size5_5);
      if (b.wedgeAnchors?.custom) itemRow(doc, b.wedgeAnchors.custom, b.wedgeAnchors.customQty);

      sectionHeader(doc, "Boxed Items — Foam Tape & Sealants");
      doc.moveDown(0.4);
      itemRow(doc, "Foam Tape Roll", b.foamTape?.tapeRoll);
      itemRow(doc, "3M Dot", b.foamTape?.dot3m);
      itemRow(doc, "Flashing Tape", b.foamTape?.flashingTape);
      if (b.caulkSealants?.osiQuadMaxColor) itemRow(doc, `OSI Quad Max (${b.caulkSealants.osiQuadMaxColor})`, b.caulkSealants.osiQuadMaxQty);
      if (b.caulkSealants?.flexSealQty) itemRow(doc, `Flex Seal (${b.caulkSealants.flexSealColor || "no color"})`, b.caulkSealants.flexSealQty);
      itemRow(doc, "Ruscoe 12-3", b.caulkSealants?.ruscoe12_3Qty);
      if (b.caulkSealants?.customName) itemRow(doc, `${b.caulkSealants.customName} (${b.caulkSealants.customColor || ""})`, b.caulkSealants.customQty);

      if (b.ledLights?.hasLights) {
        sectionHeader(doc, "Boxed Items — LED Lights");
        doc.moveDown(0.4);
        itemRow(doc, `LED Lights — ${b.ledLights.type || "type TBD"} / ${b.ledLights.color || "color TBD"}`, b.ledLights.qty);
      }
    }

    // ── Project Specific Items ────────────────────────────────────────────────
    const ps = data.projectSpecificItems;
    if (ps) {
      doc.addPage();
      drawHeader(doc, data.projectName);
      doc.y = 90 + 14;
      sectionHeader(doc, "Project Specific Items");
      doc.moveDown(0.4);

      // Motorized screens
      if (ps.motorizedScreens?.items?.length > 0) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(ACCENT).text("Motorized Screens").moveDown(0.2);
        for (const item of ps.motorizedScreens.items) {
          itemRow(doc, item.name || "Item", item.qty, item.notes);
        }
      }

      // Fans
      if (ps.fans?.hasFans) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(ACCENT).text("Fans").moveDown(0.2);
        doc.fillColor(DARK).font("Helvetica");
        if (ps.fans.items?.length > 0) {
          for (const item of ps.fans.items) {
            itemRow(doc, item.name || "Fan", item.qty, item.notes);
          }
        }
      }

      // Heaters
      if (ps.heaters?.hasHeaters) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(ACCENT).text("Heaters").moveDown(0.2);
        doc.fillColor(DARK).font("Helvetica");
        if (ps.heaters.items?.length > 0) {
          for (const item of ps.heaters.items) {
            itemRow(doc, item.name || "Heater", item.qty, item.notes);
          }
        }
      }

      // Custom items
      if (ps.customItems?.items?.length > 0) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(ACCENT).text("Additional Items").moveDown(0.2);
        doc.fillColor(DARK).font("Helvetica");
        for (const item of ps.customItems.items) {
          itemRow(doc, item.name || "Item", item.qty, item.notes);
        }
      }
    }

    // ── Attached PO Files ─────────────────────────────────────────────────────
    const pdfs = (data.attachments ?? []).filter((a) => a.type === "application/pdf");
    if (pdfs.length > 0) {
      doc.addPage();
      drawHeader(doc, data.projectName);
      doc.y = 90 + 14;
      sectionHeader(doc, "Attached Purchase Orders");
      doc.moveDown(0.6);
      doc.fontSize(9).fillColor(MID_GRAY).text(
        "The following purchase orders are attached to this checklist. Print and include with delivery.",
      ).moveDown(0.6);
      for (const po of pdfs) {
        doc.rect(50, doc.y, doc.page.width - 100, 36).fill(LIGHT_GRAY);
        const y = doc.y - 36;
        doc.fillColor(DARK).fontSize(10).font("Helvetica-Bold").text(po.name, 60, y + 8, { width: 340 });
        doc.fillColor(MID_GRAY).fontSize(8).font("Helvetica").text(
          `Uploaded by ${po.uploadedByName} on ${fmtDate(po.uploadedAt)}`,
          60, y + 22, { width: 340 },
        );
        doc.fillColor(ACCENT).fontSize(8).text(po.url, 60, y + 22, { width: 340, align: "right" });
        doc.fillColor(DARK).moveDown(0.2);
      }
    }

    // ── Audit Trail ───────────────────────────────────────────────────────────
    if (data.auditTrail && data.auditTrail.length > 0) {
      doc.addPage();
      drawHeader(doc, data.projectName);
      doc.y = 90 + 14;
      sectionHeader(doc, "Audit Trail");
      doc.moveDown(0.4);
      for (const entry of data.auditTrail) {
        doc.fontSize(9).fillColor(MID_GRAY).font("Helvetica").text(
          `${fmtDate(entry.timestamp)} — ${entry.userName}: `,
          { continued: true },
        );
        doc.fillColor(DARK).font("Helvetica-Bold").text(entry.action);
      }
    }

    doc.end();
  });
}
