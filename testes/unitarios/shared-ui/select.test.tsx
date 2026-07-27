// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { Select } from "@/shared/ui/select";
import { renderizar } from "./_ajuda-render";

describe("Select", () => {
  it("associa o rótulo ao controle via htmlFor/id gerado (useId)", () => {
    const { container, desmontar } = renderizar(
      <Select rotulo="Tipo">
        <option value="rodoviario">Rodoviário</option>
        <option value="litoraneo">Litorâneo</option>
      </Select>,
    );
    const rotulo = container.querySelector("label")!;
    const select = container.querySelector("select")!;
    expect(rotulo.getAttribute("for")).toBe(select.id);
    expect(select.id).not.toBe("");
    desmontar();
  });

  it("preserva as options filhas repassadas", () => {
    const { container, desmontar } = renderizar(
      <Select rotulo="Tipo" data-testid="select-tipo">
        <option value="rodoviario">Rodoviário</option>
        <option value="litoraneo">Litorâneo</option>
      </Select>,
    );
    const select = container.querySelector(
      '[data-testid="select-tipo"]',
    ) as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(select.options[0].value).toBe("rodoviario");
    desmontar();
  });

  it("exibe a mensagem de erro e marca borda/aria-invalid", () => {
    const { container, desmontar } = renderizar(
      <Select rotulo="Tipo" erro="Selecione um tipo">
        <option value="" />
      </Select>,
    );
    const select = container.querySelector("select")!;
    expect(select.className).toContain("border-erro");
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(container.textContent).toContain("Selecione um tipo");
    desmontar();
  });

  it("repassa props nativas (data-testid, value, onChange)", () => {
    const { container, desmontar } = renderizar(
      <Select rotulo="Tipo" data-testid="select-valor" value="litoraneo" onChange={() => {}}>
        <option value="rodoviario">Rodoviário</option>
        <option value="litoraneo">Litorâneo</option>
      </Select>,
    );
    const select = container.querySelector(
      '[data-testid="select-valor"]',
    ) as HTMLSelectElement;
    expect(select.value).toBe("litoraneo");
    desmontar();
  });

  it('densidade="compacta" reduz o preenchimento do select', () => {
    const { container, desmontar } = renderizar(
      <Select densidade="compacta">
        <option>SEG</option>
      </Select>,
    );
    const select = container.querySelector("select")!;
    expect(select.className).toContain("px-2");
    expect(select.className).toContain("py-1");
    expect(select.className).not.toContain("px-3");
    desmontar();
  });
});
