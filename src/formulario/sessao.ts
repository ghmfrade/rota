import type { Autos, DocumentoOperacao, Local, Secao, Servico } from "@/shared/contrato";
import type { TipoDeAutos } from "@/shared/tipificacao";
import type { AlertaTecnico } from "@/formulario/importacao";
import type { EstadoRotaViva } from "@/formulario/roteamento";
import type { ParadaEmEdicao } from "@/formulario/itinerarios/motor-montagem";

// Identidade do Autos escolhida na etapa Identificação de um documento criado do
// zero (Spec 04 §5; TASK-015). É estritamente um subconjunto dos campos de
// `autos` (Spec 02 §4) — `codigo`/`empresa`/`tipo`/`status` — montado em memória
// enquanto o documento ainda não tem Serviços (que são a TASK-016) e por isso
// não pode ser um `DocumentoOperacao` válido (RN-018 exige ≥ 1 Serviço). NÃO é
// campo novo de contrato (RN-008..015 intactas): é estado de sessão efêmero, não
// persistido, apenas espelha o que virará `autos` na montagem/exportação.
export interface IdentidadeAutos {
  codigo: string;
  // Nome de exibição da empresa — o valor que `autos.empresa` grava (Spec 02
  // §4), resolvido de `empresa_id` via `nomeDaEmpresa` (DEC-030).
  empresa: string;
  tipo: TipoDeAutos;
  // Documento novo nasce como "proposta" (RN-011; Spec 02 §4.1). Vira "vigente"
  // só pela ação de exportação (§12) — nunca editado na Identificação.
  status: Autos["status"];
}

// Direcionalidade escolhida na criação do Serviço (Spec 04 §6): Ida, Volta ou
// ambos. NÃO é campo do contrato (DEC-036): no JSON a direcionalidade é derivada
// de quais `itinerarios[].sentido` existem (Spec 02 §10). É estado de sessão
// efêmero, consumido pela etapa de mapa (TASK-017+) para criar 1 ou 2
// itinerários no(s) sentido(s) escolhido(s).
export type Direcionalidade = "ida" | "volta" | "ambos";

// Serviço em construção na etapa Serviços (TASK-016; DEC-035). Um `Servico`
// schema-válido (Spec 02 §6) exige `itinerarios` (≥ 1, com paradas/rota/viagens)
// e `matriz_distancias`, produzidos só nas etapas seguintes (mapa/matrizes/
// viagens, TASK-017+). Enquanto isso, o Serviço recém-criado é este subconjunto
// efêmero de sessão — os campos definíveis na etapa Serviços — promovido a
// `Servico` completo quando as etapas seguintes preencherem o resto. Espelha o
// precedente `IdentidadeAutos` (subconjunto de `autos` mantido em sessão
// enquanto o documento ainda não é válido). NÃO é campo novo de contrato
// (RN-008..015 intactas): nunca é gravado no JSON (RN-096, NEG-004).
export interface ServicoEmConstrucao {
  // A `uuid` é a identidade estável que o Serviço completo herdará (RN-001/002):
  // gerada client-side na criação, preservada na promoção a `Servico`.
  uuid: string;
  numero_n: string;
  caracteristica_veiculo: Servico["caracteristica_veiculo"];
  carater: Servico["carater"];
  direcionalidade: Direcionalidade;
  // Locais do Serviço (Spec 02 §7; RN-031) montados na etapa de mapa
  // (TASK-018/019) — não compartilhados entre Serviços, ao contrário da
  // Seção. Ausência ≡ lista vazia (mesmo padrão de `servicosEmConstrucao`).
  locais?: Local[];
}

// Estado de topo do Formulário depois da tela inicial (TASK-014): ou o usuário
// carregou um JSON existente (modo "carregado", com o documento e as UUIDs
// preservadas — RN-004), ou iniciou um documento do zero (modo "novo"), cuja
// identidade (Autos/empresa/tipo) só é escolhida na etapa Identificação
// (TASK-015, Spec 04 §5). Por isso o modo "novo" ainda não carrega um
// `DocumentoOperacao` — não há documento montado até a identidade ser definida;
// `identidade` fica indefinida até o usuário selecionar o Autos das listas.
//
// Sessão é estado EFÊMERO de edição, de memória (React state) — nunca é
// persistido no servidor (RN-096, NEG-009) nem gravado no JSON de operação
// (o painel de pendências que dela deriva é de validação, não de processo —
// NEG-004). "Salvar" é exportar o JSON (RN-096); retomar é reimportar.
// `servicosEmConstrucao` (DEC-035) existe nos dois modos: Serviços recém-criados
// na etapa Serviços ainda não têm itinerários/matrizes (etapas seguintes), então
// vivem aqui até serem promovidos a `Servico` completo. No modo carregado
// convivem com os `Servico` já completos do `documento`; no modo novo são a
// única lista de Serviços. Opcional para compatibilidade — ausência ≡ lista
// vazia (ver `servicosEmConstrucaoDaSessao`).
// Estado ao vivo do itinerário em edição (TASK-019; dona do estado por
// itinerário — DEC-041/046/047). Ambos os mapas são chaveados por
// `chaveItinerario(servicoUuid, sentido)` (`itinerarios/estado-itinerarios.ts`)
// e existem nos dois modos, porque são efêmeros de SESSÃO (NEG-004/RN-096) —
// nunca gravados no JSON:
// - `paradasEmEdicao`: a sequência de paradas (Seções/Locais) sendo montada —
//   fonte de verdade da tabela lateral enquanto o usuário edita. Para um
//   Serviço completo (modo carregado), semeada de `itinerario.paradas` no
//   primeiro toque da etapa; só é regravada no documento quando o recálculo
//   tem SUCESSO (RN-048/052: falha de OSRM não pode apagar a última rota
//   válida do arquivo, só acender a pendência ao vivo).
// - `estadosRotaViva`: o `EstadoRotaViva` (TASK-024) resultante da última
//   tentativa — `congelada` (abertura, RN-015), `recalculada` ou `sem-rota`
//   (RN-048). É o insumo de `ItinerarioAoVivo` para `coletarPendencias`
//   (TASK-044, obrigação de fiação desta task).
export type ParadasEmEdicaoPorItinerario = Record<string, ParadaEmEdicao[]>;
export type EstadosRotaVivaPorItinerario = Record<string, EstadoRotaViva>;

// Âncoras manuais de horário por Viagem (TASK-029; Spec 03 §8.2). Cada Viagem
// mapeia a lista de `parada.ordem` cujo offset o usuário fixou à mão — insumo
// da redistribuição proporcional (RN-065). A primeira parada é âncora implícita
// (offset 0) e NÃO entra nesta lista. É estado EFÊMERO da sessão do Formulário
// (DEC-049): sobrevive à navegação entre etapas, é descartado ao recarregar/
// importar outro JSON; nunca gravado no contrato (RN-010; NEG-011), pois o JSON
// só guarda `offset_horario` (Spec 02 §11.1), sem marcador de âncora. Chaveado
// por `viagem.uuid` (globalmente único); ausência ≡ sem âncoras manuais.
export type AncorasHorarioPorViagem = Record<string, number[]>;

export type SessaoFormulario =
  | {
      modo: "carregado";
      documento: DocumentoOperacao;
      // Alertas técnicos não bloqueantes vindos da importação (350 m estático,
      // tipificação — RN-028/032/091). Exibidos como ciência na abertura
      // (Spec 04 §3.1 item 5); não são pendências de §11 (que são consolidadas
      // na Revisão pela TASK-032).
      alertasImportacao: AlertaTecnico[];
      servicosEmConstrucao?: ServicoEmConstrucao[];
      paradasEmEdicao?: ParadasEmEdicaoPorItinerario;
      estadosRotaViva?: EstadosRotaVivaPorItinerario;
      ancorasHorario?: AncorasHorarioPorViagem;
    }
  | {
      modo: "novo";
      identidade?: IdentidadeAutos;
      servicosEmConstrucao?: ServicoEmConstrucao[];
      // Seções do Autos em construção (Spec 02 §5) — não há `documento.autos`
      // ainda no modo novo; espelha o precedente de `servicosEmConstrucao`
      // (DEC-035). Seção é compartilhada pelo Autos inteiro, não por Serviço
      // (RN-025), por isso vive na raiz da sessão, não em `ServicoEmConstrucao`.
      secoesEmConstrucao?: Secao[];
      paradasEmEdicao?: ParadasEmEdicaoPorItinerario;
      estadosRotaViva?: EstadosRotaVivaPorItinerario;
      ancorasHorario?: AncorasHorarioPorViagem;
    };

/** Lista de Serviços em construção da sessão (DEC-035); ausência ≡ vazia. */
export function servicosEmConstrucaoDaSessao(
  sessao: SessaoFormulario,
): ServicoEmConstrucao[] {
  return sessao.servicosEmConstrucao ?? [];
}

/** Seções disponíveis para reuso (Spec 04 §7.1), qualquer que seja o modo:
 * `documento.autos.secoes` no carregado, `secoesEmConstrucao` no novo
 * (ausência ≡ vazia — TASK-019). */
export function secoesDaSessao(sessao: SessaoFormulario): Secao[] {
  if (sessao.modo === "carregado") return sessao.documento.autos.secoes;
  return sessao.secoesEmConstrucao ?? [];
}

/** Paradas em edição por itinerário (TASK-019); ausência ≡ mapa vazio. */
export function paradasEmEdicaoDaSessao(
  sessao: SessaoFormulario,
): ParadasEmEdicaoPorItinerario {
  return sessao.paradasEmEdicao ?? {};
}

/** Estados de rota ao vivo por itinerário (TASK-019/024); ausência ≡ mapa vazio. */
export function estadosRotaVivaDaSessao(
  sessao: SessaoFormulario,
): EstadosRotaVivaPorItinerario {
  return sessao.estadosRotaViva ?? {};
}

/** Âncoras manuais de horário por Viagem (TASK-029; DEC-049); ausência ≡ mapa vazio. */
export function ancorasHorarioDaSessao(
  sessao: SessaoFormulario,
): AncorasHorarioPorViagem {
  return sessao.ancorasHorario ?? {};
}

// Identidade corrente da sessão (Spec 04 §5), qualquer que seja o modo: vem de
// `autos` no carregado e de `identidade` no novo. `undefined` só no novo antes
// de o usuário selecionar o Autos das listas (RN-016) — quando o cabeçalho
// ainda exibe "a definir" (comportamento herdado da TASK-014).
export function identidadeDaSessao(
  sessao: SessaoFormulario,
): IdentidadeAutos | undefined {
  if (sessao.modo === "carregado") {
    const { autos } = sessao.documento;
    return {
      codigo: autos.codigo,
      empresa: autos.empresa,
      tipo: autos.tipo,
      status: autos.status,
    };
  }
  return sessao.identidade;
}
