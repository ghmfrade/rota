// Arredondamento half-up (0,005 → 0,01 — Spec 03 §3.4) a `casas` decimais.
// `Number.EPSILON` neutraliza o erro de ponto flutuante binário na soma antes
// do arredondamento (ex.: 1,005 representado como 1,00499999999999989...).
// Primitivo puro, sem dependência de `contrato/` nem de módulo específico do
// Formulário — usado tanto na conversão m→km/duração do cliente OSRM
// (RN-050) quanto na checagem estrutural de somas do contrato (RN-040).
export function arredondaHalfUp(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}
