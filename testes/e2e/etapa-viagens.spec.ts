import { expect, test, type Locator, type Page } from "@playwright/test";
import multiServico from "../fixtures/carregar-multi-servico.json";

// E2E da etapa "Viagens e horários" — grades de dias comuns e de feriados
// (TASK-028/029/030; Spec 04 §8). Usa o Serviço 0001-1SU do fixture
// `carregar-multi-servico` (sentido Ida: Santos → São Vicente → Praia Grande,
// trechos de 1080s/720s, 1 Viagem gravada na segunda às 08:00, offsets 0/40/60
// min). A etapa só lê `rota.trechos` já congelada para a sugestão inicial
// (RN-064) — nenhuma chamada ao OSRM é esperada. Baseline do itinerário
// (Spec 03 §8.1): 0 / 18 / 30 min. Como há duas grades com os mesmos testids,
// os seletores são escopados à seção da grade em teste.

function gradeComum(page: Page) {
  return page.getByTestId("grade-dias-comuns");
}
function gradeFeriados(page: Page) {
  return page.getByTestId("grade-feriados");
}

async function preencherEConfirmar(
  campo: Locator,
  valor: string,
  tecla: "Enter" | "Tab" = "Enter",
) {
  await campo.fill(valor);
  await campo.press(tecla);
}

async function abrirEtapaViagens(page: Page, documento: unknown) {
  await page.goto("/");
  await page.getByTestId("input-arquivo-json").setInputFiles({
    name: "viagens.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(documento)),
  });
  await expect(page.getByTestId("layout-formulario")).toBeVisible();

  await page.getByTestId("etapa-botao").filter({ hasText: "Viagens e horários" }).click();
  await expect(page.getByTestId("etapa-viagens")).toBeVisible();

  await page.getByTestId("select-servico-viagens").selectOption({ label: "0001-1SU" });
  await page.getByTestId("select-sentido-viagens").selectOption({ label: "Ida" });
  await expect(page.getByTestId("grade-dias-comuns")).toBeVisible();
}

test.describe("Etapa Viagens e horários — grade de dias comuns (Spec 04 §8.1/§8.2)", () => {
  test("campo é somente digitação, aceita horário sem ':' e reordena temporalmente", async ({
    page,
  }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    // TASK-106: nenhum input nativo `time` — clicar só dá foco, sem seletor.
    await expect(grade.locator('input[type="time"]')).toHaveCount(0);
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 1")).toHaveAttribute(
      "type",
      "text",
    );

    // Digitação rápida sem ":" é normalizada. Uma partida posterior inserida
    // com 0700 sobe acima da Viagem gravada das 08:00.
    await preencherEConfirmar(grade.getByLabel("Criar viagem — segunda"), "0700");
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 1")).toHaveValue("07:00");
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 2")).toHaveValue("08:00");

    // Três algarismos também são aceitos e normalizados.
    await preencherEConfirmar(
      grade.getByLabel("Horário de partida — segunda, viagem 1"),
      "730",
    );
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 1")).toHaveValue("07:30");
  });

  test("TASK-116: mantém 10:32 como rascunho até Enter, sem criar 01:03", async ({ page }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);
    const criavel = grade.getByLabel("Criar viagem — terca");
    const partidasAntes = await grade.getByTestId("celula-partida").count();

    await criavel.pressSequentially("10:32");
    await expect(criavel).toHaveValue("10:32");
    await expect(grade.getByTestId("celula-partida")).toHaveCount(partidasAntes);
    await expect(grade.locator('input[value="01:03"]')).toHaveCount(0);

    await criavel.press("Enter");
    await expect(grade.getByLabel("Horário de partida — terca, viagem 1")).toHaveValue("10:32");
    await expect(grade.getByTestId("celula-partida")).toHaveCount(partidasAntes + 1);
    expect(chamouOsrm).toBe(false);
  });

  test("TASK-116: Tab confirma uma vez e blur descarta rascunho", async ({ page }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);
    const criavel = grade.getByLabel("Criar viagem — terca");

    await criavel.fill("1032");
    await expect(grade.getByTestId("celula-partida")).toHaveCount(1);
    await criavel.press("Tab");
    await expect(grade.getByLabel("Horário de partida — terca, viagem 1")).toHaveValue("10:32");
    await expect(grade.getByLabel("Criar viagem — quarta")).toBeFocused();

    const partidaSegunda = grade.getByLabel("Horário de partida — segunda, viagem 1");
    await partidaSegunda.fill("10:32");
    await partidaSegunda.blur();
    await expect(partidaSegunda).toHaveValue("08:00");
  });

  test("seleção forma superfície contínua; ações aparecem só no hover; Tab navega", async ({
    page,
  }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);
    const partida = grade.getByLabel("Horário de partida — segunda, viagem 1");
    const celulaPartida = partida.locator("xpath=ancestor::td");
    const viagemUuid = await celulaPartida.getAttribute("data-viagem-uuid");
    expect(viagemUuid).toBeTruthy();

    await partida.click();
    await grade.getByRole("columnheader", { name: "DOM" }).hover();
    await expect(
      grade.locator(
        `[data-viagem-uuid="${viagemUuid}"][data-superficie-viagem="inicio"]`,
      ),
    ).toHaveCount(1);
    await expect(
      grade.locator(`[data-viagem-uuid="${viagemUuid}"][data-superficie-viagem="meio"]`),
    ).toHaveCount(1);
    await expect(
      grade.locator(`[data-viagem-uuid="${viagemUuid}"][data-superficie-viagem="fim"]`),
    ).toHaveCount(1);
    await expect(
      grade.locator(`[data-viagem-uuid="${viagemUuid}"][data-superficie-viagem]`).first(),
    ).not.toHaveClass(/ring-2/);

    const acoes = celulaPartida.getByTestId("acoes-viagem");
    await expect(acoes).toHaveCSS("opacity", "0");
    await grade.getByTestId("celula-passante").first().hover();
    await expect(acoes).toHaveCSS("opacity", "1");
    await grade.getByRole("columnheader", { name: "DOM" }).hover();
    await expect(acoes).toHaveCSS("opacity", "0");
    await expect(
      grade.locator(`[data-viagem-uuid="${viagemUuid}"][data-superficie-viagem]`),
    ).toHaveCount(3);

    await partida.press("Tab");
    await expect(grade.getByLabel("Criar viagem — terca")).toBeFocused();
    await grade.getByLabel("Criar viagem — terca").press("Tab");
    await expect(grade.getByLabel("Criar viagem — quarta")).toBeFocused();
  });

  test("Enter atravessa Viagens e alcança a célula criável", async ({ page }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    await preencherEConfirmar(grade.getByLabel("Criar viagem — segunda"), "09:00");
    const ultimaSecaoPrimeiraViagem = grade.getByLabel(
      /Horário de passagem — Praia Grande - Rodoviária Praia Grande, segunda, viagem 1/,
    );
    const partidaSegundaViagem = grade.getByLabel("Horário de partida — segunda, viagem 2");
    const ultimaSecaoSegundaViagem = grade.getByLabel(
      /Horário de passagem — Praia Grande - Rodoviária Praia Grande, segunda, viagem 2/,
    );

    await ultimaSecaoPrimeiraViagem.press("Enter");
    await expect(partidaSegundaViagem).toBeFocused();
    await ultimaSecaoSegundaViagem.press("Enter");
    await expect(grade.getByLabel("Criar viagem — segunda")).toBeFocused();
  });

  test("Tab seleciona o dia seguinte sem acionar hover ou ações da Viagem", async ({ page }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });

    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);
    await preencherEConfirmar(grade.getByLabel("Criar viagem — terca"), "09:00");

    const partidaSegunda = grade.getByLabel("Horário de partida — segunda, viagem 1");
    const partidaTerca = grade.getByLabel("Horário de partida — terca, viagem 1");
    const celulaTerca = partidaTerca.locator("xpath=ancestor::td");

    await grade.getByRole("columnheader", { name: "DOM" }).hover();
    await partidaSegunda.focus();
    await partidaSegunda.press("Tab");

    await expect(partidaTerca).toBeFocused();
    await expect(celulaTerca).toHaveAttribute("data-selecionada", "true");
    await expect(celulaTerca.getByTestId("acoes-viagem")).toHaveCSS("opacity", "0");
    await expect(celulaTerca.getByTestId("acao-inserir-anterior")).toHaveCSS("opacity", "0");
    expect(chamouOsrm).toBe(false);
  });

  test("Viagem gravada aparece com horários propagados por Seção; dias sem Viagem mostram célula criável", async ({
    page,
  }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });

    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    // 3 Seções por bloco (Santos, São Vicente, Praia Grande); só segunda tem
    // Viagem gravada, então a grade tem 2 blocos (existente + criável) = 6 linhas.
    await expect(grade.getByTestId("linha-grade")).toHaveCount(6);

    // segunda: Viagem existente — 1ª Seção editável com 08:00, demais Seções
    // (agora inputs editáveis — TASK-029) somam o offset gravado.
    await expect(
      grade.getByLabel("Horário de partida — segunda, viagem 1"),
    ).toHaveValue("08:00");
    const linhas = grade.getByTestId("linha-grade");
    await expect(linhas.nth(1).getByTestId("celula-passante").locator("input[data-grade]")).toHaveValue("08:40");
    await expect(linhas.nth(2).getByTestId("celula-passante").locator("input[data-grade]")).toHaveValue("09:00");

    // terça (sem Viagem): 1ª Seção mostra a célula criável.
    await expect(grade.getByLabel("Criar viagem — terca")).toBeVisible();

    expect(chamouOsrm).toBe(false);
  });

  test("preencher a 1ª Seção de um dia sem Viagem cria a Viagem com sugestão inicial (RN-061/064/067)", async ({
    page,
  }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    await preencherEConfirmar(grade.getByLabel("Criar viagem — terca"), "09:00");

    // A Viagem nasce e passa a ser exibida como partida editável.
    await expect(grade.getByLabel("Horário de partida — terca, viagem 1")).toHaveValue("09:00");

    // Sugestão inicial (Spec 03 §8.1): acumula 1080s (18min) e depois 720s (12min).
    // terça é a 2ª coluna com Viagem na linha (segunda é a 1ª) → nth(1).
    const linhas = grade.getByTestId("linha-grade");
    await expect(
      linhas.nth(1).getByTestId("celula-passante").nth(1).locator("input[data-grade]"),
    ).toHaveValue("09:18");
    await expect(
      linhas.nth(2).getByTestId("celula-passante").nth(1).locator("input[data-grade]"),
    ).toHaveValue("09:30");

    // Uma nova célula criável surge para a próxima partida de terça.
    await expect(grade.getByLabel("Criar viagem — terca")).toBeVisible();
  });

  test("TASK-115: foco acompanha a Viagem criada/reordenada e a redistribuição, sem Tab de recuperação", async ({
    page,
  }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });

    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    // A nova Viagem sobe acima da partida das 08:00; Enter confirma e segue
    // para a Seção seguinte dessa mesma UUID (TASK-106/TASK-115).
    await preencherEConfirmar(grade.getByLabel("Criar viagem — segunda"), "0700");
    const partidaCriada = grade.getByLabel("Horário de partida — segunda, viagem 1");
    await expect(partidaCriada).toHaveValue("07:00");
    const viagemUuid = await partidaCriada.getAttribute("data-viagem-uuid");
    expect(viagemUuid).toBeTruthy();

    const passagemIntermediaria = grade.locator(
      `input[data-viagem-uuid="${viagemUuid}"][data-secao-index="1"]`,
    );
    await expect(passagemIntermediaria).toBeFocused();
    // Tab mantém o mapa da TASK-106 sem exigir uma tecla intermediária para
    // recuperar o foco.
    await partidaCriada.focus();
    await partidaCriada.press("Tab");
    await expect(grade.getByLabel("Criar viagem — terca")).toBeFocused();

    const passagemFinal = grade.locator(
      `input[data-viagem-uuid="${viagemUuid}"][data-secao-index="2"]`,
    );
    await preencherEConfirmar(passagemFinal, "07:50");
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 2")).toBeFocused();

    // Fora-de-ordem não confirma, conserva o erro e o próprio campo em foco.
    await preencherEConfirmar(passagemIntermediaria, "07:55");
    await expect(passagemIntermediaria).toBeFocused();
    await expect(passagemIntermediaria).toHaveValue("07:30");
    await expect(passagemIntermediaria.locator("xpath=ancestor::td").getByTestId("erro-passante")).toBeVisible();

    // Horário impossível não cria Viagem nem desloca o foco.
    const criavelTerca = grade.getByLabel("Criar viagem — terca");
    const partidasAntes = await grade.getByTestId("celula-partida").count();
    await preencherEConfirmar(criavelTerca, "2575");
    await expect(criavelTerca).toBeFocused();
    await expect(grade.getByTestId("celula-partida")).toHaveCount(partidasAntes);

    // A grade de feriados reutiliza exatamente o mesmo mecanismo.
    const feriados = gradeFeriados(page);
    await preencherEConfirmar(feriados.getByLabel("Criar viagem — terca"), "0900");
    await expect(
      feriados.locator('input[data-dia="terca"][data-secao-index="1"]'),
    ).toBeFocused();
    expect(chamouOsrm).toBe(false);
  });

  test("reeditar a partida desloca todos os horários pelo mesmo delta, preservando os offsets (TASK-029)", async ({
    page,
  }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    // Offsets gravados são 0/40/60 min. Mover a partida 08:00 → 10:00 desloca
    // tudo +2h, SEM re-derivar pela sugestão inicial (offsets preservados).
    const partida = grade.getByLabel("Horário de partida — segunda, viagem 1");
    await preencherEConfirmar(partida, "10:00");

    await expect(partida).toHaveValue("10:00");
    const linhas = grade.getByTestId("linha-grade");
    await expect(linhas.nth(1).getByTestId("celula-passante").locator("input[data-grade]")).toHaveValue("10:40");
    await expect(linhas.nth(2).getByTestId("celula-passante").locator("input[data-grade]")).toHaveValue("11:00");
  });

  test("inserção relativa cria Viagem no mesmo dia, herda offsets e só aparece no hover (TASK-107)", async ({
    page,
  }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });

    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);
    const partidaOrigem = grade.getByLabel("Horário de partida — segunda, viagem 1");
    const celulaOrigem = partidaOrigem.locator("xpath=ancestor::td");
    const viagemUuid = await celulaOrigem.getAttribute("data-viagem-uuid");
    expect(viagemUuid).toBeTruthy();
    const celulaFinalOrigem = grade
      .locator(`[data-testid="celula-passante"][data-viagem-uuid="${viagemUuid}"]`)
      .last();

    await celulaOrigem.hover();
    const acaoAnterior = celulaOrigem.getByTestId("acao-inserir-anterior");
    const acaoPosterior = celulaFinalOrigem.getByTestId("acao-inserir-posterior");
    await expect(acaoAnterior).toHaveCSS("opacity", "1");
    await expect(acaoPosterior).toHaveCSS("opacity", "1");
    await expect(acaoAnterior).toBeInViewport({ ratio: 1 });
    await acaoAnterior.hover();
    await page.waitForTimeout(350);
    await expect(acaoAnterior).toHaveCSS("opacity", "1");
    await expect(celulaOrigem.getByLabel("Deslocamento anterior — segunda, viagem 1")).toHaveValue(
      "00:10",
    );
    await expect(
      celulaFinalOrigem.getByLabel("Deslocamento posterior — segunda, viagem 1"),
    ).toHaveValue("00:10");

    const [
      caixaOrigem,
      caixaFinal,
      caixaAcaoAnterior,
      caixaAcaoPosterior,
      caixaRestaurar,
      caixaApagar,
      caixaCampoAnterior,
      caixaCampoPosterior,
      caixaSetaAnterior,
      caixaSetaPosterior,
    ] = await Promise.all([
      celulaOrigem.boundingBox(),
      celulaFinalOrigem.boundingBox(),
      acaoAnterior.boundingBox(),
      acaoPosterior.boundingBox(),
      celulaOrigem.getByTestId("restaurar-viagem").boundingBox(),
      celulaOrigem.getByTestId("apagar-viagem").boundingBox(),
      celulaOrigem.getByLabel("Deslocamento anterior — segunda, viagem 1").boundingBox(),
      celulaFinalOrigem.getByLabel("Deslocamento posterior — segunda, viagem 1").boundingBox(),
      celulaOrigem.getByTestId("inserir-viagem-anterior").boundingBox(),
      celulaFinalOrigem.getByTestId("inserir-viagem-posterior").boundingBox(),
    ]);
    expect(caixaOrigem).not.toBeNull();
    expect(caixaFinal).not.toBeNull();
    expect(caixaAcaoAnterior).not.toBeNull();
    expect(caixaAcaoPosterior).not.toBeNull();
    expect(caixaRestaurar).not.toBeNull();
    expect(caixaApagar).not.toBeNull();
    expect(caixaCampoAnterior).not.toBeNull();
    expect(caixaCampoPosterior).not.toBeNull();
    expect(caixaSetaAnterior).not.toBeNull();
    expect(caixaSetaPosterior).not.toBeNull();

    expect(caixaAcaoAnterior!.y + caixaAcaoAnterior!.height).toBeLessThanOrEqual(
      caixaOrigem!.y + 1,
    );
    expect(caixaAcaoPosterior!.y).toBeGreaterThanOrEqual(
      caixaFinal!.y + caixaFinal!.height - 1,
    );
    expect(caixaApagar!.x + caixaApagar!.width / 2).toBeGreaterThan(
      caixaOrigem!.x + caixaOrigem!.width / 2,
    );
    expect(caixaRestaurar!.x).toBeCloseTo(caixaApagar!.x, 0);
    expect(caixaRestaurar!.y).toBeGreaterThanOrEqual(caixaApagar!.y + caixaApagar!.height);
    expect(caixaRestaurar!.width).toBeCloseTo(caixaApagar!.width, 0);
    expect(caixaRestaurar!.height).toBeCloseTo(caixaApagar!.height, 0);
    expect(caixaApagar!.x).toBeCloseTo(caixaOrigem!.x + caixaOrigem!.width, 0);
    await expect(celulaOrigem.getByTestId("restaurar-viagem")).toHaveClass(/bg-azul-600/);
    expect(caixaCampoAnterior!.width).toBeGreaterThanOrEqual(80);
    expect(caixaCampoPosterior!.width).toBeGreaterThanOrEqual(80);
    expect(caixaSetaAnterior!.width).toBeGreaterThanOrEqual(40);
    expect(caixaSetaPosterior!.width).toBeGreaterThanOrEqual(40);

    await celulaFinalOrigem.getByLabel("Deslocamento posterior — segunda, viagem 1").fill("01:10");
    await celulaFinalOrigem.getByLabel("Inserir viagem depois — segunda, viagem 1").click();

    await expect(grade.getByLabel("Horário de partida — segunda, viagem 1")).toHaveValue("08:00");
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 2")).toHaveValue("09:10");
    const linhas = grade.getByTestId("linha-grade");
    await expect(linhas.nth(4).getByTestId("celula-passante").locator("input[data-grade]")).toHaveValue("09:50");
    await expect(linhas.nth(5).getByTestId("celula-passante").locator("input[data-grade]")).toHaveValue("10:10");

    await grade.getByRole("columnheader", { name: "DOM" }).hover();
    await expect(celulaOrigem.getByTestId("acao-inserir-anterior")).toHaveCSS("opacity", "0");
    expect(chamouOsrm).toBe(false);
  });

  test("reutiliza os últimos deslocamentos válidos por direção na instância da etapa (TASK-113)", async ({
    page,
  }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });

    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);
    const celulaOrigem = grade.getByTestId("celula-partida").first();
    const viagemOrigemUuid = await celulaOrigem.getAttribute("data-viagem-uuid");
    expect(viagemOrigemUuid).toBeTruthy();
    const celulaFinalOrigem = grade
      .locator(`[data-testid="celula-passante"][data-viagem-uuid="${viagemOrigemUuid}"]`)
      .last();

    await celulaOrigem.hover();
    await celulaOrigem.getByLabel(/Deslocamento anterior/).fill("00:07");
    await celulaOrigem.getByLabel(/Inserir viagem antes/).click();

    await celulaOrigem.hover();
    await celulaFinalOrigem.getByLabel(/Deslocamento posterior/).fill("00:25");
    await celulaFinalOrigem.getByLabel(/Inserir viagem depois/).click();
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 3")).toHaveValue(
      "08:25",
    );

    // A grade de feriados recebe novas Viagens, mas os dois deslocamentos são
    // conveniência da mesma instância aberta da etapa (DEC-091).
    const feriados = gradeFeriados(page);
    await feriados.getByTestId("copiar-dias-comuns").click();
    const celulaFeriado = feriados.getByTestId("celula-partida").first();
    const viagemFeriadoUuid = await celulaFeriado.getAttribute("data-viagem-uuid");
    expect(viagemFeriadoUuid).toBeTruthy();
    const celulaFinalFeriado = feriados
      .locator(`[data-testid="celula-passante"][data-viagem-uuid="${viagemFeriadoUuid}"]`)
      .last();
    await celulaFeriado.hover();
    await expect(celulaFeriado.getByLabel(/Deslocamento anterior/)).toHaveValue("00:07");
    await expect(celulaFinalFeriado.getByLabel(/Deslocamento posterior/)).toHaveValue("00:25");

    await page.getByTestId("select-servico-viagens").selectOption({ label: "0001-2SU" });
    await page.getByTestId("select-sentido-viagens").selectOption({ label: "Ida" });
    const celulaOutroServico = grade.getByTestId("celula-partida").first();
    await celulaOutroServico.hover();
    await expect(celulaOutroServico.getByLabel(/Deslocamento anterior/)).toHaveValue("00:07");

    await page.getByTestId("select-sentido-viagens").selectOption({ label: "Volta" });
    const celulaOutroSentido = grade.getByTestId("celula-partida").first();
    const viagemOutroSentidoUuid = await celulaOutroSentido.getAttribute("data-viagem-uuid");
    expect(viagemOutroSentidoUuid).toBeTruthy();
    const celulaFinalOutroSentido = grade
      .locator(
        `[data-testid="celula-passante"][data-viagem-uuid="${viagemOutroSentidoUuid}"]`,
      )
      .last();
    await celulaOutroSentido.hover();
    await expect(celulaFinalOutroSentido.getByLabel(/Deslocamento posterior/)).toHaveValue(
      "00:25",
    );

    // Caso inválido: não cria Viagem e restaura o último valor válido apenas
    // da direção anterior; o posterior permanece independente.
    const totalAntes = await grade.getByTestId("celula-partida").count();
    await celulaOutroSentido.getByLabel(/Deslocamento anterior/).fill("invalido");
    await celulaOutroSentido.getByLabel(/Inserir viagem antes/).click();
    await expect(page.getByTestId("erro-insercao-relativa")).toContainText(
      "Informe o deslocamento no formato HH:MM.",
    );
    await expect(celulaOutroSentido.getByLabel(/Deslocamento anterior/)).toHaveValue("00:07");
    await expect(
      grade
        .locator(`[data-testid="celula-passante"][data-viagem-uuid="${await celulaOutroSentido.getAttribute("data-viagem-uuid")}"]`)
        .last()
        .getByLabel(/Deslocamento posterior/),
    ).toHaveValue("00:25");
    await expect(grade.getByTestId("celula-partida")).toHaveCount(totalAntes);

    // Sair da etapa a desmonta; ao reabri-la, ambas as direções voltam ao
    // padrão decidido de dez minutos.
    await page.getByTestId("etapa-botao").filter({ hasText: "Matrizes" }).click();
    await page.getByTestId("etapa-botao").filter({ hasText: "Viagens e horários" }).click();
    await page.getByTestId("select-servico-viagens").selectOption({ label: "0001-2SU" });
    await page.getByTestId("select-sentido-viagens").selectOption({ label: "Volta" });
    const celulaReaberta = grade.getByTestId("celula-partida").first();
    await celulaReaberta.hover();
    await expect(celulaReaberta.getByLabel(/Deslocamento anterior/)).toHaveValue("00:10");
    await expect(
      grade
        .locator(`[data-testid="celula-passante"][data-viagem-uuid="${await celulaReaberta.getAttribute("data-viagem-uuid")}"]`)
        .last()
        .getByLabel(/Deslocamento posterior/),
    ).toHaveValue("00:10");
    expect(chamouOsrm).toBe(false);
  });

  test("inserção relativa herda a âncora manual e recusa resultado fora do dia (TASK-107)", async ({
    page,
  }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });

    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);
    const linhas = grade.getByTestId("linha-grade");
    const passanteFinalOrigem = linhas
      .nth(2)
      .getByTestId("celula-passante")
      .locator("input[data-grade]");
    await preencherEConfirmar(passanteFinalOrigem, "08:50");

    const partidaOrigem = grade.getByLabel("Horário de partida — segunda, viagem 1");
    const celulaOrigem = partidaOrigem.locator("xpath=ancestor::td");
    const viagemUuid = await celulaOrigem.getAttribute("data-viagem-uuid");
    expect(viagemUuid).toBeTruthy();
    const celulaFinalOrigem = grade
      .locator(`[data-testid="celula-passante"][data-viagem-uuid="${viagemUuid}"]`)
      .last();
    await celulaOrigem.hover();
    await celulaFinalOrigem.getByLabel("Inserir viagem depois — segunda, viagem 1").click();

    const passanteIntermediarioCopia = grade
      .getByTestId("linha-grade")
      .nth(4)
      .getByTestId("celula-passante")
      .locator("input[data-grade]");
    await expect(passanteIntermediarioCopia).toHaveValue("08:40");
    await preencherEConfirmar(passanteIntermediarioCopia, "09:05");
    await expect(passanteIntermediarioCopia).toHaveValue("08:40");
    await expect(grade.getByTestId("erro-passante")).toBeVisible();

    await preencherEConfirmar(partidaOrigem, "00:05");
    await celulaOrigem.hover();
    await celulaOrigem.getByLabel("Inserir viagem antes — segunda, viagem 1").click();
    await expect(celulaFinalOrigem.getByTestId("erro-insercao-relativa")).toContainText(
      "00:00 e 23:59",
    );
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 1")).toHaveValue("00:05");
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 2")).toHaveValue("08:10");
    expect(chamouOsrm).toBe(false);
  });

  test("editar horário passante ancora e redistribui; reset volta à sugestão inicial (RN-065/066)", async ({
    page,
  }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });

    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);
    const linhas = grade.getByTestId("linha-grade");
    const passanteVicente = linhas
      .nth(1)
      .getByTestId("celula-passante")
      .locator("input[data-grade]"); // ord2
    const passantePraia = linhas
      .nth(2)
      .getByTestId("celula-passante")
      .locator("input[data-grade]"); // ord3

    // Fixar a última Seção (Praia Grande) em 08:50 → âncora; a intermediária
    // (São Vicente) é reinterpolada proporcionalmente ao baseline (0/18/30):
    // off(ord2) = 50 · 18/30 = 30 min → 08:30.
    await preencherEConfirmar(passantePraia, "08:50");
    await expect(passantePraia).toHaveValue("08:50");
    await expect(passanteVicente).toHaveValue("08:30");

    // Bloqueio de fora-de-ordem: São Vicente > âncora de Praia (08:50) é recusado
    // — a célula entra em erro e não confirma (reverte ao valor anterior).
    await preencherEConfirmar(passanteVicente, "08:55");
    await expect(linhas.nth(1).getByTestId("erro-passante")).toBeVisible();
    await expect(passanteVicente).toHaveValue("08:30");

    // Restaurar sugestão (por Viagem): volta ao baseline 08:00/08:18/08:30.
    await linhas.nth(0).getByTestId("celula-partida").hover();
    await linhas.nth(0).getByTestId("restaurar-viagem").click();
    await expect(passanteVicente).toHaveValue("08:18");
    await expect(passantePraia).toHaveValue("08:30");
    await expect(linhas.nth(1).getByTestId("erro-passante")).toHaveCount(0);

    expect(chamouOsrm).toBe(false);
  });

  test("ações da Viagem de domingo ficam visíveis, clicáveis e não cobrem o horário (TASK-114)", async ({
    page,
  }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });

    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);
    await preencherEConfirmar(grade.getByLabel("Criar viagem — domingo"), "08:00");

    const partidaDomingo = grade.getByLabel("Horário de partida — domingo, viagem 1");
    const celulaDomingo = partidaDomingo.locator("xpath=ancestor::td");
    const passanteDomingo = grade.getByLabel(
      "Horário de passagem — Praia Grande - Rodoviária Praia Grande, domingo, viagem 1",
    );
    const areaVisivel = grade.locator("div.overflow-x-auto");

    await celulaDomingo.hover();
    const [caixaArea, caixaApagar, caixaRestaurar] = await Promise.all([
      areaVisivel.boundingBox(),
      celulaDomingo.getByTestId("apagar-viagem").boundingBox(),
      celulaDomingo.getByTestId("restaurar-viagem").boundingBox(),
    ]);
    expect(caixaArea).not.toBeNull();
    expect(caixaApagar).not.toBeNull();
    expect(caixaRestaurar).not.toBeNull();
    for (const caixa of [caixaApagar!, caixaRestaurar!]) {
      expect(caixa.x).toBeGreaterThanOrEqual(caixaArea!.x);
      expect(caixa.x + caixa.width).toBeLessThanOrEqual(caixaArea!.x + caixaArea!.width);
    }
    expect(caixaRestaurar!.x).toBeCloseTo(caixaApagar!.x, 0);
    expect(caixaRestaurar!.y).toBeGreaterThanOrEqual(caixaApagar!.y + caixaApagar!.height);

    await partidaDomingo.click();
    await expect(partidaDomingo).toBeFocused();

    await preencherEConfirmar(passanteDomingo, "08:50");
    await expect(passanteDomingo).toHaveValue("08:50");
    await celulaDomingo.hover();
    await celulaDomingo.getByTestId("restaurar-viagem").click();
    await expect(passanteDomingo).toHaveValue("08:30");

    page.once("dialog", (dialogo) => dialogo.accept());
    await celulaDomingo.hover();
    await celulaDomingo.getByTestId("apagar-viagem").click();
    await expect(grade.getByLabel("Criar viagem — domingo")).toBeVisible();
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 1")).toHaveValue("08:00");

    const feriados = gradeFeriados(page);
    await preencherEConfirmar(feriados.getByLabel("Criar viagem — domingo"), "08:00");
    const celulaFeriadoDomingo = feriados
      .getByLabel("Horário de partida — domingo, viagem 1")
      .locator("xpath=ancestor::td");
    await celulaFeriadoDomingo.hover();
    const [caixaAreaFeriados, caixaApagarFeriados, caixaRestaurarFeriados] = await Promise.all([
      feriados.locator("div.overflow-x-auto").boundingBox(),
      celulaFeriadoDomingo.getByTestId("apagar-viagem").boundingBox(),
      celulaFeriadoDomingo.getByTestId("restaurar-viagem").boundingBox(),
    ]);
    expect(caixaAreaFeriados).not.toBeNull();
    for (const caixa of [caixaApagarFeriados, caixaRestaurarFeriados]) {
      expect(caixa).not.toBeNull();
      expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(
        caixaAreaFeriados!.x + caixaAreaFeriados!.width,
      );
    }
    expect(chamouOsrm).toBe(false);
  });

  test("sem R$ na etapa", async ({ page }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    await expect(page.locator("body")).not.toContainText("R$");
  });
});

test.describe("Etapa Viagens — grade de feriados e cópias (TASK-030; Spec 04 §8.3/§8.4)", () => {
  test("'Copiar dias comuns' espelha a operação comum na grade de feriados, com Viagens distintas (RN-007/068)", async ({
    page,
  }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const feriados = gradeFeriados(page);

    // Grade de feriados nasce vazia (RN-071) — só célula criável, sem partida.
    await expect(feriados.getByTestId("celula-partida")).toHaveCount(0);
    await expect(feriados.getByTestId("legenda-feriados")).toContainText(
      "semana padrão (sem feriados nem operação excepcional)",
    );

    await feriados.getByTestId("copiar-dias-comuns").click();

    // Espelha a operação de segunda (08:00 → 08:40 → 09:00) como Viagem de feriado.
    await expect(
      feriados.getByLabel("Horário de partida — segunda, viagem 1"),
    ).toHaveValue("08:00");
    const linhas = feriados.getByTestId("linha-grade");
    await expect(linhas.nth(1).getByTestId("celula-passante").locator("input[data-grade]")).toHaveValue("08:40");

    // Editar o passante da grade comum NÃO afeta a de feriado (grades independentes).
    const comumVicente = gradeComum(page)
      .getByTestId("linha-grade")
      .nth(1)
      .getByTestId("celula-passante")
      .locator("input[data-grade]");
    await preencherEConfirmar(comumVicente, "08:30");
    await expect(comumVicente).toHaveValue("08:30");
    await expect(linhas.nth(1).getByTestId("celula-passante").locator("input[data-grade]")).toHaveValue("08:40");
  });

  test("apagar viagem remove a coluna do dia na grade comum", async ({ page }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    page.on("dialog", (d) => d.accept());
    await grade.getByTestId("celula-partida").first().hover();
    await grade.getByLabel("Apagar viagem — segunda, viagem 1").click();

    // Sem Viagens: segunda volta a exibir a célula criável, sem partida existente.
    await expect(grade.getByTestId("celula-partida")).toHaveCount(0);
    await expect(grade.getByLabel("Criar viagem — segunda")).toBeVisible();
  });

  test("copiar viagem para outro dia cria Viagem no dia-alvo (RN-007/061)", async ({ page }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    await expect(grade.getByTestId("apagar-bloco")).toHaveCount(0);

    await grade.getByTestId("celula-partida").first().hover();
    await grade.getByLabel("Copiar para o dia — segunda, viagem 1").selectOption({ label: "QUA" });
    await grade.getByLabel("Copiar viagem para outro dia — segunda, viagem 1").click();

    // quarta passa a ter a Viagem copiada, com o mesmo horário de partida.
    await expect(grade.getByLabel("Horário de partida — quarta, viagem 1")).toHaveValue("08:00");
  });
});
