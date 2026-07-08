import type { ZodType } from "zod";
import {
  esquemaBaseMunicipios,
  esquemaGeojsonMunicipios,
  esquemaListasAutosEmpresas,
  type BaseMunicipios,
  type GeojsonMunicipios,
  type ListasAutosEmpresas,
} from "./tipos";

// Carregamento client-side dos recursos estáticos (Spec 01 §8; DEC-030).
// Nenhum servidor próprio, nenhum endpoint (RN-095/096): as listas de data/
// entram no bundle por import dinâmico (chunk sob demanda) e o geojson — cuja
// extensão os bundlers não tratam como JSON — é servido como arquivo estático
// de public/ pelo mesmo host do app, buscado por fetch. Cada recurso é
// validado uma única vez na primeira carga e memoizado.

/** Caminho estático do geojson municipal, relativo à raiz do app. */
export const URL_GEOJSON_MUNICIPIOS = "/dados/municipios_sp.geojson";

export class ErroDeDadosEstaticos extends Error {
  constructor(recurso: string, detalhes: string) {
    super(`recurso estático "${recurso}" inválido (DEC-030):\n${detalhes}`);
    this.name = "ErroDeDadosEstaticos";
  }
}

function validar<T>(recurso: string, esquema: ZodType<T>, bruto: unknown): T {
  const resultado = esquema.safeParse(bruto);
  if (!resultado.success) {
    const detalhes = resultado.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new ErroDeDadosEstaticos(recurso, detalhes);
  }
  return resultado.data;
}

function memoizar<T>(carregar: () => Promise<T>): () => Promise<T> {
  let promessa: Promise<T> | undefined;
  return () => {
    // Falha não fica cacheada: os estáticos são imutáveis em runtime, mas
    // manter a promessa rejeitada impediria nova tentativa após falha
    // transitória de rede/carregamento de chunk.
    promessa ??= carregar().catch((erro) => {
      promessa = undefined;
      throw erro;
    });
    return promessa;
  };
}

/** Listas de Autos, empresas e tipos (data/autos_empresas.json — RN-016). */
export const carregarListasAutosEmpresas: () => Promise<ListasAutosEmpresas> =
  memoizar(async () => {
    const bruto = (await import("../../../data/autos_empresas.json")).default;
    return validar("autos_empresas.json", esquemaListasAutosEmpresas, bruto);
  });

/** Base de municípios de SP com nome e população (data/municipios.json — RN-029). */
export const carregarBaseMunicipios: () => Promise<BaseMunicipios> = memoizar(
  async () => {
    const bruto = (await import("../../../data/municipios.json")).default;
    return validar("municipios.json", esquemaBaseMunicipios, bruto);
  },
);

/** Geometrias municipais para ponto-em-polígono (public/dados/municipios_sp.geojson — RN-029). */
export const carregarGeojsonMunicipios: () => Promise<GeojsonMunicipios> =
  memoizar(async () => {
    const resposta = await fetch(URL_GEOJSON_MUNICIPIOS);
    if (!resposta.ok) {
      throw new ErroDeDadosEstaticos(
        "municipios_sp.geojson",
        `falha ao buscar ${URL_GEOJSON_MUNICIPIOS} (HTTP ${resposta.status})`,
      );
    }
    return validar(
      "municipios_sp.geojson",
      esquemaGeojsonMunicipios,
      await resposta.json(),
    );
  });

/**
 * Nome de exibição da empresa a partir de `empresa_id` (DEC-030) — é o valor
 * que o JSON de operação grava em `autos.empresa` (Spec 02 §4).
 */
export function nomeDaEmpresa(
  listas: ListasAutosEmpresas,
  empresaId: string,
): string | undefined {
  return listas.empresas.find((empresa) => empresa.id === empresaId)?.nome;
}
