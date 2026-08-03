import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { estilosPdf } from "./estilos-pdf";
import {
  paragrafoDaDescricao,
  ROTULO_FAIXA_TOTAL_AUTOS,
  type BlocoItinerario,
  type BlocoResumo,
  type BlocoServico,
  type ModeloPdfOperacional,
} from "./modelo-pdf-operacional";
import type { ItemLegendaSecao } from "./legenda-itinerario";
import {
  AVISO_GRADE_VAZIA,
  type GradeHorariaPdf,
  type TabelaHorariaPdf,
} from "./tabelas-horarias-pdf";
import {
  dividirMatrizEmBlocos,
  type CelulaDistanciaPdf,
  type CelulaSeccionamentoPdf,
  type MatrizDistanciasPdf,
  type MatrizSeccionamentoPdf,
} from "./matrizes-pdf";
import type { BlocoAnexoTecnico, BlocoLocaisAnexo } from "./anexo-tecnico-pdf";

// Renderizador @react-pdf do PDF operacional (TASK-033/126/127/034; Spec 04
// §13.1). Componente burro: desenha o modelo já montado por
// `modelo-pdf-operacional.ts` — nenhuma regra de negócio, nenhuma contagem,
// nenhum acesso ao documento bruto.
//
// Paginação (§13.3 — "uma página por bloco lógico quando possível"): a capa
// ocupa `Page` própria; o resumo abre outra `Page`; os Serviços abrem a
// terceira; os itinerários, a quarta; e a TASK-034 acrescenta uma `Page` por
// bloco lógico dos itens 5, 6, 7 e 8 — oito ao todo. Dentro de cada `Page`,
// `wrap={false}` em cada bloco impede que ele seja partido ao meio — se não
// couber no restante da página, o `@react-pdf` o empurra inteiro para a
// próxima.
//
// Uso da prop `break` (ressalva 1 do parecer da TASK-126):
// - **Itinerários: um por página.** `break` a partir do segundo bloco — é o
//   caso válido explícito da task ("um itinerário por página"). Nunca no
//   primeiro, que já abre a `Page`: `break` no primeiro filho geraria uma
//   página em branco.
// - **Blocos de Serviço: `break` deliberadamente NÃO usado.** Um bloco de
//   Serviço são seis pares rótulo-valor (~6 linhas); forçar página nova a cada
//   um produziria páginas 90% vazias, o oposto da legibilidade de peça
//   operacional que o §13.3 pede. O "quando couber" do critério é atendido
//   dando `Page` própria ao conjunto dos Serviços e mantendo cada bloco
//   íntegro com `wrap={false}`.

function Rodape({ modelo }: { modelo: ModeloPdfOperacional }) {
  // §13.1 item 9 — fixo em todas as páginas: `versao_schema`, data/hora,
  // numeração "Página X de Y" (TASK-126) e o aviso de fronteira com o SEI
  // (RN-077).
  return (
    <View style={estilosPdf.rodape} fixed>
      <View style={estilosPdf.rodapeLinha}>
        <Text>
          Versão do schema: {modelo.rodape.versaoSchema} · Gerado em{" "}
          {modelo.rodape.geradoEm}
        </Text>
        <Text
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </View>
      <Text>{modelo.rodape.aviso}</Text>
    </View>
  );
}

function LinhaIdentificacao({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilosPdf.linhaIdentificacao}>
      <Text style={estilosPdf.rotuloIdentificacao}>{rotulo}</Text>
      <Text style={estilosPdf.valorIdentificacao}>{valor}</Text>
    </View>
  );
}

/** RN-069/NEG-018 — o rótulo da semana padrão repetido junto de cada grupo de
 * tabelas de contagem, para não se separar delas quando o resumo paginar. */
function NotaSemanaPadrao({ rotulo }: { rotulo: string }) {
  return (
    <Text style={estilosPdf.rotuloContagem}>
      Todas as contagens consideram a {rotulo}.
    </Text>
  );
}

/** Estilo da linha de dados, alternando zebra (TASK-126 — cabeçalho, zebra e
 * total agora são visualmente distintos, sem `flex: 1` uniforme). */
function estiloLinhaDados(indice: number) {
  return indice % 2 === 1 ? estilosPdf.linhaTabelaZebra : estilosPdf.linhaTabela;
}

/**
 * §13.1 item 2 — resumo do Autos.
 *
 * Integridade das tabelas por faixa de horário: cada estratificação é um grupo
 * `wrap={false}` que envolve **subtítulo + nota da RN-069 + cabeçalho + as 7
 * linhas**. Antes, o `wrap={false}` estava em cada linha isolada: nenhuma linha
 * era partida ao meio, mas a tabela podia quebrar *entre* linhas, deixando
 * subtítulo e cabeçalho numa página e o resto na seguinte. Com o grupo íntegro,
 * a tabela que não couber no restante da página migra inteira para a próxima.
 *
 * A altura do grupo é limitada e conhecida: as faixas são as **7 fixas** da
 * Spec 04 §10 (`FAIXAS_HORARIO`), então nenhum grupo pode estourar uma A4. Se
 * a spec passar a definir mais faixas, esta premissa precisa ser reavaliada.
 *
 * A tabela de resumo POR SERVIÇO (a primeira) segue com `wrap={false}` por
 * linha, e não por grupo: ela tem uma linha por Serviço — N ilimitado —, e
 * agrupá-la inteira poderia produzir um bloco maior que a página.
 */
function BlocoResumoPdf({ resumo }: { resumo: BlocoResumo }) {
  return (
    <View>
      <Text style={estilosPdf.tituloBloco}>Resumo do Autos</Text>
      <NotaSemanaPadrao rotulo={resumo.rotuloSemanaPadrao} />

      {/* Os 7 contadores por Serviço do §10 — nenhum a menos. */}
      <View style={estilosPdf.tabela}>
        <View style={estilosPdf.linhaCabecalho} wrap={false}>
          <Text style={estilosPdf.celulaServico}>Serviço</Text>
          <Text style={estilosPdf.celulaNumerica}>Viagens Ida</Text>
          <Text style={estilosPdf.celulaNumerica}>Viagens Volta</Text>
          <Text style={estilosPdf.celulaNumerica}>Viagens total</Text>
          <Text style={estilosPdf.celulaNumerica}>Pares compráveis</Text>
          <Text style={estilosPdf.celulaNumerica}>Opções Ida</Text>
          <Text style={estilosPdf.celulaNumerica}>Opções Volta</Text>
          <Text style={estilosPdf.celulaNumerica}>Opções total</Text>
        </View>
        {resumo.porServico.map((linha, indice) => (
          <View style={estiloLinhaDados(indice)} key={linha.servicoUuid} wrap={false}>
            <Text style={estilosPdf.celulaServico}>{linha.numeroN}</Text>
            <Text style={estilosPdf.celulaNumerica}>{linha.viagensIda}</Text>
            <Text style={estilosPdf.celulaNumerica}>{linha.viagensVolta}</Text>
            <Text style={estilosPdf.celulaNumerica}>{linha.viagensTotal}</Text>
            <Text style={estilosPdf.celulaNumerica}>{linha.paresCompraveis}</Text>
            <Text style={estilosPdf.celulaNumerica}>{linha.opcoesIda}</Text>
            <Text style={estilosPdf.celulaNumerica}>{linha.opcoesVolta}</Text>
            <Text style={estilosPdf.celulaNumerica}>{linha.opcoesDeslocamento}</Text>
          </View>
        ))}
        {/* §10 "Por Autos": só as duas somas existem neste nível — as demais
            colunas ficam com "—" em vez de um número que a spec não define. */}
        <View style={estilosPdf.linhaTotal} wrap={false}>
          <Text style={estilosPdf.celulaServico}>Total do Autos</Text>
          <Text style={estilosPdf.celulaNumerica}>—</Text>
          <Text style={estilosPdf.celulaNumerica}>—</Text>
          <Text style={estilosPdf.celulaNumerica}>{resumo.totalViagensSemana}</Text>
          <Text style={estilosPdf.celulaNumerica}>—</Text>
          <Text style={estilosPdf.celulaNumerica}>—</Text>
          <Text style={estilosPdf.celulaNumerica}>—</Text>
          <Text style={estilosPdf.celulaNumerica}>
            {resumo.totalOpcoesDeslocamento}
          </Text>
        </View>
      </View>

      {/* §10 — estratificação por faixa "por Serviço e no total do Autos": o
          total do Autos abre o bloco, nomeado como total, e cada Serviço vem
          em seguida em tabela própria. */}
      <Text style={estilosPdf.tituloBloco}>Estratificação por faixa de horário</Text>
      <NotaSemanaPadrao rotulo={resumo.rotuloSemanaPadrao} />

      {/* Grupo íntegro: subtítulo + tabela nunca se separam nem quebram entre
          páginas (ver o comentário do componente). */}
      <View wrap={false}>
        <Text style={estilosPdf.subtituloBloco}>{ROTULO_FAIXA_TOTAL_AUTOS}</Text>
        <View style={estilosPdf.tabela}>
          <View style={estilosPdf.linhaCabecalho}>
            <Text style={estilosPdf.celulaFaixa}>Faixa</Text>
            <Text style={estilosPdf.celulaNumerica}>Viagens</Text>
            <Text style={estilosPdf.celulaNumerica}>Opções de deslocamento</Text>
          </View>
          {resumo.porFaixa.map((faixa, indice) => (
            <View style={estiloLinhaDados(indice)} key={faixa.rotulo}>
              <Text style={estilosPdf.celulaFaixa}>{faixa.rotulo}</Text>
              <Text style={estilosPdf.celulaNumerica}>{faixa.viagensSemana}</Text>
              <Text style={estilosPdf.celulaNumerica}>{faixa.opcoesDeslocamento}</Text>
            </View>
          ))}
        </View>
      </View>

      {resumo.porFaixaPorServico.map((servico) => (
        <View key={servico.servicoUuid} wrap={false}>
          <Text style={estilosPdf.subtituloBloco}>
            Serviço {servico.numeroN} — por faixa de horário
          </Text>
          <NotaSemanaPadrao rotulo={resumo.rotuloSemanaPadrao} />
          {/* Pares compráveis não depende de Viagem: é o mesmo em todas as
              faixas, então aparece uma vez em vez de repetir sete linhas. */}
          <Text style={estilosPdf.notaTabela}>
            Pares compráveis: {servico.paresCompraveis} (invariante entre faixas).
          </Text>
          <View style={estilosPdf.tabela}>
            <View style={estilosPdf.linhaCabecalho}>
              <Text style={estilosPdf.celulaFaixa}>Faixa</Text>
              <Text style={estilosPdf.celulaNumerica}>Viagens Ida</Text>
              <Text style={estilosPdf.celulaNumerica}>Viagens Volta</Text>
              <Text style={estilosPdf.celulaNumerica}>Viagens total</Text>
              <Text style={estilosPdf.celulaNumerica}>Opções Ida</Text>
              <Text style={estilosPdf.celulaNumerica}>Opções Volta</Text>
              <Text style={estilosPdf.celulaNumerica}>Opções total</Text>
            </View>
            {servico.faixas.map((faixa, indice) => (
              <View style={estiloLinhaDados(indice)} key={faixa.rotulo}>
                <Text style={estilosPdf.celulaFaixa}>{faixa.rotulo}</Text>
                <Text style={estilosPdf.celulaNumerica}>{faixa.viagensIda}</Text>
                <Text style={estilosPdf.celulaNumerica}>{faixa.viagensVolta}</Text>
                <Text style={estilosPdf.celulaNumerica}>{faixa.viagensSemana}</Text>
                <Text style={estilosPdf.celulaNumerica}>{faixa.opcoesIda}</Text>
                <Text style={estilosPdf.celulaNumerica}>{faixa.opcoesVolta}</Text>
                <Text style={estilosPdf.celulaNumerica}>
                  {faixa.opcoesDeslocamento}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function BlocoServicoPdf({ servico }: { servico: BlocoServico }) {
  return (
    <View wrap={false}>
      <Text style={estilosPdf.tituloItinerario}>Serviço {servico.numeroN}</Text>
      <LinhaIdentificacao
        rotulo="Característica de veículo"
        valor={servico.caracteristicaVeiculo}
      />
      <LinhaIdentificacao rotulo="Caráter" valor={servico.carater} />
      <LinhaIdentificacao rotulo="Direcionalidade" valor={servico.direcionalidade} />
      <LinhaIdentificacao
        rotulo="Viagens na semana"
        valor={String(servico.viagensSemana)}
      />
      <LinhaIdentificacao
        rotulo="Pares compráveis"
        valor={String(servico.paresCompraveis)}
      />
      <LinhaIdentificacao
        rotulo="Opções de deslocamento"
        valor={String(servico.opcoesDeslocamento)}
      />
    </View>
  );
}

/**
 * Legenda vertical do bloco de itinerário (DEC-105; §13.1 item 4d) — só
 * Seções (RN-076), símbolo numerado (mesma cor/forma do quadrado da DEC-069,
 * em escala de legenda) + `Cidade - Nome`, ligados por um conector azul entre
 * itens consecutivos. Renderizada mesmo sem `imagemMapa`: falha de captura
 * (DEC-104) não impede a legenda.
 */
function LegendaItinerarioPdf({ legenda }: { legenda: ItemLegendaSecao[] }) {
  if (legenda.length === 0) return null;
  return (
    <View style={estilosPdf.legendaItinerario}>
      {legenda.map((item, indice) => (
        <View key={item.rotulo} style={estilosPdf.legendaLinha} wrap={false}>
          <View style={estilosPdf.legendaColunaSimbolo}>
            <View style={estilosPdf.legendaSimbolo}>
              <Text style={estilosPdf.legendaNumero}>{item.rotulo}</Text>
            </View>
            {indice < legenda.length - 1 ? (
              <View style={estilosPdf.legendaConector} />
            ) : null}
          </View>
          <Text style={estilosPdf.legendaNome}>{item.nome}</Text>
        </View>
      ))}
    </View>
  );
}

function BlocoItinerarioPdf({
  itinerario,
  quebraPagina,
}: {
  itinerario: BlocoItinerario;
  quebraPagina: boolean;
}) {
  const paragrafo = paragrafoDaDescricao(itinerario);
  return (
    <View wrap={false} break={quebraPagina}>
      {/* (a) título */}
      <Text style={estilosPdf.tituloItinerario}>{itinerario.titulo}</Text>
      {/* (b) sequência resumida de Seções, ligada por seta */}
      <Text style={estilosPdf.sequenciaSecoes}>{itinerario.sequenciaSecoes}</Text>
      {/* (c) descrição por vias — parágrafo corrido, Seções em destaque (§13.4).
          O realce usa `itens` (o §13.4 manda), e o parágrafo fecha com o mesmo
          ponto final do texto congelado (`compor-descricao.ts`), como faz o
          painel equivalente da UI. Sem `itens` — documento antigo ou descrição
          só com texto — cai no texto congelado em vez de sumir. */}
      {paragrafo.origem === "itens" ? (
        <Text style={estilosPdf.paragrafoDescricao}>
          {paragrafo.itens.map((item, indice) => (
            <Text
              key={`${item.tipo}-${indice}`}
              style={
                item.tipo === "secao"
                  ? estilosPdf.descricaoSecao
                  : estilosPdf.descricaoVia
              }
            >
              {indice > 0 ? paragrafo.separador : ""}
              {item.texto}
            </Text>
          ))}
          <Text>{paragrafo.pontoFinal}</Text>
        </Text>
      ) : (
        <Text style={estilosPdf.paragrafoDescricao}>{paragrafo.texto}</Text>
      )}
      {/* (d) imagem do mapa; ausência é tolerada (DEC-104) */}
      {itinerario.imagemMapa ? (
        // `Image` aqui é o primitivo do @react-pdf, não `<img>` do DOM: não
        // aceita `alt` (a acessibilidade do PDF vem do texto do bloco).
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image style={estilosPdf.imagemMapa} src={itinerario.imagemMapa} />
      ) : (
        <Text style={estilosPdf.avisoSemImagem}>
          Imagem do mapa indisponível para este itinerário.
        </Text>
      )}
      {/* Legenda das Seções numeradas no mapa acima (DEC-105) — renderizada
          independentemente de `imagemMapa` ter vindo. */}
      <LegendaItinerarioPdf legenda={itinerario.legendaSecoes} />
    </View>
  );
}

/**
 * Uma grade horária (§13.2/§8.1): cabeçalho SEG…DOM e um grupo por bloco —
 * a n-ésima partida do dia.
 *
 * Integridade × altura: o número de blocos é ilimitado (N Viagens por dia),
 * então a grade inteira NÃO pode virar um único `wrap={false}` — seria um
 * bloco maior que a página, como já documentado para a tabela de resumo por
 * Serviço (TASK-126). O grupo íntegro é (título + nota + cabeçalho + primeiro
 * bloco), que garante que a tabela nunca comece com o cabeçalho órfão no pé de
 * uma página; cada bloco seguinte é íntegro por si.
 */
function CabecalhoDias({ colunas }: { colunas: readonly string[] }) {
  return (
    <View style={estilosPdf.linhaCabecalho}>
      <Text style={estilosPdf.celulaSecaoHoraria}>Seção</Text>
      {colunas.map((coluna) => (
        <Text key={coluna} style={estilosPdf.celulaHorario}>
          {coluna}
        </Text>
      ))}
    </View>
  );
}

function GradeHorariaPdfView({
  grade,
  colunas,
}: {
  grade: GradeHorariaPdf;
  colunas: readonly string[];
}) {
  const titulo = (
    <>
      <Text style={estilosPdf.subtituloBloco}>{grade.rotulo}</Text>
      {/* RN-069/NEG-018 — feriado e excepcional ficam fora da semana padrão;
          a nota acompanha a grade, como a legenda equivalente da tela. */}
      {grade.notaForaDasContagens ? (
        <Text style={estilosPdf.notaTabela}>{grade.notaForaDasContagens}</Text>
      ) : null}
    </>
  );

  // RN-071 — grade sem Viagem é válida (pode ser intencional): imprime o aviso
  // em vez de sumir, para o leitor não tomar a ausência por documento truncado.
  if (grade.vazia) {
    return (
      <View wrap={false}>
        {titulo}
        <Text style={estilosPdf.avisoGradeVazia}>{AVISO_GRADE_VAZIA}</Text>
      </View>
    );
  }

  return (
    <View>
      <View wrap={false}>
        {titulo}
        <View style={estilosPdf.tabela}>
          <CabecalhoDias colunas={colunas} />
          <LinhasDoBloco bloco={grade.blocos[0]} indiceBloco={0} />
        </View>
      </View>
      {grade.blocos.slice(1).map((bloco, indice) => (
        <View key={indice} style={estilosPdf.tabela} wrap={false}>
          <LinhasDoBloco bloco={bloco} indiceBloco={indice + 1} />
        </View>
      ))}
    </View>
  );
}

function LinhasDoBloco({
  bloco,
  indiceBloco,
}: {
  bloco: { linhas: { secao: string; horarios: string[] }[] };
  indiceBloco: number;
}) {
  return (
    <View style={estilosPdf.blocoHorario}>
      {bloco.linhas.map((linha, indice) => (
        <View style={estiloLinhaDados(indice)} key={`${indiceBloco}-${linha.secao}-${indice}`}>
          <Text style={estilosPdf.celulaSecaoHoraria}>{linha.secao}</Text>
          {linha.horarios.map((horario, indiceDia) => (
            <Text key={indiceDia} style={estilosPdf.celulaHorario}>
              {horario}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Todas as grades de um Serviço/sentido (§13.2), na ordem comum → feriado →
 * excepcionais, sempre em tabelas separadas (§13.3). */
function TabelaHorariaPdfView({ tabela }: { tabela: TabelaHorariaPdf }) {
  return (
    <View>
      <Text style={estilosPdf.tituloItinerario}>{tabela.titulo}</Text>
      {tabela.grades.map((grade) => (
        <GradeHorariaPdfView
          key={grade.tabelaExcepcionalUuid ?? grade.tipo}
          grade={grade}
          colunas={tabela.colunas}
        />
      ))}
    </View>
  );
}

/**
 * Uma célula de dados da matriz (§9.1/§9.2): diagonal "X", preenchimento
 * vazio (fora do triângulo — nunca "—", DEC-107 §3.3) ou valor. O detalhe
 * Ida/Volta do Serviço bidirecional (RN-056) empilha em linhas próprias,
 * abreviado `I:`/`V:`, nunca junto do valor adotado (D3/D4 da DEC-107). Uma
 * célula de preenchimento pode hospedar o rótulo horizontal da coluna
 * seguinte à diagonal da própria linha (DEC-108 item 1).
 */
function CelulaMatrizView({
  celula,
  rotuloColuna,
}: {
  celula: CelulaDistanciaPdf | CelulaSeccionamentoPdf | undefined;
  rotuloColuna?: string;
}) {
  if (celula === undefined) {
    return (
      <View style={estilosPdf.celulaMatrizVazia}>
        {rotuloColuna !== undefined ? (
          <Text style={estilosPdf.rotuloColunaMatriz}>{rotuloColuna}</Text>
        ) : null}
      </View>
    );
  }
  if (celula.tipo === "diagonal") {
    return (
      <View style={estilosPdf.celulaMatrizDiagonal}>
        <Text>{celula.texto}</Text>
      </View>
    );
  }
  return (
    <View style={estilosPdf.celulaMatrizValor}>
      <Text>{celula.texto}</Text>
      {"detalheIda" in celula && celula.detalheIda !== undefined ? (
        <>
          <Text style={estilosPdf.detalheMatriz}>I: {celula.detalheIda}</Text>
          <Text style={estilosPdf.detalheMatriz}>V: {celula.detalheVolta}</Text>
        </>
      ) : null}
    </View>
  );
}

/**
 * Matriz triangular inferior (§9.1/§9.2; DEC-108 — correção da TASK-034):
 * "X" na diagonal, cabeçalhos `Cidade - Nome da Seção` na coluna de linha e
 * escritos horizontalmente dentro do próprio triângulo superior, valores em
 * km (a unidade vai para o título do bloco, não para a célula — RN-013/076).
 * Dividida em blocos de faixa de colunas × pedaço de linhas
 * (`dividirMatrizEmBlocos`) para caber na largura/altura úteis da A4 com
 * largura de coluna FIXA — nunca `flex`, causa do desalinhamento reprovado no
 * parecer da TASK-034. A diferença de semântica da célula vazia/"—" mora no
 * modelo (`matrizes-pdf.ts`), não aqui. A linha de cabeçalho acima da tabela
 * só mostra o rótulo da **primeira** coluna da faixa (DEC-108 item 2); os
 * demais nascem dentro do triângulo, na linha que cada um hospeda
 * (`rotuloColunaHospedada`). O envelope `wrap={false}` sobe do bloco para o
 * Serviço inteiro (DEC-108 item 5): a matriz de um mesmo Serviço migra
 * inteira para a página seguinte quando não couber, e só é partida em blocos
 * quando nem uma página inteira comporta.
 */
function MatrizPdfView({
  matriz,
}: {
  matriz: MatrizDistanciasPdf | MatrizSeccionamentoPdf;
}) {
  return (
    <View wrap={false}>
      {dividirMatrizEmBlocos<CelulaDistanciaPdf | CelulaSeccionamentoPdf>(matriz).map(
        (bloco, indiceBloco) => (
          <View key={indiceBloco} wrap={false}>
            <Text style={estilosPdf.tituloItinerario}>
              Serviço {matriz.numeroN}
              {bloco.continuacao ? " (continuação)" : ""}
            </Text>
            <View style={estilosPdf.tabelaMatriz}>
              <View style={estilosPdf.linhaCabecalhoMatriz}>
                <View style={estilosPdf.cabecalhoLinhaMatriz} />
                {bloco.cabecalhos.map((cabecalho, indiceNaFaixa) => (
                  <View key={cabecalho.secaoUuid} style={estilosPdf.celulaMatrizVazia}>
                    {indiceNaFaixa === 0 ? (
                      <Text style={estilosPdf.rotuloColunaMatriz}>{cabecalho.rotulo}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
              {bloco.linhas.map((linha, indice) => (
                <View style={estiloLinhaDados(indice)} key={linha.secaoUuid}>
                  <Text style={estilosPdf.cabecalhoLinhaMatriz}>{linha.rotulo}</Text>
                  {linha.celulas.map((celula, indiceCelula) => (
                    <CelulaMatrizView
                      key={indiceCelula}
                      celula={celula}
                      rotuloColuna={
                        linha.rotuloColunaHospedada?.indiceLocal === indiceCelula
                          ? linha.rotuloColunaHospedada.rotulo
                          : undefined
                      }
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        ),
      )}
    </View>
  );
}

/** §13.1 item 8b — Locais comuns por Serviço/sentido, SEM horários e SEM
 * offsets; a posição no itinerário é o identificador `n.m` da DEC-105. */
function LocaisDoAnexoPdfView({ bloco }: { bloco: BlocoLocaisAnexo }) {
  return (
    <View wrap={false}>
      <Text style={estilosPdf.tituloItinerario}>{bloco.titulo}</Text>
      {bloco.locais.length === 0 ? (
        <Text style={estilosPdf.avisoGradeVazia}>
          Nenhum Local comum neste itinerário.
        </Text>
      ) : (
        <View style={estilosPdf.tabela}>
          <View style={estilosPdf.linhaCabecalho}>
            <Text style={estilosPdf.celulaMatriz}>Posição</Text>
            <Text style={estilosPdf.celulaCabecalhoMatriz}>Local</Text>
            <Text style={estilosPdf.celulaCabecalhoMatriz}>Município</Text>
          </View>
          {bloco.locais.map((local, indice) => (
            <View style={estiloLinhaDados(indice)} key={local.localUuid}>
              <Text style={estilosPdf.celulaMatriz}>{local.identificador}</Text>
              <Text style={estilosPdf.celulaCabecalhoMatriz}>{local.nome}</Text>
              <Text style={estilosPdf.celulaCabecalhoMatriz}>{local.municipio}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function AnexoTecnicoPdfView({ anexo }: { anexo: BlocoAnexoTecnico }) {
  return (
    <View>
      <Text style={estilosPdf.tituloBloco}>Anexo técnico</Text>
      <Text style={estilosPdf.subtituloBloco}>
        Tabela horária detalhada — horários de passagem por Seção
      </Text>
      {anexo.tabelasDetalhadas.map((tabela) => (
        <TabelaHorariaPdfView
          key={`${tabela.servicoUuid}-${tabela.sentido}`}
          tabela={tabela}
        />
      ))}
      <Text style={estilosPdf.subtituloBloco}>Relação de Locais comuns</Text>
      {/* RN-075/076 — sem horários de passagem e sem offsets: eles permanecem
          dado interno do JSON (§13.1 item 8b). */}
      {anexo.locaisPorItinerario.map((bloco) => (
        <LocaisDoAnexoPdfView
          key={`${bloco.servicoUuid}-${bloco.sentido}`}
          bloco={bloco}
        />
      ))}
    </View>
  );
}

export function DocumentoPdfOperacional({
  modelo,
}: {
  modelo: ModeloPdfOperacional;
}) {
  return (
    <Document title={`${modelo.capa.titulo} — ${modelo.capa.codigo}`}>
      {/* Item 1 — capa/identificação, em página própria (§13.3). */}
      <Page size="A4" style={estilosPdf.paginaCapa}>
        <Text style={estilosPdf.tituloDocumento}>{modelo.capa.titulo}</Text>
        <Text style={estilosPdf.codigoCapa}>{modelo.capa.codigo}</Text>
        <View style={estilosPdf.linhaCapa}>
          <Text style={estilosPdf.rotuloCapa}>Empresa</Text>
          <Text style={estilosPdf.valorCapa}>{modelo.capa.empresa}</Text>
        </View>
        <View style={estilosPdf.linhaCapa}>
          <Text style={estilosPdf.rotuloCapa}>Tipo</Text>
          <Text style={estilosPdf.valorCapa}>{modelo.capa.tipo}</Text>
        </View>
        <View style={estilosPdf.linhaCapa}>
          <Text style={estilosPdf.rotuloCapa}>Status</Text>
          <Text style={estilosPdf.seloStatus}>{modelo.capa.status}</Text>
        </View>
        {modelo.capa.data ? (
          <View style={estilosPdf.linhaCapa}>
            <Text style={estilosPdf.rotuloCapa}>{modelo.capa.rotuloData}</Text>
            <Text style={estilosPdf.valorCapa}>{modelo.capa.data}</Text>
          </View>
        ) : null}

        <Rodape modelo={modelo} />
      </Page>

      {/* Item 2 — resumo, em página própria (§13.3). */}
      <Page size="A4" style={estilosPdf.pagina}>
        <BlocoResumoPdf resumo={modelo.resumo} />

        <Rodape modelo={modelo} />
      </Page>

      {/* Item 3 — Serviços, em página própria; cada bloco íntegro, sem
          `break` por Serviço (ver a nota de paginação no topo do arquivo). */}
      <Page size="A4" style={estilosPdf.pagina}>
        <Text style={estilosPdf.tituloBloco}>Serviços</Text>
        {modelo.servicos.map((servico) => (
          <BlocoServicoPdf key={servico.servicoUuid} servico={servico} />
        ))}

        <Rodape modelo={modelo} />
      </Page>

      {/* Item 4 — itinerários por Serviço e sentido, um por página. */}
      <Page size="A4" style={estilosPdf.pagina}>
        <Text style={estilosPdf.tituloBloco}>Itinerários</Text>
        {modelo.itinerarios.map((itinerario, indice) => (
          <BlocoItinerarioPdf
            key={`${itinerario.servicoUuid}-${itinerario.sentido}`}
            itinerario={itinerario}
            quebraPagina={indice > 0}
          />
        ))}

        <Rodape modelo={modelo} />
      </Page>

      {/* Item 5 — tabela horária, versão simples (§13.2): só os horários de
          saída de cada Viagem, por dia (RN-075; DEC-086). */}
      <Page size="A4" style={estilosPdf.pagina}>
        <Text style={estilosPdf.tituloBloco}>Tabela horária — horários de saída</Text>
        {modelo.tabelasHorarias.map((tabela) => (
          <TabelaHorariaPdfView
            key={`${tabela.servicoUuid}-${tabela.sentido}`}
            tabela={tabela}
          />
        ))}

        <Rodape modelo={modelo} />
      </Page>

      {/* Item 6 — matriz de distâncias por Serviço (§9.1). */}
      <Page size="A4" style={estilosPdf.pagina}>
        <Text style={estilosPdf.tituloBloco}>Matriz de distâncias (km)</Text>
        {modelo.matrizesDistancias.map((matriz) => (
          <MatrizPdfView key={matriz.servicoUuid} matriz={matriz} />
        ))}

        <Rodape modelo={modelo} />
      </Page>

      {/* Item 7 — matriz de seccionamento por Serviço (§9.2): pares não
          habilitados com "—". */}
      <Page size="A4" style={estilosPdf.pagina}>
        <Text style={estilosPdf.tituloBloco}>Matriz de seccionamento (km)</Text>
        {modelo.matrizesSeccionamento.map((matriz) => (
          <MatrizPdfView key={matriz.servicoUuid} matriz={matriz} />
        ))}

        <Rodape modelo={modelo} />
      </Page>

      {/* Item 8 — anexo técnico: tabela horária detalhada + relação de Locais. */}
      <Page size="A4" style={estilosPdf.pagina}>
        <AnexoTecnicoPdfView anexo={modelo.anexoTecnico} />

        <Rodape modelo={modelo} />
      </Page>
    </Document>
  );
}
