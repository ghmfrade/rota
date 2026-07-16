import { haversine, type Ponto } from "@/shared/geo";
import type { Coordenada } from "./geometria";

// Ancorador geométrico do gesto de ponto de rota (TASK-063; Spec 03 §3.6,
// §3.6.1; RN-042). Projeta um ponto qualquer sobre a polilinha da rota
// calculada e devolve a distância acumulada ao longo do traçado — usada tanto
// para decidir a qual trecho (par de paradas consecutivas) um clique
// pertence quanto para ordenar vários pontos de rota dentro do mesmo trecho
// (regra de travessia `(apos_parada_ordem, índice no array)`, §3.6.1). Módulo
// puro, sem MapLibre nem `shared/contrato` — só coordenadas e Haversine
// (RN-027, única função de distância do projeto).

const paraPonto = (c: Coordenada): Ponto => ({ latitude: c.lat, longitude: c.lng });

/** Projeção de um ponto sobre uma polilinha: a distância acumulada ao longo
 * do traçado até o ponto mais próximo da polilinha, e a distância
 * perpendicular (afastamento) até esse ponto. */
export interface ProjecaoNaLinha {
  distanciaAoLongoM: number;
  distanciaPerpendicularM: number;
}

/**
 * Projeta `ponto` sobre `linha` (sequência ordenada de vértices, `>= 2`
 * pontos): percorre cada segmento, encontra a projeção mais próxima (menor
 * distância perpendicular) e devolve a distância acumulada até ela. Linha
 * degenerada (`< 2` pontos) devolve `undefined` — não há traçado sobre o
 * qual projetar.
 *
 * Projeção linear no plano local (aproximação equirretangular, escala
 * métrica por `cos(latitude)`): suficiente para achar o segmento mais
 * próximo em escala urbana; a distância reportada usa sempre Haversine
 * (RN-027), nunca a distância planar da projeção.
 */
export function projetarNaLinha(
  ponto: Coordenada,
  linha: readonly Coordenada[],
): ProjecaoNaLinha | undefined {
  if (linha.length < 2) return undefined;

  let distanciaAcumulada = 0;
  let melhor: ProjecaoNaLinha | undefined;

  for (let i = 0; i < linha.length - 1; i++) {
    const a = linha[i];
    const b = linha[i + 1];
    const comprimentoSegmento = haversine(paraPonto(a), paraPonto(b));

    const t = parametroProjecao(ponto, a, b);
    const projetado: Coordenada = {
      lng: a.lng + t * (b.lng - a.lng),
      lat: a.lat + t * (b.lat - a.lat),
    };
    const distanciaPerpendicular = haversine(paraPonto(ponto), paraPonto(projetado));
    const distanciaAoLongo = distanciaAcumulada + t * comprimentoSegmento;

    if (!melhor || distanciaPerpendicular < melhor.distanciaPerpendicularM) {
      melhor = { distanciaAoLongoM: distanciaAoLongo, distanciaPerpendicularM: distanciaPerpendicular };
    }

    distanciaAcumulada += comprimentoSegmento;
  }

  return melhor;
}

/** Parâmetro `t ∈ [0, 1]` da projeção ortogonal de `ponto` sobre o segmento
 * `a→b`, no plano local (graus escalados por `cos(latitude)` para tratar
 * longitude e latitude de forma comparável). Segmento degenerado (`a == b`)
 * devolve `0` (projeta em `a`). */
function parametroProjecao(ponto: Coordenada, a: Coordenada, b: Coordenada): number {
  const escala = Math.cos((a.lat * Math.PI) / 180);
  const dx = (b.lng - a.lng) * escala;
  const dy = b.lat - a.lat;
  const px = (ponto.lng - a.lng) * escala;
  const py = ponto.lat - a.lat;

  const comprimentoQuadrado = dx * dx + dy * dy;
  if (comprimentoQuadrado === 0) return 0;

  const t = (px * dx + py * dy) / comprimentoQuadrado;
  return Math.min(1, Math.max(0, t));
}

/** Ancoragem de um ponto de rota recém-criado: a `apos_parada_ordem` do
 * trecho em que o clique caiu e a distância ao longo do traçado (usada para
 * ordenar entre outros pontos do mesmo trecho — §3.6.1). */
export interface AncoragemPontoDeRota {
  aposParadaOrdem: number;
  distanciaAoLongoM: number;
}

/**
 * Ancora um ponto clicado sobre a linha da rota a um trecho do itinerário
 * (Spec 03 §3.6: "ancorado logicamente entre duas paradas consecutivas").
 * Projeta o clique e cada parada sobre a mesma polilinha; `apos_parada_ordem`
 * é a quantidade de paradas cuja projeção fica antes do clique ao longo do
 * traçado, sempre saturada em `[1, paradas.length - 1]` (RN-042 — nunca
 * devolve `0` nem `paradas.length`, mesmo em cliques antes da primeira ou
 * depois da última parada).
 *
 * Devolve `undefined` quando não há trecho para ancorar: linha degenerada
 * (`< 2` pontos) ou menos de 2 paradas (sem par consecutivo).
 *
 * Limitação conhecida (rota com laço, passando duas vezes pelo mesmo lugar):
 * a projeção de menor distância perpendicular pode não ser a interseção que
 * o usuário tinha em mente — mesma limitação registrada na TASK-067.
 */
export function ancorarPontoNaRota(
  ponto: Coordenada,
  linhaRota: readonly Coordenada[],
  paradas: readonly Coordenada[],
): AncoragemPontoDeRota | undefined {
  if (paradas.length < 2) return undefined;

  const projecaoPonto = projetarNaLinha(ponto, linhaRota);
  if (!projecaoPonto) return undefined;

  const distanciasParadas = paradas.map((p) => projetarNaLinha(p, linhaRota)?.distanciaAoLongoM ?? 0);

  const quantidadeAntes = distanciasParadas.filter((d) => d <= projecaoPonto.distanciaAoLongoM).length;
  const aposParadaOrdem = Math.min(Math.max(quantidadeAntes, 1), paradas.length - 1);

  return { aposParadaOrdem, distanciaAoLongoM: projecaoPonto.distanciaAoLongoM };
}
