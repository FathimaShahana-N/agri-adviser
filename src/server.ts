import path from "path";
import dotenv from "dotenv";
dotenv.config();

import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { runPipeline } from "./orchestrator";
import { RawFarmerInput } from "./types";

const app = express();
const PORT = process.env.PORT || 3000;

// Cap the raw upload at 10MB here too (belt-and-braces with validateImage's
// own check) so oversized files are rejected before they're even buffered.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

// Cloud Run (and similar platforms) hit this to confirm the container
// started successfully before routing traffic to it.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

app.post("/api/chat", upload.single("image"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId: string = (req.body?.sessionId && String(req.body.sessionId)) || uuidv4();
    const text: string | undefined = req.body?.text;
    const location: string | undefined = req.body?.locationName ? String(req.body.locationName) : undefined;
    // Optional preventive-tips selectors - independent of text/image/location.
    const growthStage: string | undefined = req.body?.growthStage ? String(req.body.growthStage) : undefined;
    const selectedCrop: string | undefined = req.body?.selectedCrop ? String(req.body.selectedCrop) : undefined;

    const input: RawFarmerInput = {
      sessionId,
      text,
      image: req.file
        ? {
            buffer: req.file.buffer,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
          }
        : undefined,
      location,
      growthStage,
      selectedCrop,
    };

    const result = await runPipeline(input);

    res.json({
      sessionId,
      language: result.response.language,
      // The farmer-facing text: Response Agent's composed message. The chat
      // UI only renders this field - diagnosis/weather below are raw agent
      // output kept for API consumers/debugging, not meant for display.
      message: result.response.message,
      diagnosis: {
        status: result.diagnosis.status,
        crop: result.diagnosis.crop,
        disease: result.diagnosis.disease,
        confidence: result.diagnosis.confidence,
        needsFollowUp: result.diagnosis.needsFollowUp,
        followUpQuestions: result.diagnosis.followUpQuestions,
      },
      weather: {
        status: result.weather.status,
        locationQuery: result.weather.locationQuery,
        humidityPct: result.weather.humidityPct,
        temperatureC: result.weather.temperatureC,
        conditions: result.weather.conditions,
        diseaseSpreadRisk: result.weather.diseaseSpreadRisk,
        delayTreatmentAdvice: result.weather.delayTreatmentAdvice,
      },
      trace: result.trace,
    });
  } catch (err) {
    next(err);
  }
});

// Multer errors (e.g. oversized file) land here with a 4xx instead of a 500.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`AgriAdvisor server listening on http://localhost:${PORT}`);
});
