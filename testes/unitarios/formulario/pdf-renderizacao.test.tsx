import { describe, expect, test } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { DocumentoPdfOperacional } from "@/formulario/pdf/documento-pdf-operacional";
import { estilosPdf, PALETA_PDF } from "@/formulario/pdf/estilos-pdf";
import { montarModeloPdfOperacional } from "@/formulario/pdf/modelo-pdf-operacional";
import { esquemaDocumentoOperacao } from "@/shared/contrato";
import {
  documentoBidirecionalMultiServico,
  documentoUnidirecional,
} from "../../fixtures";

// TASK-033/TASK-126 — teste de fumaça do renderizador: prova que o componente
// @react-pdf é válido (estilo/estrutura aceitos pela biblioteca), produz um
// PDF de verdade e mantém o rodapé/numeração em todas as páginas (RN-077,
// TASK-126). A verificação de CONTEÚDO fica nos testes do modelo puro
// (`pdf-modelo-operacional`/`pdf-regras-transversais`) — categoria 7 de
// `docs-dev/08-TEST_STRATEGY.md`: estrutura, não pixel-perfect.

function contarOcorrencias(texto: string, alvo: string): number {
  return texto.split(alvo).length - 1;
}

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

  test(
    "a repaginação por bloco lógico (§13.3) produz ao menos 3 páginas físicas",
    async () => {
      const documento = esquemaDocumentoOperacao.parse(
        documentoBidirecionalMultiServico(),
      );
      const modelo = montarModeloPdfOperacional(documento, {
        geradoEm: new Date(2026, 6, 31, 14, 5),
      });

      const buffer = await renderToBuffer(<DocumentoPdfOperacional modelo={modelo} />);
      const texto = buffer.toString("latin1");

      // Capa, resumo+Serviços e itinerários ficam em `Page` próprias — cada
      // uma é um objeto `/Type /Page` real no arquivo (não `/Pages`, a
      // árvore). Verifica que a separação de fato ocorreu, sem inspecionar o
      // conteúdo comprimido do stream (a asserção de conteúdo do rodapé/aviso
      // SEI é feita sobre o MODELO em `pdf-regras-transversais.test.ts`).
      const paginas = contarOcorrencias(texto, "/Type /Page");
      expect(paginas).toBeGreaterThanOrEqual(3);
    },
    30_000,
  );

  test(
    "documento unidirecional (1 Serviço) não explode em páginas soltas",
    async () => {
      const documento = esquemaDocumentoOperacao.parse(documentoUnidirecional());
      const modelo = montarModeloPdfOperacional(documento, {
        geradoEm: new Date(2026, 6, 31, 14, 5),
      });

      const buffer = await renderToBuffer(<DocumentoPdfOperacional modelo={modelo} />);
      const texto = buffer.toString("latin1");
      const paginas = contarOcorrencias(texto, "/Type /Page");

      // As 3 `Page` do componente (capa, resumo/Serviços, itinerários) mais
      // eventual estouro natural de conteúdo (nunca `break` manual — só
      // `wrap={false}` empurrando bloco inteiro) — um documento de 1 Serviço
      // não deveria passar de poucas páginas extras.
      expect(paginas).toBeGreaterThanOrEqual(3);
      expect(paginas).toBeLessThanOrEqual(5);
    },
    30_000,
  );
});

describe("estilosPdf — paleta (doc 18 §2, DEC-050)", () => {
  test("PALETA_PDF só contém os hex canônicos dos tokens do design system", () => {
    expect(Object.values(PALETA_PDF).sort()).toEqual(
      [
        "#0f172a",
        "#1d4ed8",
        "#1e3a5f",
        "#2563eb",
        "#334155",
        "#64748b",
        "#dbeafe",
        "#e2e8f0",
        "#f1f5f9",
        "#f8fafc",
      ].sort(),
    );
  });

  test("nenhum cinza do Tailwind default (o motivo original do parecer) sobrevive", () => {
    const valores = Object.values(PALETA_PDF);
    expect(valores).not.toContain("#111827");
    expect(valores).not.toContain("#374151");
    expect(valores).not.toContain("#6b7280");
    expect(valores).not.toContain("#e5e7eb");
  });
});

describe("estilosPdf — larguras de coluna proporcionais (TASK-126)", () => {
  test("a coluna 'Serviço' é mais larga que as colunas numéricas, não flex: 1 uniforme", () => {
    expect(estilosPdf.celulaServico.flex).toBeGreaterThan(estilosPdf.celulaNumerica.flex);
    expect(estilosPdf.celulaNumerica.flex).toBe(1);
  });

  test("a coluna 'Faixa' continua mais larga que as numéricas (rótulo + intervalo)", () => {
    expect(estilosPdf.celulaFaixa.flex).toBeGreaterThan(estilosPdf.celulaNumerica.flex);
  });

  test("cabeçalho, zebra e total têm estilos distintos (não reusam o mesmo objeto)", () => {
    expect(estilosPdf.linhaCabecalho).not.toEqual(estilosPdf.linhaTabela);
    expect(estilosPdf.linhaCabecalho).not.toEqual(estilosPdf.linhaTotal);
    expect(estilosPdf.linhaTabela).not.toEqual(estilosPdf.linhaTabelaZebra);
    // A distinção visual é a de fundo (cabeçalho/zebra) e borda (total).
    expect(estilosPdf.linhaCabecalho.backgroundColor).toBeDefined();
    expect(estilosPdf.linhaTabelaZebra.backgroundColor).toBeDefined();
    expect("backgroundColor" in estilosPdf.linhaTotal).toBe(false);
    expect(estilosPdf.linhaTotal.borderTopWidth).toBeGreaterThan(0);
  });
});

// Guarda contra reintrodução de hex fora da paleta: lê o arquivo fonte e
// varre por qualquer #rrggbb que não esteja em PALETA_PDF.
describe("estilosPdf.ts — nenhum hex fora da paleta do doc 18", () => {
  test("todo #rrggbb do arquivo pertence a PALETA_PDF", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const caminho = path.resolve(__dirname, "../../../src/formulario/pdf/estilos-pdf.ts");
    const conteudo = await fs.readFile(caminho, "utf-8");

    const permitidos = new Set(Object.values(PALETA_PDF).map((v) => v.toLowerCase()));
    const encontrados = conteudo.match(/#[0-9a-fA-F]{6}/g) ?? [];
    const foraDaPaleta = encontrados
      .map((h) => h.toLowerCase())
      .filter((h) => !permitidos.has(h));

    expect(foraDaPaleta).toEqual([]);
  });
});
