// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { EtapaServicos } from "@/formulario/servicos/servicos";
import type { SessaoFormulario } from "@/formulario/sessao";
import { contarServico } from "@/shared/contagens";
import type { Viagem } from "@/shared/contrato";
import { documentoBidirecionalMultiServico } from "../../fixtures";
import { renderizar } from "../shared-ui/_ajuda-render";

// TASK-057 — coluna de contadores de viagens semanais na etapa Serviços
// (Spec 04 §6, último marcador; DEC-051). A contagem NUNCA é recalculada
// aqui: o oráculo de cada caso é o próprio `contarServico()` de
// `shared/contagens` (RN-072), chamado no teste, nunca um número
// hard-coded — prova de que a etapa só lê o módulo puro, não reimplementa
// RN-069.

function viagemFeriado(base: Viagem): Viagem {
  return { ...base, uuid: `${base.uuid}-feriado`, viagem_feriado: true };
}

describe("EtapaServicos — coluna de viagens semanais (Spec 04 §6)", () => {
  it("cada linha de Serviço completo exibe Ida/Volta/Total idênticos a contarServico()", () => {
    const documento = documentoBidirecionalMultiServico();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <EtapaServicos sessao={sessao} aoAtualizarSessao={() => {}} />,
    );

    for (const servico of documento.autos.servicos) {
      const esperado = contarServico(servico);
      const linha = container.querySelector(
        `[data-testid="servico-item"][data-uuid="${servico.uuid}"]`,
      )!;
      const texto = linha.querySelector(
        '[data-testid="servico-viagens-semana"]',
      )!.textContent;
      expect(texto).toBe(
        `Ida ${esperado.ida.viagensSemana} · Volta ${esperado.volta.viagensSemana} · Total ${esperado.totalViagensSemana}`,
      );
    }

    desmontar();
  });

  it("RN-069 — dois documentos que só diferem na grade de feriados exibem contagens idênticas", () => {
    const semFeriado = documentoBidirecionalMultiServico();
    const comFeriado = documentoBidirecionalMultiServico();
    const [servicoAlvo] = comFeriado.autos.servicos;
    const itinerarioIda = servicoAlvo.itinerarios.find((i) => i.sentido === "ida")!;
    itinerarioIda.viagens = [
      ...itinerarioIda.viagens,
      viagemFeriado(itinerarioIda.viagens[0]),
    ];

    const sessaoSemFeriado: SessaoFormulario = {
      modo: "carregado",
      documento: semFeriado,
      alertasImportacao: [],
    };
    const sessaoComFeriado: SessaoFormulario = {
      modo: "carregado",
      documento: comFeriado,
      alertasImportacao: [],
    };

    const a = renderizar(
      <EtapaServicos sessao={sessaoSemFeriado} aoAtualizarSessao={() => {}} />,
    );
    const textoSemFeriado = a.container.querySelector(
      `[data-testid="servico-item"][data-uuid="${servicoAlvo.uuid}"] [data-testid="servico-viagens-semana"]`,
    )!.textContent;
    a.desmontar();

    const b = renderizar(
      <EtapaServicos sessao={sessaoComFeriado} aoAtualizarSessao={() => {}} />,
    );
    const textoComFeriado = b.container.querySelector(
      `[data-testid="servico-item"][data-uuid="${servicoAlvo.uuid}"] [data-testid="servico-viagens-semana"]`,
    )!.textContent;
    b.desmontar();

    expect(textoComFeriado).toBe(textoSemFeriado);
  });

  it("Serviço em construção (DEC-035, sem itinerários) exibe 0 — sem NaN/undefined/crash", () => {
    const sessao: SessaoFormulario = {
      modo: "novo",
      identidade: {
        codigo: "1",
        empresa: "Empresa Teste",
        tipo: "Rodoviário",
        status: "proposta",
      },
      servicosEmConstrucao: [
        {
          uuid: "cccccccc-0000-4000-8000-cccccccccccc",
          numero_n: "1-1CR",
          caracteristica_veiculo: "CR",
          carater: "principal",
          direcionalidade: "ambos",
        },
      ],
    };
    const { container, desmontar } = renderizar(
      <EtapaServicos sessao={sessao} aoAtualizarSessao={() => {}} />,
    );

    const texto = container.querySelector(
      '[data-testid="servico-viagens-semana"]',
    )!.textContent;
    expect(texto).toBe("Ida 0 · Volta 0 · Total 0");

    desmontar();
  });

  it("rótulo 'semana padrão (sem feriados)' aparece no cabeçalho da coluna nova", () => {
    const documento = documentoBidirecionalMultiServico();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <EtapaServicos sessao={sessao} aoAtualizarSessao={() => {}} />,
    );

    const rotulo = container.querySelector(
      '[data-testid="rotulo-semana-padrao"]',
    );
    expect(rotulo?.textContent).toBe("semana padrão (sem feriados)");

    const cabecalho = container.querySelector(
      'thead th[scope="col"]:has([data-testid="rotulo-semana-padrao"])',
    );
    expect(cabecalho).not.toBeNull();

    desmontar();
  });
});
