"use client";

import { useState } from "react";
import { TelaInicial } from "./tela-inicial";
import { LayoutFormulario } from "./layout";
import type { SessaoFormulario } from "./sessao";

// Container de topo do Formulário (TASK-014): decide entre a tela inicial de
// entrada (TASK-013) e a casca de edição por etapas (LayoutFormulario). É o
// ponto que integra as duas ações da Spec 04 §3 — carregar JSON existente ou
// criar do zero — à montagem do editor: enquanto não há sessão, mostra a tela
// inicial; ao entrar (carregar ou criar do zero), monta a casca.
//
// Estado só de memória (React) — nada persiste no servidor (RN-096, NEG-009).

export function AplicacaoFormulario() {
  const [sessao, definirSessao] = useState<SessaoFormulario | null>(null);

  if (sessao === null) {
    return (
      <TelaInicial
        aoCarregar={(documento, alertasImportacao) =>
          definirSessao({ modo: "carregado", documento, alertasImportacao })
        }
        aoCriarDoZero={() => definirSessao({ modo: "novo" })}
      />
    );
  }

  return <LayoutFormulario sessao={sessao} aoAtualizarSessao={definirSessao} />;
}
