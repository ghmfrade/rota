import { describe, it } from "vitest";
import {
  documentoDaFixture,
  esperarInvalido,
  esperarValido,
} from "./utilitarios";

// Contrato (categoria 1) — Paradas e Itinerários. Spec 02 §10, §10.1, §14.
// A integridade referencial fina (referência existente + geolocalização do
// sentido — RN-036) é escopo da TASK-004.

describe("paradas", () => {
  it("rn033: recusa Parada com secao_uuid e local_uuid simultâneos", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].paradas[1].local_uuid =
      "c2afe932-bf0f-4338-8ff4-63cd908b9033";
    esperarInvalido(doc, "[RN-033]");
  });

  it("rn033: recusa Parada sem nenhuma referência", () => {
    const doc = documentoDaFixture();
    delete doc.autos.servicos[0].itinerarios[0].paradas[2].local_uuid;
    esperarInvalido(doc, "[RN-033]");
  });

  it("rn034: recusa itinerário com 1 parada só", () => {
    const doc = documentoDaFixture();
    const ida = doc.autos.servicos[0].itinerarios[0];
    ida.paradas = [ida.paradas[0]];
    esperarInvalido(doc, "[RN-034]");
  });

  it("rn034: recusa ordem começando em 0", () => {
    const doc = documentoDaFixture();
    const ida = doc.autos.servicos[0].itinerarios[0];
    ida.paradas.forEach((parada: { ordem: number }, indice: number) => {
      parada.ordem = indice;
    });
    esperarInvalido(doc);
  });

  it("rn034: recusa ordem com lacuna (1, 2, 4, 5)", () => {
    const doc = documentoDaFixture();
    const ida = doc.autos.servicos[0].itinerarios[0];
    ida.paradas[2].ordem = 4;
    ida.paradas[3].ordem = 5;
    esperarInvalido(doc, "[RN-034]");
  });

  it("rn035: recusa Local na primeira parada", () => {
    const doc = documentoDaFixture();
    const primeira = doc.autos.servicos[0].itinerarios[0].paradas[0];
    delete primeira.secao_uuid;
    primeira.local_uuid = "c2afe932-bf0f-4338-8ff4-63cd908b9033";
    esperarInvalido(doc, "[RN-035]");
  });

  it("rn035: recusa Local na última parada", () => {
    const doc = documentoDaFixture();
    const ultima = doc.autos.servicos[0].itinerarios[0].paradas[3];
    delete ultima.secao_uuid;
    ultima.local_uuid = "c2afe932-bf0f-4338-8ff4-63cd908b9033";
    esperarInvalido(doc, "[RN-035]");
  });
});

describe("itinerários", () => {
  it("rn038: recusa dois itinerários com o mesmo sentido", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[1].sentido = "ida";
    esperarInvalido(doc, "[RN-038]");
  });

  it("rn038: recusa servico sem itinerários", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios = [];
    esperarInvalido(doc, "[RN-038]");
  });

  it("rn038: recusa três itinerários", () => {
    const doc = documentoDaFixture();
    const itinerarios = doc.autos.servicos[0].itinerarios;
    itinerarios.push(structuredClone(itinerarios[0]));
    esperarInvalido(doc, "[RN-038]");
  });

  it("rn030: recusa Ida e Volta com conjuntos de Seções diferentes", () => {
    const doc = documentoDaFixture();
    // Volta passa a referenciar 63344e28 duas vezes e perde 4da15f36.
    doc.autos.servicos[0].itinerarios[1].paradas[2].secao_uuid =
      "63344e28-4722-4a8b-ae9d-1862e8daded4";
    esperarInvalido(doc, "[RN-030]");
  });

  it("rn039: recusa itinerário sem viagens", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].viagens = [];
    esperarInvalido(doc, "[RN-039]");
  });

  it("rn057: recusa Serviço que atende uma única Seção", () => {
    const doc = documentoDaFixture();
    const servico = doc.autos.servicos[0];
    // Reduz o documento a um único itinerário circular 4da → 4da.
    doc.autos.secoes = [doc.autos.secoes[0]];
    servico.locais = [];
    servico.matriz_distancias = [];
    servico.matriz_seccionamento = [];
    servico.itinerarios = [
      {
        sentido: "ida",
        paradas: [
          { ordem: 1, secao_uuid: "4da15f36-5bbe-4f4e-90e3-68029097c1b9" },
          { ordem: 2, secao_uuid: "4da15f36-5bbe-4f4e-90e3-68029097c1b9" },
        ],
        rota: {
          geometria: {
            type: "LineString",
            coordinates: [
              [-46.3339, -23.9608],
              [-46.3342, -23.9611],
            ],
          },
          distancia_km: 1,
          duracao_s: 60,
          descricao_itinerario: {
            texto: "Santos - Terminal Central, Santos - Terminal Central.",
            itens: [
              {
                tipo: "secao",
                secao_uuid: "4da15f36-5bbe-4f4e-90e3-68029097c1b9",
                rotulo: "Santos - Terminal Central",
              },
              {
                tipo: "secao",
                secao_uuid: "4da15f36-5bbe-4f4e-90e3-68029097c1b9",
                rotulo: "Santos - Terminal Central",
              },
            ],
          },
          trechos: [
            {
              parada_origem_ordem: 1,
              parada_destino_ordem: 2,
              distancia_km: 1,
              duracao_s: 60,
            },
          ],
        },
        viagens: [
          {
            uuid: "ba65e897-1113-4c79-922b-ae0e790f55c4",
            horario_saida: "08:00:00",
            dia_semana: "segunda",
            viagem_feriado: false,
            horarios_paradas: [
              { parada_ordem: 1, offset_horario: "00:00:00" },
              { parada_ordem: 2, offset_horario: "00:05:00" },
            ],
          },
        ],
      },
    ];
    esperarInvalido(doc, "[RN-057]");
  });

  it("rn038/rn056: aceita Serviço unidirecional só-Ida (caso válido)", () => {
    const doc = documentoDaFixture();
    const servico = doc.autos.servicos[0];
    servico.itinerarios = [servico.itinerarios[0]];
    for (const par of servico.matriz_distancias) {
      delete par.distancia_trecho_volta;
    }
    // Sem itinerário de Volta, a geolocalização de Volta deixa de ser exigida
    // (RN-026) — mas continua permitida; nada a remover nas Seções.
    esperarValido(doc);
  });
});
