"use client";

import { useState } from "react";
import type { Local } from "@/shared/contrato";
import type { Ponto } from "@/shared/geo";
import { Mapa, type Coordenada, type MarcadorMapa } from "@/shared/mapa";
import { Botao, Campo, Painel } from "@/shared/ui";
import {
  criarLocalNoPonto,
  excluirSentidoDoLocal,
  MENSAGEM_FORA_DE_SP,
  MENSAGEM_RECUSA_350M_LOCAL,
  nomeExibicaoLocal,
  revalidarArrastoLocal,
  type RecursosMunicipio,
  type Sentido,
} from "./fluxos-local";

// Componente controlado do editor de Locais (TASK-018; Spec 04 §7.2) — os três
// gestos da spec sobre o mapa: clicar cria Local novo (espelhado quando o
// Serviço é bidirecional), arrastar revalida os 350 m pareada, excluir o ponto
// de um sentido torna o Local unidirecional. Só entrega o motor + esta peça de
// UI; a etapa real "Seções, Locais e Itinerários" (seleção de Serviço/sentido,
// tabela lateral, remoção da Parada do sentido excluído, persistência em sessão)
// é montada pela TASK-019 (DEC-045) — este componente é controlado (recebe
// `locais` e emite os callbacks) para não antecipar aquele modelo de estado.

const paraCoordenada = (p: Ponto): Coordenada => ({ lng: p.longitude, lat: p.latitude });
const paraPonto = (c: Coordenada): Ponto => ({ latitude: c.lat, longitude: c.lng });

const geolocDoSentido = (local: Local, sentido: Sentido): Ponto | undefined =>
  sentido === "ida" ? local.geolocalizacao_ida : local.geolocalizacao_volta;

export interface PropsEditorLocais {
  /** Locais do Serviço corrente (Spec 02 §7) — não compartilhados (RN-031). */
  locais: readonly Local[];
  sentido: Sentido;
  /** Serviço tem os dois itinerários (Ida e Volta) — a criação nasce espelhada. */
  bidirecional: boolean;
  recursosMunicipio: RecursosMunicipio;
  aoCriarLocal: (local: Local) => void;
  aoAtualizarLocal: (local: Local) => void;
  /** Exclusão do ponto de um sentido: o Local (já unidirecional) é devolvido e a
   * TASK-019, dona das paradas, remove a Parada daquele sentido (DEC-045). */
  aoExcluirSentido: (local: Local, sentido: Sentido) => void;
  /** Gesto aceito que alterou uma geolocalização — o recálculo real do estado de
   * rota ao vivo é do host (TASK-024/019); este editor só avisa. */
  aoSolicitarRecalculo?: () => void;
}

export function EditorLocais({
  locais,
  sentido,
  bidirecional,
  recursosMunicipio,
  aoCriarLocal,
  aoAtualizarLocal,
  aoExcluirSentido,
  aoSolicitarRecalculo,
}: PropsEditorLocais) {
  const [mensagem, definirMensagem] = useState<string | null>(null);
  const [pontoPendente, definirPontoPendente] = useState<Coordenada | null>(null);
  const [nomeNovoLocal, definirNomeNovoLocal] = useState("");

  const locaisDoSentido = locais.filter((local) => geolocDoSentido(local, sentido));

  const marcadoresLocais: MarcadorMapa[] = locaisDoSentido.map((local) => ({
    id: local.uuid,
    // filtrado acima: geoloc do sentido existe.
    posicao: paraCoordenada(geolocDoSentido(local, sentido)!),
    arrastavel: true,
    aoArrastar: (posicao: Coordenada) => lidarArrasto(local, posicao),
  }));

  const marcadorPendente: MarcadorMapa[] = pontoPendente
    ? [{ id: "novo-ponto-pendente", posicao: pontoPendente, cor: "#f59e0b" }]
    : [];

  function lidarCliqueNoMapa(posicao: Coordenada) {
    definirMensagem(null);
    definirPontoPendente(posicao);
    definirNomeNovoLocal("");
  }

  function confirmarCriacao() {
    if (!pontoPendente || !nomeNovoLocal.trim()) return;
    const resultado = criarLocalNoPonto({
      nome: nomeNovoLocal,
      ponto: paraPonto(pontoPendente),
      sentido,
      bidirecional,
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      definirMensagem(MENSAGEM_FORA_DE_SP);
      return;
    }
    aoCriarLocal(resultado.local);
    aoSolicitarRecalculo?.();
    definirPontoPendente(null);
    definirNomeNovoLocal("");
    definirMensagem(null);
  }

  function cancelarCriacao() {
    definirPontoPendente(null);
    definirNomeNovoLocal("");
  }

  function lidarArrasto(local: Local, posicao: Coordenada) {
    const resultado = revalidarArrastoLocal({
      local,
      sentido,
      pontoNovo: paraPonto(posicao),
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      // Ponto NÃO se move: a posição vem de `locais` (prop controlada), que o
      // chamador não alterou — o próximo render devolve o marcador à posição
      // antiga. Sem oferta de "criar Local novo" (DEC-044/Q-025): arrastar não
      // pode descaracterizar o Local; a recusa só informa.
      definirMensagem(
        resultado.motivo === "350m"
          ? `${MENSAGEM_RECUSA_350M_LOCAL} (Local: ${resultado.nomeLocal})`
          : MENSAGEM_FORA_DE_SP,
      );
      return;
    }
    definirMensagem(null);
    aoAtualizarLocal(resultado.local);
    aoSolicitarRecalculo?.();
  }

  function lidarExcluirSentido(local: Local) {
    const resultado = excluirSentidoDoLocal({
      local,
      sentido,
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      // `ponto_unico`: o Local ficaria sem nenhuma geolocalização (RN-032). O
      // botão só é oferecido quando ambos existem, mas o motor blinda o caso.
      definirMensagem(
        resultado.motivo === "fora_de_sp" ? MENSAGEM_FORA_DE_SP : null,
      );
      return;
    }
    definirMensagem(null);
    aoExcluirSentido(resultado.local, sentido);
    aoSolicitarRecalculo?.();
  }

  return (
    <div data-testid="editor-locais" className="flex flex-col gap-4">
      {mensagem ? (
        <p role="alert" data-testid="mensagem-recusa-local" className="text-sm text-erro">
          {mensagem}
        </p>
      ) : null}

      <div
        className="overflow-hidden rounded-painel shadow-sombra-2"
        style={{ width: "100%", height: "60vh" }}
      >
        <Mapa
          marcadores={[...marcadoresLocais, ...marcadorPendente]}
          aoClicar={lidarCliqueNoMapa}
        />
      </div>

      {pontoPendente ? (
        <Painel>
          <div data-testid="form-criar-local" className="flex flex-col gap-4">
            <Campo
              rotulo="Nome do Local"
              data-testid="nome-local-input"
              value={nomeNovoLocal}
              onChange={(evento) => definirNomeNovoLocal(evento.target.value)}
            />
            <div className="flex gap-2">
              <Botao
                variante="primario"
                data-testid="confirmar-criar-local"
                disabled={!nomeNovoLocal.trim()}
                onClick={confirmarCriacao}
              >
                Criar Local
              </Botao>
              <Botao variante="fantasma" onClick={cancelarCriacao}>
                Cancelar
              </Botao>
            </div>
          </div>
        </Painel>
      ) : null}

      <ul data-testid="lista-locais" className="flex flex-col gap-2">
        {locaisDoSentido.map((local) => {
          const bidirecionalAtual = Boolean(
            local.geolocalizacao_ida && local.geolocalizacao_volta,
          );
          return (
            <li
              key={local.uuid}
              data-testid={`local-${local.uuid}`}
              className="flex items-center gap-2 text-sm text-cinza-700"
            >
              {nomeExibicaoLocal(local)}
              {bidirecionalAtual ? (
                <Botao
                  variante="secundario"
                  data-testid={`excluir-sentido-${local.uuid}`}
                  onClick={() => lidarExcluirSentido(local)}
                >
                  Excluir ponto deste sentido
                </Botao>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
