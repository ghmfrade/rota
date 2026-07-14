import { describe, expect, test } from "vitest";
import {
  comporDescricao,
  limpaNomes,
  type ParadaRota,
} from "@/formulario/roteamento";
import { esquemaDescricaoItinerario } from "@/shared/contrato";

// TASK-025 — compositor DESCRICAO(itinerario) (Spec 03 §3.7; RN-044/045/046/
// 053). Cobre a intercalação Seção↔via (§3.7.2/.3/.6), a limpeza por
// intervalo (§3.7.5) e os casos de borda (§3.7.8), com o exemplo literal da
// Spec 03 §3.7.2 e o cenário de Locais no meio da Spec 03 §3.7.6.

const SECAO_A = { uuid: "11111111-1111-4111-8111-111111111111", rotulo: "Cidade A - Seção A" };
const SECAO_B = { uuid: "22222222-2222-4222-8222-222222222222", rotulo: "Cidade B - Seção B" };
const SECAO_C = { uuid: "33333333-3333-4333-8333-333333333333", rotulo: "Cidade C - Seção C" };

const paradaSecao = (secao: typeof SECAO_A): ParadaRota => ({
  latitude: 0,
  longitude: 0,
  secao,
});
const paradaLocal = (): ParadaRota => ({ latitude: 0, longitude: 0 });

describe("comporDescricao — exemplo literal da Spec 03 §3.7.2", () => {
  test("Seção A, Rua 1, Avenida 2, Seção B, Rodovia 3, Seção C", () => {
    const paradas: ParadaRota[] = [
      paradaSecao(SECAO_A),
      paradaSecao(SECAO_B),
      paradaSecao(SECAO_C),
    ];
    const nomesViasPorTrecho = [["Rua 1", "Avenida 2"], ["Rodovia 3"]];

    const descricao = comporDescricao(paradas, nomesViasPorTrecho);

    expect(descricao.texto).toBe(
      "Cidade A - Seção A, Rua 1, Avenida 2, Cidade B - Seção B, Rodovia 3, Cidade C - Seção C.",
    );
    expect(descricao.itens).toEqual([
      { tipo: "secao", secao_uuid: SECAO_A.uuid, rotulo: SECAO_A.rotulo },
      { tipo: "via", nome: "Rua 1" },
      { tipo: "via", nome: "Avenida 2" },
      { tipo: "secao", secao_uuid: SECAO_B.uuid, rotulo: SECAO_B.rotulo },
      { tipo: "via", nome: "Rodovia 3" },
      { tipo: "secao", secao_uuid: SECAO_C.uuid, rotulo: SECAO_C.rotulo },
    ]);
  });

  test("saída satisfaz o schema strict (contrato, RN-010/044)", () => {
    const paradas: ParadaRota[] = [paradaSecao(SECAO_A), paradaSecao(SECAO_B)];
    const descricao = comporDescricao(paradas, [["Rua X"]]);
    expect(esquemaDescricaoItinerario.safeParse(descricao).success).toBe(true);
  });
});

describe("comporDescricao — Locais são ignorados como marco (Spec 03 §3.7.3/.6)", () => {
  test("Seção A → Local X → Local Y → Seção B → Local Z → Seção C: só Seções viram item, vias de todo o intervalo entram no bloco", () => {
    // Paradas: 1.Seção A  2.Local X  3.Local Y  4.Seção B  5.Local Z  6.Seção C
    const paradas: ParadaRota[] = [
      paradaSecao(SECAO_A),
      paradaLocal(),
      paradaLocal(),
      paradaSecao(SECAO_B),
      paradaLocal(),
      paradaSecao(SECAO_C),
    ];
    // 5 trechos: 1→2, 2→3, 3→4 (bloco A→B); 4→5, 5→6 (bloco B→C).
    const nomesViasPorTrecho = [
      ["Rua 1"],
      ["Rua 2"],
      ["Rua 3"],
      ["Rua 4"],
      ["Rua 5"],
    ];

    const descricao = comporDescricao(paradas, nomesViasPorTrecho);

    expect(descricao.itens).toEqual([
      { tipo: "secao", secao_uuid: SECAO_A.uuid, rotulo: SECAO_A.rotulo },
      { tipo: "via", nome: "Rua 1" },
      { tipo: "via", nome: "Rua 2" },
      { tipo: "via", nome: "Rua 3" },
      { tipo: "secao", secao_uuid: SECAO_B.uuid, rotulo: SECAO_B.rotulo },
      { tipo: "via", nome: "Rua 4" },
      { tipo: "via", nome: "Rua 5" },
      { tipo: "secao", secao_uuid: SECAO_C.uuid, rotulo: SECAO_C.rotulo },
    ]);
    // Nenhum Local aparece como item.
    expect(descricao.itens.filter((item) => item.tipo === "secao")).toHaveLength(3);
  });
});

describe("comporDescricao — casos de borda (Spec 03 §3.7.8)", () => {
  test("nenhuma via nomeada entre duas Seções → Seções ficam adjacentes", () => {
    const paradas: ParadaRota[] = [paradaSecao(SECAO_A), paradaSecao(SECAO_B)];
    const descricao = comporDescricao(paradas, [[undefined, ""]]);

    expect(descricao.itens).toEqual([
      { tipo: "secao", secao_uuid: SECAO_A.uuid, rotulo: SECAO_A.rotulo },
      { tipo: "secao", secao_uuid: SECAO_B.uuid, rotulo: SECAO_B.rotulo },
    ]);
    expect(descricao.texto).toBe(`${SECAO_A.rotulo}, ${SECAO_B.rotulo}.`);
  });

  test("itinerário com apenas duas Seções — dois marcos, mínimo da Spec 02 §10.5", () => {
    const paradas: ParadaRota[] = [paradaSecao(SECAO_A), paradaSecao(SECAO_B)];
    const descricao = comporDescricao(paradas, [["Rua X"]]);
    const itensSecao = descricao.itens.filter((item) => item.tipo === "secao");
    expect(itensSecao).toHaveLength(2);
  });

  test("OSRM sem steps/name (RN-053) — descrição só com os marcos", () => {
    const paradas: ParadaRota[] = [paradaSecao(SECAO_A), paradaSecao(SECAO_B)];
    const descricao = comporDescricao(paradas, [[]]);
    expect(descricao.itens).toEqual([
      { tipo: "secao", secao_uuid: SECAO_A.uuid, rotulo: SECAO_A.rotulo },
      { tipo: "secao", secao_uuid: SECAO_B.uuid, rotulo: SECAO_B.rotulo },
    ]);
  });

  test("[inválido] itinerário sem nenhum marco de Seção — itens/texto vazios (não é responsabilidade do compositor consertar)", () => {
    const paradas: ParadaRota[] = [paradaLocal(), paradaLocal()];
    const descricao = comporDescricao(paradas, [["Rua X"]]);
    expect(descricao).toEqual({ texto: "", itens: [] });
  });
});

describe("limpaNomes — RN-045, Spec 03 §3.7.5", () => {
  test("remove vazios, nulos e só-espaços", () => {
    expect(limpaNomes(["Rua A", "", null, undefined, "   ", "Rua B"])).toEqual([
      "Rua A",
      "Rua B",
    ]);
  });

  test("colapsa repetições CONSECUTIVAS", () => {
    expect(limpaNomes(["Rua A", "Rua A", "Rua A", "Rua B"])).toEqual(["Rua A", "Rua B"]);
  });

  test("preserva repetições NÃO consecutivas", () => {
    expect(limpaNomes(["Rua A", "Avenida B", "Rua A"])).toEqual([
      "Rua A",
      "Avenida B",
      "Rua A",
    ]);
  });

  test("padroniza espaços (colapsa múltiplos, apara pontas) sem mexer em caixa/acento", () => {
    expect(limpaNomes(["  Rua   Áurea  ", "RUA ÁUREA"])).toEqual(["Rua Áurea", "RUA ÁUREA"]);
  });

  test("comparação de consecutivas ignora só diferença de espaçamento", () => {
    expect(limpaNomes(["Rua A", "  Rua   A  "])).toEqual(["Rua A"]);
  });

  test("[inválido] não inventa nome — via sem nome é omitida, nunca vira marcador genérico", () => {
    expect(limpaNomes([undefined, null, ""])).toEqual([]);
  });
});

describe("comporDescricao — limpeza por intervalo, não global (Spec 03 §3.7.6, caso-armadilha)", () => {
  test("via que fecha o bloco A→B e reabre o B→C NÃO é deduplicada entre blocos", () => {
    const paradas: ParadaRota[] = [
      paradaSecao(SECAO_A),
      paradaSecao(SECAO_B),
      paradaSecao(SECAO_C),
    ];
    // Bloco A→B termina em "Rua X"; bloco B→C começa em "Rua X" de novo —
    // são intervalos DIFERENTES, a consecutividade de §3.7.5 não atravessa Seções.
    const nomesViasPorTrecho = [["Rua W", "Rua X"], ["Rua X", "Rua Y"]];

    const descricao = comporDescricao(paradas, nomesViasPorTrecho);

    expect(descricao.itens).toEqual([
      { tipo: "secao", secao_uuid: SECAO_A.uuid, rotulo: SECAO_A.rotulo },
      { tipo: "via", nome: "Rua W" },
      { tipo: "via", nome: "Rua X" },
      { tipo: "secao", secao_uuid: SECAO_B.uuid, rotulo: SECAO_B.rotulo },
      { tipo: "via", nome: "Rua X" },
      { tipo: "via", nome: "Rua Y" },
      { tipo: "secao", secao_uuid: SECAO_C.uuid, rotulo: SECAO_C.rotulo },
    ]);
  });
});
