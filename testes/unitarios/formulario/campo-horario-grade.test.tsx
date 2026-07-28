// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { CampoHorarioGrade } from "@/formulario/viagens";
import { act, renderizar } from "../shared-ui/_ajuda-render";

function preencher(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, valor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

describe("CampoHorarioGrade (TASK-106; RN-067)", () => {
  it("é textual e não oferece seletor nativo de horário por clique", () => {
    const { container, desmontar } = renderizar(
      <CampoHorarioGrade
        valor="08:00"
        rotuloAcessivel="Horário de partida"
        aoConfirmar={() => true}
      />,
    );
    const input = container.querySelector("input")!;
    expect(input.type).toBe("text");
    expect(input.getAttribute("aria-label")).toBe("Horário de partida");
    desmontar();
  });

  it.each([
    ["0830", "08:30"],
    ["830", "08:30"],
    ["08:30", "08:30"],
    ["8:30", "08:30"],
  ])("aceita %s e confirma como %s", (entrada, normalizado) => {
    const aoConfirmar = vi.fn(() => true);
    const { container, desmontar } = renderizar(
      <CampoHorarioGrade
        valor=""
        rotuloAcessivel="Criar viagem"
        aoConfirmar={aoConfirmar}
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    preencher(input, entrada);
    expect(aoConfirmar).toHaveBeenCalledWith(normalizado);
    expect(input.value).toBe(normalizado);
    desmontar();
  });

  it("[inválido] horário fora do relógio não confirma e restaura o valor gravado no blur", () => {
    const aoConfirmar = vi.fn(() => true);
    const { container, desmontar } = renderizar(
      <CampoHorarioGrade
        valor="08:00"
        rotuloAcessivel="Horário de partida"
        aoConfirmar={aoConfirmar}
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    act(() => input.focus());
    preencher(input, "2460");
    act(() => input.blur());
    expect(aoConfirmar).not.toHaveBeenCalled();
    expect(input.value).toBe("08:00");
    desmontar();
  });

  it("Tab confirma e solicita navegação sem submeter formulário", () => {
    const aoConfirmar = vi.fn(() => true);
    const aoNavegar = vi.fn(() => true);
    const { container, desmontar } = renderizar(
      <CampoHorarioGrade
        valor=""
        rotuloAcessivel="Criar viagem"
        aoConfirmar={aoConfirmar}
        aoNavegar={aoNavegar}
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    preencher(input, "0830");
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
      );
    });
    expect(aoNavegar).toHaveBeenCalledWith("Tab");
    desmontar();
  });

  it("Tab em célula criável vazia navega sem tentar criar Viagem", () => {
    const aoConfirmar = vi.fn(() => true);
    const aoNavegar = vi.fn(() => true);
    const { container, desmontar } = renderizar(
      <CampoHorarioGrade
        valor=""
        rotuloAcessivel="Criar viagem"
        aoConfirmar={aoConfirmar}
        aoNavegar={aoNavegar}
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
      );
    });
    expect(aoConfirmar).not.toHaveBeenCalled();
    expect(aoNavegar).toHaveBeenCalledWith("Tab");
    desmontar();
  });

  it("[inválido] Tab com rascunho não vazio inválido não navega", () => {
    const aoConfirmar = vi.fn(() => true);
    const aoNavegar = vi.fn(() => true);
    const { container, desmontar } = renderizar(
      <CampoHorarioGrade
        valor=""
        rotuloAcessivel="Criar viagem"
        aoConfirmar={aoConfirmar}
        aoNavegar={aoNavegar}
      />,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    preencher(input, "2460");
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
      );
    });
    expect(aoConfirmar).not.toHaveBeenCalled();
    expect(aoNavegar).not.toHaveBeenCalled();
    desmontar();
  });

  it("sincroniza valor externo sem remontar o input (TASK-115; RN-065/066)", () => {
    const propriedades = {
      rotuloAcessivel: "Horário de passagem",
      aoConfirmar: () => true,
    };
    const { container, rerenderizar, desmontar } = renderizar(
      <CampoHorarioGrade valor="08:45" {...propriedades} />,
    );
    const inputOriginal = container.querySelector("input") as HTMLInputElement;
    act(() => inputOriginal.focus());

    rerenderizar(<CampoHorarioGrade valor="08:40" {...propriedades} />);

    const inputAtual = container.querySelector("input") as HTMLInputElement;
    expect(inputAtual).toBe(inputOriginal);
    expect(inputAtual.value).toBe("08:40");
    expect(document.activeElement).toBe(inputOriginal);
    desmontar();
  });
});
