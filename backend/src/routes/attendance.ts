import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { z } from "zod";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

const createEvolutionSchema = z.object({
  tenantSlug: z.string().min(1),
  appointmentId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  evolutionText: z.string().min(3),
  painPoints: z.array(z.string()).default([])
});

const updateEvolutionSchema = z.object({
  appointmentId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().optional(),
  evolutionText: z.string().min(3).optional(),
  painPoints: z.array(z.string()).optional()
});

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

export function registerAttendanceRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/attendance/evolutions", { preHandler: deps.requireAuth }, async (request, reply) => {
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
      tenant: z.string(),
      clientId: z.string().uuid().optional()
    });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_query" });
    }

    const result = await db.query(
      `
      SELECT
        id,
        tenant_slug AS "tenantSlug",
        appointment_id AS "appointmentId",
        client_id AS "clientId",
        evolution_text AS "evolutionText",
        pain_points_json AS "painPoints",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM platform_core.attendance_evolutions
      WHERE tenant_slug = $1
        AND ($2::uuid IS NULL OR client_id = $2::uuid)
      ORDER BY created_at DESC
      `,
      [tenant, parsed.data.clientId ?? null]
    );
    return { items: result.rows };
  });

  app.get("/attendance/evolutions/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
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
        id,
        tenant_slug AS "tenantSlug",
        appointment_id AS "appointmentId",
        client_id AS "clientId",
        evolution_text AS "evolutionText",
        pain_points_json AS "painPoints",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM platform_core.attendance_evolutions
      WHERE tenant_slug = $1
        AND id = $2
      LIMIT 1
      `,
      [tenant, params.data.id]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "evolution_not_found" });
    }

    return result.rows[0];
  });

  app.post("/attendance/evolutions", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const body = createEvolutionSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_payload" });
    }
    if (!enforceTenantAccess(request, reply, body.data.tenantSlug)) {
      return;
    }

    const result = await db.query(
      `
      INSERT INTO platform_core.attendance_evolutions (
        tenant_slug,
        appointment_id,
        client_id,
        evolution_text,
        pain_points_json
      ) VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        appointment_id AS "appointmentId",
        client_id AS "clientId",
        evolution_text AS "evolutionText",
        pain_points_json AS "painPoints",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        body.data.tenantSlug,
        body.data.appointmentId ?? null,
        body.data.clientId,
        body.data.evolutionText,
        JSON.stringify(body.data.painPoints)
      ]
    );
    return reply.code(201).send(result.rows[0]);
  });

  app.put("/attendance/evolutions/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    const body = updateEvolutionSchema.safeParse(request.body);
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
      UPDATE platform_core.attendance_evolutions
      SET
        appointment_id = COALESCE($3, appointment_id),
        client_id = COALESCE($4, client_id),
        evolution_text = COALESCE($5, evolution_text),
        pain_points_json = COALESCE($6::jsonb, pain_points_json),
        updated_at = NOW()
      WHERE id = $1
        AND tenant_slug = $2
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        appointment_id AS "appointmentId",
        client_id AS "clientId",
        evolution_text AS "evolutionText",
        pain_points_json AS "painPoints",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        params.data.id,
        tenant,
        body.data.appointmentId ?? null,
        body.data.clientId ?? null,
        body.data.evolutionText ?? null,
        body.data.painPoints ? JSON.stringify(body.data.painPoints) : null
      ]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "evolution_not_found" });
    }

    return result.rows[0];
  });

  app.delete("/attendance/evolutions/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
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
      DELETE FROM platform_core.attendance_evolutions
      WHERE id = $1
        AND tenant_slug = $2
      `,
      [params.data.id, tenant]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "evolution_not_found" });
    }

    return reply.code(204).send();
  });
}
