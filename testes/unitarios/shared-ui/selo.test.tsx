// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { Selo } from "@/shared/ui/selo";
import { renderizar } from "./_ajuda-render";

describe("Selo", () => {
  it("usa o tom neutro por padrão", () => {
    const { container, desmontar } = renderizar(<Selo>proposta</Selo>);
    const selo = container.querySelector("span")!;
    expect(selo.className).toContain("bg-cinza-100");
    desmontar();
  });

  it("distingue sempre erro e alerta (tons/cores diferentes)", () => {
    const { container: containerErro, desmontar: desmontarErro } = renderizar(
      <Selo tom="erro">2 bloqueantes</Selo>,
    );
    const { container: containerAlerta, desmontar: desmontarAlerta } =
      renderizar(<Selo tom="alerta">1 alerta</Selo>);

    const seloErro = containerErro.querySelector("span")!;
    const seloAlerta = containerAlerta.querySelector("span")!;

    expect(seloErro.className).toContain("text-erro");
    expect(seloAlerta.className).toContain("text-alerta");
    expect(seloErro.className).not.toBe(seloAlerta.className);

    desmontarErro();
    desmontarAlerta();
  });

  it("aplica o tom sucesso", () => {
    const { container, desmontar } = renderizar(<Selo tom="sucesso">vigente</Selo>);
    const selo = container.querySelector("span")!;
    expect(selo.className).toContain("text-sucesso");
    desmontar();
  });

  it("aplica o tom azul", () => {
    const { container, desmontar } = renderizar(<Selo tom="azul">ativo</Selo>);
    const selo = container.querySelector("span")!;
    expect(selo.className).toContain("bg-azul-100");
    desmontar();
  });

  it("repassa data-testid e demais props nativas", () => {
    const { container, desmontar } = renderizar(
      <Selo tom="erro" data-testid="selo-status">
        vigente
      </Selo>,
    );
    expect(container.querySelector('[data-testid="selo-status"]')).not.toBeNull();
    desmontar();
  });
});
