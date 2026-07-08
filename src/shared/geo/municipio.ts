// Derivação de município por ponto-em-polígono (Spec 03 §2.3; RN-029).
//
// Módulo puro: recebe as geometrias (`municipios_sp.geojson`) e o índice de
// nomes (`municipios.json`) já carregados por `shared/dados-estaticos`, sem
// `fetch` nem dependência de UI. A orquestração com os loaders memoizados e o
// disparo da derivação (criação/arrasto de ponto — Spec 04 §7.1) ficam nos
// editores do Formulário (TASK-017/018). O valor derivado é congelado no JSON:
// Comparador/Ingestor/PDF **não** re-derivam município (NEG-013), leem o campo.
//
// Depende só de `./primitivas` (Haversine + centroide) e dos tipos estáticos —
// nunca de `contrato/` (o schema da Spec 02).
import { centroide, haversine, type Ponto } from "./primitivas";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";

// Spec 03 §2.3 — teto do fallback de borda: acima disso o ponto é "fora de SP".
export const TETO_FALLBACK_M = 2_000;

// Resultado da derivação. `encontrado: false` corresponde ao erro bloqueante
// "fora de SP" (Spec 03 §2.3); a mensagem ao usuário é da Spec 04 §14 (camada
// UI) — a função pura devolve só o motivo, não a string exibida.
export type ResultadoMunicipio =
  | { encontrado: true; nome: string; codigoIbge: string }
  | { encontrado: false; motivo: "fora_de_sp" };

// Violação de consistência entre os dois recursos estáticos (mesma origem,
// 645 registros cada — DEC-030): um `codarea` do geojson sem `nome` na base.
// É erro de dados gerados, NÃO "fora de SP" — jamais deve ser mascarado como
// tal (o ponto está dentro de um município de SP; falta só o nome de exibição).
export class ErroDeConsistenciaGeodados extends Error {
  constructor(codarea: string) {
    super(
      `município ${codarea} presente no geojson mas ausente da base de nomes ` +
        `(municipios.json) — inconsistência dos recursos estáticos (DEC-030)`,
    );
    this.name = "ErroDeConsistenciaGeodados";
  }
}

// Geometria de uma feature municipal: anéis de posições `[lon, lat, …?]`
// (Spec 03 §2.3; validada em shared/dados-estaticos).
type Geometria = FeatureMunicipio["geometry"];

/**
 * Índice `codigo_ibge → nome` a partir da base de municípios (Spec 03 §2.3,
 * join `codarea == cod_municipio`). Construído uma vez pelo chamador e
 * reutilizado a cada derivação.
 */
export function indiceDeNomes(
  municipios: readonly { codigo_ibge: string; nome: string }[],
): Map<string, string> {
  return new Map(municipios.map((m) => [m.codigo_ibge, m.nome]));
}

// Spec 03 §2.3 — ray casting padrão (regra par-ímpar) sobre as coordenadas
// `[lon, lat]`. Percorre TODOS os anéis do Polygon: o par-ímpar trata buracos
// automaticamente (ponto num buraco conta como fora). Anéis GeoJSON são
// fechados (último = primeiro), o que não afeta a contagem de cruzamentos.
function pontoEmPoligono(ponto: Ponto, geometria: Geometria): boolean {
  const x = ponto.longitude;
  const y = ponto.latitude;
  let dentro = false;

  for (const anel of geometria.coordinates) {
    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const xi = anel[i][0];
      const yi = anel[i][1];
      const xj = anel[j][0];
      const yj = anel[j][1];
      const cruza =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (cruza) {
        dentro = !dentro;
      }
    }
  }

  return dentro;
}

// Ponto mais próximo do segmento [a,b] ao ponto `p`, resolvido em projeção
// equirretangular local (graus com longitude corrigida por cos(lat) para a
// convergência dos meridianos). A projeção serve só para achar o parâmetro `t`
// da projeção ortogonal, clampeado a [0,1]; o ponto retornado é interpolado em
// lat/lon reais e a distância final é medida em Haversine (§2.1) pelo chamador.
function pontoMaisProximoNoSegmento(p: Ponto, a: Ponto, b: Ponto): Ponto {
  const cosLat = Math.cos((p.latitude * Math.PI) / 180);
  const ax = a.longitude * cosLat;
  const bx = b.longitude * cosLat;
  const px = p.longitude * cosLat;
  const ay = a.latitude;
  const by = b.latitude;
  const py = p.latitude;

  const dx = bx - ax;
  const dy = by - ay;
  const comprimento2 = dx * dx + dy * dy;

  // Segmento degenerado (a == b): o próprio ponto a.
  const t =
    comprimento2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / comprimento2));

  return {
    latitude: a.latitude + t * (b.latitude - a.latitude),
    longitude: a.longitude + t * (b.longitude - a.longitude),
  };
}

// Metros por grau de latitude — só para o limite inferior da bounding box
// (não para a distância final, que é sempre Haversine). Fator 0,999 deixa o
// limite conservador (nunca superestima a distância real), garantindo que o
// curto-circuito jamais descarte a feature de fato mais próxima.
const METROS_POR_GRAU = 111_320;
const MARGEM_SEGURANCA = 0.999;

// Limite INFERIOR da distância de `p` à caixa envolvente da geometria, em
// metros (0 se `p` está dentro da caixa). Barato (min/max, sem trigonometria);
// se já supera o menor valor corrente, dispensa varrer os segmentos (DEC-031).
function limiteInferiorBBox(p: Ponto, geometria: Geometria): number {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const anel of geometria.coordinates) {
    for (const [lon, lat] of anel) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  const dLonGraus = Math.max(minLon - p.longitude, 0, p.longitude - maxLon);
  const dLatGraus = Math.max(minLat - p.latitude, 0, p.latitude - maxLat);
  const cosLat = Math.cos((p.latitude * Math.PI) / 180);
  const dxM = dLonGraus * METROS_POR_GRAU * cosLat;
  const dyM = dLatGraus * METROS_POR_GRAU;

  return Math.hypot(dxM, dyM) * MARGEM_SEGURANCA;
}

// Menor distância Haversine (§2.1) de `p` à fronteira da geometria: mínimo de
// `haversine(p, ponto-mais-próximo)` sobre todos os segmentos de todos os
// anéis (DEC-031, opção ponto→segmento). `corteSuperior` permite abortar cedo.
function distanciaAFronteira(
  p: Ponto,
  geometria: Geometria,
  corteSuperior: number,
): number {
  let minimo = corteSuperior;

  for (const anel of geometria.coordinates) {
    for (let i = 1; i < anel.length; i++) {
      const a: Ponto = { longitude: anel[i - 1][0], latitude: anel[i - 1][1] };
      const b: Ponto = { longitude: anel[i][0], latitude: anel[i][1] };
      const d = haversine(p, pontoMaisProximoNoSegmento(p, a, b));
      if (d < minimo) {
        minimo = d;
      }
    }
  }

  return minimo;
}

// Nome de exibição via join `codarea → nome`; ausência é inconsistência de
// dados (não "fora de SP").
function nomePorCodarea(
  codarea: string,
  nomes: ReadonlyMap<string, string>,
): { nome: string; codigoIbge: string } {
  const nome = nomes.get(codarea);
  if (nome === undefined) {
    throw new ErroDeConsistenciaGeodados(codarea);
  }
  return { nome, codigoIbge: codarea };
}

/**
 * `MUNICIPIO(ponto)` (Spec 03 §2.3; RN-029). Ray casting sobre as features;
 * no primeiro polígono que contém o ponto (os municipais são disjuntos — o
 * primeiro match é o único), faz o join `codarea → nome`. Sem match, aplica o
 * fallback de borda: adota o município cuja fronteira (distância ponto→segmento
 * em Haversine — DEC-031) é a mais próxima, até 2 km; acima disso, "fora de SP".
 *
 * @param ponto ponto decisor (Seção: centroide dos pontos; Local: ponto único
 *   ou ponto médio — ver `pontoDecisorSecao` / `pontoDecisorLocal`).
 * @param features geometrias municipais (`municipios_sp.geojson`).
 * @param nomes índice `codigo_ibge → nome` (`indiceDeNomes` sobre a base).
 */
export function derivarMunicipio(
  ponto: Ponto,
  features: readonly FeatureMunicipio[],
  nomes: ReadonlyMap<string, string>,
): ResultadoMunicipio {
  // 1) ponto-em-polígono: primeiro (e único) match.
  for (const feature of features) {
    if (pontoEmPoligono(ponto, feature.geometry)) {
      return { encontrado: true, ...nomePorCodarea(feature.properties.codarea, nomes) };
    }
  }

  // 2) fallback de borda: fronteira mais próxima, teto de 2 km.
  let menorDistancia = TETO_FALLBACK_M + 1;
  let maisProxima: FeatureMunicipio | undefined;

  for (const feature of features) {
    // Curto-circuito por bounding box: se nem a caixa envolvente chega ao
    // menor valor corrente, a fronteira também não chega (DEC-031).
    if (limiteInferiorBBox(ponto, feature.geometry) >= menorDistancia) {
      continue;
    }
    const d = distanciaAFronteira(ponto, feature.geometry, menorDistancia);
    if (d < menorDistancia) {
      menorDistancia = d;
      maisProxima = feature;
    }
  }

  if (maisProxima !== undefined && menorDistancia <= TETO_FALLBACK_M) {
    return {
      encontrado: true,
      ...nomePorCodarea(maisProxima.properties.codarea, nomes),
    };
  }

  return { encontrado: false, motivo: "fora_de_sp" };
}

/**
 * Ponto decisor do município de uma **Seção** (Spec 03 §2.3): centroide (§2.2)
 * dos pontos aceitos na Seção, re-derivado a cada inserção/edição/remoção.
 */
export function pontoDecisorSecao(pontosAceitos: readonly Ponto[]): Ponto {
  return centroide(pontosAceitos);
}

/**
 * Ponto decisor do município de um **Local** (Spec 03 §2.3): o ponto único ou,
 * quando Ida e Volta existem, o ponto médio dos dois. Ao menos um deve existir
 * (Spec 02 §7.1) — chamar sem nenhum é erro de uso.
 */
export function pontoDecisorLocal(
  geolocalizacaoIda: Ponto | undefined,
  geolocalizacaoVolta: Ponto | undefined,
): Ponto {
  if (geolocalizacaoIda && geolocalizacaoVolta) {
    return centroide([geolocalizacaoIda, geolocalizacaoVolta]);
  }
  const unico = geolocalizacaoIda ?? geolocalizacaoVolta;
  if (unico === undefined) {
    throw new Error(
      "[RN-032] Local precisa de ao menos uma geolocalização para derivar município (Spec 02 §7.1)",
    );
  }
  return unico;
}
