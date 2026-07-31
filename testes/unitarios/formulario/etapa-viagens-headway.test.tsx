// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { EtapaViagens } from "@/formulario/viagens";
import type { SessaoFormulario } from "@/formulario/sessao";
import type { DocumentoOperacao } from "@/shared/contrato";
import multiServico from "../../fixtures/carregar-multi-servico.json";
import { act, renderizar } from "../shared-ui/_ajuda-render";

// TASK-121/DEC-100: o formulário de headway vive na superfície flutuante da
// Viagem, substituindo o controle de criar outra Viagem "X tempo depois".
// Nenhuma linha auxiliar entra no corpo da tabela e nenhum rascunho se perde
// ao mover ponteiro/foco para a superfície. Cálculo, máscara, limite inclusivo
// e guarda de duplicidade (DEC-083/DEC-093/DEC-094) permanecem inalterados.

function selecionar(select: HTMLSelectElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(select, valor);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function preencher(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(input, valor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** React sintetiza `onMouseEnter` a partir do `mouseover` delegado na raiz. */
function entrarComPonteiro(elemento: Element) {
  act(() => {
    elemento.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
}

function sairComPonteiro(elemento: Element) {
  act(() => {
    elemento.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
  });
}

function montarEtapa(documento?: DocumentoOperacao) {
  const sessaoInicial: SessaoFormulario = {
    modo: "carregado",
    documento:
      documento ??
      (structuredClone(multiServico) as unknown as DocumentoOperacao),
    alertasImportacao: [],
  };
  const espiaoAtualizacao = vi.fn();

  function Cenario() {
    const [sessao, definirSessao] = useState(sessaoInicial);
    return (
      <EtapaViagens
        sessao={sessao}
        aoAtualizarSessao={(proxima) => {
          espiaoAtualizacao(proxima);
          definirSessao(proxima);
        }}
      />
    );
  }

  const resultado = renderizar(<Cenario />);
  const seletorServico = resultado.container.querySelector(
    '[data-testid="select-servico-viagens"]',
  ) as HTMLSelectElement;
  const opcaoServico = [...seletorServico.options].find(
    (opcao) => opcao.textContent === "0001-1SU",
  )!;
  selecionar(seletorServico, opcaoServico.value);
  const seletorSentido = resultado.container.querySelector(
    '[data-testid="select-sentido-viagens"]',
  ) as HTMLSelectElement;
  selecionar(seletorSentido, "ida");

  return { ...resultado, espiaoAtualizacao };
}

function gradeComum(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-testid="grade-dias-comuns"]')!;
}

function celulaPartida(container: HTMLElement): HTMLElement {
  return gradeComum(container).querySelector(
    '[data-testid="celula-partida"]',
  ) as HTMLElement;
}

function ativarHeadway(container: HTMLElement) {
  const celula = celulaPartida(container);
  entrarComPonteiro(celula);
  const alternador = celula.querySelector(
    '[data-testid="alternar-modo-headway"]',
  ) as HTMLButtonElement;
  act(() => alternador.click());
}

function superficieHeadway(container: HTMLElement): HTMLElement | null {
  return gradeComum(container).querySelector('[data-testid="superficie-headway"]');
}

/** Fechada, a superfície continua montada e inerte (sem recriar estado). */
function estaAberta(superficie: Element | null): boolean {
  return superficie !== null && superficie.className.includes("opacity-100");
}

describe("EtapaViagens — formulário de headway na superfície flutuante (TASK-121/DEC-100)", () => {
  it("ativar headway substitui a inserção posterior pelo formulário na superfície", () => {
    const { container, desmontar } = montarEtapa();
    const grade = gradeComum(container);

    entrarComPonteiro(celulaPartida(container));
    expect(grade.querySelector('[data-testid="acao-inserir-posterior"]')).not.toBeNull();
    expect(superficieHeadway(container)).toBeNull();

    ativarHeadway(container);

    const superficie = superficieHeadway(container);
    expect(superficie).not.toBeNull();
    expect(grade.querySelector('[data-testid="acao-inserir-posterior"]')).toBeNull();
    // A inserção anterior e as demais ações da Viagem continuam disponíveis.
    expect(grade.querySelector('[data-testid="acao-inserir-anterior"]')).not.toBeNull();
    expect(grade.querySelector('[data-testid="apagar-viagem"]')).not.toBeNull();
    expect(grade.querySelector('[data-testid="restaurar-viagem"]')).not.toBeNull();

    // Composição da DEC-093/DEC-100: duas linhas e um botão único à direita.
    expect(
      superficie!.querySelector('[aria-label="Headway — segunda, viagem 1"]'),
    ).not.toBeNull();
    expect(
      superficie!.querySelector('[aria-label="Horário-limite — segunda, viagem 1"]'),
    ).not.toBeNull();
    expect(
      superficie!.querySelectorAll('[data-testid="gerar-viagens-headway"]'),
    ).toHaveLength(1);
    // Superfície flutuante, fora do fluxo da tabela.
    expect(superficie!.className).toContain("fixed");
    desmontar();
  });

  it("[inválido] nenhuma linha ou célula de headway entra no corpo da tabela", () => {
    const { container, desmontar } = montarEtapa();
    const grade = gradeComum(container);
    const linhasAntes = grade.querySelectorAll('[data-testid="linha-grade"]').length;

    ativarHeadway(container);

    expect(container.querySelectorAll('[data-testid="linha-headway"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="celula-headway"]')).toHaveLength(0);
    expect(grade.querySelectorAll('[data-testid="linha-grade"]')).toHaveLength(
      linhasAntes,
    );
    // O formulário é descendente de uma célula da grade, nunca de uma linha nova.
    expect(superficieHeadway(container)!.closest("tr")).toBe(
      grade.querySelectorAll('[data-testid="linha-grade"]')[2],
    );
    desmontar();
  });

  it("preserva os rascunhos ao mover o ponteiro para a superfície e ao reabrir", () => {
    const { container, desmontar } = montarEtapa();
    ativarHeadway(container);
    const superficie = superficieHeadway(container)!;
    const campoHeadway = superficie.querySelector(
      '[aria-label="Headway — segunda, viagem 1"]',
    ) as HTMLInputElement;
    const campoLimite = superficie.querySelector(
      '[aria-label="Horário-limite — segunda, viagem 1"]',
    ) as HTMLInputElement;

    // Máscara de quatro algarismos da DEC-093 — só apresentação.
    preencher(campoHeadway, "1");
    expect(campoHeadway.value).toBe("00:01");
    preencher(campoHeadway, "123");
    expect(campoHeadway.value).toBe("01:23");

    // Sair da célula em direção ao próprio flutuante não fecha nem limpa.
    sairComPonteiro(celulaPartida(container));
    entrarComPonteiro(superficie);
    preencher(campoLimite, "1000");

    expect(estaAberta(superficieHeadway(container))).toBe(true);
    expect(
      (
        superficieHeadway(container)!.querySelector(
          '[aria-label="Headway — segunda, viagem 1"]',
        ) as HTMLInputElement
      ).value,
    ).toBe("01:23");
    expect(
      (
        superficieHeadway(container)!.querySelector(
          '[aria-label="Horário-limite — segunda, viagem 1"]',
        ) as HTMLInputElement
      ).value,
    ).toBe("10:00");
    desmontar();
  });

  it("[inválido] entrada impossível mantém o botão de geração desabilitado", () => {
    const { container, espiaoAtualizacao, desmontar } = montarEtapa();
    ativarHeadway(container);
    const superficie = superficieHeadway(container)!;
    const campoHeadway = superficie.querySelector(
      '[aria-label="Headway — segunda, viagem 1"]',
    ) as HTMLInputElement;
    const campoLimite = superficie.querySelector(
      '[aria-label="Horário-limite — segunda, viagem 1"]',
    ) as HTMLInputElement;
    const botao = () =>
      superficieHeadway(container)!.querySelector(
        '[data-testid="gerar-viagens-headway"]',
      ) as HTMLButtonElement;

    expect(botao().disabled).toBe(true);

    // 98:75 permanece exibido e inválido (DEC-093) — nada é normalizado.
    preencher(campoHeadway, "9875");
    preencher(campoLimite, "1000");
    expect(campoHeadway.value).toBe("98:75");
    expect(botao().disabled).toBe(true);

    // Limite anterior à partida (08:00) também recusa (DEC-083).
    preencher(campoHeadway, "0100");
    preencher(campoLimite, "0700");
    expect(botao().disabled).toBe(true);

    act(() => botao().click());
    expect(espiaoAtualizacao).not.toHaveBeenCalled();

    // Entradas válidas habilitam e geram o lote inclusivo.
    preencher(campoLimite, "1000");
    expect(botao().disabled).toBe(false);
    act(() => botao().click());
    expect(espiaoAtualizacao).toHaveBeenCalledTimes(1);
    expect(
      gradeComum(container).querySelectorAll(
        'input[data-dia="segunda"][data-secao-index="0"][data-viagem-uuid]',
      ).length,
    ).toBe(3);
    desmontar();
  });

  it("no modo compacto o formulário ancora na partida, sem linha auxiliar (DEC-086/DEC-100)", () => {
    const { container, desmontar } = montarEtapa();
    const alternadorCompacto = container.querySelector(
      '[data-testid="alternar-modo-compacto"]',
    ) as HTMLButtonElement;
    act(() => alternadorCompacto.click());
    expect(
      gradeComum(container).querySelectorAll('[data-testid="celula-passante"]'),
    ).toHaveLength(0);

    ativarHeadway(container);

    const superficie = superficieHeadway(container);
    expect(estaAberta(superficie)).toBe(true);
    expect(superficie!.closest("td")).toBe(celulaPartida(container));
    expect(container.querySelectorAll('[data-testid="linha-headway"]')).toHaveLength(0);
    expect(
      superficie!.querySelector('[data-testid="gerar-viagens-headway"]'),
    ).not.toBeNull();
    desmontar();
  });

  it("no modo compacto, ligar headway mantém X e alternador visíveis e clicáveis (DEC-101)", () => {
    const { container, desmontar } = montarEtapa();
    const alternadorCompacto = container.querySelector(
      '[data-testid="alternar-modo-compacto"]',
    ) as HTMLButtonElement;
    act(() => alternadorCompacto.click());

    ativarHeadway(container);

    const celula = celulaPartida(container);
    const acoes = celula.querySelector('[data-testid="acoes-viagem"]') as HTMLElement;
    expect(acoes.querySelector('[data-testid="restaurar-viagem"]')).toBeNull();
    const apagar = acoes.querySelector(
      '[data-testid="apagar-viagem"]',
    ) as HTMLButtonElement;
    const alternadorHeadway = acoes.querySelector(
      '[data-testid="alternar-modo-headway"]',
    ) as HTMLButtonElement;
    expect(apagar).not.toBeNull();
    expect(alternadorHeadway.getAttribute("aria-pressed")).toBe("true");
    expect(estaAberta(superficieHeadway(container))).toBe(true);

    // Desligar o alternador desfaz o modo headway e volta à composição de ações.
    act(() => alternadorHeadway.click());
    expect(superficieHeadway(container)).toBeNull();
    expect(
      celula
        .querySelector('[data-testid="acoes-viagem"]')
        ?.querySelector('[data-testid="alternar-modo-headway"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("false");
    desmontar();
  });

  it("Esc fecha a superfície, devolve o foco à célula e não altera o documento", () => {
    const documento = structuredClone(multiServico) as unknown as DocumentoOperacao;
    const antes = structuredClone(documento);
    const { container, espiaoAtualizacao, desmontar } = montarEtapa(documento);
    ativarHeadway(container);
    const superficie = superficieHeadway(container)!;
    const campoHeadway = superficie.querySelector(
      '[aria-label="Headway — segunda, viagem 1"]',
    ) as HTMLInputElement;

    act(() => campoHeadway.focus());
    expect(document.activeElement).toBe(campoHeadway);

    act(() => {
      campoHeadway.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      );
    });

    expect(superficieHeadway(container)).not.toBeNull();
    expect(estaAberta(superficieHeadway(container))).toBe(false);
    expect(document.activeElement).toBe(
      gradeComum(container).querySelector(
        'input[data-dia="segunda"][data-secao-index="0"]',
      ),
    );
    expect(espiaoAtualizacao).not.toHaveBeenCalled();
    expect(documento).toEqual(antes);

    // O modo headway é efêmero por Viagem (RN-096) e sobrevive à reabertura.
    entrarComPonteiro(celulaPartida(container));
    expect(estaAberta(superficieHeadway(container))).toBe(true);
    desmontar();
  });
});
