import { describe, expect, test } from "vitest";
import type { DocumentoOperacao } from "@/shared/contrato";
import { aplicarTrocaDeTipoNoDocumento } from "@/formulario/identificacao";
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
// resto da estrutura (schema-válido). `numero_n` é reescrito só para deixar o
// aviso legível nos cenários.
function comCaracteristicas(
  base: DocumentoOperacao,
  caracteristicas: DocumentoOperacao["autos"]["servicos"][number]["caracteristica_veiculo"][],
): DocumentoOperacao {
  const servicos = base.autos.servicos.map((servico, indice) => ({
    ...servico,
    caracteristica_veiculo: caracteristicas[indice],
    numero_n: `N0${indice + 1}`,
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
    // Aviso só do Serviço que mudou, por `numero_n` (RN-006).
    expect(alteracoes).toEqual([{ numero_n: "N02", de: "ME", para: "CL" }]);
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
      { numero_n: "N01", de: "CR", para: "SU" },
      { numero_n: "N02", de: "ME", para: "SU" },
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
