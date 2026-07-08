import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { TIPOS_DE_AUTOS } from "@/shared/contrato";
import {
  esquemaBaseMunicipios,
  esquemaGeojsonMunicipios,
  esquemaListasAutosEmpresas,
} from "@/shared/dados-estaticos";
import listasReais from "../../../data/autos_empresas.json";
import baseMunicipiosReal from "../../../data/municipios.json";

// Integridade dos arquivos reais versionados (critério de aceite da TASK-002;
// DEC-030). Se scripts/gerar_dados_estaticos.py for reexecutado com CSVs
// novos, divergências aparecem aqui — atualize os totais conscientemente.

const geojsonReal = async () =>
  JSON.parse(
    await readFile(
      new URL("../../../public/dados/municipios_sp.geojson", import.meta.url),
      "utf-8",
    ),
  ) as { features: { properties: { codarea: string } }[] };

describe("data/autos_empresas.json (RN-016)", () => {
  test("passa no schema DEC-030", () => {
    expect(esquemaListasAutosEmpresas.safeParse(listasReais).success).toBe(true);
  });

  test("tem 1280 Autos, 136 empresas e exatamente os 4 tipos macro", () => {
    expect(listasReais.autos.length).toBe(1280);
    expect(listasReais.empresas.length).toBe(136);
    expect(new Set(listasReais.tipos.map((t) => t.codigo))).toEqual(
      new Set(TIPOS_DE_AUTOS),
    );
  });

  test("codigo de Autos é único", () => {
    const codigos = listasReais.autos.map((a) => a.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  test("todo empresa_id e todo tipo resolvem nas próprias listas", () => {
    const empresas = new Set(listasReais.empresas.map((e) => e.id));
    const tipos = new Set(listasReais.tipos.map((t) => t.codigo));
    for (const autos of listasReais.autos) {
      expect(empresas.has(autos.empresa_id), autos.codigo).toBe(true);
      expect(tipos.has(autos.tipo), autos.codigo).toBe(true);
    }
  });
});

describe("base de municípios (RN-029; Spec 03 §2.3)", () => {
  test("data/municipios.json passa no schema e tem 645 municípios", () => {
    expect(esquemaBaseMunicipios.safeParse(baseMunicipiosReal).success).toBe(
      true,
    );
    expect(baseMunicipiosReal.municipios.length).toBe(645);
  });

  test("geojson passa no schema e tem 645 features Polygon", async () => {
    const geojson = await geojsonReal();
    expect(esquemaGeojsonMunicipios.safeParse(geojson).success).toBe(true);
    expect(geojson.features.length).toBe(645);
  });

  test("join codarea ↔ codigo_ibge é bidirecionalmente perfeito", async () => {
    const geojson = await geojsonReal();
    const codareas = new Set(geojson.features.map((f) => f.properties.codarea));
    const codigos = new Set(
      baseMunicipiosReal.municipios.map((m) => m.codigo_ibge),
    );
    expect(codareas).toEqual(codigos);
  });
});
