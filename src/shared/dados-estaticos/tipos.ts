import { z } from "zod";
import { TIPOS_DE_AUTOS } from "@/shared/contrato";

// Schemas dos recursos estáticos servidos junto do app (Spec 01 §8; DEC-030):
// data/autos_empresas.json, data/municipios.json e data/municipios_sp.geojson.
// Todo objeto é strict: divergência entre os arquivos gerados e o formato da
// DEC-030 é rejeitada na carga, não silenciada. Estes schemas descrevem
// recursos de apoio do Formulário — não fazem parte do contrato JSON de
// operação (Spec 02), que vive em shared/contrato.

// Os quatro tipos macro de Autos (Spec 01 §7; Spec 02 §4) — não confundir com
// o enum de característica de veículo (CR, CL, EX…), que é por Serviço.
const tipoDeAutos = z.enum(TIPOS_DE_AUTOS);

// Código IBGE de município: 7 dígitos (Spec 03 §2.3).
const codigoIBGE = z
  .string()
  .regex(/^\d{7}$/, "codigo IBGE de município deve ter 7 dígitos (Spec 03 §2.3)");

export const esquemaTipoEstatico = z.strictObject({
  codigo: tipoDeAutos,
  descricao: z.string().min(1),
});

export const esquemaEmpresaEstatica = z.strictObject({
  id: z.string().min(1),
  nome: z.string().min(1),
});

// A flag `operante` (Spec 04 §3.1) sustenta a recomendação de "carregar JSON
// vigente" na tela inicial; `codigo`/`empresa`/`tipo` sustentam o bloqueio de
// identidade obsoleta (RN-017, implementado na TASK-006/013).
export const esquemaAutosEstatico = z.strictObject({
  codigo: z.string().min(1),
  tc: z.string(),
  denominacao_linha: z.string().min(1),
  empresa_id: z.string().min(1),
  tipo: tipoDeAutos,
  operante: z.boolean(),
});

// DEC-030 — arquivo único data/autos_empresas.json.
export const esquemaListasAutosEmpresas = z
  .strictObject({
    versao_schema: z.literal("1.0"),
    tipos: z.array(esquemaTipoEstatico).min(1),
    empresas: z.array(esquemaEmpresaEstatica).min(1),
    autos: z.array(esquemaAutosEstatico).min(1),
  })
  .superRefine((listas, ctx) => {
    const idsDeEmpresa = new Set(listas.empresas.map((empresa) => empresa.id));
    const codigosDeTipo = new Set(listas.tipos.map((tipo) => tipo.codigo));
    listas.autos.forEach((autos, indice) => {
      if (!idsDeEmpresa.has(autos.empresa_id)) {
        ctx.addIssue({
          code: "custom",
          message: `autos[].empresa_id "${autos.empresa_id}" não existe em empresas[] (DEC-030)`,
          path: ["autos", indice, "empresa_id"],
        });
      }
      if (!codigosDeTipo.has(autos.tipo)) {
        ctx.addIssue({
          code: "custom",
          message: `autos[].tipo "${autos.tipo}" não existe em tipos[] (DEC-030)`,
          path: ["autos", indice, "tipo"],
        });
      }
    });
  });

export const esquemaMunicipioEstatico = z.strictObject({
  codigo_ibge: codigoIBGE,
  nome: z.string().min(1),
  populacao_residente: z.number().int().min(0),
  estado: z.string().min(1),
});

// DEC-030 — data/municipios.json (derivado de pop_municipios.csv).
export const esquemaBaseMunicipios = z.strictObject({
  versao_schema: z.literal("1.0"),
  municipios: z.array(esquemaMunicipioEstatico).min(1),
});

// data/municipios_sp.geojson — FeatureCollection de Polygon por município de
// SP, com properties.codarea = código IBGE (Spec 03 §2.3). Descreve apenas o
// que a derivação de município (TASK-011) consome; posições são [lon, lat]
// com elementos extras tolerados (GeoJSON permite altitude).
const posicaoGeojson = z
  .array(z.number())
  .min(2, "posição GeoJSON tem ao menos [longitude, latitude] (Spec 03 §2.3)");

export const esquemaFeatureMunicipio = z.strictObject({
  type: z.literal("Feature"),
  properties: z.strictObject({
    codarea: codigoIBGE,
  }),
  geometry: z.strictObject({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(posicaoGeojson).min(4)).min(1),
  }),
});

export const esquemaGeojsonMunicipios = z.strictObject({
  type: z.literal("FeatureCollection"),
  features: z.array(esquemaFeatureMunicipio).min(1),
});

export type TipoEstatico = z.infer<typeof esquemaTipoEstatico>;
export type EmpresaEstatica = z.infer<typeof esquemaEmpresaEstatica>;
export type AutosEstatico = z.infer<typeof esquemaAutosEstatico>;
export type ListasAutosEmpresas = z.infer<typeof esquemaListasAutosEmpresas>;
export type MunicipioEstatico = z.infer<typeof esquemaMunicipioEstatico>;
export type BaseMunicipios = z.infer<typeof esquemaBaseMunicipios>;
export type FeatureMunicipio = z.infer<typeof esquemaFeatureMunicipio>;
export type GeojsonMunicipios = z.infer<typeof esquemaGeojsonMunicipios>;
