import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

import type { AppEnv } from "./config/env.js";
import { registerHealthRoutes } from "./routes/health.js";

export function buildApp(env: AppEnv) {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL
    },
    requestIdHeader: "x-correlation-id"
  });

  app.register(cors, { origin: true });
  app.register(helmet, { global: true });

  app.addHook("onRequest", async (request, _reply) => {
    request.log = request.log.child({
      correlationId: request.id,
      tenantId: request.headers["x-tenant-id"] ?? null
    });
  });

  registerHealthRoutes(app, env);

  return app;
}
