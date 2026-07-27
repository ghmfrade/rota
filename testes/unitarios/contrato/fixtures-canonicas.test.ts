import { describe, expect, it } from "vitest";
import type { DocumentoOperacao } from "@/shared/contrato";
import {
  FIXTURES_VALIDAS,
  MANIFESTO_PAR,
  documentoBidirecionalMultiServico,
  documentoParProposta,
  documentoParVigente,
  documentoUnidirecional,
} from "../../fixtures";
import { VARIANTES_INVALIDAS } from "../../fixtures/variantes-invalidas";
import { esperarInvalido, esperarValido } from "./utilitarios";

// Contrato/regressão (categoria 1) — guarda das fixtures canônicas (TASK-041):
// as válidas são aceitas por esquemaDocumentoOperacao; cada variante inválida é
// rejeitada com a tag da RN alvo; o par vigente/proposta preserva UUIDs e só
// difere nos campos catalogados.

describe("fixtures canônicas válidas", () => {
  it.each(FIXTURES_VALIDAS)("$nome é aceita pelo contrato", ({ carregar }) => {
    esperarValido(carregar());
  });

  it("snapshot da forma versionada de cada fixture (versao_schema)", () => {
    const versoes = FIXTURES_VALIDAS.map(({ nome, carregar }) => [
      nome,
      carregar().versao_schema,
    ]);
    expect(versoes).toMatchInlineSnapshot(`
      [
        [
          "spec02-15-exemplo-minimo",
          "1.1",
        ],
        [
          "spec02-15-operacao-excepcional",
          "1.1",
        ],
        [
          "bidirecional-multi-servico",
          "1.0",
        ],
        [
          "unidirecional",
          "1.0",
        ],
        [
          "par-vigente",
          "1.0",
        ],
        [
          "par-proposta",
          "1.0",
        ],
      ]
    `);
  });
});

describe("fixture bidirecional multi-serviço", () => {
  it("tem mais de um Serviço, cada um com Ida e Volta", () => {
    const doc = documentoBidirecionalMultiServico();
    expect(doc.autos.servicos.length).toBeGreaterThan(1);
    for (const servico of doc.autos.servicos) {
      const sentidos = servico.itinerarios.map((i) => i.sentido).sort();
      expect(sentidos).toEqual(["ida", "volta"]);
    }
  });
});

describe("fixture unidirecional", () => {
  it("tem um único itinerário de Ida, sem Volta", () => {
    const doc = documentoUnidirecional();
    const servico = doc.autos.servicos[0];
    expect(servico.itinerarios).toHaveLength(1);
    expect(servico.itinerarios[0].sentido).toBe("ida");
  });

  it("não declara distancia_trecho_volta em matriz_distancias (RN-056)", () => {
    const doc = documentoUnidirecional();
    for (const par of doc.autos.servicos[0].matriz_distancias) {
      expect(par.distancia_trecho_volta).toBeUndefined();
    }
  });
});

describe("variantes inválidas por RN estrutural", () => {
  it.each(VARIANTES_INVALIDAS)(
    "$rn: $descricao é rejeitada",
    ({ construir, fragmentoEsperado }) => {
      esperarInvalido(construir(), fragmentoEsperado);
    },
  );

  it("cobre uma mutação por RN sem RN repetida no catálogo", () => {
    const rns = VARIANTES_INVALIDAS.map((v) => v.rn);
    expect(new Set(rns).size).toBe(rns.length);
  });
});

// Coleta as UUIDs por categoria, para provar a preservação de identidade no par.
function uuidsPorCategoria(doc: DocumentoOperacao) {
  const secoes = doc.autos.secoes.map((s) => s.uuid).sort();
  const servicos = doc.autos.servicos.map((s) => s.uuid).sort();
  const viagens = doc.autos.servicos
    .flatMap((s) => s.itinerarios)
    .flatMap((i) => i.viagens)
    .map((v) => v.uuid)
    .sort();
  return { secoes, servicos, viagens };
}

describe("par vigente/proposta (manifesto de diffs)", () => {
  it("os dois lados são fixtures válidas", () => {
    esperarValido(documentoParVigente());
    esperarValido(documentoParProposta());
  });

  it("status e datas seguem RN-011 em cada lado", () => {
    const vigente = documentoParVigente();
    expect(vigente.autos.status).toBe("vigente");
    expect(vigente.autos.data_publicacao).toBeDefined();
    expect(vigente.autos.data_criacao).toBeUndefined();

    const proposta = documentoParProposta();
    expect(proposta.autos.status).toBe("proposta");
    expect(proposta.autos.data_criacao).toBeDefined();
    expect(proposta.autos.data_publicacao).toBeUndefined();
  });

  it("preserva as MESMAS UUIDs de Seção e Serviço nos dois lados (RN-004)", () => {
    const vigente = uuidsPorCategoria(documentoParVigente());
    const proposta = uuidsPorCategoria(documentoParProposta());
    expect(proposta.secoes).toEqual(vigente.secoes);
    expect(proposta.servicos).toEqual(vigente.servicos);
    expect(vigente.secoes).toEqual([...MANIFESTO_PAR.secaoUuids].sort());
    expect(vigente.servicos).toEqual([MANIFESTO_PAR.servicoUuid]);
  });

  it("a Viagem comparável existe nos dois lados; a adicionada só na proposta", () => {
    const vigente = uuidsPorCategoria(documentoParVigente());
    const proposta = uuidsPorCategoria(documentoParProposta());
    expect(vigente.viagens).toContain(MANIFESTO_PAR.viagemComparavelIdaUuid);
    expect(proposta.viagens).toContain(MANIFESTO_PAR.viagemComparavelIdaUuid);
    expect(vigente.viagens).not.toContain(
      MANIFESTO_PAR.viagemAdicionadaNaPropostaUuid,
    );
    expect(proposta.viagens).toContain(
      MANIFESTO_PAR.viagemAdicionadaNaPropostaUuid,
    );
  });

  it("difere exatamente nos campos operacionais catalogados", () => {
    const vigente = documentoParVigente();
    const proposta = documentoParProposta();

    const viagemIda = (doc: DocumentoOperacao) =>
      doc.autos.servicos[0].itinerarios
        .find((i) => i.sentido === "ida")!
        .viagens.find(
          (v) => v.uuid === MANIFESTO_PAR.viagemComparavelIdaUuid,
        )!;
    expect(viagemIda(vigente).horario_saida).toBe("08:00:00");
    expect(viagemIda(proposta).horario_saida).toBe("08:30:00");

    const valorAdotado = (doc: DocumentoOperacao) =>
      doc.autos.servicos[0].matriz_distancias[0].valor_adotado_de_distancia;
    expect(valorAdotado(vigente)).toBe(8);
    expect(valorAdotado(proposta)).toBe(9);
  });
});
