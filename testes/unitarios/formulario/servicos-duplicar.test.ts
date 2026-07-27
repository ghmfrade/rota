import { describe, expect, test } from "vitest";
import { exportarComoProposta } from "@/formulario/exportacao";
import { importarDocumento } from "@/formulario/importacao";
import { REGEX_UUID_V4, esquemaDocumentoOperacao } from "@/shared/contrato";
import type { DocumentoOperacao } from "@/shared/contrato";
import type { ListasAutosEmpresas } from "@/shared/dados-estaticos";
import {
  duplicarServico,
  reconciliarSecoesDaDuplicacao,
} from "@/formulario/servicos/duplicar";
import {
  documentoBidirecionalMultiServico,
  documentoExemploMinimo,
} from "../../fixtures";

// TASK-016 — duplicação de Serviço (RN-007; RN-005; Spec 04 §6; Spec 02 §12).
// Categoria 2/10 (domínio) + regressão de identidade. A prova central: cópia é
// nascimento — Serviço/Locais/Viagens ganham UUIDs novas — mas as referências a
// Seções (`secao_uuid`) são MANTIDAS. Nenhum toque em rede/OSRM.

// Coleta todas as UUIDs de identidade de um Serviço (Serviço + Locais + Viagens).
function uuidsDeServico(servico: {
  uuid: string;
  locais: { uuid: string }[];
  itinerarios: { viagens: { uuid: string }[] }[];
}): string[] {
  return [
    servico.uuid,
    ...servico.locais.map((l) => l.uuid),
    ...servico.itinerarios.flatMap((i) => i.viagens.map((v) => v.uuid)),
  ];
}

function todasAsUuids(documento: DocumentoOperacao): string[] {
  return [
    ...documento.autos.secoes.map((secao) => secao.uuid),
    ...documento.autos.servicos.flatMap(uuidsDeServico),
  ].sort();
}

function referenciasDeSecao(documento: DocumentoOperacao): string[] {
  return documento.autos.servicos
    .flatMap((servico) =>
      servico.itinerarios.flatMap((itinerario) =>
        itinerario.paradas.flatMap((parada) =>
          parada.secao_uuid === undefined ? [] : [parada.secao_uuid],
        ),
      ),
    )
    .sort();
}

function contribuicoesDeSecao(documento: DocumentoOperacao): string[] {
  return documento.autos.secoes
    .flatMap((secao) =>
      secao.servicos.map(
        (contribuicao) => `${secao.uuid}:${contribuicao.servico_uuid}`,
      ),
    )
    .sort();
}

function listasReconhecendo(
  documento: DocumentoOperacao,
): ListasAutosEmpresas {
  return {
    versao_schema: "1.0",
    tipos: [{ codigo: documento.autos.tipo, descricao: "Tipo macro." }],
    empresas: [{ id: "empresa-do-doc", nome: documento.autos.empresa }],
    autos: [
      {
        codigo: documento.autos.codigo,
        tc: "01",
        denominacao_linha: "Linha de teste",
        empresa_id: "empresa-do-doc",
        tipo: documento.autos.tipo,
        operante: true,
      },
    ],
  };
}

describe("duplicarServico — UUIDs novas, referências de Seção mantidas (RN-007)", () => {
  test("Serviço, Locais e Viagens ganham UUIDs novas e válidas", () => {
    const original = documentoExemploMinimo().autos.servicos[0];
    const copia = duplicarServico(original);

    expect(copia.uuid).not.toBe(original.uuid);
    expect(copia.uuid).toMatch(REGEX_UUID_V4);

    // Locais copiados com uuid nova e válida.
    expect(copia.locais).toHaveLength(original.locais.length);
    copia.locais.forEach((local, i) => {
      expect(local.uuid).not.toBe(original.locais[i].uuid);
      expect(local.uuid).toMatch(REGEX_UUID_V4);
    });

    // Todas as Viagens de todos os itinerários com uuid nova e válida.
    copia.itinerarios.forEach((itin, i) => {
      itin.viagens.forEach((viagem, j) => {
        expect(viagem.uuid).not.toBe(
          original.itinerarios[i].viagens[j].uuid,
        );
        expect(viagem.uuid).toMatch(REGEX_UUID_V4);
      });
    });
  });

  test("as referências a Seções (secao_uuid) das paradas são preservadas", () => {
    const original = documentoBidirecionalMultiServico().autos.servicos[0];
    const copia = duplicarServico(original);

    copia.itinerarios.forEach((itin, i) => {
      const secaoOrig = original.itinerarios[i].paradas.map(
        (p) => p.secao_uuid,
      );
      const secaoCopia = itin.paradas.map((p) => p.secao_uuid);
      expect(secaoCopia).toEqual(secaoOrig);
    });
  });

  test("local_uuid das paradas é re-mapeado para os Locais novos", () => {
    const original = documentoExemploMinimo().autos.servicos[0];
    const copia = duplicarServico(original);

    const mapa = new Map(
      original.locais.map((l, i) => [l.uuid, copia.locais[i].uuid]),
    );

    copia.itinerarios.forEach((itin, i) => {
      itin.paradas.forEach((parada, j) => {
        const paradaOrig = original.itinerarios[i].paradas[j];
        if (paradaOrig.local_uuid !== undefined) {
          // Aponta para o Local NOVO, nunca para o antigo.
          expect(parada.local_uuid).toBe(mapa.get(paradaOrig.local_uuid));
          expect(parada.local_uuid).not.toBe(paradaOrig.local_uuid);
        } else {
          expect(parada.local_uuid).toBeUndefined();
        }
      });
    });
  });

  test("nenhuma UUID da cópia colide com as do original (RN-005)", () => {
    const original = documentoExemploMinimo().autos.servicos[0];
    const copia = duplicarServico(original);

    const antigas = new Set(uuidsDeServico(original));
    for (const uuid of uuidsDeServico(copia)) {
      expect(antigas.has(uuid)).toBe(false);
    }
    // Todas as UUIDs da cópia são únicas entre si.
    const novas = uuidsDeServico(copia);
    expect(new Set(novas).size).toBe(novas.length);
  });

  test("não muta o Serviço de origem", () => {
    const doc = documentoExemploMinimo();
    const original = doc.autos.servicos[0];
    const uuidsAntes = uuidsDeServico(original);

    duplicarServico(original);

    expect(uuidsDeServico(original)).toEqual(uuidsAntes);
  });

  test("cópia é profunda: dados não compartilham referência com o original", () => {
    const original = documentoBidirecionalMultiServico().autos.servicos[0];
    const copia = duplicarServico(original);

    // Arrays/objetos de dados são independentes (referências distintas).
    expect(copia.matriz_distancias).not.toBe(original.matriz_distancias);
    expect(copia.matriz_seccionamento).not.toBe(original.matriz_seccionamento);
    expect(copia.itinerarios[0].rota).not.toBe(original.itinerarios[0].rota);
    expect(copia.itinerarios[0].viagens[0].horarios_paradas).not.toBe(
      original.itinerarios[0].viagens[0].horarios_paradas,
    );
  });

  test("mutar a cópia não afeta o original (independência efetiva)", () => {
    const doc = documentoBidirecionalMultiServico();
    const original = doc.autos.servicos[0];
    const distanciaAntes =
      original.itinerarios[0].rota.trechos[0].distancia_km;
    const valorAntes = original.matriz_distancias[0].valor_adotado_de_distancia;

    const copia = duplicarServico(original);
    copia.itinerarios[0].rota.trechos[0].distancia_km = 999;
    copia.matriz_distancias[0].valor_adotado_de_distancia = 999;

    expect(original.itinerarios[0].rota.trechos[0].distancia_km).toBe(
      distanciaAntes,
    );
    expect(original.matriz_distancias[0].valor_adotado_de_distancia).toBe(
      valorAntes,
    );
  });

  test("Serviço sem Locais duplica sem quebrar (limite)", () => {
    // O Serviço do fixture bidirecional tem locais: [] — não deve lançar.
    const original = documentoBidirecionalMultiServico().autos.servicos[0];
    expect(original.locais).toHaveLength(0);
    const copia = duplicarServico(original);
    expect(copia.locais).toHaveLength(0);
    expect(copia.uuid).not.toBe(original.uuid);
  });
});

describe("reconciliarSecoesDaDuplicacao — contribuições da cópia (TASK-101)", () => {
  test("Serviço bidirecional ganha contribuição própria em cada Seção usada (RN-007/RN-026)", () => {
    const doc = documentoBidirecionalMultiServico();
    const original = doc.autos.servicos[0];
    const copia = duplicarServico(original);
    const secoes = reconciliarSecoesDaDuplicacao(doc.autos.secoes, original, copia);
    const usadas = new Set(
      copia.itinerarios.flatMap((itinerario) =>
        itinerario.paradas.flatMap((parada) =>
          parada.secao_uuid === undefined ? [] : [parada.secao_uuid],
        ),
      ),
    );

    for (const secao of secoes) {
      const contribuicaoCopia = secao.servicos.find(
        (entrada) => entrada.servico_uuid === copia.uuid,
      );
      if (!usadas.has(secao.uuid)) {
        expect(contribuicaoCopia).toBeUndefined();
        continue;
      }
      const contribuicaoOriginal = doc.autos.secoes
        .find((originalSecao) => originalSecao.uuid === secao.uuid)!
        .servicos.find((entrada) => entrada.servico_uuid === original.uuid)!;
      expect(contribuicaoCopia?.geolocalizacao_ida).toEqual(
        contribuicaoOriginal.geolocalizacao_ida,
      );
      expect(contribuicaoCopia?.geolocalizacao_volta).toEqual(
        contribuicaoOriginal.geolocalizacao_volta,
      );
      expect(contribuicaoCopia?.geolocalizacao_ida).not.toBe(
        contribuicaoOriginal.geolocalizacao_ida,
      );
      expect(contribuicaoCopia?.geolocalizacao_volta).not.toBe(
        contribuicaoOriginal.geolocalizacao_volta,
      );
    }

    expect(
      esquemaDocumentoOperacao.safeParse({
        ...doc,
        autos: {
          ...doc.autos,
          secoes,
          servicos: [...doc.autos.servicos, copia],
        },
      }).success,
    ).toBe(true);
  });

  test("round-trip após duplicar preserva UUIDs, referências e contribuições (RN-004/RN-005/RN-007)", () => {
    const doc = documentoBidirecionalMultiServico();
    const original = doc.autos.servicos[0];
    const copia = duplicarServico(original);
    const documentoDuplicado: DocumentoOperacao = {
      ...doc,
      autos: {
        ...doc.autos,
        secoes: reconciliarSecoesDaDuplicacao(
          doc.autos.secoes,
          original,
          copia,
        ),
        servicos: [...doc.autos.servicos, copia],
      },
    };
    const uuidsAntes = todasAsUuids(documentoDuplicado);
    const referenciasAntes = referenciasDeSecao(documentoDuplicado);
    const contribuicoesAntes = contribuicoesDeSecao(documentoDuplicado);

    const exportado = exportarComoProposta(documentoDuplicado, "2026-07-27");
    expect(exportado.ok).toBe(true);
    if (!exportado.ok) return;

    const importado = importarDocumento(
      exportado.json,
      listasReconhecendo(documentoDuplicado),
    );
    expect(importado.ok).toBe(true);
    if (!importado.ok) return;

    expect(todasAsUuids(importado.documento)).toEqual(uuidsAntes);
    expect(referenciasDeSecao(importado.documento)).toEqual(referenciasAntes);
    expect(contribuicoesDeSecao(importado.documento)).toEqual(
      contribuicoesAntes,
    );
    expect(
      importado.documento.autos.servicos.some(
        (servico) => servico.uuid === copia.uuid,
      ),
    ).toBe(true);
    expect(new Set(uuidsAntes).size).toBe(uuidsAntes.length);
  });

  test("Serviço unidirecional copia somente a geolocalização do seu sentido", () => {
    const doc = documentoExemploMinimo();
    const original = doc.autos.servicos[0];
    original.itinerarios = original.itinerarios.filter(
      (itinerario) => itinerario.sentido === "ida",
    );
    for (const secao of doc.autos.secoes) {
      const entrada = secao.servicos.find(
        (contribuicao) => contribuicao.servico_uuid === original.uuid,
      );
      if (entrada) delete entrada.geolocalizacao_volta;
    }
    const copia = duplicarServico(original);
    expect(copia.itinerarios.map((itinerario) => itinerario.sentido)).toEqual(["ida"]);

    const secoes = reconciliarSecoesDaDuplicacao(doc.autos.secoes, original, copia);
    for (const secao of secoes) {
      const entrada = secao.servicos.find(
        (contribuicao) => contribuicao.servico_uuid === copia.uuid,
      );
      if (!entrada) continue;
      expect(entrada.geolocalizacao_ida).toBeDefined();
      expect(entrada.geolocalizacao_volta).toBeUndefined();
    }
  });

  test("não cria entrada órfã, não muta a origem e é idempotente (RN-018)", () => {
    const doc = documentoExemploMinimo();
    const original = doc.autos.servicos[0];
    const copia = duplicarServico(original);
    const secaoOrfa = structuredClone(doc.autos.secoes[0]);
    secaoOrfa.uuid = "bb733b85-8580-4bb8-bec5-f972427d86b4";
    const entradaAntes = structuredClone(doc.autos.secoes[0].servicos);
    const primeira = reconciliarSecoesDaDuplicacao(
      [...doc.autos.secoes, secaoOrfa],
      original,
      copia,
    );
    const segunda = reconciliarSecoesDaDuplicacao(primeira, original, copia);

    expect(
      primeira.at(-1)?.servicos.some(
        (entrada) => entrada.servico_uuid === copia.uuid,
      ),
    ).toBe(false);
    expect(segunda).toEqual(primeira);
    expect(doc.autos.secoes[0].servicos).toEqual(entradaAntes);
  });

  test("caso inválido: sem contribuição original não inventa coordenadas", () => {
    const doc = documentoExemploMinimo();
    const original = doc.autos.servicos[0];
    const copia = duplicarServico(original);
    const secoesInvalidas = doc.autos.secoes.map((secao) => ({
      ...secao,
      servicos: secao.servicos.filter(
        (entrada) => entrada.servico_uuid !== original.uuid,
      ),
    }));

    const resultado = reconciliarSecoesDaDuplicacao(
      secoesInvalidas,
      original,
      copia,
    );
    expect(
      resultado.some((secao) =>
        secao.servicos.some((entrada) => entrada.servico_uuid === copia.uuid),
      ),
    ).toBe(false);
  });

  test("caso inválido: contribuição sem geolocalização exigida não inventa o sentido ausente (RN-026/RN-036)", () => {
    const doc = documentoBidirecionalMultiServico();
    const original = doc.autos.servicos[0];
    const secaoUsada = doc.autos.secoes.find((secao) =>
      original.itinerarios.some((itinerario) =>
        itinerario.paradas.some(
          (parada) => parada.secao_uuid === secao.uuid,
        ),
      ),
    )!;
    const contribuicaoOriginal = secaoUsada.servicos.find(
      (entrada) => entrada.servico_uuid === original.uuid,
    )!;
    delete contribuicaoOriginal.geolocalizacao_volta;
    const copia = duplicarServico(original);
    const secoes = reconciliarSecoesDaDuplicacao(
      doc.autos.secoes,
      original,
      copia,
    );
    const contribuicaoCopia = secoes
      .find((secao) => secao.uuid === secaoUsada.uuid)!
      .servicos.find((entrada) => entrada.servico_uuid === copia.uuid);

    expect(contribuicaoCopia?.geolocalizacao_ida).toEqual(
      contribuicaoOriginal.geolocalizacao_ida,
    );
    expect(contribuicaoCopia?.geolocalizacao_volta).toBeUndefined();
    expect(
      esquemaDocumentoOperacao.safeParse({
        ...doc,
        autos: {
          ...doc.autos,
          secoes,
          servicos: [...doc.autos.servicos, copia],
        },
      }).success,
    ).toBe(false);
  });
});
