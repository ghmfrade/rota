import type { SessaoFormulario } from "@/formulario/sessao";
import type { IdEtapa } from "@/formulario/layout/etapas";

// Painel de pendências vivo (Spec 04 §4/§11): a lista, derivada da sessão de
// edição, de erros bloqueantes × alertas. Aqui está a coleta pura e testável;
// a apresentação é `PainelPendencias` (layout/).
//
// Natureza (NEG-004): estas são pendências de VALIDAÇÃO, efêmeras e de sessão —
// nunca vão para o JSON exportado, nunca persistem, e são recomputadas do
// documento a cada render. Não são pendências de PROCESSO (diálogo técnico ↔
// empresa), que vivem no SEI (RN-095). O ROTA não vira workflow.
//
// Escopo desta task (TASK-014): monta a ESTRUTURA do painel (taxonomia
// bloqueante × alerta, clicabilidade com etapa-alvo — RN-078) e a única
// pendência de §11 conhecível neste ponto do projeto: o alerta "documento
// criado do zero" (§11). As demais pendências de §11 dependem de dados que
// ainda não existem (rota, matrizes, horários) e entram com suas tasks — ver
// os TODOs abaixo. O gate real de exportação contra pendências é a TASK-032.

export type SeveridadePendencia = "bloqueante" | "alerta";

export interface Pendencia {
  /** Identificador estável da pendência (para key de lista e testes). */
  id: string;
  severidade: SeveridadePendencia;
  /** Texto operacional exibido ao usuário (Spec 04 §11/§14). */
  mensagem: string;
  /**
   * Etapa para onde o clique navega (Spec 04 §11: cada item leva à
   * etapa/entidade de origem). Para alertas sem entidade única de origem, o
   * destino é a etapa Revisão (DEC-033).
   */
  etapaAlvo: IdEtapa;
}

/**
 * Coleta as pendências (bloqueantes e alertas) da sessão de edição atual
 * (Spec 04 §11). Função pura e sem efeitos — recomputada a cada render, nada
 * persiste (NEG-004).
 */
export function coletarPendencias(sessao: SessaoFormulario): Pendencia[] {
  const pendencias: Pendencia[] = [];

  // Alerta de §11: "documento criado do zero (sem preservação de identidade
  // para comparação — §3.2)". É o único alerta de §11 conhecível já nesta
  // etapa do projeto — decorre só do modo de entrada, sem depender de rota,
  // matriz ou horários. DEC-033: por não ter entidade única de origem, o
  // clique navega para a etapa Revisão (onde a §11 lista os alertas).
  if (sessao.modo === "novo") {
    pendencias.push({
      id: "documento-criado-do-zero",
      severidade: "alerta",
      mensagem:
        "Documento criado do zero: sem preservação de identidade das entidades para comparação entre versões (o Comparador tratará tudo como novo).",
      etapaAlvo: "revisao",
    });
  }

  // TODO — demais pendências de §11, cada uma com a sua task (fora do escopo
  // da TASK-014; não inventar aqui — docs-dev/04 princípio 2):
  //   bloqueantes: rota ausente/desatualizada (TASK-022/024), descrição
  //   ausente com rota presente (TASK-025), matriz desatualizada (TASK-026),
  //   horários fora de ordem (TASK-029), Seção/Local incompletos e 350 m/
  //   tipificação em revalidação (TASK-015/017/018), itinerário sem viagem
  //   (TASK-028);
  //   alertas: Serviço sem par habilitado na matriz (TASK-027), tabela de
  //   feriados vazia (TASK-030).

  return pendencias;
}
