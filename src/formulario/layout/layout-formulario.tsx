"use client";

import { useState } from "react";
import { identidadeDaSessao, type SessaoFormulario } from "@/formulario/sessao";
import { coletarPendencias } from "@/formulario/pendencias";
import { EtapaIdentificacao } from "@/formulario/identificacao";
import { EtapaServicos } from "@/formulario/servicos";
import { ETAPAS, rotuloEtapa, type IdEtapa } from "./etapas";
import { PainelPendencias } from "./painel-pendencias";

// Casca do Formulário (Spec 04 §4): a moldura que envolve todas as etapas de
// edição depois da tela inicial (TASK-013). Monta os três elementos
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

interface PropsLayoutFormulario {
  sessao: SessaoFormulario;
  aoAtualizarSessao: (sessao: SessaoFormulario) => void;
}

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

  // Pendências recomputadas a cada render a partir da sessão (NEG-004: nada
  // persiste). Hoje só o alerta "documento criado do zero" pode aparecer.
  const pendencias = coletarPendencias(sessao);
  const cabecalho = dadosCabecalho(sessao);

  return (
    <div data-testid="layout-formulario">
      <header data-testid="cabecalho-formulario">
        <span data-testid="cabecalho-codigo">Autos: {cabecalho.codigo}</span>
        {" · "}
        <span>Empresa: {cabecalho.empresa}</span>
        {" · "}
        <span>Tipo: {cabecalho.tipo}</span>
        {cabecalho.status && (
          <>
            {" · "}
            <span data-testid="selo-status">Status: {cabecalho.status}</span>
          </>
        )}
      </header>

      {sessao.modo === "carregado" && (
        <div data-testid="mensagem-sucesso-carregar">
          <p>
            Você está editando uma operação anterior. As entidades existentes
            manterão suas UUIDs.
          </p>
          {sessao.alertasImportacao.length > 0 && (
            <ul>
              {sessao.alertasImportacao.map((alerta, indice) => (
                <li key={indice}>{alerta.mensagem}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sessao.modo === "novo" && (
        <p data-testid="mensagem-novo-documento">
          Novo documento iniciado. Prossiga selecionando o Autos, a empresa e o
          tipo nas listas estáticas.
        </p>
      )}

      <nav aria-label="Etapas do formulário" data-testid="stepper">
        <ol>
          {ETAPAS.map((etapa) => (
            <li key={etapa.id}>
              <button
                type="button"
                data-testid="etapa-botao"
                data-etapa={etapa.id}
                aria-current={etapa.id === etapaAtual ? "step" : undefined}
                onClick={() => definirEtapa(etapa.id)}
              >
                {etapa.rotulo}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <PainelPendencias pendencias={pendencias} aoNavegar={definirEtapa} />

      <section
        data-testid="conteudo-etapa"
        data-etapa-atual={etapaAtual}
        aria-label={rotuloEtapa(etapaAtual)}
      >
        <h2>{rotuloEtapa(etapaAtual)}</h2>
        {etapaAtual === "identificacao" ? (
          <EtapaIdentificacao
            sessao={sessao}
            aoAtualizarSessao={aoAtualizarSessao}
          />
        ) : etapaAtual === "servicos" ? (
          <EtapaServicos sessao={sessao} aoAtualizarSessao={aoAtualizarSessao} />
        ) : (
          <p>
            Etapa em construção — o conteúdo será implementado nas próximas
            tasks.
          </p>
        )}
      </section>
    </div>
  );
}
