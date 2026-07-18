import { describe, expect, test } from "vitest";
import { limparSecoesAposEdicaoDeParadas } from "@/formulario/secoes";
import { documentoBidirecionalMultiServico } from "../../fixtures";

// TASK-084 — remoção de parada de Seção limpa `secao.servicos[]` e descarta a
// Seção órfã (RN-018), análogo POR-PARADA da cascata por-Serviço da TASK-016
// (`removerServicoDeLista`). Fixture: `aaaa…` usa as três Seções (11, 22, 33)
// em Ida (11→22→33) e Volta (33→22→11); `bbbb…` usa só 11 e 22. Simula-se a
// edição de paradas construindo o Serviço já com as paradas pós-remoção
// (o que o write-back produz antes de chamar esta função) e passando as
// Seções originais da sessão.

const UUID_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const UUID_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const SECAO_11 = "11111111-1111-4111-8111-111111111111";
const SECAO_22 = "22222222-2222-4222-8222-222222222222";
const SECAO_33 = "33333333-3333-4333-8333-333333333333";

describe("limparSecoesAposEdicaoDeParadas (RN-018/RN-030/RN-004)", () => {
  test("remove a contribuição do Serviço a uma Seção que ele deixou de referenciar em TODOS os itinerários; Seção sem uso é descartada", () => {
    const doc = documentoBidirecionalMultiServico();
    const servicoA = doc.autos.servicos.find((s) => s.uuid === UUID_A)!;

    // Simula remover a parada da Seção 33 (só o Serviço A a usa) nos dois
    // sentidos — Ida vira 11→22, Volta vira 22→11.
    const servicoEditado = {
      ...servicoA,
      itinerarios: servicoA.itinerarios.map((it) => ({
        ...it,
        paradas: it.paradas
          .filter((p) => p.secao_uuid !== SECAO_33)
          .map((p, i) => ({ ...p, ordem: i + 1 })),
      })),
    };

    const resultado = limparSecoesAposEdicaoDeParadas(doc.autos.secoes, servicoEditado);

    const uuids = resultado.map((s) => s.uuid);
    expect(uuids).not.toContain(SECAO_33);
    expect(uuids).toContain(SECAO_11);
    expect(uuids).toContain(SECAO_22);
  });

  test("Seção compartilhada por outro Serviço não é removida, mas perde só a entrada do Serviço editado", () => {
    const doc = documentoBidirecionalMultiServico();
    const servicoA = doc.autos.servicos.find((s) => s.uuid === UUID_A)!;

    // Remove a parada da Seção 11 do Serviço A (bbbb ainda a referencia).
    const servicoEditado = {
      ...servicoA,
      itinerarios: servicoA.itinerarios.map((it) => ({
        ...it,
        paradas: it.paradas
          .filter((p) => p.secao_uuid !== SECAO_11)
          .map((p, i) => ({ ...p, ordem: i + 1 })),
      })),
    };

    const resultado = limparSecoesAposEdicaoDeParadas(doc.autos.secoes, servicoEditado);

    const secao11 = resultado.find((s) => s.uuid === SECAO_11);
    expect(secao11).toBeDefined();
    // UUID preservada (RN-004).
    expect(secao11!.uuid).toBe(SECAO_11);
    expect(secao11!.servicos.some((e) => e.servico_uuid === UUID_A)).toBe(false);
    expect(secao11!.servicos.some((e) => e.servico_uuid === UUID_B)).toBe(true);
  });

  test("Seção ainda referenciada por OUTRO SENTIDO do mesmo Serviço não é removida (RN-030)", () => {
    const doc = documentoBidirecionalMultiServico();
    const servicoA = doc.autos.servicos.find((s) => s.uuid === UUID_A)!;

    // Remove a Seção 33 só do sentido Ida (Volta ainda a referencia) —
    // situação transitória (RN-030 é responsabilidade de outra camada/TASK-077),
    // mas a cascata de órfã não pode descartar uma Seção ainda em uso por
    // QUALQUER itinerário do Serviço.
    const servicoEditado = {
      ...servicoA,
      itinerarios: servicoA.itinerarios.map((it) =>
        it.sentido === "ida"
          ? {
              ...it,
              paradas: it.paradas
                .filter((p) => p.secao_uuid !== SECAO_33)
                .map((p, i) => ({ ...p, ordem: i + 1 })),
            }
          : it,
      ),
    };

    const resultado = limparSecoesAposEdicaoDeParadas(doc.autos.secoes, servicoEditado);

    const secao33 = resultado.find((s) => s.uuid === SECAO_33);
    expect(secao33).toBeDefined();
    expect(secao33!.servicos.some((e) => e.servico_uuid === UUID_A)).toBe(true);
  });

  test("nenhuma mudança de paradas (gesto não-remoção) é no-op — todas as Seções preservadas com as mesmas entradas", () => {
    const doc = documentoBidirecionalMultiServico();
    const servicoA = doc.autos.servicos.find((s) => s.uuid === UUID_A)!;

    const resultado = limparSecoesAposEdicaoDeParadas(doc.autos.secoes, servicoA);

    expect(resultado).toEqual(doc.autos.secoes);
  });

  test("não muta as listas de entrada", () => {
    const doc = documentoBidirecionalMultiServico();
    const servicoA = doc.autos.servicos.find((s) => s.uuid === UUID_A)!;
    const secoesAntes = structuredClone(doc.autos.secoes);

    const servicoEditado = {
      ...servicoA,
      itinerarios: servicoA.itinerarios.map((it) => ({
        ...it,
        paradas: it.paradas.filter((p) => p.secao_uuid !== SECAO_33),
      })),
    };

    limparSecoesAposEdicaoDeParadas(doc.autos.secoes, servicoEditado);

    expect(doc.autos.secoes).toEqual(secoesAntes);
  });
});
