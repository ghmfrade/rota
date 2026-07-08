import { describe, expect, test } from "vitest";
import { importarDocumento } from "@/formulario/importacao";
import type { ListasAutosEmpresas } from "@/shared/dados-estaticos";
import {
  esquemaDocumentoOperacao,
  type DocumentoOperacao,
} from "@/shared/contrato";
import {
  FIXTURES_VALIDAS,
  documentoExemploMinimo,
  documentoBidirecionalMultiServico,
} from "../../fixtures";

// TASK-006 — importação de JSON com preservação de UUID (Spec 04 §3.1).
// Regras exercidas: RN-004 (round-trip de UUID), RN-017/RN-016 (bloqueio por
// identidade obsoleta), RN-091 parte F (espinha de validação por arquivo).
// Nenhum teste depende de rede/OSRM: as listas estáticas são fabricadas aqui e
// injetadas na função pura.

// Constrói listas estáticas mínimas (DEC-030) que RECONHECEM a identidade do
// documento — codigo, empresa (nome) e tipo do Autos entram nas listas.
function listasReconhecendo(doc: DocumentoOperacao): ListasAutosEmpresas {
  return {
    versao_schema: "1.0",
    tipos: [{ codigo: doc.autos.tipo, descricao: "Tipo macro." }],
    empresas: [{ id: "empresa-do-doc", nome: doc.autos.empresa }],
    autos: [
      {
        codigo: doc.autos.codigo,
        tc: "01",
        denominacao_linha: "Linha de teste",
        empresa_id: "empresa-do-doc",
        tipo: doc.autos.tipo,
        operante: true,
      },
    ],
  };
}

// Coleta o conjunto de TODAS as UUIDs de um documento cru (Seção, Serviço,
// Local, Viagem) — oráculo do round-trip (RN-004).
function coletarUuids(doc: DocumentoOperacao): Set<string> {
  const uuids = new Set<string>();
  for (const secao of doc.autos.secoes) uuids.add(secao.uuid);
  for (const servico of doc.autos.servicos) {
    uuids.add(servico.uuid);
    for (const local of servico.locais) uuids.add(local.uuid);
    for (const itinerario of servico.itinerarios) {
      for (const viagem of itinerario.viagens) uuids.add(viagem.uuid);
    }
  }
  return uuids;
}

describe("importarDocumento — round-trip de UUID (RN-004)", () => {
  test.each(FIXTURES_VALIDAS)(
    "preserva todas as UUIDs de $nome",
    ({ carregar }) => {
      const original = carregar();
      const listas = listasReconhecendo(original);
      const texto = JSON.stringify(original);
      const uuidsOriginais = coletarUuids(original);

      const resultado = importarDocumento(texto, listas);

      expect(resultado.ok).toBe(true);
      if (!resultado.ok) return;
      const uuidsImportadas = coletarUuids(resultado.documento);
      expect([...uuidsImportadas].sort()).toEqual([...uuidsOriginais].sort());
      expect(resultado.alertas).toEqual([]);
    },
  );

  test("não reindexa nem acrescenta lógica própria além do parse do schema (NEG-014)", () => {
    // O import não deve fazer NADA além de validar: o resultado é idêntico ao
    // parse direto do schema (que apenas canoniza defaults de array vazio — não
    // reordena entidades nem toca UUIDs).
    const original = documentoExemploMinimo();
    const listas = listasReconhecendo(original);
    const baseline = esquemaDocumentoOperacao.parse(structuredClone(original));

    const resultado = importarDocumento(JSON.stringify(original), listas);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.documento).toEqual(baseline);
  });

  test("preserva a ORDEM das entidades — não reindexa (NEG-014)", () => {
    const original = documentoBidirecionalMultiServico();
    const listas = listasReconhecendo(original);

    const resultado = importarDocumento(JSON.stringify(original), listas);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.documento.autos.servicos.map((s) => s.uuid)).toEqual(
      original.autos.servicos.map((s) => s.uuid),
    );
    expect(resultado.documento.autos.secoes.map((s) => s.uuid)).toEqual(
      original.autos.secoes.map((s) => s.uuid),
    );
  });
});

describe("importarDocumento — identidade obsoleta (RN-017/RN-016)", () => {
  test("aceita quando codigo, empresa e tipo constam das listas", () => {
    const doc = documentoExemploMinimo();
    const resultado = importarDocumento(
      JSON.stringify(doc),
      listasReconhecendo(doc),
    );
    expect(resultado.ok).toBe(true);
  });

  test("bloqueia quando o codigo do Autos não consta na lista", () => {
    const doc = documentoExemploMinimo();
    const listas = listasReconhecendo(doc);
    listas.autos[0].codigo = "9999-inexistente";

    const resultado = importarDocumento(JSON.stringify(doc), listas);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.categoria).toBe("identidade_obsoleta");
    expect(resultado.erro.mensagem).toContain(doc.autos.codigo);
    expect(resultado.erro.mensagem).toContain("identificação desatualizada");
  });

  test("bloqueia quando a empresa (nome) não consta na lista", () => {
    const doc = documentoExemploMinimo();
    const listas = listasReconhecendo(doc);
    listas.empresas[0].nome = "Empresa Extinta S.A.";

    const resultado = importarDocumento(JSON.stringify(doc), listas);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.categoria).toBe("identidade_obsoleta");
  });

  test("bloqueia quando o tipo não consta na lista de tipos", () => {
    // Documento Rodoviário, mas as listas só reconhecem Semiurbano.
    const doc = documentoExemploMinimo();
    expect(doc.autos.tipo).toBe("Rodoviário");
    const listas = listasReconhecendo(doc);
    listas.tipos[0].codigo = "Semiurbano";

    const resultado = importarDocumento(JSON.stringify(doc), listas);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.categoria).toBe("identidade_obsoleta");
  });
});

describe("importarDocumento — entrada bloqueante (RN-091 parte F)", () => {
  test("bloqueia texto que não é JSON bem-formado", () => {
    const listas = listasReconhecendo(documentoExemploMinimo());
    const resultado = importarDocumento("{ nao é json", listas);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.categoria).toBe("json_invalido");
    expect(resultado.erro.mensagem).toContain("gerado pelo ROTA");
  });

  test("bloqueia JSON com campo extra (schema fechado — RN-010)", () => {
    const doc = documentoExemploMinimo() as DocumentoOperacao & {
      campo_intruso?: unknown;
    };
    const listas = listasReconhecendo(doc);
    const bruto = { ...doc, campo_intruso: true };

    const resultado = importarDocumento(JSON.stringify(bruto), listas);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.categoria).toBe("json_invalido");
  });

  test("bloqueia JSON com UUID de Serviço duplicada (RN-005)", () => {
    const doc = documentoExemploMinimo();
    const listas = listasReconhecendo(doc);
    // Duplica a UUID do único Serviço acrescentando um clone — viola RN-005.
    const bruto = structuredClone(doc);
    bruto.autos.servicos.push(structuredClone(bruto.autos.servicos[0]));

    const resultado = importarDocumento(JSON.stringify(bruto), listas);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.categoria).toBe("json_invalido");
  });

  test("a ordem é schema antes de identidade: JSON inválido não vira identidade obsoleta", () => {
    // Listas que NÃO reconhecem nada + JSON estruturalmente inválido: deve
    // reportar json_invalido (etapa 2 antes da etapa 3).
    const doc = documentoExemploMinimo();
    const listas = listasReconhecendo(doc);
    listas.autos[0].codigo = "outro";
    const bruto = { ...doc, campo_intruso: true };

    const resultado = importarDocumento(JSON.stringify(bruto), listas);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.categoria).toBe("json_invalido");
  });
});
