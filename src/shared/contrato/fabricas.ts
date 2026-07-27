import type { Local, Secao, Servico, Viagem } from "./esquema";

type DadosServicoNovo = Omit<Servico, "uuid" | "tabelas_excepcionais"> &
  Partial<Pick<Servico, "tabelas_excepcionais">>;
type DadosViagemNova = Omit<Viagem, "uuid" | "tabela_excepcional_uuid"> &
  Partial<Pick<Viagem, "tabela_excepcional_uuid">>;

// Fábricas de entidade com identidade (Spec 01 §6; Spec 02 §12).
//
// Único caminho de NASCIMENTO de Seção, Serviço, Local e Viagem no Formulário:
// cada fábrica recebe os dados da entidade (tudo menos a `uuid`) e devolve o
// objeto completo com uma `uuid` UUIDv4 gerada client-side por
// `crypto.randomUUID()` — sem servidor, sem sequência, sem UUID derivada de
// conteúdo (RN-001/RN-002).
//
// Fronteiras (anti-requisitos):
// - IMPORTAÇÃO NÃO USA estas fábricas: import preserva as UUIDs do arquivo
//   (RN-004, TASK-006). Gerar UUID nova ao importar seria violação crítica.
// - CÓPIA legítima (duplicar Viagem/Serviço) É criação de entidade nova, logo
//   passa por estas fábricas e ganha UUID nova (RN-007, tasks do Formulário).
// - `numero_n` é apenas display (RN-006): a fábrica de Serviço o trata como
//   dado comum, nunca como chave.
// - Ponto de rota e Parada não têm `uuid` (Spec 02 §10.1/§10.4) — sem fábrica.
//
// As fábricas garantem SÓ a identidade; validação estrutural do contrato
// continua exclusiva de `esquemaDocumentoOperacao` (TASK-003).

/**
 * Cria uma Seção nova com `uuid` UUIDv4 gerada (RN-001/RN-002). Não muta
 * `dados`; qualquer `uuid` que venha em `dados` é sobrescrita pela gerada —
 * criação nunca adota identidade externa (adoção é exclusiva do import).
 */
export function criarSecao(dados: Omit<Secao, "uuid">): Secao {
  return { ...dados, uuid: crypto.randomUUID() };
}

/** Cria um Serviço novo com `uuid` UUIDv4 gerada (RN-001/RN-002). */
export function criarServico(dados: DadosServicoNovo): Servico {
  return {
    ...dados,
    tabelas_excepcionais: dados.tabelas_excepcionais ?? [],
    uuid: crypto.randomUUID(),
  };
}

/** Cria um Local novo com `uuid` UUIDv4 gerada (RN-001/RN-002). */
export function criarLocal(dados: Omit<Local, "uuid">): Local {
  return { ...dados, uuid: crypto.randomUUID() };
}

/** Cria uma Viagem nova com `uuid` UUIDv4 gerada (RN-001/RN-002). */
export function criarViagem(dados: DadosViagemNova): Viagem {
  return {
    ...dados,
    tabela_excepcional_uuid: dados.tabela_excepcional_uuid ?? null,
    uuid: crypto.randomUUID(),
  };
}

/**
 * Edição imutável que preserva a identidade (RN-003): aplica `alteracoes` sobre
 * `entidade` e devolve uma cópia nova com a MESMA `uuid`. O tipo já exclui
 * `uuid` dos campos alteráveis; em runtime, qualquer `uuid` presente em
 * `alteracoes` (via cast/`any`) é descartada e a `uuid` original é reafirmada —
 * dupla defesa contra chamadas não tipadas. Não muta `entidade`.
 */
export function editarEntidade<T extends { uuid: string }>(
  entidade: T,
  alteracoes: Partial<Omit<T, "uuid">>,
): T {
  const alteracoesSemUuid = { ...alteracoes };
  delete (alteracoesSemUuid as { uuid?: unknown }).uuid;
  return { ...entidade, ...alteracoesSemUuid, uuid: entidade.uuid };
}
