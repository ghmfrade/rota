import { describe, expect, test } from "vitest";
import {
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

  // 30 Seções (sintéticas — nenhuma fixture do projeto chega perto: um
  // Serviço real do ROTA tem no máximo ~12 Seções) força a quebra por LINHAS
  // dentro da faixa 1 com o novo teto de 22 (DEC-108, sem cabeçalho diagonal).
  test("matriz de 30 Seções: a faixa 1 parte em pedaços de ≤22 linhas, cabeçalhos iguais e continuação nos seguintes", () => {
    const blocos = dividirMatrizEmBlocos(matrizSintetica(30));

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
    // 30 linhas na faixa 1, pedaços de 22 → 22 + 8.
    expect(daFaixa1.map((b) => b.linhas.length)).toEqual([22, 8]);
  });

  test("toda linha de todo bloco tem o mesmo número de células do cabeçalho do bloco", () => {
    for (const quantidade of [3, 9, 30]) {
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

  // DEC-108 item 1 — rótulo de coluna hospedado na célula de preenchimento
  // `(linha j−1, coluna j)`; item 2 — a primeira coluna da faixa não tem
  // hospedeiro dentro do bloco (vai para a linha de cabeçalho).
  describe("rotuloColunaHospedada — posição do rótulo de coluna dentro do triângulo superior (DEC-108)", () => {
    test("matriz de 3 Seções: cada linha hospeda o rótulo da coluna seguinte à própria diagonal; a última linha não hospeda nada", () => {
      const [bloco] = dividirMatrizEmBlocos(matrizSintetica(3));

      expect(bloco.linhas[0].rotuloColunaHospedada).toEqual({
        indiceLocal: 1,
        rotulo: bloco.cabecalhos[1].rotulo,
      });
      expect(bloco.linhas[1].rotuloColunaHospedada).toEqual({
        indiceLocal: 2,
        rotulo: bloco.cabecalhos[2].rotulo,
      });
      // Linha 2 (última): a coluna 3 não existe — nenhum rótulo para hospedar.
      expect(bloco.linhas[2].rotuloColunaHospedada).toBeUndefined();
      // A coluna 0 não é hospedada por nenhuma linha (DEC-108 item 2): cabe à
      // apresentação usar `cabecalhos[0]` na linha de cabeçalho.
      expect(bloco.linhas.some((l) => l.rotuloColunaHospedada?.indiceLocal === 0)).toBe(false);
    });

    test("matriz de 9 Seções: cada faixa só hospeda os rótulos das SUAS próprias colunas (colunas fora da faixa nunca aparecem numa linha)", () => {
      const [faixa1, faixa2] = dividirMatrizEmBlocos(matrizSintetica(9));

      // Faixa 1 (colunas 0-6): linhas 0-5 hospedam as colunas 1-6; linhas 6-8
      // (cuja diagonal cai fora da faixa ou cuja coluna seguinte também) não
      // hospedam nada nesta faixa.
      for (let i = 0; i < 6; i++) {
        expect(faixa1.linhas[i].rotuloColunaHospedada).toEqual({
          indiceLocal: i + 1,
          rotulo: faixa1.cabecalhos[i + 1].rotulo,
        });
      }
      for (let i = 6; i < faixa1.linhas.length; i++) {
        expect(faixa1.linhas[i].rotuloColunaHospedada).toBeUndefined();
      }

      // Faixa 2 (colunas 7-8): a coluna 7 (primeira da faixa) não é hospedada
      // por nenhuma linha; a coluna 8 é hospedada pela linha da Seção 7.
      const linha7 = faixa2.linhas.find((l) => l.secaoUuid === "secao-7");
      const linha8 = faixa2.linhas.find((l) => l.secaoUuid === "secao-8");
      expect(linha7?.rotuloColunaHospedada).toEqual({
        indiceLocal: 1,
        rotulo: faixa2.cabecalhos[1].rotulo,
      });
      expect(linha8?.rotuloColunaHospedada).toBeUndefined();
    });

    test("caso inválido — nenhum bloco hospeda rótulo de coluna fora do próprio intervalo (indiceLocal sempre < cabecalhos.length)", () => {
      for (const quantidade of [3, 9, 30]) {
        const blocos = dividirMatrizEmBlocos(matrizSintetica(quantidade));
        for (const bloco of blocos) {
          for (const linha of bloco.linhas) {
            if (linha.rotuloColunaHospedada !== undefined) {
              expect(linha.rotuloColunaHospedada.indiceLocal).toBeLessThan(
                bloco.cabecalhos.length,
              );
              expect(linha.rotuloColunaHospedada.indiceLocal).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    // Matriz sintética grande o bastante para partir a MESMA faixa de colunas
    // em pedaços de linhas (inalcançável com Serviços reais, no máximo ~12
    // Seções) — prova que o segundo pedaço não duplica nem inventa rótulo: os
    // hospedeiros da faixa já se esgotam no primeiro pedaço, e o segundo só
    // repete o cabeçalho (item da apresentação, não deste módulo).
    test("faixa partida em pedaços de linhas: o segundo pedaço não hospeda nenhum rótulo (já hospedados no primeiro)", () => {
      const [primeiroPedaco, segundoPedaco] = dividirMatrizEmBlocos(matrizSintetica(30)).filter(
        (bloco) => bloco.indiceColunaInicial === 0,
      );

      expect(primeiroPedaco.linhas.some((l) => l.rotuloColunaHospedada !== undefined)).toBe(true);
      expect(segundoPedaco.linhas.every((l) => l.rotuloColunaHospedada === undefined)).toBe(true);
    });
  });

  // DEC-110 item 7 (parecer `TASK-034-20260803-task-128.md`, problema 1) —
  // bloco cujas células habitadas são só diagonais não vai para o papel.
  describe("bloco degenerado — faixa sem nenhuma célula de valor é descartada (DEC-110)", () => {
    /** Posições habitadas de um bloco, em coordenadas de Seção (não de índice),
     *  para comparar com a matriz de origem sem depender do particionamento. */
    function paresHabitados<Celula>(
      blocos: ReturnType<typeof dividirMatrizEmBlocos<Celula>>,
    ): Set<string> {
      const pares = new Set<string>();
      for (const bloco of blocos) {
        for (const linha of bloco.linhas) {
          linha.celulas.forEach((celula, indice) => {
            if (celula !== undefined) {
              pares.add(`${linha.secaoUuid}|${bloco.cabecalhos[indice].secaoUuid}`);
            }
          });
        }
      }
      return pares;
    }

    // 8 Seções é o menor caso do resto 1 (`8 % 7 === 1`) e está DENTRO da
    // escala real do ROTA (11–12 Seções por Serviço). Antes da correção, a
    // faixa 2 saía com uma coluna, uma linha e uma célula: a diagonal.
    test("matriz de 8 Seções: a faixa final, que só teria a diagonal, não vira bloco", () => {
      const blocos = dividirMatrizEmBlocos(matrizSintetica(8));

      expect(blocos).toHaveLength(1);
      expect(blocos[0].indiceColunaInicial).toBe(0);
      expect(blocos[0].continuacao).toBe(false);
    });

    test("nenhum bloco fica sem célula de valor — inclusive nos demais restos 1 (15 e 22 Seções)", () => {
      for (const quantidade of [3, 8, 9, 15, 22, 30]) {
        const blocos = dividirMatrizEmBlocos(matrizSintetica(quantidade));
        for (const bloco of blocos) {
          expect(
            bloco.linhas.some((linha) => linha.celulas.some((celula) => celula?.tipo === "valor")),
          ).toBe(true);
        }
      }
    });

    // A prova de que o descarte não perde informação (RN-054): todo par
    // habitado da matriz de origem que NÃO é diagonal continua em algum bloco.
    test("o descarte não perde nenhum par: todas as células de valor da matriz sobrevivem nos blocos", () => {
      for (const quantidade of [3, 8, 9, 15, 22, 30]) {
        const matriz = matrizSintetica(quantidade);
        const sobreviventes = paresHabitados(dividirMatrizEmBlocos(matriz));

        for (const linha of matriz.linhas) {
          linha.celulas.forEach((celula, indiceColuna) => {
            if (celula?.tipo === "valor") {
              const par = `${linha.secaoUuid}|${matriz.cabecalhos[indiceColuna].secaoUuid}`;
              expect(sobreviventes.has(par)).toBe(true);
            }
          });
        }
      }
    });

    test("caso inválido — matriz de uma única Seção (só a diagonal) mantém um bloco: a matriz não desaparece", () => {
      const blocos = dividirMatrizEmBlocos(matrizSintetica(1));

      expect(blocos).toHaveLength(1);
      expect(blocos[0].linhas).toHaveLength(1);
      expect(blocos[0].continuacao).toBe(false);
    });

    test("caso inválido — o primeiro bloco sobrevivente nunca sai como '(continuação)'", () => {
      for (const quantidade of [1, 3, 8, 9, 15, 22, 30]) {
        const blocos = dividirMatrizEmBlocos(matrizSintetica(quantidade));

        expect(blocos[0].continuacao).toBe(false);
        for (const bloco of blocos.slice(1)) expect(bloco.continuacao).toBe(true);
      }
    });
  });
});
