import { arredondaHalfUp } from "@/shared/calculo";
import type {
  DocumentoOperacao,
  Itinerario,
  Local,
  Secao,
  Servico,
} from "./esquema";

// Validações estruturais que cruzam entidades — Spec 02 §14.
// Cada violação carrega o caminho no documento e uma mensagem identificável
// citando a RN (docs-dev/01-RULE_INDEX.md). Regras de negócio (350 m,
// tipificação por tipo, município, valor da média) NÃO ficam aqui — são de
// outras tasks (Spec 03).

export interface ViolacaoEstrutural {
  caminho: (string | number)[];
  mensagem: string;
}

type Caminho = (string | number)[];

function chaveParNaoDirecional(a: string, b: string): string {
  return [a, b].sort().join("|");
}

function verificarUnicidadeDeUuid(
  violacoes: ViolacaoEstrutural[],
  categoria: string,
  entradas: { uuid: string; caminho: Caminho }[],
): void {
  const vistos = new Set<string>();
  for (const entrada of entradas) {
    if (vistos.has(entrada.uuid)) {
      violacoes.push({
        caminho: entrada.caminho,
        mensagem: `[RN-005] uuid de ${categoria} repetida no documento: ${entrada.uuid} (Spec 02 §12, §14)`,
      });
    }
    vistos.add(entrada.uuid);
  }
}

function secoesReferenciadas(itinerario: Itinerario): string[] {
  return itinerario.paradas
    .filter((parada) => parada.secao_uuid !== undefined)
    .map((parada) => parada.secao_uuid as string);
}

function validarStatusEDatas(
  violacoes: ViolacaoEstrutural[],
  doc: DocumentoOperacao,
): void {
  const autos = doc.autos;
  if (autos.status === "proposta") {
    if (!autos.data_criacao) {
      violacoes.push({
        caminho: ["autos", "data_criacao"],
        mensagem:
          '[RN-011] status "proposta" exige data_criacao (Spec 02 §4.1)',
      });
    }
    if (autos.data_publicacao) {
      violacoes.push({
        caminho: ["autos", "data_publicacao"],
        mensagem:
          '[RN-011] status "proposta" não admite data_publicacao (Spec 02 §4.1)',
      });
    }
  } else {
    if (!autos.data_publicacao) {
      violacoes.push({
        caminho: ["autos", "data_publicacao"],
        mensagem:
          '[RN-011] status "vigente" exige data_publicacao (Spec 02 §4.1)',
      });
    }
    if (autos.data_criacao) {
      violacoes.push({
        caminho: ["autos", "data_criacao"],
        mensagem:
          '[RN-011] status "vigente" não admite data_criacao (Spec 02 §4.1)',
      });
    }
  }
}

function validarSecoesDoAutos(
  violacoes: ViolacaoEstrutural[],
  doc: DocumentoOperacao,
): void {
  const servicosPorUuid = new Map(
    doc.autos.servicos.map((servico) => [servico.uuid, servico]),
  );

  doc.autos.secoes.forEach((secao, indiceSecao) => {
    secao.servicos.forEach((entrada, indiceEntrada) => {
      const caminhoEntrada: Caminho = [
        "autos",
        "secoes",
        indiceSecao,
        "servicos",
        indiceEntrada,
      ];
      const servico = servicosPorUuid.get(entrada.servico_uuid);
      if (!servico) {
        violacoes.push({
          caminho: [...caminhoEntrada, "servico_uuid"],
          mensagem:
            "[RN-018] servico_uuid não existe em autos.servicos (Spec 02 §14)",
        });
        return;
      }

      const temParadaApontando = servico.itinerarios.some((itinerario) =>
        itinerario.paradas.some((parada) => parada.secao_uuid === secao.uuid),
      );
      if (!temParadaApontando) {
        violacoes.push({
          caminho: caminhoEntrada,
          mensagem:
            "[RN-018] o Serviço referenciado não tem nenhuma Parada apontando para esta Seção (Spec 02 §14)",
        });
      }

      const temIda = servico.itinerarios.some((i) => i.sentido === "ida");
      const temVolta = servico.itinerarios.some((i) => i.sentido === "volta");
      if (temIda && !entrada.geolocalizacao_ida) {
        violacoes.push({
          caminho: [...caminhoEntrada, "geolocalizacao_ida"],
          mensagem:
            "[RN-026] Serviço com itinerário de Ida exige geolocalizacao_ida nesta Seção (Spec 02 §5.1)",
        });
      }
      if (temVolta && !entrada.geolocalizacao_volta) {
        violacoes.push({
          caminho: [...caminhoEntrada, "geolocalizacao_volta"],
          mensagem:
            "[RN-026] Serviço com itinerário de Volta exige geolocalizacao_volta nesta Seção (Spec 02 §5.1)",
        });
      }
    });
  });
}

// Contexto do Serviço dono do itinerário, para as validações referenciais
// de Parada (RN-036 — Spec 02 §10.1).
interface ContextoDoServico {
  servicoUuid: string;
  secoesPorUuid: Map<string, Secao>;
  locaisPorUuid: Map<string, Local>;
}

function validarReferenciasDeParada(
  violacoes: ViolacaoEstrutural[],
  parada: Itinerario["paradas"][number],
  sentido: Itinerario["sentido"],
  contexto: ContextoDoServico,
  caminhoParada: Caminho,
): void {
  const chaveGeo = `geolocalizacao_${sentido}` as const;

  if (parada.secao_uuid !== undefined) {
    const secao = contexto.secoesPorUuid.get(parada.secao_uuid);
    if (!secao) {
      violacoes.push({
        caminho: [...caminhoParada, "secao_uuid"],
        mensagem:
          "[RN-036] secao_uuid não existe em autos.secoes (Spec 02 §10.1)",
      });
    } else {
      const entrada = secao.servicos.find(
        (e) => e.servico_uuid === contexto.servicoUuid,
      );
      if (!entrada) {
        violacoes.push({
          caminho: [...caminhoParada, "secao_uuid"],
          mensagem:
            "[RN-036] a Seção referenciada não tem entrada em secao.servicos para o Serviço desta Parada (Spec 02 §10.1)",
        });
      } else if (!entrada[chaveGeo]) {
        violacoes.push({
          caminho: [...caminhoParada, "secao_uuid"],
          mensagem: `[RN-036] a entrada da Seção para este Serviço não tem ${chaveGeo} preenchida, exigida pelo sentido do itinerário (Spec 02 §10.1)`,
        });
      }
    }
  }

  if (parada.local_uuid !== undefined) {
    const local = contexto.locaisPorUuid.get(parada.local_uuid);
    if (!local) {
      violacoes.push({
        caminho: [...caminhoParada, "local_uuid"],
        mensagem:
          "[RN-036] local_uuid não existe em servico.locais do mesmo Serviço (Spec 02 §10.1)",
      });
    } else if (!local[chaveGeo]) {
      violacoes.push({
        caminho: [...caminhoParada, "local_uuid"],
        mensagem: `[RN-036] o Local referenciado não tem ${chaveGeo} preenchida, exigida pelo sentido do itinerário (Spec 02 §10.1)`,
      });
    }
  }
}

function validarItinerario(
  violacoes: ViolacaoEstrutural[],
  itinerario: Itinerario,
  contexto: ContextoDoServico,
  caminhoItinerario: Caminho,
): void {
  const paradas = itinerario.paradas;
  const totalParadas = paradas.length;

  // RN-036 — referências de Parada íntegras, com geolocalização do sentido
  paradas.forEach((parada, indice) => {
    validarReferenciasDeParada(violacoes, parada, itinerario.sentido, contexto, [
      ...caminhoItinerario,
      "paradas",
      indice,
    ]);
  });

  // RN-034 — ordem 1-based, estritamente crescente, sem lacunas
  paradas.forEach((parada, indice) => {
    if (parada.ordem !== indice + 1) {
      violacoes.push({
        caminho: [...caminhoItinerario, "paradas", indice, "ordem"],
        mensagem:
          "[RN-034] ordem das paradas deve ser 1-based, estritamente crescente e sem lacunas (Spec 02 §10.1, §14)",
      });
    }
  });

  // RN-035 — extremos sempre Seção
  if (totalParadas > 0 && paradas[0].secao_uuid === undefined) {
    violacoes.push({
      caminho: [...caminhoItinerario, "paradas", 0],
      mensagem:
        "[RN-035] a primeira Parada do itinerário deve referenciar uma Seção, nunca um Local (Spec 02 §10.1)",
    });
  }
  if (
    totalParadas > 0 &&
    paradas[totalParadas - 1].secao_uuid === undefined
  ) {
    violacoes.push({
      caminho: [...caminhoItinerario, "paradas", totalParadas - 1],
      mensagem:
        "[RN-035] a última Parada do itinerário deve referenciar uma Seção, nunca um Local (Spec 02 §10.1)",
    });
  }

  // RN-041 — trechos: exatamente paradas.length − 1, um por par consecutivo
  const trechos = itinerario.rota.trechos;
  if (trechos.length !== totalParadas - 1) {
    violacoes.push({
      caminho: [...caminhoItinerario, "rota", "trechos"],
      mensagem:
        "[RN-041] rota.trechos deve ter exatamente paradas.length − 1 elementos (Spec 02 §10.3, §14)",
    });
  }
  const origensVistas = new Set<number>();
  trechos.forEach((trecho, indice) => {
    const caminhoTrecho: Caminho = [
      ...caminhoItinerario,
      "rota",
      "trechos",
      indice,
    ];
    if (
      trecho.parada_origem_ordem < 1 ||
      trecho.parada_origem_ordem > totalParadas - 1
    ) {
      violacoes.push({
        caminho: caminhoTrecho,
        mensagem:
          "[RN-041] trecho referencia par de paradas inexistente no itinerário (Spec 02 §10.3, §14)",
      });
    }
    if (origensVistas.has(trecho.parada_origem_ordem)) {
      violacoes.push({
        caminho: caminhoTrecho,
        mensagem:
          "[RN-041] trecho repetido para o mesmo par consecutivo de paradas (Spec 02 §14)",
      });
    }
    origensVistas.add(trecho.parada_origem_ordem);
  });

  // RN-040 — totais da rota = soma dos trechos
  const somaDistancia = trechos.reduce((s, t) => s + t.distancia_km, 0);
  const somaDuracao = trechos.reduce((s, t) => s + t.duracao_s, 0);
  if (
    Math.abs(
      arredondaHalfUp(somaDistancia, 2) -
        arredondaHalfUp(itinerario.rota.distancia_km, 2),
    ) > 1e-9
  ) {
    violacoes.push({
      caminho: [...caminhoItinerario, "rota", "distancia_km"],
      mensagem:
        "[RN-040] rota.distancia_km deve ser igual à soma de trechos[].distancia_km (Spec 02 §10.2, §14)",
    });
  }
  if (Math.abs(somaDuracao - itinerario.rota.duracao_s) > 1e-9) {
    violacoes.push({
      caminho: [...caminhoItinerario, "rota", "duracao_s"],
      mensagem:
        "[RN-040] rota.duracao_s deve ser igual à soma de trechos[].duracao_s (Spec 02 §10.2, §14)",
    });
  }

  // RN-042 — pontos de rota dentro da faixa [1, paradas.length − 1]
  itinerario.rota.pontos_de_rota.forEach((ponto, indice) => {
    if (ponto.apos_parada_ordem > totalParadas - 1) {
      violacoes.push({
        caminho: [
          ...caminhoItinerario,
          "rota",
          "pontos_de_rota",
          indice,
          "apos_parada_ordem",
        ],
        mensagem:
          "[RN-042] apos_parada_ordem deve estar em [1, paradas.length − 1] — nunca após a última parada (Spec 02 §10.4)",
      });
    }
  });

  // RN-044 — descrição textual: só Seções e vias, extremos e ordem coerentes
  const sequenciaSecoes = secoesReferenciadas(itinerario);
  const itens = itinerario.rota.descricao_itinerario.itens;
  const itensSecao = itens.filter((item) => item.tipo === "secao");
  const caminhoDescricao: Caminho = [
    ...caminhoItinerario,
    "rota",
    "descricao_itinerario",
    "itens",
  ];

  if (itensSecao.length < 2) {
    violacoes.push({
      caminho: caminhoDescricao,
      mensagem:
        '[RN-044] descricao_itinerario deve ter ao menos dois itens tipo="secao" (Spec 02 §10.5, §14)',
    });
  }
  if (itens.length > 0 && sequenciaSecoes.length > 0) {
    const primeiro = itens[0];
    const ultimo = itens[itens.length - 1];
    if (primeiro.tipo !== "secao" || primeiro.secao_uuid !== sequenciaSecoes[0]) {
      violacoes.push({
        caminho: [...caminhoDescricao, 0],
        mensagem:
          "[RN-044] o primeiro item da descrição deve ser a primeira Seção do itinerário (Spec 02 §10.5, §14)",
      });
    }
    if (
      ultimo.tipo !== "secao" ||
      ultimo.secao_uuid !== sequenciaSecoes[sequenciaSecoes.length - 1]
    ) {
      violacoes.push({
        caminho: [...caminhoDescricao, itens.length - 1],
        mensagem:
          "[RN-044] o último item da descrição deve ser a última Seção do itinerário (Spec 02 §10.5, §14)",
      });
    }
  }
  // Itens "secao" devem referenciar Seções das paradas deste itinerário, na
  // mesma ordem em que ocorrem (subsequência da sequência de Seções).
  let posicao = 0;
  for (const item of itensSecao) {
    if (item.tipo !== "secao") continue;
    let encontrado = false;
    while (posicao < sequenciaSecoes.length) {
      if (sequenciaSecoes[posicao] === item.secao_uuid) {
        encontrado = true;
        posicao += 1;
        break;
      }
      posicao += 1;
    }
    if (!encontrado) {
      violacoes.push({
        caminho: caminhoDescricao,
        mensagem:
          "[RN-044] itens tipo=\"secao\" devem referenciar Seções presentes nas paradas deste itinerário, na mesma ordem em que ocorrem (Spec 02 §10.5, §14)",
      });
      break;
    }
  }

  // RN-063 — horarios_paradas completo, monotônico, primeiro offset 00:00:00
  itinerario.viagens.forEach((viagem, indiceViagem) => {
    const caminhoHorarios: Caminho = [
      ...caminhoItinerario,
      "viagens",
      indiceViagem,
      "horarios_paradas",
    ];
    const ordens = viagem.horarios_paradas.map((h) => h.parada_ordem);
    const conjuntoOrdens = new Set(ordens);
    const completo =
      ordens.length === totalParadas &&
      conjuntoOrdens.size === ordens.length &&
      ordens.every((o) => o >= 1 && o <= totalParadas);
    if (!completo) {
      violacoes.push({
        caminho: caminhoHorarios,
        mensagem:
          "[RN-063] horarios_paradas deve ter exatamente um elemento por Parada do itinerário — mesmo conjunto de ordem, sem faltar nem sobrar (Spec 02 §11.1, §14)",
      });
    }

    const ordenados = [...viagem.horarios_paradas].sort(
      (a, b) => a.parada_ordem - b.parada_ordem,
    );
    for (let i = 1; i < ordenados.length; i += 1) {
      // Comparação lexicográfica é segura: formato fixo HH:MM:SS.
      if (ordenados[i].offset_horario < ordenados[i - 1].offset_horario) {
        violacoes.push({
          caminho: caminhoHorarios,
          mensagem:
            "[RN-063] offset_horario deve ser não decrescente na ordem das paradas (Spec 02 §11.1, §14)",
        });
        break;
      }
    }
    if (
      ordenados.length > 0 &&
      ordenados[0].offset_horario !== "00:00:00"
    ) {
      violacoes.push({
        caminho: [...caminhoHorarios, 0, "offset_horario"],
        mensagem:
          '[RN-063] o offset_horario da primeira parada deve ser "00:00:00" (Spec 02 §11.1, §14)',
      });
    }
  });
}

function validarServico(
  violacoes: ViolacaoEstrutural[],
  servico: Servico,
  secoesPorUuid: Map<string, Secao>,
  caminhoServico: Caminho,
): void {
  // RN-098 — tipos canônicos são únicos por Serviço; personalizado repete.
  const tiposCanonicosVistos = new Set<"ferias_verao" | "ferias_inverno">();
  const tabelasExcepcionais = servico.tabelas_excepcionais ?? [];
  tabelasExcepcionais.forEach((tabela, indiceTabela) => {
    if (tabela.tipo === "personalizado") return;
    if (tiposCanonicosVistos.has(tabela.tipo)) {
      violacoes.push({
        caminho: [
          ...caminhoServico,
          "tabelas_excepcionais",
          indiceTabela,
          "tipo",
        ],
        mensagem: `[RN-098] no máximo uma tabela ${tabela.tipo} por Serviço (Spec 02 §6.1, §14)`,
      });
    }
    tiposCanonicosVistos.add(tabela.tipo);
  });

  // RN-038 — sentidos distintos
  if (
    servico.itinerarios.length === 2 &&
    servico.itinerarios[0].sentido === servico.itinerarios[1].sentido
  ) {
    violacoes.push({
      caminho: [...caminhoServico, "itinerarios"],
      mensagem:
        "[RN-038] não pode haver dois itinerários com o mesmo sentido no mesmo Serviço (Spec 02 §10, §14)",
    });
  }

  const itinerarioIda = servico.itinerarios.find((i) => i.sentido === "ida");
  const itinerarioVolta = servico.itinerarios.find(
    (i) => i.sentido === "volta",
  );

  // RN-030 — Ida e Volta referenciam o mesmo conjunto de Seções, na ORDEM
  // INVERSA exata (DEC-063: Spec 02 §14 editada pelo dono — "se na ida as
  // seções são ABCD, na volta necessariamente são DCBA"). A checagem de
  // ordem só faz sentido quando o conjunto já é igual — divergência de
  // conjunto já é reportada isoladamente, sem duplicar violação.
  if (itinerarioIda && itinerarioVolta) {
    const sequenciaIda = secoesReferenciadas(itinerarioIda);
    const sequenciaVolta = secoesReferenciadas(itinerarioVolta);
    const secoesIda = new Set(sequenciaIda);
    const secoesVolta = new Set(sequenciaVolta);
    const iguais =
      secoesIda.size === secoesVolta.size &&
      [...secoesIda].every((uuid) => secoesVolta.has(uuid));
    if (!iguais) {
      violacoes.push({
        caminho: [...caminhoServico, "itinerarios"],
        mensagem:
          "[RN-030] quando Ida e Volta existem, referenciam o mesmo conjunto de Seções — só os Locais podem divergir (Spec 02 §2, §14)",
      });
    } else {
      const sequenciaVoltaInvertida = [...sequenciaVolta].reverse();
      const ordemInversa =
        sequenciaIda.length === sequenciaVoltaInvertida.length &&
        sequenciaIda.every((uuid, indice) => uuid === sequenciaVoltaInvertida[indice]);
      if (!ordemInversa) {
        violacoes.push({
          caminho: [...caminhoServico, "itinerarios"],
          mensagem:
            "[RN-030] a sequência de Seções da Volta deve ser o inverso exato da Ida — se a Ida é ABCD, a Volta deve ser DCBA (Spec 02 §14, DEC-063)",
        });
      }
    }
  }

  // RN-057 — ao menos 2 Seções distintas atendidas pelo Serviço
  const secoesAtendidas = new Set(
    servico.itinerarios.flatMap((itinerario) =>
      secoesReferenciadas(itinerario),
    ),
  );
  if (secoesAtendidas.size < 2) {
    violacoes.push({
      caminho: [...caminhoServico, "itinerarios"],
      mensagem:
        "[RN-057] todo Serviço atende ao menos 2 Seções distintas (Spec 02 §14)",
    });
  }

  // RN-054/RN-056 — matriz_distancias: completa, sem duplicatas, condicional
  const temIda = itinerarioIda !== undefined;
  const temVolta = itinerarioVolta !== undefined;
  const combinacoesEsperadas = new Set<string>();
  const listaSecoes = [...secoesAtendidas];
  for (let i = 0; i < listaSecoes.length; i += 1) {
    for (let j = i + 1; j < listaSecoes.length; j += 1) {
      combinacoesEsperadas.add(
        chaveParNaoDirecional(listaSecoes[i], listaSecoes[j]),
      );
    }
  }

  const paresVistos = new Set<string>();
  servico.matriz_distancias.forEach((par, indicePar) => {
    const caminhoPar: Caminho = [
      ...caminhoServico,
      "matriz_distancias",
      indicePar,
    ];
    if (par.secao_a_uuid === par.secao_b_uuid) {
      violacoes.push({
        caminho: caminhoPar,
        mensagem:
          "[RN-054] secao_a_uuid e secao_b_uuid devem ser distintos (Spec 02 §8, §14)",
      });
      return;
    }
    const chave = chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid);
    if (paresVistos.has(chave)) {
      violacoes.push({
        caminho: caminhoPar,
        mensagem:
          "[RN-054] par duplicado em matriz_distancias (Spec 02 §8, §14)",
      });
    }
    paresVistos.add(chave);
    if (!combinacoesEsperadas.has(chave)) {
      violacoes.push({
        caminho: caminhoPar,
        mensagem:
          "[RN-054] par não corresponde a uma combinação de Seções atendidas por este Serviço (Spec 02 §8, §14)",
      });
    }
    if (temIda && par.distancia_trecho_ida === undefined) {
      violacoes.push({
        caminho: [...caminhoPar, "distancia_trecho_ida"],
        mensagem:
          "[RN-056] Serviço com itinerário de Ida exige distancia_trecho_ida em cada par (Spec 02 §8, §14)",
      });
    }
    if (!temIda && par.distancia_trecho_ida !== undefined) {
      violacoes.push({
        caminho: [...caminhoPar, "distancia_trecho_ida"],
        mensagem:
          "[RN-056] Serviço sem itinerário de Ida não admite distancia_trecho_ida (Spec 02 §8, §14)",
      });
    }
    if (temVolta && par.distancia_trecho_volta === undefined) {
      violacoes.push({
        caminho: [...caminhoPar, "distancia_trecho_volta"],
        mensagem:
          "[RN-056] Serviço com itinerário de Volta exige distancia_trecho_volta em cada par (Spec 02 §8, §14)",
      });
    }
    if (!temVolta && par.distancia_trecho_volta !== undefined) {
      violacoes.push({
        caminho: [...caminhoPar, "distancia_trecho_volta"],
        mensagem:
          "[RN-056] Serviço sem itinerário de Volta não admite distancia_trecho_volta (Spec 02 §8, §14)",
      });
    }
  });
  for (const combinacao of combinacoesEsperadas) {
    if (!paresVistos.has(combinacao)) {
      violacoes.push({
        caminho: [...caminhoServico, "matriz_distancias"],
        mensagem: `[RN-054] combinação de Seções ausente em matriz_distancias: ${combinacao.replace("|", " × ")} (Spec 02 §8, §14)`,
      });
    }
  }

  // RN-059 — matriz_seccionamento: pares íntegros, presentes na matriz de distâncias
  const paresSeccionamentoVistos = new Set<string>();
  servico.matriz_seccionamento.forEach((par, indicePar) => {
    const caminhoPar: Caminho = [
      ...caminhoServico,
      "matriz_seccionamento",
      indicePar,
    ];
    if (par.secao_a_uuid === par.secao_b_uuid) {
      violacoes.push({
        caminho: caminhoPar,
        mensagem:
          "[RN-059] secao_a_uuid e secao_b_uuid devem ser distintos (Spec 02 §9, §14)",
      });
      return;
    }
    const chave = chaveParNaoDirecional(par.secao_a_uuid, par.secao_b_uuid);
    if (paresSeccionamentoVistos.has(chave)) {
      violacoes.push({
        caminho: caminhoPar,
        mensagem:
          "[RN-059] par duplicado em matriz_seccionamento — {a, b} equivale a {b, a} (Spec 02 §9, §14)",
      });
    }
    paresSeccionamentoVistos.add(chave);
    if (!paresVistos.has(chave)) {
      violacoes.push({
        caminho: caminhoPar,
        mensagem:
          "[RN-059] par de matriz_seccionamento deve existir em matriz_distancias deste mesmo Serviço (Spec 02 §9, §14)",
      });
    }
  });

  // Validações por itinerário
  const contexto: ContextoDoServico = {
    servicoUuid: servico.uuid,
    secoesPorUuid,
    locaisPorUuid: new Map(servico.locais.map((local) => [local.uuid, local])),
  };
  servico.itinerarios.forEach((itinerario, indiceItinerario) => {
    // RN-099 — a referência excepcional pertence ao mesmo Serviço-pai.
    const tabelasPorUuid = new Set(
      tabelasExcepcionais.map((tabela) => tabela.uuid),
    );
    itinerario.viagens.forEach((viagem, indiceViagem) => {
      if (
        viagem.tabela_excepcional_uuid !== undefined &&
        viagem.tabela_excepcional_uuid !== null &&
        !tabelasPorUuid.has(viagem.tabela_excepcional_uuid)
      ) {
        violacoes.push({
          caminho: [
            ...caminhoServico,
            "itinerarios",
            indiceItinerario,
            "viagens",
            indiceViagem,
            "tabela_excepcional_uuid",
          ],
          mensagem:
            "[RN-099] tabela_excepcional_uuid deve referenciar uma tabela excepcional existente no mesmo Serviço (Spec 02 §11, §14)",
        });
      }
    });

    validarItinerario(violacoes, itinerario, contexto, [
      ...caminhoServico,
      "itinerarios",
      indiceItinerario,
    ]);
  });
}

export function coletarViolacoesEstruturais(
  doc: DocumentoOperacao,
): ViolacaoEstrutural[] {
  const violacoes: ViolacaoEstrutural[] = [];

  validarStatusEDatas(violacoes, doc);

  // RN-005 — unicidade de uuid por categoria, no documento inteiro
  verificarUnicidadeDeUuid(
    violacoes,
    "Seção",
    doc.autos.secoes.map((secao, i) => ({
      uuid: secao.uuid,
      caminho: ["autos", "secoes", i, "uuid"],
    })),
  );
  verificarUnicidadeDeUuid(
    violacoes,
    "Serviço",
    doc.autos.servicos.map((servico, i) => ({
      uuid: servico.uuid,
      caminho: ["autos", "servicos", i, "uuid"],
    })),
  );
  verificarUnicidadeDeUuid(
    violacoes,
    "Local",
    doc.autos.servicos.flatMap((servico, i) =>
      servico.locais.map((local, j) => ({
        uuid: local.uuid,
        caminho: ["autos", "servicos", i, "locais", j, "uuid"],
      })),
    ),
  );
  verificarUnicidadeDeUuid(
    violacoes,
    "Viagem",
    doc.autos.servicos.flatMap((servico, i) =>
      servico.itinerarios.flatMap((itinerario, j) =>
        itinerario.viagens.map((viagem, k) => ({
          uuid: viagem.uuid,
          caminho: [
            "autos",
            "servicos",
            i,
            "itinerarios",
            j,
            "viagens",
            k,
            "uuid",
          ],
        })),
      ),
    ),
  );
  verificarUnicidadeDeUuid(
    violacoes,
    "TabelaExcepcional",
    doc.autos.servicos.flatMap((servico, i) =>
      (servico.tabelas_excepcionais ?? []).map((tabela, j) => ({
        uuid: tabela.uuid,
        caminho: [
          "autos",
          "servicos",
          i,
          "tabelas_excepcionais",
          j,
          "uuid",
        ],
      })),
    ),
  );

  validarSecoesDoAutos(violacoes, doc);

  const secoesPorUuid = new Map(
    doc.autos.secoes.map((secao) => [secao.uuid, secao]),
  );
  doc.autos.servicos.forEach((servico, indiceServico) => {
    validarServico(violacoes, servico, secoesPorUuid, [
      "autos",
      "servicos",
      indiceServico,
    ]);
  });

  return violacoes;
}
