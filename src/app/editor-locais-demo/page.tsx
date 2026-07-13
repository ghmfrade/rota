"use client";

// Harness próprio e transitório do editor de Locais (TASK-018; DEC-045). A etapa
// real "Seções, Locais e Itinerários" (seleção de Serviço/sentido, tabela
// lateral, remoção da Parada do sentido excluído, persistência em sessão) é
// montada pela TASK-019 — quando isso acontecer, este harness é revisitado
// (mesmo precedente do `/mapa-demo` da TASK-020 e do `/editor-secoes-demo` da
// TASK-017). Existe só para dar ponto de montagem aos testes (unitários já
// cobrem o motor puro; isto habilita o E2E de recusa dos 350 m pareada no
// arrasto).

import { useState } from "react";
import { EditorLocais, type RecursosMunicipio } from "@/formulario/locais";
import type { Local } from "@/shared/contrato";
import { indiceDeNomes } from "@/shared/geo";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";
import { CENTRO_PADRAO_SP } from "@/shared/mapa";

// UUID fixa (não `criarLocal`/`crypto.randomUUID()`): o harness roda em
// SSR+hidratação do Next.js — uma uuid aleatória divergiria entre servidor e
// cliente e quebraria a hidratação. É só o estado inicial do harness de teste,
// não passa pela fábrica de identidade (fabricas.ts).
const UUID_LOCAL_DEMO = "00000000-0000-4000-8000-000000000000";

// Polígono municipal sintético, largo o bastante para cobrir qualquer arrasto
// exercido pelos testes (zoom default é o do Estado inteiro — poucos pixels já
// valem milhares de metros). Não é o geojson real (RN-029 não muda: fora deste
// polígono sintético o ponto vira "fora de SP", como qualquer outro).
const MUNICIPIO_DEMO: FeatureMunicipio = {
  type: "Feature",
  properties: { codarea: "3500000" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-60, -30],
        [-40, -30],
        [-40, -15],
        [-60, -15],
        [-60, -30],
      ],
    ],
  },
};
const RECURSOS: RecursosMunicipio = {
  features: [MUNICIPIO_DEMO],
  nomes: indiceDeNomes([{ codigo_ibge: "3500000", nome: "Cidade Demo" }]),
};

// Local inicial bidirecional com Ida e Volta no MESMO ponto (centro default do
// mapa). Sem o par, arrastar o único ponto não teria contrapartida para medir os
// 350 m pareados (RN-032) e nunca seria recusado. Montado como literal (não via
// `criarLocalNoPonto`/fábrica) para ter uuid estável entre servidor e cliente —
// ver `UUID_LOCAL_DEMO`.
function localInicial(): Local {
  const ponto = {
    latitude: CENTRO_PADRAO_SP.lat,
    longitude: CENTRO_PADRAO_SP.lng,
  };
  return {
    uuid: UUID_LOCAL_DEMO,
    municipio: "Cidade Demo",
    nome: "Ponto Demo",
    geolocalizacao_ida: ponto,
    geolocalizacao_volta: { ...ponto },
  };
}

export default function PaginaEditorLocaisDemo() {
  const [locais, setLocais] = useState<Local[]>(() => [localInicial()]);

  return (
    <main>
      <h1>Editor de Locais — harness de teste (TASK-018)</h1>
      <EditorLocais
        locais={locais}
        sentido="ida"
        bidirecional
        recursosMunicipio={RECURSOS}
        aoCriarLocal={(local) => setLocais((atual) => [...atual, local])}
        aoAtualizarLocal={(local) =>
          setLocais((atual) => atual.map((l) => (l.uuid === local.uuid ? local : l)))
        }
        aoExcluirSentido={(local) =>
          setLocais((atual) => atual.map((l) => (l.uuid === local.uuid ? local : l)))
        }
      />
      <pre data-testid="locais-json">{JSON.stringify(locais)}</pre>
    </main>
  );
}
