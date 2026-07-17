// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { EtapaServicos } from "@/formulario/servicos/servicos";
import type { SessaoFormulario } from "@/formulario/sessao";
import { documentoExemploMinimo } from "../../fixtures";
import { renderizar, act } from "../shared-ui/_ajuda-render";

// TASK-072 — CRUD unificado da etapa Serviços no modo "novo": o Serviço
// PROMOVIDO (DEC-053/TASK-061, `sessao.servicos`) deixa de sumir da lista e
// passa a ser editável/duplicável/removível, com numeração de `numero_n`
// contínua sobre as duas listas (Spec 03 §10.3 regra 5) e selo de estado
// explícito (em construção × completo — DEC-050). Nenhum toque em rede/OSRM.

const UUID_PROMOVIDO = "b3f1c2a0-1e2d-4a3b-9c4d-5e6f7a8b9c0d";
const SECAO_SANTOS = "4da15f36-5bbe-4f4e-90e3-68029097c1b9";

function sessaoNovoComPromovido(): SessaoFormulario {
  const doc = documentoExemploMinimo();
  return {
    modo: "novo",
    identidade: {
      codigo: doc.autos.codigo,
      empresa: doc.autos.empresa,
      tipo: doc.autos.tipo,
      status: doc.autos.status,
    },
    servicos: doc.autos.servicos,
    secoesEmConstrucao: doc.autos.secoes,
  };
}

describe("EtapaServicos — modo novo, Serviço promovido (DEC-053/TASK-072)", () => {
  it("lista o promovido com o selo 'completo', preservando o testid de em-construção para os demais", () => {
    const sessao = sessaoNovoComPromovido();
    const { container, desmontar } = renderizar(
      <EtapaServicos sessao={sessao} aoAtualizarSessao={() => {}} />,
    );

    const linha = container.querySelector(
      `[data-testid="servico-item"][data-uuid="${UUID_PROMOVIDO}"]`,
    )!;
    expect(linha).not.toBeNull();
    expect(
      linha.querySelector('[data-testid="servico-completo"]')?.textContent,
    ).toBe("completo");
    expect(
      linha.querySelector('[data-testid="servico-em-construcao"]'),
    ).toBeNull();

    desmontar();
  });

  it("numeração sugerida é contínua sobre promovidos + em construção (Spec 03 §10.3 regra 5)", () => {
    const sessao = sessaoNovoComPromovido();
    const { container, desmontar } = renderizar(
      <EtapaServicos sessao={sessao} aoAtualizarSessao={() => {}} />,
    );

    act(() => {
      (
        container.querySelector(
          '[data-testid="servico-criar"]',
        ) as HTMLButtonElement
      ).click();
    });

    const input = container.querySelector(
      '[data-testid="form-numero-n"]',
    ) as HTMLInputElement;
    // Promovido é "0000-1CR" → o próximo sugerido é "0000-2<característica padrão>".
    expect(input.value).toMatch(/^0000-2/);

    desmontar();
  });

  it("editar um promovido preserva a uuid e grava em sessao.servicos (RN-001/002)", () => {
    let sessaoAtual = sessaoNovoComPromovido();
    const { container, rerenderizar, desmontar } = renderizar(
      <EtapaServicos
        sessao={sessaoAtual}
        aoAtualizarSessao={(nova) => {
          sessaoAtual = nova;
          rerenderizar(
            <EtapaServicos
              sessao={sessaoAtual}
              aoAtualizarSessao={(n) => {
                sessaoAtual = n;
              }}
            />,
          );
        }}
      />,
    );

    act(() => {
      (
        container.querySelector(
          '[data-testid="servico-editar"]',
        ) as HTMLButtonElement
      ).click();
    });

    const input = container.querySelector(
      '[data-testid="form-numero-n"]',
    ) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    act(() => {
      setter.call(input, "0000-1ME");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    act(() => {
      (
        container.querySelector(
          '[data-testid="form-salvar"]',
        ) as HTMLButtonElement
      ).click();
    });

    expect(sessaoAtual.modo).toBe("novo");
    const servicos =
      sessaoAtual.modo === "novo" ? (sessaoAtual.servicos ?? []) : [];
    expect(servicos).toHaveLength(1);
    expect(servicos[0].uuid).toBe(UUID_PROMOVIDO);
    expect(servicos[0].numero_n).toBe("0000-1ME");

    desmontar();
  });

  it("duplicar um promovido gera UUID nova preservando secao_uuid (RN-007)", () => {
    let sessaoAtual = sessaoNovoComPromovido();
    const { container, rerenderizar, desmontar } = renderizar(
      <EtapaServicos
        sessao={sessaoAtual}
        aoAtualizarSessao={(nova) => {
          sessaoAtual = nova;
          rerenderizar(
            <EtapaServicos
              sessao={sessaoAtual}
              aoAtualizarSessao={(n) => {
                sessaoAtual = n;
              }}
            />,
          );
        }}
      />,
    );

    act(() => {
      (
        container.querySelector(
          '[data-testid="servico-duplicar"]',
        ) as HTMLButtonElement
      ).click();
    });

    expect(sessaoAtual.modo).toBe("novo");
    const servicos =
      sessaoAtual.modo === "novo" ? (sessaoAtual.servicos ?? []) : [];
    expect(servicos).toHaveLength(2);
    const copia = servicos.find((s) => s.uuid !== UUID_PROMOVIDO)!;
    expect(copia).toBeDefined();
    expect(copia.numero_n).toBe("0000-2CR");
    // secao_uuid da(s) parada(s) mantidas — Seção compartilhada (RN-007).
    const secoesOriginais = servicos[0].itinerarios
      .flatMap((i) => i.paradas)
      .map((p) => p.secao_uuid)
      .filter((v): v is string => v !== undefined);
    const secoesCopia = copia.itinerarios
      .flatMap((i) => i.paradas)
      .map((p) => p.secao_uuid)
      .filter((v): v is string => v !== undefined);
    expect(secoesCopia).toEqual(secoesOriginais);

    desmontar();
  });

  it("remover o único promovido: sai de sessao.servicos e cascateia Seção órfã, sem trava de mínimo 1", () => {
    let sessaoAtual = sessaoNovoComPromovido();
    const { container, rerenderizar, desmontar } = renderizar(
      <EtapaServicos
        sessao={sessaoAtual}
        aoAtualizarSessao={(nova) => {
          sessaoAtual = nova;
          rerenderizar(
            <EtapaServicos
              sessao={sessaoAtual}
              aoAtualizarSessao={(n) => {
                sessaoAtual = n;
              }}
            />,
          );
        }}
      />,
    );

    // Nenhuma trava de mínimo 1 no modo novo (RN-018 é gate de exportação):
    // o botão de remover não está desabilitado, mesmo sendo o único Serviço.
    const botaoRemover = container.querySelector(
      '[data-testid="servico-remover"]',
    ) as HTMLButtonElement;
    expect(botaoRemover.disabled).toBe(false);

    act(() => {
      botaoRemover.click();
    });
    act(() => {
      (
        container.querySelector(
          '[data-testid="servico-remover-confirmar"]',
        ) as HTMLButtonElement
      ).click();
    });

    expect(sessaoAtual.modo).toBe("novo");
    const servicos =
      sessaoAtual.modo === "novo" ? (sessaoAtual.servicos ?? []) : [];
    expect(servicos).toHaveLength(0);
    const secoes =
      sessaoAtual.modo === "novo"
        ? (sessaoAtual.secoesEmConstrucao ?? [])
        : [];
    // A Seção só usada pelo promovido removido não sobrevive (cascata — RN-018).
    expect(secoes.some((s) => s.uuid === SECAO_SANTOS)).toBe(false);

    desmontar();
  });

  it("modo carregado não regride: trava de mínimo 1 Serviço continua ativa (RN-018)", () => {
    const doc = documentoExemploMinimo();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento: doc,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <EtapaServicos sessao={sessao} aoAtualizarSessao={() => {}} />,
    );

    const botaoRemover = container.querySelector(
      '[data-testid="servico-remover"]',
    ) as HTMLButtonElement;
    // Único Serviço do documento carregado — remover continua bloqueado.
    expect(botaoRemover.disabled).toBe(true);

    desmontar();
  });
});
