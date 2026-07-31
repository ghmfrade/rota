// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { EtapaViagens } from "@/formulario/viagens";
import type { SessaoFormulario } from "@/formulario/sessao";
import type { DocumentoOperacao, Viagem } from "@/shared/contrato";
import multiServico from "../../fixtures/carregar-multi-servico.json";
import { act, renderizar } from "../shared-ui/_ajuda-render";

// TASK-123: no modo "Exibir somente partidas" (DEC-086), o hover da Viagem
// volta a oferecer a inserção posterior ("acao-inserir-posterior"), ancorada
// na célula de partida — o mesmo mecanismo já usado pela superfície de
// headway. O motor de inserção (`aoInserirViagemPorOffset` /
// `inserirViagemPorOffsetRelativo`) não muda: só a renderização no modo
// compacto.

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

function ativarModoCompacto(container: HTMLElement) {
  const alternador = container.querySelector(
    '[data-testid="alternar-modo-compacto"]',
  ) as HTMLButtonElement;
  act(() => alternador.click());
}

function ativarHeadway(container: HTMLElement) {
  const celula = celulaPartida(container);
  entrarComPonteiro(celula);
  const alternador = celula.querySelector(
    '[data-testid="alternar-modo-headway"]',
  ) as HTMLButtonElement;
  act(() => alternador.click());
}

function viagensDoDocumento(documento: DocumentoOperacao): Viagem[] {
  const servico = documento.autos.servicos.find(
    (item) => item.numero_n === "0001-1SU",
  )!;
  const itinerario = servico.itinerarios.find((item) => item.sentido === "ida")!;
  return itinerario.viagens;
}

describe("EtapaViagens — inserção posterior no modo compacto (TASK-123; DEC-086)", () => {
  it("exibe 'acao-inserir-posterior' ancorada na partida quando não há Seções passantes", () => {
    const { container, desmontar } = montarEtapa();
    ativarModoCompacto(container);
    const grade = gradeComum(container);
    const celula = celulaPartida(container);

    entrarComPonteiro(celula);

    const acao = celula.querySelector('[data-testid="acao-inserir-posterior"]');
    expect(acao).not.toBeNull();
    expect(
      acao!.querySelector('[data-testid="inserir-viagem-posterior"]'),
    ).not.toBeNull();
    expect(
      acao!.querySelector('[aria-label="Inserir viagem depois — segunda, viagem 1"]'),
    ).not.toBeNull();
    // Nenhuma célula passante existe no modo compacto — sem duplicação possível.
    expect(grade.querySelectorAll('[data-testid="celula-passante"]')).toHaveLength(0);
    expect(
      grade.querySelectorAll('[data-testid="acao-inserir-posterior"]').length,
    ).toBe(grade.querySelectorAll('[data-testid="celula-partida"]').length);
    desmontar();
  });

  it("[inválido] não duplica 'acao-inserir-posterior' no modo completo (uma ocorrência por Viagem)", () => {
    const { container, desmontar } = montarEtapa();
    const grade = gradeComum(container);
    const celula = celulaPartida(container);

    entrarComPonteiro(celula);

    // No modo completo a superfície ancora na célula passante final, nunca na
    // partida — por isso não há ocorrência dentro da própria célula-partida.
    expect(
      celula.querySelector('[data-testid="acao-inserir-posterior"]'),
    ).toBeNull();
    expect(
      grade.querySelectorAll('[data-testid="acao-inserir-posterior"]'),
    ).toHaveLength(1);
    desmontar();
  });

  it("ativar headway no modo compacto substitui a inserção posterior (DEC-100)", () => {
    const { container, desmontar } = montarEtapa();
    ativarModoCompacto(container);
    const celula = celulaPartida(container);
    entrarComPonteiro(celula);
    expect(celula.querySelector('[data-testid="acao-inserir-posterior"]')).not.toBeNull();
    expect(celula.querySelector('[data-testid="superficie-headway"]')).toBeNull();

    ativarHeadway(container);

    expect(celula.querySelector('[data-testid="acao-inserir-posterior"]')).toBeNull();
    expect(celula.querySelector('[data-testid="superficie-headway"]')).not.toBeNull();
    desmontar();
  });

  it("insere Viagem no modo compacto com o mesmo resultado do modo completo, exceto a UUID", () => {
    const documentoCompacto = structuredClone(
      multiServico,
    ) as unknown as DocumentoOperacao;
    const documentoCompleto = structuredClone(
      multiServico,
    ) as unknown as DocumentoOperacao;

    const compacto = montarEtapa(documentoCompacto);
    ativarModoCompacto(compacto.container);
    entrarComPonteiro(celulaPartida(compacto.container));
    const campoCompacto = celulaPartida(compacto.container).querySelector(
      '[aria-label="Deslocamento posterior — segunda, viagem 1"]',
    ) as HTMLInputElement;
    preencher(campoCompacto, "00:30");
    act(() =>
      (
        celulaPartida(compacto.container).querySelector(
          '[data-testid="inserir-viagem-posterior"]',
        ) as HTMLButtonElement
      ).click(),
    );

    const completo = montarEtapa(documentoCompleto);
    const grade = gradeComum(completo.container);
    entrarComPonteiro(celulaPartida(completo.container));
    const celulaFinal = grade
      .querySelectorAll('[data-testid="celula-passante"]')[
        grade.querySelectorAll('[data-testid="celula-passante"]').length - 1
      ] as HTMLElement;
    const campoCompleto = celulaFinal.querySelector(
      '[aria-label="Deslocamento posterior — segunda, viagem 1"]',
    ) as HTMLInputElement;
    preencher(campoCompleto, "00:30");
    act(() =>
      (
        celulaFinal.querySelector(
          '[data-testid="inserir-viagem-posterior"]',
        ) as HTMLButtonElement
      ).click(),
    );

    expect(compacto.espiaoAtualizacao).toHaveBeenCalledTimes(1);
    expect(completo.espiaoAtualizacao).toHaveBeenCalledTimes(1);
    const viagensCompacto = viagensDoDocumento(
      compacto.espiaoAtualizacao.mock.calls[0][0].documento,
    );
    const viagensCompleto = viagensDoDocumento(
      completo.espiaoAtualizacao.mock.calls[0][0].documento,
    );
    const criadaCompacto = viagensCompacto[viagensCompacto.length - 1];
    const criadaCompleto = viagensCompleto[viagensCompleto.length - 1];

    expect(criadaCompacto.uuid).not.toBe(criadaCompleto.uuid);
    expect(criadaCompacto.uuid).not.toBe(viagensCompacto[0].uuid);
    function semUuid(viagem: Viagem): Omit<Viagem, "uuid"> {
      const copia: Partial<Viagem> = { ...viagem };
      delete copia.uuid;
      return copia as Omit<Viagem, "uuid">;
    }
    expect(semUuid(criadaCompacto)).toEqual(semUuid(criadaCompleto));
    expect(criadaCompacto.horario_saida).toBe("08:30:00");
    expect(criadaCompacto.horarios_paradas).toEqual(viagensCompacto[0].horarios_paradas);

    compacto.desmontar();
    completo.desmontar();
  });

  it("[inválido] deslocamento vazio no modo compacto mantém a recusa e a mensagem, sem criar Viagem", () => {
    const { container, espiaoAtualizacao, desmontar } = montarEtapa();
    ativarModoCompacto(container);
    const celula = celulaPartida(container);
    entrarComPonteiro(celula);

    const campo = celula.querySelector(
      '[aria-label="Deslocamento posterior — segunda, viagem 1"]',
    ) as HTMLInputElement;
    preencher(campo, "");
    act(() =>
      (
        celula.querySelector(
          '[data-testid="inserir-viagem-posterior"]',
        ) as HTMLButtonElement
      ).click(),
    );

    expect(espiaoAtualizacao).not.toHaveBeenCalled();
    const erro = celula.querySelector('[data-testid="erro-insercao-relativa"]');
    expect(erro).not.toBeNull();
    expect(erro!.textContent).toContain("HH:MM");
    desmontar();
  });
});
