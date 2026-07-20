import type { ParDistancia, ParSecao } from "@/shared/contrato";
import { chaveParNaoDirecional } from "./calculo-matriz-distancias";

// TASK-088 — mantém `matriz_seccionamento` íntegra quando uma edição do
// itinerário recompõe `matriz_distancias` (Spec 02 §8/§9/§14; RN-058/059).

/**
 * Remove somente os pares de `matriz_seccionamento` que deixaram de existir
 * na nova `matriz_distancias` do Serviço. A comparação é não-direcional
 * (`{a,b} == {b,a}` — RN-059) e os objetos sobreviventes são preservados como
 * estão: mesma ordem, orientação armazenada e `distancia_km` confirmado pelo
 * usuário (RN-058). Pares novos da matriz computada nunca são habilitados.
 */
export function reconciliarMatrizSeccionamento(
  matrizSeccionamento: readonly ParSecao[],
  matrizDistancias: readonly ParDistancia[],
): ParSecao[] {
  const paresValidos = new Set(
    matrizDistancias.map((par) =>
      chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid),
    ),
  );

  return matrizSeccionamento.filter((par) =>
    paresValidos.has(chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid)),
  );
}
