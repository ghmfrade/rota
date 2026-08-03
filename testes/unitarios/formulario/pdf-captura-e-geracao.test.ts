import { describe, expect, test, vi } from "vitest";
import type { LineString } from "geojson";
import {
  capturarMapasDoDocumento,
  chaveImagem,
} from "@/formulario/pdf/captura-mapa-pdf";
import {
  gerarPdfOperacional,
  nomeArquivoPdf,
} from "@/formulario/pdf/gerar-pdf-operacional";
import type { ModeloPdfOperacional } from "@/formulario/pdf/modelo-pdf-operacional";
import { esquemaDocumentoOperacao, type DocumentoOperacao } from "@/shared/contrato";
import {
  documentoBidirecionalMultiServico,
  documentoExemploMinimo,
} from "../../fixtures";

// TASK-033 — captura das imagens de mapa (DEC-104) e orquestração da geração.
// A captura REAL depende de WebGL e de tiles: aqui ela é sempre injetada, como
// o OSRM é sempre mockado (`docs-dev/08-TEST_STRATEGY.md`). O que se testa é a
// política: uma imagem por Serviço × sentido, sequencial, e falha tolerada sem
// interromper o PDF.

function documento(fixture = documentoExemploMinimo()): DocumentoOperacao {
  return esquemaDocumentoOperacao.parse(fixture);
}

const BLOB_FALSO = { size: 1234, type: "application/pdf" } as unknown as Blob;

describe("capturarMapasDoDocumento (DEC-104)", () => {
  test("captura uma imagem por Serviço × sentido, endereçada pela chave do modelo", async () => {
    const doc = documento(documentoBidirecionalMultiServico());
    const capturar = vi.fn(async () => "data:image/png;base64,MAPA");

    const { imagens, falhas } = await capturarMapasDoDocumento(doc, capturar);

    expect(capturar).toHaveBeenCalledTimes(4); // 2 Serviços × Ida/Volta
    expect(falhas).toEqual([]);
    for (const servico of doc.autos.servicos) {
      for (const itinerario of servico.itinerarios) {
        expect(imagens.get(chaveImagem(servico.uuid, itinerario.sentido))).toBe(
          "data:image/png;base64,MAPA",
        );
      }
    }
  });

  test("recebe a geometria CONGELADA do documento — não recalcula nada (RN-015/NEG-019)", async () => {
    const doc = documento();
    const geometrias: LineString[] = [];

    await capturarMapasDoDocumento(doc, async (geometria) => {
      geometrias.push(geometria);
      return "data:image/png;base64,MAPA";
    });

    expect(geometrias[0]).toEqual(
      doc.autos.servicos[0].itinerarios[0].rota.geometria,
    );
  });

  test("caso inválido — falha de captura não interrompe: vira falha listada", async () => {
    const doc = documento(documentoBidirecionalMultiServico());
    const primeiroServico = doc.autos.servicos[0];
    let chamada = 0;

    const { imagens, falhas } = await capturarMapasDoDocumento(doc, async () => {
      chamada += 1;
      if (chamada === 1) throw new Error("tile indisponível");
      return "data:image/png;base64,MAPA";
    });

    expect(chamada).toBe(4); // seguiu capturando as demais
    expect(imagens.size).toBe(3);
    expect(falhas).toHaveLength(1);
    expect(falhas[0].numeroN).toBe(primeiroServico.numero_n);
  });

  test("caso inválido — todas as capturas falham e ainda assim não lança", async () => {
    const doc = documento();

    const { imagens, falhas } = await capturarMapasDoDocumento(doc, async () => {
      throw new Error("sem WebGL");
    });

    expect(imagens.size).toBe(0);
    expect(falhas).toHaveLength(2);
  });

  test("TASK-127/DEC-105 — o capturador injetado recebe os símbolos numerados do PRÓPRIO itinerário", async () => {
    const doc = documento();
    const simbolosRecebidos: { sentido: string; tipos: string[]; rotulos: (string | undefined)[] }[] = [];

    await capturarMapasDoDocumento(doc, async (geometria, simbolos) => {
      simbolosRecebidos.push({
        sentido: simbolosRecebidos.length === 0 ? "ida" : "volta",
        tipos: simbolos.map((s) => s.tipo),
        rotulos: simbolos.map((s) => s.rotulo),
      });
      return "data:image/png;base64,MAPA";
    });

    // Ida do exemplo mínimo: Seção A, Seção B, Local (após B), Seção C → 1º, 2º, 2.1, 3º.
    expect(simbolosRecebidos[0].tipos).toEqual(["secao", "secao", "local", "secao"]);
    expect(simbolosRecebidos[0].rotulos).toEqual(["1º", "2º", "2.1", "3º"]);
    // Volta do exemplo mínimo não tem Local: só Seções, série própria.
    expect(simbolosRecebidos[1].tipos).toEqual(["secao", "secao", "secao"]);
    expect(simbolosRecebidos[1].rotulos).toEqual(["1º", "2º", "3º"]);
  });
});

describe("Dimensão de captura (TASK-126 — legibilidade de impressão)", () => {
  test("a resolução sobe para ~1400×840, preservando a proporção 5:3 da DEC-104", async () => {
    const { LARGURA_CAPTURA, ALTURA_CAPTURA } = await import(
      "@/formulario/pdf/captura-mapa-pdf"
    );

    expect(LARGURA_CAPTURA).toBe(1400);
    expect(ALTURA_CAPTURA).toBe(840);
    expect(LARGURA_CAPTURA / ALTURA_CAPTURA).toBeCloseTo(1000 / 600, 5);
  });

  test("a margem do enquadramento (DEC-104) é derivada da largura, não um número solto", async () => {
    const { LARGURA_CAPTURA, MARGEM_ENQUADRAMENTO, FRACAO_MARGEM_ENQUADRAMENTO } =
      await import("@/formulario/pdf/captura-mapa-pdf");

    // Enquadramento RELATIVO: mudar a resolução sem mudar a margem encostaria
    // a rota na borda. A margem é a mesma fração da largura em qualquer
    // resolução, e o valor efetivo continua o de 1400 px (56).
    expect(FRACAO_MARGEM_ENQUADRAMENTO).toBeCloseTo(0.04, 6);
    expect(MARGEM_ENQUADRAMENTO).toBe(LARGURA_CAPTURA * FRACAO_MARGEM_ENQUADRAMENTO);
    expect(MARGEM_ENQUADRAMENTO).toBe(56);
  });
});

describe("gerarPdfOperacional", () => {
  test("as imagens capturadas chegam ao modelo renderizado", async () => {
    const doc = documento();
    const servicoUuid = doc.autos.servicos[0].uuid;
    let modeloRenderizado: ModeloPdfOperacional | undefined;

    const resultado = await gerarPdfOperacional(doc, {
      capturarMapas: async () => ({
        imagens: new Map([
          [chaveImagem(servicoUuid, "ida"), "data:image/png;base64,IDA"],
          [chaveImagem(servicoUuid, "volta"), "data:image/png;base64,VOLTA"],
        ]),
        falhas: [],
      }),
      renderizar: async (modelo) => {
        modeloRenderizado = modelo;
        return BLOB_FALSO;
      },
    });

    expect(resultado.blob).toBe(BLOB_FALSO);
    expect(resultado.avisos).toEqual([]);
    expect(modeloRenderizado?.itinerarios[0].imagemMapa).toBe(
      "data:image/png;base64,IDA",
    );
    expect(modeloRenderizado?.itinerarios[1].imagemMapa).toBe(
      "data:image/png;base64,VOLTA",
    );
  });

  test("caso inválido — captura falha: PDF sai mesmo assim, com aviso não bloqueante", async () => {
    const doc = documento();
    let modeloRenderizado: ModeloPdfOperacional | undefined;

    const resultado = await gerarPdfOperacional(doc, {
      capturarMapas: async () => ({
        imagens: new Map(),
        falhas: [
          {
            servicoUuid: doc.autos.servicos[0].uuid,
            numeroN: doc.autos.servicos[0].numero_n,
            sentido: "volta" as const,
          },
        ],
      }),
      renderizar: async (modelo) => {
        modeloRenderizado = modelo;
        return BLOB_FALSO;
      },
    });

    expect(resultado.blob).toBe(BLOB_FALSO);
    expect(resultado.avisos).toHaveLength(1);
    expect(resultado.avisos[0]).toContain("0000-1CR");
    expect(resultado.avisos[0]).toContain("Volta");
    // O documento sai completo no resto — a lacuna é só a imagem.
    expect(modeloRenderizado?.itinerarios.every((i) => i.imagemMapa === undefined)).toBe(
      true,
    );
    expect(modeloRenderizado?.capa.codigo).toBe("0000");
    // DEC-105 — falha de captura NÃO leva a legenda junto: ela é derivada das
    // paradas, independente de a imagem ter vindo.
    expect(modeloRenderizado?.itinerarios.every((i) => i.legendaSecoes.length > 0)).toBe(
      true,
    );
  });

  test("nome sugerido do arquivo identifica o Autos", () => {
    expect(nomeArquivoPdf(documento())).toBe("rota-0000-tabela-operacional.pdf");
  });
});
