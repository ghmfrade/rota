import type { DocumentoOperacao, Secao, Servico } from "@/shared/contrato";
// Imports profundos deliberados: o índice de `matrizes` reexporta a etapa
// React, e este módulo é puro (mesmo precedente de `modelo-pdf-operacional.ts`).
import { celulaDistancia } from "@/formulario/matrizes/apresentacao-matriz-distancias";
import {
  chaveParNaoDirecional,
  secoesAtendidas,
} from "@/formulario/matrizes/calculo-matriz-distancias";
import { nomeExibicaoSecao } from "@/formulario/secoes/fluxos-secao";

// Matrizes do PDF operacional (TASK-034; Spec 04 §13.1 itens 6 e 7, §9.1/§9.2).
// Módulo PURO e LEITOR: desenha o `matriz_distancias` e o
// `matriz_seccionamento` já congelados no documento — nunca recalcula, nunca
// chama OSRM (RN-015/NEG-019; Spec 03 §12). Distâncias em km, jamais R$
// (RN-013/RN-076; §9 "Decisão explícita de UX").
//
// As duas matrizes compartilham a forma (triangular inferior, "X" na diagonal,
// cabeçalhos `Cidade - Nome da Seção`) e a MESMA ordenação de linhas/colunas
// (`secoesAtendidas`, a de `etapa-matrizes.tsx`), mas não a semântica da
// célula sem valor:
//
// - **Distâncias (§9.1):** toda combinação de duas Seções distintas atendidas
//   TEM entrada (RN-054, verificada em `validacoes-estruturais.ts`) — a matriz
//   é a distância real do trecho, e não existe "par desabilitado". Célula sem
//   par só é alcançável em documento que a validação estrutural recusa; nesse
//   caso fica **vazia**, sem inventar valor nem "—".
// - **Seccionamento (§9.2):** a ausência É informação — aquele par não é
//   comprável — e imprime **"—"** (RN-058/RN-059).

/** Diagonal das duas matrizes (§9). */
export const MARCA_DIAGONAL = "X";

/** Par não habilitado na matriz de seccionamento (§9.2). */
export const MARCA_PAR_NAO_HABILITADO = "—";

/**
 * Número da distância sem o sufixo " km" (DEC-107 — correção da TASK-034): a
 * unidade sai da célula e vira informação do título do bloco no PDF
 * ("Matriz de distâncias (km)"). `formatarKm`, compartilhado com a etapa
 * Matrizes (TASK-048), não é alterado — esta função é exclusiva do PDF.
 */
function formatarKmSemUnidade(distanciaKm: number): string {
  return distanciaKm.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface CabecalhoMatriz {
  secaoUuid: string;
  /** `Cidade - Nome da Seção` (RN-076). */
  rotulo: string;
}

/**
 * Célula da matriz de distâncias (§9.1). `detalheIda`/`detalheVolta` só
 * existem quando o Serviço é bidirecional (RN-056) e alimentam o detalhe que a
 * tela expande por hover/clique — no papel ele é impresso junto do valor.
 */
export type CelulaDistanciaPdf =
  | { tipo: "diagonal"; texto: typeof MARCA_DIAGONAL }
  | {
      tipo: "valor";
      texto: string;
      detalheIda?: string;
      detalheVolta?: string;
    }
  | { tipo: "sem-entrada"; texto: "" };

/** Célula da matriz de seccionamento (§9.2). */
export type CelulaSeccionamentoPdf =
  | { tipo: "diagonal"; texto: typeof MARCA_DIAGONAL }
  | { tipo: "valor"; texto: string }
  | { tipo: "nao-habilitado"; texto: typeof MARCA_PAR_NAO_HABILITADO };

export interface LinhaMatrizPdf<Celula> {
  secaoUuid: string;
  rotulo: string;
  /** Triangular inferior: a linha `i` tem `i + 1` células (a última é a diagonal). */
  celulas: Celula[];
}

export interface MatrizPdf<Celula> {
  servicoUuid: string;
  numeroN: string;
  cabecalhos: CabecalhoMatriz[];
  linhas: LinhaMatrizPdf<Celula>[];
}

export type MatrizDistanciasPdf = MatrizPdf<CelulaDistanciaPdf>;
export type MatrizSeccionamentoPdf = MatrizPdf<CelulaSeccionamentoPdf>;

/** Cabeçalhos na ordem canônica das Seções atendidas pelo Serviço (RN-054). */
function cabecalhosDoServico(
  servico: Servico,
  secoes: readonly Secao[],
): CabecalhoMatriz[] {
  const secoesPorUuid = new Map(secoes.map((secao) => [secao.uuid, secao]));
  return secoesAtendidas(servico.itinerarios)
    .map((secaoUuid) => {
      const secao = secoesPorUuid.get(secaoUuid);
      return secao === undefined
        ? undefined
        : { secaoUuid, rotulo: nomeExibicaoSecao(secao) };
    })
    .filter((cabecalho): cabecalho is CabecalhoMatriz => cabecalho !== undefined);
}

/**
 * Matriz de distâncias de um Serviço (§9.1; RN-054/RN-056): triangular
 * inferior com `valor_adotado_de_distancia` em cada célula habitada e, quando
 * bidirecional, o detalhe Ida/Volta.
 */
export function montarMatrizDistancias(
  servico: Servico,
  secoes: readonly Secao[],
): MatrizDistanciasPdf {
  const cabecalhos = cabecalhosDoServico(servico, secoes);
  return {
    servicoUuid: servico.uuid,
    numeroN: servico.numero_n,
    cabecalhos,
    linhas: cabecalhos.map((linha, indiceLinha) => ({
      secaoUuid: linha.secaoUuid,
      rotulo: linha.rotulo,
      celulas: cabecalhos.slice(0, indiceLinha + 1).map((coluna, indiceColuna) => {
        if (indiceColuna === indiceLinha) {
          return { tipo: "diagonal" as const, texto: MARCA_DIAGONAL };
        }
        const celula = celulaDistancia(
          servico.matriz_distancias,
          linha.secaoUuid,
          coluna.secaoUuid,
        );
        if (celula === undefined) return { tipo: "sem-entrada" as const, texto: "" };
        return {
          tipo: "valor" as const,
          texto: formatarKmSemUnidade(celula.valorAdotado),
          ...(celula.bidirecional
            ? {
                detalheIda: formatarKmSemUnidade(celula.ida as number),
                detalheVolta: formatarKmSemUnidade(celula.volta as number),
              }
            : {}),
        };
      }),
    })),
  };
}

/**
 * Matriz de seccionamento de um Serviço (§9.2; RN-058/RN-059): mesma forma
 * triangular, com a distância confirmada dos pares habilitados e "—" nos
 * demais. Valor é sempre distância, nunca R$ (RN-058).
 */
export function montarMatrizSeccionamento(
  servico: Servico,
  secoes: readonly Secao[],
): MatrizSeccionamentoPdf {
  const cabecalhos = cabecalhosDoServico(servico, secoes);
  const habilitados = new Map(
    servico.matriz_seccionamento.map((par) => [
      chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid),
      par.distancia_km,
    ]),
  );

  return {
    servicoUuid: servico.uuid,
    numeroN: servico.numero_n,
    cabecalhos,
    linhas: cabecalhos.map((linha, indiceLinha) => ({
      secaoUuid: linha.secaoUuid,
      rotulo: linha.rotulo,
      celulas: cabecalhos.slice(0, indiceLinha + 1).map((coluna, indiceColuna) => {
        if (indiceColuna === indiceLinha) {
          return { tipo: "diagonal" as const, texto: MARCA_DIAGONAL };
        }
        const distanciaKm = habilitados.get(
          chaveParNaoDirecional(linha.secaoUuid, coluna.secaoUuid),
        );
        return distanciaKm === undefined
          ? { tipo: "nao-habilitado" as const, texto: MARCA_PAR_NAO_HABILITADO }
          : { tipo: "valor" as const, texto: formatarKmSemUnidade(distanciaKm) };
      }),
    })),
  };
}

/** §13.1 item 6 — uma matriz de distâncias por Serviço. */
export function montarMatrizesDistancias(
  documento: DocumentoOperacao,
): MatrizDistanciasPdf[] {
  return documento.autos.servicos.map((servico) =>
    montarMatrizDistancias(servico, documento.autos.secoes),
  );
}

/** §13.1 item 7 — uma matriz de seccionamento por Serviço. */
export function montarMatrizesSeccionamento(
  documento: DocumentoOperacao,
): MatrizSeccionamentoPdf[] {
  return documento.autos.servicos.map((servico) =>
    montarMatrizSeccionamento(servico, documento.autos.secoes),
  );
}

// --- Layout em blocos (correção da TASK-034; DEC-108) -----------------------
//
// O modelo triangular acima é a verdade semântica e não muda. A derivação
// abaixo é PURA apresentação: parte a matriz em faixas de colunas e pedaços de
// linhas que cabem numa página A4 com largura de coluna FIXA (não `flex`,
// causa do desalinhamento reprovado no parecer da TASK-034) e posiciona o
// rótulo de cada coluna na própria célula de preenchimento (DEC-108, que
// revogou o cabeçalho diagonal da DEC-107 item 1). Ver
// `docs-dev/PLANO-TASK-034-CORRECAO.md` §3.1.

/** Largura útil ≈ 515 pt (A4 − paddings de `estilosPdf.pagina`); 130 (rótulo
 * de linha) + 7×38 = 396 pt, sobrando ~119 pt para o rótulo horizontal da
 * última coluna transbordar sem sair da página (DEC-108 item 1). */
export const MAX_COLUNAS_POR_BLOCO = 7;

/** Altura útil ≈ 745 pt; sem o cabeçalho diagonal (DEC-108 revoga a reserva de
 * altura da DEC-107), sobra título (~20 pt) + linha de cabeçalho (~14 pt) +
 * 22 linhas de dados a ≈ 32 pt (pior caso: célula bidirecional empilhada). Um
 * Serviço real do ROTA tem no máximo ~12 Seções — este teto é rede de
 * segurança para matriz sintética grande, não dimensionado por caso real. */
export const MAX_LINHAS_POR_BLOCO = 22;

/**
 * Rótulo de coluna hospedado na célula de preenchimento de uma linha
 * (DEC-108 item 1): a coluna `j` é escrita na célula `(linha j−1, coluna j)`,
 * ou seja, na primeira célula de preenchimento à direita da própria diagonal
 * da linha. `indiceLocal` é a posição dentro de `celulas` deste bloco.
 */
export interface RotuloColunaHospedado {
  indiceLocal: number;
  rotulo: string;
}

export interface LinhaBlocoMatrizPdf<Celula> {
  secaoUuid: string;
  rotulo: string;
  /** Exatamente `cabecalhos.length` posições; `undefined` = preenchimento
   *  (triângulo superior), nunca "—" (nem na matriz de distâncias, nem na de
   *  seccionamento — a semântica de "—" continua exclusiva do triângulo
   *  inferior real). */
  celulas: (Celula | undefined)[];
  /** Presente quando esta linha hospeda o rótulo da coluna seguinte à sua
   *  diagonal (DEC-108 item 1); ausente na última linha de cada faixa, cuja
   *  diagonal não tem célula de preenchimento à direita neste bloco. */
  rotuloColunaHospedada?: RotuloColunaHospedado;
}

export interface BlocoMatrizPdf<Celula> {
  /** Colunas desta faixa, na ordem canônica. */
  cabecalhos: CabecalhoMatriz[];
  /** Índice da primeira coluna da faixa na matriz completa. */
  indiceColunaInicial: number;
  linhas: LinhaBlocoMatrizPdf<Celula>[];
  /** Título ganha " (continuação)" a partir do segundo bloco. */
  continuacao: boolean;
}

/**
 * Divide a matriz triangular em blocos de faixa de colunas × pedaço de linhas
 * (D2 do plano de correção). Numa faixa que começa na coluna `c0`, as linhas
 * de índice `< c0` não têm nenhuma célula habitada (estariam inteiramente no
 * triângulo superior) e são omitidas. Matriz pequena (≤ `MAX_COLUNAS_POR_BLOCO`
 * Seções, ≤ `MAX_LINHAS_POR_BLOCO` linhas) devolve exatamente 1 bloco.
 *
 * O rótulo da **primeira** coluna de cada faixa não tem linha anterior dentro
 * da própria faixa para hospedá-lo (DEC-108 item 2) — cabe à linha de
 * cabeçalho acima da matriz, mostrada pela apresentação a partir de
 * `cabecalhos[0]`. Os demais rótulos são hospedados pela linha imediatamente
 * anterior à sua própria diagonal, dentro deste mesmo bloco.
 */
export function dividirMatrizEmBlocos<Celula>(
  matriz: MatrizPdf<Celula>,
): BlocoMatrizPdf<Celula>[] {
  const blocos: BlocoMatrizPdf<Celula>[] = [];

  for (
    let colunaInicial = 0;
    colunaInicial < matriz.cabecalhos.length;
    colunaInicial += MAX_COLUNAS_POR_BLOCO
  ) {
    const cabecalhosFaixa = matriz.cabecalhos.slice(
      colunaInicial,
      colunaInicial + MAX_COLUNAS_POR_BLOCO,
    );
    // Linhas de índice < colunaInicial ficariam inteiramente no triângulo
    // superior desta faixa (nenhuma célula habitada) — omitidas (D2).
    const linhasFaixa = matriz.linhas.slice(colunaInicial);

    for (
      let inicioPedaco = 0;
      inicioPedaco < linhasFaixa.length;
      inicioPedaco += MAX_LINHAS_POR_BLOCO
    ) {
      const pedacoLinhas = linhasFaixa.slice(inicioPedaco, inicioPedaco + MAX_LINHAS_POR_BLOCO);
      blocos.push({
        cabecalhos: cabecalhosFaixa,
        indiceColunaInicial: colunaInicial,
        continuacao: blocos.length > 0,
        linhas: pedacoLinhas.map((linha, indicePedaco) => {
          // Posição local da própria diagonal desta linha dentro da faixa
          // ("a diagonal cai na posição local i - c0"); a coluna que ela
          // hospeda é a seguinte (DEC-108 item 1).
          const diagonalLocal = inicioPedaco + indicePedaco;
          const indiceHospedado = diagonalLocal + 1;
          const cabecalhoHospedado = cabecalhosFaixa[indiceHospedado];
          return {
            secaoUuid: linha.secaoUuid,
            rotulo: linha.rotulo,
            celulas: cabecalhosFaixa.map(
              (_, indiceNaFaixa) => linha.celulas[colunaInicial + indiceNaFaixa],
            ),
            ...(cabecalhoHospedado === undefined
              ? {}
              : {
                  rotuloColunaHospedada: {
                    indiceLocal: indiceHospedado,
                    rotulo: cabecalhoHospedado.rotulo,
                  },
                }),
          };
        }),
      });
    }
  }

  return blocos;
}
