"use client";

// Harness de montagem do mapa base para o smoke/E2E da TASK-020. O mapa ainda
// não está integrado a uma etapa do Formulário (isso é a TASK-017); esta página
// existe só para exercitar o componente isoladamente. Deve ser removida/reusada
// quando a etapa de itinerário passar a montar o mapa de verdade.

import { useRef, useState } from "react";
import { Mapa, type MapaHandle } from "@/shared/mapa";

export default function PaginaMapaDemo() {
  const mapaRef = useRef<MapaHandle>(null);
  const [imagem, setImagem] = useState<string>("");

  return (
    <main>
      <h1>Mapa base — harness de teste (TASK-020)</h1>
      <div style={{ width: "100%", height: "70vh" }}>
        <Mapa
          ref={mapaRef}
          marcadores={[
            { id: "a", posicao: { lng: -46.6333, lat: -23.5505 } },
          ]}
          linhas={[
            {
              id: "rota",
              pontos: [
                { lng: -46.64, lat: -23.55 },
                { lng: -46.62, lat: -23.54 },
              ],
            },
          ]}
        />
      </div>
      <button
        type="button"
        data-testid="capturar-imagem"
        onClick={() => setImagem(mapaRef.current?.capturarImagem() ?? "")}
      >
        Capturar imagem
      </button>
      <output data-testid="imagem-capturada">{imagem}</output>
    </main>
  );
}
