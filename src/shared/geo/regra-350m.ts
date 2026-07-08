// Regra dos 350 m (Spec 03 §7) — clustering incremental de Seção,
// checagem estática fraca (leitores) e validação pareada de Local.
// Depende só de `./primitivas` (Haversine + centroide), sem tocar
// `contrato/` (RN-027, RN-028, RN-032).
import { centroide, haversine, type Ponto } from "./primitivas";

// Spec 03 §7 — limiar fixo, único no projeto.
export const LIMIAR_350M = 350;

export interface ResultadoInsercao {
  aceito: boolean;
}

// Spec 03 §7.2 — INSERIR(S,P): preserva o invariante de que todo ponto
// aceito fica a ≤ 350 m do centroide FINAL do conjunto (não apenas do
// centroide vigente na hora da inserção). Não basta testar
// haversine(P, centroide(S)) — o candidato desloca o centroide e pode
// empurrar um ponto já aceito para fora dos 350 m; por isso recalcula-se
// o centroide incluindo P e verifica-se TODOS os pontos do conjunto
// resultante. Não muta `pontosAceitos`.
export function inserirEmSecao(
  pontosAceitos: readonly Ponto[],
  candidato: Ponto,
): ResultadoInsercao {
  if (pontosAceitos.length === 0) {
    // 1º ponto: aceito sem checagem, não há centroide ainda.
    return { aceito: true };
  }

  const conjuntoResultante = [...pontosAceitos, candidato];
  const centroideResultante = centroide(conjuntoResultante);

  const algumForaDoLimiar = conjuntoResultante.some(
    (ponto) => haversine(ponto, centroideResultante) > LIMIAR_350M,
  );

  return { aceito: !algumForaDoLimiar };
}

// Spec 03 §7.3 — VALIDA_ESTATICO(Seção): checagem necessária mas não
// equivalente à incremental, para leitores sem histórico de inserção
// (Comparador/Ingestor). Mede contra o centroide do conjunto completo de
// pontos finais; um documento produzido pela §7.2 sempre passa aqui.
export function validaEstaticoSecao(pontos: readonly Ponto[]): boolean {
  if (pontos.length <= 1) {
    return true;
  }

  const c = centroide(pontos);
  return pontos.every((p) => haversine(p, c) <= LIMIAR_350M);
}

// Spec 03 §7.4 — validação pareada de Local: sem centroide, sem
// clustering — um único Serviço, no máximo dois pontos (Ida/Volta do
// mesmo Local). Ao menos uma presente já é exigido pela Spec 02 §7.1
// (checagem de presença fora do escopo desta função).
export function validaLocalPareado(
  geolocalizacaoIda: Ponto | undefined,
  geolocalizacaoVolta: Ponto | undefined,
): boolean {
  if (geolocalizacaoIda && geolocalizacaoVolta) {
    return haversine(geolocalizacaoIda, geolocalizacaoVolta) <= LIMIAR_350M;
  }
  return true;
}
