const express = require("express");
const router = express.Router();

const { createAIDraft } = require("../controllers/trainingAIController");



// AI Draft (Global + Document Specific)
router.post("/draft", createAIDraft);

module.exports = router;
