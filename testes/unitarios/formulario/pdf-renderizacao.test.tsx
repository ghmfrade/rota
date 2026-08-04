import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { Document, Page, pdf, renderToBuffer, Text, View } from "@react-pdf/renderer";
import type { DocumentProps, OnRenderProps } from "@react-pdf/renderer";
import { DocumentoPdfOperacional } from "@/formulario/pdf/documento-pdf-operacional";
import { estilosPdf, PALETA_PDF } from "@/formulario/pdf/estilos-pdf";
import {
  AVISO_SEI,
  montarModeloPdfOperacional,
  ORDEM_BLOCOS,
  ROTULO_FAIXA_TOTAL_AUTOS,
  TITULO_PDF,
  type BlocoItinerario,
  type ModeloPdfOperacional,
} from "@/formulario/pdf/modelo-pdf-operacional";
import { AVISO_GRADE_VAZIA } from "@/formulario/pdf/tabelas-horarias-pdf";
import {
  MARCA_DIAGONAL,
  MARCA_PAR_NAO_HABILITADO,
} from "@/formulario/pdf/matrizes-pdf";
import type { ItemLegendaSecao } from "@/formulario/pdf/legenda-itinerario";
import { esquemaDocumentoOperacao, type DocumentoOperacao } from "@/shared/contrato";
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

// --- Layout REAL (DEC-108 — geometria do rótulo de coluna) ----------------
//
// A árvore de elementos acima (NoPdf) prova ESTRUTURA (quantas células, qual
// estilo), mas não geometria: `transform` não afeta o layout, e uma quebra de
// linha só existe depois que `@react-pdf/layout` mede o texto contra a
// largura disponível — foi assim que o parecer da TASK-034 mediu a quebra do
// cabeçalho diagonal (`docs-dev/14-REVISOES/TASK-034-20260803-correcao.md`,
// problema 1). O layout real só fica disponível no `onRender` do `Document`
// (`_INTERNAL__LAYOUT__DATA_`, interno do `@react-pdf/renderer`), então é
// preciso renderizar de verdade — daí o `pdf(...).toBuffer()`.
interface NoLayout {
  type: string;
  style?: Record<string, unknown>;
  box?: { top: number; left: number; width: number; height: number };
  lines?: { string: string }[];
  children?: NoLayout[];
}

function descendentesLayout(no: NoLayout): NoLayout[] {
  return [no, ...(no.children ?? []).flatMap(descendentesLayout)];
}

interface OnRenderComLayoutReal extends OnRenderProps {
  _INTERNAL__LAYOUT__DATA_?: NoLayout;
}

async function layoutReal(elemento: ReactElement<DocumentProps>): Promise<NoLayout> {
  let layout: NoLayout | undefined;
  const clonado = cloneElement(elemento, {
    onRender: (params: OnRenderComLayoutReal) => {
      layout = params._INTERNAL__LAYOUT__DATA_;
    },
  });
  await pdf(clonado).toBuffer();
  if (layout === undefined) throw new Error("layout real não capturado pelo onRender");
  return layout;
}

async function layoutRealDoDocumento(modelo: ModeloPdfOperacional): Promise<NoLayout> {
  return layoutReal(DocumentoPdfOperacional({ modelo }) as ReactElement<DocumentProps>);
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

  test("o componente emite exatamente as 8 `Page` dos blocos lógicos (§13.3)", () => {
    // Um bloco lógico do §13.1 por `Page`: capa (1), resumo (2), Serviços (3),
    // itinerários (4), tabela horária simples (5), matriz de distâncias (6),
    // matriz de seccionamento (7) e anexo técnico (8) — a TASK-034 acrescentou
    // as quatro últimas. Igualdade exata, não piso: acrescentar ou remover uma
    // `Page` tem de falhar este teste.
    expect(paginasDe(arvoreDo(modeloDe(documentoBidirecionalMultiServico())))).toHaveLength(
      8,
    );
    expect(paginasDe(arvoreDo(modeloDe(documentoUnidirecional())))).toHaveLength(8);
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

/** As `Page` do §13.1, na ordem: 5, 6, 7 e 8 (usada também pelos testes de
 * DEC-108, fora do describe original da TASK-034). */
function paginasDosItens5a8(documento: NoPdf) {
  const paginas = paginasDe(documento);
  return {
    tabelasHorarias: paginas[4],
    matrizDistancias: paginas[5],
    matrizSeccionamento: paginas[6],
    anexo: paginas[7],
  };
}

describe("Itens 5–8 do §13.1 (TASK-034) — tabelas horárias, matrizes e anexo", () => {
  test("a tabela horária do corpo traz as sete colunas de dia e nenhum Local (RN-075/076)", () => {
    const documento = documentoExemploMinimo();
    const local = documento.autos.servicos[0].locais[0];
    const { tabelasHorarias } = paginasDosItens5a8(arvoreDo(modeloDe(documento)));

    const texto = textoDe(tabelasHorarias);
    for (const dia of ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"]) {
      expect(texto).toContain(dia);
    }
    expect(texto).not.toContain(local.nome);
    // Versão simples: só a Seção de partida, nunca as intermediárias (DEC-086).
    expect(texto).toContain("Santos - Terminal Central");
    expect(texto).not.toContain("São Vicente - Terminal Norte");
  });

  test("grade sem Viagem imprime o aviso, em vez de tabela vazia (RN-071)", () => {
    // A Volta da fixture não tem Viagem de feriado.
    const { tabelasHorarias } = paginasDosItens5a8(
      arvoreDo(modeloDe(documentoExemploMinimo())),
    );

    expect(textoDe(tabelasHorarias)).toContain(AVISO_GRADE_VAZIA);
  });

  test("as duas matrizes saem triangulares, com 'X' na diagonal (§9)", () => {
    const { matrizDistancias, matrizSeccionamento } = paginasDosItens5a8(
      arvoreDo(modeloDe(documentoExemploMinimo())),
    );

    for (const pagina of [matrizDistancias, matrizSeccionamento]) {
      const diagonais = descendentes(pagina).filter(
        (no) =>
          no.props.style === estilosPdf.celulaMatrizDiagonal ||
          // Variante com régua à direita: a diagonal da última linha do bloco,
          // que fecha a escada por não ter preenchimento à direita (DEC-110).
          no.props.style === estilosPdf.celulaMatrizDiagonalFinal,
      );
      // 3 Seções → 3 células de diagonal por matriz.
      expect(diagonais).toHaveLength(3);
      for (const diagonal of diagonais) expect(textoDe(diagonal)).toBe(MARCA_DIAGONAL);
    }
  });

  test("só a matriz de seccionamento usa o travessão de par não habilitado", () => {
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].matriz_seccionamento = [];
    const { matrizDistancias, matrizSeccionamento } = paginasDosItens5a8(
      arvoreDo(modeloDe(documento)),
    );

    expect(textoDe(matrizSeccionamento)).toContain(MARCA_PAR_NAO_HABILITADO);
    // A matriz de distâncias é a distância real do trecho: nunca "—".
    expect(textoDe(matrizDistancias)).not.toContain(MARCA_PAR_NAO_HABILITADO);
    // A unidade agora vive só no título do bloco (DEC-107), não mais na célula.
    expect(textoDe(matrizDistancias)).toContain("km");
  });

  test("DEC-108 — geometria: toda linha de dados de cada bloco tem o mesmo número de filhos da linha de cabeçalho", () => {
    const { matrizDistancias, matrizSeccionamento } = paginasDosItens5a8(
      arvoreDo(modeloDe(documentoExemploMinimo())),
    );

    for (const pagina of [matrizDistancias, matrizSeccionamento]) {
      const linhasCabecalho = descendentes(pagina).filter(
        (no) => no.props.style === estilosPdf.linhaCabecalhoMatriz,
      );
      expect(linhasCabecalho.length).toBeGreaterThan(0);

      for (const linhaCabecalho of linhasCabecalho) {
        // Filhos diretos: a célula vazia do canto + uma coluna por cabeçalho.
        const numeroDeColunas = linhaCabecalho.filhos.length;
        const tabela = descendentes(pagina).find((no) => no.filhos.includes(linhaCabecalho));
        if (tabela === undefined) throw new Error("tabela não encontrada");
        const linhasDeDados = tabela.filhos.filter((filho) => filho !== linhaCabecalho);
        expect(linhasDeDados.length).toBeGreaterThan(0);
        for (const linhaDeDados of linhasDeDados) {
          expect(linhaDeDados.filhos).toHaveLength(numeroDeColunas);
        }
      }
    }
  });

  test("caso inválido — uma linha triangular sintética (sem preenchimento) é acusada pela mesma varredura", () => {
    // Poder de detecção: a asserção acima não passa vacuamente. Uma "tabela"
    // sintética em que a linha 2 só tem 2 células (o modo de falha original,
    // reprovado no parecer da TASK-034) é detectada.
    const cabecalho: NoPdf = { tipo: "VIEW", props: {}, filhos: [{} as NoPdf, {} as NoPdf, {} as NoPdf] };
    const linhaTriangular: NoPdf = { tipo: "VIEW", props: {}, filhos: [{} as NoPdf, {} as NoPdf] };
    const tabela: NoPdf = { tipo: "VIEW", props: {}, filhos: [cabecalho, linhaTriangular] };

    const linhasDeDados = tabela.filhos.filter((filho) => filho !== cabecalho);
    expect(linhasDeDados.some((linha) => linha.filhos.length !== cabecalho.filhos.length)).toBe(
      true,
    );
  });

  test("DEC-107 — célula empilhada: Serviço bidirecional traz `I:` e `V:` em `Text` separados, com o estilo do detalhe", () => {
    const { matrizDistancias } = paginasDosItens5a8(
      arvoreDo(modeloDe(documentoExemploMinimo())),
    );

    const detalhes = descendentes(matrizDistancias).filter(
      (no) => no.tipo === "TEXT" && no.props.style === estilosPdf.detalheMatriz,
    );
    expect(detalhes.length).toBeGreaterThan(0);
    expect(detalhes.some((no) => textoDe(no).startsWith("I: "))).toBe(true);
    expect(detalhes.some((no) => textoDe(no).startsWith("V: "))).toBe(true);
    // Nunca na mesma linha de texto (D3 — sem "Ida ... · Volta ...").
    for (const detalhe of detalhes) {
      expect(textoDe(detalhe)).not.toContain("·");
    }
  });

  test("caso inválido — documento unidirecional não tem `I:`/`V:`, e nenhuma matriz usa a palavra 'Média'", () => {
    const { matrizDistancias, matrizSeccionamento } = paginasDosItens5a8(
      arvoreDo(modeloDe(documentoUnidirecional())),
    );

    for (const pagina of [matrizDistancias, matrizSeccionamento]) {
      const texto = textoDe(pagina);
      expect(texto).not.toContain("I: ");
      expect(texto).not.toContain("V: ");
      expect(texto).not.toContain("Média");
      expect(texto).not.toContain("média");
    }
  });

  test("DEC-107 — unidade: os títulos das matrizes trazem '(km)'; caso inválido: nenhuma célula de matriz contém 'km'", () => {
    const documento = documentoExemploMinimo();
    const paginas = paginasDosItens5a8(arvoreDo(modeloDe(documento)));

    expect(textoDe(paginas.matrizDistancias)).toContain("Matriz de distâncias (km)");
    expect(textoDe(paginas.matrizSeccionamento)).toContain("Matriz de seccionamento (km)");

    for (const pagina of [paginas.matrizDistancias, paginas.matrizSeccionamento]) {
      const celulas = descendentes(pagina).filter(
        (no) =>
          no.props.style === estilosPdf.celulaMatrizValor ||
          no.props.style === estilosPdf.celulaMatrizValorFinal ||
          no.props.style === estilosPdf.celulaMatrizDiagonal ||
          no.props.style === estilosPdf.celulaMatrizDiagonalFinal ||
          no.props.style === estilosPdf.celulaMatrizVazia ||
          no.props.style === estilosPdf.celulaMatrizVaziaBorda,
      );
      expect(celulas.length).toBeGreaterThan(0);
      for (const celula of celulas) {
        expect(textoDe(celula)).not.toContain("km");
      }
    }
  });

  test("o anexo traz a versão detalhada e a relação de Locais com o `n.m` (§13.1 item 8)", () => {
    const documento = documentoExemploMinimo();
    const local = documento.autos.servicos[0].locais[0];
    const { anexo } = paginasDosItens5a8(arvoreDo(modeloDe(documento)));

    const texto = textoDe(anexo);
    // (a) detalhada: as Seções intermediárias, ausentes do corpo, aparecem aqui.
    expect(texto).toContain("São Vicente - Terminal Norte");
    // (b) Locais com identificador e município, sem horário de passagem.
    expect(texto).toContain(local.nome);
    expect(texto).toContain("2.1");
    expect(texto).toContain(local.municipio);
  });
});

describe("DEC-108 — rótulo de coluna horizontal no triângulo superior (substitui o cabeçalho diagonal da DEC-107 item 1)", () => {
  test("nenhum nó do documento usa `transform` — o cabeçalho diagonal da DEC-107 item 1 não sobrevive", () => {
    const documento = arvoreDo(modeloDe(documentoBidirecionalMultiServico()));

    for (const no of descendentes(documento)) {
      const style = no.props.style;
      const estilos = Array.isArray(style) ? style : [style];
      for (const estilo of estilos) {
        if (estilo !== null && typeof estilo === "object") {
          expect("transform" in (estilo as Record<string, unknown>)).toBe(false);
        }
      }
    }
  });

  test("'Origem/Destino' não aparece mais no canto das matrizes (a imagem de referência dispensa o rótulo)", () => {
    const { matrizDistancias, matrizSeccionamento } = paginasDosItens5a8(
      arvoreDo(modeloDe(documentoExemploMinimo())),
    );

    expect(textoDe(matrizDistancias)).not.toContain("Origem/Destino");
    expect(textoDe(matrizSeccionamento)).not.toContain("Origem/Destino");
  });

  test(
    "layout real — todo rótulo de coluna das duas matrizes sai em uma única linha, sem quebra (o defeito que reprovou a DEC-107 item 1)",
    async () => {
      const layout = await layoutRealDoDocumento(modeloDe(documentoExemploMinimo()));
      const rotulos = descendentesLayout(layout).filter(
        (no) =>
          no.type === "TEXT" &&
          no.style?.fontSize === 7 &&
          no.style?.width === estilosPdf.rotuloColunaMatriz.width,
      );

      // 3 Seções × 2 matrizes (distâncias + seccionamento) = 6 rótulos de coluna.
      expect(rotulos).toHaveLength(6);
      for (const rotulo of rotulos) {
        expect(rotulo.lines).toHaveLength(1);
      }
    },
    30_000,
  );

  test(
    "caso inválido — o mesmo rótulo, forçado a caber nos 38 pt de uma coluna, quebra em várias linhas (poder de detecção do layout real)",
    async () => {
      // Prova que a medição acima ACUSARIA a quebra se ela existisse — é a
      // mesma técnica que produziu a evidência do parecer da TASK-034
      // (`docs-dev/14-REVISOES/TASK-034-20260803-correcao.md`, problema 1):
      // "Praia Grande - Rodoviária Praia Grande" (38 caracteres) quebra em
      // várias linhas quando medido contra 38 pt, e sai numa só linha contra
      // os 150 pt de `rotuloColunaMatriz` (teste acima).
      const layout = await layoutReal(
        <Document>
          <Page size="A4">
            <View style={{ width: 38 }}>
              <Text style={{ fontSize: 7 }}>
                Praia Grande - Rodoviária Praia Grande
              </Text>
            </View>
          </Page>
        </Document>,
      );
      const texto = descendentesLayout(layout).find((no) => no.type === "TEXT");

      expect(texto?.lines?.length).toBeGreaterThan(1);
    },
    30_000,
  );

  test("integridade de página — a matriz de cada Serviço fica sob um envelope `wrap={false}` que contém o(s) bloco(s), também `wrap={false}` (DEC-108 item 5)", () => {
    const modelo = modeloDe(documentoBidirecionalMultiServico());
    const { matrizDistancias } = paginasDosItens5a8(arvoreDo(modelo));

    function envolveBlocoIntegro(no: NoPdf): boolean {
      return (
        no.tipo === "VIEW" &&
        no.props.wrap === false &&
        no.filhos.some(
          (filho) =>
            filho.tipo === "VIEW" &&
            filho.props.wrap === false &&
            descendentes(filho).some((d) => d.props.style === estilosPdf.tabelaMatriz),
        )
      );
    }

    const envelopes = descendentes(matrizDistancias).filter(envolveBlocoIntegro);

    // Um envelope por Serviço (fixture multi-Serviço) — nunca um único
    // `wrap={false}` para o documento inteiro nem a ausência dele.
    expect(envelopes).toHaveLength(modelo.matrizesDistancias.length);
    expect(envelopes.length).toBeGreaterThan(1);
  });
});

// Rodada de correção da TASK-128 (parecer `TASK-034-20260803-task-128.md`,
// problemas 2 a 5), sob a DEC-110: acabamento da matriz contra a imagem
// normativa `docs-dev/tabela distancias PDF.jpg`.
describe("DEC-110 — acabamento da matriz: réguas verticais, ancoragem do rótulo e centragem", () => {
  /** Documento da fixture mínima com uma Seção de nome longo — o caso que o
   *  parecer apontou como fronteira não guardada (problema 5). */
  function documentoComSecaoDeNomeLongo() {
    const documento = documentoExemploMinimo();
    documento.autos.secoes[1].municipio = "São José do Rio Preto";
    documento.autos.secoes[1].nome = "Terminal Rodoviário Central Metropolitano";
    return documento;
  }

  test("as réguas verticais são desenhadas em `CINZA_500`, distintas do `CINZA_200` dos separadores horizontais", () => {
    for (const estilo of [
      estilosPdf.celulaMatrizValor,
      estilosPdf.celulaMatrizValorFinal,
      estilosPdf.celulaMatrizDiagonal,
      estilosPdf.celulaMatrizDiagonalFinal,
      estilosPdf.celulaMatrizVaziaBorda,
    ]) {
      expect(estilo.borderLeftWidth).toBe(1);
      expect(estilo.borderLeftColor).toBe(PALETA_PDF.cinza500);
    }
    // Preenchimento comum do triângulo superior segue SEM régua: na imagem
    // normativa o vazio à direita dos rótulos não é quadriculado.
    expect(estilosPdf.celulaMatrizVazia).not.toHaveProperty("borderLeftWidth");
    // Caso inválido — a régua não pode vazar para a tabela de Locais do anexo,
    // que a task manda não tocar.
    expect(estilosPdf.celulaMatriz).not.toHaveProperty("borderLeftWidth");
    expect(estilosPdf.celulaCabecalhoMatriz).not.toHaveProperty("borderLeftWidth");
  });

  test("toda célula habitada da matriz recebe régua, e a escada é fechada à direita da última", () => {
    const { matrizDistancias } = paginasDosItens5a8(
      arvoreDo(modeloDe(documentoExemploMinimo())),
    );
    const estilosComRegua = new Set<unknown>([
      estilosPdf.celulaMatrizValor,
      estilosPdf.celulaMatrizValorFinal,
      estilosPdf.celulaMatrizDiagonal,
      estilosPdf.celulaMatrizDiagonalFinal,
      estilosPdf.celulaMatrizVaziaBorda,
    ]);
    const habitadas = descendentes(matrizDistancias).filter(
      (no) =>
        no.props.style === estilosPdf.celulaMatrizValor ||
        no.props.style === estilosPdf.celulaMatrizValorFinal ||
        no.props.style === estilosPdf.celulaMatrizDiagonal ||
        no.props.style === estilosPdf.celulaMatrizDiagonalFinal,
    );

    // 3 Seções → 3 valores (pares 1-0, 2-0, 2-1) + 3 diagonais.
    expect(habitadas).toHaveLength(6);
    for (const celula of habitadas) expect(estilosComRegua.has(celula.props.style)).toBe(true);

    // A escada é fechada: a última linha (sem preenchimento à direita) usa a
    // variante com régua também à direita.
    expect(
      descendentes(matrizDistancias).filter(
        (no) => no.props.style === estilosPdf.celulaMatrizDiagonalFinal,
      ).length,
    ).toBeGreaterThan(0);
    // E o degrau seguinte, quando existe, é o preenchimento que hospeda rótulo.
    expect(
      descendentes(matrizDistancias).filter(
        (no) => no.props.style === estilosPdf.celulaMatrizVaziaBorda,
      ).length,
    ).toBeGreaterThan(0);
  });

  test(
    "layout real — o rótulo de coluna fica rente ao seu próprio 'X', no rodapé da célula hospedeira (não mais no topo)",
    async () => {
      // As caixas do `_INTERNAL__LAYOUT__DATA_` são RELATIVAS ao pai; a
      // ancoragem se lê, portanto, como "a base do rótulo coincide com a base
      // da célula que o hospeda". O "X" da coluna está na linha imediatamente
      // abaixo, logo essa coincidência é o "rente ao próprio X" da imagem
      // normativa.
      const layout = await layoutRealDoDocumento(modeloDe(documentoExemploMinimo()));
      const hospedeiras = descendentesLayout(layout).filter((no) =>
        (no.children ?? []).some(
          (filho) =>
            filho.type === "TEXT" &&
            filho.style?.width === estilosPdf.rotuloColunaMatriz.width,
        ),
      );

      // 3 Seções × 2 matrizes: 2 rótulos hospedados no triângulo + 1 na linha
      // de cabeçalho, por matriz.
      expect(hospedeiras).toHaveLength(6);
      for (const hospedeira of hospedeiras) {
        const rotulo = (hospedeira.children ?? []).find((filho) => filho.type === "TEXT");
        if (hospedeira.box === undefined || rotulo?.box === undefined) {
          throw new Error("rótulo de coluna sem caixa de layout");
        }
        expect(
          Math.abs(rotulo.box.top + rotulo.box.height - hospedeira.box.height),
        ).toBeLessThan(0.5);
      }

      // O caso que o parecer mediu: a célula do par bidirecional tem 23,1 pt
      // (valor + `I:` + `V:`), e com `top: 0` o rótulo ficava a 22,4 pt do
      // próprio "X". Se ele não estiver aqui, o teste perdeu o poder de
      // detecção.
      expect(hospedeiras.some((no) => (no.box?.height ?? 0) > 20)).toBe(true);
    },
    30_000,
  );

  test(
    "layout real — nome de Seção longo: o rótulo de coluna continua em UMA linha (truncado, nunca quebrado)",
    async () => {
      const layout = await layoutRealDoDocumento(modeloDe(documentoComSecaoDeNomeLongo()));
      const rotulos = descendentesLayout(layout).filter(
        (no) =>
          no.type === "TEXT" &&
          no.style?.fontSize === 7 &&
          no.style?.width === estilosPdf.rotuloColunaMatriz.width,
      );

      expect(rotulos).toHaveLength(6);
      for (const rotulo of rotulos) {
        expect(rotulo.lines).toHaveLength(1);
      }
      // A garantia não vem da largura (o contrato não limita o nome da Seção),
      // e sim do truncamento declarado no estilo — sem ele, este mesmo nome
      // ("São José do Rio Preto - Terminal Rodoviário Central Metropolitano",
      // 162,3 pt medidos a 7 pt) quebraria nos 117 pt da caixa.
      expect(estilosPdf.rotuloColunaMatriz.maxLines).toBe(1);
      expect(estilosPdf.rotuloColunaMatriz.textOverflow).toBe("ellipsis");
    },
    30_000,
  );

  test(
    "layout real — o rótulo de linha é centrado verticalmente na linha da matriz e cabe em uma linha",
    async () => {
      const layout = await layoutRealDoDocumento(modeloDe(documentoExemploMinimo()));
      const caixasDeRotulo = descendentesLayout(layout).filter(
        (no) =>
          no.type === "VIEW" && no.style?.width === estilosPdf.cabecalhoLinhaMatriz.width,
      );

      const comTexto = caixasDeRotulo.filter((caixa) =>
        (caixa.children ?? []).some((filho) => filho.type === "TEXT"),
      );
      expect(comTexto.length).toBeGreaterThan(0);

      for (const caixa of comTexto) {
        const texto = (caixa.children ?? []).find((filho) => filho.type === "TEXT");
        if (caixa.box === undefined || texto?.box === undefined) {
          throw new Error("rótulo de linha sem caixa de layout");
        }
        // Caixas relativas ao pai: o centro da caixa do rótulo é `height / 2`.
        const centroDaCaixa = caixa.box.height / 2;
        const centroDoTexto = texto.box.top + texto.box.height / 2;
        expect(Math.abs(centroDoTexto - centroDaCaixa)).toBeLessThan(0.5);
        // 170 pt (DEC-110 item 2): o nome mais longo da fixture, "Praia Grande
        // - Rodoviária Praia Grande" (160,2 pt a 9 pt), cabe em uma linha.
        expect(texto.lines).toHaveLength(1);
      }
    },
    30_000,
  );
});

describe("Legenda do itinerário (DEC-105/TASK-127)", () => {
  test("cada bloco de itinerário renderiza a legenda com o rótulo e o nome de cada Seção", () => {
    const modelo = modeloDe(documentoBidirecionalMultiServico());
    const documento = arvoreDo(modelo);
    const paginaItinerarios = paginasDe(documento)[3];
    const texto = textoDe(paginaItinerarios);

    for (const bloco of modelo.itinerarios) {
      for (const item of bloco.legendaSecoes) {
        expect(texto).toContain(item.rotulo);
        expect(texto).toContain(item.nome);
      }
    }
  });

  test("a legenda é renderizada mesmo SEM imagem de mapa — DEC-104 não bloqueia a legenda", () => {
    // Nenhuma fixture destes testes passa `obterImagemDoItinerario`: todo
    // bloco já sai sem `imagemMapa`, e ainda assim a legenda aparece — é a
    // mesma tolerância a falha de captura da DEC-104.
    const modelo = modeloDe(documentoUnidirecional());
    expect(modelo.itinerarios.every((i) => i.imagemMapa === undefined)).toBe(true);
    expect(modelo.itinerarios.every((i) => i.legendaSecoes.length > 0)).toBe(true);

    const paginaItinerarios = paginasDe(arvoreDo(modelo))[3];
    expect(textoDe(paginaItinerarios)).toContain(modelo.itinerarios[0].legendaSecoes[0].nome);
  });

  test("nenhum nome de Local aparece na legenda", () => {
    // Renomeia o Local já existente na fixture canônica (exemplo mínimo da
    // Spec 02 §15, que tem Seção → Seção → Local → Seção na Ida) e revalida
    // por `esquemaDocumentoOperacao.parse` — o documento sob teste é
    // comprovadamente válido, ao contrário de inserir campo à mão.
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].locais[0].nome = "Local Que Não Pode Vazar";
    const validado = esquemaDocumentoOperacao.parse(documento);

    const modelo = montarModeloPdfOperacional(validado, {
      geradoEm: new Date(2026, 6, 31, 14, 5),
    });
    const paginaItinerarios = paginasDe(arvoreDo(modelo))[3];

    expect(textoDe(paginaItinerarios)).not.toContain("Local Que Não Pode Vazar");
  });
});

// TASK-129/DEC-109/DEC-111 — mapa antes da lista numerada, sem a sequência de
// Seções ligada por seta, colunas a partir de 12 Seções e a ordem de
// sacrifício quando o trio título+mapa+lista não cabe na página.

// PNG 1×1 real (não um placeholder de string) — o layout REAL do @react-pdf
// decodifica a imagem para calcular `objectFit`, então um data-URI inválido
// quebraria `pdf(...).toBuffer()`. O teste de largura só depende da largura
// do nó, não da proporção real de uma captura de mapa.
const IMAGEM_MAPA_TESTE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function modeloComImagem(documento: DocumentoOperacao): ModeloPdfOperacional {
  return montarModeloPdfOperacional(esquemaDocumentoOperacao.parse(documento), {
    geradoEm: new Date(2026, 6, 31, 14, 5),
    obterImagemDoItinerario: () => IMAGEM_MAPA_TESTE,
  });
}

// `DocumentoPdfOperacional` é componente burro (só desenha o `ModeloPdfOperacional`
// que recebe — comentário no topo de `documento-pdf-operacional.tsx`): construir
// o modelo à mão, com uma legenda sintética grande, exercita a divisão em
// colunas e a escada de acomodação (DEC-111) sem depender de um Autos válido
// com dezenas de Seções e todos os pares da matriz (RN-054) — mesmo precedente
// de `matrizSintetica` em `pdf-matrizes.test.ts`.
function legendaSintetica(quantidade: number): ItemLegendaSecao[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    rotulo: `${i + 1}º`,
    nome: `Cidade ${i} - Seção ${i}`,
  }));
}

function blocoItinerarioSintetico(quantidadeSecoes: number): BlocoItinerario {
  return {
    servicoUuid: "servico-sintetico",
    sentido: "ida",
    titulo: "Serviço SINT-1 — Ida",
    descricaoTexto: "Cidade 0 - Seção 0, Rua Sintética, Cidade 1 - Seção 1.",
    descricaoItens: [],
    legendaSecoes: legendaSintetica(quantidadeSecoes),
    identificadoresLocais: [],
  };
}

function modeloComItinerarioSintetico(quantidadeSecoes: number): ModeloPdfOperacional {
  return {
    ordemBlocos: ORDEM_BLOCOS,
    capa: {
      titulo: TITULO_PDF,
      codigo: "0000",
      empresa: "Empresa Sintética",
      tipo: "intermunicipal",
      status: "proposta",
      rotuloData: "Data de criação",
      data: "01/07/2026",
    },
    resumo: {
      rotuloSemanaPadrao: "semana padrão (sem feriados nem operação excepcional)",
      porServico: [],
      totalViagensSemana: 0,
      totalOpcoesDeslocamento: 0,
      porFaixa: [],
      porFaixaPorServico: [],
    },
    servicos: [],
    itinerarios: [blocoItinerarioSintetico(quantidadeSecoes)],
    tabelasHorarias: [],
    matrizesDistancias: [],
    matrizesSeccionamento: [],
    anexoTecnico: { tabelasDetalhadas: [], locaisPorItinerario: [] },
    rodape: { versaoSchema: "1.1", geradoEm: "31/07/2026 14:05", aviso: AVISO_SEI },
  };
}

describe("DEC-109/DEC-111 — bloco de itinerário: mapa primeiro, lista numerada, sem seta", () => {
  test("ordem exata dos filhos do bloco: título → mapa/aviso → lista numerada → descrição", () => {
    const modelo = modeloDe(documentoBidirecionalMultiServico());
    const paginaItinerarios = paginasDe(arvoreDo(modelo))[3];
    const texto = textoDe(paginaItinerarios);
    const bloco = modelo.itinerarios[0];

    const posTitulo = texto.indexOf(bloco.titulo);
    const posAviso = texto.indexOf("Imagem do mapa indisponível");
    const posLegenda = texto.indexOf(bloco.legendaSecoes[0].nome);
    // O último item da legenda é o fim da lista numerada: a descrição (que
    // repete nomes de Seção como marcos — §13.4) só pode ser buscada DEPOIS
    // dele, senão a primeira ocorrência encontrada é a da própria legenda.
    const ultimoItemLegenda = bloco.legendaSecoes[bloco.legendaSecoes.length - 1];
    const posUltimoItemLegenda = texto.indexOf(ultimoItemLegenda.nome, posLegenda);
    const posDescricao = texto.indexOf(
      bloco.descricaoTexto.slice(0, 20),
      posUltimoItemLegenda + ultimoItemLegenda.nome.length,
    );

    expect(posTitulo).toBeGreaterThanOrEqual(0);
    // Nenhuma fixture destes testes passa `obterImagemDoItinerario`: o aviso
    // da DEC-104 ocupa o lugar da imagem, na mesma posição da ordem (b).
    expect(posAviso).toBeGreaterThan(posTitulo);
    expect(posLegenda).toBeGreaterThan(posAviso);
    expect(posDescricao).toBeGreaterThan(posUltimoItemLegenda);
  });

  test("a sequência de Seções ligada por seta não aparece em nenhuma página", () => {
    const documento = arvoreDo(modeloDe(documentoBidirecionalMultiServico()));
    for (const pagina of paginasDe(documento)) {
      expect(textoDe(pagina)).not.toContain(" → ");
    }
  });

  test("caso inválido — a mesma varredura detectaria a seta se ela ainda existisse", () => {
    // Prova de poder de detecção: um nó de texto com seta, se existisse na
    // árvore, seria pego pela mesma asserção acima.
    const paginaComSeta: NoPdf = {
      tipo: "PAGE",
      props: {},
      filhos: [{ tipo: "#texto", props: { valor: "Cidade A → Cidade B" }, filhos: [] }],
    };
    expect(textoDe(paginaComSeta)).toContain(" → ");
  });

  test("sem imagem de mapa: o aviso da DEC-104 aparece, e a ordem título → aviso → lista é preservada", () => {
    const modelo = modeloDe(documentoUnidirecional());
    expect(modelo.itinerarios.every((i) => i.imagemMapa === undefined)).toBe(true);

    const texto = textoDe(paginasDe(arvoreDo(modelo))[3]);
    const bloco = modelo.itinerarios[0];

    expect(texto).toContain("Imagem do mapa indisponível para este itinerário.");
    expect(texto.indexOf(bloco.titulo)).toBeLessThan(
      texto.indexOf("Imagem do mapa indisponível"),
    );
    expect(texto.indexOf("Imagem do mapa indisponível")).toBeLessThan(
      texto.indexOf(bloco.legendaSecoes[0].nome),
    );
  });

  test(
    "layout real — a imagem do mapa ocupa a largura útil da página (DEC-109 item 3)",
    async () => {
      const layout = await layoutRealDoDocumento(modeloComImagem(documentoExemploMinimo()));
      const paginas = descendentesLayout(layout).filter((no) => no.type === "PAGE");
      const imagens = descendentesLayout(layout).filter((no) => no.type === "IMAGE");

      expect(paginas.length).toBeGreaterThan(0);
      expect(imagens.length).toBeGreaterThan(0);

      const larguraUtil =
        (paginas[0].box?.width ?? 0) - 2 * (estilosPdf.pagina.paddingHorizontal as number);

      for (const imagem of imagens) {
        expect(imagem.box?.width).toBeCloseTo(larguraUtil, 1);
      }
    },
    30_000,
  );

  test("título + mapa + lista numerada saem no mesmo envelope `wrap={false}` quando a unidade é íntegra", () => {
    const documento = arvoreDo(modeloComItinerarioSintetico(3));
    const paginaItinerarios = paginasDe(documento)[3];
    const blocoItinerario = paginaItinerarios.filhos.find((filho) => filho.props.break === false);
    expect(blocoItinerario).toBeDefined();

    const unidade = blocoItinerario?.filhos.find((filho) => filho.props.wrap === false);
    expect(unidade).toBeDefined();
    // A lista numerada (rótulo "1º") está DENTRO do envelope inquebrável.
    expect(textoDe(unidade as NoPdf)).toContain("1º");
  });

  test("com 12 Seções ou mais, a lista numerada divide em duas colunas (DEC-111 item 1)", () => {
    const documento = arvoreDo(modeloComItinerarioSintetico(12));
    const paginaItinerarios = paginasDe(documento)[3];
    const colunas = descendentes(paginaItinerarios).filter(
      (no) => no.props.style === estilosPdf.legendaColuna,
    );

    expect(colunas).toHaveLength(2);
    expect(textoDe(colunas[0])).not.toContain("7º");
    expect(textoDe(colunas[0])).toContain("6º");
    expect(textoDe(colunas[1])).toContain("7º");
    expect(textoDe(colunas[1])).not.toContain("6º");
  });

  test("com menos de 12 Seções, a lista numerada permanece em uma única coluna", () => {
    const documento = arvoreDo(modeloComItinerarioSintetico(11));
    const paginaItinerarios = paginasDe(documento)[3];
    const colunas = descendentes(paginaItinerarios).filter(
      (no) => no.props.style === estilosPdf.legendaColuna,
    );

    expect(colunas).toHaveLength(0);
  });

  test("DEC-111 item 4-ii — quando o trio não cabe nem em duas colunas, a lista sai do envelope inquebrável (não corta em silêncio)", () => {
    // 39 Seções sintéticas: acima do ponto em que `calcularAcomodacaoItinerario`
    // (parâmetros padrão) deixa de caber como unidade única, mesmo em duas
    // colunas (ver `pdf-legenda-itinerario.test.ts`).
    const documento = arvoreDo(modeloComItinerarioSintetico(39));
    const paginaItinerarios = paginasDe(documento)[3];
    const blocoItinerario = paginaItinerarios.filhos.find((filho) => filho.props.break === false);
    expect(blocoItinerario).toBeDefined();

    const unidade = blocoItinerario?.filhos.find((filho) => filho.props.wrap === false);
    expect(unidade).toBeDefined();
    // O título e o aviso de mapa continuam no envelope inquebrável...
    expect(textoDe(unidade as NoPdf)).toContain("Serviço SINT-1");
    // ...mas a lista numerada não: nenhum item aparece dentro dele.
    expect(textoDe(unidade as NoPdf)).not.toContain("1º");
    // A lista aparece em algum lugar do bloco, fora do envelope.
    expect(textoDe(blocoItinerario as NoPdf)).toContain("1º");
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
