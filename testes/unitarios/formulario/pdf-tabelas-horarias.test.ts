import { describe, expect, test } from "vitest";
import {
  AVISO_GRADE_VAZIA,
  CELULA_SEM_VIAGEM,
  COLUNAS_DIAS,
  montarTabelasHorarias,
  NOTA_FORA_DAS_CONTAGENS,
  ROTULO_GRADE_COMUM,
  ROTULO_GRADE_FERIADO,
  type TabelaHorariaPdf,
} from "@/formulario/pdf/tabelas-horarias-pdf";
import { esquemaDocumentoOperacao, type DocumentoOperacao } from "@/shared/contrato";
import {
  documentoExemploMinimo,
  documentoOperacaoExcepcional,
  documentoUnidirecional,
} from "../../fixtures";

// TASK-034 — tabelas horárias do PDF (categoria 7 de `docs-dev/08-TEST_STRATEGY.md`:
// estrutura e regras transversais, nunca pixel). Cobre RN-075 (duas versões),
// RN-076 (Locais fora, sem offsets, `Cidade - Nome`), RN-061/RN-099 (uma grade
// por dimensão da Viagem) e RN-071 (grade vazia é válida).
//
// Todas as fixtures passam por `esquemaDocumentoOperacao.parse` — o modelo é
// exercitado sobre documento comprovadamente válido, não sobre objeto ad hoc.

function tabelasDe(
  documento: DocumentoOperacao,
  versao: "simples" | "detalhada",
): TabelaHorariaPdf[] {
  return montarTabelasHorarias(esquemaDocumentoOperacao.parse(documento), versao);
}

function gradeDe(tabela: TabelaHorariaPdf, rotulo: string) {
  const grade = tabela.grades.find((g) => g.rotulo === rotulo);
  expect(grade, `grade ausente: ${rotulo}`).toBeDefined();
  return grade!;
}

function tabelaDe(tabelas: TabelaHorariaPdf[], sentido: "ida" | "volta") {
  const tabela = tabelas.find((t) => t.sentido === sentido);
  expect(tabela, `tabela ausente: ${sentido}`).toBeDefined();
  return tabela!;
}

describe("§8.1 — colunas e células da grade", () => {
  test("as colunas são os sete dias da semana, de SEG a DOM", () => {
    expect(COLUNAS_DIAS).toEqual(["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"]);
    expect(tabelasDe(documentoExemploMinimo(), "simples")[0].colunas).toEqual(
      COLUNAS_DIAS,
    );
  });

  test("dia sem viagem naquela posição exibe travessão, não célula vazia", () => {
    // A fixture só opera segunda e terça na Ida — os outros cinco dias são "—".
    const grade = gradeDe(
      tabelaDe(tabelasDe(documentoExemploMinimo(), "simples"), "ida"),
      ROTULO_GRADE_COMUM,
    );

    expect(grade.blocos[0].linhas[0].horarios).toEqual([
      "08:00",
      "08:00",
      CELULA_SEM_VIAGEM,
      CELULA_SEM_VIAGEM,
      CELULA_SEM_VIAGEM,
      CELULA_SEM_VIAGEM,
      CELULA_SEM_VIAGEM,
    ]);
  });

  test("os horários saem em HH:MM — nunca com os segundos do JSON", () => {
    const tabelas = tabelasDe(documentoExemploMinimo(), "detalhada");
    const horarios = tabelas.flatMap((t) =>
      t.grades.flatMap((g) => g.blocos.flatMap((b) => b.linhas.flatMap((l) => l.horarios))),
    );

    expect(horarios.length).toBeGreaterThan(0);
    for (const horario of horarios) {
      expect(horario === CELULA_SEM_VIAGEM || /^\d{2}:\d{2}$/.test(horario)).toBe(true);
    }
  });

  test("a célula 'criável' da tela não vira bloco de traços no papel", () => {
    // `montarBlocosGrade` sempre devolve um bloco extra por dia (a posição onde
    // preencher cria a próxima Viagem — §8.2). No PDF ele não existe.
    const grade = gradeDe(
      tabelaDe(tabelasDe(documentoExemploMinimo(), "simples"), "ida"),
      ROTULO_GRADE_COMUM,
    );

    expect(grade.blocos).toHaveLength(1);
  });
});

describe("RN-075 — as duas versões da tabela horária (§13.2)", () => {
  test("a versão simples tem uma única linha por bloco: a Seção de partida", () => {
    const grade = gradeDe(
      tabelaDe(tabelasDe(documentoExemploMinimo(), "simples"), "ida"),
      ROTULO_GRADE_COMUM,
    );

    for (const bloco of grade.blocos) {
      expect(bloco.linhas).toHaveLength(1);
    }
    expect(grade.blocos[0].linhas[0].secao).toBe("Santos - Terminal Central");
  });

  test("a versão detalhada tem uma linha por Seção, com os horários passantes", () => {
    const grade = gradeDe(
      tabelaDe(tabelasDe(documentoExemploMinimo(), "detalhada"), "ida"),
      ROTULO_GRADE_COMUM,
    );

    expect(grade.blocos[0].linhas.map((linha) => linha.secao)).toEqual([
      "Santos - Terminal Central",
      "São Vicente - Terminal Norte",
      "Praia Grande - Rodoviária Praia Grande",
    ]);
    // Passantes = horario_saida + offset (08:00 + 00:37 + 01:10), em HH:MM.
    expect(grade.blocos[0].linhas.map((linha) => linha.horarios[0])).toEqual([
      "08:00",
      "08:37",
      "09:10",
    ]);
  });

  test("nenhuma das versões mostra Local — nem linha, nem horário (RN-076)", () => {
    const documento = documentoExemploMinimo();
    const local = documento.autos.servicos[0].locais[0];
    const itinerarioIda = documento.autos.servicos[0].itinerarios[0];
    expect(local.nome).toBe("Ponto de Embarque Praia"); // guarda da fixture

    for (const versao of ["simples", "detalhada"] as const) {
      const grade = gradeDe(
        tabelaDe(tabelasDe(documento, versao), "ida"),
        ROTULO_GRADE_COMUM,
      );
      for (const bloco of grade.blocos) {
        expect(bloco.linhas.some((linha) => linha.secao.includes(local.nome))).toBe(false);
        // O Local é uma das 4 paradas da Ida; a detalhada tem 3 linhas.
        expect(bloco.linhas.length).toBeLessThan(itinerarioIda.paradas.length);
      }
    }
  });

  test("os rótulos de linha seguem o padrão `Cidade - Nome da Seção` (RN-076)", () => {
    const documento = documentoExemploMinimo();
    const nomesValidos = documento.autos.secoes.map((s) => `${s.municipio} - ${s.nome}`);

    for (const tabela of tabelasDe(documento, "detalhada")) {
      for (const grade of tabela.grades) {
        for (const bloco of grade.blocos) {
          for (const linha of bloco.linhas) {
            expect(nomesValidos, `rótulo fora do padrão: ${linha.secao}`).toContain(
              linha.secao,
            );
          }
        }
      }
    }
  });
});

describe("RN-061/RN-068/RN-099 — uma grade por dimensão da Viagem (§13.3)", () => {
  test("comum e feriado saem em tabelas separadas, nunca misturadas", () => {
    const tabelaIda = tabelaDe(tabelasDe(documentoExemploMinimo(), "simples"), "ida");
    const comum = gradeDe(tabelaIda, ROTULO_GRADE_COMUM);
    const feriado = gradeDe(tabelaIda, ROTULO_GRADE_FERIADO);

    // A fixture tem 2 Viagens comuns (segunda e terça) e 1 de feriado (segunda).
    expect(comum.blocos[0].linhas[0].horarios.filter((h) => h !== CELULA_SEM_VIAGEM))
      .toHaveLength(2);
    expect(feriado.blocos[0].linhas[0].horarios.filter((h) => h !== CELULA_SEM_VIAGEM))
      .toHaveLength(1);
  });

  test("cada Tabela excepcional vira grade própria, rotulada pelo seu tipo/descrição (DEC-081)", () => {
    const tabelaIda = tabelaDe(tabelasDe(documentoOperacaoExcepcional(), "simples"), "ida");

    expect(tabelaIda.grades.map((g) => g.rotulo)).toEqual([
      ROTULO_GRADE_COMUM,
      ROTULO_GRADE_FERIADO,
      "Férias de verão",
      "Excursão Aparecida",
    ]);
    // A Viagem de segunda migrou da grade comum para a excepcional: some de uma
    // e aparece na outra — nunca nas duas.
    const comum = gradeDe(tabelaIda, ROTULO_GRADE_COMUM);
    const verao = gradeDe(tabelaIda, "Férias de verão");
    expect(comum.blocos[0].linhas[0].horarios[0]).toBe(CELULA_SEM_VIAGEM);
    expect(verao.blocos[0].linhas[0].horarios[0]).toBe("08:00");
  });

  test("as grades fora da semana padrão carregam a nota da RN-069", () => {
    const tabelaIda = tabelaDe(tabelasDe(documentoOperacaoExcepcional(), "simples"), "ida");

    expect(gradeDe(tabelaIda, ROTULO_GRADE_COMUM).notaForaDasContagens).toBeUndefined();
    for (const rotulo of [ROTULO_GRADE_FERIADO, "Férias de verão", "Excursão Aparecida"]) {
      expect(gradeDe(tabelaIda, rotulo).notaForaDasContagens).toBe(
        NOTA_FORA_DAS_CONTAGENS,
      );
    }
  });
});

describe("Casos inválidos e de borda", () => {
  test("RN-071 — grade sem nenhuma Viagem é marcada como vazia, sem bloco fantasma", () => {
    const tabelaVolta = tabelaDe(tabelasDe(documentoExemploMinimo(), "simples"), "volta");
    const feriado = gradeDe(tabelaVolta, ROTULO_GRADE_FERIADO);

    expect(feriado.vazia).toBe(true);
    expect(feriado.blocos).toHaveLength(0);
    expect(AVISO_GRADE_VAZIA).toMatch(/sem viagens/i);
  });

  test("Serviço unidirecional produz só a tabela do seu único sentido", () => {
    const tabelas = tabelasDe(documentoUnidirecional(), "simples");

    expect(tabelas.map((t) => t.sentido)).toEqual(["ida"]);
  });

  test("RN-062 — reforço no mesmo horário produz dois blocos, nunca um deduplicado", () => {
    const documento = documentoExemploMinimo();
    const itinerario = documento.autos.servicos[0].itinerarios[0];
    const original = itinerario.viagens[0];
    itinerario.viagens.push({
      ...structuredClone(original),
      uuid: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    });

    const grade = gradeDe(
      tabelaDe(tabelasDe(documento, "simples"), "ida"),
      ROTULO_GRADE_COMUM,
    );

    expect(grade.blocos).toHaveLength(2);
    expect(grade.blocos[1].linhas[0].horarios[0]).toBe("08:00");
  });

  test("parada que aponta para Seção inexistente é ignorada, sem linha órfã", () => {
    // Documento inválido (a validação estrutural o recusa): a tabela não pode
    // inventar rótulo nem imprimir linha sem nome.
    const documento = documentoExemploMinimo();
    documento.autos.secoes = documento.autos.secoes.filter(
      (secao) => secao.uuid !== documento.autos.servicos[0].itinerarios[0].paradas[1].secao_uuid,
    );

    const grade = gradeDe(
      montarTabelasHorarias(documento, "detalhada").find((t) => t.sentido === "ida")!,
      ROTULO_GRADE_COMUM,
    );

    expect(grade.blocos[0].linhas.map((l) => l.secao)).toEqual([
      "Santos - Terminal Central",
      "Praia Grande - Rodoviária Praia Grande",
    ]);
  });
});
