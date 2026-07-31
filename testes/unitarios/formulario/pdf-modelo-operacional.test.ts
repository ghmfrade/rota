import { describe, expect, test } from "vitest";
import {
  AVISO_SEI,
  montarModeloPdfOperacional,
  ORDEM_BLOCOS,
  sequenciaDeSecoes,
  SETA_SEQUENCIA,
  TITULO_PDF,
  type ModeloPdfOperacional,
} from "@/formulario/pdf/modelo-pdf-operacional";
import { contarAutos, ROTULO_SEMANA_PADRAO } from "@/shared/contagens";
import {
  esquemaDocumentoOperacao,
  type DocumentoOperacao,
} from "@/shared/contrato";
import {
  documentoBidirecionalMultiServico,
  documentoExemploMinimo,
  documentoOperacaoExcepcional,
  documentoUnidirecional,
} from "../../fixtures";

// TASK-033 — estrutura e identificação do PDF operacional (Spec 04 §13.1;
// RN-074/076/077). Categoria 7 de `docs-dev/08-TEST_STRATEGY.md`: estrutura e
// regras transversais, não pixel-perfect — por isso as asserções são sobre o
// modelo puro, sem gerar PDF.

const GERADO_EM = new Date(2026, 6, 31, 14, 5);

// As fixtures são JSON cru; o documento que o Formulário manipula passou pelo
// schema, que aplica os defaults do contrato (`tabela_excepcional_uuid: null` —
// Spec 02 §11). Normalizar aqui mantém as contagens fiéis ao documento real.
function normalizado(documento: DocumentoOperacao): DocumentoOperacao {
  return esquemaDocumentoOperacao.parse(documento);
}

function modeloDo(documento = documentoExemploMinimo()): ModeloPdfOperacional {
  return montarModeloPdfOperacional(normalizado(documento), { geradoEm: GERADO_EM });
}

describe("estrutura do §13.1 (RN-074)", () => {
  test("a ordem dos blocos é a do §13.1, com os itens 5–8 reservados", () => {
    expect(modeloDo().ordemBlocos).toEqual([
      "capa",
      "resumo",
      "servicos",
      "itinerarios",
      "tabelas-horarias",
      "matriz-distancias",
      "matriz-seccionamento",
      "anexo-tecnico",
      "rodape",
    ]);
    // Guarda de fronteira com a TASK-034: os blocos 5–8 estão na ordem, mas
    // esta task não os preenche.
    expect(ORDEM_BLOCOS.indexOf("itinerarios")).toBeLessThan(
      ORDEM_BLOCOS.indexOf("tabelas-horarias"),
    );
  });

  test("item 1 — capa identifica Autos, empresa, tipo, status e data de criação", () => {
    const capa = modeloDo().capa;
    expect(capa.titulo).toBe(TITULO_PDF);
    expect(capa.codigo).toBe("0000");
    expect(capa.empresa).toBe("Viação Exemplo Ltda.");
    expect(capa.status).toBe("proposta");
    expect(capa.rotuloData).toBe("Data de criação");
    expect(capa.data).toBe("01/07/2026");
  });

  test("item 1 — documento vigente mostra a data de publicação, não a de criação", () => {
    const documento = documentoExemploMinimo();
    documento.autos.status = "vigente";
    delete documento.autos.data_criacao;
    documento.autos.data_publicacao = "2026-08-15";

    const capa = modeloDo(documento).capa;

    expect(capa.rotuloData).toBe("Data de publicação");
    expect(capa.data).toBe("15/08/2026");
  });

  test("item 3 — um bloco por Serviço, com direcionalidade derivada dos itinerários", () => {
    const modelo = modeloDo(documentoBidirecionalMultiServico());
    expect(modelo.servicos).toHaveLength(2);
    expect(modelo.servicos[0].numeroN).toBe("1000-1CR");
    expect(modelo.servicos[0].direcionalidade).toBe("Ida e Volta");
    expect(modelo.servicos[0].caracteristicaVeiculo).toBe("CR");
    expect(modelo.servicos[0].carater).toBe("principal");
  });

  test("item 3 — Serviço unidirecional não fabrica o sentido ausente", () => {
    const modelo = modeloDo(documentoUnidirecional());
    expect(modelo.servicos[0].direcionalidade).toBe("Ida");
    expect(modelo.itinerarios).toHaveLength(1);
    expect(modelo.itinerarios[0].sentido).toBe("ida");
    expect(modelo.itinerarios[0].titulo).toMatch(/— Ida$/);
  });

  test("item 4 — Ida vem antes de Volta, mesmo se o arquivo trouxer o inverso", () => {
    const documento = documentoBidirecionalMultiServico();
    documento.autos.servicos[0].itinerarios.reverse();

    const doServico = modeloDo(documento).itinerarios.filter(
      (i) => i.servicoUuid === documento.autos.servicos[0].uuid,
    );

    expect(doServico.map((i) => i.sentido)).toEqual(["ida", "volta"]);
  });

  test("item 4a/4b — título e sequência de Seções no padrão Cidade - Nome com seta", () => {
    const bloco = modeloDo().itinerarios[0];
    expect(bloco.titulo).toBe("Serviço 0000-1CR — Ida");
    expect(bloco.sequenciaSecoes).toBe(
      [
        "Santos - Terminal Central",
        "São Vicente - Terminal Norte",
        "Praia Grande - Rodoviária Praia Grande",
      ].join(SETA_SEQUENCIA),
    );
  });

  test("item 4c — descrição textual vem congelada do documento, com itens para realce", () => {
    const documento = documentoExemploMinimo();
    const bloco = modeloDo(documento).itinerarios[0];

    expect(bloco.descricaoTexto).toBe(
      documento.autos.servicos[0].itinerarios[0].rota.descricao_itinerario.texto,
    );
    expect(bloco.descricaoItens.some((item) => item.tipo === "secao")).toBe(true);
    expect(bloco.descricaoItens.some((item) => item.tipo === "via")).toBe(true);
  });

  test("item 4d — a imagem só aparece quando o provedor a entrega (DEC-104)", () => {
    const documento = documentoExemploMinimo();
    const servicoUuid = documento.autos.servicos[0].uuid;

    const comImagem = montarModeloPdfOperacional(documento, {
      geradoEm: GERADO_EM,
      obterImagemDoItinerario: (uuid, sentido) =>
        uuid === servicoUuid && sentido === "ida" ? "data:image/png;base64,AAA" : undefined,
    });

    expect(comImagem.itinerarios[0].imagemMapa).toBe("data:image/png;base64,AAA");
    // Sem provedor, a geração NÃO quebra: a lacuna é tolerada (DEC-104).
    expect(modeloDo(documento).itinerarios[0].imagemMapa).toBeUndefined();
  });

  test("item 9 — rodapé traz versao_schema, data/hora e o aviso do SEI (RN-077)", () => {
    const rodape = modeloDo().rodape;
    expect(rodape.versaoSchema).toBe("1.1");
    expect(rodape.geradoEm).toBe("31/07/2026 14:05");
    expect(rodape.aviso).toBe(AVISO_SEI);
    expect(rodape.aviso).toContain("permanece no SEI");
    expect(rodape.aviso).toContain("não substitui a publicação oficial");
  });

  test("item 9 — o rodapé ecoa o versao_schema do documento, seja 1.0 ou 1.1 (DEC-081)", () => {
    const documento = documentoExemploMinimo();
    documento.versao_schema = "1.0";
    expect(modeloDo(documento).rodape.versaoSchema).toBe("1.0");
    expect(modeloDo(documentoOperacaoExcepcional()).rodape.versaoSchema).toBe("1.1");
  });
});

describe("item 2 — resumo rotulado (RN-069/RN-072/NEG-018)", () => {
  test("o rótulo da semana padrão é o mesmo da tela, palavra por palavra", () => {
    expect(modeloDo().resumo.rotuloSemanaPadrao).toBe(ROTULO_SEMANA_PADRAO);
    expect(modeloDo().resumo.rotuloSemanaPadrao).toContain(
      "sem feriados nem operação excepcional",
    );
  });

  test("os números do resumo são exatamente os de shared/contagens", () => {
    const documento = documentoBidirecionalMultiServico();
    const esperado = contarAutos(normalizado(documento).autos);
    const resumo = modeloDo(documento).resumo;

    expect(resumo.totalViagensSemana).toBe(esperado.totalViagensSemana);
    expect(resumo.totalOpcoesDeslocamento).toBe(esperado.totalOpcoesDeslocamento);
    expect(resumo.porServico.map((l) => l.viagensTotal)).toEqual(
      esperado.porServico.map((c) => c.totalViagensSemana),
    );
  });

  test("as 7 faixas de horário do §10 aparecem, mesmo as vazias", () => {
    const porFaixa = modeloDo().resumo.porFaixa;
    expect(porFaixa).toHaveLength(7);
    expect(porFaixa.map((f) => f.rotulo)).toEqual([
      "Madrugada",
      "Pico manhã",
      "Entre-pico manhã",
      "Entre-pico almoço",
      "Entre-pico tarde",
      "Pico tarde",
      "Noite",
    ]);
  });

  test("viagem de feriado e viagem excepcional não entram no resumo (RN-069/RN-099)", () => {
    const comum = modeloDo(documentoExemploMinimo()).resumo;

    const documento = documentoOperacaoExcepcional();
    const itinerario = documento.autos.servicos[0].itinerarios[0];
    const viagem = itinerario.viagens[0];
    itinerario.viagens.push({
      ...structuredClone(viagem),
      uuid: "77777777-7777-4777-8777-777777777777",
      tabela_excepcional_uuid: null,
      viagem_feriado: true,
    });
    const comFeriadoEExcepcional = modeloDo(documento).resumo;

    expect(comFeriadoEExcepcional.totalViagensSemana).toBeLessThan(
      comum.totalViagensSemana,
    );
    // A única diferença de contagem vem da viagem que a fixture excepcional
    // moveu para a grade excepcional — nenhuma das duas grades soma.
    expect(comFeriadoEExcepcional.totalViagensSemana).toBe(
      comum.totalViagensSemana - 1,
    );
  });
});

describe("sequenciaDeSecoes — casos de borda", () => {
  test("parada de Seção inexistente no Autos é ignorada em vez de quebrar", () => {
    const documento = documentoExemploMinimo();
    const itinerario = documento.autos.servicos[0].itinerarios[0];
    itinerario.paradas.push({
      ordem: itinerario.paradas.length + 1,
      secao_uuid: "00000000-0000-4000-8000-000000000000",
    });

    const sequencia = sequenciaDeSecoes(itinerario, documento.autos.secoes);

    expect(sequencia).not.toContain("undefined");
    expect(sequencia.split(SETA_SEQUENCIA)).toHaveLength(3);
  });
});
