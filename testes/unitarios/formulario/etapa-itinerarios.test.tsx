// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  EtapaItinerarios,
  chaveItinerario,
  itinerariosAoVivoDaSessao,
  paradaDeLocal,
  paradaDeSecao,
} from "@/formulario/itinerarios";
import { coletarPendencias } from "@/formulario/pendencias";
import type { ServicoEmConstrucao, SessaoFormulario } from "@/formulario/sessao";
import * as mapa from "@/shared/mapa";
import type { Coordenada } from "@/shared/mapa";
import {
  coletarViolacoesEstruturais,
  esquemaDocumentoOperacao,
  type PontoDeRota,
  type Secao,
} from "@/shared/contrato";
import { act, renderizar, type ResultadoRenderizacao } from "../shared-ui/_ajuda-render";
import { documentoExemploMinimo } from "../../fixtures";

// Polígono municipal sintético cobrindo as coordenadas de teste usadas neste
// arquivo (região ampla, não o geojson real) — a criação inline (TASK-095)
// passa pela derivação de município de verdade (`criarLocalNoPonto`/
// `criarSecaoNoPonto`), então os testes que simulam o gesto do usuário na
// linha-formulário precisam de um recurso que resolva "dentro de SP".
const RECURSOS_MUNICIPIO_TESTE = vi.hoisted(() => ({
  features: [
    {
      type: "Feature",
      properties: { codarea: "9999999" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
            [-180, -90],
          ],
        ],
      },
    },
  ],
  municipios: [{ codigo_ibge: "9999999", nome: "Santos" }],
}));

// A etapa carrega esses dados por efeito antes de habilitar a edição.
vi.mock("@/shared/dados-estaticos", () => ({
  carregarGeojsonMunicipios: vi.fn().mockResolvedValue({
    features: RECURSOS_MUNICIPIO_TESTE.features,
  }),
  carregarBaseMunicipios: vi.fn().mockResolvedValue({
    municipios: RECURSOS_MUNICIPIO_TESTE.municipios,
  }),
}));

// MapLibre/WebGL não existe no jsdom e não participa da regra da TASK-083.
// Mantemos a EtapaItinerarios real e substituímos somente o filho visual.
// TASK-095/DEC-077: a criação deixou de ser prop do filho (`aoCriarSecao`/
// `aoCriarLocal`) — o filho só REPORTA a intenção via `aoIniciarCriacaoParada`;
// quem cria e confirma é o host, através da linha-formulário real na tabela.
interface PropsEditorCapturadas {
  secoes?: readonly Secao[];
  aoIniciarCriacaoParada: (
    tipo: "secao" | "local",
    posicao: Coordenada,
    posicaoNaLinha?: Coordenada,
  ) => void;
  posicaoCriacaoPendente?: Coordenada;
  aoTransladarSecao?: (secao: Secao) => void;
  locaisInvalidos?: readonly string[];
  selecaoAtual?: string | null;
  aoSelecionarMarcador?: (chave: string) => void;
  aoMoverPontoDeRota?: (indice: number, posicao: Coordenada) => void;
}

const editorCapturado = vi.hoisted<{ props: PropsEditorCapturadas | null }>(() => ({
  props: null,
}));

vi.mock("@/formulario/itinerarios/editor-mapa-itinerario", () => ({
  EditorMapaItinerario: (props: PropsEditorCapturadas) => {
    editorCapturado.props = props;
    return null;
  },
}));

const SERVICO_UUID = "b3f1c2a0-1e2d-4a3b-9c4d-5e6f7a8b9c0d";

function respostaOsrmMock(): typeof fetch {
  return vi.fn().mockResolvedValue({
    json: () =>
      Promise.resolve({
        code: "Ok",
        routes: [
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [-46.3339, -23.9608],
                [-46.4025, -24.0084],
              ],
            },
            legs: [
              {
                distance: 14000,
                duration: 1800,
                steps: [{ name: "Rodovia de Teste" }],
              },
            ],
          },
        ],
      }),
  }) as unknown as typeof fetch;
}

function respostaOsrmTresParadasMock(): typeof fetch {
  return vi.fn().mockResolvedValue({
    json: () =>
      Promise.resolve({
        code: "Ok",
        routes: [
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [-46.3339, -23.9608],
                [-46.38, -23.97],
                [-46.4025, -24.0084],
              ],
            },
            legs: [
              { distance: 8000, duration: 1080, steps: [{ name: "Via 1" }] },
              { distance: 6000, duration: 720, steps: [{ name: "Via 2" }] },
            ],
          },
        ],
      }),
  }) as unknown as typeof fetch;
}

// Mock de OSRM GENÉRICO (TASK-077): lê o número de coordenadas da própria URL
// (`/driving/lon,lat;lon,lat;...`) e devolve exatamente `coordenadas - 1` legs
// — sempre consistente com `extrairRota` (RN-041), qualquer que seja o número
// de paradas/pontos de rota da requisição. Necessário porque o espelho
// Ida↔Volta dispara DUAS chamadas OSRM por gesto, cada uma com uma contagem de
// paradas possivelmente diferente (`respostaOsrmMock`/`respostaOsrmTresParadasMock`
// fixam uma única contagem, insuficiente aqui).
function respostaOsrmGenericaMock(): typeof fetch {
  return vi.fn().mockImplementation((url: string) => {
    const casado = /\/driving\/([^?]+)/.exec(url);
    const coordenadas = casado ? casado[1].split(";") : [];
    const totalLegs = Math.max(coordenadas.length - 1, 0);
    return Promise.resolve({
      json: () =>
        Promise.resolve({
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
                steps: [{ name: "Via Teste" }],
              })),
            },
          ],
        }),
    });
  }) as unknown as typeof fetch;
}

/** Sessão bidirecional mínima (Spec 02 §15) para os testes de espelhamento
 * (TASK-077; DEC-063/071) — Ida A-B-Local-C, Volta C-B-A, sem pontos de rota
 * (fora de escopo do espelho, mantidos noutra suíte). */
function sessaoBidirecionalParaEspelho(): Extract<SessaoFormulario, { modo: "carregado" }> {
  const documento = documentoExemploMinimo();
  const servico = documento.autos.servicos[0];
  const ida = servico.itinerarios.find((i) => i.sentido === "ida")!;
  const volta = servico.itinerarios.find((i) => i.sentido === "volta")!;
  ida.rota = { ...ida.rota, pontos_de_rota: [] };
  volta.rota = { ...volta.rota, pontos_de_rota: [] };
  return { modo: "carregado", documento, alertasImportacao: [] };
}

async function flush(voltas = 10) {
  for (let i = 0; i < voltas; i++) {
    await Promise.resolve();
  }
}

function digitar(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, valor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function clicar(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/**
 * Simula o gesto real do usuário na linha-formulário inline (TASK-095;
 * DEC-077): escolher "Local" no menu do mapa abre a linha na posição de
 * inserção; digitar o nome e confirmar chama `criarLocalNoPonto` de verdade
 * (município resolvido por `RECURSOS_MUNICIPIO_TESTE`, "Santos"). Substitui o
 * atalho antigo de injetar um `Local` já pronto via prop do filho — a criação
 * deixou de ser prop do filho (TASK-095).
 */
function criarLocalPelaLinhaFormularioInline(
  resultado: ResultadoRenderizacao,
  nome: string,
  posicao: Coordenada,
  posicaoNaLinha?: Coordenada,
) {
  act(() => {
    editorCapturado.props?.aoIniciarCriacaoParada("local", posicao, posicaoNaLinha);
  });
  const input = resultado.container.querySelector(
    '[data-testid="nome-local-input"]',
  ) as HTMLInputElement;
  digitar(input, nome);
  clicar(resultado.container.querySelector('[data-testid="confirmar-criar-local"]')!);
}

function sessaoComTresSecoes(
  aposParadaOrdem: number,
  latitudePontoDeRota = -23.97,
): Extract<SessaoFormulario, { modo: "carregado" }> {
  const documento = documentoExemploMinimo();
  const servico = documento.autos.servicos[0];
  const ida = servico.itinerarios.find((itinerario) => itinerario.sentido === "ida")!;
  const secoes = documento.autos.secoes;

  servico.locais = [];
  servico.itinerarios = [ida];
  ida.paradas = secoes.map((secao, indice) => ({ ordem: indice + 1, secao_uuid: secao.uuid }));
  ida.rota = {
    ...ida.rota,
    distancia_km: 14,
    duracao_s: 1800,
    trechos: [
      {
        parada_origem_ordem: 1,
        parada_destino_ordem: 2,
        distancia_km: 8,
        duracao_s: 1080,
      },
      {
        parada_origem_ordem: 2,
        parada_destino_ordem: 3,
        distancia_km: 6,
        duracao_s: 720,
      },
    ],
    pontos_de_rota: [
      {
        apos_parada_ordem: aposParadaOrdem,
        latitude: latitudePontoDeRota,
        longitude: -46.38,
      },
    ],
  };
  ida.viagens = ida.viagens.map((viagem) => ({
    ...viagem,
    horarios_paradas: viagem.horarios_paradas.slice(0, 3),
  }));

  return { modo: "carregado", documento, alertasImportacao: [] };
}

interface MontagemEtapa {
  obterSessao: () => SessaoFormulario;
  resultado: ResultadoRenderizacao;
}

async function montarSessaoNaEtapa(
  sessaoInicial: SessaoFormulario,
  servicoUuid: string,
  sentido: "ida" | "volta",
): Promise<MontagemEtapa> {
  let sessaoAtual = sessaoInicial;
  const montagem: { resultado?: ResultadoRenderizacao } = {};

  const renderizarEtapa = () => (
    <EtapaItinerarios
      sessao={sessaoAtual}
      aoAtualizarSessao={(novaSessao) => {
        sessaoAtual = novaSessao;
        montagem.resultado!.rerenderizar(renderizarEtapa());
      }}
    />
  );

  const resultado = renderizar(renderizarEtapa());
  montagem.resultado = resultado;
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  const select = resultado.container.querySelector(
    '[data-testid="select-servico-itinerario"]',
  ) as HTMLSelectElement;
  const definirValorSelect = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value",
  )!.set!;
  act(() => {
    definirValorSelect.call(select, servicoUuid);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  act(() => {
    (
      resultado.container.querySelector(
        `[data-testid="botao-sentido"][data-sentido="${sentido}"]`,
      ) as HTMLButtonElement
    ).click();
  });

  return { obterSessao: () => sessaoAtual, resultado };
}

async function montarEtapa(
  aposParadaOrdem: number,
  latitudePontoDeRota = -23.97,
): Promise<MontagemEtapa> {
  return montarSessaoNaEtapa(
    sessaoComTresSecoes(aposParadaOrdem, latitudePontoDeRota),
    SERVICO_UUID,
    "ida",
  );
}

/** Todas as UUIDs de entidade do documento, em ordem estável — base das
 * asserções de RN-004 (editar coordenada nunca troca identidade). */
function uuidsDoDocumento(sessao: SessaoFormulario): string[] {
  if (sessao.modo !== "carregado") return [];
  const documento = sessao.documento;
  const uuids = [
    ...documento.autos.secoes.map((secao) => secao.uuid),
    ...documento.autos.servicos.flatMap((servico) => [
      servico.uuid,
      ...(servico.locais ?? []).map((local) => local.uuid),
    ]),
  ];
  return uuids.sort();
}

async function removerParada(resultado: ResultadoRenderizacao, indice: number) {
  const botoes = resultado.container.querySelectorAll<HTMLButtonElement>(
    '[data-testid="parada-remover"]',
  );
  act(() => {
    botoes[indice].click();
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", respostaOsrmMock());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("EtapaItinerarios — lista lateral intercalada (TASK-079/DEC-060)", () => {
  test("exibe ponto entre as Paradas sem duplicar a sub-lista e preserva seletores das Paradas", async () => {
    const { resultado } = await montarEtapa(1);
    const tabela = resultado.container.querySelector('[data-testid="tabela-paradas"]')!;
    const linhas = tabela.querySelectorAll("tbody > tr");

    expect(linhas).toHaveLength(4);
    expect(Array.from(linhas).map((linha) => linha.getAttribute("data-testid"))).toEqual([
      "parada-item",
      "ponto-rota-item",
      "parada-item",
      "parada-item",
    ]);
    expect(tabela.querySelectorAll('[data-testid="parada-item"]')).toHaveLength(3);
    expect(tabela.querySelectorAll('[data-testid="parada-mover-cima"]')).toHaveLength(3);
    expect(tabela.querySelectorAll('[data-testid="parada-mover-baixo"]')).toHaveLength(3);
    expect(tabela.querySelectorAll('[data-testid="parada-remover"]')).toHaveLength(3);
    expect(resultado.container.querySelector('[data-testid="sub-lista-pontos-de-rota"]')).toBeNull();

    const linhaPonto = tabela.querySelector('[data-testid="ponto-rota-item"]')!;
    expect(linhaPonto.textContent).toContain("Ponto de Rota 1");
    expect(linhaPonto.textContent).not.toContain("Santos -");
    expect(linhaPonto.querySelector("input, select, textarea")).toBeNull();
    expect(linhaPonto.querySelector('[data-testid="remover-ponto-rota"]')).not.toBeNull();
    resultado.desmontar();
  });

  test("[TASK-092] os contêineres da coluna Mover usam flex-nowrap, sem quebrar as setas para baixo", async () => {
    const { resultado } = await montarEtapa(1);

    const containerParada = resultado.container
      .querySelector('[data-testid="parada-item"] [data-testid="parada-mover-cima"]')!
      .closest("div")!;
    const containerPonto = resultado.container
      .querySelector('[data-testid="ponto-rota-item"] [data-testid="ponto-rota-mover-cima"]')!
      .closest("div")!;

    for (const container of [containerParada, containerPonto]) {
      expect(container.className).toContain("flex-nowrap");
      expect(container.className).not.toContain("flex-wrap");
    }
    resultado.desmontar();
  });

  test("mover ponto através de Parada re-deriva a âncora e recalcula com OSRM mockado", async () => {
    const fetchMock = respostaOsrmTresParadasMock();
    vi.stubGlobal("fetch", fetchMock);
    const { obterSessao, resultado } = await montarEtapa(1);
    const pontoAntes = sessaoComTresSecoes(1).documento.autos.servicos[0].itinerarios[0]
      .rota.pontos_de_rota[0];

    act(() => {
      (
        resultado.container.querySelector(
          '[data-testid="ponto-rota-mover-baixo"]',
        ) as HTMLButtonElement
      ).click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const chave = chaveItinerario(SERVICO_UUID, "ida");
    expect(obterSessao().pontosDeRotaEmEdicao?.[chave]).toEqual([
      { ...pontoAntes, apos_parada_ordem: 2 },
    ]);
    const linhas = resultado.container.querySelectorAll(
      '[data-testid="tabela-paradas"] tbody > tr',
    );
    expect(Array.from(linhas).map((linha) => linha.getAttribute("data-testid"))).toEqual([
      "parada-item",
      "parada-item",
      "ponto-rota-item",
      "parada-item",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resultado.desmontar();
  });

  test("mover pontos no mesmo trecho altera apenas a ordem do array", async () => {
    const sessao = sessaoComTresSecoes(1);
    const ida = sessao.documento.autos.servicos[0].itinerarios[0];
    ida.rota.pontos_de_rota.push({
      apos_parada_ordem: 1,
      latitude: -23.975,
      longitude: -46.385,
    });
    const coordenadasAntes = ida.rota.pontos_de_rota.map((ponto) => ponto.latitude);
    const fetchMock = respostaOsrmTresParadasMock();
    vi.stubGlobal("fetch", fetchMock);
    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessao,
      SERVICO_UUID,
      "ida",
    );

    act(() => {
      (
        resultado.container.querySelector(
          '[data-testid="ponto-rota-mover-baixo"]',
        ) as HTMLButtonElement
      ).click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const chave = chaveItinerario(SERVICO_UUID, "ida");
    const pontosDepois = obterSessao().pontosDeRotaEmEdicao?.[chave] ?? [];
    expect(pontosDepois.map((ponto) => ponto.latitude)).toEqual(coordenadasAntes.reverse());
    expect(pontosDepois.map((ponto) => ponto.apos_parada_ordem)).toEqual([1, 1]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resultado.desmontar();
  });

  test("remover ponto pela lista atualiza a sessão e recalcula", async () => {
    const fetchMock = respostaOsrmTresParadasMock();
    vi.stubGlobal("fetch", fetchMock);
    const { obterSessao, resultado } = await montarEtapa(1);

    act(() => {
      (
        resultado.container.querySelector(
          '[data-testid="remover-ponto-rota"]',
        ) as HTMLButtonElement
      ).click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const chave = chaveItinerario(SERVICO_UUID, "ida");
    expect(obterSessao().pontosDeRotaEmEdicao?.[chave]).toEqual([]);
    expect(resultado.container.querySelector('[data-testid="ponto-rota-item"]')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resultado.desmontar();
  });

  test("[inválido][RN-042] desabilita setas que deixariam ponto fora dos trechos", async () => {
    const { resultado } = await montarEtapa(1);
    const linhaPonto = resultado.container.querySelector('[data-testid="ponto-rota-item"]')!;

    expect(
      (linhaPonto.querySelector('[data-testid="ponto-rota-mover-cima"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (linhaPonto.querySelector('[data-testid="ponto-rota-mover-baixo"]') as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    resultado.desmontar();
  });

  test("[inválido][RN-048] continua exibindo pontos preservados em sessão no estado sem-rota", async () => {
    const sessao = sessaoComTresSecoes(1);
    const chave = chaveItinerario(SERVICO_UUID, "ida");
    const ponto = sessao.documento.autos.servicos[0].itinerarios[0].rota.pontos_de_rota[0];
    sessao.pontosDeRotaEmEdicao = { [chave]: [ponto] };
    sessao.estadosRotaViva = {
      [chave]: { situacao: "sem-rota", falha: { tipo: "indisponivel" } },
    };

    const { resultado } = await montarSessaoNaEtapa(sessao, SERVICO_UUID, "ida");

    expect(resultado.container.querySelector('[data-testid="ponto-rota-item"]')).not.toBeNull();
    expect(resultado.container.querySelector('[data-testid="mensagem-sem-rota"]')).not.toBeNull();
    resultado.desmontar();
  });

  // TASK-097 — o defeito corrigido na primitiva fazia o `dragend` entregar a
  // coordenada ANTIGA; aqui se fixa o outro extremo do caminho: a coordenada
  // solta atravessa `aoMoverPontoDeRota` e chega ao recálculo (RN-052).
  test("[TASK-097][RN-052] soltar o vértice recalcula com a coordenada NOVA, preservando as UUIDs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: "Ok",
          routes: [
            {
              geometry: {
                type: "LineString",
                coordinates: [
                  [-46.3339, -23.9608],
                  [-46.4025, -24.0084],
                ],
              },
              legs: [
                { distance: 8000, duration: 1080, steps: [{ name: "Via 1" }] },
                { distance: 6000, duration: 720, steps: [{ name: "Via 2" }] },
              ],
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { obterSessao, resultado } = await montarEtapa(1);
    const chave = chaveItinerario(SERVICO_UUID, "ida");
    const uuidsAntes = uuidsDoDocumento(obterSessao());
    fetchMock.mockClear();

    // Coordenada de onde o usuário SOLTOU o vértice, sobre a linha da rota.
    const solta: Coordenada = { lng: -46.39, lat: -23.985 };
    act(() => editorCapturado.props?.aoMoverPontoDeRota?.(0, solta));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(obterSessao().pontosDeRotaEmEdicao?.[chave]).toEqual([
      { apos_parada_ordem: 1, latitude: solta.lat, longitude: solta.lng },
    ]);
    // Um único recálculo, com a coordenada nova entre as paradas (RN-051:
    // ponto de rota entra como pass-through, via `waypoints`).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(`${solta.lng},${solta.lat}`);
    expect(url).not.toContain("-46.38,-23.97");
    // 3 paradas + 1 ponto de rota após a parada 1: A(0), ponto(1), B(2), C(3).
    expect(new URL(url).searchParams.get("waypoints")).toBe("0;2;3");
    // RN-004 — mover coordenada nunca toca identidade de Seção/Local.
    expect(uuidsDoDocumento(obterSessao())).toEqual(uuidsAntes);
    resultado.desmontar();
  });
});

describe("EtapaItinerarios — descarte de ponto de rota órfão (TASK-083/DEC-068)", () => {
  test.each([
    { extremo: "primeira", indice: 0, aposParadaOrdem: 1 },
    { extremo: "última", indice: 2, aposParadaOrdem: 2 },
  ])(
    "remover a $extremo Parada descarta o ponto, recalcula e exibe aviso não bloqueante",
    async ({ indice, aposParadaOrdem }) => {
      const { obterSessao, resultado } = await montarEtapa(aposParadaOrdem);

      await removerParada(resultado, indice);

      const aviso = resultado.container.querySelector(
        '[data-testid="aviso-ponto-de-rota-descartado"]',
      );
      expect(aviso).not.toBeNull();
      expect(aviso?.getAttribute("role")).toBe("status");
      expect(aviso?.getAttribute("role")).not.toBe("alert");
      expect(fetch).toHaveBeenCalledTimes(1);

      const sessaoAtual = obterSessao();
      const chave = chaveItinerario(SERVICO_UUID, "ida");
      expect(sessaoAtual.pontosDeRotaEmEdicao?.[chave]).toEqual([]);
      expect(sessaoAtual.estadosRotaViva?.[chave]?.situacao).toBe("recalculada");

      if (sessaoAtual.modo !== "carregado") {
        throw new Error("a fixture da integração deveria permanecer no modo carregado");
      }
      const servicoAtualizado = sessaoAtual.documento.autos.servicos[0];
      expect(servicoAtualizado.matriz_distancias).toHaveLength(1);
      expect(servicoAtualizado.matriz_seccionamento).toEqual([
        indice === 0
          ? {
              secao_a_uuid: "6f51076b-aaf8-4546-8530-4da1e489c880",
              secao_b_uuid: "63344e28-4722-4a8b-ae9d-1862e8daded4",
              distancia_km: 6,
            }
          : {
              secao_a_uuid: "4da15f36-5bbe-4f4e-90e3-68029097c1b9",
              secao_b_uuid: "6f51076b-aaf8-4546-8530-4da1e489c880",
              distancia_km: 8,
            },
      ]);
      expect(
        coletarViolacoesEstruturais(sessaoAtual.documento).filter(
          (violacao) => violacao.mensagem.includes("[RN-059]"),
        ),
      ).toEqual([]);
      expect(esquemaDocumentoOperacao.safeParse(sessaoAtual.documento).success).toBe(true);

      const bloqueantes = coletarPendencias(
        sessaoAtual,
        itinerariosAoVivoDaSessao(sessaoAtual),
      ).filter((pendencia) => pendencia.severidade === "bloqueante");
      expect(bloqueantes).toEqual([]);

      resultado.desmontar();
    },
  );

  test("[inválido] remover a Parada do meio funde os trechos e não exibe aviso de descarte", async () => {
    const { obterSessao, resultado } = await montarEtapa(1);

    await removerParada(resultado, 1);

    expect(
      resultado.container.querySelector('[data-testid="aviso-ponto-de-rota-descartado"]'),
    ).toBeNull();
    const chave = chaveItinerario(SERVICO_UUID, "ida");
    const pontos = obterSessao().pontosDeRotaEmEdicao?.[chave] as
      | PontoDeRota[]
      | undefined;
    expect(pontos).toHaveLength(1);
    expect(pontos?.[0].apos_parada_ordem).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);

    resultado.desmontar();
  });
});

describe("EtapaItinerarios — inserção posicional pelo mapa (TASK-067/DEC-055)", () => {
  test.each([
    { caso: "antes", latitudePonto: -23.97, aposEsperado: 2 },
    { caso: "depois", latitudePonto: -24.0, aposEsperado: 3 },
  ])(
    "insere Local no meio, recalcula e mantém ponto de rota $caso da nova Parada no trecho correto",
    async ({ latitudePonto, aposEsperado }) => {
      const { obterSessao, resultado } = await montarEtapa(2, latitudePonto);
      const fetchMock = vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            code: "Ok",
            routes: [
              {
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [-46.3339, -23.9608],
                    [-46.36, -23.9631],
                    [-46.38, -23.98],
                    [-46.4025, -24.0084],
                  ],
                },
                legs: [
                  { distance: 4000, duration: 500, steps: [{ name: "Via 1" }] },
                  { distance: 5000, duration: 600, steps: [{ name: "Via 2" }] },
                  { distance: 6000, duration: 700, steps: [{ name: "Via 3" }] },
                ],
              },
            ],
          }),
      });
      vi.stubGlobal("fetch", fetchMock);

      // TASK-095/DEC-077: a criação passa pela linha-formulário inline real —
      // já não se injeta um `Local` pronto via prop do filho.
      criarLocalPelaLinhaFormularioInline(
        resultado,
        "Local intermediário",
        { lng: -46.38, lat: -23.98 },
        { lng: -46.38, lat: -23.98 },
      );
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      const sessaoAtual = obterSessao();
      const chave = chaveItinerario(SERVICO_UUID, "ida");
      expect(sessaoAtual.paradasEmEdicao?.[chave]?.map((parada) => parada.tipo)).toEqual([
        "secao",
        "secao",
        "local",
        "secao",
      ]);
      expect(sessaoAtual.pontosDeRotaEmEdicao?.[chave]?.[0].apos_parada_ordem).toBe(
        aposEsperado,
      );
      expect(sessaoAtual.estadosRotaViva?.[chave]?.situacao).toBe("recalculada");
      if (sessaoAtual.modo !== "carregado") throw new Error("sessão deveria estar carregada");
      const itinerario = sessaoAtual.documento.autos.servicos[0].itinerarios[0];
      const localCriado = sessaoAtual.documento.autos.servicos[0].locais.find(
        (l) => l.nome === "Local intermediário",
      )!;
      expect(itinerario.paradas[2]).toEqual({ ordem: 3, local_uuid: localCriado.uuid });
      expect(itinerario.rota.trechos).toHaveLength(3);
      expect(esquemaDocumentoOperacao.safeParse(sessaoAtual.documento).success).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      resultado.desmontar();
    },
  );

  test("[inválido] sem ancoragem acrescenta Local ao fim, sinaliza RN-035 e não chama OSRM", async () => {
    const { obterSessao, resultado } = await montarEtapa(2);

    // 3 → 2 Paradas ainda recalcula; 2 → 1 é recusado antes do OSRM e mantém
    // a última linha válida desenhada, cenário que antes descartava o gesto.
    await removerParada(resultado, 0);
    await removerParada(resultado, 0);
    const chamadasAntesDaInsercao = vi.mocked(fetch).mock.calls.length;

    // TASK-095/DEC-077: gesto real via linha-formulário inline.
    criarLocalPelaLinhaFormularioInline(
      resultado,
      "Local no fim",
      { lng: -46.38, lat: -23.98 },
      { lng: -46.38, lat: -23.98 },
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const chave = chaveItinerario(SERVICO_UUID, "ida");
    expect(obterSessao().paradasEmEdicao?.[chave]?.map((parada) => parada.tipo)).toEqual([
      "secao",
      "local",
    ]);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(chamadasAntesDaInsercao);
    const paradaLocal = obterSessao().paradasEmEdicao?.[chave]?.find(
      (p) => p.tipo === "local",
    );
    const localUuidCriado = paradaLocal?.tipo === "local" ? paradaLocal.localUuid : undefined;
    expect(editorCapturado.props?.locaisInvalidos).toEqual([localUuidCriado]);
    expect(
      resultado.container.querySelector('[data-testid="avisos-montagem-invalida"]'),
    ).not.toBeNull();
    const linhaInvalida = resultado.container.querySelector(
      '[data-testid="parada-item"][data-estado="local-extremo"]',
    );
    expect(linhaInvalida).not.toBeNull();
    expect(
      linhaInvalida?.querySelector('[data-testid="parada-local-extremo"]')?.getAttribute(
        "aria-invalid",
      ),
    ).toBe("true");

    const bloqueantes = coletarPendencias(
      obterSessao(),
      itinerariosAoVivoDaSessao(obterSessao()),
    ).filter((pendencia) => pendencia.severidade === "bloqueante");
    expect(bloqueantes.some((pendencia) => pendencia.id.startsWith("local-extremo-"))).toBe(
      true,
    );
    resultado.desmontar();
  });

  test("[inválido] falha geométrica de ancoragem acrescenta Local ao fim em vez de descartar o gesto", async () => {
    const { obterSessao, resultado } = await montarEtapa(2);
    // `mockReturnValue` (não `Once`): a linha-formulário inline (TASK-095)
    // também chama `ancorarPontoNaRota` para posicionar a PRÉVIA na tabela
    // antes de confirmar — a falha geométrica precisa persistir em todas as
    // chamadas para que o gesto de CRIAÇÃO em si reproduza o cenário.
    const ancoragem = vi.spyOn(mapa, "ancorarPontoNaRota").mockReturnValue(undefined);
    const chamadasAntesDaInsercao = vi.mocked(fetch).mock.calls.length;

    criarLocalPelaLinhaFormularioInline(
      resultado,
      "Local sem ancoragem geométrica",
      { lng: -46.38, lat: -23.98 },
      { lng: -46.38, lat: -23.98 },
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const chave = chaveItinerario(SERVICO_UUID, "ida");
    expect(ancoragem).toHaveBeenCalled();
    expect(obterSessao().paradasEmEdicao?.[chave]?.map((parada) => parada.tipo)).toEqual([
      "secao",
      "secao",
      "secao",
      "local",
    ]);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(chamadasAntesDaInsercao);
    const paradaLocal = obterSessao().paradasEmEdicao?.[chave]?.find((p) => p.tipo === "local");
    const localUuidCriado = paradaLocal?.tipo === "local" ? paradaLocal.localUuid : undefined;
    expect(editorCapturado.props?.locaisInvalidos).toEqual([localUuidCriado]);
    expect(
      resultado.container.querySelector(
        '[data-testid="parada-item"][data-estado="local-extremo"]',
      ),
    ).not.toBeNull();

    resultado.desmontar();
  });
});

describe("EtapaItinerarios — Local extremo contextual (TASK-068/DEC-070)", () => {
  test("[inválido] Local na primeira Parada marca só a ocorrência da Ida e a correção remove o estado", async () => {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const local = servico.locais[0];
    const [secaoA, secaoB] = documento.autos.secoes;
    local.geolocalizacao_volta = { latitude: -24.005, longitude: -46.398 };

    const chaveIda = chaveItinerario(servico.uuid, "ida");
    const chaveVolta = chaveItinerario(servico.uuid, "volta");
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
      paradasEmEdicao: {
        [chaveIda]: [
          paradaDeLocal(local.uuid),
          paradaDeSecao(secaoA.uuid),
          paradaDeSecao(secaoB.uuid),
        ],
        [chaveVolta]: [
          paradaDeSecao(secaoB.uuid),
          paradaDeLocal(local.uuid),
          paradaDeSecao(secaoA.uuid),
        ],
      },
      pontosDeRotaEmEdicao: {
        [chaveIda]: [
          { apos_parada_ordem: 1, latitude: -23.97, longitude: -46.38 },
        ],
      },
    };
    const { resultado } = await montarSessaoNaEtapa(sessao, servico.uuid, "ida");

    const linhaInvalida = resultado.container.querySelector(
      '[data-testid="parada-item"][data-estado="local-extremo"]',
    );
    const alvoErro = linhaInvalida?.querySelector('[data-testid="parada-local-extremo"]');
    expect(linhaInvalida).not.toBeNull();
    expect(alvoErro?.getAttribute("aria-invalid")).toBe("true");
    expect(alvoErro?.getAttribute("aria-describedby")).toBeTruthy();
    expect(linhaInvalida?.textContent).toContain("a primeira Parada deve ser uma Seção");
    expect(editorCapturado.props?.locaisInvalidos).toEqual([local.uuid]);
    const linhaPonto = resultado.container.querySelector('[data-testid="ponto-rota-item"]');
    expect(linhaPonto).not.toBeNull();
    expect(linhaPonto?.getAttribute("data-estado")).toBeNull();

    act(() => {
      (
        resultado.container.querySelector(
          '[data-testid="botao-sentido"][data-sentido="volta"]',
        ) as HTMLButtonElement
      ).click();
    });
    expect(
      resultado.container.querySelector(
        '[data-testid="parada-item"][data-estado="local-extremo"]',
      ),
    ).toBeNull();
    expect(editorCapturado.props?.locaisInvalidos).toEqual([]);

    act(() => {
      (
        resultado.container.querySelector(
          '[data-testid="botao-sentido"][data-sentido="ida"]',
        ) as HTMLButtonElement
      ).click();
    });
    const fetchMock = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          code: "Ok",
          routes: [
            {
              geometry: {
                type: "LineString",
                coordinates: [
                  [-46.3339, -23.9608],
                  [-46.398, -24.005],
                  [-46.3919, -23.9631],
                ],
              },
              legs: [
                { distance: 4000, duration: 500, steps: [{ name: "Via 1" }] },
                { distance: 5000, duration: 600, steps: [{ name: "Via 2" }] },
              ],
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    act(() => {
      (
        resultado.container.querySelector(
          '[data-testid="parada-item"] [data-testid="parada-mover-baixo"]',
        ) as HTMLButtonElement
      ).click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      resultado.container.querySelector(
        '[data-testid="parada-item"][data-estado="local-extremo"]',
      ),
    ).toBeNull();
    expect(editorCapturado.props?.locaisInvalidos).toEqual([]);

    resultado.desmontar();
  });
});

describe("EtapaItinerarios — sincronização de seleção tabela↔mapa (TASK-064; Spec 04 §7)", () => {
  test("clicar numa linha da tabela propaga a chave ao mapa e marca aria-current; clicar de novo desseleciona", async () => {
    const secaoUuidPrimeira = sessaoComTresSecoes(1).documento.autos.secoes[0].uuid;
    const { resultado } = await montarEtapa(1);
    const chamadasAntes = vi.mocked(fetch).mock.calls.length;

    const linhaSecao = resultado.container.querySelector(
      '[data-testid="parada-item"]',
    ) as HTMLTableRowElement;
    act(() => linhaSecao.click());

    expect(editorCapturado.props?.selecaoAtual).toBe(`secao-${secaoUuidPrimeira}`);
    expect(linhaSecao.getAttribute("aria-current")).toBe("true");
    // Seleção é estado de UI efêmero (RN-096) — nenhum recálculo/OSRM disparado.
    expect(vi.mocked(fetch).mock.calls).toHaveLength(chamadasAntes);

    act(() => linhaSecao.click());
    expect(editorCapturado.props?.selecaoAtual).toBeNull();
    expect(linhaSecao.getAttribute("aria-current")).toBeNull();

    resultado.desmontar();
  });

  test("clicar num marcador (mapa→tabela) realça a linha correspondente sem chamar OSRM", async () => {
    const { resultado } = await montarEtapa(1);
    const chamadasAntes = vi.mocked(fetch).mock.calls.length;

    act(() => editorCapturado.props?.aoSelecionarMarcador?.("ponto-rota-0"));

    const linhaPonto = resultado.container.querySelector('[data-testid="ponto-rota-item"]');
    expect(linhaPonto?.getAttribute("aria-current")).toBe("true");
    expect(editorCapturado.props?.selecaoAtual).toBe("ponto-rota-0");
    expect(vi.mocked(fetch).mock.calls).toHaveLength(chamadasAntes);

    resultado.desmontar();
  });

  test("[inválido] selecionar uma parada cujo marcador não existe no sentido atual não gera erro nem realce no mapa", async () => {
    const { resultado } = await montarEtapa(1);

    // Chave sem marcador correspondente no sentido atual (ex.: Local unidirecional
    // ausente deste sentido) — o host apenas registra a chave, sem lançar erro; o
    // mapa real (não o dublê) é quem decide se algum marcador combina com ela.
    expect(() =>
      act(() => editorCapturado.props?.aoSelecionarMarcador?.("local-inexistente")),
    ).not.toThrow();
    expect(editorCapturado.props?.selecaoAtual).toBe("local-inexistente");

    resultado.desmontar();
  });

  test("trocar de sentido descarta a seleção (não sobrevive à troca de itinerário)", async () => {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const [secaoA] = documento.autos.secoes;
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };
    const { resultado } = await montarSessaoNaEtapa(sessao, servico.uuid, "ida");

    act(() =>
      editorCapturado.props?.aoSelecionarMarcador?.(`secao-${secaoA.uuid}`),
    );
    expect(editorCapturado.props?.selecaoAtual).toBe(`secao-${secaoA.uuid}`);

    act(() => {
      (
        resultado.container.querySelector(
          '[data-testid="botao-sentido"][data-sentido="volta"]',
        ) as HTMLButtonElement
      ).click();
    });

    expect(editorCapturado.props?.selecaoAtual).toBeNull();
    expect(
      resultado.container.querySelector('[data-testid="parada-item"][aria-current="true"]'),
    ).toBeNull();

    resultado.desmontar();
  });

  test("seleção compõe com o Local extremo (DEC-070): os dois estados coexistem, nenhum mascara o outro", async () => {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const local = servico.locais[0];
    const [secaoA, secaoB] = documento.autos.secoes;
    local.geolocalizacao_volta = { latitude: -24.005, longitude: -46.398 };

    const chaveIda = chaveItinerario(servico.uuid, "ida");
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
      paradasEmEdicao: {
        [chaveIda]: [
          paradaDeLocal(local.uuid),
          paradaDeSecao(secaoA.uuid),
          paradaDeSecao(secaoB.uuid),
        ],
      },
    };
    const { resultado } = await montarSessaoNaEtapa(sessao, servico.uuid, "ida");

    const linhaInvalida = resultado.container.querySelector(
      '[data-testid="parada-item"][data-estado="local-extremo"]',
    ) as HTMLTableRowElement;
    expect(linhaInvalida).not.toBeNull();

    act(() => linhaInvalida.click());

    // O vermelho de RN-035/DEC-070 e o realce de seleção (RN-096) coexistem
    // na MESMA linha — nem `data-estado` nem a descrição de erro somem.
    expect(linhaInvalida.getAttribute("aria-current")).toBe("true");
    expect(linhaInvalida.getAttribute("data-estado")).toBe("local-extremo");
    const alvoErro = linhaInvalida.querySelector('[data-testid="parada-local-extremo"]');
    expect(alvoErro?.getAttribute("aria-invalid")).toBe("true");
    expect(linhaInvalida.className).toContain("text-erro");
    expect(linhaInvalida.className).toContain("bg-azul-100");

    resultado.desmontar();
  });

  test("[follow-up TASK-064/091] desselecionar a linha de Local extremo preserva data-estado, text-erro e aria-invalid", async () => {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const local = servico.locais[0];
    const [secaoA, secaoB] = documento.autos.secoes;
    local.geolocalizacao_volta = { latitude: -24.005, longitude: -46.398 };

    const chaveIda = chaveItinerario(servico.uuid, "ida");
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
      paradasEmEdicao: {
        [chaveIda]: [
          paradaDeLocal(local.uuid),
          paradaDeSecao(secaoA.uuid),
          paradaDeSecao(secaoB.uuid),
        ],
      },
    };
    const { resultado } = await montarSessaoNaEtapa(sessao, servico.uuid, "ida");
    const chamadasAntes = vi.mocked(fetch).mock.calls.length;

    const linhaInvalida = resultado.container.querySelector(
      '[data-testid="parada-item"][data-estado="local-extremo"]',
    ) as HTMLTableRowElement;
    expect(linhaInvalida).not.toBeNull();

    act(() => linhaInvalida.click());
    expect(linhaInvalida.getAttribute("aria-current")).toBe("true");

    act(() => linhaInvalida.click());

    // O segundo clique (desseleção) remove só o canal de seleção — o erro
    // estrutural de RN-035/DEC-070 continua pertencendo à ocorrência da
    // Parada, independente do estado de UI efêmero da seleção (RN-096).
    expect(linhaInvalida.getAttribute("aria-current")).toBeNull();
    expect(linhaInvalida.className).not.toContain("bg-azul-100");
    expect(linhaInvalida.getAttribute("data-estado")).toBe("local-extremo");
    expect(linhaInvalida.className).toContain("text-erro");
    const alvoErro = linhaInvalida.querySelector('[data-testid="parada-local-extremo"]');
    expect(alvoErro?.getAttribute("aria-invalid")).toBe("true");
    expect(vi.mocked(fetch).mock.calls).toHaveLength(chamadasAntes);

    resultado.desmontar();
  });

  test("[follow-up TASK-091/TASK-100] cinco cabeçalhos, vocabulário de Tipo e aria-label do X coexistem para Seção, Local e ponto de rota", async () => {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const local = servico.locais[0];
    const [secaoA, secaoB] = documento.autos.secoes;
    const ida = servico.itinerarios.find((itinerario) => itinerario.sentido === "ida")!;
    ida.paradas = [
      { ordem: 1, secao_uuid: secaoA.uuid },
      { ordem: 2, local_uuid: local.uuid },
      { ordem: 3, secao_uuid: secaoB.uuid },
    ];
    ida.rota = {
      ...ida.rota,
      pontos_de_rota: [{ apos_parada_ordem: 1, latitude: -23.97, longitude: -46.38 }],
    };

    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };
    const { resultado } = await montarSessaoNaEtapa(sessao, servico.uuid, "ida");

    const tabela = resultado.container.querySelector('[data-testid="tabela-paradas"]')!;
    const cabecalhos = Array.from(tabela.querySelectorAll("thead th")).map(
      (th) => th.textContent,
    );
    expect(cabecalhos).toEqual(["Cidade - Nome", "Tipo", "Mover", "Redefinir", "Remover"]);

    const linhas = tabela.querySelectorAll("tbody > tr");
    expect(Array.from(linhas).map((linha) => linha.getAttribute("data-testid"))).toEqual([
      "parada-item",
      "ponto-rota-item",
      "parada-item",
      "parada-item",
    ]);
    const [linhaSecaoA, linhaPonto, linhaLocal, linhaSecaoB] = Array.from(
      linhas,
    ) as HTMLTableRowElement[];

    expect(linhaSecaoA.querySelectorAll("td")[1].textContent).toBe("Seção");
    expect(linhaLocal.querySelectorAll("td")[1].textContent).toBe("Local de parada");
    expect(linhaSecaoB.querySelectorAll("td")[1].textContent).toBe("Seção");
    // Ponto de rota: célula Tipo vazia — a natureza já é evidente pelo nome
    // "Ponto de Rota N (lat, long)" (RN-042, DEC-073 item 1).
    expect(linhaPonto.querySelectorAll("td")[1].textContent).toBe("");

    expect(
      linhaSecaoA.querySelector('[data-testid="parada-remover"]')?.getAttribute("aria-label"),
    ).toMatch(/^Remover /);
    expect(
      linhaLocal.querySelector('[data-testid="parada-remover"]')?.getAttribute("aria-label"),
    ).toMatch(/^Remover /);
    expect(
      linhaPonto.querySelector('[data-testid="remover-ponto-rota"]')?.getAttribute("aria-label"),
    ).toBe("Remover Ponto de Rota 1");

    // TASK-100/DEC-080: botão "redefinir" só nas linhas de Seção.
    expect(linhaSecaoA.querySelector('[data-testid="redefinir-secao"]')).not.toBeNull();
    expect(linhaSecaoB.querySelector('[data-testid="redefinir-secao"]')).not.toBeNull();
    expect(linhaLocal.querySelector('[data-testid="redefinir-secao"]')).toBeNull();
    expect(linhaPonto.querySelector('[data-testid="redefinir-secao"]')).toBeNull();

    resultado.desmontar();
  });

  test("clicar num botão de ação da linha (mover/remover) não altera a seleção", async () => {
    const { resultado } = await montarEtapa(1);
    vi.stubGlobal("fetch", respostaOsrmTresParadasMock());

    const botaoMoverBaixo = resultado.container.querySelector(
      '[data-testid="parada-item"] [data-testid="parada-mover-baixo"]',
    ) as HTMLButtonElement;
    act(() => botaoMoverBaixo.click());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(editorCapturado.props?.selecaoAtual).toBeNull();

    resultado.desmontar();
  });
});

describe("EtapaItinerarios — espelhamento Ida↔Volta (TASK-077; DEC-063/071)", () => {
  const SECAO_A_UUID = "4da15f36-5bbe-4f4e-90e3-68029097c1b9";
  const SECAO_B_UUID = "6f51076b-aaf8-4546-8530-4da1e489c880";
  const SECAO_C_UUID = "63344e28-4722-4a8b-ae9d-1862e8daded4";

  function secaoUuidsDeChave(
    sessao: SessaoFormulario,
    chave: string,
  ): (string | undefined)[] {
    return (sessao.paradasEmEdicao?.[chave] ?? []).map((p) =>
      p.tipo === "secao" ? p.secaoUuid : undefined,
    );
  }

  const LOCAL_VOLTA_UUID = "9d8c7b6a-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

  /** Variante da sessão bidirecional com um Local TAMBÉM na Volta
   * (C-Local5-B-A), para o teste de supressão do espelho (TASK-093; DEC-074
   * item 1): prova que o Local do sentido NÃO editado fica exatamente onde
   * estava quando o gesto não altera a subsequência de Seções. Trechos e
   * `horarios_paradas` são reescritos para manter o documento estruturalmente
   * válido (Spec 02 §14) com a nova Parada. */
  function sessaoBidirecionalComLocalNaVolta(): Extract<
    SessaoFormulario,
    { modo: "carregado" }
  > {
    const sessao = sessaoBidirecionalParaEspelho();
    const servico = sessao.documento.autos.servicos[0];
    const volta = servico.itinerarios.find((i) => i.sentido === "volta")!;
    servico.locais.push({
      uuid: LOCAL_VOLTA_UUID,
      nome: "Ponto de Retorno Praia",
      municipio: "Praia Grande",
      geolocalizacao_volta: { latitude: -23.99, longitude: -46.398 },
    });
    volta.paradas = [
      { ordem: 1, secao_uuid: SECAO_C_UUID },
      { ordem: 2, local_uuid: LOCAL_VOLTA_UUID },
      { ordem: 3, secao_uuid: SECAO_B_UUID },
      { ordem: 4, secao_uuid: SECAO_A_UUID },
    ];
    volta.rota = {
      ...volta.rota,
      trechos: [
        { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 3, duracao_s: 350 },
        { parada_origem_ordem: 2, parada_destino_ordem: 3, distancia_km: 3.1, duracao_s: 400 },
        { parada_origem_ordem: 3, parada_destino_ordem: 4, distancia_km: 8, duracao_s: 1080 },
      ],
    };
    for (const viagem of volta.viagens) {
      viagem.horarios_paradas = [
        { parada_ordem: 1, offset_horario: "00:00:00" },
        { parada_ordem: 2, offset_horario: "00:08:00" },
        { parada_ordem: 3, offset_horario: "00:15:00" },
        { parada_ordem: 4, offset_horario: "00:35:00" },
      ];
    }
    return sessao;
  }

  test("remover uma Seção na Ida remove a mesma Seção na Volta, no MESMO commit síncrono", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoBidirecionalParaEspelho(),
      SERVICO_UUID,
      "ida",
    );

    // Ida = A, B, Local, C (ver spec02-15-exemplo-minimo.json) — remover a
    // Seção de índice 1 (B) entre as linhas parada-item.
    const botoesRemover = resultado.container.querySelectorAll<HTMLButtonElement>(
      '[data-testid="parada-remover"]',
    );
    act(() => {
      botoesRemover[1].click();
    });

    // Commit síncrono (DEC-063: "no mesmo commit de sessão") — os DOIS
    // sentidos já refletem o gesto ANTES do recálculo OSRM resolver.
    const chaveIda = chaveItinerario(SERVICO_UUID, "ida");
    const chaveVolta = chaveItinerario(SERVICO_UUID, "volta");
    expect(secaoUuidsDeChave(obterSessao(), chaveIda)).not.toContain(SECAO_B_UUID);
    expect(secaoUuidsDeChave(obterSessao(), chaveVolta)).not.toContain(SECAO_B_UUID);
    expect(secaoUuidsDeChave(obterSessao(), chaveVolta)).toEqual([SECAO_C_UUID, SECAO_A_UUID]);

    await act(async () => {
      await flush();
    });

    // Dois recálculos sequenciais (editado → espelhado — RN-052).
    expect(fetch).toHaveBeenCalledTimes(2);
    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("esperava modo carregado");
    const servico = sessaoFinal.documento.autos.servicos[0];
    const idaFinal = servico.itinerarios.find((i) => i.sentido === "ida")!;
    const voltaFinal = servico.itinerarios.find((i) => i.sentido === "volta")!;
    expect(idaFinal.paradas.some((p) => p.secao_uuid === SECAO_B_UUID)).toBe(false);
    expect(voltaFinal.paradas.some((p) => p.secao_uuid === SECAO_B_UUID)).toBe(false);
    // RN-030 (DEC-063): conjunto e ordem inversa mantidos por construção.
    expect(
      coletarViolacoesEstruturais(sessaoFinal.documento).some((v) => v.mensagem.includes("[RN-030]")),
    ).toBe(false);

    resultado.desmontar();
  });

  test("mover uma Seção na Ida (troca adjacente) reflete na Volta pelo replay do gesto (DEC-071)", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoBidirecionalParaEspelho(),
      SERVICO_UUID,
      "ida",
    );

    // Ida = A, B, Local, C — mover B (índice 1) para cima troca com A: B, A, Local, C.
    act(() => {
      (
        resultado.container.querySelectorAll<HTMLButtonElement>(
          '[data-testid="parada-mover-cima"]',
        )[1]
      ).click();
    });
    await act(async () => {
      await flush();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    const chaveIda = chaveItinerario(SERVICO_UUID, "ida");
    const chaveVolta = chaveItinerario(SERVICO_UUID, "volta");
    const sessaoFinal = obterSessao();
    expect(secaoUuidsDeChave(sessaoFinal, chaveIda)).toEqual([
      SECAO_B_UUID,
      SECAO_A_UUID,
      undefined,
      SECAO_C_UUID,
    ]);
    // Ida secoes-only vira B,A,C ⇒ inverso exato = C,A,B (DEC-071: replay do
    // gesto — nunca diff da sequência final).
    expect(secaoUuidsDeChave(sessaoFinal, chaveVolta)).toEqual([SECAO_C_UUID, SECAO_A_UUID, SECAO_B_UUID]);

    resultado.desmontar();
  });

  test("[TASK-093] mover Seção sobre Local (subsequência inalterada) não espelha: Volta intocada e um só recálculo (DEC-074)", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const sessaoInicial = sessaoBidirecionalComLocalNaVolta();
    const voltaAntes = JSON.parse(
      JSON.stringify(
        sessaoInicial.documento.autos.servicos[0].itinerarios.find((i) => i.sentido === "volta"),
      ),
    ) as unknown;
    const { obterSessao, resultado } = await montarSessaoNaEtapa(sessaoInicial, SERVICO_UUID, "ida");

    // Ida = A, B, Local, C — mover B (índice 1) para BAIXO troca com o Local:
    // A, Local, B, C. A subsequência de Seções (A,B,C) NÃO muda.
    act(() => {
      (
        resultado.container.querySelectorAll<HTMLButtonElement>(
          '[data-testid="parada-mover-baixo"]',
        )[1]
      ).click();
    });
    await act(async () => {
      await flush();
    });

    // UM só recálculo OSRM (RN-052: só o sentido editado) — o caso "inválido"
    // desta task é o comportamento antigo (2ª chamada + Volta recomposta pelo
    // replay), que estas asserções provam extinto.
    expect(fetch).toHaveBeenCalledTimes(1);

    const chaveIda = chaveItinerario(SERVICO_UUID, "ida");
    const chaveVolta = chaveItinerario(SERVICO_UUID, "volta");
    const sessaoFinal = obterSessao();
    expect(secaoUuidsDeChave(sessaoFinal, chaveIda)).toEqual([
      SECAO_A_UUID,
      undefined,
      SECAO_B_UUID,
      SECAO_C_UUID,
    ]);
    // O outro sentido nunca é comitado em edição: sem entrada de paradas nem
    // de pontos de rota para a chave da Volta (RN-041..043 intocadas lá).
    expect(sessaoFinal.paradasEmEdicao?.[chaveVolta]).toBeUndefined();
    expect(sessaoFinal.pontosDeRotaEmEdicao?.[chaveVolta]).toBeUndefined();

    // A Volta congelada do documento permanece EXATAMENTE como estava
    // (C-Local5-B-A), Local incluído — Locais são livres por sentido
    // (Spec 02 §14; Spec 04 §7.2).
    if (sessaoFinal.modo !== "carregado") throw new Error("esperava modo carregado");
    const voltaFinal = sessaoFinal.documento.autos.servicos[0].itinerarios.find(
      (i) => i.sentido === "volta",
    );
    expect(voltaFinal).toEqual(voltaAntes);
    // RN-030: subsequência inalterada ⇒ ordem inversa mantida por construção.
    expect(
      coletarViolacoesEstruturais(sessaoFinal.documento).some((v) => v.mensagem.includes("[RN-030]")),
    ).toBe(false);

    resultado.desmontar();
  });

  test("o reuso não oferta Seções já usadas por QUALQUER sentido do Serviço corrente (DEC-063; RN-025)", async () => {
    const sessao = sessaoBidirecionalParaEspelho();
    const secaoDeOutroServico: Secao = {
      uuid: "dddddddd-4444-4444-8444-dddddddddddd",
      municipio: "Outro Município",
      nome: "Outro Terminal",
      servicos: [
        {
          servico_uuid: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
          geolocalizacao_ida: { latitude: -23.5, longitude: -46.5 },
        },
      ],
    };
    sessao.documento.autos.secoes.push(secaoDeOutroServico);
    const { resultado } = await montarSessaoNaEtapa(sessao, SERVICO_UUID, "ida");

    const opcoes = Array.from(
      resultado.container.querySelectorAll<HTMLOptionElement>(
        '[data-testid="select-secao-reuso"] option',
      ),
    ).map((o) => o.value);

    expect(opcoes).not.toContain(SECAO_A_UUID);
    expect(opcoes).not.toContain(SECAO_B_UUID);
    expect(opcoes).not.toContain(SECAO_C_UUID);
    expect(opcoes).toContain(secaoDeOutroServico.uuid);

    resultado.desmontar();
  });

  test("[inválido][RN-048] falha de OSRM no sentido ESPELHADO não apaga a rota válida anterior daquele sentido, com o sentido editado gravado normalmente", async () => {
    const fetchMock = vi.fn();
    // 1ª chamada (sentido editado — Ida): sucesso. 2ª (espelhado — Volta): NoRoute.
    fetchMock.mockImplementationOnce((url: string) => {
      const casado = /\/driving\/([^?]+)/.exec(url);
      const total = (casado ? casado[1].split(";") : []).length;
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            code: "Ok",
            routes: [
              {
                geometry: { type: "LineString", coordinates: [[-46.33, -23.96], [-46.4, -24.0]] },
                legs: Array.from({ length: Math.max(total - 1, 0) }, () => ({
                  distance: 1000,
                  duration: 100,
                  steps: [{ name: "Via Teste" }],
                })),
              },
            ],
          }),
      });
    });
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({ json: () => Promise.resolve({ code: "NoRoute" }) }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoBidirecionalParaEspelho(),
      SERVICO_UUID,
      "ida",
    );

    const botoesRemover = resultado.container.querySelectorAll<HTMLButtonElement>(
      '[data-testid="parada-remover"]',
    );
    act(() => {
      botoesRemover[1].click(); // remove Seção B da Ida (espelha remoção na Volta)
    });
    await act(async () => {
      await flush();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const chaveIda = chaveItinerario(SERVICO_UUID, "ida");
    const chaveVolta = chaveItinerario(SERVICO_UUID, "volta");
    const sessaoFinal = obterSessao();
    expect(sessaoFinal.estadosRotaViva?.[chaveIda]?.situacao).toBe("recalculada");
    expect(sessaoFinal.estadosRotaViva?.[chaveVolta]?.situacao).toBe("sem-rota");

    if (sessaoFinal.modo !== "carregado") throw new Error("esperava modo carregado");
    const servico = sessaoFinal.documento.autos.servicos[0];
    const idaFinal = servico.itinerarios.find((i) => i.sentido === "ida")!;
    const voltaFinal = servico.itinerarios.find((i) => i.sentido === "volta")!;
    // Sentido editado (Ida): write-back aplicado — Seção B removida do documento.
    expect(idaFinal.paradas.some((p) => p.secao_uuid === SECAO_B_UUID)).toBe(false);
    // Sentido espelhado (Volta): falha do OSRM não apaga a última rota válida
    // do DOCUMENTO — a Seção B continua lá (RN-048), mesmo com o rascunho de
    // edição já sem ela.
    expect(voltaFinal.paradas.some((p) => p.secao_uuid === SECAO_B_UUID)).toBe(true);

    resultado.desmontar();
  });

  test("promoção de Serviço 'ambos' num gesto só quando o espelho completa os dois sentidos (DEC-053/DEC-063)", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const SERVICO_NOVO_UUID = "ffffffff-6666-4666-8666-ffffffffffff";

    const documento = documentoExemploMinimo();
    // Seção A ganha uma contribuição do Serviço novo, nos dois sentidos
    // (bidirecional — Spec 04 §7.1, "cria Ida e Volta no mesmo ponto"), para
    // que a resolução (RN-036) encontre geolocalização ao roteirizar.
    documento.autos.secoes[0].servicos.push({
      servico_uuid: SERVICO_NOVO_UUID,
      geolocalizacao_ida: { latitude: -23.9608, longitude: -46.3339 },
      geolocalizacao_volta: { latitude: -23.9611, longitude: -46.3342 },
    });
    documento.autos.secoes[1].servicos.push({
      servico_uuid: SERVICO_NOVO_UUID,
      geolocalizacao_ida: { latitude: -23.9631, longitude: -46.3919 },
      geolocalizacao_volta: { latitude: -23.9629, longitude: -46.3915 },
    });

    const servicoEmConstrucao: ServicoEmConstrucao = {
      uuid: SERVICO_NOVO_UUID,
      numero_n: "0000-2CR",
      caracteristica_veiculo: "CR",
      carater: "principal",
      direcionalidade: "ambos",
    };
    const chaveIda = chaveItinerario(SERVICO_NOVO_UUID, "ida");
    const chaveVolta = chaveItinerario(SERVICO_NOVO_UUID, "volta");
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
      servicosEmConstrucao: [servicoEmConstrucao],
      // Só a Seção A em cada sentido — ainda incompleto (RN-034, < 2 paradas);
      // já simétrico porque toda inserção anterior também teria espelhado.
      paradasEmEdicao: {
        [chaveIda]: [paradaDeSecao(SECAO_A_UUID)],
        [chaveVolta]: [paradaDeSecao(SECAO_A_UUID)],
      },
    };

    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessao,
      SERVICO_NOVO_UUID,
      "ida",
    );

    // Insere a Seção B (já existente no documento) na Ida — completa a Ida
    // (2 paradas) e dispara o espelho, que também completa a Volta. A
    // criação por NOME deixou de ser prop do filho (TASK-095) — o reuso de
    // Seção já existente sempre passou pelo `PainelReusoSecao` real (TASK-074),
    // então o gesto é simulado por ele mesmo, não mais por um atalho no filho.
    const secaoB = documento.autos.secoes[1];
    const selectReuso = resultado.container.querySelector(
      '[data-testid="select-secao-reuso"]',
    ) as HTMLSelectElement;
    const definirValorSelect = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      "value",
    )!.set!;
    act(() => {
      definirValorSelect.call(selectReuso, secaoB.uuid);
      selectReuso.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clicar(resultado.container.querySelector('[data-testid="confirmar-reuso"]')!);
    await act(async () => {
      await flush();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("esperava modo carregado");
    expect(
      (sessaoFinal.servicosEmConstrucao ?? []).some((s) => s.uuid === SERVICO_NOVO_UUID),
    ).toBe(false);
    const servicoPromovido = sessaoFinal.documento.autos.servicos.find(
      (s) => s.uuid === SERVICO_NOVO_UUID,
    );
    expect(servicoPromovido).toBeDefined();
    expect(servicoPromovido?.itinerarios).toHaveLength(2);
    const idaPromovida = servicoPromovido?.itinerarios.find((i) => i.sentido === "ida");
    const voltaPromovida = servicoPromovido?.itinerarios.find((i) => i.sentido === "volta");
    expect(idaPromovida?.paradas.map((p) => p.secao_uuid)).toEqual([SECAO_A_UUID, SECAO_B_UUID]);
    expect(voltaPromovida?.paradas.map((p) => p.secao_uuid)).toEqual([SECAO_B_UUID, SECAO_A_UUID]);

    resultado.desmontar();
  });
});

// TASK-078 (DEC-061/079) — translação rígida de uma Seção inteira dispara a
// CASCATA de recálculo de TODOS os itinerários (de TODOS os Serviços,
// completos e em construção, Ida e Volta) que referenciam a Seção — não só o
// Serviço/sentido em foco na etapa (o `EditorMapaItinerario`, mockado aqui,
// só relata a translação via `aoTransladarSecao`; o host resolve a cascata).
// Fixture `bidirecional-multi-servico`: a Seção "1111" (Terminal Santos) é
// contribuída pelos DOIS Serviços (Ida+Volta); a Seção "3333" (Rodoviária
// Praia Grande) só pelo Serviço A (Ida+Volta) — usada para provar que a
// cascata é SELETIVA (só recalcula quem referencia a Seção transladada).
describe("EtapaItinerarios — cascata de translação de Seção (TASK-078; DEC-061/079)", () => {
  const SERVICO_A_UUID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
  const SERVICO_B_UUID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
  const SECAO_SO_SERVICO_A_UUID = "33333333-3333-4333-8333-333333333333";

  function transladar(secao: Secao, deltaLat: number, deltaLon: number): Secao {
    return {
      ...secao,
      servicos: secao.servicos.map((s) => ({
        ...s,
        geolocalizacao_ida: s.geolocalizacao_ida && {
          latitude: s.geolocalizacao_ida.latitude + deltaLat,
          longitude: s.geolocalizacao_ida.longitude + deltaLon,
        },
        geolocalizacao_volta: s.geolocalizacao_volta && {
          latitude: s.geolocalizacao_volta.latitude + deltaLat,
          longitude: s.geolocalizacao_volta.longitude + deltaLon,
        },
      })),
    };
  }

  async function montarBidirecionalMultiServico() {
    const { documentoBidirecionalMultiServico } = await import("../../fixtures");
    const documento = documentoBidirecionalMultiServico();
    return montarSessaoNaEtapa(
      { modo: "carregado", documento, alertasImportacao: [] },
      SERVICO_A_UUID,
      "ida",
    );
  }

  test("translação de Seção usada por 2 Serviços (Ida+Volta) recalcula os 4 itinerários — 4 chamadas OSRM", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { obterSessao, resultado } = await montarBidirecionalMultiServico();
    const sessaoInicial = obterSessao() as Extract<SessaoFormulario, { modo: "carregado" }>;
    const secaoOriginal = sessaoInicial.documento.autos.secoes.find(
      (s) => s.uuid === "11111111-1111-4111-8111-111111111111",
    )!;
    const secaoTransladada = transladar(secaoOriginal, 0.001, 0.001);

    await act(async () => {
      editorCapturado.props?.aoTransladarSecao?.(secaoTransladada);
      await flush(20);
    });

    expect(fetch).toHaveBeenCalledTimes(4);

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("sessão não carregada");
    const secaoFinal = sessaoFinal.documento.autos.secoes.find(
      (s) => s.uuid === secaoOriginal.uuid,
    )!;
    // UUID da Seção e de cada `servico_uuid` preservados (RN-004/007).
    expect(secaoFinal.uuid).toBe(secaoOriginal.uuid);
    expect(secaoFinal.servicos.map((s) => s.servico_uuid).sort()).toEqual(
      secaoOriginal.servicos.map((s) => s.servico_uuid).sort(),
    );
    // Geolocalizações refletem a translação (não a original).
    expect(secaoFinal.servicos[0].geolocalizacao_ida).toEqual(
      secaoTransladada.servicos.find(
        (s) => s.servico_uuid === secaoFinal.servicos[0].servico_uuid,
      )?.geolocalizacao_ida,
    );

    resultado.desmontar();
  });

  test("translação de Seção usada só pelo Serviço A recalcula APENAS os itinerários do Serviço A — 2 chamadas OSRM, Serviço B intocado", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { obterSessao, resultado } = await montarBidirecionalMultiServico();
    const sessaoInicial = obterSessao() as Extract<SessaoFormulario, { modo: "carregado" }>;
    const secaoOriginal = sessaoInicial.documento.autos.secoes.find(
      (s) => s.uuid === SECAO_SO_SERVICO_A_UUID,
    )!;
    const rotaServicoAIdaAntes = sessaoInicial.documento.autos.servicos
      .find((s) => s.uuid === SERVICO_A_UUID)!
      .itinerarios.find((i) => i.sentido === "ida")!.rota;
    const rotaServicoBIdaAntes = sessaoInicial.documento.autos.servicos
      .find((s) => s.uuid === SERVICO_B_UUID)!
      .itinerarios.find((i) => i.sentido === "ida")!.rota;
    const secaoTransladada = transladar(secaoOriginal, 0.001, 0.001);

    await act(async () => {
      editorCapturado.props?.aoTransladarSecao?.(secaoTransladada);
      await flush(20);
    });

    expect(fetch).toHaveBeenCalledTimes(2);

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("sessão não carregada");
    const servicoA = sessaoFinal.documento.autos.servicos.find((s) => s.uuid === SERVICO_A_UUID)!;
    const servicoB = sessaoFinal.documento.autos.servicos.find((s) => s.uuid === SERVICO_B_UUID)!;
    // Serviço A: os DOIS sentidos recalcularam (a Seção está nos dois) — a
    // rota nova difere da original (RN-052).
    expect(servicoA.itinerarios.find((i) => i.sentido === "ida")!.rota).not.toEqual(
      rotaServicoAIdaAntes,
    );
    expect(servicoA.itinerarios.find((i) => i.sentido === "volta")!.rota).toBeDefined();
    // Serviço B não referencia a Seção transladada: rota intocada.
    expect(servicoB.itinerarios.find((i) => i.sentido === "ida")!.rota).toEqual(
      rotaServicoBIdaAntes,
    );

    resultado.desmontar();
  });

  test("[inválido] uma falha de OSRM num itinerário da cascata não impede os demais (RN-048)", async () => {
    // O cliente OSRM faz 1 retry automático por falha de rede (`cliente-osrm.ts`
    // §3.5) — falhar as DUAS tentativas do 1º itinerário da cascata garante que
    // ELE (e só ele) termine em `sem-rota`, provando que a falha não propaga.
    let chamada = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((...args: Parameters<typeof fetch>) => {
        chamada += 1;
        if (chamada <= 2) return Promise.reject(new Error("falha de rede simulada"));
        return respostaOsrmGenericaMock()(...args);
      }),
    );
    const { obterSessao, resultado } = await montarBidirecionalMultiServico();
    const sessaoInicial = obterSessao() as Extract<SessaoFormulario, { modo: "carregado" }>;
    const secaoOriginal = sessaoInicial.documento.autos.secoes.find(
      (s) => s.uuid === "11111111-1111-4111-8111-111111111111",
    )!;
    const secaoTransladada = transladar(secaoOriginal, 0.001, 0.001);

    await act(async () => {
      editorCapturado.props?.aoTransladarSecao?.(secaoTransladada);
      await flush(20);
    });

    // 4 itinerários × 1 tentativa, mais 1 retry do 1º (2 tentativas): 5.
    expect(fetch).toHaveBeenCalledTimes(5);
    const sessaoFinal = obterSessao();
    // A sessão segue viva (nenhum crash interrompe a cascata inteira) — ao
    // menos um itinerário completou o recálculo apesar da 1ª falha, e ao
    // menos um ficou `sem-rota` (RN-048: sem apagar a última rota válida —
    // aqui não havia uma prévia, então o itinerário simplesmente não grava).
    const estados = Object.values(sessaoFinal.estadosRotaViva ?? {});
    expect(estados.some((e) => e.situacao === "recalculada")).toBe(true);
    expect(estados.some((e) => e.situacao === "sem-rota")).toBe(true);

    resultado.desmontar();
  });
});

// TASK-100 (DEC-080): botão "redefinir Seção" na tabela lateral — colapsa
// TODOS os pontos da Seção (todos os Serviços/sentidos) na coordenada do
// Serviço/sentido em edição no momento do clique, sob confirmação explícita.
// Reusa a MESMA cascata de recálculo/reconciliação multi-Serviço da TASK-078
// (`aoTransladarSecao`) — só a origem da Seção transladada muda (destino fixo,
// não vetor de arrasto). Fixture `bidirecional-multi-servico`: a Seção "1111"
// (Terminal Santos) é a 1ª parada de todos os 4 itinerários (Ida+Volta dos 2
// Serviços); seus pontos de Ida (-23.9608,-46.3339) e Volta (-23.9611,-46.3342)
// NÃO coincidem — o reset move Volta para a coordenada de Ida, uma mudança real
// que dispara a cascata.
describe("EtapaItinerarios — redefinir Seção (TASK-100; DEC-080)", () => {
  const SERVICO_A_UUID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
  const SERVICO_B_UUID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
  const SECAO_TERMINAL_SANTOS_UUID = "11111111-1111-4111-8111-111111111111";

  async function montarBidirecionalMultiServico() {
    const { documentoBidirecionalMultiServico } = await import("../../fixtures");
    const documento = documentoBidirecionalMultiServico();
    return montarSessaoNaEtapa(
      { modo: "carregado", documento, alertasImportacao: [] },
      SERVICO_A_UUID,
      "ida",
    );
  }

  test("OK aplica: todas as contribuições da Seção convergem para o ponto do Serviço/sentido em edição e a cascata recalcula os 4 itinerários afetados", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { obterSessao, resultado } = await montarBidirecionalMultiServico();
    const sessaoInicial = obterSessao() as Extract<SessaoFormulario, { modo: "carregado" }>;
    const secaoOriginal = sessaoInicial.documento.autos.secoes.find(
      (s) => s.uuid === SECAO_TERMINAL_SANTOS_UUID,
    )!;
    const destinoEsperado = secaoOriginal.servicos.find(
      (s) => s.servico_uuid === SERVICO_A_UUID,
    )!.geolocalizacao_ida!;

    // 1ª parada da Ida do Serviço A (linhaAtual/sentidoSelecionado do mount) é
    // a Seção "Terminal Santos" — 1º botão "redefinir-secao" da tabela.
    const botao = resultado.container.querySelector('[data-testid="redefinir-secao"]')!;
    await act(async () => {
      botao.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flush(20);
    });

    expect(window.confirm).toHaveBeenCalledWith(
      "Gostaria de redefinir todas as geolocalizações desta seção em todos os serviços e sentidos?",
    );
    expect(fetch).toHaveBeenCalledTimes(4);

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("sessão não carregada");
    const secaoFinal = sessaoFinal.documento.autos.secoes.find(
      (s) => s.uuid === SECAO_TERMINAL_SANTOS_UUID,
    )!;
    // UUID da Seção e de cada `servico_uuid` preservados (RN-004).
    expect(secaoFinal.uuid).toBe(secaoOriginal.uuid);
    expect(secaoFinal.servicos.map((s) => s.servico_uuid).sort()).toEqual(
      [SERVICO_A_UUID, SERVICO_B_UUID].sort(),
    );
    // Todas as contribuições (Ida e Volta, dos 2 Serviços) coincidem no destino.
    for (const entrada of secaoFinal.servicos) {
      expect(entrada.geolocalizacao_ida).toEqual(destinoEsperado);
      expect(entrada.geolocalizacao_volta).toEqual(destinoEsperado);
    }

    resultado.desmontar();
  });

  test("[inválido] Cancelar não altera nada e não chama OSRM", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { obterSessao, resultado } = await montarBidirecionalMultiServico();
    const sessaoInicial = obterSessao() as Extract<SessaoFormulario, { modo: "carregado" }>;
    const secaoOriginal = sessaoInicial.documento.autos.secoes.find(
      (s) => s.uuid === SECAO_TERMINAL_SANTOS_UUID,
    )!;

    const botao = resultado.container.querySelector('[data-testid="redefinir-secao"]')!;
    await act(async () => {
      botao.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flush(20);
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("sessão não carregada");
    const secaoFinal = sessaoFinal.documento.autos.secoes.find(
      (s) => s.uuid === SECAO_TERMINAL_SANTOS_UUID,
    )!;
    expect(secaoFinal).toEqual(secaoOriginal);

    resultado.desmontar();
  });

  test("botão de redefinir está ausente nas linhas de Local (asserção negativa) — só aparece em linhas de Seção", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { resultado } = await montarSessaoNaEtapa(
      sessaoBidirecionalParaEspelho(),
      SERVICO_UUID,
      "ida",
    );

    // Fixture (Spec 02 §15): Ida = SecaoA, SecaoB, Local, SecaoC (4 paradas).
    const linhas = resultado.container.querySelectorAll('[data-testid="parada-item"]');
    expect(linhas).toHaveLength(4);
    const temBotaoRedefinir = (linha: Element) =>
      linha.querySelector('[data-testid="redefinir-secao"]') !== null;

    expect(temBotaoRedefinir(linhas[0])).toBe(true); // SecaoA
    expect(temBotaoRedefinir(linhas[1])).toBe(true); // SecaoB
    expect(temBotaoRedefinir(linhas[2])).toBe(false); // Local
    expect(temBotaoRedefinir(linhas[3])).toBe(true); // SecaoC

    resultado.desmontar();
  });
});

// TASK-094 (DEC-075/DEC-076): Local nasce unidirecional (sem espelho na
// criação) e o "X" da tabela remove a ENTIDADE (não só a Parada do sentido
// corrente). Fixture (Spec 02 §15): Ida = SecaoA, SecaoB, Local, SecaoC;
// Volta = SecaoC, SecaoB, SecaoA (o Local só existe na Ida, caso comum de
// DEC-075). Os UUIDs abaixo vêm literalmente do fixture.
describe("EtapaItinerarios — remoção da entidade Local pelo \"X\" (TASK-094; DEC-076)", () => {
  const SECAO_A_UUID = "4da15f36-5bbe-4f4e-90e3-68029097c1b9";
  const SECAO_B_UUID = "6f51076b-aaf8-4546-8530-4da1e489c880";
  const SECAO_C_UUID = "63344e28-4722-4a8b-ae9d-1862e8daded4";
  const LOCAL_UUID = "c2afe932-bf0f-4338-8ff4-63cd908b9033";

  test('Local unidirecional comum: "X" remove a entidade e a Parada só do sentido corrente, sem tocar a Volta (Locais são livres por sentido)', async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoBidirecionalParaEspelho(),
      SERVICO_UUID,
      "ida",
    );

    // Ida = SecaoA, SecaoB, Local, SecaoC — remove a linha do Local (índice 2).
    const botoesRemover = resultado.container.querySelectorAll<HTMLButtonElement>(
      '[data-testid="parada-remover"]',
    );
    act(() => {
      botoesRemover[2].click();
    });
    await act(async () => {
      await flush();
    });

    // UM só recálculo OSRM — gesto de Local nunca espelha (Spec 02 §14; Spec
    // 04 §7.2), diferente de um gesto de Seção (TASK-077).
    expect(fetch).toHaveBeenCalledTimes(1);

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("esperava modo carregado");
    const servico = sessaoFinal.documento.autos.servicos[0];
    const idaFinal = servico.itinerarios.find((i) => i.sentido === "ida")!;
    const voltaFinal = servico.itinerarios.find((i) => i.sentido === "volta")!;

    // A entidade some de `servico.locais[]` — não fica órfã, "apagada" só do
    // itinerário (a lacuna que a DEC-045 deixava, fechada pela DEC-076).
    expect(servico.locais.some((l) => l.uuid === LOCAL_UUID)).toBe(false);
    expect(idaFinal.paradas.some((p) => p.local_uuid === LOCAL_UUID)).toBe(false);
    expect(idaFinal.paradas.map((p) => p.secao_uuid ?? p.local_uuid)).toEqual([
      SECAO_A_UUID,
      SECAO_B_UUID,
      SECAO_C_UUID,
    ]);
    // A Volta (sem Parada deste Local) permanece EXATAMENTE como estava.
    expect(voltaFinal.paradas.map((p) => p.secao_uuid)).toEqual([
      SECAO_C_UUID,
      SECAO_B_UUID,
      SECAO_A_UUID,
    ]);

    resultado.desmontar();
  });

  test('Local LEGADO com dois pontos, referenciado nos DOIS sentidos: "X" remove a entidade e as Paradas de ambos, recalculando o sentido OUTRO no mesmo commit', async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const sessaoInicial = sessaoBidirecionalParaEspelho();
    const servico = sessaoInicial.documento.autos.servicos[0];
    const volta = servico.itinerarios.find((i) => i.sentido === "volta")!;
    // Torna o Local (só Ida no fixture) LEGADO com os dois pontos, e insere a
    // Parada correspondente também na Volta — documento importado de versão
    // anterior (Spec 04 §7.2, caso legado da DEC-075/076).
    const local = servico.locais.find((l) => l.uuid === LOCAL_UUID)!;
    local.geolocalizacao_volta = { latitude: -24.0049, longitude: -46.3979 };
    volta.paradas = [
      { ordem: 1, secao_uuid: SECAO_C_UUID },
      { ordem: 2, local_uuid: LOCAL_UUID },
      { ordem: 3, secao_uuid: SECAO_B_UUID },
      { ordem: 4, secao_uuid: SECAO_A_UUID },
    ];
    volta.rota = {
      ...volta.rota,
      trechos: [
        { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 3, duracao_s: 350 },
        { parada_origem_ordem: 2, parada_destino_ordem: 3, distancia_km: 3.1, duracao_s: 400 },
        { parada_origem_ordem: 3, parada_destino_ordem: 4, distancia_km: 8, duracao_s: 1080 },
      ],
    };
    for (const viagem of volta.viagens) {
      viagem.horarios_paradas = [
        { parada_ordem: 1, offset_horario: "00:00:00" },
        { parada_ordem: 2, offset_horario: "00:08:00" },
        { parada_ordem: 3, offset_horario: "00:15:00" },
        { parada_ordem: 4, offset_horario: "00:35:00" },
      ];
    }

    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoInicial,
      SERVICO_UUID,
      "ida",
    );

    const botoesRemover = resultado.container.querySelectorAll<HTMLButtonElement>(
      '[data-testid="parada-remover"]',
    );
    act(() => {
      botoesRemover[2].click(); // Ida = SecaoA, SecaoB, Local, SecaoC
    });
    await act(async () => {
      await flush();
    });

    // DOIS recálculos sequenciais (editado → outro sentido — mesma disciplina
    // do espelho de Seção, RN-052), mesmo sem ser um `gestoSecao`.
    expect(fetch).toHaveBeenCalledTimes(2);

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("esperava modo carregado");
    const servicoFinal = sessaoFinal.documento.autos.servicos[0];
    const idaFinal = servicoFinal.itinerarios.find((i) => i.sentido === "ida")!;
    const voltaFinal = servicoFinal.itinerarios.find((i) => i.sentido === "volta")!;

    expect(servicoFinal.locais.some((l) => l.uuid === LOCAL_UUID)).toBe(false);
    expect(idaFinal.paradas.some((p) => p.local_uuid === LOCAL_UUID)).toBe(false);
    expect(voltaFinal.paradas.some((p) => p.local_uuid === LOCAL_UUID)).toBe(false);
    expect(idaFinal.paradas.map((p) => p.secao_uuid)).toEqual([
      SECAO_A_UUID,
      SECAO_B_UUID,
      SECAO_C_UUID,
    ]);
    expect(voltaFinal.paradas.map((p) => p.secao_uuid)).toEqual([
      SECAO_C_UUID,
      SECAO_B_UUID,
      SECAO_A_UUID,
    ]);

    resultado.desmontar();
  });

  test("[inválido] remover uma Seção não remove nenhum Local nem deixa entidade órfã", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoBidirecionalParaEspelho(),
      SERVICO_UUID,
      "ida",
    );

    // Remove a Seção B (índice 1) — o Local (índice 2 original) deve
    // permanecer intacto em `servico.locais[]` e no itinerário.
    const botoesRemover = resultado.container.querySelectorAll<HTMLButtonElement>(
      '[data-testid="parada-remover"]',
    );
    act(() => {
      botoesRemover[1].click();
    });
    await act(async () => {
      await flush();
    });

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("esperava modo carregado");
    const servico = sessaoFinal.documento.autos.servicos[0];
    const idaFinal = servico.itinerarios.find((i) => i.sentido === "ida")!;
    expect(servico.locais.some((l) => l.uuid === LOCAL_UUID)).toBe(true);
    expect(idaFinal.paradas.some((p) => p.local_uuid === LOCAL_UUID)).toBe(true);

    resultado.desmontar();
  });
});

describe("EtapaItinerarios — gravar servico.locais[] pelo caminho unificado da DEC-053 (TASK-096)", () => {
  const SERVICO_EM_CONSTRUCAO_UUID = "7c6b5a49-3d2e-4f1a-8b9c-0d1e2f3a4b5c";

  /** Serviço já PROMOVIDO (DEC-053) no modo "novo": vive em `sessao.servicos`,
   * não em `servicosEmConstrucao` — o estado em que o bug relatado ocorre. */
  function sessaoNovoServicoPromovido(): Extract<SessaoFormulario, { modo: "novo" }> {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const secoes = documento.autos.secoes;
    const ida = servico.itinerarios.find((i) => i.sentido === "ida")!;
    servico.locais = [];
    servico.itinerarios = [ida];
    ida.paradas = secoes.map((secao, indice) => ({ ordem: indice + 1, secao_uuid: secao.uuid }));
    ida.rota = {
      ...ida.rota,
      distancia_km: 14,
      duracao_s: 1800,
      trechos: [
        { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 8, duracao_s: 1080 },
        { parada_origem_ordem: 2, parada_destino_ordem: 3, distancia_km: 6, duracao_s: 720 },
      ],
      pontos_de_rota: [],
    };
    ida.viagens = ida.viagens.map((viagem) => ({
      ...viagem,
      horarios_paradas: viagem.horarios_paradas.slice(0, 3),
    }));
    return {
      modo: "novo",
      identidade: {
        codigo: documento.autos.codigo,
        empresa: documento.autos.empresa,
        tipo: documento.autos.tipo,
        status: "proposta",
      },
      secoesEmConstrucao: secoes,
      servicos: [servico],
    };
  }

  /** Serviço ainda EM CONSTRUÇÃO no modo "novo" (guarda: comportamento hoje
   * correto, não pode regredir). */
  function sessaoNovoServicoEmConstrucao(): Extract<SessaoFormulario, { modo: "novo" }> {
    const documento = documentoExemploMinimo();
    const secoes = documento.autos.secoes;
    const servicoEmConstrucao: ServicoEmConstrucao = {
      uuid: SERVICO_UUID,
      numero_n: "0000-1CR",
      caracteristica_veiculo: "CR",
      carater: "principal",
      direcionalidade: "ida",
      locais: [],
    };
    return {
      modo: "novo",
      identidade: {
        codigo: documento.autos.codigo,
        empresa: documento.autos.empresa,
        tipo: documento.autos.tipo,
        status: "proposta",
      },
      secoesEmConstrucao: secoes,
      servicosEmConstrucao: [servicoEmConstrucao],
    };
  }

  /** Serviço em construção sobre um documento CARREGADO (ambiguidade 2 da
   * análise): `linhaAtual.completo === false` e `base.modo === "carregado"` —
   * nenhum dos dois `if` do bug original entra. */
  function sessaoCarregadaServicoEmConstrucao(): Extract<SessaoFormulario, { modo: "carregado" }> {
    const documento = documentoExemploMinimo();
    const servicoEmConstrucao: ServicoEmConstrucao = {
      uuid: SERVICO_EM_CONSTRUCAO_UUID,
      numero_n: "0000-2CR",
      caracteristica_veiculo: "CR",
      carater: "principal",
      direcionalidade: "ida",
      locais: [],
    };
    return {
      modo: "carregado",
      documento,
      alertasImportacao: [],
      servicosEmConstrucao: [servicoEmConstrucao],
    };
  }

  test('[regressão] modo "novo", Serviço já PROMOVIDO: criar Local grava em sessao.servicos[i].locais, não é descartado', async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoNovoServicoPromovido(),
      SERVICO_UUID,
      "ida",
    );

    criarLocalPelaLinhaFormularioInline(resultado, "Rodoviária", { lng: -46.38, lat: -23.98 });
    await act(async () => {
      await flush();
    });

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "novo") throw new Error("esperava modo novo");
    const servico = sessaoFinal.servicos!.find((s) => s.uuid === SERVICO_UUID)!;
    expect(servico).toBeDefined();
    const localCriado = servico.locais.find((l) => l.nome === "Rodoviária");
    expect(localCriado).toBeDefined();
    expect(localCriado!.geolocalizacao_ida).toBeDefined();

    // A Parada criada referencia a MESMA UUID do Local gravado (RN-004/036) —
    // é exatamente essa igualdade que o bug quebrava (Parada comitada, Local
    // descartado).
    const chave = chaveItinerario(SERVICO_UUID, "ida");
    const paradaLocal = sessaoFinal.paradasEmEdicao?.[chave]?.find((p) => p.tipo === "local");
    expect(paradaLocal?.tipo === "local" ? paradaLocal.localUuid : undefined).toBe(
      localCriado!.uuid,
    );

    resultado.desmontar();
  });

  test('[integração] modo "novo" promovido: a tabela mostra "Cidade - Nome", nenhum aviso de RN-036, e o clique na rota continua criando ponto de rota', async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoNovoServicoPromovido(),
      SERVICO_UUID,
      "ida",
    );

    criarLocalPelaLinhaFormularioInline(
      resultado,
      "Rodoviária",
      { lng: -46.38, lat: -23.98 },
      { lng: -46.38, lat: -23.98 },
    );
    await act(async () => {
      await flush();
    });

    // Nunca o UUID cru na linha (era o primeiro sintoma relatado).
    const rotulos = [
      ...resultado.container.querySelectorAll('[data-testid="parada-rotulo"]'),
    ].map((el) => el.textContent);
    expect(rotulos.some((texto) => texto?.includes("Santos - Rodoviária"))).toBe(true);
    expect(rotulos.some((texto) => /^[0-9a-f-]{36}$/i.test(texto ?? ""))).toBe(false);

    // Nenhum aviso de montagem (RN-036) — a referência está íntegra.
    expect(
      resultado.container.querySelector('[data-testid="avisos-montagem-invalida"]'),
    ).toBeNull();

    // Clique sobre a linha da rota ainda cria ponto de rota (terceiro sintoma
    // relatado — o `if (!resolucao.ok) return;` deixava de disparar quando
    // `resolverParadasRota` não encontrava o Local descartado).
    const chave = chaveItinerario(SERVICO_UUID, "ida");
    const pontosAntes = obterSessao().pontosDeRotaEmEdicao?.[chave]?.length ?? 0;
    act(() => {
      (
        editorCapturado.props as unknown as {
          aoCriarPontoDeRota?: (posicao: Coordenada) => void;
        }
      ).aoCriarPontoDeRota?.({ lng: -46.4, lat: -24.0 });
    });
    await act(async () => {
      await flush();
    });
    const pontosDepois = obterSessao().pontosDeRotaEmEdicao?.[chave]?.length ?? 0;
    expect(pontosDepois).toBe(pontosAntes + 1);

    resultado.desmontar();
  });

  test('[guarda] modo "novo", Serviço EM CONSTRUÇÃO: criar Local continua gravando em servicosEmConstrucao[i].locais (comportamento preservado)', async () => {
    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoNovoServicoEmConstrucao(),
      SERVICO_UUID,
      "ida",
    );

    criarLocalPelaLinhaFormularioInline(resultado, "Padaria", { lng: -46.38, lat: -23.98 });
    await act(async () => {
      await flush();
    });

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "novo") throw new Error("esperava modo novo");
    expect(sessaoFinal.servicos ?? []).toHaveLength(0);
    const servicoEmConstrucao = sessaoFinal.servicosEmConstrucao!.find(
      (s) => s.uuid === SERVICO_UUID,
    )!;
    expect(servicoEmConstrucao.locais?.some((l) => l.nome === "Padaria")).toBe(true);

    resultado.desmontar();
  });

  test('[guarda] modo "carregado", Serviço EM CONSTRUÇÃO: criar Local grava em servicosEmConstrucao[i].locais, não em documento.autos (ambiguidade 2 da análise)', async () => {
    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoCarregadaServicoEmConstrucao(),
      SERVICO_EM_CONSTRUCAO_UUID,
      "ida",
    );

    criarLocalPelaLinhaFormularioInline(resultado, "Padaria", { lng: -46.38, lat: -23.98 });
    await act(async () => {
      await flush();
    });

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("esperava modo carregado");
    const servicoEmConstrucao = sessaoFinal.servicosEmConstrucao!.find(
      (s) => s.uuid === SERVICO_EM_CONSTRUCAO_UUID,
    )!;
    expect(servicoEmConstrucao.locais?.some((l) => l.nome === "Padaria")).toBe(true);
    // O documento carregado original não é tocado por este Serviço, que nem
    // existe nele.
    expect(
      sessaoFinal.documento.autos.servicos.some((s) => s.uuid === SERVICO_EM_CONSTRUCAO_UUID),
    ).toBe(false);

    resultado.desmontar();
  });

  test('dois Locais em sequência no mesmo Serviço promovido: o segundo não apaga o primeiro', async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoNovoServicoPromovido(),
      SERVICO_UUID,
      "ida",
    );

    criarLocalPelaLinhaFormularioInline(resultado, "Padaria", { lng: -46.38, lat: -23.98 });
    await act(async () => {
      await flush();
    });
    criarLocalPelaLinhaFormularioInline(resultado, "Farmácia", { lng: -46.39, lat: -23.99 });
    await act(async () => {
      await flush();
    });

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "novo") throw new Error("esperava modo novo");
    const servico = sessaoFinal.servicos!.find((s) => s.uuid === SERVICO_UUID)!;
    const nomes = servico.locais.map((l) => l.nome);
    expect(nomes).toContain("Padaria");
    expect(nomes).toContain("Farmácia");

    resultado.desmontar();
  });

  // A rederivação do município (RN-029) NÃO é exercitada aqui: este teste
  // injeta um `Local` já pronto direto em `aoAtualizarLocal`, como faz o mapa
  // depois de `revalidarArrastoLocal` — quem deriva o município é aquele motor,
  // coberto em `testes/unitarios/formulario/locais-fluxos.test.ts`. O que se
  // afere aqui é só o destino da gravação: a coordenada nova sobrevive num
  // Serviço promovido do modo "novo", com a MESMA UUID.
  test('[arrasto] mover o marcador de um Local num Serviço promovido do modo "novo" atualiza geolocalizacao_ida preservando a UUID (RN-004)', async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const sessaoInicial = sessaoNovoServicoPromovido();
    const servicoInicial = sessaoInicial.servicos![0];
    servicoInicial.locais = [
      {
        uuid: "c2afe932-bf0f-4338-8ff4-63cd908b9033",
        nome: "Ponto de Embarque Praia",
        municipio: "Praia Grande",
        geolocalizacao_ida: { latitude: -24.005, longitude: -46.398 },
      },
    ];

    const { obterSessao, resultado } = await montarSessaoNaEtapa(
      sessaoInicial,
      SERVICO_UUID,
      "ida",
    );

    const localAtualizado = {
      ...servicoInicial.locais[0],
      geolocalizacao_ida: { latitude: -23.5, longitude: -46.6 },
    };
    act(() => {
      (
        editorCapturado.props as unknown as {
          aoAtualizarLocal?: (local: typeof localAtualizado) => void;
        }
      ).aoAtualizarLocal?.(localAtualizado);
    });
    await act(async () => {
      await flush();
    });

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "novo") throw new Error("esperava modo novo");
    const servicoFinal = sessaoFinal.servicos!.find((s) => s.uuid === SERVICO_UUID)!;
    const localFinal = servicoFinal.locais.find(
      (l) => l.uuid === "c2afe932-bf0f-4338-8ff4-63cd908b9033",
    )!;
    expect(localFinal).toBeDefined();
    // RN-004 explícita: o arrasto ATUALIZA a entidade existente, não cria uma
    // segunda com UUID nova.
    expect(servicoFinal.locais).toHaveLength(1);
    expect(localFinal.uuid).toBe("c2afe932-bf0f-4338-8ff4-63cd908b9033");
    expect(localFinal.geolocalizacao_ida).toEqual({ latitude: -23.5, longitude: -46.6 });

    resultado.desmontar();
  });

  test("[inválido] sem Serviço selecionado não existe caminho de criação de Local (linhaAtual nulo é impossível por construção)", async () => {
    // `editorCapturado` é module-level (compartilhado entre testes) — limpo
    // aqui para que a asserção de ausência não capture o valor de um teste
    // anterior que MONTOU o editor de verdade.
    editorCapturado.props = null;
    let sessaoAtual: SessaoFormulario = sessaoNovoServicoPromovido();
    const montagem: { resultado?: ResultadoRenderizacao } = {};
    const renderizarEtapa = () => (
      <EtapaItinerarios
        sessao={sessaoAtual}
        aoAtualizarSessao={(novaSessao) => {
          sessaoAtual = novaSessao;
          montagem.resultado!.rerenderizar(renderizarEtapa());
        }}
      />
    );
    const resultado = renderizar(renderizarEtapa());
    montagem.resultado = resultado;
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Seleciona um Serviço que NÃO existe em `linhas` — `select` não tem essa
    // opção, então o valor não muda e `linhaAtual` permanece nulo. Nenhum
    // gesto do usuário chega a chamar `comLocaisAtualizados`.
    const select = resultado.container.querySelector(
      '[data-testid="select-servico-itinerario"]',
    ) as HTMLSelectElement;
    expect(
      [...select.options].some((opcao) => opcao.value === "uuid-inexistente-nao-selecionado"),
    ).toBe(false);

    // Sem Serviço selecionado: nem o seletor de sentido, nem o mapa, nem a
    // tabela de paradas — não há gesto capaz de chamar `comLocaisAtualizados`
    // com `linhaAtual` nulo.
    expect(resultado.container.querySelector('[data-testid="seletor-sentido"]')).toBeNull();
    expect(resultado.container.querySelector('[data-testid="tabela-paradas"]')).toBeNull();
    expect(editorCapturado.props).toBeNull();

    resultado.desmontar();
  });
});

describe("EtapaItinerarios — linha-formulário de criação inline na tabela (TASK-095; DEC-077)", () => {
  function linhaDaTabela(resultado: ResultadoRenderizacao, indice: number): Element | undefined {
    const linhas = [
      ...resultado.container.querySelectorAll('[data-testid="tabela-paradas"] tbody > tr'),
    ];
    return linhas[indice];
  }

  test("escolher Local sem âncora de linha abre a linha-formulário no FIM da tabela", async () => {
    const { resultado } = await montarEtapa(1);

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada("local", { lng: -46.38, lat: -23.98 });
    });

    const linhas = [
      ...resultado.container.querySelectorAll('[data-testid="tabela-paradas"] tbody > tr'),
    ];
    const linhaFormulario = resultado.container
      .querySelector('[data-testid="form-criar-local"]')
      ?.closest("tr");
    expect(linhaFormulario).not.toBeNull();
    // A linha-formulário é a ÚLTIMA linha da tabela (sem âncora ⇒ fim).
    expect(linhas.at(-1)).toBe(linhaFormulario);

    resultado.desmontar();
  });

  test("escolher Local COM âncora de linha abre a linha-formulário na posição de inserção", async () => {
    // Mesma âncora do caso "antes" de TASK-067/DEC-055: insere após a 2ª Parada.
    const { resultado } = await montarEtapa(2, -23.97);

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada(
        "local",
        { lng: -46.38, lat: -23.98 },
        { lng: -46.38, lat: -23.98 },
      );
    });

    const linhaFormulario = resultado.container
      .querySelector('[data-testid="form-criar-local"]')
      ?.closest("tr");
    expect(linhaFormulario).not.toBeNull();
    // Entra logo antes da 3ª Parada (índice 2 na lista de paradas — trecho
    // 2→3 da rota) e depois do ponto de rota intercalado no meio da lista.
    const indiceNaTabela = [
      ...resultado.container.querySelectorAll('[data-testid="tabela-paradas"] tbody > tr'),
    ].indexOf(linhaFormulario!);
    const linhaAnterior = linhaDaTabela(resultado, indiceNaTabela - 1);
    const linhaSeguinte = linhaDaTabela(resultado, indiceNaTabela + 1);
    expect(linhaAnterior?.getAttribute("data-testid")).not.toBe("form-criar-local");
    expect(linhaSeguinte?.querySelector('[data-testid="parada-rotulo"]')).not.toBeNull();

    resultado.desmontar();
  });

  test("painel de criação abaixo do mapa não existe mais; testids de criação preservados dentro da tabela", async () => {
    const { resultado } = await montarEtapa(1);

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada("secao", { lng: -46.38, lat: -23.98 });
    });

    const dentroDaTabela = resultado.container.querySelector('[data-testid="tabela-paradas"]');
    expect(dentroDaTabela?.querySelector('[data-testid="form-criar-secao"]')).not.toBeNull();
    expect(dentroDaTabela?.querySelector('[data-testid="nome-secao-input"]')).not.toBeNull();
    expect(dentroDaTabela?.querySelector('[data-testid="confirmar-criar-secao"]')).not.toBeNull();
    // Fora da tabela (o antigo painel abaixo do mapa) não existe mais.
    const foraDaTabela = resultado.container.querySelector(
      '[data-testid="coluna-paradas"] > [data-testid="form-criar-secao"]',
    );
    expect(foraDaTabela).toBeNull();

    resultado.desmontar();
  });

  test("nome vazio mantém o botão de confirmar desabilitado", async () => {
    const { resultado } = await montarEtapa(1);

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada("local", { lng: -46.38, lat: -23.98 });
    });

    const botaoConfirmar = resultado.container.querySelector(
      '[data-testid="confirmar-criar-local"]',
    ) as HTMLButtonElement;
    expect(botaoConfirmar.disabled).toBe(true);

    const input = resultado.container.querySelector(
      '[data-testid="nome-local-input"]',
    ) as HTMLInputElement;
    digitar(input, "Padaria");
    expect(botaoConfirmar.disabled).toBe(false);

    resultado.desmontar();
  });

  test("[inválido] cancelar remove a linha-formulário sem criar nada e sem disparar recálculo/OSRM", async () => {
    const { obterSessao, resultado } = await montarEtapa(1);
    const chamadasAntes = vi.mocked(fetch).mock.calls.length;
    const paradasAntes = obterSessao().paradasEmEdicao;

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada("local", { lng: -46.38, lat: -23.98 });
    });
    expect(vi.mocked(fetch).mock.calls).toHaveLength(chamadasAntes);
    expect(resultado.container.querySelector('[data-testid="form-criar-local"]')).not.toBeNull();

    const input = resultado.container.querySelector(
      '[data-testid="nome-local-input"]',
    ) as HTMLInputElement;
    digitar(input, "Padaria");
    clicar(
      [...resultado.container.querySelectorAll("button")].find(
        (botao) => botao.textContent === "Cancelar",
      )!,
    );

    expect(resultado.container.querySelector('[data-testid="form-criar-local"]')).toBeNull();
    expect(vi.mocked(fetch).mock.calls).toHaveLength(chamadasAntes);
    expect(obterSessao().paradasEmEdicao).toEqual(paradasAntes);

    resultado.desmontar();
  });

  test("[inválido] ponto fora de SP: mensagem de recusa inline e NENHUMA Parada criada", async () => {
    const { obterSessao, resultado } = await montarEtapa(1);
    const paradasAntes = obterSessao().paradasEmEdicao;

    act(() => {
      // Latitude/longitude fora do polígono sintético de qualquer município
      // conhecido pelos recursos de teste (fora do planeta é garantidamente
      // fora do polígono — RECURSOS_MUNICIPIO_TESTE cobre todo o globo, então
      // usamos coordenadas inválidas para o ray-casting não achar match).
      editorCapturado.props?.aoIniciarCriacaoParada("local", { lng: 200, lat: 100 });
    });
    const input = resultado.container.querySelector(
      '[data-testid="nome-local-input"]',
    ) as HTMLInputElement;
    digitar(input, "Fora de SP");
    clicar(resultado.container.querySelector('[data-testid="confirmar-criar-local"]')!);

    expect(
      resultado.container.querySelector('[data-testid="mensagem-recusa-criacao-inline"]'),
    ).not.toBeNull();
    // A linha-formulário permanece aberta (recusa não fecha o gesto).
    expect(resultado.container.querySelector('[data-testid="form-criar-local"]')).not.toBeNull();
    expect(obterSessao().paradasEmEdicao).toEqual(paradasAntes);

    resultado.desmontar();
  });
});

describe("EtapaItinerarios — latitude/longitude editáveis na criação inline (TASK-132; DEC-112 item 5)", () => {
  test("os quatro casos (Seção/Local × com/sem âncora de linha) abrem com os campos preenchidos, 6 casas decimais", async () => {
    const casos: Array<{
      tipo: "secao" | "local";
      posicaoNaLinha?: Coordenada;
    }> = [
      { tipo: "secao" },
      { tipo: "secao", posicaoNaLinha: { lng: -46.38, lat: -23.98 } },
      { tipo: "local" },
      { tipo: "local", posicaoNaLinha: { lng: -46.38, lat: -23.98 } },
    ];

    for (const caso of casos) {
      const { resultado } = await montarEtapa(2, -23.97);
      act(() => {
        editorCapturado.props?.aoIniciarCriacaoParada(
          caso.tipo,
          { lng: -46.38, lat: -23.98 },
          caso.posicaoNaLinha,
        );
      });

      const latitudeInput = resultado.container.querySelector(
        '[data-testid="latitude-criacao-input"]',
      ) as HTMLInputElement;
      const longitudeInput = resultado.container.querySelector(
        '[data-testid="longitude-criacao-input"]',
      ) as HTMLInputElement;
      expect(latitudeInput.value).toBe("-23.980000");
      expect(longitudeInput.value).toBe("-46.380000");

      resultado.desmontar();
    }
  });

  test("[inválido] 'Atualizar ponto' com valor inválido exibe recusa e NÃO move o marcador pendente", async () => {
    const { resultado } = await montarEtapa(1);

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada("local", { lng: -46.38, lat: -23.98 });
    });
    const posicaoPendenteAntes = editorCapturado.props?.posicaoCriacaoPendente;

    const latitudeInput = resultado.container.querySelector(
      '[data-testid="latitude-criacao-input"]',
    ) as HTMLInputElement;
    digitar(latitudeInput, "abc");
    clicar(resultado.container.querySelector('[data-testid="atualizar-ponto-criacao"]')!);

    expect(
      resultado.container.querySelector('[data-testid="mensagem-recusa-criacao-inline"]'),
    ).not.toBeNull();
    expect(editorCapturado.props?.posicaoCriacaoPendente).toEqual(posicaoPendenteAntes);
    // O texto digitado é preservado, não descartado pela recusa.
    expect(latitudeInput.value).toBe("abc");

    resultado.desmontar();
  });

  test("'Atualizar ponto' com valor válido move o marcador pendente sem criar nada", async () => {
    const { obterSessao, resultado } = await montarEtapa(1);
    const paradasAntes = obterSessao().paradasEmEdicao;
    const chamadasAntes = vi.mocked(fetch).mock.calls.length;

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada("local", { lng: -46.38, lat: -23.98 });
    });

    const latitudeInput = resultado.container.querySelector(
      '[data-testid="latitude-criacao-input"]',
    ) as HTMLInputElement;
    digitar(latitudeInput, "-23.990000");
    clicar(resultado.container.querySelector('[data-testid="atualizar-ponto-criacao"]')!);

    expect(editorCapturado.props?.posicaoCriacaoPendente).toEqual({
      lng: -46.38,
      lat: -23.99,
    });
    // Nenhuma criação, nenhum recálculo de rota disparado só por "Atualizar ponto".
    expect(obterSessao().paradasEmEdicao).toEqual(paradasAntes);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(chamadasAntes);

    resultado.desmontar();
  });

  test("confirmar sem clicar 'Atualizar ponto' usa a coordenada CORRENTE dos campos (DEC-112 item 5)", async () => {
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { obterSessao, resultado } = await montarEtapa(1);

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada("local", { lng: -46.38, lat: -23.98 });
    });

    const latitudeInput = resultado.container.querySelector(
      '[data-testid="latitude-criacao-input"]',
    ) as HTMLInputElement;
    const longitudeInput = resultado.container.querySelector(
      '[data-testid="longitude-criacao-input"]',
    ) as HTMLInputElement;
    digitar(latitudeInput, "-23.500000");
    digitar(longitudeInput, "-46.500000");
    // Confirma SEM clicar em "Atualizar ponto".
    const nomeInput = resultado.container.querySelector(
      '[data-testid="nome-local-input"]',
    ) as HTMLInputElement;
    digitar(nomeInput, "Rodoviária Nova");
    clicar(resultado.container.querySelector('[data-testid="confirmar-criar-local"]')!);
    await act(async () => {
      await flush();
    });

    const sessaoFinal = obterSessao();
    if (sessaoFinal.modo !== "carregado") throw new Error("esperava modo carregado");
    const localCriado = sessaoFinal.documento.autos.servicos[0].locais.find(
      (l) => l.nome === "Rodoviária Nova",
    );
    expect(localCriado).toBeDefined();
    expect(localCriado!.geolocalizacao_ida).toEqual({ latitude: -23.5, longitude: -46.5 });

    resultado.desmontar();
  });

  test("[inválido] confirmar com campo de coordenada inválido não cria Seção/Local", async () => {
    const { obterSessao, resultado } = await montarEtapa(1);
    const paradasAntes = obterSessao().paradasEmEdicao;

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada("local", { lng: -46.38, lat: -23.98 });
    });
    const longitudeInput = resultado.container.querySelector(
      '[data-testid="longitude-criacao-input"]',
    ) as HTMLInputElement;
    digitar(longitudeInput, "200");
    const nomeInput = resultado.container.querySelector(
      '[data-testid="nome-local-input"]',
    ) as HTMLInputElement;
    digitar(nomeInput, "Padaria");
    clicar(resultado.container.querySelector('[data-testid="confirmar-criar-local"]')!);

    expect(
      resultado.container.querySelector('[data-testid="mensagem-recusa-criacao-inline"]'),
    ).not.toBeNull();
    expect(resultado.container.querySelector('[data-testid="form-criar-local"]')).not.toBeNull();
    expect(obterSessao().paradasEmEdicao).toEqual(paradasAntes);

    resultado.desmontar();
  });

  test("a âncora de inserção (posicaoNaLinha) é preservada mesmo com a coordenada editada para longe da linha", async () => {
    // Mesma âncora usada em "escolher Local COM âncora de linha" — insere
    // após a 2ª Parada — mas agora a coordenada é editada para um ponto
    // distante da rota antes de confirmar (DEC-112 item 5: âncora não muda).
    // Mock genérico: a inserção passa de 3 para 4 paradas, exigindo 3 legs.
    vi.stubGlobal("fetch", respostaOsrmGenericaMock());
    const { resultado } = await montarEtapa(2, -23.97);

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada(
        "local",
        { lng: -46.38, lat: -23.98 },
        { lng: -46.38, lat: -23.98 },
      );
    });

    const latitudeInput = resultado.container.querySelector(
      '[data-testid="latitude-criacao-input"]',
    ) as HTMLInputElement;
    const longitudeInput = resultado.container.querySelector(
      '[data-testid="longitude-criacao-input"]',
    ) as HTMLInputElement;
    // Bem longe da linha da rota — a Parada deve nascer na MESMA posição.
    digitar(latitudeInput, "-25.000000");
    digitar(longitudeInput, "-50.000000");
    const nomeInput = resultado.container.querySelector(
      '[data-testid="nome-local-input"]',
    ) as HTMLInputElement;
    digitar(nomeInput, "Padaria Distante");
    clicar(resultado.container.querySelector('[data-testid="confirmar-criar-local"]')!);
    await act(async () => {
      await flush();
    });

    const rotulos = [
      ...resultado.container.querySelectorAll('[data-testid="parada-rotulo"]'),
    ].map((el) => el.textContent);
    const indiceCriada = rotulos.findIndex((texto) => texto?.includes("Padaria Distante"));
    // Mesma posição que o caso não editado: logo antes da 3ª Parada (índice 2
    // na lista de paradas — "escolher Local COM âncora de linha").
    expect(indiceCriada).toBe(2);

    resultado.desmontar();
  });

  test("cancelar e reabrir em outro ponto repõe os campos com o novo clique, sem resíduo do anterior", async () => {
    const { resultado } = await montarEtapa(1);

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada("local", { lng: -46.38, lat: -23.98 });
    });
    let latitudeInput = resultado.container.querySelector(
      '[data-testid="latitude-criacao-input"]',
    ) as HTMLInputElement;
    digitar(latitudeInput, "-1.111111");
    clicar(
      [...resultado.container.querySelectorAll("button")].find(
        (botao) => botao.textContent === "Cancelar",
      )!,
    );
    expect(resultado.container.querySelector('[data-testid="form-criar-local"]')).toBeNull();

    act(() => {
      editorCapturado.props?.aoIniciarCriacaoParada("local", { lng: -46.4, lat: -23.5 });
    });
    latitudeInput = resultado.container.querySelector(
      '[data-testid="latitude-criacao-input"]',
    ) as HTMLInputElement;
    const longitudeInput = resultado.container.querySelector(
      '[data-testid="longitude-criacao-input"]',
    ) as HTMLInputElement;
    expect(latitudeInput.value).toBe("-23.500000");
    expect(longitudeInput.value).toBe("-46.400000");

    resultado.desmontar();
  });
});
