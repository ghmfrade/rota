import type { Ponto } from "@/shared/geo";
import { montarUrlOsrm } from "./url-osrm";
import { extrairRota, type RespostaOsrm } from "./extrair-rota";
import type { FalhaOsrm, ResultadoRoteamento } from "./falhas-osrm";

// Cliente fino sobre a API pública do OSRM (docs-dev/13 — "cliente HTTP fino
// próprio, sem SDK pesado"). Monta a URL (RN-047), chama, e classifica o
// desfecho em sucesso ou falha bloqueante (RN-041/050 no sucesso; RN-048/049 na
// falha).
//
// Política de indisponibilidade (TASK-022; Spec 03 §3.5): sem degradação
// silenciosa nem fallback de linha reta (RN-048, NEG-015). Falha de rede/timeout
// → 1 retry automático; persistindo, `indisponivel`. `NoRoute`/`NoSegment`/
// `code != Ok` → falha semântica **sem retry** (a entrada é que precisa mudar).
// Nenhuma falha produz `rota` — o resultado discriminado devolve `{ ok:false }`.

/** Timeout padrão por tentativa, em ms (decisão da TASK-022). Ajustável por
 * chamada via `timeoutMs`, espelhando a configurabilidade da URL base (DEC-029). */
export const OSRM_TIMEOUT_PADRAO_MS = 15_000;

export interface OpcoesClienteOsrm {
  /** Override da URL base (sobrepõe `NEXT_PUBLIC_OSRM_BASE_URL` e o default). */
  baseUrl?: string;
  /** Implementação de `fetch` a usar — injetável para mock nos testes. */
  fetchFn?: typeof fetch;
  /** Timeout por tentativa em ms (default `OSRM_TIMEOUT_PADRAO_MS`). */
  timeoutMs?: number;
}

/**
 * Solicita ao OSRM a rota para a sequência ordenada de paradas de UM itinerário
 * (Spec 03 §3.1) e devolve um `ResultadoRoteamento` discriminado: `{ ok:true,
 * rota }` com os campos extraídos (§3.3/§3.4), ou `{ ok:false, falha }` com a
 * `FalhaOsrm` bloqueante (§3.5). Sem pontos de rota (TASK-023).
 *
 * Retry: **1** nova tentativa automática só em falha de rede/timeout (§3.5);
 * erros semânticos (`code != "Ok"`) não são re-tentados.
 */
export async function solicitarRota(
  paradas: readonly Ponto[],
  opcoes: OpcoesClienteOsrm = {},
): Promise<ResultadoRoteamento> {
  const {
    baseUrl,
    fetchFn = fetch,
    timeoutMs = OSRM_TIMEOUT_PADRAO_MS,
  } = opcoes;
  const url = montarUrlOsrm(paradas, baseUrl);

  // Falha de rede/timeout é re-tentada 1×; a segunda falha vira `indisponivel`.
  // `buscarEnvelope` lança só nesse tipo de falha (rede/timeout/corpo não-JSON);
  // um envelope OSRM com `code` semântico (inclusive != "Ok") é retornado e
  // classificado sem retry.
  let corpo: RespostaOsrm;
  try {
    corpo = await buscarEnvelope(url, fetchFn, timeoutMs);
  } catch {
    try {
      corpo = await buscarEnvelope(url, fetchFn, timeoutMs);
    } catch {
      return { ok: false, falha: { tipo: "indisponivel" } };
    }
  }

  return classificarEnvelope(corpo, paradas.length);
}

/**
 * Uma tentativa de requisição: aplica timeout via `AbortController` e devolve o
 * envelope OSRM já parseado. Lança em falha de rede, timeout (abort) ou corpo
 * não-JSON — todos tratados como indisponibilidade re-tentável (§3.5 linha 1).
 */
async function buscarEnvelope(
  url: string,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<RespostaOsrm> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const resposta = await fetchFn(url, { signal: controlador.signal });
    return (await resposta.json()) as RespostaOsrm;
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Classifica um envelope OSRM já obtido (Spec 03 §3.5): `Ok` → extrai a rota;
 * `NoRoute`/`NoSegment`/outro → falha bloqueante correspondente, sem retry.
 */
function classificarEnvelope(
  corpo: RespostaOsrm,
  numeroParadas: number,
): ResultadoRoteamento {
  switch (corpo.code) {
    case "Ok":
      return { ok: true, rota: extrairRota(corpo, numeroParadas) };
    case "NoRoute":
      return { ok: false, falha: { tipo: "sem-rota" } };
    case "NoSegment":
      return { ok: false, falha: falhaSemSegmento(corpo) };
    default:
      return { ok: false, falha: { tipo: "codigo-inesperado", code: corpo.code } };
  }
}

/**
 * Monta a falha `sem-segmento` extraindo, **best-effort**, o índice da
 * coordenada rejeitada da `message` do OSRM (ex.: "…for coordinate 2"). O OSRM
 * não expõe esse índice num campo estruturado; quando a mensagem não o traz,
 * `indiceCoordenada` fica `undefined` e a camada superior usa a forma genérica
 * (decisão da TASK-022, Q-019). Sem pontos de rota (TASK-023) o índice da
 * coordenada coincide com o índice da parada.
 */
function falhaSemSegmento(corpo: RespostaOsrm): FalhaOsrm {
  const casado = corpo.message?.match(/coordinate\s+(\d+)/i);
  const indiceCoordenada = casado ? Number(casado[1]) : undefined;
  return { tipo: "sem-segmento", indiceCoordenada };
}
