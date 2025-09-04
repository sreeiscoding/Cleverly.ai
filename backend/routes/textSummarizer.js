const express = require("express");
const router = express.Router();
const { runSummarizer } = require("../utils/gemini");

router.post("/", async (req, res) => {
  const { content, mode } = req.body;
  try {
    const summary = await runSummarizer(content, mode);
    res.json({ result: summary });
  } catch (err) {
    res.status(500).json({ error: "Failed to summarize" });
  }
});

module.exports = router;
