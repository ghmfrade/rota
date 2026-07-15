// Tipo comum aos ícones-carimbo (docs-dev/18-DESIGN_SYSTEM.md §4). Cada
// ícone continua em arquivo próprio; este módulo só evita repetir a
// assinatura de props em cada um.

import type { ComponentPropsWithoutRef } from "react";

export type IconeCarimboProps = ComponentPropsWithoutRef<"svg">;

/** Atributos fixos do catálogo: 24×24, traço uniforme 1.75, sem preenchimento. */
export const ATRIBUTOS_SVG_PADRAO = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
