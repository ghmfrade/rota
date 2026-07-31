// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { EtapaViagens } from "@/formulario/viagens";
import type { SessaoFormulario } from "@/formulario/sessao";
import type { DocumentoOperacao } from "@/shared/contrato";
import multiServico from "../../fixtures/carregar-multi-servico.json";
import { act, renderizar } from "../shared-ui/_ajuda-render";

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

function prepararDocumento(): DocumentoOperacao {
  const documento = structuredClone(
    multiServico,
  ) as unknown as DocumentoOperacao;
  const servico = documento.autos.servicos.find(
    (item) => item.numero_n === "0001-1SU",
  )!;
  const itinerario = servico.itinerarios.find(
    (item) => item.sentido === "ida",
  )!;
  const comum = itinerario.viagens[0];
  const feriado = structuredClone(comum);
  feriado.uuid = "30000000-0000-4000-8000-000000000003";
  feriado.viagem_feriado = true;
  const tabelaUuid = "40000000-0000-4000-8000-000000000004";
  servico.tabelas_excepcionais = [
    { uuid: tabelaUuid, tipo: "ferias_verao" },
  ];
  const excepcional = structuredClone(comum);
  excepcional.uuid = "50000000-0000-4000-8000-000000000005";
  excepcional.tabela_excepcional_uuid = tabelaUuid;
  itinerario.viagens = [comum, feriado, excepcional];
  return documento;
}

function selecionarServicoESentido(container: HTMLElement) {
  const seletorServico = container.querySelector(
    '[data-testid="select-servico-viagens"]',
  ) as HTMLSelectElement;
  const opcaoServico = [...seletorServico.options].find(
    (opcao) => opcao.textContent === "0001-1SU",
  )!;
  selecionar(seletorServico, opcaoServico.value);

  const seletorSentido = container.querySelector(
    '[data-testid="select-sentido-viagens"]',
  ) as HTMLSelectElement;
  selecionar(seletorSentido, "ida");
}

/** React sintetiza `onMouseEnter` a partir do `mouseover` delegado na raiz. */
function entrarComPonteiro(elemento: Element) {
  act(() => {
    elemento.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
}

function ativarModoCompacto(container: HTMLElement) {
  const alternador = container.querySelector(
    '[data-testid="alternar-modo-compacto"]',
  ) as HTMLButtonElement;
  act(() => alternador.click());
}

describe("EtapaViagens — modo compacto (TASK-111; DEC-086)", () => {
  it("oculta somente passantes em todas as grades e restaura os mesmos dados", () => {
    const documento = prepararDocumento();
    const antes = structuredClone(documento);
    const aoAtualizarSessao = vi.fn();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <EtapaViagens
        sessao={sessao}
        aoAtualizarSessao={aoAtualizarSessao}
      />,
    );
    selecionarServicoESentido(container);

    const grades = [
      container.querySelector('[data-testid="grade-dias-comuns"]')!,
      container.querySelector('[data-testid="grade-feriados"]')!,
      container.querySelector('[data-testid="grade-tabela-excepcional"]')!,
    ];
    const quantidadesCompletas = grades.map(
      (grade) => grade.querySelectorAll('[data-testid="linha-grade"]').length,
    );
    expect(quantidadesCompletas.every((quantidade) => quantidade === 6)).toBe(
      true,
    );

    const alternador = container.querySelector(
      '[data-testid="alternar-modo-compacto"]',
    ) as HTMLButtonElement;
    expect(alternador.getAttribute("aria-pressed")).toBe("false");
    act(() => alternador.click());

    expect(alternador.getAttribute("aria-pressed")).toBe("true");
    expect(alternador.textContent).toContain("Exibir todas as Seções");
    for (const grade of grades) {
      expect(
        grade.querySelectorAll('[data-testid="linha-grade"]'),
      ).toHaveLength(2);
      expect(
        grade.querySelectorAll('[data-testid="celula-passante"]'),
      ).toHaveLength(0);
    }
    expect(aoAtualizarSessao).not.toHaveBeenCalled();
    expect(documento).toEqual(antes);

    act(() => alternador.click());

    expect(alternador.getAttribute("aria-pressed")).toBe("false");
    expect(
      grades.map(
        (grade) =>
          grade.querySelectorAll('[data-testid="linha-grade"]').length,
      ),
    ).toEqual(quantidadesCompletas);
    expect(aoAtualizarSessao).not.toHaveBeenCalled();
    expect(documento).toEqual(antes);
    desmontar();
  });

  it("[inválido] não compartilha o modo compacto entre sentidos", () => {
    const documento = prepararDocumento();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <EtapaViagens sessao={sessao} aoAtualizarSessao={vi.fn()} />,
    );
    selecionarServicoESentido(container);

    const alternador = container.querySelector(
      '[data-testid="alternar-modo-compacto"]',
    ) as HTMLButtonElement;
    act(() => alternador.click());
    expect(alternador.getAttribute("aria-pressed")).toBe("true");

    selecionar(
      container.querySelector(
        '[data-testid="select-sentido-viagens"]',
      ) as HTMLSelectElement,
      "volta",
    );

    expect(
      container
        .querySelector('[data-testid="alternar-modo-compacto"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      container
        .querySelector('[data-testid="grade-dias-comuns"]')
        ?.querySelectorAll('[data-testid="linha-grade"]'),
    ).toHaveLength(6);
    desmontar();
  });
});

describe("EtapaViagens — composição das ações no modo compacto (TASK-122; DEC-101)", () => {
  it("oculta 'Restaurar sugestão' e alinha X + alternador na horizontal, nas três grades", () => {
    const documento = prepararDocumento();
    const antes = structuredClone(documento);
    const aoAtualizarSessao = vi.fn();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <EtapaViagens sessao={sessao} aoAtualizarSessao={aoAtualizarSessao} />,
    );
    selecionarServicoESentido(container);
    ativarModoCompacto(container);

    const grades = [
      container.querySelector('[data-testid="grade-dias-comuns"]')!,
      container.querySelector('[data-testid="grade-feriados"]')!,
      container.querySelector('[data-testid="grade-tabela-excepcional"]')!,
    ];

    for (const grade of grades) {
      const celulaPartida = grade.querySelector(
        '[data-testid="celula-partida"]',
      ) as HTMLElement;
      entrarComPonteiro(celulaPartida);
      const acoes = grade.querySelector(
        '[data-testid="acoes-viagem"]',
      ) as HTMLElement;
      expect(acoes.querySelector('[data-testid="restaurar-viagem"]')).toBeNull();
      expect(acoes.querySelector('[data-testid="apagar-viagem"]')).not.toBeNull();
      expect(
        acoes.querySelector('[data-testid="alternar-modo-headway"]'),
      ).not.toBeNull();
      expect(acoes.className).toContain("flex-row");
    }

    // Ocultar o botão não dispara restauração nem altera o documento (RN-063/RN-066/RN-096).
    expect(aoAtualizarSessao).not.toHaveBeenCalled();
    expect(documento).toEqual(antes);
    desmontar();
  });

  it("volta a exibir 'Restaurar sugestão' em coluna ao reexibir todas as Seções (DEC-090)", () => {
    const documento = prepararDocumento();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <EtapaViagens sessao={sessao} aoAtualizarSessao={vi.fn()} />,
    );
    selecionarServicoESentido(container);
    ativarModoCompacto(container);

    const grade = container.querySelector('[data-testid="grade-dias-comuns"]')!;
    entrarComPonteiro(
      grade.querySelector('[data-testid="celula-partida"]') as HTMLElement,
    );
    expect(
      grade.querySelector('[data-testid="acoes-viagem"]')?.querySelector(
        '[data-testid="restaurar-viagem"]',
      ),
    ).toBeNull();

    ativarModoCompacto(container);

    entrarComPonteiro(
      grade.querySelector('[data-testid="celula-partida"]') as HTMLElement,
    );
    const acoesCompleto = grade.querySelector(
      '[data-testid="acoes-viagem"]',
    ) as HTMLElement;
    expect(
      acoesCompleto.querySelector('[data-testid="restaurar-viagem"]'),
    ).not.toBeNull();
    expect(acoesCompleto.className).toContain("flex-col");
    desmontar();
  });

  it("[inválido] não chama restauração ao alternar o modo compacto e abrir/fechar o hover", () => {
    const documento = prepararDocumento();
    const antes = structuredClone(documento);
    const aoAtualizarSessao = vi.fn();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <EtapaViagens sessao={sessao} aoAtualizarSessao={aoAtualizarSessao} />,
    );
    selecionarServicoESentido(container);
    ativarModoCompacto(container);

    const grade = container.querySelector('[data-testid="grade-dias-comuns"]')!;
    const celulaPartida = grade.querySelector(
      '[data-testid="celula-partida"]',
    ) as HTMLElement;
    entrarComPonteiro(celulaPartida);
    entrarComPonteiro(celulaPartida);

    expect(aoAtualizarSessao).not.toHaveBeenCalled();
    expect(documento).toEqual(antes);
    desmontar();
  });
});

describe("EtapaViagens — inserção posterior restaurada no modo compacto (TASK-123; DEC-086)", () => {
  it("exibe 'acao-inserir-posterior' na partida nas três grades, sem duplicar entre modos", () => {
    const documento = prepararDocumento();
    const antes = structuredClone(documento);
    const aoAtualizarSessao = vi.fn();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <EtapaViagens sessao={sessao} aoAtualizarSessao={aoAtualizarSessao} />,
    );
    selecionarServicoESentido(container);
    ativarModoCompacto(container);

    const grades = [
      container.querySelector('[data-testid="grade-dias-comuns"]')!,
      container.querySelector('[data-testid="grade-feriados"]')!,
      container.querySelector('[data-testid="grade-tabela-excepcional"]')!,
    ];

    for (const grade of grades) {
      const celulaPartida = grade.querySelector(
        '[data-testid="celula-partida"]',
      ) as HTMLElement;
      entrarComPonteiro(celulaPartida);
      expect(
        celulaPartida.querySelectorAll('[data-testid="acao-inserir-posterior"]'),
      ).toHaveLength(1);
      expect(
        celulaPartida.querySelector('[data-testid="inserir-viagem-posterior"]'),
      ).not.toBeNull();
    }

    // Nenhuma alteração de dados só por exibir o controle no hover (RN-096).
    expect(aoAtualizarSessao).not.toHaveBeenCalled();
    expect(documento).toEqual(antes);
    desmontar();
  });

  it("alternar entre modo compacto e completo preserva horarios_paradas, âncoras e UUIDs", () => {
    const documento = prepararDocumento();
    const antes = structuredClone(documento);
    const aoAtualizarSessao = vi.fn();
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <EtapaViagens sessao={sessao} aoAtualizarSessao={aoAtualizarSessao} />,
    );
    selecionarServicoESentido(container);

    const grade = container.querySelector('[data-testid="grade-dias-comuns"]')!;
    ativarModoCompacto(container);
    entrarComPonteiro(
      grade.querySelector('[data-testid="celula-partida"]') as HTMLElement,
    );
    expect(
      grade.querySelector('[data-testid="acao-inserir-posterior"]'),
    ).not.toBeNull();

    ativarModoCompacto(container);
    entrarComPonteiro(
      grade.querySelector('[data-testid="celula-partida"]') as HTMLElement,
    );
    expect(
      grade.querySelectorAll('[data-testid="acao-inserir-posterior"]'),
    ).toHaveLength(1);

    expect(aoAtualizarSessao).not.toHaveBeenCalled();
    expect(documento).toEqual(antes);
    desmontar();
  });
});
