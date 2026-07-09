// As sete etapas da navegação do Formulário (Spec 04 §4). A navegação é
// LIVRE — não é um wizard travado: trocar de etapa nunca é impedido; as
// validações vivem no painel de pendências e só a exportação é bloqueada
// (Spec 04 §16 decisão 1; RN-078). Aqui só se declara a estrutura (ids e
// rótulos, na ordem da spec); o conteúdo de cada etapa é das tasks seguintes
// (Identificação = TASK-015, Serviços = TASK-016, …).

export type IdEtapa =
  | "identificacao"
  | "servicos"
  | "secoes-locais-itinerarios"
  | "viagens-horarios"
  | "matrizes"
  | "revisao"
  | "exportacao";

export interface Etapa {
  id: IdEtapa;
  rotulo: string;
}

// Ordem e rótulos literais da Spec 04 §4 (1. Identificação … 7. Exportação
// JSON/PDF). A ordem importa: o stepper as apresenta nesta sequência.
export const ETAPAS: readonly Etapa[] = [
  { id: "identificacao", rotulo: "Identificação" },
  { id: "servicos", rotulo: "Serviços" },
  { id: "secoes-locais-itinerarios", rotulo: "Seções, Locais e Itinerários" },
  { id: "viagens-horarios", rotulo: "Viagens e horários" },
  { id: "matrizes", rotulo: "Matrizes" },
  { id: "revisao", rotulo: "Revisão" },
  { id: "exportacao", rotulo: "Exportação JSON/PDF" },
] as const;

/** Rótulo de exibição de uma etapa pelo seu id. */
export function rotuloEtapa(id: IdEtapa): string {
  const etapa = ETAPAS.find((e) => e.id === id);
  // ETAPAS cobre todo o union IdEtapa; o fallback é só defensivo para o typecheck.
  return etapa ? etapa.rotulo : id;
}
