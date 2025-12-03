// controllers/ingestDocumentAI.js
const TrainingDocument = require("../models/TrainingDocument");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");

const { extractDOCXWithFormatting } = require("../utils/docxExtractor");
const { extractPDF, extractDOCX } = require("../utils/extractor");
const { createChunks } = require("../utils/chunkerDocxFormatAware");
const { embedAndStore } = require("../utils/vectorFormatAware");

async function safeGetS3Buffer(key) {
  const cmd = new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key });
  const res = await s3.send(cmd);
  if (res.Body && typeof res.Body.transformToByteArray === "function") {
    return Buffer.from(await res.Body.transformToByteArray());
  }
  const streamToBuffer = async (stream) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
  return await streamToBuffer(res.Body);
}

exports.ingestDocumentAI = async (docId) => {
  let doc = null;
  try {
    doc = await TrainingDocument.findById(docId);
    if (!doc) {
      console.warn("[ingestDocumentAI] Document not found:", docId);
      return;
    }

    const file = Array.isArray(doc.files) && doc.files.length ? doc.files[0] : null;
    if (!file) {
      console.warn("[ingestDocumentAI] No file attached to document:", docId);
      await TrainingDocument.findByIdAndUpdate(docId, {
        status: "Failed",
        lastIngestFailedAt: new Date(),
        lastIngestError: "No file attached",
      });
      return;
    }

    await TrainingDocument.findByIdAndUpdate(docId, {
      status: "Processing",
      lastIngestStartedAt: new Date(),
    });

    const buffer = await safeGetS3Buffer(file.filePath);
    let pages = [];

    const fileType = (file.fileType || "").toLowerCase();
    if (fileType === "application/pdf" || fileType === "application/x-pdf" || file.filePath?.toLowerCase().endsWith(".pdf")) {
      pages = await extractPDF(buffer);
    } else if (fileType.includes("word") || file.filePath?.toLowerCase().endsWith(".docx")) {
      // prefer DOCX high-fidelity extractor (we keep it but it is text-focused)
      try {
        pages = await extractDOCXWithFormatting(buffer);
      } catch (e) {
        console.warn("[ingestDocumentAI] docx high-fidelity failed, falling back to simple DOCX:", e);
        pages = await extractDOCX(buffer);
      }
      if (pages && pages[0]) {
        const template = {
          sectPr: pages[0].sectPr || null,
          stylesXml: pages[0].stylesXml || null,
          numberingXml: pages[0].numberingXml || null,
          headers: pages[0].headers || null,
          footers: pages[0].footers || null,
        };
        doc.formatTemplate = template;
        await doc.save();
      }
    } else {
      // fallback: treat as DOCX/HTML-ish via simple docx extractor
      pages = await extractDOCX(buffer);
    }

    if (!Array.isArray(pages) || pages.length === 0) {
      throw new Error("No pages extracted from document");
    }

    const chunks = createChunks(pages);
    if (!Array.isArray(chunks) || chunks.length === 0) throw new Error("No chunks created from pages");

    await embedAndStore(String(docId), chunks);

    await TrainingDocument.findByIdAndUpdate(docId, {
      status: "Trained",
      lastIngestCompletedAt: new Date(),
    });

    console.log(`[ingestDocumentAI] Ingestion completed for docId=${docId} chunks=${chunks.length}`);
    return true;
  } catch (err) {
    console.error("[ingestDocumentAI] Error ingesting docId=", docId, err && err.stack ? err.stack : err);
    try {
      if (doc && doc._id) {
        await TrainingDocument.findByIdAndUpdate(docId, {
          status: "Failed",
          lastIngestFailedAt: new Date(),
          lastIngestError: String(err).slice(0, 2000),
        });
      }
    } catch (uErr) {
      console.error("[ingestDocumentAI] Failed to update doc status on error:", uErr);
    }
    // bubble up so caller knows
    throw err;
  }
};
