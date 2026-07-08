import {
  esquemaDocumentoOperacao,
  type DocumentoOperacao,
} from "@/shared/contrato";

// Exportação do documento de operação para arquivo `.json` (Spec 04 §12) — a
// porta de SAÍDA do Formulário, simétrica ao import da TASK-006. Exportar o JSON
// **é** o salvar (RN-096): esta camada é pura e devolve texto + nome sugerido; o
// download em si (Blob/anchor) é UX e vive na etapa final (TASK-032).
//
// Duas ações da Spec 04 §12, ambas sob validação bloqueante (RN-078) e ambas
// preservando as UUIDs (RN-004):
//   - Exportar proposta   → status "proposta", `data_criacao` automática
//     (data corrente injetada), sem `data_publicacao`.
//   - Definir como vigente → status "vigente", `data_publicacao` manual,
//     remove `data_criacao`. NÃO é aprovação nem workflow — só ação técnica que
//     etiqueta o arquivo como baseline pós-SEI (Spec 04 §12.2; RN-010/011).
//
// RN-004 (regra crítica nº 1): a exportação NÃO passa pelas fábricas e NÃO
// regenera UUID. Só `autos.status`/datas mudam; `secoes`/`servicos`/`locais`/
// `viagens` são reaproveitados tal como estão. A função nunca muta a entrada.
//
// Fronteira de acoplamento (docs-dev/13): `formulario/` só depende de `shared/`,
// sem rede e sem persistência de servidor (RN-095/096/097). A data corrente é
// INJETADA (parâmetro), mantendo a função pura, síncrona e sem relógio real nos
// testes — mesmo padrão da injeção de listas no import.

/** Formato ISO exigido para as datas do Autos (Spec 02 §4). */
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Mensagem operacional da Spec 04 §14 para tentativa de export com pendência. */
const MENSAGEM_GATE =
  "Existem pendências bloqueantes. Resolva os itens listados para gerar o JSON/PDF.";

export type CategoriaErroExportacao = "pendencia_bloqueante" | "data_invalida";

export interface ErroExportacao {
  categoria: CategoriaErroExportacao;
  /** Mensagem operacional pronta para o usuário (Spec 04 §14). */
  mensagem: string;
  /** Detalhe técnico das violações de schema (quando houver). */
  detalhe?: string;
}

export type ResultadoExportacao =
  | {
      ok: true;
      /** Texto do arquivo `.json` (UTF-8), pronto para download. */
      json: string;
      /** Nome de arquivo sugerido (Spec 04 §12.1/§12.2) — só sugestão. */
      nomeSugerido: string;
      /** Documento final validado (status/datas já normalizados). */
      documento: DocumentoOperacao;
    }
  | { ok: false; erros: ErroExportacao[] };

// Concatena os issues do zod numa única frase de detalhe (mesmo formato do
// import e do carregador de estáticos: caminho: mensagem).
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

/**
 * Gate de exportação (RN-078): roda a validação estrutural do schema fechado
 * sobre o documento FINAL. É o ponto único onde as pendências de sessão da
 * Spec 04 §11 (rota/matriz desatualizada, descrição ausente com rota presente)
 * serão plugadas na TASK-032 — hoje o computável a partir do documento estático
 * é a validação do contrato (Spec 02 §14). Sem erro bloqueante = liberado.
 * Devolve `[]` quando o documento pode ser exportado.
 */
export function validarParaExportacao(
  documento: DocumentoOperacao,
): ErroExportacao[] {
  const validacao = esquemaDocumentoOperacao.safeParse(documento);
  if (validacao.success) return [];
  return [
    {
      categoria: "pendencia_bloqueante",
      mensagem: MENSAGEM_GATE,
      detalhe: detalharIssues(validacao.error.issues),
    },
  ];
}

// Serializa + monta o resultado de sucesso comum às duas ações. Recebe o
// documento JÁ com status/datas normalizados; roda o gate e, se aprovado,
// devolve texto e nome sugerido.
function finalizarExportacao(
  documento: DocumentoOperacao,
  nomeSugerido: string,
): ResultadoExportacao {
  const erros = validarParaExportacao(documento);
  if (erros.length > 0) return { ok: false, erros };
  // Indentação de 2 espaços + newline final para legibilidade e diffs limpos;
  // RN-004 fala do CONJUNTO de UUIDs, não do byte da formatação.
  const json = `${JSON.stringify(documento, null, 2)}\n`;
  return { ok: true, json, nomeSugerido, documento };
}

/**
 * Exporta como **proposta** (Spec 04 §12.1): `status:"proposta"`, `data_criacao`
 * = `hoje` (data corrente, automática, não editável), **sem** `data_publicacao`.
 * `hoje` deve estar em `YYYY-MM-DD`. UUIDs preservadas (RN-004). Não muta
 * `documento`.
 */
export function exportarComoProposta(
  documento: DocumentoOperacao,
  hoje: string,
): ResultadoExportacao {
  if (!FORMATO_DATA.test(hoje)) {
    return {
      ok: false,
      erros: [
        {
          categoria: "data_invalida",
          mensagem: `A data de criação "${hoje}" não está no formato AAAA-MM-DD.`,
        },
      ],
    };
  }
  // Reconstrói `autos` com a `data_criacao` corrente e SEM `data_publicacao`
  // (RN-011: exatamente uma data, de acordo com o status). Descartar a data do
  // status oposto evita emitir os dois campos.
  const autos = { ...documento.autos, status: "proposta" as const, data_criacao: hoje };
  delete autos.data_publicacao;
  const documentoFinal: DocumentoOperacao = { ...documento, autos };
  const nomeSugerido = `rota-${documento.autos.codigo}-proposta-${hoje}.json`;
  return finalizarExportacao(documentoFinal, nomeSugerido);
}

/**
 * "Definir como vigente" (Spec 04 §12.2): `status:"vigente"`, `data_publicacao`
 * manual obrigatória, **remove** `data_criacao`. NÃO é aprovação nem workflow —
 * ação técnica pós-SEI. `dataPublicacao` deve estar em `YYYY-MM-DD`. UUIDs
 * preservadas (RN-004). Não muta `documento`.
 */
export function exportarComoVigente(
  documento: DocumentoOperacao,
  dataPublicacao: string,
): ResultadoExportacao {
  if (!FORMATO_DATA.test(dataPublicacao)) {
    return {
      ok: false,
      erros: [
        {
          categoria: "data_invalida",
          mensagem: `A data de publicação "${dataPublicacao}" não está no formato AAAA-MM-DD.`,
        },
      ],
    };
  }
  // Reconstrói `autos` com a `data_publicacao` informada e SEM `data_criacao`
  // (RN-011).
  const autos = {
    ...documento.autos,
    status: "vigente" as const,
    data_publicacao: dataPublicacao,
  };
  delete autos.data_criacao;
  const documentoFinal: DocumentoOperacao = { ...documento, autos };
  const nomeSugerido = `rota-${documento.autos.codigo}-vigente-${dataPublicacao}.json`;
  return finalizarExportacao(documentoFinal, nomeSugerido);
}
