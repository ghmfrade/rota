import { documentoExemploMinimo } from "./index";

// Catálogo de variantes INVÁLIDAS por RN estrutural (TASK-041, decisão D1):
// uma mutação dirigida por regra, sobre a fixture-base válida (Spec 02 §15).
// Materializadas como mutações — não como JSON em disco — para não duplicar as
// suítes de contrato e não envelhecer a cada mudança de schema. A guarda
// (`fixtures-canonicas.test.ts`) exige que cada variante seja REJEITADA e, quando
// a regra emite tag `[RN-xxx]`, que a mensagem a contenha.
//
// Uma mutação pode disparar violações vizinhas em cascata (ex.: trocar uma
// Parada por Local fere RN-035 e RN-044). A guarda só afirma a PRESENÇA da RN
// alvo — nunca a exclusividade —, o que mantém as variantes robustas.

// UUIDs da fixture-base (Spec 02 §15), para referência das mutações.
const LOCAL = "c2afe932-bf0f-4338-8ff4-63cd908b9033"; // Local só-Ida
const SECAO_C = "63344e28-4722-4a8b-ae9d-1862e8daded4"; // Praia Grande
// UUIDs no formato v4, porém ausentes do documento (para violar integridade).
const UUID_INEXISTENTE_A = "4da15f36-5bbe-4f4e-90e3-68029097c1b0";
const UUID_INEXISTENTE_B = "b3f1c2a0-1e2d-4a3b-9c4d-5e6f7a8b9c00";

export interface VarianteInvalida {
  /** RN estrutural que a mutação viola (rótulo do docs-dev/01). */
  rn: string;
  /** O que a mutação faz, em uma linha. */
  descricao: string;
  /** Trecho da mensagem esperada; ausente quando a rejeição vem do schema fechado (sem tag). */
  fragmentoEsperado?: string;
  /** Documento inválido pronto (cópia isolada da base já mutada). */
  construir: () => unknown;
}

// Tipo livre: o objetivo é produzir documentos impossíveis nos tipos do contrato.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mutavel = any;

function base(mutar: (doc: Mutavel) => void): () => unknown {
  return () => {
    const doc = documentoExemploMinimo() as Mutavel;
    mutar(doc);
    return doc;
  };
}

export const VARIANTES_INVALIDAS: VarianteInvalida[] = [
  {
    rn: "RN-001",
    descricao: "uuid de Seção fora do formato UUIDv4",
    fragmentoEsperado: "[RN-001]",
    construir: base((doc) => {
      doc.autos.secoes[0].uuid = "nao-e-uuid";
    }),
  },
  {
    rn: "RN-005",
    descricao: "duas Viagens do mesmo itinerário com a mesma uuid",
    fragmentoEsperado: "[RN-005]",
    construir: base((doc) => {
      const viagens = doc.autos.servicos[0].itinerarios[0].viagens;
      viagens[1].uuid = viagens[0].uuid;
    }),
  },
  {
    rn: "RN-008",
    descricao: "versao_schema vazio na raiz",
    fragmentoEsperado: "[RN-008]",
    construir: base((doc) => {
      doc.versao_schema = "";
    }),
  },
  {
    rn: "RN-010",
    descricao: "campo desconhecido no Autos (schema fechado)",
    construir: base((doc) => {
      doc.autos.campo_desconhecido = true;
    }),
  },
  {
    rn: "RN-011",
    descricao: 'status "vigente" mantendo data_criacao e sem data_publicacao',
    fragmentoEsperado: "[RN-011]",
    construir: base((doc) => {
      doc.autos.status = "vigente";
      // data_criacao permanece; data_publicacao ausente
    }),
  },
  {
    rn: "RN-013",
    descricao: "campo monetário em par de seccionamento (valor_reais)",
    construir: base((doc) => {
      doc.autos.servicos[0].matriz_seccionamento[0].valor_reais = 7.9;
    }),
  },
  {
    rn: "RN-018",
    descricao: "secao.servicos aponta para servico_uuid inexistente",
    fragmentoEsperado: "[RN-018]",
    construir: base((doc) => {
      doc.autos.secoes[0].servicos[0].servico_uuid = UUID_INEXISTENTE_B;
    }),
  },
  {
    rn: "RN-026",
    descricao: "Seção sem geolocalizacao_ida embora o Serviço tenha Ida",
    fragmentoEsperado: "[RN-026]",
    construir: base((doc) => {
      delete doc.autos.secoes[0].servicos[0].geolocalizacao_ida;
    }),
  },
  {
    rn: "RN-030",
    descricao: "Volta referencia conjunto de Seções diferente da Ida",
    fragmentoEsperado: "[RN-030]",
    construir: base((doc) => {
      // Volta passa a repetir a Seção C no lugar da B → conjuntos divergem.
      doc.autos.servicos[0].itinerarios[1].paradas[1].secao_uuid = SECAO_C;
    }),
  },
  {
    rn: "RN-032",
    descricao: "Local sem nenhuma geolocalizacao (ida nem volta)",
    fragmentoEsperado: "[RN-032]",
    construir: base((doc) => {
      delete doc.autos.servicos[0].locais[0].geolocalizacao_ida;
    }),
  },
  {
    rn: "RN-033",
    descricao: "Parada com secao_uuid E local_uuid simultâneos",
    fragmentoEsperado: "[RN-033]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[0].paradas[0].local_uuid = LOCAL;
    }),
  },
  {
    rn: "RN-034",
    descricao: "ordem das paradas não é 1-based crescente sem lacunas",
    fragmentoEsperado: "[RN-034]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[0].paradas[0].ordem = 2;
    }),
  },
  {
    rn: "RN-035",
    descricao: "primeira Parada referencia um Local, não uma Seção",
    fragmentoEsperado: "[RN-035]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[0].paradas[0] = {
        ordem: 1,
        local_uuid: LOCAL,
      };
    }),
  },
  {
    rn: "RN-036",
    descricao: "Parada referencia secao_uuid inexistente em autos.secoes",
    fragmentoEsperado: "[RN-036]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[0].paradas[0].secao_uuid =
        UUID_INEXISTENTE_A;
    }),
  },
  {
    rn: "RN-038",
    descricao: "dois itinerários com o mesmo sentido no Serviço",
    fragmentoEsperado: "[RN-038]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[1].sentido = "ida";
    }),
  },
  {
    rn: "RN-039",
    descricao: "itinerário sem nenhuma viagem",
    fragmentoEsperado: "[RN-039]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[0].viagens = [];
    }),
  },
  {
    rn: "RN-040",
    descricao: "rota.distancia_km diverge da soma dos trechos",
    fragmentoEsperado: "[RN-040]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[0].rota.trechos[0].distancia_km += 5;
    }),
  },
  {
    rn: "RN-041",
    descricao: "trecho entre paradas não consecutivas (destino ≠ origem + 1)",
    fragmentoEsperado: "[RN-041]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[0].rota.trechos[0].parada_destino_ordem = 3;
    }),
  },
  {
    rn: "RN-042",
    descricao: "ponto de rota após a última parada (apos_parada_ordem fora da faixa)",
    fragmentoEsperado: "[RN-042]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[0].rota.pontos_de_rota[0].apos_parada_ordem = 99;
    }),
  },
  {
    rn: "RN-044",
    descricao: "descricao_itinerario sem os dois itens tipo=secao exigidos",
    fragmentoEsperado: "[RN-044]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[0].rota.descricao_itinerario.itens = [
        { tipo: "via", nome: "Avenida Sem Seções" },
      ];
    }),
  },
  {
    rn: "RN-054",
    descricao: "matriz_distancias incompleta (par de Seções atendidas ausente)",
    fragmentoEsperado: "[RN-054]",
    construir: base((doc) => {
      doc.autos.servicos[0].matriz_distancias.pop();
    }),
  },
  {
    rn: "RN-056",
    descricao: "par de matriz_distancias sem distancia_trecho_volta com Volta presente",
    fragmentoEsperado: "[RN-056]",
    construir: base((doc) => {
      delete doc.autos.servicos[0].matriz_distancias[0].distancia_trecho_volta;
    }),
  },
  {
    rn: "RN-059",
    descricao: "par de matriz_seccionamento ausente em matriz_distancias",
    fragmentoEsperado: "[RN-059]",
    construir: base((doc) => {
      doc.autos.servicos[0].matriz_seccionamento[0].secao_a_uuid =
        UUID_INEXISTENTE_A;
    }),
  },
  {
    rn: "RN-063",
    descricao: "primeiro offset_horario da viagem diferente de 00:00:00",
    fragmentoEsperado: "[RN-063]",
    construir: base((doc) => {
      doc.autos.servicos[0].itinerarios[0].viagens[0].horarios_paradas[0].offset_horario =
        "00:05:00";
    }),
  },
];
