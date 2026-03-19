const express = require('express');
const router = express.Router();
const fs = require('fs');
require('dotenv').config();
const multer = require('multer');
const minioClient  = require('../minioClient');
 

if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: multer.memoryStorage() });

// Minio setup

// initialize MinIO bucket
const BUCKET = 'uploads';

// Check if bucket exists, if not create it
async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);

  if (!exists) {
    await minioClient.makeBucket(BUCKET);
    console.log("Bucket created");
  } else {
    console.log("Bucket already exists");
  }
}

ensureBucket();

// upload to Minio endpoint
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const fileName = Date.now() + "_" + file.originalname;

    await minioClient.putObject(BUCKET, fileName, file.buffer, file.size);

    res.json({
      message: "Upload successful",
      fileName
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }


});



module.exports = router;