import { describe, expect, test } from "vitest";
import {
  podeRemoverServico,
  removerServico,
} from "@/formulario/servicos/remover";
import { documentoBidirecionalMultiServico } from "../../fixtures";

// TASK-016 — remoção de Serviço com cascata de Seção órfã (RN-018; Spec 04 §6;
// Spec 02 §14). Categoria 2/10 (validação de domínio). O fixture bidirecional
// tem dois Serviços: `aaaa…` usa as três Seções (11, 22, 33) e `bbbb…` usa só 11
// e 22 — logo remover `aaaa…` deixa a Seção 33 órfã (removida) e mantém 11 e 22
// (ainda usadas por `bbbb…`). Nenhum toque em rede/OSRM.

const UUID_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const UUID_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const SECAO_COMPARTILHADA = "11111111-1111-4111-8111-111111111111";
const SECAO_SO_DE_A = "33333333-3333-4333-8333-333333333333";

describe("removerServico — cascata de Seção órfã (RN-018)", () => {
  test("remove o Serviço de autos.servicos e suas entradas em secao.servicos[]", () => {
    const doc = documentoBidirecionalMultiServico();
    const resultado = removerServico(doc, UUID_A);

    expect(resultado.autos.servicos.map((s) => s.uuid)).toEqual([UUID_B]);
    // Nenhuma Seção remanescente referencia o Serviço removido.
    for (const secao of resultado.autos.secoes) {
      expect(secao.servicos.some((e) => e.servico_uuid === UUID_A)).toBe(false);
    }
  });

  test("Seção usada só pelo Serviço removido é descartada (cascata)", () => {
    const doc = documentoBidirecionalMultiServico();
    const resultado = removerServico(doc, UUID_A);

    const uuids = resultado.autos.secoes.map((s) => s.uuid);
    expect(uuids).not.toContain(SECAO_SO_DE_A);
    // A Seção compartilhada com bbbb… permanece.
    expect(uuids).toContain(SECAO_COMPARTILHADA);
  });

  test("Seção compartilhada é mantida ao remover um dos Serviços", () => {
    const doc = documentoBidirecionalMultiServico();
    const resultado = removerServico(doc, UUID_B);

    // bbbb… só usa 11 e 22; ambas continuam (aaaa… ainda as usa) e nenhuma some.
    expect(resultado.autos.secoes).toHaveLength(3);
    for (const secao of resultado.autos.secoes) {
      expect(secao.servicos.some((e) => e.servico_uuid === UUID_B)).toBe(false);
    }
  });

  test("não muta o documento de origem", () => {
    const doc = documentoBidirecionalMultiServico();
    const antesServicos = doc.autos.servicos.length;
    const antesSecoes = doc.autos.secoes.length;

    removerServico(doc, UUID_A);

    expect(doc.autos.servicos).toHaveLength(antesServicos);
    expect(doc.autos.secoes).toHaveLength(antesSecoes);
  });
});

describe("podeRemoverServico / remover o último — RN-018 (≥ 1 Serviço)", () => {
  test("podeRemoverServico é falso quando há só um Serviço", () => {
    const doc = documentoBidirecionalMultiServico();
    const umServico = removerServico(doc, UUID_A); // sobra só bbbb…
    expect(umServico.autos.servicos).toHaveLength(1);
    expect(podeRemoverServico(umServico)).toBe(false);
    expect(podeRemoverServico(doc)).toBe(true);
  });

  test("remover o último Serviço lança (caso inválido — RN-018)", () => {
    const doc = documentoBidirecionalMultiServico();
    const umServico = removerServico(doc, UUID_A);
    expect(() => removerServico(umServico, UUID_B)).toThrow(/RN-018/);
  });
});
