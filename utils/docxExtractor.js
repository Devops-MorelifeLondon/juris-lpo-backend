// utils/docxExtractor.js
const JSZip = require("jszip");
const { XMLParser } = require("fast-xml-parser");
const he = require("he");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: true,
  textNodeName: "#text",
  tagValueProcessor: (val) => he.decode(val)
});

exports.extractDOCXWithFormatting = async (buffer) => {
  try {
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

    const getSectPrFromXml = (xml) => {
      const matches = [...xml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)];
      if (matches.length) {
        try { return parser.parse(matches[matches.length - 1][0]); } catch (e) { return null; }
      }
      return null;
    };

    const sectRoot = getSectPrFromXml(documentXml) || {};
    const sectPr = sectRoot["w:sectPr"] || null;

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
  } catch (err) {
    console.error("[extractDOCXWithFormatting] failed:", err && err.stack ? err.stack : err);
    throw err;
  }
};

/* helpers: same as original — keep them unchanged (paragraphNodeToHtmlAndMeta, applyInlineFormattingFromRuns, etc.) */

// copy all helper functions from your original docxExtractor (paragraphNodeToHtmlAndMeta, applyInlineFormattingFromRuns, tableNodeToHtmlAndMeta, stripTags, escapeHtml, stripInnerTags, extractOrderedNodesFromXml)
// (For brevity in this message I assume you keep the helpers as earlier provided — they are safe and pure JS.)
