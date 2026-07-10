import { editarEntidade, type DocumentoOperacao } from "@/shared/contrato";
import {
  reconverterServicosParaTipo,
  type TipoDeAutos,
} from "@/shared/tipificacao";
import { regenerarSufixoNumeroN } from "@/formulario/servicos/numero-n";
import type { ServicoEmConstrucao } from "@/formulario/sessao";

// Aplicação da troca do `tipo` do Autos sobre um documento carregado (RN-023;
// DEC-034; Spec 03 §10.4; Spec 04 §5). A regra pura — quais Serviços mudam e
// para qual característica — vive em `shared/tipificacao`
// (`reconverterServicosParaTipo`): aqui só se casa essa regra com a estrutura do
// `DocumentoOperacao`, reescrevendo `autos.tipo` e a `caracteristica_veiculo` de
// cada Serviço incompatível.
//
// Invariantes:
// - PRESERVA A UUID de cada Serviço (RN-003): a reescrita passa por
//   `editarEntidade`, que reafirma a `uuid` original — reconversão é EDIÇÃO, não
//   nascimento (nunca gera identidade nova; RN-007 é só para cópia).
// - NUNCA BLOQUEIA (DEC-034): o padrão do tipo sempre pertence ao conjunto do
//   tipo (Spec 03 §10.2), então o resultado é sempre válido.
// - NÃO MUTA a entrada: devolve um documento novo (útil para o setState do
//   Formulário e para os testes de round-trip).
//
// Função pura (sem UI): o aviso ao usuário e o gatilho são do componente da
// etapa (Spec 04 §5). Serviços já compatíveis ficam intactos, inclusive a
// referência do array quando nada muda.

// Uma alteração produzida pela troca de tipo, no vocabulário da UI: qual
// Serviço mudou (por `numero_n`, rótulo de exibição — RN-006) e de/para qual
// característica. `para` é sempre a forma convencional (padrão) do novo tipo.
export interface AlteracaoDeServico {
  numero_n: string;
  de: string;
  para: string;
}

export interface ResultadoDaTrocaDeTipo {
  documento: DocumentoOperacao;
  // Só os Serviços que mudaram — base do aviso de reconversão (Spec 04 §5).
  // Vazio quando o novo tipo já é compatível com todos (inclui trocar para o
  // mesmo tipo).
  alteracoes: AlteracaoDeServico[];
}

/**
 * Troca o `tipo` do Autos do documento, reconvertendo os Serviços incompatíveis
 * à forma convencional do novo tipo e preservando as UUIDs (RN-003/RN-023). Não
 * muta `documento`.
 */
export function aplicarTrocaDeTipoNoDocumento(
  documento: DocumentoOperacao,
  novoTipo: TipoDeAutos,
): ResultadoDaTrocaDeTipo {
  const { servicos } = documento.autos;
  const { caracteristicas, alteracoes } = reconverterServicosParaTipo(
    novoTipo,
    servicos.map((servico) => servico.caracteristica_veiculo),
  );

  // Reescreve só os Serviços que a reconversão alterou; os demais mantêm a
  // referência original. `editarEntidade` reafirma a `uuid` (RN-003). Além da
  // característica, o sufixo do `numero_n` é regenerado para a nova característica
  // (DEC-037), preservando o número sequencial — o rótulo nunca fica
  // inconsistente com a característica real.
  const servicosConvertidos = servicos.map((servico, indice) =>
    servico.caracteristica_veiculo === caracteristicas[indice]
      ? servico
      : editarEntidade(servico, {
          caracteristica_veiculo: caracteristicas[indice],
          numero_n: regenerarSufixoNumeroN(
            servico.numero_n,
            caracteristicas[indice],
          ),
        }),
  );

  const documentoNovo: DocumentoOperacao = {
    ...documento,
    autos: {
      ...documento.autos,
      tipo: novoTipo,
      servicos: servicosConvertidos,
    },
  };

  const alteracoesDeServico: AlteracaoDeServico[] = alteracoes.map(
    (alteracao) => ({
      numero_n: servicos[alteracao.indice].numero_n,
      de: alteracao.de,
      para: alteracao.para,
    }),
  );

  return { documento: documentoNovo, alteracoes: alteracoesDeServico };
}

export interface ResultadoDaTrocaEmConstrucao {
  servicos: ServicoEmConstrucao[];
  alteracoes: AlteracaoDeServico[];
}

/**
 * Troca de tipo aplicada aos Serviços EM CONSTRUÇÃO (modo novo, DEC-035): mesma
 * regra da reconversão (RN-023/DEC-034) — característica incompatível vira o
 * padrão do tipo e o sufixo do `numero_n` é regenerado (DEC-037) —, sobre o
 * subconjunto de sessão em vez do documento. Não muta a entrada.
 */
export function aplicarTrocaDeTipoEmConstrucao(
  servicos: readonly ServicoEmConstrucao[],
  novoTipo: TipoDeAutos,
): ResultadoDaTrocaEmConstrucao {
  const { caracteristicas, alteracoes } = reconverterServicosParaTipo(
    novoTipo,
    servicos.map((servico) => servico.caracteristica_veiculo),
  );

  const convertidos = servicos.map((servico, indice) =>
    servico.caracteristica_veiculo === caracteristicas[indice]
      ? servico
      : {
          ...servico,
          caracteristica_veiculo: caracteristicas[indice],
          numero_n: regenerarSufixoNumeroN(
            servico.numero_n,
            caracteristicas[indice],
          ),
        },
  );

  const alteracoesDeServico: AlteracaoDeServico[] = alteracoes.map(
    (alteracao) => ({
      numero_n: servicos[alteracao.indice].numero_n,
      de: alteracao.de,
      para: alteracao.para,
    }),
  );

  return { servicos: convertidos, alteracoes: alteracoesDeServico };
}
