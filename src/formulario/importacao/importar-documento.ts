import type { DocumentoOperacao } from "@/shared/contrato";
import type { ListasAutosEmpresas } from "@/shared/dados-estaticos";
import {
  validarJsonDeLeitor,
  type AlertaTecnico,
} from "@/shared/checagens-leitor";

// Importação de um JSON de operação para o estado de edição do Formulário
// (Spec 04 §3.1 — "Carregar JSON existente"). Esta é a porta de entrada de um
// arquivo já gerado pelo ROTA; a tela em si (seleção de arquivo, mensagens na
// UI) é a TASK-013 — aqui vive só a lógica pura e testável.
//
// Espinha de validação por arquivo (RN-091, parte Formulário), do bloqueante ao
// não bloqueante:
//   1. JSON bem-formado           → bloqueia (categoria "json_invalido")   ┐ pipeline
//   2. schema + estrutural §14     → bloqueia (categoria "json_invalido")   ┘ de leitor
//      (inclui RN-005 unicidade de UUID, já em esquemaDocumentoOperacao)   (TASK-012)
//   3. identidade nas listas       → bloqueia (categoria "identidade_obsoleta", RN-017)
//                                    — passo EXCLUSIVO do Formulário, por cima do pipeline
//   4. alertas técnicos (350 m, tipificação) → NÃO bloqueiam (RN-028/032/091),
//                                    vindos do pipeline compartilhado de leitor
//
// Os passos 1–2 e os alertas do passo 4 são as "checagens estáticas
// consolidadas de leitor" (TASK-012), reusadas também pelo Comparador (TASK-035)
// — aqui só se acrescenta o passo 3 (identidade), próprio do Formulário.
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

// Alerta técnico não bloqueante (RN-091) — reexportado do pipeline de leitor
// (TASK-012), que é quem o produz (350 m estático de Seção/Local, tipificação).
export type { AlertaTecnico };

export type ResultadoImportacao =
  | { ok: true; documento: DocumentoOperacao; alertas: AlertaTecnico[] }
  | { ok: false; erro: ErroImportacao };

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
  // Etapas 1–2 e alertas técnicos — pipeline de leitor compartilhado (TASK-012):
  // JSON bem-formado + schema/§14 (bloqueantes, incluindo RN-005) e as checagens
  // estáticas não bloqueantes (350 m de Seção/Local, tipificação — RN-028/032/091).
  const resultado = validarJsonDeLeitor(textoJson);
  if (!resultado.ok) {
    // Ambos os bloqueios do leitor (json_malformado, schema_invalido) viram, no
    // Formulário, a mesma mensagem "json_invalido" da Spec 04 §14.
    return {
      ok: false,
      erro: {
        categoria: "json_invalido",
        mensagem: `O arquivo não é um JSON de operação válido: ${resultado.bloqueio.detalhe}. Verifique se o arquivo foi gerado pelo ROTA.`,
      },
    };
  }

  const { documento, alertas } = resultado;

  // Etapa 3 — identidade nas listas estáticas (RN-017/RN-016). Passo exclusivo
  // do Formulário, por cima do pipeline compartilhado.
  if (identidadeObsoleta(documento.autos, listas)) {
    return {
      ok: false,
      erro: {
        categoria: "identidade_obsoleta",
        mensagem: `O Autos ${documento.autos.codigo} não consta na lista atual. Não é possível editar uma operação com identificação desatualizada.`,
      },
    };
  }

  // Carregamento. UUIDs preservadas (RN-004): o documento é o próprio objeto
  // validado, sem fábrica nem reindexação. Alertas técnicos vêm do pipeline
  // (não bloqueiam — RN-028/032/091).
  return { ok: true, documento, alertas };
}
