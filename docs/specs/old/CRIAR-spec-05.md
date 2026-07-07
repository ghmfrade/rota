Você é responsável por criar a **Spec 05 — Comparador de JSONs de Operação** do projeto **ROTA — Registro de Operação e Tabelas de Autos**.

Leia antes as Specs existentes:

- `01-visao-geral.md`
- `02-esquema-json-operacao.md`
- `03-regras-de-negocio-calculo.md`
- `04-formulario-ux-pdf.md`

Crie um novo arquivo Markdown chamado:

`05-comparador-json-operacao.md`

A Spec 05 deve definir, em nível de produto, regra de negócio, UX e PDF, como funcionará a ferramenta **Comparador**, que recebe dois arquivos JSON de operação e permite comparar perfeitamente duas versões de um mesmo Autos.

O objetivo é permitir a comparação entre:

- vigente × proposta;
- proposta × proposta;
- vigente antigo × vigente novo;
- arquivo 1 × arquivo 2, com rótulos configuráveis pelo usuário.

Não trate o Comparador como sistema de aprovação, workflow ou tramitação. O SEI continua sendo responsável por análise, pendências, aprovação e publicação. O Comparador apenas lê dois JSONs, mostra diferenças e gera PDF comparativo.

---

## Diretrizes gerais da Spec 05

A Spec 05 deve respeitar estas premissas:

1. O Comparador é uma ferramenta separada do Formulário e do Ingestor, conforme Spec 01.
2. O único contrato de entrada são dois JSONs de operação válidos, conforme Spec 02.
3. O Comparador **não recalcula rota, distância, matriz ou horário**. Ele lê os dados congelados no JSON.
4. O Comparador **não chama OSRM**.
5. O Comparador não altera os JSONs.
6. O Comparador não salva nada no servidor.
7. A identidade entre versões deve ser feita prioritariamente por `uuid`, conforme regra de identidade estável das Specs 01 e 02.
8. O Comparador deve permitir comparar dois arquivos mesmo que ambos sejam `proposta` ou ambos sejam `vigente`; portanto, a UX não deve ser rigidamente “vigente/proposta”, mas “Arquivo 1 / Arquivo 2”, com rótulos sugeridos a partir de `status`.
9. `status`, `data_criacao` e `data_publicacao` devem ser exibidos no cabeçalho, mas não devem ser tratados como diferença operacional campo-a-campo, conforme observação da Spec 02.
10. A comparação principal deve exigir que os dois JSONs sejam do mesmo Autos (`autos.codigo`). Se forem de Autos diferentes, a Spec deve definir bloqueio ou alerta crítico, justificando a decisão.
11. O padrão visual de Seção deve ser sempre `Cidade - Nome da Seção`, herdado da Spec 04.
12. Locais comuns devem aparecer apenas em visualização técnica ou anexo, não como elemento principal da tabela horária.
13. Offsets (`offset_horario`) não devem aparecer para o usuário comum; o Comparador deve apresentar horários absolutos de saída/passagem.
14. As matrizes devem seguir UX semelhante à Spec 04: matriz triangular inferior, diagonal com `X`, cabeçalhos com `Cidade - Nome da Seção`.

---

## Estrutura esperada da Spec 05

Organize a Spec 05 com seções semelhantes a estas, ajustando e detalhando quando necessário:

1. Papel deste Documento
2. Escopo e Não-Escopo do Comparador
3. Entradas do Comparador
4. Validação dos JSONs carregados
5. Estratégia de casamento entre entidades
6. Tipos de diferença
7. Tela inicial e carregamento dos arquivos
8. Visão geral do comparativo
9. Comparação de Serviços
10. Comparação de Viagens ofertadas por faixa de horário
11. Comparação de Opções de Deslocamento por faixa de horário
12. Comparação de Tabelas Horárias
13. Comparação da Matriz de Distâncias
14. Comparação da Matriz Tarifária / Seccionamento
15. Comparação de Itinerários no Mapa
16. Filtros, seletores e navegação
17. PDF Comparativo
18. Estados de erro e mensagens
19. Critérios de aceite

A estrutura pode ser melhorada, mas todos esses temas devem ser cobertos.

---

## Comparação por identidade estável

Defina claramente como o Comparador casa entidades entre os dois JSONs.

Entidades com `uuid`:

- Seção;
- Serviço;
- Local;
- Viagem.

Regra principal:

- mesma `uuid` nos dois arquivos = mesma entidade, comparar campos;
- `uuid` presente apenas no Arquivo 1 = entidade removida;
- `uuid` presente apenas no Arquivo 2 = entidade adicionada.

O Comparador pode, opcionalmente, apresentar alerta de “possível entidade recriada” quando houver entidade sem UUID correspondente, mas com nome/rótulo muito semelhante. Porém essa heurística não deve substituir a regra principal por UUID.

Explique o impacto de JSON criado do zero: se o usuário não preservou UUIDs, o Comparador provavelmente verá entidades antigas como removidas e entidades novas como adicionadas.

---

## Tipos de diferença

A Spec deve definir uma taxonomia simples para as diferenças:

- **Adicionado**: existe apenas no Arquivo 2.
- **Removido**: existe apenas no Arquivo 1.
- **Alterado**: existe nos dois, mas algum campo operacional mudou.
- **Inalterado**: existe nos dois e não mudou.
- **Alerta técnico**: comparação possível, mas com risco de baixa confiabilidade, por exemplo ausência de UUID, schema incompatível, ou documento criado do zero.

Aplicar essa taxonomia a Serviços, Seções, Locais, Itinerários, Viagens, Matrizes e Rotas.

---

## Comparação de viagens ofertadas por faixa de horário

A Spec 05 precisa detalhar uma seção específica para comparar a quantidade de **viagens ofertadas**.

A comparação deve ser feita:

- por Serviço;
- por sentido: Ida, Volta;
- em combinação Ida + Volta;
- por faixa de horário;
- no total de todos os horários;
- no total do Autos.

Use as faixas já definidas na Spec 04:

| Faixa             | Intervalo   |
| ----------------- | ----------- |
| Madrugada         | 00:00–04:59 |
| Pico manhã        | 05:00–08:59 |
| Entre-pico manhã  | 09:00–10:59 |
| Entre-pico almoço | 11:00–13:59 |
| Entre-pico tarde  | 14:00–16:59 |
| Pico tarde        | 17:00–19:59 |
| Noite             | 20:00–23:59 |

A classificação da faixa deve usar o `horario_saida` da Viagem.

A tabela de comparação deve ter, no mínimo:

| Serviço | Faixa | Ida Arq. 1 | Ida Arq. 2 | Δ Ida | Volta Arq. 1 | Volta Arq. 2 | Δ Volta | Combinado Arq. 1 | Combinado Arq. 2 | Δ Combinado |

Também deve existir uma linha “Total — todos os horários”.

A contagem principal deve seguir o conceito de **semana padrão, sem feriados**, conforme Spec 03 e Spec 04. Viagens de feriado devem aparecer em tabela separada, sem misturar com a semana padrão.

---

## Comparação de opções de deslocamento por faixa e total

A Spec 05 também precisa comparar as **opções de deslocamento**.

Use a regra da Spec 03: opção de deslocamento é estatística derivada, equivalente a:

- viagem ofertada × par origem-destino comprável.

A Spec deve determinar que o Comparador calcule, para cada arquivo, por Serviço e sentido:

- pares O-D compráveis;
- viagens por faixa;
- opções de deslocamento por faixa;
- opções totais no Serviço;
- opções totais no Autos.

A comparação deve mostrar:

| Serviço | Faixa | Opções Ida Arq. 1 | Opções Ida Arq. 2 | Δ Ida | Opções Volta Arq. 1 | Opções Volta Arq. 2 | Δ Volta | Opções Combinadas Arq. 1 | Opções Combinadas Arq. 2 | Δ Combinado |

Também deve haver total de todos os horários.

Explique que mudanças nas opções podem vir de:

- aumento/redução de viagens;
- mudança no seccionamento;
- inclusão/remoção de Seções;
- mudança de Serviço;
- alteração de direcionalidade.

---

## Comparação de tabela horária detalhada

Além dos totais por faixa, a Spec deve prever uma visão detalhada de horários.

Por Serviço e sentido, o usuário deve conseguir ver:

- viagens adicionadas;
- viagens removidas;
- viagens mantidas com horário alterado;
- viagens mantidas sem alteração;
- mudança de dia da semana;
- mudança entre viagem comum e viagem de feriado;
- mudança nos horários passantes pelas Seções.

A comparação deve ser por `uuid` da Viagem.

Quando a mesma Viagem existir nos dois arquivos, mostrar:

`horário antigo → horário novo (Δ minutos)`

Exemplo:

`segunda, Ida, 08:00 → 08:15 (+15 min)`

A tabela principal deve mostrar Seções, não Locais comuns. Locais comuns podem aparecer em anexo técnico.

---

## Comparação da matriz de distâncias

A Spec 05 deve definir uma UX para comparar `matriz_distancias`.

A comparação deve ser por Serviço.

A matriz deve seguir a mesma lógica visual da Spec 04:

- triangular inferior;
- diagonal com `X`;
- cabeçalhos de linha e coluna com `Cidade - Nome da Seção`;
- valores em km;
- uma matriz por Serviço;
- seletor de Serviço.

Cada célula deve mostrar a diferença entre Arquivo 1 e Arquivo 2.

Formato sugerido de célula:

- sem mudança: `12,40 km`;
- alterado: `12,40 → 13,10 km (+0,70)`;
- adicionado: `— → 13,10 km`;
- removido: `12,40 km → —`.

Quando houver `distancia_trecho_ida` e `distancia_trecho_volta`, a célula deve permitir detalhe expandido, igual à Spec 04:

- valor adotado;
- distância ida;
- distância volta;
- diferença absoluta;
- diferença percentual.

A Spec também deve prever resumo por Serviço:

- maior aumento de distância;
- maior redução;
- quantidade de pares alterados;
- quantidade de pares adicionados/removidos;
- alteração da distância total dos itinerários por sentido.

---

## Comparação da matriz tarifária / matriz de seccionamento

Comparação da “matriz de distancia para tarifas” que é a chamada`matriz_seccionamento`, com pares habilitados e distância de referência.

A Spec 05 deve tratar isso explicitamente:

- comparar a matriz tarifária operacional como comparação da `matriz_seccionamento`;
- não inventar valores monetários em R$ se eles não existirem no JSON;
- chamar a seção de “Matriz Tarifária / Seccionamento”, ou nome equivalente;
- explicar que a tarifa monetária continua externa, conforme Specs anteriores, salvo se uma spec futura acoplar tabela tarifária.

A matriz deve seguir UX semelhante:

- triangular inferior;
- diagonal `X`;
- pares não habilitados com `—`;
- pares habilitados com distância em km;
- comparação célula a célula.

Estados possíveis por célula:

- par habilitado nos dois arquivos, distância igual;
- par habilitado nos dois arquivos, distância alterada;
- par habilitado apenas no Arquivo 1;
- par habilitado apenas no Arquivo 2;
- par não habilitado nos dois.

Formato sugerido:

- `—`;
- `12,40 km`;
- `12,40 → 13,10 km (+0,70)`;
- `— → 13,10 km`;
- `12,40 km → —`.

A Spec deve prever resumo:

- pares tarifários adicionados;
- pares tarifários removidos;
- pares mantidos com distância alterada;
- impacto no número de pares O-D compráveis;
- impacto nas opções de deslocamento.

---

## Comparação de itinerários no mapa

A Spec 05 deve definir uma tela de mapa comparativo.

O mapa deve permitir comparar itinerários por:

- Serviço;
- sentido: Ida ou Volta;
- Arquivo 1 × Arquivo 2.

A UX deve ter, no mínimo:

1. Seletor de Serviço.
2. Seletor de sentido.
3. Alternância entre:
   - sobreposição das duas rotas no mesmo mapa;
   - visualização lado a lado;
   - mostrar apenas Arquivo 1;
   - mostrar apenas Arquivo 2.

4. Destaque visual para:
   - rota inalterada;
   - trecho alterado;
   - Seção adicionada;
   - Seção removida;
   - Seção mantida com geolocalização alterada;
   - Local comum adicionado/removido/alterado, em camada técnica opcional.

5. Resumo no painel lateral:
   - distância total Arquivo 1;
   - distância total Arquivo 2;
   - diferença em km e percentual;
   - duração total Arquivo 1;
   - duração total Arquivo 2;
   - diferença em minutos;
   - número de Seções;
   - número de Locais comuns;
   - número de pontos de rota.

Importante: o Comparador deve desenhar `rota.geometria` já armazenada no JSON. Não deve recalcular rota nem chamar OSRM.

A comparação de geolocalização de Seções e Locais deve usar as coordenadas do JSON. Quando a mesma entidade tiver `uuid` nos dois arquivos, mas coordenada diferente, mostrar distância em metros entre os pontos antigos e novos, usando a primitiva de distância geodésica já definida na Spec 03.

---

## Visão geral do comparativo

A Spec deve prever uma tela inicial após carregar os arquivos com resumo executivo:

- identificação dos dois arquivos;
- código do Autos;
- empresa;
- tipo;
- status e data de cada arquivo;
- versão de schema de cada arquivo;
- quantidade de Serviços adicionados/removidos/alterados;
- quantidade de Seções adicionadas/removidas/alteradas;
- variação total de viagens semanais;
- variação total de opções de deslocamento;
- principais alterações de matriz de distância;
- principais alterações de matriz tarifária/seccionamento;
- alerta se os arquivos não parecem preservar UUIDs;
- botão para gerar PDF comparativo.

---

## Filtros e navegação

A Spec deve definir os filtros mínimos:

- Serviço;
- sentido;
- dia da semana;
- viagem comum / viagem de feriado;
- faixa de horário;
- mostrar todos / apenas alterados;
- tipo de diferença: adicionado, removido, alterado, inalterado;
- Seção origem/destino para matrizes.

A navegação pode ser por abas:

1. Visão Geral
2. Serviços
3. Horários e Viagens
4. Opções de Deslocamento
5. Matrizes
6. Mapa
7. PDF Comparativo

---

## PDF Comparativo

A Spec 05 deve definir a estrutura do PDF comparativo, distinto do PDF operacional da Spec 04.

O PDF comparativo deve permitir que um técnico compare perfeitamente os dois JSONs inseridos.

Estrutura mínima:

1. **Capa**
   - título: `ROTA — Comparativo de Operação`;
   - código do Autos;
   - empresa;
   - tipo;
   - Arquivo 1: nome, status, data, versão do schema;
   - Arquivo 2: nome, status, data, versão do schema;
   - data/hora de geração do PDF;
   - aviso de que o documento é apoio técnico e não substitui o SEI.

2. **Resumo Executivo**
   - principais diferenças;
   - total de Serviços adicionados/removidos/alterados;
   - total de Seções adicionadas/removidas/alteradas;
   - variação total de viagens;
   - variação total de opções de deslocamento;
   - principais impactos de distância;
   - principais impactos de seccionamento/tarifa operacional.

3. **Comparação de Serviços**
   - Serviço por Serviço;
   - característica de veículo;
   - caráter;
   - direcionalidade;
   - situação: adicionado, removido, alterado, inalterado.

4. **Comparação de Viagens por Faixa de Horário**
   - por Serviço;
   - Ida;
   - Volta;
   - Combinado;
   - por faixa;
   - total de todos os horários.

5. **Comparação de Opções de Deslocamento**
   - por Serviço;
   - Ida;
   - Volta;
   - Combinado;
   - por faixa;
   - total de todos os horários;
   - total do Autos.

6. **Tabela Horária Comparativa**
   - viagens adicionadas;
   - viagens removidas;
   - viagens alteradas;
   - horários antigos e novos;
   - diferenças em minutos;
   - separar semana padrão e feriados.

7. **Comparação da Matriz de Distâncias**
   - uma matriz por Serviço;
   - triangular inferior;
   - valores Arquivo 1 → Arquivo 2;
   - diferenças em km;
   - resumo de pares alterados.

8. **Comparação da Matriz Tarifária / Seccionamento**
   - uma matriz por Serviço;
   - triangular inferior;
   - pares habilitados/desabilitados;
   - distâncias alteradas;
   - impacto nos pares O-D compráveis.

9. **Comparação de Itinerários e Mapas**
   - imagem comparativa por Serviço e sentido;
   - rotas sobrepostas ou lado a lado;
   - distância/duração antiga e nova;
   - Seções adicionadas/removidas/movidas.

10. **Anexo Técnico**

- lista completa de diferenças campo-a-campo relevantes;
- Locais comuns alterados;
- pontos de rota alterados;
- alertas de validação;
- entidades sem correspondência por UUID;
- informações de schema.

O PDF deve ser legível para análise técnica da ARTESP. Evitar excesso de detalhes internos na parte principal; detalhes internos ficam no anexo.

---

## Estados de erro e mensagens

A Spec deve prever mensagens para:

- arquivo não é JSON;
- JSON não segue o schema da Spec 02;
- versões de schema incompatíveis;
- Autos diferentes;
- ausência de `uuid` em entidade que deveria ter;
- JSON criado do zero sem preservação de identidade;
- Serviço existe em um arquivo e não no outro;
- Seção existe em um arquivo e não no outro;
- matriz de distância ausente ou incompleta;
- matriz de seccionamento ausente;
- rota sem geometria;
- itinerário sem viagens.

Mensagens devem ser operacionais e compreensíveis para usuário técnico, sem expor nomes internos quando não for necessário.

---

## Critérios de aceite

Ao final da Spec 05, inclua critérios de aceite objetivos. No mínimo:

1. Usuário consegue carregar dois JSONs válidos.
2. Sistema valida se os JSONs são comparáveis.
3. Sistema compara entidades por UUID.
4. Sistema mostra Serviços adicionados, removidos e alterados.
5. Sistema compara viagens por faixa de horário, por Ida, Volta, Combinado e total.
6. Sistema compara opções de deslocamento por faixa, por Ida, Volta, Combinado e total.
7. Sistema mostra total do Serviço e total do Autos.
8. Sistema compara matriz de distâncias em formato triangular.
9. Sistema compara matriz tarifária/seccionamento em formato triangular.
10. Sistema mostra mapa comparativo dos itinerários por Serviço e sentido.
11. Sistema gera PDF comparativo completo.
12. Sistema não chama OSRM nem recalcula rotas.
13. Sistema não altera os JSONs de entrada.
14. Sistema distingue semana padrão de operação de feriado.
15. Sistema não exibe offsets como dado principal de usuário.

---

## Estilo da entrega

Escreva a Spec 05 em Markdown, no mesmo estilo das Specs 01–04.

Não escreva código de implementação.

Não repita desnecessariamente o schema da Spec 02 nem as fórmulas já fechadas da Spec 03. Quando necessário, faça referência expressa às seções das Specs anteriores.

A Spec 05 deve ser detalhada o suficiente para orientar implementação posterior no frontend React/Next.js e a geração do PDF comparativo.
