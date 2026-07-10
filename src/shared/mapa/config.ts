// Configuração do mapa base (Spec 01 §8 — OSM/MapLibre).
//
// A URL do servidor de tiles é **configurável**, espelhando o padrão adotado
// para o OSRM (DEC-029: serviço demo em dev, URL base configurável para uma
// instância própria/provedor em produção — Spec 01 §8 "mesma API"). Em dev, o
// default aponta para os tiles públicos do OpenStreetMap; em produção, define-se
// `NEXT_PUBLIC_TILES_URL` para o provedor com SLA, sem tocar em código.

/** Template de tiles raster do OpenStreetMap (default de desenvolvimento). */
export const TILES_URL_PADRAO =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Atribuição obrigatória do OpenStreetMap. */
export const ATRIBUICAO_OSM =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Centro default do mapa: aproximadamente o centro geográfico do Estado de São
 * Paulo, em [longitude, latitude] (convenção do MapLibre/GeoJSON).
 */
export const CENTRO_PADRAO_SP = { lng: -48.5, lat: -22.2 };

/** Zoom default: enquadra o Estado de São Paulo. */
export const ZOOM_PADRAO = 6;

/**
 * URL do template de tiles a usar. Prioriza o override explícito, depois a
 * variável de ambiente `NEXT_PUBLIC_TILES_URL`, e por fim o default OSM. Um
 * valor em branco (só espaços) é ignorado.
 */
export function urlDeTiles(override?: string): string {
  const bruto = override ?? process.env.NEXT_PUBLIC_TILES_URL;
  const valor = bruto?.trim();
  return valor && valor.length > 0 ? valor : TILES_URL_PADRAO;
}
