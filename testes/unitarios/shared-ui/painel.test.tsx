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
});
