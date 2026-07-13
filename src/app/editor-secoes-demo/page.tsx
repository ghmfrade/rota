"use client";

// Harness próprio e transitório do editor de Seções (TASK-017; Q-024/DEC-043).
// A etapa real "Seções, Locais e Itinerários" (seleção de Serviço/sentido,
// tabela lateral, persistência em sessão) é montada pela TASK-019 — quando
// isso acontecer, este harness é revisitado (mesmo precedente do
// `/mapa-demo` da TASK-020, ver docs-dev/14-REVISOES/TASK-020-20260710.md).
// Existe só para dar ponto de montagem aos testes (unitários já cobrem o
// motor puro; isto habilita o E2E de recusa dos 350 m no arrasto).

import { useState } from "react";
import { EditorSecoes, type RecursosMunicipio } from "@/formulario/secoes";
import type { Secao } from "@/shared/contrato";
import { indiceDeNomes } from "@/shared/geo";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";
import { CENTRO_PADRAO_SP } from "@/shared/mapa";

const SERVICO_DEMO = "11111111-1111-4111-8111-111111111111";
// Segundo Serviço, já contribuindo ao mesmo ponto — sem ele, arrastar o único
// ponto da Seção exclui o próprio alvo do cluster (RN-027 "1º ponto sempre
// aceito") e NUNCA seria recusado. Não aparece como marcador (o editor só
// desenha os pontos do `servicoUuid` corrente), só entra no cálculo do
// centroide cumulativo (Spec 02 §5.2).
const SERVICO_OUTRO = "22222222-2222-4222-8222-222222222222";
// UUID fixa (não `criarSecao`/`crypto.randomUUID()`): o harness roda em
// SSR+hidratação do Next.js — uma uuid aleatória divergiria entre servidor e
// cliente e quebraria a hidratação. É só o estado inicial do harness de
// teste, não passa pelas fábricas de identidade (fabricas.ts).
const UUID_SECAO_DEMO = "00000000-0000-4000-8000-000000000000";

// Polígono municipal sintético, largo o bastante para cobrir qualquer arrasto
// exercido pelos testes (zoom default é o do Estado inteiro — poucos pixels
// já valem milhares de metros). Não é o geojson real (RN-029 não muda: fora
// deste polígono sintético o ponto vira "fora de SP", como qualquer outro).
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

// Seção inicial com um ponto exatamente no centro default do mapa (RN-025) —
// facilita o E2E: a posição do marcador na tela é o centro do canvas. Montada
// como literal (não via `criarSecaoNoPonto`/fábrica) para ter uuid estável
// entre servidor e cliente — ver `UUID_SECAO_DEMO`.
function secaoInicial(): Secao {
  return {
    uuid: UUID_SECAO_DEMO,
    municipio: "Cidade Demo",
    nome: "Terminal Demo",
    servicos: [
      {
        servico_uuid: SERVICO_DEMO,
        geolocalizacao_ida: {
          latitude: CENTRO_PADRAO_SP.lat,
          longitude: CENTRO_PADRAO_SP.lng,
        },
      },
      {
        servico_uuid: SERVICO_OUTRO,
        geolocalizacao_ida: {
          latitude: CENTRO_PADRAO_SP.lat,
          longitude: CENTRO_PADRAO_SP.lng,
        },
      },
    ],
  };
}

export default function PaginaEditorSecoesDemo() {
  const [secoes, setSecoes] = useState<Secao[]>(() => [secaoInicial()]);

  return (
    <main>
      <h1>Editor de Seções — harness de teste (TASK-017)</h1>
      <EditorSecoes
        secoes={secoes}
        servicoUuid={SERVICO_DEMO}
        sentido="ida"
        bidirecional={false}
        recursosMunicipio={RECURSOS}
        aoCriarSecao={(secao) => setSecoes((atual) => [...atual, secao])}
        aoAtualizarSecao={(secao) =>
          setSecoes((atual) => atual.map((s) => (s.uuid === secao.uuid ? secao : s)))
        }
      />
      <pre data-testid="secoes-json">{JSON.stringify(secoes)}</pre>
    </main>
  );
}
