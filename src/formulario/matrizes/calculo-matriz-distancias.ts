import { arredondaHalfUp } from "@/shared/calculo";
import type { Itinerario, ParDistancia, Servico } from "@/shared/contrato";

// TASK-026 — cálculo de `matriz_distancias` (Spec 02 §8; Spec 03 §4/§5;
// RN-054..057). Opera inteiramente a partir dos `itinerarios` de UM Serviço —
// nunca lê outro Serviço do Autos (RN-054) — e é reaproveitado tanto pela
// reconciliação automática ao concluir a edição do itinerário
// (`itinerarios/etapa-itinerarios.tsx`, TASK-019) quanto pela detecção de
// "matriz desatualizada" (`pendencias/pendencias.ts`, Spec 04 §11).

/** Posição (`ordem`) da Seção `secaoUuid` nas paradas do itinerário, ou
 * `undefined` se o itinerário não a referencia (Spec 02 §10.1). */
function posicaoDaSecao(itinerario: Itinerario, secaoUuid: string): number | undefined {
  return itinerario.paradas.find((parada) => parada.secao_uuid === secaoUuid)?.ordem;
}

/**
 * `dist(I, A, B)` (RN-055; Spec 03 §4.2): soma `trecho.distancia_km` do
 * itinerário `I` para todo trecho com `parada_origem_ordem` no intervalo
 * `[min(posA,posB), max(posA,posB) − 1]` — inclui automaticamente os Locais
 * intermediários (sem entrada própria na matriz — DEC-027), pois eles só
 * deslocam a posição das paradas somadas, nunca geram par próprio.
 * Arredondada a 2 casas half-up (a soma de trechos já arredondados pode
 * reintroduzir erro de ponto flutuante). `undefined` se o itinerário não
 * referencia uma das duas Seções.
 */
function distanciaEntreSecoes(
  itinerario: Itinerario,
  secaoAUuid: string,
  secaoBUuid: string,
): number | undefined {
  const posA = posicaoDaSecao(itinerario, secaoAUuid);
  const posB = posicaoDaSecao(itinerario, secaoBUuid);
  if (posA === undefined || posB === undefined) return undefined;

  const inicio = Math.min(posA, posB);
  const fim = Math.max(posA, posB);
  const soma = itinerario.rota.trechos
    .filter(
      (trecho) =>
        trecho.parada_origem_ordem >= inicio && trecho.parada_origem_ordem <= fim - 1,
    )
    .reduce((total, trecho) => total + trecho.distancia_km, 0);
  return arredondaHalfUp(soma, 2);
}

/** `valor_adotado_de_distancia` (RN-056; Spec 03 §5): média aritmética
 * half-up dos dois sentidos quando ambos presentes; o único valor existente
 * quando o Serviço é unidirecional. */
function valorAdotado(
  distanciaIda: number | undefined,
  distanciaVolta: number | undefined,
): number {
  if (distanciaIda !== undefined && distanciaVolta !== undefined) {
    return arredondaHalfUp((distanciaIda + distanciaVolta) / 2, 2);
  }
  // Um Serviço só chega aqui com exatamente um itinerário existente (o outro
  // `undefined`); a existência de ao menos um é garantida pelo chamador
  // (RN-038 — 1 ou 2 itinerários).
  return (distanciaIda ?? distanciaVolta) as number;
}

/** Seções distintas atendidas por ao menos um itinerário do Serviço (RN-054),
 * na ordem de primeira aparição — determina a ordem determinística dos pares
 * de saída. */
function secoesAtendidas(itinerarios: readonly Itinerario[]): string[] {
  const vistas = new Set<string>();
  const ordem: string[] = [];
  for (const itinerario of itinerarios) {
    for (const parada of itinerario.paradas) {
      if (parada.secao_uuid !== undefined && !vistas.has(parada.secao_uuid)) {
        vistas.add(parada.secao_uuid);
        ordem.push(parada.secao_uuid);
      }
    }
  }
  return ordem;
}

/**
 * Calcula `matriz_distancias` (RN-054..057; Spec 02 §8; Spec 03 §4/§5) a
 * partir dos `itinerarios` de um Serviço — inteiramente intra-Serviço, nunca
 * lê dados de outro Serviço do Autos (RN-054). Uma entrada por combinação
 * não-ordenada de duas Seções distintas atendidas por QUALQUER itinerário do
 * Serviço.
 *
 * Um par só entra na saída quando o(s) sentido(s) existente(s) conseguem
 * localizar as duas Seções em suas paradas: quando Ida e Volta ainda não
 * referenciam o mesmo conjunto de Seções (edição parcial, antes de RN-030
 * valer), o par fica ausente até a sincronização se completar — a validação
 * estrutural (RN-054, `validacoes-estruturais.ts`) já sinaliza a combinação
 * faltante, este cálculo não inventa um valor para ela.
 */
export function calcularMatrizDistancias(
  itinerarios: readonly Itinerario[],
): ParDistancia[] {
  const itinerarioIda = itinerarios.find((itinerario) => itinerario.sentido === "ida");
  const itinerarioVolta = itinerarios.find((itinerario) => itinerario.sentido === "volta");
  const secoes = secoesAtendidas(itinerarios);

  const matriz: ParDistancia[] = [];
  for (let i = 0; i < secoes.length; i += 1) {
    for (let j = i + 1; j < secoes.length; j += 1) {
      const secaoAUuid = secoes[i];
      const secaoBUuid = secoes[j];

      const distanciaIda = itinerarioIda
        ? distanciaEntreSecoes(itinerarioIda, secaoAUuid, secaoBUuid)
        : undefined;
      const distanciaVolta = itinerarioVolta
        ? distanciaEntreSecoes(itinerarioVolta, secaoAUuid, secaoBUuid)
        : undefined;

      if (itinerarioIda && distanciaIda === undefined) continue;
      if (itinerarioVolta && distanciaVolta === undefined) continue;

      const par: ParDistancia = {
        secao_a_uuid: secaoAUuid,
        secao_b_uuid: secaoBUuid,
        valor_adotado_de_distancia: valorAdotado(distanciaIda, distanciaVolta),
      };
      if (distanciaIda !== undefined) par.distancia_trecho_ida = distanciaIda;
      if (distanciaVolta !== undefined) par.distancia_trecho_volta = distanciaVolta;
      matriz.push(par);
    }
  }
  return matriz;
}

/** Adaptador de conveniência: `matriz_distancias` recomputada do `Servico`
 * inteiro (RN-054 — nunca lê outro Serviço do Autos). */
export function matrizDistanciasDoServico(servico: Servico): ParDistancia[] {
  return calcularMatrizDistancias(servico.itinerarios);
}

/** Chave não-direcional de um par de Seções (`{a,b} == {b,a}` — RN-054/059). */
function chaveParNaoDirecional(secaoAUuid: string, secaoBUuid: string): string {
  return [secaoAUuid, secaoBUuid].sort().join("|");
}

/**
 * Compara a `matriz_distancias` armazenada do Serviço com a recomputada a
 * partir das rotas atuais dos seus itinerarios (Spec 04 §9.1/§11 — pendência
 * "matriz desatualizada", RN-078). Comparação por par não-direcional,
 * insensível à ordem de armazenamento — só o conteúdo (presença dos pares e
 * os três valores de distância) importa.
 */
export function matrizDistanciasDesatualizada(servico: Servico): boolean {
  const recomputada = matrizDistanciasDoServico(servico);
  if (recomputada.length !== servico.matriz_distancias.length) return true;

  const armazenadaPorChave = new Map(
    servico.matriz_distancias.map((par) => [
      chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid),
      par,
    ]),
  );

  return recomputada.some((par) => {
    const armazenado = armazenadaPorChave.get(
      chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid),
    );
    if (!armazenado) return true;
    return (
      armazenado.valor_adotado_de_distancia !== par.valor_adotado_de_distancia ||
      armazenado.distancia_trecho_ida !== par.distancia_trecho_ida ||
      armazenado.distancia_trecho_volta !== par.distancia_trecho_volta
    );
  });
}
