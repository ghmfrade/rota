"use client";

import { useState } from "react";
import type { Servico, TabelaExcepcional } from "@/shared/contrato";
import { Botao, Campo, Dialogo, Painel, Select, Tabela } from "@/shared/ui";
import {
  criarTabelaExcepcional,
  editarDescricaoTabelaExcepcional,
  filtrarTabelasExcepcionais,
  removerTabelaExcepcional,
  rotuloTabelaExcepcional,
  ROTULOS_TIPO_TABELA_EXCEPCIONAL,
  type FiltroTipoTabelaExcepcional,
  type TipoTabelaExcepcional,
} from "./tabelas-excepcionais";

interface PropsPainelTabelasExcepcionais {
  servico: Servico;
  aoAtualizarServico: (servico: Servico) => void;
}

type DialogoAberto =
  | { modo: "criar" }
  | { modo: "editar"; tabela: TabelaExcepcional }
  | { modo: "remover"; tabela: TabelaExcepcional }
  | null;

export function PainelTabelasExcepcionais({
  servico,
  aoAtualizarServico,
}: PropsPainelTabelasExcepcionais) {
  const [filtroTipo, definirFiltroTipo] =
    useState<FiltroTipoTabelaExcepcional>("todos");
  const [buscaDescricao, definirBuscaDescricao] = useState("");
  const [dialogoAberto, definirDialogoAberto] = useState<DialogoAberto>(null);
  const [tipoRascunho, definirTipoRascunho] =
    useState<TipoTabelaExcepcional>("ferias_verao");
  const [descricaoRascunho, definirDescricaoRascunho] = useState("");
  const [erroTipo, definirErroTipo] = useState<string | undefined>();
  const [erroDescricao, definirErroDescricao] = useState<string | undefined>();
  const [avisoRemocao, definirAvisoRemocao] = useState<string | null>(null);

  const tabelasFiltradas = filtrarTabelasExcepcionais(
    servico.tabelas_excepcionais ?? [],
    filtroTipo,
    buscaDescricao,
  );

  function limparErros() {
    definirErroTipo(undefined);
    definirErroDescricao(undefined);
  }

  function abrirCriacao() {
    definirTipoRascunho("ferias_verao");
    definirDescricaoRascunho("");
    limparErros();
    definirDialogoAberto({ modo: "criar" });
  }

  function abrirEdicao(tabela: TabelaExcepcional) {
    definirDescricaoRascunho(tabela.descricao ?? "");
    limparErros();
    definirDialogoAberto({ modo: "editar", tabela });
  }

  function confirmarCriacao() {
    const resultado = criarTabelaExcepcional(servico, {
      tipo: tipoRascunho,
      descricao: descricaoRascunho,
    });
    if (!resultado.ok) {
      if (resultado.campo === "tipo") definirErroTipo(resultado.erro);
      if (resultado.campo === "descricao") definirErroDescricao(resultado.erro);
      return;
    }
    aoAtualizarServico(resultado.servico);
    definirDialogoAberto(null);
  }

  function confirmarEdicao(tabela: TabelaExcepcional) {
    const resultado = editarDescricaoTabelaExcepcional(
      servico,
      tabela.uuid,
      descricaoRascunho,
    );
    if (!resultado.ok) {
      definirErroDescricao(resultado.erro);
      return;
    }
    aoAtualizarServico(resultado.servico);
    definirDialogoAberto(null);
  }

  function solicitarRemocao(tabela: TabelaExcepcional) {
    const resultado = removerTabelaExcepcional(servico, tabela.uuid);
    if (!resultado.ok) {
      definirAvisoRemocao(resultado.erro ?? null);
      return;
    }
    definirAvisoRemocao(null);
    definirDialogoAberto({ modo: "remover", tabela });
  }

  function confirmarRemocao(tabela: TabelaExcepcional) {
    const resultado = removerTabelaExcepcional(servico, tabela.uuid);
    if (!resultado.ok) {
      definirDialogoAberto(null);
      definirAvisoRemocao(resultado.erro ?? null);
      return;
    }
    aoAtualizarServico(resultado.servico);
    definirDialogoAberto(null);
  }

  return (
    <Painel
      titulo="Tabelas de operação excepcional"
      colapsavel
      className="mt-4"
      data-testid="painel-tabelas-excepcionais"
    >
      <p className="text-sm text-cinza-500">
        Categorias de operação do Serviço, sem datas ou períodos de vigência.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Select
          rotulo="Filtrar por tipo"
          data-testid="filtro-tipo-tabela-excepcional"
          value={filtroTipo}
          onChange={(evento) =>
            definirFiltroTipo(evento.target.value as FiltroTipoTabelaExcepcional)
          }
        >
          <option value="todos">Todos</option>
          <option value="ferias_verao">Férias de verão</option>
          <option value="ferias_inverno">Férias de inverno</option>
          <option value="personalizado">Personalizado</option>
        </Select>
        <Campo
          rotulo="Buscar descrição"
          data-testid="busca-descricao-tabela-excepcional"
          value={buscaDescricao}
          onChange={(evento) => definirBuscaDescricao(evento.target.value)}
        />
        <Botao
          variante="primario"
          data-testid="criar-tabela-excepcional"
          onClick={abrirCriacao}
        >
          Nova tabela excepcional
        </Botao>
      </div>

      {avisoRemocao && (
        <p
          role="alert"
          data-testid="bloqueio-remocao-tabela-excepcional"
          className="mt-3 text-sm text-erro"
        >
          {avisoRemocao}
        </p>
      )}

      <Tabela className="mt-4" data-testid="lista-tabelas-excepcionais">
        <thead>
          <tr>
            <th scope="col">Tabela</th>
            <th scope="col">Tipo</th>
            <th scope="col">Ações</th>
          </tr>
        </thead>
        <tbody>
          {tabelasFiltradas.map((tabela) => (
            <tr key={tabela.uuid} data-testid="linha-tabela-excepcional">
              <td>{rotuloTabelaExcepcional(tabela)}</td>
              <td>{ROTULOS_TIPO_TABELA_EXCEPCIONAL[tabela.tipo]}</td>
              <td>
                <div className="flex flex-wrap gap-2">
                  {tabela.tipo === "personalizado" && (
                    <Botao
                      variante="secundario"
                      tamanho="compacto"
                      aria-label={`Editar ${rotuloTabelaExcepcional(tabela)}`}
                      onClick={() => abrirEdicao(tabela)}
                    >
                      Editar
                    </Botao>
                  )}
                  <Botao
                    variante="fantasma"
                    tamanho="compacto"
                    aria-label={`Remover ${rotuloTabelaExcepcional(tabela)}`}
                    onClick={() => solicitarRemocao(tabela)}
                  >
                    Remover
                  </Botao>
                </div>
              </td>
            </tr>
          ))}
          {tabelasFiltradas.length === 0 && (
            <tr>
              <td colSpan={3} className="text-cinza-500">
                Nenhuma Tabela excepcional encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </Tabela>

      {dialogoAberto?.modo === "criar" && (
        <Dialogo
          titulo="Nova Tabela excepcional"
          data-testid="dialogo-tabela-excepcional"
          aoFechar={() => definirDialogoAberto(null)}
        >
          <div className="grid gap-3">
            <Select
              rotulo="Tipo"
              data-testid="tipo-tabela-excepcional"
              value={tipoRascunho}
              erro={erroTipo}
              onChange={(evento) => {
                definirTipoRascunho(evento.target.value as TipoTabelaExcepcional);
                definirErroTipo(undefined);
                definirErroDescricao(undefined);
              }}
            >
              <option value="ferias_verao">Férias de verão</option>
              <option value="ferias_inverno">Férias de inverno</option>
              <option value="personalizado">Personalizado</option>
            </Select>
            {tipoRascunho === "personalizado" && (
              <Campo
                rotulo="Nome"
                data-testid="descricao-tabela-excepcional"
                value={descricaoRascunho}
                erro={erroDescricao}
                onChange={(evento) => {
                  definirDescricaoRascunho(evento.target.value);
                  definirErroDescricao(undefined);
                }}
              />
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Botao variante="secundario" onClick={() => definirDialogoAberto(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              data-testid="confirmar-tabela-excepcional"
              onClick={confirmarCriacao}
            >
              Criar
            </Botao>
          </div>
        </Dialogo>
      )}

      {dialogoAberto?.modo === "editar" && (
        <Dialogo
          titulo="Editar Tabela excepcional"
          data-testid="dialogo-editar-tabela-excepcional"
          aoFechar={() => definirDialogoAberto(null)}
        >
          <Campo
            rotulo="Nome"
            data-testid="editar-descricao-tabela-excepcional"
            value={descricaoRascunho}
            erro={erroDescricao}
            onChange={(evento) => {
              definirDescricaoRascunho(evento.target.value);
              definirErroDescricao(undefined);
            }}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Botao variante="secundario" onClick={() => definirDialogoAberto(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              data-testid="confirmar-edicao-tabela-excepcional"
              onClick={() => confirmarEdicao(dialogoAberto.tabela)}
            >
              Salvar
            </Botao>
          </div>
        </Dialogo>
      )}

      {dialogoAberto?.modo === "remover" && (
        <Dialogo
          titulo="Remover Tabela excepcional"
          data-testid="dialogo-remover-tabela-excepcional"
          aoFechar={() => definirDialogoAberto(null)}
        >
          <p className="text-sm text-cinza-700">
            Remover a tabela “{rotuloTabelaExcepcional(dialogoAberto.tabela)}”?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Botao variante="secundario" onClick={() => definirDialogoAberto(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              data-testid="confirmar-remocao-tabela-excepcional"
              onClick={() => confirmarRemocao(dialogoAberto.tabela)}
            >
              Remover
            </Botao>
          </div>
        </Dialogo>
      )}
    </Painel>
  );
}
