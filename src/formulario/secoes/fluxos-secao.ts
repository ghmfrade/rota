import {
  criarSecao,
  type Itinerario,
  type Secao,
  type SecaoServico,
} from "@/shared/contrato";
import {
  derivarMunicipio,
  inserirEmSecao,
  pontoDecisorSecao,
  type Ponto,
} from "@/shared/geo";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";

// Motor puro do editor de Seções no mapa (TASK-017; Spec 04 §7.1). Cobre os
// três gestos da spec — criar, reutilizar/contribuir, arrastar — aplicando
// RN-025..027/029 sem depender de React nem do mapa. A montagem da etapa real
// (seleção de Serviço/sentido, tabela lateral, persistência em sessão) é da
// TASK-019 (Q-024/DEC-043) — este módulo só entrega o motor que ela consumirá,
// mais o componente controlado `EditorSecoes` para o harness de teste.

export type Sentido = Itinerario["sentido"];

/** Mensagens operacionais literais da Spec 04 §14 (nunca parafraseadas). */
export const MENSAGEM_RECUSA_350M_SECAO =
  "Este ponto fica a mais de 350 m do conjunto de pontos desta Seção. Crie uma Seção separada (com outro nome) para este local.";
export const MENSAGEM_FORA_DE_SP =
  "Não foi possível identificar o município deste ponto. Verifique se ele está dentro do Estado de São Paulo.";

/** "Cidade - Nome" — padrão visual fixado pela Spec 04 §7.1, usado em toda tela/tabela/PDF. */
export function nomeExibicaoSecao(secao: Pick<Secao, "municipio" | "nome">): string {
  return `${secao.municipio} - ${secao.nome}`;
}

// RN-026: geolocalizacao_ida/volta só existem quando o Serviço percorre aquele
// sentido; um Serviço bidirecional recebe os dois campos no mesmo ponto no
// primeiro toque na Seção (criação OU reuso — Spec 04 §7.1 "cria Ida e Volta
// no mesmo ponto"), um unidirecional só o campo do seu único sentido.
function camposDeContribuicao(
  ponto: Ponto,
  bidirecional: boolean,
  sentido: Sentido,
): Pick<SecaoServico, "geolocalizacao_ida" | "geolocalizacao_volta"> {
  const geoloc: Ponto = { latitude: ponto.latitude, longitude: ponto.longitude };
  if (bidirecional) {
    return { geolocalizacao_ida: geoloc, geolocalizacao_volta: { ...geoloc } };
  }
  return sentido === "ida"
    ? { geolocalizacao_ida: geoloc }
    : { geolocalizacao_volta: geoloc };
}

// RN-027: cluster cumulativo de TODOS os pontos contribuídos à Seção (ida e
// volta, de todas as entradas), com exclusão opcional de UM campo específico
// (usada pelo arrasto: o ponto sendo movido não conta como "já aceito" contra
// si mesmo).
function coletarPontos(
  secao: Secao,
  excluir?: { servicoUuid: string; sentido: Sentido },
): Ponto[] {
  const pontos: Ponto[] = [];
  for (const entrada of secao.servicos) {
    const pulaIda =
      excluir?.sentido === "ida" && excluir.servicoUuid === entrada.servico_uuid;
    const pulaVolta =
      excluir?.sentido === "volta" && excluir.servicoUuid === entrada.servico_uuid;
    if (entrada.geolocalizacao_ida && !pulaIda) {
      pontos.push(entrada.geolocalizacao_ida);
    }
    if (entrada.geolocalizacao_volta && !pulaVolta) {
      pontos.push(entrada.geolocalizacao_volta);
    }
  }
  return pontos;
}

// Cria ou funde a entrada de `servico_uuid` em `secao.servicos[]`, sem mutar
// `secao`. Preserva o campo do sentido oposto se já existia (ex.: Volta chega
// depois de Ida já ter sido contribuída por este Serviço).
function upsertContribuicao(
  secao: Secao,
  servicoUuid: string,
  campos: Pick<SecaoServico, "geolocalizacao_ida" | "geolocalizacao_volta">,
): Secao {
  const indice = secao.servicos.findIndex((s) => s.servico_uuid === servicoUuid);
  const existente = indice === -1 ? undefined : secao.servicos[indice];
  const fundida: SecaoServico = {
    servico_uuid: servicoUuid,
    geolocalizacao_ida: campos.geolocalizacao_ida ?? existente?.geolocalizacao_ida,
    geolocalizacao_volta: campos.geolocalizacao_volta ?? existente?.geolocalizacao_volta,
  };
  const servicos = [...secao.servicos];
  if (indice === -1) {
    servicos.push(fundida);
  } else {
    servicos[indice] = fundida;
  }
  return { ...secao, servicos };
}

export interface RecursosMunicipio {
  features: readonly FeatureMunicipio[];
  nomes: ReadonlyMap<string, string>;
}

/**
 * Pontos distintos já contribuídos a uma Seção, ofertados como posições
 * possíveis ao reutilizá-la (Spec 04 §7.1: "oferece esses pontos como opções
 * de posição... se houver apenas um ponto, ele é lançado direto"). Dedup por
 * coordenada — não há necessidade de repetir a mesma posição na lista.
 */
export function pontosOfertadosParaReuso(secao: Secao): Ponto[] {
  const vistos = new Set<string>();
  const distintos: Ponto[] = [];
  for (const ponto of coletarPontos(secao)) {
    const chave = `${ponto.latitude},${ponto.longitude}`;
    if (!vistos.has(chave)) {
      vistos.add(chave);
      distintos.push(ponto);
    }
  }
  return distintos;
}

// ---------------------------------------------------------------------------
// 1) Criar Seção nova (Spec 04 §7.1; RN-025, RN-026, RN-029)
// ---------------------------------------------------------------------------

export interface EntradaCriarSecao extends RecursosMunicipio {
  nome: string;
  ponto: Ponto;
  servicoUuid: string;
  sentido: Sentido;
  bidirecional: boolean;
}

export type ResultadoCriarSecao =
  | { ok: true; secao: Secao }
  | { ok: false; motivo: "fora_de_sp" };

/**
 * Clique no mapa cria Seção nova (Spec 04 §7.1). O 1º ponto de uma Seção nova
 * é sempre aceito sem checagem dos 350 m (RN-027) — não há cluster prévio.
 * `municipio` é derivado do ponto clicado (RN-029), nunca digitado.
 */
export function criarSecaoNoPonto(entrada: EntradaCriarSecao): ResultadoCriarSecao {
  const nome = entrada.nome.trim();
  if (!nome) {
    throw new Error("[RN-025] nome da Seção é obrigatório (Spec 02 §5)");
  }

  const municipio = derivarMunicipio(entrada.ponto, entrada.features, entrada.nomes);
  if (!municipio.encontrado) {
    return { ok: false, motivo: "fora_de_sp" };
  }

  const campos = camposDeContribuicao(entrada.ponto, entrada.bidirecional, entrada.sentido);
  const secao = criarSecao({
    municipio: municipio.nome,
    nome,
    servicos: [{ servico_uuid: entrada.servicoUuid, ...campos }],
  });
  return { ok: true, secao };
}

// ---------------------------------------------------------------------------
// 2) Reutilizar Seção existente / contribuir geolocalização (Spec 04 §7.1;
//    RN-026, RN-027, RN-029)
// ---------------------------------------------------------------------------

export interface EntradaContribuir extends RecursosMunicipio {
  secao: Secao;
  servicoUuid: string;
  sentido: Sentido;
  bidirecional: boolean;
  ponto: Ponto;
}

export type ResultadoContribuir =
  | { ok: true; secao: Secao }
  | { ok: false; motivo: "350m" }
  | { ok: false; motivo: "fora_de_sp" };

/**
 * Contribui a geolocalização do Serviço/sentido corrente a uma Seção já
 * existente no documento (reuso — Spec 04 §7.1). O ponto escolhido entra no
 * cluster cumulativo da Seção (RN-027): reaproveitar um dos pontos já
 * ofertados é sempre trivialmente aceito (ele já pertence ao conjunto), mas a
 * checagem roda de qualquer forma — não há caminho para inserir coordenada
 * fora do cluster sem passar por aqui.
 */
export function contribuirParaSecaoExistente(
  entrada: EntradaContribuir,
): ResultadoContribuir {
  const campos = camposDeContribuicao(entrada.ponto, entrada.bidirecional, entrada.sentido);
  const candidatos = [campos.geolocalizacao_ida, campos.geolocalizacao_volta].filter(
    (p): p is Ponto => p !== undefined,
  );

  let cluster = coletarPontos(entrada.secao);
  for (const candidato of candidatos) {
    const resultado = inserirEmSecao(cluster, candidato);
    if (!resultado.aceito) {
      return { ok: false, motivo: "350m" };
    }
    cluster = [...cluster, candidato];
  }

  const municipio = derivarMunicipio(pontoDecisorSecao(cluster), entrada.features, entrada.nomes);
  if (!municipio.encontrado) {
    return { ok: false, motivo: "fora_de_sp" };
  }

  const secaoAtualizada = upsertContribuicao(entrada.secao, entrada.servicoUuid, campos);
  return { ok: true, secao: { ...secaoAtualizada, municipio: municipio.nome } };
}

// ---------------------------------------------------------------------------
// 3) Arrastar ponto existente (Spec 04 §7.1, §7.3; RN-027, RN-029)
// ---------------------------------------------------------------------------

export interface EntradaRevalidarArrasto extends RecursosMunicipio {
  secao: Secao;
  servicoUuid: string;
  sentido: Sentido;
  pontoNovo: Ponto;
}

export type ResultadoArrasto =
  | { ok: true; secao: Secao }
  | { ok: false; motivo: "350m"; nomeSecao: string }
  | { ok: false; motivo: "fora_de_sp" };

/**
 * "Soltar" o marcador de uma Seção dispara a revalidação dos 350 m (Spec 04
 * §7.3). O ponto sendo movido é excluído do cluster antes de testar o
 * candidato — senão o próprio ponto (já aceito antes) sempre passaria. Recusa
 * → o ponto NÃO se move (o chamador mantém a posição antiga) e a UI mostra a
 * mensagem literal da Spec 04 §14, nomeando a Seção afetada (decisão do
 * responsável pelo domínio: sem oferta automática de criar Seção nova — o
 * usuário cria pelo fluxo normal de clique, se quiser).
 */
export function revalidarArrasto(entrada: EntradaRevalidarArrasto): ResultadoArrasto {
  const pontosSemAlvo = coletarPontos(entrada.secao, {
    servicoUuid: entrada.servicoUuid,
    sentido: entrada.sentido,
  });

  const resultado = inserirEmSecao(pontosSemAlvo, entrada.pontoNovo);
  if (!resultado.aceito) {
    return { ok: false, motivo: "350m", nomeSecao: nomeExibicaoSecao(entrada.secao) };
  }

  const clusterResultante = [...pontosSemAlvo, entrada.pontoNovo];
  const municipio = derivarMunicipio(
    pontoDecisorSecao(clusterResultante),
    entrada.features,
    entrada.nomes,
  );
  if (!municipio.encontrado) {
    return { ok: false, motivo: "fora_de_sp" };
  }

  const campos: Pick<SecaoServico, "geolocalizacao_ida" | "geolocalizacao_volta"> =
    entrada.sentido === "ida"
      ? { geolocalizacao_ida: { ...entrada.pontoNovo } }
      : { geolocalizacao_volta: { ...entrada.pontoNovo } };

  const secaoAtualizada = upsertContribuicao(entrada.secao, entrada.servicoUuid, campos);
  return { ok: true, secao: { ...secaoAtualizada, municipio: municipio.nome } };
}
