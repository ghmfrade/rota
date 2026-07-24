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
import { projetarNaLinha } from "./ancoragem";

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
  /** Pré-visualização efêmera, decorativa e sem interação (TASK-069/DEC-072). */
  fantasma?: boolean;
  /** Estado visual aditivo de seleção (TASK-064; Spec 04 §7) — canal distinto
   * de `invalido` (outline em vez de borda), para que os dois coexistam sem
   * que um mascare o outro (DEC-070). Nunca persistido (RN-096). */
  selecionado?: boolean;
  /** Solto ao final do arrasto NATIVO do marcador (botão ESQUERDO — o único
   * que o MapLibre arrasta nativamente), com a posição nova. */
  aoArrastar?: (posicao: Coordenada) => void;
  /**
   * Arrasto com o botão DIREITO (TASK-078; DEC-079) — gesto independente do
   * nativo acima, pois o MapLibre só arrasta marcadores no botão esquerdo.
   * Opt-in: presente ⇒ o `mousedown` com botão direito sobre o marcador
   * inicia um arrasto próprio (tracking de `mousemove`/`mouseup` no
   * documento) que entrega a posição solta aqui, e o `contextmenu` nativo do
   * navegador fica suprimido sobre este marcador (não interfere no
   * `contextmenu` do mapa — DEC-055 — que só existe sobre a linha/mapa
   * vazio, superfície distinta). Ausente: nenhum gesto adicional no botão
   * direito, comportamento de hoje.
   */
  aoArrastarComBotaoDireito?: (posicao: Coordenada) => void;
  /** Início do arrasto NATIVO (botão esquerdo) — opt-in, usado pelo
   * consumidor para exibir UI efêmera durante o gesto (ex.: os demais pontos
   * do cluster de uma Seção em cor neutra, TASK-078/DEC-079). */
  aoIniciarArrasto?: () => void;
  /** Fim do arrasto NATIVO (botão esquerdo) — sempre chamado ao soltar,
   * inclusive em cancelamento (`Esc`/sem deslocamento), para o consumidor
   * encerrar a UI efêmera aberta em `aoIniciarArrasto`. */
  aoFinalizarArrasto?: () => void;
  /** Clicar no marcador (não arrastar) — sincronização de seleção mapa→tabela
   * (TASK-064). Opt-in: sem esta prop, o marcador não reage a clique. */
  aoSelecionar?: () => void;
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
   * (`linhas`), com o ponto do traçado mais próximo do cursor (DEC-072). No
   * mapa único de itinerários cria um ponto de rota (TASK-063/069; Spec 04
   * §7.3 item 6; DEC-055). Sem esta prop, todo clique esquerdo cai em
   * `aoClicar`, como antes da TASK-063.
   */
  aoClicarNaLinha?: (posicao: Coordenada) => void;
  /**
   * Informa a projeção do cursor sobre a linha enquanto ela estiver sob
   * hover. `null` limpa a pré-visualização ao afastar/sair do mapa. Opt-in:
   * consumidores sem esta prop preservam cursor e comportamento anteriores.
   */
  aoMoverSobreLinha?: (posicao: Coordenada | null) => void;
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
  fantasma: boolean,
  selecionado: boolean,
): string {
  return [
    `marcador-mapa-${forma}`,
    tamanho === "medio" ? "marcador-mapa--medio" : "",
    tamanho === "pequeno" ? "marcador-mapa--pequeno" : "",
    invalido ? "marcador-mapa--invalido" : "",
    fantasma ? "marcador-mapa--fantasma" : "",
    selecionado ? "marcador-mapa--selecionado" : "",
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
  fantasma: boolean,
  selecionado: boolean,
) {
  // O MapLibre acrescenta classes estruturais (`maplibregl-marker`, âncoras
  // e estado de arrasto) ao mesmo elemento. Remover somente as classes que o
  // ROTA governa evita apagar essas classes em cada atualização de hover.
  elemento.classList.remove(
    "marcador-mapa-circulo",
    "marcador-mapa-quadrado",
    "marcador-mapa--medio",
    "marcador-mapa--pequeno",
    "marcador-mapa--invalido",
    "marcador-mapa--fantasma",
    "marcador-mapa--selecionado",
  );
  elemento.classList.add(
    ...classesMarcadorCustomizado(forma, tamanho, invalido, fantasma, selecionado).split(" "),
  );
  elemento.style.backgroundColor = cor ?? "";
}

function criarElementoCustomizado(
  forma: FormaCustomizada,
  cor?: string,
  tamanho?: MarcadorMapa["tamanho"],
  invalido = false,
  fantasma = false,
  selecionado = false,
): HTMLElement {
  const elemento = document.createElement("div");
  atualizarElementoCustomizado(
    elemento,
    forma,
    cor,
    tamanho,
    invalido,
    fantasma,
    selecionado,
  );
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
    aoMoverSobreLinha,
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
  // Id do marcador em arrasto (TASK-097). Vive em `ref` justamente para NÃO
  // provocar render: o defeito corrigido aqui nasce de um re-render por
  // `mousemove` que reposicionava o marcador em pleno gesto. `null` = nenhum
  // arrasto em curso. Efêmero, nunca exportado (RN-096).
  const arrastandoRef = useRef<string | null>(null);
  // Cancelamento por `Esc` do arrasto em curso (TASK-078; DEC-079: "soltar
  // sem deslocamento efetivo, ou Esc durante o arrasto, cancela e restaura
  // as posições originais sem efeito"). Setado no `keydown`, consumido no
  // fim do gesto (`dragend` nativo ou `mouseup` do arrasto por botão
  // direito) — o marcador já é revertido à posição da prop nos dois pontos
  // de término (mesmo padrão de reversão da TASK-097), então cancelar aqui
  // só precisa suprimir a chamada ao callback do domínio.
  const canceladoRef = useRef(false);

  // Refs de props usadas dentro de handlers do mapa, para sempre chamar a
  // versão mais recente sem reassinar os listeners.
  const aoClicarRef = useRef(aoClicar);
  aoClicarRef.current = aoClicar;
  const aoClicarNaLinhaRef = useRef(aoClicarNaLinha);
  aoClicarNaLinhaRef.current = aoClicarNaLinha;
  const aoMoverSobreLinhaRef = useRef(aoMoverSobreLinha);
  aoMoverSobreLinhaRef.current = aoMoverSobreLinha;
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
    const container = containerRef.current;
    if (!container) return;
    let cancelado = false;
    let limparHoverLinha: (() => void) | undefined;

    // Cópia estável do Map de marcadores vivos, para uso seguro na limpeza.
    const marcadoresVivos = marcadoresRef.current;

    // `Esc` cancela o arrasto em curso, qualquer que seja o botão (TASK-078;
    // DEC-079) — reverte o marcador à posição da prop e marca o cancelamento
    // para o handler de fim de gesto suprimir o callback do domínio.
    const aoTeclaEsc = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      const id = arrastandoRef.current;
      if (id === null) return;
      const marcador = marcadoresRef.current.get(id);
      const atual = marcadoresRefProp.current.find((m) => m.id === id);
      if (marcador && atual) {
        marcador.setLngLat([atual.posicao.lng, atual.posicao.lat]);
      }
      canceladoRef.current = true;
    };
    document.addEventListener("keydown", aoTeclaEsc);

    void (async () => {
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

      const TOLERANCIA_PX = 6;
      const consultarLinha = (evento: { point: { x: number; y: number } }) => {
        if (!mapa.getLayer(ID_CAMADA_LINHAS)) return false;
        const { x, y } = evento.point;
        return (
          mapa.queryRenderedFeatures(
            [
              [x - TOLERANCIA_PX, y - TOLERANCIA_PX],
              [x + TOLERANCIA_PX, y + TOLERANCIA_PX],
            ],
            { layers: [ID_CAMADA_LINHAS] },
          ).length > 0
        );
      };
      const projetarSobreLinhas = (posicao: Coordenada) => {
        let melhor: ReturnType<typeof projetarNaLinha>;
        for (const linha of linhasRefProp.current) {
          const projecao = projetarNaLinha(posicao, linha.pontos);
          if (
            projecao &&
            (!melhor ||
              projecao.distanciaPerpendicularM <
                melhor.distanciaPerpendicularM)
          ) {
            melhor = projecao;
          }
        }
        return melhor?.posicao;
      };

      // Clique esquerdo: se acertar a camada de linhas (rota desenhada) e o
      // consumidor tiver `aoClicarNaLinha`, o gesto é ponto de rota (TASK-063;
      // DEC-055); senão, o clique cai em `aoClicar` como antes. A tolerância
      // de alguns pixels ao redor do ponto compensa a linha fina (largura em
      // `LARGURA_LINHA_PADRAO`) sem exigir precisão de 1 pixel do usuário.
      mapa.on("click", (evento) => {
        const posicao = { lng: evento.lngLat.lng, lat: evento.lngLat.lat };
        if (aoClicarNaLinhaRef.current && consultarLinha(evento)) {
          const posicaoProjetada = projetarSobreLinhas(posicao);
          if (posicaoProjetada) {
            aoClicarNaLinhaRef.current(posicaoProjetada);
            return;
          }
        }
        aoClicarRef.current?.(posicao);
      });

      // Hover é somente affordance de UI: usa o mesmo hit-test e a mesma
      // projeção do clique, sem editar estado de domínio nem chamar OSRM
      // (TASK-069, RN-052, DEC-072).
      //
      // Durante um arrasto o hover fica SUSPENSO (TASK-097): o MapLibre move o
      // marcador ouvindo o mesmo `mousemove` do mapa, e emitir a projeção aqui
      // provocava um re-render por evento — que reposicionava o marcador em
      // pleno gesto e fazia o `dragend` ler a coordenada antiga. Suspender é
      // também o comportamento correto de UI: durante o arrasto não se
      // pré-visualiza a criação de um vértice novo.
      mapa.on("mousemove", (evento) => {
        if (!aoMoverSobreLinhaRef.current) return;
        if (arrastandoRef.current !== null) return;
        const posicao = { lng: evento.lngLat.lng, lat: evento.lngLat.lat };
        const posicaoProjetada = consultarLinha(evento)
          ? projetarSobreLinhas(posicao)
          : undefined;
        mapa.getCanvas().style.cursor = posicaoProjetada ? "pointer" : "";
        aoMoverSobreLinhaRef.current(posicaoProjetada ?? null);
      });

      limparHoverLinha = () => {
        if (!aoMoverSobreLinhaRef.current) return;
        // Sair do container durante um arrasto não zera o cursor do gesto
        // (TASK-097): o fantasma já foi limpo no `dragstart`.
        if (arrastandoRef.current !== null) return;
        mapa.getCanvas().style.cursor = "";
        aoMoverSobreLinhaRef.current(null);
      };
      container.addEventListener("mouseleave", limparHoverLinha);

      // Clique direito (contextmenu): sobre e fora da linha são callbacks
      // mutuamente exclusivos (TASK-065/DEC-055). A âncora de viewport é
      // efêmera e serve somente para posicionar o menu Seção/Local. Sobre a
      // linha, a coordenada entregue é a PROJETADA no traçado (DEC-078,
      // TASK-098), estendendo ao botão direito a mesma simetria que a
      // DEC-072 já aplica ao clique esquerdo; sem projeção possível (linha
      // degenerada) degrada para a coordenada bruta, sem descartar o clique.
      mapa.on("contextmenu", (evento) => {
        const posicao = {
          lng: evento.lngLat.lng,
          lat: evento.lngLat.lat,
        };
        const ancoraTela = {
          x: evento.originalEvent.clientX,
          y: evento.originalEvent.clientY,
        };
        if (aoClicarDireitoNaLinhaRef.current && consultarLinha(evento)) {
          const posicaoProjetada = projetarSobreLinhas(posicao) ?? posicao;
          aoClicarDireitoNaLinhaRef.current(posicaoProjetada, ancoraTela);
          return;
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
      // Um arrasto interrompido pelo unmount nunca emite `dragend`: sem esta
      // limpeza o id ficaria retido e o marcador de mesmo id numa remontagem
      // deixaria de ser sincronizado para sempre (TASK-097).
      arrastandoRef.current = null;
      document.removeEventListener("keydown", aoTeclaEsc);
      if (limparHoverLinha) {
        container.removeEventListener("mouseleave", limparHoverLinha);
      }
      marcadoresVivos.forEach((marcador) => marcador.remove());
      marcadoresVivos.clear();
      mapaRef.current?.remove();
      mapaRef.current = null;
    };
    // Centro/zoom/tiles iniciais; mudanças reativas ficam a cargo dos
    // consumidores via os arrays de marcadores/linhas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!aoMoverSobreLinha) {
      const mapa = mapaRef.current;
      if (mapa) mapa.getCanvas().style.cursor = "";
    }
  }, [aoMoverSobreLinha]);

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
        // Marcador removido no meio do próprio arrasto não emite `dragend`
        // (TASK-097): liberar o id aqui evita deixar a guarda abaixo ligada
        // para sempre.
        if (arrastandoRef.current === id) arrastandoRef.current = null;
        marcador.remove();
        vivos.delete(id);
      }
    });
    // Adiciona/atualiza os desejados.
    for (const spec of desejados) {
      const existente = vivos.get(spec.id);
      if (existente) {
        existente.setDraggable(spec.arrastavel ?? false);
        // Enquanto ESTE marcador está em arrasto, a posição na tela pertence
        // ao gesto, não à prop (TASK-097; Spec 04 §7.3 itens 4/5/6, RN-052):
        // `Marker.setLngLat` do MapLibre reposiciona sem checar arrasto, e o
        // `dragend` passava a ler a coordenada antiga — o gesto virava no-op.
        // Os demais marcadores seguem sincronizados normalmente neste render.
        if (arrastandoRef.current !== spec.id) {
          existente.setLngLat([spec.posicao.lng, spec.posicao.lat]);
        }
        if (spec.forma === "circulo" || spec.forma === "quadrado") {
          atualizarElementoCustomizado(
            existente.getElement(),
            spec.forma,
            spec.cor,
            spec.tamanho,
            spec.invalido ?? false,
            spec.fantasma ?? false,
            spec.selecionado ?? false,
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
                spec.fantasma,
                spec.selecionado,
              ),
              draggable: spec.arrastavel ?? false,
            })
          : new maplibregl.Marker({
              color: spec.cor,
              draggable: spec.arrastavel ?? false,
            });
      marcador.setLngLat([spec.posicao.lng, spec.posicao.lat]).addTo(mapa);
      // Estado de arrasto derivado dos eventos do próprio `Marker` (TASK-097).
      // O MapLibre só arrasta nativamente no botão ESQUERDO.
      marcador.on("dragstart", () => {
        arrastandoRef.current = spec.id;
        canceladoRef.current = false;
        // Fantasma já desenhado antes do gesto não pode ficar congelado na
        // tela durante todo o arrasto: limpa uma vez aqui, e o hover volta a
        // funcionar sozinho no primeiro `mousemove` depois do `dragend`.
        if (aoMoverSobreLinhaRef.current) {
          mapa.getCanvas().style.cursor = "";
          aoMoverSobreLinhaRef.current(null);
        }
        marcadoresRefProp.current.find((m) => m.id === spec.id)?.aoIniciarArrasto?.();
      });
      marcador.on("dragend", () => {
        arrastandoRef.current = null;
        const cancelado = canceladoRef.current;
        canceladoRef.current = false;
        const { lng, lat } = marcador.getLngLat();
        const atual = marcadoresRefProp.current.find((m) => m.id === spec.id);
        // Devolve o marcador à posição da prop ANTES de entregar a coordenada
        // solta. Se o gesto for aceito, o consumidor comita a posição nova no
        // mesmo flush do React (antes do paint) e o marcador segue onde foi
        // solto; se for recusado — 350 m de Seção/Local (DEC-044, RN-027/032)
        // —, o marcador volta ao lugar antigo mesmo quando a recusa não gera
        // render (mensagem idêntica à anterior faz o React descartar o
        // update). Sem isto, a correção acima trocaria a reversão indevida do
        // gesto legítimo por uma recusa que não reverte.
        if (atual) {
          marcador.setLngLat([atual.posicao.lng, atual.posicao.lat]);
        }
        atual?.aoFinalizarArrasto?.();
        // `Esc` cancelado (TASK-078/DEC-079): a posição já foi revertida
        // acima (e, antes disso, no `keydown`) — só falta suprimir o
        // callback de domínio, exatamente como "soltar sem deslocamento".
        if (cancelado) return;
        atual?.aoArrastar?.({ lng, lat });
      });
      // Arrasto com o botão DIREITO (TASK-078; DEC-079) — opt-in via
      // `aoArrastarComBotaoDireito`. O MapLibre não oferece esse gesto
      // nativamente (só arrasta no botão esquerdo), então o `mousedown`/
      // `mousemove`/`mouseup` são tratados aqui, reaproveitando o MESMO
      // `arrastandoRef` (TASK-097) para suspender o hover da linha e a
      // reconciliação por prop deste marcador enquanto o gesto está ativo.
      marcador.getElement().addEventListener("mousedown", (evento) => {
        if (evento.button !== 2) return;
        const atual = marcadoresRefProp.current.find((m) => m.id === spec.id);
        if (!atual?.aoArrastarComBotaoDireito) return;
        evento.preventDefault();
        arrastandoRef.current = spec.id;
        canceladoRef.current = false;
        if (aoMoverSobreLinhaRef.current) {
          mapa.getCanvas().style.cursor = "";
          aoMoverSobreLinhaRef.current(null);
        }

        const converterParaLngLat = (clientX: number, clientY: number): Coordenada => {
          const retangulo = containerRef.current!.getBoundingClientRect();
          const ponto = mapa.unproject([clientX - retangulo.left, clientY - retangulo.top]);
          return { lng: ponto.lng, lat: ponto.lat };
        };

        const aoMover = (eventoMove: MouseEvent) => {
          const posicao = converterParaLngLat(eventoMove.clientX, eventoMove.clientY);
          marcador.setLngLat([posicao.lng, posicao.lat]);
        };
        const aoSoltar = (eventoUp: MouseEvent) => {
          document.removeEventListener("mousemove", aoMover);
          document.removeEventListener("mouseup", aoSoltar);
          arrastandoRef.current = null;
          const cancelado = canceladoRef.current;
          canceladoRef.current = false;
          const posicaoFinal = converterParaLngLat(eventoUp.clientX, eventoUp.clientY);
          const atualNoSolto = marcadoresRefProp.current.find((m) => m.id === spec.id);
          // Mesma reversão do `dragend` nativo acima — o marcador sempre
          // volta à posição da prop antes de entregar a coordenada solta.
          if (atualNoSolto) {
            marcador.setLngLat([atualNoSolto.posicao.lng, atualNoSolto.posicao.lat]);
          }
          if (cancelado) return;
          atualNoSolto?.aoArrastarComBotaoDireito?.(posicaoFinal);
        };
        document.addEventListener("mousemove", aoMover);
        document.addEventListener("mouseup", aoSoltar);
      });
      // Suprime o `contextmenu` nativo do navegador sobre este marcador
      // (risco técnico central da TASK-078/Q-057): sem isto, soltar o botão
      // direito abriria o menu do navegador em vez de só confirmar o
      // arrasto acima. Não intercepta o `contextmenu` do MAPA (DEC-055),
      // que só dispara sobre a linha/mapa vazio — superfície distinta de um
      // marcador já existente.
      marcador.getElement().addEventListener("contextmenu", (evento) => {
        const atual = marcadoresRefProp.current.find((m) => m.id === spec.id);
        if (!atual?.aoArrastarComBotaoDireito) return;
        evento.preventDefault();
        evento.stopPropagation();
      });
      // Clique no marcador (sem arrastar) — sincronização mapa→tabela
      // (TASK-064). Lê o callback mais recente do spec vivo, como o
      // `dragend` acima, para nunca chamar uma versão obsoleta do handler.
      // `stopPropagation` só roda quando ESTE marcador tem `aoSelecionar`
      // (opt-in, RN-097): sem isso, o clique segue seu caminho normal e
      // continua alcançando `aoClicar`/`aoClicarNaLinha` do mapa, como antes
      // da TASK-064 — nenhum consumidor sem seleção nota diferença.
      marcador.getElement().addEventListener("click", (evento) => {
        const atual = marcadoresRefProp.current.find((m) => m.id === spec.id);
        if (!atual?.aoSelecionar) return;
        evento.stopPropagation();
        atual.aoSelecionar();
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
