import {
  esquemaDocumentoOperacao,
  type DocumentoOperacao,
  type Itinerario,
  type Servico,
} from "@/shared/contrato";
import {
  coletarPendencias,
  ROTULO_SENTIDO,
  type ItinerarioAoVivo,
  type Pendencia,
} from "@/formulario/pendencias";
import type { SessaoFormulario } from "@/formulario/sessao";
import { rotuloEtapa, type IdEtapa } from "@/formulario/layout/etapas";
import { montarDocumentoParaExportacao } from "./montar-documento";

// Gate de exportação para a etapa Exportação (TASK-032; RN-078; Spec 04
// §11/§14): "Tentativa de exportar com erro bloqueante → Botões de exportação
// desabilitados + painel de pendências em foco" — os botões precisam ficar
// desabilitados ANTES do clique, não só rejeitar depois. Combina as
// pendências vivas de sessão (`coletarPendencias` — rota ausente, descrição
// ausente, matriz desatualizada) com a validação estrutural do schema
// (Spec 02 §14 — Seção/Local incompletos, itinerário sem viagem, 350 m,
// tipificação).
//
// Data-placeholder usada SÓ para satisfazer a checagem cruzada de RN-011
// (status↔data) ao avaliar a validade estrutural ANTES de uma data real ser
// escolhida no clique da ação de exportação (Spec 04 §12; `exportar-documento.ts`
// resolve a data de verdade). Nunca é gravada nem exportada — isola, neste
// gate de PRÉ-habilitação, os erros estruturais reais (§11) do bookkeeping de
// data que só se resolve no clique.
const DATA_PLACEHOLDER_CHECAGEM = "2000-01-01";

function paraChecagemEstrutural(documento: DocumentoOperacao): DocumentoOperacao {
  const autos = { ...documento.autos };
  if (autos.status === "proposta") {
    autos.data_criacao = autos.data_criacao ?? DATA_PLACEHOLDER_CHECAGEM;
    delete autos.data_publicacao;
  } else {
    autos.data_publicacao = autos.data_publicacao ?? DATA_PLACEHOLDER_CHECAGEM;
    delete autos.data_criacao;
  }
  return { ...documento, autos };
}

// TASK-085 (bug de feedback): as violações estruturais (Spec 02 §14) e de
// forma do schema (`esquemaDocumentoOperacao`) hoje só alimentavam o booleano
// `liberado` — descartadas antes de chegar à UI, o bloqueio ficava mudo. Daqui
// em diante cada issue do schema vira uma `Pendencia` operacional (mesma
// estrutura das demais — RN-078), com mensagem em linguagem de negócio (Spec
// 04 §14: "nunca de estrutura interna") e `etapaAlvo` navegável (§11).
//
// Duas fontes de mensagem (decisão do responsável, 2026-07-17 — modelo
// misto): (1) mensagem DEDICADA para as violações mais exercitáveis pela UI
// atual (a mesma superfície de edição de itinerário/mapa das TASK-063..071) —
// RN-018 (Seção órfã, o exemplo da task), RN-026, RN-030, RN-034/035, RN-036,
// RN-039, RN-057; (2) um FALLBACK genérico-mas-operacional para as demais
// (uuid duplicada, invariantes internas de rota/matriz/horário, mensagens de
// forma do zod sem tag `[RN-xxx]`) — nunca cita uuid, RN ou caminho JSON, só
// a entidade (Serviço/Seção/Local) resolvida a partir do caminho do issue e a
// etapa para revisar.

type Caminho = readonly PropertyKey[];

type EntidadeEItinerario = { servico?: Servico; itinerario?: Itinerario };

function comoIndice(valor: PropertyKey | undefined): number | undefined {
  return typeof valor === "number" ? valor : undefined;
}

function resolverServico(doc: DocumentoOperacao, caminho: Caminho): Servico | undefined {
  if (caminho[1] !== "servicos") return undefined;
  const indice = comoIndice(caminho[2]);
  return indice !== undefined ? doc.autos.servicos[indice] : undefined;
}

function resolverSecao(doc: DocumentoOperacao, caminho: Caminho) {
  if (caminho[1] !== "secoes") return undefined;
  const indice = comoIndice(caminho[2]);
  return indice !== undefined ? doc.autos.secoes[indice] : undefined;
}

/** Serviço + itinerário no caminho `autos.servicos[i].itinerarios[j]...` (RN-034/035/036/039). */
function resolverItinerario(doc: DocumentoOperacao, caminho: Caminho): EntidadeEItinerario {
  const servico = resolverServico(doc, caminho);
  if (!servico) return {};
  const posicao = caminho.indexOf("itinerarios");
  const indiceItinerario = posicao >= 0 ? comoIndice(caminho[posicao + 1]) : undefined;
  const itinerario =
    indiceItinerario !== undefined ? servico.itinerarios[indiceItinerario] : undefined;
  return { servico, itinerario };
}

function rotuloSecao(secao: { municipio: string; nome: string } | undefined): string {
  return secao ? `a Seção ${secao.municipio} - ${secao.nome}` : "uma Seção";
}

/** Serviço dono da entrada `autos.secoes[i].servicos[j]` (RN-018/026), pela `servico_uuid`. */
function servicoDaEntradaDeSecao(
  doc: DocumentoOperacao,
  secao: { servicos: { servico_uuid: string }[] } | undefined,
  indiceEntrada: number | undefined,
): Servico | undefined {
  const entrada = secao && indiceEntrada !== undefined ? secao.servicos[indiceEntrada] : undefined;
  return entrada ? doc.autos.servicos.find((s) => s.uuid === entrada.servico_uuid) : undefined;
}

function mensagemRN018(
  doc: DocumentoOperacao,
  caminho: Caminho,
  mensagemTecnica: string,
): string {
  if (caminho[1] === "servicos") {
    return "O documento não tem nenhum Serviço cadastrado. Cadastre ao menos um Serviço antes de exportar.";
  }
  const secao = resolverSecao(doc, caminho);
  const rotulo = rotuloSecao(secao);
  if (mensagemTecnica.includes("não existe em autos.servicos")) {
    return `${rotulo[0].toUpperCase()}${rotulo.slice(1)} está associada a um Serviço que não existe mais no documento. Corrija a associação ou remova a Seção.`;
  }
  const servico = servicoDaEntradaDeSecao(doc, secao, comoIndice(caminho[4]));
  const doServico = servico ? ` do Serviço ${servico.numero_n}` : "";
  return `${rotulo[0].toUpperCase()}${rotulo.slice(1)} não está sendo usada por nenhuma Parada${doServico}. Adicione uma Parada apontando para ela ou remova a Seção.`;
}

function mensagemRN026(doc: DocumentoOperacao, caminho: Caminho): string {
  const secao = resolverSecao(doc, caminho);
  const rotulo = rotuloSecao(secao);
  const servico = servicoDaEntradaDeSecao(doc, secao, comoIndice(caminho[4]));
  const sentido = caminho[5] === "geolocalizacao_volta" ? "Volta" : "Ida";
  const doServico = servico ? ` do Serviço ${servico.numero_n}` : "";
  return `${rotulo[0].toUpperCase()}${rotulo.slice(1)} está sem a localização de ${sentido} preenchida, exigida pelo itinerário${doServico}.`;
}

function mensagemRN030(doc: DocumentoOperacao, caminho: Caminho): string {
  const servico = resolverServico(doc, caminho);
  return `No Serviço ${servico?.numero_n ?? ""}, a Ida e a Volta passam por conjuntos diferentes de Seções. Ajuste os itinerários para que passem pelas mesmas Seções.`;
}

function mensagemItinerarioInvalido(doc: DocumentoOperacao, caminho: Caminho): string {
  const { servico, itinerario } = resolverItinerario(doc, caminho);
  const sentido = itinerario ? ROTULO_SENTIDO[itinerario.sentido] : "";
  return `O itinerário de ${sentido} do Serviço ${servico?.numero_n ?? ""} está com a sequência de paradas inválida (extremos precisam ser Seção, mínimo 2 paradas, ordem sem lacunas). Revise as paradas no mapa antes de exportar.`;
}

function mensagemRN036(doc: DocumentoOperacao, caminho: Caminho): string {
  const { servico, itinerario } = resolverItinerario(doc, caminho);
  const sentido = itinerario ? ROTULO_SENTIDO[itinerario.sentido] : "";
  return `Uma Parada do itinerário de ${sentido} do Serviço ${servico?.numero_n ?? ""} está com a referência de Seção/Local incompleta ou com a localização do sentido faltando. Revise essa Parada no mapa.`;
}

function mensagemRN039(doc: DocumentoOperacao, caminho: Caminho): string {
  const { servico, itinerario } = resolverItinerario(doc, caminho);
  const sentido = itinerario ? ROTULO_SENTIDO[itinerario.sentido] : "";
  return `O itinerário de ${sentido} do Serviço ${servico?.numero_n ?? ""} não tem nenhuma viagem cadastrada. Cadastre ao menos uma viagem antes de exportar.`;
}

function mensagemRN057(doc: DocumentoOperacao, caminho: Caminho): string {
  const servico = resolverServico(doc, caminho);
  return `O Serviço ${servico?.numero_n ?? ""} atende menos de 2 Seções. Todo Serviço precisa passar por ao menos 2 Seções distintas.`;
}

/** Rótulo genérico da entidade (Serviço/Seção/Local) para o fallback — nunca cita uuid, RN ou caminho JSON. */
function rotuloEntidadeGenerico(doc: DocumentoOperacao, caminho: Caminho): string {
  const secao = resolverSecao(doc, caminho);
  if (secao) return rotuloSecao(secao);

  const servico = resolverServico(doc, caminho);
  if (servico) {
    if (caminho[3] === "locais") {
      const indiceLocal = comoIndice(caminho[4]);
      const local = indiceLocal !== undefined ? servico.locais[indiceLocal] : undefined;
      if (local) return `o Local ${local.nome} (Serviço ${servico.numero_n})`;
    }
    return `o Serviço ${servico.numero_n}`;
  }

  if (caminho[1] === "data_criacao" || caminho[1] === "data_publicacao") {
    return "a Identificação do Autos";
  }
  return "o documento";
}

function etapaAlvoDoCaminho(caminho: Caminho): IdEtapa {
  if (caminho.includes("viagens")) return "viagens-horarios";
  if (caminho.includes("matriz_distancias") || caminho.includes("matriz_seccionamento")) {
    return "matrizes";
  }
  if (caminho.includes("secoes") || caminho.includes("itinerarios") || caminho.includes("locais")) {
    return "secoes-locais-itinerarios";
  }
  if (caminho.includes("data_criacao") || caminho.includes("data_publicacao")) {
    return "identificacao";
  }
  if (caminho.includes("servicos")) return "servicos";
  return "revisao";
}

function mensagemOperacional(
  doc: DocumentoOperacao,
  caminho: Caminho,
  mensagemTecnica: string,
  etapaAlvo: IdEtapa,
): string {
  const codigoRn = mensagemTecnica.match(/^\[RN-(\d+)\]/)?.[1];
  switch (codigoRn) {
    case "018":
      return mensagemRN018(doc, caminho, mensagemTecnica);
    case "026":
      return mensagemRN026(doc, caminho);
    case "030":
      return mensagemRN030(doc, caminho);
    case "034":
    case "035":
      return mensagemItinerarioInvalido(doc, caminho);
    case "036":
      return mensagemRN036(doc, caminho);
    case "039":
      return mensagemRN039(doc, caminho);
    case "057":
      return mensagemRN057(doc, caminho);
    default:
      return `Há um problema nos dados de ${rotuloEntidadeGenerico(doc, caminho)} que está impedindo a exportação. Revise a etapa "${rotuloEtapa(etapaAlvo)}" para localizar e corrigir.`;
  }
}

/**
 * Trilha técnica de DEV (TASK-086): RN (quando a mensagem do schema traz a
 * tag `[RN-xxx]`) + caminho JSON do issue + a mensagem crua do schema — nunca
 * exposta como texto visível (Spec 04 §14), só em `diagnostico` (atributo/log).
 */
function montarDiagnostico(caminho: Caminho, mensagemTecnica: string): string {
  const codigoRn = mensagemTecnica.match(/^\[RN-(\d+)\]/)?.[1];
  const rn = codigoRn ? `RN-${codigoRn}` : "sem RN";
  const caminhoTexto = caminho.join(".") || "documento";
  return `[${rn}] ${caminhoTexto}: ${mensagemTecnica}`;
}

/**
 * Roda a validação completa do schema (forma + Spec 02 §14) sobre o
 * documento e devolve cada violação já traduzida em `Pendencia` operacional.
 * `[]` quando o documento é estruturalmente válido.
 */
function coletarErrosEstruturais(documento: DocumentoOperacao): Pendencia[] {
  const resultado = esquemaDocumentoOperacao.safeParse(documento);
  if (resultado.success) return [];
  return resultado.error.issues.map((issue, indice) => {
    const caminho = issue.path;
    const etapaAlvo = etapaAlvoDoCaminho(caminho);
    return {
      id: `estrutural-${indice}-${caminho.join("-") || "documento"}`,
      severidade: "bloqueante",
      mensagem: mensagemOperacional(documento, caminho, issue.message, etapaAlvo),
      etapaAlvo,
      diagnostico: montarDiagnostico(caminho, issue.message),
    };
  });
}

export interface ResultadoGateExportacao {
  /** `true` quando a exportação está liberada (Spec 04 §11: sem bloqueantes). */
  liberado: boolean;
  /** Pendências bloqueantes ao vivo (rota/descrição/matriz — §11), se houver. */
  pendenciasBloqueantes: Pendencia[];
  /**
   * Violações estruturais do documento final (forma do schema + Spec 02
   * §14), traduzidas em mensagem operacional (Spec 04 §14) — expostas para a
   * Revisão/Exportação listarem o motivo do bloqueio, hoje mudo (TASK-085;
   * RN-078).
   */
  errosEstruturais: Pendencia[];
  /** `true` quando o documento ainda não é montável (modo "novo" sem identidade/Serviço). */
  documentoIncompleto: boolean;
}

/**
 * Avalia o gate de exportação sem escolher ação/data — usado para
 * habilitar/desabilitar os botões da etapa Exportação (Spec 04 §14). O clique
 * real ainda roda a validação completa via `exportarComoProposta`/
 * `exportarComoVigente` (Spec 04 §12.1 item 1); este gate só antecipa o
 * estado dos botões com a mesma fonte de verdade.
 */
export function avaliarGateExportacao(
  sessao: SessaoFormulario,
  itinerariosAoVivo: readonly ItinerarioAoVivo[],
): ResultadoGateExportacao {
  const pendenciasBloqueantes = coletarPendencias(sessao, itinerariosAoVivo).filter(
    (pendencia) => pendencia.severidade === "bloqueante",
  );
  const documento = montarDocumentoParaExportacao(sessao);
  if (!documento) {
    return {
      liberado: false,
      pendenciasBloqueantes,
      errosEstruturais: [],
      documentoIncompleto: true,
    };
  }
  const errosEstruturais = coletarErrosEstruturais(paraChecagemEstrutural(documento));
  if (errosEstruturais.length > 0 && process.env.NODE_ENV !== "production") {
    for (const erro of errosEstruturais) {
      console.debug("[gate-exportacao] erro estrutural:", erro.diagnostico);
    }
  }
  return {
    liberado: pendenciasBloqueantes.length === 0 && errosEstruturais.length === 0,
    pendenciasBloqueantes,
    errosEstruturais,
    documentoIncompleto: false,
  };
}
