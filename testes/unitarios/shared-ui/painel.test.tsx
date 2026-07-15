// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { Painel } from "@/shared/ui/painel";
import { renderizar } from "./_ajuda-render";

describe("Painel", () => {
  it("renderiza como <section> por padrão, com o título num <h2>", () => {
    const { container, desmontar } = renderizar(
      <Painel titulo="Pendências">Conteúdo</Painel>,
    );
    const secao = container.querySelector("section")!;
    expect(secao).not.toBeNull();
    expect(container.querySelector("details")).toBeNull();
    expect(secao.querySelector("h2")?.textContent).toBe("Pendências");
    expect(secao.className).toContain("rounded-painel");
    expect(secao.className).toContain("shadow-sombra-2");
    desmontar();
  });

  it("renderiza <details>/<summary> quando colapsavel", () => {
    const { container, desmontar } = renderizar(
      <Painel titulo="Resumo operacional" colapsavel>
        Conteúdo
      </Painel>,
    );
    const detalhes = container.querySelector("details")!;
    expect(detalhes).not.toBeNull();
    expect(detalhes.querySelector("summary")?.textContent).toBe(
      "Resumo operacional",
    );
    desmontar();
  });

  it("repassa aberto/defaultOpen ao <details>", () => {
    const { container, desmontar } = renderizar(
      <Painel titulo="Pendências" colapsavel aberto>
        Conteúdo
      </Painel>,
    );
    const detalhes = container.querySelector("details") as HTMLDetailsElement;
    expect(detalhes.open).toBe(true);
    desmontar();
  });

  it("repassa data-testid e demais props nativas", () => {
    const { container, desmontar } = renderizar(
      <Painel data-testid="painel-pendencias">Conteúdo</Painel>,
    );
    expect(
      container.querySelector('[data-testid="painel-pendencias"]'),
    ).not.toBeNull();
    desmontar();
  });

  // Regressão do achado da revisão da TASK-052: a superfície era fixa e as
  // telas tentavam trocá-la por `className`. Utilitários Tailwind conflitantes
  // resolvem pela ordem de emissão no CSS, não pela ordem na string — a
  // sobreposição perdia em silêncio. As variantes garantem que a cor de
  // borda/fundo saia UMA vez só, escolhida pelo componente.
  describe("variantes de superfície (doc 18 §3)", () => {
    it("tom padrão usa borda cinza-200 sobre branco, sem cor concorrente", () => {
      const { container, desmontar } = renderizar(<Painel>Conteúdo</Painel>);
      const classes = container.querySelector("section")!.className;
      expect(classes).toContain("border-cinza-200");
      expect(classes).toContain("bg-white");
      expect(classes).not.toContain("border-azul");
      desmontar();
    });

    it("tom informativo troca a superfície para azul e NÃO deixa a borda cinza para trás", () => {
      const { container, desmontar } = renderizar(
        <Painel tom="informativo">Aviso</Painel>,
      );
      const classes = container.querySelector("section")!.className;
      expect(classes).toContain("border-azul-300");
      expect(classes).toContain("bg-azul-50");
      // O ponto do achado: nenhuma classe de cor concorrente sobra na string.
      expect(classes).not.toContain("border-cinza-200");
      expect(classes).not.toContain("bg-white");
      desmontar();
    });

    it("tom destacado marca o caminho recomendado com borda e anel azul-600 (Spec 04 §3)", () => {
      const { container, desmontar } = renderizar(
        <Painel tom="destacado">Carregar</Painel>,
      );
      const classes = container.querySelector("section")!.className;
      expect(classes).toContain("border-azul-600");
      expect(classes).toContain("ring-azul-600");
      expect(classes).not.toContain("border-cinza-200");
      desmontar();
    });

    it("elevacao flutuante usa sombra-3 sem manter a sombra-2 concorrente", () => {
      const { container, desmontar } = renderizar(
        <Painel elevacao="flutuante">Diálogo</Painel>,
      );
      const classes = container.querySelector("section")!.className;
      expect(classes).toContain("shadow-sombra-3");
      expect(classes).not.toContain("shadow-sombra-2");
      desmontar();
    });

    it("as variantes valem também no modo colapsavel", () => {
      const { container, desmontar } = renderizar(
        <Painel colapsavel tom="informativo" titulo="Resumo">
          Conteúdo
        </Painel>,
      );
      const classes = container.querySelector("details")!.className;
      expect(classes).toContain("border-azul-300");
      expect(classes).not.toContain("border-cinza-200");
      desmontar();
    });
  });
});
