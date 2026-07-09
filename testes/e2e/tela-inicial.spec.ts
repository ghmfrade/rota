import { expect, test } from "@playwright/test";
import fixturaValida from "../fixtures/tela-inicial-carregar-valido.json";

// E2E da Tela Inicial (Spec 04 §3, TASK-013): os dois fluxos de entrada do
// Formulário (carregar × criar do zero) e as mensagens obrigatórias da spec.
// Nenhum destes fluxos chama o OSRM (Spec 04 §3.1 item 6 — abrir não
// recalcula rota); o único recurso de rede é o bundle estático das listas.

test.describe("Tela Inicial — carregar JSON existente", () => {
  test("carregamento válido preserva UUIDs e exibe a mensagem obrigatória", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("input-arquivo-json").setInputFiles({
      name: "valido.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(fixturaValida)),
    });

    const sucesso = page.getByTestId("mensagem-sucesso-carregar");
    await expect(sucesso).toBeVisible();
    await expect(sucesso).toContainText(
      "As entidades existentes manterão suas UUIDs",
    );
  });

  test("JSON malformado bloqueia com a categoria json_invalido (Spec 04 §14)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("input-arquivo-json").setInputFiles({
      name: "invalido.json",
      mimeType: "application/json",
      buffer: Buffer.from("{ isso não é json"),
    });

    const erro = page.getByTestId("mensagem-erro-carregar");
    await expect(erro).toBeVisible();
    await expect(erro).toContainText(
      "O arquivo não é um JSON de operação válido",
    );
  });

  test("identidade inexistente na lista estática bloqueia o carregamento (RN-017)", async ({
    page,
  }) => {
    // Estrutura válida (schema/§14 passam) — só a identidade é desconhecida,
    // para isolar o bloqueio de RN-017 do bloqueio de RN-018 (estrutural).
    const documentoComIdentidadeObsoleta = structuredClone(fixturaValida) as {
      autos: { codigo: string; empresa: string };
    };
    documentoComIdentidadeObsoleta.autos.codigo = "codigo-que-nao-existe-9999";
    documentoComIdentidadeObsoleta.autos.empresa = "Empresa Que Não Existe Ltda.";

    await page.goto("/");
    await page.getByTestId("input-arquivo-json").setInputFiles({
      name: "identidade-obsoleta.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(documentoComIdentidadeObsoleta)),
    });

    const erro = page.getByTestId("mensagem-erro-carregar");
    await expect(erro).toBeVisible();
    await expect(erro).toContainText("não consta na lista atual");
  });
});

test.describe("Tela Inicial — criar Autos do zero", () => {
  test("exibe o aviso obrigatório antes de prosseguir (Spec 04 §3.2)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("acao-criar-zero").getByRole("button").click();

    const aviso = page.getByTestId("aviso-criar-zero");
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText(
      "não haverá preservação de identidade das entidades",
    );

    await page.getByTestId("confirmar-criar-zero").click();
    await expect(page.getByTestId("mensagem-novo-documento")).toBeVisible();
  });
});

test("caminho de carregar é destacado como recomendado", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("acao-carregar")).toContainText("Recomendado");
});
