import { describe, expect, test, vi } from "vitest";
import { coletarPendencias, type ItinerarioAoVivo } from "@/formulario/pendencias";
import { ETAPAS, rotuloEtapa, type IdEtapa } from "@/formulario/layout/etapas";
import type { SessaoFormulario } from "@/formulario/sessao";
import {
  recalcularItinerario,
  type ComporDescricao,
  type EstadoRotaViva,
} from "@/formulario/roteamento";
import type { DescricaoItinerario } from "@/shared/contrato";
import type { Ponto } from "@/shared/geo";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-014 — layout por etapas + painel de pendências (Spec 04 §4/§11; RN-078).
// Aqui se testa a parte pura: a coleta de pendências a partir da sessão e a
// definição das 7 etapas. A casca (LayoutFormulario) e a navegação por clique
// são cobertas pelo E2E (testes/e2e/formulario-layout.spec.ts).

const sessaoNovo: SessaoFormulario = { modo: "novo" };
const sessaoCarregado: SessaoFormulario = {
  modo: "carregado",
  documento: documentoExemploMinimo(),
  alertasImportacao: [],
};

describe("coletarPendencias (Spec 04 §11; RN-078)", () => {
  test('modo "novo" produz o alerta "documento criado do zero" (§11)', () => {
    const pendencias = coletarPendencias(sessaoNovo);
    expect(pendencias).toHaveLength(1);
    const [alerta] = pendencias;
    expect(alerta.id).toBe("documento-criado-do-zero");
    expect(alerta.severidade).toBe("alerta");
    expect(alerta.mensagem).toContain("Documento criado do zero");
  });

  test('o alerta de documento do zero navega para a etapa Revisão (DEC-033)', () => {
    const [alerta] = coletarPendencias(sessaoNovo);
    expect(alerta.etapaAlvo).toBe<IdEtapa>("revisao");
    // O destino tem de ser uma etapa real do stepper.
    expect(ETAPAS.some((e) => e.id === alerta.etapaAlvo)).toBe(true);
  });

  test('modo "carregado" não produz pendências neste estágio do projeto', () => {
    // Caso "inválido" de proteção: as demais pendências de §11 dependem de
    // dados que ainda não existem (rota, matriz, horários) — a coleta NÃO pode
    // inventá-las (docs-dev/04 princípio 2). Carregar um documento válido, sem
    // esses dados, não pode gerar pendência aqui.
    expect(coletarPendencias(sessaoCarregado)).toHaveLength(0);
  });

  test("nenhuma pendência é bloqueante neste estágio (não travar exportação por engano)", () => {
    // Proteção contra falso gate: a única pendência conhecível é um alerta.
    const todas = [
      ...coletarPendencias(sessaoNovo),
      ...coletarPendencias(sessaoCarregado),
    ];
    expect(todas.every((p) => p.severidade === "alerta")).toBe(true);
  });

  test("é função pura — não persiste nem acumula entre chamadas (NEG-004)", () => {
    const primeira = coletarPendencias(sessaoNovo);
    const segunda = coletarPendencias(sessaoNovo);
    expect(segunda).toHaveLength(primeira.length);
    // Instâncias novas a cada chamada (recomputado, não memorizado).
    expect(segunda).not.toBe(primeira);
  });
});

// TASK-044 — pendência bloqueante "itinerário sem rota válida" (Spec 04 §11/
// §14; RN-048/049/078), consumindo o estado de rota ao vivo da TASK-024
// (DEC-040/041). `itinerariosAoVivo` é o segundo parâmetro opcional de
// `coletarPendencias` — quem monta essa lista a partir de gestos reais de
// mapa é a TASK-019 (ver `docs-dev/06`, nota "Obrigação de fiação"); aqui
// ela é montada diretamente para testar a coleta pura.

const DESCRICAO: DescricaoItinerario = {
  texto: "Seção A, Rua X, Seção B",
  itens: [
    { tipo: "secao", secao_uuid: "11111111-1111-4111-8111-111111111111", rotulo: "Cidade A - Seção A" },
    { tipo: "via", nome: "Rua X" },
    { tipo: "secao", secao_uuid: "22222222-2222-4222-8222-222222222222", rotulo: "Cidade B - Seção B" },
  ],
};

const ROTA_VALIDA = {
  geometria: {
    type: "LineString" as const,
    coordinates: [
      [-46.63, -23.55],
      [-47.1, -22.9],
    ] as [number, number][],
  },
  distancia_km: 12.34,
  duracao_s: 900,
  descricao_itinerario: DESCRICAO,
  trechos: [
    { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 12.34, duracao_s: 900 },
  ],
  pontos_de_rota: [],
};

const ESTADO_CONGELADA: EstadoRotaViva = { situacao: "congelada", rota: ROTA_VALIDA };
const ESTADO_RECALCULADA: EstadoRotaViva = { situacao: "recalculada", rota: ROTA_VALIDA };
const ESTADO_SEM_ROTA: EstadoRotaViva = {
  situacao: "sem-rota",
  falha: { tipo: "sem-rota" },
};

describe("coletarPendencias — itinerário sem rota válida (TASK-044; RN-048/049/078)", () => {
  test("itinerário 'sem-rota' → 1 pendência bloqueante com a mensagem de §14", () => {
    const itinerarios: ItinerarioAoVivo[] = [
      { numeroN: "0000-1CR", sentido: "ida", estadoRota: ESTADO_SEM_ROTA },
    ];

    const pendencias = coletarPendencias(sessaoCarregado, itinerarios);

    expect(pendencias).toHaveLength(1);
    const [pendencia] = pendencias;
    expect(pendencia.severidade).toBe("bloqueante");
    expect(pendencia.mensagem).toBe(
      "O itinerário de Ida do Serviço 0000-1CR está sem rota calculada. Recalcule antes de exportar.",
    );
    expect(pendencia.etapaAlvo).toBe<IdEtapa>("secoes-locais-itinerarios");
  });

  test("[inválido] itinerário com rota 'congelada' ou 'recalculada' não gera pendência", () => {
    const itinerarios: ItinerarioAoVivo[] = [
      { numeroN: "0000-1CR", sentido: "ida", estadoRota: ESTADO_CONGELADA },
      { numeroN: "0000-1CR", sentido: "volta", estadoRota: ESTADO_RECALCULADA },
    ];

    expect(coletarPendencias(sessaoCarregado, itinerarios)).toHaveLength(0);
  });

  test("um itinerário sem rota e outro com rota → só a pendência do primeiro", () => {
    const itinerarios: ItinerarioAoVivo[] = [
      { numeroN: "0000-1CR", sentido: "ida", estadoRota: ESTADO_SEM_ROTA },
      { numeroN: "0000-1CR", sentido: "volta", estadoRota: ESTADO_CONGELADA },
    ];

    const pendencias = coletarPendencias(sessaoCarregado, itinerarios);

    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].id).toBe("rota-ausente-0000-1CR-ida");
  });

  test("[inválido] a mensagem nunca menciona tarifa, R$ ou distância (RN-049)", () => {
    const itinerarios: ItinerarioAoVivo[] = [
      { numeroN: "0000-1CR", sentido: "volta", estadoRota: ESTADO_SEM_ROTA },
    ];

    const [pendencia] = coletarPendencias(sessaoCarregado, itinerarios);

    expect(pendencia.mensagem.toLowerCase()).not.toContain("tarifa");
    expect(pendencia.mensagem).not.toContain("R$");
    expect(pendencia.mensagem.toLowerCase()).not.toContain("distância");
  });

  test("sentido 'volta' é rotulado como 'Volta' na mensagem", () => {
    const itinerarios: ItinerarioAoVivo[] = [
      { numeroN: "0000-2CR", sentido: "volta", estadoRota: ESTADO_SEM_ROTA },
    ];

    const [pendencia] = coletarPendencias(sessaoCarregado, itinerarios);

    expect(pendencia.mensagem).toContain("O itinerário de Volta do Serviço 0000-2CR");
  });

  test("sem segundo argumento (default vazio), nenhuma pendência de rota é emitida", () => {
    // Compatibilidade: nenhum chamador existente passa o novo parâmetro; a
    // ausência de fiação (TASK-017/018/019 ainda não feitas) não pode
    // fabricar pendência do nada.
    expect(coletarPendencias(sessaoCarregado)).toHaveLength(0);
  });

  test("integração leve: rota que falha no OSRM (mockado) vira pendência bloqueante", async () => {
    const PARADA_A: Ponto = { latitude: -23.55, longitude: -46.63 };
    const PARADA_B: Ponto = { latitude: -22.9, longitude: -47.1 };
    const comporDescricao: ComporDescricao = vi.fn(() => DESCRICAO);
    const fetchFn = vi
      .fn()
      .mockResolvedValue({ json: () => Promise.resolve({ code: "NoRoute", routes: [] }) }) as unknown as typeof fetch;

    const estadoRota = await recalcularItinerario(
      { paradas: [PARADA_A, PARADA_B] },
      comporDescricao,
      { fetchFn },
    );

    expect(estadoRota.situacao).toBe("sem-rota");

    const pendencias = coletarPendencias(sessaoCarregado, [
      { numeroN: "0000-1CR", sentido: "ida", estadoRota },
    ]);

    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].severidade).toBe("bloqueante");
  });
});

describe("ETAPAS (Spec 04 §4)", () => {
  test("são exatamente as 7 etapas, na ordem da spec", () => {
    expect(ETAPAS.map((e) => e.id)).toEqual([
      "identificacao",
      "servicos",
      "secoes-locais-itinerarios",
      "viagens-horarios",
      "matrizes",
      "revisao",
      "exportacao",
    ]);
  });

  test("ids são únicos", () => {
    const ids = ETAPAS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("rotuloEtapa devolve o rótulo de exibição de cada etapa", () => {
    expect(rotuloEtapa("identificacao")).toBe("Identificação");
    expect(rotuloEtapa("exportacao")).toBe("Exportação JSON/PDF");
    // Toda etapa declarada tem rótulo não vazio.
    for (const etapa of ETAPAS) {
      expect(rotuloEtapa(etapa.id)).toBe(etapa.rotulo);
      expect(etapa.rotulo.length).toBeGreaterThan(0);
    }
  });
});
