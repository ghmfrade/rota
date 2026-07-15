"use client";

// Ícone-carimbo da etapa Identificação (docs-dev/18-DESIGN_SYSTEM.md §4):
// sigla "ID" traçada.

import { ATRIBUTOS_SVG_PADRAO, type IconeCarimboProps } from "./tipos";

export function CarimboIdentificacao(props: IconeCarimboProps) {
  return (
    <svg {...ATRIBUTOS_SVG_PADRAO} {...props}>
      <path d="M5 6v12M11 6v12M11 6h3a6 6 0 0 1 0 12h-3" />
    </svg>
  );
}
