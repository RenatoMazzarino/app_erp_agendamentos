import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const app = buildApp(env);

try {
  await app.listen({
    host: "0.0.0.0",
    port: env.PORT
  });
  app.log.info({ env: env.APP_ENV, port: env.PORT }, "backend iniciado");
} catch (error) {
  app.log.error({ error }, "falha ao iniciar backend");
  process.exit(1);
}
