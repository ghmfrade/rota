"use client";

// Ícone-carimbo da etapa Matrizes (docs-dev/18-DESIGN_SYSTEM.md §4):
// grade triangular.

import { ATRIBUTOS_SVG_PADRAO, type IconeCarimboProps } from "./tipos";

export function CarimboMatrizes(props: IconeCarimboProps) {
  return (
    <svg {...ATRIBUTOS_SVG_PADRAO} {...props}>
      <path d="M12 4 20 20H4Z" />
      <path d="M8 20 12 12 16 20" />
      <path d="M10 20 12 16 14 20" />
    </svg>
  );
}
