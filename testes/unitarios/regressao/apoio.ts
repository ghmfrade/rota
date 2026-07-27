import type { DocumentoOperacao } from "@/shared/contrato";
import type { ListasAutosEmpresas } from "@/shared/dados-estaticos";

// Oráculos compartilhados da suíte de regressão (TASK-042, categoria 10 da
// docs-dev/08). Ficam locais à suíte para não acoplar a regressão às demais
// (import/export já têm cópias equivalentes) e para mantê-la autossuficiente:
// se um teste de import/export mudar, a rede de segurança da regressão não se
// move junto.

/**
 * Conjunto de TODAS as UUIDs de um documento (Seção, Serviço, Local,
 * TabelaExcepcional e Viagem) — oráculo da preservação de identidade no
 * round-trip (RN-004). A unicidade global (RN-005/RN-098) garante que o
 * conjunto é comparável byte a byte.
 */
export function coletarUuids(doc: DocumentoOperacao): Set<string> {
  const uuids = new Set<string>();
  for (const secao of doc.autos.secoes) uuids.add(secao.uuid);
  for (const servico of doc.autos.servicos) {
    uuids.add(servico.uuid);
    for (const local of servico.locais) uuids.add(local.uuid);
    for (const tabela of servico.tabelas_excepcionais ?? []) {
      uuids.add(tabela.uuid);
    }
    for (const itinerario of servico.itinerarios) {
      for (const viagem of itinerario.viagens) uuids.add(viagem.uuid);
    }
  }
  return uuids;
}

/**
 * Listas estáticas mínimas (DEC-030) que RECONHECEM a identidade do documento —
 * `codigo`, `empresa` (nome) e `tipo` do Autos entram nas listas. Derivadas do
 * próprio documento para o re-import não esbarrar no bloqueio de identidade
 * obsoleta (RN-017): a regressão de UUID não deve depender dos estáticos reais.
 */
export function listasReconhecendo(doc: DocumentoOperacao): ListasAutosEmpresas {
  return {
    versao_schema: "1.0",
    tipos: [{ codigo: doc.autos.tipo, descricao: "Tipo macro." }],
    empresas: [{ id: "empresa-do-doc", nome: doc.autos.empresa }],
    autos: [
      {
        codigo: doc.autos.codigo,
        tc: "01",
        denominacao_linha: "Linha de teste",
        empresa_id: "empresa-do-doc",
        tipo: doc.autos.tipo,
        operante: true,
      },
    ],
  };
}
