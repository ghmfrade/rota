"use client";

// Tooltip base do design system (docs-dev/18-DESIGN_SYSTEM.md §3). Balão
// flutuante decorativo que segue o cursor — o rótulo acessível continua no
// elemento-alvo (este componente NUNCA substitui `aria-label`/texto do
// filho); por isso o balão nasce `aria-hidden="true"`. Único componente com
// `style=` inline autorizado (posição calculada em runtime a partir do
// mouse — doc 18 §6.1).

import {
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type MouseEvent,
} from "react";

const ATRASO_EXIBICAO_MS = 300;
const OFFSET_CURSOR_PX = 12;

export interface TooltipProps extends ComponentPropsWithoutRef<"span"> {
  /** Conteúdo do balão. Não substitui o rótulo acessível do filho. */
  rotulo: string;
  /** Descrição associada ao alvo por `aria-describedby`, quando necessária. */
  descricaoAcessivel?: string;
}

interface PosicaoBalao {
  left: number;
  top: number;
}

/** Envolve um filho-alvo e exibe `rotulo` num balão que segue o cursor. */
export function Tooltip({
  rotulo,
  children,
  className,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  onFocus,
  onBlur,
  descricaoAcessivel,
  "aria-describedby": ariaDescribedby,
  ...outros
}: TooltipProps) {
  const idDescricao = useId();
  const [visivel, setVisivel] = useState(false);
  const [posicao, setPosicao] = useState<PosicaoBalao>({ left: 0, top: 0 });
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function limparTemporizador() {
    if (temporizadorRef.current !== null) {
      clearTimeout(temporizadorRef.current);
      temporizadorRef.current = null;
    }
  }

  function posicaoDoEvento(evento: MouseEvent<HTMLSpanElement>): PosicaoBalao {
    return {
      left: evento.clientX + OFFSET_CURSOR_PX,
      top: evento.clientY + OFFSET_CURSOR_PX,
    };
  }

  function aoEntrarMouse(evento: MouseEvent<HTMLSpanElement>) {
    setPosicao(posicaoDoEvento(evento));
    limparTemporizador();
    temporizadorRef.current = setTimeout(() => {
      setVisivel(true);
    }, ATRASO_EXIBICAO_MS);
    onMouseEnter?.(evento);
  }

  function aoMoverMouse(evento: MouseEvent<HTMLSpanElement>) {
    setPosicao(posicaoDoEvento(evento));
    onMouseMove?.(evento);
  }

  function aoSairMouse(evento: MouseEvent<HTMLSpanElement>) {
    limparTemporizador();
    setVisivel(false);
    onMouseLeave?.(evento);
  }

  function aoReceberFoco(evento: FocusEvent<HTMLSpanElement>) {
    limparTemporizador();
    const caixa = evento.currentTarget.getBoundingClientRect();
    setPosicao({ left: caixa.left, top: caixa.bottom + OFFSET_CURSOR_PX });
    setVisivel(true);
    onFocus?.(evento);
  }

  function aoPerderFoco(evento: FocusEvent<HTMLSpanElement>) {
    limparTemporizador();
    setVisivel(false);
    onBlur?.(evento);
  }

  const classesWrapper = ["inline-block", className].filter(Boolean).join(" ");

  return (
    <span
      className={classesWrapper}
      onMouseEnter={aoEntrarMouse}
      onMouseMove={aoMoverMouse}
      onMouseLeave={aoSairMouse}
      onFocus={aoReceberFoco}
      onBlur={aoPerderFoco}
      aria-describedby={
        [ariaDescribedby, descricaoAcessivel ? idDescricao : undefined]
          .filter(Boolean)
          .join(" ") || undefined
      }
      {...outros}
    >
      {children}
      {descricaoAcessivel && (
        <span id={idDescricao} className="sr-only">
          {descricaoAcessivel}
        </span>
      )}
      <span
        aria-hidden="true"
        data-testid="tooltip-balao"
        className={
          "fixed z-50 rounded-controle bg-cinza-900 px-2 py-1 text-xs text-white shadow-sombra-3 " +
          "pointer-events-none [transition:opacity_var(--transicao-rapida)] " +
          (visivel ? "opacity-100" : "opacity-0")
        }
        style={{ left: posicao.left, top: posicao.top }}
      >
        {rotulo}
      </span>
    </span>
  );
}
