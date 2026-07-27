"use client";

import { useState } from "react";
import {
  CARATERES,
  editarEntidade,
  type DocumentoOperacao,
  type Servico,
} from "@/shared/contrato";
import {
  caracteristicaPadrao,
  caracteristicasPermitidas,
  type CaracteristicaDeVeiculo,
} from "@/shared/tipificacao";
import {
  comServicosDaSessao,
  identidadeDaSessao,
  secoesDaSessao,
  servicosDaSessao,
  servicosEmConstrucaoDaSessao,
  type Direcionalidade,
  type ServicoEmConstrucao,
  type SessaoFormulario,
} from "@/formulario/sessao";
import { Botao, Campo, Painel, Select, Selo, Tabela } from "@/shared/ui";
import { contarServico, ROTULO_SEMANA_PADRAO } from "@/shared/contagens";
import {
  duplicarServico,
  reconciliarSecoesDaDuplicacao,
} from "./duplicar";
import { podeRemoverServico, removerServico, removerServicoDeLista } from "./remover";
import { regenerarSufixoNumeroN, sugerirNumeroN } from "./numero-n";

// Etapa Serviços do Formulário (Spec 04 §6; TASK-016). Criar/editar/remover/
// duplicar Serviço em memória (nunca há banco — RN-096/NEG-009: é estado de
// sessão efêmero; exportar o JSON é o salvar). Regras:
// - Criar: `numero_n` sugerido sequencialmente (Spec 03 §10.3 regra 5), dropdown
//   de `caracteristica_veiculo` FILTRADO pela tipificação do tipo (Spec 03 §10.2;
//   RN-019/020/021/022), `carater` (RN-024) e direcionalidade (DEC-036).
// - Editar: mesmos campos; ao mudar a característica, o sufixo do `numero_n` é
//   regenerado (DEC-037).
// - Duplicar: entidade nova com UUIDs novas (RN-007), `secao_uuid` mantida.
// - Remover: confirmação explícita; Seção órfã é removida em cascata (RN-018).
//
// Serviço recém-criado ainda não tem itinerários/matrizes (etapas seguintes),
// então vive como `ServicoEmConstrucao` na sessão (DEC-035); no modo carregado
// convive com os `Servico` completos do documento. Direcionalidade só é editável
// em Serviço em construção — trocá-la num Serviço completo é operação estrutural
// de itinerário (etapa de mapa, TASK-017+), fora do escopo desta etapa.

type Carater = Servico["carater"];

interface PropsEtapaServicos {
  sessao: SessaoFormulario;
  aoAtualizarSessao: (sessao: SessaoFormulario) => void;
}

// Linha da lista, unificando Serviço completo (documento) e em construção
// (sessão). `completo` decide quais ações/edições são possíveis.
interface LinhaServico {
  uuid: string;
  numero_n: string;
  caracteristica_veiculo: CaracteristicaDeVeiculo;
  carater: Carater;
  direcionalidade: Direcionalidade;
  completo: boolean;
  viagens: ViagensSemanaisServico;
}

// Contadores de viagens semanais por Serviço (Spec 04 §6, último marcador;
// TASK-057) — leitura derivada de `shared/contagens` (RN-072), nunca
// recalculada aqui. Serviço em construção (DEC-035) não tem `Servico` do
// documento para contar: sempre 0 (mesmo resultado de `viagensSemana(undefined)`
// em `contagens.ts`, sem regra nova).
interface ViagensSemanaisServico {
  ida: number;
  volta: number;
  total: number;
}

// Direcionalidade derivada de um Serviço completo (Spec 02 §10): pelos sentidos
// dos itinerários presentes. Não há campo de direcionalidade no contrato (DEC-036).
function direcionalidadeDeServico(servico: Servico): Direcionalidade {
  const sentidos = new Set(servico.itinerarios.map((i) => i.sentido));
  if (sentidos.has("ida") && sentidos.has("volta")) return "ambos";
  return sentidos.has("volta") ? "volta" : "ida";
}

const ROTULO_DIRECIONALIDADE: Record<Direcionalidade, string> = {
  ida: "Ida",
  volta: "Volta",
  ambos: "Ida e Volta",
};

const DIRECIONALIDADES: readonly Direcionalidade[] = ["ida", "volta", "ambos"];

// Estado do formulário de criação/edição.
interface EstadoForm {
  // "novo" = criando; senão editando o Serviço de `uuid` (completo ou não).
  alvo: "novo" | { uuid: string; completo: boolean };
  numero_n: string;
  caracteristica_veiculo: CaracteristicaDeVeiculo;
  carater: Carater;
  direcionalidade: Direcionalidade;
}

export function EtapaServicos({
  sessao,
  aoAtualizarSessao,
}: PropsEtapaServicos) {
  const [form, definirForm] = useState<EstadoForm | null>(null);
  const [confirmandoRemocao, definirConfirmandoRemocao] = useState<
    string | null
  >(null);

  const identidade = identidadeDaSessao(sessao);
  const emConstrucao = servicosEmConstrucaoDaSessao(sessao);

  // Sem identidade (modo novo antes de escolher o Autos) não há tipo para
  // filtrar a tipificação — a etapa Identificação vem primeiro (Spec 04 §5).
  if (!identidade) {
    return (
      <Painel tom="informativo">
        <p data-testid="servicos-sem-identidade">
          Selecione primeiro o Autos na etapa Identificação para cadastrar os
          Serviços.
        </p>
      </Painel>
    );
  }

  const { tipo, codigo } = identidade;
  const permitidas = caracteristicasPermitidas(tipo);

  // Serviços COMPLETOS da sessão nos dois modos (DEC-053/TASK-061): no
  // carregado, `documento.autos.servicos`; no novo, os já PROMOVIDOS
  // (`sessao.servicos`, TASK-061) — antes desta task, sempre `[]` no modo novo,
  // o que fazia o promovido sumir da lista (TASK-072).
  const completos: LinhaServico[] = servicosDaSessao(sessao).map((s) => {
    const c = contarServico(s);
    return {
      uuid: s.uuid,
      numero_n: s.numero_n,
      caracteristica_veiculo: s.caracteristica_veiculo,
      carater: s.carater,
      direcionalidade: direcionalidadeDeServico(s),
      completo: true,
      viagens: {
        ida: c.ida.viagensSemana,
        volta: c.volta.viagensSemana,
        total: c.totalViagensSemana,
      },
    };
  });

  const linhasEmConstrucao: LinhaServico[] = emConstrucao.map((s) => ({
    ...s,
    completo: false,
    viagens: { ida: 0, volta: 0, total: 0 },
  }));

  const linhas = [...completos, ...linhasEmConstrucao];
  const todosNumeros = linhas.map((l) => l.numero_n);

  // --- Persistência (sempre em memória — RN-096) ---

  function atualizarDocumento(documento: DocumentoOperacao) {
    if (sessao.modo !== "carregado") return;
    aoAtualizarSessao({ ...sessao, documento });
  }

  function atualizarEmConstrucao(lista: ServicoEmConstrucao[]) {
    aoAtualizarSessao({ ...sessao, servicosEmConstrucao: lista });
  }

  // --- Abertura do formulário ---

  function abrirCriar() {
    const caracteristica = caracteristicaPadrao(tipo);
    definirForm({
      alvo: "novo",
      numero_n: sugerirNumeroN(codigo, todosNumeros, caracteristica),
      caracteristica_veiculo: caracteristica,
      carater: "principal",
      direcionalidade: "ambos",
    });
  }

  function abrirEditar(linha: LinhaServico) {
    definirForm({
      alvo: { uuid: linha.uuid, completo: linha.completo },
      numero_n: linha.numero_n,
      caracteristica_veiculo: linha.caracteristica_veiculo,
      carater: linha.carater,
      direcionalidade: linha.direcionalidade,
    });
  }

  // Ao trocar a característica no formulário, regenera o sufixo do `numero_n`
  // (DEC-037), preservando o sequencial — o rótulo permanece editável.
  function trocarCaracteristicaNoForm(caracteristica: CaracteristicaDeVeiculo) {
    definirForm((atual) =>
      atual
        ? {
            ...atual,
            caracteristica_veiculo: caracteristica,
            numero_n: regenerarSufixoNumeroN(atual.numero_n, caracteristica),
          }
        : atual,
    );
  }

  // --- Salvar ---

  function salvar() {
    if (!form) return;

    if (form.alvo === "novo") {
      const novo: ServicoEmConstrucao = {
        uuid: crypto.randomUUID(),
        numero_n: form.numero_n,
        caracteristica_veiculo: form.caracteristica_veiculo,
        carater: form.carater,
        direcionalidade: form.direcionalidade,
      };
      atualizarEmConstrucao([...emConstrucao, novo]);
      definirForm(null);
      return;
    }

    if (form.alvo.completo) {
      // Serviço completo (carregado ou promovido no modo novo — DEC-053/
      // TASK-072): edita só característica/caráter/`numero_n` (RN-001/002
      // preservam a uuid). Direcionalidade é derivada dos itinerários — não se
      // altera aqui.
      const alvoUuid = form.alvo.uuid;
      const servicos = servicosDaSessao(sessao).map((s) =>
        s.uuid === alvoUuid
          ? editarEntidade(s, {
              caracteristica_veiculo: form.caracteristica_veiculo,
              carater: form.carater,
              numero_n: form.numero_n,
            })
          : s,
      );
      aoAtualizarSessao(comServicosDaSessao(sessao, servicos));
      definirForm(null);
      return;
    }

    // Serviço em construção: atualiza o subconjunto de sessão.
    const alvoUuid = form.alvo.uuid;
    const lista = emConstrucao.map((s) =>
      s.uuid === alvoUuid
        ? {
            ...s,
            numero_n: form.numero_n,
            caracteristica_veiculo: form.caracteristica_veiculo,
            carater: form.carater,
            direcionalidade: form.direcionalidade,
          }
        : s,
    );
    atualizarEmConstrucao(lista);
    definirForm(null);
  }

  // --- Duplicar (RN-007) ---

  function duplicar(linha: LinhaServico) {
    if (linha.completo) {
      const servicosAtuais = servicosDaSessao(sessao);
      const original = servicosAtuais.find((s) => s.uuid === linha.uuid);
      if (!original) return;
      const copia = editarEntidade(duplicarServico(original), {
        numero_n: sugerirNumeroN(
          codigo,
          todosNumeros,
          original.caracteristica_veiculo,
        ),
      });
      const secoes = reconciliarSecoesDaDuplicacao(
        secoesDaSessao(sessao),
        original,
        copia,
      );
      const comServicos = comServicosDaSessao(sessao, [
        ...servicosAtuais,
        copia,
      ]);
      aoAtualizarSessao(
        comServicos.modo === "carregado"
          ? {
              ...comServicos,
              documento: {
                ...comServicos.documento,
                autos: { ...comServicos.documento.autos, secoes },
              },
            }
          : { ...comServicos, secoesEmConstrucao: secoes },
      );
      return;
    }
    const original = emConstrucao.find((s) => s.uuid === linha.uuid);
    if (!original) return;
    const copia: ServicoEmConstrucao = {
      ...original,
      uuid: crypto.randomUUID(),
      numero_n: sugerirNumeroN(
        codigo,
        todosNumeros,
        original.caracteristica_veiculo,
      ),
    };
    atualizarEmConstrucao([...emConstrucao, copia]);
  }

  // --- Remover (RN-018) ---

  // Um Serviço completo no documento CARREGADO só pode ser removido se sobrar
  // ao menos um (RN-018 é gate de documento válido). No modo NOVO, RN-018 é
  // gate de EXPORTAÇÃO, não de sessão em construção (TASK-072) — remover pode
  // esvaziar a lista durante a montagem. Em construção pode sempre (não é
  // entidade do documento).
  function podeRemover(linha: LinhaServico): boolean {
    if (!linha.completo) return true;
    return sessao.modo !== "carregado" || podeRemoverServico(sessao.documento);
  }

  function remover(linha: LinhaServico) {
    if (linha.completo) {
      if (sessao.modo === "carregado") {
        atualizarDocumento(removerServico(sessao.documento, linha.uuid));
      } else {
        // Promovido no modo novo (DEC-053/TASK-072): cascata de Seção órfã
        // sobre `secoesEmConstrucao`, sem trava de mínimo 1 (gate é de
        // exportação — RN-018). `servicos` + `secoesEmConstrucao` gravados no
        // MESMO commit.
        const { servicos, secoes } = removerServicoDeLista(
          sessao.servicos ?? [],
          sessao.secoesEmConstrucao ?? [],
          linha.uuid,
        );
        aoAtualizarSessao({
          ...sessao,
          servicos,
          secoesEmConstrucao: secoes,
        });
      }
    } else {
      atualizarEmConstrucao(emConstrucao.filter((s) => s.uuid !== linha.uuid));
    }
    definirConfirmandoRemocao(null);
  }

  return (
    <div data-testid="etapa-servicos">
      <Botao
        variante="primario"
        data-testid="servico-criar"
        onClick={abrirCriar}
      >
        Criar Serviço
      </Botao>

      {linhas.length === 0 ? (
        <Painel className="mt-4">
          <p data-testid="servicos-vazio">Nenhum Serviço cadastrado ainda.</p>
        </Painel>
      ) : (
        <div className="mt-4">
          <Tabela data-testid="lista-servicos">
            <thead>
              <tr>
                <th scope="col">numero_n</th>
                <th scope="col">Característica do veículo</th>
                <th scope="col">Caráter</th>
                <th scope="col">Direcionalidade</th>
                <th scope="col">
                  Viagens semanais
                  <span
                    data-testid="servicos-rotulo-semana-padrao"
                    className="block text-xs text-cinza-500"
                  >
                    {ROTULO_SEMANA_PADRAO}
                  </span>
                </th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr
                  key={linha.uuid}
                  data-testid="servico-item"
                  data-uuid={linha.uuid}
                >
                  <td>
                    <span data-testid="servico-numero-n">
                      {linha.numero_n}
                    </span>
                    {linha.completo ? (
                      <Selo tom="sucesso" className="ml-2" data-testid="servico-completo">
                        completo
                      </Selo>
                    ) : (
                      <Selo tom="neutro" className="ml-2" data-testid="servico-em-construcao">
                        sem itinerário ainda
                      </Selo>
                    )}
                  </td>
                  <td>
                    <span data-testid="servico-caracteristica">
                      {linha.caracteristica_veiculo}
                    </span>
                  </td>
                  <td>
                    <span data-testid="servico-carater">{linha.carater}</span>
                  </td>
                  <td>
                    <span data-testid="servico-direcionalidade">
                      {ROTULO_DIRECIONALIDADE[linha.direcionalidade]}
                    </span>
                  </td>
                  <td>
                    <span data-testid="servico-viagens-semana">
                      Ida {linha.viagens.ida} · Volta {linha.viagens.volta} ·
                      Total {linha.viagens.total}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Botao
                        variante="secundario"
                        data-testid="servico-editar"
                        onClick={() => abrirEditar(linha)}
                      >
                        Editar
                      </Botao>
                      <Botao
                        variante="secundario"
                        data-testid="servico-duplicar"
                        onClick={() => duplicar(linha)}
                      >
                        Duplicar
                      </Botao>
                      {confirmandoRemocao === linha.uuid ? (
                        <>
                          <Botao
                            variante="perigo"
                            data-testid="servico-remover-confirmar"
                            onClick={() => remover(linha)}
                          >
                            Confirmar remoção
                          </Botao>
                          <Botao
                            variante="fantasma"
                            data-testid="servico-remover-cancelar"
                            onClick={() => definirConfirmandoRemocao(null)}
                          >
                            Cancelar
                          </Botao>
                        </>
                      ) : (
                        <Botao
                          variante="secundario"
                          data-testid="servico-remover"
                          disabled={!podeRemover(linha)}
                          onClick={() => definirConfirmandoRemocao(linha.uuid)}
                        >
                          Remover
                        </Botao>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        </div>
      )}

      {form && (
        <FormularioServico
          form={form}
          permitidas={permitidas}
          aoMudar={definirForm}
          aoTrocarCaracteristica={trocarCaracteristicaNoForm}
          aoSalvar={salvar}
          aoCancelar={() => definirForm(null)}
        />
      )}
    </div>
  );
}

function FormularioServico({
  form,
  permitidas,
  aoMudar,
  aoTrocarCaracteristica,
  aoSalvar,
  aoCancelar,
}: {
  form: EstadoForm;
  permitidas: readonly CaracteristicaDeVeiculo[];
  aoMudar: (form: EstadoForm) => void;
  aoTrocarCaracteristica: (c: CaracteristicaDeVeiculo) => void;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  // Direcionalidade só é editável ao criar ou editar Serviço em construção
  // (Serviço completo tem itinerários — trocar sentidos é da etapa de mapa).
  const direcionalidadeEditavel =
    form.alvo === "novo" || !form.alvo.completo;

  return (
    <Painel className="mt-4">
      <form
        data-testid="form-servico"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          aoSalvar();
        }}
      >
        <Campo
          rotulo="Número (numero_n)"
          data-testid="form-numero-n"
          value={form.numero_n}
          onChange={(e) => aoMudar({ ...form, numero_n: e.target.value })}
        />

        <Select
          rotulo="Característica do veículo"
          data-testid="form-caracteristica"
          value={form.caracteristica_veiculo}
          onChange={(e) =>
            aoTrocarCaracteristica(e.target.value as CaracteristicaDeVeiculo)
          }
        >
          {permitidas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <Select
          rotulo="Caráter"
          data-testid="form-carater"
          value={form.carater}
          onChange={(e) =>
            aoMudar({ ...form, carater: e.target.value as Carater })
          }
        >
          {CARATERES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <Select
          rotulo="Direcionalidade"
          data-testid="form-direcionalidade"
          value={form.direcionalidade}
          disabled={!direcionalidadeEditavel}
          onChange={(e) =>
            aoMudar({
              ...form,
              direcionalidade: e.target.value as Direcionalidade,
            })
          }
        >
          {DIRECIONALIDADES.map((d) => (
            <option key={d} value={d}>
              {ROTULO_DIRECIONALIDADE[d]}
            </option>
          ))}
        </Select>

        <div className="flex gap-2">
          <Botao variante="primario" type="submit" data-testid="form-salvar">
            Salvar
          </Botao>
          <Botao
            variante="secundario"
            type="button"
            data-testid="form-cancelar"
            onClick={aoCancelar}
          >
            Cancelar
          </Botao>
        </div>
      </form>
    </Painel>
  );
}
