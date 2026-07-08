// Recursos estáticos servidos junto do app (Spec 01 §8; DEC-030):
// listas de Autos/empresas/tipos e base de municípios de SP.
export * from "./tipos";
export {
  carregarBaseMunicipios,
  carregarGeojsonMunicipios,
  carregarListasAutosEmpresas,
  ErroDeDadosEstaticos,
  nomeDaEmpresa,
  URL_GEOJSON_MUNICIPIOS,
} from "./carregador";
