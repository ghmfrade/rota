"use client";

import { useState } from "react";
import { carregarListasAutosEmpresas } from "@/shared/dados-estaticos";
import type { ListasAutosEmpresas } from "@/shared/dados-estaticos";
import { importarDocumento } from "@/formulario/importacao";
import type {
  AlertaTecnico,
  ResultadoImportacao,
} from "@/formulario/importacao";
import type { DocumentoOperacao } from "@/shared/contrato";

// Tela Inicial do Formulário (Spec 04 §3, TASK-013): as duas ações de entrada
// — carregar um JSON de operação existente ou criar um Autos do zero a partir
// das listas estáticas. "Carregar" é sempre o caminho recomendado (Spec 04
// §2.2/§3): é o único que preserva UUIDs e mantém o Comparador útil (RN-004).
//
// Esta tela SÓ decide a entrada. Ao concluir uma das ações, ELEVA o resultado
// ao container (`AplicacaoFormulario`, TASK-014) por callback — não guarda o
// estado terminal nem monta o editor: a casca em etapas (stepper, cabeçalho,
// painel de pendências) é a TASK-014; a seleção de Autos/empresa/tipo (RN-016)
// e o reforço do aviso quando o Autos já é `operante` (Spec 04 §3.2) são a
// TASK-015. Aqui o "criar do zero" só confirma o aviso obrigatório e sinaliza a
// entrada em modo de novo documento, sem inventar estrutura (RN-010).
//
// Toda a validação de carregamento (schema, 350 m/tipificação como alerta não
// bloqueante, identidade obsoleta — RN-004/016/017) vive em `importarDocumento`
// (TASK-006/012); esta tela só chama a função pura e traduz o resultado: sucesso
// vira `aoCarregar`, erro fica exibido aqui. Leitura de arquivo via File API do
// navegador — nada sobe para servidor (RN-095/096, NEG-009).

export interface PropsTelaInicial {
  /** Carregamento válido de um JSON existente — UUIDs preservadas (RN-004). */
  aoCarregar: (
    documento: DocumentoOperacao,
    alertasImportacao: AlertaTecnico[],
  ) => void;
  /** Início de um documento do zero, após o aviso obrigatório (Spec 04 §3.2). */
  aoCriarDoZero: () => void;
}

// Estados só de UI da própria tela de entrada — os terminais (carregado, novo)
// foram elevados ao container e por isso saíram daqui.
type EstadoEntrada =
  | { tipo: "nenhuma" }
  | { tipo: "confirmando_zero" }
  | {
      tipo: "erro_carregar";
      resultado: Extract<ResultadoImportacao, { ok: false }>;
    }
  | { tipo: "erro_listas"; mensagem: string };

export function TelaInicial({ aoCarregar, aoCriarDoZero }: PropsTelaInicial) {
  const [entrada, definirEntrada] = useState<EstadoEntrada>({ tipo: "nenhuma" });

  // `carregarListasAutosEmpresas` já é memoizada (import dinâmico do bundle,
  // sem rede — Spec 01 §8): aguardá-la aqui, no momento da escolha do
  // arquivo, evita depender de um estado de "carregando" separado para
  // habilitar o input (uma corrida artificial: o input nunca precisa ficar
  // desabilitado, a leitura do arquivo simplesmente espera a mesma promessa).
  async function aoEscolherArquivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;

    let listas: ListasAutosEmpresas;
    try {
      listas = await carregarListasAutosEmpresas();
    } catch (erro) {
      definirEntrada({
        tipo: "erro_listas",
        mensagem: erro instanceof Error ? erro.message : String(erro),
      });
      return;
    }

    const texto = await arquivo.text();
    const resultado = importarDocumento(texto, listas);
    if (resultado.ok) {
      aoCarregar(resultado.documento, resultado.alertas);
    } else {
      definirEntrada({ tipo: "erro_carregar", resultado });
    }
  }

  return (
    <section aria-labelledby="tela-inicial-titulo">
      <h2 id="tela-inicial-titulo">Começar</h2>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        <div data-testid="acao-carregar">
          <p>
            <strong>Carregar JSON existente</strong> — Recomendado
          </p>
          <p>
            Caminho padrão para alterar uma operação já cadastrada: preserva as
            UUIDs das entidades existentes.
          </p>
          <label>
            <input
              type="file"
              accept=".json,application/json"
              data-testid="input-arquivo-json"
              onChange={aoEscolherArquivo}
            />
          </label>
        </div>

        <div data-testid="acao-criar-zero">
          <p>
            <strong>Criar Autos do zero</strong>
          </p>
          <p>
            Para Autos que ainda não têm JSON no formato ROTA (implantação). O
            Autos em si já existe nas listas estáticas — esta ação só inicia o
            documento.
          </p>
          <button
            type="button"
            onClick={() => definirEntrada({ tipo: "confirmando_zero" })}
          >
            Criar do zero
          </button>
        </div>
      </div>

      {entrada.tipo === "erro_listas" && (
        <p role="alert" data-testid="mensagem-erro-listas">
          Não foi possível carregar as listas estáticas de Autos/empresas:{" "}
          {entrada.mensagem}
        </p>
      )}

      {entrada.tipo === "confirmando_zero" && (
        <div role="alertdialog" data-testid="aviso-criar-zero">
          <p>
            Este documento não parte de um JSON anterior. Sem ele, não haverá
            preservação de identidade das entidades para comparação entre
            versões (o Comparador tratará tudo como novo).
          </p>
          <button
            type="button"
            data-testid="confirmar-criar-zero"
            onClick={aoCriarDoZero}
          >
            Entendi, criar do zero
          </button>
          <button type="button" onClick={() => definirEntrada({ tipo: "nenhuma" })}>
            Cancelar
          </button>
        </div>
      )}

      {entrada.tipo === "erro_carregar" && (
        <p role="alert" data-testid="mensagem-erro-carregar">
          {entrada.resultado.erro.mensagem}
        </p>
      )}
    </section>
  );
}
