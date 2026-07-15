"use client";

// Moldura circular do carimbo (docs-dev/18-DESIGN_SYSTEM.md §3/§4, DEC-050(d))
// — o círculo de borda 2px que envolve os ícones-carimbo, e a paleta dos seus
// tons. Fonte única da forma: o `Carimbo` (botão do stepper) e a
// `MolduraCarimbo` (decorativa, cartões da tela inicial) compõem daqui, para o
// círculo não existir desenhado em dois lugares e divergir com o tempo.
//
// Por que dois componentes e não um: o `Carimbo` é um `<button>` com `rotulo`
// obrigatório (vira `aria-label`) — usá-lo como enfeite dentro de um cartão
// injetaria um botão focável que não faz nada, contrariando o doc 18 §1.2
// ("comportamento intocável"). A `MolduraCarimbo` é só apresentação: nasce
// `aria-hidden` porque o ícone é sempre redundante com o rótulo textual ao lado.
//
// O tamanho não entra nas classes compartilhadas: cada consumidor emite o seu
// (`size-11` no botão, `size-12` na moldura decorativa). Se a base já trouxesse
// um `size-*`, o do consumidor disputaria com ele e a resolução dependeria da
// ordem de emissão no CSS — o mesmo modo de falha silenciosa que as variantes
// do `Painel` eliminam.

import type { ComponentPropsWithoutRef, ReactNode } from "react";

/** Tons do carimbo (doc 18 §3): repouso, realce e ativo. */
export type TomCarimbo = "repouso" | "destaque" | "ativo";

/** Forma do carimbo — círculo de borda 2px, sem tamanho e sem tom. */
export const CLASSES_MOLDURA_CARIMBO =
  "inline-flex shrink-0 items-center justify-center rounded-full border-2";

export const CLASSES_POR_TOM_CARIMBO: Record<TomCarimbo, string> = {
  repouso: "border-cinza-500 bg-transparent text-cinza-500",
  destaque: "border-azul-600 bg-azul-50 text-azul-600",
  ativo: "border-azul-600 bg-azul-600 text-white shadow-sombra-2",
};

export interface MolduraCarimboProps extends ComponentPropsWithoutRef<"span"> {
  tom?: TomCarimbo;
  children?: ReactNode;
}

/**
 * Moldura circular **decorativa** (não interativa) para os ícones-carimbo.
 * Sempre `aria-hidden`: quem precisa de um carimbo clicável usa `Carimbo`.
 */
export function MolduraCarimbo({
  tom = "repouso",
  className,
  ...props
}: MolduraCarimboProps) {
  const classes = [
    CLASSES_MOLDURA_CARIMBO,
    "size-12",
    CLASSES_POR_TOM_CARIMBO[tom],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span aria-hidden="true" className={classes} {...props} />;
}
