const express = require("express");
const router = express.Router();
const { runMCQGenerator } = require("../utils/gemini");

router.post("/", async (req, res) => {
  const { content, count, difficulty } = req.body;
  try {
    const mcqs = await runMCQGenerator(content, count, difficulty);
    res.json({ mcqs });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate MCQs" });
  }
});

module.exports = router;
