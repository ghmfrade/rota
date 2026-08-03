import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { DocumentoPdfOperacional } from "@/formulario/pdf/documento-pdf-operacional";
import { estilosPdf, PALETA_PDF } from "@/formulario/pdf/estilos-pdf";
import {
  AVISO_SEI,
  montarModeloPdfOperacional,
  ROTULO_FAIXA_TOTAL_AUTOS,
  type ModeloPdfOperacional,
} from "@/formulario/pdf/modelo-pdf-operacional";
import { esquemaDocumentoOperacao } from "@/shared/contrato";
import { FAIXAS_HORARIO, rotuloFaixaComIntervalo } from "@/shared/contagens";
import {
  documentoBidirecionalMultiServico,
  documentoExemploMinimo,
  documentoUnidirecional,
} from "../../fixtures";

// TASK-033/TASK-126 — teste de fumaça do renderizador: prova que o componente
// @react-pdf é válido (estilo/estrutura aceitos pela biblioteca), produz um
// PDF de verdade e mantém o rodapé/numeração em todas as páginas (RN-077).
// A verificação de CONTEÚDO fica nos testes do modelo puro
// (`pdf-modelo-operacional`/`pdf-regras-transversais`) — categoria 7 de
// `docs-dev/08-TEST_STRATEGY.md`: estrutura, não pixel-perfect.
//
// O que o PDF renderizado NÃO permite verificar: seu conteúdo textual vive em
// streams comprimidos, então nenhuma asserção sobre "o aviso da RN-077 aparece
// nesta página" pode ser feita sobre o buffer. Por isso as regras de estrutura
// são assertadas sobre a ÁRVORE DE ELEMENTOS do componente (abaixo), que é a
// mesma que o @react-pdf pagina — e o buffer fica só para o que ele prova de
// fato: que a árvore é renderizável e quantas páginas físicas saem.

function contarOcorrencias(texto: string, alvo: string): number {
  return texto.split(alvo).length - 1;
}

// --- Inspeção da árvore de elementos -------------------------------------
//
// Os primitivos do @react-pdf são elementos de tipo string ("DOCUMENT",
// "PAGE", "VIEW", "TEXT"); os blocos do documento são componentes-função sem
// estado nem hooks, logo expansíveis por chamada direta.

interface NoPdf {
  tipo: string;
  props: Record<string, unknown>;
  filhos: NoPdf[];
}

function expandir(no: ReactNode): NoPdf[] {
  if (no === null || no === undefined || typeof no === "boolean") return [];
  if (typeof no === "string" || typeof no === "number") {
    return [{ tipo: "#texto", props: { valor: String(no) }, filhos: [] }];
  }
  if (Array.isArray(no)) return no.flatMap(expandir);
  if (!isValidElement(no)) return [];

  const elemento = no as ReactElement<{ children?: ReactNode }>;
  if (typeof elemento.type === "function") {
    const componente = elemento.type as (props: unknown) => ReactNode;
    return expandir(componente(elemento.props));
  }
  return [
    {
      tipo: String(elemento.type),
      props: elemento.props as Record<string, unknown>,
      filhos: expandir(elemento.props.children),
    },
  ];
}

function arvoreDo(modelo: ModeloPdfOperacional): NoPdf {
  const raizes = expandir(<DocumentoPdfOperacional modelo={modelo} />);
  expect(raizes).toHaveLength(1);
  expect(raizes[0].tipo).toBe("DOCUMENT");
  return raizes[0];
}

function descendentes(no: NoPdf): NoPdf[] {
  return [no, ...no.filhos.flatMap(descendentes)];
}

/**
 * Todo o texto contido no nó, concatenado na ordem da árvore. Sem separador:
 * um rótulo escrito em JSX como `Serviço {numeroN} — por faixa` chega aqui
 * como três nós de texto e precisa voltar a ser a string original.
 */
function textoDe(no: NoPdf): string {
  return descendentes(no)
    .filter((n) => n.tipo === "#texto")
    .map((n) => String(n.props.valor))
    .join("");
}

function paginasDe(documento: NoPdf): NoPdf[] {
  return documento.filhos.filter((filho) => filho.tipo === "PAGE");
}

function modeloDe(documento: unknown): ModeloPdfOperacional {
  return montarModeloPdfOperacional(esquemaDocumentoOperacao.parse(documento), {
    geradoEm: new Date(2026, 6, 31, 14, 5),
  });
}

describe("DocumentoPdfOperacional — renderização (RN-074)", () => {
  test(
    "renderiza um PDF a partir do modelo, sem imagem de mapa (DEC-104)",
    async () => {
      const modelo = modeloDe(documentoBidirecionalMultiServico());

      const buffer = await renderToBuffer(<DocumentoPdfOperacional modelo={modelo} />);

      expect(buffer.byteLength).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    },
    30_000,
  );

  test("o componente emite exatamente as 4 `Page` dos blocos lógicos (§13.3)", () => {
    // Capa, resumo, Serviços e itinerários — cada bloco lógico do §13.1 em
    // `Page` própria. Igualdade exata, não piso: acrescentar ou remover uma
    // `Page` (a TASK-034 escreve os itens 5–8 aqui) tem de falhar este teste.
    expect(paginasDe(arvoreDo(modeloDe(documentoBidirecionalMultiServico())))).toHaveLength(
      4,
    );
    expect(paginasDe(arvoreDo(modeloDe(documentoUnidirecional())))).toHaveLength(4);
  });

  test(
    "um itinerário por página: o documento de 4 itinerários rende mais páginas físicas que o de 1",
    async () => {
      const multi = await renderToBuffer(
        <DocumentoPdfOperacional modelo={modeloDe(documentoBidirecionalMultiServico())} />,
      );
      const uni = await renderToBuffer(
        <DocumentoPdfOperacional modelo={modeloDe(documentoUnidirecional())} />,
      );

      const paginasMulti = contarOcorrencias(multi.toString("latin1"), "/Type /Page");
      const paginasUni = contarOcorrencias(uni.toString("latin1"), "/Type /Page");

      // O `break` a partir do segundo itinerário é o que produz a diferença:
      // sem ele, os 4 itinerários curtos (sem imagem de mapa nesta fixture)
      // caberiam todos na mesma página e as duas contagens se aproximariam.
      expect(paginasUni).toBeGreaterThanOrEqual(4);
      expect(paginasMulti).toBeGreaterThanOrEqual(paginasUni + 3);
    },
    45_000,
  );

  test("o primeiro itinerário não leva `break` — nada de página em branco", () => {
    const documento = arvoreDo(modeloDe(documentoBidirecionalMultiServico()));
    const paginaItinerarios = paginasDe(documento)[3];

    const comBreak = descendentes(paginaItinerarios).filter(
      (no) => no.props.break === true,
    );
    // 4 itinerários na fixture: só os 3 posteriores quebram página.
    expect(comBreak).toHaveLength(3);
  });
});

describe("RN-077 — aviso de fronteira com o SEI em todas as páginas", () => {
  test("cada `Page` do documento carrega o rodapé `fixed` com o aviso", () => {
    for (const fixture of [
      documentoBidirecionalMultiServico(),
      documentoUnidirecional(),
    ]) {
      const paginas = paginasDe(arvoreDo(modeloDe(fixture)));
      expect(paginas.length).toBeGreaterThan(0);

      for (const pagina of paginas) {
        const rodapes = descendentes(pagina).filter(
          (no) => no.tipo === "VIEW" && no.props.fixed === true,
        );
        // Exatamente um rodapé por página, `fixed` (repetido em toda página
        // física que a paginação gerar) e com o aviso literal da RN-077.
        expect(rodapes).toHaveLength(1);
        expect(textoDe(rodapes[0])).toContain(AVISO_SEI);
      }
    }
  });

  test("caso inválido — uma `Page` sem rodapé é detectada pela mesma varredura", () => {
    // Prova que o teste acima tem poder de detecção: a mesma varredura,
    // aplicada a uma página sem rodapé, acusa. Sem isto, a asserção passaria
    // vacuamente se o componente parasse de emitir `Page`.
    const paginaSemRodape: NoPdf = { tipo: "PAGE", props: {}, filhos: [] };
    const rodapes = descendentes(paginaSemRodape).filter(
      (no) => no.tipo === "VIEW" && no.props.fixed === true,
    );
    expect(rodapes).toHaveLength(0);
  });
});

describe("Tabelas por faixa de horário — grupo íntegro, nunca partido", () => {
  function gruposIntegros(documento: NoPdf): NoPdf[] {
    return descendentes(documento).filter(
      (no) => no.tipo === "VIEW" && no.props.wrap === false,
    );
  }

  const rotulosDasFaixas = FAIXAS_HORARIO.map(rotuloFaixaComIntervalo);

  test("a estratificação do total do Autos é um único bloco `wrap={false}`", () => {
    const documento = arvoreDo(modeloDe(documentoBidirecionalMultiServico()));
    const grupos = gruposIntegros(documento).filter((no) =>
      textoDe(no).includes(ROTULO_FAIXA_TOTAL_AUTOS),
    );

    expect(grupos).toHaveLength(1);
    const texto = textoDe(grupos[0]);
    // Subtítulo, cabeçalho e as 7 linhas dentro do MESMO nó não-quebrável:
    // se a tabela couber só parcialmente, o @react-pdf empurra tudo junto.
    expect(texto).toContain("Faixa");
    for (const rotulo of rotulosDasFaixas) {
      expect(texto).toContain(rotulo);
    }
  });

  test("cada Serviço tem sua estratificação inteira em um único bloco `wrap={false}`", () => {
    const modelo = modeloDe(documentoBidirecionalMultiServico());
    const documento = arvoreDo(modelo);

    for (const servico of modelo.resumo.porFaixaPorServico) {
      const subtitulo = `Serviço ${servico.numeroN} — por faixa de horário`;
      const grupos = gruposIntegros(documento).filter((no) =>
        textoDe(no).includes(subtitulo),
      );

      expect(grupos).toHaveLength(1);
      const texto = textoDe(grupos[0]);
      // RN-069/NEG-018: o rótulo da semana padrão viaja DENTRO do grupo, então
      // não pode ser separado das contagens por uma quebra de página.
      expect(texto).toContain(modelo.resumo.rotuloSemanaPadrao);
      expect(texto).toContain("Pares compráveis");
      for (const rotulo of rotulosDasFaixas) {
        expect(texto).toContain(rotulo);
      }
    }
  });

  test("caso inválido — nenhuma linha de faixa fica com `wrap` próprio fora do grupo", () => {
    // A regressão a travar: alguém voltar a marcar linha a linha e afrouxar o
    // grupo. Toda linha de faixa deve ter um ancestral `wrap={false}`, e
    // nenhuma pode ser ela mesma o único nó não-quebrável.
    const documento = arvoreDo(modeloDe(documentoBidirecionalMultiServico()));
    const grupos = gruposIntegros(documento);
    const gruposDeFaixa = grupos.filter((no) =>
      rotulosDasFaixas.every((rotulo) => textoDe(no).includes(rotulo)),
    );

    // 1 grupo do total do Autos + 1 por Serviço (2 na fixture) = 3.
    expect(gruposDeFaixa).toHaveLength(3);
    // Nenhum deles é uma linha solta: cada um contém as 7 faixas.
    for (const grupo of gruposDeFaixa) {
      expect(descendentes(grupo).filter((n) => n.tipo === "VIEW").length).toBeGreaterThan(
        7,
      );
    }
  });
});

describe("Capa — caso inválido: Autos sem nenhuma data", () => {
  // O schema NÃO aceita este documento: a RN-011 exige `data_criacao` para
  // `status: "proposta"` e `data_publicacao` para `vigente`, e o refinamento
  // roda dentro do próprio zod. O modelo do PDF ainda assim precisa ser
  // defensivo — ele desenha o que recebe —, então a fixture é montada sem
  // passar pelo `parse`, de propósito, para exercitar exatamente o ramo que
  // um documento válido nunca alcança.
  function modeloSemDatas(): ModeloPdfOperacional {
    const documento = documentoExemploMinimo();
    delete documento.autos.data_criacao;
    delete documento.autos.data_publicacao;
    return montarModeloPdfOperacional(documento as never, {
      geradoEm: new Date(2026, 6, 31, 14, 5),
    });
  }

  test("o schema rejeita o documento — é o motivo de o modelo ser exercitado sem parse", () => {
    const documento = documentoExemploMinimo();
    delete documento.autos.data_criacao;
    delete documento.autos.data_publicacao;
    expect(esquemaDocumentoOperacao.safeParse(documento).success).toBe(false);
  });

  test("o modelo devolve data vazia em vez de inventar uma", () => {
    expect(modeloSemDatas().capa.data).toBe("");
  });

  test("a capa omite a linha inteira — sem rótulo solto nem selo vazio", () => {
    const paginaCapa = paginasDe(arvoreDo(modeloSemDatas()))[0];
    const texto = textoDe(paginaCapa);

    expect(texto).not.toContain("Data de criação");
    expect(texto).not.toContain("Data de publicação");
    // O restante da identificação continua na página (nada foi derrubado junto).
    expect(texto).toContain("Empresa");
    expect(texto).toContain("Status");
  });

  test(
    "documento sem data ainda renderiza um PDF válido",
    async () => {
      const buffer = await renderToBuffer(
        <DocumentoPdfOperacional modelo={modeloSemDatas()} />,
      );
      expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
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

  test("nenhum token da paleta é morto — todos são pintados por algum estilo", () => {
    // O parecer da TASK-126 apontou `azul600` como valor que o teste obrigava a
    // manter sem o documento usar. A guarda agora é nos dois sentidos: nada
    // fora da paleta (teste abaixo) e nada na paleta sem uso.
    const usados = new Set(
      Object.values(estilosPdf)
        .flatMap((estilo) => Object.values(estilo as Record<string, unknown>))
        .filter((valor): valor is string => typeof valor === "string")
        .filter((valor) => /^#[0-9a-fA-F]{6}$/.test(valor))
        .map((valor) => valor.toLowerCase()),
    );

    const mortos = Object.entries(PALETA_PDF)
      .filter(([, hex]) => !usados.has(hex.toLowerCase()))
      .map(([nome]) => nome);

    expect(mortos).toEqual([]);
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

  test("o subtítulo é o terceiro nível da hierarquia: menor que o título e de outra cor", () => {
    expect(estilosPdf.subtituloBloco.fontSize).toBeLessThan(
      estilosPdf.tituloBloco.fontSize as number,
    );
    expect(estilosPdf.subtituloBloco.color).not.toBe(estilosPdf.tituloBloco.color);
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
