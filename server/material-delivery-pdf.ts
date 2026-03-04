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
import https from "https";
import http from "http";

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

/** Download a remote URL to a Buffer */
function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function drawHeader(doc: PDFKit.PDFDocument, title: string) {
  // Header background
  const HEADER_H = 88;
  doc.rect(0, 0, doc.page.width, HEADER_H).fill(BRAND_BLUE);

  // Left side: Company branding (text-based, no image dependency)
  // "DOS" box
  doc.roundedRect(40, 14, 52, 52, 4).fill("#4A5568");
  doc.fillColor("#FFFFFF").fontSize(22).font("Helvetica-Bold").text("DOS", 44, 28, { width: 44, align: "center" });

  // Vertical divider
  doc.moveTo(102, 18).lineTo(102, 74).strokeColor("#FFFFFF").lineWidth(1).stroke();

  // Company name text
  doc.fillColor("#FFFFFF").fontSize(14).font("Helvetica-Bold").text("Distinctive", 112, 20);
  doc.fillColor("#FFFFFF").fontSize(14).font("Helvetica-Bold").text("Outdoor Structures", 112, 38);
  doc.fillColor("#93C5FD").fontSize(7).font("Helvetica").text("BE UNIQUE. BE DISTINCTIVE", 112, 60);

  // Right side: document title and project name
  const rightX = doc.page.width - 260;
  const rightW = 220;
  doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold")
    .text("Material Delivery Checklist", rightX, 22, { width: rightW, align: "right" });
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
  materialsLoadedPhotos?: string[] | null;
  materialsDeliveredPhotos?: string[] | null;
  attachments?: Array<{ url: string; name: string; type: string; uploadedByName: string; uploadedAt: string }>;
  auditTrail?: Array<{ userName: string; action: string; timestamp: string }>;
}

export async function generateMaterialDeliveryPDF(data: MaterialDeliveryPDFData): Promise<Buffer> {
  // Pre-download all photos so we can embed them synchronously in the PDF
  const loadingPhotoBuffers: Buffer[] = [];
  const deliveryPhotoBuffers: Buffer[] = [];

  if (data.materialsLoadedPhotos?.length) {
    for (const url of data.materialsLoadedPhotos) {
      try {
        const buf = await fetchBuffer(url);
        loadingPhotoBuffers.push(buf);
      } catch { /* skip failed downloads */ }
    }
  }
  if (data.materialsDeliveredPhotos?.length) {
    for (const url of data.materialsDeliveredPhotos) {
      try {
        const buf = await fetchBuffer(url);
        deliveryPhotoBuffers.push(buf);
      } catch { /* skip failed downloads */ }
    }
  }

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

      doc.fontSize(9).fillColor(MID_GRAY).font("Helvetica").text("Materials Loaded: ", { continued: true });
      doc.fillColor(loadedColor).font("Helvetica-Bold").text(data.materialsLoaded ? "YES ✓" : "NO",
        { continued: !!data.materialsLoadedByName });
      if (data.materialsLoadedByName) {
        const loadedAt = data.materialsLoadedAt ? fmtDate(data.materialsLoadedAt) : "";
        doc.fillColor(MID_GRAY).font("Helvetica").fontSize(8)
          .text(`  — by ${data.materialsLoadedByName}${loadedAt ? " on " + loadedAt : ""}`);
      }

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

      if (ps.motorizedScreens?.items?.length > 0) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(ACCENT).text("Motorized Screens").moveDown(0.2);
        for (const item of ps.motorizedScreens.items) {
          itemRow(doc, item.name || "Item", item.qty, item.notes);
        }
      }

      if (ps.fans?.hasFans) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(ACCENT).text("Fans").moveDown(0.2);
        doc.fillColor(DARK).font("Helvetica");
        if (ps.fans.items?.length > 0) {
          for (const item of ps.fans.items) {
            itemRow(doc, item.name || "Fan", item.qty, item.notes);
          }
        }
      }

      if (ps.heaters?.hasHeaters) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(ACCENT).text("Heaters").moveDown(0.2);
        doc.fillColor(DARK).font("Helvetica");
        if (ps.heaters.items?.length > 0) {
          for (const item of ps.heaters.items) {
            itemRow(doc, item.name || "Heater", item.qty, item.notes);
          }
        }
      }

      if (ps.customItems?.items?.length > 0) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(ACCENT).text("Additional Items").moveDown(0.2);
        doc.fillColor(DARK).font("Helvetica");
        for (const item of ps.customItems.items) {
          itemRow(doc, item.name || "Item", item.qty, item.notes);
        }
      }
    }

    // ── Loading Photos ────────────────────────────────────────────────────────
    if (loadingPhotoBuffers.length > 0) {
      doc.addPage();
      drawHeader(doc, data.projectName);
      doc.y = 90 + 14;
      sectionHeader(doc, "Loading Photos");
      doc.moveDown(0.6);

      const PHOTO_W = (doc.page.width - 140) / 2; // 2 columns
      const PHOTO_H = 160;
      let col = 0;
      let rowY = doc.y;

      for (const buf of loadingPhotoBuffers) {
        try {
          const x = 50 + col * (PHOTO_W + 20);
          // Check if we need a new page
          if (rowY + PHOTO_H + 20 > doc.page.height - 60) {
            doc.addPage();
            drawHeader(doc, data.projectName);
            doc.y = 90 + 14;
            rowY = doc.y;
            col = 0;
          }
          doc.image(buf, x, rowY, { width: PHOTO_W, height: PHOTO_H, fit: [PHOTO_W, PHOTO_H] });
          col++;
          if (col >= 2) {
            col = 0;
            rowY += PHOTO_H + 12;
            doc.y = rowY;
          }
        } catch { /* skip unreadable images */ }
      }
      if (col > 0) {
        doc.y = rowY + PHOTO_H + 12;
      }
    }

    // ── Delivery Photos ───────────────────────────────────────────────────────
    if (deliveryPhotoBuffers.length > 0) {
      doc.addPage();
      drawHeader(doc, data.projectName);
      doc.y = 90 + 14;
      sectionHeader(doc, "Delivery Photos");
      doc.moveDown(0.6);

      const PHOTO_W = (doc.page.width - 140) / 2;
      const PHOTO_H = 160;
      let col = 0;
      let rowY = doc.y;

      for (const buf of deliveryPhotoBuffers) {
        try {
          const x = 50 + col * (PHOTO_W + 20);
          if (rowY + PHOTO_H + 20 > doc.page.height - 60) {
            doc.addPage();
            drawHeader(doc, data.projectName);
            doc.y = 90 + 14;
            rowY = doc.y;
            col = 0;
          }
          doc.image(buf, x, rowY, { width: PHOTO_W, height: PHOTO_H, fit: [PHOTO_W, PHOTO_H] });
          col++;
          if (col >= 2) {
            col = 0;
            rowY += PHOTO_H + 12;
            doc.y = rowY;
          }
        } catch { /* skip unreadable images */ }
      }
      if (col > 0) {
        doc.y = rowY + PHOTO_H + 12;
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
        // Capture y BEFORE drawing the rect
        const rowY = doc.y;
        doc.rect(50, rowY, doc.page.width - 100, 40).fill(LIGHT_GRAY);
        doc.fillColor(DARK).fontSize(10).font("Helvetica-Bold")
          .text(po.name, 60, rowY + 8, { width: doc.page.width - 140 });
        doc.fillColor(MID_GRAY).fontSize(8).font("Helvetica")
          .text(`Uploaded by ${po.uploadedByName} on ${fmtDate(po.uploadedAt)}`, 60, rowY + 24, { width: 260 });
        doc.fillColor(ACCENT).fontSize(8)
          .text(po.url, 60, rowY + 24, { width: doc.page.width - 140, align: "right" });
        doc.y = rowY + 44;
        doc.fillColor(DARK).moveDown(0.3);
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
