import { afterEach, describe, expect, it } from "vitest";
import {
  TILES_URL_PADRAO,
  urlDeTiles,
} from "../../../src/shared/mapa/config";

// Unitários (categoria 8, docs-dev/08) — URL de tiles configurável, espelhando
// o padrão do OSRM (DEC-029): override > env > default OSM (Spec 01 §8).

const envOriginal = process.env.NEXT_PUBLIC_TILES_URL;

afterEach(() => {
  if (envOriginal === undefined) delete process.env.NEXT_PUBLIC_TILES_URL;
  else process.env.NEXT_PUBLIC_TILES_URL = envOriginal;
});

describe("urlDeTiles (Spec 01 §8; DEC-029)", () => {
  it("usa o default OSM quando nada é configurado", () => {
    delete process.env.NEXT_PUBLIC_TILES_URL;
    expect(urlDeTiles()).toBe(TILES_URL_PADRAO);
  });

  it("prioriza o override explícito sobre env e default", () => {
    process.env.NEXT_PUBLIC_TILES_URL = "https://env.example/{z}/{x}/{y}.png";
    expect(urlDeTiles("https://custom.example/{z}/{x}/{y}.png")).toBe(
      "https://custom.example/{z}/{x}/{y}.png",
    );
  });

  it("usa a variável de ambiente quando não há override", () => {
    process.env.NEXT_PUBLIC_TILES_URL = "https://prod.example/{z}/{x}/{y}.png";
    expect(urlDeTiles()).toBe("https://prod.example/{z}/{x}/{y}.png");
  });

  // Caso inválido: valor em branco não deve virar URL de tiles.
  it("ignora valor em branco (só espaços) e cai no default", () => {
    process.env.NEXT_PUBLIC_TILES_URL = "   ";
    expect(urlDeTiles()).toBe(TILES_URL_PADRAO);
    expect(urlDeTiles("  ")).toBe(TILES_URL_PADRAO);
  });
});
