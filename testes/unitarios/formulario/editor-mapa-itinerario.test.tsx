// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import type { Local, PontoDeRota, Secao } from "@/shared/contrato";
import type { FeatureMunicipio } from "@/shared/dados-estaticos";
import { indiceDeNomes } from "@/shared/geo";
import type { AncoraTelaMapa, Coordenada, LinhaMapa, MarcadorMapa } from "@/shared/mapa";
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
  aoMoverSobreLinha?: (p: Coordenada | null) => void;
  aoClicarDireito?: (p: Coordenada, ancora: AncoraTelaMapa) => void;
  aoClicarDireitoNaLinha?: (p: Coordenada, ancora: AncoraTelaMapa) => void;
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
const COR_PONTO_DE_ROTA = "var(--color-ciano-500)";

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
  const aoIniciarCriacaoParada = vi.fn();
  const aoAtualizarSecao = vi.fn();
  const aoAtualizarLocal = vi.fn();
  const aoCriarPontoDeRota = vi.fn();
  const aoMoverPontoDeRota = vi.fn();
  const aoRemoverPontoDeRota = vi.fn();
  const utils = renderizar(
    <EditorMapaItinerario
      secoes={[SECAO_DUPLA]}
      locais={[LOCAL_BI]}
      servicoUuid={SERVICO}
      sentido="ida"
      recursosMunicipio={RECURSOS}
      aoIniciarCriacaoParada={aoIniciarCriacaoParada}
      aoAtualizarSecao={aoAtualizarSecao}
      aoAtualizarLocal={aoAtualizarLocal}
      aoCriarPontoDeRota={aoCriarPontoDeRota}
      aoMoverPontoDeRota={aoMoverPontoDeRota}
      aoRemoverPontoDeRota={aoRemoverPontoDeRota}
      {...props}
    />,
  );
  return {
    ...utils,
    aoIniciarCriacaoParada,
    aoAtualizarSecao,
    aoAtualizarLocal,
    aoCriarPontoDeRota,
    aoMoverPontoDeRota,
    aoRemoverPontoDeRota,
  };
}

function clicar(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function abrirMenuDireito(naLinha = false) {
  const callback = naLinha
    ? capturado.props?.aoClicarDireitoNaLinha
    : capturado.props?.aoClicarDireito;
  act(() => callback?.(P0_COORD, { x: 100, y: 120 }));
}

function escolherOpcao(container: HTMLElement, rotulo: "Seção" | "Local") {
  const opcao = [...container.querySelectorAll('[role="menuitem"]')].find(
    (item) => item.textContent === rotulo,
  );
  if (!opcao) throw new Error(`opção ${rotulo} não encontrada`);
  clicar(opcao);
}

describe("EditorMapaItinerario — marcadores de Seção e Local no mesmo mapa", () => {
  it("aplica o vocabulário forma/tamanho da DEC-069", () => {
    const { desmontar } = montar();
    const marcadores = capturado.props?.marcadores ?? [];
    const secao = marcadores.find((m) => m.id === `secao-${SECAO_DUPLA.uuid}`);
    const local = marcadores.find((m) => m.id === `local-${LOCAL_BI.uuid}`);

    expect(secao?.forma).toBe("quadrado");
    expect(secao?.tamanho).toBeUndefined();
    expect(local?.forma).toBe("circulo");
    expect(local?.tamanho).toBe("medio");
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

describe("EditorMapaItinerario — roteamento do gesto (DEC-055/TASK-065)", () => {
  it("clique direito abre menu com Seção e Local; nenhum formulário é renderizado pelo mapa (TASK-095)", () => {
    const { container, desmontar } = montar();

    abrirMenuDireito();
    const opcoes = [...container.querySelectorAll('[role="menuitem"]')];
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(["Seção", "Local"]);
    expect(container.querySelector('[data-testid="form-criar-secao"]')).toBeNull();
    expect(container.querySelector('[data-testid="form-criar-local"]')).toBeNull();

    escolherOpcao(container, "Seção");
    // TASK-095/DEC-077: a linha-formulário passa a viver na tabela lateral do
    // host — o mapa só REPORTA a intenção via `aoIniciarCriacaoParada`, nunca
    // renderiza `form-criar-*` (painel abaixo do mapa deixa de existir).
    expect(container.querySelector('[data-testid="form-criar-secao"]')).toBeNull();
    expect(container.querySelector('[data-testid="form-criar-local"]')).toBeNull();
    desmontar();
  });

  it("marca somente o Local inválido sem trocar forma, tamanho ou preenchimento", () => {
    const { desmontar } = montar({ locaisInvalidos: [LOCAL_BI.uuid] });
    const marcadores = capturado.props?.marcadores ?? [];
    const local = marcadores.find((m) => m.id === `local-${LOCAL_BI.uuid}`);
    const secao = marcadores.find((m) => m.id === `secao-${SECAO_DUPLA.uuid}`);

    expect(local).toMatchObject({
      forma: "circulo",
      tamanho: "medio",
      cor: COR_LOCAL,
      invalido: true,
    });
    expect(secao?.invalido).not.toBe(true);
    desmontar();
  });

  it("clique direito + escolher Seção chama aoIniciarCriacaoParada com a posição clicada (TASK-095)", () => {
    const { container, aoIniciarCriacaoParada, desmontar } = montar();
    abrirMenuDireito();
    escolherOpcao(container, "Seção");

    expect(aoIniciarCriacaoParada).toHaveBeenCalledWith("secao", P0_COORD, undefined);
    desmontar();
  });

  it("clique direito SOBRE a linha repassa a posiçãoNaLinha ao escolher Seção", () => {
    const { container, aoIniciarCriacaoParada, desmontar } = montar();
    abrirMenuDireito(true);
    escolherOpcao(container, "Seção");

    expect(aoIniciarCriacaoParada).toHaveBeenCalledWith("secao", P0_COORD, P0_COORD);
    desmontar();
  });

  it("clique direito + escolher Local chama aoIniciarCriacaoParada com a posição clicada (TASK-095)", () => {
    const { container, aoIniciarCriacaoParada, desmontar } = montar();
    abrirMenuDireito();
    escolherOpcao(container, "Local");

    expect(aoIniciarCriacaoParada).toHaveBeenCalledWith("local", P0_COORD, undefined);
    desmontar();
  });

  it("clique direito SOBRE a linha repassa a posiçãoNaLinha ao escolher Local", () => {
    const { container, aoIniciarCriacaoParada, desmontar } = montar();
    abrirMenuDireito(true);
    escolherOpcao(container, "Local");

    expect(aoIniciarCriacaoParada).toHaveBeenCalledWith("local", P0_COORD, P0_COORD);
    desmontar();
  });

  it("posicaoCriacaoPendente mantém o marcador laranja provisório no mapa (TASK-095)", () => {
    const { desmontar } = montar({ posicaoCriacaoPendente: P0_COORD });
    const marcadores = capturado.props?.marcadores ?? [];
    const pendente = marcadores.find((m) => m.id === "novo-ponto-pendente");

    expect(pendente).toMatchObject({ posicao: P0_COORD, forma: "circulo" });
    desmontar();
  });

  it("[inválido] sem posicaoCriacaoPendente nenhum marcador provisório aparece", () => {
    const { desmontar } = montar();
    const marcadores = capturado.props?.marcadores ?? [];

    expect(marcadores.some((m) => m.id === "novo-ponto-pendente")).toBe(false);
    desmontar();
  });
});

describe("EditorMapaItinerario — casos inválidos (comportamento preservado)", () => {
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

  it("clique esquerdo fora da linha não cria nada [inválido]", () => {
    const { container, aoCriarPontoDeRota, desmontar } = montar();
    act(() => capturado.props?.aoClicar?.(P0_COORD));

    expect(capturado.props?.aoClicar).toBeUndefined();
    expect(aoCriarPontoDeRota).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="form-criar-secao"]')).toBeNull();
    expect(container.querySelector('[data-testid="form-criar-local"]')).toBeNull();
    desmontar();
  });

  it("TASK-069: hover compõe o fantasma na projeção sem criar ponto de rota", () => {
    const linha: LinhaMapa = { id: "rota-ativa", pontos: [P0_COORD, P_LONGE] };
    const { aoCriarPontoDeRota, desmontar } = montar({ linhaRota: linha });
    const projetada: Coordenada = { lng: -50, lat: -22.55 };

    act(() => capturado.props?.aoMoverSobreLinha?.(projetada));

    const fantasma = (capturado.props?.marcadores ?? []).find(
      (marcador) => marcador.id === "ponto-rota-fantasma",
    );
    expect(fantasma).toMatchObject({
      posicao: projetada,
      forma: "circulo",
      tamanho: "pequeno",
      cor: COR_PONTO_DE_ROTA,
      fantasma: true,
    });
    expect(fantasma?.arrastavel).not.toBe(true);
    expect(aoCriarPontoDeRota).not.toHaveBeenCalled();

    act(() => capturado.props?.aoMoverSobreLinha?.(null));
    expect(
      (capturado.props?.marcadores ?? []).find(
        (marcador) => marcador.id === "ponto-rota-fantasma",
      ),
    ).toBeUndefined();
    desmontar();
  });

  it("[inválido] sem linhaRota não habilita hover nem mostra fantasma", () => {
    const { desmontar } = montar();

    expect(capturado.props?.aoMoverSobreLinha).toBeUndefined();
    expect(
      (capturado.props?.marcadores ?? []).some(
        (marcador) => marcador.id === "ponto-rota-fantasma",
      ),
    ).toBe(false);
    desmontar();
  });

  it("vértices de ponto de rota são circulares, pequenos, sem rótulo e distintos de Seção/Local", () => {
    const { desmontar } = montar({ pontosDeRota: PONTOS_DE_ROTA });
    const marcadores = capturado.props?.marcadores ?? [];
    const vertice0 = marcadores.find((m) => m.id === "ponto-rota-0");
    const vertice1 = marcadores.find((m) => m.id === "ponto-rota-1");

    expect(vertice0?.forma).toBe("circulo");
    expect(vertice0?.tamanho).toBe("pequeno");
    expect(vertice0?.cor).toBe(COR_PONTO_DE_ROTA);
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

  // TASK-097 — a supressão do hover durante o arrasto mora inteiramente na
  // primitiva `shared/mapa` (que conhece `dragstart`/`dragend`); aqui se fixa o
  // lado do consumidor: o fantasma é função EXCLUSIVA de `aoMoverSobreLinha`,
  // então basta a primitiva não emitir para ele não aparecer. Nenhum sinal de
  // arrasto atravessa a fronteira dos módulos.
  it("TASK-097: o gesto de arrasto, por si, não monta fantasma algum", () => {
    const linha: LinhaMapa = { id: "rota-ativa", pontos: [P0_COORD, P_LONGE] };
    const { desmontar } = montar({ linhaRota: linha, pontosDeRota: PONTOS_DE_ROTA });
    const vertice0 = (capturado.props?.marcadores ?? []).find((m) => m.id === "ponto-rota-0");

    act(() => vertice0?.aoArrastar?.({ lng: -50, lat: -22.55 }));

    expect(
      (capturado.props?.marcadores ?? []).some((m) => m.id === "ponto-rota-fantasma"),
    ).toBe(false);
    desmontar();
  });

  it("TASK-079 remove a sub-lista própria sem remover os vértices do mapa", () => {
    const { container, desmontar } = montar({ pontosDeRota: PONTOS_DE_ROTA });

    expect(container.querySelector('[data-testid="sub-lista-pontos-de-rota"]')).toBeNull();
    expect(container.querySelector('[data-testid="ponto-rota-item"]')).toBeNull();
    expect(container.querySelector('[data-testid="tabela-paradas"]')).toBeNull();
    expect((capturado.props?.marcadores ?? []).filter((m) => m.id.startsWith("ponto-rota-"))).toHaveLength(2);
    desmontar();
  });
});

// TASK-064 (Spec 04 §7) — sincronização de seleção tabela↔mapa. Aqui só o
// lado do MAPA: `selecaoAtual` marca o marcador certo, e clicar num marcador
// (via `aoSelecionar` capturado do dublê de `<Mapa>`) propaga a chave ao host
// por `aoSelecionarMarcador`. O outro lado (tabela→mapa, scroll-into-view) é
// coberto em `etapa-itinerarios.test.tsx`, que monta o host real.
describe("EditorMapaItinerario — sincronização de seleção com o mapa (TASK-064)", () => {
  it("projeta `selecionado: true` apenas no marcador cuja chave é `selecaoAtual`", () => {
    const { desmontar } = montar({
      pontosDeRota: PONTOS_DE_ROTA,
      selecaoAtual: `local-${LOCAL_BI.uuid}`,
    });
    const marcadores = capturado.props?.marcadores ?? [];
    const local = marcadores.find((m) => m.id === `local-${LOCAL_BI.uuid}`);
    const secao = marcadores.find((m) => m.id === `secao-${SECAO_DUPLA.uuid}`);
    const ponto0 = marcadores.find((m) => m.id === "ponto-rota-0");

    expect(local?.selecionado).toBe(true);
    expect(secao?.selecionado).toBe(false);
    expect(ponto0?.selecionado).toBe(false);
    desmontar();
  });

  it("[inválido] sem `selecaoAtual` nenhum marcador fica selecionado", () => {
    const { desmontar } = montar();
    const marcadores = capturado.props?.marcadores ?? [];

    expect(marcadores.every((m) => m.selecionado !== true)).toBe(true);
    desmontar();
  });

  it("clicar num marcador (Seção) chama aoSelecionarMarcador com o id do marcador", () => {
    const aoSelecionarMarcador = vi.fn();
    const { desmontar } = montar({ aoSelecionarMarcador });
    const secao = (capturado.props?.marcadores ?? []).find(
      (m) => m.id === `secao-${SECAO_DUPLA.uuid}`,
    );

    act(() => secao?.aoSelecionar?.());

    expect(aoSelecionarMarcador).toHaveBeenCalledWith(`secao-${SECAO_DUPLA.uuid}`);
    desmontar();
  });

  it("clicar num vértice de ponto de rota propaga a chave posicional (RN-042)", () => {
    const aoSelecionarMarcador = vi.fn();
    const { desmontar } = montar({ pontosDeRota: PONTOS_DE_ROTA, aoSelecionarMarcador });
    const vertice1 = (capturado.props?.marcadores ?? []).find((m) => m.id === "ponto-rota-1");

    act(() => vertice1?.aoSelecionar?.());

    expect(aoSelecionarMarcador).toHaveBeenCalledWith("ponto-rota-1");
    desmontar();
  });

  it("[inválido] sem aoSelecionarMarcador, clicar no marcador não lança erro", () => {
    const { desmontar } = montar();
    const secao = (capturado.props?.marcadores ?? []).find(
      (m) => m.id === `secao-${SECAO_DUPLA.uuid}`,
    );

    expect(() => act(() => secao?.aoSelecionar?.())).not.toThrow();
    desmontar();
  });
});
