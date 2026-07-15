"use client";

// Carimbo base do design system (docs-dev/18-DESIGN_SYSTEM.md §3/§4) — botão
// circular com ícone SVG próprio, usado na sidebar de etapas (stepper). O
// ícone chega via `children` e herda a cor via `currentColor` (ver
// `src/shared/ui/carimbos/`).
//
// A forma e os tons vêm de `moldura-carimbo` — mesma fonte usada pela
// `MolduraCarimbo` decorativa dos cartões da tela inicial, que é quem atende o
// caso não interativo (este componente é sempre um `<button>` focável, com
// `rotulo` obrigatório).

import type { ComponentPropsWithoutRef, ReactNode } from "react";

import {
  CLASSES_MOLDURA_CARIMBO,
  CLASSES_POR_TOM_CARIMBO,
} from "./moldura-carimbo";

export interface CarimboProps extends ComponentPropsWithoutRef<"button"> {
  /** Rótulo acessível — vira `aria-label` do botão. */
  rotulo: string;
  /** Estado ativo (ex.: etapa atual do stepper). */
  ativo?: boolean;
  children?: ReactNode;
}

const CLASSES_BASE =
  `${CLASSES_MOLDURA_CARIMBO} size-11 ` +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-300 " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "[transition:all_var(--transicao-rapida)]";

const CLASSES_REPOUSO =
  `${CLASSES_POR_TOM_CARIMBO.repouso} ` +
  "hover:border-azul-600 hover:bg-azul-50 hover:text-azul-600";

const CLASSES_ATIVO = CLASSES_POR_TOM_CARIMBO.ativo;

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
