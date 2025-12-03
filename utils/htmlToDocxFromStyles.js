// utils/htmlToDocxFromStyles.js
const JSZip = require("jszip");
const { XMLBuilder, XMLParser } = require("fast-xml-parser");
const he = require("he");

// Build a minimal but valid document.xml using WordprocessingML namespace.
// All text uses <w:t xml:space="preserve">...escaped...</w:t>

function escapeForWText(s = "") {
  if (!s) return "";
  // normalize, remove control chars
  s = String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
  s = he.decode(s);
  // For content inside w:t we should not contain raw '<' or '>'
  s = s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Ensure ampersands are escaped
  s = s.replace(/&(?!amp;|lt;|gt;|quot;|apos;|nbsp;|#\d+;|#x[0-9A-Fa-f]+;)/g, "&amp;");
  return s;
}

// Basic allowed tags for conversion
const ALLOWED_BLOCKS = new Set(["h1","h2","h3","p","ol","ul","li","table","tr","td","th","tbody","thead","br"]);

function parseBlocksFromHtml(html) {
  if (!html || typeof html !== "string") return [];
  // Very defensive parsing: find headings, paragraphs, lists, tables using regex.
  const blocks = [];
  // headings
  html = html.replace(/\r\n/g, "\n");
  // Extract tables first
  html = html.replace(/<table[\s\S]*?<\/table>/gi, match => {
    // parse rows and cells
    const rows = [];
    (match.match(/<tr[\s\S]*?<\/tr>/gi) || []).forEach(r => {
      const cells = (r.match(/<(td|th)[\s\S]*?<\/\1>/gi) || []).map(c => c.replace(/<[^>]+>/g,"").trim());
      rows.push(cells);
    });
    blocks.push({ type: "table", rows });
    return "";
  });

  // lists
  html = html.replace(/<(ol|ul)[^>]*>([\s\S]*?)<\/\1>/gi, (m, kind, inner) => {
    const items = (inner.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || []).map(li => li.replace(/<[^>]+>/g,"").trim());
    blocks.push({ type: "list", kind: kind.toLowerCase(), items });
    return "";
  });

  // headings and paragraphs
  // h1-h3
  html = html.replace(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi, (m, lvl, inner) => {
    blocks.push({ type: "h", level: Number(lvl), text: inner.replace(/<[^>]+>/g,"").trim() });
    return "";
  });

  // br -> convert to paragraph breaks if present
  html = html.replace(/<br\s*\/?>/gi, "\n");

  // remaining paragraphs
  (html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []).forEach(p => {
    const inner = p.replace(/<p[^>]*>|<\/p>/gi, "").replace(/<[^>]+>/g,"").trim();
    if (inner.length) blocks.push({ type: "p", text: inner });
  });

  // If nothing found, fallback to splitting by double newline of raw text
  if (blocks.length === 0) {
    const plain = html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
    plain.split(/\n{2,}/).forEach(t => {
      if (t && t.trim()) blocks.push({ type: "p", text: t.trim() });
    });
  }
  return blocks;
}

function buildDocumentXmlFromBlocks(blocks, margins = { top:1440,right:1440,bottom:1440,left:1440 }) {
  // Build XML string for document.xml, ensuring proper Word namespaces and xml header
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  parts.push('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">');
  parts.push('<w:body>');
  for (const b of blocks) {
    if (!b) continue;
    if (b.type === "h") {
      const lvl = Math.min(3, Math.max(1, b.level || 1));
      const txt = escapeForWText(b.text || "");
      parts.push(`<w:p><w:pPr><w:pStyle w:val="Heading${lvl}"/></w:pPr><w:r><w:t xml:space="preserve">${txt}</w:t></w:r></w:p>`);
    } else if (b.type === "p") {
      const txt = escapeForWText(b.text || "");
      parts.push(`<w:p><w:r><w:t xml:space="preserve">${txt}</w:t></w:r></w:p>`);
    } else if (b.type === "list") {
      // convert each li to a paragraph with numPr placeholder (numId 1 for ol, 2 for ul)
      const numId = b.kind === "ol" ? 1 : 2;
      for (const it of (b.items || [])) {
        const txt = escapeForWText(it || "");
        parts.push(`<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">${txt}</w:t></w:r></w:p>`);
      }
    } else if (b.type === "table") {
      parts.push('<w:tbl><w:tblPr/><w:tblGrid/>');
      for (const row of (b.rows || [])) {
        parts.push('<w:tr>');
        for (const cellText of row) {
          const txt = escapeForWText(cellText || "");
          parts.push(`<w:tc><w:p><w:r><w:t xml:space="preserve">${txt}</w:t></w:r></w:p></w:tc>`);
        }
        parts.push('</w:tr>');
      }
      parts.push('</w:tbl>');
    }
  }
  // section props
  parts.push(`<w:sectPr><w:pgMar w:top="${margins.top}" w:right="${margins.right}" w:bottom="${margins.bottom}" w:left="${margins.left}"/></w:sectPr>`);
  parts.push('</w:body></w:document>');
  return parts.join("");
}

// Small validator using fast-xml-parser
function validateXmlString(xmlStr) {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, allowBooleanAttributes: true });
    parser.parse(xmlStr);
    return true;
  } catch (e) {
    return false;
  }
}

async function buildDocxZipFromDocumentXml(documentXml) {
  const zip = new JSZip();
  // full content-types and rels minimal set
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/></w:style>
</w:styles>`;
  const numbering = `<?xml version="1.0" encoding="UTF-8"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
  <w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum>
  <w:num w:numId="2"><w:abstractNum w:val="2"/></w:num>
</w:numbering>`;

  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels").file(".rels", rels);
  const w = zip.folder("word");
  w.file("document.xml", documentXml);
  w.file("styles.xml", styles);
  w.file("numbering.xml", numbering);
  w.folder("_rels").file("document.xml.rels", docRels);
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return buf;
}

// Guaranteed plain text fallback docx: put all text lines into paragraphs
async function buildPlainDocxFromText(text) {
  const lines = (text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const blocks = lines.map(l => ({ type: "p", text: l }));
  const docXml = buildDocumentXmlFromBlocks(blocks);
  return await buildDocxZipFromDocumentXml(docXml);
}

exports.convertHtmlToDocxUsingStyles = async (html, styleTemplate = {}) => {
  try {
    // Normalize input
    if (!html || typeof html !== "string") html = "";
    html = html.replace(/^```(?:html)?\s*/i,"").replace(/\s*```$/i,"").trim();
    if (!/<[a-z][\s\S]*>/i.test(html)) {
      html = `<p>${html.split(/\r?\n+/).map(s=>s.trim()).filter(Boolean).join("</p><p>")}</p>`;
    }
    // Parse blocks
    const blocks = parseBlocksFromHtml(html);
    // Try to use sectPr margins from styleTemplate if present
    const margins = (styleTemplate && styleTemplate.sectPr && styleTemplate.sectPr["w:pgMar"]) ? {
      top: parseInt(styleTemplate.sectPr["w:pgMar"]["@_w:top"]||1440),
      right: parseInt(styleTemplate.sectPr["w:pgMar"]["@_w:right"]||1440),
      bottom: parseInt(styleTemplate.sectPr["w:pgMar"]["@_w:bottom"]||1440),
      left: parseInt(styleTemplate.sectPr["w:pgMar"]["@_w:left"]||1440)
    } : { top:1440,right:1440,bottom:1440,left:1440 };

    const docXml = buildDocumentXmlFromBlocks(blocks, margins);

    // Validate XML before packaging
    if (!validateXmlString(docXml)) {
      // fallback: build plain docx from text-only content
      const text = blocks.map(b => (b.text || (b.rows ? b.rows.map(r=>r.join(" ")).join(" ") : "") )).join("\n\n");
      return await buildPlainDocxFromText(text);
    }

    // Package into docx
    const buf = await buildDocxZipFromDocumentXml(docXml);
    // sanity-check generated buffer minimal size
    if (!Buffer.isBuffer(buf) || buf.length < 200) {
      // fallback to plain docx
      const text = blocks.map(b => (b.text || (b.rows ? b.rows.map(r=>r.join(" ")).join(" ") : "") )).join("\n\n");
      return await buildPlainDocxFromText(text);
    }
    return buf;
  } catch (err) {
    // on any error, return guaranteed plain text docx
    try {
      const plain = (String(html||"")).replace(/<[^>]+>/g," ").replace(/\s{2,}/g," ").trim();
      return await buildPlainDocxFromText(plain);
    } catch (e) {
      throw new Error("Failed to convert HTML to DOCX: " + (err && err.message ? err.message : String(err)));
    }
  }
};
