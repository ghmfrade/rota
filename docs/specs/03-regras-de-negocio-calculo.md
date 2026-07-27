# Spec 03 — Regras de Negócio e Cálculo

**Projeto:** ROTA — Registro de Operação e Tabelas de Autos
**Depende de:** [Spec 01 — Visão Geral do Sistema](01-visao-geral.md) e [Spec 02 — Esquema do JSON de Operação](02-esquema-json-operacao.md)
**Status:** Em definição — v0.6 (§10.4: trocar o `tipo` reconverte Serviços incompatíveis à forma convencional do tipo, com aviso, nunca bloqueia — DEC-034. v0.5: códigos de característica definitivos: `CR`/`CL`, `EX`, `LE`, `ME`/`MEL`, `ML`/`MLL`, `MX`, `MM`/`MML`; sem `SL`; partição código-a-código fechada em §10.2; supera os códigos `RO`/`ROL`/mistos "M\*" da v0.4)
**Escopo:** Os algoritmos e decisões de negócio que produzem e validam os valores do JSON de operação — cálculo de rota (OSRM) e pontos de rota que forçam o traçado, composição da `descricao_itinerario` a partir dos nomes de via do OSRM, determinação do município por geolocalização, cálculo de `matriz_distancias`, composição de `valor_adotado_de_distancia`, sugestão de menor distância para `matriz_seccionamento`, algoritmo de centroide e da regra dos 350 m, sugestão e redistribuição dos horários de passagem (`offset_horario`), semântica de `viagem_feriado` e contagem de viagens/opções de deslocamento, regras de tipificação `tipo` × `caracteristica_veiculo`, e a referência (externa) à tabela de tarifa. **Não é escopo desta spec:** a forma do JSON (é a [Spec 02](02-esquema-json-operacao.md)); UI, mapa, import/export e PDF (Spec 04); diff (Spec 05); PostgreSQL (Spec 06). Onde um cálculo tem parte "de negócio" (aqui) e parte "de tela" (Spec 04), a fronteira está explícita em cada seção e consolidada em §12.

---

## 1. Papel deste Documento

A Spec 02 fechou **o que** cada campo é. Esta spec fecha **como** os campos calculados são produzidos e **quais regras** um documento precisa respeitar além da forma. Vários campos do esquema são explicitamente "computados e congelados" (`rota`, `rota.trechos`, `matriz_distancias`, `municipio`) ou "sugeridos e editáveis" (`matriz_seccionamento.distancia_km`, `viagem.horarios_paradas[].offset_horario`): esta spec define a função que os gera. Outros são semânticas que a Spec 02 empurrou para cá (`viagem_feriado`, §9) ou regras que a Spec 01 declarou "validações do formulário, detalhadas na Spec 03" (`tipo` × `caracteristica_veiculo`).

Princípios herdados que restringem todo cálculo aqui:

- **Toda distância do documento é em km** (Spec 02 §8). A única fronteira em metros é a resposta do OSRM, convertida na entrada (§3.4). `duracao_s` é em segundos.
- **JSON nunca guarda R$** (Spec 02 §16). A distância alimenta a tarifa, mas o valor monetário é externo (§10).
- **Distância alimenta a tarifa ⇒ não se prossegue com rota não roteada** (Spec 01 §8). O tratamento de indisponibilidade do OSRM é bloqueante (§3.5).
- **Congelado no JSON** (Spec 02 §8, §10.2): Comparador e Ingestor **leem**, não recalculam. Estes algoritmos rodam no Formulário, no momento da geração.

---

## 2. Fundamento Geométrico — Distância Geodésica e Centroide

Vários algoritmos (regra dos 350 m, §7; menor distância como desempate visual) dependem de medir distância em linha reta entre coordenadas `{latitude, longitude}` em graus. Fixa-se aqui uma única primitiva, usada por todos.

### 2.1 Distância em linha reta — Haversine

**Entrada:** dois pontos `P1 = (lat1, lon1)`, `P2 = (lat2, lon2)` em graus decimais.
**Saída:** distância em metros sobre a esfera.

```
R = 6_371_000            # raio médio da Terra, em metros
φ1, φ2 = rad(lat1), rad(lat2)
Δφ     = rad(lat2 - lat1)
Δλ     = rad(lon2 - lon1)
a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)
d = 2R · atan2(√a, √(1-a))         # metros
```

Justificativa: nas escalas desta spec (clusters de Seção com raio ≤ 350 m, divergência Ida×Volta de um Local ≤ 350 m) a Haversine é exata para o efeito prático e não depende de projeção local. É a **única** função de distância em linha reta usada — nunca distância euclidiana sobre graus crus (que ignora a convergência dos meridianos e erra sistematicamente na longitude).

> **Não confundir com distância roteada.** A distância que alimenta tarifa e matrizes (§3, §4) é sempre a **roteada** (street-snapped, pelo OSRM). A Haversine é usada **apenas** para as regras espaciais de agrupamento (350 m), nunca para `distancia_km` de rota, trecho, matriz ou seccionamento.

### 2.2 Centroide de um conjunto de pontos

**Decisão fechada: média aritmética simples de latitude e de longitude** (não centroide geodésico/vetorial 3D).

**Entrada:** conjunto não-vazio de pontos `{(lat_i, lon_i)}`.
**Saída:** `C = (média(lat_i), média(lon_i))`.

```
C.lat = (Σ lat_i) / n
C.lon = (Σ lon_i) / n
```

Justificativa da escolha (média simples × geodésico):

- Os conjuntos sobre os quais o centroide é calculado são, por construção, sub-quilométricos (a própria regra dos 350 m garante isso). Nessa escala a diferença entre a média aritmética em graus e o centroide geodésico verdadeiro é da ordem de milímetros — irrelevante frente ao limiar de 350 m.
- A média simples é **determinística, associativa no acumulado e independente de projeção**, o que casa com o uso incremental (§7.2): recalcula-se o centroide a cada inserção somando um ponto.
- Não há cruzamento do antimeridiano nem proximidade dos polos no domínio (litoral e interior de São Paulo), então a média de longitude não sofre descontinuidade.

Todas as distâncias **ponto→centroide** usam a Haversine de §2.1.

### 2.3 Determinação do município por geolocalização (ponto-em-polígono)

_(Novo na v0.2, induzido pela Spec 04 §7.1.)_ O campo `municipio` de Seção (Spec 02 §5) e de Local (Spec 02 §7) **não é digitado pelo usuário** — é derivado automaticamente da geolocalização escolhida no mapa. O valor derivado persiste no JSON (documento autossuficiente: Comparador/Ingestor/PDF leem o campo, não re-derivam).

**Fontes de dados** — dois recursos estáticos servidos junto do app (mesma natureza das listas de Autos/empresas/tipos — Spec 01 §8):

| Recurso                 | Conteúdo                                                                                                                              | Papel                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `municipios_sp.geojson` | `FeatureCollection` com um `Feature` do tipo `Polygon` por município de SP (645), com `properties.codarea` = código IBGE de 7 dígitos | Geometria para o ponto-em-polígono                                   |
| `pop_municipios.csv`    | Colunas `cod_municipio, populacao_residente, nome_municipio, estado` (645 linhas)                                                     | Nome de exibição: join `codarea == cod_municipio` → `nome_municipio` |

**Algoritmo:**

```
MUNICIPIO(ponto):
  para cada feature F de municipios_sp.geojson:
      se PONTO_EM_POLIGONO(ponto, F.geometry):        # ray casting sobre [lon, lat]
          return nome_municipio(F.properties.codarea) # join com o CSV
  # fallback — ponto fora de todos os polígonos (imprecisão de borda, litoral):
  F* = feature cuja fronteira tem a menor distância Haversine (§2.1) ao ponto
  se distancia(ponto, fronteira de F*) <= 2_000 m:
      return nome_municipio(F*.properties.codarea)
  senão:
      return ERRO ("município não derivável — fora do Estado de São Paulo")
```

- **Ponto-em-polígono:** ray casting padrão sobre as coordenadas `[lon, lat]` do polígono. Os polígonos municipais são disjuntos — o primeiro match é o único.
- **Fallback de borda:** polígonos simplificados podem deixar pontos legítimos (orla, divisa, viaduto sobre rio-limite) marginalmente fora de todas as geometrias. Nesses casos adota-se o município do polígono mais próximo, com teto de **2 km**; acima disso o ponto é considerado fora de SP e a derivação **falha** (erro bloqueante — a Spec 04 §14 define a mensagem).
- **Qual ponto decide o município:**
  - **Seção:** o município é derivado do **centroide** (§2.2) dos pontos aceitos na Seção, e re-derivado a cada inserção/edição/remoção de ponto. Como a regra dos 350 m (§7) limita o raio do conjunto, na prática todos os pontos caem no mesmo município; o centroide resolve deterministicamente o caso raro de Seção encostada na divisa.
  - **Local:** derivado do ponto único ou, quando Ida e Volta existem, do **ponto médio** dos dois.
- **Momento:** a derivação roda no Formulário, na criação do ponto e a cada arrasto (Spec 04 §7.1); o resultado é exibido como campo somente-leitura e congelado no JSON na exportação. Leitores estáticos podem, opcionalmente, re-derivar como checagem fraca (mesma filosofia de §7.3) — não é obrigatório.
- O nome derivado alimenta o padrão visual `Cidade - Nome da Seção` fixado na Spec 04 §7.1.

---

## 3. Roteamento — Chamada ao OSRM e montagem de `rota`

Produz o objeto `rota` (Spec 02 §10.2) e seu `trechos[]` (§10.3) de **um** itinerário, a partir da sequência ordenada de paradas.

### 3.1 Entrada

- A lista de paradas do itinerário, **em ordem** (`ordem` 1..k), com a coordenada de cada uma **no sentido do itinerário**:
  - Parada de Seção (`secao_uuid`): `autos.secoes[secao_uuid].servicos[servico_uuid].geolocalizacao_<sentido>`.
  - Parada de Local (`local_uuid`): `servico.locais[local_uuid].geolocalizacao_<sentido>`.
  - A obrigatoriedade dessas coordenadas já é garantida pelas validações referenciais da Spec 02 §10.1 — se faltarem, é erro de forma, não se chega ao roteamento.
- **Opcionalmente**, uma lista de **pontos de rota** (§3.6) — coordenadas só de UX, ancoradas entre duas paradas, que forçam o traçado. Não pertencem ao esquema; entram no cálculo, mas não viram paradas nem trechos.

### 3.2 Requisição

Serviço público, perfil `driving` (Spec 01 §8):

```
GET https://router.project-osrm.org/route/v1/driving/
      {lon1},{lat1};{lon2},{lat2};…;{lonk},{latk}
      ?overview=full&geometries=geojson&steps=true&annotations=false&continue_straight=false
      [&waypoints={índices das paradas}]     # presente só quando há pontos de rota — ver §3.6
```

- Coordenadas em `lon,lat` (ordem do OSRM/GeoJSON), separadas por `;`, **na ordem das paradas** — e, havendo pontos de rota (§3.6), com estes **intercalados** na posição sequencial correta.
- `overview=full` + `geometries=geojson`: geometria completa street-snapped já em GeoJSON `[lon,lat]`, pronta para `rota.geometria`. **A geometria vem sempre daqui** — nunca dos steps.
- `steps=true`: pedimos as **manobras/steps** de cada leg **exclusivamente** para obter os **nomes das vias** (`step.name`) percorridas, insumo da `descricao_itinerario` (§3.7). Sem isso o OSRM não retorna nomes de ruas. A distância/duração que alimenta `rota.trechos` e as matrizes continua vindo da granularidade de **legs** (§3.3), não dos steps; a descrição textual **não** é por manobra, e sim por sequência limpa de nomes (§3.7).
- `annotations=false`: não precisamos de anotações por vértice.
- **Compatibilidade:** se a instância pública não retornar `steps` (ou retorná-los sem `name`), a rota, os trechos e as matrizes seguem válidos — apenas a `descricao_itinerario` fica sem nomes de via entre as Seções (só os marcos), tratada como caso de borda em §3.7.

### 3.3 Extração — mapa OSRM → esquema

Da resposta usa-se `routes[0]`:

| Fonte OSRM (`routes[0]`)               | Campo do esquema                      | Conversão                             |
| -------------------------------------- | ------------------------------------- | ------------------------------------- |
| `.geometry` (LineString `[lon,lat]`)   | `rota.geometria`                      | cópia direta                          |
| `.legs[i].distance` (metros)           | `rota.trechos[i].distancia_km`        | §3.4                                  |
| `.legs[i].duration` (segundos)         | `rota.trechos[i].duracao_s`           | arredonda ao inteiro                  |
| `.legs[i].steps[].name` (nomes de via) | `rota.descricao_itinerario`           | limpeza + associação por Seção (§3.7) |
| —                                      | `rota.distancia_km`, `rota.duracao_s` | soma dos trechos (§3.4)               |

**Sem pontos de rota:** o OSRM retorna **exatamente um `leg` por par consecutivo de coordenadas de entrada** — logo `legs.length == paradas.length - 1`, que é exatamente o que a Spec 02 §10.3 exige de `rota.trechos`. O `leg[i]` (entre a coordenada `i` e `i+1`) vira o `trecho` com `parada_origem_ordem = i+1`, `parada_destino_ordem = i+2`. Nenhuma agregação por Seção acontece aqui — os Locais comuns intermediários geram seus próprios legs/trechos, e a soma por Seção é a §4.

**Com pontos de rota:** as coordenadas de entrada passam a incluir vértices que **não** são paradas, então o mapeamento leg→trecho deixa de ser 1:1 e precisa do tratamento de §3.6 — mas o invariante `rota.trechos.length == paradas.length - 1` (Spec 02 §10.3) **permanece**.

### 3.4 Conversão de unidade e arredondamento

Na **fronteira de entrada** (única no documento em metros → km):

- `trecho.distancia_km = arredonda(leg.distance / 1000, 2)` — 2 casas decimais (precisão de 10 m).
- `trecho.duracao_s = arredonda(leg.duration, 0)` — inteiro em segundos.
- **Totais por soma dos trechos já arredondados**, garantindo a igualdade estrutural da Spec 02 §14/§10.2 sem erro de fechamento:
  - `rota.distancia_km = arredonda(Σ trecho.distancia_km, 2)`
  - `rota.duracao_s = Σ trecho.duracao_s`

Usar a soma dos trechos (e não o `routes[0].distance/duration` global do OSRM) evita que arredondamentos façam `rota.distancia_km ≠ Σ trechos`. Regra de arredondamento: **half-up** (0,005 → 0,01).

### 3.5 Casos de borda e indisponibilidade (bloqueante)

O roteamento **alimenta a tarifa**; portanto não há degradação silenciosa nem fallback para linha reta.

| Situação                                    | Detecção                 | Ação                                                                                                                                                         |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Serviço fora do ar / timeout / erro de rede | falha de HTTP ou timeout | **Não** produzir `rota`. Mensagem clara ("Não foi possível calcular a rota: serviço de roteamento indisponível. Tente novamente."). Permitir nova tentativa. |
| Sem rota entre paradas                      | `code == "NoRoute"`      | Bloquear; mensagem indicando que não há caminho viário entre as paradas na ordem dada.                                                                       |
| Ponto não ancorável na malha viária         | `code == "NoSegment"`    | Bloquear; mensagem identificando **qual parada** (a coordenada rejeitada) não pôde ser associada a uma via.                                                  |
| Resposta `code != "Ok"` (qualquer outro)    | leitura do envelope      | Bloquear; mensagem genérica com o código retornado.                                                                                                          |

- **Retry:** até 1 nova tentativa automática em falha de rede/timeout antes de exibir erro; erros semânticos (`NoRoute`, `NoSegment`) não são re-tentados (a entrada é que precisa mudar).
- **Street-snapping:** confiado ao OSRM (âncora ao segmento roteável mais próximo). Não se envia `radiuses` por padrão; se no futuro se quiser limitar a distância de ancoragem, é decisão de UI (Spec 04) e não altera este contrato.
- Enquanto qualquer itinerário do Serviço estiver sem `rota` válida, o Serviço **não pode** ter `matriz_distancias` calculada (§4) nem gerar JSON — a distância roteada é pré-requisito de tudo que vem depois.

> **A mensagem não menciona tarifa.** O vínculo "a distância roteada alimenta a tarifa" (Spec 01 §8) é o **motivo** de bloquear quando não há rota — **não** é o texto exibido. A mensagem ao usuário fala apenas da indisponibilidade do serviço de rotas (coluna "Ação" acima), nunca de tarifa. Corrige uma leitura possível da Spec 01, onde a explicação vinha entre parênteses e podia ser confundida com o conteúdo da mensagem.

### 3.6 Pontos de rota (forçar o traçado)

O OSRM devolve o traçado que **ele** julga ótimo entre as paradas; muitas vezes **não** é o que o ônibus efetivamente percorre (via preferida, sentido de mão, desvio operacional). O usuário precisa poder **forçar** a rota por determinada via, sem que isso crie parada ou Seção.

**Definição — "ponto de rota":** vértice colocado pelo usuário (arrastando um ponto que surge ao clicar sobre a rota calculada — interação de mapa detalhada na Spec 04) para **forçar o traçado** por determinada via. Ancorado logicamente **entre duas paradas consecutivas** (o trecho que ele molda). **Não** é Seção, **não** é Local, **não** é Parada; serve **exclusivamente** para condicionar a rota.

**Regras de negócio (fechadas):**

1. **Persistido no JSON, com propósito único.** Pontos de rota **fazem parte do esquema** (Spec 02 §10.4, `rota.pontos_de_rota[]`) e são gravados junto da rota, para que a rota forçada possa ser **recalculada de forma idêntica** ao reeditar. **Só servem para forçar o traçado** — não têm tarifa, não entram em `matriz_distancias`/`matriz_seccionamento`, não geram parada nem horário, não participam da regra dos 350 m, não têm `uuid` de identidade (não são entidade comparável). Cada um guarda apenas a coordenada e a qual trecho pertence.
2. **Só influenciam o traçado.** Entram como **coordenadas intermediárias** na requisição OSRM (§3.2), na posição sequencial correta entre as paradas que delimitam seu trecho. Alteram `rota.geometria` e as distâncias/durações resultantes — e, por consequência, `rota.distancia_km`, `rota.trechos` e `matriz_distancias` (que somam trechos, §4). Isso é desejado: forçar o traçado **deve** mudar a distância roteada.
3. **Nunca viram trecho nem parada.** O invariante da Spec 02 §10.3 é inviolável: `rota.trechos.length == paradas.length - 1`, um trecho por par de **paradas** (nunca por ponto de rota). Um trecho pode conter vários pontos de rota; a distância/duração do trecho é a **soma** dos segmentos internos.
4. **Não alteram identidade nem horários por si.** Como o offset de parada é sugerido a partir de `duracao_s` dos trechos (§8.1), mover um ponto de rota que aumenta a duração de um trecho **muda a sugestão** de offset daquele trecho para frente — comportamento correto e esperado (é o mesmo dado-fonte).

**Como mapear legs→trechos com pontos de rota (dois caminhos):**

- **Preferencial — `waypoints` do OSRM:** passa-se o parâmetro `waypoints={índices das coordenadas que são paradas}`. O OSRM trata as demais coordenadas (os pontos de rota) como **pass-through silenciosos**: influenciam o traçado mas **não** quebram a rota em legs. Assim `legs.length` volta a ser `paradas.length - 1` e o mapeamento leg→trecho de §3.3 vale sem mudança.
- **Fallback — fusão de legs:** se a versão do OSRM público não honrar `waypoints` no serviço `route`, todas as coordenadas geram legs. Nesse caso, **funde-se** (soma de `distance` e `duration`) os legs entre duas paradas consecutivas em **um único trecho**, indexado pelas `ordem` dessas paradas. A geometria continua sendo a linha contínua completa (`overview=full`), independente de como os legs foram particionados.

Em ambos os caminhos o resultado final é idêntico ao contrato: geometria street-snapped forçada + exatamente `paradas.length - 1` trechos.

#### 3.6.1 Exemplo trabalhado — vários pontos, inclusive vários no mesmo trecho

Itinerário com 3 paradas — `A`(1), `B`(2), `C`(3). O trecho `A→B` precisa de **três** pontos de rota (`p1`, `p2`, `p3`) para o traçado serpentear pelas ruas corretas; o trecho `B→C` precisa de **um** (`p4`). Em `rota.pontos_de_rota` (Spec 02 §10.4):

```
p1, p2, p3  →  apos_parada_ordem = 1     (na ordem do array)
p4          →  apos_parada_ordem = 2
```

**1. Montagem da lista de coordenadas (percorre paradas em ordem; após a parada `k`, insere todos os pontos com `apos_parada_ordem == k`, na ordem do array):**

```
A, p1, p2, p3, B, p4, C          # 7 coordenadas enviadas ao OSRM
índices (0-based):  0  1  2  3  4  5  6
paradas nos índices:  A=0, B=4, C=6   →   waypoints=0;4;6
```

**2a. Caminho preferencial (`waypoints`):** com `waypoints=0;4;6`, o OSRM devolve **2 legs** (A→B e B→C), tratando `p1..p4` como pass-through. Mapeamento direto (§3.3):

```
leg[0] = A→B  (já embutindo p1,p2,p3)   →  trecho { origem 1, destino 2 }
leg[1] = B→C  (já embutindo p4)         →  trecho { origem 2, destino 3 }
```

**2b. Caminho fallback (fusão):** sem `waypoints`, o OSRM devolve **6 legs**; fundem-se os que estão entre duas paradas consecutivas:

```
legs:  A→p1, p1→p2, p2→p3, p3→B, | B→p4, p4→C
trecho 1→2 = distancia/duração de (A→p1)+(p1→p2)+(p2→p3)+(p3→B)
trecho 2→3 = distancia/duração de (B→p4)+(p4→C)
```

**3. Resultado (idêntico nos dois caminhos):** `rota.trechos` tem **2** elementos (não 6), preservando `trechos.length == paradas.length - 1` (Spec 02 §10.3). `rota.geometria` é a linha contínua completa (já desenhando toda a serpentina). `rota.distancia_km`/`duracao_s` = soma dos 2 trechos (§3.4). Os pontos de rota mudaram **o traçado e as distâncias**, nunca a **contagem** de trechos.

> Regra de ordenação, em resumo: a posição de cada ponto na travessia é `(apos_parada_ordem, índice no array)`. Isso resolve tanto pontos em trechos diferentes (por `apos_parada_ordem`) quanto vários pontos no mesmo trecho (pela ordem do array) — sem ambiguidade, mesmo que o array não esteja globalmente ordenado.

#### 3.6.2 Persistência e leitura

- **Congelados junto da rota.** `rota.pontos_de_rota[]` (Spec 02 §10.4) é gravado com o restante da `rota`. Como `rota.geometria`, `rota.trechos` e `rota.distancia_km` já refletem o traçado forçado e são congelados (Spec 02 §10.2), o documento é autoconsistente: quem só **lê** (Comparador, Ingestor, PDF) recebe a rota já forçada e **nunca recalcula** — os pontos de rota nem precisam ser reprocessados por esses leitores.
- **Reedição fiel.** O ganho de persistir é para o Formulário: ao reimportar e **recalcular** a rota (por alterar paradas ou arrastar um ponto), os pontos de rota anteriores estão no arquivo e são reaplicados, reproduzindo o traçado forçado sem retrabalho manual.
- **Leitores não os comparam como entidade.** Não têm `uuid`; o Comparador (Spec 05) trata mudança de traçado pelo efeito observável (`geometria`/`distancia_km`), não par-a-par de pontos de rota — política final é da Spec 05.

### 3.7 Descrição textual do itinerário (`descricao_itinerario`)

Produz o objeto `rota.descricao_itinerario` (Spec 02 §10.5) de **um** itinerário: uma descrição textual do caminho percorrido no sentido, que **intercala as Seções** (os marcos) com os **nomes das vias** (ruas, avenidas, rodovias) percorridas entre elas. Fica aqui, junto do roteamento, porque **depende da rota calculada**: os nomes de via vêm da mesma resposta do OSRM (§3.2, `steps=true`).

#### 3.7.1 Fontes

A descrição é derivada de **três** fontes, todas já disponíveis após o roteamento (§3):

1. A **sequência ordenada de paradas** do itinerário (`itinerario.paradas`, por `ordem`).
2. A **lista de Seções** presentes nessa sequência (paradas com `secao_uuid`) — os únicos marcos da descrição.
3. Os **nomes das vias** retornados pelo roteador (`legs[].steps[].name` — §3.3), percorridas entre as paradas.

#### 3.7.2 Regra principal — intercalar Seções e vias

A descrição textual intercala, em ordem de travessia:

- a **Seção inicial**;
- os **nomes das vias** percorridas até a próxima Seção;
- a **próxima Seção**;
- os nomes das vias até a Seção seguinte;
- e assim por diante, até a **Seção final**.

Ex.: `Cidade A - Seção A, Rua 1, Avenida 2, Cidade B - Seção B, Rodovia 3, Cidade C - Seção C.`

#### 3.7.3 Considerar apenas Seções (Locais são ignorados)

A descrição usa **somente Seções** como marcos. Se o itinerário real for

```
Seção A → Local 1 → Local 2 → Seção B → Local 3 → Seção C
```

a descrição é montada como

```
Seção A, {vias entre A e B}, Seção B, {vias entre B e C}, Seção C
```

Os Locais 1, 2 e 3 **não** aparecem no texto nem em `itens` (Spec 02 §10.5). Locais segue Spec 02 §8.

#### 3.7.4 Extração dos nomes de via

- A chamada ao OSRM usa `steps=true` (§3.2) **exclusivamente** para obter `step.name`. A geometria continua vindo de `overview=full&geometries=geojson`; distância/duração continuam vindo dos **legs** (§3.3).
- A granularidade da descrição **não é por manobra**: percorre-se, em ordem, os `steps` de cada leg entre duas Seções e coleta-se a **sequência de `step.name`**, que depois é limpa (§3.7.5). Não se descreve "vire à direita", só a via percorrida.
- Com **pontos de rota** (§3.6), os steps refletem o traçado já forçado (as coordenadas intermediárias mudam as vias retornadas) — desejado. Os pontos de rota em si **não** geram item; só influenciam os nomes (Spec 02 §10.5).

#### 3.7.5 Limpeza e normalização dos nomes (decisões fechadas)

Sobre a sequência crua de `step.name` de um intervalo entre Seções:

1. **Remover vazios/nulos:** descarta nomes `null`, `""` ou só espaços.
2. **Remover repetições consecutivas** da mesma via: `Rua A, Rua A, Rua A` → `Rua A`. Comparação após normalização de espaços, ignorando diferença só de espaçamento.
3. **Preservar repetições não consecutivas:** `Rua A, Avenida B, Rua A` permanece — a rota pode legitimamente voltar à mesma via.
4. **Padronizar espaços:** colapsar espaços múltiplos e aparar as pontas; não alterar acentuação/caixa (o nome sai como o roteador entrega).
5. **Não inventar nomes** que não vieram do roteamento.
6. **Vias sem nome — decisão fechada: omitir.** Trecho retornado sem `name` (ou com `name` vazio) **não** gera item `via`; prefere-se omitir a poluir o PDF com marcador genérico. (A alternativa de usar `"via sem nome"` foi considerada e **descartada** nesta versão.) Consequência: um intervalo entre duas Seções pode não ter nenhuma via nomeada — as duas Seções ficam adjacentes na descrição (§3.7.8).

#### 3.7.6 Associação entre vias e Seções

Como `rota.trechos` é **por parada consecutiva** e pode conter Locais intermediários entre duas Seções (Spec 02 §8), a descrição concatena os nomes de via de **todos os trechos/legs entre duas Seções consecutivas**.

Para paradas

```
1. Seção A   2. Local X   3. Local Y   4. Seção B   5. Local Z   6. Seção C
```

- **Bloco A → B:** considerar os legs dos trechos 1→2, 2→3 e 3→4; coletar seus `step.name`; limpar (§3.7.5); inserir tudo **entre** o item `secao` A e o item `secao` B.
- **Bloco B → C:** considerar os legs dos trechos 4→5 e 5→6; idem, entre B e C.

**Algoritmo:**

```
DESCRICAO(itinerario):
  secoes_ordenadas = paradas do itinerário com secao_uuid, por ordem
  itens = []
  para i = 0 .. len(secoes_ordenadas)-1:
      S = secoes_ordenadas[i]
      itens += { tipo: "secao", secao_uuid: S.secao_uuid, rotulo: rotulo_UX(S) }   # "Cidade - Nome"
      se i < len(secoes_ordenadas)-1:
          T = secoes_ordenadas[i+1]
          vias = concat(step.name de todos os legs entre a ordem de S e a de T)   # inclui Locais no meio
          vias = LIMPA(vias)                                                       # §3.7.5
          para nome in vias:  itens += { tipo: "via", nome: nome }
  texto = juntar rótulos e nomes por ", " + "."     # string pronta para UX/PDF
  return { texto, itens }
```

- `rotulo_UX(S)` é o padrão `Cidade - Nome da Seção` (§2.3, Spec 04 §7.1), com `Cidade` = `municipio` derivado.
- A limpeza é feita **por intervalo entre Seções** (não global) — assim uma via que fecha o bloco A→B e reabre o B→C não é indevidamente deduplicada entre blocos; a deduplicação consecutiva de §3.7.5 vale dentro de cada bloco.

#### 3.7.7 Congelamento, recálculo e pontos de rota

- **Congelada no JSON** junto da rota (Spec 02 §10.2/§10.5): quem só **lê** (Comparador, Ingestor, PDF) usa `descricao_itinerario` como está, **sem** recalcular contra o OSRM.
- **Ao abrir um JSON existente**, o Formulário **exibe a descrição gravada** e **não** chama o OSRM só para recompô-la (mesma política de §3.6.2 para a rota).
- **Recalcula-se a descrição** exatamente quando se recalcula a rota — isto é, ao alterar itinerário, paradas, coordenadas ou pontos de rota. Em particular, **mover/adicionar/remover ponto de rota** recalcula `rota.geometria`, `rota.trechos`, `matriz_distancias` **e** `descricao_itinerario` (§3.6 regra 2), porque muda as vias percorridas.

#### 3.7.8 Casos de borda

- **Trecho sem nome de via em parte do caminho:** omite-se aquele nome (§3.7.5, regra 6); a descrição segue com os nomes existentes.
- **Nenhuma via nomeada entre duas Seções:** as duas Seções ficam adjacentes em `itens` (`…, Seção A, Seção B, …`) — válido pela Spec 02 §10.5 (o mínimo exigido são os dois marcos).
- **Via repetida muitas vezes:** repetições **consecutivas** colapsam a uma ocorrência; repetições **não consecutivas** permanecem (§3.7.5, regras 2–3).
- **Itinerário com Locais entre Seções:** Locais nunca entram; suas vias entram no bloco da Seção anterior→próxima (§3.7.6).
- **Itinerário com apenas duas Seções:** um único bloco; descrição = `Seção A, {vias}, Seção B` (dois marcos, mínimo da Spec 02 §10.5).
- **Serviço unidirecional:** existe descrição só no sentido presente; o sentido ausente não tem `rota`, logo não tem descrição.
- **Serviço bidirecional com Ida e Volta diferentes:** cada sentido tem sua própria descrição, baseada no seu traçado — podem divergir em vias e até na ordem dos marcos.
- **Erro de roteamento (sem `rota` válida):** não há rota calculada ⇒ **não há descrição válida**; a geração fica bloqueada pela mesma pré-condição de §3.5 (sem rota, nada depois dela é produzido).
- **OSRM sem `steps`/sem `name`:** a rota é válida, mas a descrição fica só com os marcos (Seções adjacentes) — degrada só a riqueza da descrição, sem invalidar o documento (§3.2, compatibilidade).

---

## 4. Cálculo de `matriz_distancias` a partir da rota

Produz o array `matriz_distancias` do Serviço (Spec 02 §8) — **intra-Serviço**, nunca lê outro Serviço.

### 4.1 Entrada e saída

- **Entrada:** os itinerários do Serviço já roteados (§3), com `paradas[]` e `rota.trechos[]`; o conjunto de Seções distintas que o Serviço atende.
- **Saída:** uma entrada `ParDistância` por **combinação não-ordenada** de duas Seções distintas atendidas — `{secao_a_uuid, secao_b_uuid, distancia_trecho_ida?, distancia_trecho_volta?, valor_adotado_de_distancia}`.

### 4.2 Distância entre duas Seções num sentido

Para um par `{A, B}` e um itinerário `I` (de sentido ida ou volta):

1. Ache `posA` = `ordem` da parada de `I` que referencia `A`, e `posB` idem para `B`.
   - Ambas existem sempre que `I` existe: pela Spec 02 §2, quando os dois sentidos existem eles referenciam o **mesmo conjunto de Seções**; num Serviço unidirecional, todo par vem do único itinerário.
2. Seja `[lo, hi] = [min(posA,posB), max(posA,posB)]`.
3. **Some `distancia_km` de todos os trechos consecutivos entre `lo` e `hi`:**

   ```
   dist(I, A, B) = Σ  trecho.distancia_km   para trecho com parada_origem_ordem em [lo, hi-1]
   ```

   Isso inclui automaticamente os **Locais comuns intermediários** entre `A` e `B` (Spec 02 §8: entre A e B podem existir paradas `a`,`b`,`c`; somam-se A–a, a–b, b–c, c–B). A soma independe de `A` estar antes ou depois de `B` no sentido, porque distância roteada de trecho é sempre positiva e o intervalo é tomado por `min/max`.

4. Arredonde a soma a 2 casas (§3.4). Como as parcelas já têm 2 casas, isto só normaliza.

### 4.3 Montagem de cada `ParDistância`

- `distancia_trecho_ida = dist(itinerário_ida, A, B)` **se e somente se** o Serviço tem itinerário de Ida.
- `distancia_trecho_volta = dist(itinerário_volta, A, B)` **se e somente se** o Serviço tem itinerário de Volta.
- `valor_adotado_de_distancia`: §5.
- Consequência (Spec 02 §8): Serviço bidirecional ⇒ ambos presentes em toda entrada; unidirecional ⇒ exatamente um.

### 4.4 Casos de borda

- **Serviço com < 2 Seções:** `matriz_distancias` vazia é impossível como JSON válido (Spec 02 §14 exige ≥ 2 Seções); o Formulário bloqueia a geração antes.
- **Par de Seções adjacentes** (sem Local entre elas): a soma tem um único trecho.
- **Seção repetida no itinerário** (a mesma Seção aparecendo em duas paradas): fora do escopo — o esquema trata cada Seção como um ponto único do Serviço; se surgir necessidade de "passar duas vezes", é modelagem para outra spec.

---

## 5. Composição de `valor_adotado_de_distancia`

**Decisão fechada: média aritmética simples entre Ida e Volta; valor único quando unidirecional.**

**Entrada:** `distancia_trecho_ida?`, `distancia_trecho_volta?` de um `ParDistância`.
**Saída:** `valor_adotado_de_distancia` (km, 2 casas).

```
se ambos presentes:      valor = arredonda((distancia_trecho_ida + distancia_trecho_volta) / 2, 2)
se só ida presente:      valor = distancia_trecho_ida
se só volta presente:    valor = distancia_trecho_volta
```

Justificativa: Ida e Volta percorrem vias que podem diferir levemente (mãos, contornos), gerando distâncias roteadas próximas mas não idênticas (ex.: 6,00 e 6,10 → 6,05, como no exemplo da Spec 02 §15). A média simples é o critério mais defensável e previsível para "a distância do par" adotada pelo Serviço; não se pondera por sentido (não há razão operacional para privilegiar um) nem se toma o máximo/mínimo (introduziria viés sistemático). Arredondamento **half-up** a 2 casas.

**Casos de borda:**

- Média de dois valores de 2 casas pode gerar 3ª casa (`.005`) — o arredondamento a 2 casas resolve deterministicamente (half-up).
- `valor_adotado_de_distancia` é **sempre** só a partir dos dados **deste** Serviço (Spec 02 §8) — a comparação entre Serviços só ocorre em §6.

---

## 6. Sugestões de distância para `matriz_seccionamento`

Preenchem a sugestão de `matriz_seccionamento.distancia_km` (Spec 02 §9). São **sugestões de UI**: o JSON guarda o valor confirmado/editado pelo usuário, não a sugestão. Ambas atuam **por par habilitado** e são pensadas como **ações em lote** disparadas por botão (aplicam o modo a todos os pares habilitados do Serviço de uma vez); o usuário pode editar qualquer valor depois. Quais botões, escopo e apresentação são Spec 04 — aqui ficam os **dois algoritmos**.

### 6.1 Os dois modos (fechados)

| Modo (botão)                        | O que sugere                                                                                                     | Fonte                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **"Sugerir menor distância"**       | O **menor** `valor_adotado_de_distancia` do par entre **todos** os Serviços do Autos que atendem ambas as Seções | Multi-Serviço (§6.2)         |
| **"Sugerir distâncias do serviço"** | O `valor_adotado_de_distancia` do par **deste mesmo Serviço**, sem olhar os outros                               | Só o Serviço corrente (§6.3) |

Os dois preenchem o **mesmo** campo (`distancia_km`) e não coexistem por par — o último botão acionado (ou a edição manual) é o que vale. Ambos leem valores já em km (Spec 02 §8) — **sem conversão de unidade**.

### 6.2 Modo "menor distância" (entre Serviços)

**Entrada:** o par de Seções `{A, B}` habilitado no Serviço corrente `S`; todos os Serviços do Autos.
**Saída:** distância sugerida (km) para `distancia_km`.

```
candidatos = [ md.valor_adotado_de_distancia
               para cada Serviço T do Autos
               para cada ParDistância md de T.matriz_distancias
               onde {md.secao_a_uuid, md.secao_b_uuid} == {A, B} ]
sugestao = min(candidatos)
```

- Varre `matriz_distancias` de **todos** os Serviços do Autos que atendem **ambas** as Seções `A` e `B` (não só `S`) e toma o **menor** `valor_adotado_de_distancia`.
- O Serviço corrente `S` sempre atende `A` e `B` (senão o par não estaria disponível para habilitar), então `candidatos` nunca é vazio: no pior caso contém o próprio valor de `S`.

**Por que o menor:** a `matriz_seccionamento` autoriza venda de passagem parcial entre `A` e `B`; a distância de referência deve refletir o trajeto mais curto disponível entre eles no Autos, para não superestimar a tarifa parcial. Serviços distintos (semidireta, parcial) podem ter distâncias diferentes para o mesmo par; adota-se a menor como piso de referência sugerido.

### 6.3 Modo "distâncias do serviço" (só o Serviço corrente)

**Entrada:** o par `{A, B}` habilitado no Serviço corrente `S`.
**Saída:** distância sugerida (km) para `distancia_km`.

```
md = ParDistância de S.matriz_distancias onde {md.secao_a_uuid, md.secao_b_uuid} == {A, B}
sugestao = md.valor_adotado_de_distancia
```

- Usa **exclusivamente** o `valor_adotado_de_distancia` do **próprio** Serviço `S` para aquele par — **não** compara com outros Serviços, **não** toma o menor.
- Resultado: a distância de tarifa do par fica **exatamente igual** à distância que o próprio Serviço percorre entre as duas Seções (a média Ida/Volta de §5, ou o valor único se unidirecional).

**Por que existe:** quando o técnico quer que o seccionamento reflita fielmente **este** Serviço (ex.: uma semidireta cujo percurso real entre `A` e `B` é o que deve tarifar), e não o mínimo do Autos. É a escolha certa quando o menor de outro Serviço subtarifaria indevidamente o percurso efetivo deste.

### 6.4 Casos de borda (ambos os modos)

- **Empate no "menor distância"** (dois Serviços com o mesmo `valor_adotado`): o valor é idêntico, então a sugestão é esse valor — sem ambiguidade.
- **Par atendido só por `S`:** os dois modos coincidem — ambos devolvem o `valor_adotado` de `S`.
- **Usuário edita a sugestão:** permitido e esperado; o JSON persiste o valor final (Spec 02 §9). A sugestão não é armazenada como tal.
- **`{A, B}` sem entrada em `matriz_distancias` de `S`:** não pode ocorrer para um par habilitável — a `matriz_seccionamento` de `S` só admite pares presentes na `matriz_distancias` de `S` (Spec 02 §9). Se ocorresse, é erro de forma, não sugestão.
- **Recalcular ao mudar outro Serviço:** a sugestão do modo "menor distância" é derivada na hora; se o usuário alterar `matriz_distancias` de outro Serviço depois, ela só muda se o botão for reaplicado — o campo persistido continua sendo o confirmado. Comportamento de tela (Spec 04), não do contrato.

---

## 7. Algoritmo do centroide e regra dos 350 m

Detalha o clustering da Spec 02 §5.2 (Seção) e a checagem pareada da §7.1 (Local). Limiar fixo: **350 metros**, medidos pela Haversine (§2.1), centroide por média simples (§2.2).

### 7.1 Onde a regra se aplica

- **Seção** (`autos.secoes[]`): clustering cumulativo sobre **todos** os pontos contribuídos — `geolocalizacao_ida` e `geolocalizacao_volta` de **todas** as entradas `secao.servicos[]`, de **todos** os Serviços que usam a Seção. Critério puramente espacial, independente de sentido e de Serviço (Spec 02 §5.2).
- **Local** (`servico.locais[]`): checagem **pareada** entre `geolocalizacao_ida` e `geolocalizacao_volta` do **mesmo** Local — sem clustering multi-serviço (Spec 02 §7.1).

### 7.2 Validação incremental de inserção — Seção (Formulário)

Preserva o invariante: _todo ponto aceito numa Seção está a ≤ 350 m do centroide **final** do conjunto_ — não apenas do centroide vigente quando foi inserido.

**Entrada:** conjunto `S` de pontos já aceitos na Seção; ponto candidato `P`.
**Saída:** aceitar ou recusar `P`.

```
INSERIR(S, P):
  se S == ∅:                      # primeiro ponto, sem centroide ainda
      aceita P;  return ACEITO
  C' = centroide(S ∪ {P})         # centroide QUE RESULTARIA da inserção
  se existe Q em (S ∪ {P}) com haversine(Q, C') > 350:
      return RECUSADO             # algum ponto (aceito ou o próprio P) ficaria fora
  aceita P;  return ACEITO
```

Ponto central (e diferença face a uma checagem ingênua): **não basta** testar `haversine(P, centroide(S)) ≤ 350`. Recalcula-se o centroide **incluindo** `P` e verifica-se **todos** os pontos do conjunto resultante — porque inserir `P` desloca o centroide e pode empurrar um ponto **já aceito** para fora dos 350 m. Se isso ocorre, `P` é recusado (mesmo que isoladamente estivesse a ≤ 350 m do centroide anterior). Recusado ⇒ o usuário deve criar uma **Seção distinta** (novo `uuid`, `nome` diferente).

**Casos de borda:**

- **1º ponto:** aceito sem checagem (não há centroide).
- **2º ponto:** `C'` é o ponto médio; a condição vira "os dois pontos a ≤ 350 m do ponto médio", i.e. distância entre eles ≤ 700 m.
- **Remoção de ponto:** ao remover um ponto de uma Seção, o invariante só relaxa; não requer revalidação dos demais (o centroide de um subconjunto não viola o limiar se o do conjunto maior não violava — na prática o Formulário pode revalidar por robustez, é decisão de UI).
- **Ordem de inserção importa:** duas ordens diferentes dos mesmos pontos podem levar uma a aceitar e outra a recusar. Isso é intrínseco e aceito (Spec 02 §5.2 "depende da ordem de inserção"); o invariante garantido é sempre válido para a ordem efetivamente ocorrida.

### 7.3 Checagem fraca — JSON de origem desconhecida (Comparador/Ingestor)

Comparador e Ingestor **não têm** o histórico de inserção; não reconstroem a sequência de §7.2. Aplicam uma checagem **necessária mas não equivalente**, suficiente para flagrar violação grosseira:

```
VALIDA_ESTATICO(Seção):
  P = todos os pontos finais da Seção (ida/volta de todas as entradas servicos[])
  se |P| <= 1:  return OK
  C = centroide(P)
  se todo ponto p em P tem haversine(p, C) <= 350:  return OK
  senão:  return VIOLAÇÃO
```

- É **necessária** (um documento válido pela §7.2 sempre passa aqui? — ver nota) mas **não estritamente equivalente**: não reconstrói a ordem, então há configurações que a incremental teria recusado e esta aceita. Basta para "este JSON está claramente inválido".
- **Nota de rigor:** a incremental garante o invariante face ao centroide **final**; a checagem estática mede exatamente contra esse centroide final. Logo um documento produzido pela §7.2 **passa** na §7.3. A não-equivalência é na outra direção: a §7.3 pode aceitar um conjunto que nenhuma ordem de inserção incremental produziria. Isso é aceitável para o papel de leitor estático (sinalizar, não reproduzir a validação plena).
- Ação em `VIOLAÇÃO`: sinalizar (aviso ao usuário do Comparador; recusa/alerta na ingestão) — política de cada ferramenta (Spec 05/06), não desta spec.

### 7.4 Validação pareada — Local

**Entrada:** um Local com `geolocalizacao_ida?` e `geolocalizacao_volta?`.
**Saída:** válido / inválido.

```
se ambas presentes:
    valido = haversine(geolocalizacao_ida, geolocalizacao_volta) <= 350
senão:
    valido = true          # ao menos uma presente já é exigido pela Spec 02 §7.1
```

Sem centroide, sem clustering (um único Serviço, dois pontos). Acima de 350 m ⇒ **dois Locais distintos**, com `nome` diferente (Spec 02 §7.1). Vale tanto na inserção (Formulário) quanto na checagem estática (Comparador/Ingestor) — aqui incremental e estática **coincidem**, por ser pareada.

---

## 8. Horários de passagem — Sugestão inicial e Redistribuição na edição

Produz e mantém `viagem.horarios_paradas[].offset_horario` (Spec 02 §11.1). Tem três partes: a **sugestão inicial** ao criar a Viagem (§8.1); a **redistribuição proporcional** quando o usuário edita manualmente o horário de uma parada a jusante (§8.2); e o **reset à sugestão inicial** que desfaz as edições manuais (§8.3). Em todos os casos o JSON guarda sempre o valor final; a base de cálculo é o `duracao_s` dos trechos (`rota.trechos`, §3).

### 8.1 Sugestão inicial (ao criar a Viagem)

Ao criar uma Viagem e definir seu `horario_saida`, todos os offsets são pré-preenchidos por **acúmulo das durações de trecho** — o usuário parte de horários coerentes com a rota e ajusta o que quiser.

**Entrada:** `rota.trechos[]` do itinerário (com `duracao_s` por trecho, em ordem).
**Saída:** um `offset_horario` (`HH:MM:SS`) por Parada.

```
acc = 0
offset(parada 1) = "00:00:00"                 # primeira parada, sempre zero (Spec 02 §11.1)
para k = 2 .. paradas.length:
    acc += trecho[k-1].duracao_s              # trecho entre parada k-1 e k
    offset(parada k) = formata_hms(acc)
```

`formata_hms(s)` → `HH:MM:SS` (zero-padded). No domínio, itinerários intermunicipais cabem em < 24 h; o formato não impõe teto de 2 dígitos na hora se necessário.

- **Não decrescente e primeiro = 0** já saem garantidos (durações de trecho ≥ 0, acumulado monotônico), satisfazendo as validações da Spec 02 §11.1.
- **Cada Viagem começa com a mesma sugestão** do itinerário e é editada independentemente — o offset é por Viagem justamente porque o trânsito difere entre horários (Spec 02 §11.1).

### 8.2 Redistribuição proporcional (ao editar um horário a jusante)

Quando o usuário fixa manualmente o offset de uma parada `j` (ex.: "esta viagem chega em B às 08:50, não às 09:00"), as paradas **intermediárias** entre a última parada fixada antes de `j` e a própria `j` têm seus offsets **reinterpolados proporcionalmente**, para preservar o espaçamento relativo sugerido pela rota, ajustado à nova janela.

**Conceito de âncora:** a primeira parada (offset `00:00:00`) é sempre âncora; toda parada cujo offset o usuário **editou manualmente** vira âncora. As demais são **derivadas**.

**Algoritmo — reinterpolar entre duas âncoras consecutivas `i` e `j`** (paradas intermediárias `i < k < j`):

```
B_k = offset acumulado de baseline da parada k         # Σ duracao_s dos trechos 1..k (§8.1)
para cada parada derivada k entre as âncoras i e j:
    se (B_j - B_i) > 0:
        offset(k) = offset(i) + (offset(j) - offset(i)) * (B_k - B_i) / (B_j - B_i)
    senão:                                              # baseline degenerado (durações nulas)
        offset(k) = distribui uniformemente entre offset(i) e offset(j)
```

Exemplo (o do enunciado): paradas `A`(1)→`a`(2)→`B`(3), baseline `A=0`, `a=30min`, `B=60min`, saída 08:00. O usuário fixa `B` em `50min` (08:50). Âncoras: `A`(0) e `B`(50min). Derivada `a`: `0 + (50−0)·(30−0)/(60−0) = 25min` → passa a exibir **08:25**. O espaçamento relativo (a estava a meio caminho) é preservado, comprimido para a nova janela.

**Tail após a última âncora** (paradas depois da última âncora, sem âncora adiante): mantêm as **durações de baseline** apeadas à última âncora — `offset(k) = offset(última âncora) + (B_k − B_última_âncora)`. Assim, mover uma parada para mais cedo/mais tarde arrasta as seguintes pelo mesmo baseline, sem espremê-las.

**Casos de borda e regras:**

- **Monotonicidade (Spec 02 §11.1):** os offsets têm de ficar não decrescentes. A UI **não** permite fixar uma âncora com offset menor que a âncora anterior nem maior que a próxima âncora já fixada (senão a interpolação produziria valores fora de ordem). Política de bloqueio é Spec 04; a **regra** é esta.
- **Trecho com `duracao_s = 0`:** admitido; a parada derivada coincide com a vizinha (igualdade é permitida).
- **Por Viagem:** tudo isto é por Viagem — editar uma Viagem não mexe nas outras (Spec 02 §11.1).
- **Fronteira Spec 04:** _quando_ recalcular (a cada edição, ao soltar o campo) e _como_ apresentar é UI; a **fórmula de interpolação** é esta spec.

### 8.3 Restaurar a sugestão inicial (desfazer edições manuais)

Operação inversa de §8.2: **descarta todas as âncoras manuais** de uma Viagem e recalcula os offsets do zero pela sugestão inicial (§8.1), preservando apenas o `horario_saida` (o dado que o usuário informou ao criar a Viagem, e que não é um offset).

**Entrada:** uma Viagem (com seu `horario_saida`); a `rota.trechos` do itinerário.
**Saída:** os `offset_horario` da Viagem, todos re-derivados por §8.1.

```
RESTAURAR(viagem):
    # remove qualquer âncora manual: a única âncora que resta é a primeira parada (00:00:00)
    recalcula todos os offset_horario da viagem exatamente por §8.1 (acúmulo de duracao_s)
    horario_saida permanece intacto
```

- **Só os offsets voltam ao baseline.** `horario_saida`, `dia_semana`, `viagem_feriado` e a identidade (`uuid`) da Viagem **não** são tocados — o reset é apenas dos horários de passagem intermediários/finais.
- **Idempotente e determinística:** o resultado depende só de `rota.trechos` + `horario_saida`; aplicar duas vezes dá o mesmo resultado.
- **Escopo é UX (Spec 04):** o botão pode agir **por Viagem** (reseta uma) ou **em lote** (todas as Viagens de um itinerário/Serviço). Em qualquer escopo, o algoritmo por Viagem é o mesmo (rodar §8.1); a regra de negócio é "reset = re-aplicar a sugestão inicial, mantendo `horario_saida`". Quais botões e confirmação de descarte são Spec 04.
- **Relação com §8.2:** §8.2 preserva as âncoras manuais e só reinterpola entre elas; §8.3 **elimina** as âncoras manuais e volta tudo ao baseline. São operações distintas — a UI expõe as duas.

---

## 9. Grades de operação (feriado e tabelas excepcionais) e Contagens

_(Reescrito na v0.2 — a Spec 02 §11 v0.6 estratificou Viagem por dia: `dia_semana` único + `viagem_feriado` booleano, substituindo `dias_semana[]` + o enum `regra_feriado` que esta seção definia.)_ **Não existe redistribuição de horários em feriado** — a operação de feriado é uma grade própria, montada viagem a viagem. (O que antes era chamado de "redistribuição proporcional em feriado" era, na verdade, o recálculo de horários de passagem ao editar um horário a jusante — isso é a §8.2, não tem relação com feriado.) A partir da DEC-081, além das grades **comum** e de **feriado**, um itinerário pode ter Viagens em **tabelas excepcionais** nomeadas (Spec 02 §6.1) — grades alternativas de período (ex.: férias de verão), identificadas por `viagem.tabela_excepcional_uuid`.

### 9.1 Semântica (decisão fechada)

A operação de um itinerário é o conjunto das suas Viagens, cada uma valendo para **um único** `dia_semana`, em **uma** das grades a seguir (mutuamente exclusivas por Viagem):

| Grade da Viagem | Significado |
| --- | --- |
| **Comum** (`viagem_feriado = false` e `tabela_excepcional_uuid = null`) | Opera normalmente quando `dia_semana` cai (grade de dias comuns). |
| **Feriado** (`viagem_feriado = true`) | Opera **apenas** quando um feriado cai no `dia_semana`. Num feriado, a grade de feriados **substitui integralmente** a operação daquele dia (inclusive a excepcional): as viagens comuns e as excepcionais do dia não operam; operam as de feriado. |
| **Excepcional** (`tabela_excepcional_uuid ≠ null`, `viagem_feriado = false`) | Opera no período (textual) daquela tabela excepcional, **exceto** quando cai feriado — aí prevalece a grade de feriado. Uma tabela excepcional **não** tem sub-grade de feriado própria. |

- As grades são independentes: um dia de feriado pode ter mais, menos ou nenhuma viagem em relação ao dia comum correspondente. "Operação de feriado igual à comum" é obtida copiando a grade (ação de UX — Spec 04 §8.4 —, que cria Viagens novas, com UUIDs novas).
- **Precedência:** **feriado > excepcional > comum**. As tabelas excepcionais são independentes entre si; não há verificação de sobreposição (Spec 02 §6.1) — a vigência é interpretação humana.
- O **calendário de feriados** (quais datas) permanece **externo** ao ROTA e ao JSON (Spec 01 §3). O documento diz o que acontece num feriado que caia em cada dia da semana, não **quando** ele cai.
- **Uso: informativo/operacional de exibição.** A grade de feriados serve às tabelas da UX e do PDF (Spec 04 §8.4, §13); ela **não** gera partidas contáveis (§9.2).

### 9.2 Feriado e operação excepcional não alteram contagens

Regra crucial para as estatísticas derivadas (§9.4) e para o Comparador (Spec 05):

- Todas as contagens — nº de viagens semanais e de opções de deslocamento — usam a **semana padrão**, que **por definição não tem feriado nem operação excepcional**: consideram **exclusivamente** as Viagens da grade **comum** — `viagem_feriado = false` **e** `tabela_excepcional_uuid = null` (e o seccionamento). Viagens de feriado **e Viagens excepcionais nunca** entram nessas contagens.
- **Por quê:** o ROTA não tem registro de quais datas são feriado (calendário externo, §9.1), então não há como — nem faria sentido — somar ocorrências de feriado a uma frequência semanal.
- Dois JSONs que difiram **apenas** na grade de feriados têm exatamente as mesmas contagens; a diferença aparece na tabela de feriados (tratada pelo Comparador como mudança de operação de feriado, não de frequência semanal).
- **Requisito de exibição (Spec 04 §10/§13):** as contagens devem ser sempre rotuladas como "semana padrão (sem feriados)".

### 9.3 Casos de borda

- **Grade de feriados vazia** (nenhuma Viagem com `viagem_feriado = true`): válido — significa que em feriados o serviço não opera. A Spec 04 §11 trata como alerta (não bloqueante), pois pode ser intencional.
- **Viagem de feriado sem viagem comum correspondente:** válido — um horário pode existir só em feriados.
- **Mistura de horários:** cada Viagem é independente; não há vínculo estrutural entre a viagem comum das 08:00 de segunda e a viagem de feriado das 08:00 de segunda (são entidades distintas, UUIDs distintas).

### 9.4 Contagem de viagens e opções de deslocamento (fórmulas)

Define o cálculo das estatísticas derivadas exibidas na revisão e no PDF (Spec 04 §10). Tudo sobre a **semana padrão** (§9.2): somente Viagens da grade comum (`viagem_feriado = false` **e** `tabela_excepcional_uuid = null`).

**Viagens semanais, por Serviço e sentido:**

```
viagens_semana(servico, sentido) =
    | { v ∈ itinerario(sentido).viagens : v.viagem_feriado == false ∧ v.tabela_excepcional_uuid == null } |
```

Cada Viagem é uma partida num único dia (Spec 02 §11), então a contagem é o próprio número de objetos — sem multiplicação por dias. Total do Serviço = Ida + Volta; total do Autos = Σ dos Serviços.

**Pares O-D compráveis, por Serviço:**

```
pares_compraveis(servico) = pares habilitados em matriz_seccionamento
                            ∪ { par ponta-a-ponta }        # primeira e última Seção do itinerário
```

O par ponta-a-ponta (a viagem completa) é **sempre comprável**, esteja ou não habilitado na `matriz_seccionamento` — a união evita contá-lo duas vezes quando habilitado. Como Ida e Volta referenciam o mesmo conjunto de Seções (Spec 02 §2), o conjunto de pares é único por Serviço.

**Opções de deslocamento, por Serviço e sentido** (Spec 01 §4: par origem-destino comprável × viagem):

```
opcoes(servico, sentido) = viagens_semana(servico, sentido) × | pares_compraveis(servico) |
```

Cada viagem oferece cada par comprável como uma opção de deslocamento direcionada (da Seção que vem antes para a que vem depois na travessia daquele sentido). Total do Serviço = Ida + Volta; total do Autos = Σ dos Serviços.

**Estratificação por faixa de horário** (exibição — faixas definidas na Spec 04 §10): as mesmas fórmulas, restringindo as viagens àquelas cujo `horario_saida` cai na faixa.

---

## 10. Regras de Tipificação — `tipo` × `caracteristica_veiculo`

Materializa a validação que a Spec 01 §7 declarou "detalhada na Spec 03" e que a Spec 02 §6 chamou de "regra de negócio da Spec 03". São validações do Formulário (e checáveis por Comparador/Ingestor).

### 10.1 Duas famílias de veículo

Cada `caracteristica_veiculo` pertence a **uma de duas famílias**, e o `tipo` do Autos escolhe a família — as duas **nunca** se misturam num mesmo Autos:

- **Família semiurbana** — `SU` (Semiurbano) e `SUL` (Semiurbano Litorâneo). Veículo **único** por Autos.
- **Família rodoviária** — `CR` (Convencional Rodoviário), `CL` (Convencional Rodoviário Litorâneo), `EX` (Executivo), `LE` (Leito) e os **mistos rodoviários**: `ME` (Convencional + Executivo), `MEL` (Convencional Litorâneo + Executivo), `ML` (Convencional + Leito), `MLL` (Convencional Litorâneo + Leito), `MX` (Executivo + Leito — mesmo código nos dois tipos rodoviários, pois não existem executivo nem leito litorâneos), `MM` (Convencional + Executivo + Leito) e `MML` (Convencional Litorâneo + Executivo + Leito). Aceita **variação** entre Serviços. **Não existe** característica "Semileito" (`SL`).

### 10.2 Tabela de características permitidas por tipo

| `tipo` do Autos          | Família    | Característica(s) permitida(s)              | Variação entre Serviços                                                                                                           |
| ------------------------ | ---------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Semiurbano**           | semiurbana | **`SU`** (veículo único)                    | **Não** — todos os Serviços do Autos têm `caracteristica_veiculo == "SU"`. Serviços distintos variam só por itinerário/`carater`. |
| **Semiurbano Litorâneo** | semiurbana | **`SUL`** (veículo único)                   | **Não** — todos `== "SUL"`.                                                                                                       |
| **Rodoviário**           | rodoviária | `CR`, `EX`, `LE`, `ME`, `ML`, `MX`, `MM`    | **Sim** — Serviços podem ter características diferentes. Proibidos: `CL`, `MEL`, `MLL`, `MML`, `SU`, `SUL`.                       |
| **Rodoviário Litorâneo** | rodoviária | `CL`, `EX`, `LE`, `MEL`, `MLL`, `MX`, `MML` | **Sim** — variação permitida; a forma convencional é `CL`, nunca `CR`. Proibidos: `CR`, `ME`, `ML`, `MM`, `SU`, `SUL`.            |

> **Sobre os mistos rodoviários (partição fechada):** são combinações de tipos de veículo da família rodoviária (convencional/executivo/leito). A restrição litoral recai sobre o **componente convencional** de cada misto, expressa em **códigos distintos**: `ME`, `ML` e `MM` (componente `CR`) são exclusivos de **Rodoviário**; `MEL`, `MLL` e `MML` (componente `CL`) são exclusivos de **Rodoviário Litorâneo**. `MX` (executivo + leito, sem componente convencional) vale nos **dois** tipos, assim como `EX` e `LE` — executivo e leito **não têm forma litorânea**. A tabela acima é a partição código-a-código completa — não há mapeamento em aberto.

### 10.3 Regras (decisões fechadas)

1. **Famílias não se misturam.** O `tipo` do Autos fixa a família (Semiurbano/Semiurbano Litorâneo → **semiurbana**; Rodoviário/Rodoviário Litorâneo → **rodoviária**). `SU`/`SUL` **só** em Autos semiurbano; `CR`/`CL`/`EX`/`LE`/mistos **só** em Autos rodoviário. Nunca há código de uma família num Autos da outra.
2. **Veículo único no semiurbano.** Em `Semiurbano` e `Semiurbano Litorâneo`, **todos** os Serviços do Autos compartilham a **mesma** `caracteristica_veiculo` (`SU` e `SUL`, respectivamente). Múltiplos Serviços existem apenas por variação de itinerário/`carater` (Spec 01 §7).
3. **Litoralidade e exclusividade do convencional.** A litoralidade do Autos fixa a forma convencional e essas formas **nunca coexistem**: Autos litorâneo usa a forma litorânea (`SUL` no semiurbano, `CL` no rodoviário) e **jamais** a não-litorânea (`SU`/`CR`); Autos não-litorâneo, o contrário. Logo `CR`/`CL` nunca coexistem, `SU`/`SUL` nunca coexistem, e os mistos com componente convencional seguem a mesma exclusividade em códigos distintos: `ME`×`MEL`, `ML`×`MLL` e `MM`×`MML` nunca coexistem num mesmo Autos. `EX`, `LE` e `MX` são **neutros à litoralidade** (mesmo código nos dois tipos rodoviários — executivo e leito não têm forma litorânea).
4. **Variação no rodoviário.** Em `Rodoviário` e `Rodoviário Litorâneo`, Serviços podem ter `caracteristica_veiculo` distintas entre si, dentro do conjunto permitido do tipo (§10.2).
5. **Coexistência de Serviços.** Dois Serviços podem coexistir no mesmo Autos sse: (a) cada um respeita a tabela §10.2 para o `tipo`; (b) no semiurbano, ambos têm a característica única do tipo; (c) `numero_n` de exibição não colide de forma enganosa (é só rótulo — Spec 02 §6 — mas o Formulário deve numerar sequencialmente por ordem de cadastro). A identidade real é o `uuid` (Spec 02 §12), nunca `numero_n`.

### 10.4 Casos de borda

- **Trocar o `tipo` do Autos** com Serviços já cadastrados que violem o novo tipo: o Formulário **reconverte** cada Serviço incompatível para a **forma convencional (padrão)** do novo tipo — `Rodoviário`→`CR`, `Rodoviário Litorâneo`→`CL`, `Semiurbano`→`SU`, `Semiurbano Litorâneo`→`SUL` — e **avisa** quais mudaram; **nunca bloqueia** (DEC-034). Ex.: de Rodoviário para Semiurbano, todo Serviço vira `SU`; de Semiurbano para Rodoviário, o `SU` (inválido no rodoviário) vira `CR`; ao mudar a litoralidade, `CR`→`CL` e os mistos não-litorâneos `ME`/`ML`/`MM`→`CL` (reconversão sempre ao padrão, **não** remapeamento por código como `ME`→`MEL`). A reconversão é sempre possível — o padrão pertence ao tipo — por isso não há caso de bloqueio. A política de UI (o aviso) é Spec 04 §5; a **regra** de reconversão é esta §10.
- **`MX` (misto executivo + leito):** mesmo código nos dois tipos Rodoviários — não existem executivo nem leito litorâneos, logo não há variante litorânea a distinguir (§10.3, regra 3). Já os mistos completos têm códigos distintos por litoralidade: `MM` (Rodoviário) × `MML` (Rodoviário Litorâneo).

---

## 11. Tabela Oficial de Tarifa a partir de `distancia_km`

**Decisão fechada: a conversão distância → R$ é externa ao ROTA; o JSON nunca guarda R$** (Spec 01 §3, Spec 02 §16).

- A **tabela de tarifa** (faixas de `distancia_km` → valor em R$) é definida por **portaria publicada** pela ARTESP, fora do ROTA. Muda por ato administrativo, em cadência própria.
- O ROTA **referencia** essa tabela apenas no momento de **exibir/imprimir** (PDF operacional, Spec 04): dado um `distancia_km` (de `matriz_seccionamento` ou de `matriz_distancias`), busca-se a faixa correspondente na tabela vigente e mostra-se o valor. Esse valor é **efêmero de exibição** — não volta para o JSON.
- **Como o ROTA carrega a tabela:** como recurso estático servido junto do app (mesma natureza das listas de Autos/empresas/tipos — Spec 01 §8), versionado pela portaria que o originou. A forma exata desse recurso (arquivo, faixas, vigência) e a renderização no PDF são **Spec 04**; esta spec fixa apenas o contrato: **entra `distancia_km`, sai R$ para exibição, nada de R$ persiste no JSON**.
- **Fora de escopo aqui:** os valores concretos das faixas, a política de arredondamento monetário e a vigência das portarias — tudo externo.

---

## 12. Fronteira Spec 03 (regra/algoritmo) × Spec 04 (Formulário/UI)

Consolidação do que **permanece em aberto** para a Spec 04. Esta spec define a **função**; a Spec 04 define **quando** chamá-la, **como** apresentar e **como** o usuário interage.

| Tema                              | Spec 03 (aqui)                                                                                                                                                                   | Spec 04 (Formulário/UI)                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Roteamento (§3)                   | Forma da requisição OSRM, extração, conversão m→km, arredondamento, política de erro bloqueante                                                                                  | Momento de disparar o roteamento, indicador de carregamento, exibição da mensagem de erro, re-tentativa manual, desenho da rota no mapa                                         |
| Pontos de rota (§3.6)             | Que forçam o traçado, entram como coordenadas intermediárias, nunca viram trecho/parada, persistem em `rota.pontos_de_rota` (só para forçar), mapeamento legs→trechos            | Clique na rota para criar o ponto, arraste no mapa, recálculo ao soltar, feedback visual                                                                                        |
| Descrição do itinerário (§3.7)    | Deriva de paradas + Seções + `step.name` do OSRM; intercala só Seções e vias limpas; omite Locais e vias sem nome; congelada e recalculada com a rota                            | Painel "Descrição textual do itinerário" por Serviço/sentido, ações "Recalcular"/"Copiar"/"Ver itens", exibição no PDF e na revisão, bloqueio se ausente (Spec 04 §7.4/§11/§13) |
| `matriz_distancias` (§4)          | Algoritmo de soma de trechos por par de Seções                                                                                                                                   | Quando recalcular, exibição da matriz                                                                                                                                           |
| `valor_adotado` (§5)              | Fórmula (média/valor único) e arredondamento                                                                                                                                     | — (puro cálculo)                                                                                                                                                                |
| Sugestões de seccionamento (§6)   | Os dois algoritmos: "menor distância" (mín. entre Serviços) e "distâncias do serviço" (valor do próprio Serviço)                                                                 | Os dois botões, escopo em lote, apresentar sugestão, permitir edição, recálculo reativo                                                                                         |
| Regra dos 350 m (§7)              | Centroide, Haversine, validação incremental, checagem estática, pareada de Local                                                                                                 | Feedback ao inserir ponto no mapa, mensagem de recusa, proposta de criar nova Seção                                                                                             |
| Horários de passagem (§8)         | Sugestão inicial por acúmulo de `duracao_s`; fórmula de redistribuição proporcional entre âncoras ao editar horário a jusante; reset à sugestão inicial (mantém `horario_saida`) | Edição por Viagem, quando recalcular, botões de reset (por Viagem/em lote) e confirmação, bloqueio de offset fora de ordem, apresentação                                        |
| `viagem_feriado` e contagens (§9) | Semântica das duas grades (comum/feriado); feriado não altera contagens; fórmulas de viagens semanais, pares compráveis e opções de deslocamento                                 | Grade de dias comuns × grade de feriados, botão "copiar dias comuns", rótulo "semana padrão", faixas de horário; calendário de feriados externo                                 |
| Município (§2.3)                  | Fontes (`municipios_sp.geojson` + `pop_municipios.csv`), ponto-em-polígono, fallback de borda, qual ponto decide (centroide/ponto médio)                                         | Momento de derivar (criação/arrasto), campo somente-leitura, mensagem de bloqueio "fora de SP"                                                                                  |
| Tipificação (§10)                 | Tabela e regras `tipo` × característica                                                                                                                                          | Bloqueio/alerta ao cadastrar/trocar tipo, numeração de `numero_n`                                                                                                               |
| Tarifa (§11)                      | Contrato "distância→R$ externo, nada de R$ no JSON"                                                                                                                              | Carregar a tabela da portaria, renderizar valores no PDF                                                                                                                        |

Comparador (Spec 05) e Ingestor (Spec 06) usam desta spec apenas as **checagens estáticas** (§7.3, §7.4) e a **regra de contagem neutra a feriado** (§9.2) — nunca recalculam rota, matriz ou sugestão (leem o congelado, Spec 02 §8/§10.2).

---

## 13. Decisões Fechadas Nesta Spec

1. **Distância em linha reta = Haversine** (`R = 6.371.000 m`), usada **só** para as regras espaciais de 350 m — nunca para distância roteada (§2.1).
2. **Centroide = média aritmética simples** de lat/lon (não geodésico), justificado pela escala sub-quilométrica (§2.2).
3. **Roteamento OSRM:** perfil `driving`, `overview=full&geometries=geojson`, um `leg` por par de paradas → `rota.trechos`; conversão m→km na fronteira, arredondamento half-up a 2 casas, totais por soma dos trechos arredondados (§3).
4. **Indisponibilidade do OSRM é bloqueante** — sem fallback para linha reta; mensagens específicas por `code` (`NoRoute`/`NoSegment`/timeout), 1 retry só em falha de rede (§3.5). **A mensagem exibida não menciona tarifa** — "distância alimenta a tarifa" é o motivo de bloquear, não o texto (corrige leitura da Spec 01 §8).
5. **Pontos de rota** (§3.6): vértices que forçam o traçado, entram como coordenadas intermediárias no OSRM, **nunca** viram trecho/parada (invariante `trechos == paradas-1` preservado); **persistem** em `rota.pontos_de_rota` (Spec 02 §10.4) servindo **só** para reproduzir o traçado forçado — sem tarifa, sem `uuid`, sem participar de matriz/350 m.
6. **`matriz_distancias`:** soma de `rota.trechos[].distancia_km` entre as posições das duas Seções, por sentido, incluindo Locais intermediários; intra-Serviço (§4).
7. **`valor_adotado_de_distancia` = média simples Ida/Volta** (ou o único valor, se unidirecional), half-up a 2 casas (§5).
8. **Duas sugestões para `matriz_seccionamento.distancia_km`**, cada uma por botão (§6): **"menor distância"** = mín. `valor_adotado` entre todos os Serviços do Autos que atendem o par; **"distâncias do serviço"** = `valor_adotado` do próprio Serviço para o par. Ambas são sugestão de UI, não persistidas; o JSON guarda o valor confirmado.
9. **Regra dos 350 m:** validação **incremental** no Formulário (recalcula centroide candidato, recusa se qualquer ponto do conjunto resultante > 350 m — preserva o invariante do centroide final); checagem **estática fraca** (centroide de todos os pontos finais) para Comparador/Ingestor; **pareada** para Local (§7).
10. **Horários de passagem** (§8): sugestão inicial por acúmulo de `duracao_s` (primeira parada `00:00:00`); ao editar manualmente o horário de uma parada a jusante, as intermediárias são **reinterpoladas proporcionalmente** entre âncoras (a "redistribuição" real — nada a ver com feriado); e um **reset** que desfaz as edições manuais, voltando à sugestão inicial e mantendo só o `horario_saida` (§8.3, escopo por Viagem ou em lote na UI).
11. **Feriado = grade própria por dia da semana** (v0.2, substitui o enum `regra_feriado` da v0.1 — ver Spec 02 §13, item 21): Viagem de feriado (`viagem_feriado = true`) opera apenas quando um feriado cai no seu `dia_semana` e **substitui integralmente** a grade comum daquele dia; **não há** redistribuição de horários em feriado; feriado **não altera** contagem de viagens nem de opções de deslocamento — as contagens usam a semana padrão, sem feriado, e devem ser rotuladas como tal (§9).
12. **Tipificação:** duas famílias que nunca se misturam — **semiurbana** (`SU`/`SUL`, veículo único por Autos) e **rodoviária** (`CR`/`CL`/`EX`/`LE` + mistos `ME`/`MEL`/`ML`/`MLL`/`MX`/`MM`/`MML`, com variação; **sem** `SL`/Semileito, que não existe). O `tipo` do Autos fixa a família e a litoralidade fixa a forma convencional em códigos distintos (`SU`×`SUL`, `CR`×`CL`, `ME`×`MEL`, `ML`×`MLL`, `MM`×`MML` nunca coexistem; `EX`/`LE`/`MX` neutros à litoralidade) — partição código-a-código fechada em §10.2 (§10).
13. **Tarifa distância→R$ é externa (portaria)**; JSON nunca guarda R$; ROTA só referencia a tabela na exibição/PDF (§11).
14. **Município derivado por ponto-em-polígono** (v0.2, §2.3): `municipio` de Seção e Local vem da geolocalização — ray casting sobre `municipios_sp.geojson` (join `codarea` → `nome_municipio` em `pop_municipios.csv`); fallback ao polígono mais próximo até 2 km; acima disso, erro bloqueante ("fora de SP"). Seção decide pelo centroide dos pontos aceitos; Local, pelo ponto único ou ponto médio Ida/Volta. O valor persiste congelado no JSON.
15. **Fórmulas de contagem** (v0.2, §9.4): viagens semanais = nº de Viagens comuns do sentido (cada Viagem é uma partida num único dia — Spec 02 §11 v0.6); pares O-D compráveis = `matriz_seccionamento` ∪ par ponta-a-ponta; opções de deslocamento por sentido = viagens semanais × pares compráveis. Sempre na semana padrão, sem feriado; estratificação por faixa de horário é exibição (faixas na Spec 04 §10).
16. **Descrição textual do itinerário** (v0.3, §3.7): `rota.descricao_itinerario` (Spec 02 §10.5) intercala **só as Seções** (marcos) com os **nomes das vias** entre elas. Nomes vêm de `steps[].name` do OSRM (`steps=true` — a geometria e as distâncias continuam de `overview=full`/legs); a sequência crua é limpa (remove vazios, colapsa repetições consecutivas, preserva não consecutivas, padroniza espaços) e **vias sem nome são omitidas** (não se usa marcador genérico). Locais **nunca** entram; pontos de rota não viram item (só mudam as vias). É derivada, **congelada** com a rota e **recalculada** quando a rota é recalculada (inclusive por ponto de rota); leitores só leem. Abrir JSON exibe a descrição gravada sem chamar OSRM.

**Resolvido pela Spec 04** (era a fronteira da coluna direita de §12): momento de disparo, apresentação e interação de cada regra. Permanecem externos: tabela de tarifa (portaria) e calendário de feriados.

---

## 14. Próximos Documentos

- [x] **Spec 04 — Formulário**: UI, mapa, import/export do JSON, geração do PDF operacional; consome os algoritmos desta spec e resolve a coluna "Spec 04" de §12.
- [ ] **Spec 05 — Comparador**: diff entre dois JSONs, PDF comparativo; usa as checagens estáticas (§7.3/§7.4) e a regra de que feriado não altera contagens (§9.2), sem recalcular o congelado.
- [ ] **Spec 06 — Ingestor + Modelo PostgreSQL**: ingestão do JSON aprovado; reaproveita UUIDs como chave e aplica as mesmas checagens estáticas.
