// Exportação de JSON de operação a partir do estado de edição do Formulário
// (Spec 04 §12; RN-011/RN-078/RN-079/RN-004).
export {
  exportarComoProposta,
  exportarComoVigente,
  validarParaExportacao,
  type CategoriaErroExportacao,
  type ErroExportacao,
  type ResultadoExportacao,
} from "./exportar-documento";
export { montarDocumentoParaExportacao } from "./montar-documento";
export {
  avaliarGateExportacao,
  type ResultadoGateExportacao,
} from "./gate-exportacao";
export { TelaExportacao } from "./tela-exportacao";
