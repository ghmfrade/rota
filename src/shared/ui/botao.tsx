"use client";

// Botão base do design system (docs-dev/18-DESIGN_SYSTEM.md §3). Componente
// puro de apresentação — nenhuma lógica de negócio, nenhum import fora de
// `shared/`. Variantes visuais via prop `variante`; todo o resto (type,
// handlers, data-testid, aria-*) é repassado das props nativas de `<button>`
// sem ser sobrescrito.

import type { ButtonHTMLAttributes, ComponentPropsWithoutRef } from "react";

export type VarianteBotao = "primario" | "secundario" | "perigo" | "fantasma";

export interface BotaoProps extends ComponentPropsWithoutRef<"button"> {
  variante?: VarianteBotao;
}

const CLASSES_BASE =
  "inline-flex items-center justify-center gap-2 rounded-controle text-sm font-medium " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-300 " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "px-4 py-2 [transition:all_var(--transicao-rapida)]";

const CLASSES_POR_VARIANTE: Record<VarianteBotao, string> = {
  primario:
    "bg-azul-600 text-white shadow-sombra-1 " +
    "hover:bg-azul-700 hover:shadow-sombra-2 hover:-translate-y-px",
  secundario:
    "border border-cinza-200 bg-white text-cinza-700 " +
    "hover:bg-cinza-50",
  perigo: "bg-erro text-white shadow-sombra-1 hover:shadow-sombra-2",
  fantasma: "border-0 bg-transparent text-cinza-700 hover:bg-cinza-100",
};

/** Botão de ação do formulário/comparador, nas 4 variantes do doc 18 §3. */
export function Botao({
  variante = "secundario",
  type = "button" as ButtonHTMLAttributes<HTMLButtonElement>["type"],
  className,
  ...props
}: BotaoProps) {
  const classes = [CLASSES_BASE, CLASSES_POR_VARIANTE[variante], className]
    .filter(Boolean)
    .join(" ");

  return <button type={type} className={classes} {...props} />;
}
