import { describe, expect, test } from "vitest";
import { REGEX_UUID_V4 } from "@/shared/contrato";
import { duplicarServico } from "@/formulario/servicos/duplicar";
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
