import { z } from "zod";

const envSchema = z.object({
  APP_ENV: z
    .enum(["dev", "preview", "prod", "development", "production"])
    .default("dev"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  AWS_REGION: z.string().min(1).default("sa-east-1"),
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().min(1).optional(),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1).optional(),
  DB_USER: z.string().min(1).optional(),
  DB_PASSWORD: z.string().min(1).optional(),
  DB_SSL: z.coerce.boolean().default(false),
  COGNITO_AUTH_ENABLED: z.coerce.boolean().default(false),
  COGNITO_USER_POOL_ID: z.string().min(1).optional(),
  COGNITO_APP_CLIENT_ID: z.string().min(1).optional()
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(): AppEnv {
  return envSchema.parse(process.env);
}
