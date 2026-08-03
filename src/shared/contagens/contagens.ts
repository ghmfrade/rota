import type { Autos, Itinerario, Servico, Viagem } from "../contrato/esquema";

// Módulo puro de contagens e resumo operacional (Spec 03 §9.4; Spec 04 §10).
// Só funções puras: não conhece UI, OSRM nem persistência — a Opção de
// Deslocamento é estatística DERIVADA, nunca campo do JSON (RN-073).
// Compartilhado por Formulário e Comparador (ambos dependem só de `shared/`).
//
// Toda contagem usa a semana padrão: exclusivamente Viagens da grade comum,
// com `viagem_feriado === false` e `tabela_excepcional_uuid === null`
// (RN-069/RN-099). O filtro vive numa única porta (`viagensSemanaPadrao`) para
// garantir que feriado e operação excepcional nunca vazem para nenhum
// contador.

// Spec 04 §10 — as 7 faixas de horário fixadas pela spec, cobrindo 00:00–23:59
// sem lacuna nem sobreposição (classificação total e determinística).
export const FAIXAS_HORARIO = [
  { id: "madrugada", rotulo: "Madrugada", inicio: "00:00", fim: "04:59" },
  { id: "pico-manha", rotulo: "Pico manhã", inicio: "05:00", fim: "08:59" },
  { id: "entre-pico-manha", rotulo: "Entre-pico manhã", inicio: "09:00", fim: "10:59" },
  { id: "entre-pico-almoco", rotulo: "Entre-pico almoço", inicio: "11:00", fim: "13:59" },
  { id: "entre-pico-tarde", rotulo: "Entre-pico tarde", inicio: "14:00", fim: "16:59" },
  { id: "pico-tarde", rotulo: "Pico tarde", inicio: "17:00", fim: "19:59" },
  { id: "noite", rotulo: "Noite", inicio: "20:00", fim: "23:59" },
] as const;

export type IdFaixaHorario = (typeof FAIXAS_HORARIO)[number]["id"];

export type FaixaHorario = (typeof FAIXAS_HORARIO)[number];

// Spec 04 §10 — a tabela de faixas da spec tem duas colunas, "Faixa" e
// "Intervalo". Exibir só o rótulo deixa o leitor do PDF sem saber o que é
// "Entre-pico manhã". Fonte única do texto composto: o intervalo é derivado de
// `inicio`/`fim` da própria constante, nunca redigitado por quem exibe.
export function rotuloFaixaComIntervalo(faixa: FaixaHorario): string {
  return `${faixa.rotulo} (${faixa.inicio}–${faixa.fim})`;
}

// RN-069/NEG-018 — rótulo obrigatório em qualquer exibição de contagem
// (tela e PDF — Spec 04 §11 item 9/§13.3). Fonte única: consumido por
// servicos e resumo, nunca redeclarado.
export const ROTULO_SEMANA_PADRAO =
  "semana padrão (sem feriados nem operação excepcional)";

// Classifica `horario_saida` (HH:MM:SS de relógio) numa das 7 faixas, pela
// hora de relógio (Spec 04 §10). As faixas cobrem o dia inteiro, então esta
// função é total: sempre devolve uma faixa.
export function classificarFaixa(horarioSaida: string): IdFaixaHorario {
  const hora = Number(horarioSaida.slice(0, 2));
  if (hora <= 4) return "madrugada";
  if (hora <= 8) return "pico-manha";
  if (hora <= 10) return "entre-pico-manha";
  if (hora <= 13) return "entre-pico-almoco";
  if (hora <= 16) return "entre-pico-tarde";
  if (hora <= 19) return "pico-tarde";
  return "noite";
}

// RN-069/RN-099 — porta única do filtro "semana padrão": só Viagens comuns
// (`viagem_feriado === false` e `tabela_excepcional_uuid === null`). Todo
// contador passa por aqui.
function viagensSemanaPadrao(itinerario: Itinerario): Viagem[] {
  return itinerario.viagens.filter(
    (v) => !v.viagem_feriado && v.tabela_excepcional_uuid === null,
  );
}

// RN-072 — viagens_semana(servico, sentido): cardinalidade das Viagens
// comuns do sentido (cada Viagem é uma partida num único dia — sem
// multiplicar por dias).
export function viagensSemana(itinerario: Itinerario | undefined): number {
  if (!itinerario) return 0;
  return viagensSemanaPadrao(itinerario).length;
}

// Par de Seções não-ordenado (chave canônica `menor|maior` das duas UUIDs) —
// necessário porque a união de §9.4 só faz sentido tratando o par como
// conjunto: o ponta-a-ponta pode coincidir com um par da matriz_seccionamento
// gravado em qualquer ordem, e a união deve deduplicar independente disso.
function chaveParNaoOrdenado(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Extremos do itinerário (sempre Seção — RN-035) que formam o par
// ponta-a-ponta. Ida e Volta de um Serviço compartilham as Seções (Spec 03
// §9.4), então qualquer itinerário do Serviço serve; usa-se o primeiro
// disponível (cobre também o Serviço unidirecional).
function parPontaAPonta(servico: Servico): [string, string] | null {
  const itinerario = servico.itinerarios[0];
  if (!itinerario) return null;
  const paradas = itinerario.paradas;
  const primeira = paradas[0]?.secao_uuid;
  const ultima = paradas[paradas.length - 1]?.secao_uuid;
  if (!primeira || !ultima) return null;
  return [primeira, ultima];
}

// RN-072 — pares_compraveis(servico): pares habilitados em
// matriz_seccionamento UNIÃO o par ponta-a-ponta (sempre comprável, esteja ou
// não habilitado na matriz — a união evita contá-lo duas vezes quando já
// habilitado).
export function paresCompraveis(servico: Servico): number {
  const chaves = new Set(
    servico.matriz_seccionamento.map((par) =>
      chaveParNaoOrdenado(par.secao_a_uuid, par.secao_b_uuid),
    ),
  );
  const pontaAPonta = parPontaAPonta(servico);
  if (pontaAPonta) {
    chaves.add(chaveParNaoOrdenado(pontaAPonta[0], pontaAPonta[1]));
  }
  return chaves.size;
}

export interface ContagensSentido {
  viagensSemana: number;
  opcoesDeslocamento: number;
}

export interface ContagensServico {
  servicoUuid: string;
  numeroN: string;
  paresCompraveis: number;
  ida: ContagensSentido;
  volta: ContagensSentido;
  totalViagensSemana: number;
  totalOpcoesDeslocamento: number;
}

function itinerarioPorSentido(
  servico: Servico,
  sentido: Itinerario["sentido"],
): Itinerario | undefined {
  return servico.itinerarios.find((it) => it.sentido === sentido);
}

// RN-072 — opcoes(servico, sentido) = viagens_semana(servico, sentido) ×
// |pares_compraveis(servico)|. Totais por Serviço = Ida + Volta.
export function contarServico(servico: Servico): ContagensServico {
  const pares = paresCompraveis(servico);
  const itinerarioIda = itinerarioPorSentido(servico, "ida");
  const itinerarioVolta = itinerarioPorSentido(servico, "volta");

  const viagensIda = viagensSemana(itinerarioIda);
  const viagensVolta = viagensSemana(itinerarioVolta);

  const ida: ContagensSentido = {
    viagensSemana: viagensIda,
    opcoesDeslocamento: viagensIda * pares,
  };
  const volta: ContagensSentido = {
    viagensSemana: viagensVolta,
    opcoesDeslocamento: viagensVolta * pares,
  };

  return {
    servicoUuid: servico.uuid,
    numeroN: servico.numero_n,
    paresCompraveis: pares,
    ida,
    volta,
    totalViagensSemana: ida.viagensSemana + volta.viagensSemana,
    totalOpcoesDeslocamento: ida.opcoesDeslocamento + volta.opcoesDeslocamento,
  };
}

export interface ContagensAutos {
  porServico: ContagensServico[];
  totalViagensSemana: number;
  totalOpcoesDeslocamento: number;
}

// RN-072 — totais do Autos = Σ dos Serviços.
export function contarAutos(autos: Autos): ContagensAutos {
  const porServico = autos.servicos.map(contarServico);
  return {
    porServico,
    totalViagensSemana: porServico.reduce((s, c) => s + c.totalViagensSemana, 0),
    totalOpcoesDeslocamento: porServico.reduce(
      (s, c) => s + c.totalOpcoesDeslocamento,
      0,
    ),
  };
}

export type ContagensPorFaixa = Record<IdFaixaHorario, ContagensServico>;

// Mesmas fórmulas de `contarServico`, restringindo as viagens de cada
// itinerário à faixa (Spec 04 §10: "apresentados também estratificados por
// essas faixas"). `paresCompraveis` não depende de viagem, então é o mesmo
// valor em todas as faixas.
function restringirItinerarioAFaixa(
  itinerario: Itinerario,
  faixa: IdFaixaHorario,
): Itinerario {
  return {
    ...itinerario,
    viagens: itinerario.viagens.filter((v) => classificarFaixa(v.horario_saida) === faixa),
  };
}

// `servicoNaFaixa` é um objeto de cálculo interno (nunca persistido/validado
// pelo schema) — o array `viagens` pode ficar vazio para uma faixa sem
// nenhuma partida, o que violaria RN-039 (min. 1) se isto fosse gravado.
export function contarServicoPorFaixa(servico: Servico): ContagensPorFaixa {
  const resultado = {} as ContagensPorFaixa;
  for (const faixa of FAIXAS_HORARIO) {
    const servicoNaFaixa: Servico = {
      ...servico,
      itinerarios: servico.itinerarios.map((it) => restringirItinerarioAFaixa(it, faixa.id)),
    };
    resultado[faixa.id] = contarServico(servicoNaFaixa);
  }
  return resultado;
}

export interface ContagensAutosPorFaixa {
  porServico: Record<string, ContagensPorFaixa>;
  totais: Record<IdFaixaHorario, { viagensSemana: number; opcoesDeslocamento: number }>;
}

export function contarAutosPorFaixa(autos: Autos): ContagensAutosPorFaixa {
  const porServico: Record<string, ContagensPorFaixa> = {};
  for (const servico of autos.servicos) {
    porServico[servico.uuid] = contarServicoPorFaixa(servico);
  }

  const totais = {} as ContagensAutosPorFaixa["totais"];
  for (const faixa of FAIXAS_HORARIO) {
    let viagensSemanaTotal = 0;
    let opcoesTotal = 0;
    for (const servico of autos.servicos) {
      const c = porServico[servico.uuid][faixa.id];
      viagensSemanaTotal += c.totalViagensSemana;
      opcoesTotal += c.totalOpcoesDeslocamento;
    }
    totais[faixa.id] = { viagensSemana: viagensSemanaTotal, opcoesDeslocamento: opcoesTotal };
  }

  return { porServico, totais };
}
