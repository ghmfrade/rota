import type { Secao, Servico } from "@/shared/contrato";

// Limpeza de `secao.servicos[]` após edição de paradas (TASK-084; RN-018;
// Spec 02 §5.1/§14; Spec 04 §6). Análogo POR-PARADA da cascata de órfã que
// `removerServicoDeLista` (src/formulario/servicos/remover.ts) já faz
// POR-SERVIÇO: em vez de remover o Serviço inteiro, aqui o Serviço continua
// existindo, mas pode ter deixado de referenciar alguma Seção em TODOS os
// seus itinerários (Ida e Volta — RN-030) depois de um gesto de remoção de
// parada na tabela lateral. Puro, sem UI; não muta a entrada.

/**
 * Remove de `secoes` a contribuição de `servicoUuid` para toda Seção que
 * `servico` (já com as paradas atualizadas) não referencia mais em NENHUM
 * itinerário, e descarta a Seção que ficar sem nenhuma entrada (cascata —
 * RN-018). Seção ainda referenciada por outro sentido do mesmo Serviço, ou
 * por outro Serviço, não é tocada (RN-030, RN-025).
 */
export function limparSecoesAposEdicaoDeParadas(
  secoes: readonly Secao[],
  servico: Servico,
): Secao[] {
  const secaoUuidsReferenciadas = new Set(
    servico.itinerarios.flatMap((itinerario) =>
      itinerario.paradas
        .map((parada) => parada.secao_uuid)
        .filter((uuid): uuid is string => uuid !== undefined),
    ),
  );

  return secoes
    .map((secao) => {
      if (secaoUuidsReferenciadas.has(secao.uuid)) return secao;
      return {
        ...secao,
        servicos: secao.servicos.filter(
          (entrada) => entrada.servico_uuid !== servico.uuid,
        ),
      };
    })
    .filter((secao) => secao.servicos.length > 0);
}
