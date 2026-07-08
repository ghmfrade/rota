import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  carregarBaseMunicipios,
  carregarListasAutosEmpresas,
  nomeDaEmpresa,
} from "@/shared/dados-estaticos";

// Comportamento dos carregadores (DEC-030): validação na primeira carga,
// memoização e erro identificável. O geojson é servido de public/ e buscado
// por fetch — aqui o fetch é sempre stubado (nenhum teste depende de rede).

const CAMINHO_GEOJSON = new URL(
  "../../../public/dados/municipios_sp.geojson",
  import.meta.url,
);

function respostaJson(corpo: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(corpo),
  };
}

/**
 * Módulo recarregado do zero — necessário para testar a memoização do
 * carregador de geojson sem vazar cache entre testes.
 */
async function carregadorFresco() {
  vi.resetModules();
  return import("@/shared/dados-estaticos");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("carregarListasAutosEmpresas (RN-016)", () => {
  test("carrega e valida o arquivo real de data/", async () => {
    const listas = await carregarListasAutosEmpresas();
    expect(listas.autos.length).toBeGreaterThan(0);
    expect(listas.empresas.length).toBeGreaterThan(0);
    expect(listas.tipos.length).toBe(4);
  });

  test("memoiza: segunda chamada devolve a mesma referência", async () => {
    const primeira = await carregarListasAutosEmpresas();
    const segunda = await carregarListasAutosEmpresas();
    expect(segunda).toBe(primeira);
  });

  test("nomeDaEmpresa resolve empresa_id e devolve undefined para id desconhecido", async () => {
    const listas = await carregarListasAutosEmpresas();
    const primeiro = listas.autos[0];
    expect(nomeDaEmpresa(listas, primeiro.empresa_id)).toBeTruthy();
    expect(nomeDaEmpresa(listas, "empresa-inexistente")).toBeUndefined();
  });
});

describe("carregarBaseMunicipios (RN-029)", () => {
  test("carrega e valida o arquivo real de data/", async () => {
    const base = await carregarBaseMunicipios();
    expect(base.municipios.length).toBeGreaterThan(0);
  });

  test("memoiza: segunda chamada devolve a mesma referência", async () => {
    const primeira = await carregarBaseMunicipios();
    const segunda = await carregarBaseMunicipios();
    expect(segunda).toBe(primeira);
  });
});

describe("carregarGeojsonMunicipios (RN-029)", () => {
  test("busca o arquivo estático, valida e memoiza (um único fetch)", async () => {
    const conteudo = await readFile(CAMINHO_GEOJSON, "utf-8");
    const fetchStub = vi.fn(async () => respostaJson(conteudo));
    vi.stubGlobal("fetch", fetchStub);

    const { carregarGeojsonMunicipios, URL_GEOJSON_MUNICIPIOS } =
      await carregadorFresco();
    const primeira = await carregarGeojsonMunicipios();
    const segunda = await carregarGeojsonMunicipios();

    expect(primeira.features.length).toBe(645);
    expect(segunda).toBe(primeira);
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(fetchStub).toHaveBeenCalledWith(URL_GEOJSON_MUNICIPIOS);
  });

  test("falha de HTTP vira erro identificável e não fica cacheada", async () => {
    const conteudo = await readFile(CAMINHO_GEOJSON, "utf-8");
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(respostaJson("", 404))
      .mockResolvedValueOnce(respostaJson(conteudo));
    vi.stubGlobal("fetch", fetchStub);

    const { carregarGeojsonMunicipios } = await carregadorFresco();
    await expect(carregarGeojsonMunicipios()).rejects.toThrow(
      /municipios_sp\.geojson[\s\S]*404/,
    );
    // a promessa rejeitada não fica memoizada: a chamada seguinte tenta de novo
    const geojson = await carregarGeojsonMunicipios();
    expect(geojson.features.length).toBe(645);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  test("payload que viola o schema vira erro identificável", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respostaJson(JSON.stringify({ type: "FeatureCollection", features: [] })),
      ),
    );

    const { carregarGeojsonMunicipios } = await carregadorFresco();
    await expect(carregarGeojsonMunicipios()).rejects.toThrow(
      /municipios_sp\.geojson/,
    );
  });
});
