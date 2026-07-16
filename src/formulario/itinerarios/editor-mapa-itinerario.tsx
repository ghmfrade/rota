"use client";

import { useState } from "react";
import type { Local, Secao } from "@/shared/contrato";
import type { Ponto } from "@/shared/geo";
import { Mapa, type Coordenada, type LinhaMapa, type MarcadorMapa } from "@/shared/mapa";
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
} from "@/formulario/secoes";
import {
  criarLocalNoPonto,
  excluirSentidoDoLocal,
  MENSAGEM_RECUSA_350M_LOCAL,
  nomeExibicaoLocal,
  revalidarArrastoLocal,
} from "@/formulario/locais";

// Mapa ÚNICO da etapa de itinerários (TASK-060; Spec 04 §7 — "num mesmo mapa
// interativo"), que funde os antigos `EditorSecoes` e `EditorLocais` (cada um
// com seu próprio `<Mapa>`) num só canvas. Reusa os motores de Seção/Local
// intactos (`fluxos-secao`/`fluxos-local`) — nenhuma regra de 350 m, reuso ou
// derivação de município é reescrita aqui; a task só reorganiza a superfície de
// UI.
//
// Interação decidida em DEC-054 (Q-035): **clique esquerdo cria Seção, clique
// direito cria Local**; marcadores circulares com cores distintas por tipo. O
// gesto de ponto de rota (TASK-063) e a sincronização seleção tabela↔mapa
// (TASK-064) ficam fora desta task. Os componentes `EditorSecoes`/`EditorLocais`
// permanecem para suas demo pages (E2E dos 350 m).

// Cores dos marcadores (tokens do doc 18): Seção azul-700, Local sucesso,
// ponto pendente alerta — inferência controlada (a spec só fixa o visual do
// ponto de rota; a distinção Seção×Local é design sob DEC-050).
const COR_MARCADOR_SECAO = "#1d4ed8";
const COR_MARCADOR_LOCAL = "#16a34a";
const COR_MARCADOR_PENDENTE = "#d97706";

const paraCoordenada = (p: Ponto): Coordenada => ({ lng: p.longitude, lat: p.latitude });
const paraPonto = (c: Coordenada): Ponto => ({ latitude: c.lat, longitude: c.lng });

const geolocDoSentido = (local: Local, sentido: Sentido): Ponto | undefined =>
  sentido === "ida" ? local.geolocalizacao_ida : local.geolocalizacao_volta;

interface CriacaoPendente {
  tipo: "secao" | "local";
  posicao: Coordenada;
}

export interface PropsEditorMapaItinerario {
  /** Seções já existentes no documento (Spec 02 §5) — base do reuso. */
  secoes: readonly Secao[];
  /** Locais do Serviço corrente (Spec 02 §7) — não compartilhados (RN-031). */
  locais: readonly Local[];
  servicoUuid: string;
  sentido: Sentido;
  /** Serviço tem os dois itinerários (Ida e Volta) — RN-026. */
  bidirecional: boolean;
  recursosMunicipio: RecursosMunicipio;
  aoCriarSecao: (secao: Secao) => void;
  aoAtualizarSecao: (secao: Secao) => void;
  aoCriarLocal: (local: Local) => void;
  aoAtualizarLocal: (local: Local) => void;
  /** Exclusão do ponto de um sentido: o Local (já unidirecional) é devolvido e
   * o host remove a Parada daquele sentido (DEC-045). */
  aoExcluirSentido: (local: Local, sentido: Sentido) => void;
  /** Rota ativa do itinerário (`estadoAtual.rota.geometria` convertida — Spec
   * 04 §7.3, RN-046/052), desenhada sobre o mapa; ausente quando `sem-rota`. */
  linhaRota?: LinhaMapa;
}

export function EditorMapaItinerario({
  secoes,
  locais,
  servicoUuid,
  sentido,
  bidirecional,
  recursosMunicipio,
  aoCriarSecao,
  aoAtualizarSecao,
  aoCriarLocal,
  aoAtualizarLocal,
  aoExcluirSentido,
  linhaRota,
}: PropsEditorMapaItinerario) {
  const [mensagemSecao, definirMensagemSecao] = useState<string | null>(null);
  const [mensagemLocal, definirMensagemLocal] = useState<string | null>(null);
  const [criacaoPendente, definirCriacaoPendente] = useState<CriacaoPendente | null>(null);
  const [nomeNovo, definirNomeNovo] = useState("");
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
        id: `secao-${secao.uuid}`,
        posicao: paraCoordenada(ponto),
        forma: "circulo",
        cor: COR_MARCADOR_SECAO,
        arrastavel: true,
        aoArrastar: (posicao: Coordenada) => lidarArrastoSecao(secao, posicao),
      },
    ];
  });

  const locaisDoSentido = locais.filter((local) => geolocDoSentido(local, sentido));

  const marcadoresLocais: MarcadorMapa[] = locaisDoSentido.map((local) => ({
    id: `local-${local.uuid}`,
    // filtrado acima: geoloc do sentido existe.
    posicao: paraCoordenada(geolocDoSentido(local, sentido)!),
    forma: "circulo",
    cor: COR_MARCADOR_LOCAL,
    arrastavel: true,
    aoArrastar: (posicao: Coordenada) => lidarArrastoLocal(local, posicao),
  }));

  const marcadorPendente: MarcadorMapa[] = criacaoPendente
    ? [
        {
          id: "novo-ponto-pendente",
          posicao: criacaoPendente.posicao,
          forma: "circulo",
          cor: COR_MARCADOR_PENDENTE,
        },
      ]
    : [];

  function iniciarCriacao(tipo: "secao" | "local", posicao: Coordenada) {
    definirMensagemSecao(null);
    definirMensagemLocal(null);
    definirCriacaoPendente({ tipo, posicao });
    definirNomeNovo("");
  }

  function confirmarCriacao() {
    if (!criacaoPendente || !nomeNovo.trim()) return;
    if (criacaoPendente.tipo === "secao") {
      const resultado = criarSecaoNoPonto({
        nome: nomeNovo,
        ponto: paraPonto(criacaoPendente.posicao),
        servicoUuid,
        sentido,
        bidirecional,
        features: recursosMunicipio.features,
        nomes: recursosMunicipio.nomes,
      });
      if (!resultado.ok) {
        definirMensagemSecao(MENSAGEM_FORA_DE_SP);
        return;
      }
      aoCriarSecao(resultado.secao);
    } else {
      const resultado = criarLocalNoPonto({
        nome: nomeNovo,
        ponto: paraPonto(criacaoPendente.posicao),
        sentido,
        bidirecional,
        features: recursosMunicipio.features,
        nomes: recursosMunicipio.nomes,
      });
      if (!resultado.ok) {
        definirMensagemLocal(MENSAGEM_FORA_DE_SP);
        return;
      }
      aoCriarLocal(resultado.local);
    }
    definirCriacaoPendente(null);
    definirNomeNovo("");
    definirMensagemSecao(null);
    definirMensagemLocal(null);
  }

  function cancelarCriacao() {
    definirCriacaoPendente(null);
    definirNomeNovo("");
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
      definirMensagemSecao(
        resultado.motivo === "350m" ? MENSAGEM_RECUSA_350M_SECAO : MENSAGEM_FORA_DE_SP,
      );
      return;
    }
    aoAtualizarSecao(resultado.secao);
    definirMensagemSecao(null);
    definirSecaoReusoUuid("");
    definirIndicePontoReuso(0);
  }

  function lidarArrastoSecao(secao: Secao, posicao: Coordenada) {
    const resultado = revalidarArrasto({
      secao,
      servicoUuid,
      sentido,
      pontoNovo: paraPonto(posicao),
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      // Ponto NÃO se move: a posição vem de `secoes` (prop controlada), que o
      // chamador não alterou — o próximo render devolve o marcador à posição
      // antiga (DEC-044/Q-025: arrastar não descaracteriza a Seção).
      definirMensagemSecao(
        resultado.motivo === "350m"
          ? `${MENSAGEM_RECUSA_350M_SECAO} (Seção: ${resultado.nomeSecao})`
          : MENSAGEM_FORA_DE_SP,
      );
      return;
    }
    definirMensagemSecao(null);
    aoAtualizarSecao(resultado.secao);
  }

  function lidarArrastoLocal(local: Local, posicao: Coordenada) {
    const resultado = revalidarArrastoLocal({
      local,
      sentido,
      pontoNovo: paraPonto(posicao),
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      definirMensagemLocal(
        resultado.motivo === "350m"
          ? `${MENSAGEM_RECUSA_350M_LOCAL} (Local: ${resultado.nomeLocal})`
          : MENSAGEM_FORA_DE_SP,
      );
      return;
    }
    definirMensagemLocal(null);
    aoAtualizarLocal(resultado.local);
  }

  function lidarExcluirSentido(local: Local) {
    const resultado = excluirSentidoDoLocal({
      local,
      sentido,
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      // `ponto_unico`: o Local ficaria sem geolocalização (RN-032). O botão só
      // é oferecido quando ambos existem, mas o motor blinda o caso.
      definirMensagemLocal(resultado.motivo === "fora_de_sp" ? MENSAGEM_FORA_DE_SP : null);
      return;
    }
    definirMensagemLocal(null);
    aoExcluirSentido(resultado.local, sentido);
  }

  return (
    <div data-testid="editor-mapa-itinerario" className="flex flex-col gap-4">
      <p data-testid="dica-gestos-mapa" className="text-sm text-cinza-500">
        Clique no mapa para criar uma <strong>Seção</strong>; clique com o botão direito
        para criar um <strong>Local</strong>.
      </p>

      {mensagemSecao ? (
        <p role="alert" data-testid="mensagem-recusa-secao" className="text-sm text-erro">
          {mensagemSecao}
        </p>
      ) : null}
      {mensagemLocal ? (
        <p role="alert" data-testid="mensagem-recusa-local" className="text-sm text-erro">
          {mensagemLocal}
        </p>
      ) : null}

      <div className="h-[60vh] w-full overflow-hidden rounded-painel shadow-sombra-2">
        <Mapa
          marcadores={[...marcadoresSecoes, ...marcadoresLocais, ...marcadorPendente]}
          linhas={linhaRota ? [linhaRota] : []}
          aoClicar={(posicao) => iniciarCriacao("secao", posicao)}
          aoClicarDireito={(posicao) => iniciarCriacao("local", posicao)}
        />
      </div>

      <ul
        data-testid="legenda-marcadores"
        className="flex flex-wrap gap-4 text-sm text-cinza-700"
      >
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-full border-2 border-white bg-azul-700 shadow-sombra-1" />
          Seção
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-full border-2 border-white bg-sucesso shadow-sombra-1" />
          Local
        </li>
      </ul>

      {criacaoPendente?.tipo === "secao" ? (
        <Painel>
          <div data-testid="form-criar-secao" className="flex flex-col gap-4">
            <Campo
              rotulo="Nome da Seção"
              data-testid="nome-secao-input"
              value={nomeNovo}
              onChange={(evento) => definirNomeNovo(evento.target.value)}
            />
            <div className="flex gap-2">
              <Botao
                variante="primario"
                data-testid="confirmar-criar-secao"
                disabled={!nomeNovo.trim()}
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

      {criacaoPendente?.tipo === "local" ? (
        <Painel>
          <div data-testid="form-criar-local" className="flex flex-col gap-4">
            <Campo
              rotulo="Nome do Local"
              data-testid="nome-local-input"
              value={nomeNovo}
              onChange={(evento) => definirNomeNovo(evento.target.value)}
            />
            <div className="flex gap-2">
              <Botao
                variante="primario"
                data-testid="confirmar-criar-local"
                disabled={!nomeNovo.trim()}
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
            <Botao variante="secundario" data-testid="confirmar-reuso" onClick={confirmarReuso}>
              Reutilizar Seção selecionada
            </Botao>
          ) : null}
        </div>
      </Painel>

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
