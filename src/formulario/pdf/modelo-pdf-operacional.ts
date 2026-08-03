import type {
  DocumentoOperacao,
  Itinerario,
  Secao,
  Servico,
} from "@/shared/contrato";
import {
  contarAutos,
  contarAutosPorFaixa,
  contarServico,
  FAIXAS_HORARIO,
  ROTULO_SEMANA_PADRAO,
  rotuloFaixaComIntervalo,
} from "@/shared/contagens";
// Import profundo deliberado (precedente: `pendencias/pendencias.ts`): o índice
// de `secoes` reexporta o editor React, e este módulo é puro — o modelo do PDF
// não deve arrastar componente de mapa nem de UI.
import { nomeExibicaoSecao } from "@/formulario/secoes/fluxos-secao";
import {
  numerarItinerario,
  type IdentificadorLocal,
  type ItemLegendaSecao,
} from "./legenda-itinerario";
import {
  montarTabelasHorarias,
  type TabelaHorariaPdf,
} from "./tabelas-horarias-pdf";
import {
  montarMatrizesDistancias,
  montarMatrizesSeccionamento,
  type MatrizDistanciasPdf,
  type MatrizSeccionamentoPdf,
} from "./matrizes-pdf";
import { montarAnexoTecnico, type BlocoAnexoTecnico } from "./anexo-tecnico-pdf";

// Modelo estrutural do PDF operacional (TASK-033; Spec 04 §13.1) — módulo
// PURO: converte um `DocumentoOperacao` na sequência de blocos que o
// renderizador @react-pdf desenha, sem React, sem I/O e sem canvas. É aqui que
// vivem as regras assertáveis do §13.1/§13.3, para que possam ser testadas sem
// gerar um PDF de verdade (`docs-dev/08-TEST_STRATEGY.md` §7 — estrutura, não
// pixel-perfect).
//
// O PDF é LEITOR do documento congelado: lê `rota`, `descricao_itinerario` e as
// contagens de `shared/contagens`; nunca chama OSRM nem recalcula (RN-015,
// NEG-019). Contagens nunca são reimplementadas aqui (RN-072).
//
// A TASK-033 entregou os itens 1, 2, 3, 4 e 9 do §13.1; a TASK-034 acrescentou
// os itens 5–8 (tabelas horárias, matriz de distâncias, matriz de
// seccionamento e anexo técnico), cada um montado por um módulo puro próprio e
// apenas agregado aqui, nas posições que `ORDEM_BLOCOS` já reservava — a ordem
// do §13.1 mora nessa constante única, não espalhada pelo componente.

/** Título fixo da capa (§13.1 item 1). Não há ativo de logotipo no projeto. */
export const TITULO_PDF = "ROTA — Tabela Operacional";

/** Aviso obrigatório de fronteira com o SEI (RN-077; §13.1 item 9). */
export const AVISO_SEI =
  "O fluxo administrativo (análise, pendências e aprovação) permanece no SEI. Este documento não substitui a publicação oficial.";

/** Separador da sequência resumida de Seções (§13.1 item 4b). */
export const SETA_SEQUENCIA = " → ";

/** Ordem dos blocos do §13.1 — a peça inteira, itens 1 a 9. */
export const ORDEM_BLOCOS = [
  "capa",
  "resumo",
  "servicos",
  "itinerarios",
  "tabelas-horarias",
  "matriz-distancias",
  "matriz-seccionamento",
  "anexo-tecnico",
  "rodape",
] as const;

export type IdBloco = (typeof ORDEM_BLOCOS)[number];

/** §13.1 item 1 — capa/identificação do Autos. */
export interface BlocoCapa {
  titulo: string;
  codigo: string;
  empresa: string;
  tipo: string;
  status: string;
  /** "Data de criação" ou "Data de publicação", conforme o `status`. */
  rotuloData: string;
  /** Já formatada em pt-BR; vazia quando o documento não traz a data. */
  data: string;
}

/** Os 7 contadores por Serviço do §10 — nenhum a menos. */
export interface LinhaResumoServico {
  servicoUuid: string;
  numeroN: string;
  viagensIda: number;
  viagensVolta: number;
  viagensTotal: number;
  paresCompraveis: number;
  opcoesIda: number;
  opcoesVolta: number;
  opcoesDeslocamento: number;
}

/** Uma faixa do §10 na estratificação do total do Autos (2 contadores). */
export interface LinhaResumoFaixa {
  rotulo: string;
  viagensSemana: number;
  opcoesDeslocamento: number;
}

/** Uma faixa do §10 na estratificação de um Serviço (contadores do Serviço). */
export interface LinhaResumoFaixaServico extends LinhaResumoFaixa {
  viagensIda: number;
  viagensVolta: number;
  opcoesIda: number;
  opcoesVolta: number;
}

/**
 * Estratificação por faixa de um Serviço (§10: "por Serviço e no total do
 * Autos"). `paresCompraveis` fica fora das linhas porque não depende de Viagem:
 * é o mesmo valor em todas as faixas — repeti-lo em sete linhas seria ruído.
 */
export interface EstratificacaoServico {
  servicoUuid: string;
  numeroN: string;
  paresCompraveis: number;
  faixas: LinhaResumoFaixaServico[];
}

/** §13.1 item 2 — contadores do §10, sempre rotulados (RN-069/NEG-018). */
export interface BlocoResumo {
  rotuloSemanaPadrao: string;
  porServico: LinhaResumoServico[];
  totalViagensSemana: number;
  totalOpcoesDeslocamento: number;
  /** Estratificação do **total do Autos** — vem primeiro, e é rotulada como tal. */
  porFaixa: LinhaResumoFaixa[];
  /** Estratificação **por Serviço**, depois do total (§10). */
  porFaixaPorServico: EstratificacaoServico[];
}

/** Deixa explícito que a primeira tabela de faixas é a do Autos inteiro (§10). */
export const ROTULO_FAIXA_TOTAL_AUTOS = "Total do Autos — por faixa de horário";

/** §13.1 item 3 — um bloco por Serviço, com resumo próprio. */
export interface BlocoServico {
  servicoUuid: string;
  numeroN: string;
  caracteristicaVeiculo: string;
  carater: string;
  direcionalidade: string;
  viagensSemana: number;
  paresCompraveis: number;
  opcoesDeslocamento: number;
}

/**
 * Item da descrição textual preparado para o realce do §13.4: Seções em
 * destaque, vias em texto simples. Locais nunca aparecem (o contrato só admite
 * `secao` e `via` — Spec 02 §10.5).
 */
export interface ItemDescricaoPdf {
  tipo: "secao" | "via";
  texto: string;
}

/** §13.1 item 4 — itinerário por Serviço e sentido, na ordem a→d. */
export interface BlocoItinerario {
  servicoUuid: string;
  sentido: Itinerario["sentido"];
  /** (a) `Serviço 0000-NXX — Ida`. */
  titulo: string;
  /** (b) `Cidade A - Seção A → Cidade B - Seção B` — só Seções (RN-076). */
  sequenciaSecoes: string;
  /** (c) `rota.descricao_itinerario.texto`, parágrafo corrido (§13.4). */
  descricaoTexto: string;
  /** (c) itens estruturados para o realce das Seções (§13.4). */
  descricaoItens: ItemDescricaoPdf[];
  /** (d) data-URI da captura do mapa; ausente quando a captura não veio (DEC-104). */
  imagemMapa?: string;
  /**
   * Legenda vertical do bloco — só Seções, numeradas e ligadas por conector
   * (DEC-105; RN-076). Preenchida independentemente de `imagemMapa`: falha de
   * captura não impede a legenda de ser renderizada.
   */
  legendaSecoes: ItemLegendaSecao[];
  /**
   * Identificadores hierárquicos (`1.1`, `1.2`…) dos Locais deste
   * Serviço/sentido, prontos para o anexo técnico da TASK-034 referenciar
   * (DEC-105; §13.1 item 8b). Não aparecem em nenhuma superfície do corpo.
   */
  identificadoresLocais: IdentificadorLocal[];
}

/** Separador entre os itens do parágrafo da descrição (§13.4). */
export const SEPARADOR_DESCRICAO = ", ";

/**
 * Ponto final do parágrafo da descrição. O texto congelado
 * (`compor-descricao.ts`) termina em ponto e o painel da UI o mantém; o PDF,
 * que remonta o parágrafo a partir de `itens` para realçar as Seções (§13.4),
 * precisa recolocá-lo para não entregar frase sem fechamento.
 */
export const PONTO_FINAL_DESCRICAO = ".";

/**
 * Como o parágrafo do item 4c deve ser composto. Duas origens: o normal é
 * `itens` (o §13.4 manda usá-los para o realce); sem itens — descrição
 * congelada de documento antigo, ou composta só como texto — cai no
 * `descricao_itinerario.texto`, para o bloco não ficar mudo.
 */
export type ParagrafoDescricao =
  | {
      origem: "itens";
      itens: ItemDescricaoPdf[];
      separador: string;
      pontoFinal: string;
    }
  | { origem: "texto-congelado"; texto: string };

export function paragrafoDaDescricao(bloco: BlocoItinerario): ParagrafoDescricao {
  if (bloco.descricaoItens.length === 0) {
    return { origem: "texto-congelado", texto: bloco.descricaoTexto };
  }
  return {
    origem: "itens",
    itens: bloco.descricaoItens,
    separador: SEPARADOR_DESCRICAO,
    pontoFinal: PONTO_FINAL_DESCRICAO,
  };
}

/** §13.1 item 9 — rodapé técnico. */
export interface BlocoRodape {
  versaoSchema: string;
  geradoEm: string;
  aviso: string;
}

export interface ModeloPdfOperacional {
  ordemBlocos: readonly IdBloco[];
  capa: BlocoCapa;
  resumo: BlocoResumo;
  servicos: BlocoServico[];
  itinerarios: BlocoItinerario[];
  /** §13.1 item 5 — versão simples, no corpo (RN-075; DEC-086). */
  tabelasHorarias: TabelaHorariaPdf[];
  /** §13.1 item 6 — uma por Serviço (§9.1). */
  matrizesDistancias: MatrizDistanciasPdf[];
  /** §13.1 item 7 — uma por Serviço (§9.2). */
  matrizesSeccionamento: MatrizSeccionamentoPdf[];
  /** §13.1 item 8 — versão detalhada + relação de Locais, sem horários. */
  anexoTecnico: BlocoAnexoTecnico;
  rodape: BlocoRodape;
}

/** Fonte das imagens do item 4d — injetada para o modelo continuar puro. */
export type ProvedorImagemMapa = (
  servicoUuid: string,
  sentido: Itinerario["sentido"],
) => string | undefined;

export interface OpcoesModeloPdf {
  /** Data/hora da geração (§13.1 item 9); injetável para teste determinístico. */
  geradoEm?: Date;
  obterImagemDoItinerario?: ProvedorImagemMapa;
}

const ROTULO_SENTIDO: Record<Itinerario["sentido"], string> = {
  ida: "Ida",
  volta: "Volta",
};

/** Formata "2026-07-31" como "31/07/2026". String vazia quando ausente. */
function formatarDataIso(data: string | undefined): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

/** Formata a data/hora de geração do rodapé como "31/07/2026 14:05". */
function formatarDataHora(momento: Date): string {
  const dois = (n: number) => String(n).padStart(2, "0");
  return (
    `${dois(momento.getDate())}/${dois(momento.getMonth() + 1)}/${momento.getFullYear()}` +
    ` ${dois(momento.getHours())}:${dois(momento.getMinutes())}`
  );
}

// Direcionalidade é DERIVADA dos sentidos dos itinerários presentes — não há
// campo no contrato (DEC-036).
function direcionalidadeDoServico(servico: Servico): string {
  const sentidos = new Set(servico.itinerarios.map((i) => i.sentido));
  if (sentidos.has("ida") && sentidos.has("volta")) return "Ida e Volta";
  return sentidos.has("volta") ? "Volta" : "Ida";
}

function indicePorUuid(secoes: readonly Secao[]): Map<string, Secao> {
  return new Map(secoes.map((secao) => [secao.uuid, secao]));
}

/**
 * Sequência resumida de Seções do itinerário (§13.1 item 4b), no padrão
 * `Cidade - Nome da Seção` (RN-076) ligado por seta. Paradas que referenciam
 * Local são ignoradas: Locais não aparecem no corpo do PDF, só no anexo
 * técnico (RN-031/RN-076; §13.1 item 8b, TASK-034).
 */
export function sequenciaDeSecoes(
  itinerario: Itinerario,
  secoes: readonly Secao[],
): string {
  const porUuid = indicePorUuid(secoes);
  // A Spec 02 §10 exige `paradas` ordenado por `ordem`, mas o PDF ordena
  // defensivamente antes de ler, como já fazem `motor-montagem.ts`,
  // `montagem-grade.ts` e `redistribuicao-offsets.ts`: a travessia é o que a
  // peça operacional afirma, e ela não pode depender da ordem do array.
  return [...itinerario.paradas]
    .sort((a, b) => a.ordem - b.ordem)
    .filter((parada) => parada.secao_uuid !== undefined)
    .map((parada) => porUuid.get(parada.secao_uuid as string))
    .filter((secao): secao is Secao => secao !== undefined)
    .map(nomeExibicaoSecao)
    .join(SETA_SEQUENCIA);
}

function itensDaDescricao(itinerario: Itinerario): ItemDescricaoPdf[] {
  return itinerario.rota.descricao_itinerario.itens.map((item) =>
    item.tipo === "secao"
      ? { tipo: "secao" as const, texto: item.rotulo }
      : { tipo: "via" as const, texto: item.nome },
  );
}

function montarCapa(documento: DocumentoOperacao): BlocoCapa {
  const { autos } = documento;
  const vigente = autos.status === "vigente";
  return {
    titulo: TITULO_PDF,
    codigo: autos.codigo,
    empresa: autos.empresa,
    tipo: autos.tipo,
    status: autos.status,
    rotuloData: vigente ? "Data de publicação" : "Data de criação",
    data: formatarDataIso(vigente ? autos.data_publicacao : autos.data_criacao),
  };
}

function montarResumo(documento: DocumentoOperacao): BlocoResumo {
  const contagens = contarAutos(documento.autos);
  const porFaixa = contarAutosPorFaixa(documento.autos);
  return {
    rotuloSemanaPadrao: ROTULO_SEMANA_PADRAO,
    // Os 7 contadores por Serviço do §10, na mesma ordem da spec.
    porServico: contagens.porServico.map((c) => ({
      servicoUuid: c.servicoUuid,
      numeroN: c.numeroN,
      viagensIda: c.ida.viagensSemana,
      viagensVolta: c.volta.viagensSemana,
      viagensTotal: c.totalViagensSemana,
      paresCompraveis: c.paresCompraveis,
      opcoesIda: c.ida.opcoesDeslocamento,
      opcoesVolta: c.volta.opcoesDeslocamento,
      opcoesDeslocamento: c.totalOpcoesDeslocamento,
    })),
    totalViagensSemana: contagens.totalViagensSemana,
    totalOpcoesDeslocamento: contagens.totalOpcoesDeslocamento,
    // §10 — os 2 contadores do Autos, estratificados. O rótulo de cada faixa
    // carrega o intervalo da spec ("Pico manhã (05:00–08:59)").
    porFaixa: FAIXAS_HORARIO.map((faixa) => ({
      rotulo: rotuloFaixaComIntervalo(faixa),
      viagensSemana: porFaixa.totais[faixa.id].viagensSemana,
      opcoesDeslocamento: porFaixa.totais[faixa.id].opcoesDeslocamento,
    })),
    // §10 — "por Serviço e no total do Autos": a mesma estratificação, agora
    // com os contadores do Serviço. Vem DEPOIS do total, que abre o bloco.
    porFaixaPorServico: contagens.porServico.map((c) => ({
      servicoUuid: c.servicoUuid,
      numeroN: c.numeroN,
      paresCompraveis: c.paresCompraveis,
      faixas: FAIXAS_HORARIO.map((faixa) => {
        const naFaixa = porFaixa.porServico[c.servicoUuid][faixa.id];
        return {
          rotulo: rotuloFaixaComIntervalo(faixa),
          viagensIda: naFaixa.ida.viagensSemana,
          viagensVolta: naFaixa.volta.viagensSemana,
          viagensSemana: naFaixa.totalViagensSemana,
          opcoesIda: naFaixa.ida.opcoesDeslocamento,
          opcoesVolta: naFaixa.volta.opcoesDeslocamento,
          opcoesDeslocamento: naFaixa.totalOpcoesDeslocamento,
        };
      }),
    })),
  };
}

function montarServico(servico: Servico): BlocoServico {
  const contagens = contarServico(servico);
  return {
    servicoUuid: servico.uuid,
    numeroN: servico.numero_n,
    caracteristicaVeiculo: servico.caracteristica_veiculo,
    carater: servico.carater,
    direcionalidade: direcionalidadeDoServico(servico),
    viagensSemana: contagens.totalViagensSemana,
    paresCompraveis: contagens.paresCompraveis,
    opcoesDeslocamento: contagens.totalOpcoesDeslocamento,
  };
}

function montarItinerarios(
  documento: DocumentoOperacao,
  obterImagem: ProvedorImagemMapa | undefined,
): BlocoItinerario[] {
  const blocos: BlocoItinerario[] = [];
  for (const servico of documento.autos.servicos) {
    // Ida antes de Volta, independentemente da ordem no arquivo (§13.1 item 4).
    const ordenados = [...servico.itinerarios].sort((a, b) =>
      a.sentido === b.sentido ? 0 : a.sentido === "ida" ? -1 : 1,
    );
    for (const itinerario of ordenados) {
      const imagem = obterImagem?.(servico.uuid, itinerario.sentido);
      // DEC-105: numeração hierárquica derivada das mesmas paradas, por
      // Serviço/sentido — independente de a captura do mapa ter vindo ou não.
      const { legendaSecoes, identificadoresLocais } = numerarItinerario(
        itinerario,
        servico.uuid,
        documento.autos.secoes,
        servico.locais,
      );
      blocos.push({
        servicoUuid: servico.uuid,
        sentido: itinerario.sentido,
        titulo: `Serviço ${servico.numero_n} — ${ROTULO_SENTIDO[itinerario.sentido]}`,
        sequenciaSecoes: sequenciaDeSecoes(itinerario, documento.autos.secoes),
        descricaoTexto: itinerario.rota.descricao_itinerario.texto,
        descricaoItens: itensDaDescricao(itinerario),
        ...(imagem ? { imagemMapa: imagem } : {}),
        legendaSecoes,
        identificadoresLocais,
      });
    }
  }
  return blocos;
}

/**
 * Monta o modelo do PDF operacional a partir do documento congelado
 * (Spec 04 §13.1). Puro: sem relógio implícito (a data/hora do rodapé é
 * injetável) e sem captura de canvas (as imagens vêm do provedor — DEC-104).
 */
export function montarModeloPdfOperacional(
  documento: DocumentoOperacao,
  opcoes: OpcoesModeloPdf = {},
): ModeloPdfOperacional {
  return {
    ordemBlocos: ORDEM_BLOCOS,
    capa: montarCapa(documento),
    resumo: montarResumo(documento),
    servicos: documento.autos.servicos.map(montarServico),
    itinerarios: montarItinerarios(documento, opcoes.obterImagemDoItinerario),
    // Itens 5–8 (TASK-034). A versão simples fica no corpo e a detalhada, no
    // anexo (RN-075); as matrizes são lidas congeladas (RN-015).
    tabelasHorarias: montarTabelasHorarias(documento, "simples"),
    matrizesDistancias: montarMatrizesDistancias(documento),
    matrizesSeccionamento: montarMatrizesSeccionamento(documento),
    anexoTecnico: montarAnexoTecnico(documento),
    rodape: {
      versaoSchema: documento.versao_schema,
      geradoEm: formatarDataHora(opcoes.geradoEm ?? new Date()),
      aviso: AVISO_SEI,
    },
  };
}
