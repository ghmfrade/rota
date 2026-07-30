"use client";

import { useCallback, useState } from "react";
import { identidadeDaSessao, type SessaoFormulario } from "@/formulario/sessao";
import { coletarPendencias, type Pendencia } from "@/formulario/pendencias";
import { EtapaIdentificacao } from "@/formulario/identificacao";
import { EtapaServicos } from "@/formulario/servicos";
import { EtapaItinerarios, itinerariosAoVivoDaSessao } from "@/formulario/itinerarios";
import { EtapaMatrizes } from "@/formulario/matrizes";
import {
  EtapaViagens,
  type OrigemPartidasCoincidentes,
} from "@/formulario/viagens";
import { TelaRevisao } from "@/formulario/revisao";
import { TelaExportacao, avaliarGateExportacao } from "@/formulario/exportacao";
import { Painel, Selo, Tooltip, Carimbo } from "@/shared/ui";
import { ETAPAS, rotuloEtapa, type IdEtapa } from "./etapas";
import { CARIMBO_DA_ETAPA } from "./carimbo-de-etapa";
import { PainelPendencias } from "./painel-pendencias";

// Casca do Formulário (Spec 04 §4; doc 18 §5): a moldura que envolve todas as
// etapas de edição depois da tela inicial (TASK-013). Monta os três elementos
// persistentes desta task — cabeçalho, stepper de 7 etapas livremente
// navegáveis e painel de pendências — em torno de uma área de conteúdo cujo
// preenchimento por etapa é das tasks seguintes (TASK-015+).
//
// Fora do escopo desta task (Spec 04 §4 os lista como persistentes, mas cada um
// é de outra task): o Resumo operacional / contadores (§10 = TASK-031) e a área
// de mapa (§7 = TASK-020) — não são montados aqui, para não antecipar escopo
// nem inventar dados (docs-dev/04 princípios 7 e 2).
//
// A navegação é LIVRE (Spec 04 §16 decisão 1; RN-078): clicar qualquer etapa
// troca o conteúdo; nada trava a troca. O gate de validação incide só sobre a
// exportação (TASK-032), não sobre a navegação.
//
// Shell full-screen (TASK-051; doc 18 §5): grid de duas colunas ocupando
// `100dvh` via `fixed inset-0` (linha travada com `minmax(0,1fr)` — sem isso o
// conteúdo alto esticaria a linha do grid e mataria o scroll interno) —
// sidebar de carimbos à esquerda (`azul-900`) + coluna de conteúdo com
// cabeçalho sticky e área de etapa com scroll próprio. O painel de pendências
// fica no fluxo do conteúdo, como cartão elevado (doc 18 §5): nunca sobreposto
// a elementos interativos, preservando comportamento/estrutura intocados.

interface PropsLayoutFormulario {
  sessao: SessaoFormulario;
  aoAtualizarSessao: (sessao: SessaoFormulario) => void;
}

// Posição/espaçamento compartilhados pelos dois avisos de modo (carregado/novo)
// logo abaixo do cabeçalho — mutuamente exclusivos, mesma superfície visual
// (doc 18 §5). A superfície azul em si vem de `tom="informativo"` do Painel:
// aqui ficam só classes que não disputam com as do componente.
const CLASSES_PAINEL_MODO = "mx-6 mt-4 text-sm";

interface DadosCabecalho {
  codigo: string;
  empresa: string;
  tipo: string;
  status?: string;
}

// Cabeçalho persistente (Spec 04 §4): código do Autos, empresa, tipo e selo de
// status. Lê a identidade corrente da sessão (Spec 02 §4), qualquer que seja o
// modo. No modo "novo" antes de o usuário selecionar o Autos na etapa
// Identificação (TASK-015) a identidade é indefinida: exibe "a definir" e não há
// selo de status (inferência controlada da TASK-014 — não inventar `status` para
// um documento que ainda não o tem). Depois de definida, o cabeçalho reflete
// reativamente as edições da Identificação (ex.: troca de `tipo`).
function dadosCabecalho(sessao: SessaoFormulario): DadosCabecalho {
  const identidade = identidadeDaSessao(sessao);
  if (identidade) {
    return {
      codigo: identidade.codigo,
      empresa: identidade.empresa,
      tipo: identidade.tipo,
      status: identidade.status,
    };
  }
  return { codigo: "a definir", empresa: "a definir", tipo: "a definir" };
}

export function LayoutFormulario({
  sessao,
  aoAtualizarSessao,
}: PropsLayoutFormulario) {
  const [etapaAtual, definirEtapa] = useState<IdEtapa>("identificacao");
  const [origemPartidasPendente, definirOrigemPartidasPendente] =
    useState<OrigemPartidasCoincidentes | null>(null);
  const [versaoNavegacaoViagens, definirVersaoNavegacaoViagens] =
    useState(0);

  const navegarParaPendencia = useCallback((pendencia: Pendencia) => {
    const origem = pendencia.origemPartidasCoincidentes ?? null;
    definirOrigemPartidasPendente(origem);
    if (origem) {
      definirVersaoNavegacaoViagens((versao) => versao + 1);
    }
    definirEtapa(pendencia.etapaAlvo);
  }, []);

  const consumirOrigemPartidas = useCallback(() => {
    definirOrigemPartidasPendente(null);
  }, []);

  // Pendências recomputadas a cada render a partir da sessão (NEG-004: nada
  // persiste). `itinerariosAoVivoDaSessao` (TASK-019, obrigação de fiação da
  // TASK-044) monta o estado de rota ao vivo de TODO itinerário do documento,
  // não só o que a etapa "Seções, Locais e Itinerários" tem em foco — assim a
  // pendência bloqueante de rota/descrição aparece mesmo antes de o usuário
  // revisitar aquele Serviço/sentido nesta sessão.
  //
  // Mesclada com os motivos ESTRUTURAIS do gate de exportação (TASK-085; Spec
  // 02 §14 via `avaliarGateExportacao`) — antes descartados, deixavam o
  // bloqueio mudo na Revisão/painel de pendências. A casca consome o mesmo
  // `avaliarGateExportacao` que a etapa Exportação usa para os botões (fonte
  // única de verdade — não recomputa violações por conta própria).
  const itinerariosAoVivo = itinerariosAoVivoDaSessao(sessao);
  const gate = avaliarGateExportacao(sessao, itinerariosAoVivo);
  const pendencias = [
    ...coletarPendencias(sessao, itinerariosAoVivo),
    ...gate.errosTecnicos,
    ...gate.errosEstruturais,
  ];
  const cabecalho = dadosCabecalho(sessao);

  return (
    <div
      data-testid="layout-formulario"
      className="fixed inset-0 grid grid-cols-[auto_1fr] grid-rows-[minmax(0,1fr)] overflow-hidden bg-cinza-50"
    >
      <nav
        aria-label="Etapas do formulário"
        data-testid="stepper"
        className="flex h-full w-20 flex-col items-center gap-1 overflow-y-auto bg-azul-900 py-4"
      >
        <ol className="flex flex-col items-center gap-3">
          {ETAPAS.map((etapa) => {
            const IconeEtapa = CARIMBO_DA_ETAPA[etapa.id];
            return (
              <li key={etapa.id}>
                <Tooltip rotulo={etapa.rotulo}>
                  <Carimbo
                    rotulo={etapa.rotulo}
                    ativo={etapa.id === etapaAtual}
                    data-testid="etapa-botao"
                    data-etapa={etapa.id}
                    aria-current={etapa.id === etapaAtual ? "step" : undefined}
                    onClick={() => definirEtapa(etapa.id)}
                  >
                    <IconeEtapa aria-hidden="true" className="size-5" />
                    <span className="sr-only">{etapa.rotulo}</span>
                  </Carimbo>
                </Tooltip>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-col">
        <header
          data-testid="cabecalho-formulario"
          className="sticky top-0 z-10 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-cinza-200 bg-white px-6 py-3 text-sm text-cinza-700 shadow-sombra-1"
        >
          <span data-testid="cabecalho-codigo" className="font-semibold text-cinza-900">
            Autos: {cabecalho.codigo}
          </span>
          <span className="text-cinza-400" aria-hidden="true">
            ·
          </span>
          <span>Empresa: {cabecalho.empresa}</span>
          <span className="text-cinza-400" aria-hidden="true">
            ·
          </span>
          <span>Tipo: {cabecalho.tipo}</span>
          {cabecalho.status && (
            <>
              <span className="text-cinza-400" aria-hidden="true">
                ·
              </span>
              <Selo data-testid="selo-status" tom="azul">
                Status: {cabecalho.status}
              </Selo>
            </>
          )}
        </header>

        {sessao.modo === "carregado" && (
          <Painel
            data-testid="mensagem-sucesso-carregar"
            tom="informativo"
            className={CLASSES_PAINEL_MODO}
          >
            <p>
              Você está editando uma operação anterior. As entidades existentes
              manterão suas UUIDs.
            </p>
            {sessao.alertasImportacao.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-alerta">
                {sessao.alertasImportacao.map((alerta, indice) => (
                  <li key={indice}>{alerta.mensagem}</li>
                ))}
              </ul>
            )}
          </Painel>
        )}

        {sessao.modo === "novo" && (
          <Painel
            data-testid="mensagem-novo-documento"
            tom="informativo"
            className={CLASSES_PAINEL_MODO}
          >
            Novo documento iniciado. Prossiga selecionando o Autos, a empresa e o
            tipo nas listas estáticas.
          </Painel>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto bg-cinza-50">
          <div className="mx-auto max-w-6xl px-6 pt-4">
            <PainelPendencias
              pendencias={pendencias}
              aoNavegar={navegarParaPendencia}
            />
          </div>
          <section
              data-testid="conteudo-etapa"
              data-etapa-atual={etapaAtual}
              aria-label={rotuloEtapa(etapaAtual)}
              className="mx-auto max-w-6xl px-6 py-8"
            >
              <h2 className="mb-4 text-xl font-semibold text-cinza-900">
                {rotuloEtapa(etapaAtual)}
              </h2>
              {etapaAtual === "identificacao" ? (
                <EtapaIdentificacao
                  sessao={sessao}
                  aoAtualizarSessao={aoAtualizarSessao}
                />
              ) : etapaAtual === "servicos" ? (
                <EtapaServicos sessao={sessao} aoAtualizarSessao={aoAtualizarSessao} />
              ) : etapaAtual === "secoes-locais-itinerarios" ? (
                <EtapaItinerarios sessao={sessao} aoAtualizarSessao={aoAtualizarSessao} />
              ) : etapaAtual === "viagens-horarios" ? (
                <EtapaViagens
                  key={`viagens-${versaoNavegacaoViagens}`}
                  sessao={sessao}
                  aoAtualizarSessao={aoAtualizarSessao}
                  origemPartidasPendente={origemPartidasPendente}
                  aoConsumirOrigemPartidas={consumirOrigemPartidas}
                />
              ) : etapaAtual === "matrizes" ? (
                <EtapaMatrizes sessao={sessao} aoAtualizarSessao={aoAtualizarSessao} />
              ) : etapaAtual === "revisao" ? (
                <TelaRevisao
                  sessao={sessao}
                  pendencias={pendencias}
                  aoNavegar={navegarParaPendencia}
                />
              ) : (
                <TelaExportacao
                  sessao={sessao}
                  aoFocarPendencias={() => definirEtapa("revisao")}
                />
              )}
          </section>
        </div>
      </div>
    </div>
  );
}
