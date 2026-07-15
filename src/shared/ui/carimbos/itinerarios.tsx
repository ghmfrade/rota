"use client";

// Ícone-carimbo da etapa Seções, Locais e Itinerários (docs-dev/18-DESIGN_SYSTEM.md §4):
// mapinha com dobras e traçado de rota.

import { ATRIBUTOS_SVG_PADRAO, type IconeCarimboProps } from "./tipos";

export function CarimboItinerarios(props: IconeCarimboProps) {
  return (
    <svg {...ATRIBUTOS_SVG_PADRAO} {...props}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
      <path d="M6 10c2 1 4-1 6 0s4-1 6 0" />
    </svg>
  );
}
