// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { Carimbo } from "@/shared/ui/carimbo";
import {
  CLASSES_MOLDURA_CARIMBO,
  MolduraCarimbo,
} from "@/shared/ui/moldura-carimbo";
import { renderizar } from "./_ajuda-render";

describe("MolduraCarimbo", () => {
  it("é decorativa: renderiza um <span> aria-hidden, nunca um botão focável", () => {
    const { container, desmontar } = renderizar(
      <MolduraCarimbo>
        <svg data-testid="icone-pasta" />
      </MolduraCarimbo>,
    );
    const span = container.querySelector("span")!;
    expect(span.getAttribute("aria-hidden")).toBe("true");
    // O motivo de a moldura existir separada do `Carimbo` (doc 18 §1.2): um
    // botão de enfeite dentro do cartão seria comportamento novo.
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector('[data-testid="icone-pasta"]')).not.toBeNull();
    desmontar();
  });

  it("usa o tom de repouso por padrão (traço cinza-500, fundo transparente — doc 18 §3)", () => {
    const { container, desmontar } = renderizar(
      <MolduraCarimbo>
        <svg />
      </MolduraCarimbo>,
    );
    const classes = container.querySelector("span")!.className;
    expect(classes).toContain("border-cinza-500");
    expect(classes).toContain("bg-transparent");
    expect(classes).not.toContain("bg-cinza-100");
    desmontar();
  });

  it("tom destaque usa traço e fundo azuis", () => {
    const { container, desmontar } = renderizar(
      <MolduraCarimbo tom="destaque">
        <svg />
      </MolduraCarimbo>,
    );
    const classes = container.querySelector("span")!.className;
    expect(classes).toContain("border-azul-600");
    expect(classes).toContain("bg-azul-50");
    desmontar();
  });
});

describe("fonte única da forma do carimbo", () => {
  // Regressão do achado 2 da revisão da TASK-052: o círculo estava desenhado
  // em dois lugares (shared/ui e a tela inicial) e podia divergir com o tempo.
  it("Carimbo e MolduraCarimbo compõem o mesmo círculo base", () => {
    const { container: comBotao, desmontar: desmontarBotao } = renderizar(
      <Carimbo rotulo="Identificação">
        <svg />
      </Carimbo>,
    );
    const { container: comMoldura, desmontar: desmontarMoldura } = renderizar(
      <MolduraCarimbo>
        <svg />
      </MolduraCarimbo>,
    );

    for (const classe of CLASSES_MOLDURA_CARIMBO.split(" ")) {
      expect(comBotao.querySelector("button")!.className).toContain(classe);
      expect(comMoldura.querySelector("span")!.className).toContain(classe);
    }

    desmontarBotao();
    desmontarMoldura();
  });

  it("cada consumidor emite o seu tamanho, sem dois size-* concorrentes", () => {
    expect(CLASSES_MOLDURA_CARIMBO).not.toContain("size-");

    const { container, desmontar } = renderizar(
      <Carimbo rotulo="Serviços">
        <svg />
      </Carimbo>,
    );
    const classes = container.querySelector("button")!.className;
    expect(classes).toContain("size-11");
    expect(classes).not.toContain("size-12");
    desmontar();
  });
});
