const express = require("express");
const router = express.Router();
require("dotenv").config();
const multer = require("multer");
const minioClient = require("../minioClient");
const { File } = require("../models/file");
const { v4: uuidv4 } = require("uuid");

// Multer memory storage with size limit
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_BYTES);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

// MinIO bucket name
const BUCKET = "uploads";

// Ensure bucket exists
async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET);
      console.log("Bucket created");
    }
  } catch (err) {
    console.warn("Could not ensure bucket exists:", err.message || err);
  }
}

ensureBucket();

// POST /files/upload
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // auth: express-jwt populates req.auth with token payload
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const file = req.file;
    const key = `${Date.now()}_${uuidv4()}_${file.originalname}`;

    // Upload to MinIO
    await minioClient.putObject(BUCKET, key, file.buffer, file.size);

    // Save metadata
    const fileDoc = new File({
      owner: req.auth.userId,
      originalName: file.originalname,
      key,
      size: file.size,
      mime: file.mimetype,
    });

    await fileDoc.save();

    return res.status(201).json({
      message: "Upload successful",
      fileId: fileDoc._id,
      metadata: fileDoc,
    });
  } catch (error) {
    console.error(error);
    // multer file size error handling
    if (error && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large" });
    }
    return res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
