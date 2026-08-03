import { describe, expect, test } from "vitest";
import {
  ALTURA_MAX_CABECALHO,
  dividirMatrizEmBlocos,
  MARCA_DIAGONAL,
  MARCA_PAR_NAO_HABILITADO,
  MAX_COLUNAS_POR_BLOCO,
  MAX_LINHAS_POR_BLOCO,
  montarMatrizesDistancias,
  montarMatrizesSeccionamento,
  type CabecalhoMatriz,
  type MatrizPdf,
} from "@/formulario/pdf/matrizes-pdf";
import { esquemaDocumentoOperacao, type DocumentoOperacao } from "@/shared/contrato";
import { documentoExemploMinimo, documentoUnidirecional } from "../../fixtures";

// TASK-034 — matrizes do PDF (§13.1 itens 6 e 7; §9.1/§9.2; RN-054/056/058/059/076).
// Categoria 7 de `docs-dev/08-TEST_STRATEGY.md`.
//
// A diferença central entre as duas matrizes está travada aqui: a de
// DISTÂNCIAS não tem "—" (é a distância real do trecho, e a RN-054 garante
// entrada para toda combinação de Seções atendidas); a de SECCIONAMENTO tem,
// porque ali a ausência significa "par não comprável".

function validar(documento: DocumentoOperacao): DocumentoOperacao {
  return esquemaDocumentoOperacao.parse(documento);
}

describe("§9.1/§9.2 — forma triangular inferior comum às duas matrizes", () => {
  test("a linha i tem i+1 células e a última é sempre a diagonal 'X'", () => {
    const documento = validar(documentoExemploMinimo());
    const matrizes = [
      ...montarMatrizesDistancias(documento),
      ...montarMatrizesSeccionamento(documento),
    ];

    expect(matrizes.length).toBeGreaterThan(0);
    for (const matriz of matrizes) {
      matriz.linhas.forEach((linha, indice) => {
        expect(linha.celulas).toHaveLength(indice + 1);
        expect(linha.celulas[indice].tipo).toBe("diagonal");
        expect(linha.celulas[indice].texto).toBe(MARCA_DIAGONAL);
      });
    }
  });

  test("cabeçalhos no padrão `Cidade - Nome da Seção` (RN-076)", () => {
    const documento = validar(documentoExemploMinimo());
    const nomesValidos = documento.autos.secoes.map((s) => `${s.municipio} - ${s.nome}`);

    for (const matriz of montarMatrizesDistancias(documento)) {
      for (const cabecalho of matriz.cabecalhos) {
        expect(nomesValidos).toContain(cabecalho.rotulo);
      }
      expect(matriz.linhas.map((l) => l.rotulo)).toEqual(
        matriz.cabecalhos.map((c) => c.rotulo),
      );
    }
  });
});

describe("§9.1 — matriz de distâncias: sem '—', valores em km", () => {
  test("toda célula fora da diagonal traz o valor adotado em km", () => {
    const matriz = montarMatrizesDistancias(validar(documentoExemploMinimo()))[0];

    const foraDaDiagonal = matriz.linhas.flatMap((linha, indice) =>
      linha.celulas.filter((_, indiceCelula) => indiceCelula !== indice),
    );
    expect(foraDaDiagonal.length).toBe(3); // 3 Seções → 3 pares (RN-054)
    for (const celula of foraDaDiagonal) {
      expect(celula.tipo).toBe("valor");
      // DEC-107 (correção da TASK-034) — sem sufixo " km": a unidade passou
      // para o título do bloco no PDF.
      expect(celula.texto).toMatch(/^\d+,\d{2}$/);
    }
  });

  test("nenhuma célula da matriz de distâncias usa o travessão do seccionamento", () => {
    const matriz = montarMatrizesDistancias(validar(documentoExemploMinimo()))[0];
    const textos = matriz.linhas.flatMap((linha) => linha.celulas.map((c) => c.texto));

    expect(textos).not.toContain(MARCA_PAR_NAO_HABILITADO);
  });

  test("RN-056 — Serviço bidirecional traz o detalhe Ida/Volta na célula", () => {
    const matriz = montarMatrizesDistancias(validar(documentoExemploMinimo()))[0];
    const celula = matriz.linhas[1].celulas[0];

    expect(celula).toEqual({
      tipo: "valor",
      texto: "8,00",
      detalheIda: "8,00",
      detalheVolta: "8,00",
    });
  });

  test("RN-056 — Serviço unidirecional não tem detalhe Ida/Volta, só o valor único", () => {
    const matriz = montarMatrizesDistancias(validar(documentoUnidirecional()))[0];
    const foraDaDiagonal = matriz.linhas.flatMap((linha, indice) =>
      linha.celulas.filter((_, indiceCelula) => indiceCelula !== indice),
    );

    expect(foraDaDiagonal.length).toBeGreaterThan(0);
    for (const celula of foraDaDiagonal) {
      expect(celula).not.toHaveProperty("detalheIda");
      expect(celula).not.toHaveProperty("detalheVolta");
    }
  });

  test("caso inválido — par ausente na matriz congelada fica vazio, sem valor inventado nem '—'", () => {
    // Documento que a validação estrutural recusa (RN-054 exige todas as
    // combinações): o PDF não pode preencher o buraco por conta própria.
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].matriz_distancias =
      documento.autos.servicos[0].matriz_distancias.slice(0, 2);

    const matriz = montarMatrizesDistancias(documento)[0];
    const semEntrada = matriz.linhas
      .flatMap((linha) => linha.celulas)
      .filter((celula) => celula.tipo === "sem-entrada");

    expect(semEntrada).toHaveLength(1);
    expect(semEntrada[0].texto).toBe("");
  });
});

describe("§9.2 — matriz de seccionamento: '—' nos pares não habilitados", () => {
  test("par habilitado traz a distância confirmada em km", () => {
    const matriz = montarMatrizesSeccionamento(validar(documentoExemploMinimo()))[0];
    const celula = matriz.linhas[1].celulas[0];

    expect(celula).toEqual({ tipo: "valor", texto: "8,00" });
  });

  test("sem nenhum par habilitado, todo o triângulo vira travessão (RN-058)", () => {
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].matriz_seccionamento = [];

    const matriz = montarMatrizesSeccionamento(validar(documento))[0];
    const foraDaDiagonal = matriz.linhas.flatMap((linha, indice) =>
      linha.celulas.filter((_, indiceCelula) => indiceCelula !== indice),
    );

    expect(foraDaDiagonal.length).toBe(3);
    for (const celula of foraDaDiagonal) {
      expect(celula.tipo).toBe("nao-habilitado");
      expect(celula.texto).toBe(MARCA_PAR_NAO_HABILITADO);
    }
  });

  test("par habilitado é reconhecido independentemente da ordem das Seções no JSON", () => {
    const documento = documentoExemploMinimo();
    const par = documento.autos.servicos[0].matriz_seccionamento[0];
    documento.autos.servicos[0].matriz_seccionamento = [
      { ...par, secao_a_uuid: par.secao_b_uuid, secao_b_uuid: par.secao_a_uuid },
    ];

    const matriz = montarMatrizesSeccionamento(validar(documento))[0];

    expect(matriz.linhas[1].celulas[0].tipo).toBe("valor");
  });
});

describe("RN-013/NEG-017 — km, jamais R$", () => {
  test("nenhum texto de célula ou cabeçalho contém valor monetário", () => {
    const documento = validar(documentoExemploMinimo());
    const textos = [
      ...montarMatrizesDistancias(documento),
      ...montarMatrizesSeccionamento(documento),
    ].flatMap((matriz) => [
      ...matriz.cabecalhos.map((c) => c.rotulo),
      ...matriz.linhas.flatMap((linha) => [
        linha.rotulo,
        ...linha.celulas.flatMap((celula) => [
          celula.texto,
          ..."detalheIda" in celula && celula.detalheIda !== undefined
            ? [celula.detalheIda, celula.detalheVolta as string]
            : [],
        ]),
      ]),
    ]);

    expect(textos.some((texto) => texto.includes("R$"))).toBe(false);
    expect(textos.some((texto) => /tarifa/i.test(texto))).toBe(false);
  });
});

// Correção da TASK-034 (DEC-107) — `dividirMatrizEmBlocos` é a derivação de
// layout pura (largura de coluna fixa + quebra em blocos, D2 do plano de
// correção). Construída sobre matrizes SINTÉTICAS: o modelo triangular não
// depende de nenhum documento real, só do formato `MatrizPdf`, e nenhuma
// fixture do projeto tem Serviço com 9 ou 20 Seções atendidas.
describe("dividirMatrizEmBlocos — layout em blocos (DEC-107)", () => {
  type CelulaSintetica = { tipo: "diagonal" | "valor"; texto: string };

  function matrizSintetica(quantidadeSecoes: number): MatrizPdf<CelulaSintetica> {
    const cabecalhos: CabecalhoMatriz[] = Array.from({ length: quantidadeSecoes }, (_, i) => ({
      secaoUuid: `secao-${i}`,
      rotulo: `Cidade ${i} - Seção ${i}`,
    }));
    return {
      servicoUuid: "servico-sintetico",
      numeroN: "1",
      cabecalhos,
      linhas: cabecalhos.map((cabecalho, indiceLinha) => ({
        secaoUuid: cabecalho.secaoUuid,
        rotulo: cabecalho.rotulo,
        celulas: Array.from({ length: indiceLinha + 1 }, (_, indiceColuna) =>
          indiceColuna === indiceLinha
            ? { tipo: "diagonal" as const, texto: MARCA_DIAGONAL }
            : { tipo: "valor" as const, texto: `${indiceLinha}-${indiceColuna}` },
        ),
      })),
    };
  }

  test("matriz de 3 Seções (≤ máximos) devolve exatamente 1 bloco, sem continuação", () => {
    const blocos = dividirMatrizEmBlocos(matrizSintetica(3));

    expect(blocos).toHaveLength(1);
    expect(blocos[0].cabecalhos).toHaveLength(3);
    expect(blocos[0].linhas).toHaveLength(3);
    expect(blocos[0].continuacao).toBe(false);
    expect(blocos[0].indiceColunaInicial).toBe(0);
  });

  test("matriz de 9 Seções: faixa 1 (colunas 0–6, linhas 0–8) e faixa 2 (colunas 7–8, só linhas 7–8 — D2)", () => {
    const blocos = dividirMatrizEmBlocos(matrizSintetica(9));

    expect(blocos).toHaveLength(2);

    const [faixa1, faixa2] = blocos;
    expect(faixa1.indiceColunaInicial).toBe(0);
    expect(faixa1.cabecalhos).toHaveLength(MAX_COLUNAS_POR_BLOCO);
    expect(faixa1.linhas).toHaveLength(9);
    expect(faixa1.continuacao).toBe(false);

    expect(faixa2.indiceColunaInicial).toBe(MAX_COLUNAS_POR_BLOCO);
    expect(faixa2.cabecalhos).toHaveLength(2); // 9 - 7 = 2 colunas restantes
    // As linhas 0–6 ficariam inteiramente no triângulo superior desta faixa
    // (nenhuma célula habitada) — omitidas, sobrando só as linhas 7 e 8.
    expect(faixa2.linhas).toHaveLength(2);
    expect(faixa2.linhas.map((l) => l.secaoUuid)).toEqual(["secao-7", "secao-8"]);
    expect(faixa2.continuacao).toBe(true);
  });

  test("matriz de 20 Seções: a faixa 1 parte em pedaços de ≤16 linhas, cabeçalhos iguais e continuação nos seguintes", () => {
    const blocos = dividirMatrizEmBlocos(matrizSintetica(20));

    const daFaixa1 = blocos.filter((bloco) => bloco.indiceColunaInicial === 0);
    expect(daFaixa1.length).toBeGreaterThan(1);

    for (const bloco of daFaixa1) {
      expect(bloco.linhas.length).toBeLessThanOrEqual(MAX_LINHAS_POR_BLOCO);
      expect(bloco.cabecalhos).toEqual(daFaixa1[0].cabecalhos);
    }
    expect(daFaixa1[0].continuacao).toBe(false);
    for (const bloco of daFaixa1.slice(1)) {
      expect(bloco.continuacao).toBe(true);
    }
    // 20 linhas na faixa 1, pedaços de 16 → 16 + 4.
    expect(daFaixa1.map((b) => b.linhas.length)).toEqual([16, 4]);
  });

  test("toda linha de todo bloco tem o mesmo número de células do cabeçalho do bloco", () => {
    for (const quantidade of [3, 9, 20]) {
      const blocos = dividirMatrizEmBlocos(matrizSintetica(quantidade));
      for (const bloco of blocos) {
        for (const linha of bloco.linhas) {
          expect(linha.celulas).toHaveLength(bloco.cabecalhos.length);
        }
      }
    }
  });

  test("caso inválido — posições fora do triângulo são `undefined`, nunca a marca de par não habilitado", () => {
    const blocos = dividirMatrizEmBlocos(matrizSintetica(9));
    const faixa2 = blocos[1];

    // Linha 7 (secao-7): só a coluna 7 (diagonal) existe nesta faixa; a
    // coluna 8 (índice local 1) é preenchimento do triângulo superior.
    const linha7 = faixa2.linhas.find((l) => l.secaoUuid === "secao-7");
    expect(linha7?.celulas[0]?.tipo).toBe("diagonal");
    expect(linha7?.celulas[1]).toBeUndefined();

    const todasAsCelulas = blocos.flatMap((bloco) => bloco.linhas.flatMap((l) => l.celulas));
    expect(todasAsCelulas.some((c) => c === undefined)).toBe(true);
    expect(todasAsCelulas.every((c) => c === undefined || c.texto !== MARCA_PAR_NAO_HABILITADO)).toBe(
      true,
    );
  });

  test("a diagonal cai na posição local `i - c0` dentro da faixa", () => {
    const blocos = dividirMatrizEmBlocos(matrizSintetica(9));
    const faixa2 = blocos[1]; // c0 = 7

    const linha8 = faixa2.linhas.find((l) => l.secaoUuid === "secao-8");
    // Linha 8, coluna global 8 → posição local 8 - 7 = 1.
    expect(linha8?.celulas[1]?.tipo).toBe("diagonal");
  });

  test("alturaCabecalho cresce com o rótulo mais longo e respeita o teto", () => {
    const matrizCurta = matrizSintetica(2);
    const matrizLonga: MatrizPdf<CelulaSintetica> = {
      ...matrizCurta,
      cabecalhos: [
        { secaoUuid: "a", rotulo: "AB" },
        {
          secaoUuid: "b",
          rotulo: "Município Muito Extenso - Nome de Seção Bastante Comprido Demais",
        },
      ],
    };

    const [blocoCurto] = dividirMatrizEmBlocos(matrizCurta);
    const [blocoLongo] = dividirMatrizEmBlocos(matrizLonga);

    expect(blocoLongo.alturaCabecalho).toBeGreaterThan(blocoCurto.alturaCabecalho);
    expect(blocoLongo.alturaCabecalho).toBeLessThanOrEqual(ALTURA_MAX_CABECALHO);
    expect(blocoCurto.alturaCabecalho).toBeLessThanOrEqual(ALTURA_MAX_CABECALHO);
  });
});
