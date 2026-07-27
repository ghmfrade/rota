import { describe, expect, test } from "vitest";
import { DIAS_SEMANA, type Parada, type Viagem } from "@/shared/contrato";
import {
  destinoNavegacaoGrade,
  horarioAbsolutoNaParada,
  linhasSecoes,
  montarBlocosDiasComuns,
  montarBlocosFeriados,
} from "@/formulario/viagens";

// TASK-028 — montagem da grade de dias comuns (Spec 04 §8.1): linhas só de
// Seções (Locais ocultos); blocos por posição ordinal alinhados por dia;
// exatamente uma célula "criável" por dia, logo após a última Viagem
// existente; reforço de horário tolerado (RN-062).

const SECAO_A = "11111111-1111-4111-8111-111111111111";
const SECAO_B = "22222222-2222-4222-8222-222222222222";
const LOCAL_X = "33333333-3333-4333-8333-333333333333";

const PARADAS: Parada[] = [
  { ordem: 1, secao_uuid: SECAO_A },
  { ordem: 2, local_uuid: LOCAL_X },
  { ordem: 3, secao_uuid: SECAO_B },
];

function viagem(
  uuid: string,
  diaSemana: Viagem["dia_semana"],
  horarioSaida: string,
  viagemFeriado = false,
): Viagem {
  return {
    uuid,
    horario_saida: horarioSaida,
    dia_semana: diaSemana,
    viagem_feriado: viagemFeriado,
    tabela_excepcional_uuid: null,
    horarios_paradas: [
      { parada_ordem: 1, offset_horario: "00:00:00" },
      { parada_ordem: 2, offset_horario: "00:10:00" },
      { parada_ordem: 3, offset_horario: "00:20:00" },
    ],
  };
}

describe("linhasSecoes (Spec 04 §8.1)", () => {
  test("Locais comuns não viram linha da grade", () => {
    const linhas = linhasSecoes(PARADAS);
    expect(linhas.map((p) => p.ordem)).toEqual([1, 3]);
    expect(linhas.every((p) => p.secao_uuid !== undefined)).toBe(true);
  });

  test("preserva a ordem do itinerário mesmo com entrada fora de ordem", () => {
    const embaralhadas = [...PARADAS].reverse();
    expect(linhasSecoes(embaralhadas).map((p) => p.ordem)).toEqual([1, 3]);
  });
});

describe("montarBlocosDiasComuns (Spec 04 §8.1/§8.2)", () => {
  test("dia sem nenhuma Viagem: bloco único, célula 'criavel' em todos os dias", () => {
    const blocos = montarBlocosDiasComuns([]);
    expect(blocos).toHaveLength(1);
    for (const dia of DIAS_SEMANA) {
      expect(blocos[0][dia]).toEqual({ estado: "criavel" });
    }
  });

  test("dia com 1 Viagem: bloco0 'existente', bloco1 'criavel'", () => {
    const v = viagem("a1", "segunda", "08:00:00");
    const blocos = montarBlocosDiasComuns([v]);

    expect(blocos).toHaveLength(2);
    expect(blocos[0].segunda).toEqual({ estado: "existente", viagem: v });
    expect(blocos[1].segunda).toEqual({ estado: "criavel" });
  });

  test("dias com contagens diferentes: dia mais cheio dita o total de blocos; dia vazio some 'indisponivel' além de sua própria posição criável", () => {
    const segSab = viagem("a1", "sabado", "11:00:00");
    const segSeg1 = viagem("a2", "segunda", "08:00:00");
    const segSeg2 = viagem("a3", "segunda", "09:00:00");

    const blocos = montarBlocosDiasComuns([segSab, segSeg1, segSeg2]);

    // segunda tem 2 viagens → precisa de 3 blocos (0,1 existentes, 2 criavel)
    expect(blocos).toHaveLength(3);
    expect(blocos[0].segunda).toEqual({ estado: "existente", viagem: segSeg1 });
    expect(blocos[1].segunda).toEqual({ estado: "existente", viagem: segSeg2 });
    expect(blocos[2].segunda).toEqual({ estado: "criavel" });

    // sabado tem 1 viagem → criavel no bloco1; bloco2 fica indisponivel (—)
    expect(blocos[0].sabado).toEqual({ estado: "existente", viagem: segSab });
    expect(blocos[1].sabado).toEqual({ estado: "criavel" });
    expect(blocos[2].sabado).toEqual({ estado: "indisponivel" });

    // domingo (0 viagens) → criavel no bloco0; blocos1/2 indisponivel
    expect(blocos[0].domingo).toEqual({ estado: "criavel" });
    expect(blocos[1].domingo).toEqual({ estado: "indisponivel" });
    expect(blocos[2].domingo).toEqual({ estado: "indisponivel" });
  });

  test("ordena por horario_saida dentro do dia, independente da ordem de entrada", () => {
    const tarde = viagem("a1", "segunda", "14:00:00");
    const manha = viagem("a2", "segunda", "07:00:00");

    const blocos = montarBlocosDiasComuns([tarde, manha]);

    expect(blocos[0].segunda).toEqual({ estado: "existente", viagem: manha });
    expect(blocos[1].segunda).toEqual({ estado: "existente", viagem: tarde });
  });

  test("RN-062 (reforço): duas Viagens no mesmo dia/horário viram duas posições, sem colapsar", () => {
    const a = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const b = viagem("bbbbbbbb-0000-4000-8000-000000000002", "segunda", "08:00:00");

    const blocos = montarBlocosDiasComuns([a, b]);

    expect(blocos).toHaveLength(3);
    expect(blocos[0].segunda.estado).toBe("existente");
    expect(blocos[1].segunda.estado).toBe("existente");
    // Desempate determinístico por uuid — não importa a ordem de entrada.
    expect((blocos[0].segunda as { viagem: Viagem }).viagem.uuid).toBe(a.uuid);
    expect((blocos[1].segunda as { viagem: Viagem }).viagem.uuid).toBe(b.uuid);
  });

  test("[inválido] Viagem de feriado (viagem_feriado=true) não entra na grade de dias comuns (RN-068)", () => {
    const comum = viagem("a1", "segunda", "08:00:00", false);
    const feriado = viagem("a2", "segunda", "09:00:00", true);

    const blocos = montarBlocosDiasComuns([comum, feriado]);

    expect(blocos).toHaveLength(2); // só a comum conta
    expect(blocos[0].segunda).toEqual({ estado: "existente", viagem: comum });
    expect(blocos[1].segunda).toEqual({ estado: "criavel" });
  });
});

describe("montarBlocosFeriados (Spec 04 §8.1/§8.4; RN-068)", () => {
  test("grade de feriados vazia: bloco único, célula 'criavel' em todos os dias (RN-071)", () => {
    const blocos = montarBlocosFeriados([]);
    expect(blocos).toHaveLength(1);
    for (const dia of DIAS_SEMANA) {
      expect(blocos[0][dia]).toEqual({ estado: "criavel" });
    }
  });

  test("monta só as Viagens de feriado, ignorando as comuns (grades independentes — RN-068)", () => {
    const comum = viagem("a1", "segunda", "08:00:00", false);
    const feriado = viagem("a2", "segunda", "09:00:00", true);

    const blocos = montarBlocosFeriados([comum, feriado]);

    expect(blocos).toHaveLength(2); // só a de feriado conta
    expect(blocos[0].segunda).toEqual({ estado: "existente", viagem: feriado });
    expect(blocos[1].segunda).toEqual({ estado: "criavel" });
  });
});

describe("horarioAbsolutoNaParada (RN-067)", () => {
  test("horario_saida + offset_horario da parada", () => {
    const v = viagem("a1", "segunda", "08:00:00");
    expect(horarioAbsolutoNaParada(v, 1)).toBe("08:00:00");
    expect(horarioAbsolutoNaParada(v, 2)).toBe("08:10:00");
    expect(horarioAbsolutoNaParada(v, 3)).toBe("08:20:00");
  });

  test("[inválido] parada_ordem inexistente na Viagem devolve undefined", () => {
    const v = viagem("a1", "segunda", "08:00:00");
    expect(horarioAbsolutoNaParada(v, 99)).toBeUndefined();
  });
});

describe("destinoNavegacaoGrade (TASK-106)", () => {
  const origem = { indiceBloco: 1, indiceSecao: 0, dia: "segunda" as const };

  test("Tab avança para o próximo dia na mesma Seção e bloco", () => {
    expect(destinoNavegacaoGrade(origem, "Tab", 3)).toEqual({
      indiceBloco: 1,
      indiceSecao: 0,
      dia: "terca",
    });
  });

  test("Enter desce para a próxima Seção no mesmo dia e bloco", () => {
    expect(destinoNavegacaoGrade(origem, "Enter", 3)).toEqual({
      indiceBloco: 1,
      indiceSecao: 1,
      dia: "segunda",
    });
  });

  test("[borda] não inventa retorno após domingo ou última Seção", () => {
    expect(
      destinoNavegacaoGrade({ ...origem, dia: "domingo" }, "Tab", 3),
    ).toBeNull();
    expect(
      destinoNavegacaoGrade({ ...origem, indiceSecao: 2 }, "Enter", 3),
    ).toBeNull();
  });
});
