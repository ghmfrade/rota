Preciso que você altere as especificações existentes para incluir, no JSON, na UX e no PDF operacional, a **descrição textual do itinerário por nomes de ruas/vias**, separada por Serviço e por sentido (`ida` e `volta`).

Arquivos que devem ser analisados e alterados:

- `01-visao-geral.md`
- `02-esquema-json-operacao.md`
- `03-regras-de-negocio-calculo.md`
- `04-formulario-ux-pdf.md`

## Objetivo da alteração

Hoje o sistema já guarda a rota georreferenciada no JSON (`rota.geometria`), os trechos entre paradas (`rota.trechos`) e os pontos de rota usados para forçar o traçado. Agora o sistema também deve guardar e apresentar uma **descrição textual do itinerário**, contendo:

- as **Seções** por onde o Serviço passa;
- os **nomes das ruas, avenidas, rodovias ou vias** percorridas entre essas Seções;
- um texto separado para cada sentido: **Ida** e **Volta**;
- o texto dentro do JSON, apresentado na UX e impresso no PDF operacional.

A descrição deve considerar **somente as Seções** como marcos do itinerário.
**Locais comuns não devem aparecer na descrição textual do itinerário**, mesmo que existam no itinerário e mesmo que estejam entre duas Seções.

Exemplo conceitual:

```text
Cidade A - Seção A, Rua Treta, Rua José, Avenida Santo Antônio, Rua Alberto Roberto, Rua Albertinho, Cidade B - Seção B, Avenida Santo Antônio, Cidade C - Seção C.
```

Esse texto representa a descrição do itinerário da **Ida**.

Para a Volta, deve existir descrição própria, baseada no itinerário e no traçado da Volta.

## Diretriz de modelagem

A descrição textual do itinerário deve ser tratada como **dado derivado da rota roteirizada**, calculado no Formulário no momento em que a rota é gerada ou recalculada, e **congelado no JSON** junto com `rota.geometria`, `rota.trechos`, `rota.distancia_km` e `rota.duracao_s`.

O Comparador, o PDF e o Ingestor devem apenas ler esse campo do JSON. Eles não devem recalcular a descrição textual contra o OSRM.

## Alterações esperadas na Spec 02 — Esquema do JSON

Atualize a estrutura do JSON para incluir, dentro de cada `itinerario`, ou dentro de `itinerario.rota`, um campo próprio para a descrição textual por vias.

Use preferencialmente esta estrutura dentro de `rota`:

```json
"rota": {
  "geometria": { "...": "..." },
  "distancia_km": 0,
  "duracao_s": 0,
  "descricao_itinerario": {
    "texto": "Cidade A - Seção A, Rua Treta, Avenida Santo Antônio, Cidade B - Seção B, Cidade C - Seção C.",
    "itens": [
      {
        "tipo": "secao",
        "secao_uuid": "uuid-da-secao-a",
        "rotulo": "Cidade A - Seção A"
      },
      {
        "tipo": "via",
        "nome": "Rua Treta"
      },
      {
        "tipo": "via",
        "nome": "Avenida Santo Antônio"
      },
      {
        "tipo": "secao",
        "secao_uuid": "uuid-da-secao-b",
        "rotulo": "Cidade B - Seção B"
      }
    ]
  },
  "trechos": [],
  "pontos_de_rota": []
}
```

Pode ajustar o nome dos campos se encontrar nomenclatura melhor, mas mantenha o conceito:

- `texto`: string pronta para exibição em UX/PDF.
- `itens`: lista estruturada para permitir comparação futura e renderização mais controlada.
- Cada item deve ser `tipo = "secao"` ou `tipo = "via"`.
- Item `secao` deve referenciar `secao_uuid` e trazer o `rotulo` no padrão já usado na UX: `Cidade - Nome da Seção`.
- Item `via` deve conter o nome da rua/avenida/rodovia/via.
- Locais comuns **não entram** em `descricao_itinerario.itens`.
- Pontos de rota **não entram** como itens próprios; eles apenas influenciam a rota e, por consequência, os nomes das vias.
- A descrição é por itinerário; portanto, um Serviço com Ida e Volta terá uma descrição para a Ida e outra para a Volta.

Inclua a nova estrutura:

1. Na árvore geral do documento.
2. Na seção de `Itinerário`.
3. Na seção de `Rota`.
4. Nas validações estruturais.
5. No exemplo de JSON completo.

Validações estruturais esperadas:

- `descricao_itinerario.texto` deve existir quando `rota` existir.
- `descricao_itinerario.itens` deve ter pelo menos dois itens de `tipo = "secao"`, correspondendo à primeira e à última Seção do itinerário.
- O primeiro item deve ser a primeira Seção do itinerário.
- O último item deve ser a última Seção do itinerário.
- Todos os itens `secao` devem referenciar Seções presentes em `paradas[]` do itinerário.
- Itens `secao` devem aparecer na mesma ordem em que as Seções aparecem no itinerário.
- Locais comuns não podem aparecer na descrição.
- Vias sem nome podem ser omitidas ou agrupadas como `"via sem nome"` apenas se isso for explicitamente definido na regra de negócio da Spec 03.

## Alterações esperadas na Spec 03 — Regras de Negócio e Cálculo

Crie uma seção nova sobre o cálculo da `descricao_itinerario`.

Essa regra deve ficar próxima da seção de roteamento/OSRM, porque a descrição textual depende da rota calculada.

Explique que a descrição do itinerário é derivada de três fontes:

1. Sequência ordenada de paradas do itinerário.
2. Lista de Seções presentes nessa sequência.
3. Nomes das vias retornados pelo roteamento/OSRM.

A regra principal:

- A descrição textual deve intercalar:
  - Seção inicial;
  - nomes das vias percorridas até a próxima Seção;
  - próxima Seção;
  - nomes das vias até a próxima Seção;
  - e assim por diante, até a Seção final.

Exemplo:

```text
Cidade A - Seção A, Rua 1, Avenida 2, Cidade B - Seção B, Rodovia 3, Cidade C - Seção C.
```

### Importante: considerar apenas Seções

A descrição deve usar **somente Seções** como marcos.

Se o itinerário real for:

```text
Seção A → Local 1 → Local 2 → Seção B → Local 3 → Seção C
```

A descrição textual deve ser montada como:

```text
Seção A, vias entre A e B, Seção B, vias entre B e C, Seção C
```

Os Locais 1, 2 e 3 não aparecem no texto.

Eles continuam existindo normalmente no JSON, na rota, nos trechos, nos horários internos e nos cálculos.
Só não entram na descrição textual do itinerário.

### Extração dos nomes de vias

Altere a regra atual do OSRM, que usa `steps=false`, para prever a obtenção dos nomes de vias.

Defina que, para gerar `descricao_itinerario`, o Formulário deve obter os nomes das vias percorridas entre as paradas. Uma forma aceitável é usar `steps=true` na chamada ao OSRM, aproveitando os nomes dos steps retornados.

A especificação deve deixar claro:

- A geometria continua vindo de `overview=full&geometries=geojson`.
- Os nomes de vias vêm dos steps/manobras/segmentos retornados pelo roteador.
- A granularidade final da descrição não é por manobra, mas por **sequência limpa de nomes de vias**.
- Nomes vazios, repetidos consecutivamente ou irrelevantes devem ser tratados.

### Limpeza e normalização dos nomes das vias

Defina regras claras:

- Remover nomes vazios, nulos ou apenas espaços.
- Remover repetições consecutivas da mesma via.
  - Exemplo: `Rua A, Rua A, Rua A` vira `Rua A`.

- Preservar repetições não consecutivas quando fizer sentido.
  - Exemplo: `Rua A, Avenida B, Rua A` pode permanecer, porque a rota pode realmente retornar à mesma via.

- Padronizar espaços.
- Não inventar nomes de ruas que não vieram do roteamento.
- Se o roteador retornar trecho sem nome, decidir entre:
  - omitir o trecho sem nome; ou
  - usar marcador padronizado `"via sem nome"`.

- Escolha uma das alternativas acima e documente. Preferencialmente, omitir vias sem nome para evitar poluir o PDF.

### Associação entre vias e Seções

Defina como associar as vias aos intervalos entre Seções.

Como `rota.trechos` é por paradas consecutivas e pode conter Locais intermediários, a descrição deve somar/concatenar os nomes de vias de todos os trechos existentes entre duas Seções consecutivas.

Exemplo:

Paradas:

```text
1. Seção A
2. Local X
3. Local Y
4. Seção B
5. Local Z
6. Seção C
```

Para a descrição:

- Bloco A → B:
  - considerar os trechos 1→2, 2→3 e 3→4;
  - extrair os nomes de vias desses trechos;
  - inserir tudo entre `Seção A` e `Seção B`.

- Bloco B → C:
  - considerar os trechos 4→5 e 5→6;
  - extrair os nomes de vias desses trechos;
  - inserir tudo entre `Seção B` e `Seção C`.

### Relação com pontos de rota

Pontos de rota continuam não sendo Seção, Local nem Parada.

Eles não aparecem na descrição textual como itens próprios.

Porém, como eles forçam o traçado, eles podem alterar as vias retornadas pelo roteamento. Portanto:

- mover/adicionar/remover ponto de rota recalcula `rota.geometria`;
- recalcula `rota.trechos`;
- recalcula `matriz_distancias`;
- e também recalcula `descricao_itinerario`.

### Congelamento no JSON

Explique que a descrição textual é congelada no JSON junto com a rota.

Ao abrir um JSON existente:

- o Formulário deve exibir a descrição textual já gravada;
- não deve chamar OSRM automaticamente só para recompor a descrição;
- se o usuário alterar o itinerário, coordenadas ou pontos de rota, aí sim a rota e a descrição devem ser recalculadas.

### Casos de borda

Inclua regras para:

- rota sem nome de via em parte do caminho;
- via repetida muitas vezes;
- itinerário com Locais entre Seções;
- itinerário com apenas duas Seções;
- Serviço unidirecional;
- Serviço bidirecional com Ida e Volta diferentes;
- erro de roteamento: se não existe rota calculada, não existe descrição válida.

## Alterações esperadas na Spec 04 — UX, Mapa e PDF

Atualize a UX para exibir e permitir revisar a descrição textual do itinerário por ruas.

### Na etapa de mapa / itinerário

Adicionar, para cada Serviço e sentido, um painel chamado algo como:

```text
Descrição textual do itinerário
```

Esse painel deve mostrar:

- Sentido: Ida ou Volta.
- Texto gerado automaticamente:
  - `Cidade A - Seção A, Rua X, Avenida Y, Cidade B - Seção B...`

- Lista estruturada opcional:
  - Seções destacadas visualmente.
  - Vias em texto simples.

- Botão ou ação:
  - “Recalcular descrição”
  - “Copiar texto”
  - “Ver itens estruturados”

- Indicação de que o texto é gerado automaticamente a partir da rota roteirizada.

Não permitir que o usuário edite livremente o texto, pelo menos nesta versão, para evitar divergência entre geometria e descrição textual.

Se quiser prever edição manual, trate como exceção controlada e documente um campo separado, como `descricao_manual`, mas preferencialmente **não implemente edição manual agora**.

### Na revisão antes da exportação

Incluir a descrição textual do itinerário na etapa de Revisão:

Para cada Serviço:

```text
Serviço 0000-NXX — Ida
Descrição do itinerário:
Cidade A - Seção A, Rua X, Avenida Y, Cidade B - Seção B...
```

E o mesmo para Volta, quando existir.

Pendência bloqueante:

- Se `rota` existir mas `descricao_itinerario` estiver vazia ou inválida, bloquear exportação do JSON/PDF.

### No PDF operacional

Atualizar a seção “Itinerários por Serviço e sentido”.

Hoje ela já deve apresentar a sequência de Seções e imagem do mapa. Agora deve apresentar também a descrição textual por vias.

Para cada Serviço e sentido, o PDF deve exibir:

1. Título:
   - `Serviço 0000-NXX — Ida`
   - `Serviço 0000-NXX — Volta`

2. Sequência resumida de Seções:
   - `Cidade A - Seção A → Cidade B - Seção B → Cidade C - Seção C`

3. Descrição textual do itinerário:
   - `Cidade A - Seção A, Rua Treta, Avenida Santo Antônio, Cidade B - Seção B, Rodovia X, Cidade C - Seção C.`

4. Mapa do itinerário.

Regras do PDF:

- Locais comuns não aparecem na descrição textual principal.
- Locais comuns continuam podendo aparecer apenas no anexo técnico, como já definido.
- A descrição deve quebrar linha de forma legível.
- Se o texto for muito longo, manter no corpo do serviço, com quebra de linhas, e não transformar em tabela ilegível.
- Seções devem poder aparecer com destaque visual, se isso for viável no PDF.
- Não inserir valores monetários.

### Critérios de aceite na Spec 04

Adicionar critérios de aceite específicos:

- O usuário visualiza, para cada Serviço e sentido, a descrição textual do itinerário por nomes de vias.
- A descrição é recalculada quando a rota é recalculada.
- A descrição não mostra Locais comuns.
- O PDF operacional apresenta a descrição textual do itinerário por Serviço e sentido.
- O JSON exportado contém a descrição textual e a lista estruturada de itens.
- Ao carregar um JSON existente, o sistema exibe a descrição gravada sem recalcular automaticamente.

## Alterações esperadas na Spec 01 — Visão Geral

Atualize a visão geral apenas no necessário, sem repetir regras detalhadas.

Incluir no escopo do sistema que o Formulário gera:

- rota georreferenciada;
- matriz de distâncias;
- horários;
- PDF operacional;
- JSON;
- e também **descrição textual do itinerário por nomes de vias**, derivada da rota.

No glossário, atualizar “Itinerário” para mencionar que, além da sequência de paradas e rota georreferenciada, ele possui uma descrição textual por vias, composta por Seções e nomes de ruas/avenidas/rodovias.

Não transforme essa descrição em dado administrativo, parecer, justificativa ou fluxo SEI. É dado operacional.

## Cuidados importantes

1. Não incluir Locais comuns na descrição textual.
2. Não transformar pontos de rota em itens da descrição.
3. Não usar todas as paradas como marcos; usar apenas Seções.
4. Não recalcular descrição no Comparador/Ingestor/PDF; eles leem do JSON.
5. Não quebrar a regra atual de que `rota.trechos.length == paradas.length - 1`.
6. Não alterar a lógica de matriz de distâncias, exceto para mencionar que mudança de rota também recalcula a descrição.
7. Não incluir valores em R$.
8. Manter coerência com o padrão visual já definido: `Cidade - Nome da Seção`.
9. Preservar a filosofia do projeto: JSON autossuficiente, sem backend transacional, sem workflow administrativo.
10. Atualizar os exemplos de JSON e os critérios de aceite.

## Resultado esperado

Ao final, os arquivos de especificação devem deixar claro que:

- cada itinerário de cada Serviço/sentido possui uma descrição textual do caminho percorrido;
- essa descrição intercala Seções e nomes de vias;
- Locais comuns são ignorados na descrição textual;
- o dado é gerado a partir da rota roteirizada;
- o dado é salvo no JSON;
- o dado é mostrado na UX;
- o dado sai no PDF operacional;
- o dado é congelado e lido pelos demais módulos sem recálculo.
