import type { DocumentoOperacao, Itinerario } from "@/shared/contrato";
import {
  capturarMapasDoDocumento,
  chaveImagem,
  type ResultadoCapturaDoDocumento,
} from "./captura-mapa-pdf";
import {
  montarModeloPdfOperacional,
  type ModeloPdfOperacional,
} from "./modelo-pdf-operacional";

// Camada de efeito do PDF operacional (TASK-033): orquestra captura das imagens
// (DEC-104) → modelo puro → blob do @react-pdf. Tudo client-side (RN-074;
// Spec 01 §8): não há servidor de renderização, nada é enviado para fora.
//
// `@react-pdf/renderer` e `maplibre-gl` entram por import dinâmico, só quando o
// usuário pede o PDF: mantêm-se fora do bundle inicial e fora dos testes de
// componente em jsdom.

/** Nome sugerido do arquivo, no mesmo espírito do JSON exportado (Spec 04 §12). */
export function nomeArquivoPdf(documento: DocumentoOperacao): string {
  return `rota-${documento.autos.codigo}-tabela-operacional.pdf`;
}

export interface ResultadoGeracaoPdf {
  blob: Blob;
  /** Avisos não bloqueantes — hoje, itinerários sem imagem de mapa (DEC-104). */
  avisos: string[];
}

export interface OpcoesGeracaoPdf {
  /** Injetável para teste — evita WebGL/tiles reais. */
  capturarMapas?: (
    documento: DocumentoOperacao,
  ) => Promise<ResultadoCapturaDoDocumento>;
  /** Injetável para teste — evita rodar o renderizador de PDF. */
  renderizar?: (modelo: ModeloPdfOperacional) => Promise<Blob>;
  geradoEm?: Date;
}

function avisoDeCaptura(falha: {
  numeroN: string;
  sentido: Itinerario["sentido"];
}): string {
  const sentido = falha.sentido === "ida" ? "Ida" : "Volta";
  return `Não foi possível capturar a imagem do mapa do Serviço ${falha.numeroN} — ${sentido}. O PDF foi gerado sem essa imagem.`;
}

async function renderizarComReactPdf(modelo: ModeloPdfOperacional): Promise<Blob> {
  const [{ pdf }, { DocumentoPdfOperacional }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./documento-pdf-operacional"),
  ]);
  return pdf(<DocumentoPdfOperacional modelo={modelo} />).toBlob();
}

/**
 * Gera o PDF operacional do documento (Spec 04 §13). A ausência de imagem de
 * mapa NÃO interrompe a geração: vira aviso não bloqueante (DEC-104).
 */
export async function gerarPdfOperacional(
  documento: DocumentoOperacao,
  opcoes: OpcoesGeracaoPdf = {},
): Promise<ResultadoGeracaoPdf> {
  const capturar = opcoes.capturarMapas ?? ((d) => capturarMapasDoDocumento(d));
  const renderizar = opcoes.renderizar ?? renderizarComReactPdf;

  const { imagens, falhas } = await capturar(documento);

  const modelo = montarModeloPdfOperacional(documento, {
    geradoEm: opcoes.geradoEm,
    obterImagemDoItinerario: (servicoUuid, sentido) =>
      imagens.get(chaveImagem(servicoUuid, sentido)),
  });

  return { blob: await renderizar(modelo), avisos: falhas.map(avisoDeCaptura) };
}
