// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { Tabela } from "@/shared/ui/tabela";
import { renderizar } from "./_ajuda-render";

describe("Tabela", () => {
  it("envolve a <table> num wrapper com overflow-x-auto", () => {
    const { container, desmontar } = renderizar(
      <Tabela>
        <thead>
          <tr>
            <th>Seção</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cidade - Nome</td>
          </tr>
        </tbody>
      </Tabela>,
    );
    const wrapper = container.firstElementChild as HTMLDivElement;
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper.className).toContain("overflow-x-auto");
    expect(wrapper.querySelector("table")).not.toBeNull();
    desmontar();
  });

  it("preserva a estrutura semântica thead/tbody/tr/td dos filhos", () => {
    const { container, desmontar } = renderizar(
      <Tabela data-testid="tabela-servicos">
        <thead>
          <tr>
            <th>Serviço</th>
            <th>Caráter</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0000-1CR</td>
            <td>Rodoviário</td>
          </tr>
        </tbody>
      </Tabela>,
    );
    const tabela = container.querySelector(
      '[data-testid="tabela-servicos"]',
    ) as HTMLTableElement;
    expect(tabela.tHead).not.toBeNull();
    expect(tabela.tBodies.length).toBe(1);
    expect(tabela.querySelectorAll("th").length).toBe(2);
    expect(tabela.querySelectorAll("td").length).toBe(2);
    desmontar();
  });

  it("aplica as classes de cabeçalho/zebra/hover via seletores da própria tabela", () => {
    const { container, desmontar } = renderizar(
      <Tabela>
        <thead>
          <tr>
            <th>Seção</th>
          </tr>
        </thead>
        <tbody />
      </Tabela>,
    );
    const tabela = container.querySelector("table")!;
    expect(tabela.className).toContain("[&_thead]:bg-cinza-100");
    expect(tabela.className).toContain("[&_tbody_tr:nth-child(even)]:bg-cinza-50");
    expect(tabela.className).toContain("[&_tbody_tr:hover]:bg-azul-50");
    desmontar();
  });
});
