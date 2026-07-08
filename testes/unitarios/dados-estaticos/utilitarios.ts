// Fixtures mínimas válidas dos recursos estáticos (formato DEC-030), prontas
// para mutação nos casos inválidos. Tipagem livre pelo mesmo motivo dos
// testes de contrato: o objetivo é produzir documentos inválidos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DadosMutaveis = any;

export function listasValidas(): DadosMutaveis {
  return {
    versao_schema: "1.0",
    tipos: [
      { codigo: "Rodoviário", descricao: "Tipo macro rodoviário." },
      { codigo: "Semiurbano", descricao: "Tipo macro semiurbano." },
    ],
    empresas: [{ id: "viacao-exemplo", nome: "Viação Exemplo" }],
    autos: [
      {
        codigo: "0001",
        tc: "01",
        denominacao_linha: "Santos - São Paulo",
        empresa_id: "viacao-exemplo",
        tipo: "Rodoviário",
        operante: true,
      },
    ],
  };
}

export function baseMunicipiosValida(): DadosMutaveis {
  return {
    versao_schema: "1.0",
    municipios: [
      {
        codigo_ibge: "3500105",
        nome: "Adamantina",
        populacao_residente: 34687,
        estado: "SP",
      },
    ],
  };
}

export function geojsonValido(): DadosMutaveis {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { codarea: "3500105" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-46.0, -23.0],
              [-46.0, -23.1],
              [-45.9, -23.1],
              [-46.0, -23.0],
            ],
          ],
        },
      },
    ],
  };
}
