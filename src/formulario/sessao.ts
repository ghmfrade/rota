import type { Autos, DocumentoOperacao, Servico } from "@/shared/contrato";
import type { TipoDeAutos } from "@/shared/tipificacao";
import type { AlertaTecnico } from "@/formulario/importacao";

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
    }
  | {
      modo: "novo";
      identidade?: IdentidadeAutos;
      servicosEmConstrucao?: ServicoEmConstrucao[];
    };

/** Lista de Serviços em construção da sessão (DEC-035); ausência ≡ vazia. */
export function servicosEmConstrucaoDaSessao(
  sessao: SessaoFormulario,
): ServicoEmConstrucao[] {
  return sessao.servicosEmConstrucao ?? [];
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
