import type { PontoDeRota } from "@/shared/contrato";
import { projetarNaLinha } from "@/shared/mapa/ancoragem";
import type { Coordenada } from "@/shared/mapa/geometria";

export type MudancaSequenciaParadas =
  | { tipo: "inalterada" }
  | { tipo: "insercao"; indice: number }
  | { tipo: "remocao"; indice: number }
  | { tipo: "reordenacao" }
  | { tipo: "alteracao-conjunto" };

/**
 * Classifica a mudança da sequência de Paradas pelas chaves de identidade
 * antes/depois (TASK-046/TASK-066; DEC-048/DEC-056/DEC-060).
 * A classificação é compartilhada pela re-ancoragem de pontos de rota e pela
 * reconciliação dos horários: não se usa posição/rótulo como identidade. A
 * re-ancoragem exige gesto atômico; a reconciliação também aceita alterações
 * acumuladas desde o último Itinerário gravado.
 */
export function classificarMudancaSequenciaParadas(
  chavesParadasAntes: readonly string[],
  chavesParadasDepois: readonly string[],
): MudancaSequenciaParadas {
  if (
    chavesParadasAntes.length === chavesParadasDepois.length &&
    chavesParadasAntes.every((chave, indice) => chave === chavesParadasDepois[indice])
  ) {
    return { tipo: "inalterada" };
  }

  if (chavesParadasDepois.length === chavesParadasAntes.length + 1) {
    return {
      tipo: "insercao",
      indice: encontrarIndiceInserido(chavesParadasAntes, chavesParadasDepois),
    };
  }

  if (chavesParadasDepois.length === chavesParadasAntes.length - 1) {
    return {
      tipo: "remocao",
      indice: encontrarIndiceRemovido(chavesParadasAntes, chavesParadasDepois),
    };
  }

  if (chavesParadasDepois.length === chavesParadasAntes.length) {
    return { tipo: "reordenacao" };
  }

  // Pode ocorrer entre o último Itinerário gravado e a lista em edição quando
  // uma tentativa anterior de rota falhou: a UI continuou aceitando gestos
  // atômicos, mas o documento ficou mais de uma mudança atrás. Para horários,
  // basta saber que o conjunto mudou e deve ser reconciliado (DEC-048).
  return { tipo: "alteracao-conjunto" };
}

// Re-ancoragem de pontos de rota quando o conjunto ou a ordem das paradas
// muda (TASK-066; DEC-056, atualizada pela DEC-060; Spec 03 §3.6.2 × Spec 02
// §10.4/RN-042). Função pura, agnóstica de `ParadaEmEdicao` (que pertence a
// `formulario/itinerarios`) — recebe só as CHAVES de identidade das paradas
// antes/depois, na mesma ordem da lista de edição; quem monta essas chaves é
// o chamador (evita dependência reversa `roteamento → itinerarios`).
//
// Casos (DEC-056/DEC-060), todos re-derivando `apos_parada_ordem` a partir da
// NOVA posição das paradas — nunca da coordenada (opção C da DEC-056,
// "clampear", foi rejeitada por corromper o traçado em silêncio):
//
// - **Acrescentar ao fim** — nenhuma chave antiga muda de índice; reaplicação
//   literal (caso degenerado da fórmula de inserção abaixo, com a parada nova
//   na última posição).
// - **Inserir no meio** — pontos ancorados a segmentos inteiramente antes da
//   posição de inserção mantêm o valor; os demais recebem +1. O segmento
//   partido pela inserção (ambíguo sem a geometria da linha — Spec 03 §3.6:
//   "reparte conforme a posição ao longo da linha", que só o chamador com
//   acesso ao traçado tem) cai, por convenção desta função, no lado
//   "depois" — inferência controlada; o refinamento geométrico do trecho
//   partido é escopo da TASK-067 (clique posicional), que consome esta regra.
// - **Remover** — os dois trechos adjacentes à parada removida fundem-se; os
//   pontos de ambos passam a ter o mesmo `apos_parada_ordem` (o do trecho
//   fundido), preservando a sequência de travessia. Se a Parada removida é um
//   extremo, o trecho terminal deixa de existir e seus pontos órfãos são
//   descartados (DEC-068).
// - **Reordenação** (DEC-060, supera a DEC-056 neste caso) — mesmo conjunto,
//   mesma contagem: `apos_parada_ordem` é posicional por definição (RN-042),
//   então o valor não muda — ele passa a se referir ao par de paradas que
//   agora ocupa aquela posição na lista ("re-ancora ao par que passa a
//   cercá-los"). Nenhum ponto é descartado.
//
// Pós-condição em todos os caminhos: `apos_parada_ordem` resultante em
// `[1, chavesParadasDepois.length - 1]` (RN-042) — nunca `== length` (bug se
// ocorrer; pontos órfãos de trecho terminal são descartados pela própria
// função, e os testes cobrem os quatro casos e os limites).

/**
 * Re-ancora `pontos` (cujo `apos_parada_ordem` é relativo a
 * `chavesParadasAntes`) para que passem a ser relativos a
 * `chavesParadasDepois`. Não muta `pontos`. Assume um gesto atômico por
 * chamada (uma inserção, uma remoção OU uma reordenação — nunca uma
 * combinação), o mesmo recorte que os gestos da etapa produzem.
 */
export function reancorarPontosDeRota(
  chavesParadasAntes: readonly string[],
  chavesParadasDepois: readonly string[],
  pontos: readonly PontoDeRota[],
): PontoDeRota[] {
  const mudanca = classificarMudancaSequenciaParadas(
    chavesParadasAntes,
    chavesParadasDepois,
  );

  if (mudanca.tipo === "inalterada" || mudanca.tipo === "reordenacao") {
    // Reordenação (DEC-060): mesma contagem ⇒ mesmo `apos_parada_ordem`,
    // agora referindo-se ao par que ocupa aquela posição na lista nova. Na
    // sequência inalterada, isto é apenas uma cópia defensiva.
    return pontos.map((ponto) => ({ ...ponto }));
  }

  if (mudanca.tipo === "insercao") {
    return pontos.map((ponto) => ({
      ...ponto,
      apos_parada_ordem:
        ponto.apos_parada_ordem < mudanca.indice
          ? ponto.apos_parada_ordem
          : ponto.apos_parada_ordem + 1,
    }));
  }

  if (mudanca.tipo === "remocao") {
    const limiteSuperiorExclusivo = chavesParadasDepois.length;
    return pontos
      .map((ponto) => ({
        ...ponto,
        apos_parada_ordem:
          ponto.apos_parada_ordem <= mudanca.indice
            ? ponto.apos_parada_ordem
            : ponto.apos_parada_ordem - 1,
      }))
      .filter(
        (ponto) =>
          ponto.apos_parada_ordem >= 1 &&
          ponto.apos_parada_ordem < limiteSuperiorExclusivo,
      );
  }

  throw new Error(
    "[RN-042] reancorarPontosDeRota espera um gesto atômico: inserir, remover ou " +
      "reordenar UMA parada por chamada — a diferença de tamanho entre as listas " +
      `não corresponde a nenhum desses casos (${chavesParadasAntes.length} → ${chavesParadasDepois.length}).`,
  );
}

/**
 * Especialização geométrica da inserção posicional (TASK-067; DEC-055/056).
 * A re-ancoragem estrutural da TASK-066 põe, por segurança, todos os pontos
 * do trecho partido no lado posterior. Aqui a posição conhecida do clique
 * permite repartir esse trecho: pontos projetados antes (ou exatamente na
 * mesma posição — borda determinística) ficam no trecho anterior; os demais
 * permanecem no posterior. Não muta os argumentos.
 */
export function reancorarPontosDeRotaNaInsercaoPosicional(
  chavesParadasAntes: readonly string[],
  chavesParadasDepois: readonly string[],
  pontos: readonly PontoDeRota[],
  linhaRota: readonly Coordenada[],
  posicaoInsercao: Coordenada,
): PontoDeRota[] {
  const mudanca = classificarMudancaSequenciaParadas(
    chavesParadasAntes,
    chavesParadasDepois,
  );
  if (mudanca.tipo !== "insercao") {
    throw new Error(
      "[RN-042] a re-ancoragem posicional exige a inserção de exatamente uma Parada.",
    );
  }

  const reancorados = reancorarPontosDeRota(
    chavesParadasAntes,
    chavesParadasDepois,
    pontos,
  );
  const projecaoInsercao = projetarNaLinha(posicaoInsercao, linhaRota);
  if (!projecaoInsercao) return reancorados;

  return reancorados.map((pontoReancorado, indice) => {
    const pontoOriginal = pontos[indice];
    if (pontoOriginal.apos_parada_ordem !== mudanca.indice) {
      return pontoReancorado;
    }
    const projecaoPonto = projetarNaLinha(
      { lng: pontoOriginal.longitude, lat: pontoOriginal.latitude },
      linhaRota,
    );
    if (
      projecaoPonto &&
      projecaoPonto.distanciaAoLongoM <= projecaoInsercao.distanciaAoLongoM
    ) {
      return { ...pontoReancorado, apos_parada_ordem: mudanca.indice };
    }
    return pontoReancorado;
  });
}

/** Índice (0-based) da chave nova em `depois`, assumindo que `antes` é `depois`
 * com essa posição removida (uma inserção). */
function encontrarIndiceInserido(
  antes: readonly string[],
  depois: readonly string[],
): number {
  for (let i = 0; i < depois.length; i++) {
    if (antes[i] !== depois[i]) return i;
  }
  return depois.length - 1;
}

/** Índice (0-based) da chave removida em `antes`, assumindo que `depois` é
 * `antes` com essa posição removida. */
function encontrarIndiceRemovido(
  antes: readonly string[],
  depois: readonly string[],
): number {
  for (let i = 0; i < depois.length; i++) {
    if (antes[i] !== depois[i]) return i;
  }
  return depois.length;
}
