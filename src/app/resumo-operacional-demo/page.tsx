"use client";

// Harness próprio e transitório do painel "Resumo Operacional" (TASK-031;
// Spec 04 §10). A tela de Revisão completa (listas de erros/alertas, gate de
// exportação) é montada pela TASK-032 — quando isso acontecer, este harness é
// revisitado (mesmo precedente do `/descricao-itinerario-demo` da TASK-025).
// Existe só para dar ponto de montagem ao E2E do painel controlado.

import { PainelResumoOperacional } from "@/formulario/resumo";
import type { Autos } from "@/shared/contrato";

// UUIDs fixas (não `criarServico`/`crypto.randomUUID()`): o harness roda em
// SSR+hidratação do Next.js — uuids aleatórias divergiriam entre servidor e
// cliente e quebrariam a hidratação (mesmo cuidado dos demais harnesses).
//
// Autos sintético com dois Serviços e três Seções (A-B-C):
// - Serviço 1000-1CR: bidirecional, 3 viagens comuns na Ida (faixas distintas:
//   pico-manhã, entre-pico-tarde, noite) + 1 viagem de feriado (não deve
//   contar — RN-069/NEG-018), 1 viagem comum na Volta; matriz_seccionamento já
//   habilita o par ponta-a-ponta A-C (mostra a união sem dedupe visível: 2
//   pares no total, não 3).
// - Serviço 1000-2CR: unidirecional (só Ida), 1 viagem comum; sem
//   matriz_seccionamento habilitada (mostra o par ponta-a-ponta sozinho: 1 par).
const AUTOS_DEMO: Autos = {
  codigo: "1000",
  tipo: "Rodoviário",
  empresa: "Viação Demonstração Ltda.",
  status: "proposta",
  data_criacao: "2026-07-01",
  secoes: [
    {
      uuid: "11111111-1111-4111-8111-111111111111",
      municipio: "Santos",
      nome: "Terminal Santos",
      servicos: [
        {
          servico_uuid: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
          geolocalizacao_ida: { latitude: -23.9608, longitude: -46.3339 },
          geolocalizacao_volta: { latitude: -23.9611, longitude: -46.3342 },
        },
        {
          servico_uuid: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
          geolocalizacao_ida: { latitude: -23.9608, longitude: -46.3339 },
        },
      ],
    },
    {
      uuid: "22222222-2222-4222-8222-222222222222",
      municipio: "São Vicente",
      nome: "Terminal São Vicente",
      servicos: [
        {
          servico_uuid: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
          geolocalizacao_ida: { latitude: -23.9631, longitude: -46.3919 },
          geolocalizacao_volta: { latitude: -23.9629, longitude: -46.3915 },
        },
        {
          servico_uuid: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
          geolocalizacao_ida: { latitude: -23.9631, longitude: -46.3919 },
        },
      ],
    },
    {
      uuid: "33333333-3333-4333-8333-333333333333",
      municipio: "Praia Grande",
      nome: "Rodoviária Praia Grande",
      servicos: [
        {
          servico_uuid: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
          geolocalizacao_ida: { latitude: -24.0084, longitude: -46.4025 },
          geolocalizacao_volta: { latitude: -24.0081, longitude: -46.402 },
        },
      ],
    },
  ],
  servicos: [
    {
      uuid: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      numero_n: "1000-1CR",
      caracteristica_veiculo: "CR",
      carater: "principal",
      locais: [],
      matriz_distancias: [
        {
          secao_a_uuid: "11111111-1111-4111-8111-111111111111",
          secao_b_uuid: "22222222-2222-4222-8222-222222222222",
          distancia_trecho_ida: 8,
          distancia_trecho_volta: 8,
          valor_adotado_de_distancia: 8,
        },
        {
          secao_a_uuid: "22222222-2222-4222-8222-222222222222",
          secao_b_uuid: "33333333-3333-4333-8333-333333333333",
          distancia_trecho_ida: 6,
          distancia_trecho_volta: 6,
          valor_adotado_de_distancia: 6,
        },
        {
          secao_a_uuid: "11111111-1111-4111-8111-111111111111",
          secao_b_uuid: "33333333-3333-4333-8333-333333333333",
          distancia_trecho_ida: 14,
          distancia_trecho_volta: 14,
          valor_adotado_de_distancia: 14,
        },
      ],
      matriz_seccionamento: [
        {
          secao_a_uuid: "11111111-1111-4111-8111-111111111111",
          secao_b_uuid: "22222222-2222-4222-8222-222222222222",
          distancia_km: 8,
        },
        {
          // Par ponta-a-ponta (A-C) já habilitado: a união com o "sempre
          // comprável" (RN-072) não deve duplicar — 2 pares no total.
          secao_a_uuid: "11111111-1111-4111-8111-111111111111",
          secao_b_uuid: "33333333-3333-4333-8333-333333333333",
          distancia_km: 14,
        },
      ],
      itinerarios: [
        {
          sentido: "ida",
          paradas: [
            { ordem: 1, secao_uuid: "11111111-1111-4111-8111-111111111111" },
            { ordem: 2, secao_uuid: "22222222-2222-4222-8222-222222222222" },
            { ordem: 3, secao_uuid: "33333333-3333-4333-8333-333333333333" },
          ],
          rota: {
            geometria: { type: "LineString", coordinates: [[-46.3339, -23.9608], [-46.4025, -24.0084]] },
            distancia_km: 14,
            duracao_s: 1800,
            descricao_itinerario: { texto: "", itens: [] },
            trechos: [
              { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 8, duracao_s: 900 },
              { parada_origem_ordem: 2, parada_destino_ordem: 3, distancia_km: 6, duracao_s: 900 },
            ],
            pontos_de_rota: [],
          },
          viagens: [
            {
              uuid: "a1a1a1a1-0000-4000-8000-000000000001",
              horario_saida: "07:00:00",
              dia_semana: "segunda",
              viagem_feriado: false,
              horarios_paradas: [
                { parada_ordem: 1, offset_horario: "00:00:00" },
                { parada_ordem: 2, offset_horario: "00:15:00" },
                { parada_ordem: 3, offset_horario: "00:30:00" },
              ],
            },
            {
              uuid: "a1a1a1a1-0000-4000-8000-000000000002",
              horario_saida: "15:00:00",
              dia_semana: "segunda",
              viagem_feriado: false,
              horarios_paradas: [
                { parada_ordem: 1, offset_horario: "00:00:00" },
                { parada_ordem: 2, offset_horario: "00:15:00" },
                { parada_ordem: 3, offset_horario: "00:30:00" },
              ],
            },
            {
              uuid: "a1a1a1a1-0000-4000-8000-000000000003",
              horario_saida: "21:00:00",
              dia_semana: "segunda",
              viagem_feriado: false,
              horarios_paradas: [
                { parada_ordem: 1, offset_horario: "00:00:00" },
                { parada_ordem: 2, offset_horario: "00:15:00" },
                { parada_ordem: 3, offset_horario: "00:30:00" },
              ],
            },
            {
              // Viagem de feriado: não deve entrar em nenhuma contagem
              // (RN-069/NEG-018) — testável comparando com a tabela exibida.
              uuid: "a1a1a1a1-0000-4000-8000-000000000004",
              horario_saida: "07:30:00",
              dia_semana: "segunda",
              viagem_feriado: true,
              horarios_paradas: [
                { parada_ordem: 1, offset_horario: "00:00:00" },
                { parada_ordem: 2, offset_horario: "00:15:00" },
                { parada_ordem: 3, offset_horario: "00:30:00" },
              ],
            },
          ],
        },
        {
          sentido: "volta",
          paradas: [
            { ordem: 1, secao_uuid: "33333333-3333-4333-8333-333333333333" },
            { ordem: 2, secao_uuid: "22222222-2222-4222-8222-222222222222" },
            { ordem: 3, secao_uuid: "11111111-1111-4111-8111-111111111111" },
          ],
          rota: {
            geometria: { type: "LineString", coordinates: [[-46.4025, -24.0084], [-46.3339, -23.9608]] },
            distancia_km: 14,
            duracao_s: 1800,
            descricao_itinerario: { texto: "", itens: [] },
            trechos: [
              { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 6, duracao_s: 900 },
              { parada_origem_ordem: 2, parada_destino_ordem: 3, distancia_km: 8, duracao_s: 900 },
            ],
            pontos_de_rota: [],
          },
          viagens: [
            {
              uuid: "a1a1a1a1-0000-4000-8000-000000000005",
              horario_saida: "18:00:00",
              dia_semana: "segunda",
              viagem_feriado: false,
              horarios_paradas: [
                { parada_ordem: 1, offset_horario: "00:00:00" },
                { parada_ordem: 2, offset_horario: "00:15:00" },
                { parada_ordem: 3, offset_horario: "00:30:00" },
              ],
            },
          ],
        },
      ],
    },
    {
      uuid: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
      numero_n: "1000-2CR",
      caracteristica_veiculo: "CR",
      carater: "semidireta",
      locais: [],
      matriz_distancias: [
        {
          secao_a_uuid: "11111111-1111-4111-8111-111111111111",
          secao_b_uuid: "22222222-2222-4222-8222-222222222222",
          distancia_trecho_ida: 8,
          valor_adotado_de_distancia: 8,
        },
      ],
      matriz_seccionamento: [],
      itinerarios: [
        {
          sentido: "ida",
          paradas: [
            { ordem: 1, secao_uuid: "11111111-1111-4111-8111-111111111111" },
            { ordem: 2, secao_uuid: "22222222-2222-4222-8222-222222222222" },
          ],
          rota: {
            geometria: { type: "LineString", coordinates: [[-46.3339, -23.9608], [-46.3919, -23.9631]] },
            distancia_km: 8,
            duracao_s: 900,
            descricao_itinerario: { texto: "", itens: [] },
            trechos: [
              { parada_origem_ordem: 1, parada_destino_ordem: 2, distancia_km: 8, duracao_s: 900 },
            ],
            pontos_de_rota: [],
          },
          viagens: [
            {
              uuid: "b1b1b1b1-0000-4000-8000-000000000001",
              horario_saida: "09:30:00",
              dia_semana: "sabado",
              viagem_feriado: false,
              horarios_paradas: [
                { parada_ordem: 1, offset_horario: "00:00:00" },
                { parada_ordem: 2, offset_horario: "00:15:00" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export default function PaginaResumoOperacionalDemo() {
  return (
    <main>
      <h1>Resumo Operacional — harness de teste (TASK-031)</h1>
      <PainelResumoOperacional autos={AUTOS_DEMO} />
    </main>
  );
}
