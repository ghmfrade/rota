"use client";

// Ícone-carimbo da etapa Revisão (docs-dev/18-DESIGN_SYSTEM.md §4):
// lista com check.

import { ATRIBUTOS_SVG_PADRAO, type IconeCarimboProps } from "./tipos";

export function CarimboRevisao(props: IconeCarimboProps) {
  return (
    <svg {...ATRIBUTOS_SVG_PADRAO} {...props}>
      <path d="M4 6h9M4 12h9M4 18h9" />
      <path d="M16 6l1.5 1.5L20 5" />
      <path d="M16 12l1.5 1.5L20 11" />
      <path d="M16 18l1.5 1.5L20 17" />
    </svg>
  );
}
