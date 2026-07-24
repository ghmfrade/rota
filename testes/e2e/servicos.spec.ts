import { expect, test } from "@playwright/test";
import multiServico from "../fixtures/carregar-multi-servico.json";

// E2E da etapa Serviços (Spec 04 §6; TASK-016). Dirige o fluxo de documento
// criado do zero (modo novo), onde os Serviços vivem como estado de sessão em
// construção (DEC-035) — não há banco (RN-096/NEG-009), é tudo memória. Prova as
// quatro ações da §6: criar (numero_n sugerido, dropdown filtrado pela
// tipificação, caráter, direcionalidade), editar (sufixo do numero_n regenerado
// na troca de característica — DEC-037), duplicar (item novo) e remover (com
// confirmação explícita). Nenhum fluxo chama o OSRM; o único recurso de rede é o
// bundle estático.

async function novoAutosRodoviario(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByTestId("acao-criar-zero").getByRole("button").click();
  await page.getByTestId("confirmar-criar-zero").click();
  await expect(page.getByTestId("layout-formulario")).toBeVisible();
  // Seleciona um Autos das listas, confirma (TASK-075/DEC-064) e fixa o tipo
  // Rodoviário (dropdown de característica vira o conjunto rodoviário; padrão CR).
  await page.getByTestId("seletor-autos").selectOption("1");
  await page.getByTestId("confirmar-autos").click();
  await page.getByTestId("select-tipo").selectOption("Rodoviário");
  // Navega para a etapa Serviços (stepper de navegação livre — RN-078).
  await page.getByTestId("etapa-botao").filter({ hasText: "Serviços" }).click();
  await expect(page.getByTestId("etapa-servicos")).toBeVisible();
}

test.describe("Serviços — modo novo (criar do zero)", () => {
  test("criar Serviço: numero_n sugerido, dropdown filtrado pelo tipo, caráter e direcionalidade", async ({
    page,
  }) => {
    await novoAutosRodoviario(page);
    await expect(page.getByTestId("servicos-vazio")).toBeVisible();

    await page.getByTestId("servico-criar").click();

    // numero_n sugerido: "<codigo>-1CR" (codigo do Autos "1", padrão CR).
    await expect(page.getByTestId("form-numero-n")).toHaveValue("1-1CR");

    // Dropdown filtrado pela tipificação (Spec 03 §10.2): sem SU/SUL (semiurbano)
    // no Autos Rodoviário (RN-019).
    const opcoes = page.getByTestId("form-caracteristica").locator("option");
    await expect(opcoes).toHaveText(["CR", "EX", "LE", "ME", "ML", "MX", "MM"]);

    await page.getByTestId("form-carater").selectOption("parcial");
    await page.getByTestId("form-direcionalidade").selectOption("ida");
    await page.getByTestId("form-salvar").click();

    const item = page.getByTestId("servico-item");
    await expect(item).toHaveCount(1);
    await expect(page.getByTestId("servico-numero-n")).toHaveText("1-1CR");
    await expect(page.getByTestId("servico-caracteristica")).toHaveText("CR");
    await expect(page.getByTestId("servico-carater")).toHaveText("parcial");
    await expect(page.getByTestId("servico-direcionalidade")).toHaveText("Ida");
    // Serviço em construção: marcado como sem itinerário ainda (DEC-035).
    await expect(page.getByTestId("servico-em-construcao")).toBeVisible();
    // Contadores de viagens semanais (Spec 04 §6, último marcador; TASK-057):
    // sem itinerário ainda, viagensSemana(undefined) = 0 (DEC-035).
    await expect(page.getByTestId("servico-viagens-semana")).toHaveText(
      "Ida 0 · Volta 0 · Total 0",
    );
  });

  test("editar Serviço: trocar a característica regenera o sufixo do numero_n (DEC-037)", async ({
    page,
  }) => {
    await novoAutosRodoviario(page);
    await page.getByTestId("servico-criar").click();
    await page.getByTestId("form-salvar").click();

    await page.getByTestId("servico-editar").click();
    await page.getByTestId("form-caracteristica").selectOption("EX");
    // Sufixo regenerado no próprio formulário, preservando o sequencial.
    await expect(page.getByTestId("form-numero-n")).toHaveValue("1-1EX");
    await page.getByTestId("form-salvar").click();

    await expect(page.getByTestId("servico-numero-n")).toHaveText("1-1EX");
    await expect(page.getByTestId("servico-caracteristica")).toHaveText("EX");
  });

  test("duplicar Serviço cria um item novo com numero_n sequencial", async ({
    page,
  }) => {
    await novoAutosRodoviario(page);
    await page.getByTestId("servico-criar").click();
    await page.getByTestId("form-salvar").click();

    await page.getByTestId("servico-duplicar").click();

    await expect(page.getByTestId("servico-item")).toHaveCount(2);
    const numeros = await page.getByTestId("servico-numero-n").allTextContents();
    expect(numeros).toEqual(["1-1CR", "1-2CR"]);
  });

  test("remover Serviço exige confirmação explícita (Spec 04 §6)", async ({
    page,
  }) => {
    await novoAutosRodoviario(page);
    await page.getByTestId("servico-criar").click();
    await page.getByTestId("form-salvar").click();
    await page.getByTestId("servico-duplicar").click();
    await expect(page.getByTestId("servico-item")).toHaveCount(2);

    // Primeiro clique só arma a confirmação; a lista não muda.
    await page.getByTestId("servico-remover").first().click();
    await expect(page.getByTestId("servico-item")).toHaveCount(2);

    await page.getByTestId("servico-remover-confirmar").click();
    await expect(page.getByTestId("servico-item")).toHaveCount(1);
  });
});

async function carregarMultiServico(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByTestId("input-arquivo-json").setInputFiles({
    name: "multi.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(multiServico)),
  });
  await expect(page.getByTestId("layout-formulario")).toBeVisible();
  await page.getByTestId("etapa-botao").filter({ hasText: "Serviços" }).click();
  await expect(page.getByTestId("etapa-servicos")).toBeVisible();
}

test.describe("Serviços — modo carregado (Serviços completos do JSON)", () => {
  test("lista os Serviços completos do documento (sem marca de em construção)", async ({
    page,
  }) => {
    await carregarMultiServico(page);

    await expect(page.getByTestId("servico-item")).toHaveCount(2);
    // Serviços completos: bidirecionais (Ida e Volta) e sem a marca de sessão.
    await expect(page.getByTestId("servico-em-construcao")).toHaveCount(0);
    await expect(
      page.getByTestId("servico-direcionalidade").first(),
    ).toHaveText("Ida e Volta");
    // Contadores de viagens semanais (Spec 04 §6, último marcador; TASK-057):
    // cada Serviço da fixture tem 1 Viagem de Ida e 1 de Volta, nenhuma
    // feriado — reusa `contarServico()` de `shared/contagens` (RN-072).
    await expect(
      page.getByTestId("servico-viagens-semana").first(),
    ).toHaveText("Ida 1 · Volta 1 · Total 2");
    await expect(
      page.getByTestId("servicos-rotulo-semana-padrao"),
    ).toHaveText("semana padrão (sem feriados)");
  });

  test("editar um Serviço completo: direcionalidade é somente-leitura; caráter muda", async ({
    page,
  }) => {
    await carregarMultiServico(page);

    await page.getByTestId("servico-editar").first().click();
    // Serviço completo tem itinerários — trocar sentidos é da etapa de mapa.
    await expect(page.getByTestId("form-direcionalidade")).toBeDisabled();
    await page.getByTestId("form-carater").selectOption("semidireta");
    await page.getByTestId("form-salvar").click();

    await expect(page.getByTestId("servico-carater").first()).toHaveText(
      "semidireta",
    );
  });

  test("a sexta coluna (viagens semanais) não força rolagem horizontal no body (doc 18 §1.5)", async ({
    page,
  }) => {
    await carregarMultiServico(page);

    const bodyOverflowX = await page.evaluate(
      () => document.body.scrollWidth <= document.body.clientWidth + 1,
    );
    expect(bodyOverflowX).toBe(true);
  });

  test("duplicar e remover Serviço completo via UI (RN-007/RN-018)", async ({
    page,
  }) => {
    await carregarMultiServico(page);

    await page.getByTestId("servico-duplicar").first().click();
    await expect(page.getByTestId("servico-item")).toHaveCount(3);

    // Remover com confirmação explícita.
    await page.getByTestId("servico-remover").first().click();
    await page.getByTestId("servico-remover-confirmar").click();
    await expect(page.getByTestId("servico-item")).toHaveCount(2);
  });
});
