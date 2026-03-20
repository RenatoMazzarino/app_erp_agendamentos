import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { z } from "zod";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

const createPaymentSchema = z.object({
  tenantSlug: z.string().min(1),
  appointmentId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  amountCents: z.coerce.number().int().positive(),
  method: z.enum(["pix", "card", "cash", "package"]).default("pix"),
  status: z.enum(["pending", "paid", "refunded", "failed"]).default("pending"),
  paidAt: z.string().datetime().optional()
});

const updatePaymentStatusSchema = z.object({
  status: z.enum(["pending", "paid", "refunded", "failed"]),
  paidAt: z.string().datetime().nullable().optional()
});

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

export function registerFinanceRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/finance/summary", { preHandler: deps.requireAuth }, async (request, reply) => {
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

    const [payments, methods] = await Promise.all([
      db.query(
        `
        SELECT
          COUNT(*)::int AS "totalPayments",
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0)::int AS "paidAmountCents",
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END), 0)::int AS "pendingAmountCents"
        FROM platform_core.payments
        WHERE tenant_slug = $1
        `,
        [tenant]
      ),
      db.query(
        `
        SELECT
          method,
          COUNT(*)::int AS "count",
          COALESCE(SUM(amount_cents), 0)::int AS "amountCents"
        FROM platform_core.payments
        WHERE tenant_slug = $1
        GROUP BY method
        ORDER BY "amountCents" DESC
        `,
        [tenant]
      )
    ]);

    return {
      summary: payments.rows[0],
      methods: methods.rows
    };
  });

  app.get("/finance/payments", { preHandler: deps.requireAuth }, async (request, reply) => {
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
      status: z.enum(["pending", "paid", "refunded", "failed"]).optional(),
      clientId: z.string().uuid().optional(),
      limit: z.coerce.number().int().positive().max(500).default(100)
    });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_query" });
    }

    const result = await db.query(
      `
      SELECT
        p.id,
        p.tenant_slug AS "tenantSlug",
        p.appointment_id AS "appointmentId",
        p.client_id AS "clientId",
        c.full_name AS "clientName",
        p.amount_cents AS "amountCents",
        p.method,
        p.status,
        p.paid_at AS "paidAt",
        p.created_at AS "createdAt"
      FROM platform_core.payments p
      LEFT JOIN platform_core.clients c ON c.id = p.client_id
      WHERE p.tenant_slug = $1
        AND ($2::text IS NULL OR p.status = $2::text)
        AND ($3::uuid IS NULL OR p.client_id = $3::uuid)
      ORDER BY p.created_at DESC
      LIMIT $4
      `,
      [tenant, parsed.data.status ?? null, parsed.data.clientId ?? null, parsed.data.limit]
    );

    return { items: result.rows };
  });

  app.post("/finance/payments", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }
    const body = createPaymentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "invalid_payload" });
    }
    if (!enforceTenantAccess(request, reply, body.data.tenantSlug)) {
      return;
    }

    const result = await db.query(
      `
      INSERT INTO platform_core.payments (
        tenant_slug,
        appointment_id,
        client_id,
        amount_cents,
        method,
        status,
        paid_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        appointment_id AS "appointmentId",
        client_id AS "clientId",
        amount_cents AS "amountCents",
        method,
        status,
        paid_at AS "paidAt",
        created_at AS "createdAt"
      `,
      [
        body.data.tenantSlug,
        body.data.appointmentId ?? null,
        body.data.clientId ?? null,
        body.data.amountCents,
        body.data.method,
        body.data.status,
        body.data.paidAt ?? null
      ]
    );
    return reply.code(201).send(result.rows[0]);
  });

  app.patch("/finance/payments/:id/status", { preHandler: deps.requireAuth }, async (request, reply) => {
    try {
      assertDb(db);
    } catch {
      return reply.code(503).send({ error: "database_unavailable" });
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const tenant = getTenantFromQuery(request, reply);
    const body = updatePaymentStatusSchema.safeParse(request.body);
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
      UPDATE platform_core.payments
      SET
        status = $3,
        paid_at = CASE
          WHEN $4::timestamptz IS NOT NULL THEN $4::timestamptz
          WHEN $3 = 'paid' THEN COALESCE(paid_at, NOW())
          ELSE paid_at
        END
      WHERE id = $1
        AND tenant_slug = $2
      RETURNING
        id,
        tenant_slug AS "tenantSlug",
        appointment_id AS "appointmentId",
        client_id AS "clientId",
        amount_cents AS "amountCents",
        method,
        status,
        paid_at AS "paidAt",
        created_at AS "createdAt"
      `,
      [params.data.id, tenant, body.data.status, body.data.paidAt ?? null]
    );

    if (result.rowCount === 0) {
      return reply.code(404).send({ error: "payment_not_found" });
    }

    return result.rows[0];
  });
}
