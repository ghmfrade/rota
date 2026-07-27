import { describe, expect, test } from "vitest";
import type { DocumentoOperacao } from "@/shared/contrato";
import { importarDocumento } from "@/formulario/importacao";
import {
  exportarComoProposta,
  exportarComoVigente,
} from "@/formulario/exportacao";
import {
  FIXTURES_VALIDAS,
  documentoOperacaoExcepcional,
} from "../../fixtures";
import { coletarUuids, listasReconhecendo } from "./apoio";

// Regressão permanente (categoria 10 da docs-dev/08 §10) — RN-004, a regra
// crítica nº 1 do projeto. Fecha o LAÇO completo salvar/retomar do Formulário:
//   texto → importarDocumento → exportar(proposta|vigente) → parse → importar
// e afirma que o CONJUNTO de UUIDs é idêntico em todas as etapas. Compara-se o
// conjunto de UUIDs, NÃO o documento inteiro: exportar reescreve `status`/datas
// (RN-011), mas nunca regenera UUID de entidade (RN-004). OSRM não é tocado —
// tudo roda sobre as fixtures canônicas locais (TASK-041).

// Data fixa injetada (Formulário puro, sem relógio real) para as duas ações.
const HOJE = "2026-07-08";

// Roda o laço completo e devolve o conjunto de UUIDs a cada estágio.
function roundTrip(
  original: DocumentoOperacao,
  exportar: (doc: DocumentoOperacao) => ReturnType<typeof exportarComoProposta>,
): Set<string>[] {
  const listas = listasReconhecendo(original);
  const texto = JSON.stringify(original);

  const importado = importarDocumento(texto, listas);
  expect(importado.ok, "import inicial deveria passar").toBe(true);
  if (!importado.ok) throw new Error("import inicial falhou");

  const exportado = exportar(importado.documento);
  expect(exportado.ok, "exportação deveria passar o gate (RN-078)").toBe(true);
  if (!exportado.ok) throw new Error("exportação falhou");

  const reimportado = importarDocumento(exportado.json, listas);
  expect(reimportado.ok, "re-import deveria passar").toBe(true);
  if (!reimportado.ok) throw new Error("re-import falhou");

  return [
    coletarUuids(original),
    coletarUuids(importado.documento),
    coletarUuids(exportado.documento),
    coletarUuids(reimportado.documento),
  ];
}

function esperarConjuntosIguais(conjuntos: Set<string>[]): void {
  const referencia = [...conjuntos[0]].sort();
  expect(referencia.length).toBeGreaterThan(0);
  for (const conjunto of conjuntos) {
    expect([...conjunto].sort()).toEqual(referencia);
  }
}

describe("RN-004 — round-trip import→export→import preserva UUIDs", () => {
  test.each(FIXTURES_VALIDAS)(
    "exportar como proposta preserva o conjunto de UUIDs de $nome",
    ({ carregar }) => {
      esperarConjuntosIguais(
        roundTrip(carregar(), (doc) => exportarComoProposta(doc, HOJE)),
      );
    },
  );

  test("preserva tabela_excepcional_uuid no round-trip completo", () => {
    const original = documentoOperacaoExcepcional();
    const listas = listasReconhecendo(original);
    const importado = importarDocumento(JSON.stringify(original), listas);
    expect(importado.ok).toBe(true);
    if (!importado.ok) return;

    const exportado = exportarComoProposta(importado.documento, HOJE);
    expect(exportado.ok).toBe(true);
    if (!exportado.ok) return;

    const reimportado = importarDocumento(exportado.json, listas);
    expect(reimportado.ok).toBe(true);
    if (!reimportado.ok) return;

    const referenciaOriginal =
      original.autos.servicos[0].itinerarios[0].viagens[0]
        .tabela_excepcional_uuid;
    expect(
      reimportado.documento.autos.servicos[0].itinerarios[0].viagens[0]
        .tabela_excepcional_uuid,
    ).toBe(referenciaOriginal);
  });

  test.each(FIXTURES_VALIDAS)(
    "definir como vigente preserva o conjunto de UUIDs de $nome (RN-079)",
    ({ carregar }) => {
      esperarConjuntosIguais(
        roundTrip(carregar(), (doc) => exportarComoVigente(doc, HOJE)),
      );
    },
  );

  // Caso INVÁLIDO (guarda com dentes): se qualquer estágio regenerasse uma UUID
  // — o modo de falha que a RN-004 proíbe —, o oráculo tem de acusar. Simula-se
  // a regeneração adulterando o documento re-importado; os conjuntos DEVEM
  // divergir. Prova que o teste acima não passaria em silêncio diante de um bug.
  test("detecta regeneração de UUID (o modo de falha proibido por RN-004)", () => {
    const original = FIXTURES_VALIDAS[0].carregar();
    const listas = listasReconhecendo(original);
    const exportado = exportarComoProposta(original, HOJE);
    expect(exportado.ok).toBe(true);
    if (!exportado.ok) return;

    const reimportado = importarDocumento(exportado.json, listas);
    expect(reimportado.ok).toBe(true);
    if (!reimportado.ok) return;

    // Emula um export/import bugado que troca a UUID de um Serviço.
    reimportado.documento.autos.servicos[0].uuid =
      "00000000-0000-4000-8000-000000000000";

    expect([...coletarUuids(reimportado.documento)].sort()).not.toEqual(
      [...coletarUuids(original)].sort(),
    );
  });
});
