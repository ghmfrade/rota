import type { ParDistancia } from "@/shared/contrato";
import { chaveParNaoDirecional } from "./calculo-matriz-distancias";

// TASK-048 — apresentação SOMENTE-LEITURA da matriz de distâncias na etapa
// Matrizes (Spec 04 §9.1). Deriva as células a partir do `matriz_distancias`
// já congelado do Serviço (RN-054/056; Spec 03 §12 — lê o congelado, nunca
// recalcula nem chama OSRM). É a contraparte read-only da matriz de
// seccionamento editável (TASK-027): ambas reusam a mesma ordenação de
// linhas/colunas (`secoesAtendidas`).

/**
 * Célula habitada da matriz de distâncias read-only (Spec 04 §9.1). `valorAdotado`
 * é o `valor_adotado_de_distancia` exibido por padrão; `ida`/`volta` alimentam o
 * detalhe expansível quando o Serviço é bidirecional. A presença dos dois campos
 * segue exatamente a direcionalidade (RN-056): bidirecional → ambos; unidirecional
 * → exatamente um — logo `bidirecional` é derivado da própria célula congelada, não
 * de uma contagem de itinerarios à parte.
 */
export interface CelulaDistancia {
  valorAdotado: number;
  ida?: number;
  volta?: number;
  bidirecional: boolean;
}

/**
 * Célula do par não-direcional `{secaoAUuid, secaoBUuid}` a partir do
 * `matriz_distancias` congelado (RN-054/056). `undefined` quando o par não tem
 * entrada — a célula fica vazia (não é diagonal nem par ausente inventado). A
 * busca é insensível à ordem de armazenamento (`chaveParNaoDirecional`).
 */
export function celulaDistancia(
  matrizDistancias: readonly ParDistancia[],
  secaoAUuid: string,
  secaoBUuid: string,
): CelulaDistancia | undefined {
  const chaveAlvo = chaveParNaoDirecional(secaoAUuid, secaoBUuid);
  const par = matrizDistancias.find(
    (p) => chaveParNaoDirecional(p.secao_a_uuid, p.secao_b_uuid) === chaveAlvo,
  );
  if (par === undefined) return undefined;
  return {
    valorAdotado: par.valor_adotado_de_distancia,
    ida: par.distancia_trecho_ida,
    volta: par.distancia_trecho_volta,
    bidirecional:
      par.distancia_trecho_ida !== undefined && par.distancia_trecho_volta !== undefined,
  };
}

/** Formata uma distância em km no padrão da Spec 04 §9.1 ("12,40 km"): duas
 * casas, separador decimal pt-BR, sufixo " km". Só distância — nunca R$
 * (RN-013/076). */
export function formatarKm(distanciaKm: number): string {
  const numero = distanciaKm.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${numero} km`;
}
