# Spec 02 — Esquema do JSON de Operação

**Projeto:** ROTA — Registro de Operação e Tabelas de Autos
**Depende de:** [Spec 01 — Visão Geral do Sistema](01-visao-geral.md)
**Status:** Em definição — v0.5
**Escopo:** O contrato de dados — entidades, campos, tipos, regras de UUID e validações estruturais do JSON de operação. **Não é escopo desta spec:** fórmulas de tarifa (valor em R$), algoritmo de roteamento, algoritmo de sugestão/redistribuição dos horários de passagem, significado do enum de `regra_feriado`, regras de tipificação, algoritmo exato de sugestão de menor distância (isso é a [Spec 03](03-regras-de-negocio-calculo.md)).

---

## 1. Papel deste Documento

O JSON de operação é o único contrato entre as três ferramentas do ROTA (Formulário, Comparador, Ingestor — ver Spec 01 §2). Esta spec define **a forma** desse contrato: que entidades existem, que campos cada uma tem, que tipo/formato cada campo aceita, e quais invariantes estruturais um JSON válido precisa respeitar.

Princípios herdados da Spec 01 que moldam todo o esquema:

- **Só dados de operação.** Nenhum campo de status, autor, data de submissão, aprovação ou fluxo (Spec 01 §3).
- **Autossuficiente.** Nenhuma referência a cadastro externo; tudo que o Autos usa está embutido no documento (Spec 01 §5).
- **UUID estável** em Seção, Serviço, Local e Viagem, gerada client-side na criação, preservada na reimportação (Spec 01 §6, e §12 abaixo).

---

## 2. Visão Geral da Árvore de Documento

```
Documento (raiz)
├─ versao_schema
└─ autos
   ├─ codigo, tipo, empresa
   ├─ status ("proposta" | "vigente"), data_criacao? | data_publicacao?
   ├─ secoes[]                     (compartilhadas entre todos os Serviços do Autos)
   │  ├─ uuid, municipio, nome
   │  └─ servicos[]                 (uma entrada por Serviço que usa esta Seção)
   │     └─ servico_uuid, geolocalizacao_ida?, geolocalizacao_volta?
   └─ servicos[]
      ├─ uuid, numero_n, caracteristica_veiculo, carater
      ├─ locais[]                   (pontos comuns — sem tarifa — só deste Serviço)
      │  └─ uuid, nome, municipio, geolocalizacao_ida?, geolocalizacao_volta?
      ├─ matriz_distancias[]        ({ secao_a_uuid, secao_b_uuid, valor_adotado_de_distancia, distancia_trecho_ida?, distancia_trecho_volta? }) — todos os pares, computada
      ├─ matriz_seccionamento[]     ({ secao_a_uuid, secao_b_uuid, distancia_km }) — pares habilitados p/ passagem parcial
      └─ itinerarios[]              (1 ou 2: sentido "ida" e/ou "volta")
         ├─ sentido
         ├─ paradas[]                (ordenadas; cada uma referencia UMA Seção OU UM Local)
         │  └─ ordem, secao_uuid? | local_uuid?
         ├─ rota { geometria, distancia_km, duracao_s, fonte_calculo, data_calculo, perfil, trechos[], pontos_de_rota[] }
         │  ├─ trechos[]: parada_origem_ordem, parada_destino_ordem, distancia_km, duracao_s
         │  └─ pontos_de_rota[]: apos_parada_ordem, latitude, longitude   (só forçam o traçado; não geram parada/trecho)
         └─ viagens[]
            └─ uuid, horario_saida, dias_semana[], regra_feriado, horarios_paradas[]
               └─ horarios_paradas[]: parada_ordem, offset_horario
```

Decisões de nesting fixadas nesta spec (histórico completo em §13):

- **Seção é uma entidade do Autos, não do Serviço.** A mesma Seção física (um município/terminal que define tarifa) é compartilhada por todos os Serviços do Autos que passam por ali. Isso é o que permite montar, por Serviço, uma matriz de distâncias entre Seções, e comparar essas matrizes entre Serviços do mesmo Autos para sugerir a menor distância ao preencher a matriz de tarifas de cada Serviço.
- **Cada Serviço que usa uma Seção contribui sua própria geolocalização** (Ida e/ou Volta) para aquela Seção — pontos de Serviços diferentes podem divergir levemente e ainda assim contar como "a mesma Seção", dentro do limite de 350 m (ver §5.2).
- **Local (pontos sem tarifa) continua no Serviço**, sem compartilhamento — não participa de matriz de distâncias nem de seccionamento.
- **Campo `papel` eliminado.** O tipo do ponto passa a ser determinado pela coleção que o contém: `autos.secoes` é sempre Seção; `servico.locais` é sempre Local comum.
- **Parada referencia exatamente um dos dois**: `secao_uuid` (aponta para `autos.secoes`) ou `local_uuid` (aponta para `servico.locais`) — nunca ambos, nunca nenhum.
- **Matriz de distâncias (`matriz_distancias`) e matriz de seccionamento (`matriz_seccionamento`) pertencem ao Serviço**, referenciando `uuid` de Seções do Autos.
- **Viagem pertence ao Itinerário**, não ao Serviço — uma viagem percorre as paradas de um único sentido.
- **`offset_horario` pertence à Viagem, não à Parada.** O trânsito faz o tempo entre duas paradas variar de viagem para viagem, mesmo dentro do mesmo itinerário (mesma sequência física de paradas) — por isso o offset de cada parada é dado por Viagem, editável pelo usuário, e não um valor único fixo no itinerário.
- **`rota` ganha `trechos[]`**, com distância e duração de cada segmento consecutivo entre paradas — dado bruto que alimenta tanto a sugestão inicial dos offsets de cada Viagem quanto o cálculo de `matriz_distancias` (por soma de trechos entre duas Seções).
- **`rota` ganha `pontos_de_rota[]`** (§10.4): vértices que o usuário adiciona para **forçar** o traçado a passar por determinada via, quando a rota sugerida pelo OSRM não é a que o ônibus percorre. Servem **exclusivamente** para condicionar o cálculo da rota — não são Seção, Local nem Parada, não têm `uuid`, não têm tarifa e não participam de `matriz_distancias`/`matriz_seccionamento` nem da regra dos 350 m. São persistidos só para reproduzir fielmente a rota ao reeditar. Algoritmo na Spec 03 §3.6.
- **Quando um Serviço tem os dois itinerários (Ida e Volta), ambos devem referenciar o mesmo conjunto de Seções** — só as Seções podem divergir em ordem, e os Locais comuns intermediários (sem tarifa) podem diferir livremente entre os dois sentidos. Isso garante que todo par de Seções atendidas pelo Serviço ocorre em ao menos um itinerário, tornando `matriz_distancias` sempre satisfazível (ver §8 e §14). Um Serviço pode ainda ser unidirecional (só Ida ou só Volta) — a regra só se aplica quando os dois sentidos existem.

---

## 3. Objeto Raiz

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `versao_schema` | string | Sim | Versão deste contrato (ex.: `"1.0"`). Permite ao Comparador/Ingestor evoluir o schema sem quebrar leitura de JSONs antigos. Não é metadado de fluxo — é versionamento estrutural do contrato. |
| `autos` | object | Sim | Identificação do Autos, suas Seções e seus Serviços. Ver §4. |

---

## 4. Autos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `codigo` | string | Sim | Código regulatório do Autos (ex.: `"0000"`). |
| `tipo` | enum | Sim | `"Semiurbano"` \| `"Semiurbano Litorâneo"` \| `"Rodoviário"` \| `"Rodoviário Litorâneo"` (Spec 01 §7). |
| `empresa` | string | Sim | Nome da empresa permissionária. |
| `status` | enum | Sim | `"proposta"` \| `"vigente"`. Exceção deliberada e estreita ao princípio de "zero gestão" da Spec 01 §3 — não modela o ciclo de vida do SEI, é só uma etiqueta para o Comparador/Ingestor saberem o que estão lendo. Ver §4.1. |
| `data_criacao` | string (data `YYYY-MM-DD`) | Condicional | Presente **apenas** quando `status = "proposta"`. Data em que o JSON foi gerado (clique em "salvar/exportar" no Formulário) — preenchida automaticamente, não editável pelo usuário. |
| `data_publicacao` | string (data `YYYY-MM-DD`) | Condicional | Presente **apenas** quando `status = "vigente"`. Data de publicação, informada manualmente pelo usuário. |
| `secoes` | array\<Seção\> | Sim | Seções compartilhadas entre os Serviços deste Autos. Ver §5. |
| `servicos` | array\<Serviço\> | Sim | Mínimo 1 item. Ver §6. |

`codigo`, `tipo` e `empresa` vêm das listas estáticas do Formulário ou, ao carregar um JSON vigente, do próprio JSON — desde que os três valores existam nas listas disponíveis no momento (regra de bloqueio de carregamento, Spec 01 §8).

### 4.1 `status`, `data_criacao` e `data_publicacao`

- Exatamente um dos dois campos de data está presente, de acordo com `status`: `data_criacao` se `"proposta"`, `data_publicacao` se `"vigente"` — nunca os dois, nunca nenhum.
- Nenhum outro dado de fluxo acompanha esses campos: sem autor, sem prazo de vigência, sem publicação em DOE, sem histórico de mudança de status. Se o Autos precisar trocar de `proposta` para `vigente`, isso é feito gerando um novo JSON com o `status` e a data corretos — o próprio versionamento fica a cargo de quem usa o arquivo (nome de arquivo, SEI etc.), não do JSON.
- **Quem faz essa transição é o Formulário (Spec 01 §2, §8), não uma edição manual.** O Formulário expõe uma ação explícita "definir como vigente": pede a `data_publicacao` (informada pelo usuário), troca `status` para `"vigente"`, remove `data_criacao`, grava `data_publicacao`, e **preserva todas as UUIDs** existentes (§12). Nenhum outro dado de operação muda. É assim que se produz, de forma controlada, o JSON `vigente` que vira baseline do Comparador (Spec 01 §2) e carga do Ingestor. A UI dessa ação é da Spec 04.
- Isso não substitui o papel de "vigente"/"proposta" como entrada do Comparador (Spec 01 §2): o Comparador recebe dois JSONs e ainda cabe ao usuário indicar qual é qual ao carregá-los — o campo aqui é só a autodeclaração de cada arquivo, não uma regra de negócio do Comparador.
- **Nota para a Spec 05 (Comparador):** `status`, `data_criacao` e `data_publicacao` são autodeclaração do documento, não dado de operação comparável — não devem participar do diff campo-a-campo entre vigente e proposta (senão todo diff acusaria falsamente "mudou a data de criação", já que esse campo muda a cada exportação).

---

## 5. Seção

Seção é a entidade que define tarifa e participa da matriz de seccionamento. Ao contrário de um Local comum (§7), uma Seção é **compartilhada entre todos os Serviços do Autos** que passam por aquela região — cada Serviço contribui sua própria geolocalização de Ida e/ou de Volta para a Seção, mas todos usam o mesmo `uuid`.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `uuid` | string (UUIDv4) | Sim | Identidade estável da Seção, compartilhada por todos os Serviços do Autos que a utilizam. Serve tanto de referência interna (Paradas, `matriz_distancias`, `matriz_seccionamento`) quanto de identidade para diff entre versões. Gerada client-side na criação; preservada em reimportações. |
| `municipio` | string | Sim | Município da Seção. |
| `nome` | string | Sim | Nome de exibição da Seção (ex.: `"Terminal Rodoviário de Santos"`). |
| `servicos` | array\<SeçãoServiço\> | Sim | Mínimo 1 elemento — uma entrada por Serviço do Autos que usa esta Seção. Ver §5.1. |

### 5.1 SeçãoServiço (elemento de `secao.servicos`)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `servico_uuid` | string (UUIDv4) | Sim | `uuid` de um Serviço em `autos.servicos` que referencia esta Seção em ao menos uma Parada. |
| `geolocalizacao_ida` | object (`{latitude, longitude}`) | Condicional | Coordenada usada pelo itinerário de Ida **deste Serviço** nesta Seção. |
| `geolocalizacao_volta` | object (`{latitude, longitude}`) | Condicional | Idem, para o itinerário de Volta deste Serviço. |

Obrigatoriedade de `geolocalizacao_ida`/`geolocalizacao_volta` segue a direcionalidade do Serviço referenciado por `servico_uuid`: se esse Serviço tem os dois itinerários (Ida e Volta), as duas são obrigatórias; se é unidirecional, só a geolocalização daquele sentido é obrigatória.

### 5.2 Regra de 350 metros (clustering por centroide)

Diferente do desenho anterior desta spec (que comparava só Ida × Volta de um mesmo ponto), a regra de divergência de uma Seção agora é **cumulativa sobre todos os pontos contribuídos**, de qualquer Serviço e de qualquer sentido:

- Todos os pontos (`geolocalizacao_ida` e `geolocalizacao_volta`, de todas as entradas em `servicos`, de todos os Serviços que usam esta Seção) formam uma única região espacial.
- Ao inserir o **primeiro** ponto na Seção, ele é aceito sem checagem (ainda não há centroide).
- Ao inserir **cada ponto seguinte**, calcula-se o centroide de todos os pontos já aceitos na Seção até aquele momento; o novo ponto só é aceito se estiver a, no máximo, **350 metros** desse centroide.
- O centroide é recalculado, incluindo o novo ponto, a cada inserção aceita.
- Isso vale independentemente de o ponto vir de Ida ou Volta, e independentemente de qual Serviço o contribui — o critério é puramente espacial e cumulativo.

Se um ponto candidato ultrapassar 350 m do centroide vigente, ele **não pode** ser adicionado a esta Seção — deve-se criar uma **Seção diferente** (outro `uuid`), preferencialmente com `nome` distinto, para não sugerir que representam a mesma região.

*Nota de implementação:* como esta regra depende da ordem de inserção (histórico de edição), sua validação plena só é possível no momento da edição, no Formulário (client-side). Um leitor estático do JSON (Comparador, Ingestor) assume que o documento já é válido — não precisa, nem consegue sem o histórico de inserção, re-derivar a ordem a partir do array final. O algoritmo exato de cálculo de centroide (média simples de lat/long vs. centroide geodésico) fica para a Spec 03/04.

*Validação no momento da inserção (Formulário):* ao tentar inserir um novo ponto numa Seção, o Formulário não checa só a distância do candidato ao centroide atual — ele calcula o **centroide que resultaria** da inserção (centroide de todos os pontos já aceitos mais o candidato) e verifica se, sob esse novo centroide, **algum ponto já aceito** passaria a ficar a mais de 350 m dele. Se sim, a inserção é recusada (o ponto candidato não entra nesta Seção), mesmo que o candidato isolado estivesse a ≤ 350 m do centroide anterior. Isso garante o invariante de que todo ponto aceito numa Seção está sempre a ≤ 350 m do centroide final do conjunto — não apenas do centroide vigente no momento em que foi inserido.

*Remoção e edição de coordenada também revalidam (obrigatório):* remover um ponto ou mover a geolocalização de um ponto existente desloca o centroide e **pode** romper o invariante nos pontos que ficaram — portanto **remoção e edição revalidam sempre** o conjunto resultante. Edição de coordenada é tratada como **remover + reinserir**, com a checagem plena acima aplicada à coordenada nova. O algoritmo detalhado está na Spec 03 §7.2.

*Validação de um JSON de origem desconhecida (Comparador/Ingestor):* como esses leitores não têm o histórico de inserção, não podem reconstruir a sequência de checagens acima. Podem, porém, aplicar uma checagem mais fraca, mas suficiente para detectar violação grosseira: calcular o centroide de **todos** os pontos finais de cada Seção e verificar se todos estão a ≤ 350 m dele. Essa checagem é necessária mas não estritamente equivalente à validação incremental do Formulário (não reconstrói a ordem de inserção), mas basta para sinalizar um JSON claramente inválido.

---

## 6. Serviço

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `uuid` | string (UUIDv4) | Sim | Identidade estável do Serviço. Gerada client-side (`crypto.randomUUID()`) na criação; preservada em reimportações (Spec 01 §6). |
| `numero_n` | string | Sim | Rótulo de display, formato `"0000-NXX"` (ex.: `"0000-1CR"`). Não é identidade — apenas exibição. |
| `caracteristica_veiculo` | enum | Sim | **Família semiurbana:** `SU` \| `SUL`. **Família rodoviária (Rodoviário):** `CR` \| `EX` \| `LE` \| `ME` \| `ML` \| `MX` \| `MM`. **Família rodoviária (Rodoviário Litorâneo):** `CL` \| `EX` \| `LE` \| `MEL` \| `MLL` \| `MXL` \| `MML` (Spec 01 §7). O `tipo` do Autos fixa a família e a litoralidade (semiurbano → `SU`/`SUL`; rodoviário → convencional `CR`/`CL` conforme litoralidade) e as duas famílias nunca se misturam. A tabela fechada de quais valores são permitidos por `tipo` é regra de negócio da Spec 03 §10.2. |
| `carater` | enum | Sim | `"principal"` \| `"parcial"` \| `"semidireta"`. Campo explícito, declarado pela empresa — não derivado do conjunto de paradas. O glossário da Spec 01 usa "etc." ao listar valores; se surgirem outros, esta lista é a fonte de verdade e deve ser atualizada. |
| `locais` | array\<Local\> | Não (default `[]`) | Pontos comuns (sem tarifa) usados pelos itinerários deste Serviço. Não compartilhados com outros Serviços. Ver §7. |
| `matriz_distancias` | array\<ParDistância\> | Sim | Distância entre cada par de Seções atendidas por este Serviço, computada e congelada a partir da rota. Ver §8. |
| `matriz_seccionamento` | array\<ParSeção\> | Não (default `[]`) | Pares de Seções entre os quais é permitida venda de passagem parcial, com a distância de referência (km) confirmada pelo usuário. Ver §9. |
| `itinerarios` | array\<Itinerário\> | Sim | 1 ou 2 elementos. Ver §10. |

---

## 7. Local

Local é a entidade física (nome + município + geolocalização) de um ponto **sem** relevância tarifária, usado pelos itinerários de **um** Serviço. Não é compartilhado com outros Serviços, e não participa de `matriz_distancias` nem de `matriz_seccionamento` (isso é papel exclusivo da Seção, §5).

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `uuid` | string (UUIDv4) | Sim | Identidade estável do Local dentro deste Serviço. Gerada client-side na criação; preservada em reimportações. |
| `nome` | string | Sim | Nome do local (ex.: `"Ponto de Embarque Praia"`). |
| `municipio` | string | Sim | Município do local. |
| `geolocalizacao_ida` | object (`{latitude, longitude}`) | Condicional | Coordenada usada quando este Local aparece no itinerário de Ida. |
| `geolocalizacao_volta` | object (`{latitude, longitude}`) | Condicional | Coordenada usada quando este Local aparece no itinerário de Volta. |

### 7.1 Obrigatoriedade das geolocalizações e limite de 350 metros

- Pelo menos uma das duas (`geolocalizacao_ida`, `geolocalizacao_volta`) deve estar presente.
- As duas são independentemente opcionais — um Local pode existir só num sentido, sem contrapartida no outro.
- Se as duas estiverem preenchidas, a distância em linha reta entre elas deve ser **≤ 350 metros** (mesmo raciocínio de divergência da Seção, mas pareado — um único Serviço envolvido, sem clustering multi-serviço). Acima disso, devem ser criados **dois Locais distintos**, com `nome` diferente entre eles.
- Uma Parada de um itinerário de sentido X só pode referenciar (`local_uuid`) um Local que tenha `geolocalizacao_X` preenchida.

---

## 8. Matriz de Distâncias (`matriz_distancias`)

Pertence ao Serviço — ou seja, é sobre o Serviço como um todo, cobrindo Ida e Volta juntas. Contém a distância entre **cada par possível** de Seções atendidas por este Serviço — todas as combinações, não apenas pares consecutivos na rota (ex.: um Serviço que passa por A, B, C e D tem entradas para AB, AC, AD, BC, BD e CD).

É o dado agregado por Seção — diferente de `rota.trechos` (§10.3), que é granular **por Parada** e **por sentido** (inclui os Locais comuns intermediários entre duas Seções, ex.: entre A e B podem existir paradas comuns `a`, `b`, `c`; `rota.trechos` guarda A-a, a-b, b-c, c-B). `matriz_distancias` é a soma desses trechos entre a posição de uma Seção e a posição da outra, condensada num único par A-B — sem duração: o tempo de deslocamento já está guardado em `rota.trechos`, não precisa ser duplicado aqui.

**`matriz_distancias` é inteiramente intra-Serviço** — usa só os itinerários deste Serviço, nunca dados de outro Serviço. A comparação entre Serviços do Autos (para sugerir a menor distância) acontece **somente** ao preencher a `matriz_seccionamento` (§9), que aí sim lê o `valor_adotado_de_distancia` de `matriz_distancias` de outros Serviços — mas essa é uma lógica do Formulário, não algo que `matriz_distancias` em si calcula ou registra.

**ParDistância** (elemento do array):

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `secao_a_uuid` | string (UUIDv4) | Sim | `uuid` de uma Seção atendida por este Serviço. |
| `secao_b_uuid` | string (UUIDv4) | Sim | Idem, distinto de `secao_a_uuid`. |
| `distancia_trecho_ida` | number | Condicional | Distância entre as duas Seções, **em km**, somada a partir de `rota.trechos[].distancia_km` do itinerário de Ida deste Serviço. Presente apenas se o Serviço tem itinerário de Ida. |
| `distancia_trecho_volta` | number | Condicional | Idem, **em km**, a partir do itinerário de Volta. Presente apenas se o Serviço tem itinerário de Volta. |
| `valor_adotado_de_distancia` | number | Sim | Distância **em km** que **este Serviço** adota como "a" distância entre estas duas Seções, calculada só a partir dos dados dele mesmo (nunca de outros Serviços do Autos). Quando os dois itinerários existem, é a média entre `distancia_trecho_ida` e `distancia_trecho_volta`; quando o Serviço é unidirecional, é igual ao único valor existente. O algoritmo exato de composição (média simples ou outro critério) fica para a Spec 03. |

**Unidade: todo campo de distância neste esquema é em quilômetros (km)** — `rota.distancia_km`, `rota.trechos[].distancia_km` (§10.2, §10.3), `matriz_distancias` (aqui) e `matriz_seccionamento.distancia_km` (§9) usam todos a mesma unidade. Não há mistura de metros e km em nenhum campo de distância do documento; a única grandeza em outra unidade é `duracao_s` (segundos), que não é distância.

Como Ida e Volta de um mesmo Serviço sempre referenciam o mesmo conjunto de Seções quando os dois itinerários existem (§2), um Serviço bidirecional tem **sempre** `distancia_trecho_ida` **e** `distancia_trecho_volta` presentes em cada `ParDistância`; um Serviço unidirecional tem sempre exatamente um dos dois.

Congelada no momento da geração do JSON — o Comparador e o Ingestor apenas leem o valor, sem recalcular (mesmo princípio de `rota`, §10.2).

Validação estrutural: deve existir exatamente uma entrada para cada combinação não-ordenada de duas Seções distintas referenciadas por paradas deste Serviço; `secao_a_uuid ≠ secao_b_uuid`; sem entradas duplicadas; `distancia_trecho_ida` presente se e somente se o Serviço tem itinerário de Ida (idem para `distancia_trecho_volta`) — consequência direta da regra de §2 de que Ida e Volta, quando ambos existem, referenciam o mesmo conjunto de Seções, então "Seções referenciadas por paradas de Ida" e "de Volta" são sempre o mesmo conjunto, tornando o par sempre alcançável em ao menos um itinerário.

---

## 9. Matriz de Seccionamento (`matriz_seccionamento`)

Pertence ao Serviço. Define, dentre as Seções que este Serviço atende, quais pares permitem venda de passagem parcial, e a **distância de referência em km** para aquele par.

Esse valor é **sempre uma distância**, nunca um valor monetário — o cálculo da tarifa em R$ a partir da distância é feito externamente, por portaria publicada (fora do escopo do ROTA e desta spec; ver Spec 01 §3 e §14 abaixo).

**ParSeção** (elemento do array):

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `secao_a_uuid` | string (UUIDv4) | Sim | `uuid` de uma Seção atendida por este Serviço (deve existir em `matriz_distancias` deste Serviço). |
| `secao_b_uuid` | string (UUIDv4) | Sim | Idem, distinto de `secao_a_uuid`. |
| `distancia_km` | number | Sim | Distância de referência, em km, confirmada pelo usuário para este par. |

O Formulário oferece **dois modos de sugestão** para o valor inicial de `distancia_km` (definidos na Spec 03 §6, acionados por botão): (a) a **menor distância** para o par entre as `matriz_distancias` de **todos** os Serviços do Autos que o atendem; (b) as **distâncias do próprio Serviço** — o `valor_adotado_de_distancia` deste mesmo Serviço para o par. Ambas são cálculo de UI (Spec 03/04); o que o JSON guarda é sempre o valor final confirmado/editado pelo usuário, não a sugestão em si.

Par não-direcional: `{a, b}` equivale a `{b, a}`; não deve haver pares duplicados. Validação estrutural adicional: o par deve corresponder a uma combinação presente em `matriz_distancias` deste mesmo Serviço.

---

## 10. Itinerário

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `sentido` | enum | Sim | `"ida"` \| `"volta"`. Não pode haver dois itinerários com o mesmo `sentido` no mesmo Serviço. Um Serviço só-Ida ou só-Volta é válido (Spec 01 §8). |
| `paradas` | array\<Parada\> | Sim | Mínimo 2 elementos, ordenados por `ordem`. Ver §10.1. |
| `rota` | object | Sim | Geometria e métricas da rota calculada via OSRM para este sentido. Ver §10.2. |
| `viagens` | array\<Viagem\> | Sim | Mínimo 1 elemento. Ver §11. |

### 10.1 Parada

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ordem` | integer | Sim | Posição na sequência, 1-based, estritamente crescente e sem lacunas dentro do itinerário. |
| `secao_uuid` | string (UUIDv4) | Condicional | Referência a uma Seção em `autos.secoes`. Presente quando esta Parada é uma Seção tarifária. |
| `local_uuid` | string (UUIDv4) | Condicional | Referência a um Local em `servico.locais`. Presente quando esta Parada é um ponto comum, sem tarifa. |

**Exatamente um** dos dois (`secao_uuid` XOR `local_uuid`) deve estar presente em cada Parada — nunca os dois, nunca nenhum.

**Extremos são sempre Seção.** A **primeira** e a **última** Parada de todo itinerário (menor e maior `ordem`) devem referenciar uma **Seção** (`secao_uuid`) — nunca um Local. Um itinerário começa e termina em ponto tarifário; Locais (pontos comuns, sem tarifa) só podem aparecer como paradas **intermediárias**. Consequências: não existe Local antes da primeira Seção nem depois da última; como todo itinerário tem no mínimo 2 paradas (§10) e as duas pontas são Seções — distintas, por §14 —, todo itinerário atende ao menos 2 Seções, o que sustenta o mínimo exigido para `matriz_distancias` (§8, §14).

Validações referenciais:
- Se `secao_uuid` presente: deve existir, em `autos.secoes[secao_uuid].servicos`, uma entrada cujo `servico_uuid` seja o Serviço que contém esta Parada, e essa entrada deve ter `geolocalizacao_<sentido deste itinerário>` preenchida.
- Se `local_uuid` presente: o Local referenciado (em `servico.locais` do mesmo Serviço) deve ter `geolocalizacao_<sentido deste itinerário>` preenchida.

A Parada **não** carrega horário — o tempo de passagem por cada parada é dado por Viagem (§11), já que o mesmo conjunto de paradas pode ter offsets diferentes entre viagens (trânsito).

### 10.2 Rota

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `geometria` | object (GeoJSON `LineString`) | Sim | Coordenadas `[longitude, latitude]` da rota street-snapped, retornada pelo OSRM, para este sentido, ponta a ponta. |
| `distancia_km` | number | Sim | Distância total roteada, em km. Igual à soma de `trechos[].distancia_km`. O OSRM retorna a distância em metros; o Formulário converte para km ao montar este campo — nenhum campo de distância do documento fica em metros (§8). |
| `duracao_s` | number | Sim | Duração total estimada, em segundos, retornada pelo OSRM (sem trânsito — baseline). Igual à soma de `trechos[].duracao_s`. |
| `fonte_calculo` | string | Sim | Motor/instância que produziu esta rota (ex.: `"osrm:router.project-osrm.org"` ou o host auto-hospedado). Registra **com que engine** a rota foi congelada, para rastreabilidade e para o Comparador (Spec 05) saber que rotas de fontes/datas diferentes podem divergir por ruído do mapa, não por mudança de dado (Spec 03 §3.6.2). |
| `data_calculo` | string (data `YYYY-MM-DD`) | Sim | Data em que a rota foi calculada e congelada. Duas rotas com as mesmas paradas mas `data_calculo` distante podem ter geometria/distância ligeiramente diferentes (mapa/versão do OSRM mudou) — isso é ruído, não alteração de operação. |
| `perfil` | string | Sim | Perfil de roteamento usado (ex.: `"driving"`, Spec 03 §3.2). |
| `trechos` | array\<Trecho\> | Sim | Distância e duração de cada segmento consecutivo entre paradas deste itinerário. Ver §10.3. |
| `pontos_de_rota` | array\<PontoDeRota\> | Não (default `[]`) | Vértices que forçam o traçado da rota por vias específicas. Só condicionam o cálculo; não geram parada nem trecho. Ver §10.4. |

`rota`, incluindo `trechos`, `pontos_de_rota` e os metadados `fonte_calculo`/`data_calculo`/`perfil`, é calculada e congelada no momento da geração do JSON — o Comparador e o Ingestor não recalculam contra o OSRM, apenas leem o que está no documento (a distância roteada alimenta a tarifa, então uma rota não calculada tornaria a tabela inválida — Spec 01 §8).

**Ao reabrir um JSON, o mapa desenha a `rota.geometria` congelada — nunca reconsulta o OSRM só para exibir.** O OSRM só é chamado quando o usuário efetivamente **altera** o itinerário (inserir/mover Seção, Local ou ponto de rota), recalculando o trecho afetado. Isso remove a dependência do serviço público para a simples leitura/reedição (Spec 01 §8, Spec 03 §3).

### 10.3 Trecho (elemento de `rota.trechos`)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `parada_origem_ordem` | integer | Sim | `ordem` da Parada de origem deste trecho. |
| `parada_destino_ordem` | integer | Sim | `ordem` da Parada de destino deste trecho — deve ser a próxima parada na sequência (`parada_origem_ordem + 1`). |
| `distancia_km` | number | Sim | Distância roteada entre as duas paradas, em km. |
| `duracao_s` | number | Sim | Duração estimada entre as duas paradas, em segundos (sem trânsito — baseline do OSRM). Serve de sugestão inicial para o offset de cada Viagem (§11), que o usuário pode ajustar. |

Validação estrutural: `rota.trechos` tem exatamente `paradas.length - 1` elementos, um para cada par consecutivo de paradas (por `ordem`), sem lacunas nem repetição.

### 10.4 PontoDeRota (elemento de `rota.pontos_de_rota`)

Vértice que o usuário adiciona para **forçar** o traçado da rota a passar por determinada via (a rota que o OSRM sugere nem sempre é a que o ônibus percorre). Tem **propósito único**: condicionar o cálculo da rota. Não é entidade comparável (sem `uuid`), não tem tarifa, não é Parada, e não participa de `matriz_distancias`, `matriz_seccionamento` nem da regra dos 350 m. É persistido apenas para que a rota forçada possa ser recalculada de forma idêntica ao reeditar o documento. Algoritmo de uso na Spec 03 §3.6.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `apos_parada_ordem` | integer | Sim | `ordem` da Parada **após a qual** este ponto aparece na travessia — indica em qual trecho (entre as paradas `apos_parada_ordem` e `apos_parada_ordem + 1`) ele força o traçado. Deve estar em `[1, paradas.length - 1]` (nunca após a última parada). |
| `latitude` | number | Sim | Latitude do ponto de forçamento. |
| `longitude` | number | Sim | Longitude do ponto de forçamento. |

- Vários pontos podem compartilhar o mesmo `apos_parada_ordem` (forçar múltiplos desvios no mesmo trecho); a **ordem no array** define a sequência entre eles dentro do trecho.
- Congelado junto do restante de `rota` (§10.2). O efeito do forçamento já está refletido em `rota.geometria`, `rota.distancia_km` e `rota.trechos`; leitores (Comparador, Ingestor, PDF) não reprocessam os pontos.

**Exemplo — múltiplos pontos, inclusive vários no mesmo trecho.** Um itinerário com 3 paradas — A (`ordem` 1), B (`ordem` 2), C (`ordem` 3) — em que o trecho A→B precisa de **três** vértices para serpentear pelas ruas certas, e o trecho B→C precisa de **um**:

```json
"pontos_de_rota": [
  { "apos_parada_ordem": 1, "latitude": -23.9615, "longitude": -46.3650 },
  { "apos_parada_ordem": 1, "latitude": -23.9620, "longitude": -46.3680 },
  { "apos_parada_ordem": 1, "latitude": -23.9628, "longitude": -46.3720 },
  { "apos_parada_ordem": 2, "latitude": -23.9800, "longitude": -46.3990 }
]
```

- Os três primeiros (`apos_parada_ordem: 1`) forçam o traçado **entre A e B**, aplicados **na ordem em que aparecem no array** (`p1` → `p2` → `p3`).
- O quarto (`apos_parada_ordem: 2`) força o traçado **entre B e C**.
- Ainda assim `rota.trechos` tem **2** elementos (A→B e B→C), não 6 — os pontos de rota adensam o desenho *dentro* de um trecho, mas nunca criam trechos. A distância/duração de cada trecho já soma os desvios (ver o passo-a-passo da fusão de legs na Spec 03 §3.6).

Validação estrutural: cada `apos_parada_ordem` referencia uma parada existente e está em `[1, paradas.length - 1]`; `pontos_de_rota` **não** altera a contagem de `rota.trechos` (§10.3 — continua `paradas.length - 1`); array vazio ou ausente é válido (default `[]`).

---

## 11. Viagem

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `uuid` | string (UUIDv4) | Sim | Identidade estável da viagem. Mesma regra de Seção/Serviço/Local: gerada client-side na criação, preservada em reimportações. Permite ao Comparador reportar "viagem das 08:00 adiantada para 08:15" em vez de "removeu uma, criou outra". |
| `horario_saida` | string (`HH:MM:SS`) | Sim | Horário absoluto de saída desta viagem, a partir da primeira parada do itinerário. `HH` em `00`–`23` (domínio intermunicipal, < 24 h — Spec 03 §8.1). |
| `dias_semana` | array\<enum\> | Sim | Mínimo 1 elemento, sem repetição. Valores: `"segunda"`, `"terca"`, `"quarta"`, `"quinta"`, `"sexta"`, `"sabado"`, `"domingo"`. |
| `regra_feriado` | enum | Sim | Um de `"circula_inclusive_se_for_feriado"` (opera a grade `dias_semana`, feriado indiferente) \| `"nao_circula_em_feriado"` (opera a grade, mas não em feriado) \| `"somente_em_feriado"` (só opera nos dias de `dias_semana` que forem feriado) \| `"circula_em_feriado"` (opera a grade **e também** em qualquer feriado, mesmo fora de `dias_semana` — aditivo). **Não há** grade nem redistribuição de horário específica de feriado. É informação de exibição (tabela/PDF); significado fixado na Spec 03 §9; **não afeta** contagem de viagens/opções de deslocamento (que usam a semana padrão, sem feriado) — **exceto** `"somente_em_feriado"`, que conta `0` nessa semana por só operar em feriado. |
| `horarios_paradas` | array\<HorárioParada\> | Sim | Offset de passagem, a partir de `horario_saida`, para cada Parada do itinerário — específico desta Viagem. Ver §11.1. |

### 11.1 HorárioParada (elemento de `viagem.horarios_paradas`)

Todo o conjunto de paradas de um itinerário é fixo (definido em `itinerario.paradas`) e compartilhado por todas as suas Viagens — mas o **tempo** entre elas varia de viagem para viagem (trânsito difere por horário do dia), por isso o offset é dado aqui, por Viagem, e não na Parada.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `parada_ordem` | integer | Sim | `ordem` da Parada (em `itinerario.paradas`) a que este horário se refere. |
| `offset_horario` | string (`HH:MM:SS`) | Sim | Tempo decorrido desde `horario_saida` desta Viagem até a passagem por esta parada. `HH` em `00`–`23` (offset sempre < 24 h — Spec 03 §8.1). Editável pelo usuário na UI (sugestão inicial vem de `rota.trechos`, acumulados — Spec 03/04 define o algoritmo de sugestão). |

Validações estruturais:
- `horarios_paradas` tem exatamente um elemento para cada Parada existente em `itinerario.paradas` (mesmo conjunto de `ordem`, sem faltar nem sobrar).
- Ordenando por `parada_ordem`, `offset_horario` é não decrescente.
- O elemento cujo `parada_ordem` é o menor (primeira parada do itinerário) tem `offset_horario` igual a `"00:00:00"`.

---

## 12. Regras de Identidade e UUID (consolidado)

Aplicam-se uniformemente a **Seção**, **Serviço**, **Local** e **Viagem**:

- UUID é gerada **no momento da criação** da entidade, client-side, como UUIDv4 (`crypto.randomUUID()`).
- UUID **nunca é regenerada** por edição do conteúdo da entidade — só existe uma vez, na criação.
- Ao **importar um JSON**, todas as UUIDs existentes são preservadas tal como estão no arquivo. Somente entidades **novas**, criadas durante aquela sessão de edição, recebem UUID nova.
- Cada `uuid` é **único no documento inteiro, entre todas as entidades** (Seção, Serviço, Local e Viagem) — não só dentro da própria categoria (unicidade de `uuid` é validação estrutural). Mesmo Local sendo uma entidade não compartilhada entre Serviços (§7), sua UUID ainda precisa ser única globalmente, para que o Ingestor (Spec 06) possa usá-la diretamente como chave da linha no PostgreSQL sem ambiguidade entre Serviços de um mesmo Autos (ver também Spec 01 §6).
- `numero_n` (Serviço) é apenas rótulo de display — não deve ser usado como chave de identidade em nenhuma lógica de diff ou persistência.

Diff resultante no Comparador (Spec 01 §6, estendido a Seção, Local e Viagem):
- mesma UUID nos dois JSONs → mesma entidade, compara campo a campo;
- UUID só no vigente → removida/cancelada;
- UUID só na proposta → nova.

---

## 13. Decisões Fechadas Nesta Spec

Histórico completo — v0.1 → v0.5 desta spec:

1. **UUID em Viagem: obrigatória.** Mesma regra de Seção/Serviço/Local (§12).
2. **Caráter do itinerário: campo explícito** (`carater` em Serviço), não derivado do conjunto de paradas.
3. **Horário na parada: offset relativo.** `offset_horario` na Parada, resolvido em horário absoluto por Viagem via `horario_saida + offset_horario`.
4. **Viagem pertence ao Itinerário**, não ao Serviço — uma viagem é sempre de um sentido específico.
5. **Seção é entidade do Autos** (`autos.secoes[]`), compartilhada entre todos os Serviços do Autos que a utilizam — não mais uma entidade do Serviço. Isso permite montar, por Serviço, uma matriz de distâncias entre Seções e comparar essas matrizes entre Serviços do mesmo Autos. **Supera** a decisão v0.2 desta spec, que tratava Seção como um "Local com papel=secao" dentro do Serviço.
6. **Campo `papel` eliminado.** O tipo do ponto é dado implicitamente pela coleção que o contém: `autos.secoes` é sempre Seção; `servico.locais` é sempre Local comum.
7. **Local (comum) permanece no Serviço**, sem compartilhamento entre Serviços, sem participação em matriz de distâncias ou de seccionamento.
8. **Regra de 350 m para Seção é por centroide cumulativo** (§5.2) — cada novo ponto (Ida ou Volta, de qualquer Serviço) deve estar a ≤350 m do centroide de todos os pontos já aceitos naquela Seção. Substitui a checagem pareada Ida×Volta de uma única entidade, usada na v0.2 desta spec.
9. **Regra de 350 m para Local (comum) continua pareada** (Ida × Volta do mesmo Local, um único Serviço envolvido) — sem clustering multi-serviço, já que Local não é compartilhado.
10. **Matriz de distâncias (`matriz_distancias`) criada, por Serviço** — todas as combinações de pares de Seções atendidas, com distância em km, computada/congelada a partir da rota.
11. **Matriz de seccionamento ganha `distancia_km`** — valor de referência em km, confirmado pelo usuário por par habilitado. A menor distância entre Serviços do Autos (via `matriz_distancias`) serve só de sugestão de preenchimento na UI — não é persistida separadamente no JSON.
12. **JSON nunca guarda valor monetário (R$) de tarifa.** O cálculo do valor final a partir da distância é feito externamente, por portaria publicada — inteiramente fora do escopo do ROTA.
13. **Parada referencia exatamente um de `secao_uuid` ou `local_uuid`** (XOR) — nunca ambos, nunca nenhum.
14. **Versionamento de schema: incluído** (`versao_schema` na raiz), por ser metadado estrutural do contrato, não de fluxo.
15. **`offset_horario` migrou de Parada para Viagem** (`viagem.horarios_paradas[]`). O mesmo itinerário (mesma sequência física de paradas) pode ter viagens com offsets diferentes entre as paradas, pois o trânsito varia por horário — o offset por parada é, portanto, dado por Viagem, e a UX deve permitir o usuário ajustá-lo livremente. **Supera** a decisão v0.1/v0.2 desta spec, que fixava `offset_horario` na Parada (compartilhado por todas as viagens do itinerário).
16. **`rota` ganha `trechos[]`** (§10.3): distância e duração de cada segmento consecutivo entre paradas, computadas e congeladas junto com a rota. Serve de (a) sugestão inicial para os offsets de cada Viagem e (b) dado-fonte para o cálculo de `matriz_distancias` (soma de trechos entre duas Seções).
17. **`matriz_distancias` guarda `distancia_trecho_ida`, `distancia_trecho_volta` e `valor_adotado_de_distancia`** (média entre os dois, ou o único valor existente se o Serviço for unidirecional) — em vez de um único campo de distância. Reflete que a matriz pertence ao Serviço como um todo (Ida e Volta juntas), podendo os dois sentidos divergir levemente. **Não guarda duração** — o tempo de deslocamento já vive em `rota.trechos` (§10.3), não é duplicado aqui. **É inteiramente intra-Serviço** — nunca compara com dados de outros Serviços do Autos; a comparação entre Serviços só acontece ao preencher a `matriz_seccionamento` (§9). **Todos os campos de distância do esquema são em km** (§8, §10.2, §10.3, §9) — não há campo de distância em metros em nenhuma entidade do documento.
18. **`autos.status` (`"proposta"` \| `"vigente"`) + `data_criacao`/`data_publicacao` condicional** (§4.1) — **exceção deliberada e estreita** ao princípio de "zero gestão" da Spec 01 §3, registrada explicitamente lá. Não modela o ciclo de vida do SEI (sem rascunho/análise/aprovado, sem autor, sem prazo de vigência, sem DOE) — é só uma autodeclaração para o Comparador/Ingestor saberem o que estão lendo sem depender de nome de arquivo.
19. **`rota` ganha `pontos_de_rota[]`** (§10.4): vértices que forçam o traçado por vias específicas, persistidos **só** para reproduzir a rota forçada ao reeditar. Sem `uuid`, sem tarifa, não são Parada e não participam de `matriz_distancias`/`matriz_seccionamento` nem da regra dos 350 m; não alteram a contagem de `trechos`. Algoritmo na Spec 03 §3.6.
20. **`regra_feriado` tem 4 valores** (`"circula_inclusive_se_for_feriado"` \| `"nao_circula_em_feriado"` \| `"somente_em_feriado"` \| `"circula_em_feriado"`) — definem como o feriado interage com `dias_semana`: indiferente, suprime, condição única, ou adiciona (este último **aditivo**: também roda em qualquer feriado, mesmo fora de `dias_semana`). É **apenas informativo** (tabela/legenda/PDF): **não existe** grade nem redistribuição de horário específica de feriado, e a etiqueta **não afeta** contagem de viagens/opções de deslocamento, que usam a semana padrão (sem feriado) — **exceto** `"somente_em_feriado"`, que conta `0` nessa semana por só operar em feriado. Fecha a questão em aberto da Spec 01 §9.4; significado detalhado na Spec 03 §9. (A "redistribuição proporcional" que se cogitava para feriado era, na verdade, o recálculo de horários de passagem ao editar um horário a jusante — Spec 03 §8.2, sem relação com feriado.)
21. **`rota` ganha `fonte_calculo`, `data_calculo` e `perfil`** (§10.2): metadados que registram qual motor/instância de roteamento e qual data produziram a rota congelada. Motivados por dois pontos: (a) o servidor de demonstração do OSRM não tem SLA e pode ser trocado por instância auto-hospedada — a `fonte_calculo` rastreia a procedência; (b) rotas com mesmas paradas mas geradas em datas distantes podem divergir por mudança do mapa/OSRM, então o Comparador (Spec 05) trata divergência de `geometria`/`distancia_km` com **tolerância**, não igualdade bit-a-bit (Spec 03 §3.6.2). Ao **reabrir** um JSON, o mapa desenha `rota.geometria` congelada; o OSRM só é chamado quando o itinerário é efetivamente **alterado** (Spec 01 §8).

---

## 14. Validações Estruturais (resumo)

Validações de forma do documento — não incluem regras de negócio (tarifa, roteamento, tipificação, algoritmo de sugestão de menor distância), que ficam na Spec 03:

- `versao_schema` presente.
- Todo `uuid` (Seção, Serviço, Local, Viagem) é string em formato UUIDv4 e **único no documento inteiro, entre todas as entidades** (Seção, Serviço, Local e Viagem) — não apenas dentro da própria categoria. Inclusive Local, que apesar de não ser compartilhado entre Serviços (§7), não pode reaproveitar `uuid` de nenhuma outra entidade do mesmo documento, para o Ingestor usar `uuid` como chave sem ambiguidade (§12, Spec 01 §6).
- `autos.status` presente; exatamente um de `autos.data_criacao` (se `"proposta"`) / `autos.data_publicacao` (se `"vigente"`) presente, de acordo com `status` (§4.1).
- `autos.servicos` tem ao menos 1 elemento.
- Cada Seção em `autos.secoes`: `servicos` tem ao menos 1 elemento; cada `servico_uuid` referenciado existe em `autos.servicos` e tem ao menos uma Parada apontando para esta Seção; obrigatoriedade de `geolocalizacao_ida`/`geolocalizacao_volta` segue a direcionalidade do Serviço referenciado (§5.1); regra de centroide de 350 m (§5.2).
- Cada Local em `servico.locais`: ao menos uma geolocalização preenchida; se ambas, ≤ 350 m pareado (§7.1).
- `itinerarios` de um Serviço: 1 ou 2 elementos, com `sentido` distinto entre eles; **se os dois existem, o conjunto de Seções referenciadas por `paradas` de Ida é idêntico ao de Volta** (§2) — só os Locais comuns intermediários podem diferir entre os dois sentidos.
- `paradas` de um itinerário: mínimo 2 elementos; `ordem` estritamente crescente, começando em 1, sem lacunas; exatamente um de `secao_uuid`/`local_uuid` por Parada, com referência íntegra (§10.1); **a primeira e a última Parada (menor e maior `ordem`) referenciam uma Seção (`secao_uuid`), nunca um Local** — Locais só aparecem como paradas intermediárias (§10.1).
- `rota`: `fonte_calculo`, `data_calculo` (formato `YYYY-MM-DD`) e `perfil` presentes (§10.2).
- `rota.trechos`: exatamente `paradas.length - 1` elementos, um por par consecutivo de paradas, sem lacunas nem repetição; `rota.distancia_km` e `rota.duracao_s` iguais à soma dos respectivos campos em `trechos`.
- `rota.pontos_de_rota` (se presente): cada `apos_parada_ordem` referencia parada existente e está em `[1, paradas.length - 1]`; não altera a contagem de `trechos`; ausente/vazio é válido (§10.4).
- Ao menos 2 Seções distintas referenciadas por paradas de um Serviço, para existir ao menos um par possível em `matriz_distancias`.
- `matriz_distancias`: exatamente uma entrada por combinação não-ordenada de duas Seções distintas atendidas pelo Serviço; sem duplicatas; `distancia_trecho_ida`, `distancia_trecho_volta` e `valor_adotado_de_distancia` em **km** (§8) — nunca em metros.
- `matriz_seccionamento`: cada par referencia Seções presentes em `matriz_distancias` deste mesmo Serviço; `secao_a_uuid ≠ secao_b_uuid`; `distancia_km` presente; sem pares duplicados; mesma unidade (km) de `matriz_distancias` (§8, §9).
- `viagens` de um itinerário: mínimo 1 elemento; `dias_semana` de cada viagem: mínimo 1 elemento; `regra_feriado` presente, um de `"circula_inclusive_se_for_feriado"`/`"nao_circula_em_feriado"`/`"somente_em_feriado"`/`"circula_em_feriado"` (Spec 03 §9); `horarios_paradas` com exatamente um elemento por Parada do itinerário (mesmo conjunto de `ordem`), offsets não decrescentes por `parada_ordem`, primeiro elemento com `offset_horario = "00:00:00"`.

---

## 15. Exemplo de JSON Completo (mínimo)

Serviço único (`0000-1CR`) atendendo três Seções (Santos, São Vicente, Praia Grande) e um Local comum sem tarifa, só na Ida.

```json
{
  "versao_schema": "1.0",
  "autos": {
    "codigo": "0000",
    "tipo": "Rodoviário",
    "empresa": "Viação Exemplo Ltda.",
    "status": "proposta",
    "data_criacao": "2026-07-01",
    "secoes": [
      {
        "uuid": "4da15f36-5bbe-4f4e-90e3-68029097c1b9",
        "municipio": "Santos",
        "nome": "Terminal Central",
        "servicos": [
          {
            "servico_uuid": "b3f1c2a0-1e2d-4a3b-9c4d-5e6f7a8b9c0d",
            "geolocalizacao_ida": { "latitude": -23.9608, "longitude": -46.3339 },
            "geolocalizacao_volta": { "latitude": -23.9611, "longitude": -46.3342 }
          }
        ]
      },
      {
        "uuid": "6f51076b-aaf8-4546-8530-4da1e489c880",
        "municipio": "São Vicente",
        "nome": "Terminal Norte",
        "servicos": [
          {
            "servico_uuid": "b3f1c2a0-1e2d-4a3b-9c4d-5e6f7a8b9c0d",
            "geolocalizacao_ida": { "latitude": -23.9631, "longitude": -46.3919 },
            "geolocalizacao_volta": { "latitude": -23.9629, "longitude": -46.3915 }
          }
        ]
      },
      {
        "uuid": "63344e28-4722-4a8b-ae9d-1862e8daded4",
        "municipio": "Praia Grande",
        "nome": "Rodoviária Praia Grande",
        "servicos": [
          {
            "servico_uuid": "b3f1c2a0-1e2d-4a3b-9c4d-5e6f7a8b9c0d",
            "geolocalizacao_ida": { "latitude": -24.0084, "longitude": -46.4025 },
            "geolocalizacao_volta": { "latitude": -24.0081, "longitude": -46.4020 }
          }
        ]
      }
    ],
    "servicos": [
      {
        "uuid": "b3f1c2a0-1e2d-4a3b-9c4d-5e6f7a8b9c0d",
        "numero_n": "0000-1CR",
        "caracteristica_veiculo": "CR",
        "carater": "principal",
        "locais": [
          {
            "uuid": "c2afe932-bf0f-4338-8ff4-63cd908b9033",
            "nome": "Ponto de Embarque Praia",
            "municipio": "Praia Grande",
            "geolocalizacao_ida": { "latitude": -24.0050, "longitude": -46.3980 }
          }
        ],
        "matriz_distancias": [
          { "secao_a_uuid": "4da15f36-5bbe-4f4e-90e3-68029097c1b9", "secao_b_uuid": "6f51076b-aaf8-4546-8530-4da1e489c880", "distancia_trecho_ida": 8, "distancia_trecho_volta": 8, "valor_adotado_de_distancia": 8 },
          { "secao_a_uuid": "6f51076b-aaf8-4546-8530-4da1e489c880", "secao_b_uuid": "63344e28-4722-4a8b-ae9d-1862e8daded4", "distancia_trecho_ida": 6, "distancia_trecho_volta": 6.1, "valor_adotado_de_distancia": 6.05 },
          { "secao_a_uuid": "4da15f36-5bbe-4f4e-90e3-68029097c1b9", "secao_b_uuid": "63344e28-4722-4a8b-ae9d-1862e8daded4", "distancia_trecho_ida": 14, "distancia_trecho_volta": 14.1, "valor_adotado_de_distancia": 14.05 }
        ],
        "matriz_seccionamento": [
          { "secao_a_uuid": "4da15f36-5bbe-4f4e-90e3-68029097c1b9", "secao_b_uuid": "6f51076b-aaf8-4546-8530-4da1e489c880", "distancia_km": 8 },
          { "secao_a_uuid": "6f51076b-aaf8-4546-8530-4da1e489c880", "secao_b_uuid": "63344e28-4722-4a8b-ae9d-1862e8daded4", "distancia_km": 6.05 },
          { "secao_a_uuid": "4da15f36-5bbe-4f4e-90e3-68029097c1b9", "secao_b_uuid": "63344e28-4722-4a8b-ae9d-1862e8daded4", "distancia_km": 14.05 }
        ],
        "itinerarios": [
          {
            "sentido": "ida",
            "paradas": [
              { "ordem": 1, "secao_uuid": "4da15f36-5bbe-4f4e-90e3-68029097c1b9" },
              { "ordem": 2, "secao_uuid": "6f51076b-aaf8-4546-8530-4da1e489c880" },
              { "ordem": 3, "local_uuid": "c2afe932-bf0f-4338-8ff4-63cd908b9033" },
              { "ordem": 4, "secao_uuid": "63344e28-4722-4a8b-ae9d-1862e8daded4" }
            ],
            "rota": {
              "geometria": { "type": "LineString", "coordinates": [[-46.3339, -23.9608], [-46.3919, -23.9631], [-46.4025, -24.0084]] },
              "distancia_km": 14,
              "duracao_s": 1800,
              "fonte_calculo": "osrm:router.project-osrm.org",
              "data_calculo": "2026-07-01",
              "perfil": "driving",
              "trechos": [
                { "parada_origem_ordem": 1, "parada_destino_ordem": 2, "distancia_km": 8, "duracao_s": 1080 },
                { "parada_origem_ordem": 2, "parada_destino_ordem": 3, "distancia_km": 3.5, "duracao_s": 420 },
                { "parada_origem_ordem": 3, "parada_destino_ordem": 4, "distancia_km": 2.5, "duracao_s": 300 }
              ],
              "pontos_de_rota": [
                { "apos_parada_ordem": 1, "latitude": -23.9615, "longitude": -46.3650 }
              ]
            },
            "viagens": [
              {
                "uuid": "ba65e897-1113-4c79-922b-ae0e790f55c4",
                "horario_saida": "08:00:00",
                "dias_semana": ["segunda", "terca", "quarta", "quinta", "sexta"],
                "regra_feriado": "nao_circula_em_feriado",
                "horarios_paradas": [
                  { "parada_ordem": 1, "offset_horario": "00:00:00" },
                  { "parada_ordem": 2, "offset_horario": "00:37:00" },
                  { "parada_ordem": 3, "offset_horario": "00:52:00" },
                  { "parada_ordem": 4, "offset_horario": "01:10:00" }
                ]
              }
            ]
          },
          {
            "sentido": "volta",
            "paradas": [
              { "ordem": 1, "secao_uuid": "63344e28-4722-4a8b-ae9d-1862e8daded4" },
              { "ordem": 2, "secao_uuid": "6f51076b-aaf8-4546-8530-4da1e489c880" },
              { "ordem": 3, "secao_uuid": "4da15f36-5bbe-4f4e-90e3-68029097c1b9" }
            ],
            "rota": {
              "geometria": { "type": "LineString", "coordinates": [[-46.4020, -24.0081], [-46.3915, -23.9629], [-46.3342, -23.9611]] },
              "distancia_km": 14.1,
              "duracao_s": 1830,
              "fonte_calculo": "osrm:router.project-osrm.org",
              "data_calculo": "2026-07-01",
              "perfil": "driving",
              "trechos": [
                { "parada_origem_ordem": 1, "parada_destino_ordem": 2, "distancia_km": 6.1, "duracao_s": 750 },
                { "parada_origem_ordem": 2, "parada_destino_ordem": 3, "distancia_km": 8, "duracao_s": 1080 }
              ]
            },
            "viagens": [
              {
                "uuid": "a3d26471-1e60-403c-965b-42ed79cedd6e",
                "horario_saida": "17:30:00",
                "dias_semana": ["segunda", "terca", "quarta", "quinta", "sexta"],
                "regra_feriado": "nao_circula_em_feriado",
                "horarios_paradas": [
                  { "parada_ordem": 1, "offset_horario": "00:00:00" },
                  { "parada_ordem": 2, "offset_horario": "00:15:00" },
                  { "parada_ordem": 3, "offset_horario": "00:35:00" }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

*Notas:* `regra_feriado: "nao_circula_em_feriado"` é um dos quatro valores válidos do enum (§11, Spec 03 §9) — aqui, a Viagem opera a grade `dias_semana` mas não roda em feriado. `Ponto de Embarque Praia` é um Local comum, só na Ida, sem geolocalização de Volta — por isso não aparece nas paradas do itinerário de Volta. O `pontos_de_rota` na Ida ilustra um único vértice de forçamento no trecho entre a parada 1 e a 2 (força a rota por uma via específica); o itinerário de Volta omite o campo (default `[]` — nenhum forçamento). A `matriz_seccionamento` deste Serviço reflete o modo **"distâncias do serviço"** (Spec 03 §6.3): cada `distancia_km` é igual ao `valor_adotado_de_distancia` do mesmo par em `matriz_distancias` (`8`, `6.05`, `14.05`) — como o Autos tem um único Serviço, o modo "menor distância" daria os mesmos valores. Qualquer valor aqui poderia ainda ter sido **editado manualmente** pelo usuário após a sugestão (Spec 02 §9, Spec 03 §6.4).

Se um segundo Serviço do mesmo Autos (ex.: `0000-2CR`) também atendesse o Terminal Central de Santos, a entrada correspondente ganharia mais um elemento em `servicos`, sob a mesma Seção:

```json
{
  "uuid": "4da15f36-5bbe-4f4e-90e3-68029097c1b9",
  "municipio": "Santos",
  "nome": "Terminal Central",
  "servicos": [
    { "servico_uuid": "b3f1c2a0-1e2d-4a3b-9c4d-5e6f7a8b9c0d", "geolocalizacao_ida": { "latitude": -23.9608, "longitude": -46.3339 }, "geolocalizacao_volta": { "latitude": -23.9611, "longitude": -46.3342 } },
    { "servico_uuid": "c4a2d3b1-2f3e-4a3b-9c4d-5e6f7a8b9c0d", "geolocalizacao_ida": { "latitude": -23.9605, "longitude": -46.3335 }, "geolocalizacao_volta": { "latitude": -23.9609, "longitude": -46.3340 } }
  ]
}
```

Ambos os pontos do segundo Serviço entram no mesmo cálculo de centroide da Seção (§5.2), junto aos do primeiro.

---

## 16. Campos Explicitamente Fora do JSON

Reforçando Spec 01 §3: este esquema **não** tem, e não deve ganhar, campos de pendência, aprovação, prazo de vigência, publicação em DOE, autor, histórico de tratativas, permissões, ou qualquer outro metadado de fluxo do SEI. Esses dados vivem no SEI. A **única** exceção é `autos.status` + `data_criacao`/`data_publicacao` (§4.1) — deliberada, estreita, e documentada tanto aqui quanto na Spec 01 §3; não é uma porta aberta para outros campos de workflow. Reforçando também §9 e §12 acima: o JSON **nunca** guarda valor monetário de tarifa — só distâncias.

---

## 17. Próximos Documentos

- [ ] **Spec 03 — Regras de Negócio e Cálculo**: algoritmo de cálculo de `matriz_distancias` a partir da rota, algoritmo de sugestão de menor distância entre Serviços do Autos para `matriz_seccionamento`, tabela oficial de tarifa a partir de `distancia_km` (fora do JSON), algoritmo de roteamento/chamada OSRM e pontos de rota (§10.4), algoritmo de centroide para a regra de 350 m (§5.2), sugestão/redistribuição dos horários de passagem, enum de `regra_feriado` (4 valores), regras de tipificação (`tipo` × `caracteristica_veiculo` permitido).
- [ ] **Spec 04 — Formulário**: UI, mapa, import/export deste JSON, geração do PDF operacional.
- [ ] **Spec 05 — Comparador**: diff entre dois documentos deste esquema, PDF comparativo.
- [ ] **Spec 06 — Ingestor + Modelo PostgreSQL**: mapeamento deste esquema para tabelas relacionais, reaproveitando as UUIDs como chave.
