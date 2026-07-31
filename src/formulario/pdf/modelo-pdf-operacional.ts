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
} from "@/shared/contagens";
// Import profundo deliberado (precedente: `pendencias/pendencias.ts`): o índice
// de `secoes` reexporta o editor React, e este módulo é puro — o modelo do PDF
// não deve arrastar componente de mapa nem de UI.
import { nomeExibicaoSecao } from "@/formulario/secoes/fluxos-secao";

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
// Escopo desta task: itens 1, 2, 3, 4 e 9 do §13.1. Os itens 5–8 (tabelas
// horárias, matriz de distâncias, matriz de seccionamento e anexo técnico) são
// da TASK-034 e entram como blocos próprios entre `itinerarios` e `rodape` —
// por isso a ordem do §13.1 mora numa constante única (`ORDEM_BLOCOS`), e não
// espalhada pelo componente.

/** Título fixo da capa (§13.1 item 1). Não há ativo de logotipo no projeto. */
export const TITULO_PDF = "ROTA — Tabela Operacional";

/** Aviso obrigatório de fronteira com o SEI (RN-077; §13.1 item 9). */
export const AVISO_SEI =
  "O fluxo administrativo (análise, pendências e aprovação) permanece no SEI. Este documento não substitui a publicação oficial.";

/** Separador da sequência resumida de Seções (§13.1 item 4b). */
export const SETA_SEQUENCIA = " → ";

/**
 * Ordem dos blocos do §13.1. Os itens 5–8 constam da ordem mesmo sem
 * implementação nesta task: a TASK-034 os preenche sem reordenar nada.
 */
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

export interface LinhaResumoServico {
  servicoUuid: string;
  numeroN: string;
  viagensIda: number;
  viagensVolta: number;
  viagensTotal: number;
  paresCompraveis: number;
  opcoesDeslocamento: number;
}

export interface LinhaResumoFaixa {
  rotulo: string;
  viagensSemana: number;
  opcoesDeslocamento: number;
}

/** §13.1 item 2 — contadores do §10, sempre rotulados (RN-069/NEG-018). */
export interface BlocoResumo {
  rotuloSemanaPadrao: string;
  porServico: LinhaResumoServico[];
  totalViagensSemana: number;
  totalOpcoesDeslocamento: number;
  porFaixa: LinhaResumoFaixa[];
}

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
  return itinerario.paradas
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
    porServico: contagens.porServico.map((c) => ({
      servicoUuid: c.servicoUuid,
      numeroN: c.numeroN,
      viagensIda: c.ida.viagensSemana,
      viagensVolta: c.volta.viagensSemana,
      viagensTotal: c.totalViagensSemana,
      paresCompraveis: c.paresCompraveis,
      opcoesDeslocamento: c.totalOpcoesDeslocamento,
    })),
    totalViagensSemana: contagens.totalViagensSemana,
    totalOpcoesDeslocamento: contagens.totalOpcoesDeslocamento,
    porFaixa: FAIXAS_HORARIO.map((faixa) => ({
      rotulo: faixa.rotulo,
      viagensSemana: porFaixa.totais[faixa.id].viagensSemana,
      opcoesDeslocamento: porFaixa.totais[faixa.id].opcoesDeslocamento,
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
      blocos.push({
        servicoUuid: servico.uuid,
        sentido: itinerario.sentido,
        titulo: `Serviço ${servico.numero_n} — ${ROTULO_SENTIDO[itinerario.sentido]}`,
        sequenciaSecoes: sequenciaDeSecoes(itinerario, documento.autos.secoes),
        descricaoTexto: itinerario.rota.descricao_itinerario.texto,
        descricaoItens: itensDaDescricao(itinerario),
        ...(imagem ? { imagemMapa: imagem } : {}),
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
    rodape: {
      versaoSchema: documento.versao_schema,
      geradoEm: formatarDataHora(opcoes.geradoEm ?? new Date()),
      aviso: AVISO_SEI,
    },
  };
}
