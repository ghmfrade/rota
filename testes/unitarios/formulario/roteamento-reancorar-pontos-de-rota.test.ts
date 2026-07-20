import { describe, expect, test } from "vitest";
import {
  classificarMudancaSequenciaParadas,
  reancorarPontosDeRota,
} from "@/formulario/roteamento";
import type { PontoDeRota } from "@/shared/contrato";

// TASK-066 — re-ancoragem de pontos de rota quando o conjunto ou a ordem das
// paradas muda (DEC-056, atualizada pela DEC-060; Spec 03 §3.6.2 × Spec 02
// §10.4/RN-042). Exemplo literal de §3.6.1: 3 paradas A,B,C — p1,p2,p3 em
// apos_parada_ordem=1 (trecho A→B), p4 em apos_parada_ordem=2 (trecho B→C).

const A = "secao:A";
const B = "secao:B";
const C = "secao:C";
const D = "secao:D";
const E = "secao:E";

const p1: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.1, longitude: -46.1 };
const p2: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.2, longitude: -46.2 };
const p3: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.3, longitude: -46.3 };
const p4: PontoDeRota = { apos_parada_ordem: 2, latitude: -23.7, longitude: -46.8 };

describe("classificarMudancaSequenciaParadas (TASK-046/TASK-066)", () => {
  test("distingue sequência inalterada de reordenação com a mesma contagem", () => {
    expect(classificarMudancaSequenciaParadas([A, B, C], [A, B, C])).toEqual({
      tipo: "inalterada",
    });
    expect(classificarMudancaSequenciaParadas([A, B, C], [B, A, C])).toEqual({
      tipo: "reordenacao",
    });
  });

  test("classifica inserção e remoção com o índice da diferença", () => {
    expect(classificarMudancaSequenciaParadas([A, B, C], [A, D, B, C])).toEqual({
      tipo: "insercao",
      indice: 1,
    });
    expect(classificarMudancaSequenciaParadas([A, B, C], [A, C])).toEqual({
      tipo: "remocao",
      indice: 1,
    });
  });

  test("mudanças acumuladas após falha de rota são classificadas sem fingir gesto atômico", () => {
    expect(classificarMudancaSequenciaParadas([A, B], [A, C, D, B])).toEqual({
      tipo: "alteracao-conjunto",
    });
  });
});

describe("reancorarPontosDeRota — acrescentar ao fim (DEC-056)", () => {
  test("nenhum apos_parada_ordem muda", () => {
    const resultado = reancorarPontosDeRota([A, B, C], [A, B, C, D], [p1, p2, p3, p4]);
    expect(resultado).toEqual([p1, p2, p3, p4]);
  });
});

describe("reancorarPontosDeRota — remover parada (DEC-056; exemplo §3.6.1)", () => {
  test("remover B funde A→B e B→C: os quatro pontos ficam em apos_parada_ordem=1, na ordem p1,p2,p3,p4", () => {
    const resultado = reancorarPontosDeRota([A, B, C], [A, C], [p1, p2, p3, p4]);
    expect(resultado).toEqual([
      { ...p1, apos_parada_ordem: 1 },
      { ...p2, apos_parada_ordem: 1 },
      { ...p3, apos_parada_ordem: 1 },
      { ...p4, apos_parada_ordem: 1 },
    ]);
  });

  test("remover a última Parada descarta pontos órfãos do trecho terminal e mantém os demais", () => {
    const resultado = reancorarPontosDeRota([A, B, C], [A, B], [p1, p2, p4]);
    expect(resultado).toEqual([p1, p2]);
  });

  test("remover a primeira Parada descarta pontos órfãos do trecho inicial e reancora os demais", () => {
    const resultado = reancorarPontosDeRota([A, B, C], [B, C], [p1, p2, p4]);
    expect(resultado).toEqual([{ ...p4, apos_parada_ordem: 1 }]);
  });

  test("remover a última das paradas do meio (4 paradas): trechos antes da removida ficam intactos", () => {
    const antes = [A, B, C, D];
    const depois = [A, B, D];
    const pAntesDeB: PontoDeRota = { apos_parada_ordem: 1, latitude: 0, longitude: 0 }; // A→B
    const pEmCD: PontoDeRota = { apos_parada_ordem: 3, latitude: 0, longitude: 0 }; // C→D
    const resultado = reancorarPontosDeRota(antes, depois, [pAntesDeB, pEmCD]);
    // remover C (índice 2): A→B intacto (apos=1); B→C e C→D fundem em B→D (apos=2)
    expect(resultado).toEqual([
      { ...pAntesDeB, apos_parada_ordem: 1 },
      { ...pEmCD, apos_parada_ordem: 2 },
    ]);
  });
});

describe("reancorarPontosDeRota — inserir parada no meio (DEC-056)", () => {
  test("pontos em trechos inteiramente antes da inserção mantêm o valor; os demais recebem +1", () => {
    // A,B,C,E → insere D na posição 2 (A,B,D,C,E)
    const antes = [A, B, C, E];
    const depois = [A, B, D, C, E];
    const pAB: PontoDeRota = { apos_parada_ordem: 1, latitude: 0, longitude: 0 }; // A→B, inteiramente antes
    const pBC: PontoDeRota = { apos_parada_ordem: 2, latitude: 0, longitude: 0 }; // B→C, trecho partido pela inserção
    const pCE: PontoDeRota = { apos_parada_ordem: 3, latitude: 0, longitude: 0 }; // C→E, inteiramente depois
    const resultado = reancorarPontosDeRota(antes, depois, [pAB, pBC, pCE]);
    expect(resultado).toEqual([
      { ...pAB, apos_parada_ordem: 1 },
      { ...pBC, apos_parada_ordem: 3 },
      { ...pCE, apos_parada_ordem: 4 },
    ]);
  });

  test("acrescentar ao fim é o caso degenerado da inserção (índice == length)", () => {
    const resultado = reancorarPontosDeRota([A, B, C], [A, B, C, D], [p4]);
    expect(resultado).toEqual([p4]);
  });
});

describe("reancorarPontosDeRota — reordenação (DEC-060 supera a DEC-056: sem descarte)", () => {
  test("mesma contagem de paradas: apos_parada_ordem não muda de valor, passa a se referir ao novo par", () => {
    // A,B,C → B,A,C (troca A e B de posição)
    const resultado = reancorarPontosDeRota([A, B, C], [B, A, C], [p1, p4]);
    expect(resultado).toEqual([p1, p4]);
  });

  test("nenhum ponto é descartado (ao contrário da DEC-056 original)", () => {
    const resultado = reancorarPontosDeRota([A, B, C], [C, B, A], [p1, p2, p3, p4]);
    expect(resultado).toHaveLength(4);
  });
});

describe("reancorarPontosDeRota — pós-condição (RN-042)", () => {
  test("[inválido] nunca produz apos_parada_ordem == paradasDepois.length em nenhum caso testado", () => {
    const casos: Array<[string[], string[], PontoDeRota[]]> = [
      [[A, B, C], [A, B, C, D], [p1, p2, p3, p4]],
      [[A, B, C], [A, C], [p1, p2, p3, p4]],
      [[A, B, C], [A, B], [p1, p4]],
      [[A, B, C], [B, C], [p1, p4]],
      [[A, B, C, E], [A, B, D, C, E], [p1, p4]],
      [[A, B, C], [B, A, C], [p1, p4]],
    ];
    for (const [antes, depois, pontos] of casos) {
      const resultado = reancorarPontosDeRota(antes, depois, pontos);
      for (const ponto of resultado) {
        expect(ponto.apos_parada_ordem).toBeGreaterThanOrEqual(1);
        expect(ponto.apos_parada_ordem).toBeLessThan(depois.length);
      }
    }
  });

  test("[inválido] diferença de tamanho que não é +1/-1/0 lança erro (gesto não atômico)", () => {
    expect(() => reancorarPontosDeRota([A], [A, B, C], [])).toThrow(/RN-042/);
  });

  test("não muta os arrays de entrada", () => {
    const pontosOriginais = [p1, p2, p3, p4];
    const copia = pontosOriginais.map((p) => ({ ...p }));
    reancorarPontosDeRota([A, B, C], [A, C], pontosOriginais);
    expect(pontosOriginais).toEqual(copia);
  });
});
