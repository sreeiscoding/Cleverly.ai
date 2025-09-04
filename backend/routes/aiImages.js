const express = require("express");
const router = express.Router();
const { runGenerateImage } = require("../utils/gemini");

router.post("/", async (req, res) => {
  const { prompt, type, style } = req.body;
  try {
    const url = await runGenerateImage(prompt, type, style);
    res.json({ image: url });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate image" });
  }
});

module.exports = router;
