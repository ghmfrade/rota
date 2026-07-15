import type { HorarioParada, Parada, Trecho } from "@/shared/contrato";
import { formatarHms } from "./horario-relogio";

// Redistribuição proporcional dos offsets de uma Viagem ao editar o horário de
// uma parada a jusante (Spec 03 §8.2; RN-065). Cálculo PURO — recebe o conjunto
// de âncoras (paradas cujo offset o usuário fixou manualmente) como parâmetro,
// sem tocar UI nem sessão (o ciclo de vida das âncoras é DEC-049: estado
// efêmero da sessão do Formulário, nunca gravado no JSON — RN-010/NEG-011).
//
// "Âncora" = parada com offset fixado; "derivada" = parada reinterpolada. A
// primeira parada (offset 00:00:00) é SEMPRE âncora (Spec 03 §8.2). Todos os
// offsets são calculados em segundos e formatados com `formatarHms` no fim,
// preservando a monotonicidade que a RN-063 exige.

/**
 * Offsets de baseline `B_k` em segundos, por `parada.ordem` — o acúmulo de
 * `trecho.duracao_s` da Spec 03 §8.1, base da interpolação (§8.2). Mesma
 * semântica de `sugerirOffsetsIniciais`, mas em segundos crus para o cálculo.
 */
export function baselineSegundos(
  paradas: readonly Parada[],
  trechos: readonly Trecho[],
): Map<number, number> {
  const paradasOrdenadas = [...paradas].sort((a, b) => a.ordem - b.ordem);
  const trechoPorOrigem = new Map(
    trechos.map((trecho) => [trecho.parada_origem_ordem, trecho]),
  );

  const baseline = new Map<number, number>();
  let acumulado = 0;
  paradasOrdenadas.forEach((parada, indice) => {
    if (indice > 0) {
      const anterior = paradasOrdenadas[indice - 1];
      acumulado += trechoPorOrigem.get(anterior.ordem)?.duracao_s ?? 0;
    }
    baseline.set(parada.ordem, acumulado);
  });
  return baseline;
}

/**
 * Recalcula TODOS os `horarios_paradas` de uma Viagem a partir do conjunto de
 * âncoras `ancoras` (mapa `parada.ordem → offset em segundos`, já incluindo a
 * primeira parada em 0), aplicando a Spec 03 §8.2:
 *
 * - **entre duas âncoras** `i < k < j`: interpolação proporcional ao baseline
 *   (`offset(k) = off(i) + (off(j) − off(i))·(B_k − B_i)/(B_j − B_i)`); se o
 *   baseline for degenerado (`B_j − B_i = 0`), distribuição **uniforme** pelas
 *   derivadas entre `i` e `j`;
 * - **tail após a última âncora** (sem âncora adiante): mantém as durações de
 *   baseline apeadas à última âncora (`offset(k) = off(última) + (B_k − B_última)`).
 *
 * Os offsets saem não decrescentes (RN-063) porque o baseline é monotônico e as
 * âncoras respeitam a ordem (garantido por `offsetForaDeOrdem` na entrada).
 */
export function recomputarOffsetsComAncoras(
  paradas: readonly Parada[],
  trechos: readonly Trecho[],
  ancoras: ReadonlyMap<number, number>,
): HorarioParada[] {
  const paradasOrdenadas = [...paradas].sort((a, b) => a.ordem - b.ordem);
  const baseline = baselineSegundos(paradas, trechos);
  const ordensAncora = [...ancoras.keys()].sort((a, b) => a - b);

  return paradasOrdenadas.map((parada) => {
    const ordem = parada.ordem;
    const offsetAncora = ancoras.get(ordem);
    if (offsetAncora !== undefined) {
      return { parada_ordem: ordem, offset_horario: formatarHms(offsetAncora) };
    }

    // A primeira parada é sempre âncora, logo `ordemAnterior` sempre existe.
    const ordemAnterior = ultimoMenor(ordensAncora, ordem)!;
    const ordemProxima = primeiroMaior(ordensAncora, ordem);
    const offI = ancoras.get(ordemAnterior)!;
    const bI = baseline.get(ordemAnterior)!;
    const bK = baseline.get(ordem)!;

    if (ordemProxima === undefined) {
      // Tail: baseline apeado à última âncora.
      return { parada_ordem: ordem, offset_horario: formatarHms(offI + (bK - bI)) };
    }

    const offJ = ancoras.get(ordemProxima)!;
    const bJ = baseline.get(ordemProxima)!;

    if (bJ - bI > 0) {
      const offset = offI + (offJ - offI) * ((bK - bI) / (bJ - bI));
      return { parada_ordem: ordem, offset_horario: formatarHms(offset) };
    }

    // Baseline degenerado (durações nulas entre as âncoras): distribui
    // uniformemente as derivadas entre offI e offJ, pela posição ordinal.
    const derivadas = paradasOrdenadas.filter(
      (p) => p.ordem > ordemAnterior && p.ordem < ordemProxima,
    );
    const posicao = derivadas.findIndex((p) => p.ordem === ordem) + 1;
    const offset = offI + ((offJ - offI) * posicao) / (derivadas.length + 1);
    return { parada_ordem: ordem, offset_horario: formatarHms(offset) };
  });
}

/**
 * A âncora que se quer fixar em `paradaOrdem` com `novoOffsetSeg` viola a
 * monotonicidade (Spec 03 §8.2/RN-063)? Ela deve ficar entre a âncora anterior
 * e a próxima já fixadas — a UI recusa fora disso (Spec 04 §8.2). `ancoras` é o
 * conjunto atual (sem `paradaOrdem`).
 */
export function offsetForaDeOrdem(
  ancoras: ReadonlyMap<number, number>,
  paradaOrdem: number,
  novoOffsetSeg: number,
): boolean {
  const ordens = [...ancoras.keys()].sort((a, b) => a - b);
  const ordemAnterior = ultimoMenor(ordens, paradaOrdem);
  const ordemProxima = primeiroMaior(ordens, paradaOrdem);

  if (ordemAnterior !== undefined && novoOffsetSeg < ancoras.get(ordemAnterior)!) {
    return true;
  }
  if (ordemProxima !== undefined && novoOffsetSeg > ancoras.get(ordemProxima)!) {
    return true;
  }
  return false;
}

/** Maior elemento de `ordens` (ordenado asc) estritamente menor que `alvo`. */
function ultimoMenor(ordens: readonly number[], alvo: number): number | undefined {
  let resultado: number | undefined;
  for (const ordem of ordens) {
    if (ordem < alvo) resultado = ordem;
    else break;
  }
  return resultado;
}

/** Menor elemento de `ordens` (ordenado asc) estritamente maior que `alvo`. */
function primeiroMaior(ordens: readonly number[], alvo: number): number | undefined {
  return ordens.find((ordem) => ordem > alvo);
}
