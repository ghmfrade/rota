import {
  CARACTERISTICAS_DE_VEICULO,
  TIPOS_DE_AUTOS,
} from "../contrato/esquema";

// Módulo puro de tipificação `tipo` × `caracteristica_veiculo` (Spec 03 §10).
// Materializa a tabela fechada da §10.2 (Q-001 decidida → DEC-026: partição
// código-a-código completa, sem `SL`, sem caso de bloqueio). Só funções puras:
// não conhece schema, UI nem OSRM. Consumidores (leitor consolidado — TASK-012,
// dropdown e revalidação na troca de tipo — Formulário) são de outras tasks.

export type TipoDeAutos = (typeof TIPOS_DE_AUTOS)[number];
export type CaracteristicaDeVeiculo = (typeof CARACTERISTICAS_DE_VEICULO)[number];

// Spec 03 §10.1 — cada característica pertence a uma de duas famílias, e o
// `tipo` do Autos escolhe a família; as duas nunca se misturam num mesmo Autos.
export type FamiliaDeVeiculo = "semiurbana" | "rodoviaria";

export interface RegraDoTipo {
  familia: FamiliaDeVeiculo;
  // Spec 03 §10.3 regra 2: no semiurbano todos os Serviços compartilham a
  // mesma característica única; no rodoviário há variação (§10.3 regra 4).
  veiculoUnico: boolean;
  permitidas: readonly CaracteristicaDeVeiculo[];
}

// Spec 03 §10.2 — tabela de características permitidas por `tipo` (partição
// fechada código-a-código, DEC-026). A exclusividade da forma convencional por
// litoralidade (RN-022: `CR`×`CL`, `ME`×`MEL`, `ML`×`MLL`, `MM`×`MML`,
// `SU`×`SUL`) já cai fora do conjunto permitido de cada `tipo` — como o Autos
// tem exatamente um `tipo`, os pares nunca coexistem. `EX`/`LE`/`MX` são
// neutros à litoralidade e valem nos dois tipos rodoviários (§10.2 nota).
export const TABELA_TIPIFICACAO: Readonly<Record<TipoDeAutos, RegraDoTipo>> = {
  Semiurbano: {
    familia: "semiurbana",
    veiculoUnico: true,
    permitidas: ["SU"],
  },
  "Semiurbano Litorâneo": {
    familia: "semiurbana",
    veiculoUnico: true,
    permitidas: ["SUL"],
  },
  Rodoviário: {
    familia: "rodoviaria",
    veiculoUnico: false,
    permitidas: ["CR", "EX", "LE", "ME", "ML", "MX", "MM"],
  },
  "Rodoviário Litorâneo": {
    familia: "rodoviaria",
    veiculoUnico: false,
    permitidas: ["CL", "EX", "LE", "MEL", "MLL", "MX", "MML"],
  },
};

// Spec 03 §10.1/§10.3 regra 1 — família fixada pelo `tipo` do Autos.
export function familiaDoTipo(tipo: TipoDeAutos): FamiliaDeVeiculo {
  return TABELA_TIPIFICACAO[tipo].familia;
}

// Conjunto de `caracteristica_veiculo` permitido para o `tipo` (Spec 03 §10.2).
// Útil para o dropdown do Formulário (outra task) e para as validações abaixo.
export function caracteristicasPermitidas(
  tipo: TipoDeAutos,
): readonly CaracteristicaDeVeiculo[] {
  return TABELA_TIPIFICACAO[tipo].permitidas;
}

// RN-019/021/022 — a característica é aceita no `tipo`? Uma única checagem
// código-a-código resolve família cruzada, litoralidade e conjunto do tipo,
// porque a tabela §10.2 já é a partição completa.
export function caracteristicaPermitida(
  tipo: TipoDeAutos,
  caracteristica: CaracteristicaDeVeiculo,
): boolean {
  return TABELA_TIPIFICACAO[tipo].permitidas.includes(caracteristica);
}

// Violação de tipificação de um conjunto de Serviços de um mesmo Autos.
// `indice` aponta a posição na lista recebida (−1 quando a violação é do
// conjunto como um todo, p.ex. mais de uma característica no semiurbano).
export interface ViolacaoDeTipificacao {
  indice: number;
  caracteristica: CaracteristicaDeVeiculo | null;
  mensagem: string;
}

// Valida as características de todos os Serviços de um Autos contra o `tipo`
// (Spec 03 §10.3): (a) cada uma no conjunto permitido — RN-019/021/022;
// (b) veículo único no semiurbano — RN-020. A variação no rodoviário
// (RN-021) é permitida por construção: qualquer subconjunto do conjunto
// permitido é válido.
export function validarConjuntoDeCaracteristicas(
  tipo: TipoDeAutos,
  caracteristicas: readonly CaracteristicaDeVeiculo[],
): ViolacaoDeTipificacao[] {
  const violacoes: ViolacaoDeTipificacao[] = [];

  caracteristicas.forEach((caracteristica, indice) => {
    if (!caracteristicaPermitida(tipo, caracteristica)) {
      violacoes.push({
        indice,
        caracteristica,
        mensagem: `[RN-019/021/022] "${caracteristica}" não é permitida em Autos "${tipo}" (Spec 03 §10.2)`,
      });
    }
  });

  // RN-020 — veículo único no semiurbano: todos os Serviços com a mesma
  // característica (a única do tipo). Distintas entre si é violação.
  if (TABELA_TIPIFICACAO[tipo].veiculoUnico) {
    const distintas = new Set(caracteristicas);
    if (distintas.size > 1) {
      violacoes.push({
        indice: -1,
        caracteristica: null,
        mensagem: `[RN-020] Autos "${tipo}" exige veículo único — todos os Serviços com a mesma caracteristica_veiculo (Spec 03 §10.3 regra 2)`,
      });
    }
  }

  return violacoes;
}

// RN-023 — regra pura por trás da revalidação ao trocar o `tipo` do Autos:
// dado o novo `tipo` e as características dos Serviços já cadastrados, retorna
// os índices dos Serviços que passariam a violar o novo `tipo` (§10.4). O
// gatilho e a mensagem de UI (bloqueio/alerta) são da Spec 04 (outra task).
export function servicosIncompativeisComTipo(
  tipo: TipoDeAutos,
  caracteristicas: readonly CaracteristicaDeVeiculo[],
): number[] {
  const incompativeis: number[] = [];
  caracteristicas.forEach((caracteristica, indice) => {
    if (!caracteristicaPermitida(tipo, caracteristica)) {
      incompativeis.push(indice);
    }
  });
  return incompativeis;
}
