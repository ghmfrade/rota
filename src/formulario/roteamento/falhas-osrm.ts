import type { ResultadoRotaOsrm } from "./extrair-rota";

// Taxonomia de falha do roteamento OSRM (TASK-022; Spec 03 §3.5; Spec 04 §14;
// RN-048/049). O roteamento **alimenta a tarifa**, então não há degradação
// silenciosa nem fallback de linha reta (RN-048, NEG-015): toda falha vira um
// estado bloqueante tipado, sem `rota` produzida.
//
// Fronteira de camada: esta camada fala com o OSRM e só conhece **coordenadas**
// (a sequência de paradas em `lon,lat` — RN-047), não a identidade das paradas
// (`Cidade - Nome`, que é Seção/Local). Por isso as mensagens aqui são as que o
// cliente CONSEGUE produzir; a composição do rótulo `[Cidade - Nome]` do
// `NoSegment` (Spec 04 §14) fica na camada com identidade (pendências/UI), que
// consome `indiceCoordenada` — decisão da análise da TASK-022 (Q-019, opção 1).

/**
 * Falha bloqueante de roteamento (Spec 03 §3.5). Discriminada por `tipo`:
 *
 * - `indisponivel` — falha de rede/timeout após o retry único (§3.5 linha 1).
 * - `sem-rota` — `code == "NoRoute"`: não há caminho viário entre as paradas na
 *   ordem dada (§3.5 linha 2).
 * - `sem-segmento` — `code == "NoSegment"`: uma coordenada não pôde ser ancorada
 *   à malha viária (§3.5 linha 3). `indiceCoordenada` (0-based) aponta a
 *   coordenada rejeitada **quando o OSRM a informa** (best-effort); sem pontos de
 *   rota (TASK-023) ela coincide com o índice da parada.
 * - `codigo-inesperado` — qualquer outro `code != "Ok"` (§3.5 linha 4); carrega
 *   o `code` para a mensagem genérica.
 */
export type FalhaOsrm =
  | { tipo: "indisponivel" }
  | { tipo: "sem-rota" }
  | { tipo: "sem-segmento"; indiceCoordenada?: number }
  | { tipo: "codigo-inesperado"; code: string };

/**
 * Resultado de `solicitarRota`: ou a `rota` extraída com sucesso, ou uma
 * `FalhaOsrm` bloqueante. Falhas de OSRM são estados **esperados** (bloqueio
 * operacional, não exceção de programação), por isso um resultado discriminado
 * — a UI/pendências mapeia `falha` para a mensagem de §14 sem `try/catch`.
 */
export type ResultadoRoteamento =
  | { ok: true; rota: ResultadoRotaOsrm }
  | { ok: false; falha: FalhaOsrm };

/**
 * Mensagem operacional (Spec 04 §14; Spec 03 §3.5) de uma `FalhaOsrm`, no texto
 * que o cliente consegue produzir sem identidade das paradas. **Nunca menciona
 * tarifa** (RN-049): "a distância roteada alimenta a tarifa" é o *motivo* do
 * bloqueio, não o texto exibido — a mensagem fala só do serviço de rotas.
 *
 * Para `sem-segmento`, quando `indiceCoordenada` está presente a mensagem cita a
 * parada pelo número (1-based); sem ele, a forma genérica. O rótulo definitivo
 * `[Cidade - Nome]` de §14 é composto na camada com identidade (Q-019).
 */
export function mensagemDeFalha(falha: FalhaOsrm): string {
  switch (falha.tipo) {
    case "indisponivel":
      return "Serviço de cálculo de rotas temporariamente indisponível — tente novamente em instantes.";
    case "sem-rota":
      return "Não há caminho viário entre as paradas na ordem definida. Revise a ordem ou as posições.";
    case "sem-segmento":
      return falha.indiceCoordenada !== undefined
        ? `A parada nº ${falha.indiceCoordenada + 1} não pôde ser associada a uma via. Arraste o ponto para mais perto de uma rua.`
        : "Uma das paradas não pôde ser associada a uma via. Arraste o ponto para mais perto de uma rua.";
    case "codigo-inesperado":
      return `Não foi possível calcular a rota: o serviço de roteamento retornou uma condição inesperada ("${falha.code}"). Revise o itinerário e tente novamente.`;
  }
}
