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

/** Discriminadores da grade que receberá a cópia (RN-061/RN-099). */
export interface GradeDestinoViagem {
  viagem_feriado: boolean;
  tabela_excepcional_uuid: string | null;
}

export type ResultadoCopiaViagem =
  | { ok: true; copia: Viagem }
  | { ok: false; motivo: "origem-ausente" | "mesma-coluna" | "horario-existente" };

/** Resultado da cópia de todas as Viagens de uma coluna para vários dias (DEC-085). */
export interface ResultadoCopiaDia {
  itinerario: Itinerario;
  copias: Viagem[];
  horariosIgnorados: number;
}

/** Retorna o dia imediatamente ao lado, sem circular entre SEG e DOM. */
export function diaAoLado(dia: DiaSemana, direcao: -1 | 1): DiaSemana | null {
  const dias: readonly DiaSemana[] = [
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
    "domingo",
  ];
  const indice = dias.indexOf(dia);
  return dias[indice + direcao] ?? null;
}

function mesmaGrade(viagem: Viagem, grade: GradeDestinoViagem): boolean {
  return (
    viagem.viagem_feriado === grade.viagem_feriado &&
    viagem.tabela_excepcional_uuid === grade.tabela_excepcional_uuid
  );
}

/**
 * Verifica a existência de uma partida no mesmo dia, horário e grade.
 *
 * O critério é compartilhado pelas guardas locais de cópia e de geração por
 * headway (DEC-084/DEC-094). Os offsets não participam da igualdade e a função
 * não cria uma validação estrutural: reforços continuam válidos (RN-062).
 */
export function existeViagemNoHorarioDaGrade(
  viagens: readonly Viagem[],
  diaSemana: Viagem["dia_semana"],
  horarioSaida: string,
  grade: GradeDestinoViagem,
): boolean {
  return viagens.some(
    (viagem) =>
      viagem.dia_semana === diaSemana &&
      viagem.horario_saida === horarioSaida &&
      mesmaGrade(viagem, grade),
  );
}

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
  gradeDestino: GradeDestinoViagem = viagem,
): Viagem[] {
  return dias.map((dia) =>
    criarViagem({
      horario_saida: viagem.horario_saida,
      dia_semana: dia,
      viagem_feriado: gradeDestino.viagem_feriado,
      tabela_excepcional_uuid: gradeDestino.tabela_excepcional_uuid,
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

/**
 * Cópia unitária acionada pela grade (DEC-084/092). A guarda por horário é
 * deliberadamente local a este gesto: o contrato continua aceitando reforços
 * (RN-062). Offsets não participam da comparação.
 */
export function copiarViagemParaDiaComGuarda(
  itinerario: Itinerario,
  viagemUuid: string,
  diaDestino: DiaSemana,
  gradeDestino: GradeDestinoViagem,
): ResultadoCopiaViagem {
  const origem = itinerario.viagens.find((viagem) => viagem.uuid === viagemUuid);
  if (!origem) return { ok: false, motivo: "origem-ausente" };

  if (origem.dia_semana === diaDestino && mesmaGrade(origem, gradeDestino)) {
    return { ok: false, motivo: "mesma-coluna" };
  }

  const jaExiste = existeViagemNoHorarioDaGrade(
    itinerario.viagens,
    diaDestino,
    origem.horario_saida,
    gradeDestino,
  );
  if (jaExiste) return { ok: false, motivo: "horario-existente" };

  const [copia] = copiarViagemParaDias(origem, [diaDestino], gradeDestino);
  return { ok: true, copia };
}

/**
 * Copia todas as Viagens de um dia para os dias escolhidos (DEC-085).
 *
 * A operação é uma mescla: Viagens já existentes no destino nunca são
 * removidas. A guarda da DEC-084 é aplicada a cada cópia e continua limitada
 * a este gesto; por isso, nenhum requisito de unicidade é imposto ao contrato
 * (RN-062). A origem e os destinos pertencem sempre à mesma grade.
 */
export function copiarDiaParaDiasComGuarda(
  itinerario: Itinerario,
  diaOrigem: DiaSemana,
  diasDestino: readonly DiaSemana[],
  grade: GradeDestinoViagem,
): ResultadoCopiaDia {
  const origens = itinerario.viagens.filter(
    (viagem) => viagem.dia_semana === diaOrigem && mesmaGrade(viagem, grade),
  );
  let resultado = itinerario;
  const copias: Viagem[] = [];
  let horariosIgnorados = 0;

  for (const diaDestino of diasDestino) {
    if (diaDestino === diaOrigem) continue;
    const horariosPreexistentes = new Set(
      itinerario.viagens
        .filter(
          (viagem) =>
            viagem.dia_semana === diaDestino && mesmaGrade(viagem, grade),
        )
        .map((viagem) => viagem.horario_saida),
    );

    for (const origem of origens) {
      if (horariosPreexistentes.has(origem.horario_saida)) {
        horariosIgnorados += 1;
        continue;
      }

      const [copia] = copiarViagemParaDias(origem, [diaDestino], grade);
      copias.push(copia);
      resultado = { ...resultado, viagens: [...resultado.viagens, copia] };
    }
  }

  return { itinerario: resultado, copias, horariosIgnorados };
}

/**
 * Apaga somente as Viagens da coluna informada na grade corrente (DEC-085).
 * Dia/grade sem Viagens é um no-op, útil para a confirmação controlada pela UI.
 */
export function apagarViagensDoDia(
  itinerario: Itinerario,
  dia: DiaSemana,
  grade: GradeDestinoViagem,
): Itinerario {
  return {
    ...itinerario,
    viagens: itinerario.viagens.filter(
      (viagem) => viagem.dia_semana !== dia || !mesmaGrade(viagem, grade),
    ),
  };
}
