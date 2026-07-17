import { describe, expect, test } from "vitest";
import type { z } from "zod";
import {
  chaveItinerario,
  paradaDeSecao,
  promoverServicoNaSessao,
} from "@/formulario/itinerarios";
import {
  servicosDaSessao,
  servicosEmConstrucaoDaSessao,
  type ServicoEmConstrucao,
  type SessaoFormulario,
} from "@/formulario/sessao";
import type { EstadoRotaViva } from "@/formulario/roteamento";
import { esquemaRota } from "@/shared/contrato";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-080 — a promoção `ServicoEmConstrucao → Servico` (DEC-053/TASK-061)
// ficou condicionada a `modo === "novo"` no gatilho da etapa de itinerários;
// esta suíte cobre `promoverServicoNaSessao` (o helper generalizado extraído
// do gatilho) nos DOIS modos, com foco no caso que estava quebrado: o modo
// "carregado" também precisa promover Serviços criados na sessão.

type Rota = z.infer<typeof esquemaRota>;

const SECAO_A_UUID = "4da15f36-5bbe-4f4e-90e3-68029097c1b9";
const SECAO_B_UUID = "6f51076b-aaf8-4546-8530-4da1e489c880";
const SERVICO_B_UUID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";

const ROTA_IDA: Rota = {
  geometria: { type: "LineString", coordinates: [[-46.3339, -23.9608], [-46.3919, -23.9631]] },
  distancia_km: 8,
  duracao_s: 1080,
  descricao_itinerario: {
    texto: "Santos - Terminal Central, São Vicente - Terminal Norte.",
    itens: [
      { tipo: "secao", secao_uuid: SECAO_A_UUID, rotulo: "Santos - Terminal Central" },
      { tipo: "secao", secao_uuid: SECAO_B_UUID, rotulo: "São Vicente - Terminal Norte" },
    ],
  },
  trechos: [{ parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 8, duracao_s: 1080 }],
  pontos_de_rota: [],
};

const ROTA_VOLTA: Rota = {
  ...ROTA_IDA,
  geometria: { type: "LineString", coordinates: [[-46.3919, -23.9631], [-46.3339, -23.9608]] },
  distancia_km: 8.2,
  trechos: [{ parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 8.2, duracao_s: 1080 }],
};

const PARADAS = [paradaDeSecao(SECAO_A_UUID), paradaDeSecao(SECAO_B_UUID)];
const ESTADO_RECALCULADA_IDA: EstadoRotaViva = { situacao: "recalculada", rota: ROTA_IDA };
const ESTADO_RECALCULADA_VOLTA: EstadoRotaViva = { situacao: "recalculada", rota: ROTA_VOLTA };
const ESTADO_SEM_ROTA: EstadoRotaViva = { situacao: "sem-rota", falha: { tipo: "sem-rota" } };

function servicoEmConstrucao(
  direcionalidade: ServicoEmConstrucao["direcionalidade"],
): ServicoEmConstrucao {
  return {
    uuid: SERVICO_B_UUID,
    numero_n: "0000-2CR",
    caracteristica_veiculo: "CR",
    carater: "principal",
    direcionalidade,
  };
}

function sessaoCarregadaComEmConstrucao(
  direcionalidade: ServicoEmConstrucao["direcionalidade"],
): SessaoFormulario {
  const documento = documentoExemploMinimo();
  return {
    modo: "carregado",
    documento,
    alertasImportacao: [],
    servicosEmConstrucao: [servicoEmConstrucao(direcionalidade)],
  };
}

function sessaoNovaComEmConstrucao(
  direcionalidade: ServicoEmConstrucao["direcionalidade"],
): SessaoFormulario {
  return {
    modo: "novo",
    identidade: {
      codigo: "0000",
      empresa: "Viação Exemplo Ltda.",
      tipo: "Rodoviário",
      status: "proposta",
    },
    servicosEmConstrucao: [servicoEmConstrucao(direcionalidade)],
  };
}

describe("promoverServicoNaSessao — modo carregado (TASK-080)", () => {
  test("Serviço em construção 'ida' com rota válida → promovido para documento.autos.servicos, uuid preservada, pré-existente intacto", () => {
    const sessao = sessaoCarregadaComEmConstrucao("ida");
    const uuidPreExistente = sessao.modo === "carregado" ? sessao.documento.autos.servicos[0].uuid : "";
    const chave = chaveItinerario(SERVICO_B_UUID, "ida");
    const comEstado: SessaoFormulario = {
      ...sessao,
      paradasEmEdicao: { [chave]: PARADAS },
      estadosRotaViva: { [chave]: ESTADO_RECALCULADA_IDA },
    };

    const proxima = promoverServicoNaSessao(comEstado, SERVICO_B_UUID);

    expect(servicosEmConstrucaoDaSessao(proxima)).toHaveLength(0);
    const servicos = servicosDaSessao(proxima);
    expect(servicos.map((s) => s.uuid).sort()).toEqual([SERVICO_B_UUID, uuidPreExistente].sort());
    const promovido = servicos.find((s) => s.uuid === SERVICO_B_UUID);
    expect(promovido?.itinerarios).toHaveLength(1);
    expect(promovido?.itinerarios[0].sentido).toBe("ida");
    // Round-trip de UUID do Serviço pré-existente (RN-001/002/004).
    expect(servicos.find((s) => s.uuid === uuidPreExistente)).toBeDefined();
  });

  test("'ambos' com os dois sentidos válidos → promove com 2 itinerários", () => {
    const sessao = sessaoCarregadaComEmConstrucao("ambos");
    const chaveIda = chaveItinerario(SERVICO_B_UUID, "ida");
    const chaveVolta = chaveItinerario(SERVICO_B_UUID, "volta");
    const comEstado: SessaoFormulario = {
      ...sessao,
      paradasEmEdicao: { [chaveIda]: PARADAS, [chaveVolta]: [...PARADAS].reverse() },
      estadosRotaViva: { [chaveIda]: ESTADO_RECALCULADA_IDA, [chaveVolta]: ESTADO_RECALCULADA_VOLTA },
    };

    const proxima = promoverServicoNaSessao(comEstado, SERVICO_B_UUID);

    const promovido = servicosDaSessao(proxima).find((s) => s.uuid === SERVICO_B_UUID);
    expect(promovido?.itinerarios.map((i) => i.sentido).sort()).toEqual(["ida", "volta"]);
    expect(servicosEmConstrucaoDaSessao(proxima)).toHaveLength(0);
  });

  test("[inválido] 'ambos' com só a Ida válida → não promove, permanece em construção (RN-038)", () => {
    const sessao = sessaoCarregadaComEmConstrucao("ambos");
    const chaveIda = chaveItinerario(SERVICO_B_UUID, "ida");
    const comEstado: SessaoFormulario = {
      ...sessao,
      paradasEmEdicao: { [chaveIda]: PARADAS },
      estadosRotaViva: { [chaveIda]: ESTADO_RECALCULADA_IDA },
    };

    const proxima = promoverServicoNaSessao(comEstado, SERVICO_B_UUID);

    expect(servicosEmConstrucaoDaSessao(proxima)).toHaveLength(1);
    expect(servicosDaSessao(proxima).some((s) => s.uuid === SERVICO_B_UUID)).toBe(false);
  });

  test("[inválido] estado sem-rota (OSRM mockado) → não promove, permanece em construção (RN-048)", () => {
    const sessao = sessaoCarregadaComEmConstrucao("ida");
    const chave = chaveItinerario(SERVICO_B_UUID, "ida");
    const comEstado: SessaoFormulario = {
      ...sessao,
      paradasEmEdicao: { [chave]: PARADAS },
      estadosRotaViva: { [chave]: ESTADO_SEM_ROTA },
    };

    const proxima = promoverServicoNaSessao(comEstado, SERVICO_B_UUID);

    expect(servicosEmConstrucaoDaSessao(proxima)).toHaveLength(1);
    expect(servicosDaSessao(proxima).some((s) => s.uuid === SERVICO_B_UUID)).toBe(false);
  });

  test("regressão-guarda: sem Serviço em construção com esse uuid → sessão devolvida inalterada (Serviço já completo do JSON não é tocado)", () => {
    const sessao = sessaoCarregadaComEmConstrucao("ida");
    const uuidCompleto = sessao.modo === "carregado" ? sessao.documento.autos.servicos[0].uuid : "";

    const proxima = promoverServicoNaSessao(sessao, uuidCompleto);

    expect(proxima).toBe(sessao);
  });
});

describe("promoverServicoNaSessao — modo novo (paridade com o comportamento pré-existente da TASK-061)", () => {
  test("Serviço em construção 'ida' com rota válida → promovido para sessao.servicos", () => {
    const sessao = sessaoNovaComEmConstrucao("ida");
    const chave = chaveItinerario(SERVICO_B_UUID, "ida");
    const comEstado: SessaoFormulario = {
      ...sessao,
      paradasEmEdicao: { [chave]: PARADAS },
      estadosRotaViva: { [chave]: ESTADO_RECALCULADA_IDA },
    };

    const proxima = promoverServicoNaSessao(comEstado, SERVICO_B_UUID);

    expect(servicosEmConstrucaoDaSessao(proxima)).toHaveLength(0);
    const servicos = servicosDaSessao(proxima);
    expect(servicos).toHaveLength(1);
    expect(servicos[0].uuid).toBe(SERVICO_B_UUID);
  });
});
