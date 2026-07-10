import type { DocumentoOperacao } from "@/shared/contrato";

// Remoção de Serviço com cascata de Seção órfã (RN-018; Spec 04 §6; Spec 02 §14).
// Puro, sem UI, opera sobre um documento carregado (com Seções e Serviços
// completos). Não muta a entrada.
//
// Regra (RN-018): remover um Serviço também remove suas entradas em
// `secao.servicos[]`; se uma Seção ficar sem nenhum Serviço, ela é removida do
// documento (`autos.secoes` exige ≥ 1 entrada por Seção — Spec 02 §14). Como o
// documento deve manter ao menos 1 Serviço (RN-018), remover o último é
// impedido: `podeRemoverServico` guarda o gesto na UI e `removerServico` lança
// como dupla defesa (nunca produzir documento sem Serviço).

/** RN-018: só se pode remover um Serviço se sobrar ao menos um. */
export function podeRemoverServico(documento: DocumentoOperacao): boolean {
  return documento.autos.servicos.length > 1;
}

/**
 * Remove o Serviço `servicoUuid` de `autos.servicos`, tira suas entradas de cada
 * `secao.servicos[]` e descarta as Seções que ficarem órfãs (RN-018). Devolve um
 * documento novo; não muta `documento`. Lança se a remoção deixaria o documento
 * sem Serviço (RN-018).
 */
export function removerServico(
  documento: DocumentoOperacao,
  servicoUuid: string,
): DocumentoOperacao {
  if (!podeRemoverServico(documento)) {
    throw new Error(
      "[RN-018] não é possível remover o último Serviço do Autos (Spec 02 §14)",
    );
  }

  const servicos = documento.autos.servicos.filter(
    (servico) => servico.uuid !== servicoUuid,
  );

  const secoes = documento.autos.secoes
    .map((secao) => ({
      ...secao,
      servicos: secao.servicos.filter(
        (entrada) => entrada.servico_uuid !== servicoUuid,
      ),
    }))
    // Seção sem nenhum Serviço é removida do documento (cascata — RN-018).
    .filter((secao) => secao.servicos.length > 0);

  return {
    ...documento,
    autos: { ...documento.autos, servicos, secoes },
  };
}
