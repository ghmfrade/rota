import type { HorarioParada, Parada, Trecho } from "@/shared/contrato";
import { formatarHms } from "./horario-relogio";

/**
 * Sugestão inicial de offsets ao criar uma Viagem (Spec 03 §8.1; RN-064):
 * acúmulo de `trecho.duracao_s` a partir da primeira Parada, cuja offset é
 * sempre "00:00:00". Cobre TODA Parada do itinerário — Seções e Locais
 * ocultos (RN-067; RN-063 exige um elemento por Parada) — na ordem de
 * `parada.ordem` (RN-034 garante 1-based, contígua, sem lacunas; RN-041
 * garante um Trecho por par consecutivo).
 */
export function sugerirOffsetsIniciais(
  paradas: readonly Parada[],
  trechos: readonly Trecho[],
): HorarioParada[] {
  const paradasOrdenadas = [...paradas].sort((a, b) => a.ordem - b.ordem);
  const trechoPorOrigem = new Map(
    trechos.map((trecho) => [trecho.parada_origem_ordem, trecho]),
  );

  let acumulado = 0;
  return paradasOrdenadas.map((parada, indice) => {
    if (indice > 0) {
      const anterior = paradasOrdenadas[indice - 1];
      const trecho = trechoPorOrigem.get(anterior.ordem);
      acumulado += trecho?.duracao_s ?? 0;
    }
    return { parada_ordem: parada.ordem, offset_horario: formatarHms(acumulado) };
  });
}
