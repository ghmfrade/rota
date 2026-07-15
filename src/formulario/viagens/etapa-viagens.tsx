"use client";

import { useState } from "react";
import { DIAS_SEMANA, type Itinerario, type Parada, type Secao, type Servico } from "@/shared/contrato";
import { nomeExibicaoSecao } from "@/formulario/secoes";
import {
  ancorasHorarioDaSessao,
  secoesDaSessao,
  type AncorasHorarioPorViagem,
  type SessaoFormulario,
} from "@/formulario/sessao";
import {
  atualizarHorarioSaida,
  criarViagemNaCelula,
  editarHorarioPassante,
  resetarOffsetsEmLote,
  resetarOffsetsViagem,
} from "./acoes-grade";
import {
  apagarBloco,
  apagarViagem,
  clonarDiasComunsParaFeriado,
  copiarViagemParaDias,
} from "./copias-grade";
import { horarioParaHoraMinuto } from "./horario-relogio";
import {
  horarioAbsolutoNaParada,
  linhasSecoes,
  montarBlocosDiasComuns,
  montarBlocosFeriados,
  type BlocoGrade,
  type DiaSemana,
} from "./montagem-grade";

// Etapa "Viagens e horários" (TASK-028/029/030; Spec 04 §8) — duas grades por
// Serviço × sentido: dias comuns e feriados (RN-068, grades independentes).
// Preencher a 1ª Seção de um bloco cria a Viagem (RN-061/064/067); alterar um
// horário passante torna a parada âncora e redistribui as derivadas (RN-065),
// com bloqueio de fora-de-ordem; "Restaurar sugestão" (por Viagem e em lote)
// desfaz âncoras (RN-066). O conjunto de âncoras é estado efêmero da sessão
// (DEC-049). TASK-030: grade de feriados, "Copiar dias comuns" (clona com UUIDs
// novas — RN-007), "Copiar viagem para outro dia" e apagar viagem/bloco
// (Spec 04 §8.3/§8.4).

const ROTULO_DIA: Record<DiaSemana, string> = {
  segunda: "SEG",
  terca: "TER",
  quarta: "QUA",
  quinta: "QUI",
  sexta: "SEX",
  sabado: "SAB",
  domingo: "DOM",
};

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
  const [servicoSelecionadoUuid, definirServicoSelecionadoUuid] = useState<string | null>(null);
  const [sentidoSelecionado, definirSentidoSelecionado] = useState<Itinerario["sentido"] | null>(
    null,
  );
  // Células passantes recusadas por fora-de-ordem (Spec 04 §8.2): não confirmam
  // e ficam em erro até uma edição válida. Estado de UI, por célula.
  const [errosCelula, definirErrosCelula] = useState<Record<string, string>>({});
  // Dia-alvo escolhido em "Copiar viagem para outro dia", por Viagem (Spec 04 §8.3).
  const [diaCopiaPorViagem, definirDiaCopiaPorViagem] = useState<Record<string, DiaSemana>>({});

  const servicos: Servico[] = sessao.modo === "carregado" ? sessao.documento.autos.servicos : [];
  const servicoAtual = servicos.find((s) => s.uuid === servicoSelecionadoUuid) ?? null;
  const itinerarioAtual =
    servicoAtual?.itinerarios.find((it) => it.sentido === sentidoSelecionado) ?? null;
  const todasAsSecoes = secoesDaSessao(sessao);
  const ancoras = ancorasHorarioDaSessao(sessao);

  // Grava no documento o itinerário atualizado e, opcionalmente, o novo conjunto
  // de âncoras de sessão (DEC-049) — num único update para não haver estado
  // parcial. Só o modo carregado tem `documento` (a etapa exige Serviços).
  function aplicar(itinerarioAtualizado: Itinerario, ancorasAtualizadas?: AncorasHorarioPorViagem) {
    if (sessao.modo !== "carregado" || !servicoAtual) return;
    const servicosAtualizados = sessao.documento.autos.servicos.map((s) =>
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
      ...sessao,
      ...(ancorasAtualizadas ? { ancorasHorario: ancorasAtualizadas } : {}),
      documento: {
        ...sessao.documento,
        autos: { ...sessao.documento.autos, servicos: servicosAtualizados },
      },
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

  function aoConfirmarCriacao(dia: DiaSemana, horaMinuto: string, feriado: boolean) {
    if (!itinerarioAtual || horaMinuto === "") return;
    const viagemNova = criarViagemNaCelula(itinerarioAtual, dia, horaMinuto, feriado);
    if (!viagemNova) return;
    aplicar({ ...itinerarioAtual, viagens: [...itinerarioAtual.viagens, viagemNova] });
  }

  function aoConfirmarPartida(viagemUuid: string, horaMinuto: string) {
    if (!itinerarioAtual || horaMinuto === "") return;
    const viagemOriginal = itinerarioAtual.viagens.find((v) => v.uuid === viagemUuid);
    if (!viagemOriginal) return;
    const viagemAtualizada = atualizarHorarioSaida(viagemOriginal, horaMinuto);
    if (!viagemAtualizada) return;
    aplicar({
      ...itinerarioAtual,
      viagens: itinerarioAtual.viagens.map((v) => (v.uuid === viagemUuid ? viagemAtualizada : v)),
    });
  }

  function aoEditarPassante(viagemUuid: string, paradaOrdem: number, horaMinuto: string) {
    if (!itinerarioAtual || horaMinuto === "") return;
    const viagem = itinerarioAtual.viagens.find((v) => v.uuid === viagemUuid);
    if (!viagem) return;

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
      return;
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
    aplicar(apagarViagem(itinerarioAtual, viagemUuid), ancorasSem([viagemUuid]));
  }

  function aoApagarBloco(posicao: number, feriado: boolean) {
    if (!itinerarioAtual) return;
    const confirmado =
      typeof window === "undefined" ||
      window.confirm("Apagar o bloco inteiro (a n-ésima partida em todos os dias)?");
    if (!confirmado) return;
    const itinerarioNovo = apagarBloco(itinerarioAtual, posicao, feriado);
    const removidos = itinerarioAtual.viagens
      .filter((v) => !itinerarioNovo.viagens.some((n) => n.uuid === v.uuid))
      .map((v) => v.uuid);
    limparEstadoDeSessao(removidos);
    aplicar(itinerarioNovo, ancorasSem(removidos));
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
      <p data-testid="viagens-sem-servico">
        Conclua ao menos um Serviço com itinerário e rota calculada na etapa
        Seções, Locais e Itinerários antes de editar viagens e horários.
      </p>
    );
  }

  const secoesDaGrade = itinerarioAtual ? linhasSecoes(itinerarioAtual.paradas) : [];
  const blocosComuns = itinerarioAtual ? montarBlocosDiasComuns(itinerarioAtual.viagens) : [];
  const blocosFeriados = itinerarioAtual ? montarBlocosFeriados(itinerarioAtual.viagens) : [];
  const temFeriado = itinerarioAtual?.viagens.some((v) => v.viagem_feriado) ?? false;

  // Corpo de uma grade (dias comuns ou feriados). `feriado` propaga para a
  // criação de Viagem (grade correta) e para apagar bloco.
  function corpoGrade(blocos: BlocoGrade[], feriado: boolean) {
    return blocos.map((bloco, indiceBloco) => {
      const blocoTemViagem = DIAS_SEMANA.some((dia) => bloco[dia].estado === "existente");
      return secoesDaGrade.map((parada, indiceSecao) => {
        const secao = secaoDaParada(parada, todasAsSecoes);
        const nomeSecao = secao ? nomeExibicaoSecao(secao) : "";
        const ehPrimeiraSecao = indiceSecao === 0;
        return (
          <tr key={`${indiceBloco}-${parada.ordem}`} data-testid="linha-grade">
            <th scope="row">
              {nomeSecao}
              {ehPrimeiraSecao && blocoTemViagem && (
                <button
                  type="button"
                  data-testid="apagar-bloco"
                  aria-label={`Apagar bloco ${indiceBloco + 1}`}
                  onClick={() => aoApagarBloco(indiceBloco, feriado)}
                >
                  Apagar bloco
                </button>
              )}
            </th>
            {DIAS_SEMANA.map((dia) => {
              const celula = bloco[dia];

              if (celula.estado === "existente") {
                const horarioHms = horarioAbsolutoNaParada(celula.viagem, parada.ordem);
                const horarioMostrar = horarioHms ? horarioParaHoraMinuto(horarioHms) : "";

                if (ehPrimeiraSecao) {
                  const viagemUuid = celula.viagem.uuid;
                  return (
                    <td key={dia} data-testid="celula-partida">
                      <input
                        type="time"
                        aria-label={`Horário de partida — ${dia}, viagem ${indiceBloco + 1}`}
                        value={horarioMostrar}
                        onChange={(evento) => aoConfirmarPartida(viagemUuid, evento.target.value)}
                      />
                      <button
                        type="button"
                        data-testid="restaurar-viagem"
                        aria-label={`Restaurar sugestão — ${dia}, viagem ${indiceBloco + 1}`}
                        onClick={() => aoResetarViagem(viagemUuid)}
                      >
                        Restaurar
                      </button>
                      <button
                        type="button"
                        data-testid="apagar-viagem"
                        aria-label={`Apagar viagem — ${dia}, viagem ${indiceBloco + 1}`}
                        onClick={() => aoApagarViagem(viagemUuid)}
                      >
                        Apagar
                      </button>
                      <label>
                        <span className="sr-only">Copiar para o dia</span>
                        <select
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
                        </select>
                      </label>
                      <button
                        type="button"
                        data-testid="copiar-viagem"
                        aria-label={`Copiar viagem para outro dia — ${dia}, viagem ${indiceBloco + 1}`}
                        onClick={() => aoCopiarViagem(viagemUuid)}
                      >
                        Copiar
                      </button>
                    </td>
                  );
                }
                const chave = chaveCelula(celula.viagem.uuid, parada.ordem);
                const erro = errosCelula[chave];
                return (
                  <td key={dia} data-testid="celula-passante">
                    <input
                      type="time"
                      aria-label={`Horário de passagem — ${nomeSecao}, ${dia}, viagem ${indiceBloco + 1}`}
                      aria-invalid={erro ? true : undefined}
                      value={horarioMostrar}
                      onChange={(evento) =>
                        aoEditarPassante(celula.viagem.uuid, parada.ordem, evento.target.value)
                      }
                    />
                    {erro && (
                      <span role="alert" data-testid="erro-passante">
                        {erro}
                      </span>
                    )}
                  </td>
                );
              }

              if (celula.estado === "criavel" && ehPrimeiraSecao) {
                return (
                  <td key={dia} data-testid="celula-criavel">
                    <input
                      type="time"
                      aria-label={`Criar viagem — ${dia}`}
                      value=""
                      onChange={(evento) => aoConfirmarCriacao(dia, evento.target.value, feriado)}
                    />
                  </td>
                );
              }

              return (
                <td key={dia} data-testid="celula-vazia">
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
    <div data-testid="etapa-viagens">
      <label>
        Serviço
        <select
          data-testid="select-servico-viagens"
          value={servicoSelecionadoUuid ?? ""}
          onChange={(evento) => {
            definirServicoSelecionadoUuid(evento.target.value || null);
            definirSentidoSelecionado(null);
          }}
        >
          <option value="">— selecione —</option>
          {servicos.map((s) => (
            <option key={s.uuid} value={s.uuid}>
              {s.numero_n}
            </option>
          ))}
        </select>
      </label>

      {servicoAtual && (
        <label>
          Sentido
          <select
            data-testid="select-sentido-viagens"
            value={sentidoSelecionado ?? ""}
            onChange={(evento) =>
              definirSentidoSelecionado(
                (evento.target.value || null) as Itinerario["sentido"] | null,
              )
            }
          >
            <option value="">— selecione —</option>
            {servicoAtual.itinerarios.map((it) => (
              <option key={it.sentido} value={it.sentido}>
                {it.sentido === "ida" ? "Ida" : "Volta"}
              </option>
            ))}
          </select>
        </label>
      )}

      {itinerarioAtual && (
        <>
          <section data-testid="grade-dias-comuns">
            <h3>Dias comuns</h3>
            <button type="button" data-testid="restaurar-lote" onClick={aoResetarLote}>
              Restaurar sugestão (toda a grade)
            </button>
            <table>
              {cabecalhoGrade()}
              <tbody>{corpoGrade(blocosComuns, false)}</tbody>
            </table>
          </section>

          <section data-testid="grade-feriados">
            <h3>Feriados</h3>
            <p data-testid="legenda-feriados">
              Feriados não entram nas contagens — semana padrão (sem feriados).
            </p>
            {temFeriado ? (
              <>
                <button
                  type="button"
                  data-testid="copiar-dias-comuns-sobrescrever"
                  onClick={() => aoCopiarDiasComuns("sobrescrever")}
                >
                  Copiar dias comuns (sobrescrever)
                </button>
                <button
                  type="button"
                  data-testid="copiar-dias-comuns-mesclar"
                  onClick={() => aoCopiarDiasComuns("mesclar")}
                >
                  Copiar dias comuns (mesclar)
                </button>
              </>
            ) : (
              <button
                type="button"
                data-testid="copiar-dias-comuns"
                onClick={() => aoCopiarDiasComuns("sobrescrever")}
              >
                Copiar dias comuns
              </button>
            )}
            <table>
              {cabecalhoGrade()}
              <tbody>{corpoGrade(blocosFeriados, true)}</tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
