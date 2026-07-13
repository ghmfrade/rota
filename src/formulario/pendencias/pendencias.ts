import type { SessaoFormulario } from "@/formulario/sessao";
import type { IdEtapa } from "@/formulario/layout/etapas";
import type { EstadoRotaViva } from "@/formulario/roteamento";
import type { Itinerario } from "@/shared/contrato";

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

/**
 * Identidade + estado ao vivo de UM itinerário em edição (TASK-044; DEC-040/
 * 041), o insumo que `coletarPendencias` precisa para emitir a pendência
 * bloqueante de rota. `EstadoRotaViva` (TASK-024) não carrega identidade —
 * a costura entre o estado por itinerário e essa identidade é das TASK-017/
 * 018/019 (dona do estado por itinerário, `docs-dev/06` nota "Obrigação de
 * fiação"); esta task não antecipa esse fio, só o consome.
 */
export interface ItinerarioAoVivo {
  numeroN: string;
  sentido: Itinerario["sentido"];
  estadoRota: EstadoRotaViva;
}

const ROTULO_SENTIDO: Record<Itinerario["sentido"], string> = {
  ida: "Ida",
  volta: "Volta",
};

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
 *
 * `itinerariosAoVivo` (TASK-044; default `[]`) é o estado de rota ao vivo por
 * itinerário (TASK-024) já identificado por Serviço/sentido — quem monta e
 * passa essa lista é a TASK-019 (dona do estado por itinerário, ver
 * `docs-dev/06` nota "Obrigação de fiação"); enquanto os editores de mapa não
 * existirem, a lista fica vazia e nenhuma pendência de rota é emitida.
 */
export function coletarPendencias(
  sessao: SessaoFormulario,
  itinerariosAoVivo: readonly ItinerarioAoVivo[] = [],
): Pendencia[] {
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

  // Bloqueante de §11/§14: "itinerário sem rota válida" (RN-048/078). Origem:
  // taxonomia de falha e mensagens da TASK-022 (Spec 04 §14; RN-049), estado
  // ao vivo `sem-rota` da TASK-024 (DEC-041). Autoria desta pendência: a
  // entrada viva é a TASK-044 (DEC-040); o gate de exportação que a consolida
  // é a TASK-032.
  for (const itinerario of itinerariosAoVivo) {
    if (itinerario.estadoRota.situacao !== "sem-rota") {
      continue;
    }
    const rotuloSentido = ROTULO_SENTIDO[itinerario.sentido];
    pendencias.push({
      id: `rota-ausente-${itinerario.numeroN}-${itinerario.sentido}`,
      severidade: "bloqueante",
      mensagem: `O itinerário de ${rotuloSentido} do Serviço ${itinerario.numeroN} está sem rota calculada. Recalcule antes de exportar.`,
      etapaAlvo: "secoes-locais-itinerarios",
    });
  }

  // TODO — demais pendências de §11, cada uma com a sua task (fora do escopo
  // desta implementação; não inventar aqui — docs-dev/04 princípio 2):
  //   bloqueantes: rota desatualizada/pendente de recálculo (TASK-032, gate),
  //   descrição ausente com rota presente (TASK-025), matriz desatualizada
  //   (TASK-026), horários fora de ordem (TASK-029), Seção/Local incompletos e
  //   350 m/tipificação em revalidação (TASK-015/017/018), itinerário sem
  //   viagem (TASK-028);
  //   alertas: Serviço sem par habilitado na matriz (TASK-027), tabela de
  //   feriados vazia (TASK-030).

  return pendencias;
}
