// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  CarimboCarregar,
  CarimboCriar,
  CarimboExportacao,
  CarimboIdentificacao,
  CarimboItinerarios,
  CarimboMatrizes,
  CarimboRevisao,
  CarimboServicos,
  CarimboViagens,
} from "@/shared/ui/carimbos";
import { renderizar } from "./_ajuda-render";

const CATALOGO = [
  ["CarimboIdentificacao", CarimboIdentificacao],
  ["CarimboServicos", CarimboServicos],
  ["CarimboItinerarios", CarimboItinerarios],
  ["CarimboViagens", CarimboViagens],
  ["CarimboMatrizes", CarimboMatrizes],
  ["CarimboRevisao", CarimboRevisao],
  ["CarimboExportacao", CarimboExportacao],
  ["CarimboCarregar", CarimboCarregar],
  ["CarimboCriar", CarimboCriar],
] as const;

describe("Catálogo de ícones-carimbo (9 SVGs)", () => {
  it("tem exatamente os 9 ícones do doc 18 §4", () => {
    expect(CATALOGO).toHaveLength(9);
  });

  it.each(CATALOGO)(
    "%s: viewBox 24×24, stroke currentColor, fill none, strokeWidth 1.75",
    (_nome, Icone) => {
      const { container, desmontar } = renderizar(<Icone />);
      const svg = container.querySelector("svg")!;
      expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
      expect(svg.getAttribute("fill")).toBe("none");
      expect(svg.getAttribute("stroke")).toBe("currentColor");
      expect(svg.getAttribute("stroke-width")).toBe("1.75");
      expect(svg.getAttribute("stroke-linecap")).toBe("round");
      expect(svg.getAttribute("stroke-linejoin")).toBe("round");
      // Cada ícone desenha pelo menos um traçado.
      expect(svg.querySelectorAll("path, circle, rect").length).toBeGreaterThan(0);
      desmontar();
    },
  );

  it.each(CATALOGO)("%s: repassa props nativas do <svg>", (_nome, Icone) => {
    const { container, desmontar } = renderizar(
      <Icone data-testid="icone-teste" className="size-4" aria-hidden="true" />,
    );
    const svg = container.querySelector('[data-testid="icone-teste"]')!;
    expect(svg.getAttribute("class")).toContain("size-4");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    desmontar();
  });
});
