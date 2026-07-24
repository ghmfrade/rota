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

// TASK-077 (DEC-063/071): gestos de Seção nesta etapa espelham no OUTRO
// sentido do Serviço bidirecional 0001-1SU — cada gesto de Seção dispara DOIS
// recálculos OSRM (Volta editada, depois Ida espelhada), não mais um só.
// `ehCoordenadaDaVolta` identifica, pela URL da requisição, qual chamada
// pertence à Volta (usa as geolocalizações `geolocalizacao_volta`, distintas
// das de Ida no fixture) — permite manter, sem ambiguidade, a lógica de
// mock/contagem específica de cada teste apontada exclusivamente ao sentido
// que o teste exercita, enquanto a chamada espelhada da Ida recebe uma
// resposta OK genérica (legs coerentes com o nº de coordenadas da própria
// requisição — nunca fixas), sem afetar as asserções do sentido testado.
function ehCoordenadaDaVolta(url: string): boolean {
  // Pares completos "lon,lat" (não só um fragmento): `-46.402` isoladamente é
  // PREFIXO de `-46.4025` (a variante Ida de Praia Grande) — um match parcial
  // classificaria errado a chamada espelhada da Ida como se fosse da Volta.
  return (
    url.includes("-46.402,-24.0081") ||
    url.includes("-46.3915,-23.9629") ||
    url.includes("-46.3342,-23.9611")
  );
}

function respostaOsrmGenericaOk(url: string) {
  const casado = /\/driving\/([^?]+)/.exec(url);
  const coordenadas = casado ? casado[1].split(";") : [];
  const totalLegs = Math.max(coordenadas.length - 1, 0);
  return {
    contentType: "application/json",
    body: JSON.stringify({
      code: "Ok",
      routes: [
        {
          geometry: {
            type: "LineString",
            coordinates: coordenadas.map((par) => par.split(",").map(Number)),
          },
          legs: Array.from({ length: totalLegs }, () => ({
            distance: 1000,
            duration: 100,
            steps: [{ name: "Via Espelho E2E" }],
          })),
        },
      ],
    }),
  };
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
    // O alerta agregado de grade de feriados pode existir (TASK-081); o que
    // este fluxo prova é que o recálculo não deixou bloqueante de rota.
    await expect(
      page.locator(
        '[data-testid="painel-pendencias"] [data-testid="pendencia-item"][data-severidade="bloqueante"]',
      ),
    ).toHaveCount(0);
  });

  test("falha do OSRM (NoRoute, mockado) acende a pendência bloqueante no painel (TASK-044)", async ({
    page,
  }) => {
    // TASK-077: mover uma Seção na Volta espelha o mesmo movimento na Ida
    // (0001-1SU é bidirecional, sem Locais) — as DUAS recalculam e as DUAS
    // falham com o mesmo mock (NoRoute uniforme), gerando duas pendências
    // bloqueantes. A asserção mira exclusivamente a da Volta.
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
      .filter({ hasText: "está sem rota calculada" })
      .filter({ hasText: "O itinerário de Volta do Serviço 0001-1SU" });
    await expect(pendencia).toBeVisible();
    await expect(pendencia).toHaveAttribute("data-severidade", "bloqueante");
  });
});

test.describe("Etapa Seções, Locais e Itinerários — criar Seção via mapa insere parada nova", () => {
  test("clique direito + Seção cria a entidade, insere a parada e recalcula já com ela", async ({
    page,
  }) => {
    // Prova direta de que `aplicarNovasParadas` resolve a Seção RECÉM-criada
    // (não a lista `secoes` obsoleta de antes do gesto) — sem o array fresco
    // passado por `secoesParaResolver`, o recálculo falharia por RN-036 (Seção
    // sem geolocalização do sentido "encontrada") e o OSRM nunca seria chamado.
    // TASK-077: a criação espelha na Ida (bidirecional) — `ultimaUrlOsrm`
    // captura só a chamada da VOLTA (o sentido exercitado pelo teste); a
    // chamada espelhada da Ida usa a MESMA resposta fixa (mesmo nº de legs,
    // coincidência segura aqui — Ida também vai de 3 para 4 paradas).
    let ultimaUrlOsrm: string | null = null;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      const url = rota.request().url();
      if (ehCoordenadaDaVolta(url)) ultimaUrlOsrm = url;
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

    // Mapa ÚNICO da etapa: clique direito abre a escolha Seção/Local
    // (TASK-065/DEC-055).
    const mapa = page.getByTestId("mapa-base");
    await expect(mapa).toBeVisible();
    // Espera o mapa terminar a carga (evento "load" do MapLibre) e plotar os 3
    // marcadores das Seções já existentes — sinal mais forte de prontidão do
    // que só o container estar visível; sem ele, o clique pode ocorrer antes
    // do listener `mapa.on("click", ...)` produzir efeito perceptível.
    await mapa.locator(".maplibregl-marker").first().waitFor();
    await mapa.scrollIntoViewIfNeeded();
    const caixa = await mapa.boundingBox();
    if (!caixa) throw new Error("mapa sem bounding box");
    // Clica no centro exato do canvas (via locator, que rola o elemento para a
    // viewport antes do clique) — no zoom default (Estado inteiro,
    // CENTRO_PADRAO_SP), cai dentro do município de Jaú no geojson real.
    await mapa.click({
      button: "right",
      position: { x: caixa.width / 2, y: caixa.height / 2 },
    });
    await page.getByRole("menuitem", { name: "Seção" }).click();

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

test.describe("TASK-068 — vocabulário visual e Local extremo contextual", () => {
  test("Local ao fim bloqueia e fica em erro; acrescentar Seção recupera a montagem", async ({
    page,
  }) => {
    let chamadasOsrm = 0;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamadasOsrm += 1;
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
                  [-48.49, -22.19],
                ],
              },
              legs: [
                { distance: 6100, duration: 750, steps: [{ name: "Via 1" }] },
                { distance: 8000, duration: 1080, steps: [{ name: "Via 2" }] },
                { distance: 90000, duration: 5400, steps: [{ name: "Via 3" }] },
                { distance: 1200, duration: 180, steps: [{ name: "Via 4" }] },
              ],
            },
          ],
        }),
      });
    });

    await abrirEtapaVolta(page);
    const mapa = page.getByTestId("mapa-base");
    await mapa.locator(".maplibregl-marker").first().waitFor();
    const caixa = await mapa.boundingBox();
    if (!caixa) throw new Error("mapa sem bounding box");

    const tamanhos = await page.evaluate(() => {
      const estilo = getComputedStyle(document.documentElement);
      return {
        secao: Number.parseFloat(estilo.getPropertyValue("--spacing-marcador-secao")),
        local: Number.parseFloat(estilo.getPropertyValue("--spacing-marcador-local")),
        pontoRota: Number.parseFloat(
          estilo.getPropertyValue("--spacing-marcador-ponto-rota"),
        ),
      };
    });
    expect(tamanhos.pontoRota).toBeLessThan(tamanhos.local);
    expect(tamanhos.local).toBeLessThan(tamanhos.secao);
    await expect(mapa.locator(".marcador-mapa-quadrado")).toHaveCount(3);

    // Centro do mapa cai em Jaú e fora da rota congelada. Clique direito
    // acrescenta o Local ao fim; RN-035 recusa antes de chamar o OSRM.
    await mapa.click({
      button: "right",
      position: { x: caixa.width / 2, y: caixa.height / 2 },
    });
    await page.getByRole("menuitem", { name: "Local" }).click();
    await page.getByTestId("nome-local-input").fill("Local extremo E2E");
    await page.getByTestId("confirmar-criar-local").click();

    expect(chamadasOsrm).toBe(0);
    await expect(page.getByTestId("avisos-montagem-invalida")).toBeVisible();
    const linhaInvalida = page.locator(
      '[data-testid="parada-item"][data-estado="local-extremo"]',
    );
    await expect(linhaInvalida).toContainText("Jaú - Local extremo E2E");
    const alvoErro = linhaInvalida.getByTestId("parada-local-extremo");
    await expect(alvoErro).toHaveAttribute("aria-invalid", "true");
    await alvoErro.focus();
    await expect(linhaInvalida.getByTestId("tooltip-balao")).toContainText(
      "a última Parada deve ser uma Seção",
    );
    const marcadorLocal = mapa.locator(".marcador-mapa-circulo.marcador-mapa--medio");
    await expect(marcadorLocal).toHaveCount(1);
    await expect(marcadorLocal).toHaveClass(/marcador-mapa--invalido/);
    await expect(marcadorLocal).toHaveCSS("background-color", "rgb(22, 163, 74)");
    await expect(marcadorLocal).toHaveCSS("border-color", "rgb(220, 38, 38)");

    await page.locator('[data-testid="etapa-botao"][data-etapa="exportacao"]').click();
    await expect(page.getByTestId("botao-exportar-proposta")).toBeDisabled();
    await expect(page.getByTestId("exportacao-motivos-bloqueio")).toContainText(
      "Local ocupando a última Parada",
    );

    // Retorna à ocorrência e acrescenta uma Seção em outro ponto de Jaú. O
    // Local passa a intermediário, os realces somem e o OSRM mockado calcula.
    await page
      .locator('[data-testid="etapa-botao"][data-etapa="secoes-locais-itinerarios"]')
      .click();
    await page.getByTestId("select-servico-itinerario").selectOption({ label: "0001-1SU" });
    await page.locator('[data-testid="botao-sentido"][data-sentido="volta"]').click();
    const mapaRetorno = page.getByTestId("mapa-base");
    await mapaRetorno.locator(".maplibregl-marker").first().waitFor();
    const caixaRetorno = await mapaRetorno.boundingBox();
    if (!caixaRetorno) throw new Error("mapa sem bounding box no retorno");
    await mapaRetorno.click({
      button: "right",
      position: { x: caixaRetorno.width / 2 + 30, y: caixaRetorno.height / 2 },
    });
    await page.getByRole("menuitem", { name: "Seção" }).click();
    await page.getByTestId("nome-secao-input").fill("Seção final E2E");
    await page.getByTestId("confirmar-criar-secao").click();

    await expect(page.getByTestId("recalculando-rota")).toHaveCount(0);
    // TASK-077: criar a Seção na Volta espelha a inserção na Ida (bidirecional,
    // sem Locais) — 2 chamadas (Volta + Ida), não mais 1.
    expect(chamadasOsrm).toBe(2);
    await expect(page.locator('[data-testid="parada-item"][data-estado="local-extremo"]')).toHaveCount(0);
    await expect(mapaRetorno.locator(".marcador-mapa--invalido")).toHaveCount(0);
    await expect(page.getByTestId("avisos-montagem-invalida")).toHaveCount(0);

    // Move o mesmo Local válido até a primeira posição. Os dois primeiros
    // movimentos ainda o deixam intermediário e recalculam; o terceiro viola
    // RN-035 e é recusado antes do OSRM. Mover um LOCAL nunca espelha
    // (TASK-077: só gesto de Seção dispara o espelho) — cada movimento válido
    // soma exatamente 1 chamada, a partir da base de 2 acima.
    const linhaLocal = page
      .locator('[data-testid="parada-item"]')
      .filter({ hasText: "Jaú - Local extremo E2E" });
    await linhaLocal.getByTestId("parada-mover-cima").click();
    await expect.poll(() => chamadasOsrm).toBe(3);
    await linhaLocal.getByTestId("parada-mover-cima").click();
    await expect.poll(() => chamadasOsrm).toBe(4);
    await linhaLocal.getByTestId("parada-mover-cima").click();

    await expect(linhaLocal).toHaveAttribute("data-estado", "local-extremo");
    const alvoErroInicial = linhaLocal.getByTestId("parada-local-extremo");
    await expect(alvoErroInicial).toHaveAttribute("aria-invalid", "true");
    await alvoErroInicial.focus();
    await expect(linhaLocal.getByTestId("tooltip-balao")).toContainText(
      "a primeira Parada deve ser uma Seção",
    );
    await expect(mapaRetorno.locator(".marcador-mapa--invalido")).toHaveCount(1);
    expect(chamadasOsrm).toBe(4);

    // O erro pertence à ocorrência da Volta: a Ida do mesmo Serviço não
    // herda a borda nem a linha inválida.
    await page.locator('[data-testid="botao-sentido"][data-sentido="ida"]').click();
    await expect(
      page.locator('[data-testid="parada-item"][data-estado="local-extremo"]'),
    ).toHaveCount(0);
    await expect(mapaRetorno.locator(".marcador-mapa--invalido")).toHaveCount(0);

    await page.locator('[data-testid="botao-sentido"][data-sentido="volta"]').click();
    await expect(linhaLocal).toHaveAttribute("data-estado", "local-extremo");
    await linhaLocal.getByTestId("parada-mover-baixo").click();
    await expect.poll(() => chamadasOsrm).toBe(5);
    await expect(linhaLocal).not.toHaveAttribute("data-estado", "local-extremo");
    await expect(mapaRetorno.locator(".marcador-mapa--invalido")).toHaveCount(0);
  });
});

test.describe("Etapa Seções, Locais e Itinerários — hover da linha (TASK-069)", () => {
  test("mostra o fantasma projetado, limpa fora/ao sair e não chama OSRM", async ({
    page,
  }) => {
    let chamadasOsrm = 0;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamadasOsrm += 1;
      return rota.abort();
    });
    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    await mapa.scrollIntoViewIfNeeded();
    const marcadores = mapa.locator(
      ".maplibregl-marker:not(.marcador-mapa--fantasma)",
    );
    await expect(marcadores).toHaveCount(3);

    const caixaA = await marcadores.nth(0).boundingBox();
    const caixaB = await marcadores.nth(1).boundingBox();
    const caixaMapa = await mapa.boundingBox();
    if (!caixaA || !caixaB || !caixaMapa) throw new Error("mapa/marcador sem bounding box");
    const meio = {
      x: (caixaA.x + caixaA.width / 2 + caixaB.x + caixaB.width / 2) / 2,
      y: (caixaA.y + caixaA.height / 2 + caixaB.y + caixaB.height / 2) / 2,
    };

    await page.mouse.move(meio.x, meio.y);
    const fantasma = mapa.locator(".marcador-mapa--fantasma");
    await expect(fantasma).toHaveCount(1);
    await expect(fantasma).toHaveClass(/marcador-mapa--pequeno/);
    await expect
      .poll(() => mapa.locator("canvas").evaluate((canvas) => canvas.style.cursor))
      .toBe("pointer");
    expect(chamadasOsrm).toBe(0);

    const foraY =
      meio.y + 50 < caixaMapa.y + caixaMapa.height ? meio.y + 50 : meio.y - 50;
    await page.mouse.move(meio.x, foraY);
    await expect(fantasma).toHaveCount(0);
    await expect
      .poll(() => mapa.locator("canvas").evaluate((canvas) => canvas.style.cursor))
      .toBe("");
    expect(chamadasOsrm).toBe(0);

    await page.mouse.move(meio.x, meio.y);
    await expect(fantasma).toHaveCount(1);
    await mapa.dispatchEvent("mouseleave");
    await expect(fantasma).toHaveCount(0);
    expect(chamadasOsrm).toBe(0);
  });
});

test.describe("Etapa Seções, Locais e Itinerários — gesto de ponto de rota (TASK-063/069)", () => {
  test("clicar SOBRE a linha da rota cria um ponto de rota (não uma Seção) e recalcula", async ({
    page,
  }) => {
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
                  [-46.396, -23.98],
                  [-46.3915, -23.9629],
                  [-46.3342, -23.9611],
                ],
              },
              legs: [
                { distance: 3000, duration: 400, steps: [{ name: "Via forçada" }] },
                { distance: 3500, duration: 460, steps: [{ name: "Via forçada" }] },
                { distance: 8000, duration: 1080, steps: [{ name: "Via 2" }] },
              ],
            },
          ],
        }),
      });
    });

    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    await expect(mapa).toBeVisible();
    const marcadores = mapa.locator(".maplibregl-marker");
    // 3 marcadores de Seção (Praia Grande, São Vicente, Santos — nesta ordem
    // de travessia, Spec 02 §10.1) plotados antes de qualquer clique.
    await expect(marcadores).toHaveCount(3);
    await mapa.scrollIntoViewIfNeeded();

    // O primeiro segmento da rota congelada (Praia Grande→São Vicente) liga
    // EXATAMENTE as coordenadas dos dois marcadores (fixture sem vias
    // intermediárias) — o ponto médio entre os dois cai sobre a linha
    // desenhada, em pixels de tela, qualquer que seja a projeção do mapa.
    const caixaInicialA = await marcadores.nth(0).boundingBox();
    const caixaInicialB = await marcadores.nth(1).boundingBox();
    if (!caixaInicialA || !caixaInicialB) throw new Error("marcador sem bounding box");
    const meioInicial = {
      x: (caixaInicialA.x + caixaInicialA.width / 2 + caixaInicialB.x + caixaInicialB.width / 2) / 2,
      y: (caixaInicialA.y + caixaInicialA.height / 2 + caixaInicialB.y + caixaInicialB.height / 2) / 2,
    };
    // No zoom inicial do Estado inteiro, os 3 marcadores ficam sobrepostos e
    // cobrem todos os pixels do primeiro segmento (mesma ambiguidade do
    // clique direito, TASK-067) — desde a TASK-064 o marcador tem clique
    // PRÓPRIO (seleção), então um clique nessa faixa acerta o marcador, não a
    // linha. Amplia em torno do próprio segmento para expor a linha sem mudar
    // o alvo geográfico do cenário (o meio do segmento continua o mesmo
    // ponto do mundo real, só renderizado longe da área de qualquer marcador).
    await page.mouse.move(meioInicial.x, meioInicial.y);
    for (let passo = 0; passo < 6; passo += 1) {
      await page.mouse.wheel(0, -500);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(500);

    const caixaA = await marcadores.nth(0).boundingBox();
    const caixaB = await marcadores.nth(1).boundingBox();
    if (!caixaA || !caixaB) throw new Error("marcador sem bounding box");
    const centroA = { x: caixaA.x + caixaA.width / 2, y: caixaA.y + caixaA.height / 2 };
    const centroB = { x: caixaB.x + caixaB.width / 2, y: caixaB.y + caixaB.height / 2 };
    const meio = { x: (centroA.x + centroB.x) / 2, y: (centroA.y + centroB.y) / 2 };

    await page.mouse.click(meio.x, meio.y);

    // Criou ponto de rota, NÃO Seção (DEC-055: esquerdo sobre a linha é
    // ponto de rota; o formulário de Seção não aparece).
    await expect(page.getByTestId("form-criar-secao")).toHaveCount(0);
    await expect(page.getByTestId("tabela-paradas").getByTestId("ponto-rota-item")).toHaveCount(1);
    await expect(page.getByTestId("sub-lista-pontos-de-rota")).toHaveCount(0);

    // A lista lateral única continua com as MESMAS 3 Paradas: o ponto de rota
    // aparece intercalado, mas não recebe `parada-item` (RN-042/DEC-060).
    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(3);

    // O recálculo (RN-052) foi disparado com o ponto de rota intercalado: 3
    // paradas + 1 ponto de rota = 4 coordenadas na URL do OSRM, com
    // `waypoints=` (RN-051 — pass-through do ponto de rota).
    expect(ultimaUrlOsrm).not.toBeNull();
    const url = ultimaUrlOsrm as unknown as string;
    expect(url).toContain("waypoints=");
    const coordenadas = url.match(/\/driving\/([^?]+)/)?.[1] ?? "";
    expect(coordenadas.split(";").length).toBe(4);

    // O ancorador geométrico posiciona este clique no segundo trecho. A seta
    // move o ponto para antes da Parada intermediária: a coordenada não muda,
    // mas os waypoints passam de 0;1;3 para 0;2;3 e o OSRM é chamado novamente
    // (TASK-079/DEC-060; RN-052).
    expect(new URL(url).searchParams.get("waypoints")).toBe("0;1;3");
    const requisicaoMovimento = page.waitForRequest("**/route/v1/driving/**");
    await page.getByTestId("ponto-rota-mover-cima").click();
    const urlMovimento = (await requisicaoMovimento).url();
    expect(new URL(urlMovimento).searchParams.get("waypoints")).toBe("0;2;3");
    await expect(page.getByTestId("tabela-paradas").locator("tbody > tr").nth(1)).toHaveAttribute(
      "data-testid",
      "ponto-rota-item",
    );
  });

  // TASK-097 — arrastar o vértice SOBRE a linha era silenciosamente revertido:
  // o hover (TASK-069/DEC-072) re-renderizava a cada `mousemove` e
  // `sincronizarMarcadores` devolvia o marcador à posição da prop, de modo que
  // o `dragend` lia a coordenada antiga e nada recalculava (Spec 04 §7.3 itens
  // 4/5/6; RN-052).
  test("TASK-097: arrastar o vértice SOBRE a linha aplica a coordenada solta e recalcula", async ({
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
                  [-46.396, -23.98],
                  [-46.3915, -23.9629],
                  [-46.3342, -23.9611],
                ],
              },
              legs: [
                { distance: 3000, duration: 400, steps: [{ name: "Via forçada" }] },
                { distance: 3500, duration: 460, steps: [{ name: "Via forçada" }] },
                { distance: 8000, duration: 1080, steps: [{ name: "Via 2" }] },
              ],
            },
          ],
        }),
      }),
    );

    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    await expect(mapa).toBeVisible();
    const marcadores = mapa.locator(".maplibregl-marker");
    await expect(marcadores).toHaveCount(3);
    await mapa.scrollIntoViewIfNeeded();

    // Mesma aproximação do cenário de criação acima: no zoom inicial os três
    // marcadores cobrem o segmento inteiro, então amplia-se em torno do meio
    // do primeiro trecho para expor a linha nua.
    const caixaInicialA = await marcadores.nth(0).boundingBox();
    const caixaInicialB = await marcadores.nth(1).boundingBox();
    if (!caixaInicialA || !caixaInicialB) throw new Error("marcador sem bounding box");
    const meioInicial = {
      x: (caixaInicialA.x + caixaInicialA.width / 2 + caixaInicialB.x + caixaInicialB.width / 2) / 2,
      y: (caixaInicialA.y + caixaInicialA.height / 2 + caixaInicialB.y + caixaInicialB.height / 2) / 2,
    };
    await page.mouse.move(meioInicial.x, meioInicial.y);
    for (let passo = 0; passo < 6; passo += 1) {
      await page.mouse.wheel(0, -500);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(500);

    const caixaA = await marcadores.nth(0).boundingBox();
    const caixaB = await marcadores.nth(1).boundingBox();
    if (!caixaA || !caixaB) throw new Error("marcador sem bounding box");
    const centroA = { x: caixaA.x + caixaA.width / 2, y: caixaA.y + caixaA.height / 2 };
    const centroB = { x: caixaB.x + caixaB.width / 2, y: caixaB.y + caixaB.height / 2 };
    const meio = { x: (centroA.x + centroB.x) / 2, y: (centroA.y + centroB.y) / 2 };

    await page.mouse.click(meio.x, meio.y);
    const linhaPonto = page.getByTestId("tabela-paradas").getByTestId("ponto-rota-item");
    await expect(linhaPonto).toHaveCount(1);
    const textoAntes = (await linhaPonto.textContent()) ?? "";

    // O vértice é o único marcador "pequeno" do mapa (DEC-069).
    const vertice = mapa.locator(".marcador-mapa--pequeno");
    await expect(vertice).toHaveCount(1);
    const caixaVertice = await vertice.boundingBox();
    if (!caixaVertice) throw new Error("vértice sem bounding box");
    const origem = {
      x: caixaVertice.x + caixaVertice.width / 2,
      y: caixaVertice.y + caixaVertice.height / 2,
    };
    // Destino AINDA SOBRE a linha (25% em direção à Seção A): o trajeto inteiro
    // do arrasto passa dentro da tolerância de 6 px do traçado, que é
    // exatamente a condição que disparava a reversão.
    const destino = {
      x: origem.x + (centroA.x - origem.x) * 0.25,
      y: origem.y + (centroA.y - origem.y) * 0.25,
    };

    const requisicaoArrasto = page.waitForRequest("**/route/v1/driving/**");
    await page.mouse.move(origem.x, origem.y);
    await page.mouse.down();
    // Vários passos: cada `mousemove` sobre a linha é um re-render do hover —
    // o mecanismo que revertia o gesto.
    await page.mouse.move(destino.x, destino.y, { steps: 12 });
    await page.mouse.up();

    // O soltar recalculou (RN-052) e a coordenada listada mudou: o gesto NÃO
    // foi revertido.
    await requisicaoArrasto;
    await expect(linhaPonto).not.toHaveText(textoAntes);
    await expect(page.getByTestId("mensagem-sem-rota")).toHaveCount(0);
    await expect(
      page.locator(
        '[data-testid="painel-pendencias"] [data-testid="pendencia-item"][data-severidade="bloqueante"]',
      ),
    ).toHaveCount(0);
    // O gesto move o vértice, nunca o remove nem cria parada nova (RN-042).
    await expect(linhaPonto).toHaveCount(1);
    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(3);
  });

  test("TASK-071: ponto de rota sobrevive a um recálculo que falha; o recálculo seguinte bem-sucedido o reaplica", async ({
    page,
  }) => {
    // TASK-077: "mover uma parada" abaixo é sempre gesto de SEÇÃO (as 3
    // paradas de 0001-1SU são Seções, sem Locais) — espelha na Ida a cada
    // vez. `chamada` conta TODAS as requisições (Volta + Ida espelhada);
    // `chamadaVolta` conta só as da Volta, preservando a numeração original
    // do cenário ("a 2ª tentativa falha") sem ambiguidade. A chamada
    // espelhada da Ida sempre responde OK genérico — não faz parte do
    // cenário de falha/reaplicação de ponto de rota, que é Volta-only.
    let chamada = 0;
    let chamadaVolta = 0;
    let ultimaUrlOsrm: string | null = null;
    const respostaOk = {
      code: "Ok",
      routes: [
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [-46.402, -24.0081],
              [-46.396, -23.98],
              [-46.3915, -23.9629],
              [-46.3342, -23.9611],
            ],
          },
          legs: [
            { distance: 3000, duration: 400, steps: [{ name: "Via forçada" }] },
            { distance: 3500, duration: 460, steps: [{ name: "Via forçada" }] },
            { distance: 8000, duration: 1080, steps: [{ name: "Via 2" }] },
          ],
        },
      ],
    };
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamada += 1;
      const url = rota.request().url();
      if (!ehCoordenadaDaVolta(url)) {
        return rota.fulfill(respostaOsrmGenericaOk(url));
      }
      chamadaVolta += 1;
      // A 2ª tentativa DA VOLTA (após criar o ponto) falha — simula o
      // soluço transitório do OSRM demo (Spec 04 §7.3) que a DEC-058 endereça.
      if (chamadaVolta === 2) {
        return rota.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ code: "NoRoute", routes: [] }),
        });
      }
      ultimaUrlOsrm = url;
      return rota.fulfill({ contentType: "application/json", body: JSON.stringify(respostaOk) });
    });

    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    await expect(mapa).toBeVisible();
    const marcadores = mapa.locator(".maplibregl-marker");
    await expect(marcadores).toHaveCount(3);
    await mapa.scrollIntoViewIfNeeded();

    const caixaInicialA = await marcadores.nth(0).boundingBox();
    const caixaInicialB = await marcadores.nth(1).boundingBox();
    if (!caixaInicialA || !caixaInicialB) throw new Error("marcador sem bounding box");
    const meioInicial = {
      x: (caixaInicialA.x + caixaInicialA.width / 2 + caixaInicialB.x + caixaInicialB.width / 2) / 2,
      y: (caixaInicialA.y + caixaInicialA.height / 2 + caixaInicialB.y + caixaInicialB.height / 2) / 2,
    };
    // Mesma ambiguidade de sobreposição de marcadores da TASK-067/TASK-064 —
    // amplia antes de clicar para acertar a linha, não o marcador (que agora
    // tem clique próprio de seleção).
    await page.mouse.move(meioInicial.x, meioInicial.y);
    for (let passo = 0; passo < 6; passo += 1) {
      await page.mouse.wheel(0, -500);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(500);

    const caixaA = await marcadores.nth(0).boundingBox();
    const caixaB = await marcadores.nth(1).boundingBox();
    if (!caixaA || !caixaB) throw new Error("marcador sem bounding box");
    const centroA = { x: caixaA.x + caixaA.width / 2, y: caixaA.y + caixaA.height / 2 };
    const centroB = { x: caixaB.x + caixaB.width / 2, y: caixaB.y + caixaB.height / 2 };
    const meio = { x: (centroA.x + centroB.x) / 2, y: (centroA.y + centroB.y) / 2 };

    // Chamada 1 (Ok): cria o ponto de rota.
    await page.mouse.click(meio.x, meio.y);
    await expect(page.getByTestId("tabela-paradas").getByTestId("ponto-rota-item")).toHaveCount(1);

    // Chamada 2 (NoRoute): qualquer gesto que dispare recálculo (aqui, mover
    // uma parada) leva o itinerário a `sem-rota` — mas o ponto de rota, que
    // vive agora em estado de sessão PRÓPRIO (DEC-058), não some da lista
    // lateral unificada nem do mapa.
    await page.getByTestId("parada-mover-baixo").first().click();
    await expect(page.getByTestId("mensagem-sem-rota")).toBeVisible();
    await expect(page.getByTestId("tabela-paradas").getByTestId("ponto-rota-item")).toHaveCount(1);

    // Chamada 3 (Ok): o próximo recálculo bem-sucedido REAPLICA o ponto que
    // sobreviveu à falha (Spec 03 §3.6.2) — a URL final leva `waypoints=` e a
    // lista continua com o ponto. Move a mesma parada de volta (mover-baixo
    // de novo — o índice 0 nunca fica desabilitado enquanto não for o último).
    await page.getByTestId("parada-mover-baixo").first().click();
    await expect(page.getByTestId("mensagem-sem-rota")).toHaveCount(0);
    await expect(page.getByTestId("tabela-paradas").getByTestId("ponto-rota-item")).toHaveCount(1);

    // 1 (ponto de rota, Volta-only) + 2×2 (mover-baixo espelha Volta+Ida) = 5.
    expect(chamada).toBe(5);
    expect(ultimaUrlOsrm).not.toBeNull();
    const url = ultimaUrlOsrm as unknown as string;
    expect(url).toContain("waypoints=");
    const coordenadas = url.match(/\/driving\/([^?]+)/)?.[1] ?? "";
    expect(coordenadas.split(";").length).toBe(4);
  });

  test("[inválido] clicar com o esquerdo FORA da linha não cria entidade nem chama OSRM", async ({
    page,
  }) => {
    let chamadasOsrm = 0;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamadasOsrm += 1;
      return rota.abort();
    });
    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    await mapa.locator(".maplibregl-marker").first().waitFor();
    await mapa.scrollIntoViewIfNeeded();
    const caixa = await mapa.boundingBox();
    if (!caixa) throw new Error("mapa sem bounding box");

    // Canto do canvas, longe da rota (que corre entre Praia Grande e Santos,
    // na região central inferior do Estado no zoom default).
    await mapa.click({ position: { x: 5, y: 5 } });

    await expect(page.getByTestId("form-criar-secao")).toHaveCount(0);
    await expect(page.getByTestId("form-criar-local")).toHaveCount(0);
    await expect(page.getByTestId("menu-criar-parada")).toHaveCount(0);
    await expect(page.getByTestId("tabela-paradas").getByTestId("ponto-rota-item")).toHaveCount(0);
    expect(chamadasOsrm).toBe(0);
  });
});

test.describe("Etapa Seções, Locais e Itinerários — sincronização de seleção tabela↔mapa (TASK-064; Spec 04 §7)", () => {
  test("clicar numa linha da tabela realça o marcador correspondente no mapa", async ({ page }) => {
    let chamadasOsrm = 0;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamadasOsrm += 1;
      return rota.abort();
    });
    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    const marcadores = mapa.locator(".maplibregl-marker");
    await expect(marcadores).toHaveCount(3);

    const linhas = page.getByTestId("tabela-paradas").getByTestId("parada-item");
    // Clica no rótulo (não no meio bruto da linha — a coluna "Redefinir" da
    // TASK-100 desloca o centro geométrico da linha para cima de um botão, e o
    // `<tr>` ignora cliques em botões por design).
    await linhas.nth(1).getByTestId("parada-rotulo").click();

    await expect(linhas.nth(1)).toHaveAttribute("aria-current", "true");
    await expect(marcadores.nth(1)).toHaveClass(/marcador-mapa--selecionado/);
    await expect(marcadores.nth(0)).not.toHaveClass(/marcador-mapa--selecionado/);
    await expect(marcadores.nth(2)).not.toHaveClass(/marcador-mapa--selecionado/);
    expect(chamadasOsrm).toBe(0);

    // Clicar de novo desseleciona (toggle) — o realce some dos dois lados.
    await linhas.nth(1).getByTestId("parada-rotulo").click();
    await expect(linhas.nth(1)).not.toHaveAttribute("aria-current", "true");
    await expect(marcadores.nth(1)).not.toHaveClass(/marcador-mapa--selecionado/);
    expect(chamadasOsrm).toBe(0);
  });

  test("linha par selecionada pinta de azul (zebra não mascara o fundo de seleção)", async ({
    page,
  }) => {
    // Bugfix TASK-064: o zebra (`nth-child(even)`) da `<Tabela>` tinha
    // especificidade maior que a classe simples `bg-azul-100` da seleção, e
    // vencia a cascata nas linhas pares — a seleção ficava correta no estado
    // (`aria-current`) mas visualmente invisível. Corrigido excluindo a linha
    // com `aria-current="true"` do zebra/hover em `tabela.tsx`.
    await page.route("https://router.project-osrm.org/**", (rota) => rota.abort());
    await abrirEtapaVolta(page);

    const linhas = page.getByTestId("tabela-paradas").getByTestId("parada-item");
    // nth(1) é a 2ª linha da tabela — `:nth-child(2)`, portanto par. Clica no
    // rótulo (não no meio bruto da linha — TASK-100 desloca o centro
    // geométrico para cima do botão "Redefinir", que o `<tr>` ignora).
    await linhas.nth(1).getByTestId("parada-rotulo").click();
    await expect(linhas.nth(1)).toHaveAttribute("aria-current", "true");
    await expect(linhas.nth(1)).toHaveCSS("background-color", "rgb(219, 234, 254)");
  });

  test("clicar num marcador no mapa realça a linha correspondente na tabela e rola até ela", async ({
    page,
  }) => {
    let chamadasOsrm = 0;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamadasOsrm += 1;
      return rota.abort();
    });
    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    const marcadores = mapa.locator(".maplibregl-marker");
    await expect(marcadores).toHaveCount(3);

    // Praia Grande/São Vicente/Santos são cidades vizinhas na Baixada
    // Santista — no zoom inicial do Estado inteiro os 3 marcadores ficam tão
    // próximos que um cobre o outro, e um clique por coordenada de tela
    // (mesmo com `force`) acerta o marcador que estiver por cima, não
    // necessariamente o do índice esperado. O teste alvo é a identidade do
    // marcador (seu elemento DOM), não a geometria de tela — como o
    // clique-na-linha da TASK-067 — então despacha o evento diretamente no
    // elemento do marcador do meio (São Vicente), sem depender de qual
    // marcador está visualmente por cima naquele pixel.
    await marcadores.nth(1).dispatchEvent("click");

    const linhas = page.getByTestId("tabela-paradas").getByTestId("parada-item");
    await expect(linhas.nth(1)).toHaveAttribute("aria-current", "true");
    await expect(linhas.nth(1)).toContainText("São Vicente");
    await expect(linhas.nth(1)).toBeInViewport();
    expect(chamadasOsrm).toBe(0);
  });
});

test.describe("Etapa Seções, Locais e Itinerários — prioridade de clique entre marcadores sobrepostos (bugfix TASK-064)", () => {
  test("Seção mantém z-index maior que um ponto de rota criado depois, mesmo sobrepostos no mapa", async ({
    page,
  }) => {
    // Reportado após a entrega da TASK-064: com Seção + Local + ponto de rota
    // + Seção no mesmo itinerário, clicar no marcador de alguns deles não
    // realçava a linha da tabela. Causa: `<Mapa>` cria os marcadores na ordem
    // em que aparecem no array de `marcadores`; um marcador criado DEPOIS
    // (ex.: um ponto de rota adicionado ao vivo, já com o mapa montado) entra
    // por último no DOM e, sem `z-index` explícito, passa a cobrir cliques de
    // marcadores mais antigos (Seção/Local) sempre que ficam próximos na
    // tela — mesmo a Seção sendo maior/visualmente por cima. Corrigido com
    // `z-index` fixo por classe em `globals.css` (Seção > Local > ponto de
    // rota, a mesma hierarquia de tamanho da DEC-069), que funciona
    // independente da ordem/momento de criação, já que os marcadores do
    // MapLibre são `position: absolute`.
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
                  [-46.396, -23.98],
                  [-46.3915, -23.9629],
                  [-46.3342, -23.9611],
                ],
              },
              legs: [
                { distance: 3000, duration: 400, steps: [{ name: "Via forçada" }] },
                { distance: 3500, duration: 460, steps: [{ name: "Via forçada" }] },
                { distance: 8000, duration: 1080, steps: [{ name: "Via 2" }] },
              ],
            },
          ],
        }),
      }),
    );
    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    const marcadores = mapa.locator(".maplibregl-marker");
    await expect(marcadores).toHaveCount(3);
    await mapa.scrollIntoViewIfNeeded();

    // Cria um ponto de rota ao vivo — o mapa (e os marcadores de Seção) já
    // estava montado ANTES deste marcador existir, o cenário exato do relato.
    // Amplia primeiro (mesma técnica da TASK-067/069) para acertar a LINHA,
    // não um marcador — cidades vizinhas se sobrepõem no zoom do Estado.
    const caixaInicialA = await marcadores.nth(0).boundingBox();
    const caixaInicialB = await marcadores.nth(1).boundingBox();
    if (!caixaInicialA || !caixaInicialB) throw new Error("marcador sem bounding box");
    const meioInicial = {
      x: (caixaInicialA.x + caixaInicialA.width / 2 + caixaInicialB.x + caixaInicialB.width / 2) / 2,
      y: (caixaInicialA.y + caixaInicialA.height / 2 + caixaInicialB.y + caixaInicialB.height / 2) / 2,
    };
    await page.mouse.move(meioInicial.x, meioInicial.y);
    for (let passo = 0; passo < 6; passo += 1) {
      await page.mouse.wheel(0, -500);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(500);

    const caixaA = await marcadores.nth(0).boundingBox();
    const caixaB = await marcadores.nth(1).boundingBox();
    if (!caixaA || !caixaB) throw new Error("marcador sem bounding box");
    const meio = {
      x: (caixaA.x + caixaA.width / 2 + caixaB.x + caixaB.width / 2) / 2,
      y: (caixaA.y + caixaA.height / 2 + caixaB.y + caixaB.height / 2) / 2,
    };
    await page.mouse.click(meio.x, meio.y);
    await expect(page.getByTestId("tabela-paradas").getByTestId("ponto-rota-item")).toHaveCount(1);

    const zIndices = await page.evaluate(() => {
      const secao = document.querySelector(".marcador-mapa-quadrado");
      const ponto = document.querySelector(".marcador-mapa--pequeno");
      return {
        secao: secao ? Number(getComputedStyle(secao).zIndex) : null,
        ponto: ponto ? Number(getComputedStyle(ponto).zIndex) : null,
      };
    });
    expect(zIndices.secao).not.toBeNull();
    expect(zIndices.ponto).not.toBeNull();
    expect(zIndices.secao as number).toBeGreaterThan(zIndices.ponto as number);
  });
});

test.describe("Etapa Seções, Locais e Itinerários — feedback de montagem inválida (TASK-047)", () => {
  test("remover paradas até restar 1 acende o aviso de RN-034, sem chamar o OSRM de novo nem apagar a última rota válida", async ({
    page,
  }) => {
    let chamadasOsrm = 0;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamadasOsrm += 1;
      return rota.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          code: "Ok",
          routes: [
            {
              geometry: { type: "LineString", coordinates: [[-46.3919, -23.9631], [-46.3339, -23.9608]] },
              legs: [{ distance: 8000, duration: 1080, steps: [{ name: "Via Remanescente" }] }],
            },
          ],
        }),
      });
    });

    await abrirEtapaVolta(page);

    // Volta tem 3 paradas, todas Seções (Praia Grande, São Vicente, Santos).
    // Remover a primeira deixa 2 paradas — montagem ainda válida, recalcula
    // com sucesso (fixa a última rota válida do documento). TASK-077: a
    // remoção espelha na Ida (também some com 3→2 paradas, válida) — 2
    // chamadas, não mais 1 (mesma resposta serve às duas, coincidência
    // segura: as duas terminam com 2 paradas, mesmo nº de legs).
    await page.getByTestId("parada-remover").first().click();
    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(2);
    await expect(page.getByTestId("descricao-texto")).toContainText("Via Remanescente");
    expect(chamadasOsrm).toBe(2);

    // Remover a última parada restante deixa só 1 — RN-034 (mínimo 2). O
    // motor recusa ANTES de chamar o OSRM (não é falha de rota, é montagem em
    // andamento — resolverParadasRota nunca chega a resolver as paradas). O
    // espelho na Ida também fica com 1 parada só (mesma Seção removida) —
    // igualmente recusado antes do OSRM, sem nenhuma chamada nova.
    await page.getByTestId("parada-remover").first().click();

    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(1);
    await expect(page.getByTestId("avisos-montagem-invalida")).toBeVisible();
    await expect(page.getByTestId("aviso-montagem-invalida")).toContainText(
      "O itinerário precisa de ao menos 2 paradas",
    );
    // Nenhuma menção a tarifa/R$ na mensagem exibida (RN-049).
    await expect(page.getByTestId("aviso-montagem-invalida")).not.toContainText(/tarifa|R\$/i);
    expect(chamadasOsrm).toBe(2); // nenhuma chamada nova para a tentativa inválida

    // Sem pendência de "sem rota" — a última rota VÁLIDA (com 2 paradas)
    // continua sendo a exibida; a tentativa inválida não a apaga (RN-048).
    await expect(page.getByTestId("mensagem-sem-rota")).toHaveCount(0);
    await expect(page.getByTestId("descricao-texto")).toContainText("Via Remanescente");
  });

  test("TASK-067: clique direito sobre a linha insere uma Seção entre as Paradas do trecho", async ({
    page,
  }) => {
    let chamadasOsrm = 0;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamadasOsrm += 1;
      return rota.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          code: "Ok",
          routes: [
            {
              geometry: { type: "LineString", coordinates: [[-46.402, -24.0081], [-46.3339, -23.9608]] },
              legs: [
                { distance: 6100, duration: 750, steps: [{ name: "Via 1" }] },
                { distance: 8000, duration: 1080, steps: [{ name: "Via 2" }] },
                { distance: 1000, duration: 120, steps: [{ name: "Via 3" }] },
              ],
            },
          ],
        }),
      });
    });

    await abrirEtapaVolta(page);

    // As 3 Seções já plotadas servem de sinal de que o MapLibre está pronto.
    // O clique direito é feito SOBRE a linha: o hit-test da TASK-065 agora
    // escolhe o caminho posicional da TASK-067.
    const mapa = page.getByTestId("mapa-base");
    const marcadores = mapa.locator(
      ".maplibregl-marker:not(.marcador-mapa--fantasma)",
    );
    await marcadores.first().waitFor();
    await expect(mapa).toBeVisible();
    await mapa.scrollIntoViewIfNeeded();

    // No zoom inicial do Estado inteiro, os 3 marcadores ficam sobrepostos e
    // cobrem todos os pixels do primeiro segmento. Nesse estado, o clique no
    // ponto médio acerta o elemento DOM de um marcador, não o canvas do mapa.
    // Amplia em torno do próprio segmento para expor a linha sem mudar o alvo
    // geométrico do cenário (clique direito SOBRE a linha).
    const caixaInicialA = await marcadores.nth(0).boundingBox();
    const caixaInicialB = await marcadores.nth(1).boundingBox();
    if (!caixaInicialA || !caixaInicialB) throw new Error("marcador sem bounding box");
    const meioInicial = {
      x:
        (caixaInicialA.x +
          caixaInicialA.width / 2 +
          caixaInicialB.x +
          caixaInicialB.width / 2) /
        2,
      y:
        (caixaInicialA.y +
          caixaInicialA.height / 2 +
          caixaInicialB.y +
          caixaInicialB.height / 2) /
        2,
    };
    await page.mouse.move(meioInicial.x, meioInicial.y);
    for (let passo = 0; passo < 6; passo += 1) {
      await page.mouse.wheel(0, -500);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(500);

    const caixaA = await marcadores.nth(0).boundingBox();
    const caixaB = await marcadores.nth(1).boundingBox();
    if (!caixaA || !caixaB) throw new Error("marcador sem bounding box");
    const centroA = { x: caixaA.x + caixaA.width / 2, y: caixaA.y + caixaA.height / 2 };
    const centroB = { x: caixaB.x + caixaB.width / 2, y: caixaB.y + caixaB.height / 2 };
    // 85% do segmento A→B continua exatamente sobre a linha, mas fica fora
    // dos círculos de 16 px que interceptariam o evento antes do MapLibre.
    const pontoSobreLinha = {
      x: centroA.x + (centroB.x - centroA.x) * 0.85,
      y: centroA.y + (centroB.y - centroA.y) * 0.85,
    };
    await page.mouse.click(pontoSobreLinha.x, pontoSobreLinha.y, { button: "right" });
    await page.getByRole("menuitem", { name: "Seção" }).click();

    await page.getByTestId("nome-secao-input").fill("Nova Seção Posicional E2E");
    await page.getByTestId("confirmar-criar-secao").click();

    // O alvo está no trecho entre a segunda e a terceira Paradas da travessia:
    // a nova Seção entra diretamente com ordem 3, sem setinhas intermediárias.
    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(4);
    await expect(page.getByTestId("avisos-montagem-invalida")).toHaveCount(0);
    const rotulos = page.getByTestId("tabela-paradas").getByTestId("parada-rotulo");
    await expect(rotulos.nth(2)).toContainText("Nova Seção Posicional E2E");
    await expect(rotulos.last()).toHaveText("Santos - Terminal Santos");
    // TASK-077: a inserção espelha na Ida (3→4 paradas também lá) — 2
    // chamadas, não mais 1.
    expect(chamadasOsrm).toBe(2);
  });

  test("TASK-098/DEC-078: clique direito PERTO (não exatamente sobre) a linha entrega a Seção com a coordenada PROJETADA no traçado, não a bruta do cursor", async ({
    page,
  }) => {
    let chamadasOsrm = 0;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamadasOsrm += 1;
      return rota.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          code: "Ok",
          routes: [
            {
              geometry: { type: "LineString", coordinates: [[-46.402, -24.0081], [-46.3339, -23.9608]] },
              legs: [
                { distance: 6100, duration: 750, steps: [{ name: "Via 1" }] },
                { distance: 8000, duration: 1080, steps: [{ name: "Via 2" }] },
                { distance: 1000, duration: 120, steps: [{ name: "Via 3" }] },
              ],
            },
          ],
        }),
      });
    });

    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    const marcadores = mapa.locator(
      ".maplibregl-marker:not(.marcador-mapa--fantasma)",
    );
    await marcadores.first().waitFor();
    await expect(mapa).toBeVisible();
    await mapa.scrollIntoViewIfNeeded();

    const caixaInicialA = await marcadores.nth(0).boundingBox();
    const caixaInicialB = await marcadores.nth(1).boundingBox();
    if (!caixaInicialA || !caixaInicialB) throw new Error("marcador sem bounding box");
    const meioInicial = {
      x:
        (caixaInicialA.x +
          caixaInicialA.width / 2 +
          caixaInicialB.x +
          caixaInicialB.width / 2) /
        2,
      y:
        (caixaInicialA.y +
          caixaInicialA.height / 2 +
          caixaInicialB.y +
          caixaInicialB.height / 2) /
        2,
    };
    await page.mouse.move(meioInicial.x, meioInicial.y);
    for (let passo = 0; passo < 6; passo += 1) {
      await page.mouse.wheel(0, -500);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(500);

    const caixaA = await marcadores.nth(0).boundingBox();
    const caixaB = await marcadores.nth(1).boundingBox();
    if (!caixaA || !caixaB) throw new Error("marcador sem bounding box");
    const centroA = { x: caixaA.x + caixaA.width / 2, y: caixaA.y + caixaA.height / 2 };
    const centroB = { x: caixaB.x + caixaB.width / 2, y: caixaB.y + caixaB.height / 2 };
    // Ponto exatamente SOBRE a linha (85% do segmento, mesmo alvo da TASK-067).
    const pontoNaLinha = {
      x: centroA.x + (centroB.x - centroA.x) * 0.85,
      y: centroA.y + (centroB.y - centroA.y) * 0.85,
    };
    // Desloca o clique alguns pixels na perpendicular do segmento — ainda
    // dentro da tolerância de 6 px do hit-test (`TOLERANCIA_PX` em mapa.tsx),
    // mas fora da linha exata. Antes da DEC-078, a Seção nasceria neste ponto
    // deslocado; depois, nasce projetada de volta em `pontoNaLinha`.
    const dx = centroB.x - centroA.x;
    const dy = centroB.y - centroA.y;
    const comprimento = Math.hypot(dx, dy);
    const perpX = -dy / comprimento;
    const perpY = dx / comprimento;
    const deslocamentoPx = 3;
    const pontoClicado = {
      x: pontoNaLinha.x + perpX * deslocamentoPx,
      y: pontoNaLinha.y + perpY * deslocamentoPx,
    };

    await page.mouse.click(pontoClicado.x, pontoClicado.y, { button: "right" });
    await page.getByRole("menuitem", { name: "Seção" }).click();
    await page.getByTestId("nome-secao-input").fill("Seção Projetada E2E");
    await page.getByTestId("confirmar-criar-secao").click();

    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(4);
    await expect(page.getByTestId("avisos-montagem-invalida")).toHaveCount(0);
    expect(chamadasOsrm).toBe(2);

    const novoMarcador = mapa.locator(".marcador-mapa-quadrado").last();
    const caixaNovoMarcador = await novoMarcador.boundingBox();
    if (!caixaNovoMarcador) throw new Error("novo marcador sem bounding box");
    const centroNovoMarcador = {
      x: caixaNovoMarcador.x + caixaNovoMarcador.width / 2,
      y: caixaNovoMarcador.y + caixaNovoMarcador.height / 2,
    };

    const distanciaAtePontoNaLinha = Math.hypot(
      centroNovoMarcador.x - pontoNaLinha.x,
      centroNovoMarcador.y - pontoNaLinha.y,
    );
    const distanciaAtePontoClicado = Math.hypot(
      centroNovoMarcador.x - pontoClicado.x,
      centroNovoMarcador.y - pontoClicado.y,
    );
    // A Seção nasce mais perto da linha (projeção) do que do pixel bruto onde
    // o botão direito foi clicado — a assinatura visual da DEC-078.
    expect(distanciaAtePontoNaLinha).toBeLessThan(distanciaAtePontoClicado);
    expect(distanciaAtePontoNaLinha).toBeLessThan(deslocamentoPx);
  });
});

test.describe('TASK-094 — Local nasce unidirecional; o "X" remove a entidade (DEC-075/DEC-076)', () => {
  test('criar Local e remover pelo "X": entidade some da tabela e da lista; gesto "Excluir ponto deste sentido" não existe mais', async ({
    page,
  }) => {
    await page.route("https://router.project-osrm.org/**", (rota) => {
      const url = rota.request().url();
      return rota.fulfill(respostaOsrmGenericaOk(url));
    });

    await abrirEtapaVolta(page);
    const mapa = page.getByTestId("mapa-base");
    await mapa.locator(".maplibregl-marker").first().waitFor();
    const caixa = await mapa.boundingBox();
    if (!caixa) throw new Error("mapa sem bounding box");

    // Centro do mapa (fora da rota congelada, Jaú — mesmo ponto do TASK-068):
    // clique direito acrescenta o Local ao FIM (sem `posicaoNaLinha`).
    await mapa.click({
      button: "right",
      position: { x: caixa.width / 2, y: caixa.height / 2 },
    });
    await page.getByRole("menuitem", { name: "Local" }).click();
    await page.getByTestId("nome-local-input").fill("Local TASK-094 E2E");
    await page.getByTestId("confirmar-criar-local").click();

    const linhaLocal = page
      .locator('[data-testid="parada-item"]')
      .filter({ hasText: "Local TASK-094 E2E" });
    await expect(linhaLocal).toHaveCount(1);

    // DEC-076: o gesto antigo (excluir só o ponto de um sentido) não existe
    // mais em lugar nenhum da tela — nem o rótulo, nem os testids
    // `excluir-sentido-*`.
    await expect(page.getByText("Excluir ponto deste sentido")).toHaveCount(0);
    await expect(page.locator('[data-testid^="excluir-sentido-"]')).toHaveCount(0);

    // O "X" da linha do Local remove a ENTIDADE (não só a Parada): some da
    // tabela e da lista lateral de Locais do mapa.
    await linhaLocal.getByTestId("parada-remover").click();
    await expect(linhaLocal).toHaveCount(0);
    await expect(page.getByText("Local TASK-094 E2E")).toHaveCount(0);

    // Locais são livres por sentido (Spec 02 §14; Spec 04 §7.2) — o Local
    // criado só na Volta nunca apareceu na Ida.
    await page.locator('[data-testid="botao-sentido"][data-sentido="ida"]').click();
    await expect(page.getByText("Local TASK-094 E2E")).toHaveCount(0);
  });
});

test.describe("TASK-096 — criar Local num Serviço do fluxo criar-do-zero JÁ PROMOVIDO (DEC-053)", () => {
  test("criar-do-zero → Serviço → itinerário com rota → Local: a entidade é gravada, aparece com o nome e a etapa segue navegável", async ({
    page,
  }) => {
    // Nenhuma resposta fixa: `respostaOsrmGenericaOk` deriva legs/geometria do
    // número de coordenadas de CADA requisição — a rota cresce de 2 (as duas
    // Seções) para 3 paradas (Local intermediário inserido depois).
    await page.route("https://router.project-osrm.org/**", (rota) => {
      const url = rota.request().url();
      return rota.fulfill(respostaOsrmGenericaOk(url));
    });
    await page.route("https://tile.openstreetmap.org/**", (rota) =>
      rota.fulfill({ contentType: "image/png", body: PNG_1x1 }),
    );

    // Criar do zero (Identificação) — Spec 04 §5; DEC-064.
    await page.goto("/");
    await page.getByTestId("acao-criar-zero").getByRole("button").click();
    await page.getByTestId("confirmar-criar-zero").click();
    await expect(page.getByTestId("layout-formulario")).toBeVisible();
    await page.getByTestId("seletor-autos").selectOption("1");
    await page.getByTestId("select-tipo").selectOption("Rodoviário");

    // Serviço unidirecional "Ida" (DEC-035) — só precisa do necessário para o
    // itinerário: numero_n/carater já vêm com sugestão/padrão.
    await page.getByTestId("etapa-botao").filter({ hasText: "Serviços" }).click();
    await expect(page.getByTestId("etapa-servicos")).toBeVisible();
    await page.getByTestId("servico-criar").click();
    await page.getByTestId("form-direcionalidade").selectOption("ida");
    await page.getByTestId("form-salvar").click();
    await expect(page.getByTestId("servico-item")).toHaveCount(1);
    const numeroN = (await page.getByTestId("servico-numero-n").textContent())!.trim();

    // Etapa de mapa: o Serviço ainda está em `servicosEmConstrucao` (DEC-035) —
    // nenhum itinerário até as duas Seções extremas serem lançadas (RN-035).
    await page
      .locator('[data-testid="etapa-botao"][data-etapa="secoes-locais-itinerarios"]')
      .click();
    await expect(page.getByTestId("etapa-itinerarios")).toBeVisible();
    await page.getByTestId("select-servico-itinerario").selectOption({ label: numeroN });
    await page.locator('[data-testid="botao-sentido"][data-sentido="ida"]').click();

    const mapa = page.getByTestId("mapa-base");
    await expect(mapa).toBeVisible();
    await mapa.scrollIntoViewIfNeeded();
    const caixa = await mapa.boundingBox();
    if (!caixa) throw new Error("mapa sem bounding box");

    // Duas Seções em pontos distintos (extremos — RN-035). A primeira não
    // dispara OSRM (RN-034: mínimo 2 paradas); a segunda fecha o itinerário e
    // recalcula — com rota válida, o Serviço é PROMOVIDO (DEC-053; TASK-061),
    // saindo de `servicosEmConstrucao` para a lista de Serviços completos. É
    // exatamente esse estado (Serviço promovido no modo "novo") em que o bug
    // relatado descartava o Local.
    await mapa.click({
      button: "right",
      position: { x: caixa.width / 2 - 40, y: caixa.height / 2 },
    });
    await page.getByRole("menuitem", { name: "Seção" }).click();
    await page.getByTestId("nome-secao-input").fill("Seção A E2E");
    await page.getByTestId("confirmar-criar-secao").click();
    await expect(
      page.getByTestId("tabela-paradas").getByTestId("parada-item"),
    ).toHaveCount(1);

    await mapa.click({
      button: "right",
      position: { x: caixa.width / 2 + 40, y: caixa.height / 2 },
    });
    await page.getByRole("menuitem", { name: "Seção" }).click();
    await page.getByTestId("nome-secao-input").fill("Seção B E2E");
    await page.getByTestId("confirmar-criar-secao").click();
    await expect(
      page.getByTestId("tabela-paradas").getByTestId("parada-item"),
    ).toHaveCount(2);
    await expect(page.getByTestId("recalculando-rota")).toHaveCount(0);

    // Local INTERMEDIÁRIO: clique exatamente sobre a linha da rota, entre os
    // dois marcadores de Seção, ancora a inserção no meio (TASK-067/DEC-055)
    // — não no fim, que violaria RN-035 e mascararia o cenário do bug.
    const marcadores = mapa.locator(".maplibregl-marker");
    await expect(marcadores).toHaveCount(2);
    const caixaA = await marcadores.nth(0).boundingBox();
    const caixaB = await marcadores.nth(1).boundingBox();
    if (!caixaA || !caixaB) throw new Error("marcador de Seção sem bounding box");
    const meio = {
      x: (caixaA.x + caixaA.width / 2 + caixaB.x + caixaB.width / 2) / 2,
      y: (caixaA.y + caixaA.height / 2 + caixaB.y + caixaB.height / 2) / 2,
    };
    await mapa.click({ button: "right", position: { x: meio.x - caixa.x, y: meio.y - caixa.y } });
    await page.getByRole("menuitem", { name: "Local" }).click();
    await page.getByTestId("nome-local-input").fill("Local E2E");
    await page.getByTestId("confirmar-criar-local").click();

    // Critérios de aceite da TASK-096: a tabela mostra "Cidade - Nome" (nunca
    // o UUID cru), nenhum aviso de montagem por RN-036, e a etapa continua
    // navegável — a Parada do Local resolveu contra a entidade de verdade.
    const linhaLocal = page
      .locator('[data-testid="parada-item"]')
      .filter({ hasText: "Local E2E" });
    await expect(linhaLocal).toHaveCount(1);
    await expect(linhaLocal.getByTestId("parada-rotulo")).not.toHaveText(
      /^[0-9a-f-]{36}$/i,
    );
    await expect(page.getByTestId("avisos-montagem-invalida")).toHaveCount(0);
    await expect(
      page.getByTestId("tabela-paradas").getByTestId("parada-item"),
    ).toHaveCount(3);

    // A etapa continua aceitando gestos depois do Local: um novo clique cria
    // mais uma Seção e a tabela chega a 4 paradas. É o contraponto do terceiro
    // sintoma relatado (o mapa parava de responder), mas por um gesto de
    // Seção — a criação de PONTO DE ROTA em si é aferida no teste de
    // integração unitário (`etapa-itinerarios.test.tsx`, describe da TASK-096),
    // que chama `aoCriarPontoDeRota` e compara `pontosDeRotaEmEdicao`.
    await mapa.click({
      button: "right",
      position: { x: caixa.width / 2, y: caixa.height / 2 + 60 },
    });
    await page.getByRole("menuitem", { name: "Seção" }).click();
    await page.getByTestId("nome-secao-input").fill("Confirma navegação E2E");
    await page.getByTestId("confirmar-criar-secao").click();
    await expect(
      page.getByTestId("tabela-paradas").getByTestId("parada-item"),
    ).toHaveCount(4);
  });
});

// TASK-078 (DEC-061/079) — reprovação anterior (docs-dev/14-REVISOES/
// TASK-078-20260724.md): sem `stopPropagation()` no `mousedown` do botão
// direito, o `mousedown` borbulhava do marcador até o container do MapLibre
// e engatava o arrasto NATIVO (o mesmo do botão esquerdo) — o botão direito
// também translada a Seção inteira, tornando os dois gestos indistinguíveis
// no navegador real (o mock do `Marker` no unitário não modelava esse
// acoplamento). Estes testes rodam num browser de verdade (Playwright), sem
// nenhum dublê do MapLibre, e usam o cluster em cor neutra (aceite da task) —
// os marcadores `secao-cluster-*` (forma QUADRADO, distinta do fantasma
// CIRCULAR de pré-visualização de ponto de rota) — como sinal visível: ele só
// aparece quando o arrasto NATIVO (botão esquerdo) engata `aoIniciarArrasto`
// — o botão direito nunca deve revelá-lo.
const SELETOR_CLUSTER_SECAO = ".marcador-mapa--fantasma.marcador-mapa-quadrado";

test.describe("Mapa — distinção de gesto por botão numa Seção real (TASK-078; DEC-079)", () => {
  test("botão ESQUERDO revela o cluster em cor neutra durante o arrasto (translação real, RN-052)", async ({
    page,
  }) => {
    await page.route("https://router.project-osrm.org/**", (rota) =>
      rota.fulfill(respostaOsrmGenericaOk(rota.request().url())),
    );

    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    await expect(mapa).toBeVisible();
    // Sem isto, o mapa pode ficar fora da área visível da viewport de teste
    // (o container é mais alto que o viewport padrão) e os gestos de mouse
    // abaixo alcançam coordenadas fora da janela, sem efeito algum.
    await mapa.scrollIntoViewIfNeeded();
    const marcadores = mapa.locator(".maplibregl-marker");
    await expect(marcadores).toHaveCount(3);

    // Volta: Praia Grande, São Vicente, Santos (ordem já usada nos demais
    // testes deste arquivo). Santos (índice 2) é a Seção COMPARTILHADA com o
    // Serviço 0001-2SU do fixture — o cluster desta Seção tem outras
    // contribuições além da corrente (0001-1SU/volta).
    const caixa = await marcadores.nth(2).boundingBox();
    if (!caixa) throw new Error("marcador de Santos sem bounding box");
    const centro = { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 };

    // Deslocamento pequeno: a translação não tem limite de 350 m (só fora de
    // SP recusa — RN-029), então nenhum zoom é necessário para manter o
    // gesto dentro do Estado.
    await page.mouse.move(centro.x, centro.y);
    await page.mouse.down();
    await page.mouse.move(centro.x + 8, centro.y + 8, { steps: 5 });

    // Durante o arrasto: os demais pontos da Seção aparecem em cor neutra —
    // prova, num browser real, de que o botão ESQUERDO engatou a translação
    // (não só a função pura já coberta pelo unitário de `fluxos-secao.ts`).
    await expect(page.locator(SELETOR_CLUSTER_SECAO).first()).toBeVisible();

    await page.mouse.up();
  });

  test("botão DIREITO NÃO revela o cluster (regressão-guarda da correção)", async ({ page }) => {
    await page.route("https://router.project-osrm.org/**", (rota) =>
      rota.fulfill(respostaOsrmGenericaOk(rota.request().url())),
    );

    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    await expect(mapa).toBeVisible();
    await mapa.scrollIntoViewIfNeeded();
    const marcadores = mapa.locator(".maplibregl-marker");
    await expect(marcadores).toHaveCount(3);

    const caixa = await marcadores.nth(2).boundingBox();
    if (!caixa) throw new Error("marcador de Santos sem bounding box");
    const centro = { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2 };

    await page.mouse.move(centro.x, centro.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(centro.x + 8, centro.y + 8, { steps: 5 });

    // Causa-raiz da reprovação original: sem `stopPropagation`, este
    // `mousedown` do botão direito alcançava o MapLibre e engatava o arrasto
    // nativo, revelando o cluster também aqui. Com a correção, nunca aparece.
    await expect(page.locator(SELETOR_CLUSTER_SECAO)).toHaveCount(0);

    await page.mouse.up({ button: "right" });

    await expect(page.locator(SELETOR_CLUSTER_SECAO)).toHaveCount(0);
    // O `contextmenu` nativo do navegador segue suprimido (DEC-079) e o menu
    // Seção/Local da DEC-055 (superfície distinta) não abre neste gesto.
    await expect(page.getByRole("menuitem")).toHaveCount(0);
  });
});

// TASK-100 (DEC-080) — botão "redefinir Seção" na tabela lateral, num browser
// real: a Seção "Terminal Santos" (compartilhada pelos 2 Serviços do fixture
// `carregar-multi-servico`) já chega diferenciada — cada Serviço/sentido tem
// sua própria geolocalização (Ida ≠ Volta em ambos, RN-026/027) — sem precisar
// de um arrasto prévio para provar a convergência. Redefinir a colapsa na
// coordenada do Serviço/sentido em edição (0001-1SU/Volta) e dispara a cascata
// de recálculo (RN-052) dos 4 itinerários que a referenciam (2 Serviços ×
// Ida/Volta), igual à cascata da TASK-078.
test.describe("Tabela lateral — redefinir Seção (TASK-100; DEC-080)", () => {
  test("OK aplica: confirma o diálogo, converge os pontos e recalcula os 4 itinerários afetados", async ({
    page,
  }) => {
    let chamadasOsrm = 0;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamadasOsrm += 1;
      return rota.fulfill(respostaOsrmGenericaOk(rota.request().url()));
    });

    await abrirEtapaVolta(page);

    // Volta: Praia Grande, São Vicente, Santos (índice 2) — mesma ordem usada
    // nos demais testes deste arquivo.
    const linhaSantos = page
      .getByTestId("tabela-paradas")
      .getByTestId("parada-item")
      .nth(2);
    await expect(linhaSantos).toContainText("Santos");

    let mensagemDialogo = "";
    page.once("dialog", (dialogo) => {
      mensagemDialogo = dialogo.message();
      void dialogo.accept();
    });
    await linhaSantos.getByTestId("redefinir-secao").click();
    await expect.poll(() => mensagemDialogo).toBe(
      "Gostaria de redefinir todas as geolocalizações desta seção em todos os serviços e sentidos?",
    );

    await expect(page.getByTestId("recalculando-rota")).toHaveCount(0);
    await expect.poll(() => chamadasOsrm).toBe(4);
    await expect(page.getByTestId("mensagem-redefinir-secao")).toHaveCount(0);
    await expect(
      page.locator('[data-testid="parada-item"][data-estado="local-extremo"]'),
    ).toHaveCount(0);
  });

  test("Cancelar não altera nada nem chama o OSRM", async ({ page }) => {
    let chamadasOsrm = 0;
    await page.route("https://router.project-osrm.org/**", (rota) => {
      chamadasOsrm += 1;
      return rota.fulfill(respostaOsrmGenericaOk(rota.request().url()));
    });

    await abrirEtapaVolta(page);

    const linhaSantos = page
      .getByTestId("tabela-paradas")
      .getByTestId("parada-item")
      .nth(2);

    page.once("dialog", (dialogo) => void dialogo.dismiss());
    await linhaSantos.getByTestId("redefinir-secao").click();
    await page.waitForTimeout(200); // margem para um recálculo indevido aparecer, se houver

    expect(chamadasOsrm).toBe(0);
  });
});
