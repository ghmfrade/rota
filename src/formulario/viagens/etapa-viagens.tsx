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
import { horarioParaHoraMinuto } from "./horario-relogio";
import {
  horarioAbsolutoNaParada,
  linhasSecoes,
  montarBlocosDiasComuns,
  type DiaSemana,
} from "./montagem-grade";

// Etapa "Viagens e horários" (TASK-028/029; Spec 04 §8) — grade de dias comuns:
// Seções × dias da semana, em blocos por posição ordinal. Preencher a 1ª Seção
// de um bloco cria a Viagem (RN-061/064/067); alterar um horário passante torna
// a parada âncora e redistribui as derivadas (RN-065), com bloqueio de
// fora-de-ordem; "Restaurar sugestão" (por Viagem e em lote) desfaz âncoras
// (RN-066). O conjunto de âncoras é estado efêmero da sessão (DEC-049). A tabela
// de feriados e as ações de apagar/copiar (Spec 04 §8.3/§8.4) são a TASK-030.

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

  function aoConfirmarCriacao(dia: DiaSemana, horaMinuto: string) {
    if (!itinerarioAtual || horaMinuto === "") return;
    const viagemNova = criarViagemNaCelula(itinerarioAtual, dia, horaMinuto);
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
    const ancorasNovas = { ...ancoras };
    delete ancorasNovas[viagemUuid];
    definirErrosCelula((atuais) =>
      Object.fromEntries(Object.entries(atuais).filter(([chave]) => !chave.startsWith(`${viagemUuid}:`))),
    );
    aplicar(
      {
        ...itinerarioAtual,
        viagens: itinerarioAtual.viagens.map((v) => (v.uuid === viagemUuid ? viagemResetada : v)),
      },
      ancorasNovas,
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
    const ancorasNovas = { ...ancoras };
    for (const v of itinerarioAtual.viagens) delete ancorasNovas[v.uuid];
    definirErrosCelula({});
    aplicar(resetarOffsetsEmLote(itinerarioAtual), ancorasNovas);
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
  const blocos = itinerarioAtual ? montarBlocosDiasComuns(itinerarioAtual.viagens) : [];

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
        <section data-testid="grade-dias-comuns">
          <h3>Dias comuns</h3>
          <button type="button" data-testid="restaurar-lote" onClick={aoResetarLote}>
            Restaurar sugestão (toda a grade)
          </button>
          <table>
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
            <tbody>
              {blocos.map((bloco, indiceBloco) =>
                secoesDaGrade.map((parada, indiceSecao) => {
                  const secao = secaoDaParada(parada, todasAsSecoes);
                  const nomeSecao = secao ? nomeExibicaoSecao(secao) : "";
                  const ehPrimeiraSecao = indiceSecao === 0;
                  return (
                    <tr key={`${indiceBloco}-${parada.ordem}`} data-testid="linha-grade">
                      <th scope="row">{nomeSecao}</th>
                      {DIAS_SEMANA.map((dia) => {
                        const celula = bloco[dia];

                        if (celula.estado === "existente") {
                          const horarioHms = horarioAbsolutoNaParada(
                            celula.viagem,
                            parada.ordem,
                          );
                          const horarioMostrar = horarioHms
                            ? horarioParaHoraMinuto(horarioHms)
                            : "";

                          if (ehPrimeiraSecao) {
                            return (
                              <td key={dia} data-testid="celula-partida">
                                <input
                                  type="time"
                                  aria-label={`Horário de partida — ${dia}, viagem ${indiceBloco + 1}`}
                                  value={horarioMostrar}
                                  onChange={(evento) =>
                                    aoConfirmarPartida(celula.viagem.uuid, evento.target.value)
                                  }
                                />
                                <button
                                  type="button"
                                  data-testid="restaurar-viagem"
                                  aria-label={`Restaurar sugestão — ${dia}, viagem ${indiceBloco + 1}`}
                                  onClick={() => aoResetarViagem(celula.viagem.uuid)}
                                >
                                  Restaurar
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
                                  aoEditarPassante(
                                    celula.viagem.uuid,
                                    parada.ordem,
                                    evento.target.value,
                                  )
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
                                onChange={(evento) => aoConfirmarCriacao(dia, evento.target.value)}
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
                }),
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
