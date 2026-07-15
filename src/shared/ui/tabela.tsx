"use client";

// Tabela base do design system (docs-dev/18-DESIGN_SYSTEM.md §3). Só o
// wrapper e a decoração (cabeçalho fixo, zebra, hover) vêm daqui — a
// estrutura semântica `<table>/<thead>/<tbody>/<tr>/<td>` continua sendo do
// chamador, para não alterar comportamento/acessibilidade de tabelas
// existentes.

import type { ComponentPropsWithoutRef } from "react";

export type TabelaProps = ComponentPropsWithoutRef<"table">;

const CLASSES_TABELA =
  "w-full border-collapse text-sm " +
  "[&_thead]:sticky [&_thead]:top-0 [&_thead]:bg-cinza-100 " +
  "[&_tbody_tr]:[transition:background-color_var(--transicao-rapida)] " +
  "[&_tbody_tr:nth-child(even)]:bg-cinza-50 " +
  "[&_tbody_tr:hover]:bg-azul-50 " +
  "[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 " +
  "[&_th]:text-left [&_th]:text-sm [&_td]:text-sm";

/** Wrapper com rolagem horizontal própria (a `<table>` nunca estoura a página). */
export function Tabela({ className, children, ...props }: TabelaProps) {
  const classes = [CLASSES_TABELA, className].filter(Boolean).join(" ");

  return (
    <div className="overflow-x-auto">
      <table className={classes} {...props}>
        {children}
      </table>
    </div>
  );
}
