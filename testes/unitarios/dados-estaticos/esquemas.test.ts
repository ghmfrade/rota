import { describe, expect, test } from "vitest";
import {
  esquemaBaseMunicipios,
  esquemaGeojsonMunicipios,
  esquemaListasAutosEmpresas,
} from "@/shared/dados-estaticos";
import {
  baseMunicipiosValida,
  geojsonValido,
  listasValidas,
} from "./utilitarios";

// Casos válidos e inválidos dos schemas dos recursos estáticos (DEC-030).
// Os arquivos reais de data/ são cobertos em integridade-dados.test.ts.

describe("esquemaListasAutosEmpresas (RN-016)", () => {
  test("fixture mínima válida passa", () => {
    expect(esquemaListasAutosEmpresas.safeParse(listasValidas()).success).toBe(
      true,
    );
  });

  test("campo extra é rejeitado (strict)", () => {
    const listas = listasValidas();
    listas.autos[0].situacao_pedido = "aprovado";
    expect(esquemaListasAutosEmpresas.safeParse(listas).success).toBe(false);
  });

  test("versao_schema divergente é rejeitada", () => {
    const listas = listasValidas();
    listas.versao_schema = "2.0";
    expect(esquemaListasAutosEmpresas.safeParse(listas).success).toBe(false);
  });

  test("tipo fora do enum macro da Spec 01 §7 é rejeitado", () => {
    const listas = listasValidas();
    listas.autos[0].tipo = "Rodoviária Convencional"; // valor do CSV bruto, não do enum
    expect(esquemaListasAutosEmpresas.safeParse(listas).success).toBe(false);
  });

  test("caracteristica de veículo não é tipo de Autos", () => {
    const listas = listasValidas();
    listas.tipos.push({ codigo: "CR", descricao: "não é tipo macro" });
    expect(esquemaListasAutosEmpresas.safeParse(listas).success).toBe(false);
  });

  test("autos[].empresa_id sem empresa correspondente é rejeitado", () => {
    const listas = listasValidas();
    listas.autos[0].empresa_id = "empresa-inexistente";
    const resultado = esquemaListasAutosEmpresas.safeParse(listas);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.map((i) => i.message).join("\n")).toContain(
        "empresa-inexistente",
      );
    }
  });

  test("autos[].tipo ausente de tipos[] é rejeitado", () => {
    const listas = listasValidas();
    listas.tipos = listas.tipos.filter(
      (tipo: { codigo: string }) => tipo.codigo !== "Rodoviário",
    );
    expect(esquemaListasAutosEmpresas.safeParse(listas).success).toBe(false);
  });

  test("operante deve ser booleano (Spec 04 §3.1)", () => {
    const listas = listasValidas();
    listas.autos[0].operante = "sim";
    expect(esquemaListasAutosEmpresas.safeParse(listas).success).toBe(false);
  });
});

describe("esquemaBaseMunicipios (RN-029, fonte de dados)", () => {
  test("fixture mínima válida passa", () => {
    expect(esquemaBaseMunicipios.safeParse(baseMunicipiosValida()).success).toBe(
      true,
    );
  });

  test("campo extra é rejeitado (strict)", () => {
    const base = baseMunicipiosValida();
    base.municipios[0].regiao = "Oeste";
    expect(esquemaBaseMunicipios.safeParse(base).success).toBe(false);
  });

  test("codigo_ibge sem 7 dígitos é rejeitado", () => {
    const base = baseMunicipiosValida();
    base.municipios[0].codigo_ibge = "35001";
    expect(esquemaBaseMunicipios.safeParse(base).success).toBe(false);
  });

  test("populacao_residente não-inteira é rejeitada", () => {
    const base = baseMunicipiosValida();
    base.municipios[0].populacao_residente = 34687.5;
    expect(esquemaBaseMunicipios.safeParse(base).success).toBe(false);
  });
});

describe("esquemaGeojsonMunicipios (RN-029, fonte de dados)", () => {
  test("fixture mínima válida passa", () => {
    expect(esquemaGeojsonMunicipios.safeParse(geojsonValido()).success).toBe(
      true,
    );
  });

  test("geometria não-Polygon é rejeitada (Spec 03 §2.3)", () => {
    const geojson = geojsonValido();
    geojson.features[0].geometry.type = "MultiPolygon";
    expect(esquemaGeojsonMunicipios.safeParse(geojson).success).toBe(false);
  });

  test("codarea malformado é rejeitado", () => {
    const geojson = geojsonValido();
    geojson.features[0].properties.codarea = "SP-001";
    expect(esquemaGeojsonMunicipios.safeParse(geojson).success).toBe(false);
  });

  test("anel com menos de 4 posições é rejeitado", () => {
    const geojson = geojsonValido();
    geojson.features[0].geometry.coordinates[0].pop();
    expect(esquemaGeojsonMunicipios.safeParse(geojson).success).toBe(false);
  });

  test("propriedade extra em properties é rejeitada (strict)", () => {
    const geojson = geojsonValido();
    geojson.features[0].properties.nome = "Adamantina";
    expect(esquemaGeojsonMunicipios.safeParse(geojson).success).toBe(false);
  });
});
