import { expect, test } from "@playwright/test";

// Smoke E2E do scaffold (TASK-001): a página inicial carrega client-side e
// nenhuma requisição sai para serviço externo — princípio da
// docs-dev/08-TEST_STRATEGY.md (nenhum teste depende de serviço externo).
test("página inicial carrega sem requisições externas", async ({ page }) => {
  const requisicoesExternas: string[] = [];
  page.on("request", (requisicao) => {
    const { hostname } = new URL(requisicao.url());
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      requisicoesExternas.push(requisicao.url());
    }
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "ROTA — Registro de Operação e Tabelas de Autos",
    }),
  ).toBeVisible();

  expect(requisicoesExternas).toEqual([]);
});
