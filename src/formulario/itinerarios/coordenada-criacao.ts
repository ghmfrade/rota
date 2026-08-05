// Parsing e validação puros da latitude/longitude editáveis da linha-formulário
// de criação inline (TASK-132; DEC-112 item 5). Sem `fetch`, sem `Date`, sem
// `Math.random` — mesma entrada sempre produz a mesma saída.

import type { Coordenada } from "@/shared/mapa";

const CASAS_DECIMAIS_EXIBICAO = 6;

const MENSAGEM_COORDENADA_INVALIDA =
  "Latitude e longitude devem ser números válidos (latitude entre -90 e 90, longitude entre -180 e 180).";

/** Pré-preenchimento dos campos com a coordenada do clique, 6 casas decimais. */
export function formatarCoordenada(valor: number): string {
  return valor.toFixed(CASAS_DECIMAIS_EXIBICAO);
}

type ResultadoEixo = { ok: true; valor: number } | { ok: false };

// Aceita `,` OU `.` como separador decimal (nunca os dois, nunca dois do
// mesmo) — inferência controlada da "Análise da Task" da TASK-132: usuário
// pt-BR digita/cola coordenada com vírgula. Sem separador de milhar, sem
// notação científica, sem espaço interno.
const FORMATO_NUMERO = /^-?\d+([.,]\d+)?$/;

function interpretarEixo(texto: string, minimo: number, maximo: number): ResultadoEixo {
  const aparado = texto.trim();
  if (!aparado || !FORMATO_NUMERO.test(aparado)) return { ok: false };
  const valor = Number(aparado.replace(",", "."));
  if (!Number.isFinite(valor) || valor < minimo || valor > maximo) return { ok: false };
  return { ok: true, valor };
}

/** Latitude válida: número finito em [-90, 90], aceitando vírgula decimal. */
export function interpretarLatitude(texto: string): ResultadoEixo {
  return interpretarEixo(texto, -90, 90);
}

/** Longitude válida: número finito em [-180, 180], aceitando vírgula decimal. */
export function interpretarLongitude(texto: string): ResultadoEixo {
  return interpretarEixo(texto, -180, 180);
}

export type ResultadoParDeCoordenadas =
  | { ok: true; posicao: Coordenada }
  | { ok: false; mensagem: string };

/** Interpreta o par de campos em uma `Coordenada` (`shared/mapa`) ou recusa
 * com a mensagem de erro exibida em `mensagem-recusa-criacao-inline`. */
export function interpretarParDeCoordenadas(
  latitudeTexto: string,
  longitudeTexto: string,
): ResultadoParDeCoordenadas {
  const latitude = interpretarLatitude(latitudeTexto);
  const longitude = interpretarLongitude(longitudeTexto);
  if (!latitude.ok || !longitude.ok) {
    return { ok: false, mensagem: MENSAGEM_COORDENADA_INVALIDA };
  }
  return { ok: true, posicao: { lat: latitude.valor, lng: longitude.valor } };
}
