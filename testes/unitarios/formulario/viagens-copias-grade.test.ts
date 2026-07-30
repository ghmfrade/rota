import { describe, expect, test } from "vitest";
import {
  esquemaDocumentoOperacao,
  REGEX_UUID_V4,
  type Itinerario,
  type Viagem,
} from "@/shared/contrato";
import {
  apagarViagem,
  apagarViagensDoDia,
  clonarDiasComunsParaFeriado,
  copiarDiaParaDiasComGuarda,
  copiarViagemParaDiaComGuarda,
  copiarViagemParaDias,
  diaAoLado,
  existeViagemNoHorarioDaGrade,
  semearGradeAPartirDeOutra,
} from "@/formulario/viagens";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-030 — cópias e remoções da grade (Spec 04 §8.3/§8.4): copiar viagem para
// outro dia e "copiar dias comuns" criam entidades novas com UUIDs novas
// (RN-007/005), preservando offsets (RN-063) sem tocar as contagens; grades
// comum e de feriado independentes (RN-068); grade de feriados vazia é válida
// (RN-071); apagar uma Viagem.

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
      { parada_ordem: 2, offset_horario: "00:07:00" }, // âncora manual (não é baseline)
      { parada_ordem: 3, offset_horario: "00:20:00" },
    ],
  };
}

function itinerario(viagens: Viagem[]): Itinerario {
  return {
    sentido: "ida",
    paradas: [
      { ordem: 1, secao_uuid: "11111111-1111-4111-8111-111111111111" },
      { ordem: 2, secao_uuid: "22222222-2222-4222-8222-222222222222" },
      { ordem: 3, secao_uuid: "33333333-3333-4333-8333-333333333333" },
    ],
    rota: {
      geometria: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
      distancia_km: 1,
      duracao_s: 600,
      descricao_itinerario: [],
      trechos: [],
      pontos_de_rota: [],
    },
    viagens,
  } as unknown as Itinerario;
}

describe("copiarViagemParaDias (Spec 04 §8.3; RN-007/061)", () => {
  test("gera UUID nova por dia, ≠ origem, preservando horário/offsets/viagem_feriado e trocando dia_semana", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");

    const copias = copiarViagemParaDias(origem, ["terca", "quarta"]);

    expect(copias).toHaveLength(2); // N dias → N Viagens (RN-061)
    for (const copia of copias) {
      expect(copia.uuid).toMatch(REGEX_UUID_V4);
      expect(copia.uuid).not.toBe(origem.uuid); // RN-007/005
      expect(copia.horario_saida).toBe(origem.horario_saida);
      expect(copia.viagem_feriado).toBe(false);
      expect(copia.horarios_paradas).toEqual(origem.horarios_paradas); // RN-063 preservado
    }
    expect(copias.map((c) => c.dia_semana)).toEqual(["terca", "quarta"]);
    expect(copias[0].uuid).not.toBe(copias[1].uuid); // UUIDs distintas entre si
  });

  test("preserva viagem_feriado da origem (cópia dentro da grade de origem)", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00", true);
    const [copia] = copiarViagemParaDias(origem, ["terca"]);
    expect(copia.viagem_feriado).toBe(true);
  });

  test("cópia é objeto independente — mutar horarios_paradas da cópia não afeta a origem", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const [copia] = copiarViagemParaDias(origem, ["terca"]);
    copia.horarios_paradas[1].offset_horario = "00:99:99";
    expect(origem.horarios_paradas[1].offset_horario).toBe("00:07:00");
  });

  test("copiar para o mesmo dia da origem é reforço válido (RN-062), com UUID nova", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const [copia] = copiarViagemParaDias(origem, ["segunda"]);
    expect(copia.dia_semana).toBe("segunda");
    expect(copia.uuid).not.toBe(origem.uuid);
  });

  test("[inválido] lista de dias vazia → nenhuma Viagem", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    expect(copiarViagemParaDias(origem, [])).toEqual([]);
  });
});

describe("cópia unitária com guarda (DEC-084/092; RN-062)", () => {
  test("DEC-084/094: critério compartilhado compara dia, horário e a grade excepcional exata", () => {
    const tabelaA = "11111111-1111-4111-8111-111111111111";
    const tabelaB = "22222222-2222-4222-8222-222222222222";
    const existente = viagem(
      "aaaaaaaa-0000-4000-8000-000000000001",
      "segunda",
      "08:00:00",
    );
    existente.tabela_excepcional_uuid = tabelaA;
    existente.horarios_paradas[1].offset_horario = "00:59:00";

    expect(
      existeViagemNoHorarioDaGrade([existente], "segunda", "08:00:00", {
        viagem_feriado: false,
        tabela_excepcional_uuid: tabelaA,
      }),
    ).toBe(true);
    expect(
      existeViagemNoHorarioDaGrade([existente], "terca", "08:00:00", {
        viagem_feriado: false,
        tabela_excepcional_uuid: tabelaA,
      }),
    ).toBe(false);
    expect(
      existeViagemNoHorarioDaGrade([existente], "segunda", "08:00:00", {
        viagem_feriado: false,
        tabela_excepcional_uuid: tabelaB,
      }),
    ).toBe(false);
    expect(
      existeViagemNoHorarioDaGrade([existente], "segunda", "08:00:00", {
        viagem_feriado: true,
        tabela_excepcional_uuid: null,
      }),
    ).toBe(false);
  });

  test("copia para dia arbitrário, preserva a origem e normaliza a grade destino", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const resultado = copiarViagemParaDiaComGuarda(itinerario([origem]), origem.uuid, "quinta", {
      viagem_feriado: true,
      tabela_excepcional_uuid: null,
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.copia.uuid).not.toBe(origem.uuid);
    expect(resultado.copia.dia_semana).toBe("quinta");
    expect(resultado.copia.viagem_feriado).toBe(true);
    expect(resultado.copia.tabela_excepcional_uuid).toBeNull();
    expect(resultado.copia.horarios_paradas).toEqual(origem.horarios_paradas);
    expect(origem.dia_semana).toBe("segunda");
  });

  test("[inválido] recusa somente o gesto quando já há horário na mesma grade, ignorando offsets", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const destino = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "08:00:00");
    destino.horarios_paradas[1].offset_horario = "00:12:00";
    const resultado = copiarViagemParaDiaComGuarda(itinerario([origem, destino]), origem.uuid, "terca", {
      viagem_feriado: false,
      tabela_excepcional_uuid: null,
    });
    expect(resultado).toEqual({ ok: false, motivo: "horario-existente" });
    expect(destino.uuid).toBe("bbbbbbbb-0000-4000-8000-000000000002");
  });

  test("[inválido] própria coluna cancela; mesmo horário em outra grade não bloqueia", () => {
    const origem = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const feriado = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "08:00:00", true);
    const it = itinerario([origem, feriado]);
    expect(
      copiarViagemParaDiaComGuarda(it, origem.uuid, "segunda", {
        viagem_feriado: false,
        tabela_excepcional_uuid: null,
      }),
    ).toEqual({ ok: false, motivo: "mesma-coluna" });
    expect(
      copiarViagemParaDiaComGuarda(it, origem.uuid, "terca", {
        viagem_feriado: false,
        tabela_excepcional_uuid: null,
      }).ok,
    ).toBe(true);
  });

  test("atalhos resolvem somente vizinhos, sem wrap SEG↔DOM", () => {
    expect(diaAoLado("segunda", -1)).toBeNull();
    expect(diaAoLado("domingo", 1)).toBeNull();
    expect(diaAoLado("quarta", -1)).toBe("terca");
    expect(diaAoLado("quarta", 1)).toBe("quinta");
  });
});
describe("clonarDiasComunsParaFeriado (Spec 04 §8.4; RN-007/068)", () => {
  test("clona todas as comuns como feriado com UUIDs novas, sem tocar as comuns", () => {
    const c1 = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const c2 = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "09:00:00");
    const it = itinerario([c1, c2]);

    const resultado = clonarDiasComunsParaFeriado(it, "sobrescrever");

    const comuns = resultado.viagens.filter((v) => !v.viagem_feriado);
    const feriados = resultado.viagens.filter((v) => v.viagem_feriado);
    expect(comuns).toEqual([c1, c2]); // comuns intocadas
    expect(feriados).toHaveLength(2);
    for (const f of feriados) {
      expect(f.uuid).toMatch(REGEX_UUID_V4);
      expect([c1.uuid, c2.uuid]).not.toContain(f.uuid); // RN-007
    }
    // Pareamento por dia/horário/offsets, identidade nova (RN-068)
    expect(feriados.map((f) => f.dia_semana).sort()).toEqual(["segunda", "terca"]);
    expect(feriados.every((f) => f.horarios_paradas.length === 3)).toBe(true); // RN-063
  });

  test("sobrescrever descarta as Viagens de feriado existentes", () => {
    const comum = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const feriadoAntigo = viagem("cccccccc-0000-4000-8000-000000000003", "domingo", "07:00:00", true);
    const it = itinerario([comum, feriadoAntigo]);

    const resultado = clonarDiasComunsParaFeriado(it, "sobrescrever");

    const feriados = resultado.viagens.filter((v) => v.viagem_feriado);
    expect(feriados).toHaveLength(1);
    expect(feriados[0].uuid).not.toBe(feriadoAntigo.uuid);
    expect(feriados[0].dia_semana).toBe("segunda"); // clone da comum, não o antigo
  });

  test("mesclar sincroniza a grade: remove ausentes e cria faltantes (DEC-087)", () => {
    const comum = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const feriadoAntigo = viagem("cccccccc-0000-4000-8000-000000000003", "domingo", "07:00:00", true);
    const it = itinerario([comum, feriadoAntigo]);

    const resultado = clonarDiasComunsParaFeriado(it, "mesclar");

    const feriados = resultado.viagens.filter((v) => v.viagem_feriado);
    expect(feriados).toHaveLength(1);
    expect(feriados[0].dia_semana).toBe("segunda");
    expect(feriados[0].uuid).not.toBe(feriadoAntigo.uuid);
  });

  test("grade comum vazia: sobrescrever e mesclar esvaziam o destino (DEC-087/RN-071)", () => {
    const feriadoAntigo = viagem("cccccccc-0000-4000-8000-000000000003", "domingo", "07:00:00", true);
    const it = itinerario([feriadoAntigo]);

    expect(clonarDiasComunsParaFeriado(it, "sobrescrever").viagens).toEqual([]);
    expect(clonarDiasComunsParaFeriado(it, "mesclar").viagens).toEqual([]);
  });
});

describe("semearGradeAPartirDeOutra (TASK-105; Spec 04 §8.5; DEC-087)", () => {
  const tabelaUuid = "dddddddd-0000-4000-8000-000000000004";
  const comum = { viagem_feriado: false, tabela_excepcional_uuid: null };
  const excepcional = {
    viagem_feriado: false,
    tabela_excepcional_uuid: tabelaUuid,
  };

  test("destino vazio cria Viagens excepcionais independentes com UUIDs novas", () => {
    const origem = viagem(
      "aaaaaaaa-0000-4000-8000-000000000001",
      "segunda",
      "08:00:00",
    );

    const resultado = semearGradeAPartirDeOutra(
      itinerario([origem]),
      comum,
      excepcional,
      "sobrescrever",
    );
    const [copia] = resultado.viagens.filter(
      (item) => item.tabela_excepcional_uuid === tabelaUuid,
    );

    expect(copia.uuid).toMatch(REGEX_UUID_V4);
    expect(copia.uuid).not.toBe(origem.uuid);
    expect(copia.viagem_feriado).toBe(false);
    expect(copia.horarios_paradas).toEqual(origem.horarios_paradas);
    expect(resultado.viagens).toContain(origem);
  });

  test("mesclar preserva UUID casada, atualiza offsets, remove ausente e cria faltante", () => {
    const origemCasada = viagem(
      "aaaaaaaa-0000-4000-8000-000000000001",
      "segunda",
      "08:00:00",
    );
    origemCasada.horarios_paradas[1].offset_horario = "00:12:00";
    const origemNova = viagem(
      "bbbbbbbb-0000-4000-8000-000000000002",
      "terca",
      "09:00:00",
    );
    const destinoCasado = viagem(
      "cccccccc-0000-4000-8000-000000000003",
      "segunda",
      "08:00:00",
    );
    destinoCasado.tabela_excepcional_uuid = tabelaUuid;
    const destinoAusente = viagem(
      "dddddddd-0000-4000-8000-000000000005",
      "domingo",
      "07:00:00",
    );
    destinoAusente.tabela_excepcional_uuid = tabelaUuid;

    const resultado = semearGradeAPartirDeOutra(
      itinerario([
        origemCasada,
        origemNova,
        destinoCasado,
        destinoAusente,
      ]),
      comum,
      excepcional,
      "mesclar",
    );
    const destino = resultado.viagens.filter(
      (item) => item.tabela_excepcional_uuid === tabelaUuid,
    );

    expect(destino).toHaveLength(2);
    const casada = destino.find((item) => item.horario_saida === "08:00:00")!;
    const nova = destino.find((item) => item.horario_saida === "09:00:00")!;
    expect(casada.uuid).toBe(destinoCasado.uuid);
    expect(casada.horarios_paradas).toEqual(origemCasada.horarios_paradas);
    expect(destino.some((item) => item.uuid === destinoAusente.uuid)).toBe(false);
    expect(nova.uuid).not.toBe(origemNova.uuid);
    expect(nova.uuid).toMatch(REGEX_UUID_V4);
  });

  test("RN-062: reforços são casados por contagem e preservam tantas UUIDs quanto coincidirem", () => {
    const origemA = viagem(
      "aaaaaaaa-0000-4000-8000-000000000001",
      "segunda",
      "08:00:00",
    );
    const origemB = viagem(
      "bbbbbbbb-0000-4000-8000-000000000002",
      "segunda",
      "08:00:00",
    );
    origemB.horarios_paradas[1].offset_horario = "00:15:00";
    const destinoExistente = viagem(
      "cccccccc-0000-4000-8000-000000000003",
      "segunda",
      "08:00:00",
    );
    destinoExistente.tabela_excepcional_uuid = tabelaUuid;

    const resultado = semearGradeAPartirDeOutra(
      itinerario([origemA, origemB, destinoExistente]),
      comum,
      excepcional,
      "mesclar",
    );
    const destino = resultado.viagens.filter(
      (item) => item.tabela_excepcional_uuid === tabelaUuid,
    );

    expect(destino).toHaveLength(2);
    expect(destino.filter((item) => item.uuid === destinoExistente.uuid)).toHaveLength(1);
    expect(new Set(destino.map((item) => item.uuid)).size).toBe(2);
    expect(
      destino
        .map((item) => item.horarios_paradas[1].offset_horario)
        .sort(),
    ).toEqual(["00:07:00", "00:15:00"]);
  });

  test("[inválido] não mistura outra Tabela excepcional nem a grade de feriados", () => {
    const outraTabelaUuid = "eeeeeeee-0000-4000-8000-000000000005";
    const origem = viagem(
      "aaaaaaaa-0000-4000-8000-000000000001",
      "segunda",
      "08:00:00",
    );
    const outraExcepcional = viagem(
      "bbbbbbbb-0000-4000-8000-000000000002",
      "terca",
      "09:00:00",
    );
    outraExcepcional.tabela_excepcional_uuid = outraTabelaUuid;
    const feriado = viagem(
      "cccccccc-0000-4000-8000-000000000003",
      "quarta",
      "10:00:00",
      true,
    );

    const resultado = semearGradeAPartirDeOutra(
      itinerario([origem, outraExcepcional, feriado]),
      comum,
      excepcional,
      "sobrescrever",
    );

    expect(resultado.viagens).toContain(outraExcepcional);
    expect(resultado.viagens).toContain(feriado);
    expect(
      resultado.viagens.filter(
        (item) => item.tabela_excepcional_uuid === tabelaUuid,
      ),
    ).toHaveLength(1);
  });

  test("round-trip do contrato preserva as UUIDs resultantes da cópia (RN-004/007)", () => {
    const documento = documentoExemploMinimo();
    documento.versao_schema = "1.1";
    const servico = documento.autos.servicos[0];
    servico.tabelas_excepcionais = [
      { uuid: tabelaUuid, tipo: "ferias_verao" },
    ];
    const itinerarioOrigem = servico.itinerarios[0];
    itinerarioOrigem.viagens = itinerarioOrigem.viagens.map((item) => ({
      ...item,
      tabela_excepcional_uuid: null,
    }));
    servico.itinerarios[0] = semearGradeAPartirDeOutra(
      itinerarioOrigem,
      comum,
      excepcional,
      "sobrescrever",
    );
    const uuidsAntes = servico.itinerarios[0].viagens
      .filter((item) => item.tabela_excepcional_uuid === tabelaUuid)
      .map((item) => item.uuid)
      .sort();

    const reimportado = esquemaDocumentoOperacao.parse(
      JSON.parse(JSON.stringify(documento)),
    );
    const uuidsDepois = reimportado.autos.servicos[0].itinerarios[0].viagens
      .filter((item) => item.tabela_excepcional_uuid === tabelaUuid)
      .map((item) => item.uuid)
      .sort();

    expect(uuidsDepois).toEqual(uuidsAntes);
  });
});

describe("TASK-112 — origem estendida e normalização entre grades", () => {
  const tabelaAUuid = "dddddddd-0000-4000-8000-000000000004";
  const tabelaBUuid = "eeeeeeee-0000-4000-8000-000000000005";
  const feriados = { viagem_feriado: true, tabela_excepcional_uuid: null };
  const excepcionalA = {
    viagem_feriado: false,
    tabela_excepcional_uuid: tabelaAUuid,
  };
  const excepcionalB = {
    viagem_feriado: false,
    tabela_excepcional_uuid: tabelaBUuid,
  };

  test.each([
    {
      nome: "feriados → excepcional",
      origem: feriados,
      destino: excepcionalA,
      viagemFeriadoOrigem: true,
      tabelaOrigem: null,
      viagemFeriadoDestino: false,
      tabelaDestino: tabelaAUuid,
    },
    {
      nome: "excepcional → feriados",
      origem: excepcionalA,
      destino: feriados,
      viagemFeriadoOrigem: false,
      tabelaOrigem: tabelaAUuid,
      viagemFeriadoDestino: true,
      tabelaDestino: null,
    },
    {
      nome: "excepcional A → excepcional B",
      origem: excepcionalA,
      destino: excepcionalB,
      viagemFeriadoOrigem: false,
      tabelaOrigem: tabelaAUuid,
      viagemFeriadoDestino: false,
      tabelaDestino: tabelaBUuid,
    },
  ])(
    "$nome normaliza os discriminadores e cria UUID nova no destino vazio",
    ({
      origem,
      destino,
      viagemFeriadoOrigem,
      tabelaOrigem,
      viagemFeriadoDestino,
      tabelaDestino,
    }) => {
      const viagemOrigem = viagem(
        "aaaaaaaa-0000-4000-8000-000000000001",
        "segunda",
        "08:00:00",
        viagemFeriadoOrigem,
      );
      viagemOrigem.tabela_excepcional_uuid = tabelaOrigem;

      const resultado = semearGradeAPartirDeOutra(
        itinerario([viagemOrigem]),
        origem,
        destino,
        "sobrescrever",
      );
      const copia = resultado.viagens.find(
        (item) =>
          item.uuid !== viagemOrigem.uuid &&
          item.viagem_feriado === viagemFeriadoDestino &&
          (item.tabela_excepcional_uuid ?? null) === tabelaDestino,
      );

      expect(copia).toBeDefined();
      expect(copia!.uuid).toMatch(REGEX_UUID_V4);
      expect(copia!.uuid).not.toBe(viagemOrigem.uuid);
      expect(copia!.horarios_paradas).toEqual(
        viagemOrigem.horarios_paradas,
      );
      expect(
        resultado.viagens.some(
          (item) =>
            item.tabela_excepcional_uuid !== null &&
            item.viagem_feriado,
        ),
      ).toBe(false);
    },
  );

  test("mescla excepcional → feriados preserva UUID casada, atualiza offsets e mantém grades alheias", () => {
    const origemCasada = viagem(
      "aaaaaaaa-0000-4000-8000-000000000001",
      "segunda",
      "08:00:00",
    );
    origemCasada.tabela_excepcional_uuid = tabelaAUuid;
    origemCasada.horarios_paradas[1].offset_horario = "00:19:00";
    const origemNova = viagem(
      "bbbbbbbb-0000-4000-8000-000000000002",
      "terca",
      "09:00:00",
    );
    origemNova.tabela_excepcional_uuid = tabelaAUuid;
    const feriadoCasado = viagem(
      "cccccccc-0000-4000-8000-000000000003",
      "segunda",
      "08:00:00",
      true,
    );
    const feriadoAusente = viagem(
      "dddddddd-0000-4000-8000-000000000006",
      "domingo",
      "07:00:00",
      true,
    );
    const comumIntacta = viagem(
      "eeeeeeee-0000-4000-8000-000000000007",
      "quarta",
      "10:00:00",
    );

    const resultado = semearGradeAPartirDeOutra(
      itinerario([
        origemCasada,
        origemNova,
        feriadoCasado,
        feriadoAusente,
        comumIntacta,
      ]),
      excepcionalA,
      feriados,
      "mesclar",
    );
    const destino = resultado.viagens.filter(
      (item) => item.viagem_feriado,
    );
    const casada = destino.find(
      (item) => item.horario_saida === "08:00:00",
    )!;
    const nova = destino.find(
      (item) => item.horario_saida === "09:00:00",
    )!;

    expect(destino).toHaveLength(2);
    expect(casada.uuid).toBe(feriadoCasado.uuid);
    expect(casada.horarios_paradas).toEqual(
      origemCasada.horarios_paradas,
    );
    expect(destino.some((item) => item.uuid === feriadoAusente.uuid)).toBe(
      false,
    );
    expect(nova.uuid).toMatch(REGEX_UUID_V4);
    expect(nova.uuid).not.toBe(origemNova.uuid);
    expect(resultado.viagens).toContain(comumIntacta);
    expect(resultado.viagens).toContain(origemCasada);
    expect(resultado.viagens).toContain(origemNova);
  });

  test("[inválido] sobrescrever nunca reutiliza UUID da origem nem do destino anterior", () => {
    const origem = viagem(
      "aaaaaaaa-0000-4000-8000-000000000001",
      "segunda",
      "08:00:00",
      true,
    );
    const destinoAnterior = viagem(
      "bbbbbbbb-0000-4000-8000-000000000002",
      "terca",
      "09:00:00",
    );
    destinoAnterior.tabela_excepcional_uuid = tabelaAUuid;

    const resultado = semearGradeAPartirDeOutra(
      itinerario([origem, destinoAnterior]),
      feriados,
      excepcionalA,
      "sobrescrever",
    );
    const [copia] = resultado.viagens.filter(
      (item) => item.tabela_excepcional_uuid === tabelaAUuid,
    );

    expect(copia.uuid).toMatch(REGEX_UUID_V4);
    expect(copia.uuid).not.toBe(origem.uuid);
    expect(copia.uuid).not.toBe(destinoAnterior.uuid);
  });

  test("round-trip preserva identidade casada e o invariante RN-099", () => {
    const documento = documentoExemploMinimo();
    documento.versao_schema = "1.1";
    const servico = documento.autos.servicos[0];
    servico.tabelas_excepcionais = [
      { uuid: tabelaAUuid, tipo: "ferias_verao" },
    ];
    const itinerarioAlvo = servico.itinerarios[0];
    const origem = itinerarioAlvo.viagens[0];
    origem.viagem_feriado = true;
    origem.tabela_excepcional_uuid = null;
    const destinoCasado = {
      ...origem,
      uuid: "ffffffff-0000-4000-8000-000000000008",
      viagem_feriado: false,
      tabela_excepcional_uuid: tabelaAUuid,
      horarios_paradas: origem.horarios_paradas.map((horario) => ({
        ...horario,
      })),
    };
    itinerarioAlvo.viagens = [origem, destinoCasado];
    servico.itinerarios[0] = semearGradeAPartirDeOutra(
      itinerarioAlvo,
      feriados,
      excepcionalA,
      "mesclar",
    );

    const reimportado = esquemaDocumentoOperacao.parse(
      JSON.parse(JSON.stringify(documento)),
    );
    const viagensReimportadas =
      reimportado.autos.servicos[0].itinerarios[0].viagens;
    const excepcionalReimportada = viagensReimportadas.find(
      (item) => item.tabela_excepcional_uuid === tabelaAUuid,
    )!;

    expect(excepcionalReimportada.uuid).toBe(destinoCasado.uuid);
    expect(excepcionalReimportada.viagem_feriado).toBe(false);
    expect(
      viagensReimportadas.some(
        (item) =>
          item.tabela_excepcional_uuid !== null && item.viagem_feriado,
      ),
    ).toBe(false);
  });
});

describe("apagarViagem (Spec 04 §8.3)", () => {
  test("remove só a Viagem de uuid dado", () => {
    const a = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const b = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "09:00:00");
    const resultado = apagarViagem(itinerario([a, b]), a.uuid);
    expect(resultado.viagens).toEqual([b]);
  });

  test("[inválido] uuid inexistente → itinerário inalterado", () => {
    const a = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const it = itinerario([a]);
    expect(apagarViagem(it, "zzzzzzzz-0000-4000-8000-000000000009").viagens).toEqual([a]);
  });
});

describe("operações de dia inteiro (DEC-085; RN-007/061/062)", () => {
  test("copia todas as Viagens da coluna para vários destinos com UUIDs novas", () => {
    const origem08 = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const origem09 = viagem("bbbbbbbb-0000-4000-8000-000000000002", "segunda", "09:00:00");

    const resultado = copiarDiaParaDiasComGuarda(
      itinerario([origem08, origem09]),
      "segunda",
      ["sabado", "domingo"],
      { viagem_feriado: false, tabela_excepcional_uuid: null },
    );

    expect(resultado.copias).toHaveLength(4);
    expect(resultado.horariosIgnorados).toBe(0);
    expect(resultado.itinerario.viagens).toHaveLength(6);
    expect(resultado.copias.every((copia) => copia.uuid !== origem08.uuid && copia.uuid !== origem09.uuid)).toBe(true);
    expect(new Set(resultado.copias.map((copia) => copia.uuid)).size).toBe(4);
    expect(resultado.copias.map((copia) => `${copia.dia_semana}:${copia.horario_saida}`).sort()).toEqual([
      "domingo:08:00:00",
      "domingo:09:00:00",
      "sabado:08:00:00",
      "sabado:09:00:00",
    ]);
    expect(resultado.copias.every((copia) => copia.horarios_paradas[1].offset_horario === "00:07:00")).toBe(true);
  });

  test("preserva todos os reforços da origem no mesmo horário quando o destino estava vazio", () => {
    const origem08 = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const reforco08 = viagem("bbbbbbbb-0000-4000-8000-000000000002", "segunda", "08:00:00");
    reforco08.horarios_paradas[1].offset_horario = "00:12:00";

    const resultado = copiarDiaParaDiasComGuarda(
      itinerario([origem08, reforco08]),
      "segunda",
      ["sabado"],
      { viagem_feriado: false, tabela_excepcional_uuid: null },
    );

    expect(resultado.copias).toHaveLength(2);
    expect(resultado.horariosIgnorados).toBe(0);
    expect(new Set(resultado.copias.map((copia) => copia.uuid)).size).toBe(2);
    expect(resultado.copias.every((copia) => copia.horario_saida === "08:00:00")).toBe(true);
    expect(
      resultado.copias
        .map((copia) => copia.horarios_paradas[1].offset_horario)
        .sort(),
    ).toEqual(["00:07:00", "00:12:00"]);
  });

  test("mescla sem substituir e avisa as cópias bloqueadas pela guarda da mesma grade", () => {
    const origem08 = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const origem09 = viagem("bbbbbbbb-0000-4000-8000-000000000002", "segunda", "09:00:00");
    const existente = viagem("cccccccc-0000-4000-8000-000000000003", "sabado", "08:00:00");
    existente.horarios_paradas[1].offset_horario = "00:15:00";

    const resultado = copiarDiaParaDiasComGuarda(
      itinerario([origem08, origem09, existente]),
      "segunda",
      ["sabado"],
      { viagem_feriado: false, tabela_excepcional_uuid: null },
    );

    expect(resultado.copias).toHaveLength(1);
    expect(resultado.copias[0].horario_saida).toBe("09:00:00");
    expect(resultado.horariosIgnorados).toBe(1);
    expect(resultado.itinerario.viagens.find((item) => item.uuid === existente.uuid)).toEqual(existente);
  });

  test("[inválido] destino preexistente bloqueia todos os reforços da origem naquele horário", () => {
    const origem08 = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const reforco08 = viagem("bbbbbbbb-0000-4000-8000-000000000002", "segunda", "08:00:00");
    const existente = viagem("cccccccc-0000-4000-8000-000000000003", "sabado", "08:00:00");
    const it = itinerario([origem08, reforco08, existente]);

    const resultado = copiarDiaParaDiasComGuarda(
      it,
      "segunda",
      ["sabado"],
      { viagem_feriado: false, tabela_excepcional_uuid: null },
    );

    expect(resultado.copias).toEqual([]);
    expect(resultado.horariosIgnorados).toBe(2);
    expect(resultado.itinerario).toEqual(it);
  });

  test("[inválido] não copia para a origem, ignora lista vazia e não confunde outra grade", () => {
    const comum = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const feriado = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "08:00:00", true);
    const it = itinerario([comum, feriado]);

    expect(
      copiarDiaParaDiasComGuarda(it, "segunda", [], {
        viagem_feriado: false,
        tabela_excepcional_uuid: null,
      }),
    ).toEqual({ itinerario: it, copias: [], horariosIgnorados: 0 });
    const resultado = copiarDiaParaDiasComGuarda(it, "segunda", ["segunda", "terca"], {
      viagem_feriado: false,
      tabela_excepcional_uuid: null,
    });
    expect(resultado.copias).toHaveLength(1);
    expect(resultado.horariosIgnorados).toBe(0);
  });

  test("apaga somente as Viagens do dia e da grade informados", () => {
    const comumSeg = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const comumTer = viagem("bbbbbbbb-0000-4000-8000-000000000002", "terca", "08:00:00");
    const feriadoSeg = viagem("cccccccc-0000-4000-8000-000000000003", "segunda", "08:00:00", true);
    const it = itinerario([comumSeg, comumTer, feriadoSeg]);

    expect(
      apagarViagensDoDia(it, "segunda", {
        viagem_feriado: false,
        tabela_excepcional_uuid: null,
      }).viagens,
    ).toEqual([comumTer, feriadoSeg]);
  });

  test("[inválido] apagar dia sem Viagens é um no-op", () => {
    const comum = viagem("aaaaaaaa-0000-4000-8000-000000000001", "segunda", "08:00:00");
    const it = itinerario([comum]);
    expect(
      apagarViagensDoDia(it, "domingo", {
        viagem_feriado: false,
        tabela_excepcional_uuid: null,
      }).viagens,
    ).toEqual([comum]);
  });
});
