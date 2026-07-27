import type { Itinerario, Servico } from "@/shared/contrato";
import type { Sentido } from "@/formulario/secoes";
import type { EstadoRotaViva } from "@/formulario/roteamento";
import { matrizDistanciasDoServico } from "@/formulario/matrizes";
import {
  comServicosDaSessao,
  servicosDaSessao,
  servicosEmConstrucaoDaSessao,
  type Direcionalidade,
  type SessaoFormulario,
  type ServicoEmConstrucao,
} from "@/formulario/sessao";
import { chaveItinerario } from "./estado-itinerarios";
import {
  ocorrenciasLocaisEmExtremo,
  paradasParaContrato,
  type ParadaEmEdicao,
} from "./motor-montagem";

// Promoção `ServicoEmConstrucao → Servico` completo (DEC-053; TASK-061;
// generalizada aos dois modos pela TASK-080): ao concluir a edição do
// itinerário, o Serviço em construção passa a ter `itinerarios[]`
// (paradas+rota) e `matriz_distancias` reconciliada — os campos que faltavam
// para ser um `Servico` do schema (Spec 02 §6). `viagens: []` fica para as
// etapas seguintes (Spec 04 §8); por isso o Serviço promovido é
// estruturalmente completo mas só passa no `esquemaServico` strict depois de
// ao menos 1 viagem (RN-039) — validade de schema plena é gate de EXPORTAÇÃO
// (RN-018/§14), não da promoção (RN-096/NEG-004: a promoção é transição de
// estado de sessão, não persistência).

function sentidosDeDirecionalidade(direcionalidade: Direcionalidade): Sentido[] {
  return direcionalidade === "ambos" ? ["ida", "volta"] : [direcionalidade];
}

/**
 * Tenta promover um `ServicoEmConstrucao` a `Servico` completo. Só promove
 * quando TODOS os sentidos da direcionalidade (RN-038: 1 para ida/volta, 2
 * para ambos) têm paradas resolvidas (≥ 2 — RN-034) e rota válida (`estado`
 * congelada/recalculada) — um Serviço "ambos" com só um sentido pronto
 * permanece em construção até o outro fechar. Retorna `null` sem promover
 * quando incompleto ou em `sem-rota` (RN-048: falha não promove Serviço
 * incompleto, a pendência ao vivo existente é mantida por quem chama).
 */
export function promoverServico(
  servico: ServicoEmConstrucao,
  paradasPorSentido: Partial<Record<Sentido, readonly ParadaEmEdicao[]>>,
  estadosPorSentido: Partial<Record<Sentido, EstadoRotaViva>>,
): Servico | null {
  const sentidos = sentidosDeDirecionalidade(servico.direcionalidade);
  const itinerarios: Itinerario[] = [];

  for (const sentido of sentidos) {
    const paradas = paradasPorSentido[sentido];
    const estado = estadosPorSentido[sentido];
    if (!paradas || paradas.length < 2) return null;
    // Defesa na fronteira de promoção (TASK-068/DEC-070): a etapa já recusa
    // RN-035 antes do OSRM, mas uma rota válida anterior não pode autorizar a
    // promoção quando a lista de edição corrente tem Local em um extremo.
    if (ocorrenciasLocaisEmExtremo(paradas).length > 0) return null;
    if (!estado || (estado.situacao !== "congelada" && estado.situacao !== "recalculada")) {
      return null;
    }
    itinerarios.push({
      sentido,
      paradas: paradasParaContrato(paradas),
      rota: estado.rota,
      viagens: [],
    });
  }

  const servicoCompleto: Servico = {
    uuid: servico.uuid,
    numero_n: servico.numero_n,
    caracteristica_veiculo: servico.caracteristica_veiculo,
    carater: servico.carater,
    locais: servico.locais ?? [],
    tabelas_excepcionais: [],
    matriz_seccionamento: [],
    itinerarios,
    matriz_distancias: [],
  };
  return { ...servicoCompleto, matriz_distancias: matrizDistanciasDoServico(servicoCompleto) };
}

/** Paradas em edição de CADA sentido da direcionalidade de um Serviço ainda em
 * construção, lidas de `sessao.paradasEmEdicao` — insumo de `promoverServico`
 * (DEC-053; TASK-061): "ambos" só promove quando os dois sentidos estão lá. */
function paradasPorSentidoDoServico(
  sessao: SessaoFormulario,
  servicoUuid: string,
  direcionalidade: Direcionalidade,
): Partial<Record<Sentido, readonly ParadaEmEdicao[]>> {
  const mapa = sessao.paradasEmEdicao ?? {};
  const resultado: Partial<Record<Sentido, readonly ParadaEmEdicao[]>> = {};
  for (const sentido of sentidosDeDirecionalidade(direcionalidade)) {
    const paradas = mapa[chaveItinerario(servicoUuid, sentido)];
    if (paradas) resultado[sentido] = paradas;
  }
  return resultado;
}

/** Estado de rota ao vivo de CADA sentido da direcionalidade — a contraparte
 * de `paradasPorSentidoDoServico` para `promoverServico`. */
function estadosPorSentidoDoServico(
  sessao: SessaoFormulario,
  servicoUuid: string,
  direcionalidade: Direcionalidade,
): Partial<Record<Sentido, EstadoRotaViva>> {
  const mapa = sessao.estadosRotaViva ?? {};
  const resultado: Partial<Record<Sentido, EstadoRotaViva>> = {};
  for (const sentido of sentidosDeDirecionalidade(direcionalidade)) {
    const estado = mapa[chaveItinerario(servicoUuid, sentido)];
    if (estado) resultado[sentido] = estado;
  }
  return resultado;
}

/**
 * Tenta promover, NA SESSÃO, o `ServicoEmConstrucao` de uuid `servicoUuid` —
 * agnóstico de modo (TASK-080; DEC-053 nunca condicionou a promoção a
 * `modo === "novo"`, recorte que era só da TASK-061). Lê as paradas/estados
 * ao vivo já presentes em `sessao` (o chamador deve tê-los mesclado antes,
 * incluindo o resultado do recálculo corrente); se `promoverServico` aprovar,
 * remove o Serviço de `servicosEmConstrucao` e o anexa por
 * `comServicosDaSessao` (`documento.autos.servicos` no carregado,
 * `sessao.servicos` no novo). Sem Serviço em construção com esse uuid, ou sem
 * promoção (RN-034/038/048), retorna `sessao` inalterada.
 */
export function promoverServicoNaSessao(
  sessao: SessaoFormulario,
  servicoUuid: string,
): SessaoFormulario {
  const emConstrucao = servicosEmConstrucaoDaSessao(sessao).find((s) => s.uuid === servicoUuid);
  if (!emConstrucao) return sessao;

  const paradasPorSentido = paradasPorSentidoDoServico(
    sessao,
    emConstrucao.uuid,
    emConstrucao.direcionalidade,
  );
  const estadosPorSentido = estadosPorSentidoDoServico(
    sessao,
    emConstrucao.uuid,
    emConstrucao.direcionalidade,
  );
  const servicoPromovido = promoverServico(emConstrucao, paradasPorSentido, estadosPorSentido);
  if (!servicoPromovido) return sessao;

  return comServicosDaSessao(
    {
      ...sessao,
      servicosEmConstrucao: servicosEmConstrucaoDaSessao(sessao).filter(
        (s) => s.uuid !== emConstrucao.uuid,
      ),
    },
    [...servicosDaSessao(sessao), servicoPromovido],
  );
}
