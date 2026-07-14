import type { DescricaoItinerario, ItemDescricao } from "@/shared/contrato";
import type { Ponto } from "@/shared/geo";

// Compositor DESCRICAO(itinerario) (TASK-025; Spec 03 §3.7; RN-044/045/046/
// 053) — produz `rota.descricao_itinerario` (Spec 02 §10.5) intercalando as
// Seções do itinerário (marcos) com os nomes de via percorridos entre elas.
// Locais nunca entram (§3.7.3); pontos de rota não viram item, só influenciam
// quais nomes de via aparecem (§3.7.4). Fonte dos nomes: `nomesViasPorTrecho`
// de `extrairRota` (crus, não limpos) — a limpeza (§3.7.5) é feita aqui, por
// intervalo entre Seções (§3.7.6), nunca globalmente.

/**
 * Parada roteada com o marco de Seção, quando aplicável (Spec 02 §10.1: uma
 * Parada referencia `secao_uuid` XOR `local_uuid` — RN-033). `secao` ausente
 * significa Local (Spec 03 §3.7.3, ignorado pela descrição). Estende `Ponto`
 * para permanecer compatível com `solicitarRota`/`extrairRota`, que só
 * consomem lat/lon.
 */
export interface ParadaRota extends Ponto {
  /** Presente apenas quando esta parada referencia uma Seção — o marco da
   * descrição (RN-044). `rotulo` no padrão `Cidade - Nome da Seção`
   * (Spec 04 §7.1). */
  secao?: {
    uuid: string;
    rotulo: string;
  };
}

/**
 * Compõe a descrição textual de UM itinerário (Spec 03 §3.7.6, pseudocódigo
 * `DESCRICAO`): percorre as Seções na ordem em que aparecem em `paradas` e,
 * entre cada par de Seções consecutivas, concatena os nomes crus de
 * `nomesViasPorTrecho` de todos os trechos no intervalo (que pode incluir
 * Locais no meio) e os limpa (`limpaNomes`, §3.7.5) **por intervalo** — nunca
 * globalmente (§3.7.6, nota de dedup entre blocos).
 *
 * `nomesViasPorTrecho[i]` deve corresponder ao trecho entre `paradas[i]` e
 * `paradas[i+1]` (mesma convenção de `ResultadoRotaOsrm.nomesViasPorTrecho`,
 * `extrair-rota.ts`) — `paradas.length - 1` entradas.
 *
 * Pré-condição (RN-044, Spec 02 §10.1): um itinerário schema-válido tem ao
 * menos duas paradas com `secao_uuid`. Esta função não valida essa
 * pré-condição (validação estrutural é `validacoes-estruturais.ts`); se
 * `paradas` não tiver nenhum marco de Seção, devolve `itens: []` e
 * `texto: ""` — saída que a validação estrutural rejeitará como inválida
 * (não é responsabilidade do compositor "consertar" um itinerário malformado).
 */
export function comporDescricao(
  paradas: readonly ParadaRota[],
  nomesViasPorTrecho: readonly (readonly (string | null | undefined)[])[],
): DescricaoItinerario {
  const indicesSecao: number[] = [];
  paradas.forEach((parada, indice) => {
    if (parada.secao) indicesSecao.push(indice);
  });

  const itens: ItemDescricao[] = [];
  for (let i = 0; i < indicesSecao.length; i++) {
    const indiceAtual = indicesSecao[i];
    const secao = paradas[indiceAtual].secao;
    if (!secao) continue; // impossível (indicesSecao só guarda paradas com secao) — guarda de tipo.
    itens.push({ tipo: "secao", secao_uuid: secao.uuid, rotulo: secao.rotulo });

    if (i < indicesSecao.length - 1) {
      const proximoIndice = indicesSecao[i + 1];
      const viasCruas: (string | null | undefined)[] = [];
      for (let trecho = indiceAtual; trecho < proximoIndice; trecho++) {
        viasCruas.push(...(nomesViasPorTrecho[trecho] ?? []));
      }
      for (const nome of limpaNomes(viasCruas)) {
        itens.push({ tipo: "via", nome });
      }
    }
  }

  return { texto: montarTexto(itens), itens };
}

/**
 * Limpeza e normalização dos nomes de via de UM intervalo entre Seções
 * (RN-045, Spec 03 §3.7.5): remove vazios/nulos; colapsa repetições
 * **consecutivas** (comparação após padronizar espaços); preserva repetições
 * **não consecutivas**; padroniza espaços (colapsa múltiplos, apara pontas)
 * sem alterar acentuação/caixa; **vias sem nome são omitidas** (decisão
 * fechada — nunca um marcador genérico).
 */
export function limpaNomes(brutos: readonly (string | null | undefined)[]): string[] {
  const normalizados = brutos
    .map((nome) => (nome ?? "").replace(/\s+/g, " ").trim())
    .filter((nome) => nome.length > 0);

  const limpos: string[] = [];
  for (const nome of normalizados) {
    if (limpos[limpos.length - 1] === nome) continue;
    limpos.push(nome);
  }
  return limpos;
}

/** Monta `texto` a partir de `itens`, no padrão da Spec 03 §3.7.2 (ex.:
 * `"Cidade A - Seção A, Rua 1, Avenida 2, Cidade B - Seção B."`). */
function montarTexto(itens: readonly ItemDescricao[]): string {
  if (itens.length === 0) return "";
  const rotulos = itens.map((item) => (item.tipo === "secao" ? item.rotulo : item.nome));
  return `${rotulos.join(", ")}.`;
}
