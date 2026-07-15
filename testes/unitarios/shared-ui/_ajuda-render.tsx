// Helper de teste para os componentes de `src/shared/ui/` (TASK-050).
//
// Decisão do orquestrador: nenhuma dependência de teste nova (sem
// @testing-library) — monta com `createRoot`/`act` da própria árvore React
// em `document.body` e consulta via DOM nativo (`querySelector` etc.).
// Este arquivo não é um teste; não precisa de `@vitest-environment jsdom`
// (o pragma vai nos arquivos `*.test.tsx` que o importam).

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactElement } from "react";

export interface ResultadoRenderizacao {
  container: HTMLDivElement;
  root: Root;
  /** Re-renderiza o mesmo root com um novo elemento (dentro de `act`). */
  rerenderizar: (elemento: ReactElement) => void;
  /** Desmonta e remove o container do `document.body`. */
  desmontar: () => void;
}

/** Monta `elemento` num `<div>` anexado ao `document.body`. */
export function renderizar(elemento: ReactElement): ResultadoRenderizacao {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(elemento);
  });

  return {
    container,
    root,
    rerenderizar: (novoElemento: ReactElement) => {
      act(() => {
        root.render(novoElemento);
      });
    },
    desmontar: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

export { act };
