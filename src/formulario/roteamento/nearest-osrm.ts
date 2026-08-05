import type { Ponto } from "@/shared/geo";
import { urlBaseOsrm } from "./url-osrm";

// Cliente fino sobre o serviço `/nearest` do OSRM (TASK-131; Q-090/DEC-112) —
// devolve o **nome da via** mais próxima de uma coordenada, para sugerir o
// nome de Seção/Local na criação (TASK-130/133). Serviço **distinto** do
// `/route` (`cliente-osrm.ts`, RN-047): a política de falha é **oposta** —
// enquanto a indisponibilidade do `/route` é bloqueante (RN-048), aqui uma
// sugestão que não veio é apenas uma sugestão que não veio. Por isso este
// módulo não importa `cliente-osrm.ts`/`falhas-osrm.ts`: nenhuma FalhaOsrm
// bloqueante nasce daqui, e o `/route` permanece exatamente como está.

/** Timeout próprio, menor que o do `/route` (`OSRM_TIMEOUT_PADRAO_MS` = 15 s):
 * uma sugestão de nome não pode segurar a UI por tanto tempo. */
export const NEAREST_TIMEOUT_PADRAO_MS = 5_000;

export interface OpcoesNearestOsrm {
  /** Override da URL base (sobrepõe `NEXT_PUBLIC_OSRM_BASE_URL` e o default). */
  baseUrl?: string;
  /** Implementação de `fetch` a usar — injetável para mock nos testes. */
  fetchFn?: typeof fetch;
  /** Timeout da tentativa em ms (default `NEAREST_TIMEOUT_PADRAO_MS`). */
  timeoutMs?: number;
}

/**
 * Resultado discriminado de `consultarViaMaisProxima`:
 *
 * - `ok: true` — via encontrada; `via` é sempre uma string não vazia.
 *   `localizacao` é a coordenada **encaixada** na malha viária
 *   (`waypoints[0].location`), lida e devolvida só para uso futuro (Spec 03
 *   §3.6) — nenhum código desta task a consome nem move a coordenada do
 *   usuário com ela.
 * - `ok: false, motivo: "semResposta"` — `code != "Ok"`, sem waypoints, ou
 *   nome ausente/vazio: nunca um nome inventado.
 * - `ok: false, motivo: "rede"` — falha de rede, HTTP != 2xx, corpo não-JSON
 *   ou timeout. **Sem retry** (falha silenciosa é aceitável e barata).
 */
export type ResultadoViaMaisProxima =
  | { ok: true; via: string; distanciaM: number; localizacao?: Ponto }
  | { ok: false; motivo: "rede" | "semResposta" };

interface EnvelopeNearestOsrm {
  code?: string;
  waypoints?: ReadonlyArray<{
    name?: string;
    distance?: number;
    location?: readonly [number, number];
  }>;
}

/**
 * Consulta o OSRM pela via mais próxima de `ponto` (`GET
 * /nearest/v1/driving/{lon},{lat}?number=1`), com a mesma resolução de URL
 * base do `/route` (`urlBaseOsrm`, DEC-029). Nunca lança: toda falha vira
 * `{ ok:false }`, sem retry e sem propagar exceção ao chamador (RN-052 —
 * só é chamada por gesto explícito, nunca ao abrir/renderizar).
 */
export async function consultarViaMaisProxima(
  ponto: Ponto,
  opcoes: OpcoesNearestOsrm = {},
): Promise<ResultadoViaMaisProxima> {
  const {
    baseUrl,
    fetchFn = fetch,
    timeoutMs = NEAREST_TIMEOUT_PADRAO_MS,
  } = opcoes;

  const base = urlBaseOsrm(baseUrl);
  const url = `${base}/nearest/v1/driving/${ponto.longitude},${ponto.latitude}?number=1`;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  let corpo: EnvelopeNearestOsrm;
  try {
    const resposta = await fetchFn(url, { signal: controlador.signal });
    if (!resposta.ok) {
      return { ok: false, motivo: "rede" };
    }
    corpo = (await resposta.json()) as EnvelopeNearestOsrm;
  } catch {
    return { ok: false, motivo: "rede" };
  } finally {
    clearTimeout(temporizador);
  }

  if (corpo.code !== "Ok") {
    return { ok: false, motivo: "semResposta" };
  }
  const waypoint = corpo.waypoints?.[0];
  const via = waypoint?.name?.trim();
  if (!waypoint || !via) {
    return { ok: false, motivo: "semResposta" };
  }
  const localizacao = waypoint.location
    ? { longitude: waypoint.location[0], latitude: waypoint.location[1] }
    : undefined;
  return {
    ok: true,
    via,
    distanciaM: waypoint.distance ?? 0,
    localizacao,
  };
}
