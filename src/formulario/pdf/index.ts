// PDF operacional do Formulário (TASK-033; Spec 04 §13) — geração client-side.
//
// O índice exporta o modelo puro e a camada de geração. `estilos-pdf.ts` e
// `documento-pdf-operacional.tsx` importam `@react-pdf/renderer` e NÃO são
// reexportados aqui: a biblioteca entra só pelo import dinâmico de
// `gerarPdfOperacional`, mantendo-a fora do bundle inicial e dos testes de
// componente. Pelo mesmo motivo, `captura-mapa-pdf.ts` é exportado sem que o
// `maplibre-gl` seja carregado (o import dele também é dinâmico).

export * from "./legenda-itinerario";
export * from "./modelo-pdf-operacional";
export * from "./captura-mapa-pdf";
export * from "./gerar-pdf-operacional";
