// utils/htmlToDocxFromStyles.js
const JSZip = require("jszip");

function escapeXml(s = "") {
  return s.replace(/[<>&'"]/g, ch => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&#39;", '"':"&quot;" }[ch]));
}

function simpleHtmlToPList(html) {
  // Minimal parser: keep <h1..h3>, <p>, <ul>/<ol>/<li>, <table> as text blocks.
  // This is intentionally simple to avoid DOM dependencies.
  const blocks = [];
  // Normalize newlines
  html = html.replace(/\r\n/g, "\n");
  // headings
  html = html.replace(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi, (m, lvl, inner) => {
    blocks.push({ type: "h", level: lvl, text: inner.replace(/<[^>]+>/g, "") });
    return "";
  });
  // paragraphs
  html = html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (m, inner) => {
    blocks.push({ type: "p", text: inner.replace(/<[^>]+>/g, "") });
    return "";
  });
  // lists
  html = html.replace(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi, (m, kind, inner) => {
    const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(x => x[1].replace(/<[^>]+>/g,""));
    blocks.push({ type: "list", kind, items });
    return "";
  });
  // tables
  html = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (m, inner) => {
    const rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(r => {
      return [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => c[1].replace(/<[^>]+>/g,""));
    });
    blocks.push({ type: "table", rows });
    return "";
  });
  return blocks;
}

function buildDocXml(blocks, margins) {
  // Very simple mapping: each block to <w:p> or <w:tbl>
  const m = margins || { top:1440, right:1440, bottom:1440, left:1440 };
  let inner = "";
  for (const b of blocks) {
    if (b.type === "h") {
      inner += `<w:p><w:pPr><w:pStyle w:val="Heading${b.level}"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(b.text)}</w:t></w:r></w:p>`;
    } else if (b.type === "p") {
      inner += `<w:p><w:r><w:t xml:space="preserve">${escapeXml(b.text)}</w:t></w:r></w:p>`;
    } else if (b.type === "list") {
      for (const it of b.items) {
        inner += `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${b.kind === 'ol' ? '1' : '2'}"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(it)}</w:t></w:r></w:p>`;
      }
    } else if (b.type === "table") {
      let rows = "";
      for (const r of b.rows) {
        const cells = r.map(c => `<w:tc><w:p><w:r><w:t xml:space="preserve">${escapeXml(c)}</w:t></w:r></w:p></w:tc>`).join("");
        rows += `<w:tr>${cells}</w:tr>`;
      }
      inner += `<w:tbl><w:tblPr/><w:tblGrid/>${rows}</w:tbl>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
      ${inner}
      <w:sectPr>
        <w:pgMar w:top="${m.top}" w:right="${m.right}" w:bottom="${m.bottom}" w:left="${m.left}"/>
      </w:sectPr>
    </w:body>
  </w:document>`;
}

exports.convertHtmlToDocxUsingStyles = async (html, styleTemplate = {}) => {
  if (!html || typeof html !== "string") html = "";
  // Strip code fences & normalize
  html = html.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    html = `<p>${html.trim().split(/\r?\n+/).map(s => s.trim()).filter(Boolean).join("</p><p>")}</p>`;
  }

  const blocks = simpleHtmlToPList(html);
  const margins = styleTemplate.sectPr && styleTemplate.sectPr["w:pgMar"] ? {
    top: parseInt(styleTemplate.sectPr["w:pgMar"]["@_w:top"] || 1440),
    right: parseInt(styleTemplate.sectPr["w:pgMar"]["@_w:right"] || 1440),
    bottom: parseInt(styleTemplate.sectPr["w:pgMar"]["@_w:bottom"] || 1440),
    left: parseInt(styleTemplate.sectPr["w:pgMar"]["@_w:left"] || 1440)
  } : { top:1440, right:1440, bottom:1440, left:1440 };

  const docXml = buildDocXml(blocks, margins);
  const zip = new JSZip();
  zip.file("[Content_Types].xml", typesXml());
  zip.folder("_rels").file(".rels", relsXml());
  const w = zip.folder("word");
  w.file("document.xml", docXml);
  w.file("styles.xml", styleTemplate.stylesXml || buildStyles());
  w.file("numbering.xml", styleTemplate.numberingXml || buildNumbering());
  w.folder("_rels").file("document.xml.rels", docRelsXml());
  return await zip.generateAsync({ type: "nodebuffer" });
};

// helper xml snippets
function typesXml() { return `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"> ... </Types>`; }
function relsXml() { return `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"> ... </Relationships>`; }
function docRelsXml() { return `<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`; }
function buildStyles() { return `<?xml version="1.0" encoding="UTF-8"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"> ... </w:styles>`;}
function buildNumbering() { return `<?xml version="1.0" encoding="UTF-8"?>\n<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"> ... </w:numbering>`;}
