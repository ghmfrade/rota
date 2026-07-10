"use client";

import { useEffect, useState } from "react";
import { TIPOS_DE_AUTOS } from "@/shared/contrato";
import {
  carregarListasAutosEmpresas,
  nomeDaEmpresa,
  type ListasAutosEmpresas,
} from "@/shared/dados-estaticos";
import type { TipoDeAutos } from "@/shared/tipificacao";
import {
  identidadeDaSessao,
  type IdentidadeAutos,
  type SessaoFormulario,
} from "@/formulario/sessao";
import {
  aplicarTrocaDeTipoNoDocumento,
  aplicarTrocaDeTipoEmConstrucao,
  type AlteracaoDeServico,
} from "./reconversao";
import { servicosEmConstrucaoDaSessao } from "@/formulario/sessao";

// Etapa Identificação do Formulário (Spec 04 §5; TASK-015). Exibe/edita a
// identidade do Autos:
// - `codigo` e `empresa` vêm das listas estáticas (RN-016) e são NÃO EDITÁVEIS
//   depois de criado o documento — no modo carregado já vêm do JSON; no modo
//   novo, a seleção do Autos das listas é o ato de "criar" o documento, e a
//   partir daí ficam travados.
// - `tipo` é EDITÁVEL a qualquer momento (Spec 04 §5): ao trocá-lo, os Serviços
//   com característica incompatível são reconvertidos à forma convencional do
//   novo tipo, com AVISO listando o que mudou e SEM jamais bloquear
//   (RN-023/DEC-034). No modo novo (sem Serviços nesta task) a troca só ajusta
//   o `tipo`.
// - `status` é apenas um selo (Spec 04 §5); muda só pela exportação (§12,
//   TASK-007), nunca aqui.
//
// A identidade é estado de sessão efêmero elevado ao container (não persiste —
// NEG-004/RN-096): toda mudança chama `aoAtualizarSessao`.

interface PropsEtapaIdentificacao {
  sessao: SessaoFormulario;
  aoAtualizarSessao: (sessao: SessaoFormulario) => void;
}

export function EtapaIdentificacao({
  sessao,
  aoAtualizarSessao,
}: PropsEtapaIdentificacao) {
  const [listas, definirListas] = useState<ListasAutosEmpresas | null>(null);
  const [erroListas, definirErroListas] = useState<string | null>(null);
  // Aviso da última troca de tipo que reconverteu Serviços (Spec 04 §5). Zerado
  // quando a troca não altera nenhum Serviço.
  const [reconversao, definirReconversao] = useState<AlteracaoDeServico[]>([]);

  // As listas só são necessárias para o seletor de Autos do modo novo; ainda
  // assim, carregá-las aqui é barato (import dinâmico memoizado, sem rede —
  // Spec 01 §8) e mantém o componente simples.
  useEffect(() => {
    let ativo = true;
    carregarListasAutosEmpresas()
      .then((carregadas) => {
        if (ativo) definirListas(carregadas);
      })
      .catch((erro: unknown) => {
        if (ativo) {
          definirErroListas(erro instanceof Error ? erro.message : String(erro));
        }
      });
    return () => {
      ativo = false;
    };
  }, []);

  const identidade = identidadeDaSessao(sessao);

  function aoSelecionarAutos(codigo: string) {
    if (!listas) return;
    const autos = listas.autos.find((a) => a.codigo === codigo);
    if (!autos) return;
    const empresa = nomeDaEmpresa(listas, autos.empresa_id) ?? autos.empresa_id;
    const identidadeNova: IdentidadeAutos = {
      codigo: autos.codigo,
      empresa,
      tipo: autos.tipo,
      status: "proposta",
    };
    definirReconversao([]);
    aoAtualizarSessao({ modo: "novo", identidade: identidadeNova });
  }

  function aoTrocarTipo(novoTipo: TipoDeAutos) {
    if (sessao.modo === "carregado") {
      const { documento, alteracoes } = aplicarTrocaDeTipoNoDocumento(
        sessao.documento,
        novoTipo,
      );
      definirReconversao(alteracoes);
      aoAtualizarSessao({
        modo: "carregado",
        documento,
        alertasImportacao: sessao.alertasImportacao,
      });
      return;
    }
    // Modo novo: reconverte os Serviços em construção incompatíveis com o novo
    // tipo (RN-023/DEC-034), regenerando o sufixo do `numero_n` (DEC-037), e
    // ajusta o tipo — com o mesmo aviso do modo carregado.
    if (!sessao.identidade) return;
    const { servicos, alteracoes } = aplicarTrocaDeTipoEmConstrucao(
      servicosEmConstrucaoDaSessao(sessao),
      novoTipo,
    );
    definirReconversao(alteracoes);
    aoAtualizarSessao({
      ...sessao,
      identidade: { ...sessao.identidade, tipo: novoTipo },
      servicosEmConstrucao: servicos,
    });
  }

  return (
    <div data-testid="etapa-identificacao">
      {identidade === undefined ? (
        <SeletorDeAutos
          listas={listas}
          erroListas={erroListas}
          aoSelecionar={aoSelecionarAutos}
        />
      ) : (
        <IdentidadeEditavel
          sessao={sessao}
          identidade={identidade}
          reconversao={reconversao}
          aoTrocarTipo={aoTrocarTipo}
        />
      )}
    </div>
  );
}

// Seleção do Autos das listas estáticas (RN-016; Spec 04 §3.2/§5), exibida no
// modo novo antes de a identidade ser escolhida. Escolher um Autos fixa
// `codigo`+`empresa`+`tipo` de uma vez (é um registro único das listas).
function SeletorDeAutos({
  listas,
  erroListas,
  aoSelecionar,
}: {
  listas: ListasAutosEmpresas | null;
  erroListas: string | null;
  aoSelecionar: (codigo: string) => void;
}) {
  if (erroListas) {
    return (
      <p role="alert" data-testid="erro-listas-identificacao">
        Não foi possível carregar as listas estáticas de Autos/empresas:{" "}
        {erroListas}
      </p>
    );
  }
  if (!listas) {
    return <p data-testid="carregando-listas">Carregando listas de Autos…</p>;
  }
  return (
    <div>
      <p>
        Selecione o Autos nas listas estáticas. Ele já existe e cadastra o
        código, a empresa e o tipo — este documento apenas passa a operá-lo.
      </p>
      <label>
        Autos
        <select
          data-testid="seletor-autos"
          defaultValue=""
          onChange={(evento) => {
            if (evento.target.value) aoSelecionar(evento.target.value);
          }}
        >
          <option value="" disabled>
            — selecione —
          </option>
          {listas.autos.map((autos) => (
            <option key={autos.codigo} value={autos.codigo}>
              {autos.codigo} — {autos.denominacao_linha}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

// Identidade já definida (modo carregado, ou modo novo após a seleção): código
// e empresa somente-leitura; tipo editável; selo de status; data somente-leitura
// quando presente.
function IdentidadeEditavel({
  sessao,
  identidade,
  reconversao,
  aoTrocarTipo,
}: {
  sessao: SessaoFormulario;
  identidade: IdentidadeAutos;
  reconversao: AlteracaoDeServico[];
  aoTrocarTipo: (novoTipo: TipoDeAutos) => void;
}) {
  // Data é somente-leitura (Spec 04 §5): `data_criacao` (proposta) ou
  // `data_publicacao` (vigente). A atribuição concreta de `data_criacao` é da
  // exportação (TASK-007); aqui só se exibe o que já existe no documento.
  const data =
    sessao.modo === "carregado"
      ? (sessao.documento.autos.data_publicacao ??
        sessao.documento.autos.data_criacao)
      : undefined;

  return (
    <dl>
      <dt>Código do Autos</dt>
      <dd>
        {/* Não editável após criado o documento (Spec 04 §5) — texto, sem input. */}
        <span data-testid="campo-codigo">{identidade.codigo}</span>
      </dd>

      <dt>Empresa</dt>
      <dd>
        <span data-testid="campo-empresa">{identidade.empresa}</span>
      </dd>

      <dt>Tipo</dt>
      <dd>
        <label>
          <span className="sr-only">Tipo do Autos</span>
          <select
            data-testid="select-tipo"
            value={identidade.tipo}
            onChange={(evento) =>
              aoTrocarTipo(evento.target.value as TipoDeAutos)
            }
          >
            {TIPOS_DE_AUTOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </label>
      </dd>

      <dt>Status</dt>
      <dd>
        {/* Só exibição — muda pela exportação (§12), nunca aqui. */}
        <span data-testid="selo-status-identificacao">{identidade.status}</span>
      </dd>

      {data && (
        <>
          <dt>Data</dt>
          <dd>
            <span data-testid="campo-data">{data}</span>
          </dd>
        </>
      )}

      {reconversao.length > 0 && (
        <div role="status" data-testid="aviso-reconversao">
          <p>
            O tipo foi alterado. Os Serviços abaixo tinham característica
            incompatível com o novo tipo e foram reconvertidos para a forma
            convencional (padrão):
          </p>
          <ul>
            {reconversao.map((alteracao) => (
              <li key={alteracao.numero_n} data-testid="item-reconversao">
                {alteracao.numero_n}: {alteracao.de} → {alteracao.para}
              </li>
            ))}
          </ul>
        </div>
      )}
    </dl>
  );
}
