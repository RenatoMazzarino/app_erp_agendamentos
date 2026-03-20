import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { z } from "zod";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

const createMessageSchema = z.object({
  tenantSlug: z.string().min(1),
  clientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  channel: z.enum(["whatsapp", "push", "internal"]).default("internal"),
  direction: z.enum(["inbound", "outbound"]).default("outbound"),
  body: z.string().min(1),
  status: z.enum(["queued", "sent", "delivered", "failed"]).default("queued")
});

const updateMessageStatusSchema = z.object({
  status: z.enum(["queued", "sent", "delivered", "failed"])
});

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

export function registerMessageRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/messages", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }
    const tenant = getTenantFromQuery(request, reply);
    if (!tenant) {
      return;
    }
    if (!enforceTenantAccess(request, reply, tenant)) {
      return;
    }

    const result = await db.query(
      `
      SELECT
        m.id,
        m.tenant_slug AS "tenantSlug",
        m.client_id AS "clientId",
        c.full_name AS "clientName",
        m.appointment_id AS "appointmentId",
        m.channel,
        m.direction,
        m.body,
        m.status,
        m.created_at AS "createdAt"
      FROM platform_core.messages m
      LEFT JOIN platform_core.clients c ON c.id = m.client_id
      WHERE m.tenant_slug = $1
      ORDER BY m.created_at DESC
      LIMIT 200
      `,
      [tenant]
    );
    return { items: result.rows };
  });

  app.get("/messages/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    if (!params.success) {
      return reply.code(400).send({ error: "invalid_params" });
    }
    if (!tenant) {
      return;
    }
    if (!enforceTenantAccess(request, reply, tenant)) {
      return;
    }

    const result = await db.query(
      `
      SELECT
        m.id,
        m.tenant_slug AS "tenantSlug",
        m.client_id AS "clientId",
        c.full_name AS "clientName",
        m.appointment_id AS "appointmentId",
        m.channel,
        m.direction,
        m.body,
        m.status,
        m.created_at AS "createdAt"
      FROM platform_core.messages m
      LEFT JOIN platform_core.clients c ON c.id = m.client_id
      WHERE m.id = $1
        AND m.tenant_slug = $2
      LIMIT 1
      `,
      [params.data.id, tenant]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "message_not_found" });
    }

    return result.rows[0];
  });

  app.post("/messages", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const body = createMessageSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_payload" });
    }
    if (!enforceTenantAccess(request, reply, body.data.tenantSlug)) {
      return;
    }

    const result = await db.query(
      `
      INSERT INTO platform_core.messages (
        tenant_slug,
        client_id,
        appointment_id,
        channel,
        direction,
        body,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        client_id AS "clientId",
        appointment_id AS "appointmentId",
        channel,
        direction,
        body,
        status,
        created_at AS "createdAt"
      `,
      [
        body.data.tenantSlug,
        body.data.clientId ?? null,
        body.data.appointmentId ?? null,
        body.data.channel,
        body.data.direction,
        body.data.body,
        body.data.status
      ]
    );
    return reply.code(201).send(result.rows[0]);
  });

  app.patch("/messages/:id/status", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    const body = updateMessageStatusSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ error: "invalid_request" });
    }
    if (!tenant) {
      return;
    }
    if (!enforceTenantAccess(request, reply, tenant)) {
      return;
    }

    const result = await db.query(
      `
      UPDATE platform_core.messages
      SET status = $3
      WHERE id = $1
        AND tenant_slug = $2
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        client_id AS "clientId",
        appointment_id AS "appointmentId",
        channel,
        direction,
        body,
        status,
        created_at AS "createdAt"
      `,
      [params.data.id, tenant, body.data.status]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "message_not_found" });
    }

    return result.rows[0];
  });
}
