import type { DocumentoOperacao, Secao, Servico } from "@/shared/contrato";
// Imports profundos deliberados: o índice de `matrizes` reexporta a etapa
// React, e este módulo é puro (mesmo precedente de `modelo-pdf-operacional.ts`).
import {
  celulaDistancia,
  formatarKm,
} from "@/formulario/matrizes/apresentacao-matriz-distancias";
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
          texto: formatarKm(celula.valorAdotado),
          ...(celula.bidirecional
            ? {
                detalheIda: formatarKm(celula.ida as number),
                detalheVolta: formatarKm(celula.volta as number),
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
          : { tipo: "valor" as const, texto: formatarKm(distanciaKm) };
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
