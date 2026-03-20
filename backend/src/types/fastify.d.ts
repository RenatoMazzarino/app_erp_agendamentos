import "fastify";

import type { AuthContext } from "../auth/token-verifier.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}
