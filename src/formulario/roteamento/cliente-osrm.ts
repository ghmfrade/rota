import type { Ponto } from "@/shared/geo";
import { montarUrlOsrm } from "./url-osrm";
import { extrairRota, type RespostaOsrm, type ResultadoRotaOsrm } from "./extrair-rota";

// Cliente fino sobre a API pública do OSRM (docs-dev/13 — "cliente HTTP fino
// próprio, sem SDK pesado"). Monta a URL (RN-047), chama e extrai o resultado
// (RN-041/050).
//
// Fronteira com a TASK-022: a guarda abaixo (`code !== "Ok"`) é só o mínimo
// para não devolver um resultado inválido — lança um erro genérico, SEM
// retry e SEM diferenciar `NoRoute`/`NoSegment`/falha de rede. A política
// completa de indisponibilidade (RN-048/049: 1 retry em falha de rede,
// mensagens específicas por código, bloqueio de exportação) é escopo da
// TASK-022 e substituirá esta guarda.

export interface OpcoesClienteOsrm {
  /** Override da URL base (sobrepõe `NEXT_PUBLIC_OSRM_BASE_URL` e o default). */
  baseUrl?: string;
  /** Implementação de `fetch` a usar — injetável para mock nos testes. */
  fetchFn?: typeof fetch;
}

/**
 * Solicita ao OSRM a rota para a sequência ordenada de paradas de UM
 * itinerário (Spec 03 §3.1) e devolve o resultado já extraído (§3.3/§3.4).
 * Sem pontos de rota (TASK-023) e sem tratamento de falha além da guarda
 * mínima de `code` (TASK-022).
 */
export async function solicitarRota(
  paradas: readonly Ponto[],
  opcoes: OpcoesClienteOsrm = {},
): Promise<ResultadoRotaOsrm> {
  const { baseUrl, fetchFn = fetch } = opcoes;
  const url = montarUrlOsrm(paradas, baseUrl);
  const resposta = await fetchFn(url);
  const corpo = (await resposta.json()) as RespostaOsrm;

  if (corpo.code !== "Ok") {
    throw new Error(
      `[Spec 03 §3.5] OSRM retornou code "${corpo.code}" — tratamento ` +
        "completo de indisponibilidade/erro (retry, mensagens específicas " +
        "por código, RN-048/049) é escopo da TASK-022.",
    );
  }

  return extrairRota(corpo, paradas.length);
}
