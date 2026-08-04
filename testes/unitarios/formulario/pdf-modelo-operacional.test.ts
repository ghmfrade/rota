import { describe, expect, test } from "vitest";
import {
  AVISO_SEI,
  montarModeloPdfOperacional,
  ORDEM_BLOCOS,
  paragrafoDaDescricao,
  TITULO_PDF,
  type ModeloPdfOperacional,
} from "@/formulario/pdf/modelo-pdf-operacional";
import {
  contarAutos,
  contarAutosPorFaixa,
  FAIXAS_HORARIO,
  ROTULO_SEMANA_PADRAO,
  rotuloFaixaComIntervalo,
} from "@/shared/contagens";
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

  test("item 4a — título no padrão `Serviço 0000-NXX — Ida/Volta`", () => {
    const bloco = modeloDo().itinerarios[0];
    expect(bloco.titulo).toBe("Serviço 0000-1CR — Ida");
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

  test("os 7 contadores por Serviço do §10 aparecem, inclusive opções Ida e Volta", () => {
    const documento = documentoBidirecionalMultiServico();
    const esperado = contarAutos(normalizado(documento).autos);
    const linha = modeloDo(documento).resumo.porServico[0];
    const contagem = esperado.porServico[0];

    expect(linha.viagensIda).toBe(contagem.ida.viagensSemana);
    expect(linha.viagensVolta).toBe(contagem.volta.viagensSemana);
    expect(linha.viagensTotal).toBe(contagem.totalViagensSemana);
    expect(linha.paresCompraveis).toBe(contagem.paresCompraveis);
    expect(linha.opcoesIda).toBe(contagem.ida.opcoesDeslocamento);
    expect(linha.opcoesVolta).toBe(contagem.volta.opcoesDeslocamento);
    expect(linha.opcoesDeslocamento).toBe(contagem.totalOpcoesDeslocamento);
    // Os dois contadores de sentido somam o total — não são números novos.
    expect(linha.opcoesIda + linha.opcoesVolta).toBe(linha.opcoesDeslocamento);
  });

  test("Serviço só de Ida traz as colunas da Volta zeradas, nunca ausentes", () => {
    const linha = modeloDo(documentoUnidirecional()).resumo.porServico[0];
    expect(linha.viagensVolta).toBe(0);
    expect(linha.opcoesVolta).toBe(0);
    expect(linha.opcoesIda).toBeGreaterThan(0);
  });

  test("as 7 faixas de horário do §10 aparecem com o intervalo da spec, mesmo as vazias", () => {
    const porFaixa = modeloDo().resumo.porFaixa;
    expect(porFaixa).toHaveLength(7);
    expect(porFaixa.map((f) => f.rotulo)).toEqual([
      "Madrugada (00:00–04:59)",
      "Pico manhã (05:00–08:59)",
      "Entre-pico manhã (09:00–10:59)",
      "Entre-pico almoço (11:00–13:59)",
      "Entre-pico tarde (14:00–16:59)",
      "Pico tarde (17:00–19:59)",
      "Noite (20:00–23:59)",
    ]);
  });

  test("o intervalo do rótulo vem da constante FAIXAS_HORARIO, não é redigitado", () => {
    const porFaixa = modeloDo().resumo.porFaixa;
    for (const [indice, faixa] of FAIXAS_HORARIO.entries()) {
      expect(porFaixa[indice].rotulo).toBe(rotuloFaixaComIntervalo(faixa));
      expect(porFaixa[indice].rotulo).toContain(faixa.inicio);
      expect(porFaixa[indice].rotulo).toContain(faixa.fim);
    }
  });

  test("§10 — a estratificação por faixa existe por Serviço, além do total do Autos", () => {
    const documento = documentoBidirecionalMultiServico();
    const resumo = modeloDo(documento).resumo;
    const esperado = contarAutosPorFaixa(normalizado(documento).autos);

    expect(resumo.porFaixaPorServico).toHaveLength(2);
    for (const estratificacao of resumo.porFaixaPorServico) {
      expect(estratificacao.faixas).toHaveLength(7);
      for (const [indice, faixa] of FAIXAS_HORARIO.entries()) {
        const contagem = esperado.porServico[estratificacao.servicoUuid][faixa.id];
        const linha = estratificacao.faixas[indice];
        expect(linha.rotulo).toBe(rotuloFaixaComIntervalo(faixa));
        expect(linha.viagensIda).toBe(contagem.ida.viagensSemana);
        expect(linha.viagensVolta).toBe(contagem.volta.viagensSemana);
        expect(linha.viagensSemana).toBe(contagem.totalViagensSemana);
        expect(linha.opcoesIda).toBe(contagem.ida.opcoesDeslocamento);
        expect(linha.opcoesVolta).toBe(contagem.volta.opcoesDeslocamento);
        expect(linha.opcoesDeslocamento).toBe(contagem.totalOpcoesDeslocamento);
      }
    }
  });

  test("a soma das faixas de todos os Serviços fecha com o total do Autos por faixa", () => {
    const resumo = modeloDo(documentoBidirecionalMultiServico()).resumo;

    resumo.porFaixa.forEach((total, indice) => {
      const somaDosServicos = resumo.porFaixaPorServico.reduce(
        (soma, servico) => soma + servico.faixas[indice].viagensSemana,
        0,
      );
      expect(somaDosServicos).toBe(total.viagensSemana);
    });
    // E o total do Autos por faixa fecha com o total geral do resumo.
    const somaDasFaixas = resumo.porFaixa.reduce((s, f) => s + f.viagensSemana, 0);
    expect(somaDasFaixas).toBe(resumo.totalViagensSemana);
  });

  test("a estratificação por Serviço não repete pares compráveis linha a linha", () => {
    const estratificacao = modeloDo(documentoBidirecionalMultiServico())
      .resumo.porFaixaPorServico[0];
    const contagem = contarAutos(
      normalizado(documentoBidirecionalMultiServico()).autos,
    ).porServico[0];

    expect(estratificacao.paresCompraveis).toBe(contagem.paresCompraveis);
    expect(estratificacao.faixas[0]).not.toHaveProperty("paresCompraveis");
  });

  test("faixa sem nenhuma partida do Serviço sai zerada, nunca omitida da tabela", () => {
    // Todas as partidas do Serviço em "Pico manhã": as outras 6 faixas
    // continuam presentes, com zero — a tabela do §10 é fixa, não é filtrada
    // pelo que o Serviço opera.
    const documento = documentoExemploMinimo();
    for (const itinerario of documento.autos.servicos[0].itinerarios) {
      for (const viagem of itinerario.viagens) {
        viagem.horario_saida = "06:30:00";
      }
    }

    const estratificacao = modeloDo(documento).resumo.porFaixaPorServico[0];
    const picoManha = estratificacao.faixas[1];
    const madrugada = estratificacao.faixas[0];

    expect(estratificacao.faixas).toHaveLength(7);
    expect(picoManha.rotulo).toContain("Pico manhã");
    expect(picoManha.viagensSemana).toBeGreaterThan(0);
    expect(madrugada.viagensSemana).toBe(0);
    expect(madrugada.opcoesDeslocamento).toBe(0);
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

describe("item 4c — composição do parágrafo da descrição (§13.4)", () => {
  test("o parágrafo é montado a partir dos itens e fecha com ponto final", () => {
    const bloco = modeloDo().itinerarios[0];
    const paragrafo = paragrafoDaDescricao(bloco);

    expect(paragrafo.origem).toBe("itens");
    if (paragrafo.origem !== "itens") throw new Error("origem inesperada");
    expect(paragrafo.pontoFinal).toBe(".");
    expect(paragrafo.itens).toEqual(bloco.descricaoItens);
  });

  test("o parágrafo remontado reproduz o texto congelado, ponto final incluído", () => {
    const documento = documentoExemploMinimo();
    const bloco = modeloDo(documento).itinerarios[0];
    const paragrafo = paragrafoDaDescricao(bloco);
    if (paragrafo.origem !== "itens") throw new Error("origem inesperada");

    const remontado =
      paragrafo.itens.map((item) => item.texto).join(paragrafo.separador) +
      paragrafo.pontoFinal;

    expect(remontado).toBe(
      documento.autos.servicos[0].itinerarios[0].rota.descricao_itinerario.texto,
    );
  });

  test("descrição sem itens cai no texto congelado, em vez de sumir do PDF", () => {
    // Caso INVÁLIDO perante o contrato: o schema exige `itens` com ao menos um
    // elemento quando há `rota` (Spec 02 §10.5), então este documento não passa
    // por `normalizado` de propósito — o modelo é montado direto, para provar
    // que a composição do parágrafo é defensiva e não deixa o bloco mudo.
    const documento = documentoExemploMinimo();
    documento.autos.servicos[0].itinerarios[0].rota.descricao_itinerario.itens = [];

    const modelo = montarModeloPdfOperacional(documento, { geradoEm: GERADO_EM });
    const paragrafo = paragrafoDaDescricao(modelo.itinerarios[0]);

    expect(paragrafo.origem).toBe("texto-congelado");
    if (paragrafo.origem !== "texto-congelado") throw new Error("origem inesperada");
    expect(paragrafo.texto).toBe(
      documento.autos.servicos[0].itinerarios[0].rota.descricao_itinerario.texto,
    );
    // Sem itens e sem texto, o bloco fica vazio — mas não quebra a geração.
    expect(typeof paragrafo.texto).toBe("string");
  });
});

// A sequência de Seções ligada por seta (`sequenciaDeSecoes`) foi removida
// pela DEC-109 item 2 — a lista numerada (`legendaSecoes`, `numerarItinerario`)
// a substitui, e as mesmas garantias de robustez da travessia (parada
// inexistente ignorada; ordem por `paradas[].ordem`, não pela posição no
// array) já são cobertas para ela em `pdf-legenda-itinerario.test.ts`.
