import { describe, expect, test } from "vitest";
import { montarModeloPdfOperacional } from "@/formulario/pdf/modelo-pdf-operacional";
import { esquemaDocumentoOperacao, type DocumentoOperacao } from "@/shared/contrato";
import { documentoExemploMinimo } from "../../fixtures";

// TASK-033/TASK-034 — regras transversais do PDF (RN-076; Spec 04 §13.3/§13.4)
// e ausência de R$ (RN-013/NEG-017). São as asserções NEGATIVAS da categoria 7
// de `docs-dev/08-TEST_STRATEGY.md`: o que o PDF nunca pode conter. A varredura
// percorre TODO o modelo, não só os campos que a task lembrou de olhar — assim
// um bloco novo que vaze R$ ou offset quebra este teste.
//
// A única fronteira interna é a do §13.1 item 8b: Locais aparecem **no anexo
// técnico** e em lugar nenhum do corpo. Por isso a varredura de Locais usa
// `textosDoCorpo`, que exclui `anexoTecnico` — e um teste positivo dedicado
// exige que o Local esteja lá dentro, impedindo que a exclusão vire desculpa
// para o anexo perder o dado.

function textosDoModelo(valor: unknown, acumulado: string[] = []): string[] {
  if (typeof valor === "string") acumulado.push(valor);
  else if (typeof valor === "number") acumulado.push(String(valor));
  else if (Array.isArray(valor)) valor.forEach((item) => textosDoModelo(item, acumulado));
  else if (valor && typeof valor === "object") {
    Object.values(valor).forEach((item) => textosDoModelo(item, acumulado));
  }
  return acumulado;
}

/** Todo o modelo MENOS o anexo técnico — o "corpo" do §13.1 (itens 1 a 7). */
function textosDoCorpo(modelo: ReturnType<typeof modeloDe>): string[] {
  const corpo = Object.fromEntries(
    Object.entries(modelo).filter(([chave]) => chave !== "anexoTecnico"),
  );
  return textosDoModelo(corpo);
}

function modeloDe(documento: DocumentoOperacao) {
  return montarModeloPdfOperacional(esquemaDocumentoOperacao.parse(documento), {
    geradoEm: new Date(2026, 6, 31, 14, 5),
  });
}

/** Exemplo mínimo com offsets bem visíveis, para a varredura ter o que achar. */
function documentoComOffsetsMarcados(): DocumentoOperacao {
  const documento = documentoExemploMinimo();
  for (const servico of documento.autos.servicos) {
    for (const itinerario of servico.itinerarios) {
      for (const viagem of itinerario.viagens) {
        viagem.horarios_paradas = viagem.horarios_paradas.map((horario, indice) => ({
          ...horario,
          offset_horario: indice === 0 ? "00:00:00" : `00:4${indice}:07`,
        }));
      }
    }
  }
  return documento;
}

describe("RN-013/NEG-017 — nenhum valor monetário no PDF", () => {
  test("nenhum texto do modelo contém R$, 'tarifa' ou 'valor monetário'", () => {
    const textos = textosDoModelo(modeloDe(documentoExemploMinimo()));

    expect(textos.some((t) => t.includes("R$"))).toBe(false);
    expect(textos.some((t) => /tarifa/i.test(t))).toBe(false);
  });
});

describe("RN-076 — offsets não aparecem em lugar nenhum do PDF", () => {
  test("com offsets marcados no documento, nenhum deles vaza para o modelo", () => {
    const textos = textosDoModelo(modeloDe(documentoComOffsetsMarcados()));

    expect(textos.some((t) => t.includes("00:41:07"))).toBe(false);
    expect(textos.some((t) => t.includes("00:42:07"))).toBe(false);
    expect(textos.some((t) => /offset/i.test(t))).toBe(false);
  });

  test("nenhum horário aparece no formato HH:MM:SS do JSON — só HH:MM (§8.1)", () => {
    // A TASK-034 trouxe horários legítimos (as tabelas do §13.2), mas sempre em
    // HH:MM. Um HH:MM:SS no modelo denunciaria horário cru do JSON — o mesmo
    // formato em que os offsets são gravados.
    const textos = textosDoModelo(modeloDe(documentoExemploMinimo()));

    expect(textos.some((t) => /\d{2}:\d{2}:\d{2}/.test(t))).toBe(false);
    expect(textos.some((t) => t.includes("08:00:00"))).toBe(false);
  });

  test("os horários dos blocos de identificação continuam ausentes", () => {
    // Horário é matéria exclusiva das tabelas horárias e do anexo: capa,
    // resumo, Serviços e itinerários não exibem partida nenhuma.
    const modelo = modeloDe(documentoExemploMinimo());
    const textos = textosDoModelo({
      capa: modelo.capa,
      servicos: modelo.servicos,
      itinerarios: modelo.itinerarios,
    });

    expect(textos.some((t) => /\d{2}:\d{2}/.test(t))).toBe(false);
  });

  test("os horários dos rótulos de faixa são os limites da spec, não partidas", () => {
    // Única ocorrência legítima de hora no resumo: o intervalo de cada faixa,
    // que a tabela do §10 traz na coluna "Intervalo". São limites fixos da
    // spec — nunca o `horario_saida` de uma Viagem.
    const resumo = modeloDe(documentoExemploMinimo()).resumo;
    const horariosNosRotulos = resumo.porFaixa.flatMap(
      (faixa) => faixa.rotulo.match(/\d{2}:\d{2}/g) ?? [],
    );

    expect(horariosNosRotulos).toEqual([
      "00:00", "04:59",
      "05:00", "08:59",
      "09:00", "10:59",
      "11:00", "13:59",
      "14:00", "16:59",
      "17:00", "19:59",
      "20:00", "23:59",
    ]);
  });
});

describe("RN-031/RN-076 — Locais não aparecem no corpo, só no anexo técnico", () => {
  test("o Local do itinerário não entra na lista numerada de Seções nem na descrição", () => {
    const documento = documentoExemploMinimo();
    const local = documento.autos.servicos[0].locais[0];
    expect(local.nome).toBe("Ponto de Embarque Praia"); // guarda da fixture

    const modelo = modeloDe(documento);
    const textos = textosDoCorpo(modelo);

    expect(textos.some((t) => t.includes(local.nome))).toBe(false);
    for (const itinerario of modelo.itinerarios) {
      expect(itinerario.legendaSecoes.some((item) => item.nome === local.nome)).toBe(false);
      expect(itinerario.descricaoTexto).not.toContain(local.nome);
      expect(
        itinerario.descricaoItens.some((item) => item.texto.includes(local.nome)),
      ).toBe(false);
    }
  });

  test("a lista numerada só tem Seções — uma a menos que o total de paradas", () => {
    const documento = documentoExemploMinimo();
    const itinerario = documento.autos.servicos[0].itinerarios[0];
    const paradasDeSecao = itinerario.paradas.filter(
      (p) => p.secao_uuid !== undefined,
    ).length;

    const legendaSecoes = modeloDe(documento).itinerarios[0].legendaSecoes;

    expect(legendaSecoes).toHaveLength(paradasDeSecao);
    expect(paradasDeSecao).toBeLessThan(itinerario.paradas.length);
  });

  test("TASK-127/DEC-105 — a legenda vertical do bloco só lista Seções, na mesma contagem das paradas de Seção", () => {
    const documento = documentoExemploMinimo();
    const modelo = modeloDe(documento);

    for (const bloco of modelo.itinerarios) {
      const servico = documento.autos.servicos.find((s) => s.uuid === bloco.servicoUuid);
      const itinerarioDoBloco = servico?.itinerarios.find((i) => i.sentido === bloco.sentido);
      const paradasDeSecao =
        itinerarioDoBloco?.paradas.filter((p) => p.secao_uuid !== undefined).length ?? 0;
      expect(bloco.legendaSecoes).toHaveLength(paradasDeSecao);
      for (const item of bloco.legendaSecoes) {
        const secao = documento.autos.secoes.find(
          (s) => item.nome === `${s.municipio} - ${s.nome}`,
        );
        expect(secao, `legenda com nome fora do padrão: ${item.nome}`).toBeDefined();
      }
    }
  });

  test("TASK-034 — o Local está no anexo técnico: a exclusão do corpo não pode virar omissão", () => {
    // Contraprova do teste acima: se a varredura do corpo passasse porque o
    // Local sumiu do modelo inteiro, esta asserção falharia.
    const documento = documentoExemploMinimo();
    const local = documento.autos.servicos[0].locais[0];

    const anexo = modeloDe(documento).anexoTecnico;
    const linhas = anexo.locaisPorItinerario.flatMap((bloco) => bloco.locais);

    expect(linhas.some((linha) => linha.nome === local.nome)).toBe(true);
    // §13.1 item 8b — sem horários de passagem no anexo.
    expect(
      textosDoModelo(anexo.locaisPorItinerario).some((t) => /\d{2}:\d{2}/.test(t)),
    ).toBe(false);
  });

  test("TASK-127/DEC-105 — o identificador do Local expõe só a UUID, nunca o nome, no modelo do PDF", () => {
    const documento = documentoExemploMinimo();
    const local = documento.autos.servicos[0].locais[0];

    const modelo = modeloDe(documento);
    const blocoIda = modelo.itinerarios.find((i) => i.sentido === "ida");

    expect(blocoIda?.identificadoresLocais).toEqual([
      { localUuid: local.uuid, identificador: "2.1" },
    ]);
  });
});

describe("RN-076 — nomes de Seção sempre no padrão Cidade - Nome", () => {
  test("cada item da lista numerada tem municipio e nome separados por hífen", () => {
    const documento = documentoExemploMinimo();
    const modelo = modeloDe(documento);

    for (const bloco of modelo.itinerarios) {
      for (const item of bloco.legendaSecoes) {
        const secao = documento.autos.secoes.find(
          (s) => item.nome === `${s.municipio} - ${s.nome}`,
        );
        expect(secao, `rótulo fora do padrão: ${item.nome}`).toBeDefined();
      }
    }
  });
});

describe("NEG-001..019 — o PDF não carrega gestão de processo", () => {
  test("nenhum texto do modelo fala de aprovação, pendência ou prazo do pedido", () => {
    const textos = textosDoModelo(modeloDe(documentoExemploMinimo()))
      // O aviso da RN-077 cita "análise, pendências e aprovação" justamente
      // para dizer que isso NÃO acontece aqui — é a única ocorrência legítima.
      .filter((t) => !t.includes("permanece no SEI"));

    expect(textos.some((t) => /aprova(ção|do)/i.test(t))).toBe(false);
    expect(textos.some((t) => /pend[êe]ncia/i.test(t))).toBe(false);
    expect(textos.some((t) => /prazo/i.test(t))).toBe(false);
  });
});
