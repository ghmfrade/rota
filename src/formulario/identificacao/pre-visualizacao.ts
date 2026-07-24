import { nomeDaEmpresa, type AutosEstatico, type ListasAutosEmpresas } from "@/shared/dados-estaticos";
import type { IdentidadeAutos } from "@/formulario/sessao";

// Pré-visualização do Autos escolhido no seletor (TASK-075; DEC-064): a
// escolha no dropdown deixa de comitar a identidade na hora — passa a ser
// apenas um "candidato" exibido aqui. Só "Confirmar Autos" comita
// (`identidadeDeAutosEstatico`), congelando `codigo`/`empresa` (Spec 04 §5).

// Dados de exibição da pré-visualização (código, denominação, empresa, tipo,
// situação `operante` — Spec 04 §3.1/§5). `denominacao_linha` é só das listas
// estáticas (Spec 01 §8): NUNCA compõe `IdentidadeAutos` nem o contrato do
// documento (RN-008..015) — é exibida e descartada.
export interface PreVisualizacaoAutos {
  codigo: string;
  denominacaoLinha: string;
  empresa: string;
  tipo: AutosEstatico["tipo"];
  operante: boolean;
}

/** Monta a pré-visualização do Autos candidato a partir das listas estáticas
 * (RN-016). `undefined` se o `codigo` não existir nas listas. */
export function preVisualizacaoDeAutos(
  listas: ListasAutosEmpresas,
  codigo: string,
): PreVisualizacaoAutos | undefined {
  const autos = listas.autos.find((a) => a.codigo === codigo);
  if (!autos) return undefined;
  return {
    codigo: autos.codigo,
    denominacaoLinha: autos.denominacao_linha,
    empresa: nomeDaEmpresa(listas, autos.empresa_id) ?? autos.empresa_id,
    tipo: autos.tipo,
    operante: autos.operante,
  };
}

/** Comita a identidade do Autos escolhido (ato de "Confirmar Autos" —
 * DEC-064): subconjunto de `autos` (Spec 02 §4) que vira `IdentidadeAutos` de
 * sessão. Documento novo nasce `status: "proposta"` (RN-011). `undefined` se
 * o `codigo` não existir nas listas. */
export function identidadeDeAutosEstatico(
  listas: ListasAutosEmpresas,
  codigo: string,
): IdentidadeAutos | undefined {
  const autos = listas.autos.find((a) => a.codigo === codigo);
  if (!autos) return undefined;
  return {
    codigo: autos.codigo,
    empresa: nomeDaEmpresa(listas, autos.empresa_id) ?? autos.empresa_id,
    tipo: autos.tipo,
    status: "proposta",
  };
}
