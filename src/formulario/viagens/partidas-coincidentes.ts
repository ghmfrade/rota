import {
  DIAS_SEMANA,
  type Itinerario,
  type Servico,
  type Viagem,
} from "@/shared/contrato";
import { compararViagensNaGrade, type DiaSemana } from "./montagem-grade";

export type IdGradeViagens =
  | "comuns"
  | "feriados"
  | `excepcional-${string}`;

export interface OrigemPartidasCoincidentes {
  servicoUuid: string;
  sentido: Itinerario["sentido"];
  gradeId: IdGradeViagens;
  diaSemana: DiaSemana;
  horarioSaida: string;
  viagemBaseUuid: string;
}

export interface GrupoPartidasCoincidentes
  extends OrigemPartidasCoincidentes {
  reforcosUuids: readonly string[];
}

export interface AlertaPartidasCoincidentes {
  servicoUuid: string;
  numeroN: string;
  quantidadeGrupos: number;
  primeiraOrigem: OrigemPartidasCoincidentes;
}

export interface DeteccaoPartidasCoincidentes {
  grupos: readonly GrupoPartidasCoincidentes[];
  alertasPorServico: readonly AlertaPartidasCoincidentes[];
  reforcosUuids: ReadonlySet<string>;
}

interface GradeDetectavel {
  id: IdGradeViagens;
  viagemFeriado: boolean;
  tabelaExcepcionalUuid: string | null;
}

const GRADE_COMUM: GradeDetectavel = {
  id: "comuns",
  viagemFeriado: false,
  tabelaExcepcionalUuid: null,
};

const GRADE_FERIADOS: GradeDetectavel = {
  id: "feriados",
  viagemFeriado: true,
  tabelaExcepcionalUuid: null,
};

function gradesDoServico(servico: Servico): GradeDetectavel[] {
  return [
    GRADE_COMUM,
    GRADE_FERIADOS,
    ...(servico.tabelas_excepcionais ?? []).map((tabela) => ({
      id: `excepcional-${tabela.uuid}` as const,
      viagemFeriado: false,
      tabelaExcepcionalUuid: tabela.uuid,
    })),
  ];
}

function pertenceAGrade(viagem: Viagem, grade: GradeDetectavel): boolean {
  return (
    viagem.viagem_feriado === grade.viagemFeriado &&
    (viagem.tabela_excepcional_uuid ?? null) ===
      grade.tabelaExcepcionalUuid
  );
}

function viagensDistintasOrdenadas(
  viagens: readonly Viagem[],
): Viagem[] {
  const porUuid = new Map<string, Viagem>();
  for (const viagem of viagens) {
    if (!porUuid.has(viagem.uuid)) porUuid.set(viagem.uuid, viagem);
  }
  return [...porUuid.values()].sort(compararViagensNaGrade);
}

/**
 * Detecta reforços válidos da RN-062 sem alterar nem validar o documento.
 *
 * A ordem dos loops materializa a DEC-097: Serviço/Itinerário no documento,
 * grades na ordem visual, DIAS_SEMANA, horario_saida e ordem exibida. Os
 * offsets e demais horários de passagem são deliberadamente ignorados.
 */
export function detectarPartidasCoincidentes(
  servicos: readonly Servico[],
): DeteccaoPartidasCoincidentes {
  const grupos: GrupoPartidasCoincidentes[] = [];
  const alertasPorServico: AlertaPartidasCoincidentes[] = [];
  const reforcosUuids = new Set<string>();

  for (const servico of servicos) {
    const gruposDoServico: GrupoPartidasCoincidentes[] = [];

    for (const itinerario of servico.itinerarios) {
      for (const grade of gradesDoServico(servico)) {
        for (const dia of DIAS_SEMANA) {
          const viagensDoDia = viagensDistintasOrdenadas(
            itinerario.viagens.filter(
              (viagem) =>
                viagem.dia_semana === dia &&
                pertenceAGrade(viagem, grade),
            ),
          );
          const porHorario = new Map<string, Viagem[]>();
          for (const viagem of viagensDoDia) {
            const existentes = porHorario.get(viagem.horario_saida) ?? [];
            existentes.push(viagem);
            porHorario.set(viagem.horario_saida, existentes);
          }

          for (const [horarioSaida, viagens] of porHorario) {
            if (viagens.length < 2) continue;
            const [viagemBase, ...reforcos] = viagens;
            const grupo: GrupoPartidasCoincidentes = {
              servicoUuid: servico.uuid,
              sentido: itinerario.sentido,
              gradeId: grade.id,
              diaSemana: dia,
              horarioSaida,
              viagemBaseUuid: viagemBase.uuid,
              reforcosUuids: reforcos.map((viagem) => viagem.uuid),
            };
            grupos.push(grupo);
            gruposDoServico.push(grupo);
            for (const reforco of reforcos) reforcosUuids.add(reforco.uuid);
          }
        }
      }
    }

    if (gruposDoServico.length > 0) {
      const primeiro = gruposDoServico[0];
      alertasPorServico.push({
        servicoUuid: servico.uuid,
        numeroN: servico.numero_n,
        quantidadeGrupos: gruposDoServico.length,
        primeiraOrigem: {
          servicoUuid: primeiro.servicoUuid,
          sentido: primeiro.sentido,
          gradeId: primeiro.gradeId,
          diaSemana: primeiro.diaSemana,
          horarioSaida: primeiro.horarioSaida,
          viagemBaseUuid: primeiro.viagemBaseUuid,
        },
      });
    }
  }

  return { grupos, alertasPorServico, reforcosUuids };
}
