// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { act, renderizar } from "../shared-ui/_ajuda-render";

const dublê = vi.hoisted(() => ({
  instancia: null as null | {
    handlers: Map<string, (evento: EventoMapa) => void>;
    acertos: unknown[];
    queryRenderedFeatures: ReturnType<typeof vi.fn>;
    canvas: HTMLCanvasElement;
  },
  marcadores: [] as Array<{
    elemento: HTMLElement;
    arrastavel: boolean;
    setDraggable: (valor: boolean) => void;
    setLngLat: (valor: [number, number]) => unknown;
    getElement: () => HTMLElement;
  }>,
}));

interface EventoMapa {
  lngLat: { lng: number; lat: number };
  point: { x: number; y: number };
  originalEvent: { clientX: number; clientY: number };
}

vi.mock("maplibre-gl", () => ({
  Map: class {
    handlers = new globalThis.Map<string, (evento: EventoMapa) => void>();
    acertos: unknown[] = [];
    queryRenderedFeatures = vi.fn(() => this.acertos);
    canvas = document.createElement("canvas");

    constructor() {
      dublê.instancia = this;
    }

    on(nome: string, handler: (evento: EventoMapa) => void) {
      this.handlers.set(nome, handler);
    }

    getLayer() {
      return { id: "linhas-mapa-camada" };
    }

    getSource() {
      return undefined;
    }

    addSource() {}
    addLayer() {}

    getCanvas() {
      return this.canvas;
    }

    remove() {}
  },
  Marker: class {
    elemento: HTMLElement;
    arrastavel: boolean;

    constructor(opcoes: { element?: HTMLElement; draggable?: boolean } = {}) {
      this.elemento = opcoes.element ?? document.createElement("div");
      this.arrastavel = opcoes.draggable ?? false;
      dublê.marcadores.push(this);
    }

    setDraggable(valor: boolean) {
      this.arrastavel = valor;
    }

    setLngLat() {
      return this;
    }

    addTo() {
      return this;
    }

    on() {}
    remove() {}

    getElement() {
      return this.elemento;
    }
  },
}));

import { Mapa, type LinhaMapa, type MarcadorMapa } from "@/shared/mapa";

const EVENTO: EventoMapa = {
  lngLat: { lng: -46.4, lat: -23.89 },
  point: { x: 80, y: 90 },
  originalEvent: { clientX: 180, clientY: 190 },
};

const LINHA: LinhaMapa = {
  id: "rota",
  pontos: [
    { lng: -46.5, lat: -23.9 },
    { lng: -46.3, lat: -23.9 },
  ],
};

async function montarMapa() {
  const aoClicarDireito = vi.fn();
  const aoClicarDireitoNaLinha = vi.fn();
  const resultado = renderizar(
    <Mapa
      aoClicarDireito={aoClicarDireito}
      aoClicarDireitoNaLinha={aoClicarDireitoNaLinha}
    />,
  );
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  if (!dublê.instancia) throw new Error("Mapa MapLibre não inicializado no teste");
  return { resultado, aoClicarDireito, aoClicarDireitoNaLinha, mapa: dublê.instancia };
}

describe("Mapa — hit-test do clique direito (TASK-065/067; DEC-055)", () => {
  test("contextmenu SOBRE a camada chama somente aoClicarDireitoNaLinha", async () => {
    const montagem = await montarMapa();
    montagem.mapa.acertos = [{ layer: { id: "linhas-mapa-camada" } }];

    act(() => montagem.mapa.handlers.get("contextmenu")?.(EVENTO));

    expect(montagem.aoClicarDireitoNaLinha).toHaveBeenCalledWith(
      { lng: -46.4, lat: -23.89 },
      { x: 180, y: 190 },
    );
    expect(montagem.aoClicarDireito).not.toHaveBeenCalled();
    expect(montagem.mapa.queryRenderedFeatures).toHaveBeenCalledWith(
      [
        [74, 84],
        [86, 96],
      ],
      { layers: ["linhas-mapa-camada"] },
    );
    montagem.resultado.desmontar();
  });

  test("contextmenu FORA da camada chama somente aoClicarDireito", async () => {
    const montagem = await montarMapa();
    montagem.mapa.acertos = [];

    act(() => montagem.mapa.handlers.get("contextmenu")?.(EVENTO));

    expect(montagem.aoClicarDireito).toHaveBeenCalledWith(
      { lng: -46.4, lat: -23.89 },
      { x: 180, y: 190 },
    );
    expect(montagem.aoClicarDireitoNaLinha).not.toHaveBeenCalled();
    montagem.resultado.desmontar();
  });
});

describe("Mapa — affordance de hover sobre a linha (TASK-069; DEC-072)", () => {
  test("hover e clique entregam a mesma coordenada projetada e mudam o cursor", async () => {
    const aoMoverSobreLinha = vi.fn();
    const aoClicarNaLinha = vi.fn();
    const resultado = renderizar(
      <Mapa
        linhas={[LINHA]}
        aoMoverSobreLinha={aoMoverSobreLinha}
        aoClicarNaLinha={aoClicarNaLinha}
      />,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    if (!dublê.instancia) throw new Error("Mapa MapLibre não inicializado no teste");
    dublê.instancia.acertos = [{ layer: { id: "linhas-mapa-camada" } }];

    act(() => dublê.instancia?.handlers.get("mousemove")?.(EVENTO));
    act(() => dublê.instancia?.handlers.get("click")?.(EVENTO));

    const projetada = { lng: -46.4, lat: -23.9 };
    expect(aoMoverSobreLinha).toHaveBeenLastCalledWith(projetada);
    expect(aoClicarNaLinha).toHaveBeenCalledWith(projetada);
    expect(dublê.instancia.canvas.style.cursor).toBe("pointer");
    resultado.desmontar();
  });

  test("[inválido] fora da linha e mouseleave limpam cursor e pré-visualização", async () => {
    const aoMoverSobreLinha = vi.fn();
    const resultado = renderizar(
      <Mapa linhas={[LINHA]} aoMoverSobreLinha={aoMoverSobreLinha} />,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    if (!dublê.instancia) throw new Error("Mapa MapLibre não inicializado no teste");
    dublê.instancia.acertos = [];
    dublê.instancia.canvas.style.cursor = "pointer";

    act(() => dublê.instancia?.handlers.get("mousemove")?.(EVENTO));
    expect(aoMoverSobreLinha).toHaveBeenLastCalledWith(null);
    expect(dublê.instancia.canvas.style.cursor).toBe("");

    dublê.instancia.canvas.style.cursor = "pointer";
    act(() => {
      resultado.container
        .querySelector('[data-testid="mapa-base"]')
        ?.dispatchEvent(new MouseEvent("mouseleave"));
    });
    expect(aoMoverSobreLinha).toHaveBeenLastCalledWith(null);
    expect(dublê.instancia.canvas.style.cursor).toBe("");
    resultado.desmontar();
  });

  test("[inválido] sem linha não projeta; consumidor sem callback fica inalterado", async () => {
    const aoMoverSobreLinha = vi.fn();
    const semLinha = renderizar(<Mapa aoMoverSobreLinha={aoMoverSobreLinha} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    if (!dublê.instancia) throw new Error("Mapa MapLibre não inicializado no teste");
    dublê.instancia.acertos = [{ layer: { id: "linhas-mapa-camada" } }];
    act(() => dublê.instancia?.handlers.get("mousemove")?.(EVENTO));
    expect(aoMoverSobreLinha).toHaveBeenLastCalledWith(null);
    semLinha.desmontar();

    const semCallback = renderizar(<Mapa linhas={[LINHA]} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    if (!dublê.instancia) throw new Error("Mapa MapLibre não inicializado no teste");
    dublê.instancia.canvas.style.cursor = "grab";
    act(() => dublê.instancia?.handlers.get("mousemove")?.(EVENTO));
    expect(dublê.instancia.canvas.style.cursor).toBe("grab");
    semCallback.desmontar();
  });
});

describe("Mapa — vocabulário visual dos marcadores (TASK-068/DEC-069/070)", () => {
  test("cria quadrado, círculo médio e círculo pequeno com classes semânticas", async () => {
    dublê.marcadores.length = 0;
    const marcadores: MarcadorMapa[] = [
      { id: "secao", posicao: { lng: 1, lat: 1 }, forma: "quadrado" },
      { id: "local", posicao: { lng: 2, lat: 2 }, forma: "circulo", tamanho: "medio" },
      { id: "rota", posicao: { lng: 3, lat: 3 }, forma: "circulo", tamanho: "pequeno" },
    ];
    const resultado = renderizar(<Mapa marcadores={marcadores} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => dublê.instancia?.handlers.get("load")?.(EVENTO));

    expect(dublê.marcadores.map((m) => m.elemento.className)).toEqual([
      "marcador-mapa-quadrado",
      "marcador-mapa-circulo marcador-mapa--medio",
      "marcador-mapa-circulo marcador-mapa--pequeno",
    ]);
    resultado.desmontar();
  });

  test("fantasma é um estado visual aditivo e não arrastável", async () => {
    dublê.marcadores.length = 0;
    const resultado = renderizar(
      <Mapa
        marcadores={[
          {
            id: "fantasma",
            posicao: { lng: 1, lat: 1 },
            forma: "circulo",
            tamanho: "pequeno",
            fantasma: true,
          },
        ]}
      />,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => dublê.instancia?.handlers.get("load")?.(EVENTO));

    expect(dublê.marcadores[0].elemento.className).toContain(
      "marcador-mapa--fantasma",
    );
    expect(dublê.marcadores[0].arrastavel).toBe(false);
    resultado.desmontar();
  });

  test("estado inválido é aditivo e atualiza um marcador já existente", async () => {
    dublê.marcadores.length = 0;
    const base: MarcadorMapa = {
      id: "local",
      posicao: { lng: 2, lat: 2 },
      forma: "circulo",
      tamanho: "medio",
      cor: "#16a34a",
    };
    const resultado = renderizar(<Mapa marcadores={[base]} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => dublê.instancia?.handlers.get("load")?.(EVENTO));
    const elemento = dublê.marcadores[0].elemento;
    elemento.classList.add("maplibregl-marker");

    resultado.rerenderizar(<Mapa marcadores={[{ ...base, invalido: true }]} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(dublê.marcadores).toHaveLength(1);
    expect(elemento.className).toContain("marcador-mapa--invalido");
    expect(elemento.className).toContain("marcador-mapa--medio");
    expect(elemento.className).toContain("maplibregl-marker");
    expect(elemento.style.backgroundColor).toBe("rgb(22, 163, 74)");
    resultado.desmontar();
  });
});
