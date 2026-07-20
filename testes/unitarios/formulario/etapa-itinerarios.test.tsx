// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { EtapaItinerarios, chaveItinerario, itinerariosAoVivoDaSessao } from "@/formulario/itinerarios";
import { coletarPendencias } from "@/formulario/pendencias";
import type { SessaoFormulario } from "@/formulario/sessao";
import {
  coletarViolacoesEstruturais,
  esquemaDocumentoOperacao,
  type PontoDeRota,
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
vi.mock("@/formulario/itinerarios/editor-mapa-itinerario", () => ({
  EditorMapaItinerario: () => null,
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

function sessaoComTresSecoes(aposParadaOrdem: number): SessaoFormulario {
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
        latitude: -23.97,
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

async function montarEtapa(aposParadaOrdem: number): Promise<MontagemEtapa> {
  let sessaoAtual = sessaoComTresSecoes(aposParadaOrdem);
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
    definirValorSelect.call(select, SERVICO_UUID);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  act(() => {
    (
      resultado.container.querySelector(
        '[data-testid="botao-sentido"][data-sentido="ida"]',
      ) as HTMLButtonElement
    ).click();
  });

  return { obterSessao: () => sessaoAtual, resultado };
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
