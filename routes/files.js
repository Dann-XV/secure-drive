const express = require("express");
const router = express.Router();
require("dotenv").config();
const multer = require("multer");
const minioClient = require("../minioClient");
const { File } = require("../models/file");
const { v4: uuidv4 } = require("uuid");

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
const MAX_FILE_SIZE =
  Number(process.env.MAX_UPLOAD_BYTES) || DEFAULT_MAX_FILE_SIZE;
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


router.post("/upload", async (req, res) => {
  // Invoke multer manually so we can handle Multer errors here
  upload.single("file")(req, res, async (err) => {
    if (err) {
      console.error("Upload error:", err && err.message ? err.message : err);
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large" });
      }
      return res
        .status(400)
        .json({ error: err && err.message ? err.message : "Upload error" });
    }

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
      return res.status(500).json({ error: "Upload failed" });
    }
  });
});


router.get("/", async (req, res) => {
  try {
    const files = await File.find({ owner: req.auth.userId }).select(
      "_id originalName size mime createdAt"
    );
    return res.json({ files });
  } catch (error) {
    console.error("List files error:", error);
    return res.status(500).json({ error: "Could not list files" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    if (file.owner.toString() !== req.auth.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    minioClient.getObject(BUCKET, file.key, (err, dataStream) => {
      if (err) {
        console.error("MinIO getObject error:", err);
        return res.status(500).json({ error: "Could not download file" });
      }

      res.setHeader("Content-Type", file.mime || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(file.originalName)}"`
      );
      res.setHeader("Content-Length", file.size);

      dataStream.pipe(res);
      dataStream.on("error", (streamErr) => {
        console.error("Stream error:", streamErr);
        if (!res.headersSent) {
          res.status(500).json({ error: "Download interrupted" });
        } else {
          res.end();
        }
      });
    });
  } catch (error) {
    console.error("Download file error:", error);
    return res.status(500).json({ error: "Could not download file" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    if (file.owner.toString() !== req.auth.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await new Promise((resolve, reject) => {
      minioClient.removeObject(BUCKET, file.key, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });

    await File.deleteOne({ _id: req.params.id });

    return res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    return res.status(500).json({ error: "Could not delete file" });
  }
});

module.exports = router;
