# Spec 03 — Regras de Negócio e Cálculo

**Projeto:** ROTA — Registro de Operação e Tabelas de Autos
**Depende de:** [Spec 01 — Visão Geral do Sistema](01-visao-geral.md) e [Spec 02 — Esquema do JSON de Operação](02-esquema-json-operacao.md)
**Status:** Em definição — v0.1
**Escopo:** Os algoritmos e decisões de negócio que produzem e validam os valores do JSON de operação — cálculo de rota (OSRM) e pontos de rota que forçam o traçado, cálculo de `matriz_distancias`, composição de `valor_adotado_de_distancia`, sugestão de menor distância para `matriz_seccionamento`, algoritmo de centroide e da regra dos 350 m, sugestão e redistribuição dos horários de passagem (`offset_horario`), enum de `regra_feriado` (4 valores), regras de tipificação `tipo` × `caracteristica_veiculo`, e a referência (externa) à tabela de tarifa. **Não é escopo desta spec:** a forma do JSON (é a [Spec 02](02-esquema-json-operacao.md)); UI, mapa, import/export e PDF (Spec 04); diff (Spec 05); PostgreSQL (Spec 06). Onde um cálculo tem parte "de negócio" (aqui) e parte "de tela" (Spec 04), a fronteira está explícita em cada seção e consolidada em §12.

---

## 1. Papel deste Documento

A Spec 02 fechou **o que** cada campo é. Esta spec fecha **como** os campos calculados são produzidos e **quais regras** um documento precisa respeitar além da forma. Vários campos do esquema são explicitamente "computados e congelados" (`rota`, `rota.trechos`, `matriz_distancias`) ou "sugeridos e editáveis" (`matriz_seccionamento.distancia_km`, `viagem.horarios_paradas[].offset_horario`): esta spec define a função que os gera. Outros são enums cujos valores a Spec 02 empurrou para cá (`regra_feriado`) ou regras que a Spec 01 declarou "validações do formulário, detalhadas na Spec 03" (`tipo` × `caracteristica_veiculo`).

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

---

## 3. Roteamento — Chamada ao OSRM e montagem de `rota`

Produz o objeto `rota` (Spec 02 §10.2) e seu `trechos[]` (§10.3) de **um** itinerário, a partir da sequência ordenada de paradas.

> **Quando o OSRM é (e não é) chamado.** `router.project-osrm.org` é o servidor de **demonstração** do OSRM — sem SLA, com limites de uso e desencorajado para produção (Spec 01 §8). Para não depender dele na leitura, vale a regra: **abrir/reexibir um Autos nunca chama o OSRM** — o mapa desenha a `rota.geometria` já congelada no JSON (Spec 02 §10.2). O OSRM só é acionado quando o usuário **altera** o itinerário (inserir/mover Seção, Local ou ponto de rota), e apenas para recalcular o trecho afetado. Toda rota gerada grava sua procedência em `rota.fonte_calculo`, `rota.data_calculo` e `rota.perfil` (Spec 02 §10.2), o que também abre caminho para trocar o demo por instância auto-hospedada sem mudar este contrato. O algoritmo abaixo descreve o cálculo em si — que roda **só** nesses momentos de alteração.

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
      ?overview=full&geometries=geojson&steps=false&annotations=false&continue_straight=false
      [&waypoints={índices das paradas}]     # presente só quando há pontos de rota — ver §3.6
```

- Coordenadas em `lon,lat` (ordem do OSRM/GeoJSON), separadas por `;`, **na ordem das paradas** — e, havendo pontos de rota (§3.6), com estes **intercalados** na posição sequencial correta.
- `overview=full` + `geometries=geojson`: geometria completa street-snapped já em GeoJSON `[lon,lat]`, pronta para `rota.geometria`.
- `steps=false`, `annotations=false`: não precisamos de manobras nem de anotações por vértice — a granularidade que importa é a de **legs** (§3.3).

### 3.3 Extração — mapa OSRM → esquema

Da resposta usa-se `routes[0]`:

| Fonte OSRM (`routes[0]`)                        | Campo do esquema                                         | Conversão                                                                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `.geometry` (LineString `[lon,lat]`)            | `rota.geometria`                                         | cópia direta                                                                                                                                  |
| `.legs[i].distance` (metros)                    | `rota.trechos[i].distancia_km`                           | §3.4                                                                                                                                          |
| `.legs[i].duration` (segundos)                  | `rota.trechos[i].duracao_s`                              | arredonda ao inteiro                                                                                                                          |
| —                                               | `rota.distancia_km`, `rota.duracao_s`                    | soma dos trechos (§3.4)                                                                                                                       |
| contexto da requisição (não vem de `routes[0]`) | `rota.fonte_calculo`, `rota.data_calculo`, `rota.perfil` | motor/instância usado (`fonte_calculo`), data do cálculo (`data_calculo`, `YYYY-MM-DD`) e perfil (`perfil`, ex.: `"driving"`) — Spec 02 §10.2 |

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

> **Orientação ao Comparador — não comparar rota por igualdade de `geometria` (evitar falso positivo).** `rota.geometria` e `rota.distancia_km` são congelados a partir do OSRM **no momento da geração** (Spec 02 §10.2), com a procedência em `rota.fonte_calculo`/`rota.data_calculo` (Spec 02 §10.2). Dois JSONs gerados em datas distantes — ou por instâncias/versões diferentes do OSRM — podem ter geometria e distância **ligeiramente diferentes mesmo com as mesmas paradas** (o mapa público muda). Um Comparador (Spec 05) que exigisse igualdade **bit-a-bit** de `geometria` acusaria "rota mudou" quando nada mudou na entrada. Portanto a comparação de rota deve se basear em **sinais estáveis/semânticos**: (a) a **sequência de paradas** (Seções e Locais referenciados, na ordem); (b) `rota.pontos_de_rota` (os desvios que o usuário forçou); (c) as distâncias em `matriz_distancias`/`rota.distancia_km` comparadas com **tolerância** (ex.: variação relativa pequena, faixa fixada pela Spec 05), não igualdade exata. Só uma divergência **além da tolerância**, ou uma mudança na sequência de paradas/pontos de rota, conta como "rota alterada". A política numérica exata (limiar de tolerância) é da Spec 05; esta nota fixa a **orientação**.

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
- **Remoção de ponto (revalidação obrigatória).** Remover um ponto **desloca o centroide** do conjunto restante e **pode** empurrar um ponto que continuava para fora dos 350 m — não é verdade que "o centroide de um subconjunto nunca viola se o do conjunto maior não violava" (é falso como enunciado geral; há conjuntos que satisfazem o invariante e passam a violá-lo ao remover um ponto). Portanto, **ao remover** um ponto de uma Seção, revalida-se o conjunto resultante pela checagem estática de §7.3 (centroide de todos os pontos restantes; todos a ≤ 350 m). Se o conjunto restante violar, a UI sinaliza e o usuário deve corrigir (mover/remover outro ponto ou separar em Seção distinta) — política de UI na Spec 04; a **regra** é: revalida-se sempre.
- **Edição de coordenada = remover + reinserir.** Arrastar/editar a geolocalização de um ponto já existente (mover um pino no mapa) **claramente pode romper** o invariante. Trata-se a edição como **remover o ponto antigo e reinserir o novo**: primeiro retira-se o ponto do conjunto, depois aplica-se a **checagem plena de inserção** de §7.2 com a coordenada nova (recalcular o centroide resultante e verificar **todos** os pontos ≤ 350 m). Se a reinserção for recusada, a edição é rejeitada (ou o usuário separa em outra Seção). Não há caminho de edição que escape da revalidação.
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

`formata_hms(s)` → `HH:MM:SS` (zero-padded), com **`HH` em `00`–`23`** (dois dígitos). O domínio é intermunicipal e todo itinerário/offset cabe em **< 24 h**, então dois dígitos de hora bastam e nenhum offset atinge `24:00:00` — alinhado exatamente à tipagem `HH:MM:SS` de `offset_horario`/`horario_saida` da Spec 02 §11/§11.1 (validável por regex fixa). Se algum acúmulo teórico chegasse a ≥ 24 h, seria erro de modelagem (linha fora do domínio), não um formato a acomodar.

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

- **Só os offsets voltam ao baseline.** `horario_saida`, `dias_semana`, `regra_feriado` e a identidade (`uuid`) da Viagem **não** são tocados — o reset é apenas dos horários de passagem intermediários/finais.
- **Idempotente e determinística:** o resultado depende só de `rota.trechos` + `horario_saida`; aplicar duas vezes dá o mesmo resultado.
- **Escopo é UX (Spec 04):** o botão pode agir **por Viagem** (reseta uma) ou **em lote** (todas as Viagens de um itinerário/Serviço). Em qualquer escopo, o algoritmo por Viagem é o mesmo (rodar §8.1); a regra de negócio é "reset = re-aplicar a sugestão inicial, mantendo `horario_saida`". Quais botões e confirmação de descarte são Spec 04.
- **Relação com §8.2:** §8.2 preserva as âncoras manuais e só reinterpola entre elas; §8.3 **elimina** as âncoras manuais e volta tudo ao baseline. São operações distintas — a UI expõe as duas.

---

## 9. `regra_feriado` — Enum (4 valores)

Resolve a questão em aberto desde a Spec 01 §9.4 / Spec 02 §11. A operação de feriado é sempre "roda ou não roda" **naquele dia** — **não existe** grade nem redistribuição de horários específica de feriado; quando opera num feriado, a Viagem usa o **mesmo** `horario_saida` e os mesmos `offset_horario`. O que os quatro valores definem é **como o feriado interage com os `dias_semana`**: se é indiferente, se suprime, se adiciona, ou se é a única condição de operação.

### 9.1 Enum (decisão fechada)

Um Autos apresenta sua operação como a grade **semanal** (Viagens com `dias_semana`) **mais**, por Viagem, uma etiqueta de feriado. `regra_feriado` de cada Viagem assume um de **quatro** valores. Para um **dia real** `D` — que tem um dia-da-semana `dia_semana(D)` e pode ou não ser feriado —, a Viagem opera em `D` conforme:

| Valor                                | Opera no dia real `D` quando…                               | Efeito do feriado sobre a grade normal                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `"circula_inclusive_se_for_feriado"` | `dia_semana(D) ∈ dias_semana` — **seja `D` feriado ou não** | **Indiferente**: roda exatamente a grade normal; o feriado não suprime nem adiciona partidas.                                                   |
| `"nao_circula_em_feriado"`           | `dia_semana(D) ∈ dias_semana` **e** `D` **não** é feriado   | **Suprime**: num feriado que cairia num dia servido, a Viagem **não** roda.                                                                     |
| `"somente_em_feriado"`               | `dia_semana(D) ∈ dias_semana` **e** `D` **é** feriado       | **Condição única**: só opera quando o dia servido é feriado; num dia normal (não feriado) **não** roda, mesmo estando em `dias_semana`.         |
| `"circula_em_feriado"`               | `dia_semana(D) ∈ dias_semana` **ou** `D` **é** feriado      | **Adiciona**: roda a grade normal **e também** em qualquer feriado — inclusive num dia da semana que **não** está em `dias_semana` (é aditivo). |

- **`somente_em_feriado` é o único que altera a operação em dias normais**: os outros três operam a grade `dias_semana` inteira num dia sem feriado; ele só opera quando o dia servido é feriado.
- **`circula_em_feriado` é aditivo, não um modificador de `dias_semana`**: "se aquele dia for feriado, este horário também opera" — independentemente do dia da semana. Ex.: uma Viagem seg/ter com `regra_feriado: "circula_em_feriado"` **também opera se um feriado cair numa quinta**.
- Não há grade de horário específica de feriado nem redução/redistribuição de partidas: em qualquer valor a Viagem repete seu horário normal ou é suprimida naquele dia, conforme a tabela.
- **Uso: apenas informativo** para as tabelas, legendas e observações do PDF e da UX. A etiqueta **não** gera partidas contáveis (§9.2) — com a única ressalva de que `somente_em_feriado` faz a Viagem **não** aparecer na semana padrão (§9.2/§9.4), porque essa semana, por definição, não tem feriado.
- O **calendário de feriados** (quais datas) é **externo** ao ROTA e ao JSON (fora de escopo — Spec 01 §3). A etiqueta diz **o que acontece** num feriado, não **quando** ele cai.

### 9.2 Feriado não altera contagens (viagens, opções de deslocamento)

Regra de negócio crucial para estatísticas derivadas (nº de viagens, Opção de Deslocamento — Spec 01 §4) e para o Comparador (Spec 05):

- Todas as contagens — nº de viagens e de opções de deslocamento (algoritmo em §9.4) — usam a **semana padrão**, que **por definição não tem feriado**. A contribuição de cada Viagem a essa semana é: **`len(dias_semana)`** para os três valores que operam a grade num dia normal (`circula_inclusive_se_for_feriado`, `nao_circula_em_feriado`, `circula_em_feriado`), e **`0`** para `somente_em_feriado` — que, por só operar em feriado, **nunca** aparece numa semana sem feriado.
- **Por quê os três colapsam em `len(dias_semana)`:** como a semana padrão não tem feriado, o comportamento aditivo de `circula_em_feriado` não adiciona nada e o supressivo de `nao_circula_em_feriado` não suprime nada — os três operam exatamente os dias de `dias_semana`. O ROTA, além disso, **não tem** registro de quais datas são feriado (calendário externo, §9.1): não há como — nem faria sentido — somar ocorrências de feriado a uma frequência semanal.
- **Exemplo (grade normal):** Viagem às 08:00 com `dias_semana: [segunda, terca]` e `regra_feriado: "circula_em_feriado"`. Viagens na semana = **2** (segunda e terça). O fato de também rodar em feriados **não adiciona** viagens — mesmo que o feriado caísse numa quinta e a viagem operasse naquele dia real, isso é operação de feriado, fora da semana padrão. Idem para opções de deslocamento.
- **Exemplo (`somente_em_feriado`):** mesma Viagem às 08:00 `dias_semana: [segunda, terca]`, mas `regra_feriado: "somente_em_feriado"`. Viagens na semana padrão = **0** — ela só rodaria se segunda ou terça caíssem em feriado, e a semana padrão não tem feriado. Contribui `0` também às opções de deslocamento (§9.4).
- Assim, dois JSONs que difiram **apenas** em `regra_feriado` têm as mesmas contagens **enquanto ambos os valores forem não-`somente_em_feriado`**; trocar de/para `somente_em_feriado` **altera** a contagem (aquela Viagem entra ou sai da semana padrão). Fora esse caso, a diferença aparece só na informação exibida (tabela/PDF), tratada pelo Comparador como mudança informativa, não de frequência.
- **Requisito de exibição (Spec 04/05):** como o "nº de viagens" e as "opções de deslocamento" são valores **nominais da semana padrão** — que diverge da operação real em semanas com feriado —, o PDF e a UI devem **rotular explicitamente** essas contagens como _"semana padrão (sem feriado)"_ e apresentar `regra_feriado` como **informação separada**, com um rótulo por valor (ex.: "opera normalmente, feriado indiferente" / "não opera em feriados" / "opera **somente** em feriados" / "opera normalmente e também em feriados"), nunca somada à contagem. É só apresentação — nenhuma regra de cálculo muda; evita que o leitor confunda o número nominal com a operação de uma semana específica que contenha feriado. Atenção especial a `somente_em_feriado`: sua contagem nominal é `0`, então a UI deve deixar claro que a Viagem **existe** e opera em feriados, ainda que não conte na semana padrão.

### 9.3 Casos de borda

- **Feriado num dia fora de `dias_semana`:** só `"circula_em_feriado"` faz a Viagem **operar** naquele feriado (é aditivo — §9.1); os outros três **não** operam (o dia não está na grade, e `somente_em_feriado` exige feriado **dentro** de `dias_semana`). Em todos os casos isso só afeta a **informação exibida**; para contagem, continua valendo só a semana padrão (§9.2). _Quando_ um feriado ocorre é do calendário externo (Spec 04/05/06).
- **Feriado num dia dentro de `dias_semana`:** `circula_inclusive_se_for_feriado`, `somente_em_feriado` e `circula_em_feriado` **operam** naquele feriado; `nao_circula_em_feriado` **não** opera (embora fosse um dia normalmente servido). Só afeta a informação exibida, não a contagem da semana padrão.
- **Dia normal (não feriado) dentro de `dias_semana`:** os três primeiros valores **operam**; `somente_em_feriado` **não** opera — este é seu traço distintivo e a razão de contar `0` na semana padrão (§9.2).
- **Mistura no mesmo itinerário:** válido — cada Viagem tem sua própria etiqueta, independentemente das demais.

### 9.4 Opção de Deslocamento — cálculo

A **Opção de Deslocamento** é a estatística derivada citada no glossário (Spec 01 §4) e na regra de contagem neutra a feriado (§9.2). A Spec 01 a descreve como "par origem-destino comprável por viagem × seccionamento", mas nenhuma spec anterior fixou **o algoritmo** — e o número aparece tanto no PDF operacional (Spec 04) quanto no Comparador (Spec 05), então **ambos precisam computá-lo da mesma forma**. Esta seção fecha a fórmula.

**É uma estatística por Serviço** (depois somada para o Autos). Combina duas grandezas do próprio Serviço:

- **(a) Pares O-D compráveis** = número de pares habilitados em `matriz_seccionamento` do Serviço (Spec 02 §9). Cada par habilitado é um trecho origem-destino em que se pode vender passagem parcial; é exatamente o conjunto de "pares compráveis". Não há conversão nem dedução — é a cardinalidade do array.
- **(b) Frequência semanal por sentido** = para cada Viagem do Serviço, sua contribuição à **semana padrão**, somada por sentido (Ida/Volta). Essa contribuição é `len(dias_semana)` para os três valores que operam a grade num dia normal, e **`0`** para `somente_em_feriado` (que nunca opera numa semana sem feriado — §9.2). Fora essa exceção, feriado **não entra**: usa-se só `dias_semana`.

**Fórmula (por Serviço):**

```
a = len(matriz_seccionamento)                      # pares O-D compráveis do Serviço

# contribuição de cada Viagem à semana padrão (sem feriado):
def freq_semana_padrao(viagem):
    if viagem.regra_feriado == "somente_em_feriado":
        return 0                       # só opera em feriado; a semana padrão não tem feriado
    return len(viagem.dias_semana)     # os outros três operam a grade normal

# frequência semanal somada, por sentido:
freq_ida    = Σ  freq_semana_padrao(viagem)   para cada Viagem do itinerário de Ida
freq_volta  = Σ  freq_semana_padrao(viagem)   para cada Viagem do itinerário de Volta

opcoes_de_deslocamento_ida    = a * freq_ida
opcoes_de_deslocamento_volta  = a * freq_volta
opcoes_de_deslocamento        = opcoes_de_deslocamento_ida + opcoes_de_deslocamento_volta
```

- Um sentido inexistente (Serviço unidirecional) contribui `0` naquele lado — só existe o termo do sentido populado.
- `a` é o **mesmo** para Ida e Volta: `matriz_seccionamento` pertence ao Serviço como um todo (Spec 02 §9), não a um sentido.
- A **Opção de Deslocamento do Autos** é a soma de `opcoes_de_deslocamento` de todos os seus Serviços.

**Exemplo:** um Serviço com `matriz_seccionamento` de **3** pares (`a = 3`); na Ida, duas Viagens — uma com `dias_semana` de 5 dias (seg–sex) e outra de 2 dias (sáb, dom) → `freq_ida = 5 + 2 = 7`; na Volta, uma Viagem de 5 dias → `freq_volta = 5`. Então `opcoes_ida = 3·7 = 21`, `opcoes_volta = 3·5 = 15`, `opcoes_de_deslocamento = 36`.

**Casos de borda:**

- **`matriz_seccionamento` vazia** (`a = 0`): a Opção de Deslocamento do Serviço é `0` — não há par comprável habilitado, ainda que existam viagens. É válido e esperado (default `[]`, Spec 02 §6).
- **Neutralidade a feriado (com uma exceção):** por §9.2, `regra_feriado` só entra em (b) através de `somente_em_feriado`, que **zera** a frequência daquela Viagem; os outros três valores dão `len(dias_semana)`. Dois JSONs que difiram só em `regra_feriado` têm a mesma Opção de Deslocamento **enquanto nenhum dos valores trocados for `somente_em_feriado`**.
- **Viagem `somente_em_feriado`:** contribui `0` a `freq_ida`/`freq_volta` — logo `0` à Opção de Deslocamento — mesmo tendo `dias_semana` preenchido. Ela existe e opera (em feriados), mas fora da semana padrão.
- **Congelamento:** como toda contagem derivada, é recomputável a qualquer momento a partir do JSON (não é persistida) — mas a **fórmula** é esta, para PDF (Spec 04) e Comparador (Spec 05) baterem.

---

## 10. Regras de Tipificação — `tipo` × `caracteristica_veiculo`

Materializa a validação que a Spec 01 §7 declarou "detalhada na Spec 03" e que a Spec 02 §6 chamou de "regra de negócio da Spec 03". São validações do Formulário (e checáveis por Comparador/Ingestor).

### 10.1 Duas famílias de veículo

Cada `caracteristica_veiculo` pertence a **uma de duas famílias**, e o `tipo` do Autos escolhe a família — as duas **nunca** se misturam num mesmo Autos:

- **Família semiurbana** — `SU` (Semiurbano) e `SUL` (Semiurbano Litorâneo). Veículo **único** por Autos.
- **Família rodoviária** — convencional (`CR` Convencional Rodoviário no não-litorâneo / `CL` Convencional Rodoviário Litorâneo no litorâneo), `EX` (Executivo), `LE` (Leito) e os **mistos** (§10.2). Aceita **variação** entre Serviços. **Não há Semileito** no domínio.

### 10.2 Tabela fechada de características permitidas por tipo

A partição é **fechada e código-a-código**: cada `tipo` de Autos admite exatamente o conjunto abaixo — qualquer código fora dele é **inválido** para aquele Autos. A litoralidade é **intrínseca ao código** (não há um mesmo código servindo litorâneo e não-litorâneo): o convencional é `CR`/`CL`, e cada misto que embute o componente convencional tem sua variante litorânea própria. Isso elimina a ambiguidade antiga (um `M..` "genérico" não expressava um convencional litorâneo).

| `tipo` do Autos          | Família    | Códigos permitidos (fechado)                 | Variação entre Serviços                                                   |
| ------------------------ | ---------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| **Semiurbano**           | semiurbana | `SU`                                         | **Não** — todos os Serviços têm `SU`; variam só por itinerário/`carater`. |
| **Semiurbano Litorâneo** | semiurbana | `SUL`                                        | **Não** — todos `SUL`.                                                    |
| **Rodoviário**           | rodoviária | `CR`, `EX`, `LE`, `ME`, `ML`, `MX`, `MM`     | **Sim** — Serviços podem diferir dentro deste conjunto.                   |
| **Rodoviário Litorâneo** | rodoviária | `CL`, `EX`, `LE`, `MEL`, `MLL`, `MXL`, `MML` | **Sim** — idem, dentro deste conjunto.                                    |

**Legenda dos códigos rodoviários (composição e litoralidade):**

| Código | Composição                                       | Componente convencional | Tipo em que aparece  |
| ------ | ------------------------------------------------ | ----------------------- | -------------------- |
| `CR`   | Convencional Rodoviário                          | `CR` (não-litorâneo)    | Rodoviário           |
| `CL`   | Convencional Rodoviário Litorâneo                | `CL` (litorâneo)        | Rodoviário Litorâneo |
| `EX`   | Executivo                                        | — (sem convencional)    | ambos                |
| `LE`   | Leito                                            | —                       | ambos                |
| `ME`   | Misto Convencional + Executivo                   | `CR` (não-litorâneo)    | Rodoviário           |
| `ML`   | Misto Convencional + Leito                       | `CR` (não-litorâneo)    | Rodoviário           |
| `MX`   | Misto Executivo + Leito                          | — (sem convencional)    | Rodoviário           |
| `MM`   | Misto Convencional + Executivo + Leito           | `CR` (não-litorâneo)    | Rodoviário           |
| `MEL`  | Misto Convencional Litorâneo + Executivo         | `CL` (litorâneo)        | Rodoviário Litorâneo |
| `MLL`  | Misto Convencional Litorâneo + Leito             | `CL` (litorâneo)        | Rodoviário Litorâneo |
| `MXL`  | Misto Executivo + Leito                          | — (sem convencional)    | Rodoviário Litorâneo |
| `MML`  | Misto Convencional Litorâneo + Executivo + Leito | `CL` (litorâneo)        | Rodoviário Litorâneo |

`EX` e `LE` (puros, sem componente convencional) são os **únicos** códigos que aparecem nos dois tipos rodoviários com o mesmo código. O misto Executivo+Leito, embora também não tenha convencional, usa **código distinto por tipo** (`MX` no Rodoviário, `MXL` no Rodoviário Litorâneo) para manter a partição por `tipo` estritamente disjunta e determinística — dado um código, o `tipo` compatível é sempre inequívoco.

### 10.3 Regras (decisões fechadas)

1. **Famílias não se misturam.** O `tipo` do Autos fixa a família (Semiurbano/Semiurbano Litorâneo → **semiurbana**; Rodoviário/Rodoviário Litorâneo → **rodoviária**). `SU`/`SUL` **só** em Autos semiurbano; os códigos rodoviários (`CR`/`CL`/`EX`/`LE` + mistos) **só** em Autos rodoviário. Nunca há código de uma família num Autos da outra.
2. **Veículo único no semiurbano.** Em `Semiurbano` e `Semiurbano Litorâneo`, **todos** os Serviços do Autos compartilham a **mesma** `caracteristica_veiculo` (`SU` e `SUL`, respectivamente). Múltiplos Serviços existem apenas por variação de itinerário/`carater` (Spec 01 §7).
3. **Litoralidade intrínseca ao código.** A litoralidade do Autos fixa a forma convencional, e as formas **nunca coexistem**: Autos litorâneo usa a forma litorânea (`SUL` no semiurbano; `CL`, `MEL`, `MLL`, `MML` no rodoviário) e **jamais** a não-litorânea (`SU`; `CR`, `ME`, `ML`, `MM`); Autos não-litorâneo, o contrário. Diferente do desenho antigo (um código convencional único, "corrigido" por regra externa), aqui **o próprio código carrega a litoralidade** — não há como um Serviço de Autos litorâneo portar um convencional não-litorâneo, porque esse código não pertence ao conjunto permitido do tipo (§10.2). Logo `CR`/`CL` nunca coexistem e `SU`/`SUL` nunca coexistem.
4. **Variação no rodoviário.** Em `Rodoviário` e `Rodoviário Litorâneo`, Serviços podem ter `caracteristica_veiculo` distintas entre si, desde que **todas** dentro do conjunto permitido do `tipo` (§10.2).
5. **Coexistência de Serviços.** Dois Serviços podem coexistir no mesmo Autos sse: (a) cada um respeita a tabela §10.2 para o `tipo`; (b) no semiurbano, ambos têm a característica única do tipo; (c) `numero_n` de exibição não colide de forma enganosa (é só rótulo — Spec 02 §6 — mas o Formulário deve numerar sequencialmente por ordem de cadastro). A identidade real é o `uuid` (Spec 02 §12), nunca `numero_n`.

### 10.4 Casos de borda

- **Trocar o `tipo` do Autos** com Serviços já cadastrados que violem o novo tipo: o Formulário deve bloquear/alertar — ex.: mudar de Rodoviário para Semiurbano com Serviços cujo veículo não é `SU`; mudar de Semiurbano para Rodoviário (o `SU` não é característica rodoviária válida); mudar litoralidade deixando `CR`/`ME`/`ML`/`MM` num Autos que virou litorâneo (ou `CL`/`MEL`/`MLL`/`MML` num que virou não-litorâneo). Como cada código é exclusivo de um `tipo` (§10.2), a checagem é direta: todo `caracteristica_veiculo` dos Serviços deve pertencer ao conjunto do novo `tipo`. Política de UI é Spec 04; a **regra** violada é esta §10.
- **Mistos sem ambiguidade de litoralidade:** como a litoralidade é intrínseca ao código (§10.2), não existe misto "genérico" a ser resolvido por regra externa — `ML` (não-litorâneo) e `MLL` (litorâneo) são códigos diferentes, cada um válido em exatamente um `tipo`. A contradição antiga (tabela permitindo mistos em ambos os litorais sem partição) fica eliminada.

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

| Tema                            | Spec 03 (aqui)                                                                                                                                                                   | Spec 04 (Formulário/UI)                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Roteamento (§3)                 | Forma da requisição OSRM, extração, conversão m→km, arredondamento, política de erro bloqueante                                                                                  | Momento de disparar o roteamento, indicador de carregamento, exibição da mensagem de erro, re-tentativa manual, desenho da rota no mapa  |
| Pontos de rota (§3.6)           | Que forçam o traçado, entram como coordenadas intermediárias, nunca viram trecho/parada, persistem em `rota.pontos_de_rota` (só para forçar), mapeamento legs→trechos            | Clique na rota para criar o ponto, arraste no mapa, recálculo ao soltar, feedback visual                                                 |
| `matriz_distancias` (§4)        | Algoritmo de soma de trechos por par de Seções                                                                                                                                   | Quando recalcular, exibição da matriz                                                                                                    |
| `valor_adotado` (§5)            | Fórmula (média/valor único) e arredondamento                                                                                                                                     | — (puro cálculo)                                                                                                                         |
| Sugestões de seccionamento (§6) | Os dois algoritmos: "menor distância" (mín. entre Serviços) e "distâncias do serviço" (valor do próprio Serviço)                                                                 | Os dois botões, escopo em lote, apresentar sugestão, permitir edição, recálculo reativo                                                  |
| Regra dos 350 m (§7)            | Centroide, Haversine, validação incremental, checagem estática, pareada de Local                                                                                                 | Feedback ao inserir ponto no mapa, mensagem de recusa, proposta de criar nova Seção                                                      |
| Horários de passagem (§8)       | Sugestão inicial por acúmulo de `duracao_s`; fórmula de redistribuição proporcional entre âncoras ao editar horário a jusante; reset à sugestão inicial (mantém `horario_saida`) | Edição por Viagem, quando recalcular, botões de reset (por Viagem/em lote) e confirmação, bloqueio de offset fora de ordem, apresentação |
| `regra_feriado` (§9)            | Enum de 4 valores; feriado não altera contagens, exceto `somente_em_feriado`, que conta `0` na semana padrão                                                                     | Seleção da regra por Viagem no formulário, exibição no PDF; calendário de feriados externo                                               |
| Tipificação (§10)               | Tabela e regras `tipo` × característica                                                                                                                                          | Bloqueio/alerta ao cadastrar/trocar tipo, numeração de `numero_n`                                                                        |
| Tarifa (§11)                    | Contrato "distância→R$ externo, nada de R$ no JSON"                                                                                                                              | Carregar a tabela da portaria, renderizar valores no PDF                                                                                 |

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
9. **Regra dos 350 m:** validação **incremental** no Formulário (recalcula centroide candidato, recusa se qualquer ponto do conjunto resultante > 350 m — preserva o invariante do centroide final); **revalidação obrigatória em remoção e em edição de coordenada** (edição = remover + reinserir com a checagem plena; a antiga justificativa de que remover nunca viola era incorreta); checagem **estática fraca** (centroide de todos os pontos finais) para Comparador/Ingestor; **pareada** para Local (§7).
10. **Horários de passagem** (§8): sugestão inicial por acúmulo de `duracao_s` (primeira parada `00:00:00`); ao editar manualmente o horário de uma parada a jusante, as intermediárias são **reinterpoladas proporcionalmente** entre âncoras (a "redistribuição" real — nada a ver com feriado); e um **reset** que desfaz as edições manuais, voltando à sugestão inicial e mantendo só o `horario_saida` (§8.3, escopo por Viagem ou em lote na UI).
11. **`regra_feriado` enum = `{circula_inclusive_se_for_feriado, nao_circula_em_feriado, somente_em_feriado, circula_em_feriado}`** (4 valores — como o feriado interage com `dias_semana`: indiferente, suprime, condição única, ou adiciona). `circula_em_feriado` é **aditivo** (opera em qualquer dia em que o feriado caia, mesmo fora de `dias_semana`); a etiqueta é **apenas informativa** (tabela/legenda/PDF); **não há** redistribuição de horários em feriado. Feriado **não altera** contagem de viagens nem de opções de deslocamento — as contagens usam a semana padrão, sem feriado —, **exceto** `somente_em_feriado`, que só opera em feriado e portanto conta `0` na semana padrão (§9).
12. **Tipificação:** duas famílias que nunca se misturam — **semiurbana** (`SU`/`SUL`, veículo único por Autos) e **rodoviária** (convencional `CR`/`CL`, `EX`, `LE` + mistos, com variação). Partição **fechada código-a-código** por `tipo` (§10.2), com a litoralidade **intrínseca ao código** (`SU`×`SUL`, `CR`×`CL` nunca coexistem; cada misto com convencional tem variante litorânea própria — `ME`/`ML`/`MM` × `MEL`/`MLL`/`MML`). Semileito não existe (§10).
13. **Tarifa distância→R$ é externa (portaria)**; JSON nunca guarda R$; ROTA só referencia a tabela na exibição/PDF (§11).

**Permanece para a Spec 04** (não é lacuna, é fronteira): tudo da coluna direita de §12 — momento de disparo, apresentação, interação, carregamento da tabela de tarifa e do calendário de feriados externos.

---

## 14. Próximos Documentos

- [ ] **Spec 04 — Formulário**: UI, mapa, import/export do JSON, geração do PDF operacional; consome os algoritmos desta spec e resolve a coluna "Spec 04" de §12.
- [ ] **Spec 05 — Comparador**: diff entre dois JSONs, PDF comparativo; usa as checagens estáticas (§7.3/§7.4) e a regra de que feriado não altera contagens (§9.2), sem recalcular o congelado.
- [ ] **Spec 06 — Ingestor + Modelo PostgreSQL**: ingestão do JSON aprovado; reaproveita UUIDs como chave e aplica as mesmas checagens estáticas.
