"use client";

// Carimbo base do design system (docs-dev/18-DESIGN_SYSTEM.md §3/§4) — botão
// circular com ícone SVG próprio, usado na sidebar de etapas (stepper) e nos
// cartões da tela inicial. O ícone chega via `children` e herda a cor via
// `currentColor` (ver `src/shared/ui/carimbos/`).

import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface CarimboProps extends ComponentPropsWithoutRef<"button"> {
  /** Rótulo acessível — vira `aria-label` do botão. */
  rotulo: string;
  /** Estado ativo (ex.: etapa atual do stepper). */
  ativo?: boolean;
  children?: ReactNode;
}

const CLASSES_BASE =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-300 " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "[transition:all_var(--transicao-rapida)]";

const CLASSES_REPOUSO =
  "border-cinza-500 bg-transparent text-cinza-500 " +
  "hover:border-azul-600 hover:bg-azul-50 hover:text-azul-600";

const CLASSES_ATIVO = "border-azul-600 bg-azul-600 text-white shadow-sombra-2";

export function Carimbo({
  rotulo,
  ativo = false,
  type = "button",
  className,
  children,
  ...props
}: CarimboProps) {
  const classes = [
    CLASSES_BASE,
    ativo ? CLASSES_ATIVO : CLASSES_REPOUSO,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} aria-label={rotulo} className={classes} {...props}>
      {children}
    </button>
  );
}
