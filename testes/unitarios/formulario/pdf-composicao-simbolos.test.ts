// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import {
  comporImagemComSimbolos,
  projetarSimbolos,
  type ProjetorDeCoordenadas,
} from "@/formulario/pdf/captura-mapa-pdf";
import { LADO_QUADRADO_SECAO } from "@/formulario/pdf/simbolos-mapa-pdf";
import type { SimboloParada } from "@/formulario/pdf/legenda-itinerario";
import type { SimboloProjetado } from "@/formulario/pdf/simbolos-mapa-pdf";

// TASK-127 (fechamento de ressalvas) — cobre o caminho de composição que a
// revisão apontou sem teste (problema 4 do parecer): `projetarSimbolos` e
// `comporImagemComSimbolos`, onde vive a escala que corrige o problema 1
// (símbolos em tamanho absoluto sob canvas de devicePixelRatio ≠ 1). Canvas
// FALSO (registra chamadas do contexto 2D), nunca canvas real nem WebGL em
// Vitest — mesmo precedente de `pdf-simbolos-mapa.test.ts`
// (`docs-dev/08-TEST_STRATEGY.md` §7).

interface ContextoFalso {
  chamadas: { metodo: string; args: unknown[] }[];
  drawImage: (...args: unknown[]) => void;
  save: () => void;
  restore: () => void;
  beginPath: () => void;
  arc: (...args: unknown[]) => void;
  fill: () => void;
  fillRect: (...args: unknown[]) => void;
  fillText: (...args: unknown[]) => void;
  fillStyle: string;
  font: string;
  textAlign: string;
  textBaseline: string;
}

function contextoFalso(): ContextoFalso {
  const chamadas: { metodo: string; args: unknown[] }[] = [];
  const registrar =
    (metodo: string) =>
    (...args: unknown[]) =>
      chamadas.push({ metodo, args });
  return {
    chamadas,
    drawImage: registrar("drawImage"),
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
  };
}

/** Canvas FALSO: objeto com a forma mínima que `comporImagemComSimbolos` usa
 * (width/height, getContext, toDataURL) — nunca `HTMLCanvasElement` real. */
function canvasFalso(largura: number, altura: number, ctx: ContextoFalso | null = contextoFalso()) {
  return {
    width: largura,
    height: altura,
    getContext: () => ctx,
    toDataURL: () => "data:image/png;base64,FAKE",
  };
}

/** Intercepta `document.createElement("canvas")` para devolver o canvas
 * FALSO — `comporImagemComSimbolos` cria o canvas de composição por dentro. */
function interceptarCanvasComposto(composto: ReturnType<typeof canvasFalso>) {
  const original = document.createElement.bind(document);
  return vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") return composto as unknown as HTMLCanvasElement;
    return original(tag);
  });
}

const SIMBOLO_SECAO: SimboloProjetado = { tipo: "secao", rotulo: "1º", x: 100, y: 100 };

describe("comporImagemComSimbolos — escala do caminho de composição (condição de merge)", () => {
  test("canvas base com o DOBRO da largura nominal: símbolos saem com o dobro de tamanho E de posição", () => {
    const larguraNominal = 1400;
    const ctxComposto = contextoFalso();
    const composto = canvasFalso(larguraNominal * 2, 840 * 2, ctxComposto);
    const espiao = interceptarCanvasComposto(composto);
    const canvasBase = { width: larguraNominal * 2, height: 840 * 2 } as unknown as HTMLCanvasElement;

    comporImagemComSimbolos(canvasBase, [SIMBOLO_SECAO], larguraNominal);

    expect(ctxComposto.chamadas.some((c) => c.metodo === "drawImage")).toBe(true);
    const [x, y, largura] = ctxComposto.chamadas.find((c) => c.metodo === "fillRect")!
      .args as number[];
    expect(largura).toBe(LADO_QUADRADO_SECAO * 2);
    // Posição projetada (100,100) escalada por 2 = (200,200); canto = centro - metade do lado.
    expect(x).toBeCloseTo(200 - LADO_QUADRADO_SECAO);
    expect(y).toBeCloseTo(200 - LADO_QUADRADO_SECAO);

    espiao.mockRestore();
  });

  test("canvas base do mesmo tamanho da largura nominal: escala 1, nada dobra", () => {
    const larguraNominal = 1400;
    const ctxComposto = contextoFalso();
    const composto = canvasFalso(larguraNominal, 840, ctxComposto);
    const espiao = interceptarCanvasComposto(composto);
    const canvasBase = { width: larguraNominal, height: 840 } as unknown as HTMLCanvasElement;

    comporImagemComSimbolos(canvasBase, [SIMBOLO_SECAO], larguraNominal);

    const [x, y, largura] = ctxComposto.chamadas.find((c) => c.metodo === "fillRect")!
      .args as number[];
    expect(largura).toBe(LADO_QUADRADO_SECAO);
    expect(x).toBeCloseTo(100 - LADO_QUADRADO_SECAO / 2);
    expect(y).toBeCloseTo(100 - LADO_QUADRADO_SECAO / 2);

    espiao.mockRestore();
  });

  test("devolve o data-URI produzido pelo canvas de composição", () => {
    const composto = canvasFalso(1400, 840);
    const espiao = interceptarCanvasComposto(composto);
    const canvasBase = { width: 1400, height: 840 } as unknown as HTMLCanvasElement;

    const resultado = comporImagemComSimbolos(canvasBase, [], 1400);

    expect(resultado).toBe("data:image/png;base64,FAKE");
    espiao.mockRestore();
  });

  test("[inválido] contexto 2D indisponível (getContext devolve null) lança — o chamador trata como falha tolerada (DEC-104)", () => {
    const composto = canvasFalso(1400, 840, null);
    const espiao = interceptarCanvasComposto(composto);
    const canvasBase = { width: 1400, height: 840 } as unknown as HTMLCanvasElement;

    expect(() => comporImagemComSimbolos(canvasBase, [SIMBOLO_SECAO], 1400)).toThrow();

    espiao.mockRestore();
  });
});

describe("projetarSimbolos — coordenadas geográficas para pixels do canvas", () => {
  test("converte lon/lat via o projetor do mapa, preservando tipo e rótulo", () => {
    const projetor: ProjetorDeCoordenadas = {
      project: ([lon, lat]) => ({ x: lon * 10, y: lat * 10 }),
    };
    const simbolos: SimboloParada[] = [
      { tipo: "secao", rotulo: "1º", latitude: 5, longitude: 7 },
      { tipo: "local", rotulo: "1.1", latitude: 2, longitude: 3 },
    ];

    const resultado = projetarSimbolos(projetor, simbolos);

    expect(resultado).toEqual([
      { tipo: "secao", rotulo: "1º", x: 70, y: 50 },
      { tipo: "local", rotulo: "1.1", x: 30, y: 20 },
    ]);
  });

  test("[inválido] lista vazia não chama o projetor e devolve lista vazia", () => {
    const project = vi.fn();
    const resultado = projetarSimbolos({ project }, []);

    expect(project).not.toHaveBeenCalled();
    expect(resultado).toEqual([]);
  });
});
