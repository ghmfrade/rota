import { describe, expect, it } from "vitest";
import { indiceDeNomes, RAIO_TERRA_M, type Ponto } from "@/shared/geo";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";
import type { Local } from "@/shared/contrato";
import { esquemaLocal } from "@/shared/contrato";
import {
  criarLocalNoPonto,
  excluirSentidoDoLocal,
  MENSAGEM_FORA_DE_SP,
  MENSAGEM_RECUSA_350M_LOCAL,
  nomeExibicaoLocal,
  revalidarArrastoLocal,
  type RecursosMunicipio,
} from "@/formulario/locais";

// Unitários (categorias 2/3, docs-dev/08) do motor do editor de Locais (TASK-018;
// Spec 04 §7.2): criar (espelhado quando bidirecional), arrastar (350 m pareada
// Ida×Volta) e excluir por sentido, com RN-031/032/029 e DEC-045. A matemática
// dos 350 m pareados e da derivação de município já é coberta em
// testes/unitarios/geo/ (TASK-010/011) — aqui o foco é a composição do Local por
// sentido/bidirecionalidade, a identidade (UUID), a validação pareada aplicada
// aos gestos e a fronteira da exclusão por sentido (DEC-045).

// Mesma técnica de testes/unitarios/geo/regra-350m.test.ts: pontos no equador,
// longitude escalada para que a distância Haversine entre dois pontos seja
// EXATAMENTE a diferença em metros.
const K = 180 / (Math.PI * RAIO_TERRA_M);
const ponto = (metros: number): Ponto => ({ latitude: 0, longitude: metros * K });

// Feature municipal sintética cobrindo toda a faixa usada pelos testes (lon,lat
// ∈ [-1,1] cobre folgadamente até milhares de metros).
const MUNICIPIO_TESTE: FeatureMunicipio = {
  type: "Feature",
  properties: { codarea: "3500000" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
        [-1, -1],
      ],
    ],
  },
};
const NOMES = indiceDeNomes([{ codigo_ibge: "3500000", nome: "Cidade Teste" }]);
const RECURSOS: RecursosMunicipio = { features: [MUNICIPIO_TESTE], nomes: NOMES };

// Bem longe do polígono de teste e do fallback de 2 km (Spec 03 §2.3).
const PONTO_FORA_DE_SP: Ponto = { latitude: 80, longitude: 80 };

function localBidirecionalBase(): Local {
  const resultado = criarLocalNoPonto({
    nome: "Ponto Base",
    ponto: ponto(0),
    sentido: "ida",
    bidirecional: true,
    ...RECURSOS,
  });
  if (!resultado.ok) throw new Error("setup inválido");
  return resultado.local;
}

describe("nomeExibicaoLocal (Spec 04 §7.1/§13.1)", () => {
  it("compõe 'Cidade - Nome'", () => {
    expect(nomeExibicaoLocal({ municipio: "Sorocaba", nome: "Rodoviária" })).toBe(
      "Sorocaba - Rodoviária",
    );
  });
});

describe("criarLocalNoPonto (RN-031, RN-032, RN-029)", () => {
  it("Serviço unidirecional (ida): só geolocalizacao_ida é preenchida", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: ponto(0),
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.geolocalizacao_ida).toEqual(ponto(0));
    expect(resultado.local.geolocalizacao_volta).toBeUndefined();
  });

  it("Serviço unidirecional (volta): só geolocalizacao_volta é preenchida", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: ponto(0),
      sentido: "volta",
      bidirecional: false,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.geolocalizacao_volta).toEqual(ponto(0));
    expect(resultado.local.geolocalizacao_ida).toBeUndefined();
  });

  it("Serviço bidirecional: cria Ida e Volta no mesmo ponto (espelhado — Spec 04 §7.2)", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: ponto(10),
      sentido: "ida",
      bidirecional: true,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.geolocalizacao_ida).toEqual(ponto(10));
    expect(resultado.local.geolocalizacao_volta).toEqual(ponto(10));
    // Cópias independentes (não a mesma referência) — evita aliasing no arrasto.
    expect(resultado.local.geolocalizacao_ida).not.toBe(
      resultado.local.geolocalizacao_volta,
    );
  });

  it("deriva o município do ponto (nunca digitado — RN-029)", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: ponto(0),
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    expect(resultado.ok && resultado.local.municipio).toBe("Cidade Teste");
  });

  it("gera UUID nova (RN-001/002) e produz Local válido pelo schema (Spec 02 §7)", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: ponto(0),
      sentido: "ida",
      bidirecional: true,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(() => esquemaLocal.parse(resultado.local)).not.toThrow();
  });

  it("caso inválido: nome vazio é rejeitado (RN-031)", () => {
    expect(() =>
      criarLocalNoPonto({
        nome: "   ",
        ponto: ponto(0),
        sentido: "ida",
        bidirecional: false,
        ...RECURSOS,
      }),
    ).toThrow(/RN-031/);
  });

  it("caso inválido: ponto fora de SP recusa a criação (RN-029)", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: PONTO_FORA_DE_SP,
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("fora_de_sp");
  });
});

describe("revalidarArrastoLocal (RN-032 pareada, RN-029)", () => {
  it("arrasto dentro dos 350 m do par é aceito e recomputa o município", () => {
    const local = localBidirecionalBase();
    const resultado = revalidarArrastoLocal({
      local,
      sentido: "volta",
      pontoNovo: ponto(300), // 300 m do ponto de Ida (0) — ≤ 350 m
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.geolocalizacao_volta).toEqual(ponto(300));
    expect(resultado.local.geolocalizacao_ida).toEqual(ponto(0)); // outro sentido intacto
    expect(resultado.local.municipio).toBe("Cidade Teste");
    expect(resultado.local.uuid).toBe(local.uuid); // identidade preservada
  });

  it("caso inválido: arrasto além de 350 m do par é recusado, Local inalterado", () => {
    const local = localBidirecionalBase();
    const resultado = revalidarArrastoLocal({
      local,
      sentido: "volta",
      pontoNovo: ponto(400), // 400 m do ponto de Ida (0) — > 350 m
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("350m");
    // nomeLocal serve só para compor a mensagem (DEC-044/Q-025), não uma oferta.
    expect(resultado.motivo === "350m" && resultado.nomeLocal).toBe(
      "Cidade Teste - Ponto Base",
    );
  });

  it("Local unidirecional (sem par): arrasto sempre válido pela regra pareada", () => {
    const criacao = criarLocalNoPonto({
      nome: "Só Ida",
      ponto: ponto(0),
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    if (!criacao.ok) throw new Error("setup inválido");
    const resultado = revalidarArrastoLocal({
      local: criacao.local,
      sentido: "ida",
      pontoNovo: ponto(5000), // sem contraparte de Volta: nada com que medir 350 m
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.geolocalizacao_ida).toEqual(ponto(5000));
    expect(resultado.local.geolocalizacao_volta).toBeUndefined();
  });

  it("caso inválido: arrasto que joga o ponto fora de SP é recusado (RN-029)", () => {
    const criacao = criarLocalNoPonto({
      nome: "Só Ida",
      ponto: ponto(0),
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    if (!criacao.ok) throw new Error("setup inválido");
    const resultado = revalidarArrastoLocal({
      local: criacao.local,
      sentido: "ida",
      pontoNovo: PONTO_FORA_DE_SP,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("fora_de_sp");
  });
});

describe("excluirSentidoDoLocal (Spec 04 §7.2; RN-032; DEC-045)", () => {
  it("exclui um sentido de Local bidirecional → unidirecional, município recomputado", () => {
    // Ida em ponto(0), Volta arrastada para ponto(300) — municípios idênticos
    // aqui, mas o ponto decisor muda (deixa de ser ponto médio).
    const base = localBidirecionalBase();
    const comVolta = revalidarArrastoLocal({
      local: base,
      sentido: "volta",
      pontoNovo: ponto(300),
      ...RECURSOS,
    });
    if (!comVolta.ok) throw new Error("setup inválido");

    const resultado = excluirSentidoDoLocal({
      local: comVolta.local,
      sentido: "volta",
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.geolocalizacao_volta).toBeUndefined();
    expect(resultado.local.geolocalizacao_ida).toEqual(ponto(0));
    expect(resultado.local.uuid).toBe(base.uuid);
    expect(resultado.local.municipio).toBe("Cidade Teste");
    // Continua um Local válido (ao menos uma geoloc — Spec 02 §7.1).
    expect(() => esquemaLocal.parse(resultado.local)).not.toThrow();
  });

  it("exclui a Ida, mantém só a Volta", () => {
    const base = localBidirecionalBase();
    const resultado = excluirSentidoDoLocal({
      local: base,
      sentido: "ida",
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.geolocalizacao_ida).toBeUndefined();
    expect(resultado.local.geolocalizacao_volta).toEqual(ponto(0));
  });

  it("caso inválido: excluir o único ponto de um Local unidirecional é barrado (RN-032; DEC-045)", () => {
    const criacao = criarLocalNoPonto({
      nome: "Só Ida",
      ponto: ponto(0),
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    if (!criacao.ok) throw new Error("setup inválido");
    const resultado = excluirSentidoDoLocal({
      local: criacao.local,
      sentido: "ida",
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.motivo).toBe("ponto_unico");
  });
});

describe("mensagens literais da Spec 04 §14", () => {
  it("mensagem de recusa dos 350 m de Local é a literal da spec", () => {
    expect(MENSAGEM_RECUSA_350M_LOCAL).toBe(
      "Os pontos de Ida e Volta deste Local não podem distar mais de 350 m entre si. Crie dois Locais distintos se necessário.",
    );
  });

  it("mensagem de município não derivável é a literal da spec", () => {
    expect(MENSAGEM_FORA_DE_SP).toBe(
      "Não foi possível identificar o município deste ponto. Verifique se ele está dentro do Estado de São Paulo.",
    );
  });
});
