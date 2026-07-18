import { describe, expect, test } from "vitest";
import { avaliarGateExportacao } from "@/formulario/exportacao";
import type { SessaoFormulario } from "@/formulario/sessao";
import type { ItinerarioAoVivo } from "@/formulario/pendencias";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-032 — gate de exportação (RN-078; Spec 04 §11/§14) que rege os botões
// da etapa Exportação ANTES do clique ("Botões de exportação desabilitados +
// painel de pendências em foco"). Combina pendências vivas de sessão com a
// validação estrutural do schema, sem falso-bloqueio por bookkeeping de data
// (RN-011) que só é resolvido no clique real.

describe("avaliarGateExportacao — caminho liberado", () => {
  test("documento carregado válido, sem pendências vivas → liberado", () => {
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento: documentoExemploMinimo(),
      alertasImportacao: [],
    };

    const resultado = avaliarGateExportacao(sessao, []);

    expect(resultado.liberado).toBe(true);
    expect(resultado.pendenciasBloqueantes).toHaveLength(0);
    expect(resultado.errosEstruturais).toHaveLength(0);
    expect(resultado.documentoIncompleto).toBe(false);
  });

  test("documento montável no modo novo, sem pendências → liberado", () => {
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

    expect(avaliarGateExportacao(sessao, []).liberado).toBe(true);
  });
});

describe("avaliarGateExportacao — casos bloqueantes (RN-078)", () => {
  test("[inválido] modo novo sem identidade/Serviço → bloqueado (documentoIncompleto)", () => {
    const sessao: SessaoFormulario = { modo: "novo" };

    const resultado = avaliarGateExportacao(sessao, []);

    expect(resultado.liberado).toBe(false);
    expect(resultado.documentoIncompleto).toBe(true);
  });

  test("[inválido] pendência bloqueante ao vivo (rota ausente, TASK-044) bloqueia mesmo com documento schema-válido", () => {
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento: documentoExemploMinimo(),
      alertasImportacao: [],
    };
    const itinerarios: ItinerarioAoVivo[] = [
      {
        numeroN: "0000-1CR",
        sentido: "ida",
        estadoRota: { situacao: "sem-rota", falha: { tipo: "sem-rota" } },
      },
    ];

    const resultado = avaliarGateExportacao(sessao, itinerarios);

    expect(resultado.liberado).toBe(false);
    expect(resultado.pendenciasBloqueantes).toHaveLength(1);
    expect(resultado.documentoIncompleto).toBe(false);
  });

  test("[inválido] documento estruturalmente inválido (itinerário sem viagem, §11/RN-039) bloqueia", () => {
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].itinerarios[0].viagens = [];
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    expect(avaliarGateExportacao(sessao, []).liberado).toBe(false);
  });

  test("[inválido] status 'vigente' sem estrutura de resto quebrada não é bloqueado por falta de data_publicacao (bookkeeping isolado de RN-011)", () => {
    const documento = documentoExemploMinimo();
    // Simula um documento que já seria "vigente" mas ainda sem a data (caso
    // não ocorre de verdade na sessão — aqui só prova que o gate não falso-
    // bloqueia pelo bookkeeping de data, isolado no placeholder do gate).
    documento.autos = { ...documento.autos, status: "vigente" };
    delete documento.autos.data_criacao;
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    expect(avaliarGateExportacao(sessao, []).liberado).toBe(true);
  });
});

describe("avaliarGateExportacao — motivos estruturais visíveis (TASK-085; RN-078)", () => {
  test("Seção órfã (RN-018): motivo aparece com Cidade/Nome e Serviço, sem uuid/RN cru, apontando para a etapa de itinerários", () => {
    const documento = documentoExemploMinimo();
    documento.autos.secoes.push({
      uuid: "9f9f9f9f-1111-4111-8111-999999999999",
      municipio: "Guarujá",
      nome: "Terminal Extra",
      servicos: [
        {
          servico_uuid: documento.autos.servicos[0].uuid,
          geolocalizacao_ida: { latitude: -23.99, longitude: -46.25 },
          geolocalizacao_volta: { latitude: -23.99, longitude: -46.25 },
        },
      ],
    });
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    const resultado = avaliarGateExportacao(sessao, []);

    expect(resultado.liberado).toBe(false);
    expect(resultado.errosEstruturais.length).toBeGreaterThan(0);
    const motivo = resultado.errosEstruturais.find((e) =>
      e.mensagem.includes("Guarujá - Terminal Extra"),
    );
    expect(motivo).toBeDefined();
    expect(motivo!.mensagem).toContain("0000-1CR");
    expect(motivo!.mensagem).not.toMatch(/\[RN-\d+\]/);
    expect(motivo!.mensagem).not.toContain("uuid");
    expect(motivo!.mensagem).not.toContain("Spec 02");
    expect(motivo!.etapaAlvo).toBe("secoes-locais-itinerarios");
  });

  test("itinerário sem viagem (RN-039): mensagem operacional cita Serviço e sentido, aponta para Viagens e horários", () => {
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].itinerarios[0].viagens = [];
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    const resultado = avaliarGateExportacao(sessao, []);

    const motivo = resultado.errosEstruturais.find((e) => e.mensagem.includes("nenhuma viagem"));
    expect(motivo).toBeDefined();
    expect(motivo!.mensagem).toContain("0000-1CR");
    expect(motivo!.mensagem).toContain("Ida");
    expect(motivo!.mensagem).not.toMatch(/\[RN-\d+\]/);
    expect(motivo!.etapaAlvo).toBe("viagens-horarios");
  });

  test("paradas insuficientes (RN-034): mensagem operacional cita o Serviço, sem jargão técnico", () => {
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].itinerarios[0].paradas =
      documento.autos.servicos[0].itinerarios[0].paradas.slice(0, 1);
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    const resultado = avaliarGateExportacao(sessao, []);

    const motivo = resultado.errosEstruturais.find((e) => e.mensagem.includes("0000-1CR"));
    expect(motivo).toBeDefined();
    expect(motivo!.mensagem).not.toMatch(/\[RN-\d+\]/);
    expect(motivo!.mensagem).not.toContain("Spec 02");
  });

  test("violação sem tradução dedicada (uuid de Viagem duplicada, RN-005) cai no fallback operacional — cita o Serviço e a etapa, nunca uuid/RN", () => {
    const documento = documentoExemploMinimo();
    const viagens = documento.autos.servicos[0].itinerarios[0].viagens;
    viagens[1].uuid = viagens[0].uuid;
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    const resultado = avaliarGateExportacao(sessao, []);

    expect(resultado.errosEstruturais.length).toBeGreaterThan(0);
    for (const erro of resultado.errosEstruturais) {
      expect(erro.mensagem).not.toMatch(/\[RN-\d+\]/);
      expect(erro.mensagem).not.toContain("uuid");
      expect(erro.mensagem).not.toContain("Spec 02");
    }
    const motivo = resultado.errosEstruturais.find((e) => e.mensagem.includes("0000-1CR"));
    expect(motivo).toBeDefined();
    expect(motivo!.mensagem).toMatch(/Revise a etapa/);
  });
});
