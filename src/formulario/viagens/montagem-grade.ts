import { DIAS_SEMANA, type Parada, type Viagem } from "@/shared/contrato";
import { somarHorarios } from "./horario-relogio";

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

/**
 * Linhas da grade (Spec 04 §8.1): só as Paradas que são Seção, na ordem do
 * itinerário — Locais comuns não aparecem na grade principal (§2.5/§7.2).
 */
export function linhasSecoes(paradas: readonly Parada[]): Parada[] {
  return [...paradas]
    .sort((a, b) => a.ordem - b.ordem)
    .filter((parada) => parada.secao_uuid !== undefined);
}

/**
 * Monta os blocos da grade de dias comuns (Spec 04 §8.1): as Viagens com
 * `viagem_feriado=false`. Ver `montarBlocosPorFeriado`.
 */
export function montarBlocosDiasComuns(viagens: readonly Viagem[]): BlocoGrade[] {
  return montarBlocosPorFeriado(viagens, false);
}

/**
 * Monta os blocos da grade de feriados (Spec 04 §8.1/§8.4; RN-068): as Viagens
 * com `viagem_feriado=true`. Grade independente da comum — pode ter mais, menos
 * ou nenhuma viagem (RN-071). Mesma montagem por posição ordinal.
 */
export function montarBlocosFeriados(viagens: readonly Viagem[]): BlocoGrade[] {
  return montarBlocosPorFeriado(viagens, true);
}

/**
 * Núcleo de montagem da grade (Spec 04 §8.1): agrupa as Viagens do escopo
 * (`viagem_feriado === feriado`) por `dia_semana`, ordena cada dia por
 * `horario_saida` (RN-062 tolera reforço — desempate por `uuid` para
 * determinismo) e alinha pela posição ordinal (a n-ésima partida do dia).
 * Cada dia ganha exatamente UMA célula "criável", logo após sua última
 * Viagem. O total de blocos é o maior número de Viagens entre os dias + 1,
 * para que o(s) dia(s) mais cheio(s) também tenham sua célula criável.
 */
function montarBlocosPorFeriado(viagens: readonly Viagem[], feriado: boolean): BlocoGrade[] {
  const porDia = new Map<DiaSemana, Viagem[]>(DIAS_SEMANA.map((dia) => [dia, []]));
  for (const viagem of viagens) {
    if (viagem.viagem_feriado !== feriado) continue;
    porDia.get(viagem.dia_semana)?.push(viagem);
  }
  for (const lista of porDia.values()) {
    lista.sort(
      (a, b) => a.horario_saida.localeCompare(b.horario_saida) || a.uuid.localeCompare(b.uuid),
    );
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
