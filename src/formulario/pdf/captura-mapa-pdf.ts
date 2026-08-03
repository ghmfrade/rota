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
import { numerarItinerario, type SimboloParada } from "./legenda-itinerario";
import {
  desenharSimbolos,
  paraSimboloProjetado,
  type SimboloProjetado,
} from "./simbolos-mapa-pdf";

// Captura da imagem do mapa de cada itinerário para o PDF operacional
// (Spec 04 §13.1 item 4d; Spec 01 §8; DEC-104), com os símbolos de Seção/Local
// compostos sobre o traçado (DEC-105 — TASK-127).
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

/**
 * Dimensões da captura, em pixels de canvas. Proporção 5:3 pensada para A4
 * retrato, preservada da TASK-033; TASK-126 sobe a resolução de 1000×600 para
 * ~1400×840 (de ~140 dpi para ~195 dpi na largura útil da página, §13.3 —
 * legibilidade de impressão), sem alterar o enquadramento da DEC-104.
 */
export const LARGURA_CAPTURA = 1400;
export const ALTURA_CAPTURA = 840;

/**
 * Margem entre a rota e as bordas da imagem, como **fração da largura** da
 * captura. O enquadramento da DEC-104 é relativo: subir a resolução sem subir a
 * margem na mesma proporção encostaria a rota na borda. Derivar a margem da
 * largura, em vez de fixar dois números que precisam ser mantidos em razão
 * constante à mão, torna o acoplamento impossível de quebrar por descuido.
 */
export const FRACAO_MARGEM_ENQUADRAMENTO = 0.04;

/** Margem entre a rota e as bordas da imagem, em pixels (enquadramento DEC-104). */
export const MARGEM_ENQUADRAMENTO = LARGURA_CAPTURA * FRACAO_MARGEM_ENQUADRAMENTO;

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

/** Subconjunto de `maplibre-gl.Map` usado na projeção — testável sem WebGL. */
export interface ProjetorDeCoordenadas {
  project(lngLat: [number, number]): { x: number; y: number };
}

/**
 * Projeta os símbolos numerados (coordenadas geográficas) para pixels do
 * canvas do mapa. `mapa.project` devolve pixels CSS do contêiner; a escala
 * para pixels do canvas fica a cargo do chamador (devicePixelRatio).
 */
export function projetarSimbolos(
  mapa: ProjetorDeCoordenadas,
  simbolos: readonly SimboloParada[],
): SimboloProjetado[] {
  return simbolos.map((simbolo) => {
    const ponto = mapa.project([simbolo.longitude, simbolo.latitude]);
    return paraSimboloProjetado(simbolo, ponto);
  });
}

/**
 * Compõe os símbolos sobre o canvas já capturado: um canvas novo, do MESMO
 * tamanho em pixels do canvas do mapa (não da largura CSS — DEC-104 já roda
 * em devicePixelRatio), recebe o traçado e os símbolos desenhados por cima
 * (`simbolos-mapa-pdf.ts`). `escala = canvas.width / largura` porque
 * `mapa.project` devolve pixels CSS, não pixels de canvas — a mesma razão
 * escala tanto as coordenadas quanto os TAMANHOS dos símbolos (lado, raio,
 * corpo de fonte), para que a peça permaneça legível em qualquer
 * `devicePixelRatio`.
 */
export function comporImagemComSimbolos(
  canvasBase: HTMLCanvasElement,
  simbolosProjetados: readonly SimboloProjetado[],
  largura: number,
): string {
  const canvasComposto = document.createElement("canvas");
  canvasComposto.width = canvasBase.width;
  canvasComposto.height = canvasBase.height;
  const ctx = canvasComposto.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D indisponível para compor os símbolos do PDF.");
  }

  ctx.drawImage(canvasBase, 0, 0);

  const escala = canvasBase.width / largura;
  const escalados = simbolosProjetados.map((simbolo) => ({
    ...simbolo,
    x: simbolo.x * escala,
    y: simbolo.y * escala,
  }));
  desenharSimbolos(
    ctx,
    escalados,
    { larguraMoldura: canvasComposto.width, alturaMoldura: canvasComposto.height },
    escala,
  );

  return canvasComposto.toDataURL("image/png");
}

/**
 * Captura a imagem de um itinerário: mapa oculto, rota congelada desenhada,
 * enquadrada pelos seus limites, canvas capturado como data-URI PNG — com os
 * símbolos numerados de Seção/Local compostos por cima (DEC-105). Rejeita
 * quando a geometria não tem limites, o mapa não fica ocioso a tempo ou o
 * canvas não é capturável — o chamador trata a falha como lacuna tolerada
 * (DEC-104). Falha ao compor os símbolos (contexto 2D indisponível) não
 * derruba a captura: cai para o traçado puro, pela mesma tolerância.
 */
export async function capturarMapaDaRota(
  geometria: LineString,
  simbolos: readonly SimboloParada[] = [],
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

    if (simbolos.length === 0) {
      return capturarImagemMapa(mapa);
    }
    try {
      const canvasBase = mapa.getCanvas();
      if (!canvasBase) return capturarImagemMapa(mapa);
      const projetados = projetarSimbolos(mapa, simbolos);
      return comporImagemComSimbolos(canvasBase, projetados, largura);
    } catch {
      // Composição falhou (contexto 2D indisponível): a falha é tolerada
      // (DEC-104) — cai para o traçado puro, sem símbolos.
      return capturarImagemMapa(mapa);
    }
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
 * Captura, um a um, o mapa de todos os itinerários do documento — com os
 * símbolos de Seção/Local numerados (DEC-105), derivados das paradas do
 * PRÓPRIO itinerário (`legenda-itinerario.ts`). Sequencial de propósito: cada
 * mapa é criado e destruído antes do próximo, evitando N contextos WebGL
 * simultâneos. `capturar` é injetável para teste (nada de WebGL nem de tiles
 * reais em Vitest).
 */
export async function capturarMapasDoDocumento(
  documento: DocumentoOperacao,
  capturar: (
    geometria: LineString,
    simbolos: readonly SimboloParada[],
  ) => Promise<string> = (g, s) => capturarMapaDaRota(g, s),
): Promise<ResultadoCapturaDoDocumento> {
  const imagens = new Map<string, string>();
  const falhas: ResultadoCapturaDoDocumento["falhas"] = [];

  for (const servico of documento.autos.servicos) {
    for (const itinerario of servico.itinerarios) {
      try {
        const { simbolos } = numerarItinerario(
          itinerario,
          servico.uuid,
          documento.autos.secoes,
          servico.locais,
        );
        const imagem = await capturar(itinerario.rota.geometria, simbolos);
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
