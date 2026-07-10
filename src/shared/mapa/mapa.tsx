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

/** Marcador arrastável no mapa (ex.: Seção, Local, ponto de rota). */
export interface MarcadorMapa {
  id: string;
  posicao: Coordenada;
  arrastavel?: boolean;
  cor?: string;
  aoArrastar?: (posicao: Coordenada) => void;
}

export interface MapaProps {
  centro?: Coordenada;
  zoom?: number;
  /** Override do template de tiles (default: env/OSM — ver `config.ts`). */
  urlTiles?: string;
  marcadores?: readonly MarcadorMapa[];
  linhas?: readonly LinhaMapa[];
  /** Chamado ao clicar no mapa, com a coordenada clicada. */
  aoClicar?: (posicao: Coordenada) => void;
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

export const Mapa = forwardRef<MapaHandle, MapaProps>(function Mapa(
  {
    centro = CENTRO_PADRAO_SP,
    zoom = ZOOM_PADRAO,
    urlTiles,
    marcadores = [],
    linhas = [],
    aoClicar,
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

      mapa.on("click", (evento) => {
        aoClicarRef.current?.({
          lng: evento.lngLat.lng,
          lat: evento.lngLat.lat,
        });
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
        continue;
      }
      const marcador = new maplibregl.Marker({
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
