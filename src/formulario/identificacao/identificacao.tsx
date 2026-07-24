"use client";

import { useEffect, useState } from "react";
import { TIPOS_DE_AUTOS } from "@/shared/contrato";
import {
  carregarListasAutosEmpresas,
  type ListasAutosEmpresas,
} from "@/shared/dados-estaticos";
import type { TipoDeAutos } from "@/shared/tipificacao";
import {
  identidadeDaSessao,
  type IdentidadeAutos,
  type SessaoFormulario,
} from "@/formulario/sessao";
import { Botao, Painel, Select, Selo } from "@/shared/ui";
import {
  aplicarTrocaDeTipoNoDocumento,
  aplicarTrocaDeTipoEmConstrucao,
  type AlteracaoDeServico,
} from "./reconversao";
import { servicosEmConstrucaoDaSessao } from "@/formulario/sessao";
import {
  identidadeDeAutosEstatico,
  preVisualizacaoDeAutos,
  type PreVisualizacaoAutos,
} from "./pre-visualizacao";

// Etapa Identificação do Formulário (Spec 04 §5; TASK-015; TASK-075/DEC-064).
// Exibe/edita a identidade do Autos:
// - `codigo` e `empresa` vêm das listas estáticas (RN-016) e são NÃO EDITÁVEIS
//   depois de criado o documento — no modo carregado já vêm do JSON; no modo
//   novo, escolher o Autos no dropdown só popula uma PRÉ-VISUALIZAÇÃO
//   (candidato trocável livremente); o ato de "criar" o documento é o clique
//   em "Confirmar Autos" (DEC-064) — só aí a identidade é comitada e passa a
//   ficar travada.
// - `tipo` é EDITÁVEL a qualquer momento (Spec 04 §5): ao trocá-lo, os Serviços
//   com característica incompatível são reconvertidos à forma convencional do
//   novo tipo, com AVISO listando o que mudou e SEM jamais bloquear
//   (RN-023/DEC-034). No modo novo (sem Serviços nesta task) a troca só ajusta
//   o `tipo`.
// - `status` é apenas um selo (Spec 04 §5); muda só pela exportação (§12,
//   TASK-007), nunca aqui.
//
// A identidade é estado de sessão efêmero elevado ao container (não persiste —
// NEG-004/RN-096): toda mudança chama `aoAtualizarSessao`. O candidato da
// pré-visualização é estado LOCAL do componente (nem sessão, nem contrato) —
// descartado se o usuário trocar a seleção ou sair sem confirmar.

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
  // Autos candidato do seletor (modo novo, antes da confirmação — DEC-064):
  // estado LOCAL, não comitado na sessão. Trocar a seleção livremente só
  // atualiza este candidato, sem efeito colateral.
  const [codigoCandidato, definirCodigoCandidato] = useState<string | null>(
    null,
  );

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

  // Escolher no dropdown só atualiza o candidato local (DEC-064) — NÃO comita
  // a sessão. Trocar a seleção antes de confirmar é livre, sem efeito
  // colateral.
  function aoEscolherCandidato(codigo: string) {
    definirCodigoCandidato(codigo);
  }

  // "Confirmar Autos" é o ato que cria o documento (Spec 04 §5; DEC-064):
  // comita a identidade na sessão, congelando `codigo`/`empresa` a partir
  // daqui.
  function aoConfirmarAutos() {
    if (!listas || !codigoCandidato) return;
    const identidadeNova = identidadeDeAutosEstatico(listas, codigoCandidato);
    if (!identidadeNova) return;
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

  const previa =
    listas && codigoCandidato
      ? preVisualizacaoDeAutos(listas, codigoCandidato)
      : undefined;

  return (
    <div data-testid="etapa-identificacao">
      {identidade === undefined ? (
        <>
          <SeletorDeAutos
            listas={listas}
            erroListas={erroListas}
            codigoCandidato={codigoCandidato}
            aoSelecionar={aoEscolherCandidato}
          />
          {listas && (
            <>
              {previa && <PreVisualizacaoDoCandidato previa={previa} />}
              <Botao
                variante="primario"
                className="mt-4"
                data-testid="confirmar-autos"
                disabled={!previa}
                onClick={aoConfirmarAutos}
              >
                Confirmar Autos
              </Botao>
            </>
          )}
        </>
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
// modo novo antes da confirmação. Escolher um Autos só popula o candidato da
// pré-visualização (DEC-064) — não fixa nada ainda; a troca é livre.
function SeletorDeAutos({
  listas,
  erroListas,
  codigoCandidato,
  aoSelecionar,
}: {
  listas: ListasAutosEmpresas | null;
  erroListas: string | null;
  codigoCandidato: string | null;
  aoSelecionar: (codigo: string) => void;
}) {
  if (erroListas) {
    return (
      <Painel>
        <p role="alert" data-testid="erro-listas-identificacao" className="text-sm text-erro">
          Não foi possível carregar as listas estáticas de Autos/empresas:{" "}
          {erroListas}
        </p>
      </Painel>
    );
  }
  if (!listas) {
    return (
      <Painel>
        <p data-testid="carregando-listas" className="text-sm text-cinza-500">
          Carregando listas de Autos…
        </p>
      </Painel>
    );
  }
  return (
    <Painel>
      <p className="mb-3 text-sm text-cinza-700">
        Selecione o Autos nas listas estáticas. Ele já existe e cadastra o
        código, a empresa e o tipo — este documento apenas passa a operá-lo.
      </p>
      <Select
        rotulo="Autos"
        data-testid="seletor-autos"
        value={codigoCandidato ?? ""}
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
      </Select>
    </Painel>
  );
}

// Pré-visualização do Autos candidato (TASK-075; DEC-064): exibe os dados do
// registro escolhido sem criar o documento. `operante: true` reforça a
// recomendação de carregar o JSON vigente (Spec 04 §3.1/§3.2) em vez de criar
// do zero. "Confirmar Autos" (renderizado pelo pai) é o único gesto que
// comita a identidade.
function PreVisualizacaoDoCandidato({
  previa,
}: {
  previa: PreVisualizacaoAutos;
}) {
  return (
    <Painel className="mt-4" data-testid="previa-autos">
      <dl className="grid gap-4">
        <div>
          <dt className="text-xs text-cinza-500">Código do Autos</dt>
          <dd className="text-sm text-cinza-700">{previa.codigo}</dd>
        </div>
        <div>
          <dt className="text-xs text-cinza-500">Linha</dt>
          <dd className="text-sm text-cinza-700">{previa.denominacaoLinha}</dd>
        </div>
        <div>
          <dt className="text-xs text-cinza-500">Empresa</dt>
          <dd className="text-sm text-cinza-700">{previa.empresa}</dd>
        </div>
        <div>
          <dt className="text-xs text-cinza-500">Tipo</dt>
          <dd className="text-sm text-cinza-700">{previa.tipo}</dd>
        </div>
        <div>
          <dt className="text-xs text-cinza-500">Situação</dt>
          <dd>
            <Selo
              tom={previa.operante ? "sucesso" : "neutro"}
              data-testid="selo-situacao-previa"
            >
              {previa.operante ? "operante" : "não operante"}
            </Selo>
          </dd>
        </div>
      </dl>

      {previa.operante && (
        <Painel
          tom="informativo"
          elevacao="plana"
          role="status"
          data-testid="reforco-operante"
          className="mt-4"
        >
          <p className="text-sm">
            Este Autos já opera. Considere carregar o JSON vigente em vez de
            criar um documento do zero — sem o arquivo anterior, o Comparador
            tratará tudo como novo.
          </p>
        </Painel>
      )}
    </Painel>
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
    <Painel>
      <dl className="grid gap-4">
        <div>
          <dt className="text-xs text-cinza-500">Código do Autos</dt>
          <dd className="text-sm text-cinza-700">
            {/* Não editável após criado o documento (Spec 04 §5) — texto, sem input. */}
            <span data-testid="campo-codigo">{identidade.codigo}</span>
          </dd>
        </div>

        <div>
          <dt className="text-xs text-cinza-500">Empresa</dt>
          <dd className="text-sm text-cinza-700">
            <span data-testid="campo-empresa">{identidade.empresa}</span>
          </dd>
        </div>

        <div>
          <dt className="sr-only">Tipo</dt>
          <dd>
            <Select
              rotulo="Tipo do Autos"
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
            </Select>
          </dd>
        </div>

        <div>
          <dt className="text-xs text-cinza-500">Status</dt>
          <dd>
            {/* Só exibição — muda pela exportação (§12), nunca aqui. */}
            <Selo tom="azul" data-testid="selo-status-identificacao">
              {identidade.status}
            </Selo>
          </dd>
        </div>

        {data && (
          <div>
            <dt className="text-xs text-cinza-500">Data</dt>
            <dd className="text-sm text-cinza-700">
              <span data-testid="campo-data">{data}</span>
            </dd>
          </div>
        )}
      </dl>

      {reconversao.length > 0 && (
        <Painel
          tom="informativo"
          elevacao="plana"
          role="status"
          data-testid="aviso-reconversao"
          className="mt-4"
        >
          <p className="text-sm">
            O tipo foi alterado. Os Serviços abaixo tinham característica
            incompatível com o novo tipo e foram reconvertidos para a forma
            convencional (padrão):
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {reconversao.map((alteracao) => (
              <li key={alteracao.numero_n} data-testid="item-reconversao">
                {alteracao.numero_n}: {alteracao.de} → {alteracao.para}
              </li>
            ))}
          </ul>
        </Painel>
      )}
    </Painel>
  );
}
