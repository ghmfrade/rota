// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { TelaRevisao } from "@/formulario/revisao";
import type { SessaoFormulario } from "@/formulario/sessao";
import type { Pendencia } from "@/formulario/pendencias";
import { renderizar } from "../shared-ui/_ajuda-render";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-032 — tela de Revisão (Spec 04 §11): duas listas de pendências,
// descrição textual por Serviço/sentido, resumo operacional. Componente
// puramente apresentacional — não recomputa pendências.

const SESSAO_CARREGADA: SessaoFormulario = {
  modo: "carregado",
  documento: documentoExemploMinimo(),
  alertasImportacao: [],
};

describe("TelaRevisao — sem pendências", () => {
  it("exibe as mensagens de lista vazia nas duas seções", () => {
    const { container, desmontar } = renderizar(
      <TelaRevisao sessao={SESSAO_CARREGADA} pendencias={[]} aoNavegar={vi.fn()} />,
    );

    expect(
      container.querySelector('[data-testid="revisao-bloqueantes-vazio"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-testid="revisao-alertas-vazio"]')).not.toBeNull();

    desmontar();
  });

  it("exibe a descrição textual por Serviço e sentido (§11)", () => {
    const { container, desmontar } = renderizar(
      <TelaRevisao sessao={SESSAO_CARREGADA} pendencias={[]} aoNavegar={vi.fn()} />,
    );

    const itens = container.querySelectorAll('[data-testid="revisao-descricao-item"]');
    expect(itens.length).toBeGreaterThan(0);
    expect(itens[0].textContent).toContain("Serviço");

    desmontar();
  });

  it("exibe o resumo operacional (Spec 04 §10, TASK-031)", () => {
    const { container, desmontar } = renderizar(
      <TelaRevisao sessao={SESSAO_CARREGADA} pendencias={[]} aoNavegar={vi.fn()} />,
    );

    expect(container.querySelector('[data-testid="resumo-operacional"]')).not.toBeNull();

    desmontar();
  });
});

describe("TelaRevisao — com pendências (RN-078)", () => {
  const PENDENCIAS: Pendencia[] = [
    {
      id: "rota-ausente-0000-1CR-ida",
      severidade: "bloqueante",
      mensagem: "O itinerário de Ida do Serviço 0000-1CR está sem rota calculada. Recalcule antes de exportar.",
      etapaAlvo: "secoes-locais-itinerarios",
    },
    {
      id: "documento-criado-do-zero",
      severidade: "alerta",
      mensagem: "Documento criado do zero: sem preservação de identidade das entidades para comparação entre versões.",
      etapaAlvo: "revisao",
    },
  ];

  it("lista cada pendência na seção correta (bloqueante × alerta)", () => {
    const { container, desmontar } = renderizar(
      <TelaRevisao sessao={SESSAO_CARREGADA} pendencias={PENDENCIAS} aoNavegar={vi.fn()} />,
    );

    const bloqueantes = container.querySelectorAll('[data-testid="revisao-item-bloqueante"]');
    const alertas = container.querySelectorAll('[data-testid="revisao-item-alerta"]');
    expect(bloqueantes).toHaveLength(1);
    expect(alertas).toHaveLength(1);
    expect(bloqueantes[0].textContent).toContain("sem rota calculada");

    desmontar();
  });

  it("clicar um item navega para a etapaAlvo da pendência (§11)", () => {
    const aoNavegar = vi.fn();
    const { container, desmontar } = renderizar(
      <TelaRevisao sessao={SESSAO_CARREGADA} pendencias={PENDENCIAS} aoNavegar={aoNavegar} />,
    );

    const botao = container.querySelector(
      '[data-testid="revisao-item-bloqueante"]',
    ) as HTMLButtonElement;
    botao.click();

    expect(aoNavegar).toHaveBeenCalledWith("secoes-locais-itinerarios");

    desmontar();
  });
});
