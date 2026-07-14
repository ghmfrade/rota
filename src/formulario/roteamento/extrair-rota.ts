import type { z } from "zod";
import { arredondaHalfUp } from "@/shared/calculo";
import {
  esquemaGeometriaLineString,
  type PontoDeRota,
  type Trecho,
} from "@/shared/contrato";

// Extração da resposta do OSRM → `rota` parcial (Spec 03 §3.3/§3.4/§3.6;
// RN-014, RN-040, RN-041, RN-050, RN-051). Cobre os dois caminhos de
// mapeamento legs→trechos: sem pontos de rota (`legs.length ==
// paradas.length - 1`, 1:1) e com pontos de rota, nos dois sub-caminhos do
// §3.6 — preferencial (`waypoints` honrado, ainda 1:1) e fallback (fusão de
// legs entre paradas consecutivas). A montagem de `descricao_itinerario` a
// partir dos `steps[].name` aqui expostos é o compositor de `compor-descricao.ts`
// (TASK-025, Spec 03 §3.7).

/** Recorte mínimo de um `step` do envelope OSRM (Spec 03 §3.3) — só `name`,
 * insumo cru da descrição textual (Spec 03 §3.7.4); a limpeza (§3.7.5) é do
 * compositor, não desta extração. */
export interface StepOsrm {
  name?: string;
}

/** Recorte mínimo de um `leg` do envelope OSRM (Spec 03 §3.3). */
export interface LegOsrm {
  /** Metros (fronteira de entrada única em metros — RN-014). */
  distance: number;
  /** Segundos. */
  duration: number;
  /** Manobras do leg — pedidas via `steps=true` (RN-047) exclusivamente para
   * os nomes de via (Spec 03 §3.7.4); ausente quando a instância OSRM não os
   * retorna (RN-053, compatibilidade). */
  steps?: readonly StepOsrm[];
}

/** Recorte mínimo de `routes[0]` do envelope OSRM. */
export interface RotaBrutaOsrm {
  geometry: z.infer<typeof esquemaGeometriaLineString>;
  legs: LegOsrm[];
}

/** Recorte mínimo do envelope de resposta do OSRM (Spec 03 §3.3/§3.5). */
export interface RespostaOsrm {
  code: string;
  routes: RotaBrutaOsrm[];
  /**
   * Texto livre do OSRM em respostas de erro (não é campo do contrato Spec 02 —
   * é a forma do envelope OSRM). Único lugar onde o serviço eventualmente indica
   * a coordenada rejeitada num `NoSegment`; lido best-effort pela TASK-022.
   */
  message?: string;
}

/**
 * Resultado parcial do roteamento de um itinerário: os campos de `rota`
 * (Spec 02 §10.2) exceto `descricao_itinerario`, que é composta à parte por
 * `comporDescricao` (`compor-descricao.ts`, TASK-025) antes de fechar o
 * objeto `rota` congelado final (RN-015). `pontos_de_rota` é o eco do que foi
 * enviado (default `[]`), pronto para o congelamento (Spec 03 §3.6.2 —
 * persistência para reedição). `nomesViasPorTrecho` é o insumo cru (não
 * limpo — §3.7.5 é responsabilidade do compositor) dos nomes de via
 * percorridos em cada trecho, na mesma ordem/índice de `trechos`.
 */
export interface ResultadoRotaOsrm {
  geometria: z.infer<typeof esquemaGeometriaLineString>;
  distancia_km: number;
  duracao_s: number;
  trechos: Trecho[];
  pontos_de_rota: PontoDeRota[];
  /** `nomesViasPorTrecho[i]` é a sequência crua de `step.name` (Spec 03
   * §3.7.4) de todos os legs que compõem `trechos[i]` — paralelo a `trechos`,
   * mesmo índice. Não é campo do contrato (Spec 02); insumo intermediário
   * para `comporDescricao`. */
  nomesViasPorTrecho: (string | undefined)[][];
}

/** Opções de `extrairRota` para o caso com pontos de rota (Spec 03 §3.6). */
export interface OpcoesExtrairRota {
  /** Índices (0-based), na sequência de coordenadas enviada ao OSRM, das
   * paradas — na mesma ordem das paradas (Spec 03 §3.6.1). Presente só
   * quando há pontos de rota; sem eles, mapeamento 1:1 (TASK-021). */
  indicesParadas?: readonly number[];
  /** Pontos de rota enviados nesta requisição — ecoados no resultado para
   * congelamento em `rota.pontos_de_rota` (RN-042, §3.6.2). */
  pontosDeRota?: readonly PontoDeRota[];
}

/**
 * Extrai `routes[0]` da resposta do OSRM e monta `trechos[]` + totais
 * (Spec 03 §3.3/§3.4/§3.6), preservando sempre o invariante
 * `trechos.length == numeroParadas - 1` (RN-041). Dois caminhos, resultado
 * idêntico (RN-051):
 *
 * - **Sem `indicesParadas` (ou pontos de rota vazios):** mapeamento 1:1
 *   `leg[i] → trecho{origem i+1, destino i+2}` — exige
 *   `legs.length == numeroParadas - 1`.
 * - **Com `indicesParadas` (pontos de rota presentes):**
 *   - **Preferencial** — se o OSRM honrou `waypoints`, `legs.length` já é
 *     `numeroParadas - 1`: mesmo mapeamento 1:1 de cima.
 *   - **Fallback** — se todas as coordenadas geraram leg
 *     (`legs.length == totalCoordenadas - 1`), **funde-se** (soma de
 *     `distance`/`duration` em metros/segundos, arredondando **uma vez** por
 *     trecho — RN-050) os legs entre `indicesParadas[i]` e
 *     `indicesParadas[i+1]`.
 *
 * Em ambos os casos, conversão m→km half-up a 2 casas e `duracao_s` inteiro
 * (RN-050), com os totais somados a partir dos trechos **já arredondados**
 * — nunca o total global do OSRM, para não haver erro de fechamento entre
 * `rota.distancia_km` e `Σ trechos`.
 */
export function extrairRota(
  resposta: RespostaOsrm,
  numeroParadas: number,
  opcoes: OpcoesExtrairRota = {},
): ResultadoRotaOsrm {
  const { indicesParadas, pontosDeRota = [] } = opcoes;

  const rotaBruta = resposta.routes[0];
  if (!rotaBruta) {
    throw new Error(
      '[Spec 03 §3.3] resposta OSRM sem "routes[0]" — nenhuma rota calculada.',
    );
  }

  const trechosEsperados = numeroParadas - 1;
  const legs = rotaBruta.legs;

  let trechos: Trecho[];
  let nomesViasPorTrecho: (string | undefined)[][];

  if (legs.length === trechosEsperados) {
    // Sem pontos de rota, ou pontos de rota com `waypoints` honrado
    // (caminho preferencial, §3.6 regra "waypoints") — mapeamento 1:1.
    trechos = legs.map((leg, indice) => ({
      parada_origem_ordem: indice + 1,
      parada_destino_ordem: indice + 2,
      distancia_km: arredondaHalfUp(leg.distance / 1000, 2),
      duracao_s: arredondaHalfUp(leg.duration, 0),
    }));
    nomesViasPorTrecho = legs.map((leg) => (leg.steps ?? []).map((step) => step.name));
  } else if (indicesParadas && legs.length === totalCoordenadas(indicesParadas) - 1) {
    // Fallback: todas as coordenadas geraram leg — funde-se os legs entre
    // paradas consecutivas (Spec 03 §3.6 caminho fallback, §3.6.1 exemplo 2b).
    trechos = fundirLegsEntreParadas(legs, indicesParadas);
    nomesViasPorTrecho = coletarNomesViasPorTrecho(legs, indicesParadas);
  } else {
    throw new Error(
      `[RN-041] legs.length (${legs.length}) não corresponde a ` +
        `paradas.length - 1 (${trechosEsperados}) nem à contagem esperada do ` +
        "caminho fallback com pontos de rota (Spec 03 §3.3, §3.6).",
    );
  }

  const distancia_km = arredondaHalfUp(
    trechos.reduce((soma, trecho) => soma + trecho.distancia_km, 0),
    2,
  );
  const duracao_s = trechos.reduce((soma, trecho) => soma + trecho.duracao_s, 0);

  return {
    geometria: rotaBruta.geometry,
    distancia_km,
    duracao_s,
    trechos,
    pontos_de_rota: [...pontosDeRota],
    nomesViasPorTrecho,
  };
}

/** Total de coordenadas enviadas ao OSRM (paradas + pontos de rota): como
 * nenhum ponto de rota pode ter `apos_parada_ordem == paradas.length` (Spec
 * 02 §10.4), a última parada é sempre a última coordenada da sequência. */
function totalCoordenadas(indicesParadas: readonly number[]): number {
  return indicesParadas[indicesParadas.length - 1] + 1;
}

/**
 * Coleta, para o caminho fallback (§3.6 caminho 2b), a sequência crua de
 * `step.name` (Spec 03 §3.7.4) de todos os legs fundidos entre duas paradas
 * consecutivas — paralelo a `fundirLegsEntreParadas`, mesmo particionamento
 * por `indicesParadas`. Nomes ficam **na ordem de travessia**, sem limpeza
 * (§3.7.5 é do compositor).
 */
function coletarNomesViasPorTrecho(
  legs: readonly LegOsrm[],
  indicesParadas: readonly number[],
): (string | undefined)[][] {
  const nomesViasPorTrecho: (string | undefined)[][] = [];
  for (let i = 0; i < indicesParadas.length - 1; i++) {
    const inicio = indicesParadas[i];
    const fim = indicesParadas[i + 1];
    const nomes: (string | undefined)[] = [];
    for (let legIndice = inicio; legIndice < fim; legIndice++) {
      for (const step of legs[legIndice].steps ?? []) {
        nomes.push(step.name);
      }
    }
    nomesViasPorTrecho.push(nomes);
  }
  return nomesViasPorTrecho;
}

/**
 * Funde os legs do caminho fallback (§3.6 caminho 2b): entre a parada `i` e a
 * parada `i+1`, soma `distance`/`duration` **brutos** (metros/segundos) de
 * todos os legs no intervalo e arredonda **uma vez** (RN-050) — para o
 * resultado ser idêntico ao caminho preferencial (RN-051), nunca se arredonda
 * cada leg componente antes de somar.
 */
function fundirLegsEntreParadas(
  legs: readonly LegOsrm[],
  indicesParadas: readonly number[],
): Trecho[] {
  const trechos: Trecho[] = [];
  for (let i = 0; i < indicesParadas.length - 1; i++) {
    const inicio = indicesParadas[i];
    const fim = indicesParadas[i + 1];
    let distanciaBruta = 0;
    let duracaoBruta = 0;
    for (let legIndice = inicio; legIndice < fim; legIndice++) {
      distanciaBruta += legs[legIndice].distance;
      duracaoBruta += legs[legIndice].duration;
    }
    trechos.push({
      parada_origem_ordem: i + 1,
      parada_destino_ordem: i + 2,
      distancia_km: arredondaHalfUp(distanciaBruta / 1000, 2),
      duracao_s: arredondaHalfUp(duracaoBruta, 0),
    });
  }
  return trechos;
}
