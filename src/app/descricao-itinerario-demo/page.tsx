"use client";

// Harness próprio e transitório do painel de descrição textual do itinerário
// (TASK-025; Spec 04 §7.4). A etapa real "Seções, Locais e Itinerários"
// (composer real injetado no recálculo, estado de rota ao vivo por
// itinerário) é montada pela TASK-019 (DEC-046) — quando isso acontecer, este
// harness é revisitado (mesmo precedente do `/editor-secoes-demo` da
// TASK-017 e do `/editor-locais-demo` da TASK-018). Existe só para dar ponto
// de montagem ao E2E do painel controlado.

import { useState } from "react";
import { PainelDescricaoItinerario } from "@/formulario/descricao";
import type { DescricaoItinerario } from "@/shared/contrato";

// UUIDs fixas (não `crypto.randomUUID()`): o harness roda em SSR+hidratação
// do Next.js — uuids aleatórias divergiriam entre servidor e cliente e
// quebrariam a hidratação (mesmo cuidado do `editor-locais-demo`).
const DESCRICAO_INICIAL: DescricaoItinerario = {
  texto:
    "Santos - Terminal Central, Rua Treta, Avenida Santo Antônio, São Vicente - Terminal Norte.",
  itens: [
    {
      tipo: "secao",
      secao_uuid: "11111111-1111-4111-8111-111111111111",
      rotulo: "Santos - Terminal Central",
    },
    { tipo: "via", nome: "Rua Treta" },
    { tipo: "via", nome: "Avenida Santo Antônio" },
    {
      tipo: "secao",
      secao_uuid: "22222222-2222-4222-8222-222222222222",
      rotulo: "São Vicente - Terminal Norte",
    },
  ],
};

export default function PaginaDescricaoItinerarioDemo() {
  const [recalculos, setRecalculos] = useState(0);

  return (
    <main>
      <h1>Painel de Descrição Textual do Itinerário — harness de teste (TASK-025)</h1>
      <PainelDescricaoItinerario
        sentido="ida"
        descricao={DESCRICAO_INICIAL}
        aoRecalcular={() => setRecalculos((atual) => atual + 1)}
      />
      <p data-testid="contador-recalculos">{recalculos}</p>
    </main>
  );
}
