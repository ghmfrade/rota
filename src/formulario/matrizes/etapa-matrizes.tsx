"use client";

import { useState } from "react";
import type { ParSecao, Secao, Servico } from "@/shared/contrato";
import { nomeExibicaoSecao } from "@/formulario/secoes";
import { secoesDaSessao, type SessaoFormulario } from "@/formulario/sessao";
import { celulaDistancia, formatarKm } from "./apresentacao-matriz-distancias";
import { secoesAtendidas } from "./calculo-matriz-distancias";
import {
  aplicarSugestaoEmLote,
  definirDistancia,
  desabilitarPar,
  habilitarPar,
  type ModoSugestaoSeccionamento,
} from "./edicao-seccionamento";
import { sugerirDistanciaDoServico, sugerirMenorDistancia } from "./sugestoes-seccionamento";

// Etapa "Matrizes" (TASK-027; Spec 04 §9). Só Serviços já COMPLETOS (do
// `documento`, modo carregado) entram no seletor: `ServicoEmConstrucao`
// (DEC-035, modo novo/em construção) ainda não tem `matriz_distancias` — a
// base a partir da qual todo par de seccionamento é habilitável (RN-059) —
// então não há o que editar até a etapa Itinerários promovê-lo a `Servico`
// completo. Limite conhecido (ver "Pontos de atenção" da entrega).
//
// TASK-027 entregou o shell (seletor de Serviço + grade triangular reutilizável)
// e a matriz de SECCIONAMENTO editável (§9.2). A TASK-048 acopla ao mesmo shell o
// display somente-leitura da matriz de DISTÂNCIAS (§9.1): lê o `matriz_distancias`
// já congelado (RN-054/056; Spec 03 §12), nunca chama OSRM nem recalcula.

function encontrarPar(
  matrizSeccionamento: readonly ParSecao[],
  secaoAUuid: string,
  secaoBUuid: string,
): ParSecao | undefined {
  return matrizSeccionamento.find(
    (par) =>
      (par.secao_a_uuid === secaoAUuid && par.secao_b_uuid === secaoBUuid) ||
      (par.secao_a_uuid === secaoBUuid && par.secao_b_uuid === secaoAUuid),
  );
}

interface PropsEtapaMatrizes {
  sessao: SessaoFormulario;
  aoAtualizarSessao: (sessao: SessaoFormulario) => void;
}

export function EtapaMatrizes({ sessao, aoAtualizarSessao }: PropsEtapaMatrizes) {
  const [servicoSelecionadoUuid, definirServicoSelecionadoUuid] = useState<string | null>(null);
  // Modo "ativo" de sugestão (Spec 04 §9.2 "habilitar preenche com a sugestão
  // ativa"; Spec 03 §6.1 "o último botão acionado ... é o que vale"):
  // inferência controlada — a spec nomeia o conceito ("sugestão ativa") sem
  // detalhar o mecanismo; modelamos como o modo do ÚLTIMO botão de lote
  // acionado, usado tanto para a aplicação em lote quanto para preencher um
  // único par recém-habilitado. Default "menor-distancia": é o piso de
  // referência que a Spec 03 §6.2 recomenda para não superestimar a tarifa
  // parcial. Sempre editável manualmente depois (RN-058) — o default nunca é
  // definitivo.
  const [modoAtivo, definirModoAtivo] = useState<ModoSugestaoSeccionamento>("menor-distancia");

  const servicos: Servico[] = sessao.modo === "carregado" ? sessao.documento.autos.servicos : [];
  const servicoAtual = servicos.find((s) => s.uuid === servicoSelecionadoUuid) ?? null;
  const todasAsSecoes = secoesDaSessao(sessao);

  const secoesDaMatriz: Secao[] = servicoAtual
    ? secoesAtendidas(servicoAtual.itinerarios)
        .map((uuid) => todasAsSecoes.find((s) => s.uuid === uuid))
        .filter((s): s is Secao => s !== undefined)
    : [];

  function atualizarMatrizSeccionamento(matrizSeccionamento: ParSecao[]) {
    if (sessao.modo !== "carregado" || !servicoAtual) return;
    const servicosAtualizados = sessao.documento.autos.servicos.map((s) =>
      s.uuid === servicoAtual.uuid ? { ...s, matriz_seccionamento: matrizSeccionamento } : s,
    );
    aoAtualizarSessao({
      ...sessao,
      documento: {
        ...sessao.documento,
        autos: { ...sessao.documento.autos, servicos: servicosAtualizados },
      },
    });
  }

  function sugestaoAtivaPara(secaoAUuid: string, secaoBUuid: string): number {
    if (!servicoAtual) return 0;
    const sugestao =
      modoAtivo === "menor-distancia"
        ? sugerirMenorDistancia(servicos, secaoAUuid, secaoBUuid)
        : sugerirDistanciaDoServico(servicoAtual, secaoAUuid, secaoBUuid);
    // Defensivo: para um par exibido na grade (presente em matriz_distancias
    // do próprio Serviço), ambos os algoritmos sempre encontram candidato —
    // o próprio Serviço atende as duas Seções (Spec 03 §6.2/§6.3).
    return sugestao ?? 0;
  }

  function alternarPar(secaoAUuid: string, secaoBUuid: string) {
    if (!servicoAtual) return;
    if (encontrarPar(servicoAtual.matriz_seccionamento, secaoAUuid, secaoBUuid)) {
      atualizarMatrizSeccionamento(
        desabilitarPar(servicoAtual.matriz_seccionamento, secaoAUuid, secaoBUuid),
      );
      return;
    }
    const resultado = habilitarPar(
      servicoAtual,
      secaoAUuid,
      secaoBUuid,
      sugestaoAtivaPara(secaoAUuid, secaoBUuid),
    );
    if (resultado.ok) {
      atualizarMatrizSeccionamento(resultado.matrizSeccionamento);
    }
  }

  function editarDistancia(secaoAUuid: string, secaoBUuid: string, distanciaKm: number) {
    if (!servicoAtual || Number.isNaN(distanciaKm)) return;
    atualizarMatrizSeccionamento(
      definirDistancia(servicoAtual.matriz_seccionamento, secaoAUuid, secaoBUuid, distanciaKm),
    );
  }

  function aoAcionarSugestaoEmLote(modo: ModoSugestaoSeccionamento) {
    definirModoAtivo(modo);
    if (!servicoAtual) return;
    atualizarMatrizSeccionamento(aplicarSugestaoEmLote(servicoAtual, servicos, modo));
  }

  if (servicos.length === 0) {
    return (
      <p data-testid="matrizes-sem-servico">
        Conclua ao menos um Serviço com itinerário e rota calculada na etapa
        Seções, Locais e Itinerários antes de editar as matrizes.
      </p>
    );
  }

  return (
    <div data-testid="etapa-matrizes">
      <label>
        Serviço
        <select
          data-testid="select-servico-matrizes"
          value={servicoSelecionadoUuid ?? ""}
          onChange={(evento) => definirServicoSelecionadoUuid(evento.target.value || null)}
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
        <section data-testid="matriz-distancias">
          <h3>Matriz de distâncias</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">Origem/Destino</th>
                {secoesDaMatriz.map((secao) => (
                  <th scope="col" key={secao.uuid}>
                    {nomeExibicaoSecao(secao)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {secoesDaMatriz.map((secaoLinha, indiceLinha) => (
                <tr key={secaoLinha.uuid}>
                  <th scope="row">{nomeExibicaoSecao(secaoLinha)}</th>
                  {secoesDaMatriz.map((secaoColuna, indiceColuna) => {
                    if (indiceColuna > indiceLinha) {
                      // Metade superior da triangular inferior (Spec 04 §9):
                      // não exibida.
                      return <td key={secaoColuna.uuid} aria-hidden="true" />;
                    }
                    if (indiceColuna === indiceLinha) {
                      return (
                        <td key={secaoColuna.uuid} data-testid="celula-distancia-diagonal">
                          X
                        </td>
                      );
                    }
                    const celula = celulaDistancia(
                      servicoAtual.matriz_distancias,
                      secaoLinha.uuid,
                      secaoColuna.uuid,
                    );
                    return (
                      <td key={secaoColuna.uuid} data-testid="celula-distancia">
                        {celula &&
                          (celula.bidirecional ? (
                            // Detalhe Ida/Volta expansível (Spec 04 §9.1):
                            // inferência controlada de UX — a spec pede
                            // "expansível (hover/clique)" sem prescrever o
                            // widget; usamos <details> nativo (acessível, sem
                            // estado extra).
                            <details data-testid="detalhe-ida-volta">
                              <summary>{formatarKm(celula.valorAdotado)}</summary>
                              <dl>
                                <div>
                                  <dt>Ida</dt>
                                  <dd>{formatarKm(celula.ida as number)}</dd>
                                </div>
                                <div>
                                  <dt>Volta</dt>
                                  <dd>{formatarKm(celula.volta as number)}</dd>
                                </div>
                              </dl>
                            </details>
                          ) : (
                            formatarKm(celula.valorAdotado)
                          ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {servicoAtual && (
        <section data-testid="matriz-seccionamento">
          <h3>Matriz de seccionamento</h3>
          <div>
            <button
              type="button"
              data-testid="botao-sugerir-menor-distancia"
              onClick={() => aoAcionarSugestaoEmLote("menor-distancia")}
            >
              Sugerir menor distância
            </button>
            <button
              type="button"
              data-testid="botao-sugerir-distancias-servico"
              onClick={() => aoAcionarSugestaoEmLote("do-servico")}
            >
              Sugerir distâncias do serviço
            </button>
          </div>

          <table>
            <thead>
              <tr>
                <th scope="col">Origem/Destino</th>
                {secoesDaMatriz.map((secao) => (
                  <th scope="col" key={secao.uuid}>
                    {nomeExibicaoSecao(secao)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {secoesDaMatriz.map((secaoLinha, indiceLinha) => (
                <tr key={secaoLinha.uuid}>
                  <th scope="row">{nomeExibicaoSecao(secaoLinha)}</th>
                  {secoesDaMatriz.map((secaoColuna, indiceColuna) => {
                    if (indiceColuna > indiceLinha) {
                      // Metade superior da triangular inferior (Spec 04 §9):
                      // não exibida.
                      return <td key={secaoColuna.uuid} aria-hidden="true" />;
                    }
                    if (indiceColuna === indiceLinha) {
                      return (
                        <td key={secaoColuna.uuid} data-testid="celula-diagonal">
                          X
                        </td>
                      );
                    }
                    const par = encontrarPar(
                      servicoAtual.matriz_seccionamento,
                      secaoLinha.uuid,
                      secaoColuna.uuid,
                    );
                    return (
                      <td key={secaoColuna.uuid} data-testid="celula-seccionamento">
                        {par ? (
                          <>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              aria-label={`Distância entre ${nomeExibicaoSecao(secaoLinha)} e ${nomeExibicaoSecao(secaoColuna)} (km)`}
                              value={par.distancia_km}
                              onChange={(evento) =>
                                editarDistancia(
                                  secaoLinha.uuid,
                                  secaoColuna.uuid,
                                  evento.target.valueAsNumber,
                                )
                              }
                            />
                            <button
                              type="button"
                              aria-label={`Desabilitar seccionamento entre ${nomeExibicaoSecao(secaoLinha)} e ${nomeExibicaoSecao(secaoColuna)}`}
                              onClick={() => alternarPar(secaoLinha.uuid, secaoColuna.uuid)}
                            >
                              desabilitar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Habilitar seccionamento entre ${nomeExibicaoSecao(secaoLinha)} e ${nomeExibicaoSecao(secaoColuna)}`}
                            onClick={() => alternarPar(secaoLinha.uuid, secaoColuna.uuid)}
                          >
                            —
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
