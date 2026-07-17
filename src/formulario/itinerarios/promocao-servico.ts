import type { Itinerario, Servico } from "@/shared/contrato";
import type { Sentido } from "@/formulario/secoes";
import type { EstadoRotaViva } from "@/formulario/roteamento";
import { matrizDistanciasDoServico } from "@/formulario/matrizes";
import type { Direcionalidade, ServicoEmConstrucao } from "@/formulario/sessao";
import { paradasParaContrato, type ParadaEmEdicao } from "./motor-montagem";

// Promoção `ServicoEmConstrucao → Servico` completo (DEC-053; TASK-061): no
// fluxo "novo", ao concluir a edição do itinerário, o Serviço em construção
// passa a ter `itinerarios[]` (paradas+rota) e `matriz_distancias`
// reconciliada — os campos que faltavam para ser um `Servico` do schema
// (Spec 02 §6). `viagens: []` fica para as etapas seguintes (Spec 04 §8); por
// isso o Serviço promovido é estruturalmente completo mas só passa no
// `esquemaServico` strict depois de ao menos 1 viagem (RN-039) — validade de
// schema plena é gate de EXPORTAÇÃO (RN-018/§14), não da promoção
// (RN-096/NEG-004: a promoção é transição de estado de sessão, não
// persistência).

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
    matriz_seccionamento: [],
    itinerarios,
    matriz_distancias: [],
  };
  return { ...servicoCompleto, matriz_distancias: matrizDistanciasDoServico(servicoCompleto) };
}
