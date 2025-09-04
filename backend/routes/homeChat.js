const express = require("express");
const router = express.Router();
const { runHomeChat } = require("../utils/gemini");

router.post("/", async (req, res) => {
  const { text } = req.body;
  try {
    const response = await runHomeChat(text);
    res.json({ result: response });
  } catch (err) {
    res.status(500).json({ error: "Failed to run home chat" });
  }
});

module.exports = router;
