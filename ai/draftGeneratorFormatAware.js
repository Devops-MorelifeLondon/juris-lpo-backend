// ai/draftGeneratorFormatAware.js
const OpenAI = require("openai");
const AIVector = require("../models/AIVector");
const AIDraft = require("../models/AIDraft");
const mongoose = require("mongoose");
const he = require("he");

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// Allowed tags (lowercase). Self-closing tags listed in SELF_CLOSING.
const ALLOWED = new Set(["h1","h2","h3","p","ol","ul","li","table","tr","td","th","tbody","thead","strong","b","em","i","u","br","a"]);
const SELF_CLOSING = new Set(["br"]);

function safeTextNode(s) {
  if (!s) return "";
  // decode then re-encode to normalise entities
  try { s = he.decode(String(s)); } catch(e) { s = String(s); }
  // remove invalid XML control chars except \n \t \r
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
  // escape < and >
  s = s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // ensure ampersands become &amp; (but keep known entities)
  s = s.replace(/&(?!amp;|lt;|gt;|quot;|apos;|nbsp;|#\d+;|#x[0-9A-Fa-f]+;)/g, "&amp;");
  return s;
}

// Remove disallowed attributes and allow only href on <a>
function sanitizeAttributes(tag, rawAttrs) {
  if (!rawAttrs) return "";
  if (tag === "a") {
    const m = /href\s*=\s*(?:'([^']*)'|"([^"]*)"|([^>\s]+))/i.exec(rawAttrs);
    let href = m ? (m[1] || m[2] || m[3] || "") : "";
    href = (href || "").trim();
    if (!/^(https?:|mailto:)/i.test(href)) href = "";
    if (href) return ` href="${he.encode(href)}"`;
  }
  return "";
}

// Balance tags: return cleaned HTML that only has allowed tags and ensures balanced open/close.
function sanitizeAndBalance(htmlIn) {
  if (!htmlIn || typeof htmlIn !== "string") return "<div></div>";

  // 1) remove code fences and script/style entirely
  let s = htmlIn.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");

  // 2) tokenise tags vs text
  const TAG = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
  let out = [];
  let stack = [];
  let lastIndex = 0;
  let m;
  while ((m = TAG.exec(s)) !== null) {
    const idx = m.index;
    if (idx > lastIndex) {
      const txt = s.slice(lastIndex, idx);
      out.push(safeTextNode(txt));
    }
    const raw = m[0];
    const tag = (m[1] || "").toLowerCase();
    const attrs = m[2] || "";
    const isClose = raw.startsWith("</");
    if (!ALLOWED.has(tag)) {
      // drop tag but keep inner text (we already output text segments between tags)
      // replace with nothing
    } else if (SELF_CLOSING.has(tag)) {
      out.push(`<${tag}/>`);
    } else {
      if (!isClose) {
        const safeAttrs = sanitizeAttributes(tag, attrs);
        out.push(`<${tag}${safeAttrs}>`);
        stack.push(tag);
      } else {
        // close tag: pop until matching found
        if (stack.length === 0) {
          // stray close, drop it
        } else {
          // find last same tag
          let found = false;
          for (let i = stack.length - 1; i >= 0; i--) {
            if (stack[i] === tag) {
              // close all tags from top until this
              for (let j = stack.length - 1; j >= i; j--) {
                const t = stack.pop();
                out.push(`</${t}>`);
              }
              found = true;
              break;
            }
          }
          if (!found) {
            // stray close without match: ignore
          }
        }
      }
    }
    lastIndex = TAG.lastIndex;
  }
  if (lastIndex < s.length) {
    out.push(safeTextNode(s.slice(lastIndex)));
  }
  // close remaining open tags
  while (stack.length) {
    const t = stack.pop();
    out.push(`</${t}>`);
  }
  const joined = out.join("");
  // Ensure there's a wrapper div for converter
  return `<div>${joined}</div>`;
}

async function conversionSanityCheck(html) {
  try {
    const conv = require("../utils/htmlToDocxFromStyles");
    const buf = await conv.convertHtmlToDocxUsingStyles(html, {});
    if (Buffer.isBuffer(buf) && buf.length > 100) return true;
  } catch (e) {
    // fail silent
  }
  return false;
}

exports.generateSmartDraft = async (prompt, user, docId = null) => {
  // 1. embed query (unchanged)
  const q = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: prompt
  });
  const queryVector = q.data[0].embedding;
  const query = [{
    $search: {
      knnBeta: {
        vector: queryVector,
        path: "embedding",
        k: 12,
        ...(docId ? {
          filter: { equals: { path: "docId", value: new mongoose.Types.ObjectId(docId) } }
        } : {})
      }
    }
  }];
  const results = await AIVector.aggregate(query);
  const top = results.slice(0, 8);
  const styleSummary = top.map((r, i) => ({
    idx: i + 1,
    pStyle: r.metadata?.mergedStyles?.pStyle,
    spacing: r.metadata?.mergedStyles?.spacing,
    indent: r.metadata?.mergedStyles?.indent,
    numbering: r.metadata?.mergedStyles?.numbering,
    sectPr: r.metadata?.sectPr
  }));
  const sourcesHtml = top.map(r => r.html).join("\n\n");

  const system = `
You are a senior legal drafting engine.
YOU MUST OUTPUT VALID HTML ONLY.

Hard rules:
- NEVER output plain text.
- NEVER add explanation, comments, or markdown.
- MUST USE: <h1>, <h2>, <h3>, <p>, <ol>, <ul>, <table>.
- Wrap text in these tags only. Do not include other tags.
- Use simple href only for <a>.
  `;

  const userPrompt = `
Instruction:
${prompt}

styleSummary:
${JSON.stringify(styleSummary, null, 2)}

Reference HTML:
${sourcesHtml}
  `;

  // Call model
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt }
    ],
    max_tokens: 3500,
    temperature: 0.2
  });

  let htmlOut = (resp.choices && resp.choices[0] && resp.choices[0].message && resp.choices[0].message.content) || "";
  htmlOut = htmlOut.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "");

  if (!htmlOut || (!htmlOut.includes("<") && !htmlOut.includes(">"))) {
    htmlOut = `<p>${safeTextNode(htmlOut).replace(/\n+/g,"</p><p>")}</p>`;
  }

  // sanitize & balance
  const cleaned = sanitizeAndBalance(htmlOut);

  // sanity convert; fallback to plain paragraphs if fails
  let ok = await conversionSanityCheck(cleaned);
  let finalHtml = cleaned;
  if (!ok) {
    const plain = (cleaned.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || " ");
    finalHtml = `<div>${plain.split(/\n+/).map(t => `<p>${safeTextNode(t)}</p>`).join("")}</div>`;
    // try again
    ok = await conversionSanityCheck(finalHtml);
  }

  // save draft
  const draft = await AIDraft.create({
    documentId: docId,
    createdBy: user._id,
    createdByModel: "Attorney",
    prompt,
    output: finalHtml,
    sources: results
  });

  return draft;
};
