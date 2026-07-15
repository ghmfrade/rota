// Mapa etapa → ícone-carimbo (docs-dev/18-DESIGN_SYSTEM.md §4) usado pela
// sidebar do stepper (`layout-formulario.tsx`). Só apresentação: liga o id de
// cada uma das 7 etapas (`etapas.ts`, intocado) ao SVG próprio correspondente
// do catálogo `src/shared/ui/carimbos/`.

import type { ComponentType } from "react";
import {
  CarimboIdentificacao,
  CarimboServicos,
  CarimboItinerarios,
  CarimboViagens,
  CarimboMatrizes,
  CarimboRevisao,
  CarimboExportacao,
  type IconeCarimboProps,
} from "@/shared/ui/carimbos";
import type { IdEtapa } from "./etapas";

export const CARIMBO_DA_ETAPA: Record<IdEtapa, ComponentType<IconeCarimboProps>> = {
  identificacao: CarimboIdentificacao,
  servicos: CarimboServicos,
  "secoes-locais-itinerarios": CarimboItinerarios,
  "viagens-horarios": CarimboViagens,
  matrizes: CarimboMatrizes,
  revisao: CarimboRevisao,
  exportacao: CarimboExportacao,
};
