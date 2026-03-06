var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  storageGet: () => storageGet,
  storagePut: () => storagePut
});
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
async function buildDownloadUrl(baseUrl, relKey, apiKey) {
  const downloadApiUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(baseUrl));
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey)
  });
  return (await response.json()).url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}
async function storageGet(relKey) {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey)
  };
}
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_env();
  }
});

// server/_core/llm.ts
var llm_exports = {};
__export(llm_exports, {
  invokeLLM: () => invokeLLM
});
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    budget_tokens: 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`);
  }
  return await response.json();
}
var ensureArray, normalizeContentPart, normalizeMessage, normalizeToolChoice, resolveApiUrl, assertApiKey, normalizeResponseFormat;
var init_llm = __esm({
  "server/_core/llm.ts"() {
    "use strict";
    init_env();
    ensureArray = (value) => Array.isArray(value) ? value : [value];
    normalizeContentPart = (part) => {
      if (typeof part === "string") {
        return { type: "text", text: part };
      }
      if (part.type === "text") {
        return part;
      }
      if (part.type === "image_url") {
        return part;
      }
      if (part.type === "file_url") {
        return part;
      }
      throw new Error("Unsupported message content part");
    };
    normalizeMessage = (message) => {
      const { role, name, tool_call_id } = message;
      if (role === "tool" || role === "function") {
        const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
        return {
          role,
          name,
          tool_call_id,
          content
        };
      }
      const contentParts = ensureArray(message.content).map(normalizeContentPart);
      if (contentParts.length === 1 && contentParts[0].type === "text") {
        return {
          role,
          name,
          content: contentParts[0].text
        };
      }
      return {
        role,
        name,
        content: contentParts
      };
    };
    normalizeToolChoice = (toolChoice, tools) => {
      if (!toolChoice) return void 0;
      if (toolChoice === "none" || toolChoice === "auto") {
        return toolChoice;
      }
      if (toolChoice === "required") {
        if (!tools || tools.length === 0) {
          throw new Error("tool_choice 'required' was provided but no tools were configured");
        }
        if (tools.length > 1) {
          throw new Error(
            "tool_choice 'required' needs a single tool or specify the tool name explicitly"
          );
        }
        return {
          type: "function",
          function: { name: tools[0].function.name }
        };
      }
      if ("name" in toolChoice) {
        return {
          type: "function",
          function: { name: toolChoice.name }
        };
      }
      return toolChoice;
    };
    resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
    assertApiKey = () => {
      if (!ENV.forgeApiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
      }
    };
    normalizeResponseFormat = ({
      responseFormat,
      response_format,
      outputSchema,
      output_schema
    }) => {
      const explicitFormat = responseFormat || response_format;
      if (explicitFormat) {
        if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
          throw new Error("responseFormat json_schema requires a defined schema object");
        }
        return explicitFormat;
      }
      const schema = outputSchema || output_schema;
      if (!schema) return void 0;
      if (!schema.name || !schema.schema) {
        throw new Error("outputSchema requires both name and schema");
      }
      return {
        type: "json_schema",
        json_schema: {
          name: schema.name,
          schema: schema.schema,
          ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
        }
      };
    };
  }
});

// server/receipt-pdf.ts
var receipt_pdf_exports = {};
__export(receipt_pdf_exports, {
  generateReceiptPDF: () => generateReceiptPDF
});
import PDFDocument2 from "pdfkit";
function fmt$(n) {
  const v = parseFloat(String(n ?? "0"));
  return isNaN(v) ? "$0.00" : `$${v.toFixed(2)}`;
}
function fmtDate2(dateStr) {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}
async function generateReceiptPDF(receipt) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument2({ margin: 50, size: "LETTER" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const BRAND_BLUE4 = "#1E3A5F";
    const ACCENT2 = "#2563EB";
    const LIGHT_GRAY4 = "#F3F4F6";
    const MID_GRAY4 = "#6B7280";
    const DARK4 = "#111827";
    doc.rect(0, 0, doc.page.width, 72).fill(BRAND_BLUE4);
    doc.fillColor("#FFFFFF").fontSize(20).font("Helvetica-Bold").text("Distinctive Outdoor Structures", 50, 22);
    doc.fontSize(10).font("Helvetica").text("Receipt Summary Report", 50, 48);
    doc.fontSize(8).fillColor("#CBD5E1").text(receipt.fileName, doc.page.width - 300, 30, { width: 250, align: "right" });
    let y = 90;
    function sectionHeader3(title) {
      doc.rect(50, y, doc.page.width - 100, 22).fill(LIGHT_GRAY4);
      doc.fillColor(BRAND_BLUE4).fontSize(10).font("Helvetica-Bold").text(title.toUpperCase(), 56, y + 6);
      y += 28;
    }
    function row(label, value, indent = 0) {
      doc.fillColor(MID_GRAY4).fontSize(9).font("Helvetica").text(label, 50 + indent, y, { width: 160 });
      doc.fillColor(DARK4).fontSize(9).font("Helvetica").text(value || "\u2014", 220 + indent, y, { width: doc.page.width - 270 });
      y += 16;
    }
    sectionHeader3("Classification Info");
    row("Submitted By:", receipt.submitterName || "\u2014");
    row("Type:", receipt.expenseType === "OVERHEAD" ? "Overhead / General" : "Job Receipt");
    if (receipt.expenseType === "JOB") {
      row("Job Name:", receipt.jobName || "\u2014");
      row("Job #:", receipt.workOrderNumber || "\u2014");
      row("PO#:", receipt.poNumber || "N/A");
    } else {
      row("Category:", receipt.overheadCategory || "\u2014");
    }
    y += 8;
    sectionHeader3("Purchase Details");
    row("Vendor:", receipt.vendorName || "\u2014");
    row("Location:", receipt.vendorLocation || "\u2014");
    row("Material Class:", receipt.materialCategory || "\u2014");
    row("Date:", fmtDate2(receipt.purchaseDate));
    y += 8;
    const lineItems = (() => {
      try {
        if (!receipt.lineItems) return [];
        if (typeof receipt.lineItems === "string") return JSON.parse(receipt.lineItems);
        return receipt.lineItems;
      } catch {
        return [];
      }
    })();
    if (lineItems.length > 0) {
      sectionHeader3("Line Items");
      const colX = { desc: 50, qty: 320, unit: 380, total: 460 };
      doc.fillColor(MID_GRAY4).fontSize(8).font("Helvetica-Bold").text("Description", colX.desc, y, { width: 265 }).text("Qty", colX.qty, y, { width: 55, align: "right" }).text("Unit", colX.unit, y, { width: 75, align: "right" }).text("Total", colX.total, y, { width: 65, align: "right" });
      y += 14;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
      y += 6;
      for (const item of lineItems) {
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = 50;
        }
        doc.fillColor(DARK4).fontSize(9).font("Helvetica").text(item.description || "\u2014", colX.desc, y, { width: 265 }).text(String(item.quantity ?? 1), colX.qty, y, { width: 55, align: "right" }).text(fmt$(item.unitPrice), colX.unit, y, { width: 75, align: "right" }).text(fmt$(item.lineTotal), colX.total, y, { width: 65, align: "right" });
        y += 16;
      }
      y += 8;
    }
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 50;
    }
    sectionHeader3("Totals");
    const totalsX = doc.page.width - 200;
    function totalRow(label, value, bold = false) {
      doc.fillColor(MID_GRAY4).fontSize(9).font("Helvetica").text(label, 50, y, { width: totalsX - 60 });
      doc.fillColor(bold ? ACCENT2 : DARK4).fontSize(bold ? 11 : 9).font(bold ? "Helvetica-Bold" : "Helvetica").text(value, totalsX, y, { width: 140, align: "right" });
      y += bold ? 20 : 16;
    }
    totalRow("Subtotal:", fmt$(receipt.subtotal));
    totalRow("Tax:", fmt$(receipt.tax));
    doc.moveTo(totalsX - 10, y).lineTo(doc.page.width - 50, y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
    y += 6;
    totalRow("TOTAL:", fmt$(receipt.total), true);
    y += 8;
    if (receipt.notes) {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }
      sectionHeader3("Notes");
      doc.fillColor(DARK4).fontSize(9).font("Helvetica").text(receipt.notes, 50, y, { width: doc.page.width - 100 });
      y += doc.heightOfString(receipt.notes, { width: doc.page.width - 100 }) + 12;
    }
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY - 8, doc.page.width, 48).fill(LIGHT_GRAY4);
    doc.fillColor(MID_GRAY4).fontSize(8).font("Helvetica").text(
      `Generated by DOS Hub \xB7 ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      50,
      footerY,
      { align: "center", width: doc.page.width - 100 }
    );
    if (receipt.imageUrl) {
      try {
        const imgRes = await fetch(receipt.imageUrl);
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          doc.addPage();
          doc.rect(0, 0, doc.page.width, 50).fill(BRAND_BLUE4);
          doc.fillColor("#FFFFFF").fontSize(14).font("Helvetica-Bold").text("Original Receipt", 50, 16);
          doc.fontSize(9).font("Helvetica").fillColor("#CBD5E1").text(receipt.fileName, doc.page.width - 300, 20, { width: 250, align: "right" });
          const imgY = 70;
          const maxW = doc.page.width - 100;
          const maxH = doc.page.height - 130;
          doc.image(imgBuffer, 50, imgY, {
            fit: [maxW, maxH],
            align: "center"
          });
        }
      } catch (imgErr) {
        doc.addPage();
        doc.fillColor(MID_GRAY4).fontSize(12).text("Receipt image could not be loaded.", 50, 100, { align: "center" });
      }
    }
    doc.end();
  });
}
var init_receipt_pdf = __esm({
  "server/receipt-pdf.ts"() {
    "use strict";
  }
});

// server/aquaclean-receipt-pdf.ts
var aquaclean_receipt_pdf_exports = {};
__export(aquaclean_receipt_pdf_exports, {
  generateAquacleanReceiptPDF: () => generateAquacleanReceiptPDF
});
import PDFDocument3 from "pdfkit";
function fmt$2(n) {
  const v = parseFloat(String(n ?? "0"));
  return isNaN(v) ? "$0.00" : `$${v.toFixed(2)}`;
}
function fmtDate3(dateStr) {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}
async function generateAquacleanReceiptPDF(receipt) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument3({ margin: 50, size: "LETTER" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const BRAND_BLUE4 = "#1E3A5F";
    const ACCENT2 = "#2563EB";
    const LIGHT_GRAY4 = "#F3F4F6";
    const MID_GRAY4 = "#6B7280";
    const DARK4 = "#111827";
    doc.rect(0, 0, doc.page.width, 72).fill(BRAND_BLUE4);
    doc.fillColor("#FFFFFF").fontSize(20).font("Helvetica-Bold").text("AquaClean", 50, 22);
    doc.fontSize(10).font("Helvetica").text("AquaClean Receipt Summary Report", 50, 48);
    doc.fontSize(8).fillColor("#CBD5E1").text(receipt.fileName, doc.page.width - 300, 30, { width: 250, align: "right" });
    let y = 90;
    function sectionHeader3(title) {
      doc.rect(50, y, doc.page.width - 100, 22).fill(LIGHT_GRAY4);
      doc.fillColor(BRAND_BLUE4).fontSize(10).font("Helvetica-Bold").text(title.toUpperCase(), 56, y + 6);
      y += 28;
    }
    function row(label, value, indent = 0) {
      doc.fillColor(MID_GRAY4).fontSize(9).font("Helvetica").text(label, 50 + indent, y, { width: 160 });
      doc.fillColor(DARK4).fontSize(9).font("Helvetica").text(value || "\u2014", 220 + indent, y, { width: doc.page.width - 270 });
      y += 16;
    }
    sectionHeader3("Classification Info");
    row("Submitted By:", receipt.submitterName || "\u2014");
    row("Type:", receipt.expenseType === "OVERHEAD" ? "Overhead / General" : "Job Receipt");
    if (receipt.expenseType === "JOB") {
      row("Job Name:", receipt.jobName || "\u2014");
      row("Job #:", receipt.workOrderNumber || "\u2014");
      row("PO#:", receipt.poNumber || "N/A");
    } else {
      row("Category:", receipt.overheadCategory || "\u2014");
    }
    y += 8;
    sectionHeader3("Purchase Details");
    row("Vendor:", receipt.vendorName || "\u2014");
    row("Location:", receipt.vendorLocation || "\u2014");
    row("Material Class:", receipt.materialCategory || "\u2014");
    row("Date:", fmtDate3(receipt.purchaseDate));
    y += 8;
    const lineItems = (() => {
      try {
        if (!receipt.lineItems) return [];
        if (typeof receipt.lineItems === "string") return JSON.parse(receipt.lineItems);
        return receipt.lineItems;
      } catch {
        return [];
      }
    })();
    if (lineItems.length > 0) {
      sectionHeader3("Line Items");
      const colX = { desc: 50, qty: 320, unit: 380, total: 460 };
      doc.fillColor(MID_GRAY4).fontSize(8).font("Helvetica-Bold").text("Description", colX.desc, y, { width: 265 }).text("Qty", colX.qty, y, { width: 55, align: "right" }).text("Unit", colX.unit, y, { width: 75, align: "right" }).text("Total", colX.total, y, { width: 65, align: "right" });
      y += 14;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
      y += 6;
      for (const item of lineItems) {
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = 50;
        }
        doc.fillColor(DARK4).fontSize(9).font("Helvetica").text(item.description || "\u2014", colX.desc, y, { width: 265 }).text(String(item.quantity ?? 1), colX.qty, y, { width: 55, align: "right" }).text(fmt$2(item.unitPrice), colX.unit, y, { width: 75, align: "right" }).text(fmt$2(item.lineTotal), colX.total, y, { width: 65, align: "right" });
        y += 16;
      }
      y += 8;
    }
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 50;
    }
    sectionHeader3("Totals");
    const totalsX = doc.page.width - 200;
    function totalRow(label, value, bold = false) {
      doc.fillColor(MID_GRAY4).fontSize(9).font("Helvetica").text(label, 50, y, { width: totalsX - 60 });
      doc.fillColor(bold ? ACCENT2 : DARK4).fontSize(bold ? 11 : 9).font(bold ? "Helvetica-Bold" : "Helvetica").text(value, totalsX, y, { width: 140, align: "right" });
      y += bold ? 20 : 16;
    }
    totalRow("Subtotal:", fmt$2(receipt.subtotal));
    totalRow("Tax:", fmt$2(receipt.tax));
    doc.moveTo(totalsX - 10, y).lineTo(doc.page.width - 50, y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
    y += 6;
    totalRow("TOTAL:", fmt$2(receipt.total), true);
    y += 8;
    if (receipt.notes) {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }
      sectionHeader3("Notes");
      doc.fillColor(DARK4).fontSize(9).font("Helvetica").text(receipt.notes, 50, y, { width: doc.page.width - 100 });
      y += doc.heightOfString(receipt.notes, { width: doc.page.width - 100 }) + 12;
    }
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY - 8, doc.page.width, 48).fill(LIGHT_GRAY4);
    doc.fillColor(MID_GRAY4).fontSize(8).font("Helvetica").text(
      `Generated by AquaClean \xB7 ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      50,
      footerY,
      { align: "center", width: doc.page.width - 100 }
    );
    if (receipt.imageUrl) {
      try {
        const imgRes = await fetch(receipt.imageUrl);
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          doc.addPage();
          doc.rect(0, 0, doc.page.width, 50).fill(BRAND_BLUE4);
          doc.fillColor("#FFFFFF").fontSize(14).font("Helvetica-Bold").text("Original Receipt", 50, 16);
          doc.fontSize(9).font("Helvetica").fillColor("#CBD5E1").text(receipt.fileName, doc.page.width - 300, 20, { width: 250, align: "right" });
          const imgY = 70;
          const maxW = doc.page.width - 100;
          const maxH = doc.page.height - 130;
          doc.image(imgBuffer, 50, imgY, {
            fit: [maxW, maxH],
            align: "center"
          });
        }
      } catch (imgErr) {
        doc.addPage();
        doc.fillColor(MID_GRAY4).fontSize(12).text("Receipt image could not be loaded.", 50, 100, { align: "center" });
      }
    }
    doc.end();
  });
}
var init_aquaclean_receipt_pdf = __esm({
  "server/aquaclean-receipt-pdf.ts"() {
    "use strict";
  }
});

// server/material-delivery-pdf.ts
var material_delivery_pdf_exports = {};
__export(material_delivery_pdf_exports, {
  generateMaterialDeliveryPDF: () => generateMaterialDeliveryPDF
});
import PDFDocument4 from "pdfkit";
import https from "https";
import http from "http";
function fmtDate4(d) {
  if (!d) return "\u2014";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}
function drawHeader(doc, title) {
  const HEADER_H2 = 72;
  doc.rect(0, 0, doc.page.width, HEADER_H2).fill(BRAND_BLUE2);
  doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold").text("Distinctive Outdoor Structures", 40, 24, { width: 300 });
  const rightX = doc.page.width - 260;
  const rightW = 220;
  doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold").text("Material Delivery Checklist", rightX, 18, { width: rightW, align: "right" });
  doc.fillColor("#93C5FD").fontSize(9).font("Helvetica").text(title, rightX, 36, { width: rightW, align: "right", lineBreak: false, ellipsis: true });
  doc.fillColor(DARK2).font("Helvetica");
}
function sectionHeader(doc, title) {
  const y = doc.y + 12;
  doc.rect(50, y, doc.page.width - 100, 22).fill(BRAND_BLUE2);
  doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold").text(title, 58, y + 6);
  doc.fillColor(DARK2).font("Helvetica").moveDown(0.2);
}
function labelValue(doc, label, value) {
  if (!value) return;
  doc.fontSize(9).fillColor(MID_GRAY2).font("Helvetica").text(label + ": ", { continued: true });
  doc.fillColor(DARK2).font("Helvetica-Bold").text(value || "\u2014");
}
function itemRow(doc, label, qty, note) {
  if (!qty && qty !== 0) return;
  const y = doc.y;
  doc.rect(50, y, doc.page.width - 100, 18).fill(LIGHT_GRAY2);
  doc.fillColor(DARK2).fontSize(9).font("Helvetica").text(label, 58, y + 5, { width: 280 });
  doc.font("Helvetica-Bold").text(String(qty), 340, y + 5, { width: 60, align: "right" });
  if (note) {
    doc.fillColor(MID_GRAY2).font("Helvetica").fontSize(8).text(note, 410, y + 5, { width: 140 });
  }
  doc.fillColor(DARK2).moveDown(0.1);
}
async function generateMaterialDeliveryPDF(data) {
  const loadingPhotoBuffers = [];
  const deliveryPhotoBuffers = [];
  if (data.materialsLoadedPhotos?.length) {
    for (const url of data.materialsLoadedPhotos) {
      try {
        const buf = await fetchBuffer(url);
        loadingPhotoBuffers.push(buf);
      } catch {
      }
    }
  }
  if (data.materialsDeliveredPhotos?.length) {
    for (const url of data.materialsDeliveredPhotos) {
      try {
        const buf = await fetchBuffer(url);
        deliveryPhotoBuffers.push(buf);
      } catch {
      }
    }
  }
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument4({ margin: 50, size: "LETTER", autoFirstPage: true });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    drawHeader(doc, data.projectName);
    doc.y = 90 + 14;
    const statusLabel = data.status.replace(/_/g, " ").toUpperCase();
    const badgeW = Math.max(140, statusLabel.length * 7 + 20);
    const badgeY = doc.y;
    doc.rect(50, badgeY, badgeW, 22).fill(ACCENT);
    doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold").text(statusLabel, 58, badgeY + 6, { width: badgeW - 16 });
    doc.fillColor(DARK2).moveDown(0.8);
    sectionHeader(doc, "Project Information");
    doc.moveDown(0.4);
    labelValue(doc, "Project Name", data.projectName);
    labelValue(doc, "Client", data.clientName);
    labelValue(doc, "Location", data.projectLocation);
    labelValue(doc, "Supervisor", data.supervisorName);
    labelValue(doc, "Created By", data.createdByName);
    labelValue(doc, "Created", fmtDate4(data.createdAt));
    if (data.materialsLoaded !== void 0) {
      doc.moveDown(0.4);
      const loadedColor = data.materialsLoaded ? SUCCESS2 : "#DC2626";
      const deliveredColor = data.materialsDelivered ? SUCCESS2 : "#DC2626";
      doc.fontSize(9).fillColor(MID_GRAY2).font("Helvetica").text("Materials Loaded: ", { continued: true });
      doc.fillColor(loadedColor).font("Helvetica-Bold").text(
        data.materialsLoaded ? "YES \u2713" : "NO",
        { continued: !!data.materialsLoadedByName }
      );
      if (data.materialsLoadedByName) {
        const loadedAt = data.materialsLoadedAt ? fmtDate4(data.materialsLoadedAt) : "";
        doc.fillColor(MID_GRAY2).font("Helvetica").fontSize(8).text(`  \u2014 by ${data.materialsLoadedByName}${loadedAt ? " on " + loadedAt : ""}`);
      }
      doc.fontSize(9).fillColor(MID_GRAY2).font("Helvetica").text("Materials Delivered: ", { continued: true });
      doc.fillColor(deliveredColor).font("Helvetica-Bold").text(
        data.materialsDelivered ? "YES \u2713" : "NO",
        { continued: !!data.materialsDeliveredByName }
      );
      if (data.materialsDeliveredByName) {
        const deliveredAt = data.materialsDeliveredAt ? fmtDate4(data.materialsDeliveredAt) : "";
        doc.fillColor(MID_GRAY2).font("Helvetica").fontSize(8).text(`  \u2014 by ${data.materialsDeliveredByName}${deliveredAt ? " on " + deliveredAt : ""}`);
      }
      doc.fillColor(DARK2).font("Helvetica");
    }
    const b = data.boxedItems;
    if (b) {
      doc.addPage();
      drawHeader(doc, data.projectName);
      doc.y = 90 + 14;
      sectionHeader(doc, "Boxed Items \u2014 PVC Fittings");
      doc.moveDown(0.4);
      itemRow(doc, '6" Scupper', b.pvc?.scupper6);
      itemRow(doc, '8" Scupper', b.pvc?.scupper8);
      itemRow(doc, '3" Coupling', b.pvc?.coupling3);
      itemRow(doc, '3" to 2" Reducer', b.pvc?.reducer3to2);
      itemRow(doc, '3" Coupling (B)', b.pvc?.coupling3b);
      itemRow(doc, '2" Coupling', b.pvc?.coupling2);
      if (b.pvc?.custom) itemRow(doc, b.pvc.custom, b.pvc.customQty);
      sectionHeader(doc, "Boxed Items \u2014 Screen Screws");
      doc.moveDown(0.4);
      itemRow(doc, '1.5" Screen Screws', b.screenScrews?.size1_5);
      itemRow(doc, '2" Screen Screws', b.screenScrews?.size2);
      sectionHeader(doc, "Boxed Items \u2014 Ledger Locks");
      doc.moveDown(0.4);
      itemRow(doc, '2-7/8" Ledger Locks', b.ledgerLocks?.size2_7_8);
      itemRow(doc, '4.5" Ledger Locks', b.ledgerLocks?.size4_5);
      itemRow(doc, '6" Ledger Locks', b.ledgerLocks?.size6);
      sectionHeader(doc, "Boxed Items \u2014 Wedge Anchors");
      doc.moveDown(0.4);
      itemRow(doc, '5.5" Wedge Anchors', b.wedgeAnchors?.size5_5);
      if (b.wedgeAnchors?.custom) itemRow(doc, b.wedgeAnchors.custom, b.wedgeAnchors.customQty);
      sectionHeader(doc, "Boxed Items \u2014 Foam Tape & Sealants");
      doc.moveDown(0.4);
      itemRow(doc, "Foam Tape Roll", b.foamTape?.tapeRoll);
      itemRow(doc, "3M Dot", b.foamTape?.dot3m);
      itemRow(doc, "Flashing Tape", b.foamTape?.flashingTape);
      if (b.caulkSealants?.osiQuadMaxColor) itemRow(doc, `OSI Quad Max (${b.caulkSealants.osiQuadMaxColor})`, b.caulkSealants.osiQuadMaxQty);
      if (b.caulkSealants?.flexSealQty) itemRow(doc, `Flex Seal (${b.caulkSealants.flexSealColor || "no color"})`, b.caulkSealants.flexSealQty);
      itemRow(doc, "Ruscoe 12-3", b.caulkSealants?.ruscoe12_3Qty);
      if (b.caulkSealants?.customName) itemRow(doc, `${b.caulkSealants.customName} (${b.caulkSealants.customColor || ""})`, b.caulkSealants.customQty);
      if (b.ledLights?.hasLights) {
        sectionHeader(doc, "Boxed Items \u2014 LED Lights");
        doc.moveDown(0.4);
        itemRow(doc, `LED Lights \u2014 ${b.ledLights.type || "type TBD"} / ${b.ledLights.color || "color TBD"}`, b.ledLights.qty);
      }
    }
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
        doc.fillColor(DARK2).font("Helvetica");
        if (ps.fans.items?.length > 0) {
          for (const item of ps.fans.items) {
            itemRow(doc, item.name || "Fan", item.qty, item.notes);
          }
        }
      }
      if (ps.heaters?.hasHeaters) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(ACCENT).text("Heaters").moveDown(0.2);
        doc.fillColor(DARK2).font("Helvetica");
        if (ps.heaters.items?.length > 0) {
          for (const item of ps.heaters.items) {
            itemRow(doc, item.name || "Heater", item.qty, item.notes);
          }
        }
      }
      if (ps.customItems?.items?.length > 0) {
        doc.fontSize(10).font("Helvetica-Bold").fillColor(ACCENT).text("Additional Items").moveDown(0.2);
        doc.fillColor(DARK2).font("Helvetica");
        for (const item of ps.customItems.items) {
          itemRow(doc, item.name || "Item", item.qty, item.notes);
        }
      }
    }
    if (loadingPhotoBuffers.length > 0) {
      doc.addPage();
      drawHeader(doc, data.projectName);
      doc.y = 90 + 14;
      sectionHeader(doc, "Loading Photos");
      doc.moveDown(0.6);
      const PHOTO_W = (doc.page.width - 140) / 2;
      const PHOTO_H = 160;
      let col = 0;
      let rowY = doc.y;
      for (const buf of loadingPhotoBuffers) {
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
        } catch {
        }
      }
      if (col > 0) {
        doc.y = rowY + PHOTO_H + 12;
      }
    }
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
        } catch {
        }
      }
      if (col > 0) {
        doc.y = rowY + PHOTO_H + 12;
      }
    }
    const pdfs = (data.attachments ?? []).filter((a) => a.type === "application/pdf");
    if (pdfs.length > 0) {
      doc.addPage();
      drawHeader(doc, data.projectName);
      doc.y = 90 + 14;
      sectionHeader(doc, "Attached Purchase Orders");
      doc.moveDown(0.6);
      doc.fontSize(9).fillColor(MID_GRAY2).text(
        "The following purchase orders are attached to this checklist. Print and include with delivery."
      ).moveDown(0.6);
      for (const po of pdfs) {
        const rowY = doc.y;
        doc.rect(50, rowY, doc.page.width - 100, 40).fill(LIGHT_GRAY2);
        doc.fillColor(DARK2).fontSize(10).font("Helvetica-Bold").text(po.name, 60, rowY + 8, { width: doc.page.width - 140 });
        doc.fillColor(MID_GRAY2).fontSize(8).font("Helvetica").text(`Uploaded by ${po.uploadedByName} on ${fmtDate4(po.uploadedAt)}`, 60, rowY + 24, { width: 260 });
        doc.fillColor(ACCENT).fontSize(8).text(po.url, 60, rowY + 24, { width: doc.page.width - 140, align: "right" });
        doc.y = rowY + 44;
        doc.fillColor(DARK2).moveDown(0.3);
      }
    }
    if (data.auditTrail && data.auditTrail.length > 0) {
      doc.addPage();
      drawHeader(doc, data.projectName);
      doc.y = 90 + 14;
      sectionHeader(doc, "Audit Trail");
      doc.moveDown(0.4);
      for (const entry of data.auditTrail) {
        doc.fontSize(9).fillColor(MID_GRAY2).font("Helvetica").text(
          `${fmtDate4(entry.timestamp)} \u2014 ${entry.userName}: `,
          { continued: true }
        );
        doc.fillColor(DARK2).font("Helvetica-Bold").text(entry.action);
      }
    }
    doc.end();
  });
}
var BRAND_BLUE2, ACCENT, LIGHT_GRAY2, MID_GRAY2, DARK2, SUCCESS2;
var init_material_delivery_pdf = __esm({
  "server/material-delivery-pdf.ts"() {
    "use strict";
    BRAND_BLUE2 = "#1E3A5F";
    ACCENT = "#2563EB";
    LIGHT_GRAY2 = "#F3F4F6";
    MID_GRAY2 = "#6B7280";
    DARK2 = "#111827";
    SUCCESS2 = "#16A34A";
  }
});

// server/precon-pdf.ts
var precon_pdf_exports = {};
__export(precon_pdf_exports, {
  generatePreconPdf: () => generatePreconPdf
});
import PDFDocument5 from "pdfkit";
function fmtDate5(d) {
  if (!d) return "\u2014";
  if (d.includes("-")) {
    const [y, m, day] = d.split("-");
    return `${m}/${day}/${y}`;
  }
  return d;
}
function drawHeader2(doc, projectName) {
  doc.rect(0, 0, PAGE_W, HEADER_H).fill(BRAND_BLUE3);
  doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold").text("Distinctive Outdoor Structures", MARGIN_L, 20, { width: 340 });
  doc.fillColor("#93C5FD").fontSize(9).font("Helvetica").text("PRE-CONSTRUCTION MEETING CHECKLIST", MARGIN_L, 46, { width: 340 });
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica").text(projectName || "\u2014", PAGE_W - 220, 30, { width: 170, align: "right" });
  doc.y = CONTENT_TOP;
  doc.fillColor(DARK3).font("Helvetica");
}
function newPage(doc, projectName) {
  doc.addPage();
  drawHeader2(doc, projectName);
}
function ensureSpace(doc, pts, projectName) {
  if (doc.y + pts > BOTTOM_LIMIT) {
    newPage(doc, projectName);
  }
}
function sectionHeader2(doc, title, projectName) {
  ensureSpace(doc, 30, projectName);
  const y = doc.y + 6;
  doc.rect(MARGIN_L, y, CONTENT_W, 20).fill(BRAND_BLUE3);
  doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold").text(title, MARGIN_L + 8, y + 5, { width: CONTENT_W - 16 });
  doc.fillColor(DARK3).font("Helvetica");
  doc.y = y + 26;
}
function checkRow(doc, label, checked, projectName) {
  ensureSpace(doc, 16, projectName);
  const y = doc.y;
  const mark = checked ? "&" : "&";
  doc.fontSize(10).fillColor(checked ? SUCCESS3 : DARK3).font("Helvetica-Bold").text(mark, MARGIN_L + 8, y, { width: 16, lineBreak: false });
  doc.fillColor(DARK3).font("Helvetica").text(label, MARGIN_L + 26, y, { width: CONTENT_W - 36 });
  doc.y = doc.y + 3;
}
function labelValue2(doc, label, value, projectName) {
  if (!value) return;
  ensureSpace(doc, 14, projectName);
  const y = doc.y;
  doc.fontSize(9).fillColor(MID_GRAY3).font("Helvetica").text(`${label}: `, MARGIN_L + 8, y, { continued: true });
  doc.fillColor(DARK3).font("Helvetica-Bold").text(value);
  doc.y = doc.y + 2;
}
function accessoryRow(doc, label, item, projectName) {
  ensureSpace(doc, 16, projectName);
  const y = doc.y;
  const mark = item.checked ? "&" : "&";
  doc.fontSize(10).fillColor(item.checked ? SUCCESS3 : DARK3).font("Helvetica-Bold").text(mark, MARGIN_L + 8, y, { width: 14, lineBreak: false });
  doc.fillColor(DARK3).font("Helvetica").fontSize(9).text(label, MARGIN_L + 24, y, { width: 140, lineBreak: false });
  doc.fillColor(MID_GRAY3).text(`Qty: ${item.qty || "\u2014"}`, MARGIN_L + 172, y, { width: 70, lineBreak: false });
  doc.text(`Loc: ${item.location || "\u2014"}`, MARGIN_L + 248, y, { width: 120, lineBreak: false });
  if (item.switchLocation !== void 0) {
    doc.text(`Switch: ${item.switchLocation || "\u2014"}`, MARGIN_L + 374, y, { width: 90, lineBreak: false });
  }
  doc.fillColor(DARK3).fontSize(10);
  doc.y = y + 16;
}
function workItemBlock(doc, title, item, projectName) {
  ensureSpace(doc, 60, projectName);
  const y = doc.y + 4;
  doc.rect(MARGIN_L, y, CONTENT_W, 18).fill(LIGHT_GRAY3);
  doc.fillColor(DARK3).fontSize(9).font("Helvetica-Bold").text(title, MARGIN_L + 8, y + 4, { width: CONTENT_W - 16 });
  doc.y = y + 22;
  const yn = (v) => v === true ? "Y" : v === false ? "N" : "\u2014";
  doc.fillColor(MID_GRAY3).font("Helvetica").fontSize(9).text(
    `Needed: ${yn(item.needed)}   Additional Cost: ${yn(item.additionalCost)}   Addendum: ${yn(item.addendumNeeded)}   Responsible: ${item.responsibleParty ?? "\u2014"}`,
    MARGIN_L + 8,
    doc.y,
    { width: CONTENT_W - 16 }
  );
  doc.y = doc.y + 4;
  if (item.contractor) labelValue2(doc, "Contractor", item.contractor, projectName);
  if (item.scopeOfWork) {
    ensureSpace(doc, 14, projectName);
    doc.fontSize(9).fillColor(MID_GRAY3).text("Scope: ", MARGIN_L + 8, doc.y, { continued: true });
    doc.fillColor(DARK3).text(item.scopeOfWork, { width: CONTENT_W - 60 });
  }
  doc.y = doc.y + 8;
}
async function generatePreconPdf(checklist) {
  const fd = { ...checklist.formData ?? {} };
  if (checklist.photoData) {
    try {
      fd.photoUris = JSON.parse(checklist.photoData);
    } catch {
    }
  }
  const projectName = checklist.projectName ?? "\u2014";
  const projectAddress = checklist.projectAddress ?? "\u2014";
  const supervisor = checklist.supervisorName ?? "\u2014";
  const meetingDate = checklist.meetingDate ?? "\u2014";
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument5({
      size: "LETTER",
      margins: { top: CONTENT_TOP, bottom: 60, left: MARGIN_L, right: MARGIN_R },
      autoFirstPage: false
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.addPage();
    drawHeader2(doc, projectName);
    sectionHeader2(doc, "Project Information", projectName);
    labelValue2(doc, "Project Name", projectName, projectName);
    labelValue2(doc, "Address", projectAddress, projectName);
    labelValue2(doc, "Project Supervisor", supervisor, projectName);
    labelValue2(doc, "Meeting Date", fmtDate5(meetingDate), projectName);
    doc.y += 8;
    sectionHeader2(doc, "General Checklist", projectName);
    checkRow(doc, "Project Payment outline is reviewed and start of work payment collected as per contract", fd.paymentReviewed ?? false, projectName);
    if (fd.materialDropOffLocation) labelValue2(doc, "Location of Material Drop Off", fd.materialDropOffLocation, projectName);
    if (fd.stagingAreaLocation) labelValue2(doc, "Location of Work Staging Area", fd.stagingAreaLocation, projectName);
    checkRow(doc, "Area of installation to be clear of obstacles prior to start of work", fd.siteWillBeClear ?? false, projectName);
    checkRow(doc, "Review Plan and all components", fd.planReviewed ?? false, projectName);
    checkRow(doc, "Discuss Future Optional Add-ons to ensure provisions are in place", fd.futureAddOnsDiscussed ?? false, projectName);
    doc.y += 8;
    sectionHeader2(doc, "StruXure Details", projectName);
    if (fd.struxureZones) labelValue2(doc, "# of StruXure Zones", fd.struxureZones, projectName);
    if (fd.controlBoxLocation) labelValue2(doc, "Control Box Location", fd.controlBoxLocation, projectName);
    if (fd.rainSensorLocation) labelValue2(doc, "Rain Sensor Location", fd.rainSensorLocation, projectName);
    if (fd.windSensorLocation) labelValue2(doc, "Wind Sensor Location", fd.windSensorLocation, projectName);
    doc.y += 8;
    sectionHeader2(doc, "Accessories (Qty & Location)", projectName);
    const acc = fd.accessories;
    if (acc) {
      accessoryRow(doc, "Accessory Beam(s)", acc.accessoryBeams ?? { checked: false, qty: "", location: "" }, projectName);
      accessoryRow(doc, "Add. Receptacle(s)", acc.receptacles ?? { checked: false, qty: "", location: "" }, projectName);
      accessoryRow(doc, "Motorized Screen(s)", acc.motorizedScreens ?? { checked: false, qty: "", location: "" }, projectName);
      accessoryRow(doc, "Light(s)", { ...acc.lights ?? { checked: false, qty: "", location: "" }, switchLocation: acc.lights?.switchLocation ?? "" }, projectName);
      accessoryRow(doc, "Fan(s)", { ...acc.fans ?? { checked: false, qty: "", location: "" }, switchLocation: acc.fans?.switchLocation ?? "" }, projectName);
      accessoryRow(doc, "Heater(s)", { ...acc.heaters ?? { checked: false, qty: "", location: "" }, switchLocation: acc.heaters?.switchLocation ?? "" }, projectName);
      accessoryRow(doc, "Sconce Lighting", acc.sconceLighting ?? { checked: false, qty: "", location: "" }, projectName);
      accessoryRow(doc, "System Downspouts", acc.systemDownspouts ?? { checked: false, qty: "", location: "" }, projectName);
    }
    newPage(doc, projectName);
    sectionHeader2(doc, "Decorative Features", projectName);
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
        ["LED Strip Lights (TRAX)", dec.ledStripTrax]
      ];
      for (let i = 0; i < features.length; i += 2) {
        ensureSpace(doc, 16, projectName);
        const y = doc.y;
        const [l1, v1] = features[i];
        const [l2, v2] = features[i + 1] ?? ["", null];
        doc.fontSize(10).fillColor(v1 ? SUCCESS3 : DARK3).font("Helvetica-Bold").text(v1 ? "&" : "&", MARGIN_L + 8, y, { width: 14, lineBreak: false });
        doc.fillColor(DARK3).font("Helvetica").fontSize(10).text(l1, MARGIN_L + 26, y, { width: 200, lineBreak: false });
        if (l2) {
          doc.fillColor(v2 ? SUCCESS3 : DARK3).font("Helvetica-Bold").text(v2 ? "&" : "&", MARGIN_L + 240, y, { width: 14, lineBreak: false });
          doc.fillColor(DARK3).font("Helvetica").fontSize(10).text(l2, MARGIN_L + 258, y, { width: 200, lineBreak: false });
        }
        doc.y = y + 16;
      }
      if (dec.other) labelValue2(doc, "Other", dec.other, projectName);
    }
    doc.y += 8;
    sectionHeader2(doc, "Pergola Review", projectName);
    const perg = fd.pergola;
    if (perg) {
      checkRow(doc, "Location of Pergola reviewed", perg.locationReviewed ?? false, projectName);
      if (perg.height) labelValue2(doc, "Height of Pergola", perg.height, projectName);
      if (perg.slope) labelValue2(doc, "Slope of Pergola", perg.slope, projectName);
      if (perg.drainElevation) labelValue2(doc, "Elevation drain lines will exit posts", perg.drainElevation, projectName);
      checkRow(doc, "Labeled the Posts that the Wiring will Enter Pergola", perg.wiringPostsLabeled ?? false, projectName);
      checkRow(doc, "Wire Diagram reviewed", perg.wireDiagramReviewed ?? false, projectName);
      if (perg.wireFeetPerPost) labelValue2(doc, "Amount (in Feet) of Wire for all items", perg.wireFeetPerPost, projectName);
    }
    doc.y += 8;
    sectionHeader2(doc, "Reviewed with Client \u2014 Expectations", projectName);
    const exp = fd.expectations;
    if (exp) {
      checkRow(doc, "Approximate Time of Construction reviewed", exp.constructionTimeReviewed ?? false, projectName);
      checkRow(doc, "Aluminum shavings will be cleaned \u2014 minor pieces may remain", exp.aluminumShavingsReviewed ?? false, projectName);
      checkRow(doc, "Minor leaks may occur after installation \u2014 will be addressed promptly", exp.minorLeaksReviewed ?? false, projectName);
      checkRow(doc, "Reviewed any changes or alterations to the original contract", exp.contractChangesReviewed ?? false, projectName);
      checkRow(doc, "Identified any addendums needed for additional work outside contract scope", exp.addendumsIdentified ?? false, projectName);
    }
    newPage(doc, projectName);
    sectionHeader2(doc, "Photos Were Taken Of", projectName);
    doc.fontSize(9).fillColor(MID_GRAY3).text("Check each area where photos were taken prior to installation.", MARGIN_L + 8, doc.y, { width: CONTENT_W - 16 });
    doc.y += 8;
    const ph = fd.photos;
    const photoUris = fd.photoUris ?? {};
    const photoItems = [
      ["Driveway & Access Conditions", ph?.driveway ?? false, "driveway"],
      ["Location of Staging Area", ph?.stagingArea ?? false, "stagingArea"],
      ["Location of Pergola", ph?.pergolLocation ?? false, "pergolLocation"],
      ["Location of Work Area", ph?.workArea ?? false, "workArea"],
      ["Location of the Posts to be Installed", ph?.postLocations ?? false, "postLocations"],
      ["Any and all Photos of any Damage to the Property or Dwelling Prior to Starting Work", ph?.priorDamage ?? false, "priorDamage"],
      ["Any Circumstance that will Prohibit the Installation of the Pergola", ph?.installationProhibitions ?? false, "installationProhibitions"]
    ];
    for (const [label, checked] of photoItems) {
      checkRow(doc, label, checked, projectName);
    }
    const IMG_W = 240;
    const IMG_H = 180;
    const GAP_X = 24;
    const GAP_Y = 32;
    const COLS = 2;
    const LABEL_H = 16;
    for (const [label, , key] of photoItems) {
      const uris = photoUris[`photos.${key}`] ?? photoUris[key] ?? [];
      if (uris.length === 0) continue;
      newPage(doc, projectName);
      sectionHeader2(doc, `Photos: ${label}`, projectName);
      doc.y += 8;
      uris.forEach((dataUri, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const x = MARGIN_L + col * (IMG_W + GAP_X);
        const y = doc.y + row * (IMG_H + LABEL_H + GAP_Y);
        if (y + IMG_H + LABEL_H > BOTTOM_LIMIT) {
          newPage(doc, projectName);
          sectionHeader2(doc, `Photos: ${label} (cont.)`, projectName);
          doc.y += 8;
        }
        const labelY = doc.y + row * (IMG_H + LABEL_H + GAP_Y);
        const imgY = labelY + LABEL_H;
        doc.fontSize(9).fillColor(MID_GRAY3).font("Helvetica-Bold").text(`${label} \u2014 Photo #${idx + 1}`, x, labelY, { width: IMG_W });
        doc.fillColor(DARK3).font("Helvetica");
        try {
          const base64Match = dataUri.match(/^data:image\/(jpeg|png|jpg);base64,(.+)$/);
          if (base64Match) {
            const imgBuffer = Buffer.from(base64Match[2], "base64");
            doc.image(imgBuffer, x, imgY, { width: IMG_W, height: IMG_H, fit: [IMG_W, IMG_H] });
          } else {
            doc.rect(x, imgY, IMG_W, IMG_H).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
            doc.fontSize(8).fillColor(MID_GRAY3).text("[Photo unavailable]", x + 4, imgY + IMG_H / 2 - 6, { width: IMG_W - 8, align: "center" });
          }
        } catch (imgErr) {
          doc.rect(x, imgY, IMG_W, IMG_H).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
          doc.fontSize(8).fillColor(MID_GRAY3).text("[Photo error]", x + 4, imgY + IMG_H / 2 - 6, { width: IMG_W - 8, align: "center" });
        }
        if (col === COLS - 1 || idx === uris.length - 1) {
          doc.y = imgY + IMG_H + 16;
        }
      });
    }
    newPage(doc, projectName);
    sectionHeader2(doc, "Additional Work Items", projectName);
    const wi = fd.workItems;
    const emptyWork = { needed: null, additionalCost: null, addendumNeeded: null, responsibleParty: null, contractor: "", scopeOfWork: "" };
    if (wi) {
      workItemBlock(doc, "Electrical Work", wi.electrical ?? emptyWork, projectName);
      workItemBlock(doc, "Footings", wi.footings ?? emptyWork, projectName);
      workItemBlock(doc, "Patio Alterations", wi.patioAlterations ?? emptyWork, projectName);
      workItemBlock(doc, "Deck Alterations", wi.deckAlterations ?? emptyWork, projectName);
      workItemBlock(doc, "House Gutter Alterations", wi.houseGutterAlterations ?? emptyWork, projectName);
    }
    if (fd.projectNotes || fd.clientRemarks) {
      ensureSpace(doc, 60, projectName);
      sectionHeader2(doc, "Project Notes", projectName);
      if (fd.projectNotes) {
        doc.fontSize(9).fillColor(MID_GRAY3).text("StruXure Project Notes:", MARGIN_L + 8, doc.y);
        doc.fillColor(DARK3).fontSize(10).text(fd.projectNotes, MARGIN_L + 8, doc.y, { width: CONTENT_W - 16 });
        doc.y += 6;
      }
      if (fd.clientRemarks) {
        doc.fontSize(9).fillColor(MID_GRAY3).text("Client Remarks / Requests:", MARGIN_L + 8, doc.y);
        doc.fillColor(DARK3).fontSize(10).text(fd.clientRemarks, MARGIN_L + 8, doc.y, { width: CONTENT_W - 16 });
        doc.y += 6;
      }
    }
    newPage(doc, projectName);
    doc.fontSize(10).fillColor(DARK3).font("Helvetica").text(
      "We kindly request your acknowledgment by signing below, confirming your understanding of the items discussed on this Pre-Construction checklist. Your signature will serve as a clear indication that you are aware of and in agreement with the points covered in this checklist, helping ensure a successful and smooth pre-construction process. Thank you for your cooperation and commitment to a successful project.",
      MARGIN_L + 8,
      doc.y,
      { width: CONTENT_W - 16, align: "justify" }
    );
    doc.y += 36;
    const sigY1 = doc.y;
    doc.moveTo(MARGIN_L + 8, sigY1).lineTo(280, sigY1).strokeColor(DARK3).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(MID_GRAY3).text("Project Supervisor Signature", MARGIN_L + 8, sigY1 + 4);
    doc.moveTo(300, sigY1).lineTo(PAGE_W - MARGIN_R - 8, sigY1).strokeColor(DARK3).lineWidth(0.5).stroke();
    doc.text("Print Name / Date", 300, sigY1 + 4);
    if (checklist.supervisorSignedName) {
      doc.fillColor(DARK3).font("Helvetica-Bold").fontSize(11).text(checklist.supervisorSignedName, 300, sigY1 - 14, { width: 220 });
    }
    doc.y = sigY1 + 40;
    const sigY2 = doc.y;
    doc.moveTo(MARGIN_L + 8, sigY2).lineTo(280, sigY2).strokeColor(DARK3).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(MID_GRAY3).text("Client / Authorized Signature", MARGIN_L + 8, sigY2 + 4);
    doc.moveTo(300, sigY2).lineTo(PAGE_W - MARGIN_R - 8, sigY2).strokeColor(DARK3).lineWidth(0.5).stroke();
    doc.text("Print Name / Date", 300, sigY2 + 4);
    if (checklist.client1SignedName) {
      doc.fillColor(DARK3).font("Helvetica-Bold").fontSize(11).text(checklist.client1SignedName, 300, sigY2 - 14, { width: 220 });
    }
    doc.y = sigY2 + 40;
    const sigY3 = doc.y;
    doc.moveTo(MARGIN_L + 8, sigY3).lineTo(280, sigY3).strokeColor(DARK3).lineWidth(0.5).stroke();
    doc.fontSize(9).fillColor(MID_GRAY3).text("Client / Authorized Signature (2nd)", MARGIN_L + 8, sigY3 + 4);
    doc.moveTo(300, sigY3).lineTo(PAGE_W - MARGIN_R - 8, sigY3).strokeColor(DARK3).lineWidth(0.5).stroke();
    doc.text("Print Name / Date", 300, sigY3 + 4);
    if (checklist.client2SignedName) {
      doc.fillColor(DARK3).font("Helvetica-Bold").fontSize(11).text(checklist.client2SignedName, 300, sigY3 - 14, { width: 220 });
    }
    doc.end();
  });
}
var BRAND_BLUE3, MID_GRAY3, LIGHT_GRAY3, DARK3, SUCCESS3, PAGE_W, MARGIN_L, MARGIN_R, CONTENT_W, HEADER_H, CONTENT_TOP, BOTTOM_LIMIT;
var init_precon_pdf = __esm({
  "server/precon-pdf.ts"() {
    "use strict";
    BRAND_BLUE3 = "#1E3A5F";
    MID_GRAY3 = "#6B7280";
    LIGHT_GRAY3 = "#F3F4F6";
    DARK3 = "#111827";
    SUCCESS3 = "#16A34A";
    PAGE_W = 612;
    MARGIN_L = 50;
    MARGIN_R = 50;
    CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
    HEADER_H = 72;
    CONTENT_TOP = HEADER_H + 16;
    BOTTOM_LIMIT = 732;
  }
});

// server/_core/index.ts
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { and, desc, eq, gte, lte, like, isNull, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { boolean, int, json, mediumtext, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /**
   * System role — controls app-wide access level:
   * - pending: no access until approved by Admin
   * - guest: read-only preview of permitted modules, no save/export/reports/settings
   * - member: full access to own work only (soft-delete goes to bin)
   * - manager: full access to all work + modifications, no admin tools
   * - admin: full access to all features and admin tools
   * - super-admin: unrestricted access to everything, can promote others to super-admin
   */
  role: varchar("role", { length: 32 }).default("pending").notNull(),
  /** Whether the user has been approved by an admin */
  approved: boolean("approved").default(false).notNull(),
  companyId: int("companyId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** First name — required on first login */
  firstName: varchar("firstName", { length: 128 }),
  /** Last name — required on first login */
  lastName: varchar("lastName", { length: 128 }),
  /** DOS-specific job roles (array of strings from the 17-role list) */
  dosRoles: json("dosRoles").$type(),
  /** Legacy per-user module permissions (superseded by module_permissions table for job-role-based access) */
  permissions: json("permissions").$type(),
  /** Whether this user is an employee eligible for PTO tracking in the Time Off module */
  isEmployee: boolean("isEmployee").default(false).notNull(),
  /** Expo push notification token for sending remote notifications */
  expoPushToken: varchar("expoPushToken", { length: 255 }),
  /**
   * Notification preferences — JSON map of notification type -> boolean.
   * e.g. { cmr_new: true, order_status: false, material_delivery: true }
   * Null means all notifications are enabled (default).
   */
  notificationPrefs: json("notification_prefs").$type(),
  /**
   * Bcrypt hashed password for email/password authentication.
   * If null, user must use OAuth. If set, user can log in with email + password.
   */
  password_hash: varchar("password_hash", { length: 255 })
});
var modulePermissions = mysqlTable("module_permissions", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique slug matching the Expo Router module path (e.g. "receipt-capture") */
  moduleKey: varchar("moduleKey", { length: 64 }).notNull().unique(),
  /** Human-readable display name */
  moduleName: varchar("moduleName", { length: 128 }).notNull(),
  /** Array of job role names (from the 17-role list) that have access to this module */
  allowedJobRoles: json("allowedJobRoles").$type().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logoUrl"),
  primaryColor: varchar("primaryColor", { length: 7 }).default("#1E3A5F"),
  secondaryColor: varchar("secondaryColor", { length: 7 }),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "basic", "pro", "enterprise"]).default("free").notNull(),
  subscriptionActive: boolean("subscriptionActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  status: mysqlEnum("status", ["active", "completed", "on_hold", "cancelled"]).default("active").notNull(),
  hubspotDealId: varchar("hubspotDealId", { length: 64 }),
  serviceFusionJobId: varchar("serviceFusionJobId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var screenOrders = mysqlTable("screen_orders", {
  id: int("id").autoincrement().primaryKey(),
  /** The user who created this order */
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  projectId: int("projectId"),
  /** Display title for the order (project name + date) */
  title: varchar("title", { length: 255 }).notNull(),
  /** Current status of the order */
  status: mysqlEnum("status", ["draft", "submitted", "approved", "rejected", "completed"]).default("draft").notNull(),
  /** The full order state as JSON (OrderState from screen-ordering types) */
  orderData: json("orderData").notNull(),
  /** Total number of screens in this order */
  screenCount: int("screenCount").default(1).notNull(),
  /** The manufacturer selected */
  manufacturer: varchar("manufacturer", { length: 64 }),
  /** Notes from the submitter */
  submitterNotes: text("submitterNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var orderRevisions = mysqlTable("order_revisions", {
  id: int("id").autoincrement().primaryKey(),
  /** The order this revision belongs to */
  orderId: int("orderId").notNull(),
  /** Sequential revision number (1 = original, 2 = first edit, etc.) */
  revisionNumber: int("revisionNumber").notNull(),
  /** Who made this revision */
  editedByUserId: int("editedByUserId").notNull(),
  /** Name of the editor at time of edit */
  editedByName: varchar("editedByName", { length: 255 }),
  /** What was changed (brief description) */
  changeDescription: text("changeDescription"),
  /** The full order state snapshot at this revision */
  orderData: json("orderData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var receipts = mysqlTable("receipts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  projectId: int("projectId"),
  submitterName: varchar("submitterName", { length: 255 }),
  vendorName: varchar("vendorName", { length: 255 }),
  vendorLocation: text("vendorLocation"),
  purchaseDate: varchar("purchaseDate", { length: 10 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  tax: decimal("tax", { precision: 10, scale: 2 }),
  total: decimal("total", { precision: 10, scale: 2 }),
  /** S3 URL of the uploaded receipt image */
  imageUrl: text("imageUrl"),
  /** Line items extracted from the receipt */
  lineItems: json("lineItems").$type(),
  workOrderNumber: varchar("workOrderNumber", { length: 64 }),
  jobName: varchar("jobName", { length: 255 }),
  poNumber: varchar("poNumber", { length: 64 }),
  materialCategory: varchar("materialCategory", { length: 64 }).default("Miscellaneous"),
  expenseType: mysqlEnum("expenseType", ["JOB", "OVERHEAD"]).default("JOB"),
  /** Category for overhead expenses */
  overheadCategory: varchar("overheadCategory", { length: 128 }),
  notes: text("notes"),
  /** Generated filename: VendorName_D-M-YYYY_HHmmss */
  fileName: varchar("fileName", { length: 255 }),
  /** Whether this receipt has been marked as processed/archived by an admin or manager */
  archived: boolean("archived").default(false).notNull(),
  /** When the receipt was archived */
  archivedAt: timestamp("archivedAt"),
  /** Who archived the receipt (userId) */
  archivedBy: int("archivedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var aquacleanReceipts = mysqlTable("aquaclean_receipts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  projectId: int("projectId"),
  submitterName: varchar("submitterName", { length: 255 }),
  vendorName: varchar("vendorName", { length: 255 }),
  vendorLocation: text("vendorLocation"),
  purchaseDate: varchar("purchaseDate", { length: 10 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  tax: decimal("tax", { precision: 10, scale: 2 }),
  total: decimal("total", { precision: 10, scale: 2 }),
  imageUrl: text("imageUrl"),
  lineItems: json("lineItems").$type(),
  workOrderNumber: varchar("workOrderNumber", { length: 64 }),
  jobName: varchar("jobName", { length: 255 }),
  poNumber: varchar("poNumber", { length: 64 }),
  materialCategory: varchar("materialCategory", { length: 64 }).default("Miscellaneous"),
  expenseType: mysqlEnum("expenseType", ["JOB", "OVERHEAD"]).default("JOB"),
  overheadCategory: varchar("overheadCategory", { length: 128 }),
  notes: text("notes"),
  fileName: varchar("fileName", { length: 255 }),
  archived: boolean("archived").default(false).notNull(),
  archivedAt: timestamp("archivedAt"),
  archivedBy: int("archivedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var cmrReports = mysqlTable("cmr_reports", {
  id: int("id").autoincrement().primaryKey(),
  /** The local AsyncStorage ID (cmr_TIMESTAMP_RANDOM) */
  localId: varchar("localId", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  consultantName: varchar("consultantName", { length: 255 }),
  consultantUserId: varchar("consultantUserId", { length: 64 }),
  clientName: varchar("clientName", { length: 255 }),
  appointmentDate: varchar("appointmentDate", { length: 10 }),
  weekOf: varchar("weekOf", { length: 10 }),
  dealStatus: varchar("dealStatus", { length: 64 }),
  outcome: varchar("outcome", { length: 16 }).default("open"),
  purchaseConfidencePct: int("purchaseConfidencePct"),
  originalPcPct: int("originalPcPct"),
  estimatedContractValue: decimal("estimatedContractValue", { precision: 12, scale: 2 }),
  soldAt: varchar("soldAt", { length: 32 }),
  /** Full report JSON blob */
  reportData: json("reportData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var projectMaterialChecklists = mysqlTable("project_material_checklists", {
  id: int("id").autoincrement().primaryKey(),
  /** The user who created this checklist */
  createdByUserId: int("createdByUserId").notNull(),
  createdByName: varchar("createdByName", { length: 255 }),
  /** Project details */
  projectName: varchar("projectName", { length: 255 }).notNull(),
  clientName: varchar("clientName", { length: 255 }),
  projectLocation: text("projectLocation"),
  /** Assigned project supervisor (userId) */
  supervisorUserId: int("supervisorUserId"),
  supervisorName: varchar("supervisorName", { length: 255 }),
  /**
   * Workflow status:
   * draft -> ready_for_supervisor -> awaiting_main_office -> awaiting_warehouse
   * -> final_review -> complete -> closed
   */
  status: varchar("status", { length: 64 }).default("draft").notNull(),
  /** Full inventory data as JSON (boxed items, delivery items, project specific items) */
  boxedItems: json("boxedItems").$type(),
  deliveryItems: json("deliveryItems").$type(),
  projectSpecificItems: json("projectSpecificItems").$type(),
  /** Warehouse check-off state (which boxed items have been pulled) */
  warehouseCheckoffs: json("warehouseCheckoffs").$type(),
  /** Audit trail — array of {userId, userName, action, timestamp} */
  auditTrail: json("auditTrail").$type(),
  /** Uploaded file URLs (purchase order PDFs, delivery photos) */
  attachments: json("attachments").$type(),
  /** Photos uploaded when materials are loaded */
  materialsLoadedPhotos: json("materialsLoadedPhotos").$type(),
  /** Photos uploaded when materials are delivered */
  materialsDeliveredPhotos: json("materialsDeliveredPhotos").$type(),
  /** Whether materials have been loaded onto truck */
  materialsLoaded: boolean("materialsLoaded").default(false).notNull(),
  /** Whether materials have been delivered */
  materialsDelivered: boolean("materialsDelivered").default(false).notNull(),
  /** Name of the user who checked off Materials Loaded */
  materialsLoadedByName: varchar("materialsLoadedByName", { length: 255 }),
  /** Timestamp when Materials Loaded was checked off */
  materialsLoadedAt: timestamp("materialsLoadedAt"),
  /** Name of the user who checked off Materials Delivered */
  materialsDeliveredByName: varchar("materialsDeliveredByName", { length: 255 }),
  /** Timestamp when Materials Delivered was checked off */
  materialsDeliveredAt: timestamp("materialsDeliveredAt"),
  /** Whether this checklist has been archived (managers/admins only) */
  archived: boolean("archived").default(false).notNull(),
  /** When the checklist was archived */
  archivedAt: timestamp("archivedAt"),
  /** Name of the user who archived the checklist */
  archivedByName: varchar("archivedByName", { length: 255 }),
  companyId: int("companyId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  /** The user this notification is for */
  userId: int("user_id").notNull(),
  /** Short title shown in notification center */
  title: varchar("title", { length: 255 }).notNull(),
  /** Full notification body */
  body: text("body").notNull(),
  /**
   * Notification type — used for filtering and preferences:
   * cmr_new, order_status, material_delivery_status, material_delivery_warehouse
   */
  type: varchar("type", { length: 100 }).notNull().default("general"),
  /** Optional extra data (e.g. { checklistId: 42 }) for deep-linking */
  data: json("data").$type(),
  /** Whether the user has read this notification */
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var preconChecklists = mysqlTable("preconstruction_checklists", {
  id: int("id").autoincrement().primaryKey(),
  /** The supervisor who created this checklist */
  userId: int("userId").notNull(),
  supervisorName: varchar("supervisorName", { length: 255 }),
  companyId: int("companyId"),
  /** Project info */
  projectName: varchar("projectName", { length: 255 }),
  projectAddress: text("projectAddress"),
  meetingDate: varchar("meetingDate", { length: 10 }),
  /** Status: draft | completed | signed */
  status: varchar("status", { length: 32 }).default("draft").notNull(),
  /**
   * All form data stored as JSON:
   * { section1, section2_struxure, section3_decorative, section4_pergola,
   *   section5_expectations, section6_photos, section7_materials,
   *   section8_workItems, section9_notes, section10_signatures }
   */
  formData: json("formData").$type(),
  /**
   * Photo data stored separately as mediumtext (supports up to 16MB).
   * Stored as JSON: Record<string, string[]> where key = photoKey, value = array of base64 data URIs.
   */
  photoData: mediumtext("photoData"),
  /** Supervisor signature data URL */
  supervisorSignature: text("supervisorSignature"),
  supervisorSignedName: varchar("supervisorSignedName", { length: 255 }),
  supervisorSignedAt: timestamp("supervisorSignedAt"),
  /** Client 1 signature */
  client1Signature: text("client1Signature"),
  client1SignedName: varchar("client1SignedName", { length: 255 }),
  client1SignedAt: timestamp("client1SignedAt"),
  /** Client 2 signature (optional) */
  client2Signature: text("client2Signature"),
  client2SignedName: varchar("client2SignedName", { length: 255 }),
  client2SignedAt: timestamp("client2SignedAt"),
  /** Whether this checklist has been archived (managers/admins only) */
  archived: boolean("archived").default(false).notNull(),
  /** When the checklist was archived */
  archivedAt: timestamp("archivedAt"),
  /** Name of the user who archived the checklist */
  archivedByName: varchar("archivedByName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var zoningLookups = mysqlTable("zoning_lookups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  projectId: int("projectId"),
  address: text("address"),
  county: varchar("county", { length: 128 }),
  municipality: varchar("municipality", { length: 128 }),
  state: varchar("state", { length: 2 }),
  zoningCode: varchar("zoningCode", { length: 64 }),
  zoningStatus: mysqlEnum("zoningStatus", ["CONFIRMED", "UNVERIFIED", "UNKNOWN"]).default("UNKNOWN"),
  parcelId: varchar("parcelId", { length: 64 }),
  lotSqft: decimal("lotSqft", { precision: 12, scale: 2 }),
  permitSummaryUrl: text("permitSummaryUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var timeOffPolicies = mysqlTable("time_off_policies", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  /** Total paid days allowed per period (e.g. 10) */
  totalDaysAllowed: decimal("totalDaysAllowed", { precision: 5, scale: 2 }).default("0"),
  /** Total paid hours allowed per period (alternative to days) */
  totalHoursAllowed: decimal("totalHoursAllowed", { precision: 6, scale: 2 }).default("0"),
  /** Start date of the current PTO period (YYYY-MM-DD) */
  periodStartDate: varchar("periodStartDate", { length: 10 }),
  /** End date of the current PTO period (YYYY-MM-DD) */
  periodEndDate: varchar("periodEndDate", { length: 10 }),
  /** Admin notes about this employee's PTO package */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow()
});
var timeOffRequests = mysqlTable("time_off_requests", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  companyId: int("companyId"),
  /** Type of time off: vacation, sick, personal, bereavement, unpaid, other */
  requestType: varchar("requestType", { length: 50 }).default("vacation").notNull(),
  /** Start date of the time off (YYYY-MM-DD) */
  startDate: varchar("startDate", { length: 10 }).notNull(),
  /** End date of the time off (YYYY-MM-DD) */
  endDate: varchar("endDate", { length: 10 }).notNull(),
  /** Optional start time (HH:MM) for partial-day requests */
  startTime: varchar("startTime", { length: 5 }),
  /** Optional end time (HH:MM) for partial-day requests */
  endTime: varchar("endTime", { length: 5 }),
  /** Total number of days requested */
  totalDays: decimal("totalDays", { precision: 5, scale: 2 }).default("0"),
  /** Total number of hours requested */
  totalHours: decimal("totalHours", { precision: 6, scale: 2 }).default("0"),
  /** Employee's reason for the request */
  reason: text("reason"),
  /** Status: pending, approved, denied, cancelled */
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  /** UserId of the manager who reviewed */
  reviewedBy: int("reviewedBy"),
  /** When the request was reviewed */
  reviewedAt: timestamp("reviewedAt"),
  /** Manager's note on approval/denial */
  reviewNotes: text("reviewNotes"),
  /** Which PTO period year this request belongs to (e.g. "2025-2026") */
  periodYear: varchar("periodYear", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
  /** Soft-delete timestamp — set when admin deletes, null means active. Hard-delete runs after 30s undo window. */
  deletedAt: timestamp("deletedAt")
});
var auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** ID of the super-admin who performed the action */
  superAdminId: int("superAdminId").notNull(),
  /** Type of action: role_change, user_approval, user_rejection, permission_update, module_permission_change, etc. */
  actionType: varchar("actionType", { length: 64 }).notNull(),
  /** ID of the user affected by the action (if applicable) */
  affectedUserId: int("affectedUserId"),
  /** Human-readable description of what was changed */
  description: text("description").notNull(),
  /** JSON object containing before/after values for the change */
  details: json("details").$type(),
  /** IP address or client identifier (optional) */
  clientInfo: varchar("clientInfo", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var superAdminNotifications = mysqlTable("super_admin_notifications", {
  id: int("id").autoincrement().primaryKey(),
  /** Type of notification: security_alert, system_health, user_activity, bulk_action, etc. */
  notificationType: varchar("notificationType", { length: 64 }).notNull(),
  /** Severity level: info, warning, critical */
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info").notNull(),
  /** Title of the notification */
  title: varchar("title", { length: 255 }).notNull(),
  /** Detailed message */
  message: text("message").notNull(),
  /** JSON object with additional context/data */
  data: json("data").$type(),
  /** Whether the notification has been read by any super-admin */
  isRead: boolean("isRead").default(false).notNull(),
  /** When the notification was marked as read */
  readAt: timestamp("readAt"),
  /** ID of the super-admin who read it (if applicable) */
  readBy: int("readBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/db.ts
init_env();
var _db = null;
var _connectionPool = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const mysql = await import("mysql2");
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 10,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      });
      _connectionPool = pool;
      _db = drizzle(pool);
      console.log("[Database] Connected with pool (limit: 5, queue: 10)");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _connectionPool = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      values.approved = true;
      updateSet.role = "admin";
      updateSet.approved = true;
    } else if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}
async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.approved, false)).orderBy(desc(users.createdAt));
}
async function approveUser(userId, role) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ approved: true, role }).where(eq(users.id, userId));
}
async function rejectUser(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, userId));
}
async function updateUserRole(userId, role) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}
async function updateUserName(userId, firstName, lastName) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  await db.update(users).set({ firstName: firstName.trim(), lastName: lastName.trim(), name: fullName }).where(eq(users.id, userId));
}
async function getAllModulePermissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(modulePermissions).orderBy(modulePermissions.moduleName);
}
async function setModulePermissions(moduleKey, allowedJobRoles, moduleName) {
  const db = await getDb();
  if (!db) return;
  const name = moduleName ?? moduleKey;
  await db.insert(modulePermissions).values({ moduleKey, moduleName: name, allowedJobRoles }).onDuplicateKeyUpdate({ set: { allowedJobRoles } });
}
async function updateDosRoles(userId, dosRoles) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ dosRoles }).where(eq(users.id, userId));
}
async function updatePermissions(userId, permissions) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ permissions }).where(eq(users.id, userId));
}
async function setIsEmployee(userId, isEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isEmployee }).where(eq(users.id, userId));
}
async function getEmployeeUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.isEmployee, true)).orderBy(users.name);
}
async function createScreenOrder(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(screenOrders).values(data).$returningId();
  const orderId = result.id;
  await db.insert(orderRevisions).values({
    orderId,
    revisionNumber: 1,
    editedByUserId: data.userId,
    editedByName: null,
    changeDescription: "Original submission",
    orderData: data.orderData
  });
  return orderId;
}
async function updateScreenOrder(orderId, data, editedByUserId, editedByName, changeDescription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const revisions = await db.select().from(orderRevisions).where(eq(orderRevisions.orderId, orderId)).orderBy(desc(orderRevisions.revisionNumber)).limit(1);
  const nextRevision = revisions.length > 0 ? revisions[0].revisionNumber + 1 : 1;
  await db.update(screenOrders).set(data).where(eq(screenOrders.id, orderId));
  if (data.orderData) {
    await db.insert(orderRevisions).values({
      orderId,
      revisionNumber: nextRevision,
      editedByUserId,
      editedByName,
      changeDescription,
      orderData: data.orderData
    });
  }
}
async function getScreenOrder(orderId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(screenOrders).where(eq(screenOrders.id, orderId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserScreenOrders(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(screenOrders).where(eq(screenOrders.userId, userId)).orderBy(desc(screenOrders.updatedAt));
}
async function getAllScreenOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(screenOrders).orderBy(desc(screenOrders.updatedAt));
}
async function getOrderRevisions(orderId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderRevisions).where(eq(orderRevisions.orderId, orderId)).orderBy(desc(orderRevisions.revisionNumber));
}
async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalOrders: 0, byStatus: {}, recentOrders: [], techPerformance: [] };
  const allOrders = await db.select().from(screenOrders).orderBy(desc(screenOrders.updatedAt));
  const allUsers = await db.select().from(users);
  const allRevisions = await db.select().from(orderRevisions);
  const byStatus = { draft: 0, submitted: 0, approved: 0, rejected: 0, completed: 0 };
  for (const o of allOrders) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  }
  const totalScreens = allOrders.reduce((sum, o) => sum + (o.screenCount || 0), 0);
  const userMap = new Map(allUsers.map((u) => [u.id, u.name || u.email || "Unknown"]));
  const recentOrders = allOrders.slice(0, 20).map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    screenCount: o.screenCount,
    manufacturer: o.manufacturer,
    userName: userMap.get(o.userId) || "Unknown",
    userId: o.userId,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  }));
  const techOrders = /* @__PURE__ */ new Map();
  for (const o of allOrders) {
    if (!techOrders.has(o.userId)) {
      techOrders.set(o.userId, {
        name: userMap.get(o.userId) || "Unknown",
        total: 0,
        byStatus: { draft: 0, submitted: 0, approved: 0, rejected: 0, completed: 0 },
        totalScreens: 0,
        revisionCount: 0
      });
    }
    const tech = techOrders.get(o.userId);
    tech.total += 1;
    tech.byStatus[o.status] = (tech.byStatus[o.status] || 0) + 1;
    tech.totalScreens += o.screenCount || 0;
  }
  for (const rev of allRevisions) {
    const order = allOrders.find((o) => o.id === rev.orderId);
    if (order && techOrders.has(order.userId)) {
      techOrders.get(order.userId).revisionCount += 1;
    }
  }
  const techPerformance = Array.from(techOrders.entries()).map(([userId, data]) => ({
    userId,
    name: data.name,
    totalOrders: data.total,
    totalScreens: data.totalScreens,
    completedOrders: data.byStatus.completed || 0,
    approvedOrders: data.byStatus.approved || 0,
    pendingOrders: (data.byStatus.draft || 0) + (data.byStatus.submitted || 0),
    rejectedOrders: data.byStatus.rejected || 0,
    revisionCount: data.revisionCount,
    completionRate: data.total > 0 ? Math.round((data.byStatus.completed || 0) / data.total * 100) : 0
  })).sort((a, b) => b.totalOrders - a.totalOrders);
  return {
    totalOrders: allOrders.length,
    totalScreens,
    byStatus,
    recentOrders,
    techPerformance
  };
}
async function deleteScreenOrder(orderId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(orderRevisions).where(eq(orderRevisions.orderId, orderId));
  await db.delete(screenOrders).where(eq(screenOrders.id, orderId));
}
async function createReceipt(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(receipts).values(data).$returningId();
  return result.id;
}
async function getReceipt(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserReceipts(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(receipts).where(and(eq(receipts.userId, userId), or(eq(receipts.archived, false), isNull(receipts.archived)))).orderBy(desc(receipts.createdAt));
}
async function getAllReceipts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(receipts).where(or(eq(receipts.archived, false), isNull(receipts.archived))).orderBy(desc(receipts.createdAt));
}
async function getReceiptsWithFilters(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [or(eq(receipts.archived, false), isNull(receipts.archived))];
  if (filters.userId) conditions.push(eq(receipts.userId, filters.userId));
  if (filters.vendorName) conditions.push(like(receipts.vendorName, `%${filters.vendorName}%`));
  if (filters.startDate) conditions.push(gte(receipts.purchaseDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(receipts.purchaseDate, filters.endDate));
  return db.select().from(receipts).where(and(...conditions)).orderBy(desc(receipts.createdAt));
}
async function archiveReceipt(id, archivedBy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(receipts).set({
    archived: true,
    archivedAt: /* @__PURE__ */ new Date(),
    archivedBy: archivedBy ?? null
  }).where(eq(receipts.id, id));
}
async function unarchiveReceipt(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(receipts).set({
    archived: false,
    archivedAt: null,
    archivedBy: null
  }).where(eq(receipts.id, id));
}
async function deleteReceipt(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(receipts).where(eq(receipts.id, id));
}
async function getArchivedReceipts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(receipts).where(eq(receipts.archived, true)).orderBy(desc(receipts.createdAt));
}
async function getArchivedReceiptsWithFilters(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(receipts.archived, true)];
  if (filters.userId) conditions.push(eq(receipts.userId, filters.userId));
  if (filters.vendorName) conditions.push(like(receipts.vendorName, `%${filters.vendorName}%`));
  if (filters.startDate) conditions.push(gte(receipts.purchaseDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(receipts.purchaseDate, filters.endDate));
  return db.select().from(receipts).where(and(...conditions)).orderBy(desc(receipts.createdAt));
}
async function createAquacleanReceipt(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(aquacleanReceipts).values(data).$returningId();
  return result.id;
}
async function getAquacleanReceipt(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(aquacleanReceipts).where(eq(aquacleanReceipts.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserAquacleanReceipts(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aquacleanReceipts).where(and(eq(aquacleanReceipts.userId, userId), or(eq(aquacleanReceipts.archived, false), isNull(aquacleanReceipts.archived)))).orderBy(desc(aquacleanReceipts.createdAt));
}
async function getAllAquacleanReceipts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aquacleanReceipts).where(or(eq(aquacleanReceipts.archived, false), isNull(aquacleanReceipts.archived))).orderBy(desc(aquacleanReceipts.createdAt));
}
async function getAquacleanReceiptsWithFilters(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [or(eq(aquacleanReceipts.archived, false), isNull(aquacleanReceipts.archived))];
  if (filters.userId) conditions.push(eq(aquacleanReceipts.userId, filters.userId));
  if (filters.vendorName) conditions.push(like(aquacleanReceipts.vendorName, `%${filters.vendorName}%`));
  if (filters.startDate) conditions.push(gte(aquacleanReceipts.purchaseDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(aquacleanReceipts.purchaseDate, filters.endDate));
  return db.select().from(aquacleanReceipts).where(and(...conditions)).orderBy(desc(aquacleanReceipts.createdAt));
}
async function deleteAquacleanReceipt(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(aquacleanReceipts).where(eq(aquacleanReceipts.id, id));
}
async function getAquacleanReceiptAnalytics() {
  const db = await getDb();
  if (!db) return { totalReceipts: 0, totalSpent: 0, byCategory: {} };
  const receipts2 = await db.select().from(aquacleanReceipts).where(or(eq(aquacleanReceipts.archived, false), isNull(aquacleanReceipts.archived)));
  const totalSpent = receipts2.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const byCategory = {};
  receipts2.forEach((r) => {
    const cat = r.materialCategory || "Miscellaneous";
    byCategory[cat] = (byCategory[cat] || 0) + (Number(r.total) || 0);
  });
  return { totalReceipts: receipts2.length, totalSpent, byCategory };
}
async function upsertCmrReport(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cmrReports).values(data).onDuplicateKeyUpdate({
    set: {
      consultantName: data.consultantName,
      clientName: data.clientName,
      appointmentDate: data.appointmentDate,
      weekOf: data.weekOf,
      dealStatus: data.dealStatus,
      outcome: data.outcome,
      purchaseConfidencePct: data.purchaseConfidencePct,
      originalPcPct: data.originalPcPct,
      estimatedContractValue: data.estimatedContractValue,
      soldAt: data.soldAt,
      reportData: data.reportData
    }
  });
}
async function getAllCmrReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cmrReports).orderBy(desc(cmrReports.appointmentDate));
}
async function getUserCmrReports(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cmrReports).where(eq(cmrReports.userId, userId)).orderBy(desc(cmrReports.appointmentDate));
}
async function getCmrReportsWithFilters(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.userId) conditions.push(eq(cmrReports.userId, filters.userId));
  if (filters.startDate) conditions.push(gte(cmrReports.appointmentDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(cmrReports.appointmentDate, filters.endDate));
  if (filters.outcome) conditions.push(eq(cmrReports.outcome, filters.outcome));
  if (filters.minValue != null) conditions.push(gte(cmrReports.estimatedContractValue, filters.minValue.toString()));
  if (filters.maxValue != null) conditions.push(lte(cmrReports.estimatedContractValue, filters.maxValue.toString()));
  if (filters.minPc != null) conditions.push(gte(cmrReports.purchaseConfidencePct, filters.minPc));
  if (filters.maxPc != null) conditions.push(lte(cmrReports.purchaseConfidencePct, filters.maxPc));
  const q = db.select().from(cmrReports).orderBy(desc(cmrReports.appointmentDate));
  return conditions.length > 0 ? q.where(and(...conditions)) : q;
}
async function deleteCmrReport(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cmrReports).where(eq(cmrReports.id, id));
}
async function getReceiptAnalytics() {
  const db = await getDb();
  if (!db) return { totalSpend: 0, byUser: [], byVendor: [], byCategory: [], monthlyTrend: [] };
  const allReceipts = await db.select().from(receipts).orderBy(desc(receipts.createdAt));
  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u.name || u.email || "Unknown"]));
  const totalSpend = allReceipts.reduce((sum, r) => sum + parseFloat(String(r.total ?? "0")), 0);
  const userSpend = /* @__PURE__ */ new Map();
  for (const r of allReceipts) {
    if (!userSpend.has(r.userId)) {
      userSpend.set(r.userId, { name: userMap.get(r.userId) || "Unknown", total: 0, count: 0 });
    }
    const u = userSpend.get(r.userId);
    u.total += parseFloat(String(r.total ?? "0"));
    u.count += 1;
  }
  const byUser = Array.from(userSpend.entries()).map(([userId, d]) => ({ userId, name: d.name, total: d.total, count: d.count })).sort((a, b) => b.total - a.total);
  const vendorSpend = /* @__PURE__ */ new Map();
  for (const r of allReceipts) {
    const vendor = r.vendorName || "Unknown";
    if (!vendorSpend.has(vendor)) vendorSpend.set(vendor, { total: 0, count: 0 });
    const v = vendorSpend.get(vendor);
    v.total += parseFloat(String(r.total ?? "0"));
    v.count += 1;
  }
  const byVendor = Array.from(vendorSpend.entries()).map(([vendor, d]) => ({ vendor, total: d.total, count: d.count })).sort((a, b) => b.total - a.total).slice(0, 10);
  const catSpend = /* @__PURE__ */ new Map();
  for (const r of allReceipts) {
    const cat = r.expenseType === "OVERHEAD" ? r.overheadCategory || "Overhead/General" : r.materialCategory || "Job";
    if (!catSpend.has(cat)) catSpend.set(cat, { total: 0, count: 0 });
    const c = catSpend.get(cat);
    c.total += parseFloat(String(r.total ?? "0"));
    c.count += 1;
  }
  const byCategory = Array.from(catSpend.entries()).map(([category, d]) => ({ category, total: d.total, count: d.count })).sort((a, b) => b.total - a.total);
  const monthlyMap = /* @__PURE__ */ new Map();
  for (const r of allReceipts) {
    const date = r.purchaseDate || r.createdAt.toISOString().slice(0, 10);
    const month = date.slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + parseFloat(String(r.total ?? "0")));
  }
  const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  return { totalSpend, byUser, byVendor, byCategory, monthlyTrend };
}
async function createProjectMaterialChecklist(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectMaterialChecklists).values({
    ...data,
    auditTrail: data.auditTrail ?? [],
    attachments: [],
    materialsLoadedPhotos: [],
    materialsDeliveredPhotos: [],
    warehouseCheckoffs: {}
  });
  const rows = await db.select({ id: projectMaterialChecklists.id }).from(projectMaterialChecklists).where(eq(projectMaterialChecklists.createdByUserId, data.createdByUserId)).orderBy(desc(projectMaterialChecklists.createdAt)).limit(1);
  return { id: rows[0]?.id ?? 0 };
}
async function getAllProjectMaterialChecklists() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectMaterialChecklists).orderBy(desc(projectMaterialChecklists.updatedAt));
}
async function getProjectMaterialChecklist(id) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(projectMaterialChecklists).where(eq(projectMaterialChecklists.id, id)).limit(1);
  return rows[0] ?? null;
}
async function updateProjectMaterialChecklist(id, updates, actor) {
  const db = await getDb();
  if (!db) return;
  const current = await getProjectMaterialChecklist(id);
  const existingAudit = current?.auditTrail ?? [];
  const auditEntries = [];
  const now = /* @__PURE__ */ new Date();
  if (updates.materialsLoaded !== void 0 && updates.materialsLoaded !== current?.materialsLoaded) {
    const action = updates.materialsLoaded ? "Marked Materials Loaded" : "Unmarked Materials Loaded";
    auditEntries.push({ userId: actor.userId, userName: actor.userName, action, timestamp: now.toISOString() });
    if (updates.materialsLoaded) {
      updates.materialsLoadedByName = actor.userName;
      updates.materialsLoadedAt = now;
    } else {
      updates.materialsLoadedByName = null;
      updates.materialsLoadedAt = null;
    }
  }
  if (updates.materialsDelivered !== void 0 && updates.materialsDelivered !== current?.materialsDelivered) {
    const action = updates.materialsDelivered ? "Marked Materials Delivered" : "Unmarked Materials Delivered";
    auditEntries.push({ userId: actor.userId, userName: actor.userName, action, timestamp: now.toISOString() });
    if (updates.materialsDelivered) {
      updates.materialsDeliveredByName = actor.userName;
      updates.materialsDeliveredAt = now;
    } else {
      updates.materialsDeliveredByName = null;
      updates.materialsDeliveredAt = null;
    }
  }
  if (auditEntries.length === 0) {
    auditEntries.push({ userId: actor.userId, userName: actor.userName, action: "Updated checklist", timestamp: now.toISOString() });
  }
  const newAudit = [...existingAudit, ...auditEntries];
  await db.update(projectMaterialChecklists).set({ ...updates, auditTrail: newAudit }).where(eq(projectMaterialChecklists.id, id));
}
async function updateProjectMaterialChecklistStatus(id, status, actor) {
  const db = await getDb();
  if (!db) return;
  const current = await getProjectMaterialChecklist(id);
  const existingAudit = current?.auditTrail ?? [];
  const newAudit = [
    ...existingAudit,
    { userId: actor.userId, userName: actor.userName, action: actor.action, timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  ];
  await db.update(projectMaterialChecklists).set({ status, auditTrail: newAudit }).where(eq(projectMaterialChecklists.id, id));
}
async function addProjectMaterialAttachment(id, attachment) {
  const db = await getDb();
  if (!db) return;
  const current = await getProjectMaterialChecklist(id);
  const existing = current?.attachments ?? [];
  await db.update(projectMaterialChecklists).set({ attachments: [...existing, attachment] }).where(eq(projectMaterialChecklists.id, id));
}
async function deleteProjectMaterialChecklist(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectMaterialChecklists).where(eq(projectMaterialChecklists.id, id));
}
async function archiveProjectMaterialChecklist(id, actor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getProjectMaterialChecklist(id);
  const existingAudit = current?.auditTrail ?? [];
  const newAudit = [
    ...existingAudit,
    { userId: 0, userName: actor.userName, action: "Archived checklist", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  ];
  await db.update(projectMaterialChecklists).set({ archived: true, archivedAt: /* @__PURE__ */ new Date(), archivedByName: actor.userName, auditTrail: newAudit }).where(eq(projectMaterialChecklists.id, id));
}
async function unarchiveProjectMaterialChecklist(id, actor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const current = await getProjectMaterialChecklist(id);
  const existingAudit = current?.auditTrail ?? [];
  const newAudit = [
    ...existingAudit,
    { userId: 0, userName: actor.userName, action: "Unarchived checklist", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
  ];
  await db.update(projectMaterialChecklists).set({ archived: false, archivedAt: null, archivedByName: null, auditTrail: newAudit }).where(eq(projectMaterialChecklists.id, id));
}
async function updateUserPushToken(userId, token) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ expoPushToken: token }).where(eq(users.id, userId));
}
async function getManagersAndAdminsWithPushToken() {
  const db = await getDb();
  if (!db) return [];
  const allUsers = await db.select({ id: users.id, name: users.name, role: users.role, expoPushToken: users.expoPushToken }).from(users);
  return allUsers.filter(
    (u) => u.expoPushToken && (u.role === "manager" || u.role === "admin")
  );
}
async function createNotificationsForUsers(userIds, notification) {
  if (userIds.length === 0) return;
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({ ...notification, userId }))
  );
}
async function getUserNotifications(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(100);
}
async function getUnreadNotificationCount(userId) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result.length;
}
async function markNotificationRead(id, userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}
async function markAllNotificationsRead(userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}
async function deleteNotification(id, userId) {
  const db = await getDb();
  if (!db) return;
  await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}
async function getNotificationPrefs(userId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ notificationPrefs: users.notificationPrefs }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0]?.notificationPrefs ?? null;
}
async function updateNotificationPrefs(userId, prefs) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ notificationPrefs: prefs }).where(eq(users.id, userId));
}
async function createPreconChecklist(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(preconChecklists).values({
    userId: data.userId,
    supervisorName: data.supervisorName,
    companyId: data.companyId ?? null,
    projectName: data.projectName,
    projectAddress: data.projectAddress ?? null,
    meetingDate: data.meetingDate ?? null,
    status: "draft",
    formData: {}
  }).$returningId();
  return { id: result.id };
}
async function getPreconChecklist(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(preconChecklists).where(eq(preconChecklists.id, id)).limit(1);
  return result[0];
}
async function listPreconChecklists(filters, options) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.userId) conditions.push(eq(preconChecklists.userId, filters.userId));
  if (!options?.includeArchived) conditions.push(eq(preconChecklists.archived, false));
  const query = db.select().from(preconChecklists);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(preconChecklists.createdAt));
  }
  return query.orderBy(desc(preconChecklists.createdAt));
}
async function updatePreconChecklist(id, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(preconChecklists).set(updates).where(eq(preconChecklists.id, id));
}
async function deletePreconChecklist(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(preconChecklists).where(eq(preconChecklists.id, id));
}
async function getTimeOffPolicy(userId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(timeOffPolicies).where(eq(timeOffPolicies.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function getAllTimeOffPolicies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timeOffPolicies).orderBy(timeOffPolicies.userId);
}
async function upsertTimeOffPolicy(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(timeOffPolicies).where(eq(timeOffPolicies.userId, data.userId)).limit(1);
  if (existing.length > 0) {
    await db.update(timeOffPolicies).set(data).where(eq(timeOffPolicies.userId, data.userId));
    return existing[0].id;
  } else {
    const [result] = await db.insert(timeOffPolicies).values(data).$returningId();
    return result.id;
  }
}
async function createTimeOffRequest(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(timeOffRequests).values(data).$returningId();
  return result.id;
}
async function getTimeOffRequest(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(timeOffRequests).where(eq(timeOffRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}
async function getUserTimeOffRequests(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timeOffRequests).where(and(eq(timeOffRequests.userId, userId), isNull(timeOffRequests.deletedAt))).orderBy(desc(timeOffRequests.createdAt));
}
async function getUserTimeOffRequestsByPeriod(userId, periodYear) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(timeOffRequests).where(and(eq(timeOffRequests.userId, userId), eq(timeOffRequests.periodYear, periodYear), isNull(timeOffRequests.deletedAt))).orderBy(desc(timeOffRequests.createdAt));
}
async function getAllTimeOffRequests(filters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [isNull(timeOffRequests.deletedAt)];
  if (filters?.userId) conditions.push(eq(timeOffRequests.userId, filters.userId));
  if (filters?.status) conditions.push(eq(timeOffRequests.status, filters.status));
  if (filters?.periodYear) conditions.push(eq(timeOffRequests.periodYear, filters.periodYear));
  return db.select().from(timeOffRequests).where(and(...conditions)).orderBy(desc(timeOffRequests.createdAt));
}
async function reviewTimeOffRequest(id, status, reviewedBy, reviewNotes) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(timeOffRequests).set({ status, reviewedBy, reviewedAt: /* @__PURE__ */ new Date(), reviewNotes: reviewNotes || null }).where(eq(timeOffRequests.id, id));
}
async function cancelTimeOffRequest(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(timeOffRequests).set({ status: "cancelled" }).where(eq(timeOffRequests.id, id));
}
async function deleteTimeOffRequest(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(timeOffRequests).where(eq(timeOffRequests.id, id));
}
async function softDeleteTimeOffRequest(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(timeOffRequests).set({ deletedAt: /* @__PURE__ */ new Date() }).where(eq(timeOffRequests.id, id));
}
async function restoreTimeOffRequest(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(timeOffRequests).set({ deletedAt: null }).where(eq(timeOffRequests.id, id));
}
async function getUsedPTODays(userId, periodYear) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [
    eq(timeOffRequests.userId, userId),
    eq(timeOffRequests.status, "approved"),
    isNull(timeOffRequests.deletedAt)
  ];
  if (periodYear) conditions.push(eq(timeOffRequests.periodYear, periodYear));
  const approved = await db.select().from(timeOffRequests).where(and(...conditions));
  return approved.reduce((sum, r) => sum + parseFloat(String(r.totalDays ?? "0")), 0);
}

// server/_core/cookies.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isIpAddress(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getParentDomain(hostname) {
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return void 0;
  }
  const parts = hostname.split(".");
  if (parts.length < 3) {
    return void 0;
  }
  return "." + parts.slice(-2).join(".");
}
function getSessionCookieOptions(req) {
  const hostname = req.hostname;
  const domain = getParentDomain(hostname);
  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
init_env();
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(EXCHANGE_TOKEN_PATH, payload);
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(GET_USER_INFO_PATH, {
      accessToken: token.accessToken
    });
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(platforms.filter((p) => typeof p === "string"));
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = token || cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
async function syncUser(userInfo) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }
  const lastSignedIn = /* @__PURE__ */ new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return saved ?? {
    openId: userInfo.openId,
    name: userInfo.name,
    email: userInfo.email,
    loginMethod: userInfo.loginMethod ?? null,
    lastSignedIn
  };
}
function buildUserResponse(user) {
  return {
    id: user?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    role: user?.role ?? "pending",
    approved: user?.approved ?? false,
    lastSignedIn: (user?.lastSignedIn ?? /* @__PURE__ */ new Date()).toISOString(),
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    dosRoles: user?.dosRoles ?? null
  };
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      let syncError = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await syncUser(userInfo);
          syncError = null;
          break;
        } catch (err) {
          syncError = err;
          if (attempt < 3 && syncError.message?.includes("ECONNRESET")) {
            const delayMs = Math.min(1e3 * Math.pow(2, attempt - 1), 5e3);
            console.warn(`[OAuth] syncUser failed (attempt ${attempt}/3), retrying in ${delayMs}ms...`, syncError.message);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          } else {
            throw err;
          }
        }
      }
      if (syncError) {
        throw syncError;
      }
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      const frontendUrl = process.env.EXPO_WEB_PREVIEW_URL || process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
  app.get("/api/oauth/mobile", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user)
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });
  app.post("/api/auth/session", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}

// server/routers.ts
import { z as z4 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("webdevtoken.v1.WebDevService/SendNotification", normalizedBase).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/push-notifications.ts
async function sendPushNotifications(tokens, title, body, data) {
  const validTokens = tokens.filter(
    (t2) => t2 && (t2.startsWith("ExponentPushToken[") || t2.startsWith("ExpoPushToken["))
  );
  if (validTokens.length === 0) {
    console.log("[PushNotifications] No valid Expo push tokens to send to");
    return;
  }
  const messages = validTokens.map((token) => ({
    to: token,
    title,
    body,
    data: data ?? {},
    sound: "default",
    channelId: "dos-hub"
  }));
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });
    if (!response.ok) {
      console.error("[PushNotifications] Expo API error:", response.status, await response.text());
      return;
    }
    const result = await response.json();
    const tickets = result.data ?? [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === "error") {
        console.error(`[PushNotifications] Failed for token ${validTokens[i]?.substring(0, 30)}:`, ticket.message);
      } else {
        console.log(`[PushNotifications] Sent OK, ticket: ${ticket.id}`);
      }
    });
  } catch (error) {
    console.error("[PushNotifications] Failed to send notifications:", error);
  }
}
async function notifyUsers(userIds, title, body, type, data) {
  if (userIds.length === 0) return;
  try {
    await createNotificationsForUsers(userIds, { title, body, type, data: data ?? null, isRead: false });
  } catch (err) {
    console.error("[PushNotifications] Failed to store in-app notifications:", err);
  }
  try {
    const allUsers = await getAllUsers();
    const tokens = allUsers.filter((u) => userIds.includes(u.id) && u.expoPushToken).map((u) => u.expoPushToken);
    if (tokens.length > 0) {
      await sendPushNotifications(tokens, title, body, data);
    }
  } catch (err) {
    console.error("[PushNotifications] Failed to send push notifications:", err);
  }
}
var MATERIAL_DELIVERY_NOTIFICATIONS = {
  ready_for_supervisor: {
    title: "Material Checklist Ready for Review",
    body: (p) => `"${p}" is ready for your supervisor review.`,
    targetRole: "Project Supervisor"
  },
  awaiting_main_office: {
    title: "Material Checklist Awaiting Main Office",
    body: (p) => `"${p}" has been approved by the supervisor and awaits main office review.`,
    targetRole: null
    // Notify admins/managers — handled separately
  },
  awaiting_warehouse: {
    title: "Warehouse Pull List Ready",
    body: (p) => `"${p}" is ready for warehouse pull. Please check the pull list.`,
    targetRole: "Warehouse Manager"
  },
  final_review: {
    title: "Material Delivery: Final Review",
    body: (p) => `"${p}" is ready for final review before completion.`,
    targetRole: null
    // Notify admins/managers
  },
  complete: {
    title: "Material Delivery Complete",
    body: (p) => `"${p}" has been marked as complete.`,
    targetRole: null
  }
};

// server/cmr-pdf.ts
import PDFDocument from "pdfkit";
var BRAND_BLUE = "#1E3A5F";
var LIGHT_GRAY = "#F3F4F6";
var MID_GRAY = "#6B7280";
var DARK = "#111827";
var SUCCESS = "#16A34A";
var WARNING = "#D97706";
var ERROR = "#DC2626";
function fmtDate(d) {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return d;
  }
}
function fmtCurrency(v) {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? "\u2014" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function labelList(options, values) {
  if (!values?.length) return "\u2014";
  return values.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ") || "\u2014";
}
var DEAL_STATUS_LABELS = {
  "actively-considering": "Actively Considering",
  "working-design": "Working on Design / Proposal",
  "proposal-presented": "Proposal Presented / Sent",
  "sold": "Sold",
  "lost": "Lost",
  "no-decision": "No Decision Yet"
};
var LEAD_SOURCE_OPTIONS = [
  { value: "struXure-corp", label: "StruXure Corp" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook / Instagram" },
  { value: "referral", label: "Referral" },
  { value: "repeat-customer", label: "Repeat Customer" },
  { value: "home-show", label: "Home Show / Event" },
  { value: "yard-sign", label: "Yard Sign" },
  { value: "door-hanger", label: "Door Hanger" },
  { value: "direct-mail", label: "Direct Mail" },
  { value: "other", label: "Other" }
];
var PROJECT_TYPE_OPTIONS = [
  { value: "pergola-attached", label: "Pergola (Attached)" },
  { value: "pergola-freestanding", label: "Pergola (Freestanding)" },
  { value: "patio-cover", label: "Patio Cover" },
  { value: "screen-room", label: "Screen Room" },
  { value: "sunroom", label: "Sunroom" },
  { value: "carport", label: "Carport" },
  { value: "other", label: "Other" }
];
var VALUE_COMMUNICATED_OPTIONS = [
  { value: "quality", label: "Quality / Craftsmanship" },
  { value: "warranty", label: "Warranty" },
  { value: "customization", label: "Customization" },
  { value: "local", label: "Local / Family Business" },
  { value: "financing", label: "Financing Options" },
  { value: "timeline", label: "Timeline / Availability" },
  { value: "design", label: "Design Expertise" }
];
var OBJECTION_OPTIONS = [
  { value: "price", label: "Price" },
  { value: "timing", label: "Timing" },
  { value: "spouse", label: "Spouse / Decision Maker" },
  { value: "comparing", label: "Comparing Competitors" },
  { value: "financing", label: "Financing" },
  { value: "design", label: "Design / Style" },
  { value: "other", label: "Other" }
];
var MESSAGING_OPTIONS = [
  { value: "quality", label: "Quality" },
  { value: "local", label: "Local Business" },
  { value: "warranty", label: "Warranty" },
  { value: "financing", label: "Financing" },
  { value: "design", label: "Design" },
  { value: "other", label: "Other" }
];
async function generateCmrPDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 50;
    const contentW = pageW - margin * 2;
    doc.rect(0, 0, pageW, 76).fill(BRAND_BLUE);
    doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold").text("Distinctive Outdoor Structures", margin, 18);
    doc.fontSize(10).font("Helvetica").text("Client Meeting Report", margin, 44);
    const pc = data.purchaseConfidencePct ?? 0;
    const pcColor = pc >= 70 ? SUCCESS : pc >= 40 ? WARNING : ERROR;
    doc.roundedRect(pageW - 100, 18, 70, 28, 14).fill(pcColor);
    doc.fillColor("#FFFFFF").fontSize(14).font("Helvetica-Bold").text(`${pc}% PC`, pageW - 100, 26, { width: 70, align: "center" });
    let y = 92;
    doc.rect(margin, y, contentW, 54).fill(LIGHT_GRAY);
    doc.fillColor(DARK).fontSize(16).font("Helvetica-Bold").text(data.clientName || "Unnamed Client", margin + 12, y + 8, { width: contentW - 24 });
    doc.fillColor(MID_GRAY).fontSize(10).font("Helvetica").text(
      `${fmtDate(data.appointmentDate)}  \xB7  ${data.consultantName || "\u2014"}  \xB7  ${fmtCurrency(data.estimatedContractValue)}`,
      margin + 12,
      y + 30,
      { width: contentW - 24 }
    );
    y += 66;
    function section(title) {
      if (y > pageH - 120) {
        doc.addPage();
        y = margin;
      }
      doc.rect(margin, y, contentW, 18).fill(BRAND_BLUE);
      doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold").text(title.toUpperCase(), margin + 8, y + 5, { width: contentW - 16 });
      y += 22;
    }
    let rowEven = false;
    function row(label, value) {
      if (!value || value === "\u2014") return;
      const rowH = Math.max(
        18,
        doc.heightOfString(value, { width: contentW * 0.62, fontSize: 9 }) + 8
      );
      if (y + rowH > pageH - 60) {
        doc.addPage();
        y = margin;
        rowEven = false;
      }
      if (rowEven) doc.rect(margin, y, contentW, rowH).fill("#F9FAFB");
      rowEven = !rowEven;
      doc.fillColor(MID_GRAY).fontSize(9).font("Helvetica-Bold").text(label, margin + 8, y + 5, { width: contentW * 0.34 });
      doc.fillColor(DARK).fontSize(9).font("Helvetica").text(value, margin + contentW * 0.36, y + 5, { width: contentW * 0.62 });
      y += rowH;
    }
    section("Client Information");
    rowEven = false;
    row("Consultant", data.consultantName);
    row("Week Of", fmtDate(data.weekOf));
    row(
      "Source",
      data.source === "marketing-in-home" ? "Marketing \u2013 In-Home" : data.source === "marketing-showroom" ? "Marketing \u2013 Showroom" : data.source === "self-generated" ? "Self-Generated" : data.source ?? null
    );
    row("Address", data.address);
    row(
      "Client Type",
      data.clientType === "residential" ? "Residential" : data.clientType === "commercial" ? "Commercial" : data.clientType ?? null
    );
    row(
      "Appointment Type",
      data.appointmentType === "in-home" ? "In-Home" : data.appointmentType === "showroom" ? "Showroom" : data.appointmentType === "phone" ? "Phone" : data.appointmentType ?? null
    );
    row("Lead Source(s)", labelList(LEAD_SOURCE_OPTIONS, data.leadSources ?? []));
    row("Project Type(s)", labelList(PROJECT_TYPE_OPTIONS, data.projectTypes ?? []));
    y += 6;
    section("Deal Status");
    rowEven = false;
    row("Status", data.dealStatus ? DEAL_STATUS_LABELS[data.dealStatus] ?? data.dealStatus : null);
    row("Close Timeline", data.closeTimeline ? `${data.closeTimeline} days` : null);
    row("Follow-Up Date", fmtDate(data.followUpDate));
    row("Proposal Date", fmtDate(data.proposalDate));
    row("Lost Reason", data.lostReason);
    row("Conversation Summary", data.lastConversationSummary);
    y += 6;
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
    section("Value Communicated & Objections");
    rowEven = false;
    row(
      "Financing Discussed?",
      data.financingDiscussed === true ? "Yes" : data.financingDiscussed === false ? "No" : null
    );
    row(
      "Financing Reaction",
      data.financingReaction === "interested" ? "Interested" : data.financingReaction === "needs-followup" ? "Needs Follow-Up" : data.financingReaction === "declined" ? "Declined" : data.financingReaction ?? null
    );
    row("Value Communicated", labelList(VALUE_COMMUNICATED_OPTIONS, data.valueCommunicated ?? []));
    row(
      "Client Response",
      data.clientResponse === "strong-alignment" ? "Strong Alignment" : data.clientResponse === "neutral" ? "Neutral" : data.clientResponse === "price-focused" ? "Price-Focused" : data.clientResponse === "comparing-online" ? "Comparing Online / Low-Cost" : data.clientResponse ?? null
    );
    row("Objections", labelList(OBJECTION_OPTIONS, data.objections ?? []));
    row("Objection Notes", data.objectionNotes);
    y += 6;
    section("Next Steps");
    rowEven = false;
    const nextActionLabels = {
      "followup-call": "Follow-Up Call",
      "design-revision": "Design Revision",
      "financing-followup": "Financing Follow-Up",
      "showroom-visit": "Showroom Visit",
      "site-revisit": "Site Revisit"
    };
    row(
      "Next Action(s)",
      (data.nextActions ?? []).map((a) => nextActionLabels[a] ?? a).join(", ") || null
    );
    row("Next Follow-Up Date", fmtDate(data.nextFollowUpDate));
    y += 6;
    const notes = (data.progressNotes ?? []).filter((n) => n?.text?.trim());
    if (notes.length > 0) {
      section("Progress Notes");
      rowEven = false;
      for (const note of notes) {
        const label = note.createdAt ? new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "\u2014";
        const noteText = note.text?.trim() || "\u2014";
        const noteH = Math.max(
          18,
          doc.heightOfString(noteText, { width: contentW * 0.62, fontSize: 9 }) + 8
        );
        if (y + noteH > pageH - 60) {
          doc.addPage();
          y = margin;
          rowEven = false;
        }
        if (rowEven) doc.rect(margin, y, contentW, noteH).fill("#F9FAFB");
        rowEven = !rowEven;
        doc.fillColor(MID_GRAY).fontSize(9).font("Helvetica-Bold").text(label, margin + 8, y + 5, { width: contentW * 0.34 });
        doc.fillColor(DARK).fontSize(9).font("Helvetica").text(noteText, margin + contentW * 0.36, y + 5, { width: contentW * 0.62 });
        y += noteH;
      }
      y += 6;
    }
    const isMarketing = data.source === "marketing-in-home" || data.source === "marketing-showroom";
    if (isMarketing) {
      section("Marketing Feedback");
      rowEven = false;
      row(
        "Lead Quality",
        data.leadQuality ? data.leadQuality.charAt(0).toUpperCase() + data.leadQuality.slice(1) : null
      );
      row(
        "Expectation Alignment",
        data.expectationAlignment === "yes" ? "Yes \u2013 Expectations aligned" : data.expectationAlignment === "somewhat" ? "Somewhat" : data.expectationAlignment === "no" ? "No \u2013 Mismatch" : data.expectationAlignment ?? null
      );
      row("Messaging Referenced", labelList(MESSAGING_OPTIONS, data.messagingReferenced ?? []));
      row(
        "Budget Alignment",
        data.budgetAlignment === "aligned" ? "Aligned" : data.budgetAlignment === "slightly-below" ? "Slightly below realistic range" : data.budgetAlignment === "significantly-below" ? "Significantly below realistic range" : data.budgetAlignment ?? null
      );
      row("Marketing Notes", data.marketingNotes);
      y += 6;
    }
    const footerY = pageH - 36;
    doc.rect(0, footerY, pageW, 36).fill(LIGHT_GRAY);
    doc.fillColor(MID_GRAY).fontSize(8).font("Helvetica").text(
      `DOS Hub  \xB7  Client Meeting Report  \xB7  ${data.clientName || "\u2014"}  \xB7  ${fmtDate(data.appointmentDate)}  \xB7  Generated ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US")}`,
      margin,
      footerY + 12,
      { width: contentW, align: "center" }
    );
    doc.end();
  });
}

// server/routers.ts
init_storage();

// server/audit.ts
import { eq as eq2, desc as desc2 } from "drizzle-orm";
async function logAuditAction(superAdminId, actionType, description, affectedUserId, details) {
  try {
    const database = await getDb();
    if (!database) {
      console.warn("[Audit] Cannot log: database not available");
      return;
    }
    await database.insert(auditLogs).values({
      superAdminId,
      actionType,
      description,
      affectedUserId,
      details,
      clientInfo: null
    });
    console.log(`[Audit] Logged: ${actionType} by super-admin ${superAdminId}`);
  } catch (error) {
    console.error("[Audit] Failed to log action:", error);
  }
}
async function getAuditLogs(limit = 100, offset = 0) {
  try {
    const database = await getDb();
    if (!database) {
      console.warn("[Audit] Cannot get logs: database not available");
      return [];
    }
    const logs = await database.select().from(auditLogs).orderBy(desc2(auditLogs.createdAt)).limit(limit).offset(offset);
    return logs;
  } catch (error) {
    console.error("[Audit] Failed to get logs:", error);
    return [];
  }
}
async function getUnreadNotifications() {
  try {
    const database = await getDb();
    if (!database) {
      console.warn("[Notifications] Cannot get: database not available");
      return [];
    }
    const notifications2 = await database.select().from(superAdminNotifications).where(eq2(superAdminNotifications.isRead, false)).orderBy(desc2(superAdminNotifications.createdAt));
    return notifications2;
  } catch (error) {
    console.error("[Notifications] Failed to get notifications:", error);
    return [];
  }
}
async function markNotificationAsRead(notificationId, readBy) {
  try {
    const database = await getDb();
    if (!database) {
      console.warn("[Notifications] Cannot mark as read: database not available");
      return;
    }
    await database.update(superAdminNotifications).set({
      isRead: true,
      readAt: /* @__PURE__ */ new Date(),
      readBy
    }).where(eq2(superAdminNotifications.id, notificationId));
    console.log(`[Notifications] Marked notification ${notificationId} as read`);
  } catch (error) {
    console.error("[Notifications] Failed to mark as read:", error);
  }
}
async function getAuditLogsForUser(affectedUserId, limit = 50) {
  try {
    const database = await getDb();
    if (!database) {
      console.warn("[Audit] Cannot get logs: database not available");
      return [];
    }
    const logs = await database.select().from(auditLogs).where(eq2(auditLogs.affectedUserId, affectedUserId)).orderBy(desc2(auditLogs.createdAt)).limit(limit);
    return logs;
  } catch (error) {
    console.error("[Audit] Failed to get logs for user:", error);
    return [];
  }
}
async function getAuditLogsBySuperAdmin(superAdminId, limit = 50) {
  try {
    const database = await getDb();
    if (!database) {
      console.warn("[Audit] Cannot get logs: database not available");
      return [];
    }
    const logs = await database.select().from(auditLogs).where(eq2(auditLogs.superAdminId, superAdminId)).orderBy(desc2(auditLogs.createdAt)).limit(limit);
    return logs;
  } catch (error) {
    console.error("[Audit] Failed to get logs for super-admin:", error);
    return [];
  }
}

// server/super-admin-routers.ts
import { z as z2 } from "zod";
var superAdminRouter = router({
  /**
   * Get audit logs (super-admin only)
   */
  getAuditLogs: protectedProcedure.input(z2.object({ limit: z2.number().default(50), offset: z2.number().default(0) })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "super-admin") {
      throw new Error("Unauthorized: super-admin role required");
    }
    return getAuditLogs(input.limit, input.offset);
  }),
  /**
   * Get unread super-admin notifications
   */
  getUnreadNotifications: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super-admin") {
      throw new Error("Unauthorized: super-admin role required");
    }
    return getUnreadNotifications();
  }),
  /**
   * Mark a notification as read
   */
  markNotificationAsRead: protectedProcedure.input(z2.object({ notificationId: z2.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "super-admin") {
      throw new Error("Unauthorized: super-admin role required");
    }
    await markNotificationAsRead(input.notificationId, ctx.user.id);
    return { success: true };
  }),
  /**
   * Get system-wide statistics
   */
  getSystemStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "super-admin") {
      throw new Error("Unauthorized: super-admin role required");
    }
    const allUsers = await getAllUsers();
    const totalUsers = allUsers.length;
    const pendingUsers = allUsers.filter((u) => !u.approved).length;
    const superAdmins = allUsers.filter((u) => u.role === "super-admin").length;
    const admins = allUsers.filter((u) => u.role === "admin").length;
    const managers = allUsers.filter((u) => u.role === "manager").length;
    const members = allUsers.filter((u) => u.role === "member").length;
    return {
      totalUsers,
      pendingUsers,
      superAdmins,
      admins,
      managers,
      members,
      approvedUsers: totalUsers - pendingUsers
    };
  }),
  /**
   * Get audit logs for a specific user
   */
  getAuditLogsForUser: protectedProcedure.input(z2.object({ userId: z2.number(), limit: z2.number().default(50) })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "super-admin") {
      throw new Error("Unauthorized: super-admin role required");
    }
    return getAuditLogsForUser(input.userId, input.limit);
  }),
  /**
   * Get audit logs by a specific super-admin
   */
  getAuditLogsBySuperAdmin: protectedProcedure.input(z2.object({ superAdminId: z2.number(), limit: z2.number().default(50) })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "super-admin") {
      throw new Error("Unauthorized: super-admin role required");
    }
    return getAuditLogsBySuperAdmin(input.superAdminId, input.limit);
  })
});

// server/ai-routers.ts
import { z as z3 } from "zod";

// server/openai-service.ts
var OPENAI_API_KEY = process.env.OPENAI_API_KEY;
var OPENAI_API_URL = "https://api.openai.com/v1";
async function callOpenAI(messages, model = "gpt-3.5-turbo", maxTokens = 500) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable not set");
  }
  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API Error: ${JSON.stringify(error)}`);
  }
  return response.json();
}
async function generateTrainingMaterial(topic) {
  const messages = [
    {
      role: "system",
      content: `You are the DOS Hub training assistant. You ONLY answer questions about:
- Distinctive Outdoor Structures operations
- DOS Hub software
- installation procedures
- product ordering
- Service Fusion workflows

Generate comprehensive training material on the requested topic. Be detailed, clear, and practical.`
    },
    {
      role: "user",
      content: `Generate training material about: ${topic}`
    }
  ];
  const response = await callOpenAI(messages, "gpt-3.5-turbo", 2e3);
  return response.choices[0].message.content;
}
async function generateQuiz(trainingMaterial, numQuestions = 5) {
  const messages = [
    {
      role: "system",
      content: `You are the DOS Hub training assistant. Generate a quiz based on the provided training material.
Format each question as:
Q1. [Question]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct letter]

Be clear, practical, and focused on DOS Hub operations.`
    },
    {
      role: "user",
      content: `Generate ${numQuestions} quiz questions based on this training material:

${trainingMaterial}`
    }
  ];
  const response = await callOpenAI(messages, "gpt-3.5-turbo", 2e3);
  return response.choices[0].message.content;
}
async function answerQuestion(question) {
  const messages = [
    {
      role: "system",
      content: `You are the DOS Hub assistant. You ONLY answer questions about:
- Distinctive Outdoor Structures operations
- DOS Hub software
- installation procedures
- product ordering
- Service Fusion workflows

If a user asks about personal information or unrelated topics, respond with:
"I'm designed only to answer DOS Hub operational questions."

Be helpful, accurate, and concise.`
    },
    {
      role: "user",
      content: question
    }
  ];
  const response = await callOpenAI(messages, "gpt-3.5-turbo", 1e3);
  return response.choices[0].message.content;
}

// server/ai-routers.ts
var aiRouter = router({
  askQuestion: publicProcedure.input(z3.object({ question: z3.string().min(1) })).mutation(async ({ input }) => {
    const answer = await answerQuestion(input.question);
    return { answer };
  }),
  generateTrainingMaterial: publicProcedure.input(z3.object({ topic: z3.string().min(1) })).mutation(async ({ input }) => {
    const material = await generateTrainingMaterial(input.topic);
    return { material };
  }),
  generateQuiz: publicProcedure.input(
    z3.object({
      trainingMaterial: z3.string().min(1),
      numQuestions: z3.number().int().min(1).max(20).default(5)
    })
  ).mutation(async ({ input }) => {
    const quiz = await generateQuiz(input.trainingMaterial, input.numQuestions);
    return { quiz };
  })
});

// server/password-auth.ts
import bcrypt from "bcryptjs";
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// server/routers.ts
async function filterByPref(userIds, prefKey) {
  const filtered = [];
  for (const userId of userIds) {
    const prefs = await getNotificationPrefs(userId);
    if (!prefs || prefs[prefKey] !== false) {
      filtered.push(userId);
    }
  }
  return filtered;
}
var SYSTEM_ROLES = ["pending", "guest", "member", "manager", "admin", "super-admin"];
var appRouter = router({
  system: systemRouter,
  superAdmin: superAdminRouter,
  ai: aiRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure.input(
      z4.object({
        email: z4.string().email("Invalid email address"),
        password: z4.string().min(1, "Password is required")
      })
    ).mutation(async ({ input, ctx }) => {
      const { email, password } = input;
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      const user = await database.query.users.findFirst({
        where: (users3, { eq: eq4, sql: sql2 }) => sql2`LOWER(${users3.email}) = LOWER(${email})`
      });
      if (!user) {
        throw new Error("Invalid email or password");
      }
      if (!user.password_hash) {
        throw new Error("This account does not support password login. Please use OAuth.");
      }
      const passwordValid = await verifyPassword(password, user.password_hash);
      if (!passwordValid) {
        throw new Error("Invalid email or password");
      }
      if (!user.approved) {
        throw new Error("Your account is pending approval. Please contact an administrator.");
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const sessionToken = await ctx.sdk.createSessionToken(user.openId || user.email, {
        name: user.name || user.email,
        expiresInMs: ONE_YEAR_MS
      });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      await database.update(void 0).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where((void 0)((void 0).id, user.id));
      return {
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          approved: user.approved
        }
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // ─── USER MANAGEMENT (admin only) ──────────────────────────────────────────
  users: router({
    /** Get all users (admin/manager/super-admin only) */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin, manager, or super-admin role required");
      }
      return getAllUsers();
    }),
    /** Get pending (unapproved) users */
    pending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin or super-admin role required");
      }
      return getPendingUsers();
    }),
    /** Approve a user and set their system role */
    approve: protectedProcedure.input(
      z4.object({
        userId: z4.number(),
        role: z4.enum(SYSTEM_ROLES)
      })
    ).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin or super-admin role required");
      }
      if (input.role === "super-admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: only super-admin can promote to super-admin");
      }
      await approveUser(input.userId, input.role);
      if (ctx.user.role === "super-admin") {
        await logAuditAction(
          ctx.user.id,
          "user_approval",
          `Approved user ${input.userId} with role ${input.role}`,
          input.userId,
          { role: input.role }
        );
      }
      return { success: true };
    }),
    /** Reject (delete) a pending user */
    reject: protectedProcedure.input(z4.object({ userId: z4.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin or super-admin role required");
      }
      await rejectUser(input.userId);
      return { success: true };
    }),
    /** Update a user's system role */
    updateRole: protectedProcedure.input(
      z4.object({
        userId: z4.number(),
        role: z4.enum(SYSTEM_ROLES)
      })
    ).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin or super-admin role required");
      }
      if (input.role === "super-admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: only super-admin can promote to super-admin");
      }
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),
    /** Update the logged-in user's first and last name */
    updateName: protectedProcedure.input(z4.object({ firstName: z4.string().min(1).max(128), lastName: z4.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      await updateUserName(ctx.user.id, input.firstName, input.lastName);
      return { success: true };
    }),
    /** Update a user's DOS job roles (multi-select from 17-role list) */
    updateDosRoles: protectedProcedure.input(z4.object({ userId: z4.number(), dosRoles: z4.array(z4.string()) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin role required");
      }
      await updateDosRoles(input.userId, input.dosRoles);
      return { success: true };
    }),
    /** List approved users (for consultant picker in CMR filters) */
    listConsultants: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager" || ctx.user.role === "super-admin";
      if (!isAdmin) throw new Error("Unauthorized: manager or admin role required");
      const all = await getAllUsers();
      return all.filter((u) => u.approved && u.firstName).map((u) => ({
        id: u.id,
        name: u.name || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "Unknown",
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email
      }));
    }),
    /** Update a user's legacy per-user module permissions */
    updatePermissions: protectedProcedure.input(z4.object({ userId: z4.number(), permissions: z4.record(z4.string(), z4.boolean()) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin role required");
      }
      await updatePermissions(input.userId, input.permissions);
      return { success: true };
    }),
    /** Toggle whether a user is marked as an employee (for Time Off tracking) */
    setIsEmployee: protectedProcedure.input(z4.object({ userId: z4.number(), isEmployee: z4.boolean() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin role required");
      }
      await setIsEmployee(input.userId, input.isEmployee);
      return { success: true };
    }),
    /** Get all users marked as employees */
    listEmployees: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin role required");
      }
      return getEmployeeUsers();
    })
  }),
  // ─── MODULE PERMISSIONS (Owner job role only) ──────────────────────────────
  modulePermissions: router({
    /** Get all module permission settings */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin role required");
      }
      return getAllModulePermissions();
    }),
    /** Set which job roles can access a module */
    set: protectedProcedure.input(z4.object({ moduleKey: z4.string(), moduleName: z4.string().optional(), allowedJobRoles: z4.array(z4.string()) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: admin role required");
      }
      const dosRoles = ctx.user.dosRoles ?? [];
      if (!dosRoles.includes("Owner") && ctx.user.role !== "super-admin") {
        throw new Error("Unauthorized: Owner job role required to modify module permissions");
      }
      await setModulePermissions(input.moduleKey, input.allowedJobRoles, input.moduleName);
      return { success: true };
    })
  }),
  // ─── SCREEN ORDERS ─────────────────────────────────────────────────────────
  orders: router({
    /** Create a new screen order */
    create: protectedProcedure.input(
      z4.object({
        title: z4.string().min(1).max(255),
        orderData: z4.any(),
        screenCount: z4.number().min(1).default(1),
        manufacturer: z4.string().optional(),
        submitterNotes: z4.string().optional(),
        projectId: z4.number().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const orderId = await createScreenOrder({
        userId: ctx.user.id,
        companyId: ctx.user.companyId,
        title: input.title,
        status: "draft",
        orderData: input.orderData,
        screenCount: input.screenCount,
        manufacturer: input.manufacturer,
        submitterNotes: input.submitterNotes,
        projectId: input.projectId
      });
      try {
        const managers = await getManagersAndAdminsWithPushToken();
        const allManagerIds = managers.map((m) => m.id);
        const targetIds = await filterByPref(allManagerIds, "order_status");
        if (targetIds.length > 0) {
          const submitterName = ctx.user.name ?? "A team member";
          await notifyUsers(
            targetIds,
            "New Screen Order Submitted",
            `${submitterName} submitted a new order: "${input.title}".`,
            "order_status",
            { screen: "orders", orderId }
          );
        }
      } catch (notifError) {
        console.error("[PushNotifications] Screen order create notification failed:", notifError);
      }
      return { orderId };
    }),
    /** Update an existing order (creates a revision) */
    update: protectedProcedure.input(
      z4.object({
        orderId: z4.number(),
        title: z4.string().min(1).max(255).optional(),
        orderData: z4.any().optional(),
        screenCount: z4.number().min(1).optional(),
        manufacturer: z4.string().optional(),
        status: z4.enum(["draft", "submitted", "approved", "rejected", "completed"]).optional(),
        submitterNotes: z4.string().optional(),
        changeDescription: z4.string().default("Updated order")
      })
    ).mutation(async ({ ctx, input }) => {
      const order = await getScreenOrder(input.orderId);
      if (!order) throw new Error("Order not found");
      const isOwner = order.userId === ctx.user.id;
      const isManagerOrAdmin = ctx.user.role === "manager" || ctx.user.role === "admin";
      if (!isOwner && !isManagerOrAdmin) {
        throw new Error("Unauthorized: you can only edit your own orders");
      }
      const prevStatus = order.status;
      const { orderId, changeDescription, ...updateData } = input;
      await updateScreenOrder(
        orderId,
        updateData,
        ctx.user.id,
        ctx.user.name,
        changeDescription
      );
      const newStatus = input.status;
      if (newStatus && newStatus !== prevStatus && isManagerOrAdmin && !isOwner) {
        try {
          const targetIds = await filterByPref([order.userId], "order_status");
          if (targetIds.length > 0) {
            const statusMessages = {
              approved: `Your order "${order.title}" has been approved.`,
              rejected: `Your order "${order.title}" has been rejected. Please review and resubmit.`,
              completed: `Your order "${order.title}" has been marked as completed.`,
              submitted: `Your order "${order.title}" has been submitted for review.`
            };
            const body = statusMessages[newStatus] ?? `Your order "${order.title}" status changed to ${newStatus}.`;
            await notifyUsers(
              targetIds,
              "Screen Order Update",
              body,
              "order_status",
              { screen: "orders", orderId }
            );
          }
        } catch (notifError) {
          console.error("[PushNotifications] Screen order status notification failed:", notifError);
        }
      }
      return { success: true };
    }),
    /** Get a single order by ID */
    get: protectedProcedure.input(z4.object({ orderId: z4.number() })).query(async ({ ctx, input }) => {
      const order = await getScreenOrder(input.orderId);
      if (!order) throw new Error("Order not found");
      const isOwner = order.userId === ctx.user.id;
      const isManagerOrAdmin = ctx.user.role === "manager" || ctx.user.role === "admin";
      if (!isOwner && !isManagerOrAdmin) {
        throw new Error("Unauthorized");
      }
      return order;
    }),
    /** List orders — members see their own, managers/admins see all */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "manager" || ctx.user.role === "admin") {
        return getAllScreenOrders();
      }
      return getUserScreenOrders(ctx.user.id);
    }),
    /** Get revision history for an order */
    revisions: protectedProcedure.input(z4.object({ orderId: z4.number() })).query(async ({ ctx, input }) => {
      const order = await getScreenOrder(input.orderId);
      if (!order) throw new Error("Order not found");
      const isOwner = order.userId === ctx.user.id;
      const isManagerOrAdmin = ctx.user.role === "manager" || ctx.user.role === "admin";
      if (!isOwner && !isManagerOrAdmin) {
        throw new Error("Unauthorized");
      }
      return getOrderRevisions(input.orderId);
    }),
    /** Delete an order (admin only) */
    delete: protectedProcedure.input(z4.object({ orderId: z4.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized: admin role required");
      }
      await deleteScreenOrder(input.orderId);
      return { success: true };
    })
  }),
  // ─── RECEIPTS ──────────────────────────────────────────────────────────────
  receipts: router({
    /** Analyze a receipt image with AI and extract structured data */
    analyzeImage: protectedProcedure.input(z4.object({ imageUrl: z4.string() })).mutation(async ({ input }) => {
      const { invokeLLM: invokeLLM2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
      const response = await invokeLLM2({
        messages: [
          {
            role: "system",
            content: `You are a receipt data extraction assistant. Extract all data from the receipt image and return it as JSON. Be precise with numbers.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all data from this receipt image. Return JSON with: vendorName, vendorLocation, purchaseDate (YYYY-MM-DD format), lineItems (array of {description, quantity, unitPrice, lineTotal}), subtotal, tax, total. If a field is not visible, return null." },
              { type: "image_url", image_url: { url: input.imageUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });
      const content = response.choices[0].message.content;
      return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    }),
    /** Create a new receipt */
    create: protectedProcedure.input(
      z4.object({
        submitterName: z4.string().optional(),
        vendorName: z4.string().optional(),
        vendorLocation: z4.string().optional(),
        purchaseDate: z4.string().optional(),
        expenseType: z4.enum(["JOB", "OVERHEAD"]).default("JOB"),
        jobName: z4.string().optional(),
        workOrderNumber: z4.string().optional(),
        poNumber: z4.string().optional(),
        overheadCategory: z4.string().optional(),
        materialCategory: z4.string().optional(),
        lineItems: z4.array(z4.object({
          description: z4.string(),
          quantity: z4.number(),
          unitPrice: z4.number(),
          lineTotal: z4.number()
        })).optional(),
        subtotal: z4.number().optional(),
        tax: z4.number().optional(),
        total: z4.number().optional(),
        notes: z4.string().optional(),
        imageUrl: z4.string().optional(),
        fileName: z4.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const id = await createReceipt({
        userId: ctx.user.id,
        companyId: ctx.user.companyId,
        submitterName: input.submitterName,
        vendorName: input.vendorName,
        vendorLocation: input.vendorLocation,
        purchaseDate: input.purchaseDate,
        expenseType: input.expenseType,
        jobName: input.jobName,
        workOrderNumber: input.workOrderNumber,
        poNumber: input.poNumber,
        overheadCategory: input.overheadCategory,
        materialCategory: input.materialCategory || "Miscellaneous",
        lineItems: input.lineItems,
        subtotal: input.subtotal?.toString(),
        tax: input.tax?.toString(),
        total: input.total?.toString(),
        notes: input.notes,
        imageUrl: input.imageUrl,
        fileName: input.fileName
      });
      return { id };
    }),
    /** List receipts — members see own, managers/admins see all */
    list: protectedProcedure.input(z4.object({
      userId: z4.number().optional(),
      vendorName: z4.string().optional(),
      startDate: z4.string().optional(),
      endDate: z4.string().optional()
    }).optional()).query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (isAdmin && input && (input.userId || input.vendorName || input.startDate || input.endDate)) {
        return getReceiptsWithFilters(input);
      }
      if (isAdmin) return getAllReceipts();
      return getUserReceipts(ctx.user.id);
    }),
    /** Get a single receipt */
    get: protectedProcedure.input(z4.object({ id: z4.number() })).query(async ({ ctx, input }) => {
      const receipt = await getReceipt(input.id);
      if (!receipt) throw new Error("Receipt not found");
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (!isAdmin && receipt.userId !== ctx.user.id) throw new Error("Unauthorized");
      return receipt;
    }),
    /** Delete a receipt — admins/managers can delete any; members can delete their own */
    delete: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (!isAdmin) {
        const receipt = await getReceipt(input.id);
        if (!receipt) throw new Error("Receipt not found");
        if (receipt.userId !== ctx.user.id) throw new Error("Unauthorized: you can only delete your own receipts");
      }
      await deleteReceipt(input.id);
      return { success: true };
    }),
    /** Generate PDF for a receipt and return as base64 data URI */
    generatePDF: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const receipt = await getReceipt(input.id);
      if (!receipt) throw new Error("Receipt not found");
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (!isAdmin && receipt.userId !== ctx.user.id) throw new Error("Unauthorized");
      const { generateReceiptPDF: generateReceiptPDF2 } = await Promise.resolve().then(() => (init_receipt_pdf(), receipt_pdf_exports));
      const pdfBuffer = await generateReceiptPDF2({
        fileName: receipt.fileName || `${receipt.vendorName || "Receipt"}_${receipt.purchaseDate || "unknown"}`,
        submitterName: receipt.submitterName,
        expenseType: receipt.expenseType,
        jobName: receipt.jobName,
        workOrderNumber: receipt.workOrderNumber,
        poNumber: receipt.poNumber,
        overheadCategory: receipt.overheadCategory,
        vendorName: receipt.vendorName,
        vendorLocation: receipt.vendorLocation,
        purchaseDate: receipt.purchaseDate,
        materialCategory: receipt.materialCategory,
        lineItems: receipt.lineItems,
        subtotal: receipt.subtotal,
        tax: receipt.tax,
        total: receipt.total,
        notes: receipt.notes,
        imageUrl: receipt.imageUrl,
        createdAt: receipt.createdAt
      });
      const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const fileKey = `receipts/pdf/${receipt.fileName || `receipt-${receipt.id}`}.pdf`;
      const { url } = await storagePut2(fileKey, pdfBuffer, "application/pdf");
      return { url, fileName: (receipt.fileName || `receipt-${receipt.id}`) + ".pdf" };
    }),
    /** Upload receipt image to S3 and return URL */
    uploadImage: protectedProcedure.input(z4.object({ base64: z4.string(), mimeType: z4.string().default("image/jpeg"), fileName: z4.string().optional() })).mutation(async ({ ctx, input }) => {
      const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const ext = input.mimeType === "image/png" ? "png" : "jpg";
      const key = `receipts/images/${ctx.user.id}-${Date.now()}.${ext}`;
      const buf = Buffer.from(input.base64, "base64");
      const { url } = await storagePut2(key, buf, input.mimeType);
      return { url };
    }),
    /** Archive a receipt — marks it as processed (admin/manager only) */
    archive: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (!isAdmin) throw new Error("Unauthorized: manager or admin role required");
      const receipt = await getReceipt(input.id);
      if (!receipt) throw new Error("Receipt not found");
      await archiveReceipt(input.id, ctx.user.id);
      return { success: true };
    }),
    /** Unarchive a receipt — restores it to the main list (admin/manager only) */
    unarchive: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (!isAdmin) throw new Error("Unauthorized: manager or admin role required");
      await unarchiveReceipt(input.id);
      return { success: true };
    }),
    /** List archived receipts — admin/manager only */
    listArchived: protectedProcedure.input(z4.object({
      userId: z4.number().optional(),
      vendorName: z4.string().optional(),
      startDate: z4.string().optional(),
      endDate: z4.string().optional()
    }).optional()).query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (!isAdmin) throw new Error("Unauthorized: manager or admin role required");
      if (input && (input.userId || input.vendorName || input.startDate || input.endDate)) {
        return getArchivedReceiptsWithFilters(input);
      }
      return getArchivedReceipts();
    }),
    /** Get analytics for the finance dashboard — includes archived receipts */
    analytics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      return getReceiptAnalytics();
    })
  }),
  // ─── AQUACLEAN RECEIPTS ───────────────────────────────────────────────────────
  aquacleanReceipts: router({
    /** Analyze a receipt image with AI and extract structured data */
    analyzeImage: protectedProcedure.input(z4.object({ imageUrl: z4.string() })).mutation(async ({ input }) => {
      const { invokeLLM: invokeLLM2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
      const response = await invokeLLM2({
        messages: [
          {
            role: "system",
            content: `You are a receipt data extraction assistant. Extract all data from the receipt image and return it as JSON. Be precise with numbers.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all data from this receipt image. Return JSON with: vendorName, vendorLocation, purchaseDate (YYYY-MM-DD format), lineItems (array of {description, quantity, unitPrice, lineTotal}), subtotal, tax, total. If a field is not visible, return null." },
              { type: "image_url", image_url: { url: input.imageUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });
      const content = response.choices[0].message.content;
      return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    }),
    /** Create a new AquaClean receipt */
    create: protectedProcedure.input(
      z4.object({
        submitterName: z4.string().optional(),
        vendorName: z4.string().optional(),
        vendorLocation: z4.string().optional(),
        purchaseDate: z4.string().optional(),
        expenseType: z4.enum(["JOB", "OVERHEAD"]).default("JOB"),
        jobName: z4.string().optional(),
        workOrderNumber: z4.string().optional(),
        poNumber: z4.string().optional(),
        overheadCategory: z4.string().optional(),
        materialCategory: z4.string().optional(),
        lineItems: z4.array(z4.object({
          description: z4.string(),
          quantity: z4.number(),
          unitPrice: z4.number(),
          lineTotal: z4.number()
        })).optional(),
        subtotal: z4.string().optional(),
        tax: z4.string().optional(),
        total: z4.string().optional(),
        notes: z4.string().optional(),
        imageUrl: z4.string().optional(),
        fileName: z4.string().optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const id = await createAquacleanReceipt({
        userId: ctx.user.id,
        companyId: ctx.user.companyId,
        submitterName: input.submitterName,
        vendorName: input.vendorName,
        vendorLocation: input.vendorLocation,
        purchaseDate: input.purchaseDate,
        expenseType: input.expenseType,
        jobName: input.jobName,
        workOrderNumber: input.workOrderNumber,
        poNumber: input.poNumber,
        overheadCategory: input.overheadCategory,
        materialCategory: input.materialCategory || "Miscellaneous",
        lineItems: input.lineItems,
        subtotal: input.subtotal,
        tax: input.tax,
        total: input.total,
        notes: input.notes,
        imageUrl: input.imageUrl,
        fileName: input.fileName
      });
      return { id };
    }),
    /** List AquaClean receipts */
    list: protectedProcedure.input(z4.object({
      userId: z4.number().optional(),
      vendorName: z4.string().optional(),
      startDate: z4.string().optional(),
      endDate: z4.string().optional()
    }).optional()).query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (input && (input.userId || input.vendorName || input.startDate || input.endDate)) {
        const filters = isAdmin ? input : { ...input, userId: ctx.user.id };
        return getAquacleanReceiptsWithFilters(filters);
      }
      return isAdmin ? getAllAquacleanReceipts() : getUserAquacleanReceipts(ctx.user.id);
    }),
    /** Get a single AquaClean receipt */
    get: protectedProcedure.input(z4.object({ id: z4.number() })).query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      const receipt = await getAquacleanReceipt(input.id);
      if (!receipt) throw new Error("Receipt not found");
      if (!isAdmin && receipt.userId !== ctx.user.id) throw new Error("Unauthorized");
      return receipt;
    }),
    /** Delete an AquaClean receipt */
    delete: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (!isAdmin) {
        const receipt = await getAquacleanReceipt(input.id);
        if (!receipt) throw new Error("Receipt not found");
        if (receipt.userId !== ctx.user.id) throw new Error("Unauthorized: you can only delete your own receipts");
      }
      await deleteAquacleanReceipt(input.id);
      return { success: true };
    }),
    /** Generate PDF for an AquaClean receipt */
    generatePDF: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const receipt = await getAquacleanReceipt(input.id);
      if (!receipt) throw new Error("Receipt not found");
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (!isAdmin && receipt.userId !== ctx.user.id) throw new Error("Unauthorized");
      const { generateAquacleanReceiptPDF: generateAquacleanReceiptPDF2 } = await Promise.resolve().then(() => (init_aquaclean_receipt_pdf(), aquaclean_receipt_pdf_exports));
      const pdfBuffer = await generateAquacleanReceiptPDF2({
        fileName: receipt.fileName || `${receipt.vendorName || "Receipt"}_${receipt.purchaseDate || "unknown"}`,
        submitterName: receipt.submitterName,
        expenseType: receipt.expenseType,
        jobName: receipt.jobName,
        workOrderNumber: receipt.workOrderNumber,
        poNumber: receipt.poNumber,
        overheadCategory: receipt.overheadCategory,
        vendorName: receipt.vendorName,
        vendorLocation: receipt.vendorLocation,
        purchaseDate: receipt.purchaseDate,
        materialCategory: receipt.materialCategory,
        lineItems: receipt.lineItems,
        subtotal: receipt.subtotal,
        tax: receipt.tax,
        total: receipt.total,
        notes: receipt.notes,
        imageUrl: receipt.imageUrl,
        createdAt: receipt.createdAt
      });
      const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const fileKey = `aquaclean-receipts/pdf/${receipt.fileName || `receipt-${receipt.id}`}.pdf`;
      const { url } = await storagePut2(fileKey, pdfBuffer, "application/pdf");
      return { url, fileName: (receipt.fileName || `receipt-${receipt.id}`) + ".pdf" };
    }),
    /** Upload AquaClean receipt image to S3 */
    uploadImage: protectedProcedure.input(z4.object({ base64: z4.string(), mimeType: z4.string().default("image/jpeg"), fileName: z4.string().optional() })).mutation(async ({ ctx, input }) => {
      const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const ext = input.mimeType === "image/png" ? "png" : "jpg";
      const key = `aquaclean-receipts/images/${ctx.user.id}-${Date.now()}.${ext}`;
      const buf = Buffer.from(input.base64, "base64");
      const { url } = await storagePut2(key, buf, input.mimeType);
      return { url };
    }),
    /** Get analytics for the AquaClean finance dashboard */
    analytics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      return getAquacleanReceiptAnalytics();
    })
  }),
  // ─── CMR REPORTS ──────────────────────────────────────────────────────────────
  cmr: router({
    /** Upsert a CMR report (create or update by localId) */
    upsert: protectedProcedure.input(z4.object({
      localId: z4.string(),
      consultantName: z4.string().optional(),
      consultantUserId: z4.string().optional(),
      clientName: z4.string().optional(),
      appointmentDate: z4.string().optional(),
      weekOf: z4.string().optional(),
      dealStatus: z4.string().optional(),
      outcome: z4.string().optional(),
      purchaseConfidencePct: z4.number().optional(),
      originalPcPct: z4.number().optional(),
      estimatedContractValue: z4.number().optional(),
      soldAt: z4.string().optional(),
      reportData: z4.any()
    })).mutation(async ({ ctx, input }) => {
      const existingReports = await getUserCmrReports(ctx.user.id);
      const isNew = !existingReports.some((r) => r.localId === input.localId);
      await upsertCmrReport({
        localId: input.localId,
        userId: ctx.user.id,
        companyId: ctx.user.companyId,
        consultantName: input.consultantName,
        consultantUserId: input.consultantUserId,
        clientName: input.clientName,
        appointmentDate: input.appointmentDate,
        weekOf: input.weekOf,
        dealStatus: input.dealStatus,
        outcome: input.outcome ?? "open",
        purchaseConfidencePct: input.purchaseConfidencePct,
        originalPcPct: input.originalPcPct,
        estimatedContractValue: input.estimatedContractValue?.toString(),
        soldAt: input.soldAt,
        reportData: input.reportData
      });
      if (isNew) {
        try {
          const managers = await getManagersAndAdminsWithPushToken();
          const allManagerIds = managers.map((m) => m.id);
          const targetIds = await filterByPref(allManagerIds, "cmr_new");
          if (targetIds.length > 0) {
            const clientDisplay = input.clientName ?? "a client";
            const consultantDisplay = input.consultantName ?? ctx.user.name ?? "A consultant";
            await notifyUsers(
              targetIds,
              "New CMR Report Submitted",
              `${consultantDisplay} submitted a report for ${clientDisplay}.`,
              "cmr_new",
              { screen: "cmr", localId: input.localId }
            );
          }
        } catch (notifError) {
          console.error("[PushNotifications] CMR notification failed:", notifError);
        }
      }
      return { success: true };
    }),
    /** List CMR reports — if userId is provided, always filter to that user; otherwise admins see all */
    list: protectedProcedure.input(z4.object({
      userId: z4.number().optional(),
      startDate: z4.string().optional(),
      endDate: z4.string().optional(),
      outcome: z4.string().optional(),
      minValue: z4.number().optional(),
      maxValue: z4.number().optional(),
      minPc: z4.number().optional(),
      maxPc: z4.number().optional()
    }).optional()).query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (input?.userId !== void 0) {
        return getUserCmrReports(input.userId);
      }
      if (!isAdmin) {
        return getUserCmrReports(ctx.user.id);
      }
      if (input && Object.values(input).some((v) => v !== void 0)) {
        return getCmrReportsWithFilters(input);
      }
      return getAllCmrReports();
    }),
    /** Delete a CMR report (admin only) */
    delete: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized: admin role required");
      await deleteCmrReport(input.id);
      return { success: true };
    }),
    /** Export a CMR report as a PDF — generates server-side and returns an S3 URL */
    exportPDF: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const reports = await getAllCmrReports();
      const report = reports.find((r) => r.id === input.id);
      if (!report) throw new Error("CMR report not found");
      const isAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      if (!isAdmin && report.userId !== ctx.user.id) throw new Error("Unauthorized");
      const rd = report.reportData ?? {};
      const pdfBuffer = await generateCmrPDF({
        clientName: report.clientName,
        consultantName: report.consultantName,
        appointmentDate: report.appointmentDate,
        weekOf: report.weekOf,
        source: rd.source,
        address: rd.address,
        clientType: rd.clientType,
        appointmentType: rd.appointmentType,
        leadSources: rd.leadSources,
        projectTypes: rd.projectTypes,
        dealStatus: report.dealStatus,
        closeTimeline: rd.closeTimeline,
        followUpDate: rd.followUpDate,
        proposalDate: rd.proposalDate,
        lostReason: rd.lostReason,
        lastConversationSummary: rd.lastConversationSummary,
        purchaseConfidencePct: report.purchaseConfidencePct,
        originalPcPct: report.originalPcPct,
        estimatedContractValue: report.estimatedContractValue,
        decisionMakers: rd.decisionMakers,
        mainMotivation: rd.mainMotivation,
        mainHesitation: rd.mainHesitation,
        pcNotes: rd.pcNotes,
        financingDiscussed: rd.financingDiscussed,
        financingReaction: rd.financingReaction,
        valueCommunicated: rd.valueCommunicated,
        clientResponse: rd.clientResponse,
        objections: rd.objections,
        objectionNotes: rd.objectionNotes,
        nextActions: rd.nextActions,
        nextFollowUpDate: rd.nextFollowUpDate,
        leadQuality: rd.leadQuality,
        expectationAlignment: rd.expectationAlignment,
        messagingReferenced: rd.messagingReferenced,
        budgetAlignment: rd.budgetAlignment,
        marketingNotes: rd.marketingNotes,
        progressNotes: rd.progressNotes ?? []
      });
      const safeName = (report.clientName ?? "CMR").replace(/[^a-zA-Z0-9_-]/g, "_");
      const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, "-");
      const ts = Date.now();
      const fileKey = `cmr/pdf/${safeName}_${dateStr}_${report.id}_${ts}.pdf`;
      const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
      const fileName = `DOS_Hub_CMR_${safeName}_${dateStr}.pdf`;
      return { url, fileName };
    })
  }),
  // ─── PROJECT MATERIAL DELIVERY ────────────────────────────────────────────
  projectMaterial: router({
    /** Create a new checklist (manager/admin only) */
    create: protectedProcedure.input(z4.object({
      projectName: z4.string(),
      clientName: z4.string().optional(),
      projectLocation: z4.string().optional(),
      supervisorUserId: z4.number().optional(),
      supervisorName: z4.string().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      const createdByName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.name || ctx.user.email || "Unknown";
      return createProjectMaterialChecklist({
        createdByUserId: ctx.user.id,
        createdByName,
        projectName: input.projectName,
        clientName: input.clientName,
        projectLocation: input.projectLocation,
        supervisorUserId: input.supervisorUserId,
        supervisorName: input.supervisorName,
        status: "draft",
        auditTrail: [{ userId: ctx.user.id, userName: createdByName, action: "Created checklist", timestamp: (/* @__PURE__ */ new Date()).toISOString() }]
      });
    }),
    /** List all checklists */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getAllProjectMaterialChecklists();
    }),
    /** Get a single checklist by ID */
    get: protectedProcedure.input(z4.object({ id: z4.number() })).query(async ({ ctx, input }) => {
      return getProjectMaterialChecklist(input.id);
    }),
    /** Update checklist inventory data */
    update: protectedProcedure.input(z4.object({
      id: z4.number(),
      boxedItems: z4.any().optional(),
      deliveryItems: z4.any().optional(),
      projectSpecificItems: z4.any().optional(),
      supervisorUserId: z4.number().optional(),
      supervisorName: z4.string().optional(),
      warehouseCheckoffs: z4.any().optional(),
      attachments: z4.any().optional(),
      materialsLoaded: z4.boolean().optional(),
      materialsDelivered: z4.boolean().optional(),
      materialsLoadedPhotos: z4.array(z4.string()).optional(),
      materialsDeliveredPhotos: z4.array(z4.string()).optional()
    })).mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.name || ctx.user.email || "Unknown";
      await updateProjectMaterialChecklist(id, updates, { userId: ctx.user.id, userName });
      return { success: true };
    }),
    /** Advance the status of a checklist */
    updateStatus: protectedProcedure.input(z4.object({
      id: z4.number(),
      status: z4.string(),
      action: z4.string(),
      projectName: z4.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.name || ctx.user.email || "Unknown";
      await updateProjectMaterialChecklistStatus(input.id, input.status, { userId: ctx.user.id, userName, action: input.action });
      const notifConfig = MATERIAL_DELIVERY_NOTIFICATIONS[input.status];
      if (notifConfig) {
        const projectName = input.projectName ?? "a project";
        const { title, body, targetRole } = notifConfig;
        const prefKey = targetRole === "Warehouse Manager" ? "material_delivery_warehouse" : "material_delivery_status";
        let candidateIds = [];
        if (targetRole) {
          const allUsers = await getAllUsers();
          candidateIds = allUsers.filter((u) => {
            const roles = u.dosRoles ?? [];
            return roles.includes(targetRole);
          }).map((u) => u.id);
        } else {
          const allUsers = await getAllUsers();
          candidateIds = allUsers.filter((u) => u.role === "admin" || u.role === "manager").map((u) => u.id);
        }
        const targetIds = await filterByPref(candidateIds, prefKey);
        if (targetIds.length > 0) {
          notifyUsers(targetIds, title, body(projectName), prefKey, {
            screen: "/(tabs)/modules/project-material-delivery",
            checklistId: input.id
          }).catch(console.error);
        }
      }
      return { success: true };
    }),
    /** Upload a file attachment (purchase order PDF or photo) */
    uploadFile: protectedProcedure.input(z4.object({
      id: z4.number(),
      fileUrl: z4.string(),
      fileName: z4.string(),
      fileType: z4.string()
    })).mutation(async ({ ctx, input }) => {
      const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.name || ctx.user.email || "Unknown";
      await addProjectMaterialAttachment(input.id, {
        url: input.fileUrl,
        name: input.fileName,
        type: input.fileType,
        uploadedByName: userName,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      return { success: true };
    }),
    /** Delete a checklist (manager/admin only) */
    delete: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      await deleteProjectMaterialChecklist(input.id);
      return { success: true };
    }),
    /** Move status backward (manager/admin only) */
    revertStatus: protectedProcedure.input(z4.object({
      id: z4.number(),
      status: z4.string(),
      action: z4.string()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.name || ctx.user.email || "Unknown";
      await updateProjectMaterialChecklistStatus(input.id, input.status, { userId: ctx.user.id, userName, action: input.action });
      return { success: true };
    }),
    /** Archive a checklist (manager/admin only) */
    archive: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.name || ctx.user.email || "Unknown";
      await archiveProjectMaterialChecklist(input.id, { userName });
      return { success: true };
    }),
    /** Unarchive a checklist (manager/admin only) */
    unarchive: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      const userName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.name || ctx.user.email || "Unknown";
      await unarchiveProjectMaterialChecklist(input.id, { userName });
      return { success: true };
    }),
    /** Generate a PDF for a material delivery checklist */
    generatePdf: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ input }) => {
      const checklist = await getProjectMaterialChecklist(input.id);
      if (!checklist) throw new Error("Checklist not found");
      const { generateMaterialDeliveryPDF: generateMaterialDeliveryPDF2 } = await Promise.resolve().then(() => (init_material_delivery_pdf(), material_delivery_pdf_exports));
      const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const pdfBuffer = await generateMaterialDeliveryPDF2({
        projectName: checklist.projectName,
        clientName: checklist.clientName,
        projectLocation: checklist.projectLocation,
        supervisorName: checklist.supervisorName,
        createdByName: checklist.createdByName,
        createdAt: checklist.createdAt,
        status: checklist.status,
        boxedItems: checklist.boxedItems,
        deliveryItems: checklist.deliveryItems,
        projectSpecificItems: checklist.projectSpecificItems,
        warehouseCheckoffs: checklist.warehouseCheckoffs,
        materialsLoaded: checklist.materialsLoaded ?? false,
        materialsDelivered: checklist.materialsDelivered ?? false,
        materialsLoadedByName: checklist.materialsLoadedByName ?? null,
        materialsLoadedAt: checklist.materialsLoadedAt ?? null,
        materialsDeliveredByName: checklist.materialsDeliveredByName ?? null,
        materialsDeliveredAt: checklist.materialsDeliveredAt ?? null,
        materialsLoadedPhotos: checklist.materialsLoadedPhotos ?? null,
        materialsDeliveredPhotos: checklist.materialsDeliveredPhotos ?? null,
        attachments: checklist.attachments,
        auditTrail: checklist.auditTrail
      });
      const safeProjectName = (checklist.projectName || "checklist").replace(/[^a-z0-9]/gi, "-").toLowerCase();
      const fileKey = `material-delivery/pdf/${safeProjectName}-${input.id}-${Date.now()}.pdf`;
      const { url } = await storagePut2(fileKey, pdfBuffer, "application/pdf");
      return { url, fileName: `${safeProjectName}-checklist.pdf` };
    })
  }),
  // ─── DASHBOARD ANALYTICS ─────────────────────────────────────────────────────
  dashboard: router({
    /** Get dashboard stats (manager/admin only) */
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Unauthorized: manager or admin role required");
      }
      return getDashboardStats();
    })
  }),
  notifications: router({
    /** Register or update the Expo push token for the current user */
    registerToken: protectedProcedure.input((input) => {
      const { z: z5 } = __require("zod");
      return z5.object({ token: z5.string().min(1) }).parse(input);
    }).mutation(async ({ ctx, input }) => {
      await updateUserPushToken(ctx.user.id, input.token);
      return { success: true };
    }),
    /** Get all in-app notifications for the current user */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserNotifications(ctx.user.id);
    }),
    /** Get unread notification count for the current user */
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const count = await getUnreadNotificationCount(ctx.user.id);
      return { count };
    }),
    /** Mark a specific notification as read */
    markRead: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),
    /** Mark all notifications as read for the current user */
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
    /** Delete a notification */
    delete: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      await deleteNotification(input.id, ctx.user.id);
      return { success: true };
    }),
    /** Get notification preferences for the current user */
    getPrefs: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await getNotificationPrefs(ctx.user.id);
      return prefs ?? {};
    }),
    /** Update notification preferences for the current user */
    updatePrefs: protectedProcedure.input(z4.object({ prefs: z4.record(z4.string(), z4.boolean()) })).mutation(async ({ ctx, input }) => {
      await updateNotificationPrefs(ctx.user.id, input.prefs);
      return { success: true };
    })
  }),
  // ─── PRECONSTRUCTION CHECKLISTS ────────────────────────────────────────────
  precon: router({
    /** Create a new preconstruction checklist */
    create: protectedProcedure.input(z4.object({
      projectName: z4.string(),
      projectAddress: z4.string().optional(),
      meetingDate: z4.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const supervisorName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.name || ctx.user.email || "Unknown";
      const result = await createPreconChecklist({
        userId: ctx.user.id,
        supervisorName,
        companyId: ctx.user.companyId ?? null,
        projectName: input.projectName,
        projectAddress: input.projectAddress,
        meetingDate: input.meetingDate
      });
      return result;
    }),
    /** Get a single checklist by ID */
    get: protectedProcedure.input(z4.object({ id: z4.number() })).query(async ({ ctx, input }) => {
      const checklist = await getPreconChecklist(input.id);
      if (!checklist) return void 0;
      if (checklist.photoData) {
        try {
          const photoUris = JSON.parse(checklist.photoData);
          checklist.formData = { ...checklist.formData ?? {}, photoUris };
        } catch {
        }
      }
      return checklist;
    }),
    /** List all checklists (managers/admins see all, others see own) */
    list: protectedProcedure.query(async ({ ctx }) => {
      const isManagerOrAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      return listPreconChecklists(isManagerOrAdmin ? void 0 : { userId: ctx.user.id });
    }),
    /** Update form data and/or status */
    update: protectedProcedure.input(z4.object({
      id: z4.number(),
      projectName: z4.string().optional(),
      projectAddress: z4.string().optional(),
      meetingDate: z4.string().optional(),
      status: z4.string().optional(),
      formData: z4.record(z4.string(), z4.unknown()).optional(),
      supervisorSignature: z4.string().optional(),
      supervisorSignedName: z4.string().optional(),
      client1Signature: z4.string().optional(),
      client1SignedName: z4.string().optional(),
      client2Signature: z4.string().optional(),
      client2SignedName: z4.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const now = /* @__PURE__ */ new Date();
      const patch = { ...updates };
      if (updates.formData && typeof updates.formData === "object") {
        const fd = updates.formData;
        if (fd.photoUris) {
          patch.photoData = JSON.stringify(fd.photoUris);
          const { photoUris, ...restFormData } = fd;
          patch.formData = restFormData;
        }
      }
      if (updates.supervisorSignature && !patch.supervisorSignedAt) patch.supervisorSignedAt = now;
      if (updates.client1Signature && !patch.client1SignedAt) patch.client1SignedAt = now;
      if (updates.client2Signature && !patch.client2SignedAt) patch.client2SignedAt = now;
      await updatePreconChecklist(id, patch);
      return { success: true };
    }),
    /** Delete a checklist (manager/admin or owner) */
    delete: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const checklist = await getPreconChecklist(input.id);
      if (!checklist) throw new Error("Not found");
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager" && checklist.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      await deletePreconChecklist(input.id);
      return { success: true };
    }),
    /** Generate PDF for a checklist */
    generatePdf: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const checklist = await getPreconChecklist(input.id);
      if (!checklist) throw new Error("Checklist not found");
      const { generatePreconPdf: generatePreconPdf2 } = await Promise.resolve().then(() => (init_precon_pdf(), precon_pdf_exports));
      const pdfBuffer = await generatePreconPdf2(checklist);
      const base64 = pdfBuffer.toString("base64");
      return { base64, mimeType: "application/pdf" };
    }),
    /** List all checklists for dashboard (managers/admins), optionally including archived */
    listAll: protectedProcedure.input(z4.object({ includeArchived: z4.boolean().optional() })).query(async ({ ctx, input }) => {
      const isManagerOrAdmin = ctx.user.role === "admin" || ctx.user.role === "manager";
      return listPreconChecklists(
        isManagerOrAdmin ? void 0 : { userId: ctx.user.id },
        { includeArchived: input.includeArchived ?? false }
      );
    }),
    /** Archive a checklist (managers/admins only) */
    archive: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Only managers and admins can archive checklists");
      }
      const archivedByName = [ctx.user.firstName, ctx.user.lastName].filter(Boolean).join(" ") || ctx.user.name || "Unknown";
      await updatePreconChecklist(input.id, {
        archived: true,
        archivedAt: /* @__PURE__ */ new Date(),
        archivedByName
      });
      return { success: true };
    }),
    /** Unarchive a checklist (managers/admins only) */
    unarchive: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Only managers and admins can unarchive checklists");
      }
      await updatePreconChecklist(input.id, {
        archived: false,
        archivedAt: null,
        archivedByName: null
      });
      return { success: true };
    })
  }),
  // ─── TIME OFF ──────────────────────────────────────────────────────────────
  timeOff: router({
    /** Get the current user's PTO policy */
    getMyPolicy: protectedProcedure.query(async ({ ctx }) => {
      return getTimeOffPolicy(ctx.user.id);
    }),
    /** Admin: get all PTO policies with user info */
    getAllPolicies: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Only managers and admins can view all policies");
      }
      const policies = await getAllTimeOffPolicies();
      const users3 = await getAllUsers();
      return policies.map((p) => {
        const user = users3.find((u) => u.id === p.userId);
        return { ...p, userName: user?.name || user?.email || `User #${p.userId}` };
      });
    }),
    /** Admin: get PTO policy for a specific user */
    getPolicyForUser: protectedProcedure.input(z4.object({ userId: z4.number() })).query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Only managers and admins can view user policies");
      }
      return getTimeOffPolicy(input.userId);
    }),
    /** Admin: upsert a PTO policy for a user */
    upsertPolicy: protectedProcedure.input(z4.object({
      userId: z4.number(),
      totalDaysAllowed: z4.string().optional(),
      totalHoursAllowed: z4.string().optional(),
      periodStartDate: z4.string().optional(),
      periodEndDate: z4.string().optional(),
      notes: z4.string().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Only managers and admins can update PTO policies");
      }
      const id = await upsertTimeOffPolicy({
        userId: input.userId,
        totalDaysAllowed: input.totalDaysAllowed,
        totalHoursAllowed: input.totalHoursAllowed,
        periodStartDate: input.periodStartDate,
        periodEndDate: input.periodEndDate,
        notes: input.notes
      });
      return { id };
    }),
    /** Submit a new time off request */
    submitRequest: protectedProcedure.input(z4.object({
      requestType: z4.string().default("vacation"),
      startDate: z4.string(),
      endDate: z4.string(),
      startTime: z4.string().optional(),
      endTime: z4.string().optional(),
      totalDays: z4.string().optional(),
      totalHours: z4.string().optional(),
      reason: z4.string().optional(),
      periodYear: z4.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const id = await createTimeOffRequest({
        userId: ctx.user.id,
        companyId: ctx.user.companyId ?? null,
        requestType: input.requestType,
        startDate: input.startDate,
        endDate: input.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        totalDays: input.totalDays,
        totalHours: input.totalHours,
        reason: input.reason,
        periodYear: input.periodYear,
        status: "pending"
      });
      return { id };
    }),
    /** Get the current user's own requests */
    getMyRequests: protectedProcedure.input(z4.object({ periodYear: z4.string().optional() }).optional()).query(async ({ ctx, input }) => {
      if (input?.periodYear) {
        return getUserTimeOffRequestsByPeriod(ctx.user.id, input.periodYear);
      }
      return getUserTimeOffRequests(ctx.user.id);
    }),
    /** Admin/manager: get all requests with optional filters */
    getAllRequests: protectedProcedure.input(z4.object({
      userId: z4.number().optional(),
      status: z4.string().optional(),
      periodYear: z4.string().optional()
    }).optional()).query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Only managers and admins can view all requests");
      }
      const requests = await getAllTimeOffRequests(input || {});
      const users3 = await getAllUsers();
      return requests.map((r) => {
        const user = users3.find((u) => u.id === r.userId);
        return { ...r, userName: user?.name || user?.email || `User #${r.userId}` };
      });
    }),
    /** Admin/manager: approve or deny a request */
    reviewRequest: protectedProcedure.input(z4.object({
      id: z4.number(),
      status: z4.enum(["approved", "denied"]),
      reviewNotes: z4.string().optional()
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Only managers and admins can review requests");
      }
      await reviewTimeOffRequest(input.id, input.status, ctx.user.id, input.reviewNotes);
      return { success: true };
    }),
    /** Employee: cancel own pending request */
    cancelRequest: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const req = await getTimeOffRequest(input.id);
      if (!req) throw new Error("Request not found");
      if (req.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Not authorized");
      }
      await cancelTimeOffRequest(input.id);
      return { success: true };
    }),
    /** Get used PTO days for current user in a period */
    getUsedDays: protectedProcedure.input(z4.object({ periodYear: z4.string().optional() }).optional()).query(async ({ ctx, input }) => {
      const used = await getUsedPTODays(ctx.user.id, input?.periodYear);
      return { usedDays: used };
    }),
    /** Admin: get used PTO days for any user */
    getUserUsedDays: protectedProcedure.input(z4.object({ userId: z4.number(), periodYear: z4.string().optional() })).query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new Error("Not authorized");
      }
      const used = await getUsedPTODays(input.userId, input.periodYear);
      return { usedDays: used };
    }),
    /** Admin/manager/Owner only: permanently delete a time off request */
    deleteRequest: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const dosRoles = ctx.user.dosRoles ?? [];
      const isAuthorized = ctx.user.role === "admin" || ctx.user.role === "manager" || dosRoles.includes("Owner") || dosRoles.includes("Operations Manager") || dosRoles.includes("Project Manager");
      if (!isAuthorized) {
        throw new Error("Only admins, managers, and Owners can delete time off requests");
      }
      await deleteTimeOffRequest(input.id);
      return { success: true };
    }),
    /** Soft-delete: marks deletedAt so the record is hidden but restorable within 30s */
    softDelete: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const dosRoles = ctx.user.dosRoles ?? [];
      const isAuthorized = ctx.user.role === "admin" || ctx.user.role === "manager" || dosRoles.includes("Owner") || dosRoles.includes("Operations Manager") || dosRoles.includes("Project Manager");
      if (!isAuthorized) throw new Error("Not authorized");
      await softDeleteTimeOffRequest(input.id);
      return { success: true };
    }),
    /** Restore a soft-deleted request (undo delete within 30s window) */
    restoreRequest: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const dosRoles = ctx.user.dosRoles ?? [];
      const isAuthorized = ctx.user.role === "admin" || ctx.user.role === "manager" || dosRoles.includes("Owner") || dosRoles.includes("Operations Manager") || dosRoles.includes("Project Manager");
      if (!isAuthorized) throw new Error("Not authorized");
      await restoreTimeOffRequest(input.id);
      return { success: true };
    }),
    /** Admin/manager: change the status of any request at any time (override after approval) */
    changeStatus: protectedProcedure.input(z4.object({
      id: z4.number(),
      status: z4.enum(["pending", "approved", "denied", "cancelled"]),
      reviewNotes: z4.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const dosRoles = ctx.user.dosRoles ?? [];
      const isAuthorized = ctx.user.role === "admin" || ctx.user.role === "manager" || dosRoles.includes("Owner") || dosRoles.includes("Operations Manager");
      if (!isAuthorized) throw new Error("Not authorized");
      await reviewTimeOffRequest(input.id, input.status, ctx.user.id, input.reviewNotes);
      return { success: true };
    }),
    /** Admin/manager: get all requests for calendar display (approved + pending, with user info) */
    getCalendarRequests: protectedProcedure.query(async ({ ctx }) => {
      const dosRoles = ctx.user.dosRoles ?? [];
      const isAuthorized = ctx.user.role === "admin" || ctx.user.role === "manager" || dosRoles.includes("Owner") || dosRoles.includes("Operations Manager");
      if (!isAuthorized) throw new Error("Not authorized");
      const allRequests = await getAllTimeOffRequests({});
      const calendarRequests = allRequests.filter(
        (r) => r.status === "approved" || r.status === "pending"
      );
      const users3 = await getAllUsers();
      return calendarRequests.map((r) => {
        const user = users3.find((u) => u.id === r.userId);
        return {
          ...r,
          userName: user?.name || user?.email || `User #${r.userId}`,
          userEmail: user?.email || ""
        };
      });
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  const path = await import("path");
  app.use(express.static(path.join(process.cwd(), "dist/web")));
  registerOAuthRoutes(app);
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { base64, mimeType = "image/jpeg" } = req.body;
      if (!base64) {
        res.status(400).json({ error: "base64 required" });
        return;
      }
      const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const ext = mimeType === "image/png" ? "png" : "jpg";
      const key = `receipts/images/upload-${Date.now()}.${ext}`;
      const buf = Buffer.from(base64, "base64");
      const { url } = await storagePut2(key, buf, mimeType);
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });
  app.post("/api/upload-material-file", async (req, res) => {
    try {
      const { base64, mimeType = "image/jpeg", fileName = "file" } = req.body;
      if (!base64) {
        res.status(400).json({ error: "base64 required" });
        return;
      }
      const { storagePut: storagePut2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const ext = mimeType === "application/pdf" ? "pdf" : mimeType === "image/png" ? "png" : "jpg";
      const key = `material-delivery/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;
      const buf = Buffer.from(base64, "base64");
      const { url } = await storagePut2(key, buf, mimeType);
      res.json({ url });
    } catch (err) {
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });
  app.get("*", async (_req, res) => {
    const path2 = await import("path");
    res.sendFile(path2.join(process.cwd(), "dist/web/index.html"));
  });
  app.post("/api/deploy-to-production", async (req, res) => {
    try {
      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        res.status(500).json({ error: "GitHub token not configured" });
        return;
      }
      const owner = "greggdisantis";
      const repo = "DOS-Hub";
      const workflowId = "242198057";
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `token ${token}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ref: "main"
          })
        }
      );
      if (!response.ok) {
        const error = await response.text();
        res.status(response.status).json({
          error: `GitHub API error: ${response.statusText}`,
          details: error
        });
        return;
      }
      res.json({
        success: true,
        message: "Deployment to production triggered successfully",
        workflowUrl: `https://github.com/${owner}/${repo}/actions/workflows/${workflowId}`
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Deployment failed" });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}
startServer().catch(console.error);
