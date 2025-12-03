// utils/htmlToDocxFromStyles.js
const JSZip = require("jszip");


// 🔥 Fix: lazy-load jsdom in CommonJS
async function getJsdom() {
  const { JSDOM } = await import("jsdom");
  return JSDOM;
}

exports.convertHtmlToDocxUsingStyles = async (html, styleTemplate = {}) => {
  if (!html || typeof html !== "string") html = "";

  // Strip code fences
  html = html.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Auto-wrap plain text
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    html = `<p>${html.trim().split(/\r?\n+/).map(s => s.trim()).filter(Boolean).join("</p><p>")}</p>`;
  }

  // 🔥 Fix: load jsdom here
  const JSDOM = await getJsdom();

  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  const body = dom.window.document.body;

  const margins = parseMargins(styleTemplate);

  let bodyXml = "";
  for (const node of body.childNodes) {
    bodyXml += nodeToP(node);
  }

  const docXml = buildDoc(bodyXml, margins);
  const stylesXml = styleTemplate.stylesXml || buildStyles();
  const numberingXml = styleTemplate.numberingXml || buildNumbering();
  const headersXml = styleTemplate.headers || null;
  const footersXml = styleTemplate.footers || null;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", typesXml());
  zip.folder("_rels").file(".rels", relsXml());

  const w = zip.folder("word");
  w.file("document.xml", docXml);
  w.file("styles.xml", stylesXml);
  w.file("numbering.xml", numberingXml);

  if (headersXml && typeof headersXml === "object") {
    for (const [k, v] of Object.entries(headersXml)) {
      w.file(k, v);
    }
  }

  if (footersXml && typeof footersXml === "object") {
    for (const [k, v] of Object.entries(footersXml)) {
      w.file(k, v);
    }
  }

  w.folder("_rels").file("document.xml.rels", docRelsXml());

  return await zip.generateAsync({ type: "nodebuffer" });
};

function parseMargins(t) {
  if (!t || !t.sectPr) {
    return { top: 1440, right: 1440, bottom: 1440, left: 1440 };
  }
  const mRaw = t.sectPr["w:pgMar"] || t.sectPr['pgMar'] || {};
  return {
    top: parseInt(mRaw["@_w:top"] || mRaw["w:top"] || 1440),
    right: parseInt(mRaw["@_w:right"] || mRaw["w:right"] || 1440),
    bottom: parseInt(mRaw["@_w:bottom"] || mRaw["w:bottom"] || 1440),
    left: parseInt(mRaw["@_w:left"] || mRaw["w:left"] || 1440)
  };
}

function nodeToP(n) {
  if (!n) return "";
  const name = n.nodeName.toLowerCase();

  if (["p", "h1", "h2", "h3"].includes(name)) {
    // style mapping
    let style = n.getAttribute && n.getAttribute("class") || "";
    if (!style) {
      if (name === "h1") style = "Heading1";
      if (name === "h2") style = "Heading2";
      if (name === "h3") style = "Heading3";
    }

    const before = n.getAttribute && n.getAttribute("data-before");
    const after = n.getAttribute && n.getAttribute("data-after");
    const line = n.getAttribute && n.getAttribute("data-line");
    const indentLeft = n.getAttribute && n.getAttribute("data-indent-left");
    const hanging = n.getAttribute && n.getAttribute("data-hanging");

    const spacingXml = (before || after || line) ? `<w:spacing ${before ? `w:before="${before}"` : ""} ${after ? `w:after="${after}"` : ""} ${line ? `w:line="${line}" w:lineRule="auto"` : ""} />` : "";
    const indXml = (indentLeft || hanging) ? `<w:ind ${indentLeft ? `w:left="${indentLeft}"` : ""} ${hanging ? `w:hanging="${hanging}"` : ""} />` : "";

    const pStyle = style ? `<w:pStyle w:val="${style}"/>` : "";
    const runs = inline(n);

    const pPr = `<w:pPr>${pStyle}${spacingXml}${indXml}</w:pPr>`;
    return `<w:p>${pPr}${runs}</w:p>`;
  }

  if (name === "table") {
    const rows = [...n.querySelectorAll("tr")].map(r => {
      const cells = [...r.querySelectorAll("td, th")].map(td => {
        return `<w:tc><w:p><w:r><w:t xml:space="preserve">${escape(td.textContent)}</w:t></w:r></w:p></w:tc>`;
      }).join("");
      return `<w:tr>${cells}</w:tr>`;
    }).join("");
    return `<w:tbl><w:tblPr/><w:tblGrid/>${rows}</w:tbl>`;
  }

  if (name === "ol" || name === "ul") {
    // If the model created explicit <li data-numid...> we convert to numbered paragraphs accordingly
    const lis = [...n.querySelectorAll("li")].map(li => {
      const numId = li.getAttribute("data-numid") || (name === "ol" ? "1" : "2");
      const ilvl = li.getAttribute("data-ilvl") || "0";
      const runs = inline(li);
      return `<w:p><w:pPr><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>${runs}</w:p>`;
    }).join("");
    return lis;
  }

  if (n.childNodes && n.childNodes.length) {
    return [...n.childNodes].map(nodeToP).join("");
  }

  return "";
}

function inline(n) {
  const out = [];
  for (const c of n.childNodes) {
    if (c.nodeType === 3) {
      const txt = escape(c.textContent || "");
      out.push(`<w:r><w:t xml:space="preserve">${txt}</w:t></w:r>`);
    } else {
      const tag = (c.nodeName || "").toLowerCase();
      if (tag === "strong" || tag === "b") {
        out.push(`<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escape(c.textContent || "")}</w:t></w:r>`);
      } else if (tag === "em" || tag === "i") {
        out.push(`<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${escape(c.textContent || "")}</w:t></w:r>`);
      } else if (tag === "u") {
        out.push(`<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${escape(c.textContent || "")}</w:t></w:r>`);
      } else if (tag === "br") {
        out.push(`<w:r><w:br/></w:r>`);
      } else if (tag === "a") {
        out.push(`<w:r><w:t xml:space="preserve">${escape(c.textContent || "")}</w:t></w:r>`);
      } else {
        out.push(inline(c));
      }
    }
  }
  return out.join("");
}

function buildDoc(inner, m) {
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

function buildStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/></w:style>
</w:styles>`;
}

function buildNumbering() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1." /></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>

  <w:abstractNum w:abstractNumId="2">
    <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="" /></w:lvl>
  </w:abstractNum>
  <w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>
</w:numbering>`;
}

function typesXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;
}

function relsXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function docRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
}

function escape(s) {
  return (s || "").replace(/[<>&'"]/g, ch => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&#39;", '"':"&quot;" }[ch]));
}
