// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { Secao } from "@/shared/contrato";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";
import { indiceDeNomes } from "@/shared/geo";
import { act, renderizar } from "../shared-ui/_ajuda-render";
import { PainelReusoSecao } from "@/formulario/itinerarios";

// TASK-074 — o painel "Reutilizar Seção existente" (Spec 04 §7.1) foi extraído
// do `EditorMapaItinerario` para a coluna lateral, acima da tabela de paradas
// (relato do responsável 2026-07-17). O motor de reuso
// (`contribuirParaSecaoExistente`/`pontosOfertadosParaReuso`, RN-025..027) NÃO
// é mockado nem reescrito — só o lugar do painel na tela muda. Mesmos
// `data-testid` de sempre (`reuso-secoes`, `select-secao-reuso`,
// `select-ponto-reuso`, `confirmar-reuso`); a mensagem de recusa ganha testid
// próprio (`mensagem-recusa-reuso`).

const SERVICO = "11111111-1111-4111-8111-111111111111";
const SERVICO_OUTRO = "22222222-2222-4222-8222-222222222222";

// Ponto dentro do polígono sintético; o ponto distante fica a ~11 km (> 350 m).
const P0 = { latitude: -22.5, longitude: -50 };
const P1 = { latitude: -22.5001, longitude: -50.0001 }; // ~15 m de P0

const MUNICIPIO_DEMO: FeatureMunicipio = {
  type: "Feature",
  properties: { codarea: "3500000" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-60, -30],
        [-40, -30],
        [-40, -15],
        [-60, -15],
        [-60, -30],
      ],
    ],
  },
};
const RECURSOS = {
  features: [MUNICIPIO_DEMO],
  nomes: indiceDeNomes([{ codigo_ibge: "3500000", nome: "Cidade Demo" }]),
};
const RECURSOS_FORA_DE_SP = { features: [], nomes: indiceDeNomes([]) };

// Seção com UM único ponto contribuído por outro Serviço — reutilizar lança o
// ponto direto no mapa (Spec 04 §7.1: "se houver apenas um ponto, ele é
// lançado direto"), sem `select-ponto-reuso`.
const SECAO_UM_PONTO: Secao = {
  uuid: "00000000-0000-4000-8000-000000000000",
  municipio: "Cidade Demo",
  nome: "Terminal Demo",
  servicos: [{ servico_uuid: SERVICO_OUTRO, geolocalizacao_ida: P0 }],
};

// Seção com DOIS pontos distintos contribuídos por outro Serviço — oferta
// `select-ponto-reuso` com as duas posições.
const SECAO_DOIS_PONTOS: Secao = {
  uuid: "11111111-0000-4000-8000-000000000001",
  municipio: "Cidade Demo",
  nome: "Terminal Dois Pontos",
  servicos: [
    { servico_uuid: SERVICO_OUTRO, geolocalizacao_ida: P0 },
    { servico_uuid: "33333333-3333-4333-8333-333333333333", geolocalizacao_ida: P1 },
  ],
};

// Seção com dois pontos (de outros Serviços) a ~660 m um do outro — o par
// isolado é aceito (cada um a ~330 m do centroide, < 350 m). Reutilizar o
// PONTO_B como Serviço BIDIRECIONAL contribui o mesmo ponto duas vezes (Ida e
// Volta — Spec 04 §7.1 "cria Ida e Volta no mesmo ponto"), deslocando o
// centroide resultante em direção ao PONTO_B e empurrando o PONTO_A para
// além dos 350 m (RN-027: "candidato que empurra ponto já aceito para fora
// dos 350 m do novo centroide").
const PONTO_A = { latitude: -22.5, longitude: -50 };
const PONTO_B = { latitude: -22.505935, longitude: -50 }; // ~660 m ao sul de PONTO_A
const SECAO_BORDA: Secao = {
  uuid: "22222222-0000-4000-8000-000000000002",
  municipio: "Cidade Demo",
  nome: "Terminal Borda",
  servicos: [
    { servico_uuid: SERVICO_OUTRO, geolocalizacao_ida: PONTO_A },
    { servico_uuid: "33333333-3333-4333-8333-333333333334", geolocalizacao_ida: PONTO_B },
  ],
};

function montar(props?: Partial<Parameters<typeof PainelReusoSecao>[0]>) {
  const aoAtualizarSecao = vi.fn();
  const utils = renderizar(
    <PainelReusoSecao
      secoes={[SECAO_UM_PONTO]}
      servicoUuid={SERVICO}
      sentido="ida"
      bidirecional={false}
      recursosMunicipio={RECURSOS}
      aoAtualizarSecao={aoAtualizarSecao}
      {...props}
    />,
  );
  return { ...utils, aoAtualizarSecao };
}

function selecionar(select: HTMLSelectElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value",
  )!.set!;
  act(() => {
    setter.call(select, valor);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function clicar(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("PainelReusoSecao — mesmos data-testid do painel original (Spec 04 §7.1)", () => {
  it("monta o painel com o select de Seção no padrão Cidade - Nome da Seção (RN-076)", () => {
    const { container, desmontar } = montar();
    const painel = container.querySelector('[data-testid="reuso-secoes"]');
    const select = container.querySelector('[data-testid="select-secao-reuso"]') as HTMLSelectElement;

    expect(painel).not.toBeNull();
    expect(select.querySelector(`option[value="${SECAO_UM_PONTO.uuid}"]`)?.textContent).toBe(
      "Cidade Demo - Terminal Demo",
    );
    desmontar();
  });
});

describe("PainelReusoSecao — caso válido: reuso bem-sucedido (RN-025..027)", () => {
  it("Seção com um único ponto: seleciona e confirma sem select-ponto-reuso, chamando aoAtualizarSecao", () => {
    const { container, aoAtualizarSecao, desmontar } = montar();
    const select = container.querySelector('[data-testid="select-secao-reuso"]') as HTMLSelectElement;

    selecionar(select, SECAO_UM_PONTO.uuid);

    expect(container.querySelector('[data-testid="select-ponto-reuso"]')).toBeNull();
    clicar(container.querySelector('[data-testid="confirmar-reuso"]')!);

    expect(aoAtualizarSecao).toHaveBeenCalledTimes(1);
    const secaoAtualizada = aoAtualizarSecao.mock.calls[0][0] as Secao;
    expect(
      secaoAtualizada.servicos.find((s) => s.servico_uuid === SERVICO)?.geolocalizacao_ida,
    ).toEqual(P0);
    desmontar();
  });

  it("Seção com dois pontos oferece select-ponto-reuso; confirma o ponto escolhido", () => {
    const { container, aoAtualizarSecao, desmontar } = montar({ secoes: [SECAO_DOIS_PONTOS] });
    const select = container.querySelector('[data-testid="select-secao-reuso"]') as HTMLSelectElement;
    selecionar(select, SECAO_DOIS_PONTOS.uuid);

    const selectPonto = container.querySelector(
      '[data-testid="select-ponto-reuso"]',
    ) as HTMLSelectElement;
    expect(selectPonto).not.toBeNull();
    selecionar(selectPonto, "1");

    clicar(container.querySelector('[data-testid="confirmar-reuso"]')!);

    expect(aoAtualizarSecao).toHaveBeenCalledTimes(1);
    const secaoAtualizada = aoAtualizarSecao.mock.calls[0][0] as Secao;
    expect(
      secaoAtualizada.servicos.find((s) => s.servico_uuid === SERVICO)?.geolocalizacao_ida,
    ).toEqual(P1);
    desmontar();
  });
});

describe("PainelReusoSecao — casos inválidos (comportamento preservado)", () => {
  it("[inválido] recusa de 350 m: NENHUM aoAtualizarSecao e mensagem junto ao painel (RN-027)", () => {
    const { container, aoAtualizarSecao, desmontar } = montar({
      secoes: [SECAO_BORDA],
      bidirecional: true,
    });
    const select = container.querySelector('[data-testid="select-secao-reuso"]') as HTMLSelectElement;
    selecionar(select, SECAO_BORDA.uuid);

    // Dois pontos distintos ofertados (PONTO_A, PONTO_B) — escolhe o PONTO_B
    // (índice 1), cuja duplicação (Ida+Volta bidirecional) estoura os 350 m.
    const selectPonto = container.querySelector(
      '[data-testid="select-ponto-reuso"]',
    ) as HTMLSelectElement;
    expect(selectPonto).not.toBeNull();
    selecionar(selectPonto, "1");

    clicar(container.querySelector('[data-testid="confirmar-reuso"]')!);

    expect(aoAtualizarSecao).not.toHaveBeenCalled();
    const mensagem = container.querySelector('[data-testid="mensagem-recusa-reuso"]');
    expect(mensagem).not.toBeNull();
    expect(mensagem?.textContent).toContain("350 m");
    desmontar();
  });

  it("[inválido] fora de SP: NENHUM aoAtualizarSecao e mensagem de fora de SP", () => {
    const { container, aoAtualizarSecao, desmontar } = montar({
      recursosMunicipio: RECURSOS_FORA_DE_SP,
    });
    const select = container.querySelector('[data-testid="select-secao-reuso"]') as HTMLSelectElement;
    selecionar(select, SECAO_UM_PONTO.uuid);

    clicar(container.querySelector('[data-testid="confirmar-reuso"]')!);

    expect(aoAtualizarSecao).not.toHaveBeenCalled();
    const mensagem = container.querySelector('[data-testid="mensagem-recusa-reuso"]');
    expect(mensagem).not.toBeNull();
    expect(mensagem?.textContent).toContain("Estado de São Paulo");
    desmontar();
  });

  it("[inválido] sem Seção selecionada, o botão confirmar-reuso não é renderizado", () => {
    const { container, desmontar } = montar();
    expect(container.querySelector('[data-testid="confirmar-reuso"]')).toBeNull();
    desmontar();
  });
});
