import { esquemaDocumentoOperacaoBase } from "./esquema";
import { coletarViolacoesEstruturais } from "./validacoes-estruturais";

// Schema completo do contrato JSON de operação (Spec 02): shapes strict
// (esquema.ts) + validações estruturais cruzadas do §14
// (validacoes-estruturais.ts). Schema fechado: campo extra é rejeitado
// (RN-010); campo novo exige alterar a Spec 02 antes do código.
export const esquemaDocumentoOperacao = esquemaDocumentoOperacaoBase.superRefine(
  (doc, ctx) => {
    for (const violacao of coletarViolacoesEstruturais(doc)) {
      ctx.addIssue({
        code: "custom",
        message: violacao.mensagem,
        path: violacao.caminho,
      });
    }
  },
);

export * from "./esquema";
export {
  coletarViolacoesEstruturais,
  type ViolacaoEstrutural,
} from "./validacoes-estruturais";
