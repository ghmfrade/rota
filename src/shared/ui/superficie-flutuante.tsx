"use client";

// Superfície flutuante ancorada do design system (docs-dev/18 §3/§5;
// DEC-100/TASK-121). Diferente do `MenuFlutuante`, carrega conteúdo arbitrário
// — inclusive formulário —, não rouba o foco ao abrir e não fecha por clique
// fora: quem governa a abertura é o chamador (hover/foco da âncora).
//
// Usa `position: fixed` para escapar do recorte de qualquer ancestral com
// `overflow` (ex.: o wrapper de rolagem da `Tabela`) sem sair da subárvore do
// elemento âncora — `data-testid`/`aria-*` continuam sendo encontrados dentro
// da célula que os declara. A âncora é o **elemento pai** onde a superfície é
// declarada; a posição é dinâmica porque nasce de medição em runtime, exceção
// expressamente admitida pelo doc 18 §6.1.
//
// A largura também pode nascer dessa mesma medição (`larguraDaAncora`,
// DEC-102/TASK-124): a superfície assume a largura da célula que a ancora, com
// piso de legibilidade dado pelo `min-content` do próprio conteúdo.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
} from "react";

export type LadoSuperficieFlutuante = "acima" | "abaixo" | "direita" | "esquerda";

/** Empilhamento entre superfícies que podem se sobrepor após reposicionar. */
export type EmpilhamentoSuperficie = "padrao" | "prioritaria";

export interface RetanguloSuperficie {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface PosicaoSuperficieFlutuante {
  x: number;
  y: number;
  lado: LadoSuperficieFlutuante;
}

/** Folga mínima entre a superfície e a borda da área útil. */
const MARGEM_LIMITE = 8;

const LADO_OPOSTO: Record<LadoSuperficieFlutuante, LadoSuperficieFlutuante> = {
  acima: "abaixo",
  abaixo: "acima",
  direita: "esquerda",
  esquerda: "direita",
};

function coordenadaNoLado(
  ancora: RetanguloSuperficie,
  caixa: { largura: number; altura: number },
  lado: LadoSuperficieFlutuante,
): { x: number; y: number } {
  // Nos lados verticais a caixa encosta na borda direita da âncora — nunca é
  // centrada. É o que mantém a superfície fora da faixa lateral ocupada por
  // outra superfície da mesma âncora (a coluna de ações da Viagem, doc 18 §3).
  const xVertical = ancora.x + ancora.largura - caixa.largura;
  switch (lado) {
    case "acima":
      return { x: xVertical, y: ancora.y - caixa.altura };
    case "abaixo":
      return { x: xVertical, y: ancora.y + ancora.altura };
    case "direita":
      return { x: ancora.x + ancora.largura, y: ancora.y };
    case "esquerda":
      return { x: ancora.x - caixa.largura, y: ancora.y };
  }
}

function cabeNoLimite(
  coordenada: { x: number; y: number },
  caixa: { largura: number; altura: number },
  limite: RetanguloSuperficie,
): boolean {
  return (
    coordenada.x >= limite.x + MARGEM_LIMITE &&
    coordenada.y >= limite.y + MARGEM_LIMITE &&
    coordenada.x + caixa.largura <= limite.x + limite.largura - MARGEM_LIMITE &&
    coordenada.y + caixa.altura <= limite.y + limite.altura - MARGEM_LIMITE
  );
}

function prender(valor: number, minimo: number, maximo: number): number {
  // Superfície maior que a área útil: a borda inicial vence, para não empurrar
  // o conteúdo para fora do lado oposto.
  return Math.max(minimo, Math.min(valor, maximo));
}

/**
 * Escolhe o lado e as coordenadas da superfície: tenta o lado preferido, inverte
 * para o oposto quando não couber e, em último caso, prende a caixa dentro da
 * área útil. Função pura — toda a geometria da TASK-121 é testável sem DOM.
 */
export function posicionarSuperficieFlutuante(
  ancora: RetanguloSuperficie,
  caixa: { largura: number; altura: number },
  limite: RetanguloSuperficie,
  ladoPreferido: LadoSuperficieFlutuante,
): PosicaoSuperficieFlutuante {
  const candidatos: LadoSuperficieFlutuante[] = [
    ladoPreferido,
    LADO_OPOSTO[ladoPreferido],
  ];
  const escolhido =
    candidatos.find((lado) =>
      cabeNoLimite(coordenadaNoLado(ancora, caixa, lado), caixa, limite),
    ) ?? ladoPreferido;

  const coordenada = coordenadaNoLado(ancora, caixa, escolhido);
  return {
    lado: escolhido,
    x: prender(
      coordenada.x,
      limite.x + MARGEM_LIMITE,
      limite.x + limite.largura - MARGEM_LIMITE - caixa.largura,
    ),
    y: prender(
      coordenada.y,
      limite.y + MARGEM_LIMITE,
      limite.y + limite.altura - MARGEM_LIMITE - caixa.altura,
    ),
  };
}

/** Área útil = interseção da viewport com o retângulo do limite informado. */
function areaUtil(limite: HTMLElement | null): RetanguloSuperficie {
  const viewport: RetanguloSuperficie = {
    x: 0,
    y: 0,
    largura: window.innerWidth,
    altura: window.innerHeight,
  };
  if (!limite) return viewport;
  const caixa = limite.getBoundingClientRect();
  const esquerda = Math.max(viewport.x, caixa.left);
  const topo = Math.max(viewport.y, caixa.top);
  const direita = Math.min(viewport.x + viewport.largura, caixa.right);
  const base = Math.min(viewport.y + viewport.altura, caixa.bottom);
  if (direita <= esquerda || base <= topo) return viewport;
  return {
    x: esquerda,
    y: topo,
    largura: direita - esquerda,
    altura: base - topo,
  };
}

export interface SuperficieFlutuanteProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children" | "style"> {
  /** Governada pelo chamador (hover/foco da âncora) — a superfície não se fecha sozinha. */
  aberta: boolean;
  /** Lado tentado primeiro; o oposto entra quando não houver espaço. */
  ladoPreferido?: LadoSuperficieFlutuante;
  /**
   * `prioritaria` fica por cima de outra superfície que se reposicione sobre
   * ela e continua clicável (doc 18 §6.4 — variação por prop, não `className`).
   */
  empilhamento?: EmpilhamentoSuperficie;
  /** Elemento que delimita a área útil; sem ele, vale só a viewport. */
  limiteRef?: RefObject<HTMLElement | null>;
  /**
   * Assume a largura da âncora, medida em runtime (DEC-102). O piso de
   * legibilidade é o `min-content` do conteúdo: coluna mais estreita que ele
   * faz a superfície transbordar o mínimo indispensável, nunca truncar.
   * Fora dessas superfícies a largura continua vindo do conteúdo.
   */
  larguraDaAncora?: boolean;
  rotuloAcessivel: string;
  children: ReactNode;
}

export function SuperficieFlutuante({
  aberta,
  ladoPreferido = "abaixo",
  empilhamento = "padrao",
  limiteRef,
  larguraDaAncora = false,
  rotuloAcessivel,
  className,
  children,
  ...resto
}: SuperficieFlutuanteProps) {
  const caixaRef = useRef<HTMLDivElement | null>(null);
  const [posicao, definirPosicao] = useState<PosicaoSuperficieFlutuante | null>(null);
  const [largura, definirLargura] = useState<number | null>(null);

  const reposicionar = useCallback(() => {
    const caixa = caixaRef.current;
    const ancora = caixa?.parentElement;
    if (!caixa || !ancora) return;
    const retanguloAncora = ancora.getBoundingClientRect();
    // A largura sai da mesma medição da âncora que já governa a posição
    // (DEC-102). Aplicá-la muda a caixa, por isso a posição é recalculada no
    // passe seguinte, ainda antes da pintura — `largura` é dependência do
    // efeito de layout abaixo. Não há realimentação: a largura depende só da
    // âncora, nunca da própria caixa.
    if (larguraDaAncora) {
      definirLargura((atual) =>
        atual === retanguloAncora.width ? atual : retanguloAncora.width,
      );
    }
    const propria = caixa.getBoundingClientRect();
    const proxima = posicionarSuperficieFlutuante(
      {
        x: retanguloAncora.left,
        y: retanguloAncora.top,
        largura: retanguloAncora.width,
        altura: retanguloAncora.height,
      },
      { largura: propria.width, altura: propria.height },
      areaUtil(limiteRef?.current ?? null),
      ladoPreferido,
    );
    definirPosicao((atual) =>
      atual && atual.x === proxima.x && atual.y === proxima.y && atual.lado === proxima.lado
        ? atual
        : proxima,
    );
  }, [ladoPreferido, limiteRef, larguraDaAncora]);

  // Fechada não mede nada: a grade pode ter dezenas de superfícies latentes e
  // nenhuma delas participa de rolagem, redimensionamento ou layout. A posição
  // guardada também não é aplicada enquanto fechada — reabrir remede antes da
  // pintura, sem precisar zerar estado por efeito.
  useLayoutEffect(() => {
    if (!aberta) return;
    reposicionar();
  }, [aberta, reposicionar, largura]);

  useEffect(() => {
    if (!aberta) return;
    // Segunda medição após a pintura: o conteúdo pode assentar depois do
    // primeiro layout (campos, rótulos) e mudar a largura da caixa.
    reposicionar();
    // Captura: a rolagem que importa é a do wrapper `overflow-x-auto` da
    // `Tabela` e a da área de etapa, não só a da janela.
    window.addEventListener("resize", reposicionar);
    window.addEventListener("scroll", reposicionar, true);
    const observador =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => reposicionar());
    if (observador && caixaRef.current) observador.observe(caixaRef.current);
    return () => {
      window.removeEventListener("resize", reposicionar);
      window.removeEventListener("scroll", reposicionar, true);
      observador?.disconnect();
    };
  }, [aberta, reposicionar]);

  const classes = [
    "fixed rounded-controle border border-cinza-200 bg-white p-1 shadow-sombra-3",
    empilhamento === "prioritaria" ? "z-50" : "z-40",
    // Piso de legibilidade da DEC-102: com a largura vinda da âncora, o
    // `min-content` do conteúdo impede truncar `HH:MM` ou encolher o botão —
    // desde que o conteúdo o proteja de fato: as faixas de grid do chamador
    // precisam usar `minmax(min-content,…)`, não `minmax(0,…)`, senão o
    // `min-content` do contêiner ignora o campo (TASK-124, revisão).
    larguraDaAncora ? "min-w-min" : null,
    "[transition:opacity_var(--transicao-rapida)]",
    aberta ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={caixaRef}
      role="group"
      aria-label={rotuloAcessivel}
      data-lado={aberta ? posicao?.lado : undefined}
      className={classes}
      style={
        aberta && posicao
          ? {
              left: posicao.x,
              top: posicao.y,
              ...(largura === null ? null : { width: largura }),
            }
          : undefined
      }
      {...resto}
    >
      {children}
    </div>
  );
}
