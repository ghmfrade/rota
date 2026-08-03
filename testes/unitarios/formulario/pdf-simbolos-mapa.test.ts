import { describe, expect, test } from "vitest";
import {
  COR_CIRCULO_LOCAL,
  COR_QUADRADO_SECAO,
  desenharSimbolos,
  LADO_QUADRADO_SECAO,
  RAIO_CIRCULO_LOCAL,
  simboloDentroDaMoldura,
  type Contexto2DDesenho,
  type SimboloProjetado,
} from "@/formulario/pdf/simbolos-mapa-pdf";

// TASK-127 — desenho 2D dos símbolos sobre a captura (DEC-105; DEC-069).
// Contexto 2D FALSO que registra as chamadas, nunca WebGL nem tiles reais em
// Vitest (`docs-dev/08-TEST_STRATEGY.md` §7).

function contextoFalso(): Contexto2DDesenho & {
  chamadas: { metodo: string; args: unknown[] }[];
} {
  const chamadas: { metodo: string; args: unknown[] }[] = [];
  const registrar =
    (metodo: string) =>
    (...args: unknown[]) =>
      chamadas.push({ metodo, args });

  return {
    chamadas,
    save: registrar("save"),
    restore: registrar("restore"),
    beginPath: registrar("beginPath"),
    arc: registrar("arc"),
    fill: registrar("fill"),
    fillRect: registrar("fillRect"),
    fillText: registrar("fillText"),
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: "",
  } as unknown as Contexto2DDesenho & { chamadas: { metodo: string; args: unknown[] }[] };
}

const MOLDURA = { larguraMoldura: 1400, alturaMoldura: 840 };

describe("desenharSimbolos (DEC-105/DEC-069)", () => {
  test("Seção: quadrado com fillRect + número dentro (centralizado na posição do símbolo)", () => {
    const ctx = contextoFalso();
    const simbolo: SimboloProjetado = { tipo: "secao", rotulo: "1º", x: 100, y: 200 };

    desenharSimbolos(ctx, [simbolo], MOLDURA);

    const retangulos = ctx.chamadas.filter((c) => c.metodo === "fillRect");
    // fillRect é chamado 2x: o halo é um arco (fill), o quadrado da Seção usa
    // fillRect uma vez.
    expect(retangulos).toHaveLength(1);
    const [x, y, largura, altura] = retangulos[0].args as number[];
    expect(largura).toBe(LADO_QUADRADO_SECAO);
    expect(altura).toBe(LADO_QUADRADO_SECAO);
    // Centralizado: canto = centro - metade do lado.
    expect(x).toBeCloseTo(100 - LADO_QUADRADO_SECAO / 2);
    expect(y).toBeCloseTo(200 - LADO_QUADRADO_SECAO / 2);

    const textos = ctx.chamadas.filter((c) => c.metodo === "fillText");
    expect(textos).toHaveLength(1);
    expect(textos[0].args).toEqual(["1º", 100, 200]);
  });

  test("Local: círculo (arc) com fillStyle verde e rótulo AO LADO — nunca nas mesmas coordenadas do centro", () => {
    const ctx = contextoFalso();
    const fillStyles: unknown[] = [];
    const ctxComEspiao: Contexto2DDesenho = new Proxy(ctx, {
      set(alvo, prop, valor) {
        if (prop === "fillStyle") fillStyles.push(valor);
        (alvo as unknown as Record<string, unknown>)[prop as string] = valor;
        return true;
      },
    });
    const simbolo: SimboloProjetado = { tipo: "local", rotulo: "1.1", x: 50, y: 60 };

    desenharSimbolos(ctxComEspiao, [simbolo], MOLDURA);

    expect(fillStyles).toContain(COR_CIRCULO_LOCAL);
    const textos = ctx.chamadas.filter((c) => c.metodo === "fillText");
    expect(textos).toHaveLength(1);
    const [texto, x, y] = textos[0].args as [string, number, number];
    expect(texto).toBe("1.1");
    // Rótulo fica à direita do centro do círculo, fora dele (nunca dentro).
    expect(x).toBeGreaterThan(50 + RAIO_CIRCULO_LOCAL);
    expect(y).toBe(60);
  });

  test("Local sem rótulo (edge case RN-035): círculo desenhado, nenhum fillText chamado", () => {
    const ctx = contextoFalso();
    const simbolo: SimboloProjetado = { tipo: "local", x: 10, y: 10 };

    desenharSimbolos(ctx, [simbolo], MOLDURA);

    expect(ctx.chamadas.some((c) => c.metodo === "fillText")).toBe(false);
    expect(ctx.chamadas.some((c) => c.metodo === "arc")).toBe(true);
  });

  test("hierarquia de tamanho: quadrado de Seção maior que o círculo de Local (DEC-069)", () => {
    expect(LADO_QUADRADO_SECAO).toBeGreaterThan(RAIO_CIRCULO_LOCAL * 2);
  });

  test("cores por token: azul para Seção, verde para Local", () => {
    expect(COR_QUADRADO_SECAO).toBe("#1d4ed8");
    expect(COR_CIRCULO_LOCAL).toBe("#16a34a");
  });

  test("[inválido] símbolo fora da moldura não emite nenhuma chamada de desenho", () => {
    const ctx = contextoFalso();
    const foraDaDireita: SimboloProjetado = { tipo: "secao", rotulo: "1º", x: 2000, y: 100 };
    const foraDeCima: SimboloProjetado = { tipo: "local", rotulo: "1.1", x: 100, y: -10 };

    desenharSimbolos(ctx, [foraDaDireita, foraDeCima], MOLDURA);

    expect(ctx.chamadas).toHaveLength(0);
  });

  test("[inválido] lista vazia não desenha nada", () => {
    const ctx = contextoFalso();

    desenharSimbolos(ctx, [], MOLDURA);

    expect(ctx.chamadas).toHaveLength(0);
  });

  test("simboloDentroDaMoldura — predicado puro nas bordas da moldura", () => {
    expect(simboloDentroDaMoldura({ x: 0, y: 0 }, MOLDURA)).toBe(true);
    expect(simboloDentroDaMoldura({ x: 1400, y: 840 }, MOLDURA)).toBe(true);
    expect(simboloDentroDaMoldura({ x: 1401, y: 0 }, MOLDURA)).toBe(false);
    expect(simboloDentroDaMoldura({ x: 0, y: -1 }, MOLDURA)).toBe(false);
  });

  test("ordem de desenho estável: Locais antes das Seções (halo evita sobreposição ilegível)", () => {
    const ctx = contextoFalso();
    const ordemDosTipos: string[] = [];
    const ctxComOrdem: Contexto2DDesenho = {
      ...ctx,
      arc: (...args: Parameters<Contexto2DDesenho["arc"]>) => {
        ctx.arc(...args);
      },
      fillRect: (...args: Parameters<Contexto2DDesenho["fillRect"]>) => {
        ordemDosTipos.push("secao");
        ctx.fillRect(...args);
      },
      fillText: (texto: string, x: number, y: number) => {
        if (texto.includes(".")) ordemDosTipos.push("local-rotulo");
        ctx.fillText(texto, x, y);
      },
    };
    const secao: SimboloProjetado = { tipo: "secao", rotulo: "1º", x: 100, y: 100 };
    const local: SimboloProjetado = { tipo: "local", rotulo: "1.1", x: 200, y: 100 };

    desenharSimbolos(ctxComOrdem, [secao, local], MOLDURA);

    expect(ordemDosTipos).toEqual(["local-rotulo", "secao"]);
  });
});
