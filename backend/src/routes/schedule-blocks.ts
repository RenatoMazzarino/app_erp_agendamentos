import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { z } from "zod";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

const createScheduleBlockSchema = z
  .object({
    tenantSlug: z.string().min(1),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    reason: z.string().min(2).max(200),
    createdBy: z.string().min(2).max(120).optional()
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    message: "invalid_interval"
  });

const updateScheduleBlockSchema = z
  .object({
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    reason: z.string().min(2).max(200).optional(),
    createdBy: z.string().min(2).max(120).optional()
  })
  .refine(
    (value) =>
      !value.startsAt || !value.endsAt || new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(),
    {
      message: "invalid_interval"
    }
  );

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

export function registerScheduleBlockRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/schedule-blocks", { preHandler: deps.requireAuth }, async (request, reply) => {
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
      dateTo: z.string().datetime().optional()
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
        starts_at AS "startsAt",
        ends_at AS "endsAt",
        reason,
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM platform_core.schedule_blocks
      WHERE tenant_slug = $1
        AND ($2::timestamptz IS NULL OR ends_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR starts_at <= $3::timestamptz)
      ORDER BY starts_at ASC
      `,
      [tenant, parsed.data.dateFrom ?? null, parsed.data.dateTo ?? null]
    );

    return { items: result.rows };
  });

  app.post("/schedule-blocks", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const body = createScheduleBlockSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_payload" });
    }
    if (!enforceTenantAccess(request, reply, body.data.tenantSlug)) {
      return;
    }

    const result = await db.query(
      `
      INSERT INTO platform_core.schedule_blocks (
        tenant_slug,
        starts_at,
        ends_at,
        reason,
        created_by
      ) VALUES ($1, $2::timestamptz, $3::timestamptz, $4, $5)
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        starts_at AS "startsAt",
        ends_at AS "endsAt",
        reason,
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        body.data.tenantSlug,
        body.data.startsAt,
        body.data.endsAt,
        body.data.reason,
        body.data.createdBy ?? request.auth?.email ?? null
      ]
    );

    return reply.code(201).send(result.rows[0]);
  });

  app.put("/schedule-blocks/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    const body = updateScheduleBlockSchema.safeParse(request.body);
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
      UPDATE platform_core.schedule_blocks
      SET
        starts_at = COALESCE($3::timestamptz, starts_at),
        ends_at = COALESCE($4::timestamptz, ends_at),
        reason = COALESCE($5, reason),
        created_by = COALESCE($6, created_by),
        updated_at = NOW()
      WHERE id = $1
        AND tenant_slug = $2
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        starts_at AS "startsAt",
        ends_at AS "endsAt",
        reason,
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        params.data.id,
        tenant,
        body.data.startsAt ?? null,
        body.data.endsAt ?? null,
        body.data.reason ?? null,
        body.data.createdBy ?? null
      ]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "schedule_block_not_found" });
    }

    return result.rows[0];
  });

  app.delete("/schedule-blocks/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
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
      DELETE FROM platform_core.schedule_blocks
      WHERE id = $1
        AND tenant_slug = $2
      `,
      [params.data.id, tenant]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "schedule_block_not_found" });
    }

    return reply.code(204).send();
  });
}
