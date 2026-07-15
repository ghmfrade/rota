// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Tooltip } from "@/shared/ui/tooltip";
import { renderizar } from "./_ajuda-render";

// React deriva onMouseEnter/onMouseLeave dos eventos nativos
// "mouseover"/"mouseout" (com relatedTarget fora do alvo) — não existe
// "mouseenter"/"mouseleave" sintético direto para disparar via
// dispatchEvent em jsdom.
function entrarComMouse(alvo: Element, x = 10, y = 10) {
  act(() => {
    alvo.dispatchEvent(
      new MouseEvent("mouseover", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        relatedTarget: null,
      }),
    );
  });
}

function moverMouse(alvo: Element, x: number, y: number) {
  act(() => {
    alvo.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      }),
    );
  });
}

function sairComMouse(alvo: Element) {
  act(() => {
    alvo.dispatchEvent(
      new MouseEvent("mouseout", {
        bubbles: true,
        cancelable: true,
        relatedTarget: null,
      }),
    );
  });
}

describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function balaoDe(container: HTMLElement) {
    return container.querySelector(
      '[data-testid="tooltip-balao"]',
    ) as HTMLSpanElement;
  }

  it("não aparece antes de 300ms", () => {
    const { container, desmontar } = renderizar(
      <Tooltip rotulo="Etapa Identificação">
        <button aria-label="Identificação">ID</button>
      </Tooltip>,
    );
    const alvo = container.querySelector("button")!;
    entrarComMouse(alvo);

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(balaoDe(container).className).toContain("opacity-0");
    desmontar();
  });

  it("aparece depois de 300ms", () => {
    const { container, desmontar } = renderizar(
      <Tooltip rotulo="Etapa Identificação">
        <button aria-label="Identificação">ID</button>
      </Tooltip>,
    );
    const alvo = container.querySelector("button")!;
    entrarComMouse(alvo);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(balaoDe(container).className).toContain("opacity-100");
    expect(balaoDe(container).textContent).toBe("Etapa Identificação");
    desmontar();
  });

  it("mouseleave antes do atraso cancela a exibição", () => {
    const { container, desmontar } = renderizar(
      <Tooltip rotulo="Etapa Identificação">
        <button aria-label="Identificação">ID</button>
      </Tooltip>,
    );
    const alvo = container.querySelector("button")!;
    entrarComMouse(alvo);

    act(() => {
      vi.advanceTimersByTime(150);
    });
    sairComMouse(alvo);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(balaoDe(container).className).toContain("opacity-0");
    desmontar();
  });

  it("mousemove atualiza a posição (left/top) do balão", () => {
    const { container, desmontar } = renderizar(
      <Tooltip rotulo="Etapa Identificação">
        <button aria-label="Identificação">ID</button>
      </Tooltip>,
    );
    const alvo = container.querySelector("button")!;
    entrarComMouse(alvo, 10, 10);
    moverMouse(alvo, 100, 200);

    const balao = balaoDe(container);
    expect(balao.style.left).toBe("112px");
    expect(balao.style.top).toBe("212px");
    desmontar();
  });

  it("o rótulo acessível permanece no elemento-alvo (balão é aria-hidden)", () => {
    const { container, desmontar } = renderizar(
      <Tooltip rotulo="Etapa Identificação">
        <button aria-label="Identificação">ID</button>
      </Tooltip>,
    );
    const alvo = container.querySelector("button")!;
    expect(alvo.getAttribute("aria-label")).toBe("Identificação");

    const balao = balaoDe(container);
    expect(balao.getAttribute("aria-hidden")).toBe("true");
    desmontar();
  });
});
