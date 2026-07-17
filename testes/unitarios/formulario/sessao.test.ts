import { describe, expect, test } from "vitest";
import { comServicosDaSessao, servicosDaSessao } from "@/formulario/sessao";
import type { SessaoFormulario } from "@/formulario/sessao";
import type { Servico } from "@/shared/contrato";
import { documentoExemploMinimo, documentoUnidirecional } from "../../fixtures";

// TASK-061 (DEC-053) — caminho ÚNICO de leitura/escrita de Serviços completos
// da sessão, qualquer que seja o modo: `documento.autos.servicos` no
// carregado, `sessao.servicos` (promovidos, TASK-061) no novo. É exatamente o
// que `EtapaViagens`/`EtapaMatrizes`/`itinerariosAoVivoDaSessao`/
// `coletarPendencias` chamam para deixar de receber `[]` no modo "novo" após
// a promoção (critério de aceite da TASK-061).

describe("servicosDaSessao", () => {
  test("modo carregado: retorna documento.autos.servicos", () => {
    const documento = documentoExemploMinimo();
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    expect(servicosDaSessao(sessao)).toBe(documento.autos.servicos);
  });

  test("modo novo sem servicos promovidos: lista vazia (não trava mais em [] documentado como bug)", () => {
    const sessao: SessaoFormulario = { modo: "novo" };
    expect(servicosDaSessao(sessao)).toEqual([]);
  });

  test("modo novo com Serviço promovido: retorna a lista (Viagens/Matrizes deixam de ver [])", () => {
    const servico = documentoUnidirecional().autos.servicos[0];
    const sessao: SessaoFormulario = { modo: "novo", servicos: [servico] };

    expect(servicosDaSessao(sessao)).toEqual([servico]);
  });
});

describe("comServicosDaSessao", () => {
  test("modo carregado: grava em documento.autos.servicos, resto do documento intacto", () => {
    const documento = documentoExemploMinimo();
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };
    const novosServicos: Servico[] = [];

    const proxima = comServicosDaSessao(sessao, novosServicos);

    expect(proxima.modo).toBe("carregado");
    if (proxima.modo !== "carregado") throw new Error("esperava carregado");
    expect(proxima.documento.autos.servicos).toBe(novosServicos);
    expect(proxima.documento.autos.codigo).toBe(documento.autos.codigo);
    expect(proxima.documento.autos.secoes).toBe(documento.autos.secoes);
  });

  test("modo novo: grava em sessao.servicos, demais campos preservados", () => {
    const sessao: SessaoFormulario = {
      modo: "novo",
      identidade: { codigo: "1000", empresa: "Viação X", tipo: "Rodoviário", status: "proposta" },
      servicosEmConstrucao: [],
    };
    const servico = documentoUnidirecional().autos.servicos[0];

    const proxima = comServicosDaSessao(sessao, [servico]);

    expect(proxima.modo).toBe("novo");
    if (proxima.modo !== "novo") throw new Error("esperava novo");
    expect(proxima.servicos).toEqual([servico]);
    expect(proxima.identidade).toEqual(sessao.identidade);
    expect(proxima.servicosEmConstrucao).toEqual([]);
  });

  test("round-trip: servicosDaSessao(comServicosDaSessao(sessao, x)) === x nos dois modos", () => {
    const servico = documentoUnidirecional().autos.servicos[0];
    const carregado: SessaoFormulario = {
      modo: "carregado",
      documento: documentoExemploMinimo(),
      alertasImportacao: [],
    };
    const novo: SessaoFormulario = { modo: "novo" };

    expect(servicosDaSessao(comServicosDaSessao(carregado, [servico]))).toEqual([servico]);
    expect(servicosDaSessao(comServicosDaSessao(novo, [servico]))).toEqual([servico]);
  });
});
