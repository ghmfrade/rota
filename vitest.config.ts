import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Unitários puros rodam em node; testes de componente (tasks futuras)
    // podem optar por jsdom com `// @vitest-environment jsdom` no arquivo.
    environment: "node",
    include: ["testes/unitarios/**/*.test.{ts,tsx}"],
  },
});
