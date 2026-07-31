import { describe, expect, test } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { DocumentoPdfOperacional } from "@/formulario/pdf/documento-pdf-operacional";
import { montarModeloPdfOperacional } from "@/formulario/pdf/modelo-pdf-operacional";
import { esquemaDocumentoOperacao } from "@/shared/contrato";
import { documentoBidirecionalMultiServico } from "../../fixtures";

// TASK-033 — teste de fumaça do renderizador: um único caso que prova que o
// componente @react-pdf é válido (estilo/estrutura aceitos pela biblioteca) e
// produz um PDF de verdade. A verificação de CONTEÚDO fica nos testes do modelo
// puro (`pdf-modelo-operacional`/`pdf-regras-transversais`) — categoria 7 de
// `docs-dev/08-TEST_STRATEGY.md`: estrutura, não pixel-perfect.

describe("DocumentoPdfOperacional — renderização (RN-074)", () => {
  test(
    "renderiza um PDF a partir do modelo, sem imagem de mapa (DEC-104)",
    async () => {
      const documento = esquemaDocumentoOperacao.parse(
        documentoBidirecionalMultiServico(),
      );
      const modelo = montarModeloPdfOperacional(documento, {
        geradoEm: new Date(2026, 6, 31, 14, 5),
      });

      const buffer = await renderToBuffer(<DocumentoPdfOperacional modelo={modelo} />);

      expect(buffer.byteLength).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    },
    30_000,
  );
});
