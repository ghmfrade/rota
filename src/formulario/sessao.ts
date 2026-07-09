import type { DocumentoOperacao } from "@/shared/contrato";
import type { AlertaTecnico } from "@/formulario/importacao";

// Estado de topo do Formulário depois da tela inicial (TASK-014): ou o usuário
// carregou um JSON existente (modo "carregado", com o documento e as UUIDs
// preservadas — RN-004), ou iniciou um documento do zero (modo "novo"), cuja
// identidade (Autos/empresa/tipo) só é escolhida na etapa Identificação
// (TASK-015, Spec 04 §5). Por isso o modo "novo" ainda não carrega um
// `DocumentoOperacao` — não há documento montado até a identidade ser definida.
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
  | { modo: "novo" };
