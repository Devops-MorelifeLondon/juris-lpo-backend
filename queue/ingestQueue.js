// queue/ingestWorker.js
// NOTE: Option A uses direct ingestion inside saveMetadata controller.
// Keep this file as a thin wrapper so other parts of the app can call ingestDocumentAI easily.

const { ingestDocumentAI } = require("../controllers/ingestDocumentAI");

exports.startAIIngest = async (docId) => {
  // for Option A we call ingestDocumentAI directly (synchronous from calling context)
  // keep wrapper for backwards compatibility
  return ingestDocumentAI(docId);
};
