"use client";

import { PainelResumoOperacional } from "@/formulario/resumo";
import { ROTULO_SENTIDO, type Pendencia } from "@/formulario/pendencias";
import { montarDocumentoParaExportacao } from "@/formulario/exportacao";
import { servicosDaSessao, type SessaoFormulario } from "@/formulario/sessao";
import { Painel, Selo } from "@/shared/ui";
import type { IdEtapa } from "@/formulario/layout/etapas";

// Tela de Revisão (TASK-032; Spec 04 §11): tela final antes da exportação.
// Consolida o painel de pendências vivo (já coletado pela casca —
// `coletarPendencias`, recebido aqui pronto) em duas listas — erros
// bloqueantes e alertas —, exibe a descrição textual do itinerário por
// Serviço e sentido (conferência final antes de exportar, §11) e o Resumo
// Operacional (§10, TASK-031). É uma tela distinta do `PainelPendencias`
// colapsável da casca (`layout/painel-pendencias.tsx`): a §11 pede aqui as
// DUAS LISTAS completas, sempre expandidas, como conteúdo principal da etapa
// — não reaproveita aquele componente para não criar dependência circular
// entre `formulario/revisao` e `formulario/layout` (docs-dev/13).
//
// Componente puramente apresentacional: não recomputa pendências (recebe
// prontas da casca) nem persiste nada (NEG-004).

interface PropsTelaRevisao {
  sessao: SessaoFormulario;
  pendencias: Pendencia[];
  /** Navega para a etapa/entidade de origem da pendência clicada (§11). */
  aoNavegar: (etapa: IdEtapa) => void;
}

export function TelaRevisao({ sessao, pendencias, aoNavegar }: PropsTelaRevisao) {
  const bloqueantes = pendencias.filter((p) => p.severidade === "bloqueante");
  const alertas = pendencias.filter((p) => p.severidade === "alerta");
  const documento = montarDocumentoParaExportacao(sessao);
  const servicos = servicosDaSessao(sessao);

  return (
    <div data-testid="tela-revisao">
      <ListaPendencias
        titulo="Erros bloqueantes"
        testId="revisao-bloqueantes"
        vazioTestId="revisao-bloqueantes-vazio"
        mensagemVazia="Nenhum erro bloqueante."
        itens={bloqueantes}
        itemTestId="revisao-item-bloqueante"
        aoNavegar={aoNavegar}
      />

      <ListaPendencias
        titulo="Alertas"
        testId="revisao-alertas"
        vazioTestId="revisao-alertas-vazio"
        mensagemVazia="Nenhum alerta."
        itens={alertas}
        itemTestId="revisao-item-alerta"
        aoNavegar={aoNavegar}
        className="mt-6"
      />

      <section data-testid="revisao-descricoes" aria-label="Descrição do itinerário" className="mt-6">
        <h3 className="text-lg font-semibold text-cinza-900">
          Descrição do itinerário por Serviço e sentido
        </h3>
        {servicos.length === 0 ? (
          <p data-testid="revisao-descricoes-vazio" className="mt-2 text-sm text-cinza-500">
            Nenhum Serviço com itinerário ainda.
          </p>
        ) : (
          <div className="mt-2 space-y-4">
            {servicos.flatMap((servico) =>
              servico.itinerarios.map((itinerario) => (
                <div
                  key={`${servico.uuid}-${itinerario.sentido}`}
                  data-testid="revisao-descricao-item"
                >
                  <p className="font-semibold text-cinza-900">
                    Serviço {servico.numero_n} — {ROTULO_SENTIDO[itinerario.sentido]}
                  </p>
                  <p className="text-sm text-cinza-700">
                    {itinerario.rota.descricao_itinerario.texto || "(sem descrição)"}
                  </p>
                </div>
              )),
            )}
          </div>
        )}
      </section>

      {documento && (
        <div className="mt-6">
          <PainelResumoOperacional autos={documento.autos} />
        </div>
      )}
    </div>
  );
}

function ListaPendencias({
  titulo,
  testId,
  vazioTestId,
  mensagemVazia,
  itens,
  itemTestId,
  aoNavegar,
  className,
}: {
  titulo: string;
  testId: string;
  vazioTestId: string;
  mensagemVazia: string;
  itens: Pendencia[];
  itemTestId: string;
  aoNavegar: (etapa: IdEtapa) => void;
  className?: string;
}) {
  const cor = itens.length > 0 && titulo === "Erros bloqueantes" ? "erro" : "alerta";
  return (
    <section data-testid={testId} aria-label={titulo} className={className}>
      <h3 className="flex items-center gap-2 text-lg font-semibold text-cinza-900">
        {titulo}
        <Selo tom={itens.length > 0 ? cor : "neutro"}>{itens.length}</Selo>
      </h3>
      {itens.length === 0 ? (
        <p data-testid={vazioTestId} className="mt-2 text-sm text-cinza-500">
          {mensagemVazia}
        </p>
      ) : (
        <Painel tom="padrao" className="mt-2" elevacao="plana">
          <ul className="space-y-1">
            {itens.map((pendencia) => (
              <li key={pendencia.id}>
                <button
                  type="button"
                  data-testid={itemTestId}
                  onClick={() => aoNavegar(pendencia.etapaAlvo)}
                  className="block w-full rounded-controle px-2 py-1 text-left text-sm hover:bg-cinza-100"
                >
                  {pendencia.mensagem}
                </button>
              </li>
            ))}
          </ul>
        </Painel>
      )}
    </section>
  );
}
