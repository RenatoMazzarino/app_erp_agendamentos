import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { z } from "zod";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

const updateSettingsSchema = z.object({
  businessName: z.string().min(2).optional(),
  primaryColor: z.string().min(4).optional(),
  accentColor: z.string().min(4).optional(),
  pushEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  signalPercentage: z.coerce.number().int().min(0).max(100).optional()
});

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

export function registerSettingsRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/settings", { preHandler: deps.requireAuth }, async (request, reply) => {
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
        tenant_slug AS "tenantSlug",
        business_name AS "businessName",
        primary_color AS "primaryColor",
        accent_color AS "accentColor",
        push_enabled AS "pushEnabled",
        whatsapp_enabled AS "whatsappEnabled",
        signal_percentage AS "signalPercentage",
        updated_at AS "updatedAt"
      FROM platform_core.tenant_settings
      WHERE tenant_slug = $1
      `,
      [tenant]
    );
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "settings_not_found" });
    }
    return result.rows[0];
  });

  app.put("/settings", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }
    const tenant = getTenantFromQuery(request, reply);
    const body = updateSettingsSchema.safeParse(request.body);
    if (!body.success) {
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
      UPDATE platform_core.tenant_settings
      SET
        business_name = COALESCE($2, business_name),
        primary_color = COALESCE($3, primary_color),
        accent_color = COALESCE($4, accent_color),
        push_enabled = COALESCE($5, push_enabled),
        whatsapp_enabled = COALESCE($6, whatsapp_enabled),
        signal_percentage = COALESCE($7, signal_percentage),
        updated_at = NOW()
      WHERE tenant_slug = $1
      RETURNING
        tenant_slug AS "tenantSlug",
        business_name AS "businessName",
        primary_color AS "primaryColor",
        accent_color AS "accentColor",
        push_enabled AS "pushEnabled",
        whatsapp_enabled AS "whatsappEnabled",
        signal_percentage AS "signalPercentage",
        updated_at AS "updatedAt"
      `,
      [
        tenant,
        body.data.businessName ?? null,
        body.data.primaryColor ?? null,
        body.data.accentColor ?? null,
        body.data.pushEnabled ?? null,
        body.data.whatsappEnabled ?? null,
        body.data.signalPercentage ?? null
      ]
    );
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "settings_not_found" });
    }
    return result.rows[0];
  });
}
