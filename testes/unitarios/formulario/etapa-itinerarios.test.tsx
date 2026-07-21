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
import type { SessaoFormulario } from "@/formulario/sessao";
import * as mapa from "@/shared/mapa";
import type { Coordenada } from "@/shared/mapa";
import {
  coletarViolacoesEstruturais,
  esquemaDocumentoOperacao,
  type Local,
  type PontoDeRota,
  type Secao,
} from "@/shared/contrato";
import { act, renderizar, type ResultadoRenderizacao } from "../shared-ui/_ajuda-render";
import { documentoExemploMinimo } from "../../fixtures";

// A etapa carrega esses dados por efeito antes de habilitar a edição. O teste
// não exercita geocodificação; usa fixtures locais mínimas e nunca faz rede.
vi.mock("@/shared/dados-estaticos", () => ({
  carregarGeojsonMunicipios: vi.fn().mockResolvedValue({ features: [] }),
  carregarBaseMunicipios: vi.fn().mockResolvedValue({ municipios: [] }),
}));

// MapLibre/WebGL não existe no jsdom e não participa da regra da TASK-083.
// Mantemos a EtapaItinerarios real e substituímos somente o filho visual.
interface PropsEditorCapturadas {
  aoCriarSecao: (secao: Secao, posicaoNaLinha?: Coordenada) => void;
  aoCriarLocal: (local: Local, posicaoNaLinha?: Coordenada) => void;
  locaisInvalidos?: readonly string[];
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

function sessaoComTresSecoes(
  aposParadaOrdem: number,
  latitudePontoDeRota = -23.97,
): SessaoFormulario {
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

      const local: Local = {
        uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        nome: "Local intermediário",
        municipio: "Santos",
        geolocalizacao_ida: { latitude: -23.98, longitude: -46.38 },
      };
      act(() => {
        editorCapturado.props?.aoCriarLocal(local, { lng: -46.38, lat: -23.98 });
      });
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
      expect(itinerario.paradas[2]).toEqual({ ordem: 3, local_uuid: local.uuid });
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

    const local: Local = {
      uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      nome: "Local no fim",
      municipio: "Santos",
      geolocalizacao_ida: { latitude: -23.98, longitude: -46.38 },
    };
    act(() => {
      editorCapturado.props?.aoCriarLocal(local, { lng: -46.38, lat: -23.98 });
    });
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
    expect(editorCapturado.props?.locaisInvalidos).toEqual([local.uuid]);
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
    const ancoragem = vi.spyOn(mapa, "ancorarPontoNaRota").mockReturnValueOnce(undefined);
    const chamadasAntesDaInsercao = vi.mocked(fetch).mock.calls.length;

    const local: Local = {
      uuid: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      nome: "Local sem ancoragem geométrica",
      municipio: "Santos",
      geolocalizacao_ida: { latitude: -23.98, longitude: -46.38 },
    };
    act(() => {
      editorCapturado.props?.aoCriarLocal(local, { lng: -46.38, lat: -23.98 });
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const chave = chaveItinerario(SERVICO_UUID, "ida");
    expect(ancoragem).toHaveBeenCalledOnce();
    expect(obterSessao().paradasEmEdicao?.[chave]?.map((parada) => parada.tipo)).toEqual([
      "secao",
      "secao",
      "secao",
      "local",
    ]);
    expect(vi.mocked(fetch).mock.calls).toHaveLength(chamadasAntesDaInsercao);
    expect(editorCapturado.props?.locaisInvalidos).toEqual([local.uuid]);
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
