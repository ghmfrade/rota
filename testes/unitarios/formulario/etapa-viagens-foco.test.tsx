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

function confirmar(input: HTMLInputElement, tecla: "Enter" | "Tab" = "Enter") {
  act(() => {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: tecla, bubbles: true, cancelable: true }),
    );
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

function montarEtapa(
  documento: DocumentoOperacao = structuredClone(
    multiServico,
  ) as unknown as DocumentoOperacao,
) {
  const sessaoInicial: SessaoFormulario = {
    modo: "carregado",
    documento,
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
    expect(container.querySelector('[data-testid="celula-partida"]')).not.toBeNull();
    confirmar(criavel);

    const campoCriado = container.querySelector(
      '[data-testid="grade-dias-comuns"] input[data-dia="segunda"][data-secao-index="0"][value="07:00"]',
    ) as HTMLInputElement;
    expect(campoCriado).not.toBeNull();
    const campoSeguinte = container.querySelector(
      `input[data-grade="comuns"][data-viagem-uuid="${campoCriado.dataset.viagemUuid}"]` +
        '[data-secao-index="1"][data-dia="segunda"]',
    );
    expect(document.activeElement).toBe(campoSeguinte);
    const viagemUuid = campoCriado.dataset.viagemUuid;
    expect(viagemUuid).toBeTruthy();
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
    confirmar(final);
    expect(document.activeElement).toBe(
      grade.querySelector('input[aria-label="Criar viagem — segunda"]'),
    );
    expect(final.value).toBe("08:50");
    expect(intermediaria.value).toBe("08:30");

    preencher(intermediaria, "0855");
    confirmar(intermediaria);
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
    confirmar(criavel);

    expect(document.activeElement).toBe(
      container.querySelector(
        '[data-testid="grade-feriados"] input[data-grade="feriados"][data-secao-index="1"][data-dia="terca"]',
      ),
    );
    desmontar();
  });
});

describe("EtapaViagens — reforço e toggle de seleção (TASK-119; DEC-095/096)", () => {
  it("destaca somente o reforço inteiro e restaura o laranja após o segundo clique", () => {
    const documento = structuredClone(
      multiServico,
    ) as unknown as DocumentoOperacao;
    const servico = documento.autos.servicos.find(
      (item) => item.numero_n === "0001-1SU",
    )!;
    const itinerario = servico.itinerarios.find(
      (item) => item.sentido === "ida",
    )!;
    const primeira = itinerario.viagens[0];
    primeira.uuid = "10000000-0000-4000-8000-000000000001";
    primeira.dia_semana = "segunda";
    primeira.horario_saida = "08:00:00";
    primeira.viagem_feriado = false;
    primeira.tabela_excepcional_uuid = null;
    const reforco = structuredClone(primeira);
    reforco.uuid = "20000000-0000-4000-8000-000000000002";
    itinerario.viagens = [primeira, reforco];
    const { container, desmontar } = montarEtapa(documento);

    const celulasBase = container.querySelectorAll(
      `[data-viagem-uuid="${primeira.uuid}"][data-testid^="celula-"]`,
    );
    const celulasReforco = container.querySelectorAll(
      `[data-viagem-uuid="${reforco.uuid}"][data-testid^="celula-"]`,
    );
    expect(celulasBase.length).toBeGreaterThan(0);
    expect([...celulasBase].every((celula) => !celula.hasAttribute("data-reforco"))).toBe(true);
    expect(celulasReforco.length).toBe(celulasBase.length);
    expect([...celulasReforco].every((celula) => celula.getAttribute("data-reforco") === "true")).toBe(true);

    const partidaReforco = celulasReforco[0] as HTMLTableCellElement;
    act(() => partidaReforco.click());
    expect(partidaReforco.getAttribute("data-selecionada")).toBe("true");
    expect(partidaReforco.className).toContain("bg-azul-100");
    expect(partidaReforco.className).not.toContain("bg-alerta/15");

    act(() => partidaReforco.click());
    expect(partidaReforco.hasAttribute("data-selecionada")).toBe(false);
    expect(partidaReforco.className).toContain("bg-alerta/15");
    desmontar();
  });

  it("segundo clique no campo passante desmarca sem confirmar valor nem perder foco", () => {
    const documento = structuredClone(
      multiServico,
    ) as unknown as DocumentoOperacao;
    const servico = documento.autos.servicos.find(
      (item) => item.numero_n === "0001-1SU",
    )!;
    const itinerario = servico.itinerarios.find(
      (item) => item.sentido === "ida",
    )!;
    const viagem = itinerario.viagens[0];
    const valorOriginal = viagem.horario_saida;
    const { container, desmontar } = montarEtapa(documento);
    const campo = container.querySelector(
      `input[data-viagem-uuid="${viagem.uuid}"][data-secao-index="1"]`,
    ) as HTMLInputElement;
    const celula = campo.closest("td")!;

    act(() => {
      campo.focus();
      campo.click();
    });
    expect(celula.getAttribute("data-selecionada")).toBe("true");

    act(() => campo.click());
    expect(celula.hasAttribute("data-selecionada")).toBe(false);
    expect(document.activeElement).toBe(campo);
    expect(viagem.horario_saida).toBe(valorOriginal);
    desmontar();
  });
});
