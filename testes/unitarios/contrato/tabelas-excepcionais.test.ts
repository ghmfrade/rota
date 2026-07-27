import { describe, expect, it } from "vitest";
import {
  coletarViolacoesEstruturais,
  esquemaDocumentoOperacao,
} from "@/shared/contrato";
import {
  documentoBidirecionalMultiServico,
  documentoOperacaoExcepcional,
} from "../../fixtures";
import {
  documentoDaFixture,
  esperarInvalido,
  esperarValido,
} from "./utilitarios";

const UUID_VERAO = "9c1e0000-0000-4000-8000-000000000001";
const UUID_INVERNO = "2a7f0000-0000-4000-8000-000000000002";
const UUID_PERSONALIZADO_1 = "3b8e0000-0000-4000-8000-000000000003";
const UUID_PERSONALIZADO_2 = "4c9f0000-0000-4000-8000-000000000004";

describe("TabelaExcepcional (RN-098)", () => {
  it("aceita a ilustração de operação excepcional da Spec 02 §15", () => {
    esperarValido(documentoOperacaoExcepcional());
  });

  it("aceita descricao ausente ou null nos tipos canônicos", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].tabelas_excepcionais = [
      { uuid: UUID_VERAO, tipo: "ferias_verao", descricao: null },
      { uuid: UUID_INVERNO, tipo: "ferias_inverno" },
    ];
    esperarValido(doc);
  });

  it("aceita múltiplas tabelas personalizado com descrições distintas", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].tabelas_excepcionais = [
      {
        uuid: UUID_PERSONALIZADO_1,
        tipo: "personalizado",
        descricao: "Excursão Aparecida",
      },
      {
        uuid: UUID_PERSONALIZADO_2,
        tipo: "personalizado",
        descricao: "Operação universitária",
      },
    ];
    esperarValido(doc);
  });

  it("recusa tipo fora do enum", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].tabelas_excepcionais = [
      { uuid: UUID_VERAO, tipo: "ferias_primavera", descricao: null },
    ];
    esperarInvalido(doc);
  });

  it("recusa personalizado sem descricao", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].tabelas_excepcionais = [
      { uuid: UUID_PERSONALIZADO_1, tipo: "personalizado" },
    ];
    esperarInvalido(doc, "[RN-098]");
  });

  it("recusa personalizado com descricao null", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].tabelas_excepcionais = [
      {
        uuid: UUID_PERSONALIZADO_1,
        tipo: "personalizado",
        descricao: null,
      },
    ];
    esperarInvalido(doc, "[RN-098]");
  });

  it("recusa descricao preenchida em tipo canônico", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].tabelas_excepcionais = [
      {
        uuid: UUID_VERAO,
        tipo: "ferias_verao",
        descricao: "Janeiro",
      },
    ];
    esperarInvalido(doc, "[RN-098]");
  });

  it("recusa segunda tabela ferias_verao no mesmo Serviço", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].tabelas_excepcionais = [
      { uuid: UUID_VERAO, tipo: "ferias_verao", descricao: null },
      {
        uuid: UUID_PERSONALIZADO_1,
        tipo: "ferias_verao",
        descricao: null,
      },
    ];
    esperarInvalido(doc, "[RN-098]");
  });

  it("recusa UUID de TabelaExcepcional repetida no documento", () => {
    const doc = documentoBidirecionalMultiServico();
    doc.autos.servicos[0].tabelas_excepcionais = [
      { uuid: UUID_VERAO, tipo: "ferias_verao", descricao: null },
    ];
    doc.autos.servicos[1].tabelas_excepcionais = [
      { uuid: UUID_VERAO, tipo: "ferias_inverno", descricao: null },
    ];
    esperarInvalido(doc, "[RN-005]");
  });
});

describe("grade excepcional da Viagem (RN-061/RN-062/RN-099)", () => {
  it("trata campos ausentes de documento 1.0 como []/null na validação direta", () => {
    const doc = esquemaDocumentoOperacao.parse(documentoDaFixture());
    const servico = doc.autos.servicos[0];
    const viagem = servico.itinerarios[0].viagens[0];
    delete (servico as Partial<typeof servico>).tabelas_excepcionais;
    delete (viagem as Partial<typeof viagem>).tabela_excepcional_uuid;

    expect(
      coletarViolacoesEstruturais(doc).filter((violacao) =>
        violacao.mensagem.includes("[RN-099]"),
      ),
    ).toEqual([]);
  });

  it("aceita Viagem que referencia tabela do Serviço-pai", () => {
    esperarValido(documentoOperacaoExcepcional());
  });

  it("recusa tabela_excepcional_uuid inexistente", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens[0].tabela_excepcional_uuid =
      UUID_VERAO;
    esperarInvalido(doc, "[RN-099]");
  });

  it("recusa referência a tabela excepcional de outro Serviço", () => {
    const doc = documentoBidirecionalMultiServico();
    doc.autos.servicos[0].tabelas_excepcionais = [
      { uuid: UUID_VERAO, tipo: "ferias_verao", descricao: null },
    ];
    doc.autos.servicos[1].itinerarios[0].viagens[0].tabela_excepcional_uuid =
      UUID_VERAO;
    esperarInvalido(doc, "[RN-099]");
  });

  it("recusa Viagem simultaneamente excepcional e de feriado", () => {
    const doc = documentoOperacaoExcepcional();
    doc.autos.servicos[0].itinerarios[0].viagens[0].viagem_feriado = true;
    esperarInvalido(doc, "[RN-099]");
  });

  it("aceita reforço com a mesma tupla completa na grade excepcional", () => {
    const doc = documentoOperacaoExcepcional();
    const viagens = doc.autos.servicos[0].itinerarios[0].viagens;
    const reforco = structuredClone(viagens[0]);
    reforco.uuid = UUID_PERSONALIZADO_1;
    viagens.push(reforco);
    esperarValido(doc);
  });
});
