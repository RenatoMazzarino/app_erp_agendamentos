import type { FastifyInstance } from "fastify";

import type { AppEnv } from "../config/env.js";

type HealthDeps = {
  hasDatabase: boolean;
  checkDatabase: () => Promise<boolean>;
};

export function registerHealthRoutes(app: FastifyInstance, env: AppEnv, deps: HealthDeps) {
  app.get("/health", async (_request, reply) => {
    if (!deps.hasDatabase) {
      return { status: "ok", service: "estudio-platform-backend", database: "disabled" };
    }

    const dbOk = await deps.checkDatabase();
    if (!dbOk) {
      return reply.code(503).send({
        status: "degraded",
        service: "estudio-platform-backend",
        database: "unreachable"
      });
    }

    return { status: "ok", service: "estudio-platform-backend", database: "ok" };
  });

  app.get("/ready", async (_request, reply) => {
    const dbStatus = deps.hasDatabase ? await deps.checkDatabase() : true;
    if (!dbStatus) {
      return reply.code(503).send({
        status: "not_ready",
        env: env.APP_ENV,
        region: env.AWS_REGION,
        database: "unreachable"
      });
    }

    return {
      status: "ready",
      env: env.APP_ENV,
      region: env.AWS_REGION,
      time: new Date().toISOString()
    };
  });
}
