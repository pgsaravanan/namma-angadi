import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    env: {
      ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      ROOT_DOMAIN: "localhost:3000",
      DATABASE_URL: "postgres://unused:unused@localhost:1/unused",
    },
  },
});
