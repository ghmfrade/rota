import type { Itinerario, Local, Secao } from "@/shared/contrato";
import { nomeExibicaoSecao } from "@/formulario/secoes/fluxos-secao";

// Numeração hierárquica das paradas do mapa/legenda do PDF operacional
// (DEC-105; Spec 04 §13.1 itens 4d/8b). Módulo PURO: lê só `paradas[].ordem`,
// as Seções do Autos e os Locais do Serviço — nada de OSRM, nada de canvas
// (RN-015/NEG-019). Chamado uma vez por Itinerário (Ida e Volta são objetos
// distintos), o que já entrega o reinício da numeração por sentido.

export type TipoSimboloParada = "secao" | "local";

/**
 * Um símbolo a desenhar no mapa: geolocalização congelada do Serviço/sentido
 * corrente + rótulo hierárquico. Local antes da primeira Seção — só possível
 * em documento importado que viola a RN-035 — entra sem `rotulo`: a RN-036
 * cobre a integridade da referência, mas não existe Seção anterior de quem
 * herdar o prefixo, e a task proíbe inventar `0.1`.
 */
export interface SimboloParada {
  tipo: TipoSimboloParada;
  rotulo?: string;
  latitude: number;
  longitude: number;
}

/** Um item da legenda vertical do corpo do bloco — só Seções (RN-076). */
export interface ItemLegendaSecao {
  rotulo: string;
  nome: string;
}

/** Identificador hierárquico de um Local, para o anexo da TASK-034 referenciar (§13.1 item 8b). */
export interface IdentificadorLocal {
  localUuid: string;
  identificador: string;
}

export interface NumeracaoItinerario {
  /** Símbolos na ordem da travessia, prontos para projeção sobre o mapa. */
  simbolos: SimboloParada[];
  /** Legenda vertical do corpo — só Seções, na ordem da travessia. */
  legendaSecoes: ItemLegendaSecao[];
  /** `local_uuid` → identificador `n.m`, para o anexo técnico (TASK-034). */
  identificadoresLocais: IdentificadorLocal[];
}

function indicePorUuid<T extends { uuid: string }>(itens: readonly T[]): Map<string, T> {
  return new Map(itens.map((item) => [item.uuid, item]));
}

/**
 * Numera as paradas de UM itinerário (Ida OU Volta) na ordem da travessia
 * (`paradas[].ordem`, ordenado defensivamente — mesmo precedente de
 * `sequenciaDeSecoes` em `modelo-pdf-operacional.ts`): Seções ganham `1º`,
 * `2º`… (número desenhado dentro do quadrado — DEC-105); Locais ganham
 * `n.m`, prefixados pela Seção IMEDIATAMENTE anterior — a contagem de
 * Locais reinicia a cada Seção nova, sem deslocar a numeração das Seções.
 *
 * Parada com referência inexistente ou sem geolocalização do Serviço/sentido
 * corrente (RN-036) é ignorada: não consome número, não é substituída por
 * outra parada por engano. Local antes da primeira Seção (RN-035 violada em
 * documento importado) é desenhado sem rótulo, nunca como `0.1`.
 */
export function numerarItinerario(
  itinerario: Pick<Itinerario, "sentido" | "paradas">,
  servicoUuid: string,
  secoes: readonly Secao[],
  locais: readonly Local[],
): NumeracaoItinerario {
  const secoesPorUuid = indicePorUuid(secoes);
  const locaisPorUuid = indicePorUuid(locais);
  const campoGeolocalizacao: "geolocalizacao_ida" | "geolocalizacao_volta" =
    itinerario.sentido === "ida" ? "geolocalizacao_ida" : "geolocalizacao_volta";

  const simbolos: SimboloParada[] = [];
  const legendaSecoes: ItemLegendaSecao[] = [];
  const identificadoresLocais: IdentificadorLocal[] = [];

  let contadorSecoes = 0;
  let prefixoSecaoAtual: string | undefined;
  let contadorLocaisNaSecaoAtual = 0;

  // A Spec 02 §10 exige `paradas` ordenado por `ordem`, mas a legenda ordena
  // defensivamente antes de ler — a peça operacional não pode depender da
  // ordem do array (mesmo raciocínio de `sequenciaDeSecoes`).
  const paradasOrdenadas = [...itinerario.paradas].sort((a, b) => a.ordem - b.ordem);

  for (const parada of paradasOrdenadas) {
    if (parada.secao_uuid !== undefined) {
      const secao = secoesPorUuid.get(parada.secao_uuid);
      const entrada = secao?.servicos.find((sv) => sv.servico_uuid === servicoUuid);
      const geoloc = entrada?.[campoGeolocalizacao];
      if (!secao || !geoloc) continue;

      contadorSecoes += 1;
      prefixoSecaoAtual = String(contadorSecoes);
      contadorLocaisNaSecaoAtual = 0;
      const rotulo = `${contadorSecoes}º`;
      simbolos.push({
        tipo: "secao",
        rotulo,
        latitude: geoloc.latitude,
        longitude: geoloc.longitude,
      });
      legendaSecoes.push({ rotulo, nome: nomeExibicaoSecao(secao) });
    } else if (parada.local_uuid !== undefined) {
      const local = locaisPorUuid.get(parada.local_uuid);
      const geoloc = local?.[campoGeolocalizacao];
      if (!local || !geoloc) continue;

      if (prefixoSecaoAtual === undefined) {
        simbolos.push({
          tipo: "local",
          latitude: geoloc.latitude,
          longitude: geoloc.longitude,
        });
        continue;
      }

      contadorLocaisNaSecaoAtual += 1;
      const identificador = `${prefixoSecaoAtual}.${contadorLocaisNaSecaoAtual}`;
      simbolos.push({
        tipo: "local",
        rotulo: identificador,
        latitude: geoloc.latitude,
        longitude: geoloc.longitude,
      });
      identificadoresLocais.push({ localUuid: local.uuid, identificador });
    }
  }

  return { simbolos, legendaSecoes, identificadoresLocais };
}
