import type { z } from "zod";
import { arredondaHalfUp } from "@/shared/calculo";
import { esquemaGeometriaLineString, type Trecho } from "@/shared/contrato";

// Extração da resposta do OSRM → `rota` parcial (Spec 03 §3.3/§3.4; RN-014,
// RN-040, RN-041, RN-050). Cobre exclusivamente o caminho SEM pontos de rota
// (`legs.length == paradas.length - 1`, mapeamento 1:1 leg→trecho) — a
// generalização com `waypoints`/fusão de legs é escopo da TASK-023; a
// montagem de `descricao_itinerario` a partir de `steps[].name` é a TASK-025.

/** Recorte mínimo de um `leg` do envelope OSRM (Spec 03 §3.3) — só o que esta
 * task consome; `steps` é ignorado aqui (insumo da descrição, TASK-025). */
export interface LegOsrm {
  /** Metros (fronteira de entrada única em metros — RN-014). */
  distance: number;
  /** Segundos. */
  duration: number;
}

/** Recorte mínimo de `routes[0]` do envelope OSRM. */
export interface RotaBrutaOsrm {
  geometry: z.infer<typeof esquemaGeometriaLineString>;
  legs: LegOsrm[];
}

/** Recorte mínimo do envelope de resposta do OSRM (Spec 03 §3.3/§3.5). */
export interface RespostaOsrm {
  code: string;
  routes: RotaBrutaOsrm[];
}

/**
 * Resultado parcial do roteamento de um itinerário: os campos de `rota`
 * (Spec 02 §10.2) que esta task produz. `descricao_itinerario` (TASK-025) e
 * `pontos_de_rota` (TASK-023, default `[]`) são completados por tasks
 * seguintes antes de compor o objeto `rota` congelado final (RN-015).
 */
export interface ResultadoRotaOsrm {
  geometria: z.infer<typeof esquemaGeometriaLineString>;
  distancia_km: number;
  duracao_s: number;
  trechos: Trecho[];
}

/**
 * Extrai `routes[0]` da resposta do OSRM e monta `trechos[]` + totais
 * (Spec 03 §3.3/§3.4): mapeamento 1:1 `leg[i] → trecho{origem i+1, destino
 * i+2}` (RN-041), conversão m→km half-up a 2 casas e `duracao_s` inteiro
 * (RN-050), com os totais somados a partir dos trechos **já arredondados**
 * (RN-040/050) — nunca o total global do OSRM, para não haver erro de
 * fechamento entre `rota.distancia_km` e `Σ trechos`.
 *
 * `numeroParadas` é o tamanho da sequência de paradas do itinerário; sem
 * pontos de rota, o invariante de entrada é `legs.length == numeroParadas -
 * 1` (RN-041) — divergência aqui indica que a resposta não corresponde a
 * esta chamada (ou que há pontos de rota, fora do escopo desta task).
 */
export function extrairRota(
  resposta: RespostaOsrm,
  numeroParadas: number,
): ResultadoRotaOsrm {
  const rotaBruta = resposta.routes[0];
  if (!rotaBruta) {
    throw new Error(
      '[Spec 03 §3.3] resposta OSRM sem "routes[0]" — nenhuma rota calculada.',
    );
  }

  const trechosEsperados = numeroParadas - 1;
  if (rotaBruta.legs.length !== trechosEsperados) {
    throw new Error(
      `[RN-041] legs.length (${rotaBruta.legs.length}) difere de ` +
        `paradas.length - 1 (${trechosEsperados}) — mapeamento 1:1 exige ` +
        "requisição sem pontos de rota (Spec 03 §3.3; pontos de rota são " +
        "escopo da TASK-023).",
    );
  }

  const trechos: Trecho[] = rotaBruta.legs.map((leg, indice) => ({
    parada_origem_ordem: indice + 1,
    parada_destino_ordem: indice + 2,
    distancia_km: arredondaHalfUp(leg.distance / 1000, 2),
    duracao_s: arredondaHalfUp(leg.duration, 0),
  }));

  const distancia_km = arredondaHalfUp(
    trechos.reduce((soma, trecho) => soma + trecho.distancia_km, 0),
    2,
  );
  const duracao_s = trechos.reduce((soma, trecho) => soma + trecho.duracao_s, 0);

  return { geometria: rotaBruta.geometry, distancia_km, duracao_s, trechos };
}
