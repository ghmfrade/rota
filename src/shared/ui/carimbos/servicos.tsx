"use client";

// Ícone-carimbo da etapa Serviços (docs-dev/18-DESIGN_SYSTEM.md §4): ônibus.

import { ATRIBUTOS_SVG_PADRAO, type IconeCarimboProps } from "./tipos";

export function CarimboServicos(props: IconeCarimboProps) {
  return (
    <svg {...ATRIBUTOS_SVG_PADRAO} {...props}>
      <path d="M6 4h12a2 2 0 0 1 2 2v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2Z" />
      <path d="M4 11h16" />
      <path d="M7.5 16v2M16.5 16v2" />
      <circle cx="7.5" cy="19" r="1.25" />
      <circle cx="16.5" cy="19" r="1.25" />
    </svg>
  );
}
