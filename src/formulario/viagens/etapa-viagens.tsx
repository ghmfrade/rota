"use client";

import { useRef, useState } from "react";
import { ROTULO_SEMANA_PADRAO } from "@/shared/contagens";
import { DIAS_SEMANA, type Itinerario, type Parada, type Secao, type Servico } from "@/shared/contrato";
import { Botao, Campo, Painel, Select, Tabela } from "@/shared/ui";
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
  inserirViagemPorOffsetRelativo,
  resetarOffsetsEmLote,
  resetarOffsetsViagem,
} from "./acoes-grade";
import {
  apagarViagem,
  clonarDiasComunsParaFeriado,
  copiarViagemParaDias,
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
  const [servicoSelecionadoUuid, definirServicoSelecionadoUuid] = useState<string | null>(null);
  const [sentidoSelecionado, definirSentidoSelecionado] = useState<Itinerario["sentido"] | null>(
    null,
  );
  // Células passantes recusadas por fora-de-ordem (Spec 04 §8.2): não confirmam
  // e ficam em erro até uma edição válida. Estado de UI, por célula.
  const [errosCelula, definirErrosCelula] = useState<Record<string, string>>({});
  // Dia-alvo escolhido em "Copiar viagem para outro dia", por Viagem (Spec 04 §8.3).
  const [diaCopiaPorViagem, definirDiaCopiaPorViagem] = useState<Record<string, DiaSemana>>({});
  const [viagemSelecionadaUuid, definirViagemSelecionadaUuid] = useState<string | null>(null);
  const [viagemEmHoverUuid, definirViagemEmHoverUuid] = useState<string | null>(null);
  const [deslocamentoAnteriorPorViagem, definirDeslocamentoAnteriorPorViagem] = useState<
    Record<string, string>
  >({});
  const [deslocamentoPosteriorPorViagem, definirDeslocamentoPosteriorPorViagem] = useState<
    Record<string, string>
  >({});
  const [errosInsercaoRelativa, definirErrosInsercaoRelativa] = useState<Record<string, string>>({});

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

  function aoConfirmarCriacao(dia: DiaSemana, horaMinuto: string, feriado: boolean): boolean {
    if (!itinerarioAtual || horaMinuto === "") return false;
    const viagemNova = criarViagemNaCelula(itinerarioAtual, dia, horaMinuto, feriado);
    if (!viagemNova) return false;
    aplicar({ ...itinerarioAtual, viagens: [...itinerarioAtual.viagens, viagemNova] });
    definirViagemSelecionadaUuid(viagemNova.uuid);
    return true;
  }

  function aoConfirmarPartida(viagemUuid: string, horaMinuto: string): boolean {
    if (!itinerarioAtual || horaMinuto === "") return false;
    const viagemOriginal = itinerarioAtual.viagens.find((v) => v.uuid === viagemUuid);
    if (!viagemOriginal) return false;
    const viagemAtualizada = atualizarHorarioSaida(viagemOriginal, horaMinuto);
    if (!viagemAtualizada) return false;
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

    const entrada =
      direcao === -1
        ? (deslocamentoAnteriorPorViagem[viagemUuid] ?? DESLOCAMENTO_RELATIVO_PADRAO)
        : (deslocamentoPosteriorPorViagem[viagemUuid] ?? DESLOCAMENTO_RELATIVO_PADRAO);
    const horario = horaMinutoParaHorarioRelogio(entrada);
    if (horario === null) {
      definirErrosInsercaoRelativa((atuais) => ({
        ...atuais,
        [viagemUuid]: "Informe o deslocamento no formato HH:MM.",
      }));
      return;
    }

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

  function aoEditarPassante(
    viagemUuid: string,
    paradaOrdem: number,
    horaMinuto: string,
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

  // Copiar viagem para outro dia (Spec 04 §8.3; RN-007): a cópia nasce com UUID
  // nova e sem âncoras de sessão (offsets copiados contam como derivados —
  // DEC-049), preservando `viagem_feriado` da origem.
  function aoCopiarViagem(viagemUuid: string) {
    if (!itinerarioAtual) return;
    const viagem = itinerarioAtual.viagens.find((v) => v.uuid === viagemUuid);
    if (!viagem) return;
    const dia = diaCopiaPorViagem[viagemUuid] ?? viagem.dia_semana;
    const [copia] = copiarViagemParaDias(viagem, [dia]);
    if (!copia) return;
    aplicar({ ...itinerarioAtual, viagens: [...itinerarioAtual.viagens, copia] });
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
    const alvo = raizEtapaRef.current?.querySelector<HTMLInputElement>(seletor);
    if (!alvo) return false;
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
              onMouseEnter={() => definirViagemEmHoverUuid(null)}
            >
              {nomeSecao}
            </th>
            {DIAS_SEMANA.map((dia) => {
              const celula = bloco[dia];

              if (celula.estado === "existente") {
                const horarioHms = horarioAbsolutoNaParada(celula.viagem, parada.ordem);
                const horarioMostrar = horarioHms ? horarioParaHoraMinuto(horarioHms) : "";

                const selecionada = viagemSelecionadaUuid === celula.viagem.uuid;
                const emHover = viagemEmHoverUuid === celula.viagem.uuid;
                const posicaoNaSuperficie =
                  indiceSecao === 0
                    ? "inicio"
                    : indiceSecao === secoesDaGrade.length - 1
                      ? "fim"
                      : "meio";
                const classesCelula = [
                  "relative",
                  selecionada
                    ? [
                        "bg-azul-100 border-x-2 border-azul-600",
                        posicaoNaSuperficie === "inicio" ? "border-t-2" : "",
                        posicaoNaSuperficie === "fim" ? "border-b-2" : "",
                      ].join(" ")
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const atributosNavegacao = {
                  "data-grade": grade,
                  "data-bloco": indiceBloco,
                  "data-secao-index": indiceSecao,
                  "data-dia": dia,
                };
                const navegar = (tecla: TeclaNavegacaoGrade) =>
                  navegarNaGrade(
                    grade,
                    { indiceBloco, indiceSecao, dia },
                    tecla,
                  );

                if (ehPrimeiraSecao) {
                  const viagemUuid = celula.viagem.uuid;
                  const deslocamentoAnterior =
                    deslocamentoAnteriorPorViagem[viagemUuid] ?? DESLOCAMENTO_RELATIVO_PADRAO;
                  const deslocamentoPosterior =
                    deslocamentoPosteriorPorViagem[viagemUuid] ?? DESLOCAMENTO_RELATIVO_PADRAO;
                  const erroInsercaoRelativa = errosInsercaoRelativa[viagemUuid];
                  return (
                    <td
                      key={dia}
                      data-testid="celula-partida"
                      data-viagem-uuid={viagemUuid}
                      data-selecionada={selecionada ? "true" : undefined}
                      data-superficie-viagem={selecionada ? posicaoNaSuperficie : undefined}
                      className={classesCelula}
                      onClick={() => definirViagemSelecionadaUuid(viagemUuid)}
                      onFocus={() => {
                        definirViagemSelecionadaUuid(viagemUuid);
                        definirViagemEmHoverUuid(viagemUuid);
                      }}
                      onMouseEnter={() => definirViagemEmHoverUuid(viagemUuid)}
                    >
                      <div className="relative">
                        <CampoHorarioGrade
                          key={`${viagemUuid}-${horarioMostrar}`}
                          rotuloAcessivel={`Horário de partida — ${dia}, viagem ${indiceBloco + 1}`}
                          valor={horarioMostrar}
                          aoConfirmar={(valor) => aoConfirmarPartida(viagemUuid, valor)}
                          aoNavegar={navegar}
                          atributosNavegacao={atributosNavegacao}
                          aoSelecionar={() => definirViagemSelecionadaUuid(viagemUuid)}
                        />
                        <div
                          data-testid="acao-inserir-anterior"
                          className={`absolute bottom-full left-1/2 z-20 mb-1 flex -translate-x-1/2 items-center gap-1 rounded-controle border border-cinza-200 bg-white p-1 shadow-sombra-3 [transition:opacity_var(--transicao-rapida)] ${
                            emHover ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                          }`}
                        >
                          <Campo
                            densidade="compacta"
                            aria-label={`Deslocamento anterior — ${dia}, viagem ${indiceBloco + 1}`}
                            value={deslocamentoAnterior}
                            onChange={(evento) =>
                              definirDeslocamentoAnteriorPorViagem((atuais) => ({
                                ...atuais,
                                [viagemUuid]: evento.target.value,
                              }))
                            }
                          />
                          <Botao
                            variante="fantasma"
                            tamanho="compacto"
                            data-testid="inserir-viagem-anterior"
                            aria-label={`Inserir viagem antes — ${dia}, viagem ${indiceBloco + 1}`}
                            onClick={() => aoInserirViagemPorOffset(viagemUuid, -1)}
                          >
                            ↑
                          </Botao>
                        </div>
                        <div
                          data-testid="acoes-viagem"
                          className={`absolute left-1/2 top-full z-20 mt-1 flex -translate-x-1/2 items-center gap-1 rounded-controle border border-cinza-200 bg-white p-1 shadow-sombra-3 [transition:opacity_var(--transicao-rapida)] ${
                            emHover ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                          }`}
                        >
                          <Botao
                            variante="fantasma"
                            tamanho="compacto"
                            data-testid="restaurar-viagem"
                            aria-label={`Restaurar sugestão — ${dia}, viagem ${indiceBloco + 1}`}
                            onClick={() => aoResetarViagem(viagemUuid)}
                          >
                            Restaurar
                          </Botao>
                          <Select
                            densidade="compacta"
                            data-testid="select-copia-dia"
                            aria-label={`Copiar para o dia — ${dia}, viagem ${indiceBloco + 1}`}
                            value={diaCopiaPorViagem[viagemUuid] ?? celula.viagem.dia_semana}
                            onChange={(evento) =>
                              definirDiaCopiaPorViagem((atuais) => ({
                                ...atuais,
                                [viagemUuid]: evento.target.value as DiaSemana,
                              }))
                            }
                          >
                            {DIAS_SEMANA.map((d) => (
                              <option key={d} value={d}>
                                {ROTULO_DIA[d]}
                              </option>
                            ))}
                          </Select>
                          <Botao
                            variante="fantasma"
                            tamanho="compacto"
                            data-testid="copiar-viagem"
                            aria-label={`Copiar viagem para outro dia — ${dia}, viagem ${indiceBloco + 1}`}
                            onClick={() => aoCopiarViagem(viagemUuid)}
                          >
                            Copiar
                          </Botao>
                          <Campo
                            densidade="compacta"
                            aria-label={`Deslocamento posterior — ${dia}, viagem ${indiceBloco + 1}`}
                            value={deslocamentoPosterior}
                            onChange={(evento) =>
                              definirDeslocamentoPosteriorPorViagem((atuais) => ({
                                ...atuais,
                                [viagemUuid]: evento.target.value,
                              }))
                            }
                          />
                          <Botao
                            variante="fantasma"
                            tamanho="compacto"
                            data-testid="inserir-viagem-posterior"
                            aria-label={`Inserir viagem depois — ${dia}, viagem ${indiceBloco + 1}`}
                            onClick={() => aoInserirViagemPorOffset(viagemUuid, 1)}
                          >
                            ↓
                          </Botao>
                          <Botao
                            variante="perigo"
                            tamanho="compacto"
                            data-testid="apagar-viagem"
                            aria-label={`Apagar viagem — ${dia}, viagem ${indiceBloco + 1}`}
                            onClick={() => aoApagarViagem(viagemUuid)}
                          >
                            X
                          </Botao>
                          {erroInsercaoRelativa && (
                            <span role="alert" data-testid="erro-insercao-relativa" className="text-xs text-erro">
                              {erroInsercaoRelativa}
                            </span>
                          )}
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
                    onClick={() => definirViagemSelecionadaUuid(celula.viagem.uuid)}
                    onFocus={() => {
                      definirViagemSelecionadaUuid(celula.viagem.uuid);
                      definirViagemEmHoverUuid(celula.viagem.uuid);
                    }}
                    onMouseEnter={() => definirViagemEmHoverUuid(celula.viagem.uuid)}
                  >
                    <CampoHorarioGrade
                      key={`${celula.viagem.uuid}-${parada.ordem}-${horarioMostrar}`}
                      rotuloAcessivel={`Horário de passagem — ${nomeSecao}, ${dia}, viagem ${indiceBloco + 1}`}
                      valor={horarioMostrar}
                      erro={erro}
                      aoConfirmar={(valor) =>
                        aoEditarPassante(celula.viagem.uuid, parada.ordem, valor)
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
                    onMouseEnter={() => definirViagemEmHoverUuid(null)}
                  >
                    <CampoHorarioGrade
                      rotuloAcessivel={`Criar viagem — ${dia}`}
                      valor=""
                      aoConfirmar={(valor) => aoConfirmarCriacao(dia, valor, feriado)}
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
                  onMouseEnter={() => definirViagemEmHoverUuid(null)}
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

  function cabecalhoGrade() {
    return (
      <thead>
        <tr>
          <th scope="col">Seção</th>
          {DIAS_SEMANA.map((dia) => (
            <th scope="col" key={dia}>
              {ROTULO_DIA[dia]}
            </th>
          ))}
        </tr>
      </thead>
    );
  }

  return (
    <div ref={raizEtapaRef} data-testid="etapa-viagens">
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
            <Tabela densidade="compacta" className="mt-2">
              {cabecalhoGrade()}
              <tbody onMouseLeave={() => definirViagemEmHoverUuid(null)}>
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
            <Tabela densidade="compacta" className="mt-2">
              {cabecalhoGrade()}
              <tbody onMouseLeave={() => definirViagemEmHoverUuid(null)}>
                {corpoGrade(blocosFeriados, true)}
              </tbody>
            </Tabela>
          </section>
        </>
      )}
    </div>
  );
}
