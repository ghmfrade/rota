"use client";

import { useState } from "react";
import { Botao, Campo, Painel } from "@/shared/ui";
import { itinerariosAoVivoDaSessao } from "@/formulario/itinerarios";
import type { SessaoFormulario } from "@/formulario/sessao";
import { avaliarGateExportacao } from "./gate-exportacao";
import { montarDocumentoParaExportacao } from "./montar-documento";
import {
  exportarComoProposta,
  exportarComoVigente,
  type ErroExportacao,
} from "./exportar-documento";

// Etapa Exportação (TASK-032; Spec 04 §12): as duas ações da §12.1/§12.2
// ("Exportar proposta"/"Definir como vigente"), sob o gate de RN-078 — Spec
// 04 §14: "Tentativa de exportar com erro bloqueante → Botões de exportação
// desabilitados + painel de pendências em foco". Os efeitos impuros (data
// corrente, download real via Blob/anchor) ficam só aqui — a camada pura de
// export (`exportar-documento.ts`) e a montagem (`montar-documento.ts`)
// continuam sem I/O. `obterDataDeHoje`/`aoBaixarArquivo` são injetáveis
// (mesmo padrão da injeção de `hoje` na função pura de export) para o
// componente ser testável sem relógio real nem `URL.createObjectURL` do jsdom.

const MENSAGEM_GATE =
  "Existem pendências bloqueantes. Resolva os itens listados para gerar o JSON/PDF.";

function dataDeHojeIso(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Dispara o download real do JSON exportado (Blob + `<a download>`). */
function baixarArquivo(nomeArquivo: string, conteudo: string): void {
  const blob = new Blob([conteudo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

interface PropsTelaExportacao {
  sessao: SessaoFormulario;
  /** Navega/foca o painel de pendências ao tentar exportar bloqueado (§14). */
  aoFocarPendencias?: () => void;
  /** Injetável para teste (evita `URL.createObjectURL` do jsdom). */
  aoBaixarArquivo?: (nomeArquivo: string, conteudo: string) => void;
  /** Injetável para teste (evita relógio real). */
  obterDataDeHoje?: () => string;
}

export function TelaExportacao({
  sessao,
  aoFocarPendencias,
  aoBaixarArquivo = baixarArquivo,
  obterDataDeHoje = dataDeHojeIso,
}: PropsTelaExportacao) {
  const [dataPublicacao, definirDataPublicacao] = useState("");
  const [erros, definirErros] = useState<ErroExportacao[]>([]);

  const itinerariosAoVivo = itinerariosAoVivoDaSessao(sessao);
  const gate = avaliarGateExportacao(sessao, itinerariosAoVivo);

  function tratarResultado(
    resultado: ReturnType<typeof exportarComoProposta> | ReturnType<typeof exportarComoVigente>,
  ) {
    if (!resultado.ok) {
      definirErros(resultado.erros);
      aoFocarPendencias?.();
      return;
    }
    definirErros([]);
    aoBaixarArquivo(resultado.nomeSugerido, resultado.json);
  }

  function exportarProposta() {
    const documento = montarDocumentoParaExportacao(sessao);
    if (!documento) {
      aoFocarPendencias?.();
      return;
    }
    tratarResultado(exportarComoProposta(documento, obterDataDeHoje()));
  }

  function definirVigente() {
    const documento = montarDocumentoParaExportacao(sessao);
    if (!documento) {
      aoFocarPendencias?.();
      return;
    }
    tratarResultado(exportarComoVigente(documento, dataPublicacao));
  }

  return (
    <div data-testid="tela-exportacao">
      {!gate.liberado && (
        <Painel tom="informativo" data-testid="exportacao-mensagem-gate">
          <p>{MENSAGEM_GATE}</p>
        </Painel>
      )}

      {erros.length > 0 && (
        <Painel tom="informativo" data-testid="exportacao-erros" className="mt-4">
          <ul className="list-disc space-y-1 pl-5">
            {erros.map((erro, indice) => (
              <li key={indice}>{erro.mensagem}</li>
            ))}
          </ul>
        </Painel>
      )}

      <section className="mt-6">
        <h3 className="text-lg font-semibold text-cinza-900">Exportar proposta</h3>
        <p className="mt-1 text-sm text-cinza-700">
          Gera o JSON com status &quot;proposta&quot; e a data de criação de hoje.
        </p>
        <Botao
          variante="primario"
          className="mt-2"
          data-testid="botao-exportar-proposta"
          disabled={!gate.liberado}
          onClick={exportarProposta}
        >
          Exportar proposta
        </Botao>
      </section>

      <section className="mt-6">
        <h3 className="text-lg font-semibold text-cinza-900">Definir como vigente</h3>
        <p className="mt-1 text-sm text-cinza-700">
          Ação técnica — não é aprovação no ROTA. O fluxo administrativo
          (análise, pendências e aprovação) permanece no SEI.
        </p>
        <Campo
          rotulo="Data de publicação"
          type="date"
          className="mt-2"
          data-testid="campo-data-publicacao"
          value={dataPublicacao}
          onChange={(evento) => definirDataPublicacao(evento.target.value)}
        />
        <Botao
          variante="primario"
          className="mt-2"
          data-testid="botao-definir-vigente"
          disabled={!gate.liberado}
          onClick={definirVigente}
        >
          Definir como vigente
        </Botao>
      </section>
    </div>
  );
}
