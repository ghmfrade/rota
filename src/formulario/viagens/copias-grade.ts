import { criarViagem, type Itinerario, type Viagem } from "@/shared/contrato";
import type { DiaSemana } from "./montagem-grade";

// Ações de cópia e remoção da grade (Spec 04 §8.3/§8.4; RN-007/061/068/071).
// Toda cópia cria entidade nova pela fábrica `criarViagem` — UUID nova, jamais
// reutilizada da origem (RN-007/005). Nada aqui recalcula offsets: a cópia
// preserva `horarios_paradas` tal como está, mantendo a invariante de RN-063.
// Funções puras (sem UI e sem estado de sessão) — a sincronia das âncoras
// efêmeras (DEC-049) e as confirmações são responsabilidade do chamador.

/** Modo de "Copiar dias comuns" quando a grade de feriados já tem conteúdo (Spec 04 §8.4). */
export type ModoCopiaFeriado = "sobrescrever" | "mesclar";

/**
 * Duplica uma Viagem para o(s) dia(s) escolhido(s) (Spec 04 §8.3; RN-007/061):
 * uma Viagem nova por dia, com **UUID nova**, mesmos `horario_saida`,
 * `horarios_paradas` (offsets preservados — RN-063) e `viagem_feriado` (a ação
 * opera dentro da grade de origem — inferência controlada), trocando só o
 * `dia_semana`. Copiar para o dia da própria origem é reforço válido (RN-062).
 * Lista de dias vazia → nenhuma Viagem (sem efeito).
 */
export function copiarViagemParaDias(
  viagem: Viagem,
  dias: readonly DiaSemana[],
): Viagem[] {
  return dias.map((dia) =>
    criarViagem({
      horario_saida: viagem.horario_saida,
      dia_semana: dia,
      viagem_feriado: viagem.viagem_feriado,
      // Cópia defensiva dos offsets — a cópia é objeto independente da origem.
      horarios_paradas: viagem.horarios_paradas.map((h) => ({ ...h })),
    }),
  );
}

/**
 * "Copiar dias comuns" (Spec 04 §8.4; RN-007/061/068): clona todas as Viagens
 * comuns (`viagem_feriado=false`) do itinerário como Viagens de feriado
 * (`viagem_feriado=true`), com **UUIDs novas** e offsets preservados. As
 * comuns permanecem intocadas (grades independentes — RN-068).
 * - `sobrescrever`: descarta as Viagens de feriado existentes antes de inserir os clones.
 * - `mesclar`: mantém as de feriado existentes e adiciona os clones (duplicatas são reforço válido — RN-062).
 * Grade comum vazia → nenhum clone criado (`mesclar` preserva o que houver;
 * `sobrescrever` esvazia a grade de feriados — RN-071).
 */
export function clonarDiasComunsParaFeriado(
  itinerario: Itinerario,
  modo: ModoCopiaFeriado,
): Itinerario {
  const comuns = itinerario.viagens.filter((v) => !v.viagem_feriado);
  const feriadoExistente = itinerario.viagens.filter((v) => v.viagem_feriado);
  const clones = comuns.map((v) =>
    criarViagem({
      horario_saida: v.horario_saida,
      dia_semana: v.dia_semana,
      viagem_feriado: true,
      horarios_paradas: v.horarios_paradas.map((h) => ({ ...h })),
    }),
  );
  const feriadoFinal = modo === "sobrescrever" ? clones : [...feriadoExistente, ...clones];
  return { ...itinerario, viagens: [...comuns, ...feriadoFinal] };
}

/**
 * Apaga uma Viagem inteira do itinerário (Spec 04 §8.3): remove a Viagem de
 * `uuid` dado. UUID inexistente → itinerário inalterado.
 */
export function apagarViagem(itinerario: Itinerario, viagemUuid: string): Itinerario {
  return { ...itinerario, viagens: itinerario.viagens.filter((v) => v.uuid !== viagemUuid) };
}
