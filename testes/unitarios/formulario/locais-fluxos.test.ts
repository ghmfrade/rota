import { describe, expect, it } from "vitest";
import { indiceDeNomes, RAIO_TERRA_M, type Ponto } from "@/shared/geo";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";
import type { Local } from "@/shared/contrato";
import { esquemaLocal } from "@/shared/contrato";
import {
  criarLocalNoPonto,
  MENSAGEM_FORA_DE_SP,
  MENSAGEM_RECUSA_350M_LOCAL,
  nomeExibicaoLocal,
  removerEntidadeLocal,
  revalidarArrastoLocal,
  type RecursosMunicipio,
} from "@/formulario/locais";

// Unitários (categorias 2/3, docs-dev/08) do motor do editor de Locais (TASK-018;
// TASK-094): criar (SEMPRE unidirecional — DEC-075), arrastar (350 m pareada
// Ida×Volta, só para Local legado com os dois pontos) e remover a entidade
// (DEC-076), com RN-031/032/029. A matemática dos 350 m pareados e da
// derivação de município já é coberta em testes/unitarios/geo/ (TASK-010/011)
// — aqui o foco é a composição do Local por sentido, a identidade (UUID), a
// validação pareada aplicada aos gestos e a remoção de entidade.

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

// Local LEGADO com dois pontos (documento importado) — a criação normal
// (DEC-075) nunca produz isto; construído aqui via criação (Ida) + arrasto
// pareado (Volta no mesmo ponto), o único caminho que o motor ainda permite
// chegar a um Local bidirecional.
function localBidirecionalBase(): Local {
  const criado = criarLocalNoPonto({
    nome: "Ponto Base",
    ponto: ponto(0),
    sentido: "ida",
    ...RECURSOS,
  });
  if (!criado.ok) throw new Error("setup inválido");
  const comVolta = revalidarArrastoLocal({
    local: criado.local,
    sentido: "volta",
    pontoNovo: ponto(0),
    ...RECURSOS,
  });
  if (!comVolta.ok) throw new Error("setup inválido");
  return comVolta.local;
}

describe("nomeExibicaoLocal (Spec 04 §7.1/§13.1)", () => {
  it("compõe 'Cidade - Nome'", () => {
    expect(nomeExibicaoLocal({ municipio: "Sorocaba", nome: "Rodoviária" })).toBe(
      "Sorocaba - Rodoviária",
    );
  });
});

describe("criarLocalNoPonto (RN-031, RN-032, RN-029; DEC-075)", () => {
  it("Serviço unidirecional (ida): só geolocalizacao_ida é preenchida", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: ponto(0),
      sentido: "ida",
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
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.geolocalizacao_volta).toEqual(ponto(0));
    expect(resultado.local.geolocalizacao_ida).toBeUndefined();
  });

  it("Serviço BIDIRECIONAL: criar na Ida NÃO espelha para a Volta (DEC-075 — supera a antiga criação espelhada)", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: ponto(10),
      sentido: "ida",
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.geolocalizacao_ida).toEqual(ponto(10));
    expect(resultado.local.geolocalizacao_volta).toBeUndefined();
  });

  it("Serviço BIDIRECIONAL: criar na Volta NÃO espelha para a Ida (DEC-075)", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: ponto(10),
      sentido: "volta",
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.local.geolocalizacao_volta).toEqual(ponto(10));
    expect(resultado.local.geolocalizacao_ida).toBeUndefined();
  });

  it("deriva o município do ponto (nunca digitado — RN-029)", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: ponto(0),
      sentido: "ida",
      ...RECURSOS,
    });
    expect(resultado.ok && resultado.local.municipio).toBe("Cidade Teste");
  });

  it("gera UUID nova (RN-001/002) e produz Local válido pelo schema (Spec 02 §7)", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: ponto(0),
      sentido: "ida",
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
        ...RECURSOS,
      }),
    ).toThrow(/RN-031/);
  });

  it("caso inválido: ponto fora de SP recusa a criação (RN-029)", () => {
    const resultado = criarLocalNoPonto({
      nome: "Ponto Novo",
      ponto: PONTO_FORA_DE_SP,
      sentido: "ida",
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

describe("removerEntidadeLocal (Spec 04 §7.2; RN-031; DEC-076)", () => {
  it("remove a entidade-alvo e preserva as demais (com suas UUIDs)", () => {
    const alvo = localBidirecionalBase();
    const outro = criarLocalNoPonto({
      nome: "Outro Local",
      ponto: ponto(1000),
      sentido: "ida",
      ...RECURSOS,
    });
    if (!outro.ok) throw new Error("setup inválido");

    const resultado = removerEntidadeLocal([alvo, outro.local], alvo.uuid);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].uuid).toBe(outro.local.uuid);
  });

  it("remove Local legado com dois pontos por inteiro (não deixa resquício de nenhum sentido)", () => {
    const legado = localBidirecionalBase();
    const resultado = removerEntidadeLocal([legado], legado.uuid);
    expect(resultado).toEqual([]);
  });

  it("caso inválido: UUID inexistente não altera a lista", () => {
    const local = localBidirecionalBase();
    const resultado = removerEntidadeLocal([local], "00000000-0000-4000-8000-000000000001");
    expect(resultado).toEqual([local]);
  });

  it("caso inválido: lista vazia devolve lista vazia", () => {
    expect(removerEntidadeLocal([], "00000000-0000-4000-8000-000000000001")).toEqual([]);
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
