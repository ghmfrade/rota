import { expect, test } from "@playwright/test";
import multiServico from "../fixtures/carregar-multi-servico.json";

// E2E da etapa "Matrizes" — editor da matriz de seccionamento (TASK-027;
// Spec 04 §9.2). Usa o Serviço 0001-1SU do fixture `carregar-multi-servico`
// (3 Seções: Santos, São Vicente, Praia Grande), removendo o par
// São Vicente/Praia Grande da `matriz_seccionamento` gravada para exercitar o
// fluxo "—" → habilitar. A etapa só LÊ `matriz_distancias`/`matriz_seccionamento`
// já congeladas — nenhum teste intercepta o OSRM porque nenhuma chamada é
// esperada (§9.2 é edição sobre dado já calculado pela TASK-026).

const SAO_VICENTE = "22222222-2222-4222-8222-222222222222";
const PRAIA_GRANDE = "33333333-3333-4333-8333-333333333333";

interface DocumentoFixture {
  autos: {
    servicos: Array<{
      uuid: string;
      matriz_seccionamento: Array<{ secao_a_uuid: string; secao_b_uuid: string; distancia_km: number }>;
    }>;
  };
}

function documentoComParDesabilitado() {
  const documento = structuredClone(multiServico) as unknown as DocumentoFixture;
  const servico = documento.autos.servicos[0];
  servico.matriz_seccionamento = servico.matriz_seccionamento.filter(
    (par) =>
      !(
        (par.secao_a_uuid === SAO_VICENTE && par.secao_b_uuid === PRAIA_GRANDE) ||
        (par.secao_a_uuid === PRAIA_GRANDE && par.secao_b_uuid === SAO_VICENTE)
      ),
  );
  return documento;
}

async function abrirEtapaMatrizes(page: import("@playwright/test").Page, documento: unknown) {
  await page.goto("/");
  await page.getByTestId("input-arquivo-json").setInputFiles({
    name: "matrizes.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(documento)),
  });
  await expect(page.getByTestId("layout-formulario")).toBeVisible();

  await page.getByTestId("etapa-botao").filter({ hasText: "Matrizes" }).click();
  await expect(page.getByTestId("etapa-matrizes")).toBeVisible();

  await page.getByTestId("select-servico-matrizes").selectOption({ label: "0001-1SU" });
  await expect(page.getByTestId("matriz-seccionamento")).toBeVisible();
}

test.describe("Etapa Matrizes — matriz de seccionamento (Spec 04 §9.2)", () => {
  test("triangular inferior: X na diagonal, km nos pares habilitados, '—' no par desabilitado, sem R$", async ({
    page,
  }) => {
    await abrirEtapaMatrizes(page, documentoComParDesabilitado());

    await expect(page.getByTestId("celula-diagonal")).toHaveCount(3);
    for (const celula of await page.getByTestId("celula-diagonal").all()) {
      await expect(celula).toHaveText("X");
    }

    await expect(page.getByTestId("celula-seccionamento")).toHaveCount(3);
    await expect(
      page.getByRole("button", { name: /Habilitar seccionamento entre Praia Grande.*São Vicente/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("spinbutton", { name: /Distância entre São Vicente.*Santos/ }),
    ).toHaveValue("8");

    await expect(page.locator("body")).not.toContainText("R$");
  });

  test("clicar em '—' habilita o par com a sugestão ativa; clicar em 'desabilitar' volta a '—'", async ({
    page,
  }) => {
    await abrirEtapaMatrizes(page, documentoComParDesabilitado());

    await page
      .getByRole("button", { name: /Habilitar seccionamento entre Praia Grande.*São Vicente/ })
      .click();

    // Praia Grande–São Vicente só é atendido pelo Serviço corrente entre os
    // dois Serviços do Autos — os dois modos de sugestão coincidem (§6.4),
    // preenchendo com o valor_adotado_de_distancia já gravado (6 km).
    const input = page.getByRole("spinbutton", { name: /Distância entre Praia Grande.*São Vicente/ });
    await expect(input).toHaveValue("6");

    await page
      .getByRole("button", { name: /Desabilitar seccionamento entre Praia Grande.*São Vicente/ })
      .click();

    await expect(
      page.getByRole("button", { name: /Habilitar seccionamento entre Praia Grande.*São Vicente/ }),
    ).toBeVisible();
  });

  test("edição manual da distância persiste", async ({ page }) => {
    await abrirEtapaMatrizes(page, documentoComParDesabilitado());

    const input = page.getByRole("spinbutton", { name: /Distância entre São Vicente.*Santos/ });
    await input.fill("20");
    await input.blur();

    await expect(input).toHaveValue("20");
  });

  test("botão 'Sugerir distâncias do serviço' reaplica o valor do próprio Serviço, sobrescrevendo a edição manual", async ({
    page,
  }) => {
    await abrirEtapaMatrizes(page, documentoComParDesabilitado());

    const inputAB = page.getByRole("spinbutton", { name: /Distância entre São Vicente.*Santos/ });
    await inputAB.fill("999");
    await inputAB.blur();
    await expect(inputAB).toHaveValue("999");

    await page.getByTestId("botao-sugerir-distancias-servico").click();

    await expect(inputAB).toHaveValue("8");
  });

  test("nenhuma requisição ao OSRM é disparada ao abrir/navegar a etapa (matriz já congelada)", async ({
    page,
  }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });

    await abrirEtapaMatrizes(page, documentoComParDesabilitado());
    await page
      .getByRole("button", { name: /Habilitar seccionamento entre Praia Grande.*São Vicente/ })
      .click();

    expect(chamouOsrm).toBe(false);
  });
});
