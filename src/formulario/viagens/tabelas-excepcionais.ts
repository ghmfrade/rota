import type { Servico, TabelaExcepcional } from "@/shared/contrato";

export type TipoTabelaExcepcional = TabelaExcepcional["tipo"];
export type FiltroTipoTabelaExcepcional = TipoTabelaExcepcional | "todos";

export const ROTULOS_TIPO_TABELA_EXCEPCIONAL: Record<TipoTabelaExcepcional, string> = {
  ferias_verao: "Férias de verão",
  ferias_inverno: "Férias de inverno",
  personalizado: "Personalizado",
};

export interface ResultadoTabelaExcepcional {
  ok: boolean;
  servico: Servico;
  erro?: string;
  campo?: "tipo" | "descricao" | "remocao";
  quantidadeViagensAssociadas?: number;
}

function descricaoNormalizada(descricao: string | undefined): string {
  return descricao?.trim() ?? "";
}

function existeTipoCanonico(
  tabelas: readonly TabelaExcepcional[],
  tipo: Exclude<TipoTabelaExcepcional, "personalizado">,
): boolean {
  return tabelas.some((tabela) => tabela.tipo === tipo);
}

/**
 * Cria uma Tabela excepcional no Serviço sem mutar a entrada (RN-002/RN-098).
 * A geração de identidade fica injetável apenas para testes determinísticos.
 */
export function criarTabelaExcepcional(
  servico: Servico,
  dados: { tipo: TipoTabelaExcepcional; descricao?: string },
  gerarUuid: () => string = () => crypto.randomUUID(),
): ResultadoTabelaExcepcional {
  const tabelas = servico.tabelas_excepcionais ?? [];

  if (
    dados.tipo !== "personalizado" &&
    existeTipoCanonico(tabelas, dados.tipo)
  ) {
    return {
      ok: false,
      servico,
      campo: "tipo",
      erro: `Já existe uma tabela ${ROTULOS_TIPO_TABELA_EXCEPCIONAL[
        dados.tipo
      ].toLocaleLowerCase("pt-BR")} neste Serviço.`,
    };
  }

  const descricao = descricaoNormalizada(dados.descricao);
  if (dados.tipo === "personalizado" && descricao === "") {
    return {
      ok: false,
      servico,
      campo: "descricao",
      erro: "Informe o nome da tabela personalizada.",
    };
  }

  const tabela: TabelaExcepcional =
    dados.tipo === "personalizado"
      ? { uuid: gerarUuid(), tipo: dados.tipo, descricao }
      : { uuid: gerarUuid(), tipo: dados.tipo };

  return {
    ok: true,
    servico: {
      ...servico,
      tabelas_excepcionais: [...tabelas, tabela],
    },
  };
}

/** Edita somente o nome livre de uma tabela personalizada e preserva sua UUID (RN-003/RN-004). */
export function editarDescricaoTabelaExcepcional(
  servico: Servico,
  tabelaUuid: string,
  descricaoInformada: string,
): ResultadoTabelaExcepcional {
  const tabela = (servico.tabelas_excepcionais ?? []).find(
    (item) => item.uuid === tabelaUuid,
  );
  if (!tabela || tabela.tipo !== "personalizado") {
    return {
      ok: false,
      servico,
      campo: "descricao",
      erro: "Somente tabelas personalizadas possuem nome editável.",
    };
  }

  const descricao = descricaoNormalizada(descricaoInformada);
  if (descricao === "") {
    return {
      ok: false,
      servico,
      campo: "descricao",
      erro: "Informe o nome da tabela personalizada.",
    };
  }

  return {
    ok: true,
    servico: {
      ...servico,
      tabelas_excepcionais: servico.tabelas_excepcionais.map((item) =>
        item.uuid === tabelaUuid ? { ...item, descricao } : item,
      ),
    },
  };
}

export function contarViagensDaTabelaExcepcional(
  servico: Servico,
  tabelaUuid: string,
): number {
  return servico.itinerarios.reduce(
    (total, itinerario) =>
      total +
      itinerario.viagens.filter(
        (viagem) => viagem.tabela_excepcional_uuid === tabelaUuid,
      ).length,
    0,
  );
}

/**
 * Remove somente tabelas vazias. A DEC-098 proíbe cascata e conversão silenciosa
 * das Viagens para a grade comum.
 */
export function removerTabelaExcepcional(
  servico: Servico,
  tabelaUuid: string,
): ResultadoTabelaExcepcional {
  const quantidadeViagensAssociadas = contarViagensDaTabelaExcepcional(
    servico,
    tabelaUuid,
  );
  if (quantidadeViagensAssociadas > 0) {
    return {
      ok: false,
      servico,
      campo: "remocao",
      quantidadeViagensAssociadas,
      erro:
        `Esta tabela possui ${quantidadeViagensAssociadas} ` +
        `${quantidadeViagensAssociadas === 1 ? "Viagem associada" : "Viagens associadas"}. ` +
        "Remova-as previamente na grade excepcional.",
    };
  }

  return {
    ok: true,
    servico: {
      ...servico,
      tabelas_excepcionais: (servico.tabelas_excepcionais ?? []).filter(
        (tabela) => tabela.uuid !== tabelaUuid,
      ),
    },
  };
}

export function filtrarTabelasExcepcionais(
  tabelas: readonly TabelaExcepcional[],
  filtroTipo: FiltroTipoTabelaExcepcional,
  texto: string,
): TabelaExcepcional[] {
  const busca = texto.trim().toLocaleLowerCase("pt-BR");
  return tabelas.filter((tabela) => {
    if (filtroTipo !== "todos" && tabela.tipo !== filtroTipo) return false;
    if (busca === "") return true;
    return (
      tabela.tipo === "personalizado" &&
      (tabela.descricao ?? "").toLocaleLowerCase("pt-BR").includes(busca)
    );
  });
}

export function rotuloTabelaExcepcional(tabela: TabelaExcepcional): string {
  return tabela.tipo === "personalizado"
    ? (tabela.descricao ?? "")
    : ROTULOS_TIPO_TABELA_EXCEPCIONAL[tabela.tipo];
}
