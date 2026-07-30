// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { LayoutFormulario } from "@/formulario/layout/layout-formulario";
import { ETAPAS } from "@/formulario/layout/etapas";
import type { SessaoFormulario } from "@/formulario/sessao";
import { renderizar, act } from "../shared-ui/_ajuda-render";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-051 — casca full-screen do Formulário (Spec 04 §4; doc 18 §5). Cobre só
// a parte estrutural do shell (sidebar de carimbos + troca de etapa + selo de
// status condicional): o resto do comportamento (pendências, cabeçalho por
// identidade, etapas em si) já é coberto por `pendencias.test.ts` e pelos E2E
// (`testes/e2e/formulario-layout.spec.ts`). Nenhum teste aqui toca rede/OSRM.

describe("LayoutFormulario — sidebar de etapas (stepper)", () => {
  it("renderiza os 7 botões de etapa com rótulo sr-only; aria-current só na ativa", () => {
    const sessao: SessaoFormulario = { modo: "novo" };
    const { container, desmontar } = renderizar(
      <LayoutFormulario sessao={sessao} aoAtualizarSessao={vi.fn()} />,
    );

    const botoes = container.querySelectorAll('[data-testid="etapa-botao"]');
    expect(botoes).toHaveLength(7);

    botoes.forEach((botao, indice) => {
      const etapa = ETAPAS[indice];
      expect(botao.getAttribute("data-etapa")).toBe(etapa.id);
      expect(botao.querySelector(".sr-only")?.textContent).toBe(etapa.rotulo);

      if (etapa.id === "identificacao") {
        // Etapa inicial do shell (Spec 04 §4) — a única ativa no primeiro render.
        expect(botao.getAttribute("aria-current")).toBe("step");
      } else {
        expect(botao.hasAttribute("aria-current")).toBe(false);
      }
    });

    desmontar();
  });

  it("clicar um botão de etapa troca data-etapa-atual da seção de conteúdo", () => {
    const sessao: SessaoFormulario = { modo: "novo" };
    const { container, desmontar } = renderizar(
      <LayoutFormulario sessao={sessao} aoAtualizarSessao={vi.fn()} />,
    );

    const conteudo = container.querySelector('[data-testid="conteudo-etapa"]')!;
    expect(conteudo.getAttribute("data-etapa-atual")).toBe("identificacao");

    const botaoServicos = container.querySelector(
      '[data-testid="etapa-botao"][data-etapa="servicos"]',
    ) as HTMLButtonElement;

    act(() => {
      botaoServicos.click();
    });

    expect(conteudo.getAttribute("data-etapa-atual")).toBe("servicos");
    expect(botaoServicos.getAttribute("aria-current")).toBe("step");

    desmontar();
  });
});

describe("LayoutFormulario — cabeçalho no modo novo", () => {
  it('no modo "novo" (identidade indefinida) não há selo-status', () => {
    const sessao: SessaoFormulario = { modo: "novo" };
    const { container, desmontar } = renderizar(
      <LayoutFormulario sessao={sessao} aoAtualizarSessao={vi.fn()} />,
    );

    expect(container.querySelector('[data-testid="selo-status"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="cabecalho-codigo"]')?.textContent,
    ).toContain("a definir");

    desmontar();
  });
});

describe("LayoutFormulario — motivo estrutural do bloqueio visível na Revisão (TASK-085; RN-078)", () => {
  it("[inválido] Seção órfã bloqueia a exportação E aparece em Erros bloqueantes (regressão: antes mostrava 'Nenhum erro bloqueante')", () => {
    const documento = documentoExemploMinimo();
    documento.autos.secoes.push({
      uuid: "9f9f9f9f-1111-4111-8111-999999999999",
      municipio: "Guarujá",
      nome: "Terminal Extra",
      servicos: [
        {
          servico_uuid: documento.autos.servicos[0].uuid,
          geolocalizacao_ida: { latitude: -23.99, longitude: -46.25 },
          geolocalizacao_volta: { latitude: -23.99, longitude: -46.25 },
        },
      ],
    });
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };
    const { container, desmontar } = renderizar(
      <LayoutFormulario sessao={sessao} aoAtualizarSessao={vi.fn()} />,
    );

    const botaoRevisao = container.querySelector(
      '[data-testid="etapa-botao"][data-etapa="revisao"]',
    ) as HTMLButtonElement;
    act(() => {
      botaoRevisao.click();
    });

    expect(container.querySelector('[data-testid="revisao-bloqueantes-vazio"]')).toBeNull();
    const itensBloqueantes = container.querySelectorAll(
      '[data-testid="revisao-item-bloqueante"]',
    );
    expect(itensBloqueantes.length).toBeGreaterThan(0);
    const textos = Array.from(itensBloqueantes).map((item) => item.textContent);
    expect(textos.some((texto) => texto?.includes("Guarujá - Terminal Extra"))).toBe(true);

    desmontar();
  });

  it("[inválido] violação técnica da TASK-082 aparece em Erros bloqueantes", () => {
    const documento = documentoExemploMinimo();
    documento.autos.secoes[0].servicos[0].geolocalizacao_volta = {
      latitude: -23.97,
      longitude: -46.3339,
    };
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };
    const { container, desmontar } = renderizar(
      <LayoutFormulario sessao={sessao} aoAtualizarSessao={vi.fn()} />,
    );

    const botaoRevisao = container.querySelector(
      '[data-testid="etapa-botao"][data-etapa="revisao"]',
    ) as HTMLButtonElement;
    act(() => {
      botaoRevisao.click();
    });

    const itensBloqueantes = container.querySelectorAll(
      '[data-testid="revisao-item-bloqueante"]',
    );
    const textos = Array.from(itensBloqueantes).map((item) => item.textContent);
    expect(textos.some((texto) => texto?.includes(documento.autos.secoes[0].nome))).toBe(true);
    expect(textos.every((texto) => !texto?.match(/\[RN-\d+\]/))).toBe(true);

    desmontar();
  });
});

describe("LayoutFormulario — navegação de partidas coincidentes (TASK-119)", () => {
  it("o alerta exibe Selo e posiciona Serviço, sentido, grade e primeira ocorrência", () => {
    const documento = documentoExemploMinimo();
    const servico = documento.autos.servicos[0];
    const itinerario = servico.itinerarios[0];
    const primeira = itinerario.viagens[0];
    primeira.uuid = "10000000-0000-4000-8000-000000000001";
    primeira.dia_semana = "segunda";
    primeira.horario_saida = "08:00:00";
    primeira.viagem_feriado = false;
    primeira.tabela_excepcional_uuid = null;
    const reforco = structuredClone(primeira);
    reforco.uuid = "20000000-0000-4000-8000-000000000002";
    itinerario.viagens = [primeira, reforco];
    const sessao: SessaoFormulario = {
      modo: "carregado",
      documento,
      alertasImportacao: [],
    };
    const { container, desmontar } = renderizar(
      <LayoutFormulario sessao={sessao} aoAtualizarSessao={vi.fn()} />,
    );
    const alerta = [...container.querySelectorAll('[data-testid="pendencia-item"]')].find(
      (item) => item.textContent?.includes("partidas coincidentes"),
    ) as HTMLButtonElement;
    expect(alerta).toBeTruthy();
    expect(alerta.textContent).toContain("1");

    act(() => alerta.click());

    expect(
      container
        .querySelector('[data-testid="conteudo-etapa"]')
        ?.getAttribute("data-etapa-atual"),
    ).toBe("viagens-horarios");
    expect(
      (container.querySelector(
        '[data-testid="select-servico-viagens"]',
      ) as HTMLSelectElement).value,
    ).toBe(servico.uuid);
    expect(
      (container.querySelector(
        '[data-testid="select-sentido-viagens"]',
      ) as HTMLSelectElement).value,
    ).toBe(itinerario.sentido);
    expect(
      container.querySelector(
        `input[data-grade="comuns"][data-viagem-uuid="${primeira.uuid}"]` +
          '[data-dia="segunda"][data-secao-index="0"]',
      ),
    ).not.toBeNull();
    desmontar();
  });
});
