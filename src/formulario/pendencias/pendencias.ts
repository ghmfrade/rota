import {
  servicosDaSessao,
  servicosEmConstrucaoDaSessao,
  type SessaoFormulario,
} from "@/formulario/sessao";
import { ocorrenciasLocaisEmExtremo } from "@/formulario/itinerarios/motor-montagem";
import type { IdEtapa } from "@/formulario/layout/etapas";
import type { EstadoRotaViva } from "@/formulario/roteamento";
import { matrizDistanciasDesatualizada } from "@/formulario/matrizes";
import {
  detectarPartidasCoincidentes,
  type OrigemPartidasCoincidentes,
} from "@/formulario/viagens";
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

/** Rótulo de exibição por sentido (Spec 04 §7.4/§11) — reusado pela Revisão
 * (TASK-032) para o título de cada bloco de descrição textual. */
export const ROTULO_SENTIDO: Record<Itinerario["sentido"], string> = {
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
  /** Quantidade exibida em Selo associado ao item (DEC-097/TASK-119). */
  quantidade?: number;
  /**
   * Origem detalhada de uma coincidência na etapa Viagens. Efêmera e derivada
   * do documento; nunca integra o contrato JSON (NEG-004).
   */
  origemPartidasCoincidentes?: OrigemPartidasCoincidentes;
  /**
   * Trilha técnica para DEV (TASK-086): RN + caminho JSON + mensagem crua do
   * schema. Opcional — só os erros estruturais do gate de exportação a
   * preenchem hoje; nunca exibida como texto, só em atributo/log (Spec 04
   * §14 — a `mensagem` acima é o que o usuário vê).
   */
  diagnostico?: string;
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

  // RN-035/DEC-070: a lista em edição pode estar temporariamente inválida
  // enquanto o documento/última rota válida permanece congelado. A pendência
  // nasce diretamente desse estado efêmero e nunca é persistida no JSON
  // (NEG-004); assim o gate não é enganado pelo documento anterior válido.
  const numerosPorUuid = new Map([
    ...servicosDaSessao(sessao).map((servico) => [servico.uuid, servico.numero_n] as const),
    ...servicosEmConstrucaoDaSessao(sessao).map(
      (servico) => [servico.uuid, servico.numero_n] as const,
    ),
  ]);
  for (const [chave, paradas] of Object.entries(sessao.paradasEmEdicao ?? {})) {
    const sentido = chave.endsWith("-volta") ? "volta" : "ida";
    const sufixo = `-${sentido}`;
    const servicoUuid = chave.slice(0, -sufixo.length);
    const numeroN = numerosPorUuid.get(servicoUuid) ?? "não identificado";
    const rotuloSentido = ROTULO_SENTIDO[sentido];

    for (const ocorrencia of ocorrenciasLocaisEmExtremo(paradas)) {
      const posicao =
        ocorrencia.posicoes.length === 2
          ? "a primeira e a última Parada"
          : ocorrencia.posicoes[0] === "inicio"
            ? "a primeira Parada"
            : "a última Parada";
      pendencias.push({
        id: `local-extremo-${chave}-${ocorrencia.indice}`,
        severidade: "bloqueante",
        mensagem: `O itinerário de ${rotuloSentido} do Serviço ${numeroN} tem um Local ocupando ${posicao}. Locais só podem ocupar posições intermediárias; os extremos devem ser Seções.`,
        etapaAlvo: "secoes-locais-itinerarios",
      });
    }
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
  // TASK-026, Spec 04 §9.1/§11). Só se aplica a Serviços COMPLETOS
  // (`servicosDaSessao` — documento carregado E promovidos no novo, DEC-053/
  // TASK-061) — um `ServicoEmConstrucao` ainda em construção não tem
  // `matriz_distancias` (DEC-035; matriz só nasce na promoção), então não há
  // "desatualização" a checar nele. Recomputa a partir das rotas atuais do
  // próprio Serviço (`matrizDistanciasDesatualizada`, intra-Serviço — RN-054)
  // e compara com o array gravado; a reconciliação automática ao concluir a
  // edição do itinerário (TASK-019/026/061) normalmente já mantém os dois em
  // sincronia — esta pendência cobre o resíduo.
  for (const servico of servicosDaSessao(sessao)) {
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

  // Alerta de §11: "tabela de feriados vazia (nenhuma Viagem de feriado —
  // pode ser intencional)" (RN-071, Spec 03 §9.3). Granularidade agregada
  // (decisão do responsável, 2026-07-17 — TASK-081): em vez de um item por
  // Serviço/sentido (ruído, já que muitas linhas legitimamente não operam em
  // feriado), a Revisão emite NO MÁXIMO UM alerta, que enumera pelo `numero_n`
  // os Serviços afetados, na ordem do documento — casa com o texto singular
  // da spec ("tabela de feriados vazia"). Um Serviço entra na lista só quando
  // NENHUM dos seus itinerários (sentido algum) tem Viagem de feriado —
  // assimetria por sentido (feriado só na Ida, por exemplo) não entra, pois a
  // linha ainda opera em feriado nesse caso.
  const servicosSemGradeDeFeriado = servicosDaSessao(sessao)
    .filter((servico) =>
      servico.itinerarios.every((itinerario) =>
        itinerario.viagens.every((viagem) => !viagem.viagem_feriado),
      ),
    )
    .map((servico) => servico.numero_n);

  if (servicosSemGradeDeFeriado.length > 0) {
    pendencias.push({
      id: "tabela-feriados-vazia",
      severidade: "alerta",
      mensagem: `Serviços ${servicosSemGradeDeFeriado.join(", ")} sem grade de feriados — confirme se é intencional.`,
      etapaAlvo: "viagens-horarios",
    });
  }

  // DEC-095/097: reforços de partida são válidos (RN-062), portanto geram
  // somente um alerta por Serviço, com a quantidade de grupos em Selo e a
  // primeira origem na ordem visual. O detector ignora offsets e cobre as
  // grades comum, de feriado e excepcionais.
  const deteccaoCoincidencias = detectarPartidasCoincidentes(
    servicosDaSessao(sessao),
  );
  for (const alerta of deteccaoCoincidencias.alertasPorServico) {
    pendencias.push({
      id: `partidas-coincidentes-${alerta.servicoUuid}`,
      severidade: "alerta",
      mensagem:
        `O Serviço ${alerta.numeroN} possui partidas coincidentes no mesmo dia e horário. ` +
        "As Viagens destacadas em laranja são reforços válidos; confirme se o cadastro é intencional.",
      etapaAlvo: "viagens-horarios",
      quantidade: alerta.quantidadeGrupos,
      origemPartidasCoincidentes: alerta.primeiraOrigem,
    });
  }

  // TODO — demais pendências de §11, cada uma com a sua task (fora do escopo
  // desta implementação; não inventar aqui — docs-dev/04 princípio 2):
  //   bloqueantes: rota desatualizada/pendente de recálculo (TASK-032, gate),
  //   horários fora de ordem (TASK-029), Seção/Local incompletos e 350 m/
  //   tipificação em revalidação (TASK-015/017/018), itinerário sem viagem
  //   (TASK-028);
  //   alertas: Serviço sem par habilitado na matriz (TASK-027).

  return pendencias;
}
