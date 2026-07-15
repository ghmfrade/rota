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
    await expect(feriados.getByTestId("legenda-feriados")).toContainText("semana padrão");

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
    await grade.getByLabel("Apagar viagem — segunda, viagem 1").click();

    // Sem Viagens: segunda volta a exibir a célula criável, sem partida existente.
    await expect(grade.getByTestId("celula-partida")).toHaveCount(0);
    await expect(grade.getByLabel("Criar viagem — segunda")).toBeVisible();
  });

  test("copiar viagem para outro dia cria Viagem no dia-alvo (RN-007/061)", async ({ page }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    const grade = gradeComum(page);

    await grade.getByLabel("Copiar para o dia — segunda, viagem 1").selectOption({ label: "QUA" });
    await grade.getByLabel("Copiar viagem para outro dia — segunda, viagem 1").click();

    // quarta passa a ter a Viagem copiada, com o mesmo horário de partida.
    await expect(grade.getByLabel("Horário de partida — quarta, viagem 1")).toHaveValue("08:00");
  });
});
