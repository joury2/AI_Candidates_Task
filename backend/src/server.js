import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import triageRouter from "./routes/triage.js";

dotenv.config();
console.log("DB URL loaded:", process.env.DATABASE_URL);

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/triage", triageRouter);

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});