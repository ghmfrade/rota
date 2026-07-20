// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { act, renderizar } from "../shared-ui/_ajuda-render";

const dublê = vi.hoisted(() => ({
  instancia: null as null | {
    handlers: Map<string, (evento: EventoMapa) => void>;
    acertos: unknown[];
    queryRenderedFeatures: ReturnType<typeof vi.fn>;
  },
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

    remove() {}
  },
  Marker: class {},
}));

import { Mapa } from "@/shared/mapa";

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
