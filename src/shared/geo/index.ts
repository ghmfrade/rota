// Primitivas geoespaciais (Spec 03 §2.1, §2.2) — Haversine e centroide.
export * from "./primitivas";
// Regra dos 350 m (Spec 03 §7) — inserção incremental, checagem estática
// e pareada.
export * from "./regra-350m";
// Derivação de município por ponto-em-polígono (Spec 03 §2.3) — ray casting,
// join com a base, fallback de borda ≤ 2 km e pontos decisores.
export * from "./municipio";
