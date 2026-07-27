"use client";

// Campo de texto base do design system (docs-dev/18-DESIGN_SYSTEM.md §3).
// Encapsula um `<input>` nativo, repassando todas as props (inclusive
// `data-testid`). Sem lógica de negócio — validação de conteúdo continua
// nas etapas que usam o componente; aqui só existe a apresentação do erro
// já calculado (`erro?: string`).

import { useId } from "react";
import type { ComponentPropsWithoutRef } from "react";
import {
  classesDeControle,
  MolduraControle,
  type DensidadeControle,
} from "./moldura-controle";

export interface CampoProps extends ComponentPropsWithoutRef<"input"> {
  /** Rótulo exibido acima do controle, associado via `htmlFor`/`id`. */
  rotulo?: string;
  /** Mensagem de erro; quando presente, colore rótulo/borda e é exibida. */
  erro?: string;
  /** Densidade visual para campos em tabelas compactas. */
  densidade?: DensidadeControle;
}

export function Campo({
  rotulo,
  erro,
  densidade = "padrao",
  id,
  className,
  ...props
}: CampoProps) {
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
      <input
        id={idFinal}
        className={classesDeControle(erro, className, densidade)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={idMensagemErro}
        {...props}
      />
    </MolduraControle>
  );
}
