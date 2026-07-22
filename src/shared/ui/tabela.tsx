"use client";

// Tabela base do design system (docs-dev/18-DESIGN_SYSTEM.md §3). Só o
// wrapper e a decoração (cabeçalho fixo, zebra, hover) vêm daqui — a
// estrutura semântica `<table>/<thead>/<tbody>/<tr>/<td>` continua sendo do
// chamador, para não alterar comportamento/acessibilidade de tabelas
// existentes.

import type { ComponentPropsWithoutRef } from "react";

export type DensidadeTabela = "padrao" | "compacta";

export interface TabelaProps extends ComponentPropsWithoutRef<"table"> {
  /** Densidade visual (DEC-073/TASK-091) — variante por prop, nunca por `className` (doc 18 §4). */
  densidade?: DensidadeTabela;
}

const CLASSES_BASE =
  "w-full border-collapse text-sm " +
  "[&_thead]:sticky [&_thead]:top-0 [&_thead]:bg-cinza-100 " +
  "[&_tbody_tr]:[transition:background-color_var(--transicao-rapida)] " +
  "[&_th]:text-left [&_th]:text-sm [&_td]:text-sm";

// Zebra e hover não se aplicam à linha selecionada (`aria-current="true"`):
// os seletores arbitrários têm especificidade maior que a classe simples
// `bg-azul-100` usada na seleção (TASK-064) e a mascarariam nas linhas pares.
// Cada densidade monta seu próprio par de seletores — nunca as duas emitidas
// juntas — para preservar a precedência "seleção sobre zebra" (DEC-073 item 5).
const CLASSES_POR_DENSIDADE: Record<DensidadeTabela, string> = {
  padrao:
    '[&_tbody_tr:nth-child(even):not([aria-current="true"])]:bg-cinza-50 ' +
    '[&_tbody_tr:hover:not([aria-current="true"])]:bg-azul-50 ' +
    "[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2",
  compacta:
    '[&_tbody_tr:nth-child(even):not([aria-current="true"])]:bg-cinza-100 ' +
    '[&_tbody_tr:hover:not([aria-current="true"])]:bg-azul-50 ' +
    "[&_th]:px-3 [&_th]:py-1.5 [&_td]:px-3 [&_td]:py-1.5",
};

/** Wrapper com rolagem horizontal própria (a `<table>` nunca estoura a página). */
export function Tabela({
  className,
  densidade = "padrao",
  children,
  ...props
}: TabelaProps) {
  const classes = [CLASSES_BASE, CLASSES_POR_DENSIDADE[densidade], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <table className={classes} {...props}>
        {children}
      </table>
    </div>
  );
}
