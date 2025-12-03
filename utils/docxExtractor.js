// utils/docxExtractor.js
const JSZip = require("jszip");
const { XMLParser } = require("fast-xml-parser");
const he = require("he"); // decode entities
const { JSDOM } = await import("jsdom");


const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: true,
  textNodeName: "#text",
  // preserve order would be more robust but we will extract by regex preserving order
  tagValueProcessor: (val) => he.decode(val)
});

/**
 * High-fidelity DOCX extractor:
 * - Returns array: [{ page:1, paragraphs: [{ index, html, text, metadata }], sectPr, stylesXml, numberingXml, headers, footers }]
 */
exports.extractDOCXWithFormatting = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);

  const readText = async (path) => {
    const f = zip.file(path);
    if (!f) return null;
    return await f.async("text");
  };

  const documentXml = await readText("word/document.xml");
  const stylesXml = await readText("word/styles.xml");
  const numberingXml = await readText("word/numbering.xml");
  const settingsXml = await readText("word/settings.xml");

  const headerFiles = Object.keys(zip.files).filter(k => /^word\/header\d*\.xml$/.test(k));
  const footerFiles = Object.keys(zip.files).filter(k => /^word\/footer\d*\.xml$/.test(k));
  const headers = {};
  const footers = {};
  for (const h of headerFiles) headers[h.replace(/^word\//, "")] = await readText(h);
  for (const f of footerFiles) footers[f.replace(/^word\//, "")] = await readText(f);

  if (!documentXml) throw new Error("document.xml not found in docx");

  // get sectPr - prefer last occurrence (end of body)
  const getSectPrFromXml = (xml) => {
    const matches = [...xml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)];
    if (matches.length) {
      try {
        return parser.parse(matches[matches.length - 1][0]);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

const sectRoot = getSectPrFromXml(documentXml) || {};
const sectPr = sectRoot["w:sectPr"] || null;


  // Extract nodes in order: <w:p> and <w:tbl>
  const nodes = extractOrderedNodesFromXml(documentXml);

  const paragraphs = [];
  let paraIndex = 0;
  for (const node of nodes) {
    if (node.type === "p") {
      const { html, text, metadata } = paragraphNodeToHtmlAndMeta(node.xml, stylesXml, numberingXml);
      paragraphs.push({ index: ++paraIndex, html, text, metadata });
    } else if (node.type === "tbl") {
      const { html, metadata } = tableNodeToHtmlAndMeta(node.xml);
      paragraphs.push({ index: ++paraIndex, html, text: stripTags(html), metadata });
    }
  }

  // Single returned page (page splitting requires layout engine)
  return [{
    page: 1,
    paragraphs,
    sectPr: sectPr || null,
    stylesXml,
    numberingXml,
    headers,
    footers,
    settingsXml
  }];
};

/* ------------------ helpers ------------------ */

function extractOrderedNodesFromXml(documentXml) {
  const nodes = [];
  const re = /(<w:(p|tbl)[\s\S]*?<\/w:\2>)/g;
  let m;
  while ((m = re.exec(documentXml)) !== null) {
    nodes.push({
      type: m[2] === "p" ? "p" : "tbl",
      xml: m[1]
    });
  }
  return nodes;
}

function paragraphNodeToHtmlAndMeta(pXml, stylesXml, numberingXml) {
  // Extract text runs with inline styles from <w:r> runs
  // pStyle
  const pStyleMatch = pXml.match(/<w:pStyle[^>]*w:val="([^"]+)"/);
  const pStyle = pStyleMatch ? pStyleMatch[1] : null;

  // spacing
  const spacing = {};
  const spacingMatch = pXml.match(/<w:spacing\b([^>]*)\/?>/);
  if (spacingMatch) {
    const str = spacingMatch[1];
    const before = str.match(/w:before="([^"]+)"/);
    const after = str.match(/w:after="([^"]+)"/);
    const line = str.match(/w:line="([^"]+)"/);
    if (before) spacing.before = parseInt(before[1], 10);
    if (after) spacing.after = parseInt(after[1], 10);
    if (line) spacing.line = parseInt(line[1], 10);
  }

  // indent
  const indMatch = pXml.match(/<w:ind\b([^>]*)\/?>/);
  const indent = {};
  if (indMatch) {
    const s = indMatch[1];
    const left = s.match(/w:left="([^"]+)"/);
    const hanging = s.match(/w:hanging="([^"]+)"/);
    const first = s.match(/w:firstLine="([^"]+)"/);
    if (left) indent.left = parseInt(left[1], 10);
    if (hanging) indent.hanging = parseInt(hanging[1], 10);
    if (first) indent.firstLine = parseInt(first[1], 10);
  }

  // numbering
  const numIdMatch = pXml.match(/<w:numId[^>]*w:val="([^"]+)"[^>]*\/?>/);
  const ilvlMatch = pXml.match(/<w:ilvl[^>]*w:val="([^"]+)"[^>]*\/?>/);
  const numbering = (numIdMatch || ilvlMatch) ? {
    numId: numIdMatch ? parseInt(numIdMatch[1], 10) : null,
    ilvl: ilvlMatch ? parseInt(ilvlMatch[1], 10) : 0
  } : null;

  // Build HTML from runs
  const sanitizedHtml = applyInlineFormattingFromRuns(pXml, pStyle);

  // For headings: map pStyle -> h1/h2/h3 if style id indicates heading
  let html = sanitizedHtml;
  if (pStyle && /^Heading[1-6]$/i.test(pStyle)) {
    const levelMatch = pStyle.match(/Heading(\d)/i);
    const level = levelMatch ? parseInt(levelMatch[1], 10) : 1;
    // unwrap outer <p> from sanitizedHtml
    const inner = sanitizedHtml.replace(/^<p>([\s\S]*)<\/p>$/i, "$1");
    html = `<h${level} data-before="${spacing.before || ""}" data-after="${spacing.after || ""}" data-line="${spacing.line || ""}" data-indent-left="${indent.left || ""}" data-hanging="${indent.hanging || ""}">${inner}</h${level}>`;
  } else if (numbering) {
    // lists will be assembled later into <ol>/<ul> by chunker; but produce li HTML for now
    // produce <li> content
    const inner = sanitizedHtml.replace(/^<p>([\s\S]*)<\/p>$/i, "$1");
    html = `<li data-numid="${numbering.numId || ""}" data-ilvl="${numbering.ilvl || 0}" data-before="${spacing.before || ""}" data-after="${spacing.after || ""}" data-line="${spacing.line || ""}" data-indent-left="${indent.left || ""}" data-hanging="${indent.hanging || ""}">${inner}</li>`;
  } else {
    // normal paragraph
    html = `<p data-before="${spacing.before || ""}" data-after="${spacing.after || ""}" data-line="${spacing.line || ""}" data-indent-left="${indent.left || ""}" data-hanging="${indent.hanging || ""}" data-pstyle="${pStyle || ""}">${sanitizedHtml.replace(/^<p>|<\/p>$/g,"")}</p>`;
  }

  // collect plain text
  const text = stripTags(sanitizedHtml);

  const metadata = {
    pStyle,
    spacing,
    indent,
    numbering
  };

  return { html, text, metadata };
}

function applyInlineFormattingFromRuns(pXml, pStyleHint) {
  // parse <w:r> blocks in order, handle <w:t>, <w:b>, <w:i>, <w:u>, hyperlinks, breaks
  const runRe = /<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
  const runs = [];
  let m;
  while ((m = runRe.exec(pXml)) !== null) {
    let runXml = m[1];
    // text
    const tMatch = runXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
    let text = tMatch ? he.decode(stripInnerTags(tMatch[1])) : "";

    // detect styles
    const isBold = /<w:b\b[^>]*\/?>/.test(runXml);
    const isItalic = /<w:i\b[^>]*\/?>/.test(runXml);
    const isUnderline = /<w:u\b[^>]*\/?>/.test(runXml);
    const hasBreak = /<w:br\b[^>]*\/?>/.test(runXml);

    // hyperlinks: runs may be inside <w:hyperlink r:id="rIdX"> ... </w:hyperlink>
    // We'll not attach relationship here but keep link text
    const part = { text, isBold, isItalic, isUnderline, hasBreak };
    runs.push(part);
  }

  // join runs into HTML string
  const pieces = runs.map(r => {
    let out = escapeHtml(r.text);
    if (r.isBold) out = `<strong>${out}</strong>`;
    if (r.isItalic) out = `<em>${out}</em>`;
    if (r.isUnderline) out = `<u>${out}</u>`;
    if (r.hasBreak) out += "<br/>";
    return out;
  });

  return `<p>${pieces.join("")}</p>`;
}

function tableNodeToHtmlAndMeta(tblXml) {
  const rowRe = /<w:tr[\s\S]*?<\/w:tr>/g;
  const cellRe = /<w:tc[\s\S]*?<\/w:tc>/g;
  const rows = tblXml.match(rowRe) || [];
  const htmlRows = rows.map(r => {
    const cells = (r.match(cellRe) || []).map(c => {
      const texts = [...c.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(x => he.decode(stripInnerTags(x[1])));
      return `<td>${escapeHtml(texts.join(""))}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  const html = `<table>${htmlRows}</table>`;
  return { html, metadata: { isTable: true } };
}

function stripTags(s) {
  return (s || "").replace(/<[^>]+>/g, "");
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}

function stripInnerTags(s) {
  // remove any XML tags but leave entities undecoded because parser already decoded
  return (s || "").replace(/<[^>]+>/g, "");
}
