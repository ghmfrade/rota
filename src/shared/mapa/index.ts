// Mapa base client-side (Spec 01 §8 — OSM/MapLibre). Primitiva reutilizável por
// Formulário e Comparador (RN-097). O componente React (`mapa.tsx`) importa
// maplibre-gl e seu CSS — só o consuma em ambiente de navegador. Testes de node
// devem importar os submódulos puros diretamente (config/estilo/geometria/
// captura), não este índice.

export * from "./config";
export * from "./estilo";
export * from "./geometria";
export * from "./captura";
export * from "./ancoragem";
export * from "./mapa";
