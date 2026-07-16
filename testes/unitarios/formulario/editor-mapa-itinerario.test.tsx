// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { Local, PontoDeRota, Secao } from "@/shared/contrato";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";
import { indiceDeNomes } from "@/shared/geo";
import type { Coordenada, LinhaMapa, MarcadorMapa } from "@/shared/mapa";
import { act, renderizar } from "../shared-ui/_ajuda-render";

// TASK-060 — mapa ÚNICO de itinerários (`EditorMapaItinerario`, Spec 04 §7;
// DEC-054). O `<Mapa>` real (MapLibre/WebGL, indisponível em jsdom) é
// substituído por um dublê que captura as props: assim exercitamos a
// composição de marcadores (Seção + Local no mesmo canvas), o roteamento do
// gesto (clique esquerdo → Seção, clique direito → Local) e as recusas dos
// motores reusados (350 m / fora de SP), sem desenhar o mapa. Os motores de
// Seção/Local (`fluxos-secao`/`fluxos-local`) NÃO são mockados — a task reusa
// o comportamento intacto.

interface PropsMapaCapturadas {
  marcadores?: readonly MarcadorMapa[];
  linhas?: readonly LinhaMapa[];
  aoClicar?: (p: Coordenada) => void;
  aoClicarNaLinha?: (p: Coordenada) => void;
  aoClicarDireito?: (p: Coordenada) => void;
}

const capturado = vi.hoisted<{ props: PropsMapaCapturadas | null }>(() => ({ props: null }));

vi.mock("@/shared/mapa", () => ({
  Mapa: (props: PropsMapaCapturadas) => {
    capturado.props = props;
    return null;
  },
}));

// Importado DEPOIS do mock (o componente resolve `@/shared/mapa` para o dublê).
import { EditorMapaItinerario } from "@/formulario/itinerarios";

const COR_SECAO = "#1d4ed8";
const COR_LOCAL = "#16a34a";

const SERVICO = "11111111-1111-4111-8111-111111111111";
const SERVICO_OUTRO = "22222222-2222-4222-8222-222222222222";

// Ponto dentro do polígono sintético; o par distante fica a ~11 km (> 350 m).
const P0 = { latitude: -22.5, longitude: -50 };
const P_LONGE: Coordenada = { lng: -50, lat: -22.6 };
const P0_COORD: Coordenada = { lng: P0.longitude, lat: P0.latitude };

// Polígono municipal sintético largo (não o geojson real) — cobre P0 e P_LONGE.
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

// Seção com DUAS contribuições no mesmo ponto (Serviço corrente + outro): ao
// arrastar o ponto do Serviço corrente, o cluster retém o ponto do outro
// Serviço, permitindo exercitar a recusa dos 350 m (RN-027).
const SECAO_DUPLA: Secao = {
  uuid: "00000000-0000-4000-8000-000000000000",
  municipio: "Cidade Demo",
  nome: "Terminal Demo",
  servicos: [
    { servico_uuid: SERVICO, geolocalizacao_ida: P0 },
    { servico_uuid: SERVICO_OUTRO, geolocalizacao_ida: P0 },
  ],
};

const LOCAL_BI: Local = {
  uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  municipio: "Cidade Demo",
  nome: "Ponto Demo",
  geolocalizacao_ida: P0,
  geolocalizacao_volta: P0,
};

function montar(props?: Partial<Parameters<typeof EditorMapaItinerario>[0]>) {
  const aoCriarSecao = vi.fn();
  const aoAtualizarSecao = vi.fn();
  const aoCriarLocal = vi.fn();
  const aoAtualizarLocal = vi.fn();
  const aoExcluirSentido = vi.fn();
  const aoCriarPontoDeRota = vi.fn();
  const aoMoverPontoDeRota = vi.fn();
  const aoRemoverPontoDeRota = vi.fn();
  const utils = renderizar(
    <EditorMapaItinerario
      secoes={[SECAO_DUPLA]}
      locais={[LOCAL_BI]}
      servicoUuid={SERVICO}
      sentido="ida"
      bidirecional
      recursosMunicipio={RECURSOS}
      aoCriarSecao={aoCriarSecao}
      aoAtualizarSecao={aoAtualizarSecao}
      aoCriarLocal={aoCriarLocal}
      aoAtualizarLocal={aoAtualizarLocal}
      aoExcluirSentido={aoExcluirSentido}
      aoCriarPontoDeRota={aoCriarPontoDeRota}
      aoMoverPontoDeRota={aoMoverPontoDeRota}
      aoRemoverPontoDeRota={aoRemoverPontoDeRota}
      {...props}
    />,
  );
  return {
    ...utils,
    aoCriarSecao,
    aoAtualizarSecao,
    aoCriarLocal,
    aoAtualizarLocal,
    aoExcluirSentido,
    aoCriarPontoDeRota,
    aoMoverPontoDeRota,
    aoRemoverPontoDeRota,
  };
}

function digitar(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, valor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function clicar(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("EditorMapaItinerario — marcadores de Seção e Local no mesmo mapa", () => {
  it("monta ambos os marcadores, circulares e com cores distintas por tipo", () => {
    const { desmontar } = montar();
    const marcadores = capturado.props?.marcadores ?? [];
    const secao = marcadores.find((m) => m.id === `secao-${SECAO_DUPLA.uuid}`);
    const local = marcadores.find((m) => m.id === `local-${LOCAL_BI.uuid}`);

    expect(secao?.forma).toBe("circulo");
    expect(local?.forma).toBe("circulo");
    expect(secao?.cor).toBe(COR_SECAO);
    expect(local?.cor).toBe(COR_LOCAL);
    expect(secao?.cor).not.toBe(local?.cor);
    desmontar();
  });

  it("repassa a linhaRota ao <Mapa> quando presente e vazio quando ausente", () => {
    const linha: LinhaMapa = { id: "rota-ativa", pontos: [P0_COORD, P_LONGE] };
    const comRota = montar({ linhaRota: linha });
    expect(capturado.props?.linhas).toEqual([linha]);
    comRota.desmontar();

    const semRota = montar();
    expect(capturado.props?.linhas).toEqual([]);
    semRota.desmontar();
  });
});

describe("EditorMapaItinerario — roteamento do gesto (DEC-054)", () => {
  it("clique esquerdo abre o formulário de Seção; clique direito o de Local", () => {
    const { container, desmontar } = montar();

    act(() => capturado.props?.aoClicar?.(P0_COORD));
    expect(container.querySelector('[data-testid="form-criar-secao"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="form-criar-local"]')).toBeNull();

    act(() => capturado.props?.aoClicarDireito?.(P0_COORD));
    expect(container.querySelector('[data-testid="form-criar-local"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="form-criar-secao"]')).toBeNull();
    desmontar();
  });

  it("clique esquerdo + Criar Seção chama aoCriarSecao com município derivado", () => {
    const { container, aoCriarSecao, desmontar } = montar();
    act(() => capturado.props?.aoClicar?.(P0_COORD));

    const input = container.querySelector('[data-testid="nome-secao-input"]') as HTMLInputElement;
    digitar(input, "Nova Seção");
    clicar(container.querySelector('[data-testid="confirmar-criar-secao"]')!);

    expect(aoCriarSecao).toHaveBeenCalledTimes(1);
    expect(aoCriarSecao.mock.calls[0][0]).toMatchObject({ municipio: "Cidade Demo", nome: "Nova Seção" });
    desmontar();
  });

  it("clique direito + Criar Local chama aoCriarLocal com município derivado", () => {
    const { container, aoCriarLocal, desmontar } = montar();
    act(() => capturado.props?.aoClicarDireito?.(P0_COORD));

    const input = container.querySelector('[data-testid="nome-local-input"]') as HTMLInputElement;
    digitar(input, "Novo Local");
    clicar(container.querySelector('[data-testid="confirmar-criar-local"]')!);

    expect(aoCriarLocal).toHaveBeenCalledTimes(1);
    expect(aoCriarLocal.mock.calls[0][0]).toMatchObject({ municipio: "Cidade Demo", nome: "Novo Local" });
    desmontar();
  });
});

describe("EditorMapaItinerario — casos inválidos (comportamento preservado)", () => {
  it("criar Seção fora de SP: mensagem de recusa e NENHUM aoCriarSecao", () => {
    const { container, aoCriarSecao, desmontar } = montar({ recursosMunicipio: RECURSOS_FORA_DE_SP });
    act(() => capturado.props?.aoClicar?.(P0_COORD));

    const input = container.querySelector('[data-testid="nome-secao-input"]') as HTMLInputElement;
    digitar(input, "Fora de SP");
    clicar(container.querySelector('[data-testid="confirmar-criar-secao"]')!);

    expect(aoCriarSecao).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="mensagem-recusa-secao"]')).not.toBeNull();
    desmontar();
  });

  it("arrasto de Seção além de 350 m: recusa e NENHUM aoAtualizarSecao", () => {
    const { container, aoAtualizarSecao, desmontar } = montar();
    const marcadorSecao = (capturado.props?.marcadores ?? []).find(
      (m) => m.id === `secao-${SECAO_DUPLA.uuid}`,
    );
    act(() => marcadorSecao?.aoArrastar?.(P_LONGE));

    expect(aoAtualizarSecao).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="mensagem-recusa-secao"]')).not.toBeNull();
    desmontar();
  });

  it("arrasto de Local além de 350 m (pareada): recusa e NENHUM aoAtualizarLocal", () => {
    const { container, aoAtualizarLocal, desmontar } = montar();
    const marcadorLocal = (capturado.props?.marcadores ?? []).find(
      (m) => m.id === `local-${LOCAL_BI.uuid}`,
    );
    act(() => marcadorLocal?.aoArrastar?.(P_LONGE));

    expect(aoAtualizarLocal).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="mensagem-recusa-local"]')).not.toBeNull();
    desmontar();
  });
});

// TASK-063 (DEC-055) — clique esquerdo SOBRE a linha da rota cria ponto de
// rota, não Seção; o `<Mapa>` dublê expõe `aoClicarNaLinha` separado de
// `aoClicar`, exercitando exatamente a exclusão mútua que `mapa.tsx`
// implementa de verdade (hit-test na camada de linhas) — aqui testamos só o
// ROTEAMENTO do gesto no editor, não o hit-test do MapLibre em si.
const PONTOS_DE_ROTA: PontoDeRota[] = [
  { apos_parada_ordem: 1, latitude: -23.1, longitude: -46.1 },
  { apos_parada_ordem: 2, latitude: -23.3, longitude: -46.3 },
];

describe("EditorMapaItinerario — gesto de ponto de rota (TASK-063; Spec 04 §7.3, DEC-055)", () => {
  it("clique sobre a linha chama aoCriarPontoDeRota, e NÃO abre o formulário de Seção", () => {
    const { container, aoCriarPontoDeRota, desmontar } = montar();
    act(() => capturado.props?.aoClicarNaLinha?.(P0_COORD));

    expect(aoCriarPontoDeRota).toHaveBeenCalledWith(P0_COORD);
    expect(container.querySelector('[data-testid="form-criar-secao"]')).toBeNull();
    desmontar();
  });

  it("clique fora da linha continua criando Seção (DEC-055: sem mudança até a TASK-065)", () => {
    const { container, aoCriarPontoDeRota, desmontar } = montar();
    act(() => capturado.props?.aoClicar?.(P0_COORD));

    expect(aoCriarPontoDeRota).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="form-criar-secao"]')).not.toBeNull();
    desmontar();
  });

  it("vértices de ponto de rota são circulares, pequenos, sem rótulo e distintos de Seção/Local", () => {
    const { desmontar } = montar({ pontosDeRota: PONTOS_DE_ROTA });
    const marcadores = capturado.props?.marcadores ?? [];
    const vertice0 = marcadores.find((m) => m.id === "ponto-rota-0");
    const vertice1 = marcadores.find((m) => m.id === "ponto-rota-1");

    expect(vertice0?.forma).toBe("circulo");
    expect(vertice0?.tamanho).toBe("pequeno");
    expect(vertice0?.cor).not.toBe(COR_SECAO);
    expect(vertice0?.cor).not.toBe(COR_LOCAL);
    expect(vertice0?.arrastavel).toBe(true);
    expect(vertice1?.posicao).toEqual({ lng: -46.3, lat: -23.3 });
    desmontar();
  });

  it("arrastar um vértice chama aoMoverPontoDeRota com o índice correto", () => {
    const { desmontar, aoMoverPontoDeRota } = montar({ pontosDeRota: PONTOS_DE_ROTA });
    const vertice1 = (capturado.props?.marcadores ?? []).find((m) => m.id === "ponto-rota-1");
    const novaPosicao: Coordenada = { lng: -46.35, lat: -23.35 };

    act(() => vertice1?.aoArrastar?.(novaPosicao));

    expect(aoMoverPontoDeRota).toHaveBeenCalledWith(1, novaPosicao);
    desmontar();
  });

  it("a sub-lista de pontos de rota exibe os pontos e NÃO entram na tabela de paradas (Spec 04 §7.3)", () => {
    const { container, desmontar } = montar({ pontosDeRota: PONTOS_DE_ROTA });
    const subLista = container.querySelector('[data-testid="sub-lista-pontos-de-rota"]');
    const itens = subLista?.querySelectorAll('[data-testid="ponto-rota-item"]');

    expect(itens).toHaveLength(2);
    // Não há tabela de paradas neste componente (é responsabilidade da etapa,
    // `tabela-paradas`); confirmamos apenas que a sub-lista é uma superfície
    // própria, sem nome nem município (só a coordenada).
    expect(container.querySelector('[data-testid="tabela-paradas"]')).toBeNull();
    desmontar();
  });

  it("remover um ponto de rota pela sub-lista chama aoRemoverPontoDeRota com o índice", () => {
    const { container, aoRemoverPontoDeRota, desmontar } = montar({ pontosDeRota: PONTOS_DE_ROTA });
    const botoesRemover = container.querySelectorAll('[data-testid="remover-ponto-rota"]');

    clicar(botoesRemover[1]);

    expect(aoRemoverPontoDeRota).toHaveBeenCalledWith(1);
    desmontar();
  });

  it("[inválido] sem pontosDeRota, a sub-lista fica vazia", () => {
    const { container, desmontar } = montar();
    const itens = container.querySelectorAll('[data-testid="ponto-rota-item"]');
    expect(itens).toHaveLength(0);
    desmontar();
  });
});
