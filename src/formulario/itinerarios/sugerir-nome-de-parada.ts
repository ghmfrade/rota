// Orquestração pura da sugestão de nome de Seção/Local na criação (TASK-133;
// Q-090/DEC-112): compõe o `/nearest` (`consultarViaMaisProxima`, TASK-131)
// com a abreviação (`abreviarNomeDeVia`, TASK-130). Sem estado React, sem
// `Date`/`Math.random` — a mesma entrada sempre produz a mesma saída; quem
// decide sobrescrever ou não o campo, e quem descarta resposta obsoleta, é a
// UI (`etapa-itinerarios.tsx`), não este módulo.

import type { Ponto } from "@/shared/geo";
import { abreviarNomeDeVia } from "@/formulario/nomeacao";
import { consultarViaMaisProxima, type OpcoesNearestOsrm } from "@/formulario/roteamento";

export type ResultadoSugestaoNome =
  | { ok: true; nome: string }
  | { ok: false; motivo: "rede" | "semResposta" };

/**
 * Consulta a via mais próxima de `ponto` e devolve o nome já abreviado ao
 * alvo padrão de 25 caracteres (DEC-112 §4). Falha do `/nearest` (rede ou
 * ausência de via) é repassada tal qual — nunca bloqueante (DEC-112 §3).
 */
export async function sugerirNomeDeParada(
  ponto: Ponto,
  opcoes: OpcoesNearestOsrm = {},
): Promise<ResultadoSugestaoNome> {
  const resultado = await consultarViaMaisProxima(ponto, opcoes);
  if (!resultado.ok) {
    return resultado;
  }
  return { ok: true, nome: abreviarNomeDeVia(resultado.via) };
}
