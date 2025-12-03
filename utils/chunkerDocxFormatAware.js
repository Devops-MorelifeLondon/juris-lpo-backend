// utils/chunkerDocxFormatAware.js
exports.createChunks = (pages, limit = 250, overlap = 40) => {
  const out = [];

  for (const p of pages) {
    let chunkHtml = "";
    let chunkText = "";
    let collected = [];
    let wc = 0;

    for (const para of p.paragraphs) {
      const w = para.text ? para.text.split(/\s+/).length : 0;
      wc += w;
      chunkHtml += para.html;
      chunkText += " " + (para.text || "");
      collected.push(para.metadata);

      if (wc >= limit) {
        out.push({
          page: p.page,
          html: chunkHtml,
          rawText: chunkText.trim(),
          metadata: {
            sectPr: p.sectPr,
            mergedStyles: mergeStyles(collected)
          }
        });

        const tailWords = chunkText.trim().split(/\s+/).slice(-overlap).join(" ");
        chunkText = tailWords;
        chunkHtml = "";
        wc = tailWords.split(/\s+/).length;
        collected = [];
      }
    }

    if (chunkText.trim()) {
      out.push({
        page: p.page,
        html: chunkHtml,
        rawText: chunkText.trim(),
        metadata: {
          sectPr: p.sectPr,
          mergedStyles: mergeStyles(collected)
        }
      });
    }
  }

  return out;
};

function mergeStyles(list) {
  const out = {};
  for (const m of list) {
    if (!m) continue;
    // merge pStyle, spacing, indent, numbering from the most frequent or last seen
    if (m.pStyle) out.pStyle = out.pStyle || m.pStyle;
    if (m.spacing) out.spacing = out.spacing || m.spacing;
    if (m.indent) out.indent = out.indent || m.indent;
    if (m.numbering) out.numbering = out.numbering || m.numbering;
  }
  return out;
}
