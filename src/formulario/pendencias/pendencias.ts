import type { SessaoFormulario } from "@/formulario/sessao";
import type { IdEtapa } from "@/formulario/layout/etapas";
import type { EstadoRotaViva } from "@/formulario/roteamento";
import { matrizDistanciasDesatualizada } from "@/formulario/matrizes";
import type { DescricaoItinerario, Itinerario } from "@/shared/contrato";

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

/**
 * Mínimo estrutural de `descricao_itinerario` válida (RN-044, Spec 02 §10.5):
 * `texto` não vazio e ao menos dois itens `tipo:"secao"`. Checagem propositalmente
 * enxuta (não repete toda a validação estrutural de `validacoes-estruturais.ts`,
 * que exige o próprio itinerário para checar ordem/extremos) — suficiente para
 * decidir a pendência "descrição ausente/inválida" de §7.4/§11.
 */
function descricaoValida(descricao: DescricaoItinerario): boolean {
  if (descricao.texto.trim().length === 0) return false;
  const itensSecao = descricao.itens.filter((item) => item.tipo === "secao");
  return itensSecao.length >= 2;
}

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

  // Bloqueantes de §11/§14 por itinerário: "sem rota válida" (RN-048/078,
  // TASK-044/DEC-040) e "descrição ausente/inválida havendo rota" (RN-044/046/
  // 078, TASK-025, Spec 04 §7.4/§11/§14). Autoria desta segunda pendência:
  // a entrada viva é desta task; o gate de exportação que a consolida é a
  // TASK-032 (mesmo recorte já usado para a pendência de rota).
  for (const itinerario of itinerariosAoVivo) {
    const rotuloSentido = ROTULO_SENTIDO[itinerario.sentido];

    if (itinerario.estadoRota.situacao === "sem-rota") {
      pendencias.push({
        id: `rota-ausente-${itinerario.numeroN}-${itinerario.sentido}`,
        severidade: "bloqueante",
        mensagem: `O itinerário de ${rotuloSentido} do Serviço ${itinerario.numeroN} está sem rota calculada. Recalcule antes de exportar.`,
        etapaAlvo: "secoes-locais-itinerarios",
      });
      continue;
    }

    if (!descricaoValida(itinerario.estadoRota.rota.descricao_itinerario)) {
      pendencias.push({
        id: `descricao-ausente-${itinerario.numeroN}-${itinerario.sentido}`,
        severidade: "bloqueante",
        mensagem: `O itinerário de ${rotuloSentido} do Serviço ${itinerario.numeroN} está sem a descrição textual por vias. Recalcule a descrição antes de exportar.`,
        etapaAlvo: "secoes-locais-itinerarios",
      });
    }
  }

  // Bloqueante de §11: "matriz de distâncias desatualizada" (RN-054..057/078,
  // TASK-026, Spec 04 §9.1/§11). Só se aplica a Serviços COMPLETOS do
  // documento carregado — um `ServicoEmConstrucao` (modo novo/em construção)
  // ainda não tem `matriz_distancias` (DEC-035; matriz só nasce nas etapas
  // seguintes), então não há "desatualização" a checar nele. Recomputa a
  // partir das rotas atuais do próprio Serviço (`matrizDistanciasDesatualizada`,
  // intra-Serviço — RN-054) e compara com o array gravado; a reconciliação
  // automática ao concluir a edição do itinerário (TASK-019/026) normalmente
  // já mantém os dois em sincronia — esta pendência cobre o resíduo.
  if (sessao.modo === "carregado") {
    for (const servico of sessao.documento.autos.servicos) {
      if (matrizDistanciasDesatualizada(servico)) {
        pendencias.push({
          id: `matriz-desatualizada-${servico.numero_n}`,
          severidade: "bloqueante",
          mensagem:
            "O itinerário mudou depois do último cálculo. A matriz de distâncias será recalculada.",
          etapaAlvo: "matrizes",
        });
      }
    }
  }

  // TODO — demais pendências de §11, cada uma com a sua task (fora do escopo
  // desta implementação; não inventar aqui — docs-dev/04 princípio 2):
  //   bloqueantes: rota desatualizada/pendente de recálculo (TASK-032, gate),
  //   horários fora de ordem (TASK-029), Seção/Local incompletos e 350 m/
  //   tipificação em revalidação (TASK-015/017/018), itinerário sem viagem
  //   (TASK-028);
  //   alertas: Serviço sem par habilitado na matriz (TASK-027), tabela de
  //   feriados vazia (TASK-030).

  return pendencias;
}
