// Captura da imagem do mapa a partir do canvas (RN-074; Spec 01 §8; Spec 04
// §13.1 item 4d — "imagem do mapa por captura do próprio canvas"). Função pura
// sobre a interface mínima de um mapa, testável com um stub de canvas.

/** Subconjunto do mapa MapLibre necessário para capturar sua imagem. */
export interface MapaCapturavel {
  getCanvas(): HTMLCanvasElement | null | undefined;
}

/**
 * Retorna a imagem atual do canvas do mapa como data-URI. Exige que o mapa
 * tenha sido criado com `preserveDrawingBuffer: true` (ver componente), senão o
 * navegador devolve um canvas em branco. Lança se não houver canvas capturável.
 */
export function capturarImagemMapa(
  mapa: MapaCapturavel,
  formato: "image/png" | "image/jpeg" = "image/png",
): string {
  const canvas = mapa.getCanvas();
  if (!canvas || typeof canvas.toDataURL !== "function") {
    throw new Error(
      "Mapa sem canvas disponível para captura de imagem (RN-074).",
    );
  }
  return canvas.toDataURL(formato);
}
