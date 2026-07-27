"use client";

import {
  contarAutos,
  contarAutosPorFaixa,
  FAIXAS_HORARIO,
  ROTULO_SEMANA_PADRAO,
  type ContagensAutos,
  type ContagensAutosPorFaixa,
} from "@/shared/contagens";
import type { Autos } from "@/shared/contrato";
import { Selo, Tabela } from "@/shared/ui";

// Painel "Resumo Operacional" (TASK-031; Spec 04 §10): contagens derivadas de
// viagens semanais, pares O-D compráveis e opções de deslocamento, por
// Serviço e por Autos, estratificadas pelas 7 faixas de horário. Componente
// controlado e presentacional (padrão DEC-043/045): só recebe `autos` e
// exibe — todo o cálculo vive no módulo puro `shared/contagens` (RN-072).
//
// RN-069/NEG-018 — todas as contagens usam a semana padrão, sem feriado nem
// operação excepcional; o rótulo abaixo é obrigatório em qualquer lugar que
// exiba estes números (tela e PDF — Spec 04 §11 item 9/§13.3).

export interface PropsPainelResumoOperacional {
  autos: Autos;
}

export function PainelResumoOperacional({ autos }: PropsPainelResumoOperacional) {
  const contagens: ContagensAutos = contarAutos(autos);
  const porFaixa: ContagensAutosPorFaixa = contarAutosPorFaixa(autos);

  return (
    // `details` colapsável (doc 18 §5), mesmo padrão do `painel-pendencias.tsx`
    // (TASK-051): o `titulo` do `Painel` só aceita texto simples, e o
    // cabeçalho aqui precisa do selo de total ao lado — por isso a composição
    // manual em vez do componente `Painel`, com os mesmos tokens de superfície.
    <details
      aria-label="Resumo operacional"
      data-testid="resumo-operacional"
      open
      className={
        "overflow-hidden rounded-painel border border-cinza-200 bg-white " +
        "shadow-sombra-1 open:shadow-sombra-2 " +
        "[transition:box-shadow_var(--transicao-media)]"
      }
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-lg font-semibold text-cinza-900">
        Resumo operacional
        <Selo tom="azul">{contagens.totalViagensSemana} viagens semana</Selo>
      </summary>

      <div className="border-t border-cinza-200 px-4 py-3">
        <p data-testid="rotulo-semana-padrao" className="text-sm text-cinza-700">
          Todas as contagens abaixo consideram a <strong>{ROTULO_SEMANA_PADRAO}</strong>.
        </p>

        <Tabela className="mt-3" data-testid="tabela-por-servico">
          <caption className="mb-2 text-left text-sm font-semibold text-cinza-700">
            Por Serviço
          </caption>
          <thead>
            <tr>
              <th scope="col">Serviço</th>
              <th scope="col">Viagens semana — Ida</th>
              <th scope="col">Viagens semana — Volta</th>
              <th scope="col">Total viagens semana</th>
              <th scope="col">Pares O-D compráveis</th>
              <th scope="col">Opções deslocamento — Ida</th>
              <th scope="col">Opções deslocamento — Volta</th>
              <th scope="col">Total opções deslocamento</th>
            </tr>
          </thead>
          <tbody>
            {contagens.porServico.map((c) => (
              <tr key={c.servicoUuid} data-testid="linha-servico">
                <th scope="row">{c.numeroN}</th>
                <td>{c.ida.viagensSemana}</td>
                <td>{c.volta.viagensSemana}</td>
                <td>{c.totalViagensSemana}</td>
                <td>{c.paresCompraveis}</td>
                <td>{c.ida.opcoesDeslocamento}</td>
                <td>{c.volta.opcoesDeslocamento}</td>
                <td>{c.totalOpcoesDeslocamento}</td>
              </tr>
            ))}
          </tbody>
        </Tabela>

        <Tabela className="mt-4" data-testid="tabela-total-autos">
          <caption className="mb-2 text-left text-sm font-semibold text-cinza-700">
            Total do Autos
          </caption>
          <tbody>
            <tr>
              <th scope="row">Soma de viagens semanais</th>
              <td data-testid="total-viagens-semana">{contagens.totalViagensSemana}</td>
            </tr>
            <tr>
              <th scope="row">Soma de opções de deslocamento</th>
              <td data-testid="total-opcoes-deslocamento">{contagens.totalOpcoesDeslocamento}</td>
            </tr>
          </tbody>
        </Tabela>

        <Tabela className="mt-4" data-testid="tabela-faixas">
          <caption className="mb-2 text-left text-sm font-semibold text-cinza-700">
            Por faixa de horário — total do Autos
          </caption>
          <thead>
            <tr>
              <th scope="col">Faixa</th>
              <th scope="col">Intervalo</th>
              <th scope="col">Viagens semana</th>
              <th scope="col">Opções deslocamento</th>
            </tr>
          </thead>
          <tbody>
            {FAIXAS_HORARIO.map((faixa) => (
              <tr key={faixa.id} data-testid="linha-faixa">
                <th scope="row">{faixa.rotulo}</th>
                <td>
                  {faixa.inicio}–{faixa.fim}
                </td>
                <td>{porFaixa.totais[faixa.id].viagensSemana}</td>
                <td>{porFaixa.totais[faixa.id].opcoesDeslocamento}</td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </div>
    </details>
  );
}
