import type { ParadaEmEdicao } from "./motor-montagem";

// Chave de seleção efêmera (TASK-064; Spec 04 §7 — sincronização de seleção
// tabela↔mapa). NÃO é a mesma chave de `chaveParadaEmEdicao` (TASK-066, usada
// para re-ancoragem de pontos de rota): esta reusa literalmente o `id` que
// `EditorMapaItinerario` já atribui a cada `MarcadorMapa` (`secao-${uuid}`,
// `local-${uuid}`, `ponto-rota-${indice}` — RN-042, ponto de rota não tem
// UUID), garantindo por construção que tabela e mapa apontam para o MESMO
// marcador sem duas fontes de verdade. Seleção nunca é persistida (RN-096).

/** Chave de seleção de uma Parada (Seção ou Local) em edição. */
export function chaveSelecaoDaParada(parada: ParadaEmEdicao): string {
  return parada.tipo === "secao" ? `secao-${parada.secaoUuid}` : `local-${parada.localUuid}`;
}

/** Chave de seleção de um ponto de rota pelo seu índice no array
 * (RN-042 — a posição no array é a identidade dentro do gesto). */
export function chaveSelecaoDoPontoDeRota(indice: number): string {
  return `ponto-rota-${indice}`;
}
