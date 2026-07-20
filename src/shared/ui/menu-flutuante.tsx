"use client";

// Menu flutuante efêmero do design system (docs-dev/18 §3/§5). Não cria
// backdrop nem ocupa a superfície do mapa: somente a caixa visível intercepta
// interação. A posição é dinâmica porque nasce do ponto clicado em runtime,
// exceção expressamente admitida pelo doc 18 §6.1.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Botao } from "./botao";

export interface AncoraMenuFlutuante {
  /** Coordenadas client (viewport), em pixels, do gesto que abriu o menu. */
  x: number;
  y: number;
}

export interface OpcaoMenuFlutuante {
  id: string;
  rotulo: string;
  aoSelecionar: () => void;
}

export interface MenuFlutuanteProps {
  ancora: AncoraMenuFlutuante;
  opcoes: readonly OpcaoMenuFlutuante[];
  aoFechar: () => void;
  rotuloAcessivel: string;
  "data-testid"?: string;
}

const MARGEM_VIEWPORT = 8;

/** Menu acessível, posicionado junto ao gesto e fechado sem efeitos colaterais. */
export function MenuFlutuante({
  ancora,
  opcoes,
  aoFechar,
  rotuloAcessivel,
  "data-testid": dataTestId,
}: MenuFlutuanteProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const botoesRef = useRef<Array<HTMLButtonElement | null>>([]);
  const aoFecharRef = useRef(aoFechar);
  const [posicao, definirPosicao] = useState(ancora);

  useEffect(() => {
    aoFecharRef.current = aoFechar;
  }, [aoFechar]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const caixa = menu.getBoundingClientRect();
    definirPosicao({
      x: Math.max(
        MARGEM_VIEWPORT,
        Math.min(ancora.x, window.innerWidth - caixa.width - MARGEM_VIEWPORT),
      ),
      y: Math.max(
        MARGEM_VIEWPORT,
        Math.min(ancora.y, window.innerHeight - caixa.height - MARGEM_VIEWPORT),
      ),
    });
  }, [ancora.x, ancora.y, opcoes.length]);

  useEffect(() => {
    const focoAnterior =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    botoesRef.current[0]?.focus();

    function fecharAoClicarFora(evento: PointerEvent) {
      if (!menuRef.current?.contains(evento.target as Node)) {
        aoFecharRef.current();
      }
    }

    document.addEventListener("pointerdown", fecharAoClicarFora);
    return () => {
      document.removeEventListener("pointerdown", fecharAoClicarFora);
      focoAnterior?.focus();
    };
  }, []);

  function lidarTeclado(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      aoFecharRef.current();
      return;
    }

    const indiceAtual = botoesRef.current.findIndex(
      (botao) => botao === document.activeElement,
    );
    let proximoIndice: number | undefined;
    if (evento.key === "ArrowDown") {
      proximoIndice = (indiceAtual + 1) % opcoes.length;
    } else if (evento.key === "ArrowUp") {
      proximoIndice = (indiceAtual - 1 + opcoes.length) % opcoes.length;
    } else if (evento.key === "Home") {
      proximoIndice = 0;
    } else if (evento.key === "End") {
      proximoIndice = opcoes.length - 1;
    }
    if (proximoIndice !== undefined) {
      evento.preventDefault();
      botoesRef.current[proximoIndice]?.focus();
    }
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={rotuloAcessivel}
      data-testid={dataTestId}
      onKeyDown={lidarTeclado}
      className="fixed z-50 flex min-w-40 flex-col gap-1 rounded-controle border border-cinza-200 bg-white p-2 shadow-sombra-3"
      style={{ left: posicao.x, top: posicao.y }}
    >
      {opcoes.map((opcao, indice) => (
        <Botao
          key={opcao.id}
          ref={(elemento) => {
            botoesRef.current[indice] = elemento;
          }}
          role="menuitem"
          variante="fantasma"
          className="w-full"
          onClick={() => {
            opcao.aoSelecionar();
            aoFecharRef.current();
          }}
        >
          {opcao.rotulo}
        </Botao>
      ))}
    </div>
  );
}
