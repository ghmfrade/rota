import { describe, expect, test } from "vitest";
import {
  montarListaIntercaladaItinerario,
  moverPontoDeRotaNaLista,
  podeMoverPontoDeRotaNaLista,
} from "@/formulario/itinerarios/lista-intercalada-itinerario";
import type { ParadaEmEdicao } from "@/formulario/itinerarios/motor-montagem";
import type { PontoDeRota } from "@/shared/contrato";

const A: ParadaEmEdicao = { tipo: "secao", secaoUuid: "A" };
const B: ParadaEmEdicao = { tipo: "secao", secaoUuid: "B" };
const C: ParadaEmEdicao = { tipo: "local", localUuid: "C" };

const p1: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.1, longitude: -46.1 };
const p2: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.2, longitude: -46.2 };
const p3: PontoDeRota = { apos_parada_ordem: 2, latitude: -23.3, longitude: -46.3 };

describe("montarListaIntercaladaItinerario (TASK-079/DEC-060)", () => {
  test("intercala Paradas e pontos por apos_parada_ordem + índice no array", () => {
    const itens = montarListaIntercaladaItinerario([A, B, C], [p3, p1, p2]);

    expect(
      itens.map((item) =>
        item.tipo === "parada"
          ? `parada:${item.indiceParada}`
          : `ponto:${item.indicePonto}:${item.numeroNaTravessia}`,
      ),
    ).toEqual(["parada:0", "ponto:1:1", "ponto:2:2", "parada:1", "ponto:0:3", "parada:2"]);
  });

  test("[inválido][RN-042] recusa ponto órfão depois da última Parada", () => {
    expect(() =>
      montarListaIntercaladaItinerario([A, B], [
        { ...p1, apos_parada_ordem: 2 },
      ]),
    ).toThrow(/RN-042/);
  });
});

describe("moverPontoDeRotaNaLista (TASK-079/DEC-060)", () => {
  test("move dentro do mesmo trecho pela ordem do array e preserva coordenadas", () => {
    const resultado = moverPontoDeRotaNaLista([A, B], [p1, p2], 0, "baixo");

    expect(resultado).toEqual([p2, p1]);
    expect(resultado?.map((ponto) => ponto.apos_parada_ordem)).toEqual([1, 1]);
  });

  test("atravessa Parada intermediária e re-deriva apos_parada_ordem", () => {
    const resultado = moverPontoDeRotaNaLista([A, B, C], [p1], 0, "baixo");

    expect(resultado).toEqual([{ ...p1, apos_parada_ordem: 2 }]);
  });

  test("move de volta ao trecho anterior ao atravessar Parada para cima", () => {
    const pontoNoSegundoTrecho = { ...p3 };
    const resultado = moverPontoDeRotaNaLista(
      [A, B, C],
      [pontoNoSegundoTrecho],
      0,
      "cima",
    );

    expect(resultado).toEqual([{ ...pontoNoSegundoTrecho, apos_parada_ordem: 1 }]);
  });

  test("[inválido][RN-042] bloqueia movimentos além dos extremos válidos", () => {
    expect(moverPontoDeRotaNaLista([A, B], [p1], 0, "cima")).toBeUndefined();
    expect(moverPontoDeRotaNaLista([A, B], [p1], 0, "baixo")).toBeUndefined();
    expect(podeMoverPontoDeRotaNaLista([A, B], [p1], 0, "cima")).toBe(false);
    expect(podeMoverPontoDeRotaNaLista([A, B], [p1], 0, "baixo")).toBe(false);
  });

  test("[inválido] ignora índice de ponto inexistente sem produzir estado parcial", () => {
    expect(moverPontoDeRotaNaLista([A, B], [p1], 9, "baixo")).toBeUndefined();
  });
});
