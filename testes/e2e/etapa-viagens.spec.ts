import { expect, test } from "@playwright/test";
import multiServico from "../fixtures/carregar-multi-servico.json";

// E2E da etapa "Viagens e horários" — grade de dias comuns (TASK-028; Spec 04
// §8). Usa o Serviço 0001-1SU do fixture `carregar-multi-servico` (sentido
// Ida: Santos → São Vicente → Praia Grande, trechos de 1080s/720s, 1 Viagem
// gravada na segunda às 08:00). A etapa só lê `rota.trechos` já congelada
// para a sugestão inicial (RN-064) — nenhuma chamada ao OSRM é esperada.

async function abrirEtapaViagens(page: import("@playwright/test").Page, documento: unknown) {
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

    // 3 Seções por bloco (Santos, São Vicente, Praia Grande); só segunda tem
    // Viagem gravada, então a grade tem 2 blocos (existente + criável) = 6 linhas.
    await expect(page.getByTestId("linha-grade")).toHaveCount(6);

    // segunda: Viagem existente — 1ª Seção editável com 08:00, demais Seções somam o offset gravado.
    await expect(
      page.getByLabel("Horário de partida — segunda, viagem 1"),
    ).toHaveValue("08:00");
    await expect(page.getByTestId("celula-passante").filter({ hasText: "08:40" })).toBeVisible();
    await expect(page.getByTestId("celula-passante").filter({ hasText: "09:00" })).toBeVisible();

    // terça (sem Viagem): 1ª Seção mostra a célula criável.
    await expect(page.getByLabel("Criar viagem — terca")).toBeVisible();

    expect(chamouOsrm).toBe(false);
  });

  test("preencher a 1ª Seção de um dia sem Viagem cria a Viagem com sugestão inicial (RN-061/064/067)", async ({
    page,
  }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));

    await page.getByLabel("Criar viagem — terca").fill("09:00");

    // A Viagem nasce e passa a ser exibida como partida editável.
    await expect(page.getByLabel("Horário de partida — terca, viagem 1")).toHaveValue("09:00");

    // Sugestão inicial (Spec 03 §8.1): acumula 1080s (18min) e depois 720s (12min).
    const linhas = page.getByTestId("linha-grade");
    await expect(linhas.nth(1).getByTestId("celula-passante").nth(1)).toHaveText("09:18");
    await expect(linhas.nth(2).getByTestId("celula-passante").nth(1)).toHaveText("09:30");

    // Uma nova célula criável surge para a próxima partida de terça.
    await expect(page.getByLabel("Criar viagem — terca")).toBeVisible();
  });

  test("reeditar a partida de uma Viagem existente atualiza horario_saida e re-deriva os offsets", async ({
    page,
  }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));

    const partida = page.getByLabel("Horário de partida — segunda, viagem 1");
    await partida.fill("10:00");

    await expect(partida).toHaveValue("10:00");
    const linhas = page.getByTestId("linha-grade");
    await expect(linhas.nth(1).getByTestId("celula-passante").first()).toHaveText("10:18");
    await expect(linhas.nth(2).getByTestId("celula-passante").first()).toHaveText("10:30");
  });

  test("sem R$ na etapa", async ({ page }) => {
    await abrirEtapaViagens(page, structuredClone(multiServico));
    await expect(page.locator("body")).not.toContainText("R$");
  });
});
