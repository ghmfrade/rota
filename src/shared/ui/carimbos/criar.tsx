"use client";

// Ícone-carimbo da tela inicial — Criar Autos do zero
// (docs-dev/18-DESIGN_SYSTEM.md §4): folha nova.

import { ATRIBUTOS_SVG_PADRAO, type IconeCarimboProps } from "./tipos";

export function CarimboCriar(props: IconeCarimboProps) {
  return (
    <svg {...ATRIBUTOS_SVG_PADRAO} {...props}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <path d="M12 12v6M9 15h6" />
    </svg>
  );
}
