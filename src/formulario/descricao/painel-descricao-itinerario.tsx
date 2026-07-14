"use client";

import { useState } from "react";
import type { DescricaoItinerario } from "@/shared/contrato";

// Painel controlado "Descrição textual do itinerário" (TASK-025; Spec 04
// §7.4): exibe `rota.descricao_itinerario` (Spec 02 §10.5) por Serviço/
// sentido — texto gerado automaticamente com as Seções em destaque visual e
// as vias em texto simples, lista estruturada opcional (`itens`), nota de
// geração automática. Ações: Recalcular (delega ao host — o composer real e
// o estado de rota ao vivo por itinerário são da etapa real, TASK-019),
// Copiar texto, Ver itens estruturados. Sem edição manual do texto nesta
// versão (RN-046, §7.4). Componente controlado, sem estado de sessão (padrão
// DEC-043/045): recebe `descricao` e emite `aoRecalcular`; só a exibição/
// ocultação da lista estruturada é estado local (puramente de UI).

const ROTULO_SENTIDO: Record<"ida" | "volta", string> = {
  ida: "Ida",
  volta: "Volta",
};

export interface PropsPainelDescricaoItinerario {
  sentido: "ida" | "volta";
  /** `rota.descricao_itinerario` do itinerário corrente (Spec 02 §10.5). */
  descricao: DescricaoItinerario;
  /** Recompõe a descrição contra a rota atual (Spec 03 §3.7.7) — o host
   * decide como (composer + estado de rota ao vivo, TASK-019/024/025).
   * Ausente enquanto não houver rota calculada para recompor. */
  aoRecalcular?: () => void;
}

export function PainelDescricaoItinerario({
  sentido,
  descricao,
  aoRecalcular,
}: PropsPainelDescricaoItinerario) {
  const [mostrarItens, setMostrarItens] = useState(false);

  return (
    <section aria-label={`Descrição textual do itinerário — ${ROTULO_SENTIDO[sentido]}`}>
      <h3>Descrição textual do itinerário — {ROTULO_SENTIDO[sentido]}</h3>
      <p data-testid="descricao-texto">
        {descricao.itens.map((item, indice) => (
          <span key={indice}>
            {indice > 0 && ", "}
            {item.tipo === "secao" ? <strong>{item.rotulo}</strong> : item.nome}
          </span>
        ))}
        {descricao.itens.length > 0 && "."}
      </p>
      <p>
        <em>Texto gerado automaticamente a partir da rota roteirizada — não é digitado.</em>
      </p>
      <button type="button" onClick={aoRecalcular} disabled={!aoRecalcular}>
        Recalcular descrição
      </button>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(descricao.texto);
        }}
      >
        Copiar texto
      </button>
      <button type="button" onClick={() => setMostrarItens((atual) => !atual)}>
        {mostrarItens ? "Ocultar itens estruturados" : "Ver itens estruturados"}
      </button>
      {mostrarItens && (
        <ul data-testid="descricao-itens">
          {descricao.itens.map((item, indice) => (
            <li key={indice}>
              {item.tipo === "secao" ? <strong>{item.rotulo}</strong> : item.nome}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
