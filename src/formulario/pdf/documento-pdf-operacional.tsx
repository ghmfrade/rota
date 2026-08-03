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

// Renderizador @react-pdf do PDF operacional (TASK-033/TASK-126; Spec 04
// §13.1). Componente burro: desenha o modelo já montado por
// `modelo-pdf-operacional.ts` — nenhuma regra de negócio, nenhuma contagem,
// nenhum acesso ao documento bruto. Os itens 5–8 do §13.1 (tabelas horárias,
// matrizes e anexo técnico) entram aqui na TASK-034, entre os itinerários e o
// rodapé.
//
// Paginação (§13.3 — "uma página por bloco lógico quando possível"): a capa
// ocupa `Page` própria; o resumo abre outra `Page` (que também recebe os
// blocos de Serviço); os itinerários ficam em uma terceira `Page`. Dentro de
// cada `Page`, `wrap={false}` em cada bloco de Serviço/itinerário impede que
// um único bloco seja partido ao meio — se não couber no restante da página,
// o `@react-pdf` o empurra inteiro para a próxima, que é o "quando couber".

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
      <Text style={estilosPdf.subtituloBloco}>{ROTULO_FAIXA_TOTAL_AUTOS}</Text>
      <View style={estilosPdf.tabela}>
        <View style={estilosPdf.linhaCabecalho} wrap={false}>
          <Text style={estilosPdf.celulaFaixa}>Faixa</Text>
          <Text style={estilosPdf.celulaNumerica}>Viagens</Text>
          <Text style={estilosPdf.celulaNumerica}>Opções de deslocamento</Text>
        </View>
        {resumo.porFaixa.map((faixa, indice) => (
          <View style={estiloLinhaDados(indice)} key={faixa.rotulo} wrap={false}>
            <Text style={estilosPdf.celulaFaixa}>{faixa.rotulo}</Text>
            <Text style={estilosPdf.celulaNumerica}>{faixa.viagensSemana}</Text>
            <Text style={estilosPdf.celulaNumerica}>{faixa.opcoesDeslocamento}</Text>
          </View>
        ))}
      </View>

      {resumo.porFaixaPorServico.map((servico) => (
        <View key={servico.servicoUuid}>
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
            <View style={estilosPdf.linhaCabecalho} wrap={false}>
              <Text style={estilosPdf.celulaFaixa}>Faixa</Text>
              <Text style={estilosPdf.celulaNumerica}>Viagens Ida</Text>
              <Text style={estilosPdf.celulaNumerica}>Viagens Volta</Text>
              <Text style={estilosPdf.celulaNumerica}>Viagens total</Text>
              <Text style={estilosPdf.celulaNumerica}>Opções Ida</Text>
              <Text style={estilosPdf.celulaNumerica}>Opções Volta</Text>
              <Text style={estilosPdf.celulaNumerica}>Opções total</Text>
            </View>
            {servico.faixas.map((faixa, indice) => (
              <View style={estiloLinhaDados(indice)} key={faixa.rotulo} wrap={false}>
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

function BlocoItinerarioPdf({ itinerario }: { itinerario: BlocoItinerario }) {
  const paragrafo = paragrafoDaDescricao(itinerario);
  return (
    <View wrap={false}>
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

      {/* Item 2 — resumo, começa em página nova (§13.3); item 3 — Serviços,
          na sequência, cada bloco pulando de página quando não couber. */}
      <Page size="A4" style={estilosPdf.pagina}>
        <BlocoResumoPdf resumo={modelo.resumo} />

        <Text style={estilosPdf.tituloBloco}>Serviços</Text>
        {modelo.servicos.map((servico) => (
          <BlocoServicoPdf key={servico.servicoUuid} servico={servico} />
        ))}

        <Rodape modelo={modelo} />
      </Page>

      {/* Item 4 — itinerários por Serviço e sentido, em página própria. */}
      <Page size="A4" style={estilosPdf.pagina}>
        <Text style={estilosPdf.tituloBloco}>Itinerários</Text>
        {modelo.itinerarios.map((itinerario) => (
          <BlocoItinerarioPdf
            key={`${itinerario.servicoUuid}-${itinerario.sentido}`}
            itinerario={itinerario}
          />
        ))}

        <Rodape modelo={modelo} />
      </Page>
    </Document>
  );
}
