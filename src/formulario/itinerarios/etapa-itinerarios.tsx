"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import type { DocumentoOperacao, Local, Secao } from "@/shared/contrato";
import { esquemaRota } from "@/shared/contrato";
import {
  carregarBaseMunicipios,
  carregarGeojsonMunicipios,
} from "@/shared/dados-estaticos";
import { indiceDeNomes } from "@/shared/geo";
import {
  EditorSecoes,
  nomeExibicaoSecao,
  type RecursosMunicipio,
  type Sentido,
} from "@/formulario/secoes";
import { EditorLocais, nomeExibicaoLocal } from "@/formulario/locais";
import { PainelDescricaoItinerario } from "@/formulario/descricao";
import { congelarRotaCarregada, mensagemDeFalha } from "@/formulario/roteamento";
import {
  identidadeDaSessao,
  secoesDaSessao,
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
  type ParadaEmEdicao,
} from "./motor-montagem";

// Etapa real "Seções, Locais e Itinerários" (TASK-019; Spec 04 §7.1–§7.4). É a
// etapa que MONTA os componentes controlados entregues pelas TASK-017
// (`EditorSecoes`, DEC-043), TASK-018 (`EditorLocais`, DEC-045) e TASK-025
// (`PainelDescricaoItinerario`, DEC-046), acrescentando o que só ela sabe:
// seleção de Serviço/sentido, a sequência ordenada de paradas (tabela lateral,
// Spec 04 §7.3 item 3) e o disparo do recálculo ao vivo (RN-052) que injeta o
// `comporDescricao` REAL desde o início (DEC-046) — fecha o fio da TASK-044
// (`ItinerarioAoVivo` → `coletarPendencias`, ver `docs-dev/06` "Obrigação de
// fiação"). Também consome o sinal de exclusão de sentido de Local (DEC-045):
// a Parada correspondente sai do itinerário daquele sentido.
//
// Limitação aceita (Pontos de atenção da entrega): `EditorSecoes` e
// `EditorLocais` (TASK-017/018) embutem CADA UM seu próprio `<Mapa>` — esta
// etapa os monta lado a lado, não fundidos num único canvas como descreve a
// Spec 04 §7 ("num mesmo mapa interativo"). Unificar os dois num só mapa
// exigiria alterar a API interna daqueles componentes já entregues/revisados,
// fora do escopo desta task.

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

  const linhasCompletas: LinhaItinerarios[] =
    sessao.modo === "carregado"
      ? sessao.documento.autos.servicos.map((s) => ({
          servicoUuid: s.uuid,
          numeroN: s.numero_n,
          completo: true,
          sentidos: s.itinerarios.map((i) => i.sentido),
          locais: s.locais,
        }))
      : [];

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
    if (sessao.modo !== "carregado") return undefined;
    const servico = sessao.documento.autos.servicos.find((s) => s.uuid === servicoUuid);
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
  // Pontos de rota persistidos a reaplicar no recálculo (Spec 03 §3.6.2) — o
  // último `rota` conhecido (congelada do arquivo ou da última recomputação
  // desta sessão). A EDIÇÃO de pontos de rota é a TASK-023 (fora de escopo);
  // esta task só os REAPLICA para não perder o traçado forçado na reedição.
  const pontosDeRotaAtual =
    estadoAtual && (estadoAtual.situacao === "congelada" || estadoAtual.situacao === "recalculada")
      ? estadoAtual.rota.pontos_de_rota
      : [];

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

  function documentoComItinerarioAtualizado(
    base: DocumentoOperacao,
    servicoUuid: string,
    sentido: Sentido,
    paradas: ParadaEmEdicao[],
    rota: Rota,
  ): DocumentoOperacao {
    const servicos = base.autos.servicos.map((s) => {
      if (s.uuid !== servicoUuid) return s;
      const itinerarios = s.itinerarios.map((it) =>
        it.sentido === sentido ? { ...it, paradas: paradasParaContrato(paradas), rota } : it,
      );
      return { ...s, itinerarios };
    });
    return { ...base, autos: { ...base.autos, servicos } };
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
      pontosDeRotaAtual,
    );
    definirRecalculando(false);

    if (!resultado.ok) return; // itinerário ainda em montagem (RN-034/035/036) — sem pendência prematura

    // Mescla sobre a sessão MAIS RECENTE (`sessaoRef`), não a fechada por este
    // closure — o `await` acima atravessa um ciclo de render; entre o disparo
    // e a resposta do OSRM outro gesto pode ter comitado (ex.: o usuário
    // continuou editando enquanto a rota calculava).
    const atual = sessaoRef.current;
    const estadosMapa = { ...(atual.estadosRotaViva ?? {}), [chave]: resultado.estado };
    const proxima: SessaoFormulario =
      atual.modo === "carregado"
        ? {
            ...atual,
            documento:
              linhaAtual.completo && resultado.estado.situacao === "recalculada"
                ? documentoComItinerarioAtualizado(
                    atual.documento,
                    linhaAtual.servicoUuid,
                    sentidoSelecionado,
                    novasParadas,
                    resultado.estado.rota,
                  )
                : atual.documento,
            estadosRotaViva: estadosMapa,
          }
        : { ...atual, estadosRotaViva: estadosMapa };
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

  if (!identidade) {
    return (
      <p data-testid="itinerarios-sem-identidade">
        Selecione primeiro o Autos na etapa Identificação.
      </p>
    );
  }

  if (linhas.length === 0) {
    return (
      <p data-testid="itinerarios-sem-servico">
        Cadastre ao menos um Serviço na etapa Serviços antes de montar os itinerários.
      </p>
    );
  }

  if (erroRecursos) {
    return <p role="alert">Falha ao carregar municípios: {erroRecursos}</p>;
  }

  if (!recursosMunicipio) {
    return <p data-testid="itinerarios-carregando">Carregando municípios…</p>;
  }

  return (
    <div data-testid="etapa-itinerarios">
      <label>
        Serviço
        <select
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
        </select>
      </label>

      {linhaAtual && (
        <div data-testid="seletor-sentido">
          {linhaAtual.sentidos.map((sentido) => (
            <button
              key={sentido}
              type="button"
              data-testid="botao-sentido"
              data-sentido={sentido}
              aria-current={sentido === sentidoSelecionado ? "true" : undefined}
              onClick={() => definirSentidoSelecionado(sentido)}
            >
              {ROTULO_SENTIDO[sentido]}
            </button>
          ))}
        </div>
      )}

      {linhaAtual && sentidoSelecionado && (
        <>
          {bidirecional && !conjuntoConsistente && (
            <p role="alert" data-testid="aviso-secoes-divergentes">
              Ida e Volta referenciam conjuntos diferentes de Seções (Spec 02 §2). A
              exportação será bloqueada até as duas convergirem.
            </p>
          )}

          {recalculando && <p data-testid="recalculando-rota">Recalculando rota…</p>}

          <ol data-testid="tabela-paradas">
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
                <li key={`${parada.tipo}-${indice}`} data-testid="parada-item">
                  <span data-testid="parada-rotulo">{rotulo}</span>{" "}
                  <button
                    type="button"
                    data-testid="parada-mover-cima"
                    disabled={indice === 0}
                    onClick={() => moverParada(indice, indice - 1)}
                  >
                    ↑
                  </button>{" "}
                  <button
                    type="button"
                    data-testid="parada-mover-baixo"
                    disabled={indice === paradasAtual.length - 1}
                    onClick={() => moverParada(indice, indice + 1)}
                  >
                    ↓
                  </button>{" "}
                  <button
                    type="button"
                    data-testid="parada-remover"
                    onClick={() => removerParadaNaTabela(indice)}
                  >
                    Remover
                  </button>
                </li>
              );
            })}
          </ol>

          <EditorSecoes
            secoes={secoes}
            servicoUuid={linhaAtual.servicoUuid}
            sentido={sentidoSelecionado}
            bidirecional={bidirecional}
            recursosMunicipio={recursosMunicipio}
            aoCriarSecao={aoCriarOuAtualizarSecao}
            aoAtualizarSecao={aoCriarOuAtualizarSecao}
          />

          <EditorLocais
            locais={linhaAtual.locais}
            sentido={sentidoSelecionado}
            bidirecional={bidirecional}
            recursosMunicipio={recursosMunicipio}
            aoCriarLocal={aoCriarLocal}
            aoAtualizarLocal={aoAtualizarLocal}
            aoExcluirSentido={aoExcluirSentidoDeLocal}
          />

          {estadoAtual && (estadoAtual.situacao === "congelada" || estadoAtual.situacao === "recalculada") && (
            <PainelDescricaoItinerario
              sentido={sentidoSelecionado}
              descricao={estadoAtual.rota.descricao_itinerario}
              aoRecalcular={aoRecalcularManualmente}
            />
          )}

          {estadoAtual && estadoAtual.situacao === "sem-rota" && (
            <p role="alert" data-testid="mensagem-sem-rota">
              {mensagemDeFalha(estadoAtual.falha)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
