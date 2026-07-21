import { defineConfig, devices } from "@playwright/test";

const caminhoControlado = process.env.ROTA_E2E_CONTROLADO === "1";
const porta = process.env.ROTA_PORTA_E2E ?? "3000";
const baseURL = `http://127.0.0.1:${porta}`;

export default defineConfig({
  testDir: "testes/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // No caminho canônico, o servidor pertence a executar-e2e-controlado.mjs.
  // O comando E2E isolado conserva a conveniência de subir seu próprio Next.
  webServer: caminhoControlado
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
