import { describe, expect, test } from "vitest";
import {
  coletarAlertasTecnicos,
  validarJsonDeLeitor,
} from "@/shared/checagens-leitor";
import type { DocumentoOperacao } from "@/shared/contrato";
import {
  FIXTURES_VALIDAS,
  documentoExemploMinimo,
  documentoBidirecionalMultiServico,
} from "../../fixtures";

// TASK-012 — checagens estáticas consolidadas de leitor (Spec 05 §4.1; RN-091).
// Integração com fixtures válidas e violadas (mutações dirigidas). Cobre a
// separação de severidade: bloqueiam JSON malformado e schema/§14; geram só
// alerta técnico o 350 m estático de Seção (RN-028), o 350 m pareado de Local
// (RN-032) e a tipificação (RN-019..022). Nenhum teste toca rede/OSRM.

// Coleta o conjunto de TODAS as UUIDs de um documento (Seção, Serviço, Local,
// Viagem) — oráculo do round-trip do pipeline (RN-004).
function coletarUuids(doc: DocumentoOperacao): Set<string> {
  const uuids = new Set<string>();
  for (const secao of doc.autos.secoes) uuids.add(secao.uuid);
  for (const servico of doc.autos.servicos) {
    uuids.add(servico.uuid);
    for (const local of servico.locais) uuids.add(local.uuid);
    for (const itinerario of servico.itinerarios) {
      for (const viagem of itinerario.viagens) uuids.add(viagem.uuid);
    }
  }
  return uuids;
}

describe("validarJsonDeLeitor — fixtures válidas (Spec 05 §4.1)", () => {
  test.each(FIXTURES_VALIDAS)(
    "$nome passa sem bloqueio e sem alerta técnico",
    ({ carregar }) => {
      const resultado = validarJsonDeLeitor(JSON.stringify(carregar()));
      expect(resultado.ok).toBe(true);
      if (!resultado.ok) return;
      expect(resultado.alertas).toEqual([]);
    },
  );

  test("preserva todas as UUIDs — sem fábrica nem reindexação (RN-004)", () => {
    const original = documentoExemploMinimo();
    const resultado = validarJsonDeLeitor(JSON.stringify(original));
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect([...coletarUuids(resultado.documento)].sort()).toEqual(
      [...coletarUuids(original)].sort(),
    );
  });
});

describe("validarJsonDeLeitor — bloqueantes (RN-091)", () => {
  test("bloqueia texto que não é JSON bem-formado (json_malformado)", () => {
    const resultado = validarJsonDeLeitor("{ isto não é json");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.bloqueio.categoria).toBe("json_malformado");
  });

  test("bloqueia campo extra — schema fechado (schema_invalido, RN-010)", () => {
    const doc = documentoExemploMinimo();
    const bruto = { ...doc, campo_intruso: true };
    const resultado = validarJsonDeLeitor(JSON.stringify(bruto));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.bloqueio.categoria).toBe("schema_invalido");
  });

  test("bloqueia UUID de Serviço duplicada (schema_invalido, RN-005)", () => {
    const doc = documentoExemploMinimo();
    doc.autos.servicos.push(structuredClone(doc.autos.servicos[0]));
    const resultado = validarJsonDeLeitor(JSON.stringify(doc));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.bloqueio.categoria).toBe("schema_invalido");
  });
});

describe("validarJsonDeLeitor — alertas técnicos não bloqueiam (RN-028/032/091)", () => {
  test("350 m de Seção: ponto contribuído a > 350 m do centroide (RN-028)", () => {
    const doc = documentoExemploMinimo();
    // Empurra a geolocalização de Volta da 1ª Seção ~1 km ao sul: os dois
    // pontos ficam a > 350 m do centroide resultante (Spec 03 §7.3).
    doc.autos.secoes[0].servicos[0].geolocalizacao_volta = {
      latitude: -23.9700,
      longitude: -46.3339,
    };

    const resultado = validarJsonDeLeitor(JSON.stringify(doc));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const alerta = resultado.alertas.find((a) => a.codigo === "350m_secao");
    expect(alerta).toBeDefined();
    expect(alerta?.caminho).toEqual(["autos", "secoes", 0]);
  });

  test("350 m pareado de Local: Ida e Volta a > 350 m entre si (RN-032)", () => {
    const doc = documentoExemploMinimo();
    // O Local tem só geolocalizacao_ida; acrescenta uma Volta ~1,1 km distante.
    doc.autos.servicos[0].locais[0].geolocalizacao_volta = {
      latitude: -24.0150,
      longitude: -46.3980,
    };

    const resultado = validarJsonDeLeitor(JSON.stringify(doc));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const alerta = resultado.alertas.find((a) => a.codigo === "350m_local");
    expect(alerta).toBeDefined();
    expect(alerta?.caminho).toEqual(["autos", "servicos", 0, "locais", 0]);
  });

  test("tipificação: característica fora do conjunto do tipo (RN-019/021/022)", () => {
    const doc = documentoExemploMinimo();
    expect(doc.autos.tipo).toBe("Rodoviário");
    // "SU" (semiurbano) num Autos Rodoviário — família cruzada (Spec 03 §10.2).
    doc.autos.servicos[0].caracteristica_veiculo = "SU";

    const resultado = validarJsonDeLeitor(JSON.stringify(doc));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const alerta = resultado.alertas.find((a) => a.codigo === "tipificacao");
    expect(alerta).toBeDefined();
    expect(alerta?.caminho).toEqual([
      "autos",
      "servicos",
      0,
      "caracteristica_veiculo",
    ]);
  });

  test("tipificação: veículo não único no semiurbano aponta autos.tipo (RN-020)", () => {
    // Multi-serviço Rodoviário → forçamos Semiurbano com características
    // distintas; a violação de conjunto (índice −1) aponta para autos.tipo.
    const doc = documentoBidirecionalMultiServico();
    expect(doc.autos.servicos.length).toBeGreaterThanOrEqual(2);
    doc.autos.tipo = "Semiurbano";
    doc.autos.servicos[0].caracteristica_veiculo = "SU";
    doc.autos.servicos[1].caracteristica_veiculo = "SUL";

    const resultado = validarJsonDeLeitor(JSON.stringify(doc));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const alertasTipo = resultado.alertas.filter(
      (a) => a.codigo === "tipificacao",
    );
    expect(
      alertasTipo.some(
        (a) => a.caminho.length === 2 && a.caminho[1] === "tipo",
      ),
    ).toBe(true);
  });

  test("múltiplas violações simultâneas coexistem, sem bloquear a leitura", () => {
    const doc = documentoExemploMinimo();
    doc.autos.secoes[0].servicos[0].geolocalizacao_volta = {
      latitude: -23.9700,
      longitude: -46.3339,
    };
    doc.autos.servicos[0].locais[0].geolocalizacao_volta = {
      latitude: -24.0150,
      longitude: -46.3980,
    };
    doc.autos.servicos[0].caracteristica_veiculo = "SU";

    const resultado = validarJsonDeLeitor(JSON.stringify(doc));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const codigos = new Set(resultado.alertas.map((a) => a.codigo));
    expect(codigos).toEqual(new Set(["350m_secao", "350m_local", "tipificacao"]));
  });
});

describe("coletarAlertasTecnicos — documento já validado", () => {
  test("documento canônico não gera alerta", () => {
    expect(coletarAlertasTecnicos(documentoExemploMinimo())).toEqual([]);
  });
});
