const { ingestDocumentAI } = require("../ai/ingestWorker");

exports.startAIIngest = async (docId) => {
  // simple async worker
  setTimeout(() => {
    ingestDocumentAI(docId);
  }, 2000);
};
