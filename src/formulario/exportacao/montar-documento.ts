import { VERSAO_SCHEMA_ATUAL, type DocumentoOperacao } from "@/shared/contrato";
import {
  identidadeDaSessao,
  secoesDaSessao,
  servicosDaSessao,
  type SessaoFormulario,
} from "@/formulario/sessao";

// Montagem do `DocumentoOperacao` final para a exportação (TASK-032; Spec 04
// §12). No modo "carregado" o documento já existe e é reaproveitado tal como
// está (`sessao.documento`, mantido em dia por `comServicosDaSessao`). No modo
// "novo" (DEC-035/053) não há `documento.autos` em memória — a identidade
// (`sessao.identidade`), as Seções (`secoesEmConstrucao`) e os Serviços
// PROMOVIDOS (`sessao.servicos`) precisam ser reunidos num `Autos` (Spec 02
// §4) pela primeira vez.
//
// RN-004 (regra crítica nº 1): esta função NÃO passa pelas fábricas e NÃO
// regenera UUID — Seções/Serviços já carregam as UUIDs geradas nas etapas
// anteriores (identificação/serviços/itinerários), só são reunidas aqui.
// Função pura, não muta a entrada.
//
// Datas (`data_criacao`/`data_publicacao`) e status final ficam FORA desta
// montagem — são resolvidos pelas próprias `exportarComoProposta`/
// `exportarComoVigente` (Spec 04 §12.1/§12.2, RN-011) no momento da ação. Aqui
// o documento nasce sem nenhuma das duas datas (o modo "carregado" preserva
// as que já tinha; o modo "novo" ainda não tem nenhuma).

/**
 * Monta o `DocumentoOperacao` final a exportar, ou `null` quando o modo
 * "novo" ainda não tem o mínimo montável (identidade escolhida e ao menos 1
 * Serviço PROMOVIDO — RN-018, Spec 02 §14). `null` é tratado como bloqueio
 * pelo gate de exportação (RN-078): não há "documento" ainda, então não há o
 * que exportar.
 */
export function montarDocumentoParaExportacao(
  sessao: SessaoFormulario,
): DocumentoOperacao | null {
  if (sessao.modo === "carregado") return sessao.documento;

  const identidade = identidadeDaSessao(sessao);
  const servicos = servicosDaSessao(sessao);
  if (!identidade || servicos.length === 0) return null;

  return {
    versao_schema: VERSAO_SCHEMA_ATUAL,
    autos: {
      codigo: identidade.codigo,
      tipo: identidade.tipo,
      empresa: identidade.empresa,
      status: identidade.status,
      secoes: secoesDaSessao(sessao),
      servicos,
    },
  };
}
