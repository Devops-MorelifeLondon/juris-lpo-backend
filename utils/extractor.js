// utils/extractor.js
// Simple extractor utilities:
// - extractPDF(buffer): returns [{ page, text, heading }]
// - extractDOCX(buffer): returns [{ page, html, heading }]
//
// Uses: pdf-parse, mammoth

const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

/**
 * extractPDF(buffer)
 * - buffer: Buffer of PDF file
 * Returns: array of pages: [{ page: 1, text: "...", heading: null }, ...]
 */
exports.extractPDF = async (buffer) => {
  const data = await pdfParse(buffer);

  // pdf-parse returns a single text blob with form-feed (\f) page separators in many PDFs.
  // Split on that to create page-like chunks. Fallback to splitting by double newlines.
  const raw = data.text || "";
  let pages = raw.split("\f").map((t) => t && t.trim()).filter(Boolean);

  if (pages.length === 0) {
    // fallback: split by two or more newlines into paragraphs then group into pages (~900 words)
    const paras = raw.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    pages = [];
    let cur = "";
    let curWords = 0;
    let pageIndex = 1;
    for (const para of paras) {
      const words = para.split(/\s+/).length;
      if (curWords + words > 900 && cur) {
        pages.push(cur.trim());
        cur = para;
        curWords = words;
      } else {
        cur += `\n\n${para}`;
        curWords += words;
      }
    }
    if (cur.trim()) pages.push(cur.trim());
  }

  return pages.map((t, i) => ({
    page: i + 1,
    text: t,
    heading: null
  }));
};

/**
 * extractDOCX(buffer)
 * - buffer: Buffer of DOCX file
 * Returns: array with a single page object: [{ page:1, html: "<p>...</p>", heading: null }]
 *
 * Uses mammoth.convertToHtml to preserve basic formatting (headings, bold, lists).
 */
exports.extractDOCX = async (buffer) => {
  const result = await mammoth.convertToHtml({ buffer });
  return [{
    page: 1,
    html: result.value,
    heading: null
  }];
};
