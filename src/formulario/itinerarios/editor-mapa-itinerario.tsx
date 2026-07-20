"use client";

import { useState } from "react";
import type { Local, PontoDeRota, Secao } from "@/shared/contrato";
import type { Ponto } from "@/shared/geo";
import {
  Mapa,
  type AncoraTelaMapa,
  type Coordenada,
  type LinhaMapa,
  type MarcadorMapa,
} from "@/shared/mapa";
import { Botao, Campo, MenuFlutuante, Painel } from "@/shared/ui";
import {
  criarSecaoNoPonto,
  MENSAGEM_FORA_DE_SP,
  MENSAGEM_RECUSA_350M_SECAO,
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
import { ALTURA_MAPA_CLASSE } from "./altura-mapa";

// Mapa ÚNICO da etapa de itinerários (TASK-060; Spec 04 §7 — "num mesmo mapa
// interativo"), que funde os antigos `EditorSecoes` e `EditorLocais` (cada um
// com seu próprio `<Mapa>`) num só canvas. Reusa os motores de Seção/Local
// intactos (`fluxos-secao`/`fluxos-local`) — nenhuma regra de 350 m, reuso ou
// derivação de município é reescrita aqui; a task só reorganiza a superfície de
// UI.
//
// Interação decidida em DEC-055 (TASK-065): clique esquerdo SOBRE A LINHA cria
// ponto de rota; fora dela não cria nada. Clique direito, sobre ou fora da
// linha, abre o menu Seção/Local. A inserção posicional é da TASK-067 — aqui
// toda Parada nova continua indo para o fim. A sincronização seleção
// tabela↔mapa (TASK-064) também permanece fora deste escopo.

// Cores dos marcadores (tokens do doc 18): Seção azul-700, Local sucesso,
// ponto pendente alerta, ponto de rota cinza-700 — inferência controlada (a
// spec só fixa o visual do ponto de rota como "vértice pequeno, sem rótulo";
// a distinção Seção×Local×ponto-de-rota é design sob DEC-050).
const COR_MARCADOR_SECAO = "#1d4ed8";
const COR_MARCADOR_LOCAL = "#16a34a";
const COR_MARCADOR_PENDENTE = "#d97706";
const COR_MARCADOR_PONTO_DE_ROTA = "#334155";

const paraCoordenada = (p: Ponto): Coordenada => ({ lng: p.longitude, lat: p.latitude });
const paraPonto = (c: Coordenada): Ponto => ({ latitude: c.lat, longitude: c.lng });

const geolocDoSentido = (local: Local, sentido: Sentido): Ponto | undefined =>
  sentido === "ida" ? local.geolocalizacao_ida : local.geolocalizacao_volta;

interface CriacaoPendente {
  tipo: "secao" | "local";
  posicao: Coordenada;
  /** Presente somente quando o `contextmenu` acertou a linha da rota
   * (TASK-067/DEC-055). O host converte a coordenada no índice da Parada. */
  posicaoNaLinha?: Coordenada;
}

interface MenuCriacaoPendente {
  posicao: Coordenada;
  ancoraTela: AncoraTelaMapa;
  sobreLinha: boolean;
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
  aoCriarSecao: (secao: Secao, posicaoNaLinha?: Coordenada) => void;
  aoAtualizarSecao: (secao: Secao) => void;
  aoCriarLocal: (local: Local, posicaoNaLinha?: Coordenada) => void;
  aoAtualizarLocal: (local: Local) => void;
  /** Exclusão do ponto de um sentido: o Local (já unidirecional) é devolvido e
   * o host remove a Parada daquele sentido (DEC-045). */
  aoExcluirSentido: (local: Local, sentido: Sentido) => void;
  /** Rota ativa do itinerário (`estadoAtual.rota.geometria` convertida — Spec
   * 04 §7.3, RN-046/052), desenhada sobre o mapa; ausente quando `sem-rota`. */
  linhaRota?: LinhaMapa;
  /** Pontos de rota persistidos do itinerário corrente (Spec 02 §10.4) —
   * exibidos como vértices arrastáveis sobre a linha e na sub-lista própria
   * (Spec 04 §7.3: "não entra na tabela de paradas"). */
  pontosDeRota?: readonly PontoDeRota[];
  /** Clique esquerdo SOBRE a linha da rota (TASK-063; Spec 04 §7.3 item 6;
   * DEC-055): o host ancora a coordenada ao trecho correto e insere o novo
   * ponto de rota. Ausente enquanto não há `linhaRota` (sem rota, sem linha
   * para clicar). */
  aoCriarPontoDeRota?: (posicao: Coordenada) => void;
  /** Arrastar e soltar um vértice de ponto de rota (índice no array
   * `pontosDeRota`), disparando o recálculo (RN-052). */
  aoMoverPontoDeRota?: (indice: number, posicao: Coordenada) => void;
  /** Remover o ponto de rota do índice, disparando o recálculo (Spec 04
   * §7.3 item 5). */
  aoRemoverPontoDeRota?: (indice: number) => void;
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
  pontosDeRota = [],
  aoCriarPontoDeRota,
  aoMoverPontoDeRota,
  aoRemoverPontoDeRota,
}: PropsEditorMapaItinerario) {
  const [mensagemSecao, definirMensagemSecao] = useState<string | null>(null);
  const [mensagemLocal, definirMensagemLocal] = useState<string | null>(null);
  const [criacaoPendente, definirCriacaoPendente] = useState<CriacaoPendente | null>(null);
  const [menuCriacao, definirMenuCriacao] = useState<MenuCriacaoPendente | null>(null);
  const [nomeNovo, definirNomeNovo] = useState("");

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

  // Vértices de ponto de rota (TASK-063; Spec 04 §7.3 — "vértice pequeno
  // sobre a linha, sem rótulo"): identificados pelo índice no array
  // `pontosDeRota` (RN-042 — ponto de rota não tem `uuid`, não é entidade
  // comparável; a posição no array É a identidade dentro do gesto).
  const marcadoresPontosDeRota: MarcadorMapa[] = pontosDeRota.map((ponto, indice) => ({
    id: `ponto-rota-${indice}`,
    posicao: { lng: ponto.longitude, lat: ponto.latitude },
    forma: "circulo",
    tamanho: "pequeno",
    cor: COR_MARCADOR_PONTO_DE_ROTA,
    arrastavel: true,
    aoArrastar: (posicao: Coordenada) => aoMoverPontoDeRota?.(indice, posicao),
  }));

  function iniciarCriacao(
    tipo: "secao" | "local",
    posicao: Coordenada,
    posicaoNaLinha?: Coordenada,
  ) {
    definirMensagemSecao(null);
    definirMensagemLocal(null);
    definirCriacaoPendente({ tipo, posicao, posicaoNaLinha });
    definirNomeNovo("");
  }

  function abrirMenuCriacao(
    posicao: Coordenada,
    ancoraTela: AncoraTelaMapa,
    sobreLinha: boolean,
  ) {
    definirMensagemSecao(null);
    definirMensagemLocal(null);
    definirCriacaoPendente(null);
    definirNomeNovo("");
    definirMenuCriacao({ posicao, ancoraTela, sobreLinha });
  }

  function escolherTipoCriacao(tipo: "secao" | "local") {
    if (!menuCriacao) return;
    iniciarCriacao(
      tipo,
      menuCriacao.posicao,
      menuCriacao.sobreLinha ? menuCriacao.posicao : undefined,
    );
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
      aoCriarSecao(resultado.secao, criacaoPendente.posicaoNaLinha);
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
      aoCriarLocal(resultado.local, criacaoPendente.posicaoNaLinha);
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
        Clique sobre a linha da rota para criar um <strong>ponto de rota</strong>. Clique
        com o botão direito no mapa e escolha <strong>Seção</strong> ou{" "}
        <strong>Local</strong>. O clique esquerdo fora da linha apenas movimenta o mapa.
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

      <div className={`${ALTURA_MAPA_CLASSE} w-full overflow-hidden rounded-painel shadow-sombra-2`}>
        <Mapa
          marcadores={[
            ...marcadoresSecoes,
            ...marcadoresLocais,
            ...marcadorPendente,
            ...marcadoresPontosDeRota,
          ]}
          linhas={linhaRota ? [linhaRota] : []}
          aoClicarNaLinha={aoCriarPontoDeRota}
          aoClicarDireito={(posicao, ancoraTela) =>
            abrirMenuCriacao(posicao, ancoraTela, false)
          }
          aoClicarDireitoNaLinha={(posicao, ancoraTela) =>
            abrirMenuCriacao(posicao, ancoraTela, true)
          }
        />
      </div>

      {menuCriacao ? (
        <MenuFlutuante
          data-testid="menu-criar-parada"
          rotuloAcessivel="Escolher tipo de Parada"
          ancora={menuCriacao.ancoraTela}
          aoFechar={() => definirMenuCriacao(null)}
          opcoes={[
            {
              id: "secao",
              rotulo: "Seção",
              aoSelecionar: () => escolherTipoCriacao("secao"),
            },
            {
              id: "local",
              rotulo: "Local",
              aoSelecionar: () => escolherTipoCriacao("local"),
            },
          ]}
        />
      ) : null}

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

      {/* Sub-lista PRÓPRIA dos pontos de rota (Spec 04 §7.3: "não entra na
          tabela de paradas; aparece em sub-lista própria") — sem nome, sem
          município, identificados só pela posição (RN-042, sem `uuid`). */}
      <ul data-testid="sub-lista-pontos-de-rota" className="flex flex-col gap-2">
        {pontosDeRota.map((ponto, indice) => (
          <li
            key={indice}
            data-testid="ponto-rota-item"
            className="flex items-center gap-2 text-sm text-cinza-700"
          >
            Ponto de rota {indice + 1} ({ponto.latitude.toFixed(5)}, {ponto.longitude.toFixed(5)})
            <Botao
              variante="secundario"
              data-testid="remover-ponto-rota"
              onClick={() => aoRemoverPontoDeRota?.(indice)}
            >
              Remover
            </Botao>
          </li>
        ))}
      </ul>
    </div>
  );
}
