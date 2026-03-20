import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

export const tenantQuerySchema = z.object({
  tenant: z.string().min(1)
});

export function getTenantFromQuery(request: FastifyRequest, reply: FastifyReply): string | null {
  const query = tenantQuerySchema.safeParse(request.query);
  if (!query.success) {
    reply.code(400).send({ error: "tenant_required" });
    return null;
  }
  return query.data.tenant;
}

export function enforceTenantAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  tenantSlug: string
): boolean {
  if (request.auth?.tenantSlug && request.auth.tenantSlug !== tenantSlug) {
    reply.code(403).send({ error: "forbidden_tenant_access" });
    return false;
  }
  return true;
}
