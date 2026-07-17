// Referência ÚNICA da altura do mapa (Spec 04 §7; doc 18 §5: "a tabela
// lateral de paradas acompanha na mesma linha visual"). Consumida pelo
// contêiner do mapa (`EditorMapaItinerario`) e pela coluna lateral
// (`EtapaItinerarios`), para os dois nunca dessincronizarem (TASK-074).
//
// As DUAS constantes precisam ficar literais (Tailwind extrai classes por
// varredura textual do arquivo-fonte, não avalia expressões JS — uma
// composição como `` `lg:${ALTURA_MAPA_CLASSE}` `` não gera o utilitário
// responsivo). Mudar a altura exige editar as duas juntas.
export const ALTURA_MAPA_CLASSE = "h-[60vh]";
export const ALTURA_MAPA_CLASSE_LG = "lg:h-[60vh]";
