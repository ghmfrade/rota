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
  test("clique direito + Seção cria a entidade, insere a parada e recalcula já com ela", async ({
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

test.describe("Etapa Seções, Locais e Itinerários — gesto de ponto de rota (TASK-063)", () => {
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
    await expect(page.getByTestId("sub-lista-pontos-de-rota").getByTestId("ponto-rota-item")).toHaveCount(1);

    // A tabela de paradas continua com as MESMAS 3 paradas (RN-042: ponto de
    // rota não é Parada, não entra na tabela — Spec 04 §7.3).
    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(3);

    // O recálculo (RN-052) foi disparado com o ponto de rota intercalado: 3
    // paradas + 1 ponto de rota = 4 coordenadas na URL do OSRM, com
    // `waypoints=` (RN-051 — pass-through do ponto de rota).
    expect(ultimaUrlOsrm).not.toBeNull();
    const url = ultimaUrlOsrm as unknown as string;
    expect(url).toContain("waypoints=");
    const coordenadas = url.match(/\/driving\/([^?]+)/)?.[1] ?? "";
    expect(coordenadas.split(";").length).toBe(4);
  });

  test("TASK-071: ponto de rota sobrevive a um recálculo que falha; o recálculo seguinte bem-sucedido o reaplica", async ({
    page,
  }) => {
    let chamada = 0;
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
      // A 2ª tentativa (após criar o ponto) falha — simula o soluço
      // transitório do OSRM demo (Spec 04 §7.3) que a DEC-058 endereça.
      if (chamada === 2) {
        return rota.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ code: "NoRoute", routes: [] }),
        });
      }
      ultimaUrlOsrm = rota.request().url();
      return rota.fulfill({ contentType: "application/json", body: JSON.stringify(respostaOk) });
    });

    await abrirEtapaVolta(page);

    const mapa = page.getByTestId("mapa-base");
    await expect(mapa).toBeVisible();
    const marcadores = mapa.locator(".maplibregl-marker");
    await expect(marcadores).toHaveCount(3);
    await mapa.scrollIntoViewIfNeeded();

    const caixaA = await marcadores.nth(0).boundingBox();
    const caixaB = await marcadores.nth(1).boundingBox();
    if (!caixaA || !caixaB) throw new Error("marcador sem bounding box");
    const centroA = { x: caixaA.x + caixaA.width / 2, y: caixaA.y + caixaA.height / 2 };
    const centroB = { x: caixaB.x + caixaB.width / 2, y: caixaB.y + caixaB.height / 2 };
    const meio = { x: (centroA.x + centroB.x) / 2, y: (centroA.y + centroB.y) / 2 };

    // Chamada 1 (Ok): cria o ponto de rota.
    await page.mouse.click(meio.x, meio.y);
    await expect(page.getByTestId("sub-lista-pontos-de-rota").getByTestId("ponto-rota-item")).toHaveCount(1);

    // Chamada 2 (NoRoute): qualquer gesto que dispare recálculo (aqui, mover
    // uma parada) leva o itinerário a `sem-rota` — mas o ponto de rota, que
    // vive agora em estado de sessão PRÓPRIO (DEC-058), não some da sub-lista
    // nem do mapa.
    await page.getByTestId("parada-mover-baixo").first().click();
    await expect(page.getByTestId("mensagem-sem-rota")).toBeVisible();
    await expect(page.getByTestId("sub-lista-pontos-de-rota").getByTestId("ponto-rota-item")).toHaveCount(1);

    // Chamada 3 (Ok): o próximo recálculo bem-sucedido REAPLICA o ponto que
    // sobreviveu à falha (Spec 03 §3.6.2) — a URL final leva `waypoints=` e a
    // sub-lista continua com o ponto. Move a mesma parada de volta (mover-baixo
    // de novo — o índice 0 nunca fica desabilitado enquanto não for o último).
    await page.getByTestId("parada-mover-baixo").first().click();
    await expect(page.getByTestId("mensagem-sem-rota")).toHaveCount(0);
    await expect(page.getByTestId("sub-lista-pontos-de-rota").getByTestId("ponto-rota-item")).toHaveCount(1);

    expect(chamada).toBe(3);
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
    await expect(page.getByTestId("sub-lista-pontos-de-rota").getByTestId("ponto-rota-item")).toHaveCount(0);
    expect(chamadasOsrm).toBe(0);
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
    // com sucesso (fixa a última rota válida do documento).
    await page.getByTestId("parada-remover").first().click();
    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(2);
    await expect(page.getByTestId("descricao-texto")).toContainText("Via Remanescente");
    expect(chamadasOsrm).toBe(1);

    // Remover a última parada restante deixa só 1 — RN-034 (mínimo 2). O
    // motor recusa ANTES de chamar o OSRM (não é falha de rota, é montagem em
    // andamento — resolverParadasRota nunca chega a resolver as paradas).
    await page.getByTestId("parada-remover").first().click();

    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(1);
    await expect(page.getByTestId("avisos-montagem-invalida")).toBeVisible();
    await expect(page.getByTestId("aviso-montagem-invalida")).toContainText(
      "O itinerário precisa de ao menos 2 paradas",
    );
    // Nenhuma menção a tarifa/R$ na mensagem exibida (RN-049).
    await expect(page.getByTestId("aviso-montagem-invalida")).not.toContainText(/tarifa|R\$/i);
    expect(chamadasOsrm).toBe(1); // nenhuma chamada nova para a tentativa inválida

    // Sem pendência de "sem rota" — a última rota VÁLIDA (com 2 paradas)
    // continua sendo a exibida; a tentativa inválida não a apaga (RN-048).
    await expect(page.getByTestId("mensagem-sem-rota")).toHaveCount(0);
    await expect(page.getByTestId("descricao-texto")).toContainText("Via Remanescente");
  });

  test("criar um Local via mapa no final do itinerário acende o aviso de RN-035; completar a montagem some com o aviso", async ({
    page,
  }) => {
    await page.route("https://router.project-osrm.org/**", (rota) => {
      // Criar o Local (RN-035, extremo inválido) não chama o OSRM; o mock só
      // serve para o gesto seguinte, que move o Local para o meio e volta a
      // ser uma montagem válida (dispara o recálculo de verdade).
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
    // O clique direito é feito SOBRE a linha para provar que a TASK-065 ainda
    // acrescenta a Parada ao fim (inserção posicional é da TASK-067).
    const mapa = page.getByTestId("mapa-base");
    const marcadores = mapa.locator(".maplibregl-marker");
    await marcadores.first().waitFor();
    await expect(mapa).toBeVisible();
    await mapa.scrollIntoViewIfNeeded();
    const caixaA = await marcadores.nth(0).boundingBox();
    const caixaB = await marcadores.nth(1).boundingBox();
    if (!caixaA || !caixaB) throw new Error("marcador sem bounding box");
    const meio = {
      x: (caixaA.x + caixaA.width / 2 + caixaB.x + caixaB.width / 2) / 2,
      y: (caixaA.y + caixaA.height / 2 + caixaB.y + caixaB.height / 2) / 2,
    };
    await page.mouse.click(meio.x, meio.y, { button: "right" });
    await page.getByRole("menuitem", { name: "Local" }).click();

    await page.getByTestId("nome-local-input").fill("Novo Local E2E");
    await page.getByTestId("confirmar-criar-local").click();

    // O novo Local entra ao final da tabela (RN-035: último precisa ser Seção).
    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-item")).toHaveCount(4);
    await expect(page.getByTestId("tabela-paradas").getByTestId("parada-rotulo").last()).toContainText(
      "Novo Local E2E",
    );
    await expect(page.getByTestId("avisos-montagem-invalida")).toBeVisible();
    await expect(page.getByTestId("aviso-montagem-invalida")).toContainText(
      "A última parada do itinerário deve ser uma Seção, nunca um Local",
    );

    // Move o Local (última posição) para uma posição do meio, restaurando o
    // extremo como Seção — a montagem volta a ser válida e o aviso some.
    await page.getByTestId("parada-mover-cima").last().click();

    await expect(page.getByTestId("avisos-montagem-invalida")).toHaveCount(0);
    const rotulos = page.getByTestId("tabela-paradas").getByTestId("parada-rotulo");
    await expect(rotulos.nth(2)).toContainText("Novo Local E2E");
    await expect(rotulos.last()).toHaveText("Santos - Terminal Santos");
  });
});
