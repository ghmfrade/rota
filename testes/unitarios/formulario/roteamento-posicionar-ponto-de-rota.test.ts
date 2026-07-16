import { describe, expect, it } from "vitest";
import type { PontoDeRota } from "@/shared/contrato";
import type { Coordenada } from "@/shared/mapa/geometria";
import {
  inserirPontoDeRota,
  moverPontoDeRota,
  removerPontoDeRota,
} from "@/formulario/roteamento";

// TASK-063 — posicionamento de pontos de rota no array `rota.pontos_de_rota[]`
// (Spec 03 §3.6.1: ordem de travessia = par (`apos_parada_ordem`, índice no
// array)). Reproduz o exemplo trabalhado da spec: paradas A(1), B(2), C(3);
// trecho A→B (apos_parada_ordem=1) recebe p1,p2,p3 nesta ordem ao longo do
// traçado; trecho B→C (apos_parada_ordem=2) recebe p4.

// Linha reta norte→sul (mesma convenção do teste de ancoragem): A no início,
// B no meio, C no fim; p1/p2/p3 entre A e B, em ordem crescente de distância;
// p4 entre B e C.
const LINHA: Coordenada[] = Array.from({ length: 101 }, (_, i) => ({
  lng: -46,
  lat: -23.0 - i * 0.01,
}));

const p1: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.1, longitude: -46 };
const p2: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.2, longitude: -46 };
const p3: PontoDeRota = { apos_parada_ordem: 1, latitude: -23.3, longitude: -46 };
const p4: PontoDeRota = { apos_parada_ordem: 2, latitude: -23.7, longitude: -46 };

describe("inserirPontoDeRota — exemplo trabalhado (Spec 03 §3.6.1)", () => {
  it("insere um ponto novo no meio do trecho 1, preservando a ordem ao longo da linha", () => {
    // p2 já existe entre p1 e p3; insere um ponto ENTRE p2 e p3 (lat -23.25).
    const existentes = [p1, p2, p3, p4];
    const resultado = inserirPontoDeRota(existentes, LINHA, {
      latitude: -23.25,
      longitude: -46,
      aposParadaOrdem: 1,
    });

    expect(resultado).toHaveLength(5);
    // A ordem resultante deve ser p1, p2, NOVO, p3, p4 — respeitando a
    // distância ao longo do traçado dentro do mesmo trecho.
    expect(resultado.map((p) => p.latitude)).toEqual([
      p1.latitude,
      p2.latitude,
      -23.25,
      p3.latitude,
      p4.latitude,
    ]);
    // Nenhum ponto ganha uuid (RN-042).
    resultado.forEach((p) => expect(p).not.toHaveProperty("uuid"));
  });

  it("insere um ponto novo no trecho 2, depois de todos os pontos do trecho 1", () => {
    const existentes = [p1, p2, p3];
    const resultado = inserirPontoDeRota(existentes, LINHA, {
      latitude: -23.7,
      longitude: -46,
      aposParadaOrdem: 2,
    });

    expect(resultado.map((p) => p.apos_parada_ordem)).toEqual([1, 1, 1, 2]);
    expect(resultado[3]).toEqual({ apos_parada_ordem: 2, latitude: -23.7, longitude: -46 });
  });

  it("array vazio: insere o único ponto do trecho", () => {
    const resultado = inserirPontoDeRota([], LINHA, {
      latitude: -23.2,
      longitude: -46,
      aposParadaOrdem: 1,
    });
    expect(resultado).toEqual([{ apos_parada_ordem: 1, latitude: -23.2, longitude: -46 }]);
  });

  it("[inválido] não muta o array recebido", () => {
    const existentes = [p1, p2];
    const copiaOriginal = [...existentes];
    inserirPontoDeRota(existentes, LINHA, { latitude: -23.15, longitude: -46, aposParadaOrdem: 1 });
    expect(existentes).toEqual(copiaOriginal);
  });
});

describe("moverPontoDeRota", () => {
  it("atualiza a coordenada do índice, preservando apos_parada_ordem (sem re-ancorar)", () => {
    const resultado = moverPontoDeRota([p1, p2, p4], 1, { latitude: -23.22, longitude: -45.9 });
    expect(resultado[1]).toEqual({ apos_parada_ordem: 1, latitude: -23.22, longitude: -45.9 });
    // Os demais pontos ficam intactos.
    expect(resultado[0]).toEqual(p1);
    expect(resultado[2]).toEqual(p4);
  });

  it("[inválido] não muta o array recebido", () => {
    const pontos = [p1, p2];
    const copiaOriginal = [...pontos];
    moverPontoDeRota(pontos, 0, { latitude: -23.11, longitude: -46 });
    expect(pontos).toEqual(copiaOriginal);
  });
});

describe("removerPontoDeRota", () => {
  it("remove o ponto do índice, preservando os demais na ordem", () => {
    const resultado = removerPontoDeRota([p1, p2, p3], 1);
    expect(resultado).toEqual([p1, p3]);
  });

  it("[inválido] não muta o array recebido", () => {
    const pontos = [p1, p2, p3];
    const copiaOriginal = [...pontos];
    removerPontoDeRota(pontos, 1);
    expect(pontos).toEqual(copiaOriginal);
  });
});
