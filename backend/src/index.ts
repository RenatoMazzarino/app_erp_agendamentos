import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { runBootstrapMigrations } from "./db/bootstrap-migrations.js";
import { createDbPool } from "./db/pool.js";

const env = loadEnv();
const db = createDbPool(env);
const app = buildApp(env, { db });

try {
  if (db) {
    await runBootstrapMigrations(db);
    app.log.info("migracao bootstrap aplicada com sucesso");
  } else {
    app.log.warn("db nao configurado; migracoes e rotas persistentes indisponiveis");
  }

  app.addHook("onClose", async () => {
    if (db) {
      await db.end();
    }
  });

  await app.listen({
    host: "0.0.0.0",
    port: env.PORT
  });
  app.log.info({ env: env.APP_ENV, port: env.PORT }, "backend iniciado");
} catch (error) {
  app.log.error({ error }, "falha ao iniciar backend");
  process.exit(1);
}
