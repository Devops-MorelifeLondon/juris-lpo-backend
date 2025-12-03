// ai/draftGeneratorFormatAware.js
const OpenAI = require("openai");
const AIVector = require("../models/AIVector");
const AIDraft = require("../models/AIDraft");
const mongoose = require("mongoose");

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

exports.generateSmartDraft = async (prompt, user, docId = null) => {
  // 1) embed
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
          ...(docId ? {
            filter: {
              equals: { path: "docId", value: new mongoose.Types.ObjectId(docId) }
            }
          } : {})
        }
      }
    }
  ];

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
- MUST follow formatting patterns from styleSummary.
- MUST add spacing attributes: data-before, data-after, data-line.
- MUST add indent attributes: data-indent-left, data-hanging.
- MUST add list attributes: data-numid, data-ilvl.
- MUST wrap every text in valid HTML tags.
- NO empty responses.
`;

  const userPrompt = `
Instruction:
${prompt}

styleSummary (use these rules):
${JSON.stringify(styleSummary, null, 2)}

Reference HTML:
${sourcesHtml}
`;

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

  html = html.replace(/^```html|```$/g, "").trim();
  html = html.replace(/```/g, "").trim();

  if (!html.includes("<") || !html.includes("</")) {
    html = `<p>${html.replace(/\n+/g, "</p><p>")}</p>`;
  }
  html = html.replace(/<\/p>\s*<p>/g, "</p><p>");
  if (!html.startsWith("<")) html = `<p>${html}</p>`;

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
