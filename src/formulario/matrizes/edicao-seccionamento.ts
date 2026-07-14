import type { ParSecao, Servico } from "@/shared/contrato";
import { chaveParNaoDirecional } from "./calculo-matriz-distancias";
import { sugerirDistanciaDoServico, sugerirMenorDistancia } from "./sugestoes-seccionamento";

// TASK-027 — operações puras sobre `matriz_seccionamento` (Spec 02 §9; Spec 04
// §9.2; RN-058/059/060). Todas imutáveis (devolvem array novo, nunca mutam o
// recebido) e nunca tocam `uuid` de Seção (RN-004) — só compõem/removem
// entradas por referência às UUIDs já existentes.

/** Par já habilitado (por chave não-direcional — RN-059) na `matriz_seccionamento`. */
function encontrarPar(
  matrizSeccionamento: readonly ParSecao[],
  secaoAUuid: string,
  secaoBUuid: string,
): ParSecao | undefined {
  const chave = chaveParNaoDirecional(secaoAUuid, secaoBUuid);
  return matrizSeccionamento.find(
    (par) => chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid) === chave,
  );
}

export type MotivoRecusaHabilitar = "secoes-iguais" | "par-ausente-em-matriz-distancias";

export type ResultadoHabilitarPar =
  | { ok: true; matrizSeccionamento: ParSecao[] }
  | { ok: false; motivo: MotivoRecusaHabilitar };

/**
 * Habilita o par `{A, B}` (Spec 04 §9.2 "clique alterna"), preenchendo
 * `distancia_km` com a `distanciaKmSugerida` (a sugestão ativa no momento do
 * clique — RN-058: o JSON guarda o valor confirmado, a sugestão não é
 * persistida como tal). RN-059: recusa `secao_a_uuid == secao_b_uuid` e pares
 * ausentes em `matriz_distancias` deste Serviço. Habilitar um par já
 * habilitado é idempotente (não duplica).
 */
export function habilitarPar(
  servico: Servico,
  secaoAUuid: string,
  secaoBUuid: string,
  distanciaKmSugerida: number,
): ResultadoHabilitarPar {
  if (secaoAUuid === secaoBUuid) {
    return { ok: false, motivo: "secoes-iguais" };
  }
  const chave = chaveParNaoDirecional(secaoAUuid, secaoBUuid);
  const presenteEmDistancias = servico.matriz_distancias.some(
    (par) => chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid) === chave,
  );
  if (!presenteEmDistancias) {
    return { ok: false, motivo: "par-ausente-em-matriz-distancias" };
  }
  if (encontrarPar(servico.matriz_seccionamento, secaoAUuid, secaoBUuid)) {
    return { ok: true, matrizSeccionamento: [...servico.matriz_seccionamento] };
  }
  return {
    ok: true,
    matrizSeccionamento: [
      ...servico.matriz_seccionamento,
      { secao_a_uuid: secaoAUuid, secao_b_uuid: secaoBUuid, distancia_km: distanciaKmSugerida },
    ],
  };
}

/** Desabilita o par `{A, B}` (Spec 04 §9.2 "desabilitar remove a entrada").
 * Par não habilitado é no-op (devolve array equivalente). */
export function desabilitarPar(
  matrizSeccionamento: readonly ParSecao[],
  secaoAUuid: string,
  secaoBUuid: string,
): ParSecao[] {
  const chave = chaveParNaoDirecional(secaoAUuid, secaoBUuid);
  return matrizSeccionamento.filter(
    (par) => chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid) !== chave,
  );
}

/** Edição manual de `distancia_km` de um par já habilitado (Spec 04 §9.2;
 * RN-058 — o JSON guarda o valor final). Par não habilitado é no-op. */
export function definirDistancia(
  matrizSeccionamento: readonly ParSecao[],
  secaoAUuid: string,
  secaoBUuid: string,
  distanciaKm: number,
): ParSecao[] {
  const chave = chaveParNaoDirecional(secaoAUuid, secaoBUuid);
  return matrizSeccionamento.map((par) =>
    chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid) === chave
      ? { ...par, distancia_km: distanciaKm }
      : par,
  );
}

/** Modo dos dois botões de sugestão em lote (Spec 03 §6.1). */
export type ModoSugestaoSeccionamento = "menor-distancia" | "do-servico";

/**
 * Aplica um dos dois modos de sugestão (Spec 03 §6.1) a TODOS os pares já
 * habilitados do Serviço corrente (Spec 04 §9.2 "ações em lote") — nunca
 * habilita par novo. "Último acionado (ou edição manual) vale" (RN-060): cada
 * chamada recomputa e sobrescreve `distancia_km` de todos os pares habilitados.
 * Par sem sugestão disponível (defensivo — não deve ocorrer para par já
 * habilitado, RN-059 garante presença em `matriz_distancias`) mantém seu
 * valor atual.
 */
export function aplicarSugestaoEmLote(
  servicoAtual: Servico,
  todosOsServicosDoAutos: readonly Servico[],
  modo: ModoSugestaoSeccionamento,
): ParSecao[] {
  return servicoAtual.matriz_seccionamento.map((par) => {
    const sugestao =
      modo === "menor-distancia"
        ? sugerirMenorDistancia(todosOsServicosDoAutos, par.secao_a_uuid, par.secao_b_uuid)
        : sugerirDistanciaDoServico(servicoAtual, par.secao_a_uuid, par.secao_b_uuid);
    return sugestao === undefined ? par : { ...par, distancia_km: sugestao };
  });
}
