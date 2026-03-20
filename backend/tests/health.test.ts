import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";

describe("health routes", () => {
  it("returns /health ok", async () => {
    const app = buildApp(loadEnv());
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", service: "estudio-platform-backend" });

    await app.close();
  });
});
