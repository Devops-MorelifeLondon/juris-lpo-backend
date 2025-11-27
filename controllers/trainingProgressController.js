const TrainingDocument = require("../models/TrainingDocument");

// ======================================================
// Update File Progress (Per Paralegal)
// ======================================================
exports.updateDocumentProgress = async (req, res) => {
  try {
    const { documentId, fileId } = req.params;
    const { percentageRead } = req.body;
    const paralegalId = req.user._id;

    if (percentageRead < 0 || percentageRead > 100) {
      return res.status(400).json({
        success: false,
        message: "Progress must be between 0 and 100"
      });
    }

    // Check if entry exists
    const existing = await TrainingDocument.findOne({
      _id: documentId,
      "files._id": fileId,
      "files.progress.paralegalId": paralegalId,
    });

    // -----------------------------------------
    // UPDATE EXISTING PROGRESS
    // -----------------------------------------
    if (existing) {
      const updated = await TrainingDocument.findOneAndUpdate(
        {
          _id: documentId,
          "files._id": fileId,
        },
        {
          $set: {
            "files.$[file].progress.$[prog].percentageRead": percentageRead,
            "files.$[file].progress.$[prog].lastUpdated": new Date(),
          },
        },
        {
          arrayFilters: [
            { "file._id": fileId },
            { "prog.paralegalId": paralegalId },
          ],
          new: true,
        }
      );

      return res.json({ success: true, data: updated });
    }

    // -----------------------------------------
    // ADD NEW PROGRESS ENTRY
    // -----------------------------------------
    const updated = await TrainingDocument.findOneAndUpdate(
      {
        _id: documentId,
        "files._id": fileId,
      },
      {
        $push: {
          "files.$.progress": {
            paralegalId,
            percentageRead,
            lastUpdated: new Date(),
          },
        },
      },
      { new: true }
    );

    return res.json({ success: true, data: updated });

  } catch (err) {
    console.error("Update File Progress Error:", err);
    return res.status(500).json({ success: false, message: "Could not update progress" });
  }
};

// ======================================================
// Update Video Progress (Per Paralegal)
// ======================================================
exports.updateVideoProgress = async (req, res) => {
  try {
    const { documentId, videoId } = req.params;
    const { percentageWatched } = req.body;
    const paralegalId = req.user._id;

    if (percentageWatched < 0 || percentageWatched > 100) {
      return res.status(400).json({
        success: false,
        message: "Progress must be between 0 and 100"
      });
    }

    // Check if entry exists
    const existing = await TrainingDocument.findOne({
      _id: documentId,
      "videos._id": videoId,
      "videos.progress.paralegalId": paralegalId,
    });

    // -----------------------------------------
    // UPDATE EXISTING PROGRESS
    // -----------------------------------------
    if (existing) {
      const updated = await TrainingDocument.findOneAndUpdate(
        {
          _id: documentId,
          "videos._id": videoId,
        },
        {
          $set: {
            "videos.$[video].progress.$[prog].percentageWatched": percentageWatched,
            "videos.$[video].progress.$[prog].lastUpdated": new Date(),
          },
        },
        {
          arrayFilters: [
            { "video._id": videoId },
            { "prog.paralegalId": paralegalId },
          ],
          new: true,
        }
      );

      return res.json({ success: true, data: updated });
    }

    // -----------------------------------------
    // ADD NEW PROGRESS ENTRY
    // -----------------------------------------
    const updated = await TrainingDocument.findOneAndUpdate(
      {
        _id: documentId,
        "videos._id": videoId,
      },
      {
        $push: {
          "videos.$.progress": {
            paralegalId,
            percentageWatched,
            lastUpdated: new Date(),
          },
        },
      },
      { new: true }
    );

    return res.json({ success: true, data: updated });

  } catch (err) {
    console.error("Update Video Progress Error:", err);
    return res.status(500).json({ success: false, message: "Could not update video progress" });
  }
};
