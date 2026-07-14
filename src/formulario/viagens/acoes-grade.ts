import { criarViagem, type Itinerario, type Viagem } from "@/shared/contrato";
import { horaMinutoParaHorarioRelogio } from "./horario-relogio";
import { sugerirOffsetsIniciais } from "./sugestao-inicial-offsets";

type ItinerarioParaSugestao = Pick<Itinerario, "paradas" | "rota">;

/**
 * Cria a Viagem de um dia ao preencher a 1ª Seção de um bloco vazio da grade
 * (Spec 04 §8.2; RN-061/064/067): converte o horário de relógio digitado em
 * `horario_saida`, deriva `horarios_paradas[]` completo pela sugestão inicial
 * (Spec 03 §8.1) e nasce com `viagem_feriado=false` — grade de dias comuns
 * (feriados são a TASK-030). `null` se o horário digitado for inválido — a
 * grade não cria Viagem a partir de dado ruim.
 */
export function criarViagemNaCelula(
  itinerario: ItinerarioParaSugestao,
  diaSemana: Viagem["dia_semana"],
  horaMinuto: string,
): Viagem | null {
  const horarioSaida = horaMinutoParaHorarioRelogio(horaMinuto);
  if (horarioSaida === null) return null;
  return criarViagem({
    horario_saida: horarioSaida,
    dia_semana: diaSemana,
    viagem_feriado: false,
    horarios_paradas: sugerirOffsetsIniciais(itinerario.paradas, itinerario.rota.trechos),
  });
}

/**
 * Reedita o horário de partida (1ª Seção) de uma Viagem já existente —
 * inferência controlada da Análise da Task: a Spec 04 §8.2 só nomeia
 * "preencher a 1ª Seção" (criar) e "alterar horário passante" (redistribuir,
 * TASK-029); a 1ª Seção nunca é passante (seu offset é sempre "00:00:00",
 * RN-063), então reeditá-la não aciona a redistribuição da 029. Como esta
 * task não introduz âncoras, a correção re-deriva TODOS os offsets pela
 * sugestão inicial a partir da nova partida — equivalente a recriar a Viagem
 * preservando `uuid`/`dia_semana`/`viagem_feriado`. `null` se o horário
 * digitado for inválido (a Viagem original não é tocada).
 */
export function atualizarHorarioSaida(
  viagem: Viagem,
  itinerario: ItinerarioParaSugestao,
  horaMinuto: string,
): Viagem | null {
  const horarioSaida = horaMinutoParaHorarioRelogio(horaMinuto);
  if (horarioSaida === null) return null;
  return {
    ...viagem,
    horario_saida: horarioSaida,
    horarios_paradas: sugerirOffsetsIniciais(itinerario.paradas, itinerario.rota.trechos),
  };
}
