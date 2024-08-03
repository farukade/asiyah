import express from "express";
import speech from "@google-cloud/speech";
import multer from "multer";
import { extname, resolve } from "path";
import { readFileSync } from "fs";

const client = new speech.SpeechClient();
const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

const convertAudioToText = async (filePath) => {
  const audio = {
    content: readFileSync(filePath).toString("base64"),
  };

  const config = {
    encoding: "LINEAR16",
    sampleRateHertz: 16000,
    languageCode: "en-US",
  };

  const request = {
    audio: audio,
    config: config,
  };

  const [response] = await client.recognize(request);
  return response.results
    .map((result) => result.alternatives[0].transcript)
    .join("\n");
};

app.post("/transcribe", upload.single("wavfile"), async (req, res) => {
  try {
    const file = req.file;

    if (file) {
      const filePath = resolve(file.path);
      const transcription = await convertAudioToText(filePath);

      res.send({ transcription });
    } else {
      res.status(400).send("No file uploaded");
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("Error uploading file");
  }
});

app.listen(8000, () => {
  console.log("Server listening on port 8000");
});
