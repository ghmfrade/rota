"use client";

import { useEffect, useRef, useState } from "react";
import { carregarListasAutosEmpresas } from "@/shared/dados-estaticos";
import type { ListasAutosEmpresas } from "@/shared/dados-estaticos";
import { importarDocumento } from "@/formulario/importacao";
import type {
  AlertaTecnico,
  ResultadoImportacao,
} from "@/formulario/importacao";
import type { DocumentoOperacao } from "@/shared/contrato";
import {
  Botao,
  CarimboCarregar,
  CarimboCriar,
  MolduraCarimbo,
  Painel,
  Selo,
} from "@/shared/ui";

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
//
// TASK-073: os dois cartões viram superfícies de ação inteiras (`Painel
// interativo`) — o alvo de TECLADO continua sendo o controle interno (o
// `<input type="file">`, agora `sr-only` mas funcional, no cartão de carregar;
// o `Botao` no de criar), nunca o `Painel`, para não aninhar controles
// interativos nem quebrar os E2E que buscam `getByRole("button")` dentro do
// cartão. O diálogo passa a ocupar uma coluna lateral reservada (fixa em
// telas largas) para nunca empurrar os cartões ao abrir/fechar; em telas
// estreitas empilha abaixo deles.

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
  const refBotaoConfirmar = useRef<HTMLButtonElement>(null);
  const dialogoAberto = entrada.tipo === "confirmando_zero";

  // Foco gerenciado (doc 18 §5, critério de acessibilidade da task): ao abrir
  // o diálogo, o foco vai para a confirmação — o caminho mais provável.
  useEffect(() => {
    if (dialogoAberto) {
      refBotaoConfirmar.current?.focus();
    }
  }, [dialogoAberto]);

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
    <section
      aria-labelledby="tela-inicial-titulo"
      className="grid w-full max-w-4xl grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
    >
      <div className="flex flex-col items-center gap-6">
        <h2 id="tela-inicial-titulo" className="text-lg font-semibold text-cinza-900">
          Começar
        </h2>

        <div className="flex flex-wrap justify-center gap-8">
          <Painel
            data-testid="acao-carregar"
            tom="destacado"
            interativo
            className="flex w-full max-w-sm flex-col gap-3"
          >
            {/* O `<label>` envolve o cartão inteiro: clicar em qualquer ponto
                dele abre o seletor de arquivo nativamente (associação
                label→control do HTML), sem handler de clique em JS. */}
            <label className="contents cursor-pointer">
              <div className="flex items-center gap-3">
                <MolduraCarimbo tom="destaque">
                  <CarimboCarregar className="size-6" />
                </MolduraCarimbo>
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-base text-cinza-900">
                    Carregar JSON existente
                  </strong>
                  <Selo tom="azul">Recomendado</Selo>
                </div>
              </div>
              <p className="text-sm text-cinza-700">
                Caminho padrão para alterar uma operação já cadastrada: preserva
                as UUIDs das entidades existentes.
              </p>
              <input
                type="file"
                accept=".json,application/json"
                data-testid="input-arquivo-json"
                onChange={aoEscolherArquivo}
                className="sr-only"
              />
            </label>
          </Painel>

          <Painel
            data-testid="acao-criar-zero"
            interativo
            className="flex w-full max-w-sm flex-col gap-3"
            onClick={() => definirEntrada({ tipo: "confirmando_zero" })}
          >
            <div className="flex items-center gap-3">
              <MolduraCarimbo tom="repouso">
                <CarimboCriar className="size-6" />
              </MolduraCarimbo>
              <strong className="text-base text-cinza-900">Criar Autos do zero</strong>
            </div>
            <p className="text-sm text-cinza-700">
              Para Autos que ainda não têm JSON no formato ROTA (implantação). O
              Autos em si já existe nas listas estáticas — esta ação só inicia o
              documento.
            </p>
            <Botao
              variante="secundario"
              className="self-start"
              onClick={(evento) => {
                evento.stopPropagation();
                definirEntrada({ tipo: "confirmando_zero" });
              }}
            >
              Criar do zero
            </Botao>
          </Painel>
        </div>

        {entrada.tipo === "erro_listas" && (
          <p role="alert" data-testid="mensagem-erro-listas" className="text-sm text-erro">
            Não foi possível carregar as listas estáticas de Autos/empresas:{" "}
            {entrada.mensagem}
          </p>
        )}

        {entrada.tipo === "erro_carregar" && (
          <p role="alert" data-testid="mensagem-erro-carregar" className="text-sm text-erro">
            {entrada.resultado.erro.mensagem}
          </p>
        )}
      </div>

      {dialogoAberto && (
        <Painel
          role="alertdialog"
          aria-describedby="aviso-criar-zero-texto"
          data-testid="aviso-criar-zero"
          elevacao="flutuante"
          className="w-full"
          onKeyDown={(evento) => {
            if (evento.key === "Escape") {
              definirEntrada({ tipo: "nenhuma" });
            }
          }}
        >
          <p id="aviso-criar-zero-texto" className="text-sm text-cinza-700">
            Este documento será criado do zero, sem partir de um JSON anterior.
            Use este caminho apenas se a linha ainda não tem arquivo ROTA
            (primeira criação) ou se o arquivo anterior foi perdido. Sem o JSON
            anterior, não será possível comparar esta versão com a operação
            atual: o Comparador tratará tudo como novo.
          </p>
          <div className="mt-3 flex gap-2">
            <Botao
              ref={refBotaoConfirmar}
              variante="primario"
              data-testid="confirmar-criar-zero"
              onClick={aoCriarDoZero}
            >
              Entendi, criar do zero
            </Botao>
            <Botao
              variante="fantasma"
              onClick={() => definirEntrada({ tipo: "nenhuma" })}
            >
              Cancelar
            </Botao>
          </div>
        </Painel>
      )}
    </section>
  );
}
