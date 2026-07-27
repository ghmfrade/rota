import { expect, test, type Page } from "@playwright/test";
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
    await grade.getByLabel("Criar viagem — segunda").fill("0700");
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 1")).toHaveValue("07:00");
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 2")).toHaveValue("08:00");

    // Três algarismos também são aceitos e normalizados.
    await grade.getByLabel("Horário de partida — segunda, viagem 1").fill("730");
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 1")).toHaveValue("07:30");
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

    await grade.getByLabel("Criar viagem — segunda").fill("09:00");
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
    await expect(linhas.nth(1).getByTestId("celula-passante").locator("input")).toHaveValue("08:40");
    await expect(linhas.nth(2).getByTestId("celula-passante").locator("input")).toHaveValue("09:00");

    // terça (sem Viagem): 1ª Seção mostra a célula criável.
    await expect(grade.getByLabel("Criar viagem — terca")).toBeVisible();

    expect(chamouOsrm).toBe(false);
  });

  test("preencher a 1ª Seção de um dia sem Viagem cria a Viagem com sugestão inicial (RN-061/064/067)", async ({
    page,
  }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    await grade.getByLabel("Criar viagem — terca").fill("09:00");

    // A Viagem nasce e passa a ser exibida como partida editável.
    await expect(grade.getByLabel("Horário de partida — terca, viagem 1")).toHaveValue("09:00");

    // Sugestão inicial (Spec 03 §8.1): acumula 1080s (18min) e depois 720s (12min).
    // terça é a 2ª coluna com Viagem na linha (segunda é a 1ª) → nth(1).
    const linhas = grade.getByTestId("linha-grade");
    await expect(
      linhas.nth(1).getByTestId("celula-passante").nth(1).locator("input"),
    ).toHaveValue("09:18");
    await expect(
      linhas.nth(2).getByTestId("celula-passante").nth(1).locator("input"),
    ).toHaveValue("09:30");

    // Uma nova célula criável surge para a próxima partida de terça.
    await expect(grade.getByLabel("Criar viagem — terca")).toBeVisible();
  });

  test("reeditar a partida desloca todos os horários pelo mesmo delta, preservando os offsets (TASK-029)", async ({
    page,
  }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    // Offsets gravados são 0/40/60 min. Mover a partida 08:00 → 10:00 desloca
    // tudo +2h, SEM re-derivar pela sugestão inicial (offsets preservados).
    const partida = grade.getByLabel("Horário de partida — segunda, viagem 1");
    await partida.fill("10:00");

    await expect(partida).toHaveValue("10:00");
    const linhas = grade.getByTestId("linha-grade");
    await expect(linhas.nth(1).getByTestId("celula-passante").locator("input")).toHaveValue("10:40");
    await expect(linhas.nth(2).getByTestId("celula-passante").locator("input")).toHaveValue("11:00");
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

    await celulaOrigem.hover();
    await expect(celulaOrigem.getByTestId("acao-inserir-anterior")).toHaveCSS("opacity", "1");
    await expect(celulaOrigem.getByLabel("Deslocamento anterior — segunda, viagem 1")).toHaveValue(
      "00:10",
    );
    await expect(celulaOrigem.getByLabel("Deslocamento posterior — segunda, viagem 1")).toHaveValue(
      "00:10",
    );

    await celulaOrigem.getByLabel("Deslocamento posterior — segunda, viagem 1").fill("01:10");
    await celulaOrigem.getByLabel("Inserir viagem depois — segunda, viagem 1").click();

    await expect(grade.getByLabel("Horário de partida — segunda, viagem 1")).toHaveValue("08:00");
    await expect(grade.getByLabel("Horário de partida — segunda, viagem 2")).toHaveValue("09:10");
    const linhas = grade.getByTestId("linha-grade");
    await expect(linhas.nth(4).getByTestId("celula-passante").locator("input")).toHaveValue("09:50");
    await expect(linhas.nth(5).getByTestId("celula-passante").locator("input")).toHaveValue("10:10");

    await grade.getByRole("columnheader", { name: "DOM" }).hover();
    await expect(celulaOrigem.getByTestId("acao-inserir-anterior")).toHaveCSS("opacity", "0");
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
    const passanteFinalOrigem = linhas.nth(2).getByTestId("celula-passante").locator("input");
    await passanteFinalOrigem.fill("08:50");

    const partidaOrigem = grade.getByLabel("Horário de partida — segunda, viagem 1");
    const celulaOrigem = partidaOrigem.locator("xpath=ancestor::td");
    await celulaOrigem.hover();
    await celulaOrigem.getByLabel("Inserir viagem depois — segunda, viagem 1").click();

    const passanteIntermediarioCopia = grade
      .getByTestId("linha-grade")
      .nth(4)
      .getByTestId("celula-passante")
      .locator("input");
    await expect(passanteIntermediarioCopia).toHaveValue("08:40");
    await passanteIntermediarioCopia.fill("09:05");
    await expect(passanteIntermediarioCopia).toHaveValue("08:40");
    await expect(grade.getByTestId("erro-passante")).toBeVisible();

    await partidaOrigem.fill("00:05");
    await celulaOrigem.hover();
    await celulaOrigem.getByLabel("Inserir viagem antes — segunda, viagem 1").click();
    await expect(celulaOrigem.getByTestId("erro-insercao-relativa")).toContainText(
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
    const passanteVicente = linhas.nth(1).getByTestId("celula-passante").locator("input"); // ord2
    const passantePraia = linhas.nth(2).getByTestId("celula-passante").locator("input"); // ord3

    // Fixar a última Seção (Praia Grande) em 08:50 → âncora; a intermediária
    // (São Vicente) é reinterpolada proporcionalmente ao baseline (0/18/30):
    // off(ord2) = 50 · 18/30 = 30 min → 08:30.
    await passantePraia.fill("08:50");
    await expect(passantePraia).toHaveValue("08:50");
    await expect(passanteVicente).toHaveValue("08:30");

    // Bloqueio de fora-de-ordem: São Vicente > âncora de Praia (08:50) é recusado
    // — a célula entra em erro e não confirma (reverte ao valor anterior).
    await passanteVicente.fill("08:55");
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
    await expect(linhas.nth(1).getByTestId("celula-passante").locator("input")).toHaveValue("08:40");

    // Editar o passante da grade comum NÃO afeta a de feriado (grades independentes).
    const comumVicente = gradeComum(page)
      .getByTestId("linha-grade")
      .nth(1)
      .getByTestId("celula-passante")
      .locator("input");
    await comumVicente.fill("08:30");
    await expect(comumVicente).toHaveValue("08:30");
    await expect(linhas.nth(1).getByTestId("celula-passante").locator("input")).toHaveValue("08:40");
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
