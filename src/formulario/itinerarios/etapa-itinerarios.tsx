"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import type { Local, PontoDeRota, Secao, Servico } from "@/shared/contrato";
import { esquemaRota } from "@/shared/contrato";
import {
  carregarBaseMunicipios,
  carregarGeojsonMunicipios,
} from "@/shared/dados-estaticos";
import { indiceDeNomes } from "@/shared/geo";
import { ancorarPontoNaRota, linhaDaGeometria, type Coordenada, type LinhaMapa } from "@/shared/mapa";
import {
  nomeExibicaoSecao,
  type RecursosMunicipio,
  type Sentido,
} from "@/formulario/secoes";
import { nomeExibicaoLocal } from "@/formulario/locais";
import { EditorMapaItinerario } from "./editor-mapa-itinerario";
import { PainelDescricaoItinerario } from "@/formulario/descricao";
import {
  congelarRotaCarregada,
  inserirPontoDeRota,
  mensagemDeFalha,
  moverPontoDeRota,
  removerPontoDeRota,
} from "@/formulario/roteamento";
import { Botao, Painel, Select, Tabela } from "@/shared/ui";
import { matrizDistanciasDoServico } from "@/formulario/matrizes";
import {
  comServicosDaSessao,
  identidadeDaSessao,
  secoesDaSessao,
  servicosDaSessao,
  servicosEmConstrucaoDaSessao,
  type Direcionalidade,
  type EstadosRotaVivaPorItinerario,
  type ParadasEmEdicaoPorItinerario,
  type SessaoFormulario,
} from "@/formulario/sessao";
import {
  chaveItinerario,
  dispararRecalculo,
} from "./estado-itinerarios";
import { promoverServicoNaSessao } from "./promocao-servico";
import {
  conjuntoSecoesConsistente,
  inserirParada,
  paradaDeLocal,
  paradaDeSecao,
  paradasEmEdicaoDeContrato,
  paradasParaContrato,
  removerParada,
  removerParadasDeLocal,
  reordenarParada,
  resolverParadasRota,
  type ParadaEmEdicao,
  type ViolacaoMontagem,
} from "./motor-montagem";

// Etapa real "Seções, Locais e Itinerários" (TASK-019; Spec 04 §7.1–§7.4). É a
// etapa que MONTA o mapa único de itinerários (`EditorMapaItinerario`, TASK-060)
// e o `PainelDescricaoItinerario` (TASK-025/DEC-046), acrescentando o que só ela
// sabe: seleção de Serviço/sentido, a sequência ordenada de paradas (tabela
// lateral, Spec 04 §7.3 item 3) e o disparo do recálculo ao vivo (RN-052) que
// injeta o `comporDescricao` REAL desde o início (DEC-046) — fecha o fio da
// TASK-044 (`ItinerarioAoVivo` → `coletarPendencias`, ver `docs-dev/06`
// "Obrigação de fiação"). Também consome o sinal de exclusão de sentido de Local
// (DEC-045): a Parada correspondente sai do itinerário daquele sentido.
//
// TASK-060 (DEC-054): Seções e Locais são lançados num MESMO mapa interativo
// (Spec 04 §7) — clique esquerdo cria Seção, clique direito cria Local —, com a
// tabela de paradas LATERAL ao mapa (doc 18 §87). Substitui os dois mapas
// empilhados de `EditorSecoes`/`EditorLocais` (que seguem apenas em suas demo
// pages). Os mesmos handlers de recálculo ao vivo são repassados ao novo
// componente.

type Rota = z.infer<typeof esquemaRota>;

interface LinhaItinerarios {
  servicoUuid: string;
  numeroN: string;
  completo: boolean;
  sentidos: Sentido[];
  locais: Local[];
}

function sentidosDeDirecionalidade(direcionalidade: Direcionalidade): Sentido[] {
  return direcionalidade === "ambos" ? ["ida", "volta"] : [direcionalidade];
}

const ROTULO_SENTIDO: Record<Sentido, string> = { ida: "Ida", volta: "Volta" };

interface PropsEtapaItinerarios {
  sessao: SessaoFormulario;
  aoAtualizarSessao: (sessao: SessaoFormulario) => void;
}

export function EtapaItinerarios({ sessao, aoAtualizarSessao }: PropsEtapaItinerarios) {
  const [recursosMunicipio, definirRecursosMunicipio] = useState<RecursosMunicipio | null>(null);
  const [erroRecursos, definirErroRecursos] = useState<string | null>(null);
  const [servicoSelecionado, definirServicoSelecionado] = useState<string | null>(null);
  const [sentidoSelecionado, definirSentidoSelecionado] = useState<Sentido | null>(null);
  const [recalculando, definirRecalculando] = useState(false);
  // Violações da ÚLTIMA tentativa de montagem por itinerário (TASK-047; RN-034/
  // 035/036) — feedback efêmero de por que o recálculo não ocorreu; nunca vai
  // para a sessão/documento (não é pendência de §11, que só cobre itinerário
  // completo — Spec 04 §11).
  const [violacoesMontagemMapa, definirViolacoesMontagemMapa] = useState<
    Record<string, ViolacaoMontagem[]>
  >({});

  // "Latest ref" da sessão (padrão para ler o estado mais recente de dentro de
  // uma continuação assíncrona — o `await dispararRecalculo` abaixo atravessa
  // pelo menos um ciclo de render; por quando ele resolve, React já comitou
  // qualquer commit síncrono anterior e re-renderizou com o `sessao` fresco).
  const sessaoRef = useRef(sessao);
  useEffect(() => {
    sessaoRef.current = sessao;
  }, [sessao]);

  useEffect(() => {
    let ativo = true;
    Promise.all([carregarGeojsonMunicipios(), carregarBaseMunicipios()])
      .then(([geojson, base]) => {
        if (!ativo) return;
        definirRecursosMunicipio({
          features: geojson.features,
          nomes: indiceDeNomes(base.municipios),
        });
      })
      .catch((erro: unknown) => {
        if (ativo) {
          definirErroRecursos(erro instanceof Error ? erro.message : String(erro));
        }
      });
    return () => {
      ativo = false;
    };
  }, []);

  const identidade = identidadeDaSessao(sessao);
  const secoes = secoesDaSessao(sessao);

  // `servicosDaSessao` cobre o documento carregado E os Serviços já
  // promovidos no modo "novo" (DEC-053; TASK-061) — caminho único.
  const linhasCompletas: LinhaItinerarios[] = servicosDaSessao(sessao).map((s) => ({
    servicoUuid: s.uuid,
    numeroN: s.numero_n,
    completo: true,
    sentidos: s.itinerarios.map((i) => i.sentido),
    locais: s.locais,
  }));

  const linhasConstrucao: LinhaItinerarios[] = servicosEmConstrucaoDaSessao(sessao).map((s) => ({
    servicoUuid: s.uuid,
    numeroN: s.numero_n,
    completo: false,
    sentidos: sentidosDeDirecionalidade(s.direcionalidade),
    locais: s.locais ?? [],
  }));

  const linhas = [...linhasCompletas, ...linhasConstrucao];
  const linhaAtual = linhas.find((l) => l.servicoUuid === servicoSelecionado) ?? null;
  const bidirecional = (linhaAtual?.sentidos.length ?? 0) === 2;

  const paradasEmEdicaoMapa: ParadasEmEdicaoPorItinerario = sessao.paradasEmEdicao ?? {};
  const estadosRotaVivaMapa: EstadosRotaVivaPorItinerario = sessao.estadosRotaViva ?? {};

  function itinerarioCarregado(servicoUuid: string, sentido: Sentido) {
    const servico = servicosDaSessao(sessao).find((s) => s.uuid === servicoUuid);
    return servico?.itinerarios.find((i) => i.sentido === sentido);
  }

  function paradasDe(servicoUuid: string, sentido: Sentido): ParadaEmEdicao[] {
    const chave = chaveItinerario(servicoUuid, sentido);
    if (paradasEmEdicaoMapa[chave] !== undefined) return paradasEmEdicaoMapa[chave];
    const itinerario = itinerarioCarregado(servicoUuid, sentido);
    return itinerario ? paradasEmEdicaoDeContrato(itinerario.paradas) : [];
  }

  function estadoDe(servicoUuid: string, sentido: Sentido) {
    const chave = chaveItinerario(servicoUuid, sentido);
    if (estadosRotaVivaMapa[chave] !== undefined) return estadosRotaVivaMapa[chave];
    const itinerario = itinerarioCarregado(servicoUuid, sentido);
    return itinerario ? congelarRotaCarregada(itinerario.rota) : undefined;
  }

  const paradasAtual = useMemo(
    () => (linhaAtual && sentidoSelecionado ? paradasDe(linhaAtual.servicoUuid, sentidoSelecionado) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linhaAtual, sentidoSelecionado, paradasEmEdicaoMapa, sessao],
  );
  const estadoAtual = linhaAtual && sentidoSelecionado ? estadoDe(linhaAtual.servicoUuid, sentidoSelecionado) : undefined;
  const violacoesMontagemAtual: ViolacaoMontagem[] =
    linhaAtual && sentidoSelecionado
      ? (violacoesMontagemMapa[chaveItinerario(linhaAtual.servicoUuid, sentidoSelecionado)] ?? [])
      : [];
  // Pontos de rota persistidos a reaplicar no recálculo (Spec 03 §3.6.2) — o
  // último `rota` conhecido (congelada do arquivo ou da última recomputação
  // desta sessão). A EDIÇÃO de pontos de rota é a TASK-023 (fora de escopo);
  // esta task só os REAPLICA para não perder o traçado forçado na reedição.
  const pontosDeRotaAtual =
    estadoAtual && (estadoAtual.situacao === "congelada" || estadoAtual.situacao === "recalculada")
      ? estadoAtual.rota.pontos_de_rota
      : [];

  // Rota ativa desenhada no mapa (TASK-059; Spec 04 §7.3, RN-046/052) — só a
  // LineString congelada/recalculada; em `sem-rota` (RN-048) nenhuma linha é
  // passada, sem disparar OSRM (a leitura é do estado já resolvido).
  const linhaRotaAtual: LinhaMapa | undefined =
    estadoAtual && (estadoAtual.situacao === "congelada" || estadoAtual.situacao === "recalculada")
      ? linhaDaGeometria("rota-ativa", estadoAtual.rota.geometria)
      : undefined;

  const paradasOutroSentido =
    linhaAtual && sentidoSelecionado && bidirecional
      ? paradasDe(linhaAtual.servicoUuid, sentidoSelecionado === "ida" ? "volta" : "ida")
      : undefined;
  const conjuntoConsistente = bidirecional
    ? conjuntoSecoesConsistente(
        sentidoSelecionado === "ida" ? paradasAtual : paradasOutroSentido,
        sentidoSelecionado === "volta" ? paradasAtual : paradasOutroSentido,
      )
    : true;

  // Funções PURAS de composição de sessão (base → próxima base), usadas para
  // dobrar várias mudanças (Seção/Local + paradas) num ÚNICO `aoAtualizarSessao`
  // por gesto. `EditorSecoes`/`EditorLocais` disparam DOIS callbacks em
  // sequência síncrona no mesmo gesto (ex.: `aoCriarSecao` + `aoSolicitarRecalculo`,
  // ambos herdados de TASK-017/018) — se cada um chamasse `aoAtualizarSessao`
  // separadamente, o segundo apagaria o primeiro (os dois partiriam da MESMA
  // sessão fechada antes de qualquer commit). Por isso esta etapa NÃO usa o
  // callback `aoSolicitarRecalculo` daqueles editores (viraria um segundo commit
  // redundante) — cada gesto entra por exatamente UMA chamada a
  // `aplicarNovasParadas`, que já dispara o recálculo.
  function comSecoesAtualizadas(base: SessaoFormulario, secoesAtualizadas: Secao[]): SessaoFormulario {
    return base.modo === "carregado"
      ? { ...base, documento: { ...base.documento, autos: { ...base.documento.autos, secoes: secoesAtualizadas } } }
      : { ...base, secoesEmConstrucao: secoesAtualizadas };
  }

  function comLocaisAtualizados(base: SessaoFormulario, locaisAtualizados: Local[]): SessaoFormulario {
    if (!linhaAtual) return base;
    if (linhaAtual.completo && base.modo === "carregado") {
      const servicos = base.documento.autos.servicos.map((s) =>
        s.uuid === linhaAtual.servicoUuid ? { ...s, locais: locaisAtualizados } : s,
      );
      return { ...base, documento: { ...base.documento, autos: { ...base.documento.autos, servicos } } };
    }
    if (base.modo === "novo") {
      const lista = (base.servicosEmConstrucao ?? []).map((s) =>
        s.uuid === linhaAtual.servicoUuid ? { ...s, locais: locaisAtualizados } : s,
      );
      return { ...base, servicosEmConstrucao: lista };
    }
    return base;
  }

  /**
   * Grava a rota/paradas recalculadas do itinerário de um Serviço já COMPLETO
   * (documento carregado, ou já promovido no modo "novo" — DEC-053; TASK-061)
   * e, no MESMO commit, reconcilia `matriz_distancias` do Serviço (TASK-026;
   * RN-054..057, Spec 04 §9.1/§11 — recálculo automático "ao concluir a
   * edição do itinerário"). Reconciliar aqui, e não como um commit separado,
   * evita a janela em que o documento teria uma rota nova com a matriz antiga.
   */
  function servicosComItinerarioAtualizado(
    base: Servico[],
    servicoUuid: string,
    sentido: Sentido,
    paradas: ParadaEmEdicao[],
    rota: Rota,
  ): Servico[] {
    return base.map((s) => {
      if (s.uuid !== servicoUuid) return s;
      const itinerarios = s.itinerarios.map((it) =>
        it.sentido === sentido ? { ...it, paradas: paradasParaContrato(paradas), rota } : it,
      );
      const servicoAtualizado = { ...s, itinerarios };
      return {
        ...servicoAtualizado,
        matriz_distancias: matrizDistanciasDoServico(servicoAtualizado),
      };
    });
  }

  /**
   * Comita a nova sequência de paradas imediatamente (RN-052: reordenar/
   * inserir/remover é aplicado na tabela na hora) e dispara o recálculo ao
   * vivo (assíncrono) — sucesso grava a rota nova; falha só acende a
   * pendência ao vivo, sem apagar a última rota válida do documento (RN-048).
   * `opcoes.aoComitarBase` dobra uma mudança de Seção/Local NO MESMO commit
   * síncrono (ver nota acima); `secoesParaResolver`/`locaisParaResolver`
   * (default: os arrays já renderizados) são os que `dispararRecalculo`
   * efetivamente resolve — precisam incluir a entidade recém-criada/atualizada
   * quando `aoComitarBase` a introduz, senão a resolução (RN-036) não a encontra.
   */
  async function aplicarNovasParadas(
    novasParadas: ParadaEmEdicao[],
    opcoes: {
      secoesParaResolver?: Secao[];
      locaisParaResolver?: Local[];
      aoComitarBase?: (base: SessaoFormulario) => SessaoFormulario;
      /** Pontos de rota a reaplicar neste recálculo (Spec 03 §3.6.2). Default:
       * os do último estado conhecido — a maioria dos gestos (Seção/Local/
       * reordenar) não toca pontos de rota; só os handlers de ponto de rota
       * (TASK-063) passam a lista já atualizada. */
      pontosDeRota?: readonly PontoDeRota[];
    } = {},
  ) {
    if (!linhaAtual || !sentidoSelecionado || !recursosMunicipio) return;
    const chave = chaveItinerario(linhaAtual.servicoUuid, sentidoSelecionado);

    const base = opcoes.aoComitarBase ? opcoes.aoComitarBase(sessao) : sessao;
    const paradasMapa = { ...(base.paradasEmEdicao ?? {}), [chave]: novasParadas };
    aoAtualizarSessao({ ...base, paradasEmEdicao: paradasMapa });

    definirRecalculando(true);
    const resultado = await dispararRecalculo(
      novasParadas,
      opcoes.secoesParaResolver ?? secoes,
      opcoes.locaisParaResolver ?? linhaAtual.locais,
      linhaAtual.servicoUuid,
      sentidoSelecionado,
      opcoes.pontosDeRota ?? pontosDeRotaAtual,
    );
    definirRecalculando(false);

    if (!resultado.ok) {
      // Itinerário ainda em montagem (RN-034/035/036) — sem pendência
      // prematura (§11), mas o motivo da recusa é exibido (TASK-047) em vez de
      // descartado silenciosamente.
      definirViolacoesMontagemMapa((mapa) => ({ ...mapa, [chave]: resultado.violacoes }));
      return;
    }
    definirViolacoesMontagemMapa((mapa) => {
      if (!(chave in mapa)) return mapa;
      const resto = { ...mapa };
      delete resto[chave];
      return resto;
    });

    // Mescla sobre a sessão MAIS RECENTE (`sessaoRef`), não a fechada por este
    // closure — o `await` acima atravessa um ciclo de render; entre o disparo
    // e a resposta do OSRM outro gesto pode ter comitado (ex.: o usuário
    // continuou editando enquanto a rota calculava).
    const atual = sessaoRef.current;
    const estadosMapa = { ...(atual.estadosRotaViva ?? {}), [chave]: resultado.estado };
    let proxima: SessaoFormulario = { ...atual, estadosRotaViva: estadosMapa };

    if (linhaAtual.completo && resultado.estado.situacao === "recalculada") {
      // Serviço já completo (documento carregado, ou já promovido — DEC-053):
      // grava a rota+paradas novas e reconcilia a matriz no mesmo commit
      // (RN-054..057).
      const servicosAtualizados = servicosComItinerarioAtualizado(
        servicosDaSessao(atual),
        linhaAtual.servicoUuid,
        sentidoSelecionado,
        novasParadas,
        resultado.estado.rota,
      );
      proxima = comServicosDaSessao(proxima, servicosAtualizados);
    } else if (!linhaAtual.completo && resultado.estado.situacao === "recalculada") {
      // Ainda em construção, em QUALQUER modo (DEC-053/TASK-061; gate de modo
      // removido pela TASK-080): tenta promover. "Ambos" só promove quando os
      // dois sentidos têm rota válida — o sentido que falta permanece em
      // `servicosEmConstrucao`. `proxima` já carrega `estadosRotaViva`
      // atualizado com o resultado deste recálculo.
      proxima = promoverServicoNaSessao(proxima, linhaAtual.servicoUuid);
    }

    aoAtualizarSessao(proxima);
  }

  function moverParada(deIndice: number, paraIndice: number) {
    if (paraIndice < 0 || paraIndice >= paradasAtual.length) return;
    void aplicarNovasParadas(reordenarParada(paradasAtual, deIndice, paraIndice));
  }

  function removerParadaNaTabela(indice: number) {
    void aplicarNovasParadas(removerParada(paradasAtual, indice));
  }

  function aoRecalcularManualmente() {
    void aplicarNovasParadas(paradasAtual);
  }

  // Clicar/reutilizar no editor de Seções insere uma nova parada quando a
  // Seção ainda não está no itinerário corrente; arrastar um ponto já
  // inserido só atualiza a geolocalização (inferência controlada — ambos os
  // gestos chamam `aoAtualizarSecao`; distinguir exigiria mudar a API do
  // `EditorSecoes`, fora do escopo desta task).
  function aoCriarOuAtualizarSecao(secao: Secao) {
    if (!linhaAtual) return;
    const secoesAtualizadas = secoes.some((s) => s.uuid === secao.uuid)
      ? secoes.map((s) => (s.uuid === secao.uuid ? secao : s))
      : [...secoes, secao];
    const jaEhParada = paradasAtual.some((p) => p.tipo === "secao" && p.secaoUuid === secao.uuid);
    void aplicarNovasParadas(
      jaEhParada ? paradasAtual : inserirParada(paradasAtual, paradaDeSecao(secao.uuid)),
      {
        secoesParaResolver: secoesAtualizadas,
        aoComitarBase: (base) => comSecoesAtualizadas(base, secoesAtualizadas),
      },
    );
  }

  function aoCriarLocal(local: Local) {
    if (!linhaAtual) return;
    const locaisAtualizados = [...linhaAtual.locais, local];
    void aplicarNovasParadas(inserirParada(paradasAtual, paradaDeLocal(local.uuid)), {
      locaisParaResolver: locaisAtualizados,
      aoComitarBase: (base) => comLocaisAtualizados(base, locaisAtualizados),
    });
  }

  function aoAtualizarLocal(local: Local) {
    if (!linhaAtual) return;
    const locaisAtualizados = linhaAtual.locais.map((l) => (l.uuid === local.uuid ? local : l));
    void aplicarNovasParadas(paradasAtual, {
      locaisParaResolver: locaisAtualizados,
      aoComitarBase: (base) => comLocaisAtualizados(base, locaisAtualizados),
    });
  }

  // DEC-045: exclusão do ponto de um sentido torna o Local unidirecional e a
  // Parada correspondente sai do itinerário DESTE sentido. `EditorLocais` está
  // fixo em `sentidoSelecionado` (prop controlada), então o sentido excluído é
  // sempre o corrente — a Parada removida é a de `paradasAtual`.
  function aoExcluirSentidoDeLocal(local: Local) {
    if (!linhaAtual) return;
    const locaisAtualizados = linhaAtual.locais.map((l) => (l.uuid === local.uuid ? local : l));
    void aplicarNovasParadas(removerParadasDeLocal(paradasAtual, local.uuid), {
      locaisParaResolver: locaisAtualizados,
      aoComitarBase: (base) => comLocaisAtualizados(base, locaisAtualizados),
    });
  }

  // Gesto de ponto de rota (TASK-063; Spec 03 §3.6, §3.6.1; Spec 04 §7.3 item
  // 6; DEC-055): clicar SOBRE a linha da rota ancora o clique ao trecho
  // correto (`apos_parada_ordem`) e insere o ponto na posição do array que
  // preserva a ordem de travessia. Sem `linhaRotaAtual` (itinerário ainda sem
  // rota calculada) ou sem as paradas resolvidas (itinerário em montagem,
  // RN-034/035/036) o clique não tem trecho para ancorar — é descartado sem
  // criar nada (não é regra nova: só não há o que fazer).
  function aoCriarPontoDeRota(posicao: Coordenada) {
    if (!linhaAtual || !sentidoSelecionado || !linhaRotaAtual) return;
    const resolucao = resolverParadasRota(
      paradasAtual,
      secoes,
      linhaAtual.locais,
      linhaAtual.servicoUuid,
      sentidoSelecionado,
    );
    if (!resolucao.ok) return;

    const paradasCoordenadas: Coordenada[] = resolucao.paradas.map((p) => ({
      lng: p.longitude,
      lat: p.latitude,
    }));
    const ancoragem = ancorarPontoNaRota(posicao, linhaRotaAtual.pontos, paradasCoordenadas);
    if (!ancoragem) return;

    const novosPontos = inserirPontoDeRota(pontosDeRotaAtual, linhaRotaAtual.pontos, {
      latitude: posicao.lat,
      longitude: posicao.lng,
      aposParadaOrdem: ancoragem.aposParadaOrdem,
    });
    void aplicarNovasParadas(paradasAtual, { pontosDeRota: novosPontos });
  }

  function aoMoverPontoDeRota(indice: number, posicao: Coordenada) {
    const novosPontos = moverPontoDeRota(pontosDeRotaAtual, indice, {
      latitude: posicao.lat,
      longitude: posicao.lng,
    });
    void aplicarNovasParadas(paradasAtual, { pontosDeRota: novosPontos });
  }

  function aoRemoverPontoDeRota(indice: number) {
    const novosPontos = removerPontoDeRota(pontosDeRotaAtual, indice);
    void aplicarNovasParadas(paradasAtual, { pontosDeRota: novosPontos });
  }

  if (!identidade) {
    return (
      <Painel tom="informativo">
        <p data-testid="itinerarios-sem-identidade">
          Selecione primeiro o Autos na etapa Identificação.
        </p>
      </Painel>
    );
  }

  if (linhas.length === 0) {
    return (
      <Painel tom="informativo">
        <p data-testid="itinerarios-sem-servico">
          Cadastre ao menos um Serviço na etapa Serviços antes de montar os itinerários.
        </p>
      </Painel>
    );
  }

  if (erroRecursos) {
    return (
      <p role="alert" className="text-sm text-erro">
        Falha ao carregar municípios: {erroRecursos}
      </p>
    );
  }

  if (!recursosMunicipio) {
    return (
      <p data-testid="itinerarios-carregando" className="text-sm text-cinza-500">
        Carregando municípios…
      </p>
    );
  }

  return (
    <div data-testid="etapa-itinerarios" className="flex flex-col gap-6">
      <Select
        rotulo="Serviço"
        data-testid="select-servico-itinerario"
        value={servicoSelecionado ?? ""}
        onChange={(evento) => {
          definirServicoSelecionado(evento.target.value || null);
          definirSentidoSelecionado(null);
        }}
      >
        <option value="">— selecione —</option>
        {linhas.map((l) => (
          <option key={l.servicoUuid} value={l.servicoUuid}>
            {l.numeroN}
          </option>
        ))}
      </Select>

      {linhaAtual && (
        <div data-testid="seletor-sentido" className="flex gap-2">
          {linhaAtual.sentidos.map((sentido) => (
            <Botao
              key={sentido}
              variante={sentido === sentidoSelecionado ? "primario" : "secundario"}
              data-testid="botao-sentido"
              data-sentido={sentido}
              aria-current={sentido === sentidoSelecionado ? "true" : undefined}
              onClick={() => definirSentidoSelecionado(sentido)}
            >
              {ROTULO_SENTIDO[sentido]}
            </Botao>
          ))}
        </div>
      )}

      {linhaAtual && sentidoSelecionado && (
        <div className="flex flex-col gap-6">
          {/* Mapa único à esquerda + tabela de paradas lateral à direita
              (Spec 04 §7; doc 18 §87; DEC-054). Empilha em tela estreita. */}
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <EditorMapaItinerario
              secoes={secoes}
              locais={linhaAtual.locais}
              servicoUuid={linhaAtual.servicoUuid}
              sentido={sentidoSelecionado}
              bidirecional={bidirecional}
              recursosMunicipio={recursosMunicipio}
              aoCriarSecao={aoCriarOuAtualizarSecao}
              aoAtualizarSecao={aoCriarOuAtualizarSecao}
              aoCriarLocal={aoCriarLocal}
              aoAtualizarLocal={aoAtualizarLocal}
              aoExcluirSentido={aoExcluirSentidoDeLocal}
              linhaRota={linhaRotaAtual}
              pontosDeRota={pontosDeRotaAtual}
              aoCriarPontoDeRota={aoCriarPontoDeRota}
              aoMoverPontoDeRota={aoMoverPontoDeRota}
              aoRemoverPontoDeRota={aoRemoverPontoDeRota}
            />

            <div data-testid="coluna-paradas" className="flex flex-col gap-4">
              {bidirecional && !conjuntoConsistente && (
                <p role="alert" data-testid="aviso-secoes-divergentes" className="text-sm text-erro">
                  Ida e Volta referenciam conjuntos diferentes de Seções (Spec 02 §2). A
                  exportação será bloqueada até as duas convergirem.
                </p>
              )}

              {recalculando && (
                <p data-testid="recalculando-rota" className="text-sm text-cinza-500">
                  Recalculando rota…
                </p>
              )}

              {violacoesMontagemAtual.length > 0 && (
                <ul
                  role="alert"
                  data-testid="avisos-montagem-invalida"
                  className="list-disc pl-5 text-sm text-erro"
                >
                  {violacoesMontagemAtual.map((violacao, indice) => (
                    <li key={`${violacao.codigo}-${indice}`} data-testid="aviso-montagem-invalida">
                      {violacao.mensagem}
                    </li>
                  ))}
                </ul>
              )}

              <Tabela data-testid="tabela-paradas">
                <thead>
                  <tr>
                    <th scope="col">Parada</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paradasAtual.map((parada, indice) => {
                    const rotulo =
                      parada.tipo === "secao"
                        ? (() => {
                            const secao = secoes.find((s) => s.uuid === parada.secaoUuid);
                            return secao ? nomeExibicaoSecao(secao) : parada.secaoUuid;
                          })()
                        : (() => {
                            const local = linhaAtual.locais.find((l) => l.uuid === parada.localUuid);
                            return local ? nomeExibicaoLocal(local) : parada.localUuid;
                          })();
                    return (
                      <tr key={`${parada.tipo}-${indice}`} data-testid="parada-item">
                        <td>
                          <span data-testid="parada-rotulo">{rotulo}</span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <Botao
                              variante="secundario"
                              data-testid="parada-mover-cima"
                              disabled={indice === 0}
                              onClick={() => moverParada(indice, indice - 1)}
                            >
                              ↑
                            </Botao>
                            <Botao
                              variante="secundario"
                              data-testid="parada-mover-baixo"
                              disabled={indice === paradasAtual.length - 1}
                              onClick={() => moverParada(indice, indice + 1)}
                            >
                              ↓
                            </Botao>
                            <Botao
                              variante="secundario"
                              data-testid="parada-remover"
                              onClick={() => removerParadaNaTabela(indice)}
                            >
                              Remover
                            </Botao>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tabela>
            </div>
          </div>

          {estadoAtual && (estadoAtual.situacao === "congelada" || estadoAtual.situacao === "recalculada") && (
            <PainelDescricaoItinerario
              sentido={sentidoSelecionado}
              descricao={estadoAtual.rota.descricao_itinerario}
              aoRecalcular={aoRecalcularManualmente}
            />
          )}

          {estadoAtual && estadoAtual.situacao === "sem-rota" && (
            <p role="alert" data-testid="mensagem-sem-rota" className="text-sm text-erro">
              {mensagemDeFalha(estadoAtual.falha)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
