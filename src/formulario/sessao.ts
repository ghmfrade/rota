import type { Autos, DocumentoOperacao } from "@/shared/contrato";
import type { TipoDeAutos } from "@/shared/tipificacao";
import type { AlertaTecnico } from "@/formulario/importacao";

// Identidade do Autos escolhida na etapa Identificação de um documento criado do
// zero (Spec 04 §5; TASK-015). É estritamente um subconjunto dos campos de
// `autos` (Spec 02 §4) — `codigo`/`empresa`/`tipo`/`status` — montado em memória
// enquanto o documento ainda não tem Serviços (que são a TASK-016) e por isso
// não pode ser um `DocumentoOperacao` válido (RN-018 exige ≥ 1 Serviço). NÃO é
// campo novo de contrato (RN-008..015 intactas): é estado de sessão efêmero, não
// persistido, apenas espelha o que virará `autos` na montagem/exportação.
export interface IdentidadeAutos {
  codigo: string;
  // Nome de exibição da empresa — o valor que `autos.empresa` grava (Spec 02
  // §4), resolvido de `empresa_id` via `nomeDaEmpresa` (DEC-030).
  empresa: string;
  tipo: TipoDeAutos;
  // Documento novo nasce como "proposta" (RN-011; Spec 02 §4.1). Vira "vigente"
  // só pela ação de exportação (§12) — nunca editado na Identificação.
  status: Autos["status"];
}

// Estado de topo do Formulário depois da tela inicial (TASK-014): ou o usuário
// carregou um JSON existente (modo "carregado", com o documento e as UUIDs
// preservadas — RN-004), ou iniciou um documento do zero (modo "novo"), cuja
// identidade (Autos/empresa/tipo) só é escolhida na etapa Identificação
// (TASK-015, Spec 04 §5). Por isso o modo "novo" ainda não carrega um
// `DocumentoOperacao` — não há documento montado até a identidade ser definida;
// `identidade` fica indefinida até o usuário selecionar o Autos das listas.
//
// Sessão é estado EFÊMERO de edição, de memória (React state) — nunca é
// persistido no servidor (RN-096, NEG-009) nem gravado no JSON de operação
// (o painel de pendências que dela deriva é de validação, não de processo —
// NEG-004). "Salvar" é exportar o JSON (RN-096); retomar é reimportar.
export type SessaoFormulario =
  | {
      modo: "carregado";
      documento: DocumentoOperacao;
      // Alertas técnicos não bloqueantes vindos da importação (350 m estático,
      // tipificação — RN-028/032/091). Exibidos como ciência na abertura
      // (Spec 04 §3.1 item 5); não são pendências de §11 (que são consolidadas
      // na Revisão pela TASK-032).
      alertasImportacao: AlertaTecnico[];
    }
  | { modo: "novo"; identidade?: IdentidadeAutos };

// Identidade corrente da sessão (Spec 04 §5), qualquer que seja o modo: vem de
// `autos` no carregado e de `identidade` no novo. `undefined` só no novo antes
// de o usuário selecionar o Autos das listas (RN-016) — quando o cabeçalho
// ainda exibe "a definir" (comportamento herdado da TASK-014).
export function identidadeDaSessao(
  sessao: SessaoFormulario,
): IdentidadeAutos | undefined {
  if (sessao.modo === "carregado") {
    const { autos } = sessao.documento;
    return {
      codigo: autos.codigo,
      empresa: autos.empresa,
      tipo: autos.tipo,
      status: autos.status,
    };
  }
  return sessao.identidade;
}
