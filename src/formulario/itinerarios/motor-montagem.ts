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

/** Chave de identidade estável de uma `ParadaEmEdicao` (TASK-066) — insumo da
 * re-ancoragem de pontos de rota (`reancorarPontosDeRota`, `formulario/
 * roteamento`), que compara paradas antes/depois por identidade, não por
 * posição, para classificar o gesto (acrescentar/inserir/remover/reordenar). */
export function chaveParadaEmEdicao(parada: ParadaEmEdicao): string {
  return parada.tipo === "secao" ? `secao:${parada.secaoUuid}` : `local:${parada.localUuid}`;
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

export type PosicaoExtrema = "inicio" | "fim";

export interface OcorrenciaLocalExtremo {
  indice: number;
  localUuid: string;
  posicoes: PosicaoExtrema[];
}

/**
 * Deriva as ocorrências que violam RN-035 na lista de edição. O resultado é
 * por índice (ocorrência), não pela entidade Local globalmente (DEC-070). Uma
 * lista de um único Local devolve uma ocorrência com início e fim.
 */
export function ocorrenciasLocaisEmExtremo(
  paradas: readonly ParadaEmEdicao[],
): OcorrenciaLocalExtremo[] {
  const porIndice = new Map<number, OcorrenciaLocalExtremo>();

  function registrar(indice: number, posicao: PosicaoExtrema) {
    const parada = paradas[indice];
    if (!parada || parada.tipo !== "local") return;
    const existente = porIndice.get(indice);
    if (existente) {
      existente.posicoes.push(posicao);
      return;
    }
    porIndice.set(indice, {
      indice,
      localUuid: parada.localUuid,
      posicoes: [posicao],
    });
  }

  registrar(0, "inicio");
  registrar(paradas.length - 1, "fim");
  return [...porIndice.values()];
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

/** Subsequência de `secaoUuid`, na ordem em que aparecem — insumo do espelho
 * Ida↔Volta (DEC-063/DEC-071) e da validação estrutural da ordem inversa
 * (RN-030, `shared/contrato/validacoes-estruturais.ts`). */
export function subsequenciaSecoes(paradas: readonly ParadaEmEdicao[]): string[] {
  return paradas
    .filter((p): p is Extract<ParadaEmEdicao, { tipo: "secao" }> => p.tipo === "secao")
    .map((p) => p.secaoUuid);
}

/** Gesto atômico de Seção que dispara o espelhamento Ida↔Volta (DEC-071:
 * "o motor deve receber a identidade da Seção movida e sua posição de
 * destino, em vez de tentar deduzir o gesto apenas comparando a sequência
 * final"). Só gestos que tocam a SUBSEQUÊNCIA DE SEÇÕES do sentido editado
 * disparam o espelho — Local e ponto de rota são livres por sentido (Spec 02
 * §14; Spec 04 §7.2) e nunca produzem `GestoSecao`. */
export type GestoSecao =
  | { tipo: "insercao"; secaoUuid: string }
  | { tipo: "remocao"; secaoUuid: string }
  | { tipo: "movimento"; secaoUuid: string };

/** Secao que sucede `secaoUuid` na subsequência de Seções de `paradas` (o
 * estado do sentido EDITADO, já após o gesto). `undefined` quando `secaoUuid`
 * é a última Seção da subsequência (o gesto a tornou o novo último extremo
 * do sentido editado). */
function secaoSeguinte(
  paradas: readonly ParadaEmEdicao[],
  secaoUuid: string,
): string | undefined {
  const sequencia = subsequenciaSecoes(paradas);
  const indice = sequencia.indexOf(secaoUuid);
  return indice === -1 ? undefined : sequencia[indice + 1];
}

/**
 * Espelha a INSERÇÃO de `secaoUuid` (já presente em `paradasEditadasDepois`,
 * o sentido editado após o gesto) no sentido alvo (DEC-071, opção A da
 * Q-050): a nova Parada entra imediatamente depois da Seção que, no sentido
 * editado, a sucede — porque a ordem do alvo é o INVERSO da editada, a
 * sucessora na editada é a antecessora no alvo. Sem sucessora (a Seção virou
 * o novo último extremo do sentido editado): a nova Parada é o novo PRIMEIRO
 * extremo do alvo (Spec 02 §14 — inversão simétrica dos extremos).
 *
 * Exemplo da DEC-071: Ida `A-B` → `A-X-B`; Volta era `B-1-2-A` → resultado
 * `B-X-1-2-A` (a sucessora de X na Ida é B; X entra logo depois de B na
 * Volta).
 */
export function espelharInsercaoDeSecao(
  paradasAlvo: readonly ParadaEmEdicao[],
  secaoUuid: string,
  paradasEditadasDepois: readonly ParadaEmEdicao[],
): ParadaEmEdicao[] {
  const novaParada = paradaDeSecao(secaoUuid);
  const antecessoraNoAlvo = secaoSeguinte(paradasEditadasDepois, secaoUuid);
  if (antecessoraNoAlvo === undefined) {
    return [novaParada, ...paradasAlvo];
  }
  const indiceAntecessora = paradasAlvo.findIndex(
    (p) => p.tipo === "secao" && p.secaoUuid === antecessoraNoAlvo,
  );
  if (indiceAntecessora === -1) {
    // Defensivo: a antecessora deveria sempre existir no alvo, dado o
    // invariante RN-030 mantido antes deste gesto. Sem ela para ancorar,
    // insere no início em vez de descartar o gesto.
    return [novaParada, ...paradasAlvo];
  }
  return inserirParada(paradasAlvo, novaParada, indiceAntecessora + 1);
}

/** Espelha a REMOÇÃO de `secaoUuid` no sentido alvo (DEC-071): elimina
 * somente a ocorrência correspondente — sem reposicionar mais nada. Se um
 * Local ficar no extremo do alvo por consequência, o estado é sinalizado
 * pela DEC-070 (`ocorrenciasLocaisEmExtremo`), sem correção silenciosa aqui. */
export function espelharRemocaoDeSecao(
  paradasAlvo: readonly ParadaEmEdicao[],
  secaoUuid: string,
): ParadaEmEdicao[] {
  return paradasAlvo.filter((p) => !(p.tipo === "secao" && p.secaoUuid === secaoUuid));
}

/**
 * Espelha o MOVIMENTO de `secaoUuid` no sentido alvo (DEC-071): replay do
 * gesto atômico como remoção seguida de reinserção pela mesma regra da
 * inserção — nunca por diff da sequência final (o diff é ambíguo quando duas
 * Seções adjacentes trocam de posição). `paradasEditadasDepois` é o sentido
 * editado já após o movimento.
 *
 * Exemplo da DEC-071: Ida `A-B-C-D-E` → `A-B-D-C-E` (D antes de C); Volta era
 * `E-D-1-2-C-3-B-4-A` → resultado `E-1-2-C-D-3-B-4-A`.
 */
export function espelharMovimentoDeSecao(
  paradasAlvo: readonly ParadaEmEdicao[],
  secaoUuid: string,
  paradasEditadasDepois: readonly ParadaEmEdicao[],
): ParadaEmEdicao[] {
  const semSecao = espelharRemocaoDeSecao(paradasAlvo, secaoUuid);
  return espelharInsercaoDeSecao(semSecao, secaoUuid, paradasEditadasDepois);
}

/** Aplica o `GestoSecao` ao sentido alvo (DEC-071) — despacho único usado
 * pela etapa para computar a lista espelhada do outro sentido no mesmo
 * commit. `undefined` quando `paradasAlvo` é `undefined` (Serviço ainda
 * unidirecional, RN-038 — nada para espelhar). */
export function espelharGestoDeSecao(
  paradasAlvo: readonly ParadaEmEdicao[],
  gesto: GestoSecao,
  paradasEditadasDepois: readonly ParadaEmEdicao[],
): ParadaEmEdicao[] {
  switch (gesto.tipo) {
    case "insercao":
      return espelharInsercaoDeSecao(paradasAlvo, gesto.secaoUuid, paradasEditadasDepois);
    case "remocao":
      return espelharRemocaoDeSecao(paradasAlvo, gesto.secaoUuid);
    case "movimento":
      return espelharMovimentoDeSecao(paradasAlvo, gesto.secaoUuid, paradasEditadasDepois);
  }
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
