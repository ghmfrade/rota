import { describe, it } from "vitest";
import {
  documentoDaFixture,
  esperarInvalido,
  esperarValido,
} from "./utilitarios";

// Contrato (categoria 1) e validação de domínio (categoria 2) — Paradas e
// Itinerários. Spec 02 §10, §10.1, §14. Inclui a integridade referencial
// fina de Parada (referência existente + geolocalização do sentido — RN-036).

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

  it("rn036: recusa secao_uuid que não existe em autos.secoes", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].paradas[1].secao_uuid =
      "11111111-1111-4111-8111-111111111111";
    esperarInvalido(doc, "[RN-036] secao_uuid não existe em autos.secoes");
  });

  it("rn036: recusa Seção cuja entrada em secao.servicos não aponta para o Serviço da Parada", () => {
    const doc = documentoDaFixture();
    // A entrada da Seção Terminal Norte passa a apontar para outro Serviço;
    // as paradas que a referenciam ficam sem entrada para o Serviço corrente.
    doc.autos.secoes[1].servicos[0].servico_uuid =
      "22222222-2222-4222-8222-222222222222";
    esperarInvalido(
      doc,
      "[RN-036] a Seção referenciada não tem entrada em secao.servicos para o Serviço desta Parada",
    );
  });

  it("rn036: recusa entrada da Seção sem a geolocalização do sentido do itinerário", () => {
    const doc = documentoDaFixture();
    delete doc.autos.secoes[0].servicos[0].geolocalizacao_ida;
    esperarInvalido(doc, "geolocalizacao_ida preenchida");
  });

  it("rn036: recusa local_uuid que não existe em servico.locais", () => {
    const doc = documentoDaFixture();
    doc.autos.servicos[0].itinerarios[0].paradas[2].local_uuid =
      "33333333-3333-4333-8333-333333333333";
    esperarInvalido(
      doc,
      "[RN-036] local_uuid não existe em servico.locais do mesmo Serviço",
    );
  });

  it("rn036: recusa Parada da Volta referenciando Local que só tem geolocalizacao_ida", () => {
    const doc = documentoDaFixture();
    const paradaVolta = doc.autos.servicos[0].itinerarios[1].paradas[1];
    delete paradaVolta.secao_uuid;
    paradaVolta.local_uuid = "c2afe932-bf0f-4338-8ff4-63cd908b9033";
    esperarInvalido(doc, "geolocalizacao_volta preenchida");
  });

  it("rn036: recusa Parada da Ida referenciando Local sem geolocalizacao_ida", () => {
    const doc = documentoDaFixture();
    const local = doc.autos.servicos[0].locais[0];
    // geolocalizacao_volta entra no lugar para não violar RN-032 junto.
    local.geolocalizacao_volta = local.geolocalizacao_ida;
    delete local.geolocalizacao_ida;
    esperarInvalido(doc, "geolocalizacao_ida preenchida");
  });

  it("rn036: aceita Local com geolocalização apenas do sentido em que é usado (fixture intacta)", () => {
    // O Local da fixture só tem geolocalizacao_ida e só aparece na Ida.
    esperarValido(documentoDaFixture());
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

  it("rn030 (DEC-063): aceita Volta cuja sequência de Seções é o inverso exato da Ida (fixture intacta — Ida ABC, Volta CBA)", () => {
    esperarValido(documentoDaFixture());
  });

  it("rn030 (DEC-063): recusa Volta com o MESMO CONJUNTO de Seções da Ida, mas fora da ordem inversa", () => {
    const doc = documentoDaFixture();
    // Ida (Terminal Central=4da15f36 → Terminal Norte=6f51076b → Local →
    // Rodoviária Praia Grande=63344e28): sequência de Seções A-B-C. A Volta
    // válida seria C-B-A; aqui as paradas 1 e 2 (Terminal Norte/Terminal
    // Central) são trocadas de posição → C-A-B, mesmo conjunto, ordem errada.
    const paradasVolta = doc.autos.servicos[0].itinerarios[1].paradas;
    const secaoB = paradasVolta[1].secao_uuid;
    const secaoA = paradasVolta[2].secao_uuid;
    paradasVolta[1].secao_uuid = secaoA;
    paradasVolta[2].secao_uuid = secaoB;
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
