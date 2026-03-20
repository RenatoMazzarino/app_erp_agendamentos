import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

export function registerDashboardRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/dashboard/summary", { preHandler: deps.requireAuth }, async (request, reply) => {
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

    const [clients, appointments, payments, messages] = await Promise.all([
      db.query(
        `
        SELECT COUNT(*)::int AS total
        FROM platform_core.clients
        WHERE tenant_slug = $1
        `,
        [tenant]
      ),
      db.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
          COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
        FROM platform_core.appointments
        WHERE tenant_slug = $1
          AND scheduled_at::date = NOW()::date
        `,
        [tenant]
      ),
      db.query(
        `
        SELECT
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0)::int AS "paidTodayCents"
        FROM platform_core.payments
        WHERE tenant_slug = $1
          AND created_at::date = NOW()::date
        `,
        [tenant]
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS "unreadInbound"
        FROM platform_core.messages
        WHERE tenant_slug = $1
          AND direction = 'inbound'
          AND status <> 'delivered'
        `,
        [tenant]
      )
    ]);

    return {
      clients: clients.rows[0],
      appointmentsToday: appointments.rows[0],
      financeToday: payments.rows[0],
      inbox: messages.rows[0]
    };
  });
}
