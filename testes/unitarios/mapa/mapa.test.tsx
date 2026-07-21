// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { act, renderizar } from "../shared-ui/_ajuda-render";

const dublê = vi.hoisted(() => ({
  instancia: null as null | {
    handlers: Map<string, (evento: EventoMapa) => void>;
    acertos: unknown[];
    queryRenderedFeatures: ReturnType<typeof vi.fn>;
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

import { Mapa, type MarcadorMapa } from "@/shared/mapa";

const EVENTO: EventoMapa = {
  lngLat: { lng: -46.4, lat: -23.9 },
  point: { x: 80, y: 90 },
  originalEvent: { clientX: 180, clientY: 190 },
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
      { lng: -46.4, lat: -23.9 },
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
      { lng: -46.4, lat: -23.9 },
      { x: 180, y: 190 },
    );
    expect(montagem.aoClicarDireitoNaLinha).not.toHaveBeenCalled();
    montagem.resultado.desmontar();
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

    resultado.rerenderizar(<Mapa marcadores={[{ ...base, invalido: true }]} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(dublê.marcadores).toHaveLength(1);
    expect(elemento.className).toContain("marcador-mapa--invalido");
    expect(elemento.className).toContain("marcador-mapa--medio");
    expect(elemento.style.backgroundColor).toBe("rgb(22, 163, 74)");
    resultado.desmontar();
  });
});
