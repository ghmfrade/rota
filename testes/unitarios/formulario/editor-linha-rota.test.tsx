// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { EditorLocais } from "@/formulario/locais";
import { EditorSecoes } from "@/formulario/secoes";
import { indiceDeNomes } from "@/shared/geo";
import type { LinhaMapa } from "@/shared/mapa";
import { renderizar } from "../shared-ui/_ajuda-render";

// TASK-059 — EditorSecoes/EditorLocais repassam a `linhaRota` (rota ativa do
// itinerário, Spec 04 §7.3) ao `<Mapa>` via a prop `linhas`. Testado com o
// `<Mapa>` real substituído por um dublê (`vi.mock`): montar o MapLibre de
// verdade exige WebGL, indisponível em jsdom, e é irrelevante aqui — o que
// esta task adiciona é só o encanamento da prop, não o desenho em si (já
// coberto pelos testes de `shared/mapa/geometria`).

interface PropsMapaCapturadas {
  linhas?: readonly LinhaMapa[];
}

const capturado = vi.hoisted<{ props: PropsMapaCapturadas | null }>(() => ({ props: null }));

vi.mock("@/shared/mapa", () => ({
  Mapa: (props: PropsMapaCapturadas) => {
    capturado.props = props;
    return null;
  },
}));

const RECURSOS = { features: [], nomes: indiceDeNomes([]) };

const LINHA_ROTA: LinhaMapa = {
  id: "rota-ativa",
  pontos: [
    { lng: -46.64, lat: -23.55 },
    { lng: -46.62, lat: -23.54 },
  ],
};

describe("EditorSecoes — repasse da rota ativa ao <Mapa> (TASK-059)", () => {
  it("com linhaRota informada, repassa [linhaRota] em linhas", () => {
    const { desmontar } = renderizar(
      <EditorSecoes
        secoes={[]}
        servicoUuid="11111111-1111-4111-8111-111111111111"
        sentido="ida"
        bidirecional={false}
        recursosMunicipio={RECURSOS}
        aoCriarSecao={() => {}}
        aoAtualizarSecao={() => {}}
        linhaRota={LINHA_ROTA}
      />,
    );
    expect(capturado.props?.linhas).toEqual([LINHA_ROTA]);
    desmontar();
  });

  // Caso inválido/ausente: sem rota (ex.: `sem-rota`, RN-048), nenhuma linha é
  // desenhada — nem `undefined` chega ao `<Mapa>`, e sim array vazio.
  it("sem linhaRota (ex.: sem-rota), repassa linhas vazio", () => {
    const { desmontar } = renderizar(
      <EditorSecoes
        secoes={[]}
        servicoUuid="11111111-1111-4111-8111-111111111111"
        sentido="ida"
        bidirecional={false}
        recursosMunicipio={RECURSOS}
        aoCriarSecao={() => {}}
        aoAtualizarSecao={() => {}}
      />,
    );
    expect(capturado.props?.linhas).toEqual([]);
    desmontar();
  });
});

describe("EditorLocais — repasse da rota ativa ao <Mapa> (TASK-059)", () => {
  it("com linhaRota informada, repassa [linhaRota] em linhas", () => {
    const { desmontar } = renderizar(
      <EditorLocais
        locais={[]}
        sentido="ida"
        recursosMunicipio={RECURSOS}
        aoCriarLocal={() => {}}
        aoAtualizarLocal={() => {}}
        linhaRota={LINHA_ROTA}
      />,
    );
    expect(capturado.props?.linhas).toEqual([LINHA_ROTA]);
    desmontar();
  });

  it("sem linhaRota (ex.: sem-rota), repassa linhas vazio", () => {
    const { desmontar } = renderizar(
      <EditorLocais
        locais={[]}
        sentido="ida"
        recursosMunicipio={RECURSOS}
        aoCriarLocal={() => {}}
        aoAtualizarLocal={() => {}}
      />,
    );
    expect(capturado.props?.linhas).toEqual([]);
    desmontar();
  });
});
