"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  criarSecaoNoPonto,
  limparSecoesAposEdicaoDeParadas,
  MENSAGEM_FORA_DE_SP as MENSAGEM_FORA_DE_SP_SECAO,
  nomeExibicaoSecao,
  redefinirSecao,
  type RecursosMunicipio,
  type Sentido,
} from "@/formulario/secoes";
import {
  criarLocalNoPonto,
  MENSAGEM_FORA_DE_SP as MENSAGEM_FORA_DE_SP_LOCAL,
  nomeExibicaoLocal,
  removerEntidadeLocal,
} from "@/formulario/locais";
import {
  formatarCoordenada,
  interpretarParDeCoordenadas,
} from "./coordenada-criacao";
import { sugerirNomeDeParada } from "./sugerir-nome-de-parada";
import { EditorMapaItinerario } from "./editor-mapa-itinerario";
import { PainelReusoSecao } from "./painel-reuso-secao";
import { ALTURA_MAPA_CLASSE_LG } from "./altura-mapa";
import { PainelDescricaoItinerario } from "@/formulario/descricao";
import {
  congelarRotaCarregada,
  inserirPontoDeRota,
  mensagemDeFalha,
  moverPontoDeRota,
  reancorarPontosDeRota,
  reancorarPontosDeRotaNaInsercaoPosicional,
  removerPontoDeRota,
} from "@/formulario/roteamento";
import { Botao, Campo, Painel, Select, Tabela, Tooltip } from "@/shared/ui";
import {
  matrizDistanciasDoServico,
  reconciliarMatrizSeccionamento,
} from "@/formulario/matrizes";
import {
  comServicosDaSessao,
  identidadeDaSessao,
  removerAncorasHorarioDeViagens,
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
  pontosDeRotaDoItinerario,
} from "./estado-itinerarios";
import { promoverServicoNaSessao } from "./promocao-servico";
import { reconciliarHorariosAposMudancaItinerario } from "./reconciliar-horarios-itinerario";
import {
  montarListaIntercaladaItinerario,
  moverPontoDeRotaNaLista,
  podeMoverPontoDeRotaNaLista,
  type DirecaoMovimentoLista,
  type ItemListaIntercalada,
} from "./lista-intercalada-itinerario";
import {
  chaveParadaEmEdicao,
  conjuntoSecoesConsistente,
  espelharGestoDeSecao,
  inserirParada,
  ocorrenciasLocaisEmExtremo,
  paradaDeLocal,
  paradaDeSecao,
  paradasEmEdicaoDeContrato,
  paradasParaContrato,
  removerParada,
  removerParadasDeLocal,
  reordenarParada,
  resolverParadasRota,
  subsequenciaSecoes,
  type GestoSecao,
  type ParadaEmEdicao,
  type ViolacaoMontagem,
} from "./motor-montagem";
import { chaveSelecaoDaParada, chaveSelecaoDoPontoDeRota } from "./selecao-itinerario";

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

// Aviso discreto e não bloqueante da sugestão de nome (TASK-133; DEC-112 §3):
// nunca menciona tarifa/indisponibilidade de rota (RN-049 é sobre `/route`;
// aplicada aqui por analogia de linguagem) — apenas informa que o campo
// segue livre para digitação manual.
const MENSAGEM_AVISO_SUGESTAO_NOME =
  "Não foi possível sugerir um nome para este ponto. Digite o nome manualmente.";

function mensagemLocalExtremo(posicoes: readonly ("inicio" | "fim")[]): string {
  if (posicoes.length === 2) {
    return "Este Local ocupa a primeira e a última Parada. Locais (pontos de parada) só podem ocupar posições intermediárias; os extremos devem ser Seções.";
  }
  if (posicoes[0] === "inicio") {
    return "Este Local está no início do itinerário. Locais (pontos de parada) só podem ocupar posições intermediárias; a primeira Parada deve ser uma Seção.";
  }
  return "Este Local está no fim do itinerário. Locais (pontos de parada) só podem ocupar posições intermediárias; a última Parada deve ser uma Seção.";
}

interface PropsEtapaItinerarios {
  sessao: SessaoFormulario;
  aoAtualizarSessao: (sessao: SessaoFormulario) => void;
}

interface ResultadoServicosComItinerarioAtualizado {
  servicos: Servico[];
  uuidsViagensComAncorasDescartadas: string[];
}

export function EtapaItinerarios({ sessao, aoAtualizarSessao }: PropsEtapaItinerarios) {
  const [recursosMunicipio, definirRecursosMunicipio] = useState<RecursosMunicipio | null>(null);
  const [erroRecursos, definirErroRecursos] = useState<string | null>(null);
  const [servicoSelecionado, definirServicoSelecionado] = useState<string | null>(null);
  const [sentidoSelecionado, definirSentidoSelecionado] = useState<Sentido | null>(null);
  const [recalculando, definirRecalculando] = useState(false);
  // Recusa efêmera do "redefinir Seção" (TASK-100; DEC-080): guarda de
  // regressão para destino fora de SP (RN-029) — só alcançável se o ponto de
  // origem já não estivesse em SP, o que não deveria ocorrer em documento
  // válido. Nunca integra a sessão/documento (RN-096).
  const [mensagemRedefinirSecao, definirMensagemRedefinirSecao] = useState<string | null>(null);
  // Violações da ÚLTIMA tentativa de montagem por itinerário (TASK-047; RN-034/
  // 035/036) — feedback efêmero de por que o recálculo não ocorreu; nunca vai
  // para a sessão/documento (não é pendência de §11, que só cobre itinerário
  // completo — Spec 04 §11).
  const [violacoesMontagemMapa, definirViolacoesMontagemMapa] = useState<
    Record<string, ViolacaoMontagem[]>
  >({});
  // Aviso efêmero da DEC-068, por Serviço/sentido. Não integra as pendências
  // fechadas da Spec 04 §11 e nunca é persistido na sessão ou no JSON.
  const [descartePontoDeRotaMapa, definirDescartePontoDeRotaMapa] = useState<
    Record<string, boolean>
  >({});
  // Seleção efêmera de sincronização tabela↔mapa (TASK-064; Spec 04 §7) — a
  // MESMA chave que os marcadores do `EditorMapaItinerario` usam (`secao-*`/
  // `local-*`/`ponto-rota-*`). `origem` distingue o gesto que criou a seleção:
  // só a origem "mapa" dispara o scroll-into-view da linha (evita a tabela
  // "pular" sob o cursor quando o próprio clique já foi na linha). Nunca
  // integra a sessão/documento (RN-096).
  const [selecao, definirSelecao] = useState<{ chave: string; origem: "tabela" | "mapa" } | null>(
    null,
  );
  const refsLinhasTabela = useRef<Map<string, HTMLTableRowElement>>(new Map());

  // Criação inline de Seção/Local (TASK-095; DEC-077): a linha-formulário vive
  // na tabela lateral, na posição de inserção — não mais num `Painel` abaixo
  // do mapa (`EditorMapaItinerario` só reporta a intenção via
  // `aoIniciarCriacaoParada`). Estado efêmero de UI (RN-096); nunca integra a
  // sessão/documento.
  const [criacaoInline, definirCriacaoInline] = useState<{
    tipo: "secao" | "local";
    posicao: Coordenada;
    posicaoNaLinha?: Coordenada;
  } | null>(null);
  const [nomeCriacaoInline, definirNomeCriacaoInline] = useState("");
  // Textos de latitude/longitude em edição (TASK-132; DEC-112 item 5) — de
  // propósito SEPARADOS de `criacaoInline`: este guarda a posição do
  // marcador (só muda em "Atualizar ponto" ou ao abrir), aqueles mudam a
  // cada tecla. Misturá-los recalcularia `indiceInsercaoParaPosicao` (useMemo
  // abaixo) a cada dígito digitado.
  const [latitudeCriacaoInline, definirLatitudeCriacaoInline] = useState("");
  const [longitudeCriacaoInline, definirLongitudeCriacaoInline] = useState("");
  const [mensagemCriacaoInline, definirMensagemCriacaoInline] = useState<string | null>(null);
  const refLinhaFormularioCriacao = useRef<HTMLTableRowElement | null>(null);

  // Sugestão de nome pela via mais próxima (TASK-133; DEC-112) — conveniência
  // efêmera (RN-096), nunca regra. `sugerindoNome` alimenta o indicador de
  // carregamento (Spec 04 §7.3 item 2); `avisoSugestaoNome` é o aviso
  // discreto e não bloqueante de falha (DEC-112 §3), distinto de
  // `mensagemCriacaoInline` (recusa de coordenada/fora de SP).
  const [sugerindoNome, definirSugerindoNome] = useState(false);
  const [avisoSugestaoNome, definirAvisoSugestaoNome] = useState<string | null>(null);
  // Token de descarte de resposta obsoleta: cada disparo incrementa o
  // contador e só aplica o resultado se ainda for o token corrente — cobre
  // dupla consulta (a mais recente vence) e formulário já cancelado/trocado.
  const sugestaoTokenRef = useRef(0);
  // "Latest ref" do nome digitado (mesmo padrão de `sessaoRef` abaixo): a
  // `.then` da sugestão resolve depois de possíveis novas teclas do usuário,
  // e precisa ler o valor CORRENTE do campo, não o do closure em que nasceu.
  const nomeCriacaoInlineRef = useRef(nomeCriacaoInline);
  useEffect(() => {
    nomeCriacaoInlineRef.current = nomeCriacaoInline;
  }, [nomeCriacaoInline]);

  function alternarSelecao(chave: string, origem: "tabela" | "mapa") {
    definirSelecao((atual) => (atual?.chave === chave ? null : { chave, origem }));
  }

  // Troca de Serviço/sentido descarta a seleção — o marcador/linha realçados
  // pertencem ao itinerário anterior (RN-096: efêmero, sem persistir estado
  // obsoleto entre itinerários). Ajuste feito DURANTE o render (não em
  // `useEffect`, que cascataria um render extra) — o padrão recomendado do
  // React para "resetar estado quando uma prop/derivada muda".
  const chaveItinerarioAtual = `${servicoSelecionado ?? ""}-${sentidoSelecionado ?? ""}`;
  const [chaveItinerarioDaSelecao, definirChaveItinerarioDaSelecao] =
    useState(chaveItinerarioAtual);
  if (chaveItinerarioDaSelecao !== chaveItinerarioAtual) {
    definirChaveItinerarioDaSelecao(chaveItinerarioAtual);
    definirSelecao(null);
    if (criacaoInline) {
      definirCriacaoInline(null);
      definirNomeCriacaoInline("");
      definirLatitudeCriacaoInline("");
      definirLongitudeCriacaoInline("");
      definirMensagemCriacaoInline(null);
      definirSugerindoNome(false);
      definirAvisoSugestaoNome(null);
    }
  }

  // Invalida qualquer sugestão de nome pendente ao trocar de itinerário
  // (cleanup de efeito, não durante o render — refs não podem ser mutadas em
  // render). A troca de `chaveItinerarioAtual` já reseta `criacaoInline` no
  // bloco de ajuste de estado acima; este cleanup cobre só a consulta de
  // `/nearest` em voo, para que sua resposta tardia não sobrescreva o nome
  // de um formulário já reaberto no itinerário novo.
  useEffect(() => {
    return () => {
      // Falso positivo do lint: `sugestaoTokenRef` é um contador, não um nó
      // de DOM — o ponto do cleanup é justamente ler/incrementar o valor
      // CORRENTE no momento da troca, não um snapshot congelado do commit.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sugestaoTokenRef.current++;
    };
  }, [chaveItinerarioAtual]);

  // Rola a linha selecionada para dentro da viewport própria da tabela
  // (`overflow-y-auto`, TASK-074) somente quando a seleção nasceu no MAPA —
  // selecionar pela própria linha não deve deslocar a rolagem sob o cursor.
  useEffect(() => {
    if (!selecao || selecao.origem !== "mapa") return;
    // `scrollIntoView` é ausente no jsdom (testes de componente) — presente em
    // todo navegador real; chamada opcional para não acoplar o teste ao DOM.
    refsLinhasTabela.current.get(selecao.chave)?.scrollIntoView?.({ block: "nearest" });
  }, [selecao]);

  // Rola a linha-formulário para dentro da viewport da tabela ao abrir
  // (TASK-095; DEC-077) — mesma ressalva de `scrollIntoView` ausente no jsdom.
  useEffect(() => {
    if (!criacaoInline) return;
    refLinhaFormularioCriacao.current?.scrollIntoView?.({ block: "nearest" });
  }, [criacaoInline]);

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

  function paradasDe(
    servicoUuid: string,
    sentido: Sentido,
    sessaoBase: SessaoFormulario = sessao,
  ): ParadaEmEdicao[] {
    const chave = chaveItinerario(servicoUuid, sentido);
    const mapaBase = sessaoBase.paradasEmEdicao ?? {};
    if (mapaBase[chave] !== undefined) return mapaBase[chave];
    const servico = servicosDaSessao(sessaoBase).find((s) => s.uuid === servicoUuid);
    const itinerario = servico?.itinerarios.find((i) => i.sentido === sentido);
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
  const locaisExtremosAtual = ocorrenciasLocaisEmExtremo(paradasAtual);
  const localExtremoPorIndice = new Map(
    locaisExtremosAtual.map((ocorrencia) => [ocorrencia.indice, ocorrencia]),
  );
  // Pontos de rota do itinerário em edição (TASK-071; DEC-058): vivem em
  // estado de sessão PRÓPRIO, que sobrevive à transição para `sem-rota`
  // (RN-048) — não são mais derivados de `estadoAtual.rota`, que deixa de
  // existir quando o recálculo falha. `pontosDeRotaDoItinerario` cai no eco
  // do arquivo/documento (`rota.pontos_de_rota`) quando a sessão ainda não
  // tem entrada para este itinerário (reedição fiel, Spec 03 §3.6.2).
  const pontosDeRotaAtual: readonly PontoDeRota[] =
    linhaAtual && sentidoSelecionado
      ? pontosDeRotaDoItinerario(sessao, linhaAtual.servicoUuid, sentidoSelecionado)
      : [];
  const itensListaAtual = montarListaIntercaladaItinerario(
    paradasAtual,
    pontosDeRotaAtual,
  );

  // Rota ativa desenhada no mapa (TASK-059; Spec 04 §7.3, RN-046/052) — só a
  // LineString congelada/recalculada; em `sem-rota` (RN-048) nenhuma linha é
  // passada, sem disparar OSRM (a leitura é do estado já resolvido).
  const linhaRotaAtual: LinhaMapa | undefined =
    estadoAtual && (estadoAtual.situacao === "congelada" || estadoAtual.situacao === "recalculada")
      ? linhaDaGeometria("rota-ativa", estadoAtual.rota.geometria)
      : undefined;

  // Posição da linha-formulário de criação inline na lista intercalada
  // (TASK-095; DEC-077) — a MESMA âncora que `prepararInsercaoDeParada` usa
  // para a Parada real, aplicada ANTES de qualquer entidade existir, só para
  // desenhar a linha no lugar certo. `undefined`/além do fim ⇒ linha no fim.
  // Memorizado por `criacaoInline` (não recalcula a cada tecla digitada no
  // nome — só quando a criação abre/fecha ou a lista muda de verdade).
  const indiceExibicaoCriacaoInline: number | undefined = useMemo(() => {
    if (!criacaoInline) return undefined;
    const indiceInsercao = indiceInsercaoParaPosicao(criacaoInline.posicaoNaLinha);
    if (indiceInsercao === undefined) return itensListaAtual.length;
    const posicao = itensListaAtual.findIndex(
      (item) => item.tipo === "parada" && item.indiceParada === indiceInsercao,
    );
    return posicao === -1 ? itensListaAtual.length : posicao;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criacaoInline, itensListaAtual]);

  const sentidoOutro: Sentido | undefined =
    sentidoSelecionado && bidirecional ? (sentidoSelecionado === "ida" ? "volta" : "ida") : undefined;
  const paradasOutroSentido =
    linhaAtual && sentidoOutro ? paradasDe(linhaAtual.servicoUuid, sentidoOutro) : undefined;
  // Pontos de rota do OUTRO sentido (TASK-077; DEC-060/071): insumo da
  // reancoragem do espelho — o mesmo `reancorarPontosDeRota` já usado para o
  // sentido editado, agora aplicado ao antes/depois do sentido espelhado.
  const pontosDeRotaOutroSentido: readonly PontoDeRota[] | undefined =
    linhaAtual && sentidoOutro
      ? pontosDeRotaDoItinerario(sessao, linhaAtual.servicoUuid, sentidoOutro)
      : undefined;
  const conjuntoConsistente = bidirecional
    ? conjuntoSecoesConsistente(
        sentidoSelecionado === "ida" ? paradasAtual : paradasOutroSentido,
        sentidoSelecionado === "volta" ? paradasAtual : paradasOutroSentido,
      )
    : true;
  // Seções já usadas por QUALQUER sentido do Serviço corrente (RN-030: o
  // conjunto é idêntico entre Ida/Volta) — o reuso (DEC-063) deixa de ofertar
  // Seções já presentes no itinerário do Serviço, servindo só para trazer
  // Seções de OUTROS Serviços (RN-025).
  const secoesUsadasNoServico = new Set<string>([
    ...subsequenciaSecoes(paradasAtual),
    ...(paradasOutroSentido ? subsequenciaSecoes(paradasOutroSentido) : []),
  ]);
  const secoesParaReuso = secoes.filter((s) => !secoesUsadasNoServico.has(s.uuid));

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

  // A chave é `linhaAtual.completo` (se o Serviço já tem itinerário/rota),
  // NUNCA `base.modo` (TASK-096): desde a DEC-053/TASK-080 um Serviço
  // completo vive em `servicosDaSessao` (documento no carregado, `sessao.
  // servicos` no novo) e um em construção vive em `servicosEmConstrucao` —
  // nos DOIS modos. Cruzar com `base.modo` deixava dois estados sem ramo
  // (novo/promovido; carregado/em-construção): a função devolvia `base`
  // calada e o Local era descartado enquanto a Parada já tinha sido
  // comitada, violando RN-036.
  //
  // INVARIANTE (o que faz os dois `.map()` abaixo NUNCA errarem o alvo):
  // `linhaAtual` é derivada de `servicosDaSessao(sessao)`/
  // `servicosEmConstrucaoDaSessao(sessao)` (ver a montagem de `linhas`, acima),
  // e `base` é sempre essa MESMA `sessao` do render — ver a chamada de
  // `aoComitarBase` em `aplicarNovasParadas`. Logo `linhaAtual.completo` sempre
  // casa com a lista de `base` que contém `linhaAtual.servicoUuid`, e não
  // existe estado em que o `.map()` não ache o Serviço. Quebrar esse pareamento
  // (ex.: passar `sessaoRef.current` como base) ressuscita o descarte silencioso
  // desta task SEM nenhum teste ficar vermelho.
  function comLocaisAtualizados(base: SessaoFormulario, locaisAtualizados: Local[]): SessaoFormulario {
    if (!linhaAtual) return base;
    if (linhaAtual.completo) {
      const servicos = servicosDaSessao(base).map((s) =>
        s.uuid === linhaAtual.servicoUuid ? { ...s, locais: locaisAtualizados } : s,
      );
      return comServicosDaSessao(base, servicos);
    }
    const servicosEmConstrucao = servicosEmConstrucaoDaSessao(base).map((s) =>
      s.uuid === linhaAtual.servicoUuid ? { ...s, locais: locaisAtualizados } : s,
    );
    return { ...base, servicosEmConstrucao };
  }

  /**
   * Grava a rota/paradas recalculadas do itinerário de um Serviço já COMPLETO
   * (documento carregado, ou já promovido no modo "novo" — DEC-053; TASK-061)
   * e, no MESMO commit, reconcilia `matriz_distancias` (TASK-026; RN-054..057)
   * e `matriz_seccionamento` (TASK-088; RN-058/059) do Serviço. Reconciliar
   * aqui, e não como um commit separado, evita a janela em que o documento
   * teria rota nova com qualquer uma das matrizes antigas.
   */
  function servicosComItinerarioAtualizado(
    base: Servico[],
    servicoUuid: string,
    sentido: Sentido,
    paradas: ParadaEmEdicao[],
    rota: Rota,
  ): ResultadoServicosComItinerarioAtualizado {
    const uuidsViagensComAncorasDescartadas: string[] = [];
    const novasParadas = paradasParaContrato(paradas);
    const servicos = base.map((s) => {
      if (s.uuid !== servicoUuid) return s;
      const itinerarios = s.itinerarios.map((it) => {
        if (it.sentido !== sentido) return it;
        const reconciliacao = reconciliarHorariosAposMudancaItinerario(
          it,
          novasParadas,
          rota,
        );
        uuidsViagensComAncorasDescartadas.push(
          ...reconciliacao.uuidsViagensComAncorasDescartadas,
        );
        return reconciliacao.itinerario;
      });
      const servicoAtualizado = { ...s, itinerarios };
      const matrizDistancias = matrizDistanciasDoServico(servicoAtualizado);
      return {
        ...servicoAtualizado,
        matriz_distancias: matrizDistancias,
        matriz_seccionamento: reconciliarMatrizSeccionamento(
          s.matriz_seccionamento,
          matrizDistancias,
        ),
      };
    });
    return { servicos, uuidsViagensComAncorasDescartadas };
  }

  /**
   * Dispara o recálculo ao vivo de UM sentido e grava o resultado (TASK-019;
   * generalizada pela TASK-077 para aceitar qualquer sentido, não só
   * `sentidoSelecionado` — o espelho Ida↔Volta recalcula os DOIS sentidos no
   * mesmo gesto). Sucesso grava a rota nova e reconcilia matrizes/horários
   * (Serviço completo) ou tenta promover (Serviço em construção); falha só
   * acende a pendência ao vivo, sem apagar a última rota válida (RN-048).
   * Mescla sobre a sessão MAIS RECENTE (`sessaoRef`), atualizado
   * SINCRONAMENTE ao final — não pela espera do próximo render — para que a
   * chamada seguinte (o recálculo do sentido ESPELHADO, sequencial a este)
   * enxergue este write-back mesmo que o `await` do OSRM resolva antes do
   * ciclo de render do React.
   */
  async function recalcularERegistrar(
    servicoUuid: string,
    sentido: Sentido,
    completo: boolean,
    chave: string,
    paradasDoSentido: readonly ParadaEmEdicao[],
    pontosDoSentido: readonly PontoDeRota[],
    secoesParaResolver: Secao[],
    locaisParaResolver: Local[],
  ) {
    const resultado = await dispararRecalculo(
      paradasDoSentido,
      secoesParaResolver,
      locaisParaResolver,
      servicoUuid,
      sentido,
      pontosDoSentido,
    );

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

    if (completo && resultado.estado.situacao === "recalculada") {
      // Serviço já completo (documento carregado, ou já promovido — DEC-053):
      // grava a rota+paradas novas e reconcilia a matriz no mesmo commit
      // (RN-054..057).
      const atualizacaoServico = servicosComItinerarioAtualizado(
        servicosDaSessao(atual),
        servicoUuid,
        sentido,
        [...paradasDoSentido],
        resultado.estado.rota,
      );
      const servicosAtualizados = atualizacaoServico.servicos;
      proxima = comServicosDaSessao(proxima, servicosAtualizados);

      // DEC-048/049: mudar ordem/conjunto reseta os horários e descarta, no
      // MESMO update, somente as âncoras efêmeras das Viagens reconciliadas.
      // Mudança apenas de rota devolve a lista vazia e preserva âncoras/offsets.
      if (atualizacaoServico.uuidsViagensComAncorasDescartadas.length > 0) {
        proxima = {
          ...proxima,
          ancorasHorario: removerAncorasHorarioDeViagens(
            proxima.ancorasHorario ?? {},
            atualizacaoServico.uuidsViagensComAncorasDescartadas,
          ),
        };
      }

      // TASK-084 (RN-018): a remoção de parada pode ter deixado de referenciar
      // uma Seção em TODOS os itinerários do Serviço — limpa a contribuição
      // dele e descarta a Seção que ficar órfã, no MESMO commit (senão o
      // documento fica com a violação estrutural RN-018 até o próximo gesto).
      // Ao espelhar remoção nos dois sentidos (TASK-077), a Seção só fica
      // realmente órfã depois que o SEGUNDO write-back (o do sentido
      // espelhado) fechar — comportamento correto por construção, pois este
      // write-back lê `secoesDaSessao(atual)` no momento em que roda.
      const servicoAtualizado = servicosAtualizados.find((s) => s.uuid === servicoUuid);
      if (servicoAtualizado) {
        const secoesLimpas = limparSecoesAposEdicaoDeParadas(
          secoesDaSessao(atual),
          servicoAtualizado,
        );
        proxima = comSecoesAtualizadas(proxima, secoesLimpas);
      }
    } else if (!completo && resultado.estado.situacao === "recalculada") {
      // Ainda em construção, em QUALQUER modo (DEC-053/TASK-061; gate de modo
      // removido pela TASK-080): tenta promover. "Ambos" só promove quando os
      // dois sentidos têm rota válida — o sentido que falta permanece em
      // `servicosEmConstrucao`. `proxima` já carrega `estadosRotaViva`
      // atualizado com o resultado deste recálculo.
      proxima = promoverServicoNaSessao(proxima, servicoUuid);
    }

    // Atualiza a ref IMEDIATAMENTE (não espera o próximo render) — essencial
    // quando esta chamada é a PRIMEIRA de duas sequenciais no mesmo gesto
    // (TASK-077): a segunda (sentido espelhado) precisa enxergar este
    // write-back ao ler `sessaoRef.current`, mesmo que o React ainda não
    // tenha re-renderizado com a nova `sessao`.
    sessaoRef.current = proxima;
    aoAtualizarSessao(proxima);
  }

  /**
   * Comita a nova sequência de paradas do sentido SELECIONADO imediatamente
   * (RN-052: reordenar/inserir/remover é aplicado na tabela na hora) e
   * dispara o recálculo ao vivo (assíncrono). `opcoes.aoComitarBase` dobra
   * uma mudança de Seção/Local NO MESMO commit síncrono (ver nota acima);
   * `secoesParaResolver`/`locaisParaResolver` (default: os arrays já
   * renderizados) são os que `dispararRecalculo` efetivamente resolve —
   * precisam incluir a entidade recém-criada/atualizada quando
   * `aoComitarBase` a introduz, senão a resolução (RN-036) não a encontra.
   *
   * `opcoes.gestoSecao` (TASK-077; DEC-063/071) dispara o espelhamento
   * Ida↔Volta num Serviço bidirecional: a lista espelhada do sentido OUTRO é
   * computada a partir do gesto atômico (nunca por diff da sequência final —
   * DEC-071) e comitada no MESMO commit síncrono das paradas do sentido
   * editado; os dois recálculos disparam em SEQUÊNCIA (editado → espelhado),
   * nunca em paralelo, para não correr sobre `sessaoRef`.
   */
  async function aplicarNovasParadas(
    novasParadas: ParadaEmEdicao[],
    opcoes: {
      secoesParaResolver?: Secao[];
      locaisParaResolver?: Local[];
      aoComitarBase?: (base: SessaoFormulario) => SessaoFormulario;
      /** Pontos de rota a reaplicar neste recálculo (Spec 03 §3.6.2). Default:
       * os do último estado conhecido, RE-ANCORADOS para `novasParadas`
       * (TASK-066; DEC-056/DEC-060) — a maioria dos gestos (Seção/Local/
       * reordenar) muda o CONJUNTO ou a ORDEM das paradas sem tocar pontos de
       * rota diretamente; só os handlers de ponto de rota (TASK-063) passam a
       * lista já atualizada (paradas inalteradas — a re-ancoragem vira no-op). */
      pontosDeRota?: readonly PontoDeRota[];
      /** Gesto atômico de Seção do sentido EDITADO — `undefined` para gestos
       * que não tocam a subsequência de Seções (Local, ponto de rota, arrasto
       * de coordenada): esses nunca espelham (Locais/pontos de rota são
       * livres por sentido, Spec 02 §14, Spec 04 §7.2). */
      gestoSecao?: GestoSecao;
      /** Paradas do sentido OUTRO já prontas (TASK-094; DEC-076) — usado pela
       * remoção de entidade Local legada com dois pontos, cujas Paradas nos
       * DOIS sentidos saem no mesmo commit, sem ser um espelho de Seção
       * (`gestoSecao`). Tem prioridade sobre `espelharGestoDeSecao` quando
       * presente. */
      paradasOutroSentidoForcadas?: ParadaEmEdicao[];
    } = {},
  ) {
    if (!linhaAtual || !sentidoSelecionado || !recursosMunicipio) return;
    const chave = chaveItinerario(linhaAtual.servicoUuid, sentidoSelecionado);
    // Pontos de rota a reaplicar neste gesto (Spec 03 §3.6.2) — comitados no
    // MESMO commit síncrono das paradas (TASK-071; DEC-058), para que
    // sobrevivam caso o recálculo abaixo falhe (RN-048: sem-rota não pode
    // apagar o traçado forçado da sessão). Re-ancorados ANTES do commit
    // (TASK-066): reaplicar `apos_parada_ordem` cru contra a lista de paradas
    // que acabou de mudar é o bug que gerava rejeição não tratada (remoção) ou
    // reancoragem silenciosa ao par errado (inserção/reordenação).
    const reancoragemAutomatica = opcoes.pontosDeRota === undefined;
    const pontosParaReaplicar =
      opcoes.pontosDeRota ??
      reancorarPontosDeRota(
        paradasAtual.map(chaveParadaEmEdicao),
        novasParadas.map(chaveParadaEmEdicao),
        pontosDeRotaAtual,
      );
    if (reancoragemAutomatica) {
      const houveDescarte = pontosParaReaplicar.length < pontosDeRotaAtual.length;
      definirDescartePontoDeRotaMapa((mapa) => ({ ...mapa, [chave]: houveDescarte }));
    }

    // Espelho Ida↔Volta (TASK-077; DEC-063/071) — computado a partir do
    // estado do sentido OUTRO lido neste render (`paradasOutroSentido`), o
    // mesmo padrão que `paradasAtual` já usa para o sentido corrente. Sem
    // `gestoSecao` (gesto que não toca Seção) ou sem o outro sentido existir
    // (RN-038, Serviço unidirecional) não há o que espelhar.
    const chaveOutro =
      sentidoOutro && linhaAtual ? chaveItinerario(linhaAtual.servicoUuid, sentidoOutro) : undefined;
    const paradasEspelhadas =
      opcoes.paradasOutroSentidoForcadas ??
      (sentidoOutro && chaveOutro && opcoes.gestoSecao && paradasOutroSentido
        ? espelharGestoDeSecao(paradasOutroSentido, opcoes.gestoSecao, novasParadas)
        : undefined);
    const pontosEspelhados =
      paradasEspelhadas && paradasOutroSentido
        ? reancorarPontosDeRota(
            paradasOutroSentido.map(chaveParadaEmEdicao),
            paradasEspelhadas.map(chaveParadaEmEdicao),
            pontosDeRotaOutroSentido ?? [],
          )
        : undefined;

    // `aoComitarBase` recebe a `sessao` DO RENDER, nunca `sessaoRef.current`:
    // `comLocaisAtualizados` decide em qual lista gravar a partir de
    // `linhaAtual`, que é derivada dessa mesma `sessao` (TASK-096). Trocar a
    // base aqui desfaz esse pareamento e o Local volta a ser descartado calado.
    const base = opcoes.aoComitarBase ? opcoes.aoComitarBase(sessao) : sessao;
    const paradasMapa = { ...(base.paradasEmEdicao ?? {}), [chave]: novasParadas };
    const pontosDeRotaMapa = { ...(base.pontosDeRotaEmEdicao ?? {}), [chave]: [...pontosParaReaplicar] };
    if (chaveOutro && paradasEspelhadas) {
      paradasMapa[chaveOutro] = paradasEspelhadas;
      pontosDeRotaMapa[chaveOutro] = [...(pontosEspelhados ?? [])];
    }
    const proximaBase: SessaoFormulario = {
      ...base,
      paradasEmEdicao: paradasMapa,
      pontosDeRotaEmEdicao: pontosDeRotaMapa,
    };
    sessaoRef.current = proximaBase;
    aoAtualizarSessao(proximaBase);

    definirRecalculando(true);
    await recalcularERegistrar(
      linhaAtual.servicoUuid,
      sentidoSelecionado,
      linhaAtual.completo,
      chave,
      novasParadas,
      pontosParaReaplicar,
      opcoes.secoesParaResolver ?? secoes,
      opcoes.locaisParaResolver ?? linhaAtual.locais,
    );
    if (sentidoOutro && chaveOutro && paradasEspelhadas) {
      await recalcularERegistrar(
        linhaAtual.servicoUuid,
        sentidoOutro,
        linhaAtual.completo,
        chaveOutro,
        paradasEspelhadas,
        pontosEspelhados ?? [],
        opcoes.secoesParaResolver ?? secoes,
        opcoes.locaisParaResolver ?? linhaAtual.locais,
      );
    }
    definirRecalculando(false);
  }

  function moverParada(deIndice: number, paraIndice: number) {
    if (paraIndice < 0 || paraIndice >= paradasAtual.length) return;
    // Mover só é gesto de SEÇÃO quando altera DE FATO a subsequência de
    // Seções do sentido editado (TASK-093; DEC-074 item 1) — mover um Local,
    // ou mover uma Seção por cima/baixo de um Local (troca adjacente que
    // mantém a subsequência idêntica), não espelha nem recalcula o outro
    // sentido (Locais são livres por sentido — Spec 02 §14; Spec 04 §7.2).
    const paradaMovida = paradasAtual[deIndice];
    const novasParadas = reordenarParada(paradasAtual, deIndice, paraIndice);
    const subsequenciaAntes = subsequenciaSecoes(paradasAtual);
    const subsequenciaDepois = subsequenciaSecoes(novasParadas);
    const subsequenciaMudou =
      subsequenciaAntes.length !== subsequenciaDepois.length ||
      subsequenciaAntes.some((uuid, indice) => uuid !== subsequenciaDepois[indice]);
    const gestoSecao: GestoSecao | undefined =
      paradaMovida.tipo === "secao" && subsequenciaMudou
        ? { tipo: "movimento", secaoUuid: paradaMovida.secaoUuid }
        : undefined;
    void aplicarNovasParadas(novasParadas, { gestoSecao });
  }

  function removerParadaNaTabela(indice: number) {
    const paradaRemovida = paradasAtual[indice];
    if (paradaRemovida.tipo === "local") {
      removerEntidadeLocalNaTabela(paradaRemovida.localUuid);
      return;
    }
    const gestoSecao: GestoSecao = { tipo: "remocao", secaoUuid: paradaRemovida.secaoUuid };
    void aplicarNovasParadas(removerParada(paradasAtual, indice), { gestoSecao });
  }

  function aoRecalcularManualmente() {
    void aplicarNovasParadas(paradasAtual);
  }

  // Índice (0-based) em que uma nova Parada clicada em `posicaoNaLinha` deve
  // entrar em `paradasAtual` — `undefined` quando não há âncora (sem posição,
  // itinerário sem rota/paradas resolvidas, ou falha geométrica), caso em que
  // o chamador acrescenta ao FIM (RN-034/035, comportamento preservado desde a
  // TASK-067). Extraído de `prepararInsercaoDeParada` (TASK-095) para ser
  // reusado pela linha-formulário inline, que precisa da MESMA âncora antes de
  // qualquer entidade existir, só para posicionar a linha na tabela.
  function indiceInsercaoParaPosicao(posicaoNaLinha?: Coordenada): number | undefined {
    if (!posicaoNaLinha || !linhaAtual || !sentidoSelecionado || !linhaRotaAtual) {
      return undefined;
    }
    const resolucao = resolverParadasRota(
      paradasAtual,
      secoes,
      linhaAtual.locais,
      linhaAtual.servicoUuid,
      sentidoSelecionado,
    );
    if (!resolucao.ok) return undefined;

    const paradasCoordenadas: Coordenada[] = resolucao.paradas.map((ponto) => ({
      lng: ponto.longitude,
      lat: ponto.latitude,
    }));
    const ancoragem = ancorarPontoNaRota(
      posicaoNaLinha,
      linhaRotaAtual.pontos,
      paradasCoordenadas,
    );
    // `aposParadaOrdem` é 1-based e também é exatamente o índice 0-based em
    // que a nova Parada deve entrar: trecho 2→3 ⇒ índice 2 ⇒ nova ordem 3.
    return ancoragem?.aposParadaOrdem;
  }

  function prepararInsercaoDeParada(
    parada: ParadaEmEdicao,
    posicaoNaLinha?: Coordenada,
  ):
    | { paradas: ParadaEmEdicao[]; pontosDeRota?: readonly PontoDeRota[] }
    | undefined {
    const indiceInsercao = indiceInsercaoParaPosicao(posicaoNaLinha);
    if (indiceInsercao === undefined) {
      return { paradas: inserirParada(paradasAtual, parada) };
    }

    const paradas = inserirParada(paradasAtual, parada, indiceInsercao);
    const pontosDeRota = reancorarPontosDeRotaNaInsercaoPosicional(
      paradasAtual.map(chaveParadaEmEdicao),
      paradas.map(chaveParadaEmEdicao),
      pontosDeRotaAtual,
      linhaRotaAtual!.pontos,
      posicaoNaLinha!,
    );
    return { paradas, pontosDeRota };
  }

  // Clicar/reutilizar no editor de Seções insere uma nova parada quando a
  // Seção ainda não está no itinerário corrente; arrastar um ponto já
  // inserido só atualiza a geolocalização (inferência controlada — ambos os
  // gestos chamam `aoAtualizarSecao`; distinguir exigiria mudar a API do
  // `EditorSecoes`, fora do escopo desta task).
  function aoCriarOuAtualizarSecao(secao: Secao, posicaoNaLinha?: Coordenada) {
    if (!linhaAtual) return;
    const secoesAtualizadas = secoes.some((s) => s.uuid === secao.uuid)
      ? secoes.map((s) => (s.uuid === secao.uuid ? secao : s))
      : [...secoes, secao];
    const jaEhParada = paradasAtual.some((p) => p.tipo === "secao" && p.secaoUuid === secao.uuid);
    const insercao = jaEhParada
      ? { paradas: paradasAtual }
      : prepararInsercaoDeParada(paradaDeSecao(secao.uuid), posicaoNaLinha);
    if (!insercao) return;
    // Insere/reutiliza é gesto de SEÇÃO (TASK-077; DEC-063/071) só quando
    // realmente introduz uma parada nova — arrastar um ponto já inserido
    // (`jaEhParada`) é mudança de coordenada, não de conjunto, e não espelha.
    const gestoSecao: GestoSecao | undefined = jaEhParada
      ? undefined
      : { tipo: "insercao", secaoUuid: secao.uuid };
    void aplicarNovasParadas(
      insercao.paradas,
      {
        secoesParaResolver: secoesAtualizadas,
        aoComitarBase: (base) => comSecoesAtualizadas(base, secoesAtualizadas),
        pontosDeRota: insercao.pontosDeRota,
        gestoSecao,
      },
    );
  }

  // Locais do Serviço `servicoUuid`, completo OU em construção — insumo da
  // cascata de translação (abaixo), que precisa resolver rota de Serviços
  // que não são necessariamente `linhaAtual`.
  function locaisDoServico(sessaoBase: SessaoFormulario, servicoUuid: string): Local[] {
    const completo = servicosDaSessao(sessaoBase).find((s) => s.uuid === servicoUuid);
    if (completo) return completo.locais;
    const emConstrucao = servicosEmConstrucaoDaSessao(sessaoBase).find((s) => s.uuid === servicoUuid);
    return emConstrucao?.locais ?? [];
  }

  /**
   * Confirmação da translação rígida de uma Seção INTEIRA (arrasto pelo
   * botão esquerdo — TASK-078; DEC-061/079): grava a Seção transladada e
   * dispara o recálculo (RN-052) e a reconciliação de matrizes (RN-054..057)
   * de TODOS os itinerários — de TODOS os Serviços, completos e em
   * construção, Ida e Volta — que referenciam a Seção, não só o Serviço/
   * sentido em foco na etapa (o `EditorMapaItinerario` só conhece o corrente
   * — Risco "cascata multi-Serviço" da análise). Sequencial (nunca em
   * paralelo, para não correr sobre `sessaoRef` — mesmo padrão do espelho
   * Ida↔Volta da TASK-077); falha de OSRM num itinerário não impede os
   * demais (RN-048), tratada dentro de `recalcularERegistrar`.
   */
  async function aoTransladarSecao(secaoTransladada: Secao) {
    const secoesAtualizadas = secoes.map((s) =>
      s.uuid === secaoTransladada.uuid ? secaoTransladada : s,
    );
    const baseComSecoes = comSecoesAtualizadas(sessao, secoesAtualizadas);
    sessaoRef.current = baseComSecoes;
    aoAtualizarSessao(baseComSecoes);

    const referenciaSecao = (paradas: readonly ParadaEmEdicao[]) =>
      paradas.some((p) => p.tipo === "secao" && p.secaoUuid === secaoTransladada.uuid);

    const alvos: { servicoUuid: string; sentido: Sentido; completo: boolean }[] = [];
    for (const servico of servicosDaSessao(baseComSecoes)) {
      for (const itinerario of servico.itinerarios) {
        if (referenciaSecao(paradasDe(servico.uuid, itinerario.sentido, baseComSecoes))) {
          alvos.push({ servicoUuid: servico.uuid, sentido: itinerario.sentido, completo: true });
        }
      }
    }
    for (const servico of servicosEmConstrucaoDaSessao(baseComSecoes)) {
      for (const sentidoDoServico of sentidosDeDirecionalidade(servico.direcionalidade)) {
        if (referenciaSecao(paradasDe(servico.uuid, sentidoDoServico, baseComSecoes))) {
          alvos.push({ servicoUuid: servico.uuid, sentido: sentidoDoServico, completo: false });
        }
      }
    }

    definirRecalculando(true);
    for (const alvo of alvos) {
      const atual = sessaoRef.current;
      await recalcularERegistrar(
        alvo.servicoUuid,
        alvo.sentido,
        alvo.completo,
        chaveItinerario(alvo.servicoUuid, alvo.sentido),
        paradasDe(alvo.servicoUuid, alvo.sentido, atual),
        pontosDeRotaDoItinerario(atual, alvo.servicoUuid, alvo.sentido),
        secoesAtualizadas,
        locaisDoServico(atual, alvo.servicoUuid),
      );
    }
    definirRecalculando(false);
  }

  /**
   * Botão "redefinir Seção" na linha da tabela lateral (TASK-100; DEC-080):
   * colapsa TODOS os pontos da Seção na coordenada do Serviço/sentido em edição
   * (`linhaAtual.servicoUuid`/`sentidoSelecionado` — o ponto visualizado na
   * linha onde o clique ocorreu). Confirmação explícita via `window.confirm`
   * (mesmo padrão de `etapa-viagens.tsx`); só o OK aplica. Reusa `redefinirSecao`
   * (variante do motor de translação com destino fixo) e delega o commit +
   * recálculo em cascata multi-Serviço a `aoTransladarSecao`, exatamente como o
   * arrasto da TASK-078 — sem duplicar a lógica de RN-052/054..057/048.
   */
  function redefinirSecaoNaTabela(secao: Secao) {
    if (!linhaAtual || !sentidoSelecionado || !recursosMunicipio) return;
    const entrada = secao.servicos.find((s) => s.servico_uuid === linhaAtual.servicoUuid);
    const destino =
      sentidoSelecionado === "ida" ? entrada?.geolocalizacao_ida : entrada?.geolocalizacao_volta;
    // Guarda defensiva: a Seção é parada do itinerário corrente, então o
    // Serviço/sentido em edição sempre contribuiu um ponto (RN-026). Sem ponto
    // de origem, não há destino previsível — não faz nada.
    if (!destino) return;

    const confirmado =
      typeof window === "undefined" ||
      window.confirm(
        "Gostaria de redefinir todas as geolocalizações desta seção em todos os serviços e sentidos?",
      );
    if (!confirmado) return;

    const resultado = redefinirSecao({
      secao,
      destino,
      features: recursosMunicipio.features,
      nomes: recursosMunicipio.nomes,
    });
    if (!resultado.ok) {
      // Destino fora de SP → recusa INTEGRAL: nenhum ponto se move (não
      // chamamos `aoTransladarSecao`, a sessão fica intacta).
      definirMensagemRedefinirSecao(MENSAGEM_FORA_DE_SP_SECAO);
      return;
    }
    definirMensagemRedefinirSecao(null);
    void aoTransladarSecao(resultado.secao);
  }

  function aoCriarLocal(local: Local, posicaoNaLinha?: Coordenada) {
    if (!linhaAtual) return;
    const locaisAtualizados = [...linhaAtual.locais, local];
    const insercao = prepararInsercaoDeParada(paradaDeLocal(local.uuid), posicaoNaLinha);
    if (!insercao) return;
    void aplicarNovasParadas(insercao.paradas, {
      locaisParaResolver: locaisAtualizados,
      aoComitarBase: (base) => comLocaisAtualizados(base, locaisAtualizados),
      pontosDeRota: insercao.pontosDeRota,
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

  // Sugestão de nome pela via mais próxima (TASK-133; DEC-112): dispara
  // `/nearest` para `posicao` e, na resposta, preenche `nomeCriacaoInline`
  // conforme `sobrescrever` — `false` na abertura (só entra se o campo
  // seguir vazio no momento em que a resposta chega, lido do "latest ref"),
  // `true` no clique de "Atualizar ponto" (gesto explícito, DEC-112 §2). O
  // token descarta qualquer resposta de um disparo anterior — dupla consulta
  // ou cancelamento no meio do caminho (RN-052: só dispara em gesto de
  // criação, nunca ao digitar coordenada, importar ou renderizar).
  function dispararSugestaoNome(posicao: Coordenada, opcoes: { sobrescrever: boolean }) {
    const meuToken = ++sugestaoTokenRef.current;
    definirSugerindoNome(true);
    definirAvisoSugestaoNome(null);
    void sugerirNomeDeParada({ latitude: posicao.lat, longitude: posicao.lng }).then(
      (resultado) => {
        if (sugestaoTokenRef.current !== meuToken) return;
        definirSugerindoNome(false);
        if (!resultado.ok) {
          definirAvisoSugestaoNome(MENSAGEM_AVISO_SUGESTAO_NOME);
          return;
        }
        if (opcoes.sobrescrever || !nomeCriacaoInlineRef.current.trim()) {
          definirNomeCriacaoInline(resultado.nome);
        }
      },
    );
  }

  // Criação inline de Seção/Local (TASK-095; DEC-077): o usuário escolhe o
  // tipo no menu do mapa (`EditorMapaItinerario.aoIniciarCriacaoParada`) e a
  // linha-formulário abre na tabela lateral, na posição de inserção. Confirmar
  // chama os MESMOS motores puros (`criarSecaoNoPonto`/`criarLocalNoPonto`,
  // TASK-017/018) que o antigo painel abaixo do mapa chamava — só o container
  // visual muda; validação/espelhamento continuam intocados (TASK-094).
  function iniciarCriacaoParada(
    tipo: "secao" | "local",
    posicao: Coordenada,
    posicaoNaLinha?: Coordenada,
  ) {
    definirCriacaoInline({ tipo, posicao, posicaoNaLinha });
    definirNomeCriacaoInline("");
    definirLatitudeCriacaoInline(formatarCoordenada(posicao.lat));
    definirLongitudeCriacaoInline(formatarCoordenada(posicao.lng));
    definirMensagemCriacaoInline(null);
    dispararSugestaoNome(posicao, { sobrescrever: false });
  }

  function cancelarCriacaoInline() {
    definirCriacaoInline(null);
    definirNomeCriacaoInline("");
    definirLatitudeCriacaoInline("");
    definirLongitudeCriacaoInline("");
    definirMensagemCriacaoInline(null);
    sugestaoTokenRef.current++;
    definirSugerindoNome(false);
    definirAvisoSugestaoNome(null);
  }

  // Botão "Atualizar ponto" (TASK-132): só move o marcador pendente no mapa —
  // não cria nada, não recalcula rota (RN-052 só dispara na confirmação).
  // TASK-133: também recarrega a sugestão de nome para o novo ponto,
  // sobrescrevendo o campo (gesto explícito, DEC-112 §2).
  function atualizarPontoCriacaoInline() {
    if (!criacaoInline) return;
    const resultado = interpretarParDeCoordenadas(latitudeCriacaoInline, longitudeCriacaoInline);
    if (!resultado.ok) {
      definirMensagemCriacaoInline(resultado.mensagem);
      return;
    }
    definirCriacaoInline({ ...criacaoInline, posicao: resultado.posicao });
    definirMensagemCriacaoInline(null);
    dispararSugestaoNome(resultado.posicao, { sobrescrever: true });
  }

  function confirmarCriacaoInline() {
    if (!criacaoInline || !nomeCriacaoInline.trim() || !recursosMunicipio) return;
    if (!linhaAtual || !sentidoSelecionado) return;
    // A coordenada que vale é a CORRENTE dos campos (DEC-112 item 5): "o que
    // está no campo é o que vale", mesmo sem clicar em "Atualizar ponto".
    const resultadoCoordenada = interpretarParDeCoordenadas(
      latitudeCriacaoInline,
      longitudeCriacaoInline,
    );
    if (!resultadoCoordenada.ok) {
      definirMensagemCriacaoInline(resultadoCoordenada.mensagem);
      return;
    }
    const ponto = {
      latitude: resultadoCoordenada.posicao.lat,
      longitude: resultadoCoordenada.posicao.lng,
    };

    if (criacaoInline.tipo === "secao") {
      const resultado = criarSecaoNoPonto({
        nome: nomeCriacaoInline,
        ponto,
        servicoUuid: linhaAtual.servicoUuid,
        sentido: sentidoSelecionado,
        bidirecional,
        features: recursosMunicipio.features,
        nomes: recursosMunicipio.nomes,
      });
      if (!resultado.ok) {
        definirMensagemCriacaoInline(MENSAGEM_FORA_DE_SP_SECAO);
        return;
      }
      aoCriarOuAtualizarSecao(resultado.secao, criacaoInline.posicaoNaLinha);
    } else {
      const resultado = criarLocalNoPonto({
        nome: nomeCriacaoInline,
        ponto,
        sentido: sentidoSelecionado,
        features: recursosMunicipio.features,
        nomes: recursosMunicipio.nomes,
      });
      if (!resultado.ok) {
        definirMensagemCriacaoInline(MENSAGEM_FORA_DE_SP_LOCAL);
        return;
      }
      aoCriarLocal(resultado.local, criacaoInline.posicaoNaLinha);
    }
    cancelarCriacaoInline();
  }

  // DEC-076: o "X" da linha de um Local na tabela lateral remove a ENTIDADE
  // de `servico.locais[]` e toda Parada que a referencie. Para Local legado
  // com dois pontos (documento importado), a Parada do sentido OUTRO também
  // sai — no mesmo commit síncrono, via `paradasOutroSentidoForcadas` — e
  // aquele sentido é recalculado; para o Local unidirecional comum (DEC-075),
  // só o sentido corrente tem Parada a remover.
  function removerEntidadeLocalNaTabela(localUuid: string) {
    if (!linhaAtual) return;
    const locaisAtualizados = removerEntidadeLocal(linhaAtual.locais, localUuid);
    const paradasSemLocal = removerParadasDeLocal(paradasAtual, localUuid);
    const referenciadoNoOutroSentido = paradasOutroSentido?.some(
      (p) => p.tipo === "local" && p.localUuid === localUuid,
    );
    const paradasOutroSentidoForcadas = referenciadoNoOutroSentido
      ? removerParadasDeLocal(paradasOutroSentido!, localUuid)
      : undefined;
    void aplicarNovasParadas(paradasSemLocal, {
      locaisParaResolver: locaisAtualizados,
      aoComitarBase: (base) => comLocaisAtualizados(base, locaisAtualizados),
      paradasOutroSentidoForcadas,
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

  function moverPontoDeRotaNaTabela(
    indicePonto: number,
    direcao: DirecaoMovimentoLista,
  ) {
    const novosPontos = moverPontoDeRotaNaLista(
      paradasAtual,
      pontosDeRotaAtual,
      indicePonto,
      direcao,
    );
    if (!novosPontos) return;
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
              locaisInvalidos={locaisExtremosAtual.map((ocorrencia) => ocorrencia.localUuid)}
              servicoUuid={linhaAtual.servicoUuid}
              sentido={sentidoSelecionado}
              recursosMunicipio={recursosMunicipio}
              aoIniciarCriacaoParada={iniciarCriacaoParada}
              posicaoCriacaoPendente={criacaoInline?.posicao}
              aoAtualizarSecao={aoCriarOuAtualizarSecao}
              aoTransladarSecao={(secao) => void aoTransladarSecao(secao)}
              aoAtualizarLocal={aoAtualizarLocal}
              linhaRota={linhaRotaAtual}
              pontosDeRota={pontosDeRotaAtual}
              aoCriarPontoDeRota={aoCriarPontoDeRota}
              aoMoverPontoDeRota={aoMoverPontoDeRota}
              aoRemoverPontoDeRota={aoRemoverPontoDeRota}
              selecaoAtual={selecao?.chave ?? null}
              aoSelecionarMarcador={(chave) => alternarSelecao(chave, "mapa")}
            />

            <div
              data-testid="coluna-paradas"
              className={`flex min-h-0 flex-col gap-4 ${ALTURA_MAPA_CLASSE_LG}`}
            >
              <PainelReusoSecao
                secoes={secoesParaReuso}
                servicoUuid={linhaAtual.servicoUuid}
                sentido={sentidoSelecionado}
                bidirecional={bidirecional}
                recursosMunicipio={recursosMunicipio}
                aoAtualizarSecao={aoCriarOuAtualizarSecao}
              />

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

              {mensagemRedefinirSecao && (
                <p
                  role="alert"
                  data-testid="mensagem-redefinir-secao"
                  className="text-sm text-erro"
                >
                  {mensagemRedefinirSecao}
                </p>
              )}

              {descartePontoDeRotaMapa[
                chaveItinerario(linhaAtual.servicoUuid, sentidoSelecionado)
              ] && (
                <p
                  role="status"
                  data-testid="aviso-ponto-de-rota-descartado"
                  className="text-sm text-alerta"
                >
                  Um ou mais pontos de rota foram descartados porque o trecho terminal deixou de
                  existir.
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

              {/* Rolagem própria (doc 18 §5) — na coluna larga (`lg:`), o
                  contêiner ocupa o espaço restante da coluna, que está presa à
                  altura do mapa (`ALTURA_MAPA_CLASSE_LG`); empilhado (tela
                  estreita), o teto próprio `max-h-[60vh]` mantém a rolagem
                  funcional mesmo sem a coluna ter altura fixa. */}
              <div className="min-h-0 flex-1 overflow-y-auto max-h-[60vh] lg:max-h-none">
                <Tabela data-testid="tabela-paradas" densidade="compacta">
                  <thead>
                    <tr>
                      <th scope="col">Cidade - Nome</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Mover</th>
                      <th scope="col">Redefinir</th>
                      <th scope="col">Remover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensListaAtual.flatMap((item, indice) => {
                      const linhas: ReactNode[] = [];
                      if (criacaoInline && indiceExibicaoCriacaoInline === indice) {
                        linhas.push(renderizarLinhaFormularioCriacao());
                      }
                      linhas.push(renderizarLinhaItem(item));
                      return linhas;
                    })}
                    {criacaoInline && indiceExibicaoCriacaoInline === itensListaAtual.length
                      ? renderizarLinhaFormularioCriacao()
                      : null}
                  </tbody>
                </Tabela>
              </div>
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

  function renderizarLinhaFormularioCriacao(): ReactNode {
    if (!criacaoInline) return null;
    const ehSecao = criacaoInline.tipo === "secao";
    const rotulo = ehSecao ? "Nome da Seção" : "Nome do Local";
    const testIdForm = ehSecao ? "form-criar-secao" : "form-criar-local";
    const testIdInput = ehSecao ? "nome-secao-input" : "nome-local-input";
    const testIdConfirmar = ehSecao ? "confirmar-criar-secao" : "confirmar-criar-local";
    const rotuloBotao = ehSecao ? "Criar Seção" : "Criar Local";
    return (
      <tr key="linha-formulario-criacao" ref={refLinhaFormularioCriacao}>
        <td colSpan={5} className="p-2">
          <Painel
            tom="padrao"
            elevacao="flutuante"
            data-testid={testIdForm}
            className="flex flex-col gap-3"
          >
            <Campo
              rotulo={rotulo}
              data-testid={testIdInput}
              value={nomeCriacaoInline}
              onChange={(evento) => definirNomeCriacaoInline(evento.target.value)}
            />
            {sugerindoNome ? (
              <p data-testid="sugerindo-nome" className="text-sm text-cinza-500">
                Sugerindo nome…
              </p>
            ) : null}
            {avisoSugestaoNome ? (
              <p
                data-testid="aviso-sugestao-nome"
                className="text-sm text-cinza-500"
              >
                {avisoSugestaoNome}
              </p>
            ) : null}
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Campo
                  rotulo="Latitude"
                  densidade="compacta"
                  inputMode="decimal"
                  data-testid="latitude-criacao-input"
                  value={latitudeCriacaoInline}
                  onChange={(evento) => definirLatitudeCriacaoInline(evento.target.value)}
                />
              </div>
              <div className="flex-1 min-w-0">
                <Campo
                  rotulo="Longitude"
                  densidade="compacta"
                  inputMode="decimal"
                  data-testid="longitude-criacao-input"
                  value={longitudeCriacaoInline}
                  onChange={(evento) => definirLongitudeCriacaoInline(evento.target.value)}
                />
              </div>
            </div>
            {mensagemCriacaoInline ? (
              <p
                role="alert"
                data-testid="mensagem-recusa-criacao-inline"
                className="text-sm text-erro"
              >
                {mensagemCriacaoInline}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Botao
                variante="primario"
                data-testid={testIdConfirmar}
                disabled={!nomeCriacaoInline.trim()}
                onClick={confirmarCriacaoInline}
              >
                {rotuloBotao}
              </Botao>
              <Botao
                variante="secundario"
                data-testid="atualizar-ponto-criacao"
                onClick={atualizarPontoCriacaoInline}
              >
                Atualizar ponto
              </Botao>
              <Botao variante="fantasma" onClick={cancelarCriacaoInline}>
                Cancelar
              </Botao>
            </div>
          </Painel>
        </td>
      </tr>
    );
  }

  function renderizarLinhaItem(item: ItemListaIntercalada): ReactNode {
    if (item.tipo === "ponto-de-rota") {
      const chaveSelecaoPonto = chaveSelecaoDoPontoDeRota(item.indicePonto);
      const pontoSelecionado = selecao?.chave === chaveSelecaoPonto;
      const rotuloPonto = `Ponto de Rota ${item.numeroNaTravessia}`;
      return (
        <tr
          key={`ponto-de-rota-${item.indicePonto}`}
          ref={(elemento) => {
            if (elemento) refsLinhasTabela.current.set(chaveSelecaoPonto, elemento);
            else refsLinhasTabela.current.delete(chaveSelecaoPonto);
          }}
          data-testid="ponto-rota-item"
          data-tipo="ponto-de-rota"
          aria-current={pontoSelecionado ? "true" : undefined}
          onClick={(evento) => {
            if ((evento.target as HTMLElement).closest("button")) return;
            alternarSelecao(chaveSelecaoPonto, "tabela");
          }}
          className={`cursor-pointer text-ciano-500 ${pontoSelecionado ? "bg-azul-100" : ""}`}
        >
          <td>
            <span className="font-semibold">{rotuloPonto}</span>{" "}
            <span className="text-xs text-cinza-500">
              ({item.ponto.latitude.toFixed(5)},{" "}
              {item.ponto.longitude.toFixed(5)})
            </span>
          </td>
          <td />
          <td>
            {/* Setas lado a lado, sem quebrar (TASK-092): o wrap
                dobrava a altura da linha na coluna estreita
                "Mover", contra as linhas compactas da DEC-073. */}
            <div className="flex flex-nowrap gap-1">
              <Botao
                variante="secundario"
                tamanho="compacto"
                data-testid="ponto-rota-mover-cima"
                disabled={
                  !podeMoverPontoDeRotaNaLista(
                    paradasAtual,
                    pontosDeRotaAtual,
                    item.indicePonto,
                    "cima",
                  )
                }
                onClick={() => moverPontoDeRotaNaTabela(item.indicePonto, "cima")}
              >
                ↑
              </Botao>
              <Botao
                variante="secundario"
                tamanho="compacto"
                data-testid="ponto-rota-mover-baixo"
                disabled={
                  !podeMoverPontoDeRotaNaLista(
                    paradasAtual,
                    pontosDeRotaAtual,
                    item.indicePonto,
                    "baixo",
                  )
                }
                onClick={() => moverPontoDeRotaNaTabela(item.indicePonto, "baixo")}
              >
                ↓
              </Botao>
            </div>
          </td>
          {/* Coluna "Redefinir" (TASK-100): vazia em pontos de rota — a ação
              existe só em linhas de Seção. */}
          <td />
          <td>
            <Botao
              variante="fantasma"
              tamanho="compacto"
              data-testid="remover-ponto-rota"
              aria-label={`Remover ${rotuloPonto}`}
              onClick={() => aoRemoverPontoDeRota(item.indicePonto)}
            >
              ✕
            </Botao>
          </td>
        </tr>
      );
    }

    const { parada, indiceParada: indice } = item;
    const localExtremo = localExtremoPorIndice.get(indice);
    const mensagemErro = localExtremo ? mensagemLocalExtremo(localExtremo.posicoes) : undefined;
    const rotulo =
      parada.tipo === "secao"
        ? (() => {
            const secao = secoes.find((s) => s.uuid === parada.secaoUuid);
            return secao ? nomeExibicaoSecao(secao) : parada.secaoUuid;
          })()
        : (() => {
            const local = linhaAtual!.locais.find((l) => l.uuid === parada.localUuid);
            return local ? nomeExibicaoLocal(local) : parada.localUuid;
          })();
    const tipoParada = parada.tipo === "secao" ? "Seção" : "Local de parada";
    // Objeto da Seção para o botão "redefinir" (TASK-100); `undefined` em
    // linhas de Local — a ação existe só em Seções (DEC-080).
    const secaoDaParada =
      parada.tipo === "secao" ? secoes.find((s) => s.uuid === parada.secaoUuid) : undefined;
    const chaveSelecaoParada = chaveSelecaoDaParada(parada);
    const paradaSelecionada = selecao?.chave === chaveSelecaoParada;
    return (
      <tr
        key={`${parada.tipo}-${indice}`}
        ref={(elemento) => {
          if (elemento) refsLinhasTabela.current.set(chaveSelecaoParada, elemento);
          else refsLinhasTabela.current.delete(chaveSelecaoParada);
        }}
        data-testid="parada-item"
        data-estado={localExtremo ? "local-extremo" : undefined}
        aria-current={paradaSelecionada ? "true" : undefined}
        onClick={(evento) => {
          if ((evento.target as HTMLElement).closest("button")) return;
          alternarSelecao(chaveSelecaoParada, "tabela");
        }}
        // Seleção usa `bg-azul-100` (fundo) — canal distinto do
        // `border-erro`/`text-erro` do Local extremo (DEC-070):
        // os dois se compõem na mesma linha sem que um mascare
        // o outro.
        className={`cursor-pointer ${
          localExtremo
            ? "text-erro [&>td]:border-y [&>td]:border-erro [&>td:first-child]:border-l [&>td:last-child]:border-r"
            : ""
        } ${paradaSelecionada ? "bg-azul-100" : ""}`}
      >
        <td>
          {mensagemErro ? (
            <Tooltip
              rotulo={mensagemErro}
              descricaoAcessivel={mensagemErro}
              tabIndex={0}
              aria-invalid="true"
              data-testid="parada-local-extremo"
            >
              <span data-testid="parada-rotulo">{rotulo}</span>
            </Tooltip>
          ) : (
            <span data-testid="parada-rotulo">{rotulo}</span>
          )}
        </td>
        <td>{tipoParada}</td>
        <td>
          {/* Setas lado a lado, sem quebrar (TASK-092): o wrap
              dobrava a altura da linha na coluna estreita
              "Mover", contra as linhas compactas da DEC-073. */}
          <div className="flex flex-nowrap gap-1">
            <Botao
              variante="secundario"
              tamanho="compacto"
              data-testid="parada-mover-cima"
              disabled={indice === 0}
              onClick={() => moverParada(indice, indice - 1)}
            >
              ↑
            </Botao>
            <Botao
              variante="secundario"
              tamanho="compacto"
              data-testid="parada-mover-baixo"
              disabled={indice === paradasAtual.length - 1}
              onClick={() => moverParada(indice, indice + 1)}
            >
              ↓
            </Botao>
          </div>
        </td>
        <td>
          {/* Botão "redefinir Seção" (TASK-100; DEC-080): só em linhas de
              Seção, entre "Mover" e "Remover"; colapsa todos os pontos da
              Seção no ponto do Serviço/sentido em edição, sob confirmação. */}
          {secaoDaParada && (
            <Botao
              variante="fantasma"
              tamanho="compacto"
              data-testid="redefinir-secao"
              aria-label={`Redefinir geolocalizações de ${rotulo}`}
              onClick={() => redefinirSecaoNaTabela(secaoDaParada)}
            >
              ↻
            </Botao>
          )}
        </td>
        <td>
          <Botao
            variante="fantasma"
            tamanho="compacto"
            data-testid="parada-remover"
            aria-label={`Remover ${rotulo}`}
            onClick={() => removerParadaNaTabela(indice)}
          >
            ✕
          </Botao>
        </td>
      </tr>
    );
  }
}
