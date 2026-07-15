"use client";

// Ícone-carimbo da etapa Exportação JSON/PDF (docs-dev/18-DESIGN_SYSTEM.md §4):
// seta de download.

import { ATRIBUTOS_SVG_PADRAO, type IconeCarimboProps } from "./tipos";

export function CarimboExportacao(props: IconeCarimboProps) {
  return (
    <svg {...ATRIBUTOS_SVG_PADRAO} {...props}>
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 18h16" />
    </svg>
  );
}
