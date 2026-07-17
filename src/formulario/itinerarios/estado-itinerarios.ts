import type { Local, PontoDeRota, Secao } from "@/shared/contrato";
import type { Sentido } from "@/formulario/secoes";
import {
  comporDescricao,
  congelarRotaCarregada,
  recalcularItinerario,
  type ComporDescricao,
  type EstadoRotaViva,
  type OpcoesClienteOsrm,
} from "@/formulario/roteamento";
import type { ItinerarioAoVivo } from "@/formulario/pendencias";
import {
  servicosDaSessao,
  servicosEmConstrucaoDaSessao,
  type Direcionalidade,
  type SessaoFormulario,
} from "@/formulario/sessao";
import {
  resolverParadasRota,
  type ParadaEmEdicao,
  type ViolacaoMontagem,
} from "./motor-montagem";

// Fiação do estado de rota ao vivo por itinerário (TASK-019; DEC-041/046):
// esta task é a dona do `EstadoRotaViva` de cada Serviço/sentido em edição —
// aciona `recalcularItinerario` (TASK-024) injetando o `comporDescricao` REAL
// (TASK-025, sem placeholder — DEC-046) e monta o `ItinerarioAoVivo[]` que
// fecha o fio da TASK-044 em `coletarPendencias`.

/** Chave estável de um itinerário (Serviço × sentido) para os mapas de estado
 * ao vivo da sessão (`estadosRotaViva`/`paradasEmEdicao`, `sessao.ts`). */
export function chaveItinerario(servicoUuid: string, sentido: Sentido): string {
  return `${servicoUuid}-${sentido}`;
}

export type EstadosRotaViva = Record<string, EstadoRotaViva>;

/**
 * Pontos de rota em edição de um itinerário (TASK-071; DEC-058): a entrada
 * do estado de sessão (`pontosDeRotaEmEdicao`) manda, se existir — é ela que
 * sobrevive a um recálculo que falha (RN-048). Na ausência dela, cai no eco
 * congelado do itinerário já COMPLETO (`rota.pontos_de_rota` — reedição
 * fiel, Spec 03 §3.6.2, síncrona e sem OSRM — RN-052). Sem sessão nem
 * itinerário carregado (ex.: Serviço em construção ainda não tocado),
 * devolve `[]` — não há o que reaplicar.
 */
export function pontosDeRotaDoItinerario(
  sessao: SessaoFormulario,
  servicoUuid: string,
  sentido: Sentido,
): readonly PontoDeRota[] {
  const chave = chaveItinerario(servicoUuid, sentido);
  const daSessao = sessao.pontosDeRotaEmEdicao?.[chave];
  if (daSessao !== undefined) return daSessao;

  const servico = servicosDaSessao(sessao).find((s) => s.uuid === servicoUuid);
  const itinerario = servico?.itinerarios.find((i) => i.sentido === sentido);
  return itinerario?.rota.pontos_de_rota ?? [];
}

function sentidosDeDirecionalidade(direcionalidade: Direcionalidade): Sentido[] {
  return direcionalidade === "ambos" ? ["ida", "volta"] : [direcionalidade];
}

/**
 * Monta `ItinerarioAoVivo[]` (TASK-044) para TODA a sessão — não só o
 * Serviço/sentido em foco na etapa —, para que `coletarPendencias`, chamado
 * pela casca (`layout-formulario.tsx`) independentemente da etapa exibida,
 * enxergue as pendências de todo itinerário do documento, mesmo um que o
 * usuário ainda não tenha revisitado nesta sessão de edição.
 *
 * - **Itinerários completos** (`servicosDaSessao` — Serviços do `documento`
 *   no carregado E Serviços promovidos no novo, DEC-053/TASK-061) sempre
 *   entram: com o `EstadoRotaViva` já registrado nesta sessão (recálculo/
 *   tentativa) ou, na ausência dele, com o **congelamento** do `rota` gravado
 *   (RN-015 — congelar é síncrono, sem OSRM, então computável aqui sem custo).
 * - **Itinerários em construção** (Serviço novo ainda não promovido, DEC-035)
 *   só entram quando já têm ALGUM estado registrado (o usuário já tentou
 *   montá-los) — não há rota congelada de arquivo para servir de fallback, e
 *   um itinerário nunca tocado não deve gerar pendência prematura.
 */
export function itinerariosAoVivoDaSessao(sessao: SessaoFormulario): ItinerarioAoVivo[] {
  const estados = sessao.estadosRotaViva ?? {};
  const lista: ItinerarioAoVivo[] = [];

  for (const servico of servicosDaSessao(sessao)) {
    for (const itinerario of servico.itinerarios) {
      const chave = chaveItinerario(servico.uuid, itinerario.sentido);
      const estadoRota = estados[chave] ?? congelarRotaCarregada(itinerario.rota);
      lista.push({ numeroN: servico.numero_n, sentido: itinerario.sentido, estadoRota });
    }
  }

  for (const servico of servicosEmConstrucaoDaSessao(sessao)) {
    for (const sentido of sentidosDeDirecionalidade(servico.direcionalidade)) {
      const chave = chaveItinerario(servico.uuid, sentido);
      const estadoRota = estados[chave];
      if (estadoRota) {
        lista.push({ numeroN: servico.numero_n, sentido, estadoRota });
      }
    }
  }

  return lista;
}

export type ResultadoDispararRecalculo =
  | { ok: true; estado: EstadoRotaViva }
  | { ok: false; violacoes: ViolacaoMontagem[] };

/**
 * Dispara o "soltar" do gesto de edição (RN-052; Spec 04 §7.3 item 5): resolve
 * as paradas em edição para `ParadaRota[]` (RN-034/035/036 — `resolverParadasRota`)
 * e, se completas, chama `recalcularItinerario` injetando o `comporDescricao`
 * REAL (não mock, não placeholder — DEC-046) e os pontos de rota persistidos
 * (Spec 03 §3.6.2). Itinerário ainda incompleto (< 2 paradas, extremos
 * pendentes) devolve as violações sem chamar o OSRM — não é falha de rota,
 * é montagem em andamento.
 */
export async function dispararRecalculo(
  paradas: readonly ParadaEmEdicao[],
  secoes: readonly Secao[],
  locais: readonly Local[],
  servicoUuid: string,
  sentido: Sentido,
  pontosDeRota: readonly PontoDeRota[] = [],
  opcoesOsrm: OpcoesClienteOsrm = {},
): Promise<ResultadoDispararRecalculo> {
  const resolucao = resolverParadasRota(paradas, secoes, locais, servicoUuid, sentido);
  if (!resolucao.ok) return { ok: false, violacoes: resolucao.violacoes };

  const comporDescricaoReal: ComporDescricao = comporDescricao;
  const estado = await recalcularItinerario(
    { paradas: resolucao.paradas, pontosDeRota },
    comporDescricaoReal,
    opcoesOsrm,
  );
  return { ok: true, estado };
}
