/**
 * Server-side receipt PDF generator.
 * Produces a DOS-branded PDF matching the Google AI Studio format:
 *   Page 1 — Summary (classification, vendor, line items, totals)
 *   Page 2 — Original receipt image (if available)
 */
import PDFDocument from "pdfkit";

export interface ReceiptPDFData {
  fileName: string;
  submitterName?: string | null;
  expenseType?: string | null;
  jobName?: string | null;
  workOrderNumber?: string | null;
  poNumber?: string | null;
  overheadCategory?: string | null;
  vendorName?: string | null;
  vendorLocation?: string | null;
  purchaseDate?: string | null;
  materialCategory?: string | null;
  lineItems?: any[] | null;
  subtotal?: string | number | null;
  tax?: string | number | null;
  total?: string | number | null;
  notes?: string | null;
  imageUrl?: string | null;
  createdAt?: Date | null;
}

function fmt$(n: string | number | null | undefined): string {
  const v = parseFloat(String(n ?? "0"));
  return isNaN(v) ? "$0.00" : `$${v.toFixed(2)}`;
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export async function generateReceiptPDF(receipt: ReceiptPDFData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Brand header ──────────────────────────────────────────────────────────
    const BRAND_BLUE = "#1E3A5F";
    const ACCENT = "#2563EB";
    const LIGHT_GRAY = "#F3F4F6";
    const MID_GRAY = "#6B7280";
    const DARK = "#111827";

    // Header band
    doc.rect(0, 0, doc.page.width, 72).fill(BRAND_BLUE);

    doc
      .fillColor("#FFFFFF")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Distinctive Outdoor Structures", 50, 22);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Receipt Summary Report", 50, 48);

    // File name (top right)
    doc
      .fontSize(8)
      .fillColor("#CBD5E1")
      .text(receipt.fileName, doc.page.width - 300, 30, { width: 250, align: "right" });

    let y = 90;

    // ── Section helper ────────────────────────────────────────────────────────
    function sectionHeader(title: string) {
      doc
        .rect(50, y, doc.page.width - 100, 22)
        .fill(LIGHT_GRAY);
      doc
        .fillColor(BRAND_BLUE)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(title.toUpperCase(), 56, y + 6);
      y += 28;
    }

    function row(label: string, value: string, indent = 0) {
      doc
        .fillColor(MID_GRAY)
        .fontSize(9)
        .font("Helvetica")
        .text(label, 50 + indent, y, { width: 160 });
      doc
        .fillColor(DARK)
        .fontSize(9)
        .font("Helvetica")
        .text(value || "—", 220 + indent, y, { width: doc.page.width - 270 });
      y += 16;
    }

    // ── Classification Info ───────────────────────────────────────────────────
    sectionHeader("Classification Info");
    row("Submitted By:", receipt.submitterName || "—");
    row("Type:", receipt.expenseType === "OVERHEAD" ? "Overhead / General" : "Job Receipt");

    if (receipt.expenseType === "JOB") {
      row("Job Name:", receipt.jobName || "—");
      row("Job #:", receipt.workOrderNumber || "—");
      row("PO#:", receipt.poNumber || "N/A");
    } else {
      row("Category:", receipt.overheadCategory || "—");
    }

    y += 8;

    // ── Purchase Details ──────────────────────────────────────────────────────
    sectionHeader("Purchase Details");
    row("Vendor:", receipt.vendorName || "—");
    row("Location:", receipt.vendorLocation || "—");
    row("Material Class:", receipt.materialCategory || "—");
    row("Date:", fmtDate(receipt.purchaseDate));

    y += 8;

    // ── Line Items ────────────────────────────────────────────────────────────
    const lineItems: any[] = (() => {
      try {
        if (!receipt.lineItems) return [];
        if (typeof receipt.lineItems === "string") return JSON.parse(receipt.lineItems as string);
        return receipt.lineItems as any[];
      } catch {
        return [];
      }
    })();

    if (lineItems.length > 0) {
      sectionHeader("Line Items");

      // Table header
      const colX = { desc: 50, qty: 320, unit: 380, total: 460 };
      doc
        .fillColor(MID_GRAY)
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("Description", colX.desc, y, { width: 265 })
        .text("Qty", colX.qty, y, { width: 55, align: "right" })
        .text("Unit", colX.unit, y, { width: 75, align: "right" })
        .text("Total", colX.total, y, { width: 65, align: "right" });

      y += 14;
      doc
        .moveTo(50, y)
        .lineTo(doc.page.width - 50, y)
        .strokeColor("#E5E7EB")
        .lineWidth(0.5)
        .stroke();
      y += 6;

      for (const item of lineItems) {
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = 50;
        }
        doc
          .fillColor(DARK)
          .fontSize(9)
          .font("Helvetica")
          .text(item.description || "—", colX.desc, y, { width: 265 })
          .text(String(item.quantity ?? 1), colX.qty, y, { width: 55, align: "right" })
          .text(fmt$(item.unitPrice), colX.unit, y, { width: 75, align: "right" })
          .text(fmt$(item.lineTotal), colX.total, y, { width: 65, align: "right" });
        y += 16;
      }

      y += 8;
    }

    // ── Totals ────────────────────────────────────────────────────────────────
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 50;
    }

    sectionHeader("Totals");

    const totalsX = doc.page.width - 200;
    function totalRow(label: string, value: string, bold = false) {
      doc
        .fillColor(MID_GRAY)
        .fontSize(9)
        .font("Helvetica")
        .text(label, 50, y, { width: totalsX - 60 });
      doc
        .fillColor(bold ? ACCENT : DARK)
        .fontSize(bold ? 11 : 9)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .text(value, totalsX, y, { width: 140, align: "right" });
      y += bold ? 20 : 16;
    }

    totalRow("Subtotal:", fmt$(receipt.subtotal));
    totalRow("Tax:", fmt$(receipt.tax));

    doc
      .moveTo(totalsX - 10, y)
      .lineTo(doc.page.width - 50, y)
      .strokeColor("#E5E7EB")
      .lineWidth(0.5)
      .stroke();
    y += 6;

    totalRow("TOTAL:", fmt$(receipt.total), true);

    y += 8;

    // ── Notes ─────────────────────────────────────────────────────────────────
    if (receipt.notes) {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }
      sectionHeader("Notes");
      doc
        .fillColor(DARK)
        .fontSize(9)
        .font("Helvetica")
        .text(receipt.notes, 50, y, { width: doc.page.width - 100 });
      y += doc.heightOfString(receipt.notes, { width: doc.page.width - 100 }) + 12;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 40;
    doc
      .rect(0, footerY - 8, doc.page.width, 48)
      .fill(LIGHT_GRAY);
    doc
      .fillColor(MID_GRAY)
      .fontSize(8)
      .font("Helvetica")
      .text(
        `Generated by DOS Hub · ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        50,
        footerY,
        { align: "center", width: doc.page.width - 100 }
      );

    // ── Page 2: Receipt Image ─────────────────────────────────────────────────
    if (receipt.imageUrl) {
      try {
        // Fetch the image
        const imgRes = await fetch(receipt.imageUrl);
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";

          doc.addPage();

          // Page 2 header
          doc.rect(0, 0, doc.page.width, 50).fill(BRAND_BLUE);
          doc
            .fillColor("#FFFFFF")
            .fontSize(14)
            .font("Helvetica-Bold")
            .text("Original Receipt", 50, 16);
          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor("#CBD5E1")
            .text(receipt.fileName, doc.page.width - 300, 20, { width: 250, align: "right" });

          // Image
          const imgY = 70;
          const maxW = doc.page.width - 100;
          const maxH = doc.page.height - 130;

          doc.image(imgBuffer, 50, imgY, {
            fit: [maxW, maxH],
            align: "center",
          });
        }
      } catch (imgErr) {
        // If image fetch fails, add a note
        doc.addPage();
        doc
          .fillColor(MID_GRAY)
          .fontSize(12)
          .text("Receipt image could not be loaded.", 50, 100, { align: "center" });
      }
    }

    doc.end();
  });
}
