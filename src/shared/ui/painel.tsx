"use client";

// Painel base do design system (docs-dev/18-DESIGN_SYSTEM.md §3). Superfície
// branca reutilizada por telas e etapas para agrupar conteúdo; a variante
// `colapsavel` preserva o padrão nativo `<details>/<summary>` já usado no
// app (ex.: painel de pendências).

import type { ComponentPropsWithoutRef, ReactNode } from "react";

export interface PainelProps extends ComponentPropsWithoutRef<"section"> {
  /** Título exibido no cabeçalho (ou no `<summary>`, se `colapsavel`). */
  titulo?: string;
  /** Renderiza `<details>/<summary>` em vez de `<section>`. */
  colapsavel?: boolean;
  /** Estado de abertura repassado ao `<details>` (uso controlado). */
  aberto?: boolean;
  /** Estado inicial do `<details>` (uso não controlado). */
  defaultOpen?: boolean;
  children?: ReactNode;
}

const CLASSES_SUPERFICIE =
  "rounded-painel border border-cinza-200 bg-white shadow-sombra-2 p-4";

export function Painel({
  titulo,
  colapsavel = false,
  aberto,
  defaultOpen,
  className,
  children,
  ...props
}: PainelProps) {
  const classes = [CLASSES_SUPERFICIE, className].filter(Boolean).join(" ");

  if (colapsavel) {
    return (
      <details className={classes} open={aberto ?? defaultOpen} {...props}>
        {titulo ? (
          <summary className="cursor-pointer text-lg font-semibold text-cinza-900 [transition:all_var(--transicao-rapida)]">
            {titulo}
          </summary>
        ) : null}
        {children}
      </details>
    );
  }

  return (
    <section className={classes} {...props}>
      {titulo ? (
        <h2 className="mb-2 text-lg font-semibold text-cinza-900">{titulo}</h2>
      ) : null}
      {children}
    </section>
  );
}
