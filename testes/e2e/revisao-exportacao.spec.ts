import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import fixturaValida from "../fixtures/tela-inicial-carregar-valido.json";

// E2E da Revisão + Exportação (TASK-032; Spec 04 §11/§12) para o modo
// CARREGADO — um documento já schema-válido, sem pendências vivas de rota/
// descrição/matriz (nenhum editor de mapa foi tocado nesta sessão). O E2E do
// fluxo "novo" ponta a ponta (identidade → Serviço → itinerário → viagens →
// matrizes → Revisão → Exportação) é a TASK-062 (DEC-059) — fora deste
// escopo. Nenhum fluxo aqui chama o OSRM.

async function carregarDocumentoValido(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByTestId("input-arquivo-json").setInputFiles({
    name: "valido.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixturaValida)),
  });
  await expect(page.getByTestId("layout-formulario")).toBeVisible();
}

test.describe("Revisão (Spec 04 §11)", () => {
  test("documento carregado válido: sem bloqueantes, descrição por Serviço/sentido visível", async ({
    page,
  }) => {
    await carregarDocumentoValido(page);
    await page.locator('[data-testid="etapa-botao"][data-etapa="revisao"]').click();

    await expect(page.getByTestId("tela-revisao")).toBeVisible();
    await expect(page.getByTestId("revisao-bloqueantes-vazio")).toBeVisible();

    const itens = page.getByTestId("revisao-descricao-item");
    await expect(itens.first()).toBeVisible();
    await expect(itens.first()).toContainText("Serviço");

    // Resumo operacional (Spec 04 §10, TASK-031) também aparece na Revisão.
    await expect(page.getByTestId("resumo-operacional")).toBeVisible();
  });
});

test.describe("Exportação (Spec 04 §12; RN-078)", () => {
  test("gate liberado: 'Exportar proposta' baixa um JSON válido preservando as UUIDs (RN-004)", async ({
    page,
  }) => {
    await carregarDocumentoValido(page);
    await page.locator('[data-testid="etapa-botao"][data-etapa="exportacao"]').click();

    await expect(page.getByTestId("tela-exportacao")).toBeVisible();
    await expect(page.getByTestId("exportacao-mensagem-gate")).toHaveCount(0);

    const botao = page.getByTestId("botao-exportar-proposta");
    await expect(botao).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      botao.click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^rota-1-proposta-\d{4}-\d{2}-\d{2}\.json$/);

    const caminho = await download.path();
    expect(caminho).not.toBeNull();
    const conteudo = JSON.parse(readFileSync(caminho!, "utf-8"));

    expect(conteudo.versao_schema).toBe("1.0");
    expect(conteudo.autos.status).toBe("proposta");
    expect(conteudo.autos.data_criacao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(conteudo.autos).not.toHaveProperty("data_publicacao");

    // RN-004 — UUIDs de Seções e Serviços preservadas, byte a byte.
    expect(conteudo.autos.secoes[0].uuid).toBe(fixturaValida.autos.secoes[0].uuid);
    expect(conteudo.autos.servicos[0].uuid).toBe(fixturaValida.autos.servicos[0].uuid);
  });

  test("gate liberado: 'Definir como vigente' pede a data de publicação e baixa com status vigente", async ({
    page,
  }) => {
    await carregarDocumentoValido(page);
    await page.locator('[data-testid="etapa-botao"][data-etapa="exportacao"]').click();

    await page.getByTestId("campo-data-publicacao").fill("2026-08-01");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("botao-definir-vigente").click(),
    ]);

    expect(download.suggestedFilename()).toBe("rota-1-vigente-2026-08-01.json");

    const caminho = await download.path();
    expect(caminho).not.toBeNull();
    const conteudo = JSON.parse(readFileSync(caminho!, "utf-8"));

    expect(conteudo.autos.status).toBe("vigente");
    expect(conteudo.autos.data_publicacao).toBe("2026-08-01");
    expect(conteudo.autos).not.toHaveProperty("data_criacao");
    expect(conteudo.autos.secoes[0].uuid).toBe(fixturaValida.autos.secoes[0].uuid);
  });
});
