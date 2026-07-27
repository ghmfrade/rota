"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Campo } from "@/shared/ui";
import { normalizarEntradaHoraMinuto } from "./horario-relogio";
import type { TeclaNavegacaoGrade } from "./montagem-grade";

interface PropsCampoHorarioGrade {
  valor: string;
  rotuloAcessivel: string;
  erro?: string;
  aoConfirmar: (valorNormalizado: string) => boolean;
  aoNavegar?: (tecla: TeclaNavegacaoGrade) => boolean;
  testId?: string;
  atributosNavegacao?: Record<string, string | number>;
  aoSelecionar?: () => void;
}

/**
 * Campo textual da grade: não abre seletor nativo de horário. Aceita digitação
 * com ou sem ":" e mantém o rascunho parcial até confirmar por blur/Tab/Enter.
 */
export function CampoHorarioGrade({
  valor,
  rotuloAcessivel,
  erro,
  aoConfirmar,
  aoNavegar,
  testId,
  atributosNavegacao,
  aoSelecionar,
}: PropsCampoHorarioGrade) {
  const [rascunho, definirRascunho] = useState(valor);
  const ultimoConfirmadoRef = useRef(valor);
  const ignorarProximoBlurRef = useRef(false);

  function confirmar(): boolean {
    const normalizado = normalizarEntradaHoraMinuto(rascunho);
    if (normalizado === null) {
      definirRascunho(valor);
      return false;
    }
    if (normalizado === ultimoConfirmadoRef.current) return true;
    const confirmou = aoConfirmar(normalizado);
    if (confirmou) ultimoConfirmadoRef.current = normalizado;
    definirRascunho(confirmou ? normalizado : valor);
    return confirmou;
  }

  function aoPressionarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Tab" && evento.key !== "Enter") return;
    const tecla = evento.key;
    if (!confirmar()) {
      evento.preventDefault();
      return;
    }
    ignorarProximoBlurRef.current = true;
    const navegou = aoNavegar?.(tecla) ?? false;
    if (!navegou && tecla === "Enter") ignorarProximoBlurRef.current = false;
    if (navegou || tecla === "Enter") evento.preventDefault();
  }

  return (
    <Campo
      type="text"
      densidade="compacta"
      className="min-w-16 tabular-nums"
      aria-label={rotuloAcessivel}
      aria-invalid={erro ? true : undefined}
      value={rascunho}
      inputMode="text"
      autoComplete="off"
      data-testid={testId}
      {...atributosNavegacao}
      onClick={aoSelecionar}
      onFocus={aoSelecionar}
      onChange={(evento) => {
        const entrada = evento.target.value;
        if (/^[0-9:]*$/.test(entrada) && entrada.length <= 5) {
          definirRascunho(entrada);
          const normalizado = normalizarEntradaHoraMinuto(entrada);
          if (normalizado !== null && normalizado !== ultimoConfirmadoRef.current) {
            const confirmou = aoConfirmar(normalizado);
            if (confirmou) {
              ultimoConfirmadoRef.current = normalizado;
              definirRascunho(normalizado);
            } else {
              definirRascunho(valor);
            }
          }
        }
      }}
      onBlur={() => {
        if (ignorarProximoBlurRef.current) {
          ignorarProximoBlurRef.current = false;
          return;
        }
        confirmar();
      }}
      onKeyDown={aoPressionarTecla}
    />
  );
}
