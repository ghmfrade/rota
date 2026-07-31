// Barrel de `src/shared/ui/` — componentes base do design system
// (docs-dev/18-DESIGN_SYSTEM.md §3) e catálogo de ícones-carimbo (§4).

export { Botao, type BotaoProps, type VarianteBotao } from "./botao";
export { Campo, type CampoProps } from "./campo";
export { Select, type SelectProps } from "./select";
export {
  Painel,
  type PainelProps,
  type TomPainel,
  type ElevacaoPainel,
} from "./painel";
export { Selo, type SeloProps, type TomSelo } from "./selo";
export { Tabela, type TabelaProps } from "./tabela";
export { Tooltip, type TooltipProps } from "./tooltip";
export { Dialogo, type DialogoProps } from "./dialogo";
export {
  MenuFlutuante,
  type MenuFlutuanteProps,
  type AncoraMenuFlutuante,
  type OpcaoMenuFlutuante,
} from "./menu-flutuante";
export {
  SuperficieFlutuante,
  posicionarSuperficieFlutuante,
  type SuperficieFlutuanteProps,
  type LadoSuperficieFlutuante,
  type EmpilhamentoSuperficie,
  type PosicaoSuperficieFlutuante,
  type RetanguloSuperficie,
} from "./superficie-flutuante";
export { Carimbo, type CarimboProps } from "./carimbo";
export {
  MolduraCarimbo,
  type MolduraCarimboProps,
  type TomCarimbo,
} from "./moldura-carimbo";

export * from "./carimbos";
