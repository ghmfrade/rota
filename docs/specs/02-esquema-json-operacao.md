# Spec 02 — Esquema do JSON de Operação

**Projeto:** ROTA — Registro de Operação e Tabelas de Autos
**Depende de:** [Spec 01 — Visão Geral do Sistema](01-visao-geral.md)
**Status:** Em definição — v0.4
**Escopo:** O contrato de dados — entidades, campos, tipos, regras de UUID e validações estruturais do JSON de operação. **Não é escopo desta spec:** fórmulas de tarifa (valor em R$), algoritmo de roteamento, algoritmo de redistribuição de horário em feriado, regras de tipificação, algoritmo exato de sugestão de menor distância (isso é a [Spec 03](03-regras-de-negocio-calculo.md)).

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
   ├─ secoes[]                     (compartilhadas entre todos os Serviços do Autos)
   │  ├─ uuid, municipio, nome
   │  └─ servicos[]                 (uma entrada por Serviço que usa esta Seção)
   │     └─ servico_uuid, geolocalizacao_ida?, geolocalizacao_volta?
   └─ servicos[]
      ├─ uuid, numero_n, caracteristica_veiculo, carater
      ├─ locais[]                   (pontos comuns — sem tarifa — só deste Serviço)
      │  └─ uuid, nome, municipio, geolocalizacao_ida?, geolocalizacao_volta?
      ├─ matriz_distancias[]        ({ secao_a_uuid, secao_b_uuid, distancia_m }) — todos os pares, computada
      ├─ matriz_seccionamento[]     ({ secao_a_uuid, secao_b_uuid, distancia_km }) — pares habilitados p/ passagem parcial
      └─ itinerarios[]              (1 ou 2: sentido "ida" e/ou "volta")
         ├─ sentido
         ├─ paradas[]                (ordenadas; cada uma referencia UMA Seção OU UM Local)
         │  └─ ordem, secao_uuid? | local_uuid?
         ├─ rota { geometria, distancia_m, duracao_s, trechos[] }
         │  └─ trechos[]: parada_origem_ordem, parada_destino_ordem, distancia_m, duracao_s
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
| `secoes` | array\<Seção\> | Sim | Seções compartilhadas entre os Serviços deste Autos. Ver §5. |
| `servicos` | array\<Serviço\> | Sim | Mínimo 1 item. Ver §6. |

`codigo`, `tipo` e `empresa` vêm das listas estáticas do Formulário ou, ao carregar um JSON vigente, do próprio JSON — desde que os três valores existam nas listas disponíveis no momento (regra de bloqueio de carregamento, Spec 01 §8).

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

---

## 6. Serviço

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `uuid` | string (UUIDv4) | Sim | Identidade estável do Serviço. Gerada client-side (`crypto.randomUUID()`) na criação; preservada em reimportações (Spec 01 §6). |
| `numero_n` | string | Sim | Rótulo de display, formato `"0000-NXX"` (ex.: `"0000-1RO"`). Não é identidade — apenas exibição. |
| `caracteristica_veiculo` | enum | Sim | `RO` \| `ROL` \| `EX` \| `LE` \| `SL` \| `MLEX` \| `MLRO` \| `MEXR` \| `MLES` \| `MEXS` \| `MROS` \| `MIST` (Spec 01 §7). Quais valores são permitidos por `tipo` de Autos é regra de negócio da Spec 03. |
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

Pertence ao Serviço. Contém a distância, em metros, entre **cada par possível** de Seções atendidas por este Serviço — todas as combinações, não apenas pares consecutivos na rota (ex.: um Serviço que passa por A, B, C e D tem entradas para AB, AC, AD, BC, BD e CD).

É o dado bruto que (i) alimenta a sugestão de preenchimento da `matriz_seccionamento` (a menor distância para aquele par de Seções, dentre todos os Serviços do Autos que os atendem) e (ii) permite ao Comparador auditar a coerência das distâncias entre versões.

**ParDistância** (elemento do array):

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `secao_a_uuid` | string (UUIDv4) | Sim | `uuid` de uma Seção atendida por este Serviço. |
| `secao_b_uuid` | string (UUIDv4) | Sim | Idem, distinto de `secao_a_uuid`. |
| `distancia_m` | number | Sim | Distância entre as duas Seções, em metros, computada a partir da rota deste Serviço. |

Congelada no momento da geração do JSON — o Comparador e o Ingestor apenas leem o valor, sem recalcular (mesmo princípio de `rota`, §10.2). Cada `distancia_m` aqui é obtida somando os `trechos` de `rota` (§10.2) entre as posições das duas Seções na sequência de paradas de um dos itinerários deste Serviço. O algoritmo exato (a partir de qual sentido, tratamento de ida/volta divergentes) é definido na Spec 03.

Validação estrutural: deve existir exatamente uma entrada para cada combinação não-ordenada de duas Seções distintas referenciadas por paradas deste Serviço (união de Ida e Volta); `secao_a_uuid ≠ secao_b_uuid`; sem entradas duplicadas.

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

O Formulário sugere, como valor inicial de `distancia_km`, a **menor distância encontrada** para esse mesmo par de Seções dentre as `matriz_distancias` de **todos** os Serviços do Autos que atendem ambas — não apenas deste Serviço. Essa sugestão é um cálculo de UI (Spec 03/04); o que o JSON guarda é sempre o valor final confirmado/editado pelo usuário, não a sugestão em si.

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

Validações referenciais:
- Se `secao_uuid` presente: deve existir, em `autos.secoes[secao_uuid].servicos`, uma entrada cujo `servico_uuid` seja o Serviço que contém esta Parada, e essa entrada deve ter `geolocalizacao_<sentido deste itinerário>` preenchida.
- Se `local_uuid` presente: o Local referenciado (em `servico.locais` do mesmo Serviço) deve ter `geolocalizacao_<sentido deste itinerário>` preenchida.

A Parada **não** carrega horário — o tempo de passagem por cada parada é dado por Viagem (§11), já que o mesmo conjunto de paradas pode ter offsets diferentes entre viagens (trânsito).

### 10.2 Rota

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `geometria` | object (GeoJSON `LineString`) | Sim | Coordenadas `[longitude, latitude]` da rota street-snapped, retornada pelo OSRM, para este sentido, ponta a ponta. |
| `distancia_m` | number | Sim | Distância total roteada, em metros. Igual à soma de `trechos[].distancia_m`. |
| `duracao_s` | number | Sim | Duração total estimada, em segundos, retornada pelo OSRM (sem trânsito — baseline). Igual à soma de `trechos[].duracao_s`. |
| `trechos` | array\<Trecho\> | Sim | Distância e duração de cada segmento consecutivo entre paradas deste itinerário. Ver §10.3. |

`rota`, incluindo `trechos`, é calculada e congelada no momento da geração do JSON — o Comparador e o Ingestor não recalculam contra o OSRM, apenas leem o que está no documento (consistente com Spec 01 §8: "distância alimenta a tarifa, então não se prossegue com rota não roteada").

### 10.3 Trecho (elemento de `rota.trechos`)

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `parada_origem_ordem` | integer | Sim | `ordem` da Parada de origem deste trecho. |
| `parada_destino_ordem` | integer | Sim | `ordem` da Parada de destino deste trecho — deve ser a próxima parada na sequência (`parada_origem_ordem + 1`). |
| `distancia_m` | number | Sim | Distância roteada entre as duas paradas, em metros. |
| `duracao_s` | number | Sim | Duração estimada entre as duas paradas, em segundos (sem trânsito — baseline do OSRM). Serve de sugestão inicial para o offset de cada Viagem (§11), que o usuário pode ajustar. |

Validação estrutural: `rota.trechos` tem exatamente `paradas.length - 1` elementos, um para cada par consecutivo de paradas (por `ordem`), sem lacunas nem repetição.

---

## 11. Viagem

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `uuid` | string (UUIDv4) | Sim | Identidade estável da viagem. Mesma regra de Seção/Serviço/Local: gerada client-side na criação, preservada em reimportações. Permite ao Comparador reportar "viagem das 08:00 adiantada para 08:15" em vez de "removeu uma, criou outra". |
| `horario_saida` | string (`HH:MM:SS`) | Sim | Horário absoluto de saída desta viagem, a partir da primeira parada do itinerário. |
| `dias_semana` | array\<enum\> | Sim | Mínimo 1 elemento, sem repetição. Valores: `"segunda"`, `"terca"`, `"quarta"`, `"quinta"`, `"sexta"`, `"sabado"`, `"domingo"`. |
| `regra_feriado` | enum | Sim | Valores do enum **a definir na Spec 03**, junto do algoritmo de redistribuição proporcional de horários (Spec 01 §9.4 — questão em aberto que permanece aberta nesta spec). |
| `horarios_paradas` | array\<HorárioParada\> | Sim | Offset de passagem, a partir de `horario_saida`, para cada Parada do itinerário — específico desta Viagem. Ver §11.1. |

### 11.1 HorárioParada (elemento de `viagem.horarios_paradas`)

Todo o conjunto de paradas de um itinerário é fixo (definido em `itinerario.paradas`) e compartilhado por todas as suas Viagens — mas o **tempo** entre elas varia de viagem para viagem (trânsito difere por horário do dia), por isso o offset é dado aqui, por Viagem, e não na Parada.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `parada_ordem` | integer | Sim | `ordem` da Parada (em `itinerario.paradas`) a que este horário se refere. |
| `offset_horario` | string (`HH:MM:SS`) | Sim | Tempo decorrido desde `horario_saida` desta Viagem até a passagem por esta parada. Editável pelo usuário na UI (sugestão inicial vem de `rota.trechos`, acumulados — Spec 03/04 define o algoritmo de sugestão). |

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
- Duas entidades da mesma categoria nunca compartilham UUID dentro do mesmo documento (unicidade de `uuid` é validação estrutural). Para Local, a unicidade é dentro do escopo do Serviço; para Seção, Serviço e Viagem, é no documento inteiro.
- `numero_n` (Serviço) é apenas rótulo de display — não deve ser usado como chave de identidade em nenhuma lógica de diff ou persistência.

Diff resultante no Comparador (Spec 01 §6, estendido a Seção, Local e Viagem):
- mesma UUID nos dois JSONs → mesma entidade, compara campo a campo;
- UUID só no vigente → removida/cancelada;
- UUID só na proposta → nova.

---

## 13. Decisões Fechadas Nesta Spec

Histórico completo — v0.1 → v0.3 desta spec:

1. **UUID em Viagem: obrigatória.** Mesma regra de Seção/Serviço/Local (§12).
2. **Caráter do itinerário: campo explícito** (`carater` em Serviço), não derivado do conjunto de paradas.
3. **Horário na parada: offset relativo.** `offset_horario` na Parada, resolvido em horário absoluto por Viagem via `horario_saida + offset_horario`.
4. **Viagem pertence ao Itinerário**, não ao Serviço — uma viagem é sempre de um sentido específico.
5. **Seção é entidade do Autos** (`autos.secoes[]`), compartilhada entre todos os Serviços do Autos que a utilizam — não mais uma entidade do Serviço. Isso permite montar, por Serviço, uma matriz de distâncias entre Seções e comparar essas matrizes entre Serviços do mesmo Autos. **Supera** a decisão v0.2 desta spec, que tratava Seção como um "Local com papel=secao" dentro do Serviço.
6. **Campo `papel` eliminado.** O tipo do ponto é dado implicitamente pela coleção que o contém: `autos.secoes` é sempre Seção; `servico.locais` é sempre Local comum.
7. **Local (comum) permanece no Serviço**, sem compartilhamento entre Serviços, sem participação em matriz de distâncias ou de seccionamento.
8. **Regra de 350 m para Seção é por centroide cumulativo** (§5.2) — cada novo ponto (Ida ou Volta, de qualquer Serviço) deve estar a ≤350 m do centroide de todos os pontos já aceitos naquela Seção. Substitui a checagem pareada Ida×Volta de uma única entidade, usada na v0.2 desta spec.
9. **Regra de 350 m para Local (comum) continua pareada** (Ida × Volta do mesmo Local, um único Serviço envolvido) — sem clustering multi-serviço, já que Local não é compartilhado.
10. **Matriz de distâncias (`matriz_distancias`) criada, por Serviço** — todas as combinações de pares de Seções atendidas, com distância em metros, computada/congelada a partir da rota.
11. **Matriz de seccionamento ganha `distancia_km`** — valor de referência em km, confirmado pelo usuário por par habilitado. A menor distância entre Serviços do Autos (via `matriz_distancias`) serve só de sugestão de preenchimento na UI — não é persistida separadamente no JSON.
12. **JSON nunca guarda valor monetário (R$) de tarifa.** O cálculo do valor final a partir da distância é feito externamente, por portaria publicada — inteiramente fora do escopo do ROTA.
13. **Parada referencia exatamente um de `secao_uuid` ou `local_uuid`** (XOR) — nunca ambos, nunca nenhum.
14. **Versionamento de schema: incluído** (`versao_schema` na raiz), por ser metadado estrutural do contrato, não de fluxo.
15. **`offset_horario` migrou de Parada para Viagem** (`viagem.horarios_paradas[]`). O mesmo itinerário (mesma sequência física de paradas) pode ter viagens com offsets diferentes entre as paradas, pois o trânsito varia por horário — o offset por parada é, portanto, dado por Viagem, e a UX deve permitir o usuário ajustá-lo livremente. **Supera** a decisão v0.1/v0.2 desta spec, que fixava `offset_horario` na Parada (compartilhado por todas as viagens do itinerário).
16. **`rota` ganha `trechos[]`** (§10.3): distância e duração de cada segmento consecutivo entre paradas, computadas e congeladas junto com a rota. Serve de (a) sugestão inicial para os offsets de cada Viagem e (b) dado-fonte para o cálculo de `matriz_distancias` (soma de trechos entre duas Seções).

Permanece em aberto (Spec 01 §9.4): **valores do enum `regra_feriado`**, a definir na Spec 03 junto do algoritmo de redistribuição.

---

## 14. Validações Estruturais (resumo)

Validações de forma do documento — não incluem regras de negócio (tarifa, roteamento, tipificação, algoritmo de sugestão de menor distância), que ficam na Spec 03:

- `versao_schema` presente.
- Todo `uuid` (Seção, Serviço, Local, Viagem) é string em formato UUIDv4; único dentro da sua categoria e escopo (Local: dentro do Serviço; Seção/Serviço/Viagem: no documento inteiro).
- `autos.servicos` tem ao menos 1 elemento.
- Cada Seção em `autos.secoes`: `servicos` tem ao menos 1 elemento; cada `servico_uuid` referenciado existe em `autos.servicos` e tem ao menos uma Parada apontando para esta Seção; obrigatoriedade de `geolocalizacao_ida`/`geolocalizacao_volta` segue a direcionalidade do Serviço referenciado (§5.1); regra de centroide de 350 m (§5.2).
- Cada Local em `servico.locais`: ao menos uma geolocalização preenchida; se ambas, ≤ 350 m pareado (§7.1).
- `itinerarios` de um Serviço: 1 ou 2 elementos, com `sentido` distinto entre eles.
- `paradas` de um itinerário: mínimo 2 elementos; `ordem` estritamente crescente, começando em 1, sem lacunas; exatamente um de `secao_uuid`/`local_uuid` por Parada, com referência íntegra (§10.1).
- `rota.trechos`: exatamente `paradas.length - 1` elementos, um por par consecutivo de paradas, sem lacunas nem repetição; `rota.distancia_m` e `rota.duracao_s` iguais à soma dos respectivos campos em `trechos`.
- Ao menos 2 Seções distintas referenciadas por paradas de um Serviço (união de Ida e Volta), para existir ao menos um par possível em `matriz_distancias`.
- `matriz_distancias`: exatamente uma entrada por combinação não-ordenada de duas Seções distintas atendidas pelo Serviço; sem duplicatas.
- `matriz_seccionamento`: cada par referencia Seções presentes em `matriz_distancias` deste mesmo Serviço; `secao_a_uuid ≠ secao_b_uuid`; `distancia_km` presente; sem pares duplicados.
- `viagens` de um itinerário: mínimo 1 elemento; `dias_semana` de cada viagem: mínimo 1 elemento; `horarios_paradas` com exatamente um elemento por Parada do itinerário (mesmo conjunto de `ordem`), offsets não decrescentes por `parada_ordem`, primeiro elemento com `offset_horario = "00:00:00"`.

---

## 15. Exemplo de JSON Completo (mínimo)

Serviço único (`0000-1RO`) atendendo três Seções (Santos, São Vicente, Praia Grande) e um Local comum sem tarifa, só na Ida.

```json
{
  "versao_schema": "1.0",
  "autos": {
    "codigo": "0000",
    "tipo": "Rodoviário",
    "empresa": "Viação Exemplo Ltda.",
    "secoes": [
      {
        "uuid": "sec-0001-4a3b-9c4d-5e6f7a8b9c0d",
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
        "uuid": "sec-0002-4a3b-9c4d-5e6f7a8b9c0d",
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
        "uuid": "sec-0003-4a3b-9c4d-5e6f7a8b9c0d",
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
        "numero_n": "0000-1RO",
        "caracteristica_veiculo": "RO",
        "carater": "principal",
        "locais": [
          {
            "uuid": "loc-0001-4a3b-9c4d-5e6f7a8b9c0d",
            "nome": "Ponto de Embarque Praia",
            "municipio": "Praia Grande",
            "geolocalizacao_ida": { "latitude": -24.0050, "longitude": -46.3980 }
          }
        ],
        "matriz_distancias": [
          { "secao_a_uuid": "sec-0001-4a3b-9c4d-5e6f7a8b9c0d", "secao_b_uuid": "sec-0002-4a3b-9c4d-5e6f7a8b9c0d", "distancia_m": 8000 },
          { "secao_a_uuid": "sec-0002-4a3b-9c4d-5e6f7a8b9c0d", "secao_b_uuid": "sec-0003-4a3b-9c4d-5e6f7a8b9c0d", "distancia_m": 6000 },
          { "secao_a_uuid": "sec-0001-4a3b-9c4d-5e6f7a8b9c0d", "secao_b_uuid": "sec-0003-4a3b-9c4d-5e6f7a8b9c0d", "distancia_m": 14000 }
        ],
        "matriz_seccionamento": [
          { "secao_a_uuid": "sec-0001-4a3b-9c4d-5e6f7a8b9c0d", "secao_b_uuid": "sec-0002-4a3b-9c4d-5e6f7a8b9c0d", "distancia_km": 8 },
          { "secao_a_uuid": "sec-0002-4a3b-9c4d-5e6f7a8b9c0d", "secao_b_uuid": "sec-0003-4a3b-9c4d-5e6f7a8b9c0d", "distancia_km": 6 },
          { "secao_a_uuid": "sec-0001-4a3b-9c4d-5e6f7a8b9c0d", "secao_b_uuid": "sec-0003-4a3b-9c4d-5e6f7a8b9c0d", "distancia_km": 14 }
        ],
        "itinerarios": [
          {
            "sentido": "ida",
            "paradas": [
              { "ordem": 1, "secao_uuid": "sec-0001-4a3b-9c4d-5e6f7a8b9c0d" },
              { "ordem": 2, "secao_uuid": "sec-0002-4a3b-9c4d-5e6f7a8b9c0d" },
              { "ordem": 3, "local_uuid": "loc-0001-4a3b-9c4d-5e6f7a8b9c0d" },
              { "ordem": 4, "secao_uuid": "sec-0003-4a3b-9c4d-5e6f7a8b9c0d" }
            ],
            "rota": {
              "geometria": { "type": "LineString", "coordinates": [[-46.3339, -23.9608], [-46.3919, -23.9631], [-46.4025, -24.0084]] },
              "distancia_m": 14000,
              "duracao_s": 1800,
              "trechos": [
                { "parada_origem_ordem": 1, "parada_destino_ordem": 2, "distancia_m": 8000, "duracao_s": 1080 },
                { "parada_origem_ordem": 2, "parada_destino_ordem": 3, "distancia_m": 3500, "duracao_s": 420 },
                { "parada_origem_ordem": 3, "parada_destino_ordem": 4, "distancia_m": 2500, "duracao_s": 300 }
              ]
            },
            "viagens": [
              {
                "uuid": "via-0001-4a3b-9c4d-5e6f7a8b9c0d",
                "horario_saida": "08:00:00",
                "dias_semana": ["segunda", "terca", "quarta", "quinta", "sexta"],
                "regra_feriado": "nao_circula",
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
              { "ordem": 1, "secao_uuid": "sec-0003-4a3b-9c4d-5e6f7a8b9c0d" },
              { "ordem": 2, "secao_uuid": "sec-0002-4a3b-9c4d-5e6f7a8b9c0d" },
              { "ordem": 3, "secao_uuid": "sec-0001-4a3b-9c4d-5e6f7a8b9c0d" }
            ],
            "rota": {
              "geometria": { "type": "LineString", "coordinates": [[-46.4020, -24.0081], [-46.3915, -23.9629], [-46.3342, -23.9611]] },
              "distancia_m": 14100,
              "duracao_s": 1830,
              "trechos": [
                { "parada_origem_ordem": 1, "parada_destino_ordem": 2, "distancia_m": 6100, "duracao_s": 750 },
                { "parada_origem_ordem": 2, "parada_destino_ordem": 3, "distancia_m": 8000, "duracao_s": 1080 }
              ]
            },
            "viagens": [
              {
                "uuid": "via-0002-4a3b-9c4d-5e6f7a8b9c0d",
                "horario_saida": "17:30:00",
                "dias_semana": ["segunda", "terca", "quarta", "quinta", "sexta"],
                "regra_feriado": "nao_circula",
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

*Notas:* `regra_feriado: "nao_circula"` é um placeholder ilustrativo — o enum real é definido na Spec 03. `Ponto de Embarque Praia` é um Local comum, só na Ida, sem geolocalização de Volta — por isso não aparece nas paradas do itinerário de Volta.

Se um segundo Serviço do mesmo Autos (ex.: `0000-2RO`) também atendesse o Terminal Central de Santos, a entrada correspondente ganharia mais um elemento em `servicos`, sob a mesma Seção:

```json
{
  "uuid": "sec-0001-4a3b-9c4d-5e6f7a8b9c0d",
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

Reforçando Spec 01 §3: este esquema **não** tem, e não deve ganhar, campos de status/ciclo de vida, pendência, aprovação, data de vigência, autor, histórico de tratativas, ou qualquer metadado de fluxo. Esses dados vivem no SEI. Reforçando também §9 e §12 acima: o JSON **nunca** guarda valor monetário de tarifa — só distâncias.

---

## 17. Próximos Documentos

- [ ] **Spec 03 — Regras de Negócio e Cálculo**: algoritmo de cálculo de `matriz_distancias` a partir da rota, algoritmo de sugestão de menor distância entre Serviços do Autos para `matriz_seccionamento`, tabela oficial de tarifa a partir de `distancia_km` (fora do JSON), algoritmo de roteamento/chamada OSRM, algoritmo de centroide para a regra de 350 m (§5.2), enum e algoritmo de `regra_feriado`, regras de tipificação (`tipo` × `caracteristica_veiculo` permitido).
- [ ] **Spec 04 — Formulário**: UI, mapa, import/export deste JSON, geração do PDF operacional.
- [ ] **Spec 05 — Comparador**: diff entre dois documentos deste esquema, PDF comparativo.
- [ ] **Spec 06 — Ingestor + Modelo PostgreSQL**: mapeamento deste esquema para tabelas relacionais, reaproveitando as UUIDs como chave.
