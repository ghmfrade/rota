"use client";

// Ícone-carimbo da etapa Viagens e horários (docs-dev/18-DESIGN_SYSTEM.md §4):
// relógio.

import { ATRIBUTOS_SVG_PADRAO, type IconeCarimboProps } from "./tipos";

export function CarimboViagens(props: IconeCarimboProps) {
  return (
    <svg {...ATRIBUTOS_SVG_PADRAO} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
