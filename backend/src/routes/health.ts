import type { FastifyInstance } from "fastify";

import type { AppEnv } from "../config/env.js";

export function registerHealthRoutes(app: FastifyInstance, env: AppEnv) {
  app.get("/health", async () => ({ status: "ok", service: "estudio-platform-backend" }));

  app.get("/ready", async () => ({
    status: "ready",
    env: env.APP_ENV,
    region: env.AWS_REGION,
    time: new Date().toISOString()
  }));
}
