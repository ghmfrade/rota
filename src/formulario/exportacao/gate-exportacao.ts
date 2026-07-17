import type { DocumentoOperacao } from "@/shared/contrato";
import {
  coletarPendencias,
  type ItinerarioAoVivo,
  type Pendencia,
} from "@/formulario/pendencias";
import type { SessaoFormulario } from "@/formulario/sessao";
import { montarDocumentoParaExportacao } from "./montar-documento";
import { validarParaExportacao } from "./exportar-documento";

// Gate de exportação para a etapa Exportação (TASK-032; RN-078; Spec 04
// §11/§14): "Tentativa de exportar com erro bloqueante → Botões de exportação
// desabilitados + painel de pendências em foco" — os botões precisam ficar
// desabilitados ANTES do clique, não só rejeitar depois. Combina as
// pendências vivas de sessão (`coletarPendencias` — rota ausente, descrição
// ausente, matriz desatualizada) com a validação estrutural do schema
// (Spec 02 §14 — Seção/Local incompletos, itinerário sem viagem, 350 m,
// tipificação).
//
// Data-placeholder usada SÓ para satisfazer a checagem cruzada de RN-011
// (status↔data) ao avaliar a validade estrutural ANTES de uma data real ser
// escolhida no clique da ação de exportação (Spec 04 §12; `exportar-documento.ts`
// resolve a data de verdade). Nunca é gravada nem exportada — isola, neste
// gate de PRÉ-habilitação, os erros estruturais reais (§11) do bookkeeping de
// data que só se resolve no clique.
const DATA_PLACEHOLDER_CHECAGEM = "2000-01-01";

function paraChecagemEstrutural(documento: DocumentoOperacao): DocumentoOperacao {
  const autos = { ...documento.autos };
  if (autos.status === "proposta") {
    autos.data_criacao = autos.data_criacao ?? DATA_PLACEHOLDER_CHECAGEM;
    delete autos.data_publicacao;
  } else {
    autos.data_publicacao = autos.data_publicacao ?? DATA_PLACEHOLDER_CHECAGEM;
    delete autos.data_criacao;
  }
  return { ...documento, autos };
}

export interface ResultadoGateExportacao {
  /** `true` quando a exportação está liberada (Spec 04 §11: sem bloqueantes). */
  liberado: boolean;
  /** Pendências bloqueantes ao vivo (rota/descrição/matriz — §11), se houver. */
  pendenciasBloqueantes: Pendencia[];
  /** `true` quando o documento ainda não é montável (modo "novo" sem identidade/Serviço). */
  documentoIncompleto: boolean;
}

/**
 * Avalia o gate de exportação sem escolher ação/data — usado para
 * habilitar/desabilitar os botões da etapa Exportação (Spec 04 §14). O clique
 * real ainda roda a validação completa via `exportarComoProposta`/
 * `exportarComoVigente` (Spec 04 §12.1 item 1); este gate só antecipa o
 * estado dos botões com a mesma fonte de verdade.
 */
export function avaliarGateExportacao(
  sessao: SessaoFormulario,
  itinerariosAoVivo: readonly ItinerarioAoVivo[],
): ResultadoGateExportacao {
  const pendenciasBloqueantes = coletarPendencias(sessao, itinerariosAoVivo).filter(
    (pendencia) => pendencia.severidade === "bloqueante",
  );
  const documento = montarDocumentoParaExportacao(sessao);
  if (!documento) {
    return { liberado: false, pendenciasBloqueantes, documentoIncompleto: true };
  }
  const errosEstruturais = validarParaExportacao(paraChecagemEstrutural(documento));
  return {
    liberado: pendenciasBloqueantes.length === 0 && errosEstruturais.length === 0,
    pendenciasBloqueantes,
    documentoIncompleto: false,
  };
}
