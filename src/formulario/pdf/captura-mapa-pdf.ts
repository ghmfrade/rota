import type { LineString } from "geojson";
import type { DocumentoOperacao, Itinerario } from "@/shared/contrato";
// Submódulos puros importados diretamente (orientação do índice de
// `shared/mapa`): o índice reexporta o componente React do mapa, e este módulo
// precisa ser carregável sem WebGL — `maplibre-gl` só entra no import dinâmico
// de `capturarMapaDaRota`, dentro do navegador.
import { capturarImagemMapa } from "@/shared/mapa/captura";
import { estiloRasterOsm } from "@/shared/mapa/estilo";
import {
  limitesDaGeometria,
  linhaDaGeometria,
  linhasParaGeoJson,
} from "@/shared/mapa/geometria";

// Captura da imagem do mapa de cada itinerário para o PDF operacional
// (Spec 04 §13.1 item 4d; Spec 01 §8; DEC-104).
//
// DEC-104: a captura acontece SOB DEMANDA, no momento da geração — o canvas da
// etapa Itinerários não existe na etapa Exportação, e um documento apenas
// importado nunca passou por aquela etapa. Para cada itinerário monta-se um
// mapa OCULTO e efêmero, que desenha a `rota.geometria` já congelada
// (RN-015/NEG-019 — nada de OSRM, nada de recálculo), enquadra a rota pelos seus
// limites (centralizada e inteiramente contida, no melhor zoom possível),
// captura o canvas e é imediatamente destruído. Nada é persistido: a imagem
// existe só até o PDF ser montado (RN-096/NEG-004).
//
// Falha de captura (tile indisponível, WebGL ausente, timeout) NÃO interrompe a
// geração: o itinerário sai sem imagem e o usuário recebe aviso não bloqueante
// (DEC-104) — não é pendência bloqueante e não altera o gate da RN-078.
//
// O contêiner é um `<div>` avulso, fora da árvore React, posicionado fora da
// tela: não é superfície de UI (a proibição de estilo inline do doc 18 vale para
// os componentes), é o alvo de render do MapLibre.

/** Dimensões da captura, em pixels de canvas. Proporção pensada para A4 retrato. */
export const LARGURA_CAPTURA = 1000;
export const ALTURA_CAPTURA = 600;

/** Margem entre a rota e as bordas da imagem, em pixels (enquadramento DEC-104). */
export const MARGEM_ENQUADRAMENTO = 40;

/** Teto de espera pelo mapa ficar ocioso; estourou, a captura falha (tolerada). */
export const TIMEOUT_CAPTURA_MS = 15_000;

export interface OpcoesCapturaMapa {
  largura?: number;
  altura?: number;
  margem?: number;
  timeoutMs?: number;
  /** Sobrepõe o template de tiles (mesmo override do componente de mapa). */
  urlTiles?: string;
}

const ID_FONTE_ROTA = "rota-pdf";
const ID_CAMADA_ROTA = "rota-pdf-linha";

function criarContainerOculto(largura: number, altura: number): HTMLDivElement {
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = `${largura}px`;
  container.style.height = `${altura}px`;
  container.style.pointerEvents = "none";
  document.body.appendChild(container);
  return container;
}

/**
 * Captura a imagem de um itinerário: mapa oculto, rota congelada desenhada,
 * enquadrada pelos seus limites, canvas capturado como data-URI PNG.
 * Rejeita quando a geometria não tem limites, o mapa não fica ocioso a tempo ou
 * o canvas não é capturável — o chamador trata a falha como lacuna tolerada.
 */
export async function capturarMapaDaRota(
  geometria: LineString,
  opcoes: OpcoesCapturaMapa = {},
): Promise<string> {
  const largura = opcoes.largura ?? LARGURA_CAPTURA;
  const altura = opcoes.altura ?? ALTURA_CAPTURA;
  const margem = opcoes.margem ?? MARGEM_ENQUADRAMENTO;
  const timeoutMs = opcoes.timeoutMs ?? TIMEOUT_CAPTURA_MS;

  const limites = limitesDaGeometria(geometria);
  if (!limites) {
    throw new Error(
      "Rota sem coordenadas para enquadrar no mapa do PDF (Spec 04 §13.1 item 4d).",
    );
  }

  const maplibregl = await import("maplibre-gl");
  const container = criarContainerOculto(largura, altura);
  let mapa: import("maplibre-gl").Map | undefined;

  try {
    mapa = new maplibregl.Map({
      container,
      style: estiloRasterOsm(opcoes.urlTiles),
      // Enquadramento da DEC-104: a rota inteira, centralizada, no maior zoom
      // que ainda a contenha (com margem para não encostar na borda).
      bounds: limites,
      fitBoundsOptions: { padding: margem, animate: false },
      interactive: false,
      attributionControl: false,
      // Sem isto o `toDataURL` devolve um canvas em branco (RN-074).
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    const mapaCriado = mapa;
    await new Promise<void>((resolver, rejeitar) => {
      const temporizador = setTimeout(() => {
        rejeitar(
          new Error("Tempo esgotado ao renderizar o mapa do PDF (tiles indisponíveis?)."),
        );
      }, timeoutMs);

      const concluir = () => {
        clearTimeout(temporizador);
        resolver();
      };

      mapaCriado.on("error", () => {
        // Erro de tile não aborta: o traçado da rota ainda é informativo.
      });

      mapaCriado.on("load", () => {
        mapaCriado.addSource(ID_FONTE_ROTA, {
          type: "geojson",
          data: linhasParaGeoJson([linhaDaGeometria(ID_FONTE_ROTA, geometria)]),
        });
        mapaCriado.addLayer({
          id: ID_CAMADA_ROTA,
          type: "line",
          source: ID_FONTE_ROTA,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": ["get", "cor"],
            "line-width": ["get", "largura"],
          },
        });
        mapaCriado.once("idle", concluir);
      });
    });

    return capturarImagemMapa(mapa);
  } finally {
    mapa?.remove();
    container.remove();
  }
}

/** Uma imagem capturada, endereçada como o modelo do PDF a procura. */
export interface ImagemDeItinerario {
  servicoUuid: string;
  sentido: Itinerario["sentido"];
  imagem: string;
}

export interface ResultadoCapturaDoDocumento {
  /** Chave `servicoUuid|sentido` → data-URI. */
  imagens: Map<string, string>;
  /** Itinerários cuja captura falhou — viram aviso não bloqueante (DEC-104). */
  falhas: { servicoUuid: string; numeroN: string; sentido: Itinerario["sentido"] }[];
}

export function chaveImagem(
  servicoUuid: string,
  sentido: Itinerario["sentido"],
): string {
  return `${servicoUuid}|${sentido}`;
}

/**
 * Captura, um a um, o mapa de todos os itinerários do documento. Sequencial de
 * propósito: cada mapa é criado e destruído antes do próximo, evitando N
 * contextos WebGL simultâneos. `capturar` é injetável para teste (nada de WebGL
 * nem de tiles reais em Vitest).
 */
export async function capturarMapasDoDocumento(
  documento: DocumentoOperacao,
  capturar: (geometria: LineString) => Promise<string> = (g) => capturarMapaDaRota(g),
): Promise<ResultadoCapturaDoDocumento> {
  const imagens = new Map<string, string>();
  const falhas: ResultadoCapturaDoDocumento["falhas"] = [];

  for (const servico of documento.autos.servicos) {
    for (const itinerario of servico.itinerarios) {
      try {
        const imagem = await capturar(itinerario.rota.geometria);
        imagens.set(chaveImagem(servico.uuid, itinerario.sentido), imagem);
      } catch {
        falhas.push({
          servicoUuid: servico.uuid,
          numeroN: servico.numero_n,
          sentido: itinerario.sentido,
        });
      }
    }
  }

  return { imagens, falhas };
}
