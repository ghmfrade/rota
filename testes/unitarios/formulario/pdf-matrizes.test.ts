import { describe, expect, test } from "vitest";
import {
  MARCA_DIAGONAL,
  MARCA_PAR_NAO_HABILITADO,
  montarMatrizesDistancias,
  montarMatrizesSeccionamento,
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
      expect(celula.texto).toMatch(/^\d+,\d{2} km$/);
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
      texto: "8,00 km",
      detalheIda: "8,00 km",
      detalheVolta: "8,00 km",
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

    expect(celula).toEqual({ tipo: "valor", texto: "8,00 km" });
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
