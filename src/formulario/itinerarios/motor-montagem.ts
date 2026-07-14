import type { Local, Parada, Secao } from "@/shared/contrato";
import { nomeExibicaoSecao, type Sentido } from "@/formulario/secoes";
import { nomeExibicaoLocal } from "@/formulario/locais";
import type { ParadaRota } from "@/formulario/roteamento";

// Motor puro de montagem do itinerário (TASK-019; Spec 04 §7.3; RN-030,
// RN-033..036, RN-038). Cobre a inserção/remoção/reordenação de paradas
// (Seções e Locais, em ordem) e as validações que dependem do itinerário
// inteiro — as que `validarReferenciasDeParada`/`validarItinerario`
// (`shared/contrato/validacoes-estruturais.ts`) já verificam ESTRUTURALMENTE
// no documento fechado, mas que aqui precisam de checagem ao vivo, gesto a
// gesto, ANTES de existir um `Itinerario` schema-válido (ex.: um Serviço em
// construção, sem `viagens` ainda). Nenhuma UI, nenhum estado de sessão aqui —
// a etapa real (`etapa-itinerarios.tsx`) e a sessão (`sessao.ts`) consomem
// este módulo.

/**
 * Referência de UMA parada em edição — XOR por construção (RN-033): o union
 * discriminado torna impossível representar "os dois" ou "nenhum". `ordem` não
 * é campo aqui (RN-034): é sempre a posição no array, atribuída só na
 * conversão para o contrato (`paradasParaContrato`).
 */
export type ParadaEmEdicao =
  | { tipo: "secao"; secaoUuid: string }
  | { tipo: "local"; localUuid: string };

export function paradaDeSecao(secaoUuid: string): ParadaEmEdicao {
  return { tipo: "secao", secaoUuid };
}

export function paradaDeLocal(localUuid: string): ParadaEmEdicao {
  return { tipo: "local", localUuid };
}

/** Insere uma parada na posição `indice` (default: ao final — Spec 04 §7.3
 * item 2, "insere em ordem"). Não muta `paradas`. */
export function inserirParada(
  paradas: readonly ParadaEmEdicao[],
  parada: ParadaEmEdicao,
  indice: number = paradas.length,
): ParadaEmEdicao[] {
  const copia = [...paradas];
  copia.splice(indice, 0, parada);
  return copia;
}

/** Remove a parada de `indice`. Não muta `paradas`. */
export function removerParada(
  paradas: readonly ParadaEmEdicao[],
  indice: number,
): ParadaEmEdicao[] {
  const copia = [...paradas];
  copia.splice(indice, 1);
  return copia;
}

/** Move a parada de `deIndice` para `paraIndice` (tabela lateral — Spec 04
 * §7.3 item 3, "reordenar = recalcular rota"). Não muta `paradas`. */
export function reordenarParada(
  paradas: readonly ParadaEmEdicao[],
  deIndice: number,
  paraIndice: number,
): ParadaEmEdicao[] {
  const copia = [...paradas];
  const [movida] = copia.splice(deIndice, 1);
  copia.splice(paraIndice, 0, movida);
  return copia;
}

/**
 * Remove toda parada que referencie `localUuid` (DEC-045): a exclusão do
 * ponto de um sentido no editor de Locais (TASK-018) torna o Local
 * unidirecional e sinaliza; esta função aplica a consequência na tabela de
 * paradas do sentido excluído — "a parada correspondente sai do itinerário
 * daquele sentido" (Spec 04 §7.2).
 */
export function removerParadasDeLocal(
  paradas: readonly ParadaEmEdicao[],
  localUuid: string,
): ParadaEmEdicao[] {
  return paradas.filter((p) => !(p.tipo === "local" && p.localUuid === localUuid));
}

/** Converte para o formato do contrato (Spec 02 §10.1), atribuindo `ordem`
 * 1-based pela posição no array (RN-034 satisfeita por construção). */
export function paradasParaContrato(paradas: readonly ParadaEmEdicao[]): Parada[] {
  return paradas.map((parada, indice) => ({
    ordem: indice + 1,
    ...(parada.tipo === "secao"
      ? { secao_uuid: parada.secaoUuid }
      : { local_uuid: parada.localUuid }),
  }));
}

/** Converte paradas do contrato (documento carregado) para o modelo de
 * edição, ordenando por `ordem` — o inverso de `paradasParaContrato`. */
export function paradasEmEdicaoDeContrato(
  paradas: readonly Parada[],
): ParadaEmEdicao[] {
  return [...paradas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((parada) =>
      parada.secao_uuid !== undefined
        ? paradaDeSecao(parada.secao_uuid)
        : paradaDeLocal(parada.local_uuid as string),
    );
}

export type CodigoViolacaoMontagem = "RN-034" | "RN-035" | "RN-036";

export interface ViolacaoMontagem {
  codigo: CodigoViolacaoMontagem;
  mensagem: string;
}

/**
 * Validações ao vivo do itinerário em edição (RN-034/035/036) — o mesmo
 * recorte de `validarItinerario`/`validarReferenciasDeParada`
 * (`shared/contrato/validacoes-estruturais.ts`), mas aplicável ANTES de haver
 * um `Itinerario` schema-válido (sem `viagens`, sem `rota`). Não é
 * redundância: aquela validação só roda sobre o documento fechado
 * (import/export); esta roda a cada gesto, para decidir se já vale a pena
 * chamar o OSRM (`resolverParadasRota`).
 */
export function validarMontagem(
  paradas: readonly ParadaEmEdicao[],
  secoes: readonly Secao[],
  locais: readonly Local[],
  servicoUuid: string,
  sentido: Sentido,
): ViolacaoMontagem[] {
  const violacoes: ViolacaoMontagem[] = [];

  if (paradas.length < 2) {
    violacoes.push({
      codigo: "RN-034",
      mensagem:
        "O itinerário precisa de ao menos 2 paradas (Spec 02 §10, §14).",
    });
  }

  if (paradas.length > 0 && paradas[0].tipo !== "secao") {
    violacoes.push({
      codigo: "RN-035",
      mensagem:
        "A primeira parada do itinerário deve ser uma Seção, nunca um Local (Spec 02 §10.1).",
    });
  }
  if (
    paradas.length > 1 &&
    paradas[paradas.length - 1].tipo !== "secao"
  ) {
    violacoes.push({
      codigo: "RN-035",
      mensagem:
        "A última parada do itinerário deve ser uma Seção, nunca um Local (Spec 02 §10.1).",
    });
  }

  const rotuloSentido = sentido === "ida" ? "Ida" : "Volta";
  for (const parada of paradas) {
    if (parada.tipo === "secao") {
      const secao = secoes.find((s) => s.uuid === parada.secaoUuid);
      const entrada = secao?.servicos.find((sv) => sv.servico_uuid === servicoUuid);
      const geoloc = sentido === "ida" ? entrada?.geolocalizacao_ida : entrada?.geolocalizacao_volta;
      if (!geoloc) {
        violacoes.push({
          codigo: "RN-036",
          mensagem: `A Seção "${secao ? nomeExibicaoSecao(secao) : parada.secaoUuid}" não tem geolocalização de ${rotuloSentido} para este Serviço (Spec 02 §10.1).`,
        });
      }
    } else {
      const local = locais.find((l) => l.uuid === parada.localUuid);
      const geoloc = sentido === "ida" ? local?.geolocalizacao_ida : local?.geolocalizacao_volta;
      if (!geoloc) {
        violacoes.push({
          codigo: "RN-036",
          mensagem: `O Local "${local ? nomeExibicaoLocal(local) : parada.localUuid}" não tem geolocalização de ${rotuloSentido} (Spec 02 §10.1).`,
        });
      }
    }
  }

  return violacoes;
}

/**
 * RN-030 (Spec 02 §2, §14; DEC-047): Ida e Volta, quando ambos existem, devem
 * referenciar o mesmo CONJUNTO de Seções (só a ordem pode divergir; Locais
 * divergem livremente). `undefined` num dos lados (Serviço unidirecional,
 * RN-038) não é divergência — não há o que comparar. Predicado exposto para o
 * aviso NÃO bloqueante da etapa (DEC-047: a trava dura é a validação
 * estrutural já existente em `validacoes-estruturais.ts`, aplicada na
 * exportação).
 */
export function conjuntoSecoesConsistente(
  paradasIda: readonly ParadaEmEdicao[] | undefined,
  paradasVolta: readonly ParadaEmEdicao[] | undefined,
): boolean {
  if (!paradasIda || !paradasVolta) return true;

  const secoesDe = (paradas: readonly ParadaEmEdicao[]): Set<string> =>
    new Set(
      paradas
        .filter((p): p is Extract<ParadaEmEdicao, { tipo: "secao" }> => p.tipo === "secao")
        .map((p) => p.secaoUuid),
    );

  const secoesIda = secoesDe(paradasIda);
  const secoesVolta = secoesDe(paradasVolta);
  if (secoesIda.size !== secoesVolta.size) return false;
  for (const uuid of secoesIda) {
    if (!secoesVolta.has(uuid)) return false;
  }
  return true;
}

export type ResultadoParadasRota =
  | { ok: true; paradas: ParadaRota[] }
  | { ok: false; violacoes: ViolacaoMontagem[] };

/**
 * Resolve as paradas em edição para o formato que `recalcularItinerario`/
 * `comporDescricao` consomem (`ParadaRota[]` — Ponto + marco de Seção quando
 * aplicável, RN-044). Roda `validarMontagem` primeiro: só faz sentido chamar
 * o OSRM sobre um itinerário estruturalmente completo (RN-034/035/036) — um
 * itinerário ainda em montagem (< 2 paradas, extremos incompletos) não gera
 * chamada nem pendência prematura, só a lista de violações para a UI.
 */
export function resolverParadasRota(
  paradas: readonly ParadaEmEdicao[],
  secoes: readonly Secao[],
  locais: readonly Local[],
  servicoUuid: string,
  sentido: Sentido,
): ResultadoParadasRota {
  const violacoes = validarMontagem(paradas, secoes, locais, servicoUuid, sentido);
  if (violacoes.length > 0) return { ok: false, violacoes };

  const resolvidas: ParadaRota[] = paradas.map((parada) => {
    if (parada.tipo === "secao") {
      const secao = secoes.find((s) => s.uuid === parada.secaoUuid) as Secao;
      const entrada = secao.servicos.find((sv) => sv.servico_uuid === servicoUuid)!;
      const ponto = (sentido === "ida" ? entrada.geolocalizacao_ida : entrada.geolocalizacao_volta)!;
      return { ...ponto, secao: { uuid: secao.uuid, rotulo: nomeExibicaoSecao(secao) } };
    }
    const local = locais.find((l) => l.uuid === parada.localUuid) as Local;
    const ponto = (sentido === "ida" ? local.geolocalizacao_ida : local.geolocalizacao_volta)!;
    return { ...ponto };
  });

  return { ok: true, paradas: resolvidas };
}
