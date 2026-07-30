import { criarViagem, type Itinerario, type Viagem } from "@/shared/contrato";
import {
  formatarHms,
  horaMinutoParaHorarioRelogio,
  horarioParaSegundos,
} from "./horario-relogio";
import {
  offsetForaDeOrdem,
  recomputarOffsetsComAncoras,
} from "./redistribuicao-offsets";
import { sugerirOffsetsIniciais } from "./sugestao-inicial-offsets";
import {
  existeViagemNoHorarioDaGrade,
  type GradeDestinoViagem,
} from "./copias-grade";

type ItinerarioParaSugestao = Pick<Itinerario, "paradas" | "rota">;

/**
 * Cria a Viagem de um dia ao preencher a 1ª Seção de um bloco vazio da grade
 * (Spec 04 §8.2/§8.4; RN-061/064/067): converte o horário de relógio digitado
 * em `horario_saida`, deriva `horarios_paradas[]` completo pela sugestão inicial
 * (Spec 03 §8.1). `grade` define em qual grade a Viagem nasce — comum por
 * padrão, de feriado ou de uma Tabela excepcional. `null` se o horário digitado
 * for inválido — a grade não cria Viagem a partir de dado ruim.
 */
export function criarViagemNaCelula(
  itinerario: ItinerarioParaSugestao,
  diaSemana: Viagem["dia_semana"],
  horaMinuto: string,
  grade: GradeDestinoViagem = {
    viagem_feriado: false,
    tabela_excepcional_uuid: null,
  },
): Viagem | null {
  const horarioSaida = horaMinutoParaHorarioRelogio(horaMinuto);
  if (horarioSaida === null) return null;
  return criarViagem({
    horario_saida: horarioSaida,
    dia_semana: diaSemana,
    viagem_feriado: grade.viagem_feriado,
    tabela_excepcional_uuid: grade.tabela_excepcional_uuid,
    horarios_paradas: sugerirOffsetsIniciais(itinerario.paradas, itinerario.rota.trechos),
  });
}

/**
 * Reedita o horário de partida (1ª Seção) de uma Viagem já existente. O offset
 * é relativo ao `horario_saida` (Spec 02 §11.1), então mover a partida apenas
 * desloca todos os horários absolutos pelo mesmo delta — os `horarios_paradas`
 * (offsets e âncoras manuais, RN-065) são **preservados**. Corrige a ressalva
 * vinculante da revisão da TASK-028: re-derivar os offsets pela sugestão
 * inicial apagaria as âncoras quando esta task existe. `null` se o horário
 * digitado for inválido (a Viagem original não é tocada).
 */
export function atualizarHorarioSaida(
  viagem: Viagem,
  horaMinuto: string,
): Viagem | null {
  const horarioSaida = horaMinutoParaHorarioRelogio(horaMinuto);
  if (horarioSaida === null) return null;
  return { ...viagem, horario_saida: horarioSaida };
}

/**
 * Cria uma nova Viagem a partir da selecionada, deslocando sua partida em
 * minutos (DEC-082/TASK-107). É uma cópia: preserva os offsets já confirmados
 * — inclusive os resultantes de redistribuições manuais — e cria UUID nova.
 *
 * O deslocamento não faz módulo de 24 h: resultado antes de 00:00 ou depois de
 * 23:59 é recusado para não criar uma Viagem em outro dia. A grade de origem
 * também é preservada por `viagem_feriado` e `tabela_excepcional_uuid`.
 */
export function inserirViagemPorOffsetRelativo(
  viagem: Viagem,
  deslocamentoMinutos: number,
): Viagem | null {
  if (!Number.isInteger(deslocamentoMinutos)) return null;

  const horarioSaidaSegundos = horarioParaSegundos(viagem.horario_saida);
  const horarioNovoSegundos = horarioSaidaSegundos + deslocamentoMinutos * 60;
  if (horarioNovoSegundos < 0 || horarioNovoSegundos >= 24 * 60 * 60) return null;

  return criarViagem({
    horario_saida: formatarHms(horarioNovoSegundos),
    dia_semana: viagem.dia_semana,
    viagem_feriado: viagem.viagem_feriado,
    tabela_excepcional_uuid: viagem.tabela_excepcional_uuid,
    horarios_paradas: viagem.horarios_paradas.map((horario) => ({ ...horario })),
  });
}

export type ResultadoGeracaoHeadway =
  | { ok: true; viagens: Viagem[]; horariosIgnorados: number }
  | {
      ok: false;
      motivo: "headway-invalido" | "limite-invalido" | "limite-anterior";
    };

/**
 * Gera Viagens posteriores à selecionada por headway fixo até um
 * horário-limite inclusivo (DEC-083/TASK-108).
 *
 * A origem já existe na grade e não é recriada: são geradas somente as partidas
 * `origem + k × headway`, para `k >= 1`. Cada cópia permanece no mesmo dia e na
 * mesma grade, herda os offsets confirmados e recebe UUID nova. A validação
 * ocorre antes da criação para que entradas inválidas não produzam lote parcial.
 * Horários preexistentes no mesmo dia e grade são ignorados antes da geração da
 * UUID (DEC-094); os offsets não participam do critério (RN-062).
 */
export function gerarViagensPorHeadway(
  viagem: Viagem,
  headwayHoraMinuto: string,
  limiteHoraMinuto: string,
  viagensExistentes: readonly Viagem[],
): ResultadoGeracaoHeadway {
  const headway = horaMinutoParaHorarioRelogio(headwayHoraMinuto);
  if (headway === null) return { ok: false, motivo: "headway-invalido" };

  const headwaySegundos = horarioParaSegundos(headway);
  if (headwaySegundos <= 0) return { ok: false, motivo: "headway-invalido" };

  const limite = horaMinutoParaHorarioRelogio(limiteHoraMinuto);
  if (limite === null) return { ok: false, motivo: "limite-invalido" };

  const origemSegundos = horarioParaSegundos(viagem.horario_saida);
  const limiteSegundos = horarioParaSegundos(limite);
  if (limiteSegundos < origemSegundos) {
    return { ok: false, motivo: "limite-anterior" };
  }

  const viagens: Viagem[] = [];
  let horariosIgnorados = 0;
  const grade = {
    viagem_feriado: viagem.viagem_feriado,
    tabela_excepcional_uuid: viagem.tabela_excepcional_uuid,
  };
  for (
    let horarioSegundos = origemSegundos + headwaySegundos;
    horarioSegundos <= limiteSegundos && horarioSegundos < 24 * 60 * 60;
    horarioSegundos += headwaySegundos
  ) {
    const horarioSaida = formatarHms(horarioSegundos);
    if (
      existeViagemNoHorarioDaGrade(
        viagensExistentes,
        viagem.dia_semana,
        horarioSaida,
        grade,
      )
    ) {
      horariosIgnorados += 1;
      continue;
    }

    viagens.push(
      criarViagem({
        horario_saida: horarioSaida,
        dia_semana: viagem.dia_semana,
        viagem_feriado: viagem.viagem_feriado,
        tabela_excepcional_uuid: viagem.tabela_excepcional_uuid,
        horarios_paradas: viagem.horarios_paradas.map((horario) => ({ ...horario })),
      }),
    );
  }

  return { ok: true, viagens, horariosIgnorados };
}

/** Resultado de editar um horário passante (Spec 04 §8.2). */
export type ResultadoEdicaoPassante =
  | { ok: true; viagem: Viagem; ancoras: number[] }
  | { ok: false; motivo: "invalido" | "fora-de-ordem" };

/**
 * Edita o horário de uma parada passante (Seção intermediária/final) de uma
 * Viagem (Spec 04 §8.2; RN-065): a parada vira **âncora** e as derivadas são
 * reinterpoladas proporcionalmente (Spec 03 §8.2). O usuário digita horário de
 * relógio absoluto (RN-067); convertemos para offset relativo a `horario_saida`
 * (módulo 24 h, como `somarHorarios` — cobre viagem que cruza a meia-noite).
 *
 * `ancorasAtuais` é a lista de `parada.ordem` já ancoradas manualmente nesta
 * Viagem (sem a primeira parada, que é âncora implícita em 0 — Spec 03 §8.2;
 * estado efêmero de sessão, DEC-049). Retorna `fora-de-ordem` quando o offset
 * violaria a monotonicidade (a grade recusa e não confirma — Spec 04 §8.2) e
 * `invalido` quando o horário digitado é malformado — sem tocar a Viagem.
 */
export function editarHorarioPassante(
  viagem: Viagem,
  itinerario: ItinerarioParaSugestao,
  ancorasAtuais: readonly number[],
  paradaOrdem: number,
  horaMinutoAbsoluto: string,
): ResultadoEdicaoPassante {
  const horarioAbsoluto = horaMinutoParaHorarioRelogio(horaMinutoAbsoluto);
  if (horarioAbsoluto === null) return { ok: false, motivo: "invalido" };

  const saidaSeg = horarioParaSegundos(viagem.horario_saida);
  const absolutoSeg = horarioParaSegundos(horarioAbsoluto);
  const novoOffsetSeg = ((absolutoSeg - saidaSeg) % 86400 + 86400) % 86400;

  // Conjunto de âncoras atual (offsets em segundos), sempre com a 1ª parada em 0
  // e SEM a parada que está sendo editada — para checar a monotonicidade dela.
  const ancorasSemEditada = montarAncoras(viagem, ancorasAtuais, paradaOrdem);
  if (offsetForaDeOrdem(ancorasSemEditada, paradaOrdem, novoOffsetSeg)) {
    return { ok: false, motivo: "fora-de-ordem" };
  }

  const ancorasComEditada = new Map(ancorasSemEditada).set(paradaOrdem, novoOffsetSeg);
  const horarios = recomputarOffsetsComAncoras(
    itinerario.paradas,
    itinerario.rota.trechos,
    ancorasComEditada,
  );
  const ancoras = [...new Set([...ancorasAtuais, paradaOrdem])].sort((a, b) => a - b);
  return { ok: true, viagem: { ...viagem, horarios_paradas: horarios }, ancoras };
}

/**
 * Reset à sugestão inicial de uma Viagem (Spec 03 §8.3; RN-066): descarta as
 * âncoras manuais e re-deriva todos os offsets pela sugestão inicial (§8.1),
 * preservando `horario_saida`, `dia_semana`, `viagem_feriado` e `uuid`.
 * Idempotente. O descarte das âncoras (estado de sessão) é do chamador.
 */
export function resetarOffsetsViagem(
  viagem: Viagem,
  itinerario: ItinerarioParaSugestao,
): Viagem {
  return {
    ...viagem,
    horarios_paradas: sugerirOffsetsIniciais(itinerario.paradas, itinerario.rota.trechos),
  };
}

/**
 * Reset em lote (Spec 03 §8.3; RN-066): aplica `resetarOffsetsViagem` a todas
 * as Viagens do itinerário (todo o sentido). Escopo "itinerário" da §8.3; a
 * confirmação antes do lote é da UI (Spec 04 §8.2).
 */
export function resetarOffsetsEmLote(itinerario: Itinerario): Itinerario {
  return {
    ...itinerario,
    viagens: itinerario.viagens.map((viagem) => resetarOffsetsViagem(viagem, itinerario)),
  };
}

/**
 * Monta o mapa de âncoras `ordem → offset (s)` a partir dos offsets gravados na
 * Viagem: a primeira parada (sempre âncora, offset 0) mais cada `ordem` de
 * `ancorasManuais`, exceto `excluir` (a parada em edição, cujo offset ainda
 * será validado).
 */
function montarAncoras(
  viagem: Viagem,
  ancorasManuais: readonly number[],
  excluir: number,
): Map<number, number> {
  const offsetPorOrdem = new Map(
    viagem.horarios_paradas.map((h) => [h.parada_ordem, horarioParaSegundos(h.offset_horario)]),
  );
  const primeiraOrdem = Math.min(...viagem.horarios_paradas.map((h) => h.parada_ordem));

  const ancoras = new Map<number, number>();
  ancoras.set(primeiraOrdem, 0);
  for (const ordem of ancorasManuais) {
    if (ordem === excluir) continue;
    const offset = offsetPorOrdem.get(ordem);
    if (offset !== undefined) ancoras.set(ordem, offset);
  }
  return ancoras;
}
