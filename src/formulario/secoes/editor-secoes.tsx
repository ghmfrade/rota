"use client";

import { useState } from "react";
import type { Secao } from "@/shared/contrato";
import type { Ponto } from "@/shared/geo";
import { Mapa, type Coordenada, type MarcadorMapa } from "@/shared/mapa";
import { Botao, Campo, Painel, Select } from "@/shared/ui";
import {
  contribuirParaSecaoExistente,
  criarSecaoNoPonto,
  MENSAGEM_FORA_DE_SP,
  MENSAGEM_RECUSA_350M_SECAO,
  nomeExibicaoSecao,
  pontosOfertadosParaReuso,
  revalidarArrasto,
  type RecursosMunicipio,
  type Sentido,
} from "./fluxos-secao";

// Componente controlado do editor de Seções (TASK-017; Spec 04 §7.1) — os TRÊS
// gestos da spec sobre o mapa: clicar cria Seção nova, reutilizar contribui a
// geolocalização de uma Seção já existente, arrastar revalida os 350 m. Só
// entrega o motor + esta peça de UI; a etapa real "Seções, Locais e
// Itinerários" (seleção de Serviço/sentido, tabela lateral, persistência em
// sessão) é montada pela TASK-019 (Q-024/DEC-043) — este componente é
// controlado (recebe `secoes` e emite os callbacks) para não antecipar aquele
// modelo de estado.

const paraCoordenada = (p: Ponto): Coordenada => ({ lng: p.longitude, lat: p.latitude });
const paraPonto = (c: Coordenada): Ponto => ({ latitude: c.lat, longitude: c.lng });

export interface PropsEditorSecoes {
  /** Seções já existentes no documento (Spec 02 §5) — base do reuso. */
  secoes: readonly Secao[];
  servicoUuid: string;
  sentido: Sentido;
  /** Serviço tem os dois itinerários (Ida e Volta) — RN-026. */
  bidirecional: boolean;
  recursosMunicipio: RecursosMunicipio;
  aoCriarSecao: (secao: Secao) => void;
  aoAtualizarSecao: (secao: Secao) => void;
  /** Gesto aceito que alterou uma geolocalização — o recálculo real do estado
   * de rota ao vivo é do host (TASK-024/019); este editor só avisa. */
  aoSolicitarRecalculo?: () => void;
}

export function EditorSecoes({
  secoes,
  servicoUuid,
  sentido,
  bidirecional,
  recursosMunicipio,
  aoCriarSecao,
  aoAtualizarSecao,
  aoSolicitarRecalculo,
}: PropsEditorSecoes) {
  const [mensagem, definirMensagem] = useState<string | null>(null);
  const [pontoPendente, definirPontoPendente] = useState<Coordenada | null>(null);
  const [nomeNovaSecao, definirNomeNovaSecao] = useState("");
  const [secaoReusoUuid, definirSecaoReusoUuid] = useState("");
  const [indicePontoReuso, definirIndicePontoReuso] = useState(0);

  const secaoReuso = secoes.find((s) => s.uuid === secaoReusoUuid);
  const pontosReuso = secaoReuso ? pontosOfertadosParaReuso(secaoReuso) : [];

  const marcadoresSecoes: MarcadorMapa[] = secoes.flatMap((secao) => {
    const entrada = secao.servicos.find((s) => s.servico_uuid === servicoUuid);
    const ponto =
      sentido === "ida" ? entrada?.geolocalizacao_ida : entrada?.geolocalizacao_volta;
    if (!ponto) return [];
    return [
      {
        id: secao.uuid,
        posicao: paraCoordenada(ponto),
        arrastavel: true,
        aoArrastar: (posicao: Coordenada) => lidarArrasto(secao, posicao),
      },
    ];
  });

  const marcadorPendente: MarcadorMapa[] = pontoPendente
    ? [{ id: "novo-ponto-pendente", posicao: pontoPendente, cor: "#f59e0b" }]
    : [];

  function lidarCliqueNoMapa(posicao: Coordenada) {
    definirMensagem(null);
    definirPontoPendente(posicao);
    definirNomeNovaSecao("");
  }

  function confirmarCriacao() {
    if (!pontoPendente || !nomeNovaSecao.trim()) return;
    const resultado = criarSecaoNoPonto({
      nome: nomeNovaSecao,
      ponto: paraPonto(pontoPendente),
      servicoUuid,
      sentido,
      bidirecional,
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      definirMensagem(MENSAGEM_FORA_DE_SP);
      return;
    }
    aoCriarSecao(resultado.secao);
    aoSolicitarRecalculo?.();
    definirPontoPendente(null);
    definirNomeNovaSecao("");
    definirMensagem(null);
  }

  function cancelarCriacao() {
    definirPontoPendente(null);
    definirNomeNovaSecao("");
  }

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
    aoSolicitarRecalculo?.();
    definirMensagem(null);
    definirSecaoReusoUuid("");
    definirIndicePontoReuso(0);
  }

  function lidarArrasto(secao: Secao, posicao: Coordenada) {
    const resultado = revalidarArrasto({
      secao,
      servicoUuid,
      sentido,
      pontoNovo: paraPonto(posicao),
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      // Ponto NÃO se move: a posição do marcador vem de `secoes` (prop
      // controlada), que o chamador não alterou — o próximo render devolve o
      // marcador à posição antiga. Sem oferta automática de criar Seção nova
      // (DEC-044/Q-025): arrastar não pode descaracterizar a Seção; a recusa só
      // informa, e o usuário usa o fluxo normal de clique se quiser uma Seção
      // separada.
      definirMensagem(
        resultado.motivo === "350m"
          ? `${MENSAGEM_RECUSA_350M_SECAO} (Seção: ${resultado.nomeSecao})`
          : MENSAGEM_FORA_DE_SP,
      );
      return;
    }
    definirMensagem(null);
    aoAtualizarSecao(resultado.secao);
    aoSolicitarRecalculo?.();
  }

  return (
    <div data-testid="editor-secoes" className="flex flex-col gap-4">
      {mensagem ? (
        <p role="alert" data-testid="mensagem-recusa-secao" className="text-sm text-erro">
          {mensagem}
        </p>
      ) : null}

      <div
        className="overflow-hidden rounded-painel shadow-sombra-2"
        style={{ width: "100%", height: "60vh" }}
      >
        <Mapa
          marcadores={[...marcadoresSecoes, ...marcadorPendente]}
          aoClicar={lidarCliqueNoMapa}
        />
      </div>

      {pontoPendente ? (
        <Painel>
          <div data-testid="form-criar-secao" className="flex flex-col gap-4">
            <Campo
              rotulo="Nome da Seção"
              data-testid="nome-secao-input"
              value={nomeNovaSecao}
              onChange={(evento) => definirNomeNovaSecao(evento.target.value)}
            />
            <div className="flex gap-2">
              <Botao
                variante="primario"
                data-testid="confirmar-criar-secao"
                disabled={!nomeNovaSecao.trim()}
                onClick={confirmarCriacao}
              >
                Criar Seção
              </Botao>
              <Botao variante="fantasma" onClick={cancelarCriacao}>
                Cancelar
              </Botao>
            </div>
          </div>
        </Painel>
      ) : null}

      <Painel>
        <div data-testid="reuso-secoes" className="flex flex-col gap-4">
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
            <Botao
              variante="secundario"
              data-testid="confirmar-reuso"
              onClick={confirmarReuso}
            >
              Reutilizar Seção selecionada
            </Botao>
          ) : null}
        </div>
      </Painel>
    </div>
  );
}
