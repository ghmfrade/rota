import { criarLocal, type Itinerario, type Local } from "@/shared/contrato";
import {
  derivarMunicipio,
  pontoDecisorLocal,
  validaLocalPareado,
  type Ponto,
} from "@/shared/geo";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";

// Motor puro do editor de Locais no mapa (TASK-018; Spec 04 §7.2). Cobre os
// gestos da spec — criar (unidirecional, sem espelho — DEC-075), arrastar
// (350 m pareada Ida×Volta, só para Local legado com os dois pontos) e
// remover a entidade (DEC-076) — aplicando RN-031/032/029 sem depender de
// React nem do mapa. A montagem da etapa real (seleção de Serviço/sentido,
// tabela lateral, remoção das Paradas que referenciam a entidade removida,
// persistência em sessão) é da TASK-019/TASK-094; este módulo só entrega o
// motor que ela consumirá, mais o componente controlado `EditorLocais` para o
// harness de teste. Ao contrário da Seção (TASK-017), o Local NÃO é compartilhado
// (RN-031) — não há fluxo de "reutilizar Local existente".

export type Sentido = Itinerario["sentido"];

/** Mensagens operacionais literais da Spec 04 §14 (nunca parafraseadas). */
export const MENSAGEM_RECUSA_350M_LOCAL =
  "Os pontos de Ida e Volta deste Local não podem distar mais de 350 m entre si. Crie dois Locais distintos se necessário.";
export const MENSAGEM_FORA_DE_SP =
  "Não foi possível identificar o município deste ponto. Verifique se ele está dentro do Estado de São Paulo.";

/** "Cidade - Nome", padrão visual das telas/tabelas/anexo do PDF (Spec 04 §7.1, §13.1). */
export function nomeExibicaoLocal(local: Pick<Local, "municipio" | "nome">): string {
  return `${local.municipio} - ${local.nome}`;
}

export interface RecursosMunicipio {
  features: readonly FeatureMunicipio[];
  nomes: ReadonlyMap<string, string>;
}

// DEC-075/Spec 04 §7.2: a criação de um Local gera SEMPRE apenas a
// geolocalização do sentido em edição, mesmo em Serviço bidirecional — sem
// espelhamento nem vínculo entre um Local da Ida e um Local da Volta.
function camposDeCriacao(
  ponto: Ponto,
  sentido: Sentido,
): Pick<Local, "geolocalizacao_ida" | "geolocalizacao_volta"> {
  const geoloc: Ponto = { latitude: ponto.latitude, longitude: ponto.longitude };
  return sentido === "ida"
    ? { geolocalizacao_ida: geoloc }
    : { geolocalizacao_volta: geoloc };
}

// ---------------------------------------------------------------------------
// 1) Criar Local novo (Spec 04 §7.2; RN-031, RN-032, RN-029)
// ---------------------------------------------------------------------------

export interface EntradaCriarLocal extends RecursosMunicipio {
  nome: string;
  ponto: Ponto;
  sentido: Sentido;
}

export type ResultadoCriarLocal =
  | { ok: true; local: Local }
  | { ok: false; motivo: "fora_de_sp" };

/**
 * Clique no mapa cria Local novo (Spec 04 §7.2; DEC-075). Não há checagem dos
 * 350 m na criação: o Local nasce sempre com um único ponto, o do sentido em
 * edição (trivialmente ≤ 350 m — RN-032, caso ele venha a ganhar um par depois
 * via legado). `municipio` é derivado do ponto decisor (RN-029), nunca
 * digitado.
 */
export function criarLocalNoPonto(entrada: EntradaCriarLocal): ResultadoCriarLocal {
  const nome = entrada.nome.trim();
  if (!nome) {
    throw new Error("[RN-031] nome do Local é obrigatório (Spec 02 §7)");
  }

  const campos = camposDeCriacao(entrada.ponto, entrada.sentido);
  const municipio = derivarMunicipio(
    pontoDecisorLocal(campos.geolocalizacao_ida, campos.geolocalizacao_volta),
    entrada.features,
    entrada.nomes,
  );
  if (!municipio.encontrado) {
    return { ok: false, motivo: "fora_de_sp" };
  }

  const local = criarLocal({ municipio: municipio.nome, nome, ...campos });
  return { ok: true, local };
}

// ---------------------------------------------------------------------------
// 2) Arrastar ponto existente (Spec 04 §7.2, §7.3; RN-032, RN-029)
// ---------------------------------------------------------------------------

export interface EntradaRevalidarArrastoLocal extends RecursosMunicipio {
  local: Local;
  sentido: Sentido;
  pontoNovo: Ponto;
}

export type ResultadoArrastoLocal =
  | { ok: true; local: Local }
  | { ok: false; motivo: "350m"; nomeLocal: string }
  | { ok: false; motivo: "fora_de_sp" };

/**
 * "Soltar" o marcador de um Local dispara a revalidação dos 350 m PAREADA (Spec
 * 04 §7.3; RN-032): sem cluster nem centroide — um único Serviço, no máximo dois
 * pontos. O ponto do sentido arrastado passa a ser `pontoNovo`; se o outro
 * sentido existe, mede-se a Haversine entre os dois. Recusa → o ponto NÃO se
 * move (o chamador mantém a posição antiga) e a UI mostra a mensagem literal da
 * Spec 04 §14. Sem afordância de "criar Local novo" na recusa (DEC-044/Q-025,
 * simétrico à Seção): arrastar não pode descaracterizar o Local; quem quer dois
 * Locais distintos usa o fluxo normal de criação. `nomeLocal` serve só para
 * compor a mensagem, não uma oferta.
 */
export function revalidarArrastoLocal(
  entrada: EntradaRevalidarArrastoLocal,
): ResultadoArrastoLocal {
  const pontoNovo: Ponto = {
    latitude: entrada.pontoNovo.latitude,
    longitude: entrada.pontoNovo.longitude,
  };
  const geolocIda =
    entrada.sentido === "ida" ? pontoNovo : entrada.local.geolocalizacao_ida;
  const geolocVolta =
    entrada.sentido === "volta" ? pontoNovo : entrada.local.geolocalizacao_volta;

  if (!validaLocalPareado(geolocIda, geolocVolta)) {
    return { ok: false, motivo: "350m", nomeLocal: nomeExibicaoLocal(entrada.local) };
  }

  const municipio = derivarMunicipio(
    pontoDecisorLocal(geolocIda, geolocVolta),
    entrada.features,
    entrada.nomes,
  );
  if (!municipio.encontrado) {
    return { ok: false, motivo: "fora_de_sp" };
  }

  const campos: Pick<Local, "geolocalizacao_ida" | "geolocalizacao_volta"> =
    entrada.sentido === "ida"
      ? { geolocalizacao_ida: pontoNovo }
      : { geolocalizacao_volta: pontoNovo };

  return {
    ok: true,
    local: { ...entrada.local, ...campos, municipio: municipio.nome },
  };
}

// ---------------------------------------------------------------------------
// 3) Remover a entidade Local (Spec 04 §7.2; RN-031; DEC-076)
// ---------------------------------------------------------------------------

/**
 * Remove a entidade `localUuid` de `locais` (DEC-076: o "X" da linha do Local
 * na tabela lateral remove a entidade inteira, não só um sentido). Função
 * pura — preserva as demais entidades e suas UUIDs; a remoção das Paradas que
 * referenciam este Local (nos dois sentidos, para Local legado com dois
 * pontos) é responsabilidade do host (`removerParadasDeLocal`,
 * `formulario/itinerarios/motor-montagem.ts`).
 */
export function removerEntidadeLocal(
  locais: readonly Local[],
  localUuid: string,
): Local[] {
  return locais.filter((local) => local.uuid !== localUuid);
}
