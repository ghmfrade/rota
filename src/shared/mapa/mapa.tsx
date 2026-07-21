"use client";

// Mapa base client-side (Spec 01 §8 — OSM/MapLibre; Spec 04 §6/§7 — área de
// mapa das etapas de itinerário). Primitiva reutilizável por Formulário e
// Comparador (por isso mora em `shared/`, RN-097): renderiza tiles OSM, expõe
// marcadores arrastáveis, desenho de LineString e clique no mapa, e permite
// capturar o canvas como imagem para o PDF (RN-074).
//
// Escopo desta task (TASK-020) é a primitiva: nada de OSRM, regra dos 350 m,
// derivação de município ou lógica de Seção/Local/Parada (tasks posteriores).

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";
import type { Map as MapaMaplibre, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { CENTRO_PADRAO_SP, ZOOM_PADRAO } from "./config";
import { capturarImagemMapa } from "./captura";
import { estiloRasterOsm } from "./estilo";
import {
  linhasParaGeoJson,
  type Coordenada,
  type LinhaMapa,
} from "./geometria";

export type { Coordenada, LinhaMapa } from "./geometria";

/** Posição efêmera do gesto na viewport, usada apenas para ancorar UI. */
export interface AncoraTelaMapa {
  x: number;
  y: number;
}

/** Marcador arrastável no mapa (ex.: Seção, Local, ponto de rota). */
export interface MarcadorMapa {
  id: string;
  posicao: Coordenada;
  arrastavel?: boolean;
  cor?: string;
  /**
   * Forma do marcador: `"pino"` (default, o pino teardrop do MapLibre),
   * `"circulo"` ou `"quadrado"`. O mapa único de itinerários usa o quadrado
   * para Seção e o círculo para Local/ponto de rota (TASK-068/DEC-069); os
   * demais consumidores mantêm o pino sem alteração (extensão opt-in).
   */
  forma?: "pino" | "circulo" | "quadrado";
  /**
   * Tamanho do marcador customizado (default `"normal"`): `"medio"` identifica
   * o Local e `"pequeno"` o vértice de ponto de rota (DEC-069). A hierarquia
   * visual é definida por tokens CSS, não por valores repetidos no componente.
   */
  tamanho?: "normal" | "medio" | "pequeno";
  /** Estado visual aditivo de erro da ocorrência, sem trocar forma/preenchimento. */
  invalido?: boolean;
  aoArrastar?: (posicao: Coordenada) => void;
}

export interface MapaProps {
  centro?: Coordenada;
  zoom?: number;
  /** Override do template de tiles (default: env/OSM — ver `config.ts`). */
  urlTiles?: string;
  marcadores?: readonly MarcadorMapa[];
  linhas?: readonly LinhaMapa[];
  /**
   * Chamado ao clicar no mapa (botão esquerdo) FORA da linha da rota, com a
   * coordenada clicada. Se `aoClicarNaLinha` estiver presente e o clique
   * acertar a camada de linhas, este callback NÃO é chamado — os dois se
   * excluem por construção (DEC-055: cada botão tem um significado só).
   */
  aoClicar?: (posicao: Coordenada) => void;
  /**
   * Chamado ao clicar com o botão ESQUERDO SOBRE a linha da rota desenhada
   * (`linhas`), com a coordenada clicada (não a coordenada da linha — a do
   * cursor). No mapa único de itinerários cria um ponto de rota (TASK-063;
   * Spec 04 §7.3 item 6; DEC-055). Sem esta prop, todo clique esquerdo cai em
   * `aoClicar`, como antes da TASK-063.
   */
  aoClicarNaLinha?: (posicao: Coordenada) => void;
  /**
   * Chamado ao clicar com o botão DIREITO (`contextmenu`), com a coordenada.
   * No mapa único de itinerários o clique direito fora da linha abre o menu
   * Seção/Local (DEC-055); nos demais consumidores pode ficar ausente.
   */
  aoClicarDireito?: (posicao: Coordenada, ancoraTela: AncoraTelaMapa) => void;
  /**
   * Chamado ao clicar com o botão DIREITO SOBRE uma linha desenhada. Quando
   * presente, exclui-se de `aoClicarDireito`, simetricamente ao gesto do botão
   * esquerdo. Consumidores sem esta prop mantêm o comportamento anterior.
   */
  aoClicarDireitoNaLinha?: (posicao: Coordenada, ancoraTela: AncoraTelaMapa) => void;
  className?: string;
  style?: CSSProperties;
}

/** Handle imperativo do mapa, para capturar imagem e acessar a instância. */
export interface MapaHandle {
  capturarImagem: (formato?: "image/png" | "image/jpeg") => string;
  obterMapa: () => MapaMaplibre | null;
}

const ID_FONTE_LINHAS = "linhas-mapa";
const ID_CAMADA_LINHAS = "linhas-mapa-camada";

type FormaCustomizada = Exclude<NonNullable<MarcadorMapa["forma"]>, "pino">;

function classesMarcadorCustomizado(
  forma: FormaCustomizada,
  tamanho: MarcadorMapa["tamanho"],
  invalido: boolean,
): string {
  return [
    `marcador-mapa-${forma}`,
    tamanho === "medio" ? "marcador-mapa--medio" : "",
    tamanho === "pequeno" ? "marcador-mapa--pequeno" : "",
    invalido ? "marcador-mapa--invalido" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// Elemento DOM customizado recebido imperativamente pelo MapLibre. Forma,
// tamanho, borda e sombra vêm dos tokens/classes de `globals.css`; somente a
// cor de preenchimento é data-driven (doc 18 §6.1).
function atualizarElementoCustomizado(
  elemento: HTMLElement,
  forma: FormaCustomizada,
  cor: string | undefined,
  tamanho: MarcadorMapa["tamanho"],
  invalido: boolean,
) {
  elemento.className = classesMarcadorCustomizado(forma, tamanho, invalido);
  elemento.style.backgroundColor = cor ?? "";
}

function criarElementoCustomizado(
  forma: FormaCustomizada,
  cor?: string,
  tamanho?: MarcadorMapa["tamanho"],
  invalido = false,
): HTMLElement {
  const elemento = document.createElement("div");
  atualizarElementoCustomizado(elemento, forma, cor, tamanho, invalido);
  return elemento;
}

export const Mapa = forwardRef<MapaHandle, MapaProps>(function Mapa(
  {
    centro = CENTRO_PADRAO_SP,
    zoom = ZOOM_PADRAO,
    urlTiles,
    marcadores = [],
    linhas = [],
    aoClicar,
    aoClicarNaLinha,
    aoClicarDireito,
    aoClicarDireitoNaLinha,
    className,
    style,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<MapaMaplibre | null>(null);
  const marcadoresRef = useRef<Map<string, Marker>>(new Map());
  const prontoRef = useRef(false);

  // Refs de props usadas dentro de handlers do mapa, para sempre chamar a
  // versão mais recente sem reassinar os listeners.
  const aoClicarRef = useRef(aoClicar);
  aoClicarRef.current = aoClicar;
  const aoClicarNaLinhaRef = useRef(aoClicarNaLinha);
  aoClicarNaLinhaRef.current = aoClicarNaLinha;
  const aoClicarDireitoRef = useRef(aoClicarDireito);
  aoClicarDireitoRef.current = aoClicarDireito;
  const aoClicarDireitoNaLinhaRef = useRef(aoClicarDireitoNaLinha);
  aoClicarDireitoNaLinhaRef.current = aoClicarDireitoNaLinha;
  const marcadoresRefProp = useRef(marcadores);
  marcadoresRefProp.current = marcadores;
  const linhasRefProp = useRef(linhas);
  linhasRefProp.current = linhas;

  useImperativeHandle(
    ref,
    () => ({
      capturarImagem: (formato) => {
        const mapa = mapaRef.current;
        if (!mapa) {
          throw new Error("Mapa ainda não inicializado (RN-074).");
        }
        return capturarImagemMapa(mapa, formato);
      },
      obterMapa: () => mapaRef.current,
    }),
    [],
  );

  // Inicialização única do mapa. maplibre-gl é carregado dinamicamente para não
  // ser avaliado no SSR/prerender (só existe no navegador, usa WebGL).
  useEffect(() => {
    let cancelado = false;

    // Cópia estável do Map de marcadores vivos, para uso seguro na limpeza.
    const marcadoresVivos = marcadoresRef.current;

    void (async () => {
      const container = containerRef.current;
      if (!container) return;

      const maplibregl = await import("maplibre-gl");
      if (cancelado) return;

      const mapa = new maplibregl.Map({
        container,
        style: estiloRasterOsm(urlTiles),
        center: [centro.lng, centro.lat],
        zoom,
        // Necessário para capturar o canvas como imagem no PDF (RN-074).
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
      mapaRef.current = mapa;

      // Clique esquerdo: se acertar a camada de linhas (rota desenhada) e o
      // consumidor tiver `aoClicarNaLinha`, o gesto é ponto de rota (TASK-063;
      // DEC-055); senão, o clique cai em `aoClicar` como antes. A tolerância
      // de alguns pixels ao redor do ponto compensa a linha fina (largura em
      // `LARGURA_LINHA_PADRAO`) sem exigir precisão de 1 pixel do usuário.
      const TOLERANCIA_PX = 6;
      mapa.on("click", (evento) => {
        const posicao = { lng: evento.lngLat.lng, lat: evento.lngLat.lat };
        if (aoClicarNaLinhaRef.current && mapa.getLayer(ID_CAMADA_LINHAS)) {
          const { x, y } = evento.point;
          const acertos = mapa.queryRenderedFeatures(
            [
              [x - TOLERANCIA_PX, y - TOLERANCIA_PX],
              [x + TOLERANCIA_PX, y + TOLERANCIA_PX],
            ],
            { layers: [ID_CAMADA_LINHAS] },
          );
          if (acertos.length > 0) {
            aoClicarNaLinhaRef.current(posicao);
            return;
          }
        }
        aoClicarRef.current?.(posicao);
      });

      // Clique direito (contextmenu): sobre e fora da linha são callbacks
      // mutuamente exclusivos (TASK-065/DEC-055). A âncora de viewport é
      // efêmera e serve somente para posicionar o menu Seção/Local.
      mapa.on("contextmenu", (evento) => {
        const posicao = {
          lng: evento.lngLat.lng,
          lat: evento.lngLat.lat,
        };
        const ancoraTela = {
          x: evento.originalEvent.clientX,
          y: evento.originalEvent.clientY,
        };
        if (aoClicarDireitoNaLinhaRef.current && mapa.getLayer(ID_CAMADA_LINHAS)) {
          const { x, y } = evento.point;
          const acertos = mapa.queryRenderedFeatures(
            [
              [x - TOLERANCIA_PX, y - TOLERANCIA_PX],
              [x + TOLERANCIA_PX, y + TOLERANCIA_PX],
            ],
            { layers: [ID_CAMADA_LINHAS] },
          );
          if (acertos.length > 0) {
            aoClicarDireitoNaLinhaRef.current(posicao, ancoraTela);
            return;
          }
        }
        aoClicarDireitoRef.current?.(posicao, ancoraTela);
      });

      mapa.on("load", () => {
        if (cancelado) return;
        prontoRef.current = true;
        sincronizarLinhas(mapa, linhasRefProp.current);
        sincronizarMarcadores(mapa, maplibregl, marcadoresRefProp.current);
      });
    })();

    return () => {
      cancelado = true;
      prontoRef.current = false;
      marcadoresVivos.forEach((marcador) => marcador.remove());
      marcadoresVivos.clear();
      mapaRef.current?.remove();
      mapaRef.current = null;
    };
    // Centro/zoom/tiles iniciais; mudanças reativas ficam a cargo dos
    // consumidores via os arrays de marcadores/linhas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcilia linhas (LineString) quando a prop muda.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (mapa && prontoRef.current) {
      sincronizarLinhas(mapa, linhas);
    }
  }, [linhas]);

  // Reconcilia marcadores quando a prop muda.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !prontoRef.current) return;
    void (async () => {
      const maplibregl = await import("maplibre-gl");
      sincronizarMarcadores(
        mapa,
        maplibregl,
        marcadores,
        marcadoresRef.current,
      );
    })();
  }, [marcadores]);

  const sincronizarMarcadores = (
    mapa: MapaMaplibre,
    maplibregl: typeof import("maplibre-gl"),
    desejados: readonly MarcadorMapa[],
    vivos: Map<string, Marker> = marcadoresRef.current,
  ) => {
    const idsDesejados = new Set(desejados.map((m) => m.id));
    // Remove marcadores que não estão mais presentes.
    vivos.forEach((marcador, id) => {
      if (!idsDesejados.has(id)) {
        marcador.remove();
        vivos.delete(id);
      }
    });
    // Adiciona/atualiza os desejados.
    for (const spec of desejados) {
      const existente = vivos.get(spec.id);
      if (existente) {
        existente.setDraggable(spec.arrastavel ?? false);
        existente.setLngLat([spec.posicao.lng, spec.posicao.lat]);
        if (spec.forma === "circulo" || spec.forma === "quadrado") {
          atualizarElementoCustomizado(
            existente.getElement(),
            spec.forma,
            spec.cor,
            spec.tamanho,
            spec.invalido ?? false,
          );
        }
        continue;
      }
      const marcador =
        spec.forma === "circulo" || spec.forma === "quadrado"
          ? new maplibregl.Marker({
              element: criarElementoCustomizado(
                spec.forma,
                spec.cor,
                spec.tamanho,
                spec.invalido,
              ),
              draggable: spec.arrastavel ?? false,
            })
          : new maplibregl.Marker({
              color: spec.cor,
              draggable: spec.arrastavel ?? false,
            });
      marcador.setLngLat([spec.posicao.lng, spec.posicao.lat]).addTo(mapa);
      marcador.on("dragend", () => {
        const { lng, lat } = marcador.getLngLat();
        const atual = marcadoresRefProp.current.find((m) => m.id === spec.id);
        atual?.aoArrastar?.({ lng, lat });
      });
      vivos.set(spec.id, marcador);
    }
  };

  const sincronizarLinhas = (
    mapa: MapaMaplibre,
    desejadas: readonly LinhaMapa[],
  ) => {
    const dados = linhasParaGeoJson(desejadas);
    const fonte = mapa.getSource(ID_FONTE_LINHAS);
    if (fonte) {
      (fonte as unknown as { setData: (d: unknown) => void }).setData(dados);
      return;
    }
    mapa.addSource(ID_FONTE_LINHAS, { type: "geojson", data: dados });
    // Sem `beforeId`: a camada é adicionada por último, ficando acima dos tiles.
    mapa.addLayer({
      id: ID_CAMADA_LINHAS,
      type: "line",
      source: ID_FONTE_LINHAS,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "cor"],
        "line-width": ["get", "largura"],
      },
    });
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
      data-testid="mapa-base"
    />
  );
});
