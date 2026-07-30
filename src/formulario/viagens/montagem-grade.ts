import { DIAS_SEMANA, type Parada, type Viagem } from "@/shared/contrato";
import { somarHorarios } from "./horario-relogio";
import type { GradeDestinoViagem } from "./copias-grade";

export type DiaSemana = Viagem["dia_semana"];

/**
 * Estado de uma célula da grade (Spec 04 §8.1): "existente" tem a Viagem
 * daquele dia/posição; "criavel" é a ÚNICA posição por dia onde preencher a
 * 1ª Seção cria a próxima Viagem (Spec 04 §8.2); "indisponivel" é além dessa
 * posição — a grade não permite pular posições (isso é "inserir viagem",
 * Spec 04 §8.3, fora desta task) e exibe "—".
 */
export type EstadoCelulaGrade =
  | { estado: "existente"; viagem: Viagem }
  | { estado: "criavel" }
  | { estado: "indisponivel" };

export type BlocoGrade = Record<DiaSemana, EstadoCelulaGrade>;

export type TeclaNavegacaoGrade = "Tab" | "Enter";

export interface CoordenadaCelulaGrade {
  indiceBloco: number;
  indiceSecao: number;
  dia: DiaSemana;
}

/**
 * Identidade lógica do campo de uma Viagem. Diferentemente da coordenada
 * ordinal, permanece estável quando a grade reordena os blocos por horário
 * ou quando há reforços no mesmo dia/horário (RN-062).
 */
export interface AlvoFocoCelulaGrade {
  grade: string;
  viagemUuid: string;
  indiceSecao: number;
  dia: DiaSemana;
}

/**
 * Ordem de exibição de Viagens dentro de um dia/grade (Spec 04 §8.1).
 * O desempate por UUID já era usado pela montagem; fica público para que
 * detectores derivados da superfície visual, como o da TASK-119, escolham a
 * mesma viagem-base sem duplicar o critério.
 */
export function compararViagensNaGrade(a: Viagem, b: Viagem): number {
  return a.horario_saida.localeCompare(b.horario_saida) || a.uuid.localeCompare(b.uuid);
}

/** Seletor do input que representa uma célula lógica de uma Viagem. */
export function seletorAlvoFocoCelulaGrade(alvo: AlvoFocoCelulaGrade): string {
  return (
    `input[data-grade="${alvo.grade}"]` +
    `[data-viagem-uuid="${alvo.viagemUuid}"]` +
    `[data-secao-index="${alvo.indiceSecao}"]` +
    `[data-dia="${alvo.dia}"]`
  );
}

/**
 * Resolve a navegação explícita da TASK-106 sem criar retorno circular:
 * Tab avança um dia na mesma Seção; Enter desce uma Seção no mesmo dia. Ao
 * alcançar a última Seção, Enter continua na primeira Seção do bloco abaixo
 * (TASK-106), que pode ser a célula criável da próxima Viagem.
 */
export function destinoNavegacaoGrade(
  origem: CoordenadaCelulaGrade,
  tecla: TeclaNavegacaoGrade,
  totalSecoes: number,
): CoordenadaCelulaGrade | null {
  if (tecla === "Tab") {
    const indiceDia = DIAS_SEMANA.indexOf(origem.dia);
    const proximoDia = DIAS_SEMANA[indiceDia + 1];
    return proximoDia ? { ...origem, dia: proximoDia } : null;
  }

  if (origem.indiceSecao + 1 < totalSecoes) {
    return { ...origem, indiceSecao: origem.indiceSecao + 1 };
  }
  return { ...origem, indiceBloco: origem.indiceBloco + 1, indiceSecao: 0 };
}

/**
 * Linhas visíveis da grade (Spec 04 §8.1; TASK-111/DEC-086): só as Paradas
 * que são Seção, na ordem do itinerário — Locais comuns não aparecem na grade
 * principal (§2.5/§7.2). No modo compacto, mantém apenas a Seção de partida;
 * as demais Paradas e seus horários continuam intactos no Itinerário.
 */
export function linhasSecoes(
  paradas: readonly Parada[],
  modoCompacto = false,
): Parada[] {
  const secoes = [...paradas]
    .sort((a, b) => a.ordem - b.ordem)
    .filter((parada) => parada.secao_uuid !== undefined);
  return modoCompacto ? secoes.slice(0, 1) : secoes;
}

/**
 * Monta os blocos da grade de dias comuns (Spec 04 §8.1): as Viagens com
 * `viagem_feriado=false`. Ver `montarBlocosPorFeriado`.
 */
export function montarBlocosDiasComuns(viagens: readonly Viagem[]): BlocoGrade[] {
  return montarBlocosGrade(viagens, {
    viagem_feriado: false,
    tabela_excepcional_uuid: null,
  });
}

/**
 * Monta os blocos da grade de feriados (Spec 04 §8.1/§8.4; RN-068): as Viagens
 * com `viagem_feriado=true`. Grade independente da comum — pode ter mais, menos
 * ou nenhuma viagem (RN-071). Mesma montagem por posição ordinal.
 */
export function montarBlocosFeriados(viagens: readonly Viagem[]): BlocoGrade[] {
  return montarBlocosGrade(viagens, {
    viagem_feriado: true,
    tabela_excepcional_uuid: null,
  });
}

/**
 * Núcleo de montagem da grade (Spec 04 §8.1): agrupa as Viagens do escopo
 * (discriminadores da grade) por `dia_semana`, ordena cada dia por
 * `horario_saida` (RN-062 tolera reforço — desempate por `uuid` para
 * determinismo) e alinha pela posição ordinal (a n-ésima partida do dia).
 * Cada dia ganha exatamente UMA célula "criável", logo após sua última
 * Viagem. O total de blocos é o maior número de Viagens entre os dias + 1,
 * para que o(s) dia(s) mais cheio(s) também tenham sua célula criável.
 */
export function montarBlocosGrade(
  viagens: readonly Viagem[],
  grade: GradeDestinoViagem,
): BlocoGrade[] {
  const porDia = new Map<DiaSemana, Viagem[]>(DIAS_SEMANA.map((dia) => [dia, []]));
  for (const viagem of viagens) {
    if (
      viagem.viagem_feriado !== grade.viagem_feriado ||
      (viagem.tabela_excepcional_uuid ?? null) !==
        grade.tabela_excepcional_uuid
    ) {
      continue;
    }
    porDia.get(viagem.dia_semana)?.push(viagem);
  }
  for (const lista of porDia.values()) {
    lista.sort(compararViagensNaGrade);
  }

  const maiorContagem = Math.max(0, ...[...porDia.values()].map((lista) => lista.length));
  const totalBlocos = maiorContagem + 1;

  const blocos: BlocoGrade[] = [];
  for (let indice = 0; indice < totalBlocos; indice++) {
    const bloco = {} as BlocoGrade;
    for (const dia of DIAS_SEMANA) {
      const lista = porDia.get(dia) ?? [];
      if (indice < lista.length) {
        bloco[dia] = { estado: "existente", viagem: lista[indice] };
      } else if (indice === lista.length) {
        bloco[dia] = { estado: "criavel" };
      } else {
        bloco[dia] = { estado: "indisponivel" };
      }
    }
    blocos.push(bloco);
  }
  return blocos;
}

/**
 * Horário absoluto (HH:MM:SS) de passagem de uma Viagem numa Parada —
 * `horario_saida + offset_horario` (Spec 04 §8.1/§2.4/§2.5). `undefined` se a
 * Parada não existir na Viagem (não deve ocorrer — RN-063 garante o conjunto
 * completo).
 */
export function horarioAbsolutoNaParada(
  viagem: Viagem,
  paradaOrdem: number,
): string | undefined {
  const horario = viagem.horarios_paradas.find((h) => h.parada_ordem === paradaOrdem);
  return horario ? somarHorarios(viagem.horario_saida, horario.offset_horario) : undefined;
}
