"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { ROTULO_SEMANA_PADRAO } from "@/shared/contagens";
import { DIAS_SEMANA, type Itinerario, type Parada, type Secao, type Servico } from "@/shared/contrato";
import { Botao, Campo, Dialogo, Painel, Select, Tabela } from "@/shared/ui";
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
  clonarDiasComunsParaFeriado,
  copiarDiaParaDiasComGuarda,
  copiarViagemParaDiaComGuarda,
  diaAoLado,
} from "./copias-grade";
import {
  horaMinutoParaHorarioRelogio,
  horarioParaHoraMinuto,
  horarioParaSegundos,
} from "./horario-relogio";
import {
  destinoNavegacaoGrade,
  horarioAbsolutoNaParada,
  linhasSecoes,
  montarBlocosDiasComuns,
  montarBlocosFeriados,
  seletorAlvoFocoCelulaGrade,
  type AlvoFocoCelulaGrade,
  type BlocoGrade,
  type CoordenadaCelulaGrade,
  type DiaSemana,
  type TeclaNavegacaoGrade,
} from "./montagem-grade";
import { CampoHorarioGrade } from "./campo-horario-grade";

// Etapa "Viagens e horários" (TASK-028/029/030; Spec 04 §8) — duas grades por
// Serviço × sentido: dias comuns e feriados (RN-068, grades independentes).
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
}

export function EtapaViagens({ sessao, aoAtualizarSessao }: PropsEtapaViagens) {
  const raizEtapaRef = useRef<HTMLDivElement>(null);
  const alvoFocoPendenteRef = useRef<AlvoFocoCelulaGrade | null>(null);
  const seletorNavegacaoPendenteRef = useRef<string | null>(null);
  const temporizadorSaidaHoverRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [servicoSelecionadoUuid, definirServicoSelecionadoUuid] = useState<string | null>(null);
  const [sentidoSelecionado, definirSentidoSelecionado] = useState<Itinerario["sentido"] | null>(
    null,
  );
  // Células passantes recusadas por fora-de-ordem (Spec 04 §8.2): não confirmam
  // e ficam em erro até uma edição válida. Estado de UI, por célula.
  const [errosCelula, definirErrosCelula] = useState<Record<string, string>>({});
  const [viagemSelecionadaUuid, definirViagemSelecionadaUuid] = useState<string | null>(null);
  const [viagemEmHoverUuid, definirViagemEmHoverUuid] = useState<string | null>(null);
  const [colunaDestinoArrasto, definirColunaDestinoArrasto] = useState<{
    grade: "comuns" | "feriados";
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
    feriado: boolean;
  } | null>(null);
  const [diasDestinoCopia, definirDiasDestinoCopia] = useState<DiaSemana[]>([]);
  const [opcoesApagarAbertas, definirOpcoesApagarAbertas] = useState<{
    viagemUuid: string;
    dia: DiaSemana;
    feriado: boolean;
  } | null>(null);
  const [confirmacaoApagarDia, definirConfirmacaoApagarDia] = useState<{
    dia: DiaSemana;
    feriado: boolean;
  } | null>(null);

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
  const servicoAtual = servicos.find((s) => s.uuid === servicoSelecionadoUuid) ?? null;
  const itinerarioAtual =
    servicoAtual?.itinerarios.find((it) => it.sentido === sentidoSelecionado) ?? null;
  const todasAsSecoes = secoesDaSessao(sessao);
  const ancoras = ancorasHorarioDaSessao(sessao);

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
    feriado: boolean,
    grade: string,
  ): boolean {
    if (!itinerarioAtual || horaMinuto === "") return false;
    const viagemNova = criarViagemNaCelula(itinerarioAtual, dia, horaMinuto, feriado);
    if (!viagemNova) return false;
    alvoFocoPendenteRef.current = {
      grade,
      viagemUuid: viagemNova.uuid,
      indiceSecao: 0,
      dia,
    };
    aplicar({ ...itinerarioAtual, viagens: [...itinerarioAtual.viagens, viagemNova] });
    definirViagemSelecionadaUuid(viagemNova.uuid);
    return true;
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
      headwayPorViagem[viagemUuid] ?? "",
      limiteHeadwayPorViagem[viagemUuid] ?? "",
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
    feriado: boolean,
  ) {
    if (!itinerarioAtual) return;
    const resultado = copiarViagemParaDiaComGuarda(itinerarioAtual, viagemUuid, dia, {
      viagem_feriado: feriado,
      tabela_excepcional_uuid: null,
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
    aoCopiarViagemParaGrade(viagemSelecionadaUuid, diaDestino, origem.viagem_feriado);
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
    grade: "comuns" | "feriados",
    dia: DiaSemana,
  ) {
    evento.preventDefault();
    evento.dataTransfer.dropEffect = "copy";
    definirColunaDestinoArrasto({ grade, dia });
  }

  function aoSoltarNaColuna(
    evento: DragEvent<HTMLTableCellElement>,
    grade: "comuns" | "feriados",
    dia: DiaSemana,
  ) {
    evento.preventDefault();
    const viagemUuid = evento.dataTransfer.getData("text/plain");
    definirColunaDestinoArrasto(null);
    if (viagemUuid) aoCopiarViagemParaGrade(viagemUuid, dia, grade === "feriados");
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

  function aoCopiarDia() {
    if (!itinerarioAtual || !copiaDiaAberta || diasDestinoCopia.length === 0) return;
    const resultado = copiarDiaParaDiasComGuarda(
      itinerarioAtual,
      copiaDiaAberta.dia,
      diasDestinoCopia,
      { viagem_feriado: copiaDiaAberta.feriado, tabela_excepcional_uuid: null },
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
    const grade = {
      viagem_feriado: confirmacaoApagarDia.feriado,
      tabela_excepcional_uuid: null,
    };
    const removidas = itinerarioAtual.viagens
      .filter(
        (viagem) =>
          viagem.dia_semana === confirmacaoApagarDia.dia &&
          viagem.viagem_feriado === grade.viagem_feriado &&
          viagem.tabela_excepcional_uuid === grade.tabela_excepcional_uuid,
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

  // "Copiar dias comuns" para a grade de feriados (Spec 04 §8.4; RN-007/068).
  // Quando a grade de feriados já tem conteúdo, a confirmação é a escolha
  // explícita do modo (sobrescrever/mesclar) — dois botões distintos.
  function aoCopiarDiasComuns(modo: "sobrescrever" | "mesclar") {
    if (!itinerarioAtual) return;
    if (modo === "sobrescrever") {
      const feriadoAtual = itinerarioAtual.viagens.filter((v) => v.viagem_feriado);
      if (feriadoAtual.length > 0) {
        const confirmado =
          typeof window === "undefined" ||
          window.confirm(
            "Sobrescrever a grade de feriados com os dias comuns? As viagens de feriado atuais serão descartadas.",
          );
        if (!confirmado) return;
        limparEstadoDeSessao(feriadoAtual.map((v) => v.uuid));
        aplicar(
          clonarDiasComunsParaFeriado(itinerarioAtual, "sobrescrever"),
          ancorasSem(feriadoAtual.map((v) => v.uuid)),
        );
        return;
      }
    }
    aplicar(clonarDiasComunsParaFeriado(itinerarioAtual, modo));
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

  const secoesDaGrade = itinerarioAtual ? linhasSecoes(itinerarioAtual.paradas) : [];
  const blocosComuns = itinerarioAtual ? montarBlocosDiasComuns(itinerarioAtual.viagens) : [];
  const blocosFeriados = itinerarioAtual ? montarBlocosFeriados(itinerarioAtual.viagens) : [];
  const temFeriado = itinerarioAtual?.viagens.some((v) => v.viagem_feriado) ?? false;

  function navegarNaGrade(
    grade: "comuns" | "feriados",
    origem: CoordenadaCelulaGrade,
    tecla: TeclaNavegacaoGrade,
  ): boolean {
    const destino = destinoNavegacaoGrade(origem, tecla, secoesDaGrade.length);
    if (!destino) return false;
    const seletor =
      `input[data-grade="${grade}"]` +
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

  // Corpo de uma grade (dias comuns ou feriados). `feriado` propaga para a
  // criação de Viagem na grade correta.
  function corpoGrade(blocos: BlocoGrade[], feriado: boolean) {
    const grade = feriado ? "feriados" : "comuns";
    return blocos.map((bloco, indiceBloco) => {
      return secoesDaGrade.map((parada, indiceSecao) => {
        const secao = secaoDaParada(parada, todasAsSecoes);
        const nomeSecao = secao ? nomeExibicaoSecao(secao) : "";
        const ehPrimeiraSecao = indiceSecao === 0;
        return (
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
                colunaDestinoArrasto?.grade === grade && colunaDestinoArrasto.dia === dia;
              const classeColunaDestino = colunaEmArrasto
                ? "bg-azul-50 outline-2 outline-azul-300"
                : "";

              if (celula.estado === "existente") {
                const horarioHms = horarioAbsolutoNaParada(celula.viagem, parada.ordem);
                const horarioMostrar = horarioHms ? horarioParaHoraMinuto(horarioHms) : "";

                const selecionada = viagemSelecionadaUuid === celula.viagem.uuid;
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
                    : "",
                  classeColunaDestino,
                  selecionada ? "cursor-grab active:cursor-grabbing" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const atributosNavegacao = {
                  "data-grade": grade,
                  "data-bloco": indiceBloco,
                  "data-secao-index": indiceSecao,
                  "data-dia": dia,
                  "data-viagem-uuid": celula.viagem.uuid,
                };
                const alvoFoco: AlvoFocoCelulaGrade = {
                  grade,
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
                const erroHeadway = errosHeadway[viagemUuid];

                if (ehPrimeiraSecao) {
                  return (
                    <td
                      key={dia}
                      data-testid="celula-partida"
                      data-viagem-uuid={viagemUuid}
                      data-selecionada={selecionada ? "true" : undefined}
                      data-superficie-viagem={selecionada ? posicaoNaSuperficie : undefined}
                      className={classesCelula}
                      draggable={selecionada}
                      onClick={() => definirViagemSelecionadaUuid(viagemUuid)}
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
                            onClick={() =>
                              definirOpcoesApagarAbertas({
                                viagemUuid,
                                dia,
                                feriado,
                              })
                            }
                          >
                            X
                          </Botao>
                          <Botao
                            variante="secundario"
                            tamanho="compacto"
                            className="min-h-8 min-w-8"
                            data-testid="copiar-dia"
                            aria-label={`Copiar dia — ${dia}`}
                            onClick={() => {
                              definirCopiaDiaAberta({ dia, feriado });
                              definirDiasDestinoCopia([]);
                            }}
                          >
                            ⧉
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
                            variante={modoHeadway ? "primario" : "fantasma"}
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
                    data-superficie-viagem={selecionada ? posicaoNaSuperficie : undefined}
                    className={classesCelula}
                    draggable={selecionada}
                    onClick={() => definirViagemSelecionadaUuid(celula.viagem.uuid)}
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
                    {posicaoNaSuperficie === "fim" && (
                      <div
                        data-testid="acao-inserir-posterior"
                        className={`absolute top-full z-40 flex items-stretch gap-1 rounded-controle border border-cinza-200 bg-white p-1 shadow-sombra-3 [transition:opacity_var(--transicao-rapida)] ${
                          ehUltimoDia ? "right-0" : "left-1/2 -translate-x-1/2"
                        } ${
                          emHover ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                        }`}
                        onMouseEnter={() => mostrarAcoesDaViagem(viagemUuid)}
                      >
                        {modoHeadway ? (
                          <>
                            <Campo
                              densidade="compacta"
                              className="min-w-20 text-center tabular-nums"
                              aria-label={`Headway — ${dia}, viagem ${indiceBloco + 1}`}
                              placeholder="HH:MM"
                              value={headwayPorViagem[viagemUuid] ?? ""}
                              onChange={(evento) =>
                                definirHeadwayPorViagem((atuais) => ({
                                  ...atuais,
                                  [viagemUuid]: evento.target.value,
                                }))
                              }
                            />
                            <Campo
                              densidade="compacta"
                              className="min-w-20 text-center tabular-nums"
                              aria-label={`Horário-limite — ${dia}, viagem ${indiceBloco + 1}`}
                              placeholder="HH:MM"
                              value={limiteHeadwayPorViagem[viagemUuid] ?? ""}
                              onChange={(evento) =>
                                definirLimiteHeadwayPorViagem((atuais) => ({
                                  ...atuais,
                                  [viagemUuid]: evento.target.value,
                                }))
                              }
                            />
                            <Botao
                              variante="primario"
                              className="min-w-10"
                              data-testid="gerar-viagens-headway"
                              aria-label={`Gerar viagens por headway — ${dia}, viagem ${indiceBloco + 1}`}
                              onClick={() => aoGerarViagensPorHeadway(viagemUuid)}
                            >
                              ↓
                            </Botao>
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                        {(modoHeadway ? erroHeadway : erroInsercaoRelativa) && (
                          <span
                            role="alert"
                            data-testid={modoHeadway ? "erro-headway" : "erro-insercao-relativa"}
                            className="absolute left-1/2 top-full mt-1 min-w-52 -translate-x-1/2 rounded-controle bg-white p-1 text-xs text-erro shadow-sombra-3"
                          >
                            {modoHeadway ? erroHeadway : erroInsercaoRelativa}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                );
              }

              if (celula.estado === "criavel" && ehPrimeiraSecao) {
                const atributosNavegacao = {
                  "data-grade": grade,
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
                        aoConfirmarCriacao(dia, valor, feriado, grade)
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
      });
    });
  }

  function cabecalhoGrade(grade: "comuns" | "feriados") {
    return (
      <thead>
        <tr>
          <th scope="col">Seção</th>
          {DIAS_SEMANA.map((dia) => (
            <th
              scope="col"
              key={dia}
              className={
                colunaDestinoArrasto?.grade === grade && colunaDestinoArrasto.dia === dia
                  ? "bg-azul-50 outline-2 outline-azul-300"
                  : undefined
              }
            >
              {ROTULO_DIA[dia]}
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

      {opcoesApagarAbertas && (
        <Dialogo
          titulo="Apagar Viagem"
          data-testid="dialogo-opcoes-apagar"
          aoFechar={() => definirOpcoesApagarAbertas(null)}
        >
          <p className="text-sm text-cinza-700">Escolha o que deseja apagar.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Botao
              variante="secundario"
              onClick={() => {
                const { viagemUuid } = opcoesApagarAbertas;
                definirOpcoesApagarAbertas(null);
                aoApagarViagem(viagemUuid);
              }}
            >
              Apagar esta Viagem
            </Botao>
            <Botao
              variante="perigo"
              onClick={() => {
                definirConfirmacaoApagarDia({
                  dia: opcoesApagarAbertas.dia,
                  feriado: opcoesApagarAbertas.feriado,
                });
                definirOpcoesApagarAbertas(null);
              }}
            >
              Apagar as Viagens do dia
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
              {cabecalhoGrade("comuns")}
              <tbody onMouseEnter={cancelarSaidaHover} onMouseLeave={agendarSaidaHover}>
                {corpoGrade(blocosComuns, false)}
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
              {temFeriado ? (
                <>
                  <Botao
                    variante="secundario"
                    data-testid="copiar-dias-comuns-sobrescrever"
                    onClick={() => aoCopiarDiasComuns("sobrescrever")}
                  >
                    Copiar dias comuns (sobrescrever)
                  </Botao>
                  <Botao
                    variante="secundario"
                    data-testid="copiar-dias-comuns-mesclar"
                    onClick={() => aoCopiarDiasComuns("mesclar")}
                  >
                    Copiar dias comuns (mesclar)
                  </Botao>
                </>
              ) : (
                <Botao
                  variante="secundario"
                  data-testid="copiar-dias-comuns"
                  onClick={() => aoCopiarDiasComuns("sobrescrever")}
                >
                  Copiar dias comuns
                </Botao>
              )}
            </div>
            <Tabela densidade="compacta" className="mt-4">
              {cabecalhoGrade("feriados")}
              <tbody onMouseEnter={cancelarSaidaHover} onMouseLeave={agendarSaidaHover}>
                {corpoGrade(blocosFeriados, true)}
              </tbody>
            </Tabela>
          </section>
        </>
      )}
    </div>
  );
}
