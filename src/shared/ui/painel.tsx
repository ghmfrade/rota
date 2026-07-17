"use client";

// Painel base do design system (docs-dev/18-DESIGN_SYSTEM.md §3). Superfície
// reutilizada por telas e etapas para agrupar conteúdo; a variante
// `colapsavel` preserva o padrão nativo `<details>/<summary>` já usado no
// app (ex.: painel de pendências).
//
// As variações de superfície são props (`tom`, `elevacao`) — nunca classes
// sobrepostas por `className`. Motivo: utilitários Tailwind conflitantes de
// mesma especificidade resolvem-se pela ordem de emissão no CSS, não pela
// ordem na string de classes; um `className="border-azul-600"` por cima do
// `border-cinza-200` daqui perde em silêncio (a cor sai cinza, sem erro nem
// teste vermelho). Com as variantes, cada propriedade é emitida uma vez só,
// escolhida aqui dentro. `className` segue livre para posição/espaçamento
// (`mx-6`, `mt-4`, `text-sm`), que não disputam com nada deste componente.

import type { ComponentPropsWithoutRef, ReactNode } from "react";

/** Superfície do painel (doc 18 §2/§3). */
export type TomPainel = "padrao" | "informativo" | "destacado";

/**
 * Profundidade do painel (doc 18 §2 — sombra-3 só para flutuantes).
 * `plana` — sem sombra própria, só a borda: para painel aninhado dentro de
 * outro `Painel` (a sombra do pai já dá profundidade; duas sombras empilhadas
 * não são o pretendido — parecer da TASK-053, achado 2, fechado pela TASK-056).
 */
export type ElevacaoPainel = "padrao" | "flutuante" | "plana";

export interface PainelProps extends ComponentPropsWithoutRef<"section"> {
  /** Título exibido no cabeçalho (ou no `<summary>`, se `colapsavel`). */
  titulo?: string;
  /** Renderiza `<details>/<summary>` em vez de `<section>`. */
  colapsavel?: boolean;
  /** Estado de abertura repassado ao `<details>` (uso controlado). */
  aberto?: boolean;
  /** Estado inicial do `<details>` (uso não controlado). */
  defaultOpen?: boolean;
  /**
   * `padrao` — superfície branca com borda `cinza-200`.
   * `informativo` — aviso azul suave (borda `azul-300`, fundo `azul-50`).
   * `destacado` — caminho recomendado (borda + anel `azul-600`), Spec 04 §3.
   */
  tom?: TomPainel;
  /**
   * `padrao` usa `sombra-2`; `flutuante` usa `sombra-3`, reservada a
   * diálogos/tooltips (doc 18 §2); `plana` não emite sombra (painel aninhado).
   */
  elevacao?: ElevacaoPainel;
  /**
   * Superfície de ação inteira (TASK-073): cursor de ponteiro, hover
   * (`sombra-2`→hover mais forte + leve tom de fundo) e anel de foco via
   * `focus-within` — o alvo de teclado continua sendo o controle interno
   * (input/botão), nunca o `Painel` em si (evita `role`/controle duplicado).
   * Não usa `ring-*` para não colidir com o anel do `tom="destacado"`.
   */
  interativo?: boolean;
  children?: ReactNode;
}

const CLASSES_BASE = "rounded-painel border p-4";

const CLASSES_POR_TOM: Record<TomPainel, string> = {
  padrao: "border-cinza-200 bg-white",
  informativo: "border-azul-300 bg-azul-50 text-azul-900",
  destacado: "border-azul-600 bg-white ring-2 ring-azul-600",
};

const CLASSES_POR_ELEVACAO: Record<ElevacaoPainel, string> = {
  padrao: "shadow-sombra-2",
  flutuante: "shadow-sombra-3",
  plana: "",
};

const CLASSES_INTERATIVO =
  "cursor-pointer [transition:all_var(--transicao-rapida)] " +
  "hover:shadow-sombra-2 hover:bg-cinza-50 " +
  "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-azul-300";

export function Painel({
  titulo,
  colapsavel = false,
  aberto,
  defaultOpen,
  tom = "padrao",
  elevacao = "padrao",
  interativo = false,
  className,
  children,
  ...props
}: PainelProps) {
  const classes = [
    CLASSES_BASE,
    CLASSES_POR_TOM[tom],
    CLASSES_POR_ELEVACAO[elevacao],
    interativo ? CLASSES_INTERATIVO : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

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
