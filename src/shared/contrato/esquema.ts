import { z } from "zod";

// Formas (shapes) do contrato JSON de operação — Spec 02 §3–§11.
// Todo objeto é strict: campo desconhecido é rejeitado (RN-010; Spec 02 §16).
// Validações que cruzam entidades ficam em validacoes-estruturais.ts e são
// aplicadas por esquemaDocumentoOperacao (index.ts).

// UUIDv4 (Spec 02 §12; RN-001)
export const REGEX_UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const uuidV4 = z
  .string()
  .regex(REGEX_UUID_V4, "[RN-001] uuid deve ser UUIDv4 (Spec 02 §12)");

const dataISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ter formato YYYY-MM-DD (Spec 02 §4)");

// horario_saida é hora de relógio 00–23 (Spec 02 §11); offset_horario é
// duração desde a saída — a casa das horas aceita 00–99 (inferência
// controlada registrada na Análise da Task: uma viagem pode passar de 24 h).
const horarioRelogio = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/,
    "horario_saida deve ter formato HH:MM:SS de relógio (Spec 02 §11)",
  );

const offsetHorario = z
  .string()
  .regex(
    /^\d{2}:[0-5]\d:[0-5]\d$/,
    "offset_horario deve ter formato HH:MM:SS (Spec 02 §11.1)",
  );

// Enums fixados nas specs
export const TIPOS_DE_AUTOS = [
  "Semiurbano",
  "Semiurbano Litorâneo",
  "Rodoviário",
  "Rodoviário Litorâneo",
] as const; // Spec 01 §7; Spec 02 §4

export const CARACTERISTICAS_DE_VEICULO = [
  "SU",
  "SUL",
  "CR",
  "CL",
  "EX",
  "LE",
  "ME",
  "MEL",
  "ML",
  "MLL",
  "MX",
  "MM",
  "MML",
] as const; // Spec 02 §6 (DEC-026 — não existe SL); partição por tipo é regra da Spec 03 §10 (TASK-008)

export const CARATERES = ["principal", "parcial", "semidireta"] as const; // Spec 02 §6 (RN-024)

export const SENTIDOS = ["ida", "volta"] as const; // Spec 02 §10

export const DIAS_SEMANA = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
] as const; // Spec 02 §11 (RN-061)

export const STATUS_DE_AUTOS = ["proposta", "vigente"] as const; // Spec 02 §4.1 (RN-011)

export const TIPOS_DE_TABELA_EXCEPCIONAL = [
  "ferias_verao",
  "ferias_inverno",
  "personalizado",
] as const; // Spec 02 §6.1 (RN-098)

// Coordenadas em faixas geográficas padrão (inferência controlada — faixas
// não fixadas na spec; GeoJSON/WGS84).
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

export const esquemaGeolocalizacao = z.strictObject({
  latitude,
  longitude,
});

// Spec 02 §5.1 — entrada de Serviço em secao.servicos[]
export const esquemaSecaoServico = z.strictObject({
  servico_uuid: uuidV4,
  geolocalizacao_ida: esquemaGeolocalizacao.optional(),
  geolocalizacao_volta: esquemaGeolocalizacao.optional(),
});

// Spec 02 §5 — Seção (entidade do Autos, compartilhada — RN-025)
export const esquemaSecao = z.strictObject({
  uuid: uuidV4,
  municipio: z.string().min(1),
  nome: z.string().min(1),
  servicos: z
    .array(esquemaSecaoServico)
    .min(1, "[RN-018] secao.servicos deve ter ao menos 1 entrada (Spec 02 §14)"),
});

// Spec 02 §7 — Local (entidade do Serviço, sem tarifa — RN-031)
export const esquemaLocal = z
  .strictObject({
    uuid: uuidV4,
    nome: z.string().min(1),
    municipio: z.string().min(1),
    geolocalizacao_ida: esquemaGeolocalizacao.optional(),
    geolocalizacao_volta: esquemaGeolocalizacao.optional(),
  })
  .superRefine((local, ctx) => {
    if (!local.geolocalizacao_ida && !local.geolocalizacao_volta) {
      ctx.addIssue({
        code: "custom",
        message:
          "[RN-032] Local deve ter ao menos uma de geolocalizacao_ida/geolocalizacao_volta (Spec 02 §7.1)",
      });
    }
  });

// Spec 02 §8 — ParDistância (matriz_distancias)
export const esquemaParDistancia = z.strictObject({
  secao_a_uuid: uuidV4,
  secao_b_uuid: uuidV4,
  distancia_trecho_ida: z.number().min(0).optional(),
  distancia_trecho_volta: z.number().min(0).optional(),
  valor_adotado_de_distancia: z.number().min(0),
});

// Spec 02 §9 — ParSeção (matriz_seccionamento); distância em km, nunca R$ (RN-013)
export const esquemaParSecao = z.strictObject({
  secao_a_uuid: uuidV4,
  secao_b_uuid: uuidV4,
  distancia_km: z.number().min(0),
});

// Spec 02 §10.1 — Parada: exatamente um de secao_uuid XOR local_uuid (RN-033)
export const esquemaParada = z
  .strictObject({
    ordem: z.number().int().min(1),
    secao_uuid: uuidV4.optional(),
    local_uuid: uuidV4.optional(),
  })
  .superRefine((parada, ctx) => {
    const referencias = [parada.secao_uuid, parada.local_uuid].filter(
      (v) => v !== undefined,
    ).length;
    if (referencias !== 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "[RN-033] Parada referencia exatamente um de secao_uuid XOR local_uuid — nunca os dois, nunca nenhum (Spec 02 §10.1)",
      });
    }
  });

// Spec 02 §10.3 — Trecho: sempre entre paradas consecutivas (RN-041)
export const esquemaTrecho = z
  .strictObject({
    parada_origem_ordem: z.number().int().min(1),
    parada_destino_ordem: z.number().int().min(1),
    distancia_km: z.number().min(0),
    duracao_s: z.number().min(0),
  })
  .superRefine((trecho, ctx) => {
    if (trecho.parada_destino_ordem !== trecho.parada_origem_ordem + 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "[RN-041] parada_destino_ordem deve ser parada_origem_ordem + 1 (Spec 02 §10.3)",
      });
    }
  });

// Spec 02 §10.4 — PontoDeRota: sem uuid, propósito único de forçar o traçado (RN-042)
export const esquemaPontoDeRota = z.strictObject({
  apos_parada_ordem: z.number().int().min(1),
  latitude,
  longitude,
});

// Spec 02 §10.5 — ItemDescricao: tipo "secao" XOR "via" (RN-044)
export const esquemaItemDescricaoSecao = z.strictObject({
  tipo: z.literal("secao"),
  secao_uuid: uuidV4,
  rotulo: z.string().min(1),
});

export const esquemaItemDescricaoVia = z.strictObject({
  tipo: z.literal("via"),
  nome: z.string().min(1),
});

export const esquemaItemDescricao = z.discriminatedUnion("tipo", [
  esquemaItemDescricaoSecao,
  esquemaItemDescricaoVia,
]);

export const esquemaDescricaoItinerario = z.strictObject({
  texto: z.string(),
  itens: z.array(esquemaItemDescricao),
});

// GeoJSON LineString, coordenadas [longitude, latitude] (Spec 02 §10.2)
export const esquemaGeometriaLineString = z.strictObject({
  type: z.literal("LineString"),
  coordinates: z.array(z.tuple([longitude, latitude])).min(2),
});

// Spec 02 §10.2 — Rota (congelada; leitores não recalculam — RN-015)
export const esquemaRota = z.strictObject({
  geometria: esquemaGeometriaLineString,
  distancia_km: z.number().min(0),
  duracao_s: z.number().min(0),
  descricao_itinerario: esquemaDescricaoItinerario,
  trechos: z.array(esquemaTrecho),
  pontos_de_rota: z.array(esquemaPontoDeRota).default([]),
});

// Spec 02 §11.1 — HorárioParada
export const esquemaHorarioParada = z.strictObject({
  parada_ordem: z.number().int().min(1),
  offset_horario: offsetHorario,
});

// Spec 02 §6.1 — grade de operação excepcional do Serviço (RN-098).
// `null` nos tipos canônicos é equivalente à ausência conforme o exemplo
// normativo da Spec 02 §15; `personalizado` exige uma string.
export const esquemaTabelaExcepcional = z
  .strictObject({
    uuid: uuidV4,
    tipo: z.enum(TIPOS_DE_TABELA_EXCEPCIONAL),
    descricao: z.string().nullable().optional(),
  })
  .superRefine((tabela, ctx) => {
    if (tabela.tipo === "personalizado" && typeof tabela.descricao !== "string") {
      ctx.addIssue({
        code: "custom",
        path: ["descricao"],
        message:
          '[RN-098] descricao é obrigatória quando tipo é "personalizado" (Spec 02 §6.1, §14)',
      });
    }
    if (
      tabela.tipo !== "personalizado" &&
      tabela.descricao !== undefined &&
      tabela.descricao !== null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["descricao"],
        message:
          '[RN-098] descricao deve ser ausente ou null quando tipo é "ferias_verao" ou "ferias_inverno" (Spec 02 §6.1, §14)',
      });
    }
  });

// Spec 02 §11 — Viagem estratificada por dia (RN-061)
export const esquemaViagem = z
  .strictObject({
    uuid: uuidV4,
    horario_saida: horarioRelogio,
    dia_semana: z.enum(DIAS_SEMANA),
    viagem_feriado: z.boolean(),
    tabela_excepcional_uuid: uuidV4.nullable().default(null),
    horarios_paradas: z.array(esquemaHorarioParada).min(1),
  })
  .superRefine((viagem, ctx) => {
    if (
      viagem.tabela_excepcional_uuid !== null &&
      viagem.viagem_feriado
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["tabela_excepcional_uuid"],
        message:
          "[RN-099] Viagem de tabela excepcional não pode ser de feriado (Spec 02 §11, §14)",
      });
    }
  });

// Spec 02 §10 — Itinerário
export const esquemaItinerario = z.strictObject({
  sentido: z.enum(SENTIDOS),
  paradas: z
    .array(esquemaParada)
    .min(2, "[RN-034] todo itinerário tem no mínimo 2 paradas (Spec 02 §10)"),
  rota: esquemaRota,
  viagens: z
    .array(esquemaViagem)
    .min(1, "[RN-039] todo itinerário tem no mínimo 1 viagem (Spec 02 §10)"),
});

// Spec 02 §6 — Serviço
export const esquemaServico = z.strictObject({
  uuid: uuidV4,
  numero_n: z.string().min(1),
  caracteristica_veiculo: z.enum(CARACTERISTICAS_DE_VEICULO),
  carater: z.enum(CARATERES),
  locais: z.array(esquemaLocal).default([]),
  tabelas_excepcionais: z.array(esquemaTabelaExcepcional).default([]),
  matriz_distancias: z.array(esquemaParDistancia),
  matriz_seccionamento: z.array(esquemaParSecao).default([]),
  itinerarios: z
    .array(esquemaItinerario)
    .min(1, "[RN-038] Serviço tem 1 ou 2 itinerários (Spec 02 §10)")
    .max(2, "[RN-038] Serviço tem 1 ou 2 itinerários (Spec 02 §10)"),
});

// Spec 02 §4 — Autos
export const esquemaAutos = z.strictObject({
  codigo: z.string().min(1),
  tipo: z.enum(TIPOS_DE_AUTOS),
  empresa: z.string().min(1),
  status: z.enum(STATUS_DE_AUTOS),
  data_criacao: dataISO.optional(),
  data_publicacao: dataISO.optional(),
  secoes: z.array(esquemaSecao),
  servicos: z
    .array(esquemaServico)
    .min(1, "[RN-018] autos.servicos deve ter ao menos 1 elemento (Spec 02 §14)"),
});

// Valor de `versao_schema` (Spec 02 §3) gravado num documento criado do zero
// no Formulário (TASK-032; DEC-066/Q-046) — não há JSON de origem para
// herdar a versão. A operação excepcional elevou o contrato de "1.0" para
// "1.1"; documentos antigos continuam válidos pelos defaults `[]`/`null`.
export const VERSAO_SCHEMA_ATUAL = "1.1";

// Spec 02 §3 — Objeto raiz (sem as validações cruzadas; ver index.ts)
export const esquemaDocumentoOperacaoBase = z.strictObject({
  versao_schema: z
    .string()
    .min(1, "[RN-008] versao_schema é obrigatório na raiz (Spec 02 §3)"),
  autos: esquemaAutos,
});

export type Geolocalizacao = z.infer<typeof esquemaGeolocalizacao>;
export type SecaoServico = z.infer<typeof esquemaSecaoServico>;
export type Secao = z.infer<typeof esquemaSecao>;
export type Local = z.infer<typeof esquemaLocal>;
export type ParDistancia = z.infer<typeof esquemaParDistancia>;
export type ParSecao = z.infer<typeof esquemaParSecao>;
export type Parada = z.infer<typeof esquemaParada>;
export type Trecho = z.infer<typeof esquemaTrecho>;
export type PontoDeRota = z.infer<typeof esquemaPontoDeRota>;
export type ItemDescricao = z.infer<typeof esquemaItemDescricao>;
export type DescricaoItinerario = z.infer<typeof esquemaDescricaoItinerario>;
export type HorarioParada = z.infer<typeof esquemaHorarioParada>;
export type TabelaExcepcional = z.infer<typeof esquemaTabelaExcepcional>;
export type Viagem = z.infer<typeof esquemaViagem>;
export type Itinerario = z.infer<typeof esquemaItinerario>;
export type Servico = z.infer<typeof esquemaServico>;
export type Autos = z.infer<typeof esquemaAutos>;
export type DocumentoOperacao = z.infer<typeof esquemaDocumentoOperacaoBase>;
