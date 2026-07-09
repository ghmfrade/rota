import {
  esquemaDocumentoOperacao,
  type DocumentoOperacao,
} from "@/shared/contrato";
import { validaEstaticoSecao, validaLocalPareado } from "@/shared/geo";
import { validarConjuntoDeCaracteristicas } from "@/shared/tipificacao";
import type { Ponto } from "@/shared/geo";

// Pipeline de validação de um JSON de operação de ORIGEM DESCONHECIDA —
// as checagens que qualquer leitor estático (import do Formulário — TASK-006;
// Comparador — TASK-035) aplica antes de confiar no arquivo (RN-091; Spec 05
// §4.1). Consolida peças já prontas: schema fechado + §14 (TASK-003), regra
// dos 350 m estática (TASK-010) e tipificação (TASK-008).
//
// Duas severidades (Spec 05 §4.1):
//   BLOQUEIA a leitura  → JSON malformado; schema/§14 inválido (inclui a
//                         unicidade de UUID por categoria, RN-005).
//   ALERTA técnico      → 350 m estático de Seção (RN-028), 350 m pareado de
//                         Local (RN-032) e tipificação (RN-019..022). Sinaliza,
//                         NUNCA bloqueia — o leitor não tem o histórico de
//                         inserção (Spec 03 §7.3).
//
// Leitor estático (RN-080; Spec 03 §12): NÃO chama OSRM, NÃO re-deriva
// município, rota, matriz nem descrição — lê o congelado e apenas confere as
// checagens estáticas que a Spec 03 §12 autoriza.
//
// RN-004 (regra crítica nº 1): o documento devolvido é o próprio objeto
// validado pelo schema (`validacao.data`), SEM fábrica e SEM reindexação — as
// UUIDs do arquivo são preservadas byte a byte. A validação entre arquivos
// (mesmo Autos, versao_schema — Spec 05 §4.2) e a identidade obsoleta do
// Formulário (RN-017) ficam nos consumidores, não aqui.

/** Motivo de bloqueio de leitura, comum a qualquer leitor (Spec 05 §4.1). */
export type CategoriaBloqueioLeitor = "json_malformado" | "schema_invalido";

export interface BloqueioLeitor {
  categoria: CategoriaBloqueioLeitor;
  /** Detalhe técnico (mensagem de parse ou issues do schema concatenadas). */
  detalhe: string;
}

/** Código estável da checagem estática que gerou o alerta (RN-091). */
export type CodigoAlertaTecnico = "350m_secao" | "350m_local" | "tipificacao";

/**
 * Alerta técnico não bloqueante de um leitor estático (RN-028/RN-032/RN-091):
 * o arquivo é lido mesmo assim; o alerta apenas sinaliza inconsistência.
 */
export interface AlertaTecnico {
  codigo: CodigoAlertaTecnico;
  /** Mensagem técnica (cita a RN), compartilhada entre os leitores. */
  mensagem: string;
  /** Caminho da entidade no documento, para localização na UI. */
  caminho: (string | number)[];
}

export type ResultadoChecagemLeitor =
  | { ok: false; bloqueio: BloqueioLeitor }
  | { ok: true; documento: DocumentoOperacao; alertas: AlertaTecnico[] };

// Concatena os issues do zod num único detalhe (caminho: mensagem), no mesmo
// formato usado pelo carregador de estáticos e pelo import.
function detalharIssues(
  issues: { path: PropertyKey[]; message: string }[],
): string {
  return issues
    .map((issue) => {
      const caminho = issue.path.join(".");
      return caminho ? `${caminho}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

// RN-028 (Spec 03 §7.3) — checagem estática fraca dos 350 m por Seção: reúne
// TODOS os pontos finais contribuídos à Seção (qualquer Serviço, Ida e Volta)
// e mede contra o centroide do conjunto completo. Violação → alerta técnico.
function coletarAlertas350mSecao(doc: DocumentoOperacao): AlertaTecnico[] {
  const alertas: AlertaTecnico[] = [];
  doc.autos.secoes.forEach((secao, indiceSecao) => {
    const pontos: Ponto[] = [];
    for (const entrada of secao.servicos) {
      if (entrada.geolocalizacao_ida) pontos.push(entrada.geolocalizacao_ida);
      if (entrada.geolocalizacao_volta) pontos.push(entrada.geolocalizacao_volta);
    }
    if (!validaEstaticoSecao(pontos)) {
      alertas.push({
        codigo: "350m_secao",
        mensagem: `[RN-028] Seção "${secao.nome}": há ponto a mais de 350 m do centroide do conjunto (checagem estática fraca — Spec 03 §7.3)`,
        caminho: ["autos", "secoes", indiceSecao],
      });
    }
  });
  return alertas;
}

// RN-032 (Spec 03 §7.4) — checagem pareada dos 350 m por Local: distância
// entre `geolocalizacao_ida` e `geolocalizacao_volta` do MESMO Local. Severidade
// de alerta técnico no leitor confirmada pelo responsável (inferência controlada
// aprovada: RN-091 trata "350 m estático" como alerta técnico; Spec 03 §7.4
// aplica a pareada também a leitores).
function coletarAlertas350mLocal(doc: DocumentoOperacao): AlertaTecnico[] {
  const alertas: AlertaTecnico[] = [];
  doc.autos.servicos.forEach((servico, indiceServico) => {
    servico.locais.forEach((local, indiceLocal) => {
      if (!validaLocalPareado(local.geolocalizacao_ida, local.geolocalizacao_volta)) {
        alertas.push({
          codigo: "350m_local",
          mensagem: `[RN-032] Local "${local.nome}": geolocalizacao_ida e geolocalizacao_volta a mais de 350 m entre si — deveriam ser dois Locais distintos (Spec 03 §7.4)`,
          caminho: ["autos", "servicos", indiceServico, "locais", indiceLocal],
        });
      }
    });
  });
  return alertas;
}

// RN-019/020/021/022 (Spec 03 §10) — tipificação `tipo` × `caracteristica_veiculo`
// de todos os Serviços do Autos. Violação → alerta técnico (Spec 05 §4.1).
function coletarAlertasTipificacao(doc: DocumentoOperacao): AlertaTecnico[] {
  const caracteristicas = doc.autos.servicos.map(
    (servico) => servico.caracteristica_veiculo,
  );
  return validarConjuntoDeCaracteristicas(doc.autos.tipo, caracteristicas).map(
    (violacao) => ({
      codigo: "tipificacao" as const,
      mensagem: violacao.mensagem,
      // indice −1 = violação do conjunto (p.ex. veículo não único no
      // semiurbano, RN-020); aponta para `autos.tipo`.
      caminho:
        violacao.indice >= 0
          ? ["autos", "servicos", violacao.indice, "caracteristica_veiculo"]
          : ["autos", "tipo"],
    }),
  );
}

/**
 * Coleta os alertas técnicos (não bloqueantes) de um documento JÁ validado
 * pelo schema: 350 m estático de Seção (RN-028), 350 m pareado de Local
 * (RN-032) e tipificação (RN-019..022). Não recalcula nada congelado (RN-080).
 */
export function coletarAlertasTecnicos(
  doc: DocumentoOperacao,
): AlertaTecnico[] {
  return [
    ...coletarAlertas350mSecao(doc),
    ...coletarAlertas350mLocal(doc),
    ...coletarAlertasTipificacao(doc),
  ];
}

/**
 * Valida o texto de um JSON de operação de origem desconhecida (RN-091).
 * Bloqueia em JSON malformado ou schema/§14 inválido; caso contrário devolve o
 * documento (UUIDs preservadas — RN-004) e a lista de alertas técnicos.
 */
export function validarJsonDeLeitor(
  textoJson: string,
): ResultadoChecagemLeitor {
  // Bloqueante 1 — JSON bem-formado (Spec 05 §4.1).
  let bruto: unknown;
  try {
    bruto = JSON.parse(textoJson);
  } catch (erro) {
    return {
      ok: false,
      bloqueio: {
        categoria: "json_malformado",
        detalhe: erro instanceof Error ? erro.message : String(erro),
      },
    };
  }

  // Bloqueante 2 — schema fechado + validações estruturais §14 (inclui RN-005;
  // TASK-003).
  const validacao = esquemaDocumentoOperacao.safeParse(bruto);
  if (!validacao.success) {
    return {
      ok: false,
      bloqueio: {
        categoria: "schema_invalido",
        detalhe: detalharIssues(validacao.error.issues),
      },
    };
  }

  // Sucesso — documento validado (sem fábrica/reindexação, RN-004) + alertas.
  return {
    ok: true,
    documento: validacao.data,
    alertas: coletarAlertasTecnicos(validacao.data),
  };
}
