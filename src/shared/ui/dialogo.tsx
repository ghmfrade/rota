"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Painel } from "./painel";

const SELETOR_ELEMENTO_FOCAVEL = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface DialogoProps {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  "data-testid"?: string;
}

/** Diálogo modal acessível para confirmações e escolhas efêmeras da interface. */
export function Dialogo({ titulo, aoFechar, children, "data-testid": dataTestId }: DialogoProps) {
  const dialogoRef = useRef<HTMLDivElement | null>(null);
  const aoFecharRef = useRef(aoFechar);

  useEffect(() => {
    aoFecharRef.current = aoFechar;
  }, [aoFechar]);

  useEffect(() => {
    const focoAnterior =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogoRef.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        aoFecharRef.current();
        return;
      }
      if (evento.key !== "Tab" || !dialogoRef.current) return;

      const elementosFocaveis = Array.from(
        dialogoRef.current.querySelectorAll<HTMLElement>(SELETOR_ELEMENTO_FOCAVEL),
      ).filter((elemento) => !elemento.hidden && elemento.getAttribute("aria-hidden") !== "true");

      if (elementosFocaveis.length === 0) {
        evento.preventDefault();
        dialogoRef.current.focus();
        return;
      }

      const primeiro = elementosFocaveis[0];
      const ultimo = elementosFocaveis[elementosFocaveis.length - 1];
      const focoAtual = document.activeElement;
      const focoForaDoDialogo =
        !(focoAtual instanceof Node) || !dialogoRef.current.contains(focoAtual);

      if (evento.shiftKey && (focoAtual === primeiro || focoAtual === dialogoRef.current || focoForaDoDialogo)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (focoAtual === ultimo || focoForaDoDialogo)) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      if (focoAnterior?.isConnected) focoAnterior.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cinza-900/30 p-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        data-testid={dataTestId}
      >
        <Painel titulo={titulo} elevacao="flutuante" className="w-full max-w-md">
          {children}
        </Painel>
      </div>
    </div>
  );
}
