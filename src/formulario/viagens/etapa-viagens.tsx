"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { ROTULO_SEMANA_PADRAO } from "@/shared/contagens";
import { DIAS_SEMANA, type Itinerario, type Parada, type Secao, type Servico } from "@/shared/contrato";
import { Botao, Campo, Dialogo, MenuFlutuante, Painel, Select, Tabela } from "@/shared/ui";
import { nomeExibicaoSecao } from "@/formulario/secoes";
import {
  ancorasHorarioDaSessao,
  comServicosDaSessao,
  secoesDaSessao,
  servicosDaSessao,
  type AncorasHorarioPorViagem,
  type SessaoFormulario,
} from "@/formulario/sessao";
import {
  atualizarHorarioSaida,
  criarViagemNaCelula,
  editarHorarioPassante,
  gerarViagensPorHeadway,
  inserirViagemPorOffsetRelativo,
  resetarOffsetsEmLote,
  resetarOffsetsViagem,
} from "./acoes-grade";
import {
  apagarViagem,
  apagarViagensDoDia,
  copiarDiaParaDiasComGuarda,
  copiarViagemParaDiaComGuarda,
  diaAoLado,
  semearGradeAPartirDeOutra,
  viagemPertenceAGrade,
  type GradeDestinoViagem,
} from "./copias-grade";
import {
  horaMinutoParaHorarioRelogio,
  atualizarRascunhoHoraMinuto,
  horarioParaHoraMinuto,
  horarioParaSegundos,
  mascararRascunhoHoraMinuto,
} from "./horario-relogio";
import {
  destinoNavegacaoGrade,
  horarioAbsolutoNaParada,
  linhasSecoes,
  montarBlocosDiasComuns,
  montarBlocosFeriados,
  montarBlocosGrade,
  seletorAlvoFocoCelulaGrade,
  type AlvoFocoCelulaGrade,
  type BlocoGrade,
  type CoordenadaCelulaGrade,
  type DiaSemana,
  type TeclaNavegacaoGrade,
} from "./montagem-grade";
import { CampoHorarioGrade } from "./campo-horario-grade";
import { PainelTabelasExcepcionais } from "./painel-tabelas-excepcionais";
import { rotuloTabelaExcepcional } from "./tabelas-excepcionais";
import {
  detectarPartidasCoincidentes,
  type OrigemPartidasCoincidentes,
} from "./partidas-coincidentes";

// Etapa "Viagens e horários" (TASK-028/029/030/105; Spec 04 §8) — grades por
// Serviço × sentido: dias comuns, feriados e uma por Tabela excepcional.
// Preencher a 1ª Seção de um bloco cria a Viagem (RN-061/064/067); alterar um
// horário passante torna a parada âncora e redistribui as derivadas (RN-065),
// com bloqueio de fora-de-ordem; "Restaurar sugestão" (por Viagem e em lote)
// desfaz âncoras (RN-066). O conjunto de âncoras é estado efêmero da sessão
// (DEC-049). TASK-030: grade de feriados, "Copiar dias comuns" (clona com UUIDs
// novas — RN-007), "Copiar viagem para outro dia" e apagar uma Viagem
// (Spec 04 §8.3/§8.4). TASK-106: apresentação tabular compacta, campo textual
// sem seletor nativo, ordenação temporal, seleção por UUID, ações no hover e
// navegação Tab (dia seguinte) / Enter (Seção inferior).

const ROTULO_DIA: Record<DiaSemana, string> = {
  segunda: "SEG",
  terca: "TER",
  quarta: "QUA",
  quinta: "QUI",
  sexta: "SEX",
  sabado: "SAB",
  domingo: "DOM",
};

const DESLOCAMENTO_RELATIVO_PADRAO = "00:10";

interface GradeDaTela {
  id: string;
  destino: GradeDestinoViagem;
  rotulo: string;
}

const GRADE_COMUM: GradeDaTela = {
  id: "comuns",
  rotulo: "Dias comuns",
  destino: {
    viagem_feriado: false,
    tabela_excepcional_uuid: null,
  },
};

const GRADE_FERIADOS: GradeDaTela = {
  id: "feriados",
  rotulo: "Feriados",
  destino: {
    viagem_feriado: true,
    tabela_excepcional_uuid: null,
  },
};

function gradeTabelaExcepcional(
  tabelaUuid: string,
  rotulo: string,
): GradeDaTela {
  return {
    id: `excepcional-${tabelaUuid}`,
    rotulo,
    destino: {
      viagem_feriado: false,
      tabela_excepcional_uuid: tabelaUuid,
    },
  };
}

function entradasHeadwaySaoValidas(
  horarioOrigem: string,
  rascunhoHeadway: string,
  rascunhoLimite: string,
): boolean {
  const headway = horaMinutoParaHorarioRelogio(mascararRascunhoHoraMinuto(rascunhoHeadway));
  const limite = horaMinutoParaHorarioRelogio(mascararRascunhoHoraMinuto(rascunhoLimite));
  return (
    headway !== null &&
    horarioParaSegundos(headway) > 0 &&
    limite !== null &&
    horarioParaSegundos(limite) >= horarioParaSegundos(horarioOrigem)
  );
}

function secaoDaParada(parada: Parada, secoes: readonly Secao[]): Secao | undefined {
  return secoes.find((s) => s.uuid === parada.secao_uuid);
}

/** Chave de identificação de uma célula passante em erro (Viagem × parada). */
function chaveCelula(viagemUuid: string, paradaOrdem: number): string {
  return `${viagemUuid}:${paradaOrdem}`;
}

interface PropsEtapaViagens {
  sessao: SessaoFormulario;
  aoAtualizarSessao: (sessao: SessaoFormulario) => void;
  origemPartidasPendente?: OrigemPartidasCoincidentes | null;
  aoConsumirOrigemPartidas?: () => void;
}

export function EtapaViagens({
  sessao,
  aoAtualizarSessao,
  origemPartidasPendente = null,
  aoConsumirOrigemPartidas,
}: PropsEtapaViagens) {
  const raizEtapaRef = useRef<HTMLDivElement>(null);
  const alvoFocoPendenteRef = useRef<AlvoFocoCelulaGrade | null>(null);
  const seletorNavegacaoPendenteRef = useRef<string | null>(null);
  const temporizadorSaidaHoverRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [servicoSelecionadoUuid, definirServicoSelecionadoUuid] = useState<
    string | null
  >(origemPartidasPendente?.servicoUuid ?? null);
  const [sentidoSelecionado, definirSentidoSelecionado] = useState<
    Itinerario["sentido"] | null
  >(origemPartidasPendente?.sentido ?? null);
  // DEC-086: preferência visual efêmera e independente por Serviço × sentido.
  // Não integra a sessão nem o contrato JSON.
  const [modoCompactoPorSentido, definirModoCompactoPorSentido] = useState<
    Record<string, boolean>
  >({});
  // Células passantes recusadas por fora-de-ordem (Spec 04 §8.2): não confirmam
  // e ficam em erro até uma edição válida. Estado de UI, por célula.
  const [errosCelula, definirErrosCelula] = useState<Record<string, string>>({});
  const [viagemSelecionadaUuid, definirViagemSelecionadaUuid] = useState<string | null>(null);
  const inicioCliqueCelulaRef = useRef<{
    viagemUuid: string;
    estavaSelecionada: boolean;
  } | null>(null);
  const [viagemEmHoverUuid, definirViagemEmHoverUuid] = useState<string | null>(null);
  const [colunaDestinoArrasto, definirColunaDestinoArrasto] = useState<{
    gradeId: string;
    dia: DiaSemana;
  } | null>(null);
  const [avisoCopia, definirAvisoCopia] = useState<string | null>(null);
  // DEC-091: os últimos deslocamentos são uma conveniência da instância aberta
  // da etapa, compartilhada entre Viagens, grades, Serviços e sentidos.
  const [deslocamentoAnterior, definirDeslocamentoAnterior] = useState(DESLOCAMENTO_RELATIVO_PADRAO);
  const [deslocamentoPosterior, definirDeslocamentoPosterior] = useState(DESLOCAMENTO_RELATIVO_PADRAO);
  const ultimoDeslocamentoAnteriorValidoRef = useRef(DESLOCAMENTO_RELATIVO_PADRAO);
  const ultimoDeslocamentoPosteriorValidoRef = useRef(DESLOCAMENTO_RELATIVO_PADRAO);
  const [errosInsercaoRelativa, definirErrosInsercaoRelativa] = useState<Record<string, string>>({});
  const [modoHeadwayPorViagem, definirModoHeadwayPorViagem] = useState<Record<string, boolean>>({});
  const [headwayPorViagem, definirHeadwayPorViagem] = useState<Record<string, string>>({});
  const [limiteHeadwayPorViagem, definirLimiteHeadwayPorViagem] = useState<Record<string, string>>(
    {},
  );
  const [errosHeadway, definirErrosHeadway] = useState<Record<string, string>>({});
  const [copiaDiaAberta, definirCopiaDiaAberta] = useState<{
    dia: DiaSemana;
    grade: GradeDaTela;
  } | null>(null);
  const [menuDiaAberto, definirMenuDiaAberto] = useState<{
    dia: DiaSemana;
    grade: GradeDaTela;
    ancora: { x: number; y: number };
  } | null>(null);
  const [confirmacaoApagarViagemUuid, definirConfirmacaoApagarViagemUuid] = useState<
    string | null
  >(null);
  const [diasDestinoCopia, definirDiasDestinoCopia] = useState<DiaSemana[]>([]);
  const [confirmacaoApagarDia, definirConfirmacaoApagarDia] = useState<{
    dia: DiaSemana;
    grade: GradeDaTela;
  } | null>(null);
  // TASK-112/DEC-087: preferência efêmera de origem, isolada por
  // Serviço × sentido × grade destino. A grade comum é o default compatível
  // com a ação preexistente "Copiar dias comuns".
  const [origemSemeaduraPorDestino, definirOrigemSemeaduraPorDestino] =
    useState<Record<string, string>>({});

  useEffect(
    () => () => {
      if (temporizadorSaidaHoverRef.current) {
        clearTimeout(temporizadorSaidaHoverRef.current);
      }
    },
    [],
  );

  // Uma confirmação pode substituir a célula criável por uma existente ou
  // reordenar os blocos. Reencontra o campo pela identidade da Viagem, antes
  // da pintura, sem disputar foco em atualizações que não vieram da célula.
  useLayoutEffect(() => {
    const seletorNavegacaoPendente = seletorNavegacaoPendenteRef.current;
    if (seletorNavegacaoPendente) {
      seletorNavegacaoPendenteRef.current = null;
      const campoNavegacao = raizEtapaRef.current?.querySelector<HTMLInputElement>(
        seletorNavegacaoPendente,
      );
      if (campoNavegacao) {
        campoNavegacao.focus();
        campoNavegacao.select();
      }
      return;
    }

    const alvoPendente = alvoFocoPendenteRef.current;
    if (!alvoPendente) return;
    alvoFocoPendenteRef.current = null;

    const campo = raizEtapaRef.current?.querySelector<HTMLInputElement>(
      seletorAlvoFocoCelulaGrade(alvoPendente),
    );
    if (!campo) return;
    campo.focus();
    const fim = campo.value.length;
    campo.setSelectionRange(fim, fim);
  }, [sessao]);

  function cancelarSaidaHover() {
    if (!temporizadorSaidaHoverRef.current) return;
    clearTimeout(temporizadorSaidaHoverRef.current);
    temporizadorSaidaHoverRef.current = null;
  }

  function mostrarAcoesDaViagem(viagemUuid: string) {
    cancelarSaidaHover();
    definirViagemEmHoverUuid(viagemUuid);
  }

  function ocultarAcoesDaViagem() {
    cancelarSaidaHover();
    definirViagemEmHoverUuid(null);
  }

  function agendarSaidaHover() {
    cancelarSaidaHover();
    temporizadorSaidaHoverRef.current = setTimeout(() => {
      definirViagemEmHoverUuid(null);
      temporizadorSaidaHoverRef.current = null;
    }, 300);
  }

  const servicos: Servico[] = servicosDaSessao(sessao);
  const deteccaoPartidasCoincidentes = useMemo(
    () => detectarPartidasCoincidentes(servicos),
    [servicos],
  );
  const servicoAtual = servicos.find((s) => s.uuid === servicoSelecionadoUuid) ?? null;
  const itinerarioAtual =
    servicoAtual?.itinerarios.find((it) => it.sentido === sentidoSelecionado) ?? null;
  const chaveModoCompacto =
    servicoAtual && itinerarioAtual
      ? `${servicoAtual.uuid}:${itinerarioAtual.sentido}`
      : null;
  const modoCompacto =
    chaveModoCompacto !== null
      ? (modoCompactoPorSentido[chaveModoCompacto] ?? false)
      : false;
  const todasAsSecoes = secoesDaSessao(sessao);
  const ancoras = ancorasHorarioDaSessao(sessao);
  const gradesDisponiveis: GradeDaTela[] = [
    GRADE_COMUM,
    GRADE_FERIADOS,
    ...(servicoAtual?.tabelas_excepcionais ?? []).map((tabela) =>
      gradeTabelaExcepcional(
        tabela.uuid,
        rotuloTabelaExcepcional(tabela),
      ),
    ),
  ];

  function chaveOrigemSemeadura(gradeDestino: GradeDaTela): string | null {
    if (!servicoAtual || !itinerarioAtual) return null;
    return `${servicoAtual.uuid}:${itinerarioAtual.sentido}:${gradeDestino.id}`;
  }

  function origensDaSemeadura(
    gradeDestino: GradeDaTela,
  ): GradeDaTela[] {
    return gradesDisponiveis.filter((grade) => grade.id !== gradeDestino.id);
  }

  function origemSelecionadaDaSemeadura(
    gradeDestino: GradeDaTela,
  ): GradeDaTela {
    const origens = origensDaSemeadura(gradeDestino);
    const chave = chaveOrigemSemeadura(gradeDestino);
    const origemSelecionadaId = chave
      ? origemSemeaduraPorDestino[chave]
      : undefined;
    return (
      origens.find((grade) => grade.id === origemSelecionadaId) ??
      origens.find((grade) => grade.id === GRADE_COMUM.id) ??
      origens[0]
    );
  }

  function definirOrigemDaSemeadura(
    gradeDestino: GradeDaTela,
    gradeOrigemId: string,
  ) {
    const chave = chaveOrigemSemeadura(gradeDestino);
    if (!chave) return;
    definirOrigemSemeaduraPorDestino((atual) => ({
      ...atual,
      [chave]: gradeOrigemId,
    }));
  }

  // DEC-097: o clique no alerta escolhe Serviço/sentido e, na pintura
  // seguinte, posiciona a primeira ocorrência na grade correta. O alvo é
  // estado efêmero da casca e é consumido após o posicionamento.
  useLayoutEffect(() => {
    if (
      !origemPartidasPendente ||
      servicoSelecionadoUuid !== origemPartidasPendente.servicoUuid ||
      sentidoSelecionado !== origemPartidasPendente.sentido
    ) {
      return;
    }
    const seletor = seletorAlvoFocoCelulaGrade({
      grade: origemPartidasPendente.gradeId,
      viagemUuid: origemPartidasPendente.viagemBaseUuid,
      indiceSecao: 0,
      dia: origemPartidasPendente.diaSemana,
    });
    const campo = raizEtapaRef.current?.querySelector<HTMLInputElement>(seletor);
    campo?.closest("td")?.scrollIntoView?.({
      block: "center",
      inline: "center",
    });
    aoConsumirOrigemPartidas?.();
  }, [
    aoConsumirOrigemPartidas,
    origemPartidasPendente,
    sentidoSelecionado,
    servicoSelecionadoUuid,
  ]);

  function registrarInicioCliqueCelula(
    evento: MouseEvent<HTMLTableCellElement>,
    viagemUuid: string,
  ) {
    if ((evento.target as HTMLElement).closest("button")) return;
    inicioCliqueCelulaRef.current = {
      viagemUuid,
      estavaSelecionada: viagemSelecionadaUuid === viagemUuid,
    };
  }

  function alternarSelecaoPorClique(
    evento: MouseEvent<HTMLTableCellElement>,
    viagemUuid: string,
  ) {
    if ((evento.target as HTMLElement).closest("button")) return;
    const inicio = inicioCliqueCelulaRef.current;
    inicioCliqueCelulaRef.current = null;
    const estavaSelecionada =
      inicio?.viagemUuid === viagemUuid
        ? inicio.estavaSelecionada
        : viagemSelecionadaUuid === viagemUuid;
    definirViagemSelecionadaUuid(estavaSelecionada ? null : viagemUuid);
  }

  // Grava o itinerário atualizado pelo caminho unificado de Serviços (DEC-053;
  // TASK-061 — `comServicosDaSessao`: documento carregado ou `sessao.servicos`
  // promovidos no novo) e, opcionalmente, o novo conjunto de âncoras de sessão
  // (DEC-049) — num único update para não haver estado parcial.
  function aplicar(itinerarioAtualizado: Itinerario, ancorasAtualizadas?: AncorasHorarioPorViagem) {
    if (!servicoAtual) return;
    const servicosAtualizados = servicos.map((s) =>
      s.uuid !== servicoAtual.uuid
        ? s
        : {
            ...s,
            itinerarios: s.itinerarios.map((it) =>
              it.sentido === itinerarioAtualizado.sentido ? itinerarioAtualizado : it,
            ),
          },
    );
    aoAtualizarSessao({
      ...comServicosDaSessao(sessao, servicosAtualizados),
      ...(ancorasAtualizadas ? { ancorasHorario: ancorasAtualizadas } : {}),
    });
  }

  // Descarta as âncoras de sessão (DEC-049) e os erros de célula das Viagens
  // removidas — evita entradas órfãs após apagar/sobrescrever.
  function limparEstadoDeSessao(uuidsRemovidos: readonly string[]) {
    if (uuidsRemovidos.length === 0) return;
    const removidos = new Set(uuidsRemovidos);
    definirErrosCelula((atuais) =>
      Object.fromEntries(
        Object.entries(atuais).filter(([chave]) => !removidos.has(chave.split(":")[0])),
      ),
    );
  }

  function ancorasSem(uuidsRemovidos: readonly string[]): AncorasHorarioPorViagem {
    const proximas = { ...ancoras };
    for (const uuid of uuidsRemovidos) delete proximas[uuid];
    return proximas;
  }

  function aoConfirmarCriacao(
    dia: DiaSemana,
    horaMinuto: string,
    grade: GradeDaTela,
  ): boolean {
    if (!itinerarioAtual || horaMinuto === "") return false;
    const viagemNova = criarViagemNaCelula(
      itinerarioAtual,
      dia,
      horaMinuto,
      grade.destino,
    );
    if (!viagemNova) return false;
    alvoFocoPendenteRef.current = {
      grade: grade.id,
      viagemUuid: viagemNova.uuid,
      indiceSecao: 0,
      dia,
    };
    aplicar({ ...itinerarioAtual, viagens: [...itinerarioAtual.viagens, viagemNova] });
    definirViagemSelecionadaUuid(viagemNova.uuid);
    return true;
  }

  function aplicarServicoAtualizado(servicoAtualizado: Servico) {
    const servicosAtualizados = servicos.map((servico) =>
      servico.uuid === servicoAtualizado.uuid ? servicoAtualizado : servico,
    );
    aoAtualizarSessao(comServicosDaSessao(sessao, servicosAtualizados));
  }

  function aoConfirmarPartida(
    viagemUuid: string,
    horaMinuto: string,
    alvoFoco: AlvoFocoCelulaGrade,
  ): boolean {
    if (!itinerarioAtual || horaMinuto === "") return false;
    const viagemOriginal = itinerarioAtual.viagens.find((v) => v.uuid === viagemUuid);
    if (!viagemOriginal) return false;
    const viagemAtualizada = atualizarHorarioSaida(viagemOriginal, horaMinuto);
    if (!viagemAtualizada) return false;
    alvoFocoPendenteRef.current = alvoFoco;
    aplicar({
      ...itinerarioAtual,
      viagens: itinerarioAtual.viagens.map((v) => (v.uuid === viagemUuid ? viagemAtualizada : v)),
    });
    return true;
  }

  function aoInserirViagemPorOffset(viagemUuid: string, direcao: -1 | 1) {
    if (!itinerarioAtual) return;
    const viagem = itinerarioAtual.viagens.find((item) => item.uuid === viagemUuid);
    if (!viagem) return;

    const entrada = direcao === -1 ? deslocamentoAnterior : deslocamentoPosterior;
    const definirDeslocamento =
      direcao === -1 ? definirDeslocamentoAnterior : definirDeslocamentoPosterior;
    const ultimoDeslocamentoValidoRef =
      direcao === -1
        ? ultimoDeslocamentoAnteriorValidoRef
        : ultimoDeslocamentoPosteriorValidoRef;
    const horario = horaMinutoParaHorarioRelogio(entrada);
    if (horario === null) {
      // Uma entrada malformada não pode se propagar para os hovers seguintes
      // (DEC-091); restaura o último valor válido da direção correspondente.
      definirDeslocamento(ultimoDeslocamentoValidoRef.current);
      definirErrosInsercaoRelativa((atuais) => ({
        ...atuais,
        [viagemUuid]: "Informe o deslocamento no formato HH:MM.",
      }));
      return;
    }

    const deslocamentoNormalizado = horarioParaHoraMinuto(horario);
    ultimoDeslocamentoValidoRef.current = deslocamentoNormalizado;
    definirDeslocamento(deslocamentoNormalizado);
    const minutos = horarioParaSegundos(horario) / 60;
    const viagemNova = inserirViagemPorOffsetRelativo(viagem, direcao * minutos);
    if (!viagemNova) {
      definirErrosInsercaoRelativa((atuais) => ({
        ...atuais,
        [viagemUuid]: "O horário resultante deve ficar entre 00:00 e 23:59.",
      }));
      return;
    }

    definirErrosInsercaoRelativa((atuais) => {
      const proximos = { ...atuais };
      delete proximos[viagemUuid];
      return proximos;
    });
    aplicar(
      { ...itinerarioAtual, viagens: [...itinerarioAtual.viagens, viagemNova] },
      { ...ancoras, [viagemNova.uuid]: [...(ancoras[viagemUuid] ?? [])] },
    );
  }

  function aoAlternarModoHeadway(viagemUuid: string) {
    definirModoHeadwayPorViagem((atuais) => ({
      ...atuais,
      [viagemUuid]: !atuais[viagemUuid],
    }));
    definirErrosHeadway((atuais) => {
      const proximos = { ...atuais };
      delete proximos[viagemUuid];
      return proximos;
    });
  }

  function aoGerarViagensPorHeadway(viagemUuid: string) {
    if (!itinerarioAtual) return;
    const viagem = itinerarioAtual.viagens.find((item) => item.uuid === viagemUuid);
    if (!viagem) return;

    const resultado = gerarViagensPorHeadway(
      viagem,
      mascararRascunhoHoraMinuto(headwayPorViagem[viagemUuid] ?? ""),
      mascararRascunhoHoraMinuto(limiteHeadwayPorViagem[viagemUuid] ?? ""),
      itinerarioAtual.viagens,
    );
    if (!resultado.ok) {
      const mensagemPorMotivo = {
        "headway-invalido": "Informe um headway maior que 00:00 no formato HH:MM.",
        "limite-invalido": "Informe o horário-limite no formato HH:MM.",
        "limite-anterior": "O horário-limite não pode ser anterior à partida.",
      } satisfies Record<typeof resultado.motivo, string>;
      definirErrosHeadway((atuais) => ({
        ...atuais,
        [viagemUuid]: mensagemPorMotivo[resultado.motivo],
      }));
      return;
    }

    definirErrosHeadway((atuais) => {
      const proximos = { ...atuais };
      delete proximos[viagemUuid];
      return proximos;
    });
    if (resultado.horariosIgnorados > 0) {
      definirAvisoCopia(
        `${resultado.horariosIgnorados} horário(s) já existente(s) foi(ram) ignorado(s) na geração por headway.`,
      );
    } else {
      definirAvisoCopia(null);
    }
    if (resultado.viagens.length === 0) return;

    const ancorasAtualizadas = { ...ancoras };
    for (const viagemNova of resultado.viagens) {
      ancorasAtualizadas[viagemNova.uuid] = [...(ancoras[viagemUuid] ?? [])];
    }
    aplicar(
      {
        ...itinerarioAtual,
        viagens: [...itinerarioAtual.viagens, ...resultado.viagens],
      },
      ancorasAtualizadas,
    );
  }

  function aoEditarPassante(
    viagemUuid: string,
    paradaOrdem: number,
    horaMinuto: string,
    alvoFoco: AlvoFocoCelulaGrade,
  ): boolean {
    if (!itinerarioAtual || horaMinuto === "") return false;
    const viagem = itinerarioAtual.viagens.find((v) => v.uuid === viagemUuid);
    if (!viagem) return false;

    const resultado = editarHorarioPassante(
      viagem,
      itinerarioAtual,
      ancoras[viagemUuid] ?? [],
      paradaOrdem,
      horaMinuto,
    );
    const chave = chaveCelula(viagemUuid, paradaOrdem);

    if (!resultado.ok) {
      if (resultado.motivo === "fora-de-ordem") {
        definirErrosCelula((atuais) => ({
          ...atuais,
          [chave]: "Horário fora de ordem: deve ficar entre a parada anterior e a próxima já fixadas.",
        }));
      }
      return false;
    }

    definirErrosCelula((atuais) => {
      const proximos = { ...atuais };
      delete proximos[chave];
      return proximos;
    });
    alvoFocoPendenteRef.current = alvoFoco;
    aplicar(
      {
        ...itinerarioAtual,
        viagens: itinerarioAtual.viagens.map((v) => (v.uuid === viagemUuid ? resultado.viagem : v)),
      },
      { ...ancoras, [viagemUuid]: resultado.ancoras },
    );
    return true;
  }

  function aoResetarViagem(viagemUuid: string) {
    if (!itinerarioAtual) return;
    const viagem = itinerarioAtual.viagens.find((v) => v.uuid === viagemUuid);
    if (!viagem) return;
    const viagemResetada = resetarOffsetsViagem(viagem, itinerarioAtual);
    limparEstadoDeSessao([viagemUuid]);
    aplicar(
      {
        ...itinerarioAtual,
        viagens: itinerarioAtual.viagens.map((v) => (v.uuid === viagemUuid ? viagemResetada : v)),
      },
      ancorasSem([viagemUuid]),
    );
  }

  function aoResetarLote() {
    if (!itinerarioAtual) return;
    const confirmado =
      typeof window === "undefined" ||
      window.confirm(
        "Restaurar a sugestão de horários de toda a grade deste sentido? As edições manuais de horário serão descartadas.",
      );
    if (!confirmado) return;
    limparEstadoDeSessao(itinerarioAtual.viagens.map((v) => v.uuid));
    definirErrosCelula({});
    aplicar(
      resetarOffsetsEmLote(itinerarioAtual),
      ancorasSem(itinerarioAtual.viagens.map((v) => v.uuid)),
    );
  }

  function aoCopiarViagemParaGrade(
    viagemUuid: string,
    dia: DiaSemana,
    gradeDestino: GradeDestinoViagem,
  ) {
    if (!itinerarioAtual) return;
    const resultado = copiarViagemParaDiaComGuarda(itinerarioAtual, viagemUuid, dia, {
      ...gradeDestino,
    });
    if (!resultado.ok) {
      if (resultado.motivo === "horario-existente") {
        definirAvisoCopia(`Já tem horário no dia ${ROTULO_DIA[dia]}.`);
      }
      return;
    }
    definirAvisoCopia(null);
    aplicar({ ...itinerarioAtual, viagens: [...itinerarioAtual.viagens, resultado.copia] });
  }

  function aoAtalhoCopia(evento: KeyboardEvent<HTMLDivElement>) {
    if (!evento.ctrlKey || !viagemSelecionadaUuid) return;
    const direcao = evento.key === "ArrowLeft" ? -1 : evento.key === "ArrowRight" ? 1 : null;
    if (direcao === null || !itinerarioAtual) return;
    const origem = itinerarioAtual.viagens.find((viagem) => viagem.uuid === viagemSelecionadaUuid);
    if (!origem) return;
    const diaDestino = diaAoLado(origem.dia_semana, direcao);
    evento.preventDefault();
    if (!diaDestino) return;
    aoCopiarViagemParaGrade(viagemSelecionadaUuid, diaDestino, {
      viagem_feriado: origem.viagem_feriado,
      tabela_excepcional_uuid: origem.tabela_excepcional_uuid,
    });
  }

  function aoIniciarArrasto(evento: DragEvent<HTMLTableCellElement>, viagemUuid: string) {
    if (viagemSelecionadaUuid !== viagemUuid) {
      evento.preventDefault();
      return;
    }
    evento.dataTransfer.effectAllowed = "copy";
    evento.dataTransfer.setData("text/plain", viagemUuid);
    definirAvisoCopia(null);
  }

  function aoSobreporColuna(
    evento: DragEvent<HTMLTableCellElement>,
    grade: GradeDaTela,
    dia: DiaSemana,
  ) {
    evento.preventDefault();
    evento.dataTransfer.dropEffect = "copy";
    definirColunaDestinoArrasto({ gradeId: grade.id, dia });
  }

  function aoSoltarNaColuna(
    evento: DragEvent<HTMLTableCellElement>,
    grade: GradeDaTela,
    dia: DiaSemana,
  ) {
    evento.preventDefault();
    const viagemUuid = evento.dataTransfer.getData("text/plain");
    definirColunaDestinoArrasto(null);
    if (viagemUuid) {
      aoCopiarViagemParaGrade(viagemUuid, dia, grade.destino);
    }
  }

  function aoApagarViagem(viagemUuid: string) {
    if (!itinerarioAtual) return;
    const confirmado =
      typeof window === "undefined" || window.confirm("Apagar esta viagem?");
    if (!confirmado) return;
    limparEstadoDeSessao([viagemUuid]);
    if (viagemSelecionadaUuid === viagemUuid) definirViagemSelecionadaUuid(null);
    aplicar(apagarViagem(itinerarioAtual, viagemUuid), ancorasSem([viagemUuid]));
  }

  function aoAbrirMenuDia(
    evento: MouseEvent<HTMLButtonElement>,
    dia: DiaSemana,
    grade: GradeDaTela,
  ) {
    const caixa = evento.currentTarget.getBoundingClientRect();
    definirMenuDiaAberto({
      dia,
      grade,
      ancora: { x: caixa.left, y: caixa.bottom },
    });
  }

  function aoCopiarDia() {
    if (!itinerarioAtual || !copiaDiaAberta || diasDestinoCopia.length === 0) return;
    const resultado = copiarDiaParaDiasComGuarda(
      itinerarioAtual,
      copiaDiaAberta.dia,
      diasDestinoCopia,
      copiaDiaAberta.grade.destino,
    );
    if (resultado.copias.length > 0) aplicar(resultado.itinerario);
    if (resultado.horariosIgnorados > 0) {
      definirAvisoCopia(
        `${resultado.horariosIgnorados} horário(s) já existente(s) não foi(ram) copiado(s).`,
      );
    } else {
      definirAvisoCopia(null);
    }
    definirCopiaDiaAberta(null);
    definirDiasDestinoCopia([]);
  }

  function aoConfirmarApagarDia() {
    if (!itinerarioAtual || !confirmacaoApagarDia) return;
    const grade = confirmacaoApagarDia.grade.destino;
    const removidas = itinerarioAtual.viagens
      .filter(
        (viagem) =>
          viagem.dia_semana === confirmacaoApagarDia.dia &&
          viagemPertenceAGrade(viagem, grade),
      )
      .map((viagem) => viagem.uuid);
    limparEstadoDeSessao(removidas);
    if (viagemSelecionadaUuid && removidas.includes(viagemSelecionadaUuid)) {
      definirViagemSelecionadaUuid(null);
    }
    aplicar(
      apagarViagensDoDia(itinerarioAtual, confirmacaoApagarDia.dia, grade),
      ancorasSem(removidas),
    );
    definirConfirmacaoApagarDia(null);
  }

  // Semeadura entre grades do mesmo Serviço/sentido (Spec 04 §8.4/§8.5;
  // TASK-112/DEC-087).
  function aoSemearGrade(
    gradeOrigem: GradeDaTela,
    gradeDestino: GradeDaTela,
    modo: "sobrescrever" | "mesclar",
  ) {
    if (!itinerarioAtual) return;
    const viagensDestinoAtuais = itinerarioAtual.viagens.filter((viagem) =>
      viagemPertenceAGrade(viagem, gradeDestino.destino),
    );
    if (modo === "sobrescrever") {
      if (viagensDestinoAtuais.length > 0) {
        const confirmado =
          typeof window === "undefined" ||
          window.confirm(
            `Sobrescrever esta grade com ${gradeOrigem.rotulo}? As Viagens atuais serão descartadas.`,
          );
        if (!confirmado) return;
      }
    }
    const uuidsDestinoAtuais = viagensDestinoAtuais.map((viagem) => viagem.uuid);
    limparEstadoDeSessao(uuidsDestinoAtuais);
    const itinerarioAtualizado = semearGradeAPartirDeOutra(
      itinerarioAtual,
      gradeOrigem.destino,
      gradeDestino.destino,
      modo,
    );
    if (
      viagemSelecionadaUuid &&
      uuidsDestinoAtuais.includes(viagemSelecionadaUuid) &&
      !itinerarioAtualizado.viagens.some(
        (viagem) => viagem.uuid === viagemSelecionadaUuid,
      )
    ) {
      definirViagemSelecionadaUuid(null);
    }
    aplicar(itinerarioAtualizado, ancorasSem(uuidsDestinoAtuais));
  }

  if (servicos.length === 0) {
    return (
      <Painel>
        <p data-testid="viagens-sem-servico">
          Conclua ao menos um Serviço com itinerário e rota calculada na etapa
          Seções, Locais e Itinerários antes de editar viagens e horários.
        </p>
      </Painel>
    );
  }

  const secoesDaGrade = itinerarioAtual
    ? linhasSecoes(itinerarioAtual.paradas, modoCompacto)
    : [];
  const blocosComuns = itinerarioAtual ? montarBlocosDiasComuns(itinerarioAtual.viagens) : [];
  const blocosFeriados = itinerarioAtual ? montarBlocosFeriados(itinerarioAtual.viagens) : [];
  const temFeriado = itinerarioAtual?.viagens.some((v) => v.viagem_feriado) ?? false;

  function navegarNaGrade(
    grade: GradeDaTela,
    origem: CoordenadaCelulaGrade,
    tecla: TeclaNavegacaoGrade,
  ): boolean {
    const destino = destinoNavegacaoGrade(origem, tecla, secoesDaGrade.length);
    if (!destino) return false;
    const seletor =
      `input[data-grade="${grade.id}"]` +
      `[data-bloco="${destino.indiceBloco}"]` +
      `[data-secao-index="${destino.indiceSecao}"]` +
      `[data-dia="${destino.dia}"]`;
    const focoPendente = alvoFocoPendenteRef.current;
    if (
      tecla === "Enter" &&
      focoPendente &&
      destino.indiceBloco === origem.indiceBloco
    ) {
      // A grade pode reordenar a Viagem confirmada. Ao descer dentro do
      // mesmo bloco, segue sua UUID em vez da posição ordinal anterior.
      alvoFocoPendenteRef.current = { ...focoPendente, indiceSecao: destino.indiceSecao };
      return true;
    }
    const alvo = raizEtapaRef.current?.querySelector<HTMLInputElement>(seletor);
    if (!alvo) {
      // Ao confirmar a primeira Seção, o destino de Enter pode ser uma
      // célula passante que só nasce no próximo render. Adia exclusivamente
      // a navegação que acompanha essa confirmação.
      if (!alvoFocoPendenteRef.current) return false;
      alvoFocoPendenteRef.current = null;
      seletorNavegacaoPendenteRef.current = seletor;
      return true;
    }
    // A confirmação pode ter agendado a restauração do foco na própria
    // Viagem (TASK-115). Quando a navegação por teclado encontrou destino,
    // ela tem precedência para cumprir o mapa da TASK-106/TASK-116.
    alvoFocoPendenteRef.current = null;
    alvo.focus();
    alvo.select();
    return true;
  }

  // Corpo compartilhado por todas as grades. Os dois discriminadores seguem
  // juntos em toda criação/cópia para preservar a exclusividade da RN-061.
  function corpoGrade(blocos: BlocoGrade[], grade: GradeDaTela) {
    return blocos.map((bloco, indiceBloco) => {
      return secoesDaGrade.map((parada, indiceSecao) => {
        const secao = secaoDaParada(parada, todasAsSecoes);
        const nomeSecao = secao ? nomeExibicaoSecao(secao) : "";
        const ehPrimeiraSecao = indiceSecao === 0;
        const linhaGrade = (
          <tr
            key={`${indiceBloco}-${parada.ordem}`}
            data-testid="linha-grade"
            className={indiceSecao === 0 && indiceBloco > 0 ? "border-t-2 border-cinza-400" : ""}
          >
            <th
              scope="row"
              className="whitespace-nowrap font-semibold"
              onMouseEnter={ocultarAcoesDaViagem}
            >
              {nomeSecao}
            </th>
            {DIAS_SEMANA.map((dia) => {
              const celula = bloco[dia];
              const colunaEmArrasto =
                colunaDestinoArrasto?.gradeId === grade.id &&
                colunaDestinoArrasto.dia === dia;
              const classeColunaDestino = colunaEmArrasto
                ? "bg-azul-50 outline-2 outline-azul-300"
                : "";

              if (celula.estado === "existente") {
                const horarioHms = horarioAbsolutoNaParada(celula.viagem, parada.ordem);
                const horarioMostrar = horarioHms ? horarioParaHoraMinuto(horarioHms) : "";

                const selecionada = viagemSelecionadaUuid === celula.viagem.uuid;
                const ehReforco =
                  deteccaoPartidasCoincidentes.reforcosUuids.has(
                    celula.viagem.uuid,
                  );
                const emHover = viagemEmHoverUuid === celula.viagem.uuid;
                const ehUltimoDia = dia === DIAS_SEMANA[DIAS_SEMANA.length - 1];
                const posicaoNaSuperficie =
                  indiceSecao === 0
                    ? "inicio"
                    : indiceSecao === secoesDaGrade.length - 1
                      ? "fim"
                      : "meio";
                const classesCelula = [
                  "relative",
                  ehPrimeiraSecao && ehUltimoDia ? "pr-8" : "",
                  selecionada
                    ? [
                        "bg-azul-100 border-x-2 border-azul-600",
                        posicaoNaSuperficie === "inicio" ? "border-t-2" : "",
                        posicaoNaSuperficie === "fim" ? "border-b-2" : "",
                      ].join(" ")
                    : colunaEmArrasto
                      ? "bg-azul-50 outline-2 outline-azul-300"
                      : ehReforco
                        ? [
                            "bg-alerta/15 border-x-2 border-alerta",
                            posicaoNaSuperficie === "inicio" ? "border-t-2" : "",
                            posicaoNaSuperficie === "fim" ? "border-b-2" : "",
                          ].join(" ")
                    : "",
                  selecionada ? "cursor-grab active:cursor-grabbing" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const atributosNavegacao = {
                  "data-grade": grade.id,
                  "data-bloco": indiceBloco,
                  "data-secao-index": indiceSecao,
                  "data-dia": dia,
                  "data-viagem-uuid": celula.viagem.uuid,
                };
                const alvoFoco: AlvoFocoCelulaGrade = {
                  grade: grade.id,
                  viagemUuid: celula.viagem.uuid,
                  indiceSecao,
                  dia,
                };
                const navegar = (tecla: TeclaNavegacaoGrade) =>
                  navegarNaGrade(
                    grade,
                    { indiceBloco, indiceSecao, dia },
                    tecla,
                  );
                const viagemUuid = celula.viagem.uuid;
                const erroInsercaoRelativa = errosInsercaoRelativa[viagemUuid];
                const modoHeadway = modoHeadwayPorViagem[viagemUuid] ?? false;

                if (ehPrimeiraSecao) {
                  return (
                    <td
                      key={dia}
                      data-testid="celula-partida"
                      data-viagem-uuid={viagemUuid}
                      data-selecionada={selecionada ? "true" : undefined}
                      data-reforco={ehReforco ? "true" : undefined}
                      data-superficie-viagem={
                        selecionada || ehReforco ? posicaoNaSuperficie : undefined
                      }
                      className={classesCelula}
                      draggable={selecionada}
                      onMouseDown={(evento) =>
                        registrarInicioCliqueCelula(evento, viagemUuid)
                      }
                      onClick={(evento) =>
                        alternarSelecaoPorClique(evento, viagemUuid)
                      }
                      onFocus={() => {
                        definirViagemSelecionadaUuid(viagemUuid);
                      }}
                      onMouseEnter={() => mostrarAcoesDaViagem(viagemUuid)}
                      onDragStart={(evento) => aoIniciarArrasto(evento, viagemUuid)}
                      onDragOver={(evento) => aoSobreporColuna(evento, grade, dia)}
                      onDrop={(evento) => aoSoltarNaColuna(evento, grade, dia)}
                      onDragEnd={() => definirColunaDestinoArrasto(null)}
                    >
                      <CampoHorarioGrade
                        rotuloAcessivel={`Horário de partida — ${dia}, viagem ${indiceBloco + 1}`}
                        valor={horarioMostrar}
                        aoConfirmar={(valor) =>
                          aoConfirmarPartida(viagemUuid, valor, alvoFoco)
                        }
                        aoNavegar={navegar}
                        atributosNavegacao={atributosNavegacao}
                        aoSelecionar={() => definirViagemSelecionadaUuid(viagemUuid)}
                      />
                      <div
                        data-testid="acao-inserir-anterior"
                        className={`absolute bottom-full left-1/2 z-40 flex -translate-x-1/2 items-stretch gap-1 rounded-controle border border-cinza-200 bg-white p-1 shadow-sombra-3 [transition:opacity_var(--transicao-rapida)] ${
                          emHover ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                        }`}
                        onMouseEnter={() => mostrarAcoesDaViagem(viagemUuid)}
                      >
                        <Campo
                          densidade="compacta"
                          className="min-w-20 text-center tabular-nums"
                          aria-label={`Deslocamento anterior — ${dia}, viagem ${indiceBloco + 1}`}
                          value={deslocamentoAnterior}
                          onChange={(evento) => definirDeslocamentoAnterior(evento.target.value)}
                        />
                        <Botao
                          variante="primario"
                          className="min-w-10"
                          data-testid="inserir-viagem-anterior"
                          aria-label={`Inserir viagem antes — ${dia}, viagem ${indiceBloco + 1}`}
                          onClick={() => aoInserirViagemPorOffset(viagemUuid, -1)}
                        >
                          ↑
                        </Botao>
                      </div>
                      <div
                        data-testid="acoes-viagem"
                        className={`pointer-events-none absolute inset-0 z-30 [transition:opacity_var(--transicao-rapida)] ${
                          emHover ? "visible opacity-100" : "invisible opacity-0"
                        }`}
                        onMouseEnter={() => mostrarAcoesDaViagem(viagemUuid)}
                      >
                        <div
                          className={`pointer-events-auto absolute top-0 z-10 flex flex-col items-stretch gap-0.5 ${
                            ehUltimoDia ? "right-0" : "left-full"
                          }`}
                        >
                          <Botao
                            variante="perigo"
                            tamanho="compacto"
                            className="min-h-8 min-w-8"
                            data-testid="apagar-viagem"
                            aria-label={`Apagar viagem — ${dia}, viagem ${indiceBloco + 1}`}
                            onClick={() => definirConfirmacaoApagarViagemUuid(viagemUuid)}
                          >
                            X
                          </Botao>
                          <Botao
                            variante="primario"
                            tamanho="compacto"
                            className="min-h-8 min-w-8"
                            data-testid="restaurar-viagem"
                            aria-label={`Restaurar sugestão — ${dia}, viagem ${indiceBloco + 1}`}
                            onClick={() => aoResetarViagem(viagemUuid)}
                          >
                            ↻
                          </Botao>
                          <Botao
                            variante={modoHeadway ? "primario" : "alternador"}
                            tamanho="compacto"
                            className="min-h-8 min-w-8"
                            data-testid="alternar-modo-headway"
                            aria-label={`Alternar geração por headway — ${dia}, viagem ${indiceBloco + 1}`}
                            aria-pressed={modoHeadway}
                            onClick={() => aoAlternarModoHeadway(viagemUuid)}
                          >
                            ↪
                          </Botao>
                        </div>
                      </div>
                    </td>
                  );
                }
                const chave = chaveCelula(celula.viagem.uuid, parada.ordem);
                const erro = errosCelula[chave];
                return (
                  <td
                    key={dia}
                    data-testid="celula-passante"
                    data-viagem-uuid={celula.viagem.uuid}
                    data-selecionada={selecionada ? "true" : undefined}
                    data-reforco={ehReforco ? "true" : undefined}
                    data-superficie-viagem={
                      selecionada || ehReforco ? posicaoNaSuperficie : undefined
                    }
                    className={classesCelula}
                    draggable={selecionada}
                    onMouseDown={(evento) =>
                      registrarInicioCliqueCelula(
                        evento,
                        celula.viagem.uuid,
                      )
                    }
                    onClick={(evento) =>
                      alternarSelecaoPorClique(
                        evento,
                        celula.viagem.uuid,
                      )
                    }
                    onFocus={() => {
                      definirViagemSelecionadaUuid(celula.viagem.uuid);
                    }}
                    onMouseEnter={() => mostrarAcoesDaViagem(celula.viagem.uuid)}
                    onDragStart={(evento) => aoIniciarArrasto(evento, viagemUuid)}
                    onDragOver={(evento) => aoSobreporColuna(evento, grade, dia)}
                    onDrop={(evento) => aoSoltarNaColuna(evento, grade, dia)}
                    onDragEnd={() => definirColunaDestinoArrasto(null)}
                  >
                    <CampoHorarioGrade
                      rotuloAcessivel={`Horário de passagem — ${nomeSecao}, ${dia}, viagem ${indiceBloco + 1}`}
                      valor={horarioMostrar}
                      erro={erro}
                      aoConfirmar={(valor) =>
                        aoEditarPassante(
                          celula.viagem.uuid,
                          parada.ordem,
                          valor,
                          alvoFoco,
                        )
                      }
                      aoNavegar={navegar}
                      atributosNavegacao={atributosNavegacao}
                      aoSelecionar={() => definirViagemSelecionadaUuid(celula.viagem.uuid)}
                    />
                    {erro && (
                      <span role="alert" data-testid="erro-passante" className="text-xs text-erro">
                        {erro}
                      </span>
                    )}
                    {posicaoNaSuperficie === "fim" && !modoHeadway && (
                        <div
                          data-testid="acao-inserir-posterior"
                          className={`absolute top-full z-40 flex items-stretch gap-1 rounded-controle border border-cinza-200 bg-white p-1 shadow-sombra-3 [transition:opacity_var(--transicao-rapida)] ${
                            ehUltimoDia ? "right-0" : "left-1/2 -translate-x-1/2"
                          } ${
                            emHover
                              ? "pointer-events-auto opacity-100"
                              : "pointer-events-none opacity-0"
                          }`}
                        onMouseEnter={() => mostrarAcoesDaViagem(viagemUuid)}
                      >
                        <Campo
                          densidade="compacta"
                          className="min-w-20 text-center tabular-nums"
                          aria-label={`Deslocamento posterior — ${dia}, viagem ${indiceBloco + 1}`}
                          value={deslocamentoPosterior}
                          onChange={(evento) =>
                            definirDeslocamentoPosterior(evento.target.value)
                          }
                        />
                        <Botao
                          variante="primario"
                          className="min-w-10"
                          data-testid="inserir-viagem-posterior"
                          aria-label={`Inserir viagem depois — ${dia}, viagem ${indiceBloco + 1}`}
                          onClick={() => aoInserirViagemPorOffset(viagemUuid, 1)}
                        >
                          ↓
                        </Botao>
                        {erroInsercaoRelativa && (
                          <span
                            role="alert"
                            data-testid="erro-insercao-relativa"
                            className="absolute left-1/2 top-full mt-1 min-w-52 -translate-x-1/2 rounded-controle bg-white p-1 text-xs text-erro shadow-sombra-3"
                          >
                            {erroInsercaoRelativa}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                );
              }

              if (celula.estado === "criavel" && ehPrimeiraSecao) {
                const atributosNavegacao = {
                  "data-grade": grade.id,
                  "data-bloco": indiceBloco,
                  "data-secao-index": indiceSecao,
                  "data-dia": dia,
                };
                return (
                  <td
                    key={dia}
                    data-testid="celula-criavel"
                    className={classeColunaDestino}
                    onMouseEnter={ocultarAcoesDaViagem}
                    onDragOver={(evento) => aoSobreporColuna(evento, grade, dia)}
                    onDrop={(evento) => aoSoltarNaColuna(evento, grade, dia)}
                  >
                    <CampoHorarioGrade
                      rotuloAcessivel={`Criar viagem — ${dia}`}
                      valor=""
                      aoConfirmar={(valor) =>
                        aoConfirmarCriacao(dia, valor, grade)
                      }
                      aoNavegar={(tecla) =>
                        navegarNaGrade(
                          grade,
                          { indiceBloco, indiceSecao, dia },
                          tecla,
                        )
                      }
                      atributosNavegacao={atributosNavegacao}
                    />
                  </td>
                );
              }

              return (
                <td
                  key={dia}
                  data-testid="celula-vazia"
                  className={classeColunaDestino}
                  onMouseEnter={ocultarAcoesDaViagem}
                  onDragOver={(evento) => aoSobreporColuna(evento, grade, dia)}
                  onDrop={(evento) => aoSoltarNaColuna(evento, grade, dia)}
                >
                  —
                </td>
              );
            })}
          </tr>
        );

        if (indiceSecao !== secoesDaGrade.length - 1) {
          return linhaGrade;
        }

        const temHeadwayNoBloco = DIAS_SEMANA.some((dia) => {
          const celula = bloco[dia];
          return (
            celula.estado === "existente" &&
            (modoHeadwayPorViagem[celula.viagem.uuid] ?? false)
          );
        });

        return (
          <Fragment key={`${indiceBloco}-${parada.ordem}`}>
            {linhaGrade}
            {temHeadwayNoBloco && (
              <tr data-testid="linha-headway" className="border-b-2 border-cinza-400 bg-azul-50">
                <th scope="row" className="whitespace-nowrap font-semibold">
                  Headway
                </th>
                {DIAS_SEMANA.map((dia) => {
                  const celula = bloco[dia];
                  if (
                    celula.estado !== "existente" ||
                    !(modoHeadwayPorViagem[celula.viagem.uuid] ?? false)
                  ) {
                    return <td key={dia} />;
                  }

                  const viagemUuid = celula.viagem.uuid;
                  const rascunhoHeadway = headwayPorViagem[viagemUuid] ?? "";
                  const rascunhoLimiteHeadway = limiteHeadwayPorViagem[viagemUuid] ?? "";
                  const headwayValido = entradasHeadwaySaoValidas(
                    celula.viagem.horario_saida,
                    rascunhoHeadway,
                    rascunhoLimiteHeadway,
                  );
                  const erroHeadway = errosHeadway[viagemUuid];

                  return (
                    <td
                      key={dia}
                      data-testid="celula-headway"
                      data-viagem-uuid={viagemUuid}
                      className="align-top"
                      onMouseEnter={() => mostrarAcoesDaViagem(viagemUuid)}
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-x-1 gap-y-1 rounded-controle border border-cinza-200 bg-white p-1 shadow-sombra-1">
                        <Campo
                          rotulo="a cada"
                          densidade="compacta"
                          className="min-w-20 text-center tabular-nums"
                          aria-label={`Headway — ${dia}, viagem ${indiceBloco + 1}`}
                          placeholder="HH:MM"
                          value={mascararRascunhoHoraMinuto(rascunhoHeadway)}
                          onChange={(evento) =>
                            definirHeadwayPorViagem((atuais) => ({
                              ...atuais,
                              [viagemUuid]: atualizarRascunhoHoraMinuto(
                                atuais[viagemUuid] ?? "",
                                evento.target.value,
                              ),
                            }))
                          }
                        />
                        <Campo
                          rotulo="até"
                          densidade="compacta"
                          className="row-start-2 min-w-20 text-center tabular-nums"
                          aria-label={`Horário-limite — ${dia}, viagem ${indiceBloco + 1}`}
                          placeholder="HH:MM"
                          value={mascararRascunhoHoraMinuto(rascunhoLimiteHeadway)}
                          onChange={(evento) =>
                            definirLimiteHeadwayPorViagem((atuais) => ({
                              ...atuais,
                              [viagemUuid]: atualizarRascunhoHoraMinuto(
                                atuais[viagemUuid] ?? "",
                                evento.target.value,
                              ),
                            }))
                          }
                        />
                        <Botao
                          variante="primario"
                          className="col-start-2 row-span-2 row-start-1 min-w-10 self-stretch"
                          data-testid="gerar-viagens-headway"
                          aria-label={`Gerar viagens por headway — ${dia}, viagem ${indiceBloco + 1}`}
                          disabled={!headwayValido}
                          onClick={() => aoGerarViagensPorHeadway(viagemUuid)}
                        >
                          ↓
                        </Botao>
                        {erroHeadway && (
                          <span
                            role="alert"
                            data-testid="erro-headway"
                            className="col-span-2 text-xs text-erro"
                          >
                            {erroHeadway}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            )}
          </Fragment>
        );
      });
    });
  }

  function cabecalhoGrade(grade: GradeDaTela) {
    return (
      <thead>
        <tr>
          <th scope="col">Seção</th>
          {DIAS_SEMANA.map((dia) => (
            <th
              scope="col"
              key={dia}
              className={
                colunaDestinoArrasto?.gradeId === grade.id &&
                colunaDestinoArrasto.dia === dia
                  ? "bg-azul-50 outline-2 outline-azul-300"
                  : undefined
              }
            >
              <Botao
                variante="fantasma"
                tamanho="compacto"
                className="w-full font-semibold"
                data-testid={`operacoes-dia-${grade.id}-${dia}`}
                aria-label={`Operações do dia — ${ROTULO_DIA[dia]}`}
                aria-haspopup="menu"
                aria-expanded={
                  menuDiaAberto?.dia === dia &&
                  menuDiaAberto.grade.id === grade.id
                }
                onClick={(evento) => aoAbrirMenuDia(evento, dia, grade)}
              >
                {ROTULO_DIA[dia]}
              </Botao>
            </th>
          ))}
        </tr>
      </thead>
    );
  }

  return (
    <div ref={raizEtapaRef} data-testid="etapa-viagens" onKeyDown={aoAtalhoCopia}>
      <div className="flex flex-wrap gap-4">
        <Select
          rotulo="Serviço"
          data-testid="select-servico-viagens"
          value={servicoSelecionadoUuid ?? ""}
          onChange={(evento) => {
            definirServicoSelecionadoUuid(evento.target.value || null);
            definirSentidoSelecionado(null);
            definirViagemSelecionadaUuid(null);
          }}
        >
          <option value="">— selecione —</option>
          {servicos.map((s) => (
            <option key={s.uuid} value={s.uuid}>
              {s.numero_n}
            </option>
          ))}
        </Select>

        {servicoAtual && (
          <Select
            rotulo="Sentido"
            data-testid="select-sentido-viagens"
            value={sentidoSelecionado ?? ""}
            onChange={(evento) =>
              {
                definirSentidoSelecionado(
                  (evento.target.value || null) as Itinerario["sentido"] | null,
                );
                definirViagemSelecionadaUuid(null);
              }
            }
          >
            <option value="">— selecione —</option>
            {servicoAtual.itinerarios.map((it) => (
              <option key={it.sentido} value={it.sentido}>
                {it.sentido === "ida" ? "Ida" : "Volta"}
              </option>
            ))}
          </Select>
        )}

        {itinerarioAtual && chaveModoCompacto && (
          <div className="flex items-end">
            <Botao
              variante={modoCompacto ? "primario" : "alternador"}
              data-testid="alternar-modo-compacto"
              aria-pressed={modoCompacto}
              onClick={() =>
                definirModoCompactoPorSentido((atuais) => ({
                  ...atuais,
                  [chaveModoCompacto]: !modoCompacto,
                }))
              }
            >
              {modoCompacto
                ? "Exibir todas as Seções"
                : "Exibir somente partidas"}
            </Botao>
          </div>
        )}
      </div>

      {avisoCopia && (
        <p role="alert" data-testid="aviso-copia-viagem" className="mt-2 text-sm text-alerta">
          {avisoCopia}
        </p>
      )}

      {copiaDiaAberta && (
        <Dialogo
          titulo={`Copiar ${ROTULO_DIA[copiaDiaAberta.dia]} para`}
          data-testid="dialogo-copiar-dia"
          aoFechar={() => {
            definirCopiaDiaAberta(null);
            definirDiasDestinoCopia([]);
          }}
        >
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-2 text-sm text-cinza-700">Dias de destino</legend>
            {DIAS_SEMANA.filter((dia) => dia !== copiaDiaAberta.dia).map((dia) => {
              const selecionado = diasDestinoCopia.includes(dia);
              return (
                <Botao
                  key={dia}
                  variante={selecionado ? "primario" : "secundario"}
                  tamanho="compacto"
                  aria-pressed={selecionado}
                  data-testid={`destino-copiar-dia-${dia}`}
                  onClick={() =>
                    definirDiasDestinoCopia((atuais) =>
                      atuais.includes(dia)
                        ? atuais.filter((atual) => atual !== dia)
                        : [...atuais, dia],
                    )
                  }
                >
                  {ROTULO_DIA[dia]}
                </Botao>
              );
            })}
          </fieldset>
          <div className="mt-4 flex justify-end gap-2">
            <Botao
              variante="secundario"
              onClick={() => {
                definirCopiaDiaAberta(null);
                definirDiasDestinoCopia([]);
              }}
            >
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              data-testid="confirmar-copiar-dia"
              disabled={diasDestinoCopia.length === 0}
              onClick={aoCopiarDia}
            >
              OK
            </Botao>
          </div>
        </Dialogo>
      )}

      {menuDiaAberto && (
        <MenuFlutuante
          ancora={menuDiaAberto.ancora}
          data-testid="menu-operacoes-dia"
          rotuloAcessivel={`Operações de ${ROTULO_DIA[menuDiaAberto.dia]}`}
          aoFechar={() => definirMenuDiaAberto(null)}
          opcoes={[
            {
              id: "copiar-dia",
              rotulo: "Copiar para outro dia",
              aoSelecionar: () => {
                definirCopiaDiaAberta({
                  dia: menuDiaAberto.dia,
                  grade: menuDiaAberto.grade,
                });
                definirDiasDestinoCopia([]);
              },
            },
            {
              id: "apagar-dia",
              rotulo: "Apagar o dia",
              aoSelecionar: () => definirConfirmacaoApagarDia(menuDiaAberto),
            },
          ]}
        />
      )}

      {confirmacaoApagarViagemUuid && (
        <Dialogo
          titulo="Apagar Viagem"
          data-testid="dialogo-opcoes-apagar"
          aoFechar={() => definirConfirmacaoApagarViagemUuid(null)}
        >
          <p className="text-sm text-cinza-700">
            Esta ação remove somente esta Viagem.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Botao
              variante="secundario"
              onClick={() => definirConfirmacaoApagarViagemUuid(null)}
            >
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              onClick={() => {
                const viagemUuid = confirmacaoApagarViagemUuid;
                definirConfirmacaoApagarViagemUuid(null);
                aoApagarViagem(viagemUuid);
              }}
            >
              Apagar esta Viagem
            </Botao>
          </div>
        </Dialogo>
      )}

      {confirmacaoApagarDia && (
        <Dialogo
          titulo={`Apagar as Viagens de ${ROTULO_DIA[confirmacaoApagarDia.dia]}?`}
          data-testid="dialogo-confirmar-apagar-dia"
          aoFechar={() => definirConfirmacaoApagarDia(null)}
        >
          <p className="text-sm text-cinza-700">Esta ação remove todas as Viagens deste dia.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Botao variante="secundario" onClick={() => definirConfirmacaoApagarDia(null)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" data-testid="confirmar-apagar-dia" onClick={aoConfirmarApagarDia}>
              OK
            </Botao>
          </div>
        </Dialogo>
      )}

      {itinerarioAtual && (
        <>
          <section data-testid="grade-dias-comuns" className="mt-4">
            <h3 className="text-lg font-semibold text-cinza-900">Dias comuns</h3>
            <Botao
              variante="secundario"
              className="mt-2"
              data-testid="restaurar-lote"
              onClick={aoResetarLote}
            >
              Restaurar sugestão (toda a grade)
            </Botao>
            <Tabela densidade="compacta" className="mt-4">
              {cabecalhoGrade(GRADE_COMUM)}
              <tbody onMouseEnter={cancelarSaidaHover} onMouseLeave={agendarSaidaHover}>
                {corpoGrade(blocosComuns, GRADE_COMUM)}
              </tbody>
            </Tabela>
          </section>

          <section data-testid="grade-feriados" className="mt-6">
            <h3 className="text-lg font-semibold text-cinza-900">Feriados</h3>
            <p data-testid="legenda-feriados" className="text-sm text-cinza-500">
              Feriados e operação excepcional não entram nas contagens —{" "}
              {ROTULO_SEMANA_PADRAO}.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Select
                rotulo="Origem da semeadura"
                densidade="compacta"
                data-testid="origem-semeadura-feriados"
                value={origemSelecionadaDaSemeadura(GRADE_FERIADOS).id}
                onChange={(evento) =>
                  definirOrigemDaSemeadura(
                    GRADE_FERIADOS,
                    evento.currentTarget.value,
                  )
                }
              >
                {origensDaSemeadura(GRADE_FERIADOS).map((origem) => (
                  <option key={origem.id} value={origem.id}>
                    {origem.rotulo}
                  </option>
                ))}
              </Select>
              {temFeriado ? (
                <>
                  <Botao
                    variante="secundario"
                    data-testid="copiar-dias-comuns-sobrescrever"
                    onClick={() =>
                      aoSemearGrade(
                        origemSelecionadaDaSemeadura(GRADE_FERIADOS),
                        GRADE_FERIADOS,
                        "sobrescrever",
                      )
                    }
                  >
                    Copiar origem (sobrescrever)
                  </Botao>
                  <Botao
                    variante="secundario"
                    data-testid="copiar-dias-comuns-mesclar"
                    onClick={() =>
                      aoSemearGrade(
                        origemSelecionadaDaSemeadura(GRADE_FERIADOS),
                        GRADE_FERIADOS,
                        "mesclar",
                      )
                    }
                  >
                    Copiar origem (mesclar)
                  </Botao>
                </>
              ) : (
                <Botao
                  variante="secundario"
                  data-testid="copiar-dias-comuns"
                  onClick={() =>
                    aoSemearGrade(
                      origemSelecionadaDaSemeadura(GRADE_FERIADOS),
                      GRADE_FERIADOS,
                      "sobrescrever",
                    )
                  }
                >
                  Copiar origem
                </Botao>
              )}
            </div>
            <Tabela densidade="compacta" className="mt-4">
              {cabecalhoGrade(GRADE_FERIADOS)}
              <tbody onMouseEnter={cancelarSaidaHover} onMouseLeave={agendarSaidaHover}>
                {corpoGrade(blocosFeriados, GRADE_FERIADOS)}
              </tbody>
            </Tabela>
          </section>

          {(servicoAtual?.tabelas_excepcionais ?? []).map((tabela) => {
            const grade = gradeTabelaExcepcional(
              tabela.uuid,
              rotuloTabelaExcepcional(tabela),
            );
            const blocos = montarBlocosGrade(
              itinerarioAtual.viagens,
              grade.destino,
            );
            const temConteudo = itinerarioAtual.viagens.some((viagem) =>
              viagemPertenceAGrade(viagem, grade.destino),
            );

            return (
              <section
                key={tabela.uuid}
                data-testid="grade-tabela-excepcional"
                data-tabela-excepcional-uuid={tabela.uuid}
                className="mt-6"
              >
                <h3 className="text-lg font-semibold text-cinza-900">
                  {rotuloTabelaExcepcional(tabela)}
                </h3>
                <p
                  data-testid="legenda-tabela-excepcional"
                  className="text-sm text-cinza-500"
                >
                  Esta grade não entra nas contagens da semana padrão —{" "}
                  {ROTULO_SEMANA_PADRAO}.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Select
                    rotulo="Origem da semeadura"
                    densidade="compacta"
                    data-testid="origem-semeadura-excepcional"
                    value={origemSelecionadaDaSemeadura(grade).id}
                    onChange={(evento) =>
                      definirOrigemDaSemeadura(
                        grade,
                        evento.currentTarget.value,
                      )
                    }
                  >
                    {origensDaSemeadura(grade).map((origem) => (
                      <option key={origem.id} value={origem.id}>
                        {origem.rotulo}
                      </option>
                    ))}
                  </Select>
                  {temConteudo ? (
                    <>
                      <Botao
                        variante="secundario"
                        data-testid="copiar-dias-comuns-excepcional-sobrescrever"
                        onClick={() =>
                          aoSemearGrade(
                            origemSelecionadaDaSemeadura(grade),
                            grade,
                            "sobrescrever",
                          )
                        }
                      >
                        Copiar origem (sobrescrever)
                      </Botao>
                      <Botao
                        variante="secundario"
                        data-testid="copiar-dias-comuns-excepcional-mesclar"
                        onClick={() =>
                          aoSemearGrade(
                            origemSelecionadaDaSemeadura(grade),
                            grade,
                            "mesclar",
                          )
                        }
                      >
                        Copiar origem (mesclar)
                      </Botao>
                    </>
                  ) : (
                    <Botao
                      variante="secundario"
                      data-testid="copiar-dias-comuns-excepcional"
                      onClick={() =>
                        aoSemearGrade(
                          origemSelecionadaDaSemeadura(grade),
                          grade,
                          "sobrescrever",
                        )
                      }
                    >
                      Copiar origem
                    </Botao>
                  )}
                </div>
                <Tabela densidade="compacta" className="mt-4">
                  {cabecalhoGrade(grade)}
                  <tbody
                    onMouseEnter={cancelarSaidaHover}
                    onMouseLeave={agendarSaidaHover}
                  >
                    {corpoGrade(blocos, grade)}
                  </tbody>
                </Tabela>
              </section>
            );
          })}
        </>
      )}

      {servicoAtual && (
        <PainelTabelasExcepcionais
          key={servicoAtual.uuid}
          servico={servicoAtual}
          aoAtualizarServico={aplicarServicoAtualizado}
        />
      )}
    </div>
  );
}
