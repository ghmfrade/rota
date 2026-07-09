import { expect, test } from "@playwright/test";
import fixturaValida from "../fixtures/tela-inicial-carregar-valido.json";

// E2E da casca do Formulário (Spec 04 §4/§11, TASK-014): cabeçalho persistente,
// stepper de 7 etapas livremente navegáveis (RN-078; Spec 04 §16 decisão 1) e
// painel de pendências vivo com navegação por clique. Nenhum fluxo aqui chama o
// OSRM (Spec 04 §3.1 item 6); o único recurso de rede é o bundle estático das
// listas.

async function carregarDocumentoValido(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByTestId("input-arquivo-json").setInputFiles({
    name: "valido.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixturaValida)),
  });
  await expect(page.getByTestId("layout-formulario")).toBeVisible();
}

test.describe("Casca do Formulário — carregar JSON existente", () => {
  test("monta a casca com cabeçalho do Autos e selo de status", async ({
    page,
  }) => {
    await carregarDocumentoValido(page);

    const cabecalho = page.getByTestId("cabecalho-formulario");
    await expect(cabecalho).toBeVisible();
    await expect(page.getByTestId("cabecalho-codigo")).toContainText(
      String(fixturaValida.autos.codigo),
    );
    await expect(page.getByTestId("selo-status")).toContainText(
      String(fixturaValida.autos.status),
    );
  });

  test("navegação livre: clicar cada etapa troca o conteúdo, cabeçalho persiste", async ({
    page,
  }) => {
    await carregarDocumentoValido(page);

    const etapas = page.getByTestId("etapa-botao");
    await expect(etapas).toHaveCount(7);

    const conteudo = page.getByTestId("conteudo-etapa");
    // A etapa inicial é Identificação.
    await expect(conteudo).toHaveAttribute("data-etapa-atual", "identificacao");

    // Percorre todas as 7 etapas em ordem: nenhuma troca é bloqueada (não é
    // wizard travado — Spec 04 §16 decisão 1).
    const ordem = [
      "identificacao",
      "servicos",
      "secoes-locais-itinerarios",
      "viagens-horarios",
      "matrizes",
      "revisao",
      "exportacao",
    ];
    for (const id of ordem) {
      await page.locator(`[data-testid="etapa-botao"][data-etapa="${id}"]`).click();
      await expect(conteudo).toHaveAttribute("data-etapa-atual", id);
      // Cabeçalho persiste em todas as etapas (Spec 04 §4).
      await expect(page.getByTestId("cabecalho-codigo")).toContainText(
        String(fixturaValida.autos.codigo),
      );
    }

    // Volta direto para uma etapa anterior: continua livre.
    await page
      .locator('[data-testid="etapa-botao"][data-etapa="servicos"]')
      .click();
    await expect(conteudo).toHaveAttribute("data-etapa-atual", "servicos");
  });
});

test.describe("Casca do Formulário — criar do zero e painel de pendências", () => {
  test("pendência clicável: alerta de documento do zero navega para a Revisão (§11, DEC-033)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("acao-criar-zero").getByRole("button").click();
    await page.getByTestId("confirmar-criar-zero").click();

    // Entrou na casca em modo "novo".
    await expect(page.getByTestId("layout-formulario")).toBeVisible();
    await expect(page.getByTestId("mensagem-novo-documento")).toBeVisible();

    // O painel de pendências mostra o alerta "documento criado do zero" (§11).
    const painel = page.getByTestId("painel-pendencias");
    await expect(painel).toBeVisible();
    const alerta = page.getByTestId("pendencia-item").filter({
      hasText: "Documento criado do zero",
    });
    await expect(alerta).toBeVisible();
    await expect(alerta).toHaveAttribute("data-severidade", "alerta");

    // Clicar navega para a etapa Revisão.
    await alerta.click();
    await expect(page.getByTestId("conteudo-etapa")).toHaveAttribute(
      "data-etapa-atual",
      "revisao",
    );
  });

  test("no modo novo a identidade fica 'a definir' e não há selo de status", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("acao-criar-zero").getByRole("button").click();
    await page.getByTestId("confirmar-criar-zero").click();

    await expect(page.getByTestId("cabecalho-codigo")).toContainText("a definir");
    await expect(page.getByTestId("selo-status")).toHaveCount(0);
  });
});
