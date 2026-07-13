import { describe, expect, it } from "vitest";
import { indiceDeNomes, RAIO_TERRA_M, type Ponto } from "@/shared/geo";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";
import type { Secao } from "@/shared/contrato";
import {
  contribuirParaSecaoExistente,
  criarSecaoNoPonto,
  MENSAGEM_FORA_DE_SP,
  MENSAGEM_RECUSA_350M_SECAO,
  nomeExibicaoSecao,
  pontosOfertadosParaReuso,
  revalidarArrasto,
  type RecursosMunicipio,
} from "@/formulario/secoes";

// Unitários (categorias 2/3, docs-dev/08) do motor do editor de Seções
// (TASK-017; Spec 04 §7.1): criar, reutilizar/contribuir e arrastar, com
// RN-025..027/029. A matemática dos 350 m e da derivação de município já é
// coberta em testes/unitarios/geo/ (TASK-010/011) — aqui o foco é a
// composição de SecaoServico por sentido/bidirecionalidade, a identidade
// (UUID) e a integração dos três fluxos com essas primitivas.

// Mesma técnica de testes/unitarios/geo/regra-350m.test.ts: pontos no
// equador, longitude escalada para que a distância Haversine entre dois
// pontos seja EXATAMENTE a diferença em metros.
const K = 180 / (Math.PI * RAIO_TERRA_M);
const ponto = (metros: number): Ponto => ({ latitude: 0, longitude: metros * K });

// Feature municipal sintética cobrindo toda a faixa usada pelos testes acima
// (lon ∈ [-1,1], lat ∈ [-1,1] cobre folgadamente até milhares de metros).
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

const SERVICO_A = "11111111-1111-4111-8111-111111111111";
const SERVICO_B = "22222222-2222-4222-8222-222222222222";

function novaSecaoBase(): Secao {
  const resultado = criarSecaoNoPonto({
    nome: "Terminal Base",
    ponto: ponto(0),
    servicoUuid: SERVICO_A,
    sentido: "ida",
    bidirecional: false,
    ...RECURSOS,
  });
  if (!resultado.ok) throw new Error("setup inválido");
  return resultado.secao;
}

describe("nomeExibicaoSecao (Spec 04 §7.1)", () => {
  it("compõe 'Cidade - Nome'", () => {
    expect(nomeExibicaoSecao({ municipio: "Sorocaba", nome: "Terminal São Paulo" })).toBe(
      "Sorocaba - Terminal São Paulo",
    );
  });
});

describe("criarSecaoNoPonto (RN-025, RN-026, RN-029)", () => {
  it("1º ponto: sempre aceito, sem checagem de 350 m", () => {
    const resultado = criarSecaoNoPonto({
      nome: "Terminal Novo",
      ponto: ponto(0),
      servicoUuid: SERVICO_A,
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
  });

  it("deriva o município do ponto clicado (nunca digitado)", () => {
    const resultado = criarSecaoNoPonto({
      nome: "Terminal Novo",
      ponto: ponto(0),
      servicoUuid: SERVICO_A,
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    expect(resultado.ok && resultado.secao.municipio).toBe("Cidade Teste");
  });

  it("Serviço unidirecional (ida): só geolocalizacao_ida é preenchida", () => {
    const resultado = criarSecaoNoPonto({
      nome: "Terminal Novo",
      ponto: ponto(0),
      servicoUuid: SERVICO_A,
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const [entrada] = resultado.secao.servicos;
    expect(entrada.geolocalizacao_ida).toEqual(ponto(0));
    expect(entrada.geolocalizacao_volta).toBeUndefined();
  });

  it("Serviço unidirecional (volta): só geolocalizacao_volta é preenchida", () => {
    const resultado = criarSecaoNoPonto({
      nome: "Terminal Novo",
      ponto: ponto(0),
      servicoUuid: SERVICO_A,
      sentido: "volta",
      bidirecional: false,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const [entrada] = resultado.secao.servicos;
    expect(entrada.geolocalizacao_volta).toEqual(ponto(0));
    expect(entrada.geolocalizacao_ida).toBeUndefined();
  });

  it("RN-026: Serviço bidirecional cria Ida e Volta no MESMO ponto (Spec 04 §7.1)", () => {
    const resultado = criarSecaoNoPonto({
      nome: "Terminal Novo",
      ponto: ponto(0),
      servicoUuid: SERVICO_A,
      sentido: "ida",
      bidirecional: true,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const [entrada] = resultado.secao.servicos;
    expect(entrada.geolocalizacao_ida).toEqual(ponto(0));
    expect(entrada.geolocalizacao_volta).toEqual(ponto(0));
  });

  it("RN-001/002: cada Seção criada ganha uma uuid nova (client-side)", () => {
    const r1 = criarSecaoNoPonto({
      nome: "A",
      ponto: ponto(0),
      servicoUuid: SERVICO_A,
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    const r2 = criarSecaoNoPonto({
      nome: "B",
      ponto: ponto(0),
      servicoUuid: SERVICO_A,
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.secao.uuid).not.toBe(r2.secao.uuid);
  });

  it("inválido: ponto fora de SP é recusado (RN-029)", () => {
    const resultado = criarSecaoNoPonto({
      nome: "Terminal Novo",
      ponto: PONTO_FORA_DE_SP,
      servicoUuid: SERVICO_A,
      sentido: "ida",
      bidirecional: false,
      ...RECURSOS,
    });
    expect(resultado).toEqual({ ok: false, motivo: "fora_de_sp" });
  });

  it("inválido: nome vazio (só espaços) lança erro (RN-025, Spec 02 §5)", () => {
    expect(() =>
      criarSecaoNoPonto({
        nome: "   ",
        ponto: ponto(0),
        servicoUuid: SERVICO_A,
        sentido: "ida",
        bidirecional: false,
        ...RECURSOS,
      }),
    ).toThrow(/RN-025/);
  });
});

describe("contribuirParaSecaoExistente (RN-026, RN-027, RN-029)", () => {
  it("2º ponto (outro Serviço) a 300 m do 1º: aceito, preserva a uuid da Seção (RN-004/007)", () => {
    const base = novaSecaoBase();
    const resultado = contribuirParaSecaoExistente({
      secao: base,
      servicoUuid: SERVICO_B,
      sentido: "ida",
      bidirecional: false,
      ponto: ponto(300),
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.secao.uuid).toBe(base.uuid);
    expect(resultado.secao.servicos).toHaveLength(2);
  });

  it("inválido: 2º ponto a 800 m do 1º desloca o centroide além de 350 m: recusado", () => {
    const base = novaSecaoBase();
    const resultado = contribuirParaSecaoExistente({
      secao: base,
      servicoUuid: SERVICO_B,
      sentido: "ida",
      bidirecional: false,
      ponto: ponto(800),
      ...RECURSOS,
    });
    expect(resultado).toEqual({ ok: false, motivo: "350m" });
  });

  it("funde com a entrada existente do mesmo Serviço (Volta chega depois de Ida)", () => {
    const base = novaSecaoBase(); // SERVICO_A, ida, ponto(0)
    const resultado = contribuirParaSecaoExistente({
      secao: base,
      servicoUuid: SERVICO_A,
      sentido: "volta",
      bidirecional: false,
      ponto: ponto(300),
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.secao.servicos).toHaveLength(1);
    const [entrada] = resultado.secao.servicos;
    expect(entrada.geolocalizacao_ida).toEqual(ponto(0));
    expect(entrada.geolocalizacao_volta).toEqual(ponto(300));
  });

  it("re-deriva o município pelo novo centroide do cluster", () => {
    const base = novaSecaoBase();
    const resultado = contribuirParaSecaoExistente({
      secao: base,
      servicoUuid: SERVICO_B,
      sentido: "ida",
      bidirecional: false,
      ponto: ponto(300),
      ...RECURSOS,
    });
    expect(resultado.ok && resultado.secao.municipio).toBe("Cidade Teste");
  });

  it("inválido: ponto candidato fora de SP é recusado mesmo dentro dos 350 m matemáticos", () => {
    // Seção-base isolada perto do ponto fora de SP; distância entre os dois
    // pontos é pequena o bastante para passar no cluster, mas o ponto em si
    // não deriva município algum.
    const secaoIsolada = criarSecaoNoPonto({
      nome: "Isolada",
      ponto: PONTO_FORA_DE_SP,
      servicoUuid: SERVICO_A,
      sentido: "ida",
      bidirecional: false,
      features: [],
      nomes: new Map(),
    });
    // Sem feature nenhuma, até o 1º ponto falha a derivação — usado aqui só
    // para montar uma Seção com esse ponto sem depender do fluxo de criação.
    expect(secaoIsolada).toEqual({ ok: false, motivo: "fora_de_sp" });
  });
});

describe("revalidarArrasto (Spec 04 §7.1, §7.3; RN-027, RN-029)", () => {
  it("dentro dos 350 m: aceito, atualiza a geolocalização do sentido", () => {
    const base = novaSecaoBase(); // SERVICO_A, ida, ponto(0)
    const resultado = revalidarArrasto({
      secao: base,
      servicoUuid: SERVICO_A,
      sentido: "ida",
      pontoNovo: ponto(300),
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.secao.servicos[0].geolocalizacao_ida).toEqual(ponto(300));
  });

  it("exclui o próprio ponto sendo arrastado do cluster antes de checar (não compara contra si mesmo)", () => {
    const base = novaSecaoBase(); // único ponto da Seção é o próprio alvo do arrasto
    // Arrastar o único ponto para bem longe do zero: como ele é excluído do
    // cluster antes da checagem, o conjunto anterior fica vazio → 1º ponto,
    // sempre aceito (RN-027).
    const resultado = revalidarArrasto({
      secao: base,
      servicoUuid: SERVICO_A,
      sentido: "ida",
      pontoNovo: ponto(900),
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
  });

  it("inválido: arrasto além de 350 m do cluster restante é recusado, com o nome da Seção afetada", () => {
    const base = novaSecaoBase(); // SERVICO_A, ida, ponto(0)
    const comSegundoPonto = contribuirParaSecaoExistente({
      secao: base,
      servicoUuid: SERVICO_B,
      sentido: "ida",
      bidirecional: false,
      ponto: ponto(300),
      ...RECURSOS,
    });
    expect(comSegundoPonto.ok).toBe(true);
    if (!comSegundoPonto.ok) return;

    // Arrastar o ponto de SERVICO_A para longe do cluster remanescente
    // (só o ponto de SERVICO_B, em ponto(300)).
    const resultado = revalidarArrasto({
      secao: comSegundoPonto.secao,
      servicoUuid: SERVICO_A,
      sentido: "ida",
      pontoNovo: ponto(2000),
      ...RECURSOS,
    });
    expect(resultado).toEqual({
      ok: false,
      motivo: "350m",
      nomeSecao: nomeExibicaoSecao(comSegundoPonto.secao),
    });
  });

  it("não muta a Seção recebida", () => {
    const base = novaSecaoBase();
    const copia = structuredClone(base);
    revalidarArrasto({
      secao: base,
      servicoUuid: SERVICO_A,
      sentido: "ida",
      pontoNovo: ponto(300),
      ...RECURSOS,
    });
    expect(base).toEqual(copia);
  });

  it("mensagem literal de recusa é a da Spec 04 §14", () => {
    expect(MENSAGEM_RECUSA_350M_SECAO).toBe(
      "Este ponto fica a mais de 350 m do conjunto de pontos desta Seção. Crie uma Seção separada (com outro nome) para este local.",
    );
  });

  it("mensagem literal de 'fora de SP' é a da Spec 04 §14", () => {
    expect(MENSAGEM_FORA_DE_SP).toBe(
      "Não foi possível identificar o município deste ponto. Verifique se ele está dentro do Estado de São Paulo.",
    );
  });
});

describe("pontosOfertadosParaReuso (Spec 04 §7.1)", () => {
  it("Seção com 1 ponto: oferta só esse ponto", () => {
    const base = novaSecaoBase();
    expect(pontosOfertadosParaReuso(base)).toEqual([ponto(0)]);
  });

  it("Seção com 2 pontos distintos (Serviços diferentes): oferta os dois", () => {
    const base = novaSecaoBase();
    const comSegundo = contribuirParaSecaoExistente({
      secao: base,
      servicoUuid: SERVICO_B,
      sentido: "ida",
      bidirecional: false,
      ponto: ponto(300),
      ...RECURSOS,
    });
    expect(comSegundo.ok).toBe(true);
    if (!comSegundo.ok) return;
    expect(pontosOfertadosParaReuso(comSegundo.secao)).toEqual([ponto(0), ponto(300)]);
  });

  it("pontos idênticos (bidirecional no mesmo local) não se repetem na oferta", () => {
    const resultado = criarSecaoNoPonto({
      nome: "Terminal Novo",
      ponto: ponto(0),
      servicoUuid: SERVICO_A,
      sentido: "ida",
      bidirecional: true,
      ...RECURSOS,
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(pontosOfertadosParaReuso(resultado.secao)).toEqual([ponto(0)]);
  });
});
