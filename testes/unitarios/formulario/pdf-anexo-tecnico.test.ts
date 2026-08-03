import { describe, expect, test } from "vitest";
import { montarAnexoTecnico, montarLocaisDoAnexo } from "@/formulario/pdf/anexo-tecnico-pdf";
import { ROTULO_GRADE_COMUM } from "@/formulario/pdf/tabelas-horarias-pdf";
import { esquemaDocumentoOperacao, type DocumentoOperacao } from "@/shared/contrato";
import { documentoExemploMinimo, documentoUnidirecional } from "../../fixtures";

// TASK-034 — anexo técnico do PDF (§13.1 item 8; RN-075/RN-076/RN-031).
// Categoria 7 de `docs-dev/08-TEST_STRATEGY.md`.

function anexoDe(documento: DocumentoOperacao) {
  return montarAnexoTecnico(esquemaDocumentoOperacao.parse(documento));
}

describe("§13.1 item 8a — versão detalhada da tabela horária", () => {
  test("o anexo carrega a versão detalhada, com todas as Seções por bloco", () => {
    const anexo = anexoDe(documentoExemploMinimo());
    const ida = anexo.tabelasDetalhadas.find((t) => t.sentido === "ida");

    expect(anexo.tabelasDetalhadas.every((t) => t.versao === "detalhada")).toBe(true);
    const comum = ida!.grades.find((g) => g.rotulo === ROTULO_GRADE_COMUM);
    expect(comum!.blocos[0].linhas).toHaveLength(3);
  });
});

describe("§13.1 item 8b — relação de Locais comuns", () => {
  test("cada Local aparece com identificador `n.m`, nome e município", () => {
    const documento = documentoExemploMinimo();
    const local = documento.autos.servicos[0].locais[0];

    const blocos = montarLocaisDoAnexo(esquemaDocumentoOperacao.parse(documento));
    const ida = blocos.find((b) => b.sentido === "ida");

    expect(ida!.locais).toEqual([
      {
        localUuid: local.uuid,
        identificador: "2.1",
        nome: "Ponto de Embarque Praia",
        municipio: "Praia Grande",
      },
    ]);
  });

  test("RN-075/076 — a relação não traz horário de passagem nem offset", () => {
    const anexo = anexoDe(documentoExemploMinimo());
    const campos = anexo.locaisPorItinerario.flatMap((bloco) =>
      bloco.locais.flatMap((local) => Object.keys(local)),
    );

    expect(new Set(campos)).toEqual(
      new Set(["localUuid", "identificador", "nome", "municipio"]),
    );
    const textos = anexo.locaisPorItinerario.flatMap((bloco) =>
      bloco.locais.flatMap((local) => [local.nome, local.municipio, local.identificador]),
    );
    expect(textos.some((texto) => /\d{2}:\d{2}/.test(texto))).toBe(false);
  });

  test("itinerário sem Local rende bloco vazio — nunca uma linha inventada", () => {
    const blocos = montarLocaisDoAnexo(
      esquemaDocumentoOperacao.parse(documentoExemploMinimo()),
    );
    const volta = blocos.find((b) => b.sentido === "volta");

    expect(volta!.locais).toEqual([]);
  });

  test("Serviço unidirecional produz um único bloco de Locais", () => {
    const blocos = montarLocaisDoAnexo(
      esquemaDocumentoOperacao.parse(documentoUnidirecional()),
    );

    expect(blocos.map((b) => b.sentido)).toEqual(["ida"]);
  });

  test("Q-084 (opção 1) — Local sem geolocalização do sentido continua listado", () => {
    // Caso inalcançável em documento válido (RN-036 recusa na importação): o
    // anexo é a relação de Locais do itinerário, não a legenda do mapa — não há
    // promessa de bijeção com o símbolo, e omitir perderia dado do documento.
    const documento = documentoExemploMinimo();
    const local = documento.autos.servicos[0].locais[0];
    delete local.geolocalizacao_ida;
    local.geolocalizacao_volta = { latitude: -24.005, longitude: -46.398 };

    const blocos = montarLocaisDoAnexo(documento);
    const ida = blocos.find((b) => b.sentido === "ida");

    expect(ida!.locais).toEqual([
      {
        localUuid: local.uuid,
        identificador: "2.1",
        nome: "Ponto de Embarque Praia",
        municipio: "Praia Grande",
      },
    ]);
  });

  test("caso inválido — parada apontando para Local inexistente não vira linha", () => {
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].locais = [];

    const blocos = montarLocaisDoAnexo(documento);

    expect(blocos.every((bloco) => bloco.locais.length === 0)).toBe(true);
  });
});
