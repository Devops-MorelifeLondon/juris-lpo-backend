// utils/extractor.js
// Reworked to use pdfjs-dist (dynamic import) and mammoth for DOCX
const mammoth = require("mammoth");

/**
 * extractPDF(buffer)
 * - Uses pdfjs-dist dynamically to avoid top-level native deps
 * - Returns array of pages: [{ page: 1, text: "..." }, ...]
 */
exports.extractPDF = async (buffer) => {
  try {
    // dynamic import - safe in CommonJS as inside async function
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const doc = await loadingTask.promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((it) => (it && it.str) ? it.str : "").join(" ");
        pages.push({ page: i, text: pageText, heading: null });
      } catch (pageErr) {
        console.warn(`[extractPDF] failed to extract page ${i}:`, pageErr && pageErr.message ? pageErr.message : pageErr);
        pages.push({ page: i, text: "", heading: null });
      }
    }
    return pages;
  } catch (err) {
    console.error("[extractPDF] pdf extractor failed:", err && err.stack ? err.stack : err);
    // fallback: try simple text attempt with pdfjs-dist's Node worker path altered (if needed)
    throw err;
  }
};

/**
 * extractDOCX(buffer)
 * - Uses mammoth.convertToHtml for safe HTML output
 */
exports.extractDOCX = async (buffer) => {
  try {
    const result = await mammoth.convertToHtml({ buffer });
    // return single-page array (no layout engine)
    return [{ page: 1, html: result.value, text: (result.value || "").replace(/<[^>]+>/g, ""), heading: null }];
  } catch (err) {
    console.error("[extractDOCX] mammoth failed:", err);
    return [{ page: 1, html: "", text: "", heading: null }];
  }
};
