import { describe, expect, test } from "vitest";
import { carregarListasAutosEmpresas } from "@/shared/dados-estaticos";
import type { ListasAutosEmpresas } from "@/shared/dados-estaticos";
import {
  identidadeDeAutosEstatico,
  preVisualizacaoDeAutos,
} from "@/formulario/identificacao/pre-visualizacao";

// TASK-075 (DEC-064) — pré-visualização do Autos candidato e confirmação
// explícita antes de congelar. Categoria 2 (validação de domínio) / 10
// (regressão) de `docs-dev/08-TEST_STRATEGY.md`. Prova: (1) a pré-visualização
// expõe dados só de exibição (`denominacao_linha`) SEM que entrem no contrato
// de `IdentidadeAutos` (RN-008..015); (2) o commit (`identidadeDeAutosEstatico`)
// monta a identidade real com `status: "proposta"` (RN-011); (3) `operante`
// decide o reforço de carregar o JSON vigente (Spec 04 §3.1). Nenhum teste
// toca OSRM/rede — as listas estáticas são o único insumo.

// Fixture mínima com um Autos NÃO operante — os dados reais de
// data/autos_empresas.json têm 100% `operante: true` (levantado na análise da
// task), então o ramo "não operante" só é exercitável com dado sintético.
function listasComAutosNaoOperante(): ListasAutosEmpresas {
  return {
    versao_schema: "1.0",
    tipos: [{ codigo: "Rodoviário", descricao: "Rodoviário" }],
    empresas: [{ id: "empresa-x", nome: "Empresa X Ltda" }],
    autos: [
      {
        codigo: "9999",
        tc: "TC-9999",
        denominacao_linha: "CIDADE A - CIDADE B",
        empresa_id: "empresa-x",
        tipo: "Rodoviário",
        operante: false,
      },
    ],
  };
}

describe("preVisualizacaoDeAutos (TASK-075)", () => {
  test("monta a pré-visualização a partir das listas estáticas reais (RN-016)", async () => {
    const listas = await carregarListasAutosEmpresas();
    const primeiro = listas.autos[0];

    const previa = preVisualizacaoDeAutos(listas, primeiro.codigo);

    expect(previa).toBeDefined();
    expect(previa?.codigo).toBe(primeiro.codigo);
    expect(previa?.denominacaoLinha).toBe(primeiro.denominacao_linha);
    expect(previa?.tipo).toBe(primeiro.tipo);
    expect(previa?.operante).toBe(primeiro.operante);
  });

  test("código inexistente nas listas: undefined (caso inválido)", async () => {
    const listas = await carregarListasAutosEmpresas();
    expect(preVisualizacaoDeAutos(listas, "codigo-inexistente")).toBeUndefined();
  });

  test("operante: false — situação refletida na pré-visualização (fixture sintética)", () => {
    const listas = listasComAutosNaoOperante();
    const previa = preVisualizacaoDeAutos(listas, "9999");
    expect(previa?.operante).toBe(false);
  });

  test("empresa_id desconhecido cai no fallback do próprio id (mesmo padrão de nomeDaEmpresa)", () => {
    const listas: ListasAutosEmpresas = {
      versao_schema: "1.0",
      tipos: [{ codigo: "Rodoviário", descricao: "Rodoviário" }],
      empresas: [],
      autos: [
        {
          codigo: "1",
          tc: "TC-1",
          denominacao_linha: "A - B",
          empresa_id: "empresa-inexistente",
          tipo: "Rodoviário",
          operante: true,
        },
      ],
    };
    const previa = preVisualizacaoDeAutos(listas, "1");
    expect(previa?.empresa).toBe("empresa-inexistente");
  });
});

describe("identidadeDeAutosEstatico (TASK-075/DEC-064)", () => {
  test("comita codigo/empresa/tipo com status proposta (RN-011)", async () => {
    const listas = await carregarListasAutosEmpresas();
    const primeiro = listas.autos[0];

    const identidade = identidadeDeAutosEstatico(listas, primeiro.codigo);

    expect(identidade).toEqual({
      codigo: primeiro.codigo,
      empresa: expect.any(String),
      tipo: primeiro.tipo,
      status: "proposta",
    });
  });

  test("denominacao_linha NÃO entra na identidade comitada (contrato fechado — RN-008..015)", async () => {
    const listas = await carregarListasAutosEmpresas();
    const primeiro = listas.autos[0];

    const identidade = identidadeDeAutosEstatico(listas, primeiro.codigo);

    expect(identidade).not.toHaveProperty("denominacaoLinha");
    expect(identidade).not.toHaveProperty("denominacao_linha");
    expect(Object.keys(identidade ?? {}).sort()).toEqual(
      ["codigo", "empresa", "status", "tipo"].sort(),
    );
  });

  test("código inexistente nas listas: undefined (caso inválido — sem commit)", async () => {
    const listas = await carregarListasAutosEmpresas();
    expect(
      identidadeDeAutosEstatico(listas, "codigo-inexistente"),
    ).toBeUndefined();
  });
});
