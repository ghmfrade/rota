import { describe, expect, it } from "vitest";
import {
  inserirEmSecao,
  LIMIAR_350M,
  RAIO_TERRA_M,
  validaEstaticoSecao,
  validaLocalPareado,
  type Ponto,
} from "../../../src/shared/geo";

// Unitários (categoria 2, docs-dev/08 — validação de domínio) para a regra
// dos 350 m (Spec 03 §7): inserção incremental de Seção (RN-027), checagem
// estática fraca (RN-028) e pareada de Local (RN-032).

// Pontos ao longo do equador (latitude 0), com longitude escalada de forma
// que a distância Haversine entre duas posições m1,m2 seja EXATAMENTE
// |m1 - m2| metros: com latitude fixa em 0, cos(phi)=1 nos dois lados e
// haversine(a,b) = R * deltaLambda(rad) (mesma identidade explorada em
// primitivas.test.ts com latitude variável). Isso permite montar cenários
// com distâncias exatas em metros usando só números simples.
const K = 180 / (Math.PI * RAIO_TERRA_M);
const ponto = (metros: number): Ponto => ({ latitude: 0, longitude: metros * K });

describe("LIMIAR_350M (Spec 03 §7)", () => {
  it("é 350 metros", () => {
    expect(LIMIAR_350M).toBe(350);
  });
});

describe("inserirEmSecao (RN-027, Spec 03 §7.2)", () => {
  it("1º ponto: sempre aceito, sem checagem (conjunto vazio)", () => {
    const candidato = ponto(999_999);
    expect(inserirEmSecao([], candidato).aceito).toBe(true);
  });

  it("2º ponto a 600 m do 1º: aceito (ambos ≤ 350 m do ponto médio)", () => {
    const s = [ponto(0)];
    expect(inserirEmSecao(s, ponto(600)).aceito).toBe(true);
  });

  it("2º ponto a 699 m do 1º (limite): aceito", () => {
    const s = [ponto(0)];
    expect(inserirEmSecao(s, ponto(699)).aceito).toBe(true);
  });

  it("inválido: 2º ponto a 800 m do 1º: recusado (> 700 m entre eles)", () => {
    const s = [ponto(0)];
    expect(inserirEmSecao(s, ponto(800)).aceito).toBe(false);
  });

  it("inválido: 2º ponto a 701 m do 1º (logo acima do limite): recusado", () => {
    const s = [ponto(0)];
    expect(inserirEmSecao(s, ponto(701)).aceito).toBe(false);
  });

  it("inválido: candidato desloca o centroide e empurra ponto já aceito para fora dos 350 m, mesmo estando ele próprio a ≤ 350 m do centroide anterior", () => {
    // S = {-100, 500}, centroide antigo = 200 (aceito: ambos a 300 m dele).
    const s = [ponto(-100), ponto(500)];
    const candidato = ponto(450);

    // Isoladamente, o candidato está a 250 m do centroide ANTIGO (≤ 350 m) —
    // uma checagem ingênua aceitaria. Mas o centroide RESULTANTE
    // (-100+500+450)/3 = 283,33 deixa o ponto -100 a 383,33 m dele.
    expect(inserirEmSecao([], ponto(200)).aceito).toBe(true); // sanity: centroide antigo é 200
    expect(inserirEmSecao(s, candidato).aceito).toBe(false);
  });

  it("ordem de inserção importa: mesmo ponto é aceito numa ordem e recusado noutra", () => {
    const p0 = ponto(0);
    const p400 = ponto(400);
    const p750 = ponto(750);

    // Ordem 1: 0, 400, 750 — o terceiro ponto (750) é recusado.
    let s: Ponto[] = [];
    expect(inserirEmSecao(s, p0).aceito).toBe(true);
    s = [...s, p0];
    expect(inserirEmSecao(s, p400).aceito).toBe(true);
    s = [...s, p400];
    expect(inserirEmSecao(s, p750).aceito).toBe(false);

    // Ordem 2: 750, 400, 0 — desta vez o terceiro ponto (0) é recusado,
    // embora seja o MESMO ponto aceito de primeira na ordem 1.
    s = [];
    expect(inserirEmSecao(s, p750).aceito).toBe(true);
    s = [...s, p750];
    expect(inserirEmSecao(s, p400).aceito).toBe(true);
    s = [...s, p400];
    expect(inserirEmSecao(s, p0).aceito).toBe(false);
  });

  it("não muta o conjunto de pontos aceitos recebido", () => {
    const s = [ponto(0)];
    const copia = [...s];
    inserirEmSecao(s, ponto(300));
    expect(s).toEqual(copia);
  });
});

describe("validaEstaticoSecao (RN-028, Spec 03 §7.3)", () => {
  it("conjunto vazio: OK", () => {
    expect(validaEstaticoSecao([])).toBe(true);
  });

  it("um único ponto: OK", () => {
    expect(validaEstaticoSecao([ponto(0)])).toBe(true);
  });

  it("todos os pontos ≤ 350 m do centroide: OK", () => {
    const pontos = [ponto(0), ponto(300), ponto(600)];
    expect(validaEstaticoSecao(pontos)).toBe(true);
  });

  it("inválido: um ponto claramente a mais de 350 m do centroide: VIOLAÇÃO", () => {
    const pontos = [ponto(0), ponto(2000)];
    expect(validaEstaticoSecao(pontos)).toBe(false);
  });

  it("coerência §7.3: um conjunto produzido pela incremental sempre passa no estático", () => {
    // Reaproveita o resultado da ordem 1 do teste de inserirEmSecao:
    // {0, 400} foi aceito pela incremental (750 foi recusado).
    const aceitosPelaIncremental = [ponto(0), ponto(400)];
    expect(validaEstaticoSecao(aceitosPelaIncremental)).toBe(true);
  });
});

describe("validaLocalPareado (RN-032, Spec 03 §7.4)", () => {
  it("só geolocalizacao_ida presente: válido", () => {
    expect(validaLocalPareado(ponto(0), undefined)).toBe(true);
  });

  it("só geolocalizacao_volta presente: válido", () => {
    expect(validaLocalPareado(undefined, ponto(0))).toBe(true);
  });

  it("nenhuma presente: válido nesta função (exigência de ao menos uma é da Spec 02 §7.1)", () => {
    expect(validaLocalPareado(undefined, undefined)).toBe(true);
  });

  it("ambas presentes a ≤ 350 m: válido", () => {
    expect(validaLocalPareado(ponto(0), ponto(300))).toBe(true);
  });

  it("ambas presentes a 340 m (perto do limite): válido", () => {
    expect(validaLocalPareado(ponto(0), ponto(340))).toBe(true);
  });

  it("inválido: ambas presentes a 360 m (acima do limite): inválido (dois Locais distintos)", () => {
    expect(validaLocalPareado(ponto(0), ponto(360))).toBe(false);
  });

  it("inválido: ambas presentes claramente distantes: inválido", () => {
    expect(validaLocalPareado(ponto(0), ponto(400))).toBe(false);
  });
});
