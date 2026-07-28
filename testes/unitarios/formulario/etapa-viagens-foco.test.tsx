// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { EtapaViagens } from "@/formulario/viagens";
import type { SessaoFormulario } from "@/formulario/sessao";
import type { DocumentoOperacao } from "@/shared/contrato";
import multiServico from "../../fixtures/carregar-multi-servico.json";
import { act, renderizar } from "../shared-ui/_ajuda-render";

function preencher(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!;
  act(() => {
    input.focus();
    setter.call(input, valor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

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

function montarEtapa() {
  const sessaoInicial: SessaoFormulario = {
    modo: "carregado",
    documento: structuredClone(multiServico) as unknown as DocumentoOperacao,
    alertasImportacao: [],
  };

  function Cenario() {
    const [sessao, definirSessao] = useState(sessaoInicial);
    return <EtapaViagens sessao={sessao} aoAtualizarSessao={definirSessao} />;
  }

  const resultado = renderizar(<Cenario />);
  const seletorServico = resultado.container.querySelector(
    '[data-testid="select-servico-viagens"]',
  ) as HTMLSelectElement;
  const opcaoServico = [...seletorServico.options].find(
    (opcao) => opcao.textContent === "0001-1SU",
  );
  if (!opcaoServico) throw new Error("Serviço de teste não encontrado");
  selecionar(seletorServico, opcaoServico.value);

  const seletorSentido = resultado.container.querySelector(
    '[data-testid="select-sentido-viagens"]',
  ) as HTMLSelectElement;
  const opcaoIda = [...seletorSentido.options].find((opcao) => opcao.textContent === "Ida");
  if (!opcaoIda) throw new Error("Sentido de teste não encontrado");
  selecionar(seletorSentido, opcaoIda.value);

  return resultado;
}

describe("EtapaViagens — foco lógico da célula (TASK-115)", () => {
  it("cria, reordena e mantém o foco na UUID da nova Viagem; Enter continua na mesma Viagem", () => {
    const { container, desmontar } = montarEtapa();
    const criavel = container.querySelector(
      '[data-testid="grade-dias-comuns"] input[aria-label="Criar viagem — segunda"]',
    ) as HTMLInputElement;

    preencher(criavel, "0700");

    const campoCriado = container.querySelector(
      '[data-testid="grade-dias-comuns"] input[data-dia="segunda"][data-secao-index="0"][value="07:00"]',
    ) as HTMLInputElement;
    expect(campoCriado).not.toBeNull();
    expect(document.activeElement).toBe(campoCriado);
    expect(campoCriado.selectionStart).toBe(5);
    const viagemUuid = campoCriado.dataset.viagemUuid;
    expect(viagemUuid).toBeTruthy();

    act(() => {
      campoCriado.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
      );
    });
    const campoSeguinte = container.querySelector(
      `input[data-grade="comuns"][data-viagem-uuid="${viagemUuid}"]` +
        '[data-secao-index="1"][data-dia="segunda"]',
    );
    expect(document.activeElement).toBe(campoSeguinte);
    desmontar();
  });

  it("redistribui e mantém o mesmo input focado; fora-de-ordem conserva erro e foco", () => {
    const { container, desmontar } = montarEtapa();
    const grade = container.querySelector('[data-testid="grade-dias-comuns"]')!;
    const partida = grade.querySelector(
      'input[data-grade="comuns"][data-dia="segunda"][data-secao-index="0"]',
    ) as HTMLInputElement;
    const viagemUuid = partida.dataset.viagemUuid;
    const intermediaria = grade.querySelector(
      `input[data-viagem-uuid="${viagemUuid}"][data-secao-index="1"]`,
    ) as HTMLInputElement;
    const final = grade.querySelector(
      `input[data-viagem-uuid="${viagemUuid}"][data-secao-index="2"]`,
    ) as HTMLInputElement;

    preencher(final, "0850");
    expect(document.activeElement).toBe(final);
    expect(final.value).toBe("08:50");
    expect(intermediaria.value).toBe("08:30");

    preencher(intermediaria, "0855");
    expect(document.activeElement).toBe(intermediaria);
    expect(intermediaria.value).toBe("08:30");
    expect(
      intermediaria.closest("td")?.querySelector('[data-testid="erro-passante"]'),
    ).not.toBeNull();
    desmontar();
  });

  it("[inválido] horário impossível não cria Viagem e mantém o rascunho em foco", () => {
    const { container, desmontar } = montarEtapa();
    const grade = container.querySelector('[data-testid="grade-dias-comuns"]')!;
    const antes = grade.querySelectorAll('[data-testid="celula-partida"]').length;
    const criavel = grade.querySelector(
      'input[aria-label="Criar viagem — terca"]',
    ) as HTMLInputElement;

    preencher(criavel, "2575");

    expect(document.activeElement).toBe(criavel);
    expect(criavel.value).toBe("2575");
    expect(grade.querySelectorAll('[data-testid="celula-partida"]')).toHaveLength(antes);
    desmontar();
  });

  it("aplica a mesma preservação de foco na grade de feriados (RN-068)", () => {
    const { container, desmontar } = montarEtapa();
    const criavel = container.querySelector(
      '[data-testid="grade-feriados"] input[aria-label="Criar viagem — terca"]',
    ) as HTMLInputElement;

    preencher(criavel, "0900");

    const campoCriado = container.querySelector(
      '[data-testid="grade-feriados"] input[data-grade="feriados"]' +
        '[data-dia="terca"][data-secao-index="0"][value="09:00"]',
    );
    expect(document.activeElement).toBe(campoCriado);
    desmontar();
  });
});
