import type { Itinerario, Local, Secao } from "@/shared/contrato";
import { nomeExibicaoSecao } from "@/formulario/secoes/fluxos-secao";

// Numeração hierárquica das paradas do mapa/legenda do PDF operacional
// (DEC-105; Spec 04 §13.1 itens 4d/8b). Módulo PURO: lê só `paradas[].ordem`,
// as Seções do Autos e os Locais do Serviço — nada de OSRM, nada de canvas
// (RN-015/NEG-019). Chamado uma vez por Itinerário (Ida e Volta são objetos
// distintos), o que já entrega o reinício da numeração por sentido.

export type TipoSimboloParada = "secao" | "local";

/**
 * Um símbolo a desenhar no mapa: geolocalização congelada do Serviço/sentido
 * corrente + rótulo hierárquico. Local antes da primeira Seção — só possível
 * em documento importado que viola a RN-035 — entra sem `rotulo`: a RN-036
 * cobre a integridade da referência, mas não existe Seção anterior de quem
 * herdar o prefixo, e a task proíbe inventar `0.1`.
 */
export interface SimboloParada {
  tipo: TipoSimboloParada;
  rotulo?: string;
  latitude: number;
  longitude: number;
}

/** Um item da legenda vertical do corpo do bloco — só Seções (RN-076). */
export interface ItemLegendaSecao {
  rotulo: string;
  nome: string;
}

/** Identificador hierárquico de um Local, para o anexo da TASK-034 referenciar (§13.1 item 8b). */
export interface IdentificadorLocal {
  localUuid: string;
  identificador: string;
}

export interface NumeracaoItinerario {
  /** Símbolos na ordem da travessia, prontos para projeção sobre o mapa. */
  simbolos: SimboloParada[];
  /** Legenda vertical do corpo — só Seções, na ordem da travessia. */
  legendaSecoes: ItemLegendaSecao[];
  /** `local_uuid` → identificador `n.m`, para o anexo técnico (TASK-034). */
  identificadoresLocais: IdentificadorLocal[];
}

function indicePorUuid<T extends { uuid: string }>(itens: readonly T[]): Map<string, T> {
  return new Map(itens.map((item) => [item.uuid, item]));
}

/**
 * Numera as paradas de UM itinerário (Ida OU Volta) na ordem da travessia
 * (`paradas[].ordem`, ordenado defensivamente — mesmo precedente de
 * `motor-montagem.ts`/`montagem-grade.ts`): Seções ganham `1º`, `2º`…
 * (número desenhado dentro do quadrado — DEC-105); Locais ganham `n.m`,
 * prefixados pela Seção IMEDIATAMENTE anterior — a contagem de Locais
 * reinicia a cada Seção nova, sem deslocar a numeração das Seções.
 *
 * Parada com referência (`secao_uuid`/`local_uuid`) inexistente é ignorada
 * por inteiro: não consome número, não entra na legenda nem nos
 * identificadores. Já a numeração em si (ordinal da Seção, identificador do
 * Local) depende só de a Seção/Local EXISTIR — não de ter geolocalização do
 * Serviço/sentido corrente. Sem geolocalização do sentido (RN-036), a parada
 * é numerada e entra na legenda/identificadores, mas NÃO ganha símbolo (nada
 * para desenhar) — o ordinal/identificador seguinte nunca herda o que seria
 * dela. Local antes da primeira Seção (RN-035 violada em documento
 * importado) nunca recebe prefixo: é desenhado sem rótulo quando tem
 * geolocalização, e simplesmente ignorado quando não tem — nunca como `0.1`.
 */
export function numerarItinerario(
  itinerario: Pick<Itinerario, "sentido" | "paradas">,
  servicoUuid: string,
  secoes: readonly Secao[],
  locais: readonly Local[],
): NumeracaoItinerario {
  const secoesPorUuid = indicePorUuid(secoes);
  const locaisPorUuid = indicePorUuid(locais);
  const campoGeolocalizacao: "geolocalizacao_ida" | "geolocalizacao_volta" =
    itinerario.sentido === "ida" ? "geolocalizacao_ida" : "geolocalizacao_volta";

  const simbolos: SimboloParada[] = [];
  const legendaSecoes: ItemLegendaSecao[] = [];
  const identificadoresLocais: IdentificadorLocal[] = [];

  let contadorSecoes = 0;
  let prefixoSecaoAtual: string | undefined;
  let contadorLocaisNaSecaoAtual = 0;

  // A Spec 02 §10 exige `paradas` ordenado por `ordem`, mas a legenda ordena
  // defensivamente antes de ler — a peça operacional não pode depender da
  // ordem do array.
  const paradasOrdenadas = [...itinerario.paradas].sort((a, b) => a.ordem - b.ordem);

  for (const parada of paradasOrdenadas) {
    if (parada.secao_uuid !== undefined) {
      const secao = secoesPorUuid.get(parada.secao_uuid);
      if (!secao) continue;

      contadorSecoes += 1;
      prefixoSecaoAtual = String(contadorSecoes);
      contadorLocaisNaSecaoAtual = 0;
      const rotulo = `${contadorSecoes}º`;
      legendaSecoes.push({ rotulo, nome: nomeExibicaoSecao(secao) });

      const entrada = secao.servicos.find((sv) => sv.servico_uuid === servicoUuid);
      const geoloc = entrada?.[campoGeolocalizacao];
      if (geoloc) {
        simbolos.push({
          tipo: "secao",
          rotulo,
          latitude: geoloc.latitude,
          longitude: geoloc.longitude,
        });
      }
    } else if (parada.local_uuid !== undefined) {
      const local = locaisPorUuid.get(parada.local_uuid);
      if (!local) continue;
      const geoloc = local[campoGeolocalizacao];

      if (prefixoSecaoAtual === undefined) {
        if (geoloc) {
          simbolos.push({ tipo: "local", latitude: geoloc.latitude, longitude: geoloc.longitude });
        }
        continue;
      }

      contadorLocaisNaSecaoAtual += 1;
      const identificador = `${prefixoSecaoAtual}.${contadorLocaisNaSecaoAtual}`;
      identificadoresLocais.push({ localUuid: local.uuid, identificador });
      if (geoloc) {
        simbolos.push({
          tipo: "local",
          rotulo: identificador,
          latitude: geoloc.latitude,
          longitude: geoloc.longitude,
        });
      }
    }
  }

  return { simbolos, legendaSecoes, identificadoresLocais };
}

// --- Colunas da lista numerada e acomodação do bloco (DEC-109 itens 3-4;
// TASK-129/DEC-111) --------------------------------------------------------
//
// Título + mapa + lista numerada nascem como unidade inquebrável (DEC-109
// item 4). Quando o Serviço tem muitas Seções, a DEC-111 fixa a ordem em que
// o bloco cede espaço — nunca cortando conteúdo em silêncio, o modo de falha
// que reprovou a TASK-034 duas vezes: (i) dividir a lista em colunas;
// (ii) quebrar a unidade, deixando a lista fluir para a página seguinte;
// (iii) só então reduzir a altura do mapa, e apenas o necessário.

/** DEC-111 item 1 — a partir de quantas Seções a lista numerada divide em colunas. */
export const LIMIAR_COLUNAS_LEGENDA = 12;

/** DEC-111 item 1 — no máximo duas colunas: a três, 171 pt cada, o nome
 * `Cidade - Nome da Seção` da escala real quebraria em várias linhas. */
const MAXIMO_COLUNAS_LEGENDA = 2;

/**
 * Divide a legenda vertical em colunas de leitura (DEC-111 itens 1-2): coluna
 * única abaixo do limiar; a partir dele, duas colunas lidas **coluna a
 * coluna** — a primeira metade da lista na esquerda, de cima para baixo, a
 * segunda na direita. A numeração hierárquica (`numerarItinerario`) não muda;
 * esta função só reparte a apresentação, preservando a ordem.
 */
export function colunasDaLegenda(
  legenda: readonly ItemLegendaSecao[],
  limiar: number = LIMIAR_COLUNAS_LEGENDA,
): readonly (readonly ItemLegendaSecao[])[] {
  if (legenda.length < limiar) return [legenda];
  const porColuna = Math.ceil(legenda.length / MAXIMO_COLUNAS_LEGENDA);
  return [legenda.slice(0, porColuna), legenda.slice(porColuna)];
}

/**
 * Geometria aproximada do bloco de itinerário no PDF operacional
 * (`estilosPdf.pagina`, `estilosPdf.tituloItinerario`, `estilosPdf.imagemMapa`,
 * `estilosPdf.legendaItinerario`), usada só para decidir a acomodação — não é
 * layout real (`@react-pdf/layout` mede isso nos testes; ver
 * `pdf-renderizacao.test.tsx`).
 */
export interface ParametrosAcomodacaoItinerario {
  /** Altura útil da página A4: 841,89 − `paddingTop` (40) − `paddingBottom` (56). */
  alturaUtilPagina: number;
  /** `tituloItinerario`: corpo 11 pt + margens. */
  alturaTitulo: number;
  /** Altura do mapa em largura plena (515,28 pt), na proporção 1400×840 da captura. */
  alturaImagemNatural: number;
  /** `imagemMapa`: `marginTop` + `marginBottom`. */
  margensImagem: number;
  /** Altura aproximada de uma linha da legenda (símbolo 13 pt + `paddingBottom` do nome). */
  alturaItemLegenda: number;
  /** `legendaItinerario`: `marginTop` + `marginBottom`. */
  margensLegenda: number;
}

/** Constantes derivadas de `estilosPdf` (DEC-111) — ver comentário de {@link ParametrosAcomodacaoItinerario}. */
export const PARAMETROS_ACOMODACAO_PADRAO: ParametrosAcomodacaoItinerario = {
  alturaUtilPagina: 745.89,
  alturaTitulo: 29,
  alturaImagemNatural: 309.17,
  margensImagem: 12,
  alturaItemLegenda: 20,
  margensLegenda: 12,
};

export interface AcomodacaoItinerario {
  /** Número de colunas da lista numerada (DEC-111 item 1). */
  colunas: 1 | 2;
  /** Altura efetiva do mapa — igual à natural, salvo no último degrau da escada (iii). */
  alturaImagemMapa: number;
  /**
   * `false` quando título+mapa+lista deixam de caber como um único envelope
   * `wrap={false}` (degrau ii): o envelope passa a cobrir só título+mapa, e a
   * lista flui livremente, como já valia para a descrição (DEC-109 item 4).
   */
  unidadeIntegra: boolean;
}

function alturaDaLegenda(
  quantidadeItens: number,
  colunas: 1 | 2,
  parametros: ParametrosAcomodacaoItinerario,
): number {
  if (quantidadeItens === 0) return 0;
  return (
    Math.ceil(quantidadeItens / colunas) * parametros.alturaItemLegenda +
    parametros.margensLegenda
  );
}

/**
 * Decide a acomodação do bloco de itinerário — colunas da lista, altura do
 * mapa e se o trio título+mapa+lista permanece um envelope inquebrável — na
 * ordem de sacrifício da DEC-111 item 4. Pura: recebe a legenda já pronta
 * (`numerarItinerario`) e, opcionalmente, os parâmetros de geometria (o
 * padrão é a página A4 real; testes injetam outros para exercitar os
 * degraus (ii) e (iii) sem depender de uma fixture com dezenas de Seções).
 */
export function calcularAcomodacaoItinerario(
  legenda: readonly ItemLegendaSecao[],
  parametros: ParametrosAcomodacaoItinerario = PARAMETROS_ACOMODACAO_PADRAO,
): AcomodacaoItinerario {
  const colunas: 1 | 2 = legenda.length < LIMIAR_COLUNAS_LEGENDA ? 1 : 2;
  const alturaComMapaNatural =
    parametros.alturaTitulo +
    parametros.alturaImagemNatural +
    parametros.margensImagem +
    alturaDaLegenda(legenda.length, colunas, parametros);

  if (alturaComMapaNatural <= parametros.alturaUtilPagina) {
    return { colunas, alturaImagemMapa: parametros.alturaImagemNatural, unidadeIntegra: true };
  }

  // (ii) quebra a unidade: título+mapa isolados continuam íntegros; a lista
  // sai do envelope e flui livremente.
  const alturaUnidadeMinima =
    parametros.alturaTitulo + parametros.alturaImagemNatural + parametros.margensImagem;
  if (alturaUnidadeMinima <= parametros.alturaUtilPagina) {
    return { colunas, alturaImagemMapa: parametros.alturaImagemNatural, unidadeIntegra: false };
  }

  // (iii) último caso: nem título+mapa cabem sozinhos — reduz o mapa ao que
  // sobrar da página para o título.
  const alturaImagemReduzida = Math.max(
    0,
    parametros.alturaUtilPagina - parametros.alturaTitulo - parametros.margensImagem,
  );
  return { colunas, alturaImagemMapa: alturaImagemReduzida, unidadeIntegra: false };
}
