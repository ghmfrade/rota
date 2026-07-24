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
    posicao: [number, number] | null;
    posicoesRecebidas: Array<[number, number]>;
    handlers: Map<string, () => void>;
    removido: boolean;
    setDraggable: (valor: boolean) => void;
    setLngLat: (valor: [number, number]) => unknown;
    getLngLat: () => { lng: number; lat: number };
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
  // O dublê de `Marker` registra os handlers (`dragstart`/`dragend`) e grava
  // TODAS as posições recebidas por `setLngLat` — é sobre esse histórico que a
  // TASK-097 prova que o marcador em arrasto não é reposicionado pela prop.
  Marker: class {
    elemento: HTMLElement;
    arrastavel: boolean;
    posicao: [number, number] | null = null;
    posicoesRecebidas: Array<[number, number]> = [];
    handlers = new globalThis.Map<string, () => void>();
    removido = false;

    constructor(opcoes: { element?: HTMLElement; draggable?: boolean } = {}) {
      this.elemento = opcoes.element ?? document.createElement("div");
      this.arrastavel = opcoes.draggable ?? false;
      dublê.marcadores.push(this);
    }

    setDraggable(valor: boolean) {
      this.arrastavel = valor;
    }

    setLngLat(valor: [number, number]) {
      this.posicao = valor;
      this.posicoesRecebidas.push(valor);
      return this;
    }

    getLngLat() {
      return { lng: this.posicao?.[0] ?? 0, lat: this.posicao?.[1] ?? 0 };
    }

    addTo() {
      return this;
    }

    on(nome: string, handler: () => void) {
      this.handlers.set(nome, handler);
    }

    remove() {
      this.removido = true;
    }

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

  test("contextmenu SOBRE a linha entrega a coordenada PROJETADA, com a mesma paridade do clique esquerdo (DEC-078/TASK-098)", async () => {
    const aoClicarDireitoNaLinha = vi.fn();
    const resultado = renderizar(
      <Mapa linhas={[LINHA]} aoClicarDireitoNaLinha={aoClicarDireitoNaLinha} />,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    if (!dublê.instancia) throw new Error("Mapa MapLibre não inicializado no teste");
    dublê.instancia.acertos = [{ layer: { id: "linhas-mapa-camada" } }];

    act(() => dublê.instancia?.handlers.get("contextmenu")?.(EVENTO));

    const projetada = { lng: -46.4, lat: -23.9 };
    expect(aoClicarDireitoNaLinha).toHaveBeenCalledWith(projetada, { x: 180, y: 190 });
    resultado.desmontar();
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

describe("Mapa — realce de seleção (TASK-064; Spec 04 §7)", () => {
  test("`selecionado: true` acrescenta a classe na criação e coexiste com `invalido`", async () => {
    dublê.marcadores.length = 0;
    const resultado = renderizar(
      <Mapa
        marcadores={[
          {
            id: "local",
            posicao: { lng: 2, lat: 2 },
            forma: "circulo",
            tamanho: "medio",
            invalido: true,
            selecionado: true,
          },
        ]}
      />,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => dublê.instancia?.handlers.get("load")?.(EVENTO));

    const elemento = dublê.marcadores[0].elemento;
    // Seleção (outline) e erro contextual (border, DEC-070) são classes
    // distintas na MESMA classList — nenhuma remove a outra.
    expect(elemento.className).toContain("marcador-mapa--selecionado");
    expect(elemento.className).toContain("marcador-mapa--invalido");
    resultado.desmontar();
  });

  test("atualiza `selecionado` num marcador já existente (reconciliação)", async () => {
    dublê.marcadores.length = 0;
    const base: MarcadorMapa = {
      id: "secao",
      posicao: { lng: 1, lat: 1 },
      forma: "quadrado",
    };
    const resultado = renderizar(<Mapa marcadores={[base]} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => dublê.instancia?.handlers.get("load")?.(EVENTO));
    const elemento = dublê.marcadores[0].elemento;
    expect(elemento.className).not.toContain("marcador-mapa--selecionado");

    resultado.rerenderizar(<Mapa marcadores={[{ ...base, selecionado: true }]} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(dublê.marcadores).toHaveLength(1);
    expect(elemento.className).toContain("marcador-mapa--selecionado");

    resultado.rerenderizar(<Mapa marcadores={[{ ...base, selecionado: false }]} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(elemento.className).not.toContain("marcador-mapa--selecionado");
    resultado.desmontar();
  });

  test("clicar no elemento DOM do marcador chama `aoSelecionar` (sincronização mapa→tabela)", async () => {
    dublê.marcadores.length = 0;
    const aoSelecionar = vi.fn();
    const resultado = renderizar(
      <Mapa
        marcadores={[
          { id: "local", posicao: { lng: 2, lat: 2 }, forma: "circulo", aoSelecionar },
        ]}
      />,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => dublê.instancia?.handlers.get("load")?.(EVENTO));

    act(() => {
      dublê.marcadores[0].elemento.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(aoSelecionar).toHaveBeenCalledTimes(1);
    resultado.desmontar();
  });

  test("[inválido] marcador sem `aoSelecionar` não lança erro ao ser clicado", async () => {
    dublê.marcadores.length = 0;
    const resultado = renderizar(
      <Mapa marcadores={[{ id: "local", posicao: { lng: 2, lat: 2 }, forma: "circulo" }]} />,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => dublê.instancia?.handlers.get("load")?.(EVENTO));

    expect(() =>
      act(() => {
        dublê.marcadores[0].elemento.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }),
    ).not.toThrow();
    resultado.desmontar();
  });
});

// TASK-097 — o re-render provocado pelo hover sobre a linha (TASK-069/DEC-072)
// reposicionava o marcador em pleno arrasto, e o `dragend` lia a coordenada
// antiga: o gesto virava no-op, violando a Spec 04 §7.3 itens 4/5/6 e a
// RN-052 ("recalcular no soltar de cada gesto").
describe("Mapa — arrasto não é revertido pelo re-render (TASK-097; RN-052)", () => {
  const M1: MarcadorMapa = {
    id: "ponto-rota-0",
    posicao: { lng: -46.45, lat: -23.88 },
    forma: "circulo",
    tamanho: "pequeno",
    arrastavel: true,
  };
  const M2: MarcadorMapa = {
    id: "secao-1",
    posicao: { lng: -46.5, lat: -23.9 },
    forma: "quadrado",
    arrastavel: true,
  };

  async function esperarEfeitos() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  async function montarComMarcadores(
    marcadores: readonly MarcadorMapa[],
    extras: {
      linhas?: readonly LinhaMapa[];
      aoMoverSobreLinha?: (p: { lng: number; lat: number } | null) => void;
    } = {},
  ) {
    dublê.marcadores.length = 0;
    const resultado = renderizar(<Mapa marcadores={marcadores} {...extras} />);
    await esperarEfeitos();
    act(() => dublê.instancia?.handlers.get("load")?.(EVENTO));
    return resultado;
  }

  test("re-render durante o arrasto não reposiciona o marcador arrastado, mas sincroniza os demais", async () => {
    const resultado = await montarComMarcadores([M1, M2]);
    const [arrastado, outro] = dublê.marcadores;
    expect(arrastado.posicoesRecebidas).toHaveLength(1);

    act(() => arrastado.handlers.get("dragstart")?.());

    // Re-render idêntico ao que o hover provoca a cada `mousemove`: array de
    // marcadores novo, mesmas posições.
    resultado.rerenderizar(<Mapa marcadores={[{ ...M1 }, { ...M2 }]} />);
    await esperarEfeitos();

    // (a) o marcador em arrasto NÃO recebeu `setLngLat` de novo…
    expect(arrastado.posicoesRecebidas).toHaveLength(1);
    // (b) …e o outro marcador foi sincronizado normalmente no mesmo render.
    expect(outro.posicoesRecebidas).toHaveLength(2);
    resultado.desmontar();
  });

  test("`dragend` entrega a coordenada solta e devolve o marcador à posição da prop antes disso", async () => {
    let posicaoNoMomentoDoCallback: [number, number] | null = null;
    const aoArrastar = vi.fn(() => {
      posicaoNoMomentoDoCallback = dublê.marcadores[0].posicao;
    });
    const resultado = await montarComMarcadores([{ ...M1, aoArrastar }]);
    const arrastado = dublê.marcadores[0];

    act(() => arrastado.handlers.get("dragstart")?.());
    // O MapLibre move o elemento por fora do nosso código durante o gesto.
    arrastado.posicao = [-46.4, -23.9];
    act(() => arrastado.handlers.get("dragend")?.());

    // A coordenada entregue é a de ONDE O USUÁRIO SOLTOU (RN-052), não a
    // anterior — este é o defeito que a task corrige.
    expect(aoArrastar).toHaveBeenCalledWith({ lng: -46.4, lat: -23.9 });
    // A reversão para a posição da prop acontece ANTES do callback: é ela que
    // garante a recusa de 350 m devolvendo o marcador (DEC-044) mesmo quando a
    // recusa não gera render.
    expect(posicaoNoMomentoDoCallback).toEqual([-46.45, -23.88]);
    resultado.desmontar();
  });

  test("terminado o arrasto, um render seguinte volta a sincronizar o marcador", async () => {
    const resultado = await montarComMarcadores([M1]);
    const arrastado = dublê.marcadores[0];

    act(() => arrastado.handlers.get("dragstart")?.());
    arrastado.posicao = [-46.4, -23.9];
    act(() => arrastado.handlers.get("dragend")?.());
    const aposGesto = arrastado.posicoesRecebidas.length;

    // Recálculo que reancora o ponto de rota sobre a nova rota (Spec 03 §3.6).
    resultado.rerenderizar(
      <Mapa marcadores={[{ ...M1, posicao: { lng: -46.41, lat: -23.91 } }]} />,
    );
    await esperarEfeitos();

    expect(arrastado.posicoesRecebidas).toHaveLength(aposGesto + 1);
    expect(arrastado.posicao).toEqual([-46.41, -23.91]);
    resultado.desmontar();
  });

  test("[inválido] `mousemove` sobre a linha durante o arrasto não emite hover nem muda o cursor", async () => {
    const aoMoverSobreLinha = vi.fn();
    const resultado = await montarComMarcadores([M1], {
      linhas: [LINHA],
      aoMoverSobreLinha,
    });
    if (!dublê.instancia) throw new Error("Mapa MapLibre não inicializado no teste");
    dublê.instancia.acertos = [{ layer: { id: "linhas-mapa-camada" } }];

    act(() => dublê.marcadores[0].handlers.get("dragstart")?.());
    aoMoverSobreLinha.mockClear();
    dublê.instancia.canvas.style.cursor = "";

    act(() => dublê.instancia?.handlers.get("mousemove")?.(EVENTO));
    act(() => {
      resultado.container
        .querySelector('[data-testid="mapa-base"]')
        ?.dispatchEvent(new MouseEvent("mouseleave"));
    });

    expect(aoMoverSobreLinha).not.toHaveBeenCalled();
    expect(dublê.instancia.canvas.style.cursor).toBe("");
    resultado.desmontar();
  });

  test("`dragstart` limpa o fantasma já visível; depois do `dragend` o hover volta a funcionar", async () => {
    const aoMoverSobreLinha = vi.fn();
    const resultado = await montarComMarcadores([M1], {
      linhas: [LINHA],
      aoMoverSobreLinha,
    });
    if (!dublê.instancia) throw new Error("Mapa MapLibre não inicializado no teste");
    dublê.instancia.acertos = [{ layer: { id: "linhas-mapa-camada" } }];

    const projetada = { lng: -46.4, lat: -23.9 };
    act(() => dublê.instancia?.handlers.get("mousemove")?.(EVENTO));
    expect(aoMoverSobreLinha).toHaveBeenLastCalledWith(projetada);
    expect(dublê.instancia.canvas.style.cursor).toBe("pointer");

    act(() => dublê.marcadores[0].handlers.get("dragstart")?.());
    expect(aoMoverSobreLinha).toHaveBeenLastCalledWith(null);
    expect(dublê.instancia.canvas.style.cursor).toBe("");

    // Não-regressão da TASK-069/DEC-072: encerrado o gesto, o fantasma
    // reaparece ao passar sobre a linha.
    act(() => dublê.marcadores[0].handlers.get("dragend")?.());
    act(() => dublê.instancia?.handlers.get("mousemove")?.(EVENTO));
    expect(aoMoverSobreLinha).toHaveBeenLastCalledWith(projetada);
    expect(dublê.instancia.canvas.style.cursor).toBe("pointer");
    resultado.desmontar();
  });

  test("[inválido] marcador removido no meio do arrasto não deixa a guarda presa", async () => {
    const resultado = await montarComMarcadores([M1, M2]);
    act(() => dublê.marcadores[0].handlers.get("dragstart")?.());

    // O ponto de rota some da lista durante o gesto (ex.: recálculo que o
    // descarta): o `dragend` nunca chega.
    resultado.rerenderizar(<Mapa marcadores={[{ ...M2 }]} />);
    await esperarEfeitos();
    expect(dublê.marcadores[0].removido).toBe(true);

    // Um marcador de MESMO id volta à lista e precisa voltar a ser sincronizado.
    resultado.rerenderizar(<Mapa marcadores={[{ ...M1 }, { ...M2 }]} />);
    await esperarEfeitos();
    const recriado = dublê.marcadores[2];
    resultado.rerenderizar(
      <Mapa marcadores={[{ ...M1, posicao: { lng: -46.42, lat: -23.87 } }, { ...M2 }]} />,
    );
    await esperarEfeitos();

    expect(recriado.posicao).toEqual([-46.42, -23.87]);
    resultado.desmontar();
  });

  test("[RN-097] consumidor sem arrasto e sem `aoMoverSobreLinha` sincroniza como antes", async () => {
    const semArrasto: MarcadorMapa = {
      id: "secao-1",
      posicao: { lng: 1, lat: 1 },
      forma: "quadrado",
    };
    const resultado = await montarComMarcadores([semArrasto]);
    expect(dublê.marcadores[0].posicoesRecebidas).toEqual([[1, 1]]);

    resultado.rerenderizar(<Mapa marcadores={[{ ...semArrasto, posicao: { lng: 2, lat: 3 } }]} />);
    await esperarEfeitos();

    expect(dublê.marcadores).toHaveLength(1);
    expect(dublê.marcadores[0].posicoesRecebidas).toEqual([
      [1, 1],
      [2, 3],
    ]);
    resultado.desmontar();
  });
});
