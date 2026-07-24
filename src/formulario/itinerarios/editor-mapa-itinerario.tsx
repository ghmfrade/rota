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
import { MenuFlutuante } from "@/shared/ui";
import {
  MENSAGEM_FORA_DE_SP,
  MENSAGEM_RECUSA_350M_SECAO,
  revalidarArrasto,
  transladarSecao,
  type RecursosMunicipio,
  type Sentido,
} from "@/formulario/secoes";
import {
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
// ponto pendente alerta e ponto de rota ciano-500 (DEC-057/069). A spec fixa
// o ponto de rota como "vértice pequeno, sem rótulo"; forma/tamanho/cor são
// governados pela DEC-050 e pelo doc 18.
const COR_MARCADOR_SECAO = "#1d4ed8";
const COR_MARCADOR_LOCAL = "#16a34a";
const COR_MARCADOR_PENDENTE = "#d97706";
const COR_MARCADOR_PONTO_DE_ROTA = "var(--color-ciano-500)";
// Cor neutra dos demais pontos do cluster de uma Seção, visíveis só durante
// a translação pelo botão esquerdo (TASK-078; DEC-079) — mesmo canal visual
// do fantasma (opacidade aditiva, doc 18 §2), sem inventar CSS novo.
const COR_MARCADOR_CLUSTER_NEUTRO = "var(--color-cinza-400)";

const paraCoordenada = (p: Ponto): Coordenada => ({ lng: p.longitude, lat: p.latitude });
const paraPonto = (c: Coordenada): Ponto => ({ latitude: c.lat, longitude: c.lng });

const geolocDoSentido = (local: Local, sentido: Sentido): Ponto | undefined =>
  sentido === "ida" ? local.geolocalizacao_ida : local.geolocalizacao_volta;

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
  /** UUIDs de Locais cuja ocorrência é extrema neste itinerário/sentido. */
  locaisInvalidos?: readonly string[];
  servicoUuid: string;
  sentido: Sentido;
  recursosMunicipio: RecursosMunicipio;
  /** Usuário escolheu "Seção"/"Local" no menu de criação (TASK-095; DEC-077):
   * o host é quem monta a linha-formulário na posição de inserção da tabela
   * lateral e chama `criarSecaoNoPonto`/`criarLocalNoPonto` ao confirmar. */
  aoIniciarCriacaoParada: (
    tipo: "secao" | "local",
    posicao: Coordenada,
    posicaoNaLinha?: Coordenada,
  ) => void;
  /** Posição do clique que abriu a criação pendente no host (TASK-095) —
   * mantém o marcador laranja provisório no mapa até confirmar/cancelar. */
  posicaoCriacaoPendente?: Coordenada;
  aoAtualizarSecao: (secao: Secao) => void;
  /** Confirmação da translação da Seção INTEIRA (arrasto pelo botão
   * esquerdo — TASK-078; DEC-061/079): o host reconcilia a cascata de
   * recálculo de TODOS os itinerários (de todos os Serviços) que referenciam
   * a Seção — este componente não conhece outros Serviços, só o corrente. */
  aoTransladarSecao?: (secao: Secao) => void;
  aoAtualizarLocal: (local: Local) => void;
  /** Rota ativa do itinerário (`estadoAtual.rota.geometria` convertida — Spec
   * 04 §7.3, RN-046/052), desenhada sobre o mapa; ausente quando `sem-rota`. */
  linhaRota?: LinhaMapa;
  /** Pontos de rota persistidos do itinerário corrente (Spec 02 §10.4) —
   * exibidos como vértices arrastáveis sobre a linha. A representação na
   * lista lateral unificada pertence ao host (TASK-079/DEC-060). */
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
  /** Chave de seleção corrente (TASK-064; `selecao-itinerario.ts`) — mesmo
   * `id` do marcador selecionado. `null`/ausente: nenhum marcador realçado. */
  selecaoAtual?: string | null;
  /** Clicar num marcador (Seção, Local ou ponto de rota) propaga a seleção
   * ao host, que projeta o realce na linha correspondente da tabela. */
  aoSelecionarMarcador?: (chave: string) => void;
}

export function EditorMapaItinerario({
  secoes,
  locais,
  locaisInvalidos = [],
  servicoUuid,
  sentido,
  recursosMunicipio,
  aoIniciarCriacaoParada,
  posicaoCriacaoPendente,
  aoAtualizarSecao,
  aoTransladarSecao,
  aoAtualizarLocal,
  linhaRota,
  pontosDeRota = [],
  aoCriarPontoDeRota,
  aoMoverPontoDeRota,
  selecaoAtual = null,
  aoSelecionarMarcador,
}: PropsEditorMapaItinerario) {
  const [mensagemSecao, definirMensagemSecao] = useState<string | null>(null);
  const [mensagemLocal, definirMensagemLocal] = useState<string | null>(null);
  const [menuCriacao, definirMenuCriacao] = useState<MenuCriacaoPendente | null>(null);
  const [preVisualizacao, definirPreVisualizacao] = useState<{
    linha: LinhaMapa;
    posicao: Coordenada;
  } | null>(null);
  // Seção em translação (arrasto pelo botão esquerdo — TASK-078; DEC-079):
  // efêmero, só para revelar os demais pontos do cluster em cor neutra
  // durante o gesto (aceite da task), nunca persistido (RN-096).
  const [secaoEmTranslacaoUuid, definirSecaoEmTranslacaoUuid] = useState<string | null>(null);

  const marcadoresSecoes: MarcadorMapa[] = secoes.flatMap((secao) => {
    const entrada = secao.servicos.find((s) => s.servico_uuid === servicoUuid);
    const ponto =
      sentido === "ida" ? entrada?.geolocalizacao_ida : entrada?.geolocalizacao_volta;
    if (!ponto) return [];
    const id = `secao-${secao.uuid}`;
    return [
      {
        id,
        posicao: paraCoordenada(ponto),
        forma: "quadrado",
        cor: COR_MARCADOR_SECAO,
        arrastavel: true,
        selecionado: selecaoAtual === id,
        // Botão ESQUERDO (nativo do MapLibre): translação da Seção inteira
        // (DEC-079). Botão DIREITO (custom — TASK-078): continua movendo só
        // o ponto do Serviço/sentido corrente (DEC-044, comportamento de
        // hoje, só migrado de botão).
        aoArrastar: (posicao: Coordenada) => lidarTransladarSecao(secao, ponto, posicao),
        aoArrastarComBotaoDireito: (posicao: Coordenada) => lidarArrastoSecao(secao, posicao),
        aoIniciarArrasto: () => definirSecaoEmTranslacaoUuid(secao.uuid),
        aoFinalizarArrasto: () => definirSecaoEmTranslacaoUuid(null),
        aoSelecionar: () => aoSelecionarMarcador?.(id),
      },
    ];
  });

  // Demais pontos do cluster da Seção em translação (TASK-078; DEC-061/079,
  // aceite: "os demais pontos ficam visíveis em cor neutra durante o
  // arrasto"), excluindo o ponto já mostrado como o marcador ativo acima.
  // Estáticos nas posições ANTES do gesto (não seguem o vetor ao vivo — a
  // TASK-097 corrigiu justamente um re-render em pleno arrasto reposicionar
  // o marcador ativo; os pontos neutros, decorativos, não repetem o risco).
  // Não-interativos (`fantasma`): reaproveita o canal visual já existente
  // (opacidade aditiva) em vez de CSS novo (doc 18 regra 3/4).
  const secaoEmTranslacao = secaoEmTranslacaoUuid
    ? secoes.find((s) => s.uuid === secaoEmTranslacaoUuid)
    : undefined;
  const marcadoresClusterSecao: MarcadorMapa[] = secaoEmTranslacao
    ? secaoEmTranslacao.servicos.flatMap((entradaCluster) => {
        const pontosDaEntrada: { sentidoDoPonto: Sentido; ponto: Ponto }[] = [
          ...(entradaCluster.geolocalizacao_ida
            ? [{ sentidoDoPonto: "ida" as const, ponto: entradaCluster.geolocalizacao_ida }]
            : []),
          ...(entradaCluster.geolocalizacao_volta
            ? [{ sentidoDoPonto: "volta" as const, ponto: entradaCluster.geolocalizacao_volta }]
            : []),
        ];
        return pontosDaEntrada
          .filter(
            ({ sentidoDoPonto }) =>
              !(entradaCluster.servico_uuid === servicoUuid && sentidoDoPonto === sentido),
          )
          .map(({ sentidoDoPonto, ponto }) => ({
            id: `secao-cluster-${secaoEmTranslacao.uuid}-${entradaCluster.servico_uuid}-${sentidoDoPonto}`,
            posicao: paraCoordenada(ponto),
            forma: "quadrado" as const,
            cor: COR_MARCADOR_CLUSTER_NEUTRO,
            fantasma: true,
          }));
      })
    : [];

  const locaisDoSentido = locais.filter((local) => geolocDoSentido(local, sentido));

  const uuidsLocaisInvalidos = new Set(locaisInvalidos);
  const marcadoresLocais: MarcadorMapa[] = locaisDoSentido.map((local) => {
    const id = `local-${local.uuid}`;
    return {
      id,
      // filtrado acima: geoloc do sentido existe.
      posicao: paraCoordenada(geolocDoSentido(local, sentido)!),
      forma: "circulo",
      tamanho: "medio",
      cor: COR_MARCADOR_LOCAL,
      invalido: uuidsLocaisInvalidos.has(local.uuid),
      arrastavel: true,
      selecionado: selecaoAtual === id,
      aoArrastar: (posicao: Coordenada) => lidarArrastoLocal(local, posicao),
      aoSelecionar: () => aoSelecionarMarcador?.(id),
    };
  });

  const marcadorPendente: MarcadorMapa[] = posicaoCriacaoPendente
    ? [
        {
          id: "novo-ponto-pendente",
          posicao: posicaoCriacaoPendente,
          forma: "circulo",
          cor: COR_MARCADOR_PENDENTE,
        },
      ]
    : [];

  // Vértices de ponto de rota (TASK-063; Spec 04 §7.3 — "vértice pequeno
  // sobre a linha, sem rótulo"): identificados pelo índice no array
  // `pontosDeRota` (RN-042 — ponto de rota não tem `uuid`, não é entidade
  // comparável; a posição no array É a identidade dentro do gesto).
  const marcadoresPontosDeRota: MarcadorMapa[] = pontosDeRota.map((ponto, indice) => {
    const id = `ponto-rota-${indice}`;
    return {
      id,
      posicao: { lng: ponto.longitude, lat: ponto.latitude },
      forma: "circulo",
      tamanho: "pequeno",
      cor: COR_MARCADOR_PONTO_DE_ROTA,
      arrastavel: true,
      selecionado: selecaoAtual === id,
      aoArrastar: (posicao: Coordenada) => aoMoverPontoDeRota?.(indice, posicao),
      aoSelecionar: () => aoSelecionarMarcador?.(id),
    };
  });

  const marcadorFantasma: MarcadorMapa[] =
    linhaRota &&
    aoCriarPontoDeRota &&
    preVisualizacao?.linha === linhaRota
      ? [
          {
            id: "ponto-rota-fantasma",
            posicao: preVisualizacao.posicao,
            forma: "circulo",
            tamanho: "pequeno",
            cor: COR_MARCADOR_PONTO_DE_ROTA,
            fantasma: true,
          },
        ]
      : [];

  function abrirMenuCriacao(
    posicao: Coordenada,
    ancoraTela: AncoraTelaMapa,
    sobreLinha: boolean,
  ) {
    definirMensagemSecao(null);
    definirMensagemLocal(null);
    definirMenuCriacao({ posicao, ancoraTela, sobreLinha });
  }

  function escolherTipoCriacao(tipo: "secao" | "local") {
    if (!menuCriacao) return;
    aoIniciarCriacaoParada(
      tipo,
      menuCriacao.posicao,
      menuCriacao.sobreLinha ? menuCriacao.posicao : undefined,
    );
    definirMenuCriacao(null);
  }

  // Botão ESQUERDO (DEC-079): translação rígida da Seção inteira. `soltar
  // sem deslocamento efetivo... cancela... sem efeito" (aceite da task) —
  // vetor nulo não chama `transladarSecao` nem `aoTransladarSecao` (sem
  // chamada OSRM para um gesto que não moveu nada).
  function lidarTransladarSecao(secao: Secao, pontoOriginal: Ponto, posicaoSolta: Coordenada) {
    const pontoNovo = paraPonto(posicaoSolta);
    const vetor: Ponto = {
      latitude: pontoNovo.latitude - pontoOriginal.latitude,
      longitude: pontoNovo.longitude - pontoOriginal.longitude,
    };
    if (vetor.latitude === 0 && vetor.longitude === 0) return;

    const resultado = transladarSecao({
      secao,
      vetor,
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      // Destino fora de SP → recusa INTEGRAL: nenhum ponto se move (o
      // chamador não alterou `secoes`, o próximo render devolve o marcador).
      definirMensagemSecao(MENSAGEM_FORA_DE_SP);
      return;
    }
    definirMensagemSecao(null);
    aoTransladarSecao?.(resultado.secao);
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
            ...marcadoresClusterSecao,
            ...marcadoresLocais,
            ...marcadorPendente,
            ...marcadoresPontosDeRota,
            ...marcadorFantasma,
          ]}
          linhas={linhaRota ? [linhaRota] : []}
          aoClicarNaLinha={aoCriarPontoDeRota}
          aoMoverSobreLinha={
            linhaRota && aoCriarPontoDeRota
              ? (posicao) =>
                  definirPreVisualizacao(
                    posicao ? { linha: linhaRota, posicao } : null,
                  )
              : undefined
          }
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

      <ul data-testid="lista-locais" className="flex flex-col gap-2">
        {locaisDoSentido.map((local) => (
          <li
            key={local.uuid}
            data-testid={`local-${local.uuid}`}
            className="flex items-center gap-2 text-sm text-cinza-700"
          >
            {nomeExibicaoLocal(local)}
          </li>
        ))}
      </ul>
    </div>
  );
}
