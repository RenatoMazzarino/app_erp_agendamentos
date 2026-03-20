import { z } from "zod";

const envSchema = z.object({
  APP_ENV: z.enum(["development", "preview", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  AWS_REGION: z.string().min(1).default("sa-east-1")
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(): AppEnv {
  return envSchema.parse(process.env);
}
