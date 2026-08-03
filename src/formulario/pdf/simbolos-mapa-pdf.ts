import type { SimboloParada, TipoSimboloParada } from "./legenda-itinerario";

// Desenho 2D dos símbolos de parada sobre a captura do mapa do PDF (DEC-105;
// DEC-069 — mesma forma/cor da etapa de mapa: quadrado azul = Seção, círculo
// verde = Local). Os marcadores da UX são elementos DOM e não entram no
// `toDataURL()` do mapa (TASK-033/DEC-104): esta rotina é composição sobre o
// CANVAS já capturado, nunca camada GL com `text-field` (exigiria endpoint de
// glyphs externo — fora da stack fixada).
//
// Cores como literais, não importadas de `estilos-pdf.ts`: este módulo é
// chamado durante a captura (antes do `@react-pdf/renderer` entrar em cena) e
// não deve arrastar a dependência do renderizador — mesmo precedente de
// `COR_LINHA_PADRAO` em `shared/mapa/geometria.ts`. Os hexes são os mesmos
// tokens da DEC-069/doc 18 §2 (`--color-azul-700`, `--color-sucesso`).

/** Lado do quadrado da Seção, em pixels da captura (DEC-104: 1400×840). Maior
 * que o círculo do Local — preserva a hierarquia Seção > Local da DEC-069. */
export const LADO_QUADRADO_SECAO = 34;

/** Raio do círculo do Local, em pixels da captura. */
export const RAIO_CIRCULO_LOCAL = 12;

/** `--color-azul-700` (doc 18 §2) — mesma cor do quadrado de Seção da DEC-069. */
export const COR_QUADRADO_SECAO = "#1d4ed8";

/** `--color-sucesso` (doc 18 §2) — mesma cor do círculo de Local da DEC-069. */
export const COR_CIRCULO_LOCAL = "#16a34a";

const COR_HALO = "#ffffff";
const COR_NUMERO_SECAO = "#ffffff";
const COR_ROTULO_LOCAL = "#0f172a";
const HALO_EXTRA_PX = 2;
const ESPACAMENTO_ROTULO_LOCAL_PX = 4;
/** Corpo nominal (escala 1, captura 1400×840 — DEC-104) do número da Seção. */
const CORPO_NUMERO_SECAO_PX = 13;
/** Corpo nominal (escala 1) do rótulo do Local. */
const CORPO_ROTULO_LOCAL_PX = 11;

function fonte(corpoNominalPx: number, escala: number): string {
  return `bold ${corpoNominalPx * escala}px Helvetica, Arial, sans-serif`;
}

/** Posição em pixels da captura (já projetada e escalada — ver `captura-mapa-pdf.ts`). */
export interface PontoProjetado {
  x: number;
  y: number;
}

export interface SimboloProjetado extends PontoProjetado {
  tipo: TipoSimboloParada;
  rotulo?: string;
}

/**
 * Subconjunto do `CanvasRenderingContext2D` usado pelo desenho — testável com
 * um contexto FALSO que registra chamadas (`docs-dev/08-TEST_STRATEGY.md`
 * §7): nunca WebGL nem tiles reais em Vitest.
 */
export interface Contexto2DDesenho {
  save(): void;
  restore(): void;
  beginPath(): void;
  arc(x: number, y: number, raio: number, anguloInicial: number, anguloFinal: number): void;
  fill(): void;
  fillRect(x: number, y: number, largura: number, altura: number): void;
  fillText(texto: string, x: number, y: number): void;
  // Tipado igual ao `CanvasRenderingContext2D` real (aceita gradiente/padrão
  // além de string) para que o contexto real seja atribuível a esta
  // interface sem cast; a rotina só atribui strings.
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textAlign: string;
  textBaseline: string;
}

export interface MolduraDesenho {
  larguraMoldura: number;
  alturaMoldura: number;
}

/** `false` quando o ponto projetado cai fora da moldura da imagem capturada. */
export function simboloDentroDaMoldura(
  ponto: PontoProjetado,
  moldura: MolduraDesenho,
): boolean {
  return (
    ponto.x >= 0 &&
    ponto.x <= moldura.larguraMoldura &&
    ponto.y >= 0 &&
    ponto.y <= moldura.alturaMoldura
  );
}

/** Converte um `SimboloParada` numerado + a posição já projetada em pixels. */
export function paraSimboloProjetado(
  simbolo: SimboloParada,
  ponto: PontoProjetado,
): SimboloProjetado {
  return { tipo: simbolo.tipo, rotulo: simbolo.rotulo, x: ponto.x, y: ponto.y };
}

function desenharHalo(ctx: Contexto2DDesenho, x: number, y: number, raio: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, raio, 0, Math.PI * 2);
  ctx.fillStyle = COR_HALO;
  ctx.fill();
  ctx.restore();
}

function desenharSecao(ctx: Contexto2DDesenho, simbolo: SimboloProjetado, escala: number): void {
  const lado = LADO_QUADRADO_SECAO * escala;
  const metadeLado = lado / 2;
  desenharHalo(ctx, simbolo.x, simbolo.y, metadeLado + HALO_EXTRA_PX * escala);

  ctx.save();
  ctx.fillStyle = COR_QUADRADO_SECAO;
  ctx.fillRect(simbolo.x - metadeLado, simbolo.y - metadeLado, lado, lado);
  ctx.restore();

  // (b) número DENTRO do quadrado — DEC-105.
  ctx.save();
  ctx.fillStyle = COR_NUMERO_SECAO;
  ctx.font = fonte(CORPO_NUMERO_SECAO_PX, escala);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(simbolo.rotulo ?? "", simbolo.x, simbolo.y);
  ctx.restore();
}

function desenharLocal(ctx: Contexto2DDesenho, simbolo: SimboloProjetado, escala: number): void {
  const raio = RAIO_CIRCULO_LOCAL * escala;
  desenharHalo(ctx, simbolo.x, simbolo.y, raio + HALO_EXTRA_PX * escala);

  ctx.save();
  ctx.beginPath();
  ctx.arc(simbolo.x, simbolo.y, raio, 0, Math.PI * 2);
  ctx.fillStyle = COR_CIRCULO_LOCAL;
  ctx.fill();
  ctx.restore();

  // (c) rótulo AO LADO do círculo, nunca dentro — o círculo de 12 px não
  // comporta "1.1" legível (DEC-105). Local antes da primeira Seção não tem
  // `rotulo` (caso de borda tratado): o ponto é desenhado, sem texto.
  if (!simbolo.rotulo) return;
  ctx.save();
  ctx.fillStyle = COR_ROTULO_LOCAL;
  ctx.font = fonte(CORPO_ROTULO_LOCAL_PX, escala);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(simbolo.rotulo, simbolo.x + raio + ESPACAMENTO_ROTULO_LOCAL_PX * escala, simbolo.y);
  ctx.restore();
}

/**
 * Desenha os símbolos projetados sobre o contexto 2D da captura. Símbolos
 * fora da moldura são descartados sem lançar. Ordem de desenho estável —
 * Locais primeiro, Seções por cima — mitiga sobreposição em paradas próximas
 * (terminal urbano); anti-colisão automática não é escopo desta task.
 *
 * `escala` multiplica todos os tamanhos (lado, raio, halo, espaçamento,
 * corpo de fonte) — nunca as posições, já projetadas em pixels de canvas
 * pelo chamador. Os símbolos são declarados nominalmente para a captura
 * 1400×840 (DEC-104); `escala` é `canvas.width / largura nominal`, a mesma
 * razão que corrige as coordenadas, para que o símbolo ocupe sempre a
 * mesma fração da imagem — inclusive em canvas maior por `devicePixelRatio`.
 */
export function desenharSimbolos(
  ctx: Contexto2DDesenho,
  simbolos: readonly SimboloProjetado[],
  moldura: MolduraDesenho,
  escala = 1,
): void {
  const visiveis = simbolos.filter((simbolo) => simboloDentroDaMoldura(simbolo, moldura));
  for (const simbolo of visiveis.filter((s) => s.tipo === "local")) {
    desenharLocal(ctx, simbolo, escala);
  }
  for (const simbolo of visiveis.filter((s) => s.tipo === "secao")) {
    desenharSecao(ctx, simbolo, escala);
  }
}
