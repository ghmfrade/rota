import type { DocumentoOperacao, Itinerario } from "@/shared/contrato";
import { numerarItinerario } from "./legenda-itinerario";
import {
  montarTabelasHorarias,
  type TabelaHorariaPdf,
} from "./tabelas-horarias-pdf";

// Anexo técnico do PDF operacional (TASK-034; Spec 04 §13.1 item 8). Módulo
// PURO. Duas partes:
//
// (a) a versão DETALHADA da tabela horária (§13.2) — todos os horários
//     passantes pelas Seções, sem Locais e sem offsets (RN-075/076);
// (b) a relação de Locais comuns por Serviço/sentido — nome, município e
//     posição no itinerário —, **sem** horários de passagem e **sem** offsets,
//     que permanecem dado interno do JSON (§13.1 item 8b; RN-031/076).
//
// A "posição no itinerário" do item 8b é o identificador hierárquico `n.m` da
// DEC-105, produzido por `numerarItinerario` e já usado para rotular o Local no
// mapa do corpo — é o que liga as duas superfícies.
//
// Q-084 (opção 1, decidida pelo responsável na análise desta task): o Local sem
// `geolocalizacao_<sentido>` **é listado** normalmente, com seu `n.m`. O anexo é
// a relação de Locais do Serviço/sentido, não a legenda do mapa: não há promessa
// de bijeção anexo ↔ símbolo. Omiti-lo perderia dado do documento. O caso, de
// todo modo, é inalcançável em documento válido (RN-036 recusa na importação e a
// pendência bloqueante "sem rota" fecha o gate da RN-078).

/** Uma linha da relação de Locais do anexo (§13.1 item 8b). */
export interface LinhaLocalAnexo {
  localUuid: string;
  /** `n.m` — posição no itinerário, prefixada pela Seção anterior (DEC-105). */
  identificador: string;
  nome: string;
  municipio: string;
}

/** Os Locais de um Serviço/sentido. */
export interface BlocoLocaisAnexo {
  servicoUuid: string;
  numeroN: string;
  sentido: Itinerario["sentido"];
  titulo: string;
  locais: LinhaLocalAnexo[];
}

/** §13.1 item 8 — anexo técnico completo. */
export interface BlocoAnexoTecnico {
  /** (a) versão detalhada da tabela horária (§13.2). */
  tabelasDetalhadas: TabelaHorariaPdf[];
  /** (b) relação de Locais comuns, sem horários (RN-075/076). */
  locaisPorItinerario: BlocoLocaisAnexo[];
}

const ROTULO_SENTIDO: Record<Itinerario["sentido"], string> = {
  ida: "Ida",
  volta: "Volta",
};

/** Relação de Locais por Serviço e sentido, na ordem da travessia (§13.1 item 8b). */
export function montarLocaisDoAnexo(
  documento: DocumentoOperacao,
): BlocoLocaisAnexo[] {
  const blocos: BlocoLocaisAnexo[] = [];
  for (const servico of documento.autos.servicos) {
    const locaisPorUuid = new Map(servico.locais.map((local) => [local.uuid, local]));
    const ordenados = [...servico.itinerarios].sort((a, b) =>
      a.sentido === b.sentido ? 0 : a.sentido === "ida" ? -1 : 1,
    );
    for (const itinerario of ordenados) {
      const { identificadoresLocais } = numerarItinerario(
        itinerario,
        servico.uuid,
        documento.autos.secoes,
        servico.locais,
      );
      blocos.push({
        servicoUuid: servico.uuid,
        numeroN: servico.numero_n,
        sentido: itinerario.sentido,
        titulo: `Serviço ${servico.numero_n} — ${ROTULO_SENTIDO[itinerario.sentido]}`,
        locais: identificadoresLocais
          .map(({ localUuid, identificador }) => {
            const local = locaisPorUuid.get(localUuid);
            return local === undefined
              ? undefined
              : {
                  localUuid,
                  identificador,
                  nome: local.nome,
                  municipio: local.municipio,
                };
          })
          .filter((linha): linha is LinhaLocalAnexo => linha !== undefined),
      });
    }
  }
  return blocos;
}

export function montarAnexoTecnico(documento: DocumentoOperacao): BlocoAnexoTecnico {
  return {
    tabelasDetalhadas: montarTabelasHorarias(documento, "detalhada"),
    locaisPorItinerario: montarLocaisDoAnexo(documento),
  };
}
