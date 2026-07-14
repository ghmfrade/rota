import { describe, expect, test } from "vitest";
import { celulaDistancia, formatarKm } from "@/formulario/matrizes";
import type { ParDistancia } from "@/shared/contrato";
import {
  documentoBidirecionalMultiServico,
  documentoExemploMinimo,
  documentoUnidirecional,
} from "../../fixtures";

// TASK-048 — derivação read-only da matriz de distâncias na etapa Matrizes
// (Spec 04 §9.1; RN-054/056). Lê o `matriz_distancias` já congelado das
// fixtures canônicas — nunca recomputa nem toca OSRM.

describe("celulaDistancia — mapeamento par → célula read-only (RN-054/056)", () => {
  test("bidirecional: célula expõe Ida, Volta e valor adotado (RN-056)", () => {
    const servico = documentoBidirecionalMultiServico().autos.servicos[0];
    const [par] = servico.matriz_distancias;

    const celula = celulaDistancia(
      servico.matriz_distancias,
      par.secao_a_uuid,
      par.secao_b_uuid,
    );

    expect(celula).toEqual({
      valorAdotado: par.valor_adotado_de_distancia,
      ida: par.distancia_trecho_ida,
      volta: par.distancia_trecho_volta,
      bidirecional: true,
    });
  });

  test("insensível à ordem dos argumentos: {a,b} == {b,a} (RN-054)", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    const [par] = servico.matriz_distancias;

    expect(
      celulaDistancia(servico.matriz_distancias, par.secao_a_uuid, par.secao_b_uuid),
    ).toEqual(
      celulaDistancia(servico.matriz_distancias, par.secao_b_uuid, par.secao_a_uuid),
    );
  });

  test("insensível à ordem de armazenamento dos pares", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    const [par] = servico.matriz_distancias;
    const embaralhada = [...servico.matriz_distancias].reverse();

    expect(celulaDistancia(embaralhada, par.secao_a_uuid, par.secao_b_uuid)).toEqual(
      celulaDistancia(servico.matriz_distancias, par.secao_a_uuid, par.secao_b_uuid),
    );
  });

  test("unidirecional: só o único valor, sem detalhe Ida/Volta (RN-056)", () => {
    const servico = documentoUnidirecional().autos.servicos[0];
    const [par] = servico.matriz_distancias;

    const celula = celulaDistancia(
      servico.matriz_distancias,
      par.secao_a_uuid,
      par.secao_b_uuid,
    );

    expect(celula?.bidirecional).toBe(false);
    expect(celula?.valorAdotado).toBe(par.valor_adotado_de_distancia);
    expect(celula?.volta).toBeUndefined();
    expect(celula?.ida).toBe(par.distancia_trecho_ida);
  });

  test("[célula vazia] par sem entrada na matriz → undefined (não inventa valor)", () => {
    const servico = documentoExemploMinimo().autos.servicos[0];
    const inexistente = "99999999-9999-4999-8999-999999999999";
    const [par] = servico.matriz_distancias;

    expect(
      celulaDistancia(servico.matriz_distancias, par.secao_a_uuid, inexistente),
    ).toBeUndefined();
  });

  test("[matriz vazia] nenhuma célula habitada", () => {
    const vazia: ParDistancia[] = [];
    expect(celulaDistancia(vazia, "a", "b")).toBeUndefined();
  });
});

describe("formatarKm — formato Spec 04 §9.1 (km, pt-BR, sem R$)", () => {
  test("duas casas com separador decimal pt-BR e sufixo km", () => {
    expect(formatarKm(12.4)).toBe("12,40 km");
    expect(formatarKm(28.1)).toBe("28,10 km");
    expect(formatarKm(8)).toBe("8,00 km");
  });

  test("valor com duas casas preserva os dígitos", () => {
    expect(formatarKm(6.05)).toBe("6,05 km");
  });

  test("[sem R$] a saída nunca contém símbolo monetário (RN-013/076)", () => {
    expect(formatarKm(14)).not.toContain("R$");
  });
});
