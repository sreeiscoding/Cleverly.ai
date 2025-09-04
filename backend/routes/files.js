const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Setup multer for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// Upload endpoint
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({
    message: "File uploaded successfully",
    file: req.file.filename,
    path: `/uploads/${req.file.filename}`,
  });
});

module.exports = router;
