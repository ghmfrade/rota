import { describe, expect, test } from "vitest";
import {
  exportarComoProposta,
  exportarComoVigente,
  validarParaExportacao,
} from "@/formulario/exportacao";
import {
  esquemaDocumentoOperacao,
  type DocumentoOperacao,
} from "@/shared/contrato";
import {
  FIXTURES_VALIDAS,
  documentoExemploMinimo,
  documentoParVigente,
  documentoParProposta,
} from "../../fixtures";

// TASK-007 — exportação de JSON de operação (Spec 04 §12).
// Regras exercidas: RN-011 (XOR status↔data), RN-078 (gate bloqueante),
// RN-079 (as duas ações + nomes sugeridos), RN-004 (round-trip de UUID).
// Nenhum teste depende de rede/OSRM: a data corrente é injetada.

const HOJE = "2026-07-08";

// Coleta o conjunto de TODAS as UUIDs de um documento (Seção, Serviço, Local,
// Viagem) — oráculo do round-trip (RN-004). Espelha o coletor do teste de import.
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

describe("exportarComoProposta — status e datas (RN-011/RN-079)", () => {
  test("emite status proposta com data_criacao e SEM data_publicacao", () => {
    const doc = documentoExemploMinimo();
    const resultado = exportarComoProposta(doc, HOJE);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.documento.autos.status).toBe("proposta");
    expect(resultado.documento.autos.data_criacao).toBe(HOJE);
    expect(resultado.documento.autos).not.toHaveProperty("data_publicacao");
  });

  test("o JSON emitido revalida no schema fechado (Spec 02 §14)", () => {
    const doc = documentoExemploMinimo();
    const resultado = exportarComoProposta(doc, HOJE);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const reparse = esquemaDocumentoOperacao.safeParse(JSON.parse(resultado.json));
    expect(reparse.success).toBe(true);
  });

  test("nome sugerido: rota-{codigo}-proposta-{data}.json", () => {
    const doc = documentoExemploMinimo(); // codigo "0000"
    const resultado = exportarComoProposta(doc, HOJE);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.nomeSugerido).toBe("rota-0000-proposta-2026-07-08.json");
  });

  // Negativo (dois campos de data): partir de um documento VIGENTE (traz
  // data_publicacao) e exportar como proposta deve DESCARTAR data_publicacao,
  // nunca acumular as duas datas (RN-011).
  test("descarta data_publicacao ao exportar um documento vigente como proposta", () => {
    const doc = documentoParVigente(); // status vigente + data_publicacao
    expect(doc.autos.data_publicacao).toBeDefined();

    const resultado = exportarComoProposta(doc, HOJE);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.documento.autos).not.toHaveProperty("data_publicacao");
    expect(resultado.documento.autos.data_criacao).toBe(HOJE);
    expect(resultado.json).not.toContain("data_publicacao");
  });

  test("data corrente malformada bloqueia com mensagem clara", () => {
    const doc = documentoExemploMinimo();
    const resultado = exportarComoProposta(doc, "08/07/2026");

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros[0].categoria).toBe("data_invalida");
  });
});

describe("exportarComoVigente — status e datas (RN-011/RN-079)", () => {
  test("emite status vigente com data_publicacao e SEM data_criacao", () => {
    const doc = documentoExemploMinimo(); // nasce proposta + data_criacao
    const resultado = exportarComoVigente(doc, "2026-01-15");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.documento.autos.status).toBe("vigente");
    expect(resultado.documento.autos.data_publicacao).toBe("2026-01-15");
    expect(resultado.documento.autos).not.toHaveProperty("data_criacao");
  });

  test("nome sugerido: rota-{codigo}-vigente-{data}.json", () => {
    const doc = documentoParProposta(); // codigo "3000"
    const resultado = exportarComoVigente(doc, "2026-01-15");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.nomeSugerido).toBe("rota-3000-vigente-2026-01-15.json");
  });

  // Negativo (dois campos de data): partir de um documento PROPOSTA (traz
  // data_criacao) e definir como vigente deve DESCARTAR data_criacao (RN-011).
  test("descarta data_criacao ao definir um documento proposta como vigente", () => {
    const doc = documentoParProposta(); // status proposta + data_criacao
    expect(doc.autos.data_criacao).toBeDefined();

    const resultado = exportarComoVigente(doc, "2026-01-15");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.documento.autos).not.toHaveProperty("data_criacao");
    expect(resultado.json).not.toContain("data_criacao");
  });

  test("data de publicação malformada bloqueia com mensagem clara", () => {
    const doc = documentoExemploMinimo();
    const resultado = exportarComoVigente(doc, "2026-13-40x");

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros[0].categoria).toBe("data_invalida");
  });
});

describe("exportação — round-trip de UUID (RN-004)", () => {
  test.each(FIXTURES_VALIDAS)(
    "proposta preserva todas as UUIDs de $nome",
    ({ carregar }) => {
      const original = carregar();
      const uuidsOriginais = coletarUuids(original);

      const resultado = exportarComoProposta(original, HOJE);

      expect(resultado.ok).toBe(true);
      if (!resultado.ok) return;
      const reimportado = JSON.parse(resultado.json) as DocumentoOperacao;
      expect([...coletarUuids(reimportado)].sort()).toEqual(
        [...uuidsOriginais].sort(),
      );
    },
  );

  test.each(FIXTURES_VALIDAS)(
    "vigente preserva todas as UUIDs de $nome",
    ({ carregar }) => {
      const original = carregar();
      const uuidsOriginais = coletarUuids(original);

      const resultado = exportarComoVigente(original, "2026-01-15");

      expect(resultado.ok).toBe(true);
      if (!resultado.ok) return;
      const reimportado = JSON.parse(resultado.json) as DocumentoOperacao;
      expect([...coletarUuids(reimportado)].sort()).toEqual(
        [...uuidsOriginais].sort(),
      );
    },
  );

  test("não muta o documento de entrada (RN-096/NEG-014)", () => {
    const original = documentoParVigente();
    const antes = structuredClone(original);

    exportarComoProposta(original, HOJE);

    expect(original).toEqual(antes);
  });
});

describe("gate de exportação bloqueante (RN-078)", () => {
  // Itinerário sem viagem é erro bloqueante explícito da Spec 04 §11
  // (Spec 02 §14 exige ≥ 1 viagem por itinerário). O export normaliza só
  // status/datas — não conserta a estrutura, então o gate deve barrar.
  function documentoSemViagem(): DocumentoOperacao {
    const doc = documentoExemploMinimo();
    doc.autos.servicos[0].itinerarios[0].viagens = [];
    return doc;
  }

  test("proposta: documento estruturalmente inválido não emite JSON", () => {
    const resultado = exportarComoProposta(documentoSemViagem(), HOJE);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros[0].categoria).toBe("pendencia_bloqueante");
    expect(resultado.erros[0].mensagem).toContain("pendências bloqueantes");
    expect(resultado).not.toHaveProperty("json");
  });

  test("vigente: documento estruturalmente inválido não emite JSON", () => {
    const resultado = exportarComoVigente(documentoSemViagem(), "2026-01-15");

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erros[0].categoria).toBe("pendencia_bloqueante");
  });

  test("validarParaExportacao devolve [] para documento válido", () => {
    expect(validarParaExportacao(documentoExemploMinimo())).toEqual([]);
  });
});
