import { describe, expect, test } from "vitest";
import type { DocumentoOperacao } from "@/shared/contrato";
import {
  aplicarTrocaDeTipoEmConstrucao,
  aplicarTrocaDeTipoNoDocumento,
} from "@/formulario/identificacao";
import type { ServicoEmConstrucao } from "@/formulario/sessao";
import {
  documentoBidirecionalMultiServico,
  documentoUnidirecional,
} from "../../fixtures";

// TASK-015 — reconversão de Serviços na troca do `tipo` do Autos (RN-023;
// DEC-034; Spec 03 §10.4; Spec 04 §5). Categoria 2/10 (validação de domínio /
// regressão). O núcleo puro (quais códigos mudam) é da TASK-008
// (`shared/tipificacao`); aqui se prova a APLICAÇÃO sobre o `DocumentoOperacao`:
// reescrita seletiva, PRESERVAÇÃO DE UUID (RN-003), aviso por `numero_n` e
// não-mutação da entrada. Nenhum teste toca rede/OSRM.

// Ajusta as características dos Serviços de um documento base preservando o
// resto da estrutura (schema-válido). `numero_n` segue a convenção real
// `"<codigo>-<seq><caracteristica>"` (Spec 02 §6) para exercitar a regeneração
// de sufixo (DEC-037) — não mais um rótulo simplificado que a mascarava.
function comCaracteristicas(
  base: DocumentoOperacao,
  caracteristicas: DocumentoOperacao["autos"]["servicos"][number]["caracteristica_veiculo"][],
): DocumentoOperacao {
  const servicos = base.autos.servicos.map((servico, indice) => ({
    ...servico,
    caracteristica_veiculo: caracteristicas[indice],
    numero_n: `${base.autos.codigo}-${indice + 1}${caracteristicas[indice]}`,
  }));
  return { ...base, autos: { ...base.autos, servicos } };
}

describe("aplicarTrocaDeTipoNoDocumento — reconversão ao padrão (RN-023)", () => {
  test("Rodoviário → Rodoviário Litorâneo: incompatíveis viram CL, neutro (EX) preservado", () => {
    // EX é neutro à litoralidade (válido nos dois tipos); ME só existe no
    // Rodoviário (componente convencional CR) e deve virar o padrão CL.
    const doc = comCaracteristicas(documentoBidirecionalMultiServico(), [
      "EX",
      "ME",
    ]);

    const { documento, alteracoes } = aplicarTrocaDeTipoNoDocumento(
      doc,
      "Rodoviário Litorâneo",
    );

    expect(documento.autos.tipo).toBe("Rodoviário Litorâneo");
    expect(
      documento.autos.servicos.map((s) => s.caracteristica_veiculo),
    ).toEqual(["EX", "CL"]);
    // Aviso só do Serviço que mudou, pelo `numero_n` anterior (RN-006).
    expect(alteracoes).toEqual([
      { numero_n: "1000-2ME", de: "ME", para: "CL" },
    ]);
    // DEC-037: o sufixo do `numero_n` acompanha a nova característica; o neutro
    // (EX, não reconvertido) mantém o rótulo.
    expect(documento.autos.servicos.map((s) => s.numero_n)).toEqual([
      "1000-1EX",
      "1000-2CL",
    ]);
  });

  test("Semiurbano → Rodoviário: SU (inválido no rodoviário) vira CR", () => {
    const doc = documentoUnidirecional(); // Semiurbano, um Serviço SU
    const { documento, alteracoes } = aplicarTrocaDeTipoNoDocumento(
      doc,
      "Rodoviário",
    );

    expect(documento.autos.tipo).toBe("Rodoviário");
    expect(documento.autos.servicos[0].caracteristica_veiculo).toBe("CR");
    expect(alteracoes).toEqual([
      { numero_n: doc.autos.servicos[0].numero_n, de: "SU", para: "CR" },
    ]);
    // DEC-037: "2000-1SU" → "2000-1CR".
    expect(documento.autos.servicos[0].numero_n).toBe("2000-1CR");
  });

  test("Rodoviário → Semiurbano: todos os Serviços viram SU", () => {
    const doc = comCaracteristicas(documentoBidirecionalMultiServico(), [
      "CR",
      "ME",
    ]);
    const { documento, alteracoes } = aplicarTrocaDeTipoNoDocumento(
      doc,
      "Semiurbano",
    );

    expect(
      documento.autos.servicos.map((s) => s.caracteristica_veiculo),
    ).toEqual(["SU", "SU"]);
    expect(alteracoes).toEqual([
      { numero_n: "1000-1CR", de: "CR", para: "SU" },
      { numero_n: "1000-2ME", de: "ME", para: "SU" },
    ]);
    // DEC-037: ambos os sufixos viram SU.
    expect(documento.autos.servicos.map((s) => s.numero_n)).toEqual([
      "1000-1SU",
      "1000-2SU",
    ]);
  });

  test("troca para tipo já compatível (todos neutros): nenhuma alteração", () => {
    const doc = comCaracteristicas(documentoBidirecionalMultiServico(), [
      "EX",
      "LE",
    ]);
    const { documento, alteracoes } = aplicarTrocaDeTipoNoDocumento(
      doc,
      "Rodoviário Litorâneo",
    );

    expect(alteracoes).toEqual([]);
    expect(
      documento.autos.servicos.map((s) => s.caracteristica_veiculo),
    ).toEqual(["EX", "LE"]);
    // Serviços compatíveis mantêm a MESMA referência (edição só onde muda).
    expect(documento.autos.servicos[0]).toBe(doc.autos.servicos[0]);
    expect(documento.autos.servicos[1]).toBe(doc.autos.servicos[1]);
  });

  test("preserva a UUID de cada Serviço reconvertido (RN-003) e não muta a entrada", () => {
    const doc = comCaracteristicas(documentoBidirecionalMultiServico(), [
      "EX",
      "ME",
    ]);
    const uuidsOriginais = doc.autos.servicos.map((s) => s.uuid);
    const caracteristicasOriginais = doc.autos.servicos.map(
      (s) => s.caracteristica_veiculo,
    );

    const { documento } = aplicarTrocaDeTipoNoDocumento(
      doc,
      "Rodoviário Litorâneo",
    );

    // UUIDs intactas — reconversão é edição, nunca nascimento.
    expect(documento.autos.servicos.map((s) => s.uuid)).toEqual(uuidsOriginais);
    // O Serviço alterado é um objeto novo (imutável) mas com a MESMA uuid…
    expect(documento.autos.servicos[1]).not.toBe(doc.autos.servicos[1]);
    expect(documento.autos.servicos[1].uuid).toBe(doc.autos.servicos[1].uuid);
    // …e o não alterado é a mesma referência.
    expect(documento.autos.servicos[0]).toBe(doc.autos.servicos[0]);
    // Entrada não mutada.
    expect(doc.autos.tipo).toBe("Rodoviário");
    expect(doc.autos.servicos.map((s) => s.caracteristica_veiculo)).toEqual(
      caracteristicasOriginais,
    );
  });
});

describe("aplicarTrocaDeTipoEmConstrucao — reconversão no modo novo (RN-023; DEC-035/037)", () => {
  function servico(
    uuid: string,
    numero_n: string,
    caracteristica: ServicoEmConstrucao["caracteristica_veiculo"],
  ): ServicoEmConstrucao {
    return {
      uuid,
      numero_n,
      caracteristica_veiculo: caracteristica,
      carater: "principal",
      direcionalidade: "ambos",
    };
  }

  test("incompatível vira o padrão do tipo e regenera o sufixo; compatível intacto", () => {
    const entrada = [
      servico("11111111-1111-4111-8111-111111111111", "1000-1EX", "EX"),
      servico("22222222-2222-4222-8222-222222222222", "1000-2ME", "ME"),
    ];
    const { servicos, alteracoes } = aplicarTrocaDeTipoEmConstrucao(
      entrada,
      "Rodoviário Litorâneo",
    );

    expect(servicos.map((s) => s.caracteristica_veiculo)).toEqual(["EX", "CL"]);
    expect(servicos.map((s) => s.numero_n)).toEqual(["1000-1EX", "1000-2CL"]);
    expect(alteracoes).toEqual([
      { numero_n: "1000-2ME", de: "ME", para: "CL" },
    ]);
    // Preserva a uuid (identidade do futuro Serviço) e não muta a entrada.
    expect(servicos.map((s) => s.uuid)).toEqual(entrada.map((s) => s.uuid));
    expect(entrada[1].caracteristica_veiculo).toBe("ME");
    // Serviço compatível mantém a MESMA referência.
    expect(servicos[0]).toBe(entrada[0]);
  });

  test("lista vazia: nenhuma alteração", () => {
    const { servicos, alteracoes } = aplicarTrocaDeTipoEmConstrucao(
      [],
      "Semiurbano",
    );
    expect(servicos).toEqual([]);
    expect(alteracoes).toEqual([]);
  });
});
