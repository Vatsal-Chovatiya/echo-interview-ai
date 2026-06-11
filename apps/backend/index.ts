import express from "express";
import cors from "cors";
import { appRouter } from "@repo/api";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

const BACKEND_PORT = 3001;

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext: () => ({}) }),
);

app.listen(BACKEND_PORT, () => {
  console.log(`Backend API server running at http://localhost:${BACKEND_PORT}`);
});
