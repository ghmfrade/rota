import { describe, expect, it, vi } from "vitest";
import {
  capturarImagemMapa,
  type MapaCapturavel,
} from "../../../src/shared/mapa/captura";

// Unitários (categoria 8, docs-dev/08) — captura do canvas do mapa como imagem
// para o PDF (RN-074; Spec 04 §13.1 item 4d), testada com stub de canvas.

function mapaComCanvas(dataUri: string): MapaCapturavel {
  const canvas = {
    toDataURL: vi.fn(() => dataUri),
  } as unknown as HTMLCanvasElement;
  return { getCanvas: () => canvas };
}

describe("capturarImagemMapa (RN-074)", () => {
  it("retorna o data-URI do canvas (PNG por default)", () => {
    const mapa = mapaComCanvas("data:image/png;base64,AAA");
    expect(capturarImagemMapa(mapa)).toBe("data:image/png;base64,AAA");
  });

  it("repassa o formato solicitado ao toDataURL", () => {
    const canvas = { toDataURL: vi.fn(() => "data:image/jpeg;base64,BBB") };
    const mapa: MapaCapturavel = {
      getCanvas: () => canvas as unknown as HTMLCanvasElement,
    };
    capturarImagemMapa(mapa, "image/jpeg");
    expect(canvas.toDataURL).toHaveBeenCalledWith("image/jpeg");
  });

  // Casos inválidos: sem canvas capturável, deve lançar (não devolver string
  // vazia silenciosa que corromperia o PDF).
  it("lança quando não há canvas", () => {
    const mapa: MapaCapturavel = { getCanvas: () => null };
    expect(() => capturarImagemMapa(mapa)).toThrow(/canvas/i);
  });

  it("lança quando o canvas não expõe toDataURL", () => {
    const mapa: MapaCapturavel = {
      getCanvas: () => ({}) as unknown as HTMLCanvasElement,
    };
    expect(() => capturarImagemMapa(mapa)).toThrow(/RN-074/);
  });
});
