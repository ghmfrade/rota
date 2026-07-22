import { describe, expect, test } from "vitest";
import {
  chaveSelecaoDaParada,
  chaveSelecaoDoPontoDeRota,
} from "@/formulario/itinerarios/selecao-itinerario";
import type { ParadaEmEdicao } from "@/formulario/itinerarios/motor-montagem";

describe("chaveSelecaoDaParada (TASK-064)", () => {
  test("Seção gera a MESMA chave usada pelo marcador `secao-<uuid>`", () => {
    const parada: ParadaEmEdicao = { tipo: "secao", secaoUuid: "aaaa" };
    expect(chaveSelecaoDaParada(parada)).toBe("secao-aaaa");
  });

  test("Local gera a MESMA chave usada pelo marcador `local-<uuid>`", () => {
    const parada: ParadaEmEdicao = { tipo: "local", localUuid: "bbbb" };
    expect(chaveSelecaoDaParada(parada)).toBe("local-bbbb");
  });

  test("[inválido] Seção e Local com o mesmo UUID nunca colidem (prefixo distinto)", () => {
    const secao: ParadaEmEdicao = { tipo: "secao", secaoUuid: "mesmo-uuid" };
    const local: ParadaEmEdicao = { tipo: "local", localUuid: "mesmo-uuid" };
    expect(chaveSelecaoDaParada(secao)).not.toBe(chaveSelecaoDaParada(local));
  });
});

describe("chaveSelecaoDoPontoDeRota (TASK-064; RN-042)", () => {
  test("usa o índice no array como identidade, igual ao `id` do marcador `ponto-rota-<indice>`", () => {
    expect(chaveSelecaoDoPontoDeRota(0)).toBe("ponto-rota-0");
    expect(chaveSelecaoDoPontoDeRota(3)).toBe("ponto-rota-3");
  });
});
