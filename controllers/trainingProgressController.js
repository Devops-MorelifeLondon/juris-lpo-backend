const TrainingDocument = require("../models/TrainingDocument");

// ======================================================
// Update Document Progress (percentageRead)
// ======================================================
exports.updateDocumentProgress = async (req, res) => {
  try {
    const { documentId, fileId } = req.params;
    const { percentageRead } = req.body;

    if (percentageRead < 0 || percentageRead > 100) {
      return res.status(400).json({ success: false, message: "Progress must be 0-100" });
    }

    const doc = await TrainingDocument.findOneAndUpdate(
      {
        _id: documentId,
        "files._id": fileId
      },
      {
        $set: {
          "files.$.progress.percentageRead": percentageRead,
          "files.$.progress.lastUpdated": new Date()
        }
      },
      { new: true }
    );

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not update progress" });
  }
};

// ======================================================
// Update Video Progress (percentageWatched)
// ======================================================
exports.updateVideoProgress = async (req, res) => {
  try {
    const { documentId, videoId } = req.params;
    const { percentageWatched } = req.body;

    if (percentageWatched < 0 || percentageWatched > 100) {
      return res.status(400).json({ success: false, message: "Progress must be 0-100" });
    }

    const doc = await TrainingDocument.findOneAndUpdate(
      {
        _id: documentId,
        "videos._id": videoId
      },
      {
        $set: {
          "videos.$.progress.percentageWatched": percentageWatched,
          "videos.$.progress.lastUpdated": new Date()
        }
      },
      { new: true }
    );

    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not update video progress" });
  }
};
