// controllers/createAIDraft.js
// Updated for formatting-aware DOCX generation (+ safe defaults)

const TrainingDocument = require("../models/TrainingDocument");
const { generateSmartDraft } = require("../ai/draftGeneratorFormatAware");
const { convertHtmlToDocxUsingStyles } = require("../utils/htmlToDocxFromStyles");
const { uploadDocxToS3 } = require("../utils/uploadToS3");
const { getSignedDownloadUrl } = require("../utils/getSignedUrl");

exports.createAIDraft = async (req, res) => {
  try {
    const { prompt, docId } = req.body;

    // 1. AI generates HTML content
    const draft = await generateSmartDraft(prompt, req.user, docId || null);
    const html = draft.output;

    // --------------------------------------------------------
    // 2. DEFAULT formatting template (SAFE, ALWAYS VALID)
    // --------------------------------------------------------
    let formatTemplate = {
      sectPr: {
        "w:pgMar": {
          "@_w:top": "1440",
          "@_w:right": "1440",
          "@_w:bottom": "1440",
          "@_w:left": "1440"
        }
      }
    };

    // If docId exists, try loading its formatting template
    if (docId) {
      const doc = await TrainingDocument.findById(docId).lean();
      if (doc && doc.formatTemplate) {
        formatTemplate = doc.formatTemplate;
      }
    }
    // --------------------------------------------------------

    // 3. Convert HTML → DOCX
    const docxBuffer = await convertHtmlToDocxUsingStyles(html, formatTemplate);

    // 4. Upload to S3
    const fileName = `draft-${Date.now()}.docx`;
    const s3Key = await uploadDocxToS3(docxBuffer, fileName);

    // 5. Presigned download URL
    const downloadUrl = await getSignedDownloadUrl(s3Key);

    return res.json({
      success: true,
      draft,
      s3Key,
      downloadUrl,
    });

  } catch (err) {
    console.error("[createAIDraft] Error:", err);
    return res.status(500).json({
      success: false,
      message: "AI Draft generation failed",
    });
  }
};
