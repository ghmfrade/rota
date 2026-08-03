import {
  DIAS_SEMANA,
  type DocumentoOperacao,
  type Itinerario,
  type Secao,
  type Servico,
} from "@/shared/contrato";
// Imports profundos deliberados (mesmo precedente de `modelo-pdf-operacional.ts`):
// os índices de `viagens` e `secoes` reexportam componentes React, e este módulo
// é puro — a tabela horária do PDF não pode arrastar a etapa de edição.
import {
  horarioAbsolutoNaParada,
  linhasSecoes,
  montarBlocosGrade,
  ROTULO_DIA,
  type BlocoGrade,
  type DiaSemana,
} from "@/formulario/viagens/montagem-grade";
import { horarioParaHoraMinuto } from "@/formulario/viagens/horario-relogio";
import { rotuloTabelaExcepcional } from "@/formulario/viagens/tabelas-excepcionais";
import { nomeExibicaoSecao } from "@/formulario/secoes/fluxos-secao";

// Tabelas horárias do PDF operacional (TASK-034; Spec 04 §13.1 item 5, §13.2,
// §8.1). Módulo PURO: converte as Viagens congeladas na grade Seções × dias
// que o renderizador desenha — sem React, sem canvas, sem OSRM (RN-015,
// NEG-019).
//
// A montagem NÃO é reimplementada aqui: reusa `montarBlocosGrade`,
// `linhasSecoes` e `horarioAbsolutoNaParada` da etapa de edição, para que a
// peça impressa seja exatamente o que a tela mostra (§13.2 — "seguindo o
// esquema da grade de §8"). O que este módulo acrescenta é o recorte das duas
// versões (RN-075) e o descarte da célula "criável", que é affordance de
// edição e não existe em papel.
//
// Uma grade por dimensão de Viagem (RN-061/RN-099): comum, feriado e uma por
// Tabela excepcional do Serviço (DEC-081) — nunca misturadas (§13.3).

/** Colunas da grade, na ordem da spec (§8.1): SEG…DOM. */
export const COLUNAS_DIAS: readonly string[] = DIAS_SEMANA.map(
  (dia) => ROTULO_DIA[dia],
);

/** Célula sem Viagem naquela posição ordinal do dia (§8.1). */
export const CELULA_SEM_VIAGEM = "—";

/**
 * As duas versões do §13.2. A **simples** vai no corpo (item 5) e mostra só o
 * horário de saída de cada Viagem — o mesmo recorte do modo compacto da tela
 * (DEC-086); a **detalhada** vai no anexo técnico (item 8a) com todos os
 * horários passantes pelas Seções. Nenhuma das duas mostra Locais (RN-075/076).
 */
export type VersaoTabelaHoraria = "simples" | "detalhada";

/** Uma linha de Seção dentro de um bloco: o rótulo e os 7 horários do dia. */
export interface LinhaTabelaHoraria {
  /** `Cidade - Nome da Seção` (RN-076). */
  secao: string;
  /** Um por dia, na ordem de `COLUNAS_DIAS`; `—` quando não há Viagem (§8.1). */
  horarios: string[];
}

/**
 * Um bloco é uma **posição ordinal** de partida no dia (§8.1) — nunca uma
 * entidade. Blocos sem nenhuma Viagem não são impressos: a célula "criável" da
 * tela não tem sentido em papel.
 */
export interface BlocoTabelaHoraria {
  linhas: LinhaTabelaHoraria[];
}

/** Identificação da grade a que as Viagens pertencem (RN-061/RN-099). */
export type TipoGradeHoraria = "comum" | "feriado" | "excepcional";

/** Nota das grades que ficam fora da semana padrão (RN-069; §8.4/§8.5). */
export const NOTA_FORA_DAS_CONTAGENS =
  "Esta grade não entra nas contagens da semana padrão.";

/** Texto impresso no lugar da grade quando ela não tem Viagem (RN-071). */
export const AVISO_GRADE_VAZIA = "Sem viagens nesta grade.";

export interface GradeHorariaPdf {
  tipo: TipoGradeHoraria;
  /** `uuid` da Tabela excepcional; ausente nas grades comum e de feriado. */
  tabelaExcepcionalUuid?: string;
  rotulo: string;
  /** Presente só em feriado/excepcional — a grade comum É a semana padrão. */
  notaForaDasContagens?: string;
  blocos: BlocoTabelaHoraria[];
  vazia: boolean;
}

/** Um Serviço/sentido com todas as suas grades (§13.2). */
export interface TabelaHorariaPdf {
  servicoUuid: string;
  numeroN: string;
  sentido: Itinerario["sentido"];
  /** `Serviço 0000-NXX — Ida` (mesmo título do bloco de itinerário). */
  titulo: string;
  versao: VersaoTabelaHoraria;
  colunas: readonly string[];
  grades: GradeHorariaPdf[];
}

const ROTULO_SENTIDO: Record<Itinerario["sentido"], string> = {
  ida: "Ida",
  volta: "Volta",
};

/** Rótulo de cada grade (§8.1/§8.4/§8.5). */
export const ROTULO_GRADE_COMUM = "Dias comuns";
export const ROTULO_GRADE_FERIADO = "Feriados";

interface EscopoGrade {
  tipo: TipoGradeHoraria;
  rotulo: string;
  viagem_feriado: boolean;
  tabela_excepcional_uuid: string | null;
}

/**
 * As grades de um Serviço, na ordem de impressão: comum, feriados e cada
 * Tabela excepcional na ordem de `tabelas_excepcionais[]`. A ordem entre as
 * excepcionais não é fixada pela spec — segue a do documento, que é a de
 * criação (inferência controlada da TASK-034).
 */
function escoposDoServico(servico: Servico): EscopoGrade[] {
  return [
    {
      tipo: "comum",
      rotulo: ROTULO_GRADE_COMUM,
      viagem_feriado: false,
      tabela_excepcional_uuid: null,
    },
    {
      tipo: "feriado",
      rotulo: ROTULO_GRADE_FERIADO,
      viagem_feriado: true,
      tabela_excepcional_uuid: null,
    },
    ...(servico.tabelas_excepcionais ?? []).map((tabela) => ({
      tipo: "excepcional" as const,
      rotulo: rotuloTabelaExcepcional(tabela),
      viagem_feriado: false,
      tabela_excepcional_uuid: tabela.uuid,
    })),
  ];
}

/**
 * Converte um bloco da montagem da tela numa linha por Seção visível. Devolve
 * `undefined` para o bloco sem nenhuma Viagem — na tela ele é a célula
 * "criável" (Spec 04 §8.2), no papel seria uma faixa de traços sem informação.
 */
function blocoImprimivel(
  bloco: BlocoGrade,
  paradasVisiveis: { ordem: number; secao: string }[],
): BlocoTabelaHoraria | undefined {
  const dias = DIAS_SEMANA as readonly DiaSemana[];
  if (dias.every((dia) => bloco[dia].estado !== "existente")) return undefined;

  return {
    linhas: paradasVisiveis.map((parada) => ({
      secao: parada.secao,
      horarios: dias.map((dia) => {
        const celula = bloco[dia];
        if (celula.estado !== "existente") return CELULA_SEM_VIAGEM;
        const absoluto = horarioAbsolutoNaParada(celula.viagem, parada.ordem);
        // §8.1 — exibição em HH:MM (o JSON guarda HH:MM:SS). O horário é
        // sempre ABSOLUTO (`horario_saida + offset_horario`): o offset em si
        // nunca aparece no PDF (RN-076/RN-067).
        return absoluto === undefined
          ? CELULA_SEM_VIAGEM
          : horarioParaHoraMinuto(absoluto);
      }),
    })),
  };
}

/**
 * Tabela horária de um Serviço/sentido, na versão pedida (RN-075). A versão
 * simples mantém só a Seção de partida de cada bloco — o recorte que a
 * DEC-086 identificou com a "versão simples" do §13.2 —, e a detalhada mantém
 * todas as Seções. Locais nunca entram: `linhasSecoes` já os filtra (§8.1).
 */
export function montarTabelaHoraria(
  servico: Servico,
  itinerario: Itinerario,
  secoes: readonly Secao[],
  versao: VersaoTabelaHoraria,
): TabelaHorariaPdf {
  const secoesPorUuid = new Map(secoes.map((secao) => [secao.uuid, secao]));
  const paradasVisiveis = linhasSecoes(itinerario.paradas, versao === "simples")
    .map((parada) => {
      const secao = secoesPorUuid.get(parada.secao_uuid as string);
      return secao === undefined
        ? undefined
        : { ordem: parada.ordem, secao: nomeExibicaoSecao(secao) };
    })
    // Parada apontando para Seção inexistente é ignorada por inteiro, como já
    // fazem `sequenciaDeSecoes` e `numerarItinerario`.
    .filter((linha): linha is { ordem: number; secao: string } => linha !== undefined);

  const grades = escoposDoServico(servico).map((escopo) => {
    const blocos = montarBlocosGrade(itinerario.viagens, {
      viagem_feriado: escopo.viagem_feriado,
      tabela_excepcional_uuid: escopo.tabela_excepcional_uuid,
    })
      .map((bloco) => blocoImprimivel(bloco, paradasVisiveis))
      .filter((bloco): bloco is BlocoTabelaHoraria => bloco !== undefined);

    return {
      tipo: escopo.tipo,
      ...(escopo.tabela_excepcional_uuid !== null
        ? { tabelaExcepcionalUuid: escopo.tabela_excepcional_uuid }
        : {}),
      rotulo: escopo.rotulo,
      ...(escopo.tipo === "comum"
        ? {}
        : { notaForaDasContagens: NOTA_FORA_DAS_CONTAGENS }),
      blocos,
      vazia: blocos.length === 0,
    };
  });

  return {
    servicoUuid: servico.uuid,
    numeroN: servico.numero_n,
    sentido: itinerario.sentido,
    titulo: `Serviço ${servico.numero_n} — ${ROTULO_SENTIDO[itinerario.sentido]}`,
    versao,
    colunas: COLUNAS_DIAS,
    grades,
  };
}

/**
 * Todas as tabelas horárias do documento, por Serviço e sentido (Ida antes de
 * Volta, como nos blocos de itinerário do §13.1 item 4).
 */
export function montarTabelasHorarias(
  documento: DocumentoOperacao,
  versao: VersaoTabelaHoraria,
): TabelaHorariaPdf[] {
  const tabelas: TabelaHorariaPdf[] = [];
  for (const servico of documento.autos.servicos) {
    const ordenados = [...servico.itinerarios].sort((a, b) =>
      a.sentido === b.sentido ? 0 : a.sentido === "ida" ? -1 : 1,
    );
    for (const itinerario of ordenados) {
      tabelas.push(
        montarTabelaHoraria(servico, itinerario, documento.autos.secoes, versao),
      );
    }
  }
  return tabelas;
}
