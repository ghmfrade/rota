// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import {
  SuperficieFlutuante,
  posicionarSuperficieFlutuante,
} from "@/shared/ui";
import { act, renderizar } from "./_ajuda-render";

// TASK-121/DEC-100: superfície ancorada que escapa do recorte de ancestrais
// com `overflow` e se reposiciona para permanecer na área útil. A geometria é
// pura e testada sem DOM; o componente é testado quanto a foco, inércia
// quando fechada e ancoragem no elemento pai.

const LIMITE = { x: 0, y: 0, largura: 1000, altura: 800 };

describe("posicionarSuperficieFlutuante (TASK-121)", () => {
  it("usa o lado preferido quando há espaço", () => {
    const posicao = posicionarSuperficieFlutuante(
      { x: 400, y: 400, largura: 100, altura: 40 },
      { largura: 120, altura: 60 },
      LIMITE,
      "direita",
    );
    expect(posicao.lado).toBe("direita");
    expect(posicao.x).toBe(500);
    expect(posicao.y).toBe(400);
  });

  it("inverte para o lado oposto quando não cabe — coluna de domingo", () => {
    const posicao = posicionarSuperficieFlutuante(
      { x: 880, y: 200, largura: 100, altura: 40 },
      { largura: 120, altura: 60 },
      LIMITE,
      "direita",
    );
    expect(posicao.lado).toBe("esquerda");
    expect(posicao.x).toBe(760);
  });

  it("alinha os lados verticais pela borda direita da âncora", () => {
    const posicao = posicionarSuperficieFlutuante(
      { x: 400, y: 400, largura: 100, altura: 40 },
      { largura: 150, altura: 60 },
      LIMITE,
      "abaixo",
    );
    // A faixa lateral à direita da âncora — ocupada pela coluna de ações da
    // Viagem — não é invadida pela superfície inferior.
    expect(posicao.x + 150).toBe(500);
    expect(posicao.y).toBe(440);
  });

  it("inverte para baixo quando não há espaço acima — primeira Viagem", () => {
    const posicao = posicionarSuperficieFlutuante(
      { x: 100, y: 10, largura: 100, altura: 40 },
      { largura: 120, altura: 60 },
      LIMITE,
      "acima",
    );
    expect(posicao.lado).toBe("abaixo");
    expect(posicao.y).toBe(50);
  });

  it("inverte para cima quando não há espaço abaixo — última Viagem", () => {
    const posicao = posicionarSuperficieFlutuante(
      { x: 100, y: 760, largura: 100, altura: 30 },
      { largura: 120, altura: 60 },
      LIMITE,
      "abaixo",
    );
    expect(posicao.lado).toBe("acima");
    expect(posicao.y).toBe(700);
  });

  it("[inválido] nenhum lado cabe: prende a caixa dentro da área útil", () => {
    const posicao = posicionarSuperficieFlutuante(
      { x: 960, y: 780, largura: 40, altura: 20 },
      { largura: 200, altura: 100 },
      LIMITE,
      "direita",
    );
    expect(posicao.x).toBeGreaterThanOrEqual(LIMITE.x + 8);
    expect(posicao.x + 200).toBeLessThanOrEqual(LIMITE.x + LIMITE.largura - 8);
    expect(posicao.y).toBeGreaterThanOrEqual(LIMITE.y + 8);
    expect(posicao.y + 100).toBeLessThanOrEqual(LIMITE.y + LIMITE.altura - 8);
  });

  it("[inválido] caixa maior que a área útil ainda começa dentro dela", () => {
    const posicao = posicionarSuperficieFlutuante(
      { x: 10, y: 10, largura: 40, altura: 20 },
      { largura: 2000, altura: 2000 },
      LIMITE,
      "abaixo",
    );
    expect(posicao.x).toBe(LIMITE.x + 8);
    expect(posicao.y).toBe(LIMITE.y + 8);
  });

  it("respeita a origem da área útil quando ela não começa em (0,0)", () => {
    const posicao = posicionarSuperficieFlutuante(
      { x: 120, y: 120, largura: 40, altura: 20 },
      { largura: 300, altura: 100 },
      { x: 100, y: 100, largura: 200, altura: 200 },
      "direita",
    );
    expect(posicao.x).toBe(108);
  });
});

/**
 * Mede a âncora (`[data-testid="ancora"]`) com a largura pedida; qualquer outro
 * elemento continua com o retângulo zerado do jsdom. É o suficiente para provar
 * de onde a largura da superfície vem — o piso de legibilidade da DEC-102 é
 * `min-w-min`, resolvido pelo navegador e coberto no E2E.
 */
function medirAncoraCom(largura: number) {
  return vi
    .spyOn(Element.prototype, "getBoundingClientRect")
    .mockImplementation(function (this: Element) {
      const ehAncora = this.getAttribute?.("data-testid") === "ancora";
      const l = ehAncora ? largura : 0;
      return {
        x: 0,
        y: 0,
        width: l,
        height: ehAncora ? 24 : 0,
        top: 0,
        left: 0,
        right: l,
        bottom: ehAncora ? 24 : 0,
        toJSON: () => ({}),
      } as DOMRect;
    });
}

describe("SuperficieFlutuante — largura da âncora (TASK-124/DEC-102)", () => {
  it("assume a largura da célula-âncora medida em runtime", () => {
    const medir = medirAncoraCom(96);
    const { container, desmontar } = renderizar(
      <div data-testid="ancora">
        <SuperficieFlutuante
          aberta
          larguraDaAncora
          rotuloAcessivel="Ações de inserção anterior"
          data-testid="superficie"
        >
          <input aria-label="Deslocamento anterior" />
          <button type="button">↑</button>
        </SuperficieFlutuante>
      </div>,
    );

    const superficie = container.querySelector(
      '[data-testid="superficie"]',
    ) as HTMLElement;
    expect(superficie.style.width).toBe("96px");
    // Piso de legibilidade: a largura medida nunca encolhe o conteúdo abaixo
    // do seu mínimo — a caixa transborda o indispensável (DEC-102).
    expect(superficie.className).toContain("min-w-min");
    medir.mockRestore();
    desmontar();
  });

  it("sem a prop, a largura continua vindo do conteúdo — caso da coluna de ações da Viagem", () => {
    const medir = medirAncoraCom(96);
    const { container, desmontar } = renderizar(
      <div data-testid="ancora">
        <SuperficieFlutuante aberta rotuloAcessivel="Ações da viagem" data-testid="superficie">
          <button type="button">X</button>
        </SuperficieFlutuante>
      </div>,
    );

    const superficie = container.querySelector(
      '[data-testid="superficie"]',
    ) as HTMLElement;
    expect(superficie.style.width).toBe("");
    expect(superficie.className).not.toContain("min-w-min");
    medir.mockRestore();
    desmontar();
  });

  it("acompanha a mudança de largura da coluna — nome de Seção longo alarga a célula", () => {
    const medir = medirAncoraCom(96);
    const { container, desmontar } = renderizar(
      <div data-testid="ancora">
        <SuperficieFlutuante
          aberta
          larguraDaAncora
          rotuloAcessivel="Geração por headway"
          data-testid="superficie"
        >
          <input aria-label="Headway" />
        </SuperficieFlutuante>
      </div>,
    );

    const superficie = container.querySelector(
      '[data-testid="superficie"]',
    ) as HTMLElement;
    expect(superficie.style.width).toBe("96px");

    medir.mockRestore();
    const remedir = medirAncoraCom(150);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(superficie.style.width).toBe("150px");
    remedir.mockRestore();
    desmontar();
  });

  it("[inválido] fechada não mede a âncora nem aplica largura", () => {
    const medir = medirAncoraCom(96);
    const { container, desmontar } = renderizar(
      <div data-testid="ancora">
        <SuperficieFlutuante
          aberta={false}
          larguraDaAncora
          rotuloAcessivel="Ações de inserção anterior"
          data-testid="superficie"
        >
          <input aria-label="Deslocamento anterior" />
        </SuperficieFlutuante>
      </div>,
    );

    const superficie = container.querySelector(
      '[data-testid="superficie"]',
    ) as HTMLElement;
    expect(superficie.style.width).toBe("");
    expect(medir).not.toHaveBeenCalled();
    medir.mockRestore();
    desmontar();
  });

  it("[inválido] âncora sem largura não descarta o piso de legibilidade", () => {
    const medir = medirAncoraCom(0);
    const { container, desmontar } = renderizar(
      <div data-testid="ancora">
        <SuperficieFlutuante
          aberta
          larguraDaAncora
          rotuloAcessivel="Ações de inserção posterior"
          data-testid="superficie"
        >
          <input aria-label="Deslocamento posterior" />
        </SuperficieFlutuante>
      </div>,
    );

    const superficie = container.querySelector(
      '[data-testid="superficie"]',
    ) as HTMLElement;
    // `min-w-min` é o que impede a caixa de colapsar e truncar `HH:MM`.
    expect(superficie.className).toContain("min-w-min");
    medir.mockRestore();
    desmontar();
  });
});

describe("SuperficieFlutuante (TASK-121)", () => {
  it("ancora no elemento pai e não rouba o foco ao abrir", () => {
    const { container, desmontar } = renderizar(
      <div>
        <button type="button" data-testid="fora">
          fora
        </button>
        <div data-testid="ancora">
          <SuperficieFlutuante
            aberta
            ladoPreferido="direita"
            rotuloAcessivel="Ações da viagem"
            data-testid="superficie"
          >
            <button type="button" data-testid="dentro">
              dentro
            </button>
          </SuperficieFlutuante>
        </div>
      </div>,
    );

    const fora = container.querySelector('[data-testid="fora"]') as HTMLButtonElement;
    act(() => fora.focus());
    const superficie = container.querySelector(
      '[data-testid="superficie"]',
    ) as HTMLElement;

    expect(superficie.parentElement?.getAttribute("data-testid")).toBe("ancora");
    expect(superficie.getAttribute("role")).toBe("group");
    expect(superficie.getAttribute("aria-label")).toBe("Ações da viagem");
    expect(superficie.className).toContain("fixed");
    expect(superficie.className).toContain("opacity-100");
    // Ao contrário do `MenuFlutuante`, a superfície não move o foco.
    expect(document.activeElement).toBe(fora);
    desmontar();
  });

  it("[inválido] fechada permanece inerte: sem posição, sem eventos e sem medir", () => {
    const medir = vi.spyOn(Element.prototype, "getBoundingClientRect");
    const { container, desmontar } = renderizar(
      <div>
        <SuperficieFlutuante aberta={false} rotuloAcessivel="Ações da viagem" data-testid="superficie">
          <button type="button">dentro</button>
        </SuperficieFlutuante>
      </div>,
    );

    const superficie = container.querySelector(
      '[data-testid="superficie"]',
    ) as HTMLElement;
    expect(superficie.className).toContain("pointer-events-none");
    expect(superficie.className).toContain("opacity-0");
    expect(superficie.style.left).toBe("");
    expect(superficie.style.top).toBe("");
    expect(medir).not.toHaveBeenCalled();
    medir.mockRestore();
    desmontar();
  });

  it("[inválido] não fecha sozinha por clique fora — a abertura é do chamador", () => {
    const aoClicarFora = vi.fn();
    const { container, desmontar } = renderizar(
      <div onClick={aoClicarFora}>
        <button type="button" data-testid="fora">
          fora
        </button>
        <div>
          <SuperficieFlutuante aberta rotuloAcessivel="Ações da viagem" data-testid="superficie">
            <button type="button">dentro</button>
          </SuperficieFlutuante>
        </div>
      </div>,
    );

    const fora = container.querySelector('[data-testid="fora"]') as HTMLButtonElement;
    act(() => {
      fora.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      fora.click();
    });

    const superficie = container.querySelector(
      '[data-testid="superficie"]',
    ) as HTMLElement;
    expect(superficie.className).toContain("opacity-100");
    desmontar();
  });
});
