import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { z } from "zod";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

const memberRoleSchema = z.enum(["owner", "admin", "staff", "viewer"]);

const createMemberSchema = z.object({
  tenantSlug: z.string().min(1),
  userSubject: z.string().min(3).max(255),
  email: z.string().email(),
  fullName: z.string().min(2).max(180),
  role: memberRoleSchema,
  isActive: z.boolean().default(true)
});

const updateMemberSchema = z.object({
  fullName: z.string().min(2).max(180).optional(),
  role: memberRoleSchema.optional(),
  isActive: z.boolean().optional()
});

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

async function registerAuditEvent(params: {
  db: DbPool;
  tenantSlug: string;
  actorSubject: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: unknown;
}) {
  await params.db.query(
    `
    INSERT INTO platform_core.audit_events (
      tenant_slug,
      actor_subject,
      action,
      entity_type,
      entity_id,
      payload_json
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      params.tenantSlug,
      params.actorSubject,
      params.action,
      params.entityType,
      params.entityId,
      JSON.stringify(params.payload ?? {})
    ]
  );
}

export function registerAdminRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/admin/members", { preHandler: deps.requireAuth }, async (request, reply) => {
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
        user_subject AS "userSubject",
        email,
        full_name AS "fullName",
        role,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM platform_core.tenant_memberships
      WHERE tenant_slug = $1
      ORDER BY
        CASE role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'staff' THEN 3
          ELSE 4
        END ASC,
        full_name ASC
      `,
      [tenant]
    );

    return { items: result.rows };
  });

  app.post("/admin/members", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const body = createMemberSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_payload" });
    }
    if (!enforceTenantAccess(request, reply, body.data.tenantSlug)) {
      return;
    }

    const result = await db.query(
      `
      INSERT INTO platform_core.tenant_memberships (
        tenant_slug,
        user_subject,
        email,
        full_name,
        role,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tenant_slug, user_subject)
      DO UPDATE
      SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        user_subject AS "userSubject",
        email,
        full_name AS "fullName",
        role,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        body.data.tenantSlug,
        body.data.userSubject,
        body.data.email,
        body.data.fullName,
        body.data.role,
        body.data.isActive
      ]
    );

    const member = result.rows[0];
    await registerAuditEvent({
      db,
      tenantSlug: body.data.tenantSlug,
      actorSubject: request.auth?.subject ?? null,
      action: "admin.member.upsert",
      entityType: "tenant_membership",
      entityId: member.id,
      payload: {
        userSubject: body.data.userSubject,
        role: body.data.role,
        isActive: body.data.isActive
      }
    });

    return reply.code(201).send(member);
  });

  app.put("/admin/members/:id", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    const body = updateMemberSchema.safeParse(request.body);
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
      UPDATE platform_core.tenant_memberships
      SET
        full_name = COALESCE($3, full_name),
        role = COALESCE($4, role),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $1
        AND tenant_slug = $2
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        user_subject AS "userSubject",
        email,
        full_name AS "fullName",
        role,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [params.data.id, tenant, body.data.fullName ?? null, body.data.role ?? null, body.data.isActive ?? null]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "member_not_found" });
    }

    const member = result.rows[0];
    await registerAuditEvent({
      db,
      tenantSlug: tenant,
      actorSubject: request.auth?.subject ?? null,
      action: "admin.member.update",
      entityType: "tenant_membership",
      entityId: member.id,
      payload: body.data
    });

    return member;
  });

  app.get("/admin/audit-events", { preHandler: deps.requireAuth }, async (request, reply) => {
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

    const query = z
      .object({
        tenant: z.string().min(1),
        limit: z.coerce.number().int().positive().max(300).default(100)
      })
      .safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "invalid_query" });
    }

    const result = await db.query(
      `
      SELECT
        id,
        tenant_slug AS "tenantSlug",
        actor_subject AS "actorSubject",
        action,
        entity_type AS "entityType",
        entity_id AS "entityId",
        payload_json AS "payload",
        created_at AS "createdAt"
      FROM platform_core.audit_events
      WHERE tenant_slug = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [tenant, query.data.limit]
    );

    return { items: result.rows };
  });
}
