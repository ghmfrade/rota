"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Painel } from "./painel";

export interface DialogoProps {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  "data-testid"?: string;
}

/** Diálogo modal acessível para confirmações e escolhas efêmeras da interface. */
export function Dialogo({ titulo, aoFechar, children, "data-testid": dataTestId }: DialogoProps) {
  const dialogoRef = useRef<HTMLDivElement | null>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    focoAnteriorRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogoRef.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      focoAnteriorRef.current?.focus();
    };
  }, [aoFechar]);

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
