import {
  criarLocal,
  criarServico,
  criarViagem,
  type Itinerario,
  type Parada,
  type Secao,
  type Servico,
} from "@/shared/contrato";

// Duplicação de Serviço (RN-007; RN-005; Spec 04 §6; Spec 02 §12). Puro, sem UI.
//
// Cópia é entidade INDEPENDENTE: primeiro clona-se em profundidade todos os
// dados (`structuredClone`) para que a cópia não compartilhe NENHUMA referência
// de objeto/array com o original (`rota`, matrizes, geoloc dos Locais,
// `horarios_paradas` das Viagens) — assim uma edição futura in-place nunca
// corrompe o irmão; depois re-cunham-se só as identidades (`uuid` novas) via
// fábricas (`crypto.randomUUID()`), pois só a entidade original mantém
// identidade (Spec 02 §12). Consequências:
// - As referências a Seções (`parada.secao_uuid`) são MANTIDAS — a Seção é
//   entidade do Autos, compartilhada (RN-007; Spec 04 §6): o Serviço novo passa
//   a apontar para as mesmas Seções.
// - As referências a Locais (`parada.local_uuid`) são RE-MAPEADAS para as `uuid`
//   novas dos Locais copiados — Local pertence a UM Serviço (RN-031), então o
//   Serviço novo tem seus próprios Locais.
// - Ponto de rota e Parada não têm `uuid` (Spec 02 §10.1/§10.4): copiados como
//   estão (a Parada só tem seu `local_uuid` re-mapeado).
// - `matriz_distancias`/`matriz_seccionamento` referenciam apenas `secao_uuid`
//   (RN-054): copiadas sem alteração.
//
// `numero_n` é copiado como está — a renumeração sequencial do Serviço novo é
// decisão de UI (Spec 03 §10.3 regra 5), aplicada pela etapa Serviços sobre o
// resultado, não aqui. Não muta a entrada.

/**
 * Re-mapeia o `local_uuid` de uma Parada (já clonada) pelas `uuid` novas dos
 * Locais. `secao_uuid` é preservada (Seção compartilhada — RN-007).
 */
function reapontarParada(
  parada: Parada,
  mapaLocais: ReadonlyMap<string, string>,
): Parada {
  if (parada.local_uuid === undefined) return parada;
  const novoUuid = mapaLocais.get(parada.local_uuid);
  // Se o Local existe em `servico.locais`, re-mapeia; caso raro de referência
  // órfã (não deveria ocorrer num Serviço válido) mantém o valor original.
  return { ...parada, local_uuid: novoUuid ?? parada.local_uuid };
}

/**
 * Duplica um Serviço completo: cópia PROFUNDA de todos os dados + `uuid` novas
 * para o Serviço, seus Locais e todas as Viagens (RN-005/RN-007), preservando
 * `secao_uuid` e re-mapeando `local_uuid`. A cópia não compartilha nenhuma
 * referência com `servico`; não muta `servico`.
 */
export function duplicarServico(servico: Servico): Servico {
  // 1) Cópia profunda: nada da cópia compartilha referência com o original.
  const clone = structuredClone(servico);

  // 2) Locais com `uuid` nova (a geoloc já é a do clone — própria) + mapa
  // uuid antiga → uuid nova para re-mapear as Paradas. `criarLocal` sobrescreve
  // a `uuid` do clone pela gerada.
  const mapaLocais = new Map<string, string>();
  const locais = clone.locais.map((local) => {
    const novo = criarLocal(local);
    mapaLocais.set(local.uuid, novo.uuid);
    return novo;
  });

  const itinerarios = clone.itinerarios.map(
    (itinerario): Itinerario => ({
      ...itinerario,
      paradas: itinerario.paradas.map((parada) =>
        reapontarParada(parada, mapaLocais),
      ),
      // `rota` (geometria/trechos/descrição/pontos de rota) já é a do clone —
      // congelada e independente; referencia Seções por `secao_uuid` (mantidas).
      // Cada Viagem copiada é entidade nova (RN-007), com dados próprios.
      viagens: itinerario.viagens.map((viagem) => criarViagem(viagem)),
    }),
  );

  return criarServico({
    numero_n: clone.numero_n,
    caracteristica_veiculo: clone.caracteristica_veiculo,
    carater: clone.carater,
    locais,
    matriz_distancias: clone.matriz_distancias,
    matriz_seccionamento: clone.matriz_seccionamento,
    itinerarios,
  });
}

/**
 * Acrescenta às Seções usadas pela cópia a contribuição do novo Serviço
 * (RN-007/RN-026/RN-036). Seção é compartilhada: sua identidade e todas as
 * contribuições preexistentes permanecem intactas; somente nasce a entrada
 * identificada pela `uuid` da cópia.
 *
 * Uma origem estruturalmente inválida não é "curada": sem contribuição do
 * Serviço original, ou sem a geolocalização exigida, nenhum dado é inventado.
 * A função é idempotente para proteger o commit de sessão contra repetição.
 */
export function reconciliarSecoesDaDuplicacao(
  secoes: readonly Secao[],
  original: Servico,
  copia: Servico,
): Secao[] {
  const secoesUsadas = new Set(
    copia.itinerarios.flatMap((itinerario) =>
      itinerario.paradas.flatMap((parada) =>
        parada.secao_uuid === undefined ? [] : [parada.secao_uuid],
      ),
    ),
  );
  const usaIda = copia.itinerarios.some((itinerario) => itinerario.sentido === "ida");
  const usaVolta = copia.itinerarios.some(
    (itinerario) => itinerario.sentido === "volta",
  );

  return secoes.map((secao) => {
    if (
      !secoesUsadas.has(secao.uuid) ||
      secao.servicos.some((entrada) => entrada.servico_uuid === copia.uuid)
    ) {
      return secao;
    }

    const contribuicaoOriginal = secao.servicos.find(
      (entrada) => entrada.servico_uuid === original.uuid,
    );
    if (!contribuicaoOriginal) return secao;

    return {
      ...secao,
      servicos: [
        ...secao.servicos,
        {
          servico_uuid: copia.uuid,
          ...(usaIda && contribuicaoOriginal.geolocalizacao_ida !== undefined
            ? {
                geolocalizacao_ida: structuredClone(
                  contribuicaoOriginal.geolocalizacao_ida,
                ),
              }
            : {}),
          ...(usaVolta && contribuicaoOriginal.geolocalizacao_volta !== undefined
            ? {
                geolocalizacao_volta: structuredClone(
                  contribuicaoOriginal.geolocalizacao_volta,
                ),
              }
            : {}),
        },
      ],
    };
  });
}
