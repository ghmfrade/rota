import { describe, it } from "vitest";
import {
  documentoDaFixture,
  esperarInvalido,
  esperarValido,
} from "./utilitarios";

// Contrato (categoria 1) — Rota, Trechos, PontosDeRota e DescricaoItinerario.
// Spec 02 §10.2–§10.5, §14.

describe("rota e trechos", () => {
  it("rn041: recusa trechos com contagem diferente de paradas - 1", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].rota.trechos.pop();
    esperarInvalido(doc, "[RN-041]");
  });

  it("rn041: recusa trecho repetido para o mesmo par", () => {
    const doc = documentoDaFixture();
    const trechos = doc.autos.servicos[0].itinerarios[0].rota.trechos;
    trechos[2] = structuredClone(trechos[0]);
    esperarInvalido(doc, "[RN-041]");
  });

  it("rn041: recusa trecho não consecutivo (destino != origem + 1)", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].rota.trechos[1].parada_destino_ordem = 4;
    esperarInvalido(doc, "[RN-041]");
  });

  it("rn040: recusa distancia_km divergente da soma dos trechos", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].rota.distancia_km = 15;
    esperarInvalido(doc, "[RN-040]");
  });

  it("rn040: recusa duracao_s divergente da soma dos trechos", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].rota.duracao_s = 1801;
    esperarInvalido(doc, "[RN-040]");
  });

  it("rn040: aceita soma que só fecha após arredondamento a 2 casas (tolerância)", () => {
    const doc = documentoDaFixture();
    const rota = doc.autos.servicos[0].itinerarios[0].rota;
    // 4.44 + 4.44 + 5.13 = 14.009999999999998 em ponto flutuante.
    rota.trechos[0].distancia_km = 4.44;
    rota.trechos[1].distancia_km = 4.44;
    rota.trechos[2].distancia_km = 5.13;
    rota.distancia_km = 14.01;
    esperarValido(doc);
  });

  it("rn042: recusa apos_parada_ordem igual a paradas.length", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].rota.pontos_de_rota[0].apos_parada_ordem = 4;
    esperarInvalido(doc, "[RN-042]");
  });

  it("rn042: recusa apos_parada_ordem 0", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].rota.pontos_de_rota[0].apos_parada_ordem = 0;
    esperarInvalido(doc);
  });

  it("rn042: aceita pontos_de_rota ausente (default [])", () => {
    const doc = documentoDaFixture();
    delete doc.autos.servicos[0].itinerarios[0].rota.pontos_de_rota;
    esperarValido(doc);
  });

  it("recusa geometria com um único ponto", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].rota.geometria.coordinates = [
      [-46.3339, -23.9608],
    ];
    esperarInvalido(doc);
  });

  it("recusa geometria que não é LineString", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].rota.geometria.type = "Point";
    esperarInvalido(doc);
  });

  it("recusa coordenada com latitude fora da faixa (ordem [lon, lat])", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].rota.geometria.coordinates[0] = [
      -46.3339, 100,
    ];
    esperarInvalido(doc);
  });
});

describe("descricao_itinerario (RN-044)", () => {
  it("recusa menos de dois itens tipo=secao", () => {
    const doc = documentoDaFixture();
    const descricao =
      doc.autos.servicos[0].itinerarios[0].rota.descricao_itinerario;
    descricao.itens = [descricao.itens[0]];
    esperarInvalido(doc, "[RN-044]");
  });

  it("recusa primeiro item que não é a primeira Seção do itinerário", () => {
    const doc = documentoDaFixture();
    const descricao =
      doc.autos.servicos[0].itinerarios[0].rota.descricao_itinerario;
    descricao.itens.shift(); // remove a Seção inicial; primeiro item vira "via"
    esperarInvalido(doc, "[RN-044]");
  });

  it("recusa último item que não é a última Seção do itinerário", () => {
    const doc = documentoDaFixture();
    const descricao =
      doc.autos.servicos[0].itinerarios[0].rota.descricao_itinerario;
    const itens = descricao.itens;
    [itens[itens.length - 2], itens[itens.length - 1]] = [
      itens[itens.length - 1],
      itens[itens.length - 2],
    ];
    esperarInvalido(doc, "[RN-044]");
  });

  it("recusa item secao referenciando uuid de Local (Locais não entram na descrição)", () => {
    const doc = documentoDaFixture();
    const itens =
      doc.autos.servicos[0].itinerarios[0].rota.descricao_itinerario.itens;
    itens[3].secao_uuid = "c2afe932-bf0f-4338-8ff4-63cd908b9033";
    esperarInvalido(doc, "[RN-044]");
  });

  it("recusa item secao com campo nome (forma de via)", () => {
    const doc = documentoDaFixture();
    const itens =
      doc.autos.servicos[0].itinerarios[0].rota.descricao_itinerario.itens;
    itens[0].nome = "Avenida Qualquer";
    esperarInvalido(doc);
  });

  it("recusa item via com secao_uuid", () => {
    const doc = documentoDaFixture();
    const itens =
      doc.autos.servicos[0].itinerarios[0].rota.descricao_itinerario.itens;
    itens[1].secao_uuid = "4da15f36-5bbe-4f4e-90e3-68029097c1b9";
    esperarInvalido(doc);
  });

  it("aceita descrição sem Seção intermediária (§14 exige extremos e ordem, não completude)", () => {
    const doc = documentoDaFixture();
    const descricao =
      doc.autos.servicos[0].itinerarios[0].rota.descricao_itinerario;
    // Remove o marco de São Vicente (item 3); extremos e ordem preservados.
    descricao.itens.splice(3, 1);
    esperarValido(doc);
  });

  it("aceita descrição só com marcos, sem vias (OSRM sem steps — RN-053)", () => {
    const doc = documentoDaFixture();
    const descricao =
      doc.autos.servicos[0].itinerarios[0].rota.descricao_itinerario;
    descricao.itens = descricao.itens.filter(
      (item: { tipo: string }) => item.tipo === "secao",
    );
    esperarValido(doc);
  });
});
