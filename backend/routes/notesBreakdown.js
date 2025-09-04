const express = require("express");
const router = express.Router();
const { runNotesBreakdown } = require("../utils/gemini");

router.post("/", async (req, res) => {
  const { mode, text } = req.body;
  try {
    const response = await runNotesBreakdown(mode, text);
    res.json({ result: response });
  } catch (err) {
    res.status(500).json({ error: "Failed to run notes breakdown" });
  }
});

module.exports = router;
