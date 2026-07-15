"use client";

import { useState } from "react";
import { DIAS_SEMANA, type Itinerario, type Parada, type Secao, type Servico } from "@/shared/contrato";
import { nomeExibicaoSecao } from "@/formulario/secoes";
import { secoesDaSessao, type SessaoFormulario } from "@/formulario/sessao";
import { atualizarHorarioSaida, criarViagemNaCelula } from "./acoes-grade";
import { horarioParaHoraMinuto } from "./horario-relogio";
import {
  horarioAbsolutoNaParada,
  linhasSecoes,
  montarBlocosDiasComuns,
  type DiaSemana,
} from "./montagem-grade";

// Etapa "Viagens e horários" (TASK-028; Spec 04 §8) — grade de dias comuns:
// Seções × dias da semana, em blocos por posição ordinal. Preencher a 1ª
// Seção de um bloco cria a Viagem (RN-061/064/067); edição de horário
// passante (âncoras/redistribuição, RN-065/066) é a TASK-029; a tabela de
// feriados e as ações de apagar/copiar (Spec 04 §8.3/§8.4) são a TASK-030.

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

interface PropsEtapaViagens {
  sessao: SessaoFormulario;
  aoAtualizarSessao: (sessao: SessaoFormulario) => void;
}

export function EtapaViagens({ sessao, aoAtualizarSessao }: PropsEtapaViagens) {
  const [servicoSelecionadoUuid, definirServicoSelecionadoUuid] = useState<string | null>(null);
  const [sentidoSelecionado, definirSentidoSelecionado] = useState<Itinerario["sentido"] | null>(
    null,
  );

  const servicos: Servico[] = sessao.modo === "carregado" ? sessao.documento.autos.servicos : [];
  const servicoAtual = servicos.find((s) => s.uuid === servicoSelecionadoUuid) ?? null;
  const itinerarioAtual =
    servicoAtual?.itinerarios.find((it) => it.sentido === sentidoSelecionado) ?? null;
  const todasAsSecoes = secoesDaSessao(sessao);

  function atualizarItinerario(itinerarioAtualizado: Itinerario) {
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
    atualizarItinerario({
      ...itinerarioAtual,
      viagens: [...itinerarioAtual.viagens, viagemNova],
    });
  }

  function aoConfirmarPartida(viagemUuid: string, horaMinuto: string) {
    if (!itinerarioAtual || horaMinuto === "") return;
    const viagemOriginal = itinerarioAtual.viagens.find((v) => v.uuid === viagemUuid);
    if (!viagemOriginal) return;
    const viagemAtualizada = atualizarHorarioSaida(viagemOriginal, itinerarioAtual, horaMinuto);
    if (!viagemAtualizada) return;
    atualizarItinerario({
      ...itinerarioAtual,
      viagens: itinerarioAtual.viagens.map((v) => (v.uuid === viagemUuid ? viagemAtualizada : v)),
    });
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
                  const ehPrimeiraSecao = indiceSecao === 0;
                  return (
                    <tr key={`${indiceBloco}-${parada.ordem}`} data-testid="linha-grade">
                      <th scope="row">{secao ? nomeExibicaoSecao(secao) : ""}</th>
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
                              </td>
                            );
                          }
                          return (
                            <td key={dia} data-testid="celula-passante">
                              {horarioMostrar}
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
