import type { DocumentoOperacao, Secao, Servico } from "@/shared/contrato";

// Remoção de Serviço com cascata de Seção órfã (RN-018; Spec 04 §6; Spec 02 §14).
// Puro, sem UI. Não muta a entrada.
//
// Regra (RN-018): remover um Serviço também remove suas entradas em
// `secao.servicos[]`; se uma Seção ficar sem nenhum Serviço, ela é removida
// (`autos.secoes`/`secoesEmConstrucao` exige ≥ 1 entrada por Seção — Spec 02
// §14). No documento CARREGADO, RN-018 é também gate de mínimo 1 Serviço:
// `podeRemoverServico` guarda o gesto na UI e `removerServico` lança como dupla
// defesa (nunca produzir documento sem Serviço). No modo NOVO (sessão em
// construção — TASK-072), RN-018 é gate de EXPORTAÇÃO, não de sessão: a lista
// pode ficar vazia durante a construção, então `removerServicoDeLista` — usada
// pelo modo novo — não tem essa trava.

/** RN-018: só se pode remover um Serviço se sobrar ao menos um. */
export function podeRemoverServico(documento: DocumentoOperacao): boolean {
  return documento.autos.servicos.length > 1;
}

/**
 * Remove `servicoUuid` de `servicos`, tira suas entradas de cada
 * `secao.servicos[]` e descarta as Seções que ficarem órfãs (cascata — RN-018).
 * Genérica sobre `Servico[]`/`Secao[]` — usada tanto pelo documento carregado
 * (via `removerServico`, com a trava de mínimo 1) quanto pela sessão do modo
 * novo (`servicos`/`secoesEmConstrucao`, sem trava — RN-018 ali é gate de
 * exportação). Uma Seção só é descartada quando NENHUM Serviço a referencia
 * mais — a condição opera sobre `secao.servicos[]`, que já reflete o uso por
 * Serviço completo ou em construção (TASK-072). Não muta as listas de entrada.
 */
export function removerServicoDeLista(
  servicos: readonly Servico[],
  secoes: readonly Secao[],
  servicoUuid: string,
): { servicos: Servico[]; secoes: Secao[] } {
  const servicosRestantes = servicos.filter((s) => s.uuid !== servicoUuid);

  const secoesRestantes = secoes
    .map((secao) => ({
      ...secao,
      servicos: secao.servicos.filter(
        (entrada) => entrada.servico_uuid !== servicoUuid,
      ),
    }))
    // Seção sem nenhum Serviço é removida (cascata — RN-018).
    .filter((secao) => secao.servicos.length > 0);

  return { servicos: servicosRestantes, secoes: secoesRestantes };
}

/**
 * Remove o Serviço `servicoUuid` de `autos.servicos`, tira suas entradas de cada
 * `secao.servicos[]` e descarta as Seções que ficarem órfãs (RN-018). Devolve um
 * documento novo; não muta `documento`. Lança se a remoção deixaria o documento
 * sem Serviço (RN-018) — trava exclusiva do modo carregado.
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

  const { servicos, secoes } = removerServicoDeLista(
    documento.autos.servicos,
    documento.autos.secoes,
    servicoUuid,
  );

  return {
    ...documento,
    autos: { ...documento.autos, servicos, secoes },
  };
}
