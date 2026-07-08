import { afterEach, describe, expect, it, vi } from "vitest";
import {
  criarLocal,
  criarSecao,
  criarServico,
  criarViagem,
  editarEntidade,
  esquemaDocumentoOperacao,
  esquemaLocal,
  esquemaSecao,
  esquemaServico,
  esquemaViagem,
  REGEX_UUID_V4,
  type Local,
  type Secao,
  type Servico,
  type Viagem,
} from "@/shared/contrato";
import { documentoDaFixture } from "./utilitarios";

// Categoria 2 — identidade de domínio (docs-dev/08): RN-001/RN-002/RN-003.
// Sem rede/OSRM (nada de roteamento nesta task). A parte de import (categoria
// 5) fica para a TASK-006.

// Dados de entidade (sem `uuid`) extraídos do exemplo mínimo da Spec 02 §15,
// para provar que a fábrica produz forma compatível com o contrato.
function semUuid(entidade: { uuid: string }): Record<string, unknown> {
  const copia = { ...entidade };
  delete (copia as { uuid?: unknown }).uuid;
  return copia;
}

function dadosSecao(): Omit<Secao, "uuid"> {
  return semUuid(documentoDaFixture().autos.secoes[0]) as Omit<Secao, "uuid">;
}

function dadosServico(): Omit<Servico, "uuid"> {
  return semUuid(documentoDaFixture().autos.servicos[0]) as Omit<
    Servico,
    "uuid"
  >;
}

function dadosLocal(): Omit<Local, "uuid"> {
  return semUuid(
    documentoDaFixture().autos.servicos[0].locais[0],
  ) as Omit<Local, "uuid">;
}

function dadosViagem(): Omit<Viagem, "uuid"> {
  return semUuid(
    documentoDaFixture().autos.servicos[0].itinerarios[0].viagens[0],
  ) as Omit<Viagem, "uuid">;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fábricas — criação com uuid (RN-001/RN-002)", () => {
  it("rn001: cada fábrica gera uuid no formato UUIDv4", () => {
    expect(criarSecao(dadosSecao()).uuid).toMatch(REGEX_UUID_V4);
    expect(criarServico(dadosServico()).uuid).toMatch(REGEX_UUID_V4);
    expect(criarLocal(dadosLocal()).uuid).toMatch(REGEX_UUID_V4);
    expect(criarViagem(dadosViagem()).uuid).toMatch(REGEX_UUID_V4);
  });

  it("rn002: a uuid vem de crypto.randomUUID()", () => {
    const fixa = "11111111-1111-4111-8111-111111111111";
    const spy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue(fixa as `${string}-${string}-${string}-${string}-${string}`);
    expect(criarSecao(dadosSecao()).uuid).toBe(fixa);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("rn002: dados idênticos geram uuids diferentes (não derivada de conteúdo)", () => {
    const dados = dadosSecao();
    expect(criarSecao(dados).uuid).not.toBe(criarSecao(dados).uuid);
  });

  it("preserva os demais campos ao criar", () => {
    const dados = dadosServico();
    const servico = criarServico(dados);
    expect(servico.numero_n).toBe(dados.numero_n);
    expect(servico.itinerarios).toEqual(dados.itinerarios);
  });

  it("não muta o argumento de entrada", () => {
    const dados = dadosSecao();
    const copia = structuredClone(dados);
    criarSecao(dados);
    expect(dados).toEqual(copia);
    expect(dados).not.toHaveProperty("uuid");
  });

  it("produz forma compatível com o schema de cada entidade", () => {
    expect(esquemaSecao.safeParse(criarSecao(dadosSecao())).success).toBe(true);
    expect(esquemaServico.safeParse(criarServico(dadosServico())).success).toBe(
      true,
    );
    expect(esquemaLocal.safeParse(criarLocal(dadosLocal())).success).toBe(true);
    expect(esquemaViagem.safeParse(criarViagem(dadosViagem())).success).toBe(
      true,
    );
  });

  it("entidade criada, inserida na fixture da Spec 02 §15, passa no documento completo", () => {
    const doc = documentoDaFixture();
    // Cópia legítima de uma Viagem (RN-007): entidade nova com uuid nova,
    // substituindo a original mantém o documento estruturalmente válido.
    const nova = criarViagem(dadosViagem());
    doc.autos.servicos[0].itinerarios[0].viagens[0] = nova;
    expect(esquemaDocumentoOperacao.safeParse(doc).success).toBe(true);
  });
});

describe("fábricas — casos inválidos de identidade (RN-002)", () => {
  it("rn002: uuid presente nos dados de entrada é sobrescrita pela gerada", () => {
    const dados = {
      ...dadosSecao(),
      uuid: "00000000-0000-4000-8000-000000000000",
    } as Omit<Secao, "uuid">;
    const secao = criarSecao(dados);
    expect(secao.uuid).not.toBe("00000000-0000-4000-8000-000000000000");
    expect(secao.uuid).toMatch(REGEX_UUID_V4);
  });
});

describe("editarEntidade — preserva identidade (RN-003)", () => {
  it("rn003: altera campos e mantém a uuid nas 4 entidades", () => {
    const secao = criarSecao(dadosSecao());
    const secaoEditada = editarEntidade(secao, { nome: "Novo Nome" });
    expect(secaoEditada.nome).toBe("Novo Nome");
    expect(secaoEditada.uuid).toBe(secao.uuid);

    const servico = criarServico(dadosServico());
    const servicoEditado = editarEntidade(servico, { numero_n: "9999-9CR" });
    expect(servicoEditado.numero_n).toBe("9999-9CR");
    expect(servicoEditado.uuid).toBe(servico.uuid);

    const local = criarLocal(dadosLocal());
    const localEditado = editarEntidade(local, { nome: "Outro Ponto" });
    expect(localEditado.nome).toBe("Outro Ponto");
    expect(localEditado.uuid).toBe(local.uuid);

    const viagem = criarViagem(dadosViagem());
    const viagemEditada = editarEntidade(viagem, { horario_saida: "09:15:00" });
    expect(viagemEditada.horario_saida).toBe("09:15:00");
    expect(viagemEditada.uuid).toBe(viagem.uuid);
  });

  it("não muta a entidade original", () => {
    const secao = criarSecao(dadosSecao());
    const copia = structuredClone(secao);
    editarEntidade(secao, { nome: "Mutação?" });
    expect(secao).toEqual(copia);
  });

  it("rn003 (inválido): uuid injetada em alteracoes via cast é ignorada", () => {
    const secao = criarSecao(dadosSecao());
    const editada = editarEntidade(secao, {
      uuid: "00000000-0000-4000-8000-000000000000",
      nome: "Nome Novo",
    } as Partial<Secao>);
    expect(editada.uuid).toBe(secao.uuid);
    expect(editada.nome).toBe("Nome Novo");
  });
});
