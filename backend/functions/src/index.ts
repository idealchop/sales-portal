import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import authRoutes from "./routes/auth-routes";
import dashboardRoutes from "./routes/dashboard-routes";
import onboardingRoutes from "./routes/onboarding-routes";
import smartrefillRoutes from "./routes/smartrefill-routes";
import adminRoutes from "./routes/admin-routes";
import salesWorkflowRoutes from "./routes/sales-workflow-routes";
import contentStudioRoutes from "./routes/content-studio-routes";
import eventsTrainingRoutes from "./routes/events-training-routes";
import { SALES_PORTAL_FUNCTION_SECRETS } from "./config/function-secrets";

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: true }));
app.use(express.json({ limit: "8mb" }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS" || !!process.env.FUNCTIONS_EMULATOR,
  message: "Too many requests, please try again after 15 minutes",
});
app.use(globalLimiter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sales-portal-api",
    emulator: !!process.env.FUNCTIONS_EMULATOR,
  });
});

app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/content-studio", contentStudioRoutes);
app.use("/events-training", eventsTrainingRoutes);
app.use("/onboarding", onboardingRoutes);
app.use("/smartrefill", smartrefillRoutes);
app.use("/admin", adminRoutes);
app.use("/", salesWorkflowRoutes);

const api = express();
api.use("/", app);

export { app };
export const salesPortalApi = onRequest(
  {
    region: "asia-southeast1",
    cors: true,
    secrets: [...SALES_PORTAL_FUNCTION_SECRETS],
  },
  api,
);

export { eventsTrainingPromotionDelivery } from "./jobs/events-training-promotion-delivery";
