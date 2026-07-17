"use client";

import { useState } from "react";
import type { Secao } from "@/shared/contrato";
import { Botao, Painel, Select } from "@/shared/ui";
import {
  contribuirParaSecaoExistente,
  MENSAGEM_FORA_DE_SP,
  MENSAGEM_RECUSA_350M_SECAO,
  nomeExibicaoSecao,
  pontosOfertadosParaReuso,
  type RecursosMunicipio,
  type Sentido,
} from "@/formulario/secoes";

// Painel "Reutilizar Seção existente" (Spec 04 §7.1), extraído do
// `EditorMapaItinerario` para a coluna lateral, acima da tabela de paradas
// (TASK-074; relato do responsável 2026-07-17). O motor de reuso
// (`contribuirParaSecaoExistente`/`pontosOfertadosParaReuso`, RN-025..027) não
// muda — só o lugar do painel na tela. Mesmos `data-testid` de sempre
// (`reuso-secoes`, `select-secao-reuso`, `select-ponto-reuso`,
// `confirmar-reuso`); a mensagem de recusa ganha testid próprio
// (`mensagem-recusa-reuso`) para não colidir com a do editor de mapa
// (`mensagem-recusa-secao`, usada por criação/arrasto) quando as duas
// estiverem ativas ao mesmo tempo.

export interface PropsPainelReusoSecao {
  /** Seções já existentes no documento (Spec 02 §5) — base do reuso. */
  secoes: readonly Secao[];
  servicoUuid: string;
  sentido: Sentido;
  bidirecional: boolean;
  recursosMunicipio: RecursosMunicipio;
  aoAtualizarSecao: (secao: Secao) => void;
}

export function PainelReusoSecao({
  secoes,
  servicoUuid,
  sentido,
  bidirecional,
  recursosMunicipio,
  aoAtualizarSecao,
}: PropsPainelReusoSecao) {
  const [secaoReusoUuid, definirSecaoReusoUuid] = useState("");
  const [indicePontoReuso, definirIndicePontoReuso] = useState(0);
  const [mensagem, definirMensagem] = useState<string | null>(null);

  const secaoReuso = secoes.find((s) => s.uuid === secaoReusoUuid);
  const pontosReuso = secaoReuso ? pontosOfertadosParaReuso(secaoReuso) : [];

  function confirmarReuso() {
    if (!secaoReuso) return;
    const ponto = pontosReuso[indicePontoReuso];
    if (!ponto) return;
    const resultado = contribuirParaSecaoExistente({
      secao: secaoReuso,
      servicoUuid,
      sentido,
      bidirecional,
      ponto,
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      definirMensagem(
        resultado.motivo === "350m" ? MENSAGEM_RECUSA_350M_SECAO : MENSAGEM_FORA_DE_SP,
      );
      return;
    }
    aoAtualizarSecao(resultado.secao);
    definirMensagem(null);
    definirSecaoReusoUuid("");
    definirIndicePontoReuso(0);
  }

  return (
    <Painel>
      <div data-testid="reuso-secoes" className="flex flex-col gap-4">
        {mensagem ? (
          <p role="alert" data-testid="mensagem-recusa-reuso" className="text-sm text-erro">
            {mensagem}
          </p>
        ) : null}

        <Select
          rotulo="Reutilizar Seção existente"
          data-testid="select-secao-reuso"
          value={secaoReusoUuid}
          onChange={(evento) => {
            definirSecaoReusoUuid(evento.target.value);
            definirIndicePontoReuso(0);
          }}
        >
          <option value="">— selecione —</option>
          {secoes.map((secao) => (
            <option key={secao.uuid} value={secao.uuid}>
              {nomeExibicaoSecao(secao)}
            </option>
          ))}
        </Select>

        {secaoReuso && pontosReuso.length > 1 ? (
          <Select
            rotulo="Posição"
            data-testid="select-ponto-reuso"
            value={indicePontoReuso}
            onChange={(evento) => definirIndicePontoReuso(Number(evento.target.value))}
          >
            {pontosReuso.map((ponto, indice) => (
              <option key={`${ponto.latitude},${ponto.longitude}`} value={indice}>
                Ponto {indice + 1} ({ponto.latitude.toFixed(5)}, {ponto.longitude.toFixed(5)})
              </option>
            ))}
          </Select>
        ) : null}

        {secaoReuso ? (
          <Botao variante="secundario" data-testid="confirmar-reuso" onClick={confirmarReuso}>
            Reutilizar Seção selecionada
          </Botao>
        ) : null}
      </div>
    </Painel>
  );
}
