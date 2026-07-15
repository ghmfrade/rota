"use client";

// Select base do design system (docs-dev/18-DESIGN_SYSTEM.md §3). Encapsula
// um `<select>` nativo — as opções continuam sendo `<option>` filhas
// passadas pelo chamador (nenhuma lógica de listagem aqui). Espelha o
// contrato visual do `Campo` (rótulo/erro).

import { useId } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { classesDeControle, MolduraControle } from "./moldura-controle";

export interface SelectProps extends ComponentPropsWithoutRef<"select"> {
  /** Rótulo exibido acima do controle, associado via `htmlFor`/`id`. */
  rotulo?: string;
  /** Mensagem de erro; quando presente, colore rótulo/borda e é exibida. */
  erro?: string;
}

export function Select({
  rotulo,
  erro,
  id,
  className,
  children,
  ...props
}: SelectProps) {
  const idGerado = useId();
  const idFinal = id ?? idGerado;
  const idMensagemErro = erro ? `${idFinal}-erro` : undefined;

  return (
    <MolduraControle
      rotulo={rotulo}
      erro={erro}
      idControle={idFinal}
      idMensagemErro={idMensagemErro}
    >
      <select
        id={idFinal}
        className={classesDeControle(erro, className)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={idMensagemErro}
        {...props}
      >
        {children}
      </select>
    </MolduraControle>
  );
}
