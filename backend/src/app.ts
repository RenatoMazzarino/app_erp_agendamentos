import Fastify, { type preHandlerHookHandler } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

import { CognitoAuthService } from "./auth/cognito-auth-service.js";
import { TokenVerifier } from "./auth/token-verifier.js";
import type { AppEnv } from "./config/env.js";
import type { DbPool } from "./db/pool.js";
import { pingDb } from "./db/pool.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerAppointmentRoutes } from "./routes/appointments.js";
import { registerAttendanceRoutes } from "./routes/attendance.js";
import { registerClientRoutes } from "./routes/clients.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerFinanceRoutes } from "./routes/finance.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerMenuRoutes } from "./routes/menu.js";
import { registerMessageRoutes } from "./routes/messages.js";
import { registerScheduleBlockRoutes } from "./routes/schedule-blocks.js";
import { registerServiceRoutes } from "./routes/services.js";
import { registerSettingsRoutes } from "./routes/settings.js";

type AppDeps = {
  db: DbPool | null;
};

export function buildApp(env: AppEnv, deps: AppDeps) {
  const authService = new CognitoAuthService(env);
  const tokenVerifier = new TokenVerifier(env);

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL
    },
    requestIdHeader: "x-correlation-id",
    forceCloseConnections: true
  });

  app.register(cors, { origin: true });
  app.register(helmet, { global: true });

  app.addHook("onRequest", async (request, reply) => {
    request.log = request.log.child({
      correlationId: request.id,
      tenantId: request.headers["x-tenant-id"] ?? null
    });
    reply.header("x-correlation-id", request.id);
  });

  const requireAuth: preHandlerHookHandler = async (request, reply) => {
    if (!tokenVerifier.isConfigured()) {
      return reply.code(503).send({ error: "auth_not_configured" });
    }

    const authorization = request.headers.authorization;
    if (!authorization) {
      return reply.code(401).send({ error: "missing_bearer_token" });
    }

    const [scheme, token] = authorization.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return reply.code(401).send({ error: "invalid_bearer_token" });
    }

    try {
      request.auth = await tokenVerifier.verifyAccessToken(token);
      return undefined;
    } catch (error) {
      request.log.warn({ error }, "token invalido");
      return reply.code(401).send({ error: "unauthorized" });
    }
  };

  registerHealthRoutes(app, env, {
    hasDatabase: deps.db !== null,
    checkDatabase: async () => (deps.db ? pingDb(deps.db) : true)
  });
  registerAuthRoutes(app, authService, tokenVerifier);
  registerClientRoutes(app, deps.db, { requireAuth });
  registerServiceRoutes(app, deps.db, { requireAuth });
  registerAppointmentRoutes(app, deps.db, { requireAuth });
  registerAttendanceRoutes(app, deps.db, { requireAuth });
  registerMessageRoutes(app, deps.db, { requireAuth });
  registerFinanceRoutes(app, deps.db, { requireAuth });
  registerScheduleBlockRoutes(app, deps.db, { requireAuth });
  registerAdminRoutes(app, deps.db, { requireAuth });
  registerMenuRoutes(app, deps.db, { requireAuth });
  registerSettingsRoutes(app, deps.db, { requireAuth });
  registerDashboardRoutes(app, deps.db, { requireAuth });

  return app;
}
