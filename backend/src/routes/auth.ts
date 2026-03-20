import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { AuthServiceError, type CognitoAuthService } from "../auth/cognito-auth-service.js";
import type { TokenVerifier } from "../auth/token-verifier.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10)
});

function parseBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

function toAuthErrorResponse(error: AuthServiceError) {
  if (error.code === "invalid_credentials" || error.code === "unauthorized") {
    return { statusCode: 401, payload: { error: error.code } };
  }
  if (error.code === "not_configured") {
    return { statusCode: 503, payload: { error: error.code } };
  }
  return { statusCode: 500, payload: { error: "auth_service_error" } };
}

export function registerAuthRoutes(
  app: FastifyInstance,
  authService: CognitoAuthService,
  tokenVerifier: TokenVerifier
) {
  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_payload" });
    }

    try {
      const tokens = await authService.login(body.data.email, body.data.password);
      return {
        session: tokens
      };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        const mapped = toAuthErrorResponse(error);
        return reply.code(mapped.statusCode).send(mapped.payload);
      }
      request.log.error({ error }, "falha inesperada no login");
      return reply.code(500).send({ error: "auth_service_error" });
    }
  });

  app.post("/auth/refresh", async (request, reply) => {
    const body = refreshSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_payload" });
    }

    try {
      const tokens = await authService.refresh(body.data.refreshToken);
      return { session: tokens };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        const mapped = toAuthErrorResponse(error);
        return reply.code(mapped.statusCode).send(mapped.payload);
      }
      request.log.error({ error }, "falha inesperada no refresh");
      return reply.code(500).send({ error: "auth_service_error" });
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = parseBearerToken(request.headers.authorization);
    if (!token) {
      return reply.code(401).send({ error: "missing_bearer_token" });
    }

    try {
      await authService.logout(token);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof AuthServiceError) {
        const mapped = toAuthErrorResponse(error);
        return reply.code(mapped.statusCode).send(mapped.payload);
      }
      request.log.error({ error }, "falha inesperada no logout");
      return reply.code(500).send({ error: "auth_service_error" });
    }
  });

  app.get("/auth/me", async (request, reply) => {
    if (!tokenVerifier.isConfigured()) {
      return reply.code(503).send({ error: "not_configured" });
    }

    const token = parseBearerToken(request.headers.authorization);
    if (!token) {
      return reply.code(401).send({ error: "missing_bearer_token" });
    }

    try {
      const authContext = await tokenVerifier.verifyAccessToken(token);
      return {
        user: {
          subject: authContext.subject,
          email: authContext.email,
          username: authContext.username,
          tenantSlug: authContext.tenantSlug
        }
      };
    } catch (error) {
      request.log.warn({ error }, "token invalido");
      return reply.code(401).send({ error: "unauthorized" });
    }
  });
}
