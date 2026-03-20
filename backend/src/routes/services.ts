import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { z } from "zod";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

const createServiceSchema = z.object({
  tenantSlug: z.string().min(1),
  name: z.string().min(2),
  durationMinutes: z.coerce.number().int().positive(),
  priceCents: z.coerce.number().int().nonnegative(),
  locationType: z.enum(["studio", "home"]).default("studio"),
  isActive: z.boolean().default(true)
});

const updateServiceSchema = createServiceSchema.partial().omit({ tenantSlug: true });

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

export function registerServiceRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/services", { preHandler: deps.requireAuth }, async (request, reply) => {
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
        id,
        tenant_slug AS "tenantSlug",
        name,
        duration_minutes AS "durationMinutes",
        price_cents AS "priceCents",
        location_type AS "locationType",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM platform_core.services
      WHERE tenant_slug = $1
      ORDER BY is_active DESC, name ASC
      `,
      [tenant]
    );

    return { items: result.rows };
  });

  app.get("/services/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
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
        name,
        duration_minutes AS "durationMinutes",
        price_cents AS "priceCents",
        location_type AS "locationType",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM platform_core.services
      WHERE id = $1
        AND tenant_slug = $2
      LIMIT 1
      `,
      [params.data.id, tenant]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "service_not_found" });
    }

    return result.rows[0];
  });

  app.post("/services", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }
    const body = createServiceSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_payload" });
    }
    if (!enforceTenantAccess(request, reply, body.data.tenantSlug)) {
      return;
    }

    const result = await db.query(
      `
      INSERT INTO platform_core.services (
        tenant_slug,
        name,
        duration_minutes,
        price_cents,
        location_type,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        name,
        duration_minutes AS "durationMinutes",
        price_cents AS "priceCents",
        location_type AS "locationType",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        body.data.tenantSlug,
        body.data.name,
        body.data.durationMinutes,
        body.data.priceCents,
        body.data.locationType,
        body.data.isActive
      ]
    );

    return reply.code(201).send(result.rows[0]);
  });

  app.put("/services/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const serviceId = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    const body = updateServiceSchema.safeParse(request.body);
    if (!serviceId.success || !body.success) {
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
      UPDATE platform_core.services
      SET
        name = COALESCE($3, name),
        duration_minutes = COALESCE($4, duration_minutes),
        price_cents = COALESCE($5, price_cents),
        location_type = COALESCE($6, location_type),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = $1 AND tenant_slug = $2
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        name,
        duration_minutes AS "durationMinutes",
        price_cents AS "priceCents",
        location_type AS "locationType",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        serviceId.data.id,
        tenant,
        body.data.name ?? null,
        body.data.durationMinutes ?? null,
        body.data.priceCents ?? null,
        body.data.locationType ?? null,
        body.data.isActive ?? null
      ]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "service_not_found" });
    }

    return result.rows[0];
  });

  app.delete("/services/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
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
      UPDATE platform_core.services
      SET
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = $1
        AND tenant_slug = $2
      RETURNING id
      `,
      [params.data.id, tenant]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "service_not_found" });
    }

    return reply.code(204).send();
  });
}
