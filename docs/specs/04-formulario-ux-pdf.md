# Spec 04 — Formulário: UX, Mapa, Importação/Exportação e PDF Operacional

**Projeto:** ROTA — Registro de Operação e Tabelas de Autos
**Depende de:** [Spec 01 — Visão Geral](01-visao-geral.md), [Spec 02 — Esquema do JSON de Operação](02-esquema-json-operacao.md), [Spec 03 — Regras de Negócio e Cálculo](03-regras-de-negocio-calculo.md)
**Status:** Em definição — v0.4 (§5: `tipo` editável a qualquer momento — trocar o tipo reconverte Serviços incompatíveis à forma convencional do tipo, com aviso, nunca bloqueia — DEC-034; supera a contradição "não editável após criado" × "bloqueio/alerta" da v0.3. v0.3: exemplos de `numero_n` conforme códigos definitivos — Spec 01 v0.6 §7)
**Escopo:** Como o usuário interage com o Formulário — telas, mapa, grade de horários, matrizes, descrição textual do itinerário, revisão, exportação de JSON e geração do PDF operacional. Esta spec define **quando** as regras das Specs 02/03 aparecem na tela, **como** o usuário interage com elas e **como** os resultados são apresentados. **Não é escopo desta spec (fronteira):** o schema do JSON (Spec 02); as fórmulas de cálculo, o algoritmo do OSRM, o algoritmo da regra dos 350 m, a estrutura interna de `offset_horario` e a regra de contagem de viagens/opções de deslocamento (Spec 03); o Comparador (Spec 05); o Ingestor (Spec 06); e qualquer workflow administrativo, aprovação, pendência, SEI ou permissões (fora do ROTA — Spec 01 §3).

> **Nota de versão:** esta spec foi escrita junto com duas alterações que ela induziu nas specs anteriores: (a) a **estratificação de Viagem** por dia da semana (`dia_semana` único + `viagem_feriado` booleano — Spec 02 §11, v0.6, substituindo `dias_semana[]` + `regra_feriado`); (b) a **derivação automática do município** a partir da geolocalização (Spec 03 §2.3). As referências abaixo já apontam para as versões atualizadas.

---

## 1. Papel deste Documento

A Spec 03 fechou os algoritmos e deixou explícita, no seu §12, a coluna "Spec 04" — momento de disparo, apresentação e interação de cada regra. Esta spec resolve essa coluna, além de definir a estrutura do PDF operacional e o fluxo de importação/exportação do JSON.

---

## 2. Princípios de UX

1. **JSON é o "salvar" oficial.** O Formulário não persiste nada no servidor (Spec 01 §5); exportar o JSON é salvar, reimportar é retomar.
2. **Carregar JSON existente é o caminho recomendado** sempre que já existe documento ROTA anterior — é o único fluxo que preserva UUIDs e mantém o Comparador útil (Spec 01 §6).
3. **"Criar Autos do zero" cria um documento ROTA, não um Autos administrativo.** É o caminho para Autos que ainda não têm JSON no formato ROTA (implantação); o Autos em si já existe e vem das listas estáticas.
4. **O usuário edita operação, não estrutura de JSON.** Nenhuma tela pede `uuid`, `offset_horario` cru, `ParDistância` ou qualquer nome interno do esquema. O usuário insere horários de relógio, arrasta pontos no mapa e habilita pares — o Formulário monta o JSON.
5. **Offsets ficam ocultos na interface principal.** `offset_horario` (Spec 02 §11.1) é derivado dos horários absolutos que o usuário digita na grade; pode aparecer só em modo avançado.
6. **O mapa é ferramenta de edição operacional** — Seções, Locais, pontos de rota e o traçado são criados/ajustados nele, não em formulários de coordenadas.
7. **O PDF deve ser legível como tabela operacional de linha de ônibus** — quem lê é fiscal, motorista e passageiro, não desenvolvedor.
8. **Sem R$ nesta versão.** Valores monetários não são apresentados nem na UX nem no PDF; as matrizes exibem distâncias em **km** (a conversão distância→R$ permanece externa — Spec 03 §11 — e sua exibição fica adiada para uma versão futura desta spec).

---

## 3. Tela Inicial

Duas ações, lado a lado, com a primeira visualmente destacada como recomendada quando existe documento anterior:

### 3.1 Carregar JSON existente

Fluxo:

1. Usuário escolhe um arquivo `.json`.
2. O Formulário valida a estrutura conforme Spec 02 §14 (e as checagens estáticas da Spec 03 §7.3/§7.4). JSON inválido → bloqueio com a categoria de erro (§14 abaixo).
3. Valida que `codigo`, `empresa` e `tipo` do arquivo existem nas listas estáticas; se algum não existir, **bloqueia o carregamento** com mensagem clara (Spec 01 §8 — propor contra identidade obsoleta é pior que reescolher).
4. Todas as UUIDs do arquivo são **preservadas** (Spec 02 §12); apenas entidades criadas nesta sessão ganharão UUID nova.
5. O Autos abre para edição, com a mensagem:

   > "Você está editando uma operação anterior. As entidades existentes manterão suas UUIDs."

6. **Abrir não recalcula rota.** O mapa apenas desenha a rota congelada do JSON (`rota.geometria` — Spec 02 §10.2); nenhuma chamada ao OSRM acontece na abertura (Spec 03 §3.6.2).

Este é o caminho **padrão e fortemente guiado para alterações** de operação existente: se o usuário escolher "criar do zero" tendo indicado um Autos que a lista marca como já operante, o Formulário deve reforçar a recomendação de carregar o JSON vigente (ver aviso em §3.2).

### 3.2 Criar Autos do zero

- Usado para Autos que **ainda não possuem JSON no formato ROTA** — será muito usado na implantação do sistema.
- **Não significa criação de linha nova**: o usuário seleciona Autos/empresa/tipo a partir das **listas estáticas** (Spec 01 §8), que contêm os autos de linha já existentes e cadastrados.
- Todas as entidades criadas terão UUIDs novas (Spec 02 §12).
- Aviso obrigatório antes de prosseguir:

  > "REDIGIR UM AVISO SIMPLES E FACIL DE ENTENDER DIZENDO QUE CRIANDO AUTOS DO ZERO, A COMPARAÇÃO NÃO SERÁ POSSIVEL DE SER FEITA. DIZER QUE A FUNCIONALIDADE DEVE SER USADA CASO SEJA O PRIMEIRO ARQUIVO ROTA CRIADO DA LINHA OU TENHA PERDIDO O ARQUIVO, USE BOM PORTUGUES E ESCREVA BEM ISSO."

---

## 4. Layout Geral do Formulário

Navegação principal em **etapas** (stepper lateral ou superior), livremente navegáveis — não é um wizard travado; as validações são apontadas no painel de pendências, não impedem trocar de etapa:

1. **Identificação**
2. **Serviços**
3. **Seções, Locais e Itinerários** (etapa de mapa — uma passagem por Serviço × sentido)
4. **Viagens e horários** (grade)
5. **Matrizes**
6. **Revisão**
7. **Exportação JSON/PDF**

Elementos persistentes em todas as etapas:

- **Cabeçalho** com código do Autos, empresa, tipo e status (`proposta`/`vigente`).
- **Painel de pendências** (colapsável): lista viva de erros bloqueantes e alertas (§11), cada item clicável levando à etapa/entidade correspondente.
- **Resumo operacional** (colapsável): os contadores de §10, atualizados reativamente.
- **Área de mapa** ocupando a maior parte da tela nas etapas de itinerário; nas demais, oculta.

---

## 5. Identificação do Autos

Campos exibidos (UX apenas — schema e regras na Spec 02 §4/§4.1):

| Campo           | Comportamento na UX                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Código do Autos | Seleção nas listas estáticas (criação do zero) ou pré-preenchido pelo JSON (carregamento). Não editável após criado o documento.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Empresa         | Idem.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Tipo            | Pré-preenchido pela seleção do Autos (criação do zero) ou pelo JSON (carregamento), mas **editável a qualquer momento** — inclusive após criado o documento (ao contrário de Código/Empresa). Ao trocar o tipo, os Serviços cuja `caracteristica_veiculo` não pertença ao novo tipo são **reconvertidos automaticamente para a forma convencional (padrão) do tipo** (`Rodoviário`→`CR`, `Rodoviário Litorâneo`→`CL`, `Semiurbano`→`SU`, `Semiurbano Litorâneo`→`SUL`), com **aviso** listando o que mudou — **nunca bloqueia** (regra: Spec 03 §10.4; DEC-034). |
| Status          | Exibido como selo (`proposta`/`vigente`). Não é editado aqui — muda apenas pelas ações de exportação (§12).                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Data            | `data_criacao` (proposta) ou `data_publicacao` (vigente), conforme Spec 02 §4.1. `data_criacao` é automática e apenas exibida; `data_publicacao` é pedida na ação "definir como vigente" (§12.2).                                                                                                                                                                                                                                                                                                                                                                |

---

## 6. Serviços

Lista dos Serviços do Autos com ações:

- **Criar Serviço**: pede `numero_n` (sugerido sequencialmente por ordem de cadastro — Spec 03 §10.3, regra 5), `caracteristica_veiculo` (dropdown **já filtrado** pela tabela de tipificação do tipo do Autos — Spec 03 §10.2), `carater` (`principal`/`parcial`/`semidireta`) e direcionalidade (**Ida**, **Volta** ou **ambos**).
- **Editar Serviço**: mesmos campos; alterar característica revalida tipificação (Spec 03 §10).
- **Duplicar Serviço**: copia estrutura (Locais, itinerários, paradas, pontos de rota, viagens) com **UUIDs novas** para todas as entidades copiadas (Spec 02 §12 — só a entidade original mantém identidade). As referências a Seções do Autos (`secao_uuid`) são mantidas — Seção é compartilhada — mas o novo Serviço precisa contribuir suas próprias geolocalizações (pré-preenchidas com as do Serviço de origem, sujeitas à regra dos 350 m — Spec 03 §7.2).
- **Remover Serviço**: confirmação explícita; remove também as entradas dele em `secao.servicos[]` e, se alguma Seção ficar sem nenhum Serviço, ela é removida do documento (Spec 02 §14 exige ao menos 1).
- Exibir por Serviço: característica de veículo, caráter, direcionalidade e contadores (viagens semanais, ver §10).

Validações de tipo × característica: sempre delegadas à Spec 03 §10; a UX apenas filtra os dropdowns e exibe o erro quando um documento carregado viola a tabela.

---

## 7. Seções, Locais comuns e Itinerários (etapa de mapa)

O cadastro de Seções, Locais, pontos de rota e a montagem do itinerário de um Serviço acontecem **num mesmo mapa interativo**, ao criar/alterar o itinerário de um Serviço em um sentido (Ida ou Volta). O usuário lança Seções, Locais e pontos de rota **enquanto desenha a rota** (OSRM), de forma fluida — sem alternar entre telas.

Layout da etapa: mapa em destaque + **tabela lateral com a lista ordenada de paradas** (Seções e Locais, na ordem do itinerário) e pontos de rota, sincronizada com o mapa (selecionar na tabela destaca no mapa e vice-versa). A tabela mostra também a **associação Seção ↔ Serviço** conforme as Seções vão sendo inseridas.

### 7.1 Inserção de Seções

Ao clicar no mapa para criar uma Seção, o Formulário pede/resolve:

- **Geolocalização** — o ponto clicado, por Serviço e sentido (Spec 02 §5.1). As Seções podem ter pontos diferentes na Ida e na Volta: ao criar a Seção durante a montagem da **Ida**, o Formulário cria **Ida e Volta no mesmo ponto** (quando o Serviço é bidirecional); depois, na montagem do itinerário de **Volta**, o ponto da Volta aparece pré-posicionado e o usuário pode arrastá-lo — sujeito à regra dos 350 m por centroide (Spec 03 §7.2; recusa → mensagem de §14 e oferta de criar Seção nova).
- **Nome** — digitado pelo usuário.
- **Município** — **não é digitado**: é derivado automaticamente da geolocalização por ponto-em-polígono sobre a base de municípios de SP (regra de negócio na Spec 03 §2.3; dados `municipios_sp.geojson` + `pop_municipios.csv`). Exibido como campo somente-leitura; recalculado se o ponto for arrastado.

**Reutilização de Seções existentes:** ao montar/alterar o itinerário, o Formulário oferta as Seções **já existentes no documento** (criadas por este ou por outros Serviços) além da criação de novas (que pertencem ao Autos inteiro — Spec 02 §5). Uma Seção existente pode ter vários pontos (contribuições de outros Serviços, Ida/Volta): ao escolher reutilizá-la, o Formulário oferece esses pontos como opções de posição para a contribuição do Serviço corrente; **se houver apenas um ponto, ele é lançado direto no mapa** (o usuário pode então arrastá-lo, sempre sob a regra dos 350 m).

**Padrão visual de nome (fixado):**

> **Cidade - Nome da Seção** (ex.: `Sorocaba - Terminal São Paulo`)

Esse padrão é usado em **todas** as telas, tabelas, matrizes e no PDF. A "Cidade" é o `municipio` derivado (Spec 03 §2.3); o usuário nunca digita a parte da cidade.

Regras de estrutura e algoritmos: Spec 02 §5 e Spec 03 §7 — não redefinidos aqui.

### 7.2 Locais comuns

UX de inserção (estrutura na Spec 02 §7; regra dos 350 m pareada na Spec 03 §7.4):

- Locais pertencem **ao Serviço**; são pontos **sem tarifa**; podem aparecer no itinerário; **não aparecem** na matriz de seccionamento; **não poluem** a tabela horária principal (nem na UX, nem no PDF); podem aparecer em **modo avançado** ou no anexo técnico do PDF (§13).
- Cada Local pode ter um ou dois pontos georreferenciados (Ida e Volta). Se o Serviço é bidirecional, **a criação sempre gera os dois pontos** (no mesmo lugar). Na montagem do itinerário de Volta, o ponto já aparece marcado como parada por onde o itinerário passa; o usuário pode **arrastá-lo** (bloqueio da regra dos 350 m pareada — Spec 03 §7.4) ou **excluir o ponto só naquele sentido** (ex.: manter só a Ida) — o Local passa a ser unidirecional, e a parada correspondente sai do itinerário daquele sentido.
- O `municipio` do Local também é derivado da geolocalização (Spec 03 §2.3), somente-leitura.

### 7.3 Itinerário e mapa

Como o usuário monta o itinerário (estrutura: Spec 02 §10; OSRM: Spec 03 §3; pontos de rota: Spec 03 §3.6):

1. Escolhe o **Serviço** e o **sentido** (Ida/Volta).
2. Insere **Seções e Locais em ordem**, clicando no mapa ou reutilizando existentes (§7.1) — a cada parada adicionada, a rota é recalculada e desenhada.
3. A **tabela lateral** lista Seções, paradas comuns e pontos de rota na ordem da travessia; permite reordenar (reordenar = recalcular rota).
4. **Move coordenadas** arrastando marcadores; soltar o marcador dispara revalidação (350 m) e recálculo da rota.
5. **Recalcula a rota** sempre que o itinerário muda (parada adicionada/removida/reordenada, coordenada movida, ponto de rota criado/movido/removido).
6. Usa **pontos de rota** para forçar o traçado: clicar sobre a linha da rota calculada cria um vértice arrastável (Spec 03 §3.6); soltar recalcula.

Regras explícitas de UX (decisões desta spec):

- **Abrir JSON não chama OSRM** — desenha a rota congelada (§3.1, item 6).
- **Alterar itinerário, paradas, coordenadas ou pontos de rota chama OSRM** — no momento do "soltar"/confirmar de cada gesto, com indicador de carregamento; erro → categorias de §14 (mensagens da Spec 03 §3.5, sem retentativa automática além da prevista lá).
- **Ponto de rota não é Seção, Local nem Parada** — visual distinto (vértice pequeno sobre a linha, sem rótulo), sem nome, sem município, sem entrada na tabela de paradas (aparece em sub-lista própria).
- **Enquanto houver rota inválida (qualquer itinerário sem `rota` calculada com sucesso), a exportação fica bloqueada** (Spec 03 §3.5) — pendência bloqueante no painel (§11).

> **Requisito não-funcional (registro):** `router.project-osrm.org` é servidor de demonstração, sem SLA. Para produção, prever instância OSRM auto-hospedada (ou provedor com SLA), mantendo o demo para desenvolvimento. Não altera o contrato da Spec 03 §3.

### 7.4 Descrição textual do itinerário

Ainda na etapa de mapa, para **cada Serviço e sentido** o Formulário exibe um painel **"Descrição textual do itinerário"**, alimentado por `rota.descricao_itinerario` (Spec 02 §10.5; algoritmo Spec 03 §3.7). É a leitura, em nomes de ruas/avenidas/rodovias, do caminho que o ônibus percorre entre as Seções — gerada automaticamente a partir da rota roteirizada.

O painel mostra:

- **Sentido:** Ida ou Volta.
- **Texto gerado automaticamente** (`descricao_itinerario.texto`), no padrão `Cidade A - Seção A, Rua X, Avenida Y, Cidade B - Seção B…` — com as **Seções em destaque visual** e as **vias em texto simples**.
- **Lista estruturada opcional** (`descricao_itinerario.itens`): os itens `secao` destacados, os itens `via` em texto simples — acessível por "Ver itens estruturados".
- **Nota** de que o texto é **gerado automaticamente** a partir da rota roteirizada (não é digitado).

Ações do painel:

- **Recalcular descrição** — re-executa a composição (Spec 03 §3.7) contra a rota atual; disparado também, automaticamente, sempre que a rota é recalculada (parada/coordenada/ponto de rota alterados — §7.3, Spec 03 §3.7.7).
- **Copiar texto** — copia `texto` para a área de transferência.
- **Ver itens estruturados** — mostra/oculta a lista `itens`.

Regras de UX (decisões desta spec):

- **Só Seções e vias** aparecem — Locais comuns **nunca** entram na descrição (Spec 02 §10.5, Spec 03 §3.7.3), mesmo estando entre duas Seções.
- **Abrir JSON não chama OSRM** — o painel exibe a descrição **congelada** do arquivo; recomputa-se só ao editar itinerário/coordenadas/pontos de rota (§7.3, item "Abrir JSON não chama OSRM"; Spec 03 §3.7.7).
- **Sem edição manual do texto** nesta versão — o texto é somente-leitura, para evitar divergência entre a geometria e a descrição. (Se no futuro se quiser permitir edição, será por um campo separado tipo `descricao_manual`, tratado como exceção controlada — **não implementado agora**.)
- **Pendência bloqueante:** se `rota` existe mas `descricao_itinerario` está vazia ou inválida, a exportação é bloqueada (§11).

---

## 8. Viagens e Grade de Horários

Após criar/alterar o itinerário de um Serviço, a etapa seguinte é a **grade de horários**, por Serviço × sentido. Com a estratificação de Viagem (Spec 02 §11, v0.6), **cada célula preenchida da grade é uma Viagem** — um único `dia_semana`, comum ou de feriado.

### 8.1 Estrutura da grade

Duas tabelas por Serviço × sentido — **Dias comuns** (viagens com `viagem_feriado = false`) e, abaixo, **Feriados** (`viagem_feriado = true`):

```
                          SEG    TER    QUA    QUI    SEX    SAB    DOM

Municipio A - Seção 1    08:00  08:00  09:00  08:00  08:00  11:00  [célula preenchível]
Municipio B - Seção 2    08:15  08:15  09:15  08:15  08:15  11:15    —
Municipio C - Seção 3    08:45  08:45  09:45  08:45  08:45  11:45    —
Municipio D - Seção 4    09:00  09:00  10:00  09:00  09:00  12:00    —

Municipio A - Seção 1    09:00  09:00  10:00  09:00  09:00  [célula preenchível]  —
Municipio B - Seção 2    09:15  09:15  10:15  09:15  09:15    —     —
Municipio C - Seção 3    09:45  09:45  10:45  09:45  09:45    —     —
Municipio D - Seção 4    10:00  10:00  11:00  10:00  10:00    —     —
```

- **Colunas:** os sete dias da semana (SEG…DOM).
- **Linhas:** as **Seções** do itinerário, na ordem da travessia, com nomes no padrão `Cidade - Nome da Seção` (§7.1). **Locais comuns não aparecem** na grade principal (princípio §2.5/§7.2); um **modo avançado** pode exibi-los como linhas extras somente-leitura/editáveis, sem entrar no PDF principal.
- **Blocos:** cada bloco de linhas (uma passagem completa pelas Seções) é uma **posição ordinal** — a n-ésima partida do dia. Dentro de cada dia, as viagens são ordenadas por `horario_saida`; os blocos são alinhados pela posição ordinal (a 1ª viagem de cada dia no 1º bloco, e assim por diante) e os blocos ordenados pelo menor horário de início entre os dias. Dia sem viagem naquela posição exibe `—`.
- **Exibição em HH:MM** (o JSON guarda `HH:MM:SS` — Spec 02 §11; segundos são sempre `00` quando digitados pela grade).

### 8.2 Comportamento de preenchimento

- **Preencher o horário da primeira Seção** de um bloco, num dia, **cria a Viagem** daquele dia: os horários das demais Seções (e das paradas comuns, internamente) são preenchidos automaticamente pela sugestão inicial da Spec 03 §8.1 (acúmulo de `duracao_s` dos trechos). O usuário **nunca digita offsets** — digita horários de relógio; o Formulário converte para `offset_horario` internamente e gera `horarios_paradas[]` completo (incluindo Locais, que não aparecem na grade).
- **Alterar um horário passante** (Seção intermediária/final) torna aquela parada **âncora** da Viagem e aciona a **redistribuição proporcional** da Spec 03 §8.2, recalculando as derivadas — só naquela Viagem (célula/dia); os outros dias não são afetados.
- **Bloqueio de fora-de-ordem:** a grade recusa horário passante menor que o da âncora anterior ou maior que o da próxima âncora (regra da Spec 03 §8.2; a política de bloqueio na digitação é desta spec: a célula fica em erro e não confirma).
- **Restaurar sugestão:** ação por Viagem (menu da célula) e em lote (toda a grade do sentido) que desfaz âncoras manuais e volta ao baseline — Spec 03 §8.3; confirmação antes do lote.

### 8.3 Ações da grade

- **Apagar viagem inteira:** remove a Viagem de um dia (limpa a coluna do bloco naquele dia). Também disponível: apagar o **bloco inteiro** (a n-ésima partida em todos os dias), com confirmação.
- **Copiar viagem para outro dia:** duplica a Viagem para o(s) dia(s) escolhido(s) — mesma `horario_saida` e mesmos offsets, **UUID nova** (é entidade nova — Spec 02 §12).
- **Inserir viagem entre viagens ou no início da grade:** cria um bloco vazio na posição indicada; o horário digitado define a posição real (a grade sempre reordena por `horario_saida` dentro do dia).

### 8.4 Tabela de feriados

- Mesma estrutura da tabela de dias comuns; alimenta as Viagens com `viagem_feriado = true` (semântica: opera quando um feriado cai naquele dia da semana — Spec 03 §9.1).
- Botão **"Copiar dias comuns"**: preenche a tabela de feriados com horários iguais à operação de dias comuns — clona todas as Viagens comuns do sentido como Viagens de feriado (**UUIDs novas**). Confirmação se a tabela de feriados já tiver conteúdo (sobrescrever/mesclar).
- Feriados **não entram** nas contagens (semana padrão — Spec 03 §9.2); a grade exibe essa nota como legenda.

---

## 9. Matrizes

Etapa por **Serviço** (seletor no topo). Ambas as matrizes são exibidas como **matriz triangular na metade esquerda/inferior**, com diagonal marcada com **"X"**, cabeçalhos de linha e coluna no padrão `Cidade - Nome da Seção`, valores em **km** — **sem R$** (princípio §2.8).

### 9.1 Matriz de distâncias

Apresentação (dados: Spec 02 §8; cálculo: Spec 03 §4–5):

```
Origem/Destino        Cidade A - Seção A   Cidade B - Seção B   Cidade C - Seção C
Cidade A - Seção A            X
Cidade B - Seção B         12,40 km                X
Cidade C - Seção C         28,10 km            15,70 km                X
```

- Valor exibido por célula: `valor_adotado_de_distancia`.
- **Detalhe Ida/Volta quando existir:** célula expansível (hover/clique) mostrando `distancia_trecho_ida` e `distancia_trecho_volta` quando o Serviço é bidirecional.
- Somente leitura — é matriz **computada** (Spec 02 §8); desatualização após mudança de itinerário gera pendência "matriz desatualizada" (§11) até o recálculo (disparado automaticamente ao concluir a edição do itinerário).

### 9.2 Matriz de seccionamento

Apresentação (dados: Spec 02 §9; sugestões: Spec 03 §6; tarifa externa: Spec 03 §11):

- Mesmo formato triangular; **pares não habilitados** exibem **"—"**; pares habilitados exibem a distância em km.
- **Habilitar/desabilitar par:** clique na célula alterna; habilitar preenche com a sugestão ativa; desabilitar remove a entrada.
- **Dois botões de sugestão em lote** (Spec 03 §6.1): **"Sugerir menor distância"** (mínimo entre todos os Serviços do Autos — §6.2) e **"Sugerir distâncias do serviço"** (valores do próprio Serviço — §6.3). O último acionado (ou a edição manual) é o que vale.
- **Edição manual da distância do par:** célula editável; o JSON guarda o valor confirmado (Spec 02 §9).

**Decisão explícita de UX:** embora a Spec 03 §11 preveja a conversão distância→R$ para exibição, **nesta versão o Formulário e o PDF não apresentam valores monetários** — as matrizes exibem apenas distâncias em km.

---

## 10. Resumo Operacional

Painel na tela de **Revisão** (e seção correspondente no PDF), com as contagens definidas na Spec 03 §9.4 (fórmulas lá — não repetidas aqui). Todas as contagens usam a **semana padrão (sem feriado)** e devem ser **rotuladas** como tal ("viagens semanais — semana padrão, sem feriados").

**Por Serviço:**

- viagens semanais na Ida;
- viagens semanais na Volta;
- total semanal de viagens;
- pares O-D compráveis;
- opções de deslocamento na Ida;
- opções de deslocamento na Volta;
- total de opções de deslocamento.

**Por Autos:**

- soma de viagens semanais de todos os Serviços;
- soma de opções de deslocamento.

**Por faixa de horário** (classificação pelo `horario_saida` da Viagem; faixas fixadas por esta spec):

| Faixa             | Intervalo   |
| ----------------- | ----------- |
| Madrugada         | 00:00–04:59 |
| Pico manhã        | 05:00–08:59 |
| Entre-pico manhã  | 09:00–10:59 |
| Entre-pico almoço | 11:00–13:59 |
| Entre-pico tarde  | 14:00–16:59 |
| Pico tarde        | 17:00–19:59 |
| Noite             | 20:00–23:59 |

Todos os contadores acima são apresentados também estratificados por essas faixas (tabela faixa × contador, por Serviço e no total do Autos).

---

## 11. Revisão e Validação

Tela final antes da exportação. Consolida o painel de pendências em duas listas:

**Erros bloqueantes** (impedem gerar JSON e PDF):

- JSON estruturalmente inválido (validações da Spec 02 §14);
- ausência de rota válida em qualquer itinerário (Spec 03 §3.5);
- descrição textual do itinerário ausente ou inválida havendo `rota` (Spec 02 §10.5, §7.4);
- rotas pendentes de recálculo (itinerário alterado após o último roteamento);
- matrizes desatualizadas (itinerário/Seções mudaram após o último cálculo — Spec 03 §4);
- horários fora de ordem (offsets decrescentes — Spec 02 §11.1);
- Seções ou Locais incompletos (sem nome, sem geolocalização obrigatória, município não derivável — Spec 03 §2.3);
- violação da regra dos 350 m detectada em revalidação (Spec 03 §7);
- violação de tipificação tipo × característica (Spec 03 §10);
- itinerário sem viagem (Spec 02 §14 exige ≥ 1 por itinerário).

**Alertas** (não bloqueiam, mas são exibidos e exigem ciência):

- Serviço sem nenhum par habilitado na matriz de seccionamento;
- tabela de feriados vazia (nenhuma Viagem de feriado — pode ser intencional);
- documento criado do zero (sem preservação de identidade para comparação — §3.2).

Além das duas listas, a Revisão exibe, **para cada Serviço e sentido**, a **descrição textual do itinerário** (Spec 02 §10.5, §7.4), como conferência final antes de exportar:

```
Serviço 0000-1CR — Ida
Descrição do itinerário:
Santos - Terminal Central, Avenida Ana Costa, São Vicente - Terminal Norte, Praia Grande - Rodoviária Praia Grande.

Serviço 0000-1CR — Volta
Descrição do itinerário:
Praia Grande - Rodoviária Praia Grande, Avenida Presidente Wilson, São Vicente - Terminal Norte, Santos - Terminal Central.
```

Cada item é clicável e leva à etapa/entidade de origem. **A geração de JSON/PDF só é liberada sem erros bloqueantes.**

---

## 12. Exportação JSON

Duas ações, na etapa final (referência: Spec 02 §4.1):

### 12.1 Exportar proposta

1. Roda a validação completa (§11); com erro bloqueante, não prossegue.
2. Gera o JSON com `status: "proposta"` e **`data_criacao` preenchida automaticamente** (data corrente, não editável).
3. **Preserva as UUIDs existentes** (Spec 02 §12); entidades criadas na sessão já têm as suas.
4. **Sugere nome de arquivo:** `rota-{codigo}-proposta-{data_criacao}.json` (ex.: `rota-0470-proposta-2026-07-07.json`) — só sugestão; o versionamento por nome é de quem usa o arquivo (Spec 02 §4.1).

### 12.2 Definir como vigente

Ação prevista na Spec 02 §4.1 e atribuída ao Formulário por esta spec. Deixar claro na UX:

- **Não é aprovação no ROTA** e **não cria workflow** — aprovação, publicação e vigência real são conduzidas no SEI, fora do sistema.
- É apenas **ação técnica** para gerar um JSON marcado como `vigente` (tipicamente após a aprovação no SEI, para produzir a baseline das próximas comparações).
- Fluxo: pede **`data_publicacao`** (manual, obrigatória) → remove `data_criacao` → define `status: "vigente"` → **preserva todas as UUIDs** → exporta (nome sugerido: `rota-{codigo}-vigente-{data_publicacao}.json`).
- Mesma validação bloqueante de §11.

---

## 13. PDF Operacional

O PDF operacional **não é o PDF comparativo** (que é do Comparador — Spec 05). É o documento que apresenta a **operação do Autos**, gerado client-side (Spec 01 §8), legível como tabela operacional de linha de ônibus.

### 13.1 Estrutura

1. **Capa/identificação** — código do Autos, empresa, tipo, status + data (criação ou publicação), logotipo/título "ROTA — Tabela Operacional".
2. **Resumo do Autos** — os contadores de §10 (com o rótulo "semana padrão, sem feriados"), incluindo a estratificação por faixa de horário.
3. **Serviços** — um bloco por Serviço: `numero_n`, característica de veículo, caráter, direcionalidade, resumo próprio.
4. **Itinerários por Serviço e sentido** — para cada Serviço e sentido, nesta ordem: (a) **título** `Serviço 0000-NXX — Ida` / `— Volta`; (b) **sequência resumida de Seções** no padrão `Cidade - Nome da Seção`, ligadas por seta (`Cidade A - Seção A → Cidade B - Seção B → Cidade C - Seção C`); (c) **descrição textual do itinerário** por nomes de vias (`rota.descricao_itinerario.texto` — Spec 02 §10.5), ex.: `Cidade A - Seção A, Rua Treta, Avenida Santo Antônio, Cidade B - Seção B, Rodovia X, Cidade C - Seção C.`; (d) **imagem do mapa** com a rota (captura do canvas — Spec 01 §8). Locais comuns **não** aparecem aqui — nem na sequência de Seções, nem na descrição textual (só no anexo técnico). Regras de renderização da descrição: §13.4.
5. **Tabela horária por Serviço, sentido e Seção** — duas versões (ver §13.2).
6. **Matriz de distâncias** — por Serviço, formato de §9.1 (triangular inferior, X na diagonal, km).
7. **Matriz de seccionamento** — por Serviço, formato de §9.2 (pares não habilitados com "—").
8. **Anexo técnico** (final) — (a) a versão **detalhada** da tabela horária (§13.2); (b) a relação de **Locais comuns** por Serviço/sentido (nome, município, posição no itinerário) — **sem** horários de passagem e **sem** offsets, que permanecem dado interno do JSON.
9. **Rodapé técnico** — versão do schema (`versao_schema`), data/hora de geração, aviso: _"O fluxo administrativo (análise, pendências e aprovação) permanece no SEI. Este documento não substitui a publicação oficial."_

### 13.2 Tabela horária no PDF — duas versões

Seguindo o esquema da grade de §8 (colunas SEG…DOM; blocos por partida; dias comuns e feriados em tabelas separadas; nomes no padrão `Cidade - Nome da Seção`):

- **Versão simples** (no corpo, item 5): apenas os **horários de saída** (primeira Seção) de cada viagem, por dia — uma linha por Serviço/sentido, compacta.
- **Versão detalhada** (no anexo técnico, item 8a): a grade completa com **todos os horários passantes pelas Seções** — mas **sem** horários dos pontos de parada comuns (Locais), da mesma forma que a UX (§8.1).

### 13.3 Regras específicas do PDF

- Legível como tabela operacional de linha de ônibus (tipografia tabular, uma página por bloco lógico quando possível).
- Nomes de Seções **sempre** no padrão `Cidade - Nome da Seção`.
- Matrizes **sempre** em metade esquerda/inferior, distâncias em **km**, **sem R$**.
- **Sem offsets** na tabela principal (nem no anexo — offsets não são exibidos em lugar nenhum do PDF).
- Contagens rotuladas como **"semana padrão (sem feriados)"**; a operação de feriado aparece exclusivamente na tabela de feriados.

### 13.4 Descrição textual do itinerário no PDF

Regras de renderização da descrição por vias (item 4c de §13.1):

- **Locais comuns não aparecem** na descrição textual principal — só Seções (marcos) e vias (Spec 02 §10.5). Locais comuns continuam podendo aparecer **apenas no anexo técnico** (§13.1 item 8b), como já definido.
- **Quebra de linha legível:** a descrição fica no **corpo do serviço**, com quebra de linha natural; textos longos **não** viram tabela — permanecem como parágrafo corrido, quebrando em várias linhas.
- **Seções com destaque visual** (negrito/cor) quando viável no PDF, distinguindo os marcos das vias em texto simples — usando a lista estruturada `itens` para o realce.
- **Sem valores monetários** (princípio §2.8) — a descrição é só nomes de vias e Seções.

---

## 14. Estados de Erro e Mensagens

Categorias e comportamento esperado (validações e textos de roteamento: Spec 03 §3.5; estruturais: Spec 02 §14). As mensagens devem ser **operacionais e claras** — falam do que o usuário vê e do que fazer, nunca de estrutura interna (e nunca de tarifa — Spec 03 §3.5):

| Categoria                                        | Comportamento                                                     | Exemplo de mensagem                                                                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| JSON inválido                                    | Bloqueia o carregamento; aponta o problema                        | "O arquivo não é um JSON de operação válido: [detalhe]. Verifique se o arquivo foi gerado pelo ROTA."                          |
| Autos/empresa/tipo inexistente na lista estática | Bloqueia o carregamento (Spec 01 §8)                              | "O Autos [código] não consta na lista atual. Não é possível editar uma operação com identificação desatualizada."              |
| Rota sem cálculo                                 | Pendência bloqueante; oferece recalcular                          | "O itinerário de Ida do Serviço 0000-1CR está sem rota calculada. Recalcule antes de exportar."                                |
| Descrição do itinerário ausente/inválida         | Pendência bloqueante; oferece recalcular a descrição (§7.4)       | "O itinerário de Ida do Serviço 0000-1CR está sem a descrição textual por vias. Recalcule a descrição antes de exportar."      |
| OSRM indisponível                                | Erro com retentativa manual (retry automático: Spec 03 §3.5)      | "Serviço de cálculo de rotas temporariamente indisponível — tente novamente em instantes."                                     |
| Sem rota entre paradas (`NoRoute`)               | Bloqueia; aponta o problema de traçado                            | "Não há caminho viário entre as paradas na ordem definida. Revise a ordem ou as posições."                                     |
| Ponto não ancorável (`NoSegment`)                | Bloqueia; identifica **qual parada**                              | "A parada [Cidade - Nome] não pôde ser associada a uma via. Arraste o ponto para mais perto de uma rua."                       |
| Seção fora do limite de 350 m                    | Recusa a inserção/arrasto; oferece criar Seção nova               | "Este ponto fica a mais de 350 m do conjunto de pontos desta Seção. Crie uma Seção separada (com outro nome) para este local." |
| Local fora do limite de 350 m                    | Recusa o arrasto (pareada Ida×Volta)                              | "Os pontos de Ida e Volta deste Local não podem distar mais de 350 m entre si. Crie dois Locais distintos se necessário."      |
| Município não derivável                          | Bloqueia o ponto (fora da base de SP — Spec 03 §2.3)              | "Não foi possível identificar o município deste ponto. Verifique se ele está dentro do Estado de São Paulo."                   |
| Horários fora de ordem                           | Recusa a edição da célula (§8.2)                                  | "Este horário conflita com o horário de uma parada anterior/posterior desta viagem."                                           |
| Matriz desatualizada                             | Pendência bloqueante; recalcula ao concluir a edição              | "O itinerário mudou depois do último cálculo. A matriz de distâncias será recalculada."                                        |
| Tentativa de exportar com erro bloqueante        | Botões de exportação desabilitados + painel de pendências em foco | "Existem pendências bloqueantes. Resolva os itens listados para gerar o JSON/PDF."                                             |

---

## 15. Critérios de Aceite

1. Usuário consegue carregar JSON existente e editar **preservando UUIDs** (§3.1).
2. Usuário consegue criar documento ROTA **do zero** para Autos sem JSON anterior, escolhendo Autos/empresa/tipo das listas estáticas (§3.2).
3. Usuário consegue montar Serviços, Seções, Locais, itinerários e rotas num mesmo mapa interativo (§6–§7).
4. Município de Seções e Locais é derivado automaticamente da geolocalização — o usuário nunca o digita (§7.1, Spec 03 §2.3).
5. Usuário consegue inserir viagens pela grade Seções × dias da semana, incluindo a tabela de feriados (§8).
6. Usuário **não precisa editar offsets manualmente** — digita horários de relógio (§8.2).
7. Sistema gera `horarios_paradas[]` completo internamente, incluindo Locais ocultos na grade (§8.2).
8. Sistema recalcula horários intermediários conforme Spec 03 §8.2 ao editar um horário passante (§8.2).
9. Sistema apresenta tabela horária operacional por Seção e dia da semana, ordenada por horário (§8.1).
10. Sistema apresenta matriz de distâncias em metade esquerda/inferior, em km (§9.1).
11. Sistema apresenta matriz de seccionamento em metade esquerda/inferior, com pares habilitáveis, sugestões e edição manual (§9.2).
12. Sistema **não apresenta R$** em nenhuma matriz, tela ou PDF (§2.8, §9, §13.3).
13. Sistema valida pendências antes de exportar e **bloqueia** exportação com erro bloqueante (§11).
14. Sistema gera JSON aderente à Spec 02, como proposta (data automática) ou vigente (data de publicação manual), sempre preservando UUIDs (§12).
15. Sistema gera PDF operacional legível, com as duas versões da tabela horária e o aviso de que o fluxo administrativo permanece no SEI (§13).
16. Sistema **não introduz workflow administrativo** (§1, Spec 01 §3).
17. Usuário visualiza, para cada Serviço e sentido, a **descrição textual do itinerário por nomes de vias** (§7.4).
18. A descrição é **recalculada quando a rota é recalculada** (§7.4, Spec 03 §3.7.7).
19. A descrição **não mostra Locais comuns** (§7.4, Spec 02 §10.5).
20. O **PDF operacional** apresenta a descrição textual do itinerário por Serviço e sentido (§13.1 item 4, §13.4).
21. O **JSON exportado** contém a descrição textual (`texto`) e a lista estruturada de itens (`itens`) (§12, Spec 02 §10.5).
22. Ao **carregar um JSON existente**, o sistema exibe a descrição gravada **sem recalcular automaticamente** (§7.4, Spec 03 §3.7.7).

---

## 16. Decisões Fechadas Nesta Spec

1. **Navegação por etapas não travada** — validações vivem no painel de pendências; só a exportação é bloqueada (§4, §11).
2. **Grade de horários = Seções × dias da semana**, uma tabela para dias comuns e outra para feriados; célula preenchida = uma Viagem (`dia_semana` único — Spec 02 §11 v0.6); alinhamento dos blocos por posição ordinal da partida no dia; exibição em HH:MM (§8).
3. **Usuário digita horários de relógio, nunca offsets** — conversão para `offset_horario` é interna; Locais recebem horários internamente e não aparecem na grade principal (§8.2).
4. **"Copiar dias comuns"** clona as viagens comuns como viagens de feriado com UUIDs novas; **"copiar viagem para outro dia"** idem (§8.3–§8.4).
5. **Município é somente-leitura**, derivado por ponto-em-polígono (Spec 03 §2.3); padrão visual `Cidade - Nome da Seção` em telas, tabelas, matrizes e PDF (§7.1).
6. **Criação bidirecional espelhada por padrão:** Seções e Locais de Serviço bidirecional nascem com Ida e Volta no mesmo ponto; a Volta é ajustada (ou, para Local, excluída) na montagem do itinerário de Volta (§7.1–§7.2).
7. **Sem R$ nesta versão** — matrizes e PDF só em km; a exibição de tarifa via portaria (Spec 03 §11) fica para versão futura (§9.2).
8. **Faixas de horário fixadas** (madrugada, pico manhã, entre-pico manhã, entre-pico almoço, entre-pico tarde, pico tarde, noite) com os intervalos de §10; classificação pelo `horario_saida`.
9. **Contagens sempre rotuladas "semana padrão (sem feriados)"** na tela e no PDF (§10, §13.3).
10. **"Definir como vigente" é do Formulário** — ação técnica pós-aprovação no SEI: pede `data_publicacao`, remove `data_criacao`, preserva UUIDs; não é aprovação nem workflow (§12.2).
11. **PDF com duas versões da tabela horária** (simples no corpo; detalhada com passantes de Seção no anexo técnico), anexo com Locais **sem horários nem offsets**, e offsets ausentes de todo o PDF (§13).
12. **OSRM auto-hospedado como requisito de produção** (demo só para desenvolvimento) — registro de arquitetura, sem mudança no contrato da Spec 03 (§7.3).
13. **Descrição textual do itinerário por vias** exibida por Serviço/sentido na etapa de mapa (§7.4), na Revisão (§11) e no PDF operacional (§13.1 item 4, §13.4): texto gerado automaticamente da rota (`rota.descricao_itinerario` — Spec 02 §10.5, Spec 03 §3.7), **somente-leitura** (sem edição manual nesta versão), com Seções em destaque e vias em texto simples, Locais comuns nunca exibidos. Recalculada com a rota; ausência/invalidez com `rota` presente é **pendência bloqueante** (§11).

---

## 17. Alterações Induzidas nas Specs 01–03

Registro das mudanças feitas nas specs anteriores em decorrência desta:

| Spec                       | Mudança                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec 02 §11 (v0.6)         | **Viagem estratificada:** `dia_semana` (enum único) + `viagem_feriado` (booleano) substituem `dias_semana[]` + `regra_feriado`. Cada Viagem é uma partida num único dia, comum ou de feriado.                                                               |
| Spec 02 §5/§7              | `municipio` de Seção e Local passa a ser **derivado** da geolocalização (não digitado); o campo continua persistido no JSON.                                                                                                                                |
| Spec 03 §2.3 (novo)        | Regra de **determinação do município por ponto-em-polígono** sobre `municipios_sp.geojson` + `pop_municipios.csv`.                                                                                                                                          |
| Spec 03 §9 (reescrito)     | `viagem_feriado` substitui o enum `regra_feriado`; **§9.4 novo** define as fórmulas de contagem de viagens semanais, pares O-D compráveis e opções de deslocamento (fecha o P1 da revisão).                                                                 |
| Spec 01 §4/§8/§9           | Glossário de Viagem, decisão de design e questão fechada nº 4 atualizados para o novo modelo de Viagem; base de municípios adicionada aos recursos estáticos.                                                                                               |
| Spec 02 §10.5 (novo, v0.7) | **`rota.descricao_itinerario`** (`texto` + `itens[]`): descrição textual do itinerário por vias, só Seções + nomes de vias, Locais fora; derivada e congelada com a rota. Árvore, validações e exemplo atualizados.                                         |
| Spec 03 §3.7 (novo, v0.3)  | Algoritmo de composição da `descricao_itinerario` (fontes, intercalar Seções/vias, extração via `steps=true`, limpeza de nomes, associação por intervalo entre Seções, congelamento/recálculo, casos de borda). §3.2 passa de `steps=false` a `steps=true`. |

---

## 18. Próximos Documentos

- [x] **Spec 05 — Comparador**: diff entre dois JSONs, PDF comparativo. Atenção ao novo modelo de Viagem (diff por Viagem-dia); à recomendação de comparar rota por sinais estáveis (paradas/pontos de rota/distância com tolerância), não por igualdade de `geometria`; e à possibilidade de comparar a descrição do itinerário pela lista estruturada `descricao_itinerario.itens` (Spec 02 §10.5), mais estável que o `texto` corrido.
- [ ] **Spec 06 — Ingestor + Modelo PostgreSQL**: ingestão do JSON aprovado; UUIDs como chave.
