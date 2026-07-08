import { describe, it } from "vitest";
import {
  documentoDaFixture,
  esperarInvalido,
  esperarValido,
} from "./utilitarios";

// Contrato (categoria 1) — Seções (Spec 02 §5, §14) e Locais (§7, §14).
// A regra dos 350 m NÃO é validada aqui (TASK-010).

describe("seções", () => {
  it("rn001: recusa Seção sem uuid", () => {
    const doc = documentoDaFixture();
    delete doc.autos.secoes[0].uuid;
    esperarInvalido(doc);
  });

  it('rn001: recusa uuid fora do formato UUIDv4 (ex.: "secao-1")', () => {
    const doc = documentoDaFixture();
    doc.autos.secoes[0].uuid = "secao-1";
    esperarInvalido(doc, "[RN-001]");
  });

  it("rn005: recusa duas Seções com a mesma uuid", () => {
    const doc = documentoDaFixture();
    doc.autos.secoes[1].uuid = doc.autos.secoes[0].uuid;
    esperarInvalido(doc, "[RN-005]");
  });

  it("rn005: recusa duas Viagens com a mesma uuid", () => {
    const doc = documentoDaFixture();
    const viagens = doc.autos.servicos[0].itinerarios[0].viagens;
    viagens[1].uuid = viagens[0].uuid;
    esperarInvalido(doc, "[RN-005]");
  });

  it("rn018: recusa Seção com servicos vazio", () => {
    const doc = documentoDaFixture();
    doc.autos.secoes[0].servicos = [];
    esperarInvalido(doc, "[RN-018]");
  });

  it("rn018: recusa servico_uuid órfão em secao.servicos", () => {
    const doc = documentoDaFixture();
    doc.autos.secoes[0].servicos[0].servico_uuid =
      "1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d";
    esperarInvalido(doc, "[RN-018]");
  });

  it("rn018: recusa Seção sem nenhuma Parada apontando para ela", () => {
    const doc = documentoDaFixture();
    doc.autos.secoes.push({
      uuid: "9c8b7a6d-5e4f-4d3c-8b2a-1f0e9d8c7b6a",
      municipio: "Santos",
      nome: "Seção órfã",
      servicos: [
        {
          servico_uuid: doc.autos.servicos[0].uuid,
          geolocalizacao_ida: { latitude: -23.96, longitude: -46.33 },
          geolocalizacao_volta: { latitude: -23.96, longitude: -46.33 },
        },
      ],
    });
    esperarInvalido(doc, "[RN-018]");
  });

  it("rn026: recusa entrada sem geolocalizacao_volta quando o Serviço tem itinerário de Volta", () => {
    const doc = documentoDaFixture();
    delete doc.autos.secoes[0].servicos[0].geolocalizacao_volta;
    esperarInvalido(doc, "[RN-026]");
  });
});

describe("locais", () => {
  it("rn005: recusa dois Locais com a mesma uuid no documento", () => {
    const doc = documentoDaFixture();
    const original = doc.autos.servicos[0].locais[0];
    doc.autos.servicos[0].locais.push({
      ...structuredClone(original),
      nome: "Outro Ponto",
    });
    esperarInvalido(doc, "[RN-005]");
  });

  it("rn032: recusa Local sem nenhuma geolocalização", () => {
    const doc = documentoDaFixture();
    delete doc.autos.servicos[0].locais[0].geolocalizacao_ida;
    esperarInvalido(doc, "[RN-032]");
  });

  it("recusa latitude fora da faixa geográfica", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].locais[0].geolocalizacao_ida.latitude = 100;
    esperarInvalido(doc);
  });

  it("aceita Local só com geolocalizacao_volta (independentemente opcionais)", () => {
    const doc = documentoDaFixture();
    // Move o Local da Ida para a Volta: parada da Ida vira a própria Seção de
    // Praia Grande? Não — apenas troca o sentido da geolocalização e a
    // referência de parada correspondente é removida da Ida.
    const local = doc.autos.servicos[0].locais[0];
    local.geolocalizacao_volta = local.geolocalizacao_ida;
    delete local.geolocalizacao_ida;
    // Remove a parada 3 (Local) da Ida e reencadeia ordem/trechos/horários.
    const ida = doc.autos.servicos[0].itinerarios[0];
    ida.paradas = [
      { ordem: 1, secao_uuid: "4da15f36-5bbe-4f4e-90e3-68029097c1b9" },
      { ordem: 2, secao_uuid: "6f51076b-aaf8-4546-8530-4da1e489c880" },
      { ordem: 3, secao_uuid: "63344e28-4722-4a8b-ae9d-1862e8daded4" },
    ];
    ida.rota.trechos = [
      { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 8, duracao_s: 1080 },
      { parada_origem_ordem: 2, parada_destino_ordem: 3, distancia_km: 6, duracao_s: 720 },
    ];
    ida.rota.distancia_km = 14;
    ida.rota.duracao_s = 1800;
    for (const viagem of ida.viagens) {
      viagem.horarios_paradas = [
        { parada_ordem: 1, offset_horario: "00:00:00" },
        { parada_ordem: 2, offset_horario: "00:37:00" },
        { parada_ordem: 3, offset_horario: "01:10:00" },
      ];
    }
    esperarValido(doc);
  });
});
