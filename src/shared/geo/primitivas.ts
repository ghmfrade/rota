// Primitivas geoespaciais (Spec 03 §2.1, §2.2) — módulo puro, sem
// dependência de `contrato/` ou de UI. Única função de distância em linha
// reta e única função de centroide do projeto (RN-027, RN-087): nunca usar
// distância euclidiana sobre graus crus (ignora a convergência dos
// meridianos) nem centroide geodésico/vetorial 3D.

// Estruturalmente compatível com `Geolocalizacao` (contrato/esquema) e com
// `PontoDeRota`, mas definido localmente para manter `geo/` independente do
// schema do contrato (Spec 02).
export interface Ponto {
  latitude: number;
  longitude: number;
}

// Spec 03 §2.1 — raio médio da Terra, em metros.
export const RAIO_TERRA_M = 6_371_000;

const paraRadianos = (graus: number): number => (graus * Math.PI) / 180;

// Spec 03 §2.1 — distância em linha reta sobre a esfera (Haversine), em
// metros. Usada apenas nas regras espaciais de 350 m (Seção/Local) e no
// relato de deslocamento do Comparador (RN-087) — nunca para `distancia_km`
// de rota, trecho, matriz ou seccionamento (isso é sempre roteado via OSRM).
export function haversine(p1: Ponto, p2: Ponto): number {
  const phi1 = paraRadianos(p1.latitude);
  const phi2 = paraRadianos(p2.latitude);
  const deltaPhi = paraRadianos(p2.latitude - p1.latitude);
  const deltaLambda = paraRadianos(p2.longitude - p1.longitude);

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  return 2 * RAIO_TERRA_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Spec 03 §2.2 — centroide de um conjunto não-vazio de pontos: média
// aritmética simples de latitude e de longitude (decisão fechada — não
// centroide geodésico/vetorial 3D). Base da regra dos 350 m (RN-027, RN-028).
export function centroide(pontos: readonly Ponto[]): Ponto {
  if (pontos.length === 0) {
    throw new Error(
      "[RN-027] centroide requer conjunto não-vazio de pontos (Spec 03 §2.2)",
    );
  }

  const soma = pontos.reduce(
    (acc, p) => ({
      latitude: acc.latitude + p.latitude,
      longitude: acc.longitude + p.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: soma.latitude / pontos.length,
    longitude: soma.longitude / pontos.length,
  };
}
