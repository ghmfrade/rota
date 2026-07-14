import { expect, test } from "@playwright/test";
import multiServico from "../fixtures/carregar-multi-servico.json";

// E2E da etapa real "Seções, Locais e Itinerários" (TASK-019; Spec 04 §7.3):
// reordenar pela tabela lateral dispara o recálculo ao vivo (RN-052),
// injetando o composer REAL da descrição (DEC-046); quando o OSRM (mockado —
// docs-dev/08, nunca real) falha, a pendência bloqueante aparece no painel
// (TASK-044, fio fechado pela obrigação de fiação desta task). Tiles e OSRM
// interceptados: nenhum teste depende de rede real. Usa o Serviço 0001-1SU do
// fixture `carregar-multi-servico` — seu itinerário de Volta (Praia Grande →
// São Vicente → Santos) não tem pontos de rota persistidos, evitando a
// reindexação de `apos_parada_ordem` (TASK-023, fora de escopo desta task).

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
  "base64",
);

async function abrirEtapaVolta(page: import("@playwright/test").Page) {
  await page.route("https://tile.openstreetmap.org/**", (rota) =>
    rota.fulfill({ contentType: "image/png", body: PNG_1x1 }),
  );

  await page.goto("/");
  await page.getByTestId("input-arquivo-json").setInputFiles({
    name: "multi.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(multiServico)),
  });
  await expect(page.getByTestId("layout-formulario")).toBeVisible();

  await page
    .getByTestId("etapa-botao")
    .filter({ hasText: "Seções, Locais e Itinerários" })
    .click();
  await expect(page.getByTestId("etapa-itinerarios")).toBeVisible();

  await page.getByTestId("select-servico-itinerario").selectOption({ label: "0001-1SU" });
  await page.locator('[data-testid="botao-sentido"][data-sentido="volta"]').click();

  await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(3);
}

test.describe("Etapa Seções, Locais e Itinerários — abertura (RN-015)", () => {
  test("abrir JSON existente exibe a rota/descrição CONGELADAS, sem chamar o OSRM", async ({
    page,
  }) => {
    let chamouOsrm = false;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamouOsrm = true;
      return rota.abort();
    });

    await abrirEtapaVolta(page);

    const itens = page.getByTestId("tabela-paradas").getByTestId("parada-rotulo");
    await expect(itens).toHaveText([
      "Praia Grande - Rodoviária Praia Grande",
      "São Vicente - Terminal São Vicente",
      "Santos - Terminal Santos",
    ]);

    await expect(page.getByTestId("descricao-texto")).toContainText(
      "Praia Grande - Rodoviária Praia Grande, Avenida Presidente Wilson, São Vicente - Terminal São Vicente",
    );
    expect(chamouOsrm).toBe(false);
  });
});

test.describe("Etapa Seções, Locais e Itinerários — reordenar dispara recálculo (RN-052)", () => {
  test("mover parada recalcula com sucesso e atualiza a descrição (composer REAL, DEC-046)", async ({
    page,
  }) => {
    await page.route("https://router.project-osrm.org/**", (rota) =>
      rota.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          code: "Ok",
          routes: [
            {
              geometry: {
                type: "LineString",
                coordinates: [
                  [-46.402, -24.0081],
                  [-46.3919, -23.9631],
                  [-46.3339, -23.9608],
                ],
              },
              legs: [
                { distance: 6100, duration: 750, steps: [{ name: "Via Reordenada 1" }] },
                { distance: 8000, duration: 1080, steps: [{ name: "Via Reordenada 2" }] },
              ],
            },
          ],
        }),
      }),
    );

    await abrirEtapaVolta(page);

    // Move a primeira parada (Praia Grande) para baixo — nova ordem: São
    // Vicente, Praia Grande, Santos.
    await page.getByTestId("parada-mover-baixo").first().click();

    await expect(page.getByTestId("recalculando-rota")).toHaveCount(0);
    const itens = page.getByTestId("tabela-paradas").getByTestId("parada-rotulo");
    await expect(itens).toHaveText([
      "São Vicente - Terminal São Vicente",
      "Praia Grande - Rodoviária Praia Grande",
      "Santos - Terminal Santos",
    ]);

    // A descrição recomposta vem do envelope OSRM mockado — prova que o
    // composer REAL (TASK-025) foi injetado, não um placeholder (DEC-046).
    await expect(page.getByTestId("descricao-texto")).toContainText("Via Reordenada 1");
    await expect(page.getByTestId("mensagem-sem-rota")).toHaveCount(0);
    await expect(page.getByTestId("painel-pendencias").getByTestId("pendencia-item")).toHaveCount(0);
  });

  test("falha do OSRM (NoRoute, mockado) acende a pendência bloqueante no painel (TASK-044)", async ({
    page,
  }) => {
    await page.route("https://router.project-osrm.org/**", (rota) =>
      rota.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ code: "NoRoute", routes: [] }),
      }),
    );

    await abrirEtapaVolta(page);

    await page.getByTestId("parada-mover-baixo").first().click();

    await expect(page.getByTestId("mensagem-sem-rota")).toContainText(
      "Não há caminho viário entre as paradas na ordem definida.",
    );

    const pendencia = page
      .getByTestId("painel-pendencias")
      .getByTestId("pendencia-item")
      .filter({ hasText: "está sem rota calculada" });
    await expect(pendencia).toBeVisible();
    await expect(pendencia).toHaveAttribute("data-severidade", "bloqueante");
    await expect(pendencia).toContainText("O itinerário de Volta do Serviço 0001-1SU");
  });
});

test.describe("Etapa Seções, Locais e Itinerários — criar Seção via mapa insere parada nova", () => {
  test("clicar no mapa cria a Seção, insere a parada e recalcula já com ela (sem perder a Seção nova)", async ({
    page,
  }) => {
    // Prova direta de que `aplicarNovasParadas` resolve a Seção RECÉM-criada
    // (não a lista `secoes` obsoleta de antes do gesto) — sem o array fresco
    // passado por `secoesParaResolver`, o recálculo falharia por RN-036 (Seção
    // sem geolocalização do sentido "encontrada") e o OSRM nunca seria chamado.
    let ultimaUrlOsrm: string | null = null;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      ultimaUrlOsrm = rota.request().url();
      return rota.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          code: "Ok",
          routes: [
            {
              geometry: {
                type: "LineString",
                coordinates: [
                  [-46.402, -24.0081],
                  [-46.3919, -23.9631],
                  [-46.3339, -23.9608],
                  [-48.5, -22.2],
                ],
              },
              legs: [
                { distance: 6100, duration: 750, steps: [{ name: "Via 1" }] },
                { distance: 8000, duration: 1080, steps: [{ name: "Via 2" }] },
                { distance: 90000, duration: 5400, steps: [{ name: "Via 3" }] },
              ],
            },
          ],
        }),
      });
    });

    await abrirEtapaVolta(page);

    const mapaSecoes = page.getByTestId("editor-secoes").getByTestId("mapa-base");
    await expect(mapaSecoes).toBeVisible();
    // Espera o mapa terminar a carga (evento "load" do MapLibre) e plotar os 3
    // marcadores das Seções já existentes — sinal mais forte de prontidão do
    // que só o container estar visível; sem ele, o clique pode ocorrer antes
    // do listener `mapa.on("click", ...)` produzir efeito perceptível.
    await mapaSecoes.locator(".maplibregl-marker").first().waitFor();
    await mapaSecoes.scrollIntoViewIfNeeded();
    const caixa = await mapaSecoes.boundingBox();
    if (!caixa) throw new Error("mapa sem bounding box");
    // Clica no centro exato do canvas (via locator, que rola o elemento para a
    // viewport antes do clique) — no zoom default (Estado inteiro,
    // CENTRO_PADRAO_SP), cai dentro do município de Jaú no geojson real.
    await mapaSecoes.click({ position: { x: caixa.width / 2, y: caixa.height / 2 } });

    await page.getByTestId("nome-secao-input").fill("Nova Seção E2E");
    await page.getByTestId("confirmar-criar-secao").click();

    const itens = page.getByTestId("tabela-paradas").getByTestId("parada-rotulo");
    await expect(itens).toHaveText([
      "Praia Grande - Rodoviária Praia Grande",
      "São Vicente - Terminal São Vicente",
      "Santos - Terminal Santos",
      "Jaú - Nova Seção E2E",
    ]);

    // O OSRM foi chamado com as 4 paradas (a nova incluída) — não ficou preso
    // na violação de itinerário incompleto/RN-036 por resolver contra a lista
    // de Seções desatualizada.
    expect(ultimaUrlOsrm).not.toBeNull();
    expect((ultimaUrlOsrm as unknown as string).split(";").length).toBe(4);
    await expect(page.getByTestId("descricao-texto")).toContainText("Via 3");
  });
});
