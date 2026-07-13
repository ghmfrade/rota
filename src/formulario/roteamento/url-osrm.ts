import type { Ponto } from "@/shared/geo";
import type { PontoDeRota } from "@/shared/contrato";
import { intercalarPontosDeRota } from "./intercalar-pontos-de-rota";

// Montagem da URL de roteamento do OSRM (Spec 03 §3.2; RN-047). Só o
// Formulário chama o OSRM (docs-dev/13 — Comparador nunca roteia, RN-080).
//
// A URL base é **configurável** (DEC-029), espelhando o padrão já adotado
// para os tiles do mapa (`NEXT_PUBLIC_TILES_URL`, `src/shared/mapa/config.ts`):
// demo público em dev, instância própria/provedor com SLA em produção via
// `NEXT_PUBLIC_OSRM_BASE_URL`, sem tocar em código.

/** Instância pública de demonstração do OSRM (default de desenvolvimento). */
export const OSRM_BASE_URL_PADRAO = "https://router.project-osrm.org";

/**
 * URL base do OSRM a usar. Prioriza o override explícito, depois a variável
 * de ambiente `NEXT_PUBLIC_OSRM_BASE_URL`, e por fim o demo público (DEC-029).
 * Um valor em branco (só espaços) é ignorado.
 */
export function urlBaseOsrm(override?: string): string {
  const bruto = override ?? process.env.NEXT_PUBLIC_OSRM_BASE_URL;
  const valor = bruto?.trim();
  return valor && valor.length > 0 ? valor : OSRM_BASE_URL_PADRAO;
}

/**
 * Monta a URL de requisição `GET /route/v1/driving/{coords}` (Spec 03 §3.2;
 * RN-047): perfil `driving`, coordenadas `lon,lat` separadas por `;` **na
 * ordem das paradas** — com os pontos de rota (§3.6) intercalados na posição
 * sequencial correta, quando houver —, com
 * `overview=full&geometries=geojson&steps=true&annotations=false&continue_straight=false`.
 *
 * `&waypoints={índices das paradas}` (0-based) é anexado **só** quando há
 * pontos de rota (§3.2) — caminho preferencial de mapeamento legs→trechos
 * (RN-051). Sem pontos de rota, a URL é idêntica à da TASK-021.
 */
export function montarUrlOsrm(
  paradas: readonly Ponto[],
  baseUrl?: string,
  pontosDeRota: readonly PontoDeRota[] = [],
): string {
  if (paradas.length < 2) {
    throw new Error(
      "[RN-047] montarUrlOsrm exige ao menos 2 paradas (Spec 03 §3.1, RN-034)",
    );
  }
  const { coordenadas: sequencia, indicesParadas } = intercalarPontosDeRota(
    paradas,
    pontosDeRota,
  );
  const coordenadas = sequencia
    .map((ponto) => `${ponto.longitude},${ponto.latitude}`)
    .join(";");
  const base = urlBaseOsrm(baseUrl);
  const waypoints =
    pontosDeRota.length > 0 ? `&waypoints=${indicesParadas.join(";")}` : "";
  return (
    `${base}/route/v1/driving/${coordenadas}` +
    "?overview=full&geometries=geojson&steps=true&annotations=false&continue_straight=false" +
    waypoints
  );
}
