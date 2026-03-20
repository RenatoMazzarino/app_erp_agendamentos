import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { z } from "zod";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

const createAppointmentSchema = z.object({
  tenantSlug: z.string().min(1),
  clientId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.coerce.number().int().positive(),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]).default("scheduled"),
  source: z.enum(["public", "internal"]).default("internal"),
  notes: z.string().optional(),
  priceCents: z.coerce.number().int().nonnegative().default(0)
});

const updateAppointmentStatusSchema = z.object({
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled"])
});

const updateAppointmentSchema = z.object({
  clientId: z.string().uuid().optional(),
  serviceId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]).optional(),
  source: z.enum(["public", "internal"]).optional(),
  notes: z.string().nullable().optional(),
  priceCents: z.coerce.number().int().nonnegative().optional()
});

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

export function registerAppointmentRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/appointments", { preHandler: deps.requireAuth }, async (request, reply) => {
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

    const querySchema = z.object({
      tenant: z.string().min(1),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      status: z.string().optional()
    });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_query" });
    }

    const result = await db.query(
      `
      SELECT
        a.id,
        a.tenant_slug AS "tenantSlug",
        a.client_id AS "clientId",
        c.full_name AS "clientName",
        a.service_id AS "serviceId",
        s.name AS "serviceName",
        a.scheduled_at AS "scheduledAt",
        a.duration_minutes AS "durationMinutes",
        a.status,
        a.source,
        a.notes,
        a.price_cents AS "priceCents",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt"
      FROM platform_core.appointments a
      LEFT JOIN platform_core.clients c ON c.id = a.client_id
      LEFT JOIN platform_core.services s ON s.id = a.service_id
      WHERE a.tenant_slug = $1
        AND ($2::timestamptz IS NULL OR a.scheduled_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR a.scheduled_at <= $3::timestamptz)
        AND ($4::text IS NULL OR a.status = $4::text)
      ORDER BY a.scheduled_at ASC
      `,
      [tenant, parsed.data.dateFrom ?? null, parsed.data.dateTo ?? null, parsed.data.status ?? null]
    );

    return { items: result.rows };
  });

  app.get("/appointments/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
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
        a.id,
        a.tenant_slug AS "tenantSlug",
        a.client_id AS "clientId",
        c.full_name AS "clientName",
        a.service_id AS "serviceId",
        s.name AS "serviceName",
        a.scheduled_at AS "scheduledAt",
        a.duration_minutes AS "durationMinutes",
        a.status,
        a.source,
        a.notes,
        a.price_cents AS "priceCents",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt"
      FROM platform_core.appointments a
      LEFT JOIN platform_core.clients c ON c.id = a.client_id
      LEFT JOIN platform_core.services s ON s.id = a.service_id
      WHERE a.id = $1
        AND a.tenant_slug = $2
      LIMIT 1
      `,
      [params.data.id, tenant]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "appointment_not_found" });
    }

    return result.rows[0];
  });

  app.post("/appointments", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }
    const body = createAppointmentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_payload" });
    }
    if (!enforceTenantAccess(request, reply, body.data.tenantSlug)) {
      return;
    }

    const result = await db.query(
      `
      INSERT INTO platform_core.appointments (
        tenant_slug,
        client_id,
        service_id,
        scheduled_at,
        duration_minutes,
        status,
        source,
        notes,
        price_cents
      ) VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7, $8, $9)
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        client_id AS "clientId",
        service_id AS "serviceId",
        scheduled_at AS "scheduledAt",
        duration_minutes AS "durationMinutes",
        status,
        source,
        notes,
        price_cents AS "priceCents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        body.data.tenantSlug,
        body.data.clientId,
        body.data.serviceId ?? null,
        body.data.scheduledAt,
        body.data.durationMinutes,
        body.data.status,
        body.data.source,
        body.data.notes ?? null,
        body.data.priceCents
      ]
    );

    return reply.code(201).send(result.rows[0]);
  });

  app.put("/appointments/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    const body = updateAppointmentSchema.safeParse(request.body);
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
      UPDATE platform_core.appointments
      SET
        client_id = COALESCE($3, client_id),
        service_id = COALESCE($4, service_id),
        scheduled_at = COALESCE($5::timestamptz, scheduled_at),
        duration_minutes = COALESCE($6, duration_minutes),
        status = COALESCE($7, status),
        source = COALESCE($8, source),
        notes = COALESCE($9, notes),
        price_cents = COALESCE($10, price_cents),
        updated_at = NOW()
      WHERE id = $1
        AND tenant_slug = $2
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        client_id AS "clientId",
        service_id AS "serviceId",
        scheduled_at AS "scheduledAt",
        duration_minutes AS "durationMinutes",
        status,
        source,
        notes,
        price_cents AS "priceCents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        params.data.id,
        tenant,
        body.data.clientId ?? null,
        body.data.serviceId ?? null,
        body.data.scheduledAt ?? null,
        body.data.durationMinutes ?? null,
        body.data.status ?? null,
        body.data.source ?? null,
        body.data.notes ?? null,
        body.data.priceCents ?? null
      ]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "appointment_not_found" });
    }

    return result.rows[0];
  });

  app.patch("/appointments/:id/status", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    const body = updateAppointmentStatusSchema.safeParse(request.body);
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
      UPDATE platform_core.appointments
      SET
        status = $3,
        updated_at = NOW()
      WHERE id = $1 AND tenant_slug = $2
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        client_id AS "clientId",
        service_id AS "serviceId",
        scheduled_at AS "scheduledAt",
        duration_minutes AS "durationMinutes",
        status,
        source,
        notes,
        price_cents AS "priceCents",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [params.data.id, tenant, body.data.status]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "appointment_not_found" });
    }

    return result.rows[0];
  });

  app.delete("/appointments/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
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
      DELETE FROM platform_core.appointments
      WHERE id = $1
        AND tenant_slug = $2
      `,
      [params.data.id, tenant]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "appointment_not_found" });
    }

    return reply.code(204).send();
  });
}
