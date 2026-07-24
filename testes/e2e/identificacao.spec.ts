import { expect, test } from "@playwright/test";
import fixturaValida from "../fixtures/tela-inicial-carregar-valido.json";

// E2E da etapa Identificação (Spec 04 §5; TASK-015; TASK-075/DEC-064). Cobre
// os dois modos de entrada: carregado (identidade do JSON) e novo (seleção
// das listas estáticas — RN-016, com pré-visualização trocável e confirmação
// explícita antes de congelar). Prova que `codigo`/`empresa` não são
// editáveis (Spec 04 §5), que o `tipo` é editável e que trocá-lo reconverte
// os Serviços incompatíveis à forma convencional com aviso, sem bloquear
// (RN-023/DEC-034). Nenhum fluxo chama o OSRM (Spec 04 §3.1 item 6); o único
// recurso de rede é o bundle estático.

async function carregarDocumentoValido(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByTestId("input-arquivo-json").setInputFiles({
    name: "valido.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixturaValida)),
  });
  await expect(page.getByTestId("layout-formulario")).toBeVisible();
}

async function criarDoZero(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByTestId("acao-criar-zero").getByRole("button").click();
  await page.getByTestId("confirmar-criar-zero").click();
  await expect(page.getByTestId("layout-formulario")).toBeVisible();
}

test.describe("Identificação — modo carregado", () => {
  test("exibe identidade do JSON; código e empresa não são editáveis", async ({
    page,
  }) => {
    await carregarDocumentoValido(page);

    const etapa = page.getByTestId("etapa-identificacao");
    await expect(etapa).toBeVisible();
    await expect(page.getByTestId("campo-codigo")).toContainText(
      String(fixturaValida.autos.codigo),
    );
    await expect(page.getByTestId("campo-empresa")).toContainText(
      String(fixturaValida.autos.empresa),
    );
    await expect(page.getByTestId("selo-status-identificacao")).toContainText(
      String(fixturaValida.autos.status),
    );

    // Spec 04 §5: código e empresa não editáveis após criado o documento —
    // são texto, não há campo de edição (nenhum textbox na etapa).
    await expect(etapa.getByRole("textbox")).toHaveCount(0);
  });

  test("trocar o tipo reconverte os Serviços incompatíveis com aviso (RN-023/DEC-034)", async ({
    page,
  }) => {
    await carregarDocumentoValido(page);

    // Fixtura é Semiurbano (Serviço SU). Trocar para Rodoviário torna SU
    // incompatível → reconvertido ao padrão CR, com aviso, sem bloqueio.
    await page.getByTestId("select-tipo").selectOption("Rodoviário");

    const aviso = page.getByTestId("aviso-reconversao");
    await expect(aviso).toBeVisible();
    const item = page.getByTestId("item-reconversao");
    await expect(item).toHaveCount(1);
    await expect(item).toContainText("SU");
    await expect(item).toContainText("CR");

    // O cabeçalho persistente reflete o novo tipo reativamente (Spec 04 §4).
    const cabecalho = page.getByTestId("cabecalho-formulario");
    await expect(cabecalho).toContainText("Rodoviário");

    // Voltar a um tipo compatível com CR (Rodoviário) não gera novo aviso.
    await page.getByTestId("select-tipo").selectOption("Rodoviário Litorâneo");
    // CR é incompatível no Litorâneo → reconverte para CL (novo aviso).
    await expect(page.getByTestId("item-reconversao")).toContainText("CL");
  });
});

test.describe("Identificação — modo novo (criar do zero)", () => {
  test("escolher o Autos exibe a pré-visualização sem criar o documento; confirmar comita e trava (DEC-064)", async ({
    page,
  }) => {
    await criarDoZero(page);

    // Antes de escolher, a etapa mostra o seletor e o cabeçalho fica "a definir".
    await expect(page.getByTestId("seletor-autos")).toBeVisible();
    await expect(page.getByTestId("cabecalho-codigo")).toContainText(
      "a definir",
    );
    // Sem candidato, "Confirmar Autos" está desabilitado (caso inválido).
    await expect(page.getByTestId("confirmar-autos")).toBeDisabled();

    // Seleciona o Autos de código "1" (existe nas listas estáticas — RN-016):
    // só popula a pré-visualização, NÃO cria o documento ainda.
    await page.getByTestId("seletor-autos").selectOption("1");

    const previa = page.getByTestId("previa-autos");
    await expect(previa).toBeVisible();
    await expect(previa).toContainText("1");
    await expect(page.getByTestId("selo-situacao-previa")).toBeVisible();
    // Ainda não comitado: sem campo travado nem cabeçalho atualizado.
    await expect(page.getByTestId("campo-codigo")).toHaveCount(0);
    await expect(page.getByTestId("cabecalho-codigo")).toContainText(
      "a definir",
    );

    // Trocar a seleção antes de confirmar atualiza a pré-visualização, livre.
    await page.getByTestId("seletor-autos").selectOption("2");
    await expect(previa).toContainText("2");

    // "Confirmar Autos" cria o documento: identidade travada, status proposta.
    await page.getByTestId("confirmar-autos").click();

    await expect(page.getByTestId("campo-codigo")).toContainText("2");
    await expect(page.getByTestId("campo-empresa")).not.toBeEmpty();
    // Documento novo nasce como proposta (RN-011).
    await expect(page.getByTestId("selo-status-identificacao")).toContainText(
      "proposta",
    );
    // Cabeçalho reflete a identidade recém-confirmada.
    await expect(page.getByTestId("cabecalho-codigo")).toContainText("2");
    await expect(page.getByTestId("selo-status")).toBeVisible();

    // Depois de confirmado, o seletor não é mais renderizado — sem troca
    // (Spec 04 §5).
    await expect(page.getByTestId("seletor-autos")).toHaveCount(0);
    await expect(page.getByTestId("confirmar-autos")).toHaveCount(0);

    // Código/empresa travados: sem campo de edição.
    await expect(
      page.getByTestId("etapa-identificacao").getByRole("textbox"),
    ).toHaveCount(0);
  });

  test("Autos operante reforça a recomendação de carregar o JSON vigente (Spec 04 §3.1)", async ({
    page,
  }) => {
    await criarDoZero(page);
    await page.getByTestId("seletor-autos").selectOption("1");

    // Todos os Autos das listas estáticas são operantes (dado atual — o
    // reforço é o ramo exercitável em E2E; o ramo "não operante" é coberto
    // por teste unitário do helper puro).
    await expect(page.getByTestId("reforco-operante")).toBeVisible();
  });

  test("trocar o tipo no modo novo ajusta o tipo sem aviso (não há Serviços)", async ({
    page,
  }) => {
    await criarDoZero(page);
    await page.getByTestId("seletor-autos").selectOption("1");
    await page.getByTestId("confirmar-autos").click();

    await page.getByTestId("select-tipo").selectOption("Rodoviário");
    await expect(page.getByTestId("cabecalho-formulario")).toContainText(
      "Rodoviário",
    );
    // Sem Serviços, nada a reconverter → sem aviso.
    await expect(page.getByTestId("aviso-reconversao")).toHaveCount(0);
  });
});
