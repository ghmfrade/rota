// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { TelaInicial } from "@/formulario/tela-inicial";
import { renderizar, act } from "../shared-ui/_ajuda-render";

// TASK-073 — os dois cartões da tela inicial (Spec 04 §3) viram superfícies
// de ação inteiras (doc 18 §5): clicar em qualquer ponto do cartão dispara a
// ação, não só no controle interno cru. O diálogo do "criar do zero" exibe o
// literal fixado na Spec 04 §3.2 (DEC-065). Nenhum destes fluxos toca
// rede/OSRM (Spec 04 §3.1 item 6).

const TEXTO_AVISO_SPEC_04_3_2 =
  "Este documento será criado do zero, sem partir de um JSON anterior. " +
  "Use este caminho apenas se a linha ainda não tem arquivo ROTA (primeira " +
  "criação) ou se o arquivo anterior foi perdido. Sem o JSON anterior, não " +
  "será possível comparar esta versão com a operação atual: o Comparador " +
  "tratará tudo como novo.";

describe("TelaInicial — cartões clicáveis (TASK-073)", () => {
  it("clicar no corpo do cartão de criar (fora do Botao) abre o diálogo", () => {
    const { container, desmontar } = renderizar(
      <TelaInicial aoCarregar={() => {}} aoCriarDoZero={() => {}} />,
    );

    const cartao = container.querySelector(
      '[data-testid="acao-criar-zero"]',
    ) as HTMLElement;
    const titulo = cartao.querySelector("strong")!;

    act(() => {
      titulo.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('[data-testid="aviso-criar-zero"]'),
    ).not.toBeNull();

    desmontar();
  });

  it("clicar no corpo do cartão de carregar aciona o input de arquivo (label→control nativo)", () => {
    const { container, desmontar } = renderizar(
      <TelaInicial aoCarregar={() => {}} aoCriarDoZero={() => {}} />,
    );

    const input = container.querySelector(
      '[data-testid="input-arquivo-json"]',
    ) as HTMLInputElement;
    const espiao = vi.fn();
    input.addEventListener("click", espiao);

    const paragrafo = container.querySelector(
      '[data-testid="acao-carregar"] p',
    ) as HTMLElement;

    act(() => {
      paragrafo.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(espiao).toHaveBeenCalledTimes(1);

    desmontar();
  });

  it("o diálogo exibe o literal da Spec 04 §3.2 (DEC-065)", () => {
    const { container, desmontar } = renderizar(
      <TelaInicial aoCarregar={() => {}} aoCriarDoZero={() => {}} />,
    );

    act(() => {
      (
        container.querySelector(
          '[data-testid="acao-criar-zero"]',
        ) as HTMLElement
      ).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const aviso = container.querySelector(
      '[data-testid="aviso-criar-zero"]',
    )!;
    expect(aviso.textContent).toContain(TEXTO_AVISO_SPEC_04_3_2);

    desmontar();
  });

  it("Cancelar fecha o diálogo sem chamar aoCriarDoZero (caso inválido)", () => {
    const aoCriarDoZero = vi.fn();
    const { container, desmontar } = renderizar(
      <TelaInicial aoCarregar={() => {}} aoCriarDoZero={aoCriarDoZero} />,
    );

    act(() => {
      (
        container.querySelector(
          '[data-testid="acao-criar-zero"]',
        ) as HTMLElement
      ).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const botoes = container.querySelectorAll(
      '[data-testid="aviso-criar-zero"] button',
    );
    const cancelar = Array.from(botoes).find(
      (botao) => botao.textContent === "Cancelar",
    ) as HTMLButtonElement;

    act(() => {
      cancelar.click();
    });

    expect(
      container.querySelector('[data-testid="aviso-criar-zero"]'),
    ).toBeNull();
    expect(aoCriarDoZero).not.toHaveBeenCalled();

    desmontar();
  });

  it("com o diálogo já aberto, clicar de novo no cartão não chama aoCriarDoZero (caso inválido)", () => {
    const aoCriarDoZero = vi.fn();
    const { container, desmontar } = renderizar(
      <TelaInicial aoCarregar={() => {}} aoCriarDoZero={aoCriarDoZero} />,
    );

    const cartao = container.querySelector(
      '[data-testid="acao-criar-zero"]',
    ) as HTMLElement;

    act(() => {
      cartao.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    act(() => {
      cartao.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('[data-testid="aviso-criar-zero"]'),
    ).not.toBeNull();
    expect(aoCriarDoZero).not.toHaveBeenCalled();

    desmontar();
  });
});
