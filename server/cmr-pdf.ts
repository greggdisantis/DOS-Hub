/**
 * Server-side CMR (Client Meeting Report) PDF generator.
 * Uses PDFKit to produce a DOS-branded, fully-populated PDF.
 * Called from the tRPC cmr.exportPDF mutation.
 */
import PDFDocument from "pdfkit";

// ── Constants ─────────────────────────────────────────────────────────────────

const BRAND_BLUE = "#1E3A5F";
const ACCENT = "#2563EB";
const LIGHT_GRAY = "#F3F4F6";
const MID_GRAY = "#6B7280";
const DARK = "#111827";
const SUCCESS = "#16A34A";
const WARNING = "#D97706";
const ERROR = "#DC2626";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return d; }
}

function fmtCurrency(v?: string | number | null): string {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function labelList(
  options: { value: string; label: string }[],
  values: string[],
): string {
  if (!values?.length) return "—";
  return values.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ") || "—";
}

// ── Option maps (mirrors client-side types.ts) ────────────────────────────────

const DEAL_STATUS_LABELS: Record<string, string> = {
  "actively-considering": "Actively Considering",
  "working-design": "Working on Design / Proposal",
  "proposal-presented": "Proposal Presented / Sent",
  "sold": "Sold",
  "lost": "Lost",
  "no-decision": "No Decision Yet",
};

const LEAD_SOURCE_OPTIONS = [
  { value: "struXure-corp", label: "StruXure Corp" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook / Instagram" },
  { value: "referral", label: "Referral" },
  { value: "repeat-customer", label: "Repeat Customer" },
  { value: "home-show", label: "Home Show / Event" },
  { value: "yard-sign", label: "Yard Sign" },
  { value: "door-hanger", label: "Door Hanger" },
  { value: "direct-mail", label: "Direct Mail" },
  { value: "other", label: "Other" },
];

const PROJECT_TYPE_OPTIONS = [
  { value: "pergola-attached", label: "Pergola (Attached)" },
  { value: "pergola-freestanding", label: "Pergola (Freestanding)" },
  { value: "patio-cover", label: "Patio Cover" },
  { value: "screen-room", label: "Screen Room" },
  { value: "sunroom", label: "Sunroom" },
  { value: "carport", label: "Carport" },
  { value: "other", label: "Other" },
];

const VALUE_COMMUNICATED_OPTIONS = [
  { value: "quality", label: "Quality / Craftsmanship" },
  { value: "warranty", label: "Warranty" },
  { value: "customization", label: "Customization" },
  { value: "local", label: "Local / Family Business" },
  { value: "financing", label: "Financing Options" },
  { value: "timeline", label: "Timeline / Availability" },
  { value: "design", label: "Design Expertise" },
];

const OBJECTION_OPTIONS = [
  { value: "price", label: "Price" },
  { value: "timing", label: "Timing" },
  { value: "spouse", label: "Spouse / Decision Maker" },
  { value: "comparing", label: "Comparing Competitors" },
  { value: "financing", label: "Financing" },
  { value: "design", label: "Design / Style" },
  { value: "other", label: "Other" },
];

const MESSAGING_OPTIONS = [
  { value: "quality", label: "Quality" },
  { value: "local", label: "Local Business" },
  { value: "warranty", label: "Warranty" },
  { value: "financing", label: "Financing" },
  { value: "design", label: "Design" },
  { value: "other", label: "Other" },
];

// ── PDF generator ─────────────────────────────────────────────────────────────

export interface CmrPDFInput {
  clientName?: string | null;
  consultantName?: string | null;
  appointmentDate?: string | null;
  weekOf?: string | null;
  source?: string | null;
  address?: string | null;
  clientType?: string | null;
  appointmentType?: string | null;
  leadSources?: string[];
  projectTypes?: string[];
  dealStatus?: string | null;
  closeTimeline?: string | number | null;
  followUpDate?: string | null;
  proposalDate?: string | null;
  lostReason?: string | null;
  lastConversationSummary?: string | null;
  purchaseConfidencePct?: number | null;
  originalPcPct?: number | null;
  estimatedContractValue?: string | number | null;
  decisionMakers?: string | null;
  mainMotivation?: string | null;
  mainHesitation?: string | null;
  pcNotes?: string | null;
  financingDiscussed?: boolean | null;
  financingReaction?: string | null;
  valueCommunicated?: string[];
  clientResponse?: string | null;
  objections?: string[];
  objectionNotes?: string | null;
  nextActions?: string[];
  nextFollowUpDate?: string | null;
  leadQuality?: string | null;
  expectationAlignment?: string | null;
  messagingReferenced?: string[];
  budgetAlignment?: string | null;
  marketingNotes?: string | null;
}

export async function generateCmrPDF(data: CmrPDFInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 50;
    const contentW = pageW - margin * 2;

    // ── Header band ───────────────────────────────────────────────────────────
    doc.rect(0, 0, pageW, 76).fill(BRAND_BLUE);
    doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold")
      .text("Distinctive Outdoor Structures", margin, 18);
    doc.fontSize(10).font("Helvetica")
      .text("Client Meeting Report", margin, 44);

    // PC badge (top right)
    const pc = data.purchaseConfidencePct ?? 0;
    const pcColor = pc >= 70 ? SUCCESS : pc >= 40 ? WARNING : ERROR;
    doc.roundedRect(pageW - 100, 18, 70, 28, 14).fill(pcColor);
    doc.fillColor("#FFFFFF").fontSize(14).font("Helvetica-Bold")
      .text(`${pc}% PC`, pageW - 100, 26, { width: 70, align: "center" });

    let y = 92;

    // ── Client hero block ─────────────────────────────────────────────────────
    doc.rect(margin, y, contentW, 54).fill(LIGHT_GRAY);
    doc.fillColor(DARK).fontSize(16).font("Helvetica-Bold")
      .text(data.clientName || "Unnamed Client", margin + 12, y + 8, { width: contentW - 24 });
    doc.fillColor(MID_GRAY).fontSize(10).font("Helvetica")
      .text(
        `${fmtDate(data.appointmentDate)}  ·  ${data.consultantName || "—"}  ·  ${fmtCurrency(data.estimatedContractValue)}`,
        margin + 12, y + 30, { width: contentW - 24 },
      );
    y += 66;

    // ── Section helper ────────────────────────────────────────────────────────
    function section(title: string) {
      if (y > pageH - 120) { doc.addPage(); y = margin; }
      doc.rect(margin, y, contentW, 18).fill(BRAND_BLUE);
      doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold")
        .text(title.toUpperCase(), margin + 8, y + 5, { width: contentW - 16 });
      y += 22;
    }

    // ── Row helper ────────────────────────────────────────────────────────────
    let rowEven = false;
    function row(label: string, value?: string | null) {
      if (!value || value === "—") return;
      const rowH = Math.max(
        18,
        doc.heightOfString(value, { width: contentW * 0.62, fontSize: 9 }) + 8,
      );
      if (y + rowH > pageH - 60) { doc.addPage(); y = margin; rowEven = false; }
      if (rowEven) doc.rect(margin, y, contentW, rowH).fill("#F9FAFB");
      rowEven = !rowEven;
      doc.fillColor(MID_GRAY).fontSize(9).font("Helvetica-Bold")
        .text(label, margin + 8, y + 5, { width: contentW * 0.34 });
      doc.fillColor(DARK).fontSize(9).font("Helvetica")
        .text(value, margin + contentW * 0.36, y + 5, { width: contentW * 0.62 });
      y += rowH;
    }

    // ── Section 1: Client Information ─────────────────────────────────────────
    section("Client Information");
    rowEven = false;
    row("Consultant", data.consultantName);
    row("Week Of", fmtDate(data.weekOf));
    row("Source",
      data.source === "marketing-in-home" ? "Marketing – In-Home"
      : data.source === "marketing-showroom" ? "Marketing – Showroom"
      : data.source === "self-generated" ? "Self-Generated"
      : data.source ?? null,
    );
    row("Address", data.address);
    row("Client Type",
      data.clientType === "residential" ? "Residential"
      : data.clientType === "commercial" ? "Commercial"
      : data.clientType ?? null,
    );
    row("Appointment Type",
      data.appointmentType === "in-home" ? "In-Home"
      : data.appointmentType === "showroom" ? "Showroom"
      : data.appointmentType === "phone" ? "Phone"
      : data.appointmentType ?? null,
    );
    row("Lead Source(s)", labelList(LEAD_SOURCE_OPTIONS, data.leadSources ?? []));
    row("Project Type(s)", labelList(PROJECT_TYPE_OPTIONS, data.projectTypes ?? []));
    y += 6;

    // ── Section 2: Deal Status ────────────────────────────────────────────────
    section("Deal Status");
    rowEven = false;
    row("Status", data.dealStatus ? (DEAL_STATUS_LABELS[data.dealStatus] ?? data.dealStatus) : null);
    row("Close Timeline", data.closeTimeline ? `${data.closeTimeline} days` : null);
    row("Follow-Up Date", fmtDate(data.followUpDate));
    row("Proposal Date", fmtDate(data.proposalDate));
    row("Lost Reason", data.lostReason);
    row("Conversation Summary", data.lastConversationSummary);
    y += 6;

    // ── Section 3: Purchase Confidence ───────────────────────────────────────
    section("Purchase Confidence");
    rowEven = false;
    row("Current PC%", pc != null ? `${pc}%` : null);
    row("Original PC%", data.originalPcPct != null ? `${data.originalPcPct}%` : null);
    row("Estimated Value", fmtCurrency(data.estimatedContractValue));
    row("Decision Makers", data.decisionMakers);
    row("Main Motivation", data.mainMotivation);
    row("Main Hesitation", data.mainHesitation);
    row("PC Notes", data.pcNotes);
    y += 6;

    // ── Section 4: Value & Objections ─────────────────────────────────────────
    section("Value Communicated & Objections");
    rowEven = false;
    row("Financing Discussed?",
      data.financingDiscussed === true ? "Yes"
      : data.financingDiscussed === false ? "No"
      : null,
    );
    row("Financing Reaction",
      data.financingReaction === "interested" ? "Interested"
      : data.financingReaction === "needs-followup" ? "Needs Follow-Up"
      : data.financingReaction === "declined" ? "Declined"
      : data.financingReaction ?? null,
    );
    row("Value Communicated", labelList(VALUE_COMMUNICATED_OPTIONS, data.valueCommunicated ?? []));
    row("Client Response",
      data.clientResponse === "strong-alignment" ? "Strong Alignment"
      : data.clientResponse === "neutral" ? "Neutral"
      : data.clientResponse === "price-focused" ? "Price-Focused"
      : data.clientResponse === "comparing-online" ? "Comparing Online / Low-Cost"
      : data.clientResponse ?? null,
    );
    row("Objections", labelList(OBJECTION_OPTIONS, data.objections ?? []));
    row("Objection Notes", data.objectionNotes);
    y += 6;

    // ── Section 5: Next Steps ─────────────────────────────────────────────────
    section("Next Steps");
    rowEven = false;
    const nextActionLabels: Record<string, string> = {
      "followup-call": "Follow-Up Call",
      "design-revision": "Design Revision",
      "financing-followup": "Financing Follow-Up",
      "showroom-visit": "Showroom Visit",
      "site-revisit": "Site Revisit",
    };
    row("Next Action(s)",
      (data.nextActions ?? []).map((a) => nextActionLabels[a] ?? a).join(", ") || null,
    );
    row("Next Follow-Up Date", fmtDate(data.nextFollowUpDate));
    y += 6;

    // ── Section 6: Marketing Feedback (if applicable) ─────────────────────────
    const isMarketing = data.source === "marketing-in-home" || data.source === "marketing-showroom";
    if (isMarketing) {
      section("Marketing Feedback");
      rowEven = false;
      row("Lead Quality",
        data.leadQuality
          ? data.leadQuality.charAt(0).toUpperCase() + data.leadQuality.slice(1)
          : null,
      );
      row("Expectation Alignment",
        data.expectationAlignment === "yes" ? "Yes – Expectations aligned"
        : data.expectationAlignment === "somewhat" ? "Somewhat"
        : data.expectationAlignment === "no" ? "No – Mismatch"
        : data.expectationAlignment ?? null,
      );
      row("Messaging Referenced", labelList(MESSAGING_OPTIONS, data.messagingReferenced ?? []));
      row("Budget Alignment",
        data.budgetAlignment === "aligned" ? "Aligned"
        : data.budgetAlignment === "slightly-below" ? "Slightly below realistic range"
        : data.budgetAlignment === "significantly-below" ? "Significantly below realistic range"
        : data.budgetAlignment ?? null,
      );
      row("Marketing Notes", data.marketingNotes);
      y += 6;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = pageH - 36;
    doc.rect(0, footerY, pageW, 36).fill(LIGHT_GRAY);
    doc.fillColor(MID_GRAY).fontSize(8).font("Helvetica")
      .text(
        `DOS Hub  ·  Client Meeting Report  ·  ${data.clientName || "—"}  ·  ${fmtDate(data.appointmentDate)}  ·  Generated ${new Date().toLocaleDateString("en-US")}`,
        margin, footerY + 12, { width: contentW, align: "center" },
      );

    doc.end();
  });
}
