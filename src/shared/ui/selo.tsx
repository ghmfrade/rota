"use client";

// Selo (badge) base do design system (docs-dev/18-DESIGN_SYSTEM.md §3) —
// usado para status (proposta/vigente) e contagens de pendências. A
// distinção erro × alerta usa sempre os tokens `--color-erro`/`--color-alerta`
// (nunca aproximados), conforme doc 18 §2.

import type { ComponentPropsWithoutRef } from "react";

export type TomSelo = "azul" | "neutro" | "erro" | "alerta" | "sucesso";

export interface SeloProps extends ComponentPropsWithoutRef<"span"> {
  tom?: TomSelo;
}

// Tons "suaves" de erro/alerta/sucesso via modificador de opacidade do
// Tailwind sobre o próprio token (`bg-erro/15` etc.) — não introduz nenhum
// hex novo, só consome os tokens de `@theme` (doc 18 §6.3).
const CLASSES_POR_TOM: Record<TomSelo, string> = {
  azul: "bg-azul-100 text-azul-900",
  neutro: "bg-cinza-100 text-cinza-700",
  erro: "bg-erro/15 text-erro",
  alerta: "bg-alerta/15 text-alerta",
  sucesso: "bg-sucesso/15 text-sucesso",
};

export function Selo({ tom = "neutro", className, ...props }: SeloProps) {
  const classes = [
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
    CLASSES_POR_TOM[tom],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={classes} {...props} />;
}
