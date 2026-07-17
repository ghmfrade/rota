import { describe, expect, test } from "vitest";
import type { z } from "zod";
import { paradaDeSecao, promoverServico } from "@/formulario/itinerarios";
import type { ServicoEmConstrucao } from "@/formulario/sessao";
import type { EstadoRotaViva } from "@/formulario/roteamento";
import { esquemaRota } from "@/shared/contrato";

type Rota = z.infer<typeof esquemaRota>;

// TASK-061 (DEC-053) — promoção `ServicoEmConstrucao → Servico` completo no
// fluxo "novo": ao concluir a edição do itinerário, o Serviço em construção
// ganha `itinerarios[]` (paradas+rota) e `matriz_distancias` reconciliada.
// `uuid` é a identidade preservada (RN-001/002/004) — a regra crítica nº 1.

const SECAO_A_UUID = "44444444-4444-4444-8444-444444444444";
const SECAO_B_UUID = "55555555-5555-4555-8555-555555555555";
const SERVICO_UUID = "cccccccc-3333-4333-8333-cccccccccccc";

const ROTA_IDA: Rota = {
  geometria: { type: "LineString", coordinates: [[-46.3339, -23.9608], [-46.3919, -23.9631]] },
  distancia_km: 8,
  duracao_s: 1080,
  descricao_itinerario: {
    texto: "Santos - Terminal Santos, Rodovia dos Imigrantes, São Vicente - Terminal São Vicente.",
    itens: [
      { tipo: "secao", secao_uuid: SECAO_A_UUID, rotulo: "Santos - Terminal Santos" },
      { tipo: "via", nome: "Rodovia dos Imigrantes" },
      { tipo: "secao", secao_uuid: SECAO_B_UUID, rotulo: "São Vicente - Terminal São Vicente" },
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

function servicoEmConstrucao(
  direcionalidade: ServicoEmConstrucao["direcionalidade"],
): ServicoEmConstrucao {
  return {
    uuid: SERVICO_UUID,
    numero_n: "2000-1SU",
    caracteristica_veiculo: "SU",
    carater: "principal",
    direcionalidade,
  };
}

const PARADAS = [paradaDeSecao(SECAO_A_UUID), paradaDeSecao(SECAO_B_UUID)];
const ESTADO_RECALCULADA_IDA: EstadoRotaViva = { situacao: "recalculada", rota: ROTA_IDA };
const ESTADO_CONGELADA_VOLTA: EstadoRotaViva = { situacao: "congelada", rota: ROTA_VOLTA };
const ESTADO_SEM_ROTA: EstadoRotaViva = { situacao: "sem-rota", falha: { tipo: "sem-rota" } };

describe("promoverServico — direcionalidade única (ida/volta)", () => {
  test("rota válida + paradas resolvidas → promove com 1 itinerário, uuid preservada, matriz reconciliada", () => {
    const emConstrucao = servicoEmConstrucao("ida");

    const promovido = promoverServico(
      emConstrucao,
      { ida: PARADAS },
      { ida: ESTADO_RECALCULADA_IDA },
    );

    expect(promovido).not.toBeNull();
    // RN-001/002/004 — a regra crítica nº 1: uuid herdada sem regeneração.
    expect(promovido?.uuid).toBe(SERVICO_UUID);
    expect(promovido?.numero_n).toBe("2000-1SU");
    expect(promovido?.itinerarios).toHaveLength(1);
    expect(promovido?.itinerarios[0]).toEqual({
      sentido: "ida",
      paradas: [
        { ordem: 1, secao_uuid: SECAO_A_UUID },
        { ordem: 2, secao_uuid: SECAO_B_UUID },
      ],
      rota: ROTA_IDA,
      viagens: [],
    });
    expect(promovido?.matriz_distancias).toEqual([
      {
        secao_a_uuid: SECAO_A_UUID,
        secao_b_uuid: SECAO_B_UUID,
        distancia_trecho_ida: 8,
        valor_adotado_de_distancia: 8,
      },
    ]);
    expect(promovido?.matriz_seccionamento).toEqual([]);
    expect(promovido?.locais).toEqual([]);
  });

  test("[inválido] estado sem-rota → não promove (RN-048: sem gravar Serviço incompleto)", () => {
    const emConstrucao = servicoEmConstrucao("ida");

    const promovido = promoverServico(emConstrucao, { ida: PARADAS }, { ida: ESTADO_SEM_ROTA });

    expect(promovido).toBeNull();
  });

  test("[inválido] menos de 2 paradas resolvidas → não promove (RN-034)", () => {
    const emConstrucao = servicoEmConstrucao("ida");

    const promovido = promoverServico(
      emConstrucao,
      { ida: [paradaDeSecao(SECAO_A_UUID)] },
      { ida: ESTADO_RECALCULADA_IDA },
    );

    expect(promovido).toBeNull();
  });

  test("[inválido] nenhum estado registrado ainda para o sentido → não promove", () => {
    const emConstrucao = servicoEmConstrucao("ida");

    const promovido = promoverServico(emConstrucao, { ida: PARADAS }, {});

    expect(promovido).toBeNull();
  });
});

describe("promoverServico — direcionalidade 'ambos'", () => {
  test("os dois sentidos com rota válida → promove com 2 itinerários", () => {
    const emConstrucao = servicoEmConstrucao("ambos");

    const promovido = promoverServico(
      emConstrucao,
      { ida: PARADAS, volta: [...PARADAS].reverse() },
      { ida: ESTADO_RECALCULADA_IDA, volta: ESTADO_CONGELADA_VOLTA },
    );

    expect(promovido).not.toBeNull();
    expect(promovido?.uuid).toBe(SERVICO_UUID);
    expect(promovido?.itinerarios.map((it) => it.sentido).sort()).toEqual(["ida", "volta"]);
  });

  test("[inválido] só a Ida está pronta → não promove (Volta ainda falta)", () => {
    const emConstrucao = servicoEmConstrucao("ambos");

    const promovido = promoverServico(
      emConstrucao,
      { ida: PARADAS },
      { ida: ESTADO_RECALCULADA_IDA },
    );

    expect(promovido).toBeNull();
  });
});

describe("promoverServico — o Serviço promovido passa no schema strict por itinerário/matriz", () => {
  test("cada itinerário e a matriz do Serviço promovido são schema-válidos (o Servico inteiro só após viagens — RN-039)", () => {
    const emConstrucao = servicoEmConstrucao("ida");
    const promovido = promoverServico(
      emConstrucao,
      { ida: PARADAS },
      { ida: ESTADO_RECALCULADA_IDA },
    );
    expect(promovido).not.toBeNull();
    if (!promovido) throw new Error("esperava promoção");

    expect(esquemaRota.safeParse(promovido.itinerarios[0].rota).success).toBe(true);
    // O Servico inteiro NÃO passa ainda: `viagens` é obrigatório (min 1,
    // RN-039) e nasce vazio na promoção — é preenchido pela etapa Viagens.
    expect(promovido.itinerarios[0].viagens).toEqual([]);
  });
});
