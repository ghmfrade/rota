import { describe, expect, test } from "vitest";
import { coletarPendencias } from "@/formulario/pendencias";
import { ETAPAS, rotuloEtapa, type IdEtapa } from "@/formulario/layout/etapas";
import type { SessaoFormulario } from "@/formulario/sessao";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-014 — layout por etapas + painel de pendências (Spec 04 §4/§11; RN-078).
// Aqui se testa a parte pura: a coleta de pendências a partir da sessão e a
// definição das 7 etapas. A casca (LayoutFormulario) e a navegação por clique
// são cobertas pelo E2E (testes/e2e/formulario-layout.spec.ts).

const sessaoNovo: SessaoFormulario = { modo: "novo" };
const sessaoCarregado: SessaoFormulario = {
  modo: "carregado",
  documento: documentoExemploMinimo(),
  alertasImportacao: [],
};

describe("coletarPendencias (Spec 04 §11; RN-078)", () => {
  test('modo "novo" produz o alerta "documento criado do zero" (§11)', () => {
    const pendencias = coletarPendencias(sessaoNovo);
    expect(pendencias).toHaveLength(1);
    const [alerta] = pendencias;
    expect(alerta.id).toBe("documento-criado-do-zero");
    expect(alerta.severidade).toBe("alerta");
    expect(alerta.mensagem).toContain("Documento criado do zero");
  });

  test('o alerta de documento do zero navega para a etapa Revisão (DEC-033)', () => {
    const [alerta] = coletarPendencias(sessaoNovo);
    expect(alerta.etapaAlvo).toBe<IdEtapa>("revisao");
    // O destino tem de ser uma etapa real do stepper.
    expect(ETAPAS.some((e) => e.id === alerta.etapaAlvo)).toBe(true);
  });

  test('modo "carregado" não produz pendências neste estágio do projeto', () => {
    // Caso "inválido" de proteção: as demais pendências de §11 dependem de
    // dados que ainda não existem (rota, matriz, horários) — a coleta NÃO pode
    // inventá-las (docs-dev/04 princípio 2). Carregar um documento válido, sem
    // esses dados, não pode gerar pendência aqui.
    expect(coletarPendencias(sessaoCarregado)).toHaveLength(0);
  });

  test("nenhuma pendência é bloqueante neste estágio (não travar exportação por engano)", () => {
    // Proteção contra falso gate: a única pendência conhecível é um alerta.
    const todas = [
      ...coletarPendencias(sessaoNovo),
      ...coletarPendencias(sessaoCarregado),
    ];
    expect(todas.every((p) => p.severidade === "alerta")).toBe(true);
  });

  test("é função pura — não persiste nem acumula entre chamadas (NEG-004)", () => {
    const primeira = coletarPendencias(sessaoNovo);
    const segunda = coletarPendencias(sessaoNovo);
    expect(segunda).toHaveLength(primeira.length);
    // Instâncias novas a cada chamada (recomputado, não memorizado).
    expect(segunda).not.toBe(primeira);
  });
});

describe("ETAPAS (Spec 04 §4)", () => {
  test("são exatamente as 7 etapas, na ordem da spec", () => {
    expect(ETAPAS.map((e) => e.id)).toEqual([
      "identificacao",
      "servicos",
      "secoes-locais-itinerarios",
      "viagens-horarios",
      "matrizes",
      "revisao",
      "exportacao",
    ]);
  });

  test("ids são únicos", () => {
    const ids = ETAPAS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("rotuloEtapa devolve o rótulo de exibição de cada etapa", () => {
    expect(rotuloEtapa("identificacao")).toBe("Identificação");
    expect(rotuloEtapa("exportacao")).toBe("Exportação JSON/PDF");
    // Toda etapa declarada tem rótulo não vazio.
    for (const etapa of ETAPAS) {
      expect(rotuloEtapa(etapa.id)).toBe(etapa.rotulo);
      expect(etapa.rotulo.length).toBeGreaterThan(0);
    }
  });
});
