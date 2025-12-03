// ai/draftGeneratorFormatAware.js
const OpenAI = require("openai");
const AIVector = require("../models/AIVector");
const AIDraft = require("../models/AIDraft");
const mongoose = require("mongoose");

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

exports.generateSmartDraft = async (prompt, user, docId = null) => {
  // -------------------------
  // 1. Embed Query
  // -------------------------
  const q = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: prompt
  });

  const queryVector = q.data[0].embedding;

const query = [
  {
    $search: {
      knnBeta: {
        vector: queryVector,
        path: "embedding",
        k: 12,
        ...(docId
          ? {
              filter: {
                equals: {
                  path: "docId",
                 value: new mongoose.Types.ObjectId(docId)

                }
              }
            }
          : {}
        )
      }
    }
  }
];


  const results = await AIVector.aggregate(query);
  const top = results.slice(0, 8);

  // -------------------------
  // 2. Extract formatting styles
  // -------------------------
  const styleSummary = top.map((r, i) => ({
    idx: i + 1,
    pStyle: r.metadata?.mergedStyles?.pStyle,
    spacing: r.metadata?.mergedStyles?.spacing,
    indent: r.metadata?.mergedStyles?.indent,
    numbering: r.metadata?.mergedStyles?.numbering,
    sectPr: r.metadata?.sectPr
  }));

  const sourcesHtml = top.map(r => r.html).join("\n\n");

  // -------------------------
  // 3. Strong System Prompt (MANDATE HTML)
  // -------------------------
  const system = `
You are a senior legal drafting engine.
YOU MUST OUTPUT VALID HTML ONLY.

Hard rules:
- NEVER output plain text.
- NEVER add explanation, comments, or markdown.
- MUST USE: <h1>, <h2>, <h3>, <p>, <ol>, <ul>, <table>.
- MUST follow formatting patterns from styleSummary.
- MUST add spacing attributes: data-before, data-after, data-line.
- MUST add indent attributes: data-indent-left, data-hanging.
- MUST add list attributes: data-numid, data-ilvl.
- MUST wrap every text in valid HTML tags.
- NO empty responses.

If user input is plain text, convert it into structured HTML.
  `;

  // -------------------------
  // 4. User Prompt
  // -------------------------
  const userPrompt = `
Instruction:
${prompt}

styleSummary (use these rules):
${JSON.stringify(styleSummary, null, 2)}

Reference HTML:
${sourcesHtml}
`;

  // -------------------------
  // 5. Call OpenAI Chat Model
  // -------------------------
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt }
    ],
    max_tokens: 3500,
    temperature: 0.2
  });

  let html = resp.choices[0].message.content || "";

  // -------------------------
  // 6. Sanitize AI Output
  // -------------------------

  // Remove wrapper text like: "Here is the HTML:"
  html = html.replace(/^```html|```$/g, "").trim();
  html = html.replace(/```/g, "").trim();

  // If AI returned plain text → wrap into HTML
  if (!html.includes("<") || !html.includes("</")) {
    html = `<p>${html.replace(/\n+/g, "</p><p>")}</p>`;
  }

  // Auto-fix accidental <p></p> gaps
  html = html.replace(/<\/p>\s*<p>/g, "</p><p>");

  // Ensure root-level HTML is valid
  if (!html.startsWith("<")) {
    html = `<p>${html}</p>`;
  }

  // -------------------------
  // 7. Save Draft in MongoDB
  // -------------------------
  const saved = await AIDraft.create({
    documentId: docId,
    createdBy: user._id,
    createdByModel: "Attorney",
    prompt,
    output: html,
    sources: results
  });

  return saved;
};
