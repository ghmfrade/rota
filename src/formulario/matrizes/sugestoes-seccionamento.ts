import type { Servico } from "@/shared/contrato";
import { chaveParNaoDirecional } from "./calculo-matriz-distancias";

// TASK-027 — os dois algoritmos (fechados) de sugestão de UI para
// `matriz_seccionamento.distancia_km` (Spec 03 §6; RN-060). São cálculo de
// UI: preenchem só o valor INICIAL de uma célula habilitada — o JSON grava
// sempre o valor confirmado/editado pelo usuário (RN-058), nunca a sugestão em
// si. Ambos leem `matriz_distancias` (RN-054/056) já em km, sem conversão de
// unidade (Spec 03 §6.1).

/**
 * "Sugerir menor distância" (Spec 03 §6.2): o MENOR `valor_adotado_de_distancia`
 * do par `{A, B}` entre as `matriz_distancias` de TODOS os Serviços do Autos
 * que atendem as duas Seções — não só o Serviço corrente.
 *
 * O Serviço corrente sempre atende `A` e `B` (senão o par não estaria
 * disponível para habilitar — RN-059), então para um par habilitável o
 * resultado nunca é `undefined`; o caso `undefined` cobre só a situação
 * defensiva de nenhum Serviço do Autos atender o par.
 */
export function sugerirMenorDistancia(
  servicosDoAutos: readonly Servico[],
  secaoAUuid: string,
  secaoBUuid: string,
): number | undefined {
  const chave = chaveParNaoDirecional(secaoAUuid, secaoBUuid);
  const candidatos = servicosDoAutos.flatMap((servico) =>
    servico.matriz_distancias
      .filter(
        (par) => chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid) === chave,
      )
      .map((par) => par.valor_adotado_de_distancia),
  );
  if (candidatos.length === 0) return undefined;
  return Math.min(...candidatos);
}

/**
 * "Sugerir distâncias do serviço" (Spec 03 §6.3): o `valor_adotado_de_distancia`
 * do par `{A, B}` EXCLUSIVAMENTE do Serviço corrente — nunca compara com
 * outros Serviços do Autos, nunca toma o menor.
 */
export function sugerirDistanciaDoServico(
  servico: Servico,
  secaoAUuid: string,
  secaoBUuid: string,
): number | undefined {
  const chave = chaveParNaoDirecional(secaoAUuid, secaoBUuid);
  const par = servico.matriz_distancias.find(
    (p) => chaveParNaoDirecional(p.secao_a_uuid, p.secao_b_uuid) === chave,
  );
  return par?.valor_adotado_de_distancia;
}
