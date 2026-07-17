import { describe, expect, test } from "vitest";
import {
  montarDocumentoParaExportacao,
  exportarComoProposta,
} from "@/formulario/exportacao";
import { VERSAO_SCHEMA_ATUAL } from "@/shared/contrato";
import type { SessaoFormulario } from "@/formulario/sessao";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-032 — montagem do DocumentoOperacao final para a exportação (Spec 04
// §12). Regras exercidas: RN-004 (round-trip de UUID), RN-018 (autos.servicos
// >= 1), DEC-066/Q-046 (VERSAO_SCHEMA_ATUAL num documento criado do zero).

describe("montarDocumentoParaExportacao — modo carregado", () => {
  test("devolve o documento tal como está (mesma referência, sem remontar)", () => {
    const documento = documentoExemploMinimo();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };

    expect(montarDocumentoParaExportacao(sessao)).toBe(documento);
  });
});

describe("montarDocumentoParaExportacao — modo novo (DEC-035/053)", () => {
  test("[inválido] sem identidade definida → null", () => {
    const sessao: SessaoFormulario = { modo: "novo" };
    expect(montarDocumentoParaExportacao(sessao)).toBeNull();
  });

  test("[inválido] identidade definida mas sem Serviço promovido → null (RN-018)", () => {
    const sessao: SessaoFormulario = {
      modo: "novo",
      identidade: {
        codigo: "9000",
        empresa: "Viação Teste Ltda.",
        tipo: "Rodoviário",
        status: "proposta",
      },
    };
    expect(montarDocumentoParaExportacao(sessao)).toBeNull();
  });

  test("monta autos com identidade + Seções + Serviços promovidos, sem nenhuma data", () => {
    const base = documentoExemploMinimo();
    const sessao: SessaoFormulario = {
      modo: "novo",
      identidade: {
        codigo: base.autos.codigo,
        empresa: base.autos.empresa,
        tipo: base.autos.tipo,
        status: "proposta",
      },
      secoesEmConstrucao: base.autos.secoes,
      servicos: base.autos.servicos,
    };

    const montado = montarDocumentoParaExportacao(sessao);

    expect(montado).not.toBeNull();
    expect(montado?.versao_schema).toBe(VERSAO_SCHEMA_ATUAL);
    expect(montado?.autos.codigo).toBe(base.autos.codigo);
    expect(montado?.autos.secoes).toBe(base.autos.secoes);
    expect(montado?.autos.servicos).toBe(base.autos.servicos);
    expect(montado?.autos).not.toHaveProperty("data_criacao");
    expect(montado?.autos).not.toHaveProperty("data_publicacao");
  });

  test("não muta a sessão de entrada", () => {
    const base = documentoExemploMinimo();
    const sessao: SessaoFormulario = {
      modo: "novo",
      identidade: {
        codigo: base.autos.codigo,
        empresa: base.autos.empresa,
        tipo: base.autos.tipo,
        status: "proposta",
      },
      secoesEmConstrucao: base.autos.secoes,
      servicos: base.autos.servicos,
    };
    const antes = structuredClone(sessao);

    montarDocumentoParaExportacao(sessao);

    expect(sessao).toEqual(antes);
  });

  test("round-trip de UUID (RN-004): Seções e Serviços preservam a UUID ao exportar", () => {
    const base = documentoExemploMinimo();
    const sessao: SessaoFormulario = {
      modo: "novo",
      identidade: {
        codigo: base.autos.codigo,
        empresa: base.autos.empresa,
        tipo: base.autos.tipo,
        status: "proposta",
      },
      secoesEmConstrucao: base.autos.secoes,
      servicos: base.autos.servicos,
    };
    const montado = montarDocumentoParaExportacao(sessao);
    expect(montado).not.toBeNull();
    if (!montado) return;

    const resultado = exportarComoProposta(montado, "2026-07-17");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.documento.autos.secoes[0].uuid).toBe(base.autos.secoes[0].uuid);
    expect(resultado.documento.autos.servicos[0].uuid).toBe(base.autos.servicos[0].uuid);
  });
});
