import { esquemaDocumentoOperacao, type DocumentoOperacao } from "@/shared/contrato";
import type { ListasAutosEmpresas } from "@/shared/dados-estaticos";

// Importação de um JSON de operação para o estado de edição do Formulário
// (Spec 04 §3.1 — "Carregar JSON existente"). Esta é a porta de entrada de um
// arquivo já gerado pelo ROTA; a tela em si (seleção de arquivo, mensagens na
// UI) é a TASK-013 — aqui vive só a lógica pura e testável.
//
// Espinha de validação por arquivo (RN-091, parte Formulário), do bloqueante ao
// não bloqueante:
//   1. JSON bem-formado           → bloqueia (categoria "json_invalido")
//   2. schema + estrutural §14     → bloqueia (categoria "json_invalido")
//      (inclui RN-005 unicidade de UUID, já em esquemaDocumentoOperacao)
//   3. identidade nas listas       → bloqueia (categoria "identidade_obsoleta", RN-017)
//   4. alertas técnicos (350 m…)   → NÃO bloqueiam (RN-028/032) — ver "Fora de escopo"
//
// RN-004 (regra crítica nº 1): importar NÃO passa pelas fábricas e NÃO regenera
// UUID — o documento devolvido preserva byte a byte as UUIDs do arquivo. A
// função nunca muta a entrada nem reindexa entidades (NEG-014).
//
// Fronteira de acoplamento (docs-dev/13): `formulario/` só depende de `shared/`.
// As listas estáticas são INJETADAS (parâmetro `listas`) em vez de carregadas
// aqui dentro — mantém a função pura e síncrona, sem rede nos testes (RN-095/096).

/** Categorias de bloqueio de carregamento (Spec 04 §14). */
export type CategoriaErroImportacao = "json_invalido" | "identidade_obsoleta";

export interface ErroImportacao {
  categoria: CategoriaErroImportacao;
  /** Mensagem operacional pronta para o usuário (Spec 04 §14). */
  mensagem: string;
}

/**
 * Alerta técnico não bloqueante (RN-091). Nesta task a lista nasce sempre vazia:
 * as checagens estáticas dos 350 m (RN-028/RN-032) dependem das primitivas geo
 * (TASK-009/010) e ficam para a TASK-012 — o slot já existe para não mudar a
 * assinatura depois.
 */
export interface AlertaTecnico {
  codigo: string;
  mensagem: string;
}

export type ResultadoImportacao =
  | { ok: true; documento: DocumentoOperacao; alertas: AlertaTecnico[] }
  | { ok: false; erro: ErroImportacao };

// Concatena os issues do zod numa única frase de detalhe, no mesmo formato do
// carregador de estáticos (caminho: mensagem).
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

// RN-017/RN-016 — identidade obsoleta. Existência INDEPENDENTE de cada campo nas
// listas estáticas atuais (leitura literal da Spec 04 §3.1 item 3; a coerência
// codigo↔empresa↔tipo é Q-012, refinamento futuro — inferência controlada).
// `autos.empresa` guarda o NOME da empresa (Spec 02 §4; ver nomeDaEmpresa em
// shared/dados-estaticos), casado contra `empresas[].nome`.
function identidadeObsoleta(
  autos: DocumentoOperacao["autos"],
  listas: ListasAutosEmpresas,
): boolean {
  const codigoConhecido = listas.autos.some((a) => a.codigo === autos.codigo);
  const empresaConhecida = listas.empresas.some((e) => e.nome === autos.empresa);
  const tipoConhecido = listas.tipos.some((t) => t.codigo === autos.tipo);
  return !codigoConhecido || !empresaConhecida || !tipoConhecido;
}

/**
 * Importa o texto de um arquivo `.json` para o estado de edição, validando
 * estrutura e identidade (Spec 04 §3.1). Devolve o `DocumentoOperacao` com as
 * UUIDs preservadas (RN-004) ou um erro de bloqueio com mensagem da Spec 04 §14.
 * Não muta `listas`.
 */
export function importarDocumento(
  textoJson: string,
  listas: ListasAutosEmpresas,
): ResultadoImportacao {
  // Etapa 1 — JSON bem-formado (RN-091).
  let bruto: unknown;
  try {
    bruto = JSON.parse(textoJson);
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    return {
      ok: false,
      erro: {
        categoria: "json_invalido",
        mensagem: `O arquivo não é um JSON de operação válido: ${detalhe}. Verifique se o arquivo foi gerado pelo ROTA.`,
      },
    };
  }

  // Etapa 2 — schema fechado + validações estruturais §14 (RN-005/RN-008..015,
  // já implementadas em esquemaDocumentoOperacao — TASK-003).
  const validacao = esquemaDocumentoOperacao.safeParse(bruto);
  if (!validacao.success) {
    return {
      ok: false,
      erro: {
        categoria: "json_invalido",
        mensagem: `O arquivo não é um JSON de operação válido: ${detalharIssues(
          validacao.error.issues,
        )}. Verifique se o arquivo foi gerado pelo ROTA.`,
      },
    };
  }

  const documento = validacao.data;

  // Etapa 3 — identidade nas listas estáticas (RN-017/RN-016).
  if (identidadeObsoleta(documento.autos, listas)) {
    return {
      ok: false,
      erro: {
        categoria: "identidade_obsoleta",
        mensagem: `O Autos ${documento.autos.codigo} não consta na lista atual. Não é possível editar uma operação com identificação desatualizada.`,
      },
    };
  }

  // Etapa 4 — carregamento. UUIDs preservadas (RN-004): o documento é o próprio
  // objeto validado, sem fábrica nem reindexação. Alertas técnicos: vazio nesta
  // task (RN-028/RN-032 fora de escopo — TASK-012).
  return { ok: true, documento, alertas: [] };
}
