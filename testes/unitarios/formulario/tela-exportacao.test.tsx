// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { TelaExportacao } from "@/formulario/exportacao";
import type { SessaoFormulario } from "@/formulario/sessao";
import { renderizar, act } from "../shared-ui/_ajuda-render";
import type { DocumentoOperacao } from "@/shared/contrato";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-032 — etapa Exportação (Spec 04 §12): botões reais das duas ações
// (§12.1/§12.2) sob o gate de RN-078 (Spec 04 §14 — botões desabilitados
// enquanto houver pendência bloqueante). `aoBaixarArquivo`/`obterDataDeHoje`
// são injetados para o teste não depender de `URL.createObjectURL` do jsdom
// nem do relógio real (mesmo padrão de injeção da camada pura de export).

const SESSAO_LIBERADA: SessaoFormulario = {
  modo: "carregado",
  documento: documentoExemploMinimo(), // codigo "0000", status "proposta"
  alertasImportacao: [],
};

const SESSAO_BLOQUEADA: SessaoFormulario = { modo: "novo" };

function dispararClique(botao: HTMLButtonElement) {
  act(() => {
    botao.click();
  });
}

describe("TelaExportacao — gate liberado (RN-078)", () => {
  it("não exibe a mensagem de bloqueio e os botões ficam habilitados", () => {
    const { container, desmontar } = renderizar(
      <TelaExportacao sessao={SESSAO_LIBERADA} />,
    );

    expect(container.querySelector('[data-testid="exportacao-mensagem-gate"]')).toBeNull();
    const botaoProposta = container.querySelector(
      '[data-testid="botao-exportar-proposta"]',
    ) as HTMLButtonElement;
    const botaoVigente = container.querySelector(
      '[data-testid="botao-definir-vigente"]',
    ) as HTMLButtonElement;
    expect(botaoProposta.disabled).toBe(false);
    expect(botaoVigente.disabled).toBe(false);

    desmontar();
  });

  it("'Exportar proposta' baixa o JSON com status proposta e a data injetada", () => {
    const aoBaixarArquivo = vi.fn();
    const { container, desmontar } = renderizar(
      <TelaExportacao
        sessao={SESSAO_LIBERADA}
        aoBaixarArquivo={aoBaixarArquivo}
        obterDataDeHoje={() => "2026-07-17"}
      />,
    );

    const botao = container.querySelector(
      '[data-testid="botao-exportar-proposta"]',
    ) as HTMLButtonElement;
    dispararClique(botao);

    expect(aoBaixarArquivo).toHaveBeenCalledTimes(1);
    const [nomeArquivo, json] = aoBaixarArquivo.mock.calls[0];
    expect(nomeArquivo).toBe("rota-0000-proposta-2026-07-17.json");
    const documento = JSON.parse(json);
    expect(documento.autos.status).toBe("proposta");
    expect(documento.autos.data_criacao).toBe("2026-07-17");

    desmontar();
  });

  it("'Definir como vigente' com data preenchida baixa o JSON com status vigente", () => {
    const aoBaixarArquivo = vi.fn();
    const { container, desmontar } = renderizar(
      <TelaExportacao sessao={SESSAO_LIBERADA} aoBaixarArquivo={aoBaixarArquivo} />,
    );

    const campoData = container.querySelector(
      '[data-testid="campo-data-publicacao"]',
    ) as HTMLInputElement;
    // React rastreia o setter nativo de `value` para detectar mudança
    // controlada — atribuir `campoData.value = ...` direto não dispara o
    // `onChange` (mesma pegadinha conhecida de testes sem Testing Library).
    const setterNativoDeValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    act(() => {
      setterNativoDeValue.call(campoData, "2026-01-15");
      campoData.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const botao = container.querySelector(
      '[data-testid="botao-definir-vigente"]',
    ) as HTMLButtonElement;
    dispararClique(botao);

    expect(aoBaixarArquivo).toHaveBeenCalledTimes(1);
    const [nomeArquivo, json] = aoBaixarArquivo.mock.calls[0];
    expect(nomeArquivo).toBe("rota-0000-vigente-2026-01-15.json");
    const documento = JSON.parse(json);
    expect(documento.autos.status).toBe("vigente");
    expect(documento.autos.data_publicacao).toBe("2026-01-15");
    expect(documento.autos).not.toHaveProperty("data_criacao");

    desmontar();
  });

  it("[inválido] 'Definir como vigente' sem data preenchida não baixa e mostra o erro (RN-011)", () => {
    const aoBaixarArquivo = vi.fn();
    const aoFocarPendencias = vi.fn();
    const { container, desmontar } = renderizar(
      <TelaExportacao
        sessao={SESSAO_LIBERADA}
        aoBaixarArquivo={aoBaixarArquivo}
        aoFocarPendencias={aoFocarPendencias}
      />,
    );

    const botao = container.querySelector(
      '[data-testid="botao-definir-vigente"]',
    ) as HTMLButtonElement;
    dispararClique(botao);

    expect(aoBaixarArquivo).not.toHaveBeenCalled();
    expect(aoFocarPendencias).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="exportacao-erros"]')).not.toBeNull();

    desmontar();
  });
});

describe("TelaExportacao — gate bloqueado (Spec 04 §14)", () => {
  it("exibe a mensagem de bloqueio e desabilita os dois botões", () => {
    const { container, desmontar } = renderizar(
      <TelaExportacao sessao={SESSAO_BLOQUEADA} />,
    );

    expect(
      container.querySelector('[data-testid="exportacao-mensagem-gate"]')?.textContent,
    ).toContain("Existem pendências bloqueantes");
    const botaoProposta = container.querySelector(
      '[data-testid="botao-exportar-proposta"]',
    ) as HTMLButtonElement;
    const botaoVigente = container.querySelector(
      '[data-testid="botao-definir-vigente"]',
    ) as HTMLButtonElement;
    expect(botaoProposta.disabled).toBe(true);
    expect(botaoVigente.disabled).toBe(true);

    desmontar();
  });

  it("[inválido] clicar um botão desabilitado não dispara o download (nativo do DOM)", () => {
    const aoBaixarArquivo = vi.fn();
    const { container, desmontar } = renderizar(
      <TelaExportacao sessao={SESSAO_BLOQUEADA} aoBaixarArquivo={aoBaixarArquivo} />,
    );

    const botao = container.querySelector(
      '[data-testid="botao-exportar-proposta"]',
    ) as HTMLButtonElement;
    dispararClique(botao);

    expect(aoBaixarArquivo).not.toHaveBeenCalled();

    desmontar();
  });

  it("[inválido] bloqueio por violação estrutural (TASK-085; RN-078/§14) lista o motivo concreto, não só a mensagem genérica", () => {
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].itinerarios[0].viagens = [];
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    const { container, desmontar } = renderizar(<TelaExportacao sessao={sessao} />);

    const motivos = container.querySelector('[data-testid="exportacao-motivos-bloqueio"]');
    expect(motivos).not.toBeNull();
    expect(motivos!.textContent).toContain("0000-1CR");
    expect(motivos!.textContent).not.toMatch(/\[RN-\d+\]/);

    desmontar();
  });

  it("erro estrutural (TASK-086) recebe data-diagnostico no item, sem vazar para o texto visível", () => {
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].itinerarios[0].viagens = [];
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    const { container, desmontar } = renderizar(<TelaExportacao sessao={sessao} />);

    const item = container.querySelector('[data-testid="exportacao-motivos-bloqueio"] li');
    expect(item).not.toBeNull();
    expect(item!.getAttribute("data-diagnostico")).toMatch(/RN-039/);
    expect(item!.textContent).not.toMatch(/\[RN-\d+\]/);

    desmontar();
  });

  it("[inválido] bloqueio técnico da TASK-082 lista o motivo operacional na Exportação", () => {
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].caracteristica_veiculo = "SU";
    const sessao: SessaoFormulario = { modo: "carregado", documento, alertasImportacao: [] };

    const { container, desmontar } = renderizar(<TelaExportacao sessao={sessao} />);

    const item = container.querySelector('[data-testid="exportacao-motivos-bloqueio"] li');
    expect(item).not.toBeNull();
    expect(item!.textContent).toContain(documento.autos.servicos[0].numero_n);
    expect(item!.textContent).not.toMatch(/\[RN-\d+\]|caracteristica_veiculo/);

    desmontar();
  });

});

// TASK-033 — terceira ação da etapa: "Gerar PDF operacional" (Spec 04 §13),
// sob o MESMO gate de RN-078. A geração é injetada (`aoGerarPdf`) para o teste
// não carregar @react-pdf nem WebGL — mesma disciplina do OSRM mockado.

describe("TelaExportacao — PDF operacional (TASK-033; RN-074/RN-078)", () => {
  const BLOB_FALSO = { size: 10, type: "application/pdf" } as unknown as Blob;

  it("gate liberado: o botão de PDF fica habilitado e baixa o blob gerado", async () => {
    const aoBaixarBlob = vi.fn();
    const aoGerarPdf = vi.fn<
      (documento: DocumentoOperacao) => Promise<{
        nomeArquivo: string;
        blob: Blob;
        avisos: string[];
      }>
    >(async () => ({
      nomeArquivo: "rota-0000-tabela-operacional.pdf",
      blob: BLOB_FALSO,
      avisos: [],
    }));

    const { container, desmontar } = renderizar(
      <TelaExportacao
        sessao={SESSAO_LIBERADA}
        aoBaixarBlob={aoBaixarBlob}
        aoGerarPdf={aoGerarPdf}
      />,
    );

    const botao = container.querySelector(
      '[data-testid="botao-gerar-pdf"]',
    ) as HTMLButtonElement;
    expect(botao.disabled).toBe(false);

    await act(async () => {
      botao.click();
    });

    expect(aoGerarPdf).toHaveBeenCalledTimes(1);
    expect(aoBaixarBlob).toHaveBeenCalledWith(
      "rota-0000-tabela-operacional.pdf",
      BLOB_FALSO,
    );
    // O documento entregue à geração é o mesmo que seria exportado em JSON.
    expect(aoGerarPdf.mock.calls[0][0].autos.codigo).toBe("0000");

    desmontar();
  });

  it("imagem de mapa ausente vira aviso não bloqueante, com o PDF entregue (DEC-104)", async () => {
    const aoBaixarBlob = vi.fn();
    const aoGerarPdf = vi.fn(async () => ({
      nomeArquivo: "rota-0000-tabela-operacional.pdf",
      blob: BLOB_FALSO,
      avisos: ["Não foi possível capturar a imagem do mapa do Serviço 0000-1CR — Ida."],
    }));

    const { container, desmontar } = renderizar(
      <TelaExportacao
        sessao={SESSAO_LIBERADA}
        aoBaixarBlob={aoBaixarBlob}
        aoGerarPdf={aoGerarPdf}
      />,
    );

    await act(async () => {
      (container.querySelector('[data-testid="botao-gerar-pdf"]') as HTMLButtonElement).click();
    });

    expect(aoBaixarBlob).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="pdf-avisos"]')?.textContent).toContain(
      "0000-1CR",
    );

    desmontar();
  });

  it("[inválido] gate bloqueado: o botão de PDF fica desabilitado e não gera nada (RN-078)", async () => {
    const aoGerarPdf = vi.fn();
    const { container, desmontar } = renderizar(
      <TelaExportacao sessao={SESSAO_BLOQUEADA} aoGerarPdf={aoGerarPdf} />,
    );

    const botao = container.querySelector(
      '[data-testid="botao-gerar-pdf"]',
    ) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);

    await act(async () => {
      botao.click();
    });

    expect(aoGerarPdf).not.toHaveBeenCalled();

    desmontar();
  });

  it("[inválido] falha na geração não derruba a tela: mostra mensagem e reabilita o botão", async () => {
    const aoBaixarBlob = vi.fn();
    const aoGerarPdf = vi.fn(async () => {
      throw new Error("renderizador indisponível");
    });

    const { container, desmontar } = renderizar(
      <TelaExportacao
        sessao={SESSAO_LIBERADA}
        aoBaixarBlob={aoBaixarBlob}
        aoGerarPdf={aoGerarPdf}
      />,
    );

    const botao = container.querySelector(
      '[data-testid="botao-gerar-pdf"]',
    ) as HTMLButtonElement;
    await act(async () => {
      botao.click();
    });

    expect(aoBaixarBlob).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="pdf-avisos"]')?.textContent).toContain(
      "Não foi possível gerar o PDF operacional",
    );
    expect(
      (container.querySelector('[data-testid="botao-gerar-pdf"]') as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    desmontar();
  });
});
