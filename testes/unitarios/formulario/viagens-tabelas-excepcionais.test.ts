import { describe, expect, it } from "vitest";

import {
  criarTabelaExcepcional,
  editarDescricaoTabelaExcepcional,
  filtrarTabelasExcepcionais,
  removerTabelaExcepcional,
} from "@/formulario/viagens";
import type { Servico } from "@/shared/contrato";
import multiServico from "../../fixtures/carregar-multi-servico.json";

const UUID_VERAO = "10000000-0000-4000-8000-000000000001";
const UUID_INVERNO = "10000000-0000-4000-8000-000000000002";
const UUID_PERSONALIZADA_1 = "10000000-0000-4000-8000-000000000003";
const UUID_PERSONALIZADA_2 = "10000000-0000-4000-8000-000000000004";

function servicoBase(): Servico {
  const servico = structuredClone(
    multiServico.autos.servicos[0],
  ) as unknown as Servico;
  servico.tabelas_excepcionais = [];
  for (const itinerario of servico.itinerarios) {
    for (const viagem of itinerario.viagens) {
      viagem.tabela_excepcional_uuid = null;
    }
  }
  return servico;
}

describe("CRUD de Tabelas excepcionais (TASK-104; RN-098)", () => {
  it("cria tipos canônicos sem descricao e múltiplas personalizadas com UUIDs novas", () => {
    const original = servicoBase();
    const verao = criarTabelaExcepcional(
      original,
      { tipo: "ferias_verao", descricao: "ignorada" },
      () => UUID_VERAO,
    );
    expect(verao.ok).toBe(true);
    expect(verao.servico.tabelas_excepcionais).toEqual([
      { uuid: UUID_VERAO, tipo: "ferias_verao" },
    ]);
    expect(original.tabelas_excepcionais).toEqual([]);

    const personalizada1 = criarTabelaExcepcional(
      verao.servico,
      { tipo: "personalizado", descricao: "  Excursão Aparecida  " },
      () => UUID_PERSONALIZADA_1,
    );
    const personalizada2 = criarTabelaExcepcional(
      personalizada1.servico,
      { tipo: "personalizado", descricao: "Excursão Aparecida" },
      () => UUID_PERSONALIZADA_2,
    );

    expect(personalizada2.ok).toBe(true);
    expect(personalizada2.servico.tabelas_excepcionais).toEqual([
      { uuid: UUID_VERAO, tipo: "ferias_verao" },
      {
        uuid: UUID_PERSONALIZADA_1,
        tipo: "personalizado",
        descricao: "Excursão Aparecida",
      },
      {
        uuid: UUID_PERSONALIZADA_2,
        tipo: "personalizado",
        descricao: "Excursão Aparecida",
      },
    ]);
  });

  it("recusa segunda tabela canônica do mesmo tipo com mensagem operacional", () => {
    const primeira = criarTabelaExcepcional(
      servicoBase(),
      { tipo: "ferias_inverno" },
      () => UUID_INVERNO,
    );
    const duplicada = criarTabelaExcepcional(
      primeira.servico,
      { tipo: "ferias_inverno" },
      () => UUID_VERAO,
    );

    expect(duplicada).toMatchObject({
      ok: false,
      campo: "tipo",
      erro: "Já existe uma tabela férias de inverno neste Serviço.",
    });
    expect(duplicada.servico).toBe(primeira.servico);
    expect(duplicada.servico.tabelas_excepcionais).toHaveLength(1);
  });

  it("recusa personalizada sem nome, inclusive quando contém somente espaços", () => {
    const resultado = criarTabelaExcepcional(servicoBase(), {
      tipo: "personalizado",
      descricao: "   ",
    });

    expect(resultado).toMatchObject({
      ok: false,
      campo: "descricao",
      erro: "Informe o nome da tabela personalizada.",
    });
    expect(resultado.servico.tabelas_excepcionais).toEqual([]);
  });

  it("edita a descrição da personalizada preservando UUID e recusa nome vazio", () => {
    const criado = criarTabelaExcepcional(
      servicoBase(),
      { tipo: "personalizado", descricao: "Fretamento" },
      () => UUID_PERSONALIZADA_1,
    );
    const editado = editarDescricaoTabelaExcepcional(
      criado.servico,
      UUID_PERSONALIZADA_1,
      "  Operação escolar  ",
    );

    expect(editado.ok).toBe(true);
    expect(editado.servico.tabelas_excepcionais[0]).toEqual({
      uuid: UUID_PERSONALIZADA_1,
      tipo: "personalizado",
      descricao: "Operação escolar",
    });

    const invalido = editarDescricaoTabelaExcepcional(
      editado.servico,
      UUID_PERSONALIZADA_1,
      " ",
    );
    expect(invalido.ok).toBe(false);
    expect(invalido.servico).toBe(editado.servico);
  });

  it("não permite editar descrição de tipo canônico", () => {
    const criado = criarTabelaExcepcional(
      servicoBase(),
      { tipo: "ferias_verao" },
      () => UUID_VERAO,
    );
    const resultado = editarDescricaoTabelaExcepcional(
      criado.servico,
      UUID_VERAO,
      "Outro nome",
    );

    expect(resultado).toMatchObject({
      ok: false,
      campo: "descricao",
      erro: "Somente tabelas personalizadas possuem nome editável.",
    });
  });

  it("filtra separadamente por tipo e por substring da descrição", () => {
    const tabelas = [
      { uuid: UUID_VERAO, tipo: "ferias_verao" as const },
      { uuid: UUID_INVERNO, tipo: "ferias_inverno" as const },
      {
        uuid: UUID_PERSONALIZADA_1,
        tipo: "personalizado" as const,
        descricao: "Operação Escolar",
      },
      {
        uuid: UUID_PERSONALIZADA_2,
        tipo: "personalizado" as const,
        descricao: "Excursão Aparecida",
      },
    ];

    expect(filtrarTabelasExcepcionais(tabelas, "ferias_verao", "")).toEqual([
      tabelas[0],
    ]);
    expect(filtrarTabelasExcepcionais(tabelas, "todos", "escolar")).toEqual([
      tabelas[2],
    ]);
    expect(
      filtrarTabelasExcepcionais(tabelas, "personalizado", "EXCURSÃO"),
    ).toEqual([tabelas[3]]);
    expect(filtrarTabelasExcepcionais(tabelas, "ferias_verao", "escolar")).toEqual(
      [],
    );
  });

  it("remove uma tabela vazia sem alterar as demais", () => {
    const servico = servicoBase();
    servico.tabelas_excepcionais = [
      { uuid: UUID_VERAO, tipo: "ferias_verao" },
      {
        uuid: UUID_PERSONALIZADA_1,
        tipo: "personalizado",
        descricao: "Escolar",
      },
    ];

    const resultado = removerTabelaExcepcional(servico, UUID_VERAO);

    expect(resultado.ok).toBe(true);
    expect(resultado.servico.tabelas_excepcionais).toEqual([
      {
        uuid: UUID_PERSONALIZADA_1,
        tipo: "personalizado",
        descricao: "Escolar",
      },
    ]);
    expect(servico.tabelas_excepcionais).toHaveLength(2);
  });

  it("DEC-098: bloqueia remoção com contagem e não apaga nem converte Viagens", () => {
    const servico = servicoBase();
    servico.tabelas_excepcionais = [
      { uuid: UUID_VERAO, tipo: "ferias_verao" },
    ];
    servico.itinerarios[0].viagens[0].tabela_excepcional_uuid = UUID_VERAO;
    const viagemAntes = structuredClone(servico.itinerarios[0].viagens[0]);

    const resultado = removerTabelaExcepcional(servico, UUID_VERAO);

    expect(resultado).toMatchObject({
      ok: false,
      campo: "remocao",
      quantidadeViagensAssociadas: 1,
      erro:
        "Esta tabela possui 1 Viagem associada. " +
        "Remova-as previamente na grade excepcional.",
    });
    expect(resultado.servico).toBe(servico);
    expect(resultado.servico.tabelas_excepcionais).toHaveLength(1);
    expect(resultado.servico.itinerarios[0].viagens[0]).toEqual(viagemAntes);
    expect(
      resultado.servico.itinerarios[0].viagens[0].tabela_excepcional_uuid,
    ).toBe(UUID_VERAO);
  });
});
