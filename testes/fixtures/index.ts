import type { DocumentoOperacao } from "@/shared/contrato";
import exemploMinimo from "./spec02-15-exemplo-minimo.json";
import bidirecionalMultiServico from "./bidirecional-multi-servico.json";
import unidirecional from "./unidirecional.json";
import parVigente from "./par-vigente.json";
import parProposta from "./par-proposta.json";

// Índice das fixtures canônicas versionadas (TASK-041). As fixtures válidas
// são JSON em disco, aceitos por `esquemaDocumentoOperacao` (TASK-003, Spec 02);
// as variantes INVÁLIDAS ficam em `variantes-invalidas.ts` como mutações
// dirigidas (uma por RN estrutural), não como arquivos.
//
// Cada loader devolve uma cópia profunda, isolando cada consumidor das mutações
// de outra suíte. O cast é seguro: são JSON canônico já provado válido pela
// própria suíte de guarda (`fixtures-canonicas.test.ts`).

function carregar(fixtura: unknown): DocumentoOperacao {
  return structuredClone(fixtura) as DocumentoOperacao;
}

/** Exemplo mínimo da Spec 02 §15 — Serviço único, três Seções, um Local. */
export function documentoExemploMinimo(): DocumentoOperacao {
  return carregar(exemploMinimo);
}

/** Autos bidirecional com dois Serviços compartilhando Seções (Ida + Volta). */
export function documentoBidirecionalMultiServico(): DocumentoOperacao {
  return carregar(bidirecionalMultiServico);
}

/** Autos unidirecional — Serviço com um único itinerário (só Ida). */
export function documentoUnidirecional(): DocumentoOperacao {
  return carregar(unidirecional);
}

/** Lado "vigente" do par de comparação (mesmas UUIDs do lado proposta). */
export function documentoParVigente(): DocumentoOperacao {
  return carregar(parVigente);
}

/** Lado "proposta" do par de comparação (mesmas UUIDs do lado vigente). */
export function documentoParProposta(): DocumentoOperacao {
  return carregar(parProposta);
}

/** Catálogo das fixtures válidas — consumido pela guarda e pelas demais suítes. */
export const FIXTURES_VALIDAS: {
  nome: string;
  carregar: () => DocumentoOperacao;
}[] = [
  { nome: "spec02-15-exemplo-minimo", carregar: documentoExemploMinimo },
  { nome: "bidirecional-multi-servico", carregar: documentoBidirecionalMultiServico },
  { nome: "unidirecional", carregar: documentoUnidirecional },
  { nome: "par-vigente", carregar: documentoParVigente },
  { nome: "par-proposta", carregar: documentoParProposta },
];

// Manifesto do par vigente/proposta: as MESMAS UUIDs dos dois lados e os diffs
// operacionais conhecidos. Serve às suítes de regressão de UUID (TASK-042) e ao
// Comparador (TASK-035/036) como oráculo — o que deve casar e o que deve mudar.
export const MANIFESTO_PAR = {
  servicoUuid: "dddddddd-4444-4444-8444-dddddddddddd",
  secaoUuids: [
    "66666666-6666-4666-8666-666666666666",
    "77777777-7777-4777-8777-777777777777",
  ],
  // Viagem presente nos dois lados (mesma UUID) — casa como Alterada, não como
  // Removida+Adicionada.
  viagemComparavelIdaUuid: "d1d1d1d1-0000-4000-8000-000000000001",
  viagemVoltaUuid: "d1d1d1d1-0000-4000-8000-000000000002",
  // Viagem que só existe na proposta — deve casar como Adicionada.
  viagemAdicionadaNaPropostaUuid: "d1d1d1d1-0000-4000-8000-000000000009",
  diffs: [
    { campo: "autos.status", vigente: "vigente", proposta: "proposta" },
    { campo: "autos.data (publicacao vs criacao)", vigente: "data_publicacao=2026-01-15", proposta: "data_criacao=2026-07-01" },
    { campo: "horario_saida da viagem de Ida comparável", vigente: "08:00:00", proposta: "08:30:00" },
    { campo: "valor_adotado_de_distancia do par de Seções", vigente: 8, proposta: 9 },
    { campo: "viagem adicionada na Ida (só na proposta)", vigente: null, proposta: "horario_saida=12:00:00" },
  ],
} as const;
