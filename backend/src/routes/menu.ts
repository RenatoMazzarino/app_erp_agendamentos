import type { FastifyInstance, preHandlerHookHandler } from "fastify";

import type { DbPool } from "../db/pool.js";
import { enforceTenantAccess, getTenantFromQuery } from "./route-tenant-utils.js";

function assertDb(db: DbPool | null): asserts db is DbPool {
  if (!db) {
    throw new Error("Database pool nao configurado");
  }
}

export function registerMenuRoutes(
  app: FastifyInstance,
  db: DbPool | null,
  deps: { requireAuth: preHandlerHookHandler }
) {
  app.get("/menu/actions", { preHandler: deps.requireAuth }, async (request, reply) => {
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

    const [settings, unreadMessages, pendingPayments] = await Promise.all([
      db.query(
        `
        SELECT
          push_enabled AS "pushEnabled",
          whatsapp_enabled AS "whatsappEnabled"
        FROM platform_core.tenant_settings
        WHERE tenant_slug = $1
        `,
        [tenant]
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS total
        FROM platform_core.messages
        WHERE tenant_slug = $1
          AND direction = 'inbound'
          AND status <> 'delivered'
        `,
        [tenant]
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS total
        FROM platform_core.payments
        WHERE tenant_slug = $1
          AND status = 'pending'
        `,
        [tenant]
      )
    ]);

    const flags = settings.rows[0] ?? { pushEnabled: true, whatsappEnabled: true };

    return {
      items: [
        { key: "dashboard", label: "Dashboard", enabled: true, badge: 0 },
        { key: "agenda", label: "Agenda", enabled: true, badge: 0 },
        { key: "atendimento", label: "Atendimento", enabled: true, badge: 0 },
        { key: "clientes", label: "Clientes", enabled: true, badge: 0 },
        {
          key: "mensagens",
          label: "Mensagens",
          enabled: Boolean(flags.whatsappEnabled),
          badge: unreadMessages.rows[0]?.total ?? 0
        },
        { key: "caixa", label: "Caixa", enabled: true, badge: pendingPayments.rows[0]?.total ?? 0 },
        { key: "bloqueios", label: "Bloqueios", enabled: true, badge: 0 },
        { key: "admin", label: "Admin", enabled: true, badge: 0 },
        { key: "configuracoes", label: "Configuracoes", enabled: true, badge: 0 },
        { key: "push", label: "Push", enabled: Boolean(flags.pushEnabled), badge: 0 }
      ]
    };
  });
}
