// utils/vectorFormatAware.js
const OpenAI = require("openai");
const AIVector = require("../models/AIVector");

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

exports.embedAndStore = async (docId, chunks) => {
  for (const chunk of chunks) {
    const raw = chunk.rawText || "";
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: raw
    });

    await AIVector.create({
      docId,
      html: chunk.html,
      rawText: raw,
      page: chunk.page,
      heading: chunk.metadata?.mergedStyles?.pStyle || null,
      embedding: emb.data[0].embedding,
      metadata: chunk.metadata
    });
  }
  return true;
};
