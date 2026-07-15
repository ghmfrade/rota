"use client";

// Moldura comum dos controles de formulário (Campo/Select): rótulo
// associado por `htmlFor`, mensagem de erro e classes compartilhadas do
// contrato visual (docs-dev/18-DESIGN_SYSTEM.md §3). Módulo interno de
// `shared/ui` — não exportado no barrel.

import type { ReactNode } from "react";

export function classesDeRotulo(erro?: string): string {
  return ["text-xs", erro ? "text-erro" : "text-cinza-500"].join(" ");
}

export function classesDeControle(erro?: string, className?: string): string {
  return [
    "w-full rounded-controle border bg-white px-3 py-2 text-sm text-cinza-700",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-300",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "[transition:all_var(--transicao-rapida)]",
    erro ? "border-erro" : "border-cinza-200",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

interface MolduraControleProps {
  /** Rótulo exibido acima do controle, associado via `htmlFor`. */
  rotulo?: string;
  /** Mensagem de erro; quando presente, é exibida abaixo do controle. */
  erro?: string;
  /** `id` do controle filho, alvo do `htmlFor` do rótulo. */
  idControle: string;
  /** `id` da mensagem de erro (referenciado pelo `aria-describedby` do filho). */
  idMensagemErro?: string;
  children: ReactNode;
}

export function MolduraControle({
  rotulo,
  erro,
  idControle,
  idMensagemErro,
  children,
}: MolduraControleProps) {
  return (
    <div className="flex flex-col gap-1">
      {rotulo ? (
        <label htmlFor={idControle} className={classesDeRotulo(erro)}>
          {rotulo}
        </label>
      ) : null}
      {children}
      {erro ? (
        <span id={idMensagemErro} className="text-xs text-erro">
          {erro}
        </span>
      ) : null}
    </div>
  );
}
