Você é um arquiteto de produto e UX técnico. Gere a Spec 04 — UX, Formulário, Mapa, Importação/Exportação e PDF Operacional do projeto ROTA — Registro de Operação e Tabelas de Autos, usando como base obrigatória as Specs 01, 02 e 03.

A saída deve ser uma SPEC em Markdown, no mesmo estilo das anteriores, mas sem repetir regras já definidas. Quando uma regra já estiver nas Specs 01, 02 ou 03, apenas referencie a spec e o capítulo correspondente. A Spec 04 deve focar no que ainda falta: como o usuário interage com o sistema, como as telas se comportam, como o mapa funciona, como inserir horários, como revisar matrizes, como exportar JSON e como gerar o PDF operacional.

1. Referências obrigatórias

Use as Specs anteriores como fonte de verdade:

Spec 01: visão geral, escopo, ausência de workflow, ferramentas desacopladas, JSON como contrato, JSON como “salvar”, importação para preservar UUIDs.
Spec 02: estrutura do JSON, entidades, campos, UUIDs, status proposta/vigente, Seções, Locais, Serviços, Itinerários, Viagens, horarios_paradas, offset_horario, matrizes.
Spec 03: regras de cálculo, OSRM, pontos de rota, matriz de distâncias, matriz de seccionamento, regra dos 350 m, sugestão e redistribuição de horários, regra de feriado, contagem de viagens/opções de deslocamento, tarifa externa ao JSON.

Não copie o conteúdo dessas specs. Apenas use referências como: “conforme Spec 02 §11.1” ou “regra de cálculo definida na Spec 03 §8.2”.

2. Objetivo da Spec 04

A Spec 04 deve definir a UX do Formulário e do PDF operacional.

Ela deve responder:

Como o usuário começa: carregar JSON existente ou criar Autos do zero.
Como o usuário edita Autos, Serviços, Seções, Locais, Itinerários, Viagens e Matrizes.
Como o mapa é usado para montar e ajustar rotas.
Como o usuário insere horários sem precisar editar offsets manualmente.
Como o sistema apresenta a tabela horária para revisão e PDF.
Como são exibidas as matrizes de distâncias e de seccionamento.
Como o sistema valida pendências antes de exportar.
Como são gerados o JSON e o PDF operacional.

3. Fronteira da Spec 04

A Spec 04 não deve redefinir:

O schema do JSON.
As fórmulas de cálculo.
O algoritmo do OSRM.
O algoritmo da regra dos 350 m.
A estrutura interna de offset_horario.
A regra de contagem de viagens e opções de deslocamento.
O Comparador.
O Ingestor.
Workflow administrativo, aprovação, pendência, SEI ou permissões.

A Spec 04 deve apenas definir quando essas regras aparecem na tela, como o usuário interage com elas e como os resultados são apresentados.

4. Princípios de UX

Definir princípios curtos:

JSON é o salvar oficial.
Carregar JSON existente é o caminho recomendado quando já existe documento ROTA anterior.
Criar Autos do zero significa criar um documento ROTA sem base JSON anterior, não criar Autos novo administrativamente.
O usuário deve editar operação de forma operacional, não pensando na estrutura interna do JSON.
Offsets de locais podem ficar ocultos na interface principal.
O mapa é ferramenta de edição operacional.
O PDF deve ser legível como tabela operacional de linha de ônibus.
Valores monetários em R$ não serão apresentados nesta versão da UX/PDF; as matrizes exibem distâncias em km.

3. Tela Inicial

Definir duas ações:

3.1 Carregar JSON existente

Fluxo resumido:

Usuário escolhe arquivo .json.
Sistema valida estrutura conforme Spec 02.
Sistema preserva UUIDs conforme Spec 01/02.
Sistema abre o Autos para edição.
Sistema não recalcula rota ao abrir; apenas desenha a rota congelada do JSON, conforme Spec 03.

Mensagem esperada:

“Você está editando uma operação anterior. As entidades existentes manterão suas UUIDs.”

3.2 Criar Autos do zero

Deixar claro:

Usado para Autos que ainda não possuem JSON no formato ROTA.
Será muito usado na implantação.
Não significa criação de linha nova.
O usuário seleciona Autos/empresa/tipo a partir de listas estáticas, que são os autos de linha que já existem e estão cadastrados.
Todas as entidades criadas terão UUIDs novas.
O sistema deve avisar que, sem JSON anterior, não haverá preservação de identidade histórica para comparação.

4. Layout Geral do Formulário

Descrever a navegação principal em etapas:

Identificação
Serviços
Seções
Locais comuns
Itinerários e mapa
Viagens e horários
Matrizes
Revisão
Exportação JSON/PDF

Definir também:

Cabeçalho com Autos, empresa, tipo e status.
Painel de pendências.
Resumo operacional.
Área de mapa nas etapas de itinerário.

5. Identificação do Autos

Descrever apenas a UX dos campos:

Código do Autos.
Empresa.
Tipo.
Status.
Data de criação ou data de publicação.

Referenciar Spec 02 §4.1 para status, data_criacao, data_publicacao e ação “definir como vigente”.

Não repetir a regra do schema.

6. Serviços

Descrever a UX para:

Criar Serviço.
Editar Serviço.
Duplicar Serviço.
Remover Serviço.
Definir Ida, Volta ou ambos.
Exibir característica de veículo e caráter.

Referenciar Spec 02 para estrutura de Serviço e Spec 03 para validações de tipo × característica.

7. Seções, Locais comuns e Itinerários

A UX deve permitir o cadastro das seções, locais comuns, pontos de rota de um serviço e itinerário num mesmo mapa iterativo. Ocorrerá ao criar/alterar o itinerário de um serviço (ida ou volta)
O usuário deve conseguir de forma fluida lançar as seções, locais (pontos de parada comuns) e pontos de rota (feitos para acertar rotas) enquanto desenha a rota usando a ferramenta OSRM.

7.1 Inserção das seções:
Ao criar as seções (pelo mapa), deve ser solicitado dele os seguintes dados:

- Geolocalizações por Serviço e sentido. (as seções podem ter pontos diferentes de ida e de volta, ao criar as seções, inicialmente ele cria a ida e a volta no mesmo local, posteriormente, na geração do itinerario de volta, é dado ao usuário a possibilidade de alterar a localização do ponto da volta, seguindo regra da spec 03 § 7)
- Nome
- Município (não deve ser inserido pelo usuário, mas carregado de acordo com a geolocalização que ele escolheu - acredito ser necessário atualizar as regras de negócio spec03 para inserir como, coloquei um json que tem os polígonos que definem os municípios e o pop_municipios.csv que tem o nome dos municipios por cod_municipio ou codarea)
- A medida que o usuario for inserindo as seções e criando a rota, uma tabela com a associação da Seção ao Serviço.

Ao apresentar o mapa da criação/alteração do serviço, deve ser ofertado ao usuário a utilização das seções já existentes e também a possibilidade de criar novas seções (que serão pertencentes a todo documento).
As seções podem ter varios pontos de lat e long dependendo do serviço, ao ser escolhido utilizar uma das seçoes já cadastradas, deve ser oferecido ao usuário as opções dos autos já existentes. Obs.: se houver apenas um, já lança ele no mapa.

Referenciar Spec 02 §5 e Spec 03 §7 para as regras. Não reescrever o algoritmo (exceto inserindo regra de negocio para o município acima)

Fixar padrão visual de nome:

Cidade - Nome da Seção

Exemplo:

Sorocaba - Terminal São Paulo

Esse padrão deve ser usado em telas, tabelas, matrizes e PDF.

7.2 Locais comuns
Inserção na UX para Locais comuns:

- Locais pertencem ao Serviço.
- São pontos sem tarifa.
- Podem aparecer no itinerário.
- Não aparecem na matriz de seccionamento.
- Não devem poluir a tabela horária principal.
- Podem aparecer em modo avançado ou anexo técnico.
- Cada local comum (ponto de parada) pode ter um ou dois pontos georeferenciados (um para ida e outro para volta). Ele sempre cria os dois pontos (ida e volta) ao ser criado, se o serviço tiver sido cadastrado com serviço com ida e volta. Ao criar o itinerário de volta, esse ponto já aparecerá marcado como local para o itinerário passar, porém, o usuário poderá arrastá-lo para outros locais (com o bloqueio da regra dos 350 m - spec 03 §7), ou até mesmo excluir o ponto nesse sentido (por exemplo excluir apenas a volta).

Referenciar Spec 02 §7 e spec 03 § 7.

7.3 Itinerário e Mapa

Descrever como o usuário monta o itinerário:

Escolhe Serviço e sentido.
Insere Seções e Locais em ordem já criando a rota e visualizando a rota no mapa.
Deve ter tabela com lista de seções, paradas e pontos de rota.
Move coordenadas.
Recalcula rota quando altera itinerário.
Usa pontos de rota para forçar traçado.

Referenciar:

Spec 02 §10 para estrutura do itinerário.
Spec 03 §3 para OSRM.
Spec 03 §3.6 para pontos de rota.

Deixar claro na UX:

Abrir JSON não chama OSRM.
Alterar decidir por alterar itinerário de um serviço, paradas, coordenadas ou pontos de rota chama OSRM.
Ponto de rota não é Seção, Local nem Parada.
Enquanto houver rota inválida, bloquear exportação.

10. Viagens e Horário (Grade de horários)

Após a criação do serviço ou alteração do mesmo, a etapa seguinte é a definição da grade de horários.
Entendo que a grade de horários deve ser apresentada da seguinte forma:

                        SEG  TER  QUA  QUI  SEX  SAB  DOM

Municipio A - Seção 1 8h00 8h00 9h00 8h00 8h00 11h00 [local preenchivel pelo usuario]
Municipio B - Seção 2 8h15 8h15 9h15 8h15 8h15 11h15 -
Municipio C - Seção 3 8h45 8h45 9h45 8h45 8h45 11h45 -
Municipio D - Seção 4 9h00 9h00 10h00 9h00 9h00 12h00 -

Municipio A - Seção 1 9h00 9h00 10h00 9h00 9h00 [local preenchivel pelo usuario] -
Municipio B - Seção 2 9h15 9h15 10h15 9h15 9h15 - -
Municipio C - Seção 3 9h45 9h45 10h45 9h45 9h45 - -
Municipio D - Seção 4 9h00 9h00 11h00 10h00 10h00 - -

Cada coluna fosse um dia da semana e as viagens fossem ordenadas por horário que passam nas seções (finalizndo na ultima) e ordenadas pelo horário de início da viagem, conforme exemplo acima. Ao preencher o horario de inicio da viagem, os demais horarios sao preenchidos automaticamente confomre spec 03 cap 8. É possivel alterar os horarios passantes, e isso tbm aciona a regra de horario proporcional definido na spec 03 cap 8.

Deve ter um botao ou forma de apagar horarios inteiros.

Deve ter um botão que permite copiar uma viagem para outro dia. E tbm um botão que permita inserir uma viagem entre viagens ou no inicio da grade.

Deve ter uma tabela dessas para dias comuns, mas também deve haver uma tabela dessas para dias de feriado.
Essa tabela deve ter um botão solicitando copiar dias comuns, e preenche com horarios iguais a operação em dias comuns.

OBS.: com o redesenhar dessa UX, percebi que existe uma complecidade desnecessária no conceito de VIAGEM.
Vamos alterar na Spec02, como guardamos no JSON a informação.
Cada viagem vai ser definida pelo dia da semana que passa [sendo um unico dia, segunda, terca, quarta... um desses], viagem_feriado (sim ou não), se for viagem feriado sim, é uma viagem de feriado e cai na tabela de baixo, se não, é uma viagem comum e cai na tabela de cima. Mantem os conceitos de offsets/horarios_paradas. A ideia é extratificar as viagens em objetos mais simples.

11. PDF
    O PDF operacional não é o PDF comparativo. É o PDF que apresenta a operação do autos.
    Definir a estrutura do PDF, sem repetir regras de negócio:

Capa/identificação.
Resumo do Autos.
Serviços.
Itinerários por Serviço e sentido.
Tabela horária por Serviço, sentido e Seção.
Matriz de distâncias.
Matriz de seccionamento.
Rodapé técnico.

Regras específicas do PDF:

Deve ser legível como tabela operacional de linha de ônibus.
Deve usar nomes de Seções no padrão Cidade - Nome da Seção.
Deve apresentar matrizes em metade esquerda/inferior.
Deve apresentar distâncias em km.
Não deve apresentar R$.
Não deve apresentar offsets na tabela principal.
Pode ter anexo técnico com Locais/offsets se a Spec 04 considerar necessário.
Deve informar que o fluxo administrativo permanece no SEI.
A Grade de horário deve seguir esquema aqui definido, porém, deve apresentar duas versões, uma mais simples, apenas com os horarios de saída e outra ao fim do PDF como um detalhamento, com todos os horarios (passantes), mas não inserindo horários dos pontos de parada, da mesma forma que a UX.

2. Matrizes
   12.1 Matriz de distâncias

Definir apresentação:

Por Serviço.
Matriz triangular em metade esquerda/inferior.
Diagonal com “X”.
Cabeçalhos no padrão Cidade - Nome da Seção.
Valores em km.
Não exibir R$.
Permitir detalhe de ida/volta quando existir.

Formato:

Origem/Destino Cidade A - Seção A Cidade B - Seção B Cidade C - Seção C
Cidade A - Seção A X

Cidade B - Seção B 12,40 km X

Cidade C - Seção C 28,10 km 15,70 km X

Referenciar Spec 02 §8 e Spec 03 §4–5.

12.2 Matriz de seccionamento

Definir apresentação:

Por Serviço.
Matriz triangular em metade esquerda/inferior.
Diagonal com “X”.
Pares não habilitados com “—”.
Pares habilitados com distância em km.
Cabeçalhos no padrão Cidade - Nome da Seção.
Não exibir R$.
Permitir habilitar/desabilitar pares.
Permitir aceitar sugestão de menor distância.
Permitir edição manual da distância do par.

Referenciar Spec 02 §9, Spec 03 §6 e Spec 03 §11.

Explicitar decisão da UX:

Embora a Spec 03 trate a conversão distância → R$ como externa ao JSON e possível para exibição, nesta versão da Spec 04 o Formulário e o PDF não apresentarão valores monetários em R$. As matrizes exibem apenas distâncias em km.

13. Resumo Operacional

Definir que a tela de revisão e o PDF devem apresentar:

Por Serviço:

viagens semanais na ida;
viagens semanais na volta;
total semanal de viagens;
pares O-D compráveis;
opções de deslocamento na ida;
opções de deslocamento na volta;
total de opções de deslocamento.

Por Autos:

soma de viagens semanais;
soma de opções de deslocamento.

Apresentar tudo por faixa de horário também (madrugada, manha, entre pico manha, entre pico tarde, pico tarde, noite)

Referenciar Spec 03 §9 para as fórmulas. Não repetir os algoritmos.

14. Revisão e Validação

Descrever a tela final de revisão:

erros bloqueantes;
alertas;
rotas pendentes;
matrizes desatualizadas;
horários fora de ordem;
Seções ou Locais incompletos;
JSON inválido;
ausência de rota válida.

A geração de JSON/PDF só é liberada sem erros bloqueantes.

Referenciar Spec 02 para validações estruturais e Spec 03 para validações de cálculo.

15. Exportação JSON

Descrever as ações de UX:

Exportar proposta
Gera JSON proposta.
Preenche data de criação automaticamente.
Preserva UUIDs existentes.
Sugere nome de arquivo.

Referenciar Spec 02 §4.1.

Definir como vigente

Incluir esta ação porque está prevista na Spec 02 §4.1.

Explicar na Spec 04:

Não é aprovação no ROTA.
Não cria workflow.
É apenas ação técnica para gerar JSON marcado como vigente.
Pede data_publicacao.
Remove data_criacao.
Preserva UUIDs.
Exporta JSON vigente.

17. Estados de Erro e Mensagens

Listar apenas categorias de erro e comportamento esperado, sem reescrever validações:

JSON inválido.
Autos inexistente na lista estática.
Rota sem cálculo.
OSRM indisponível.
Sem rota entre paradas.
Ponto não ancorável.
Seção fora do limite de 350 m.
Local fora do limite de 350 m.
Horários fora de ordem.
Matriz desatualizada.
Tentativa de exportar com erro bloqueante.

As mensagens devem ser operacionais e claras.

18. Critérios de Aceite

Listar critérios objetivos:

Usuário consegue carregar JSON existente e editar preservando UUIDs.
Usuário consegue criar documento ROTA do zero para Autos sem JSON anterior.
Usuário consegue montar Serviços, Seções, Locais, Itinerários e rotas.
Usuário consegue inserir viagens por grade de Seções × padrões de dias.
Usuário não precisa editar offsets manualmente.
Sistema gera horarios_paradas[] completo internamente.
Sistema recalcula horários intermediários conforme Spec 03 §8.2.
Sistema apresenta tabela horária operacional por Seção e dia da semana.
Sistema apresenta matriz de distâncias em metade esquerda/inferior.
Sistema apresenta matriz de seccionamento em metade esquerda/inferior.
Sistema não apresenta R$ nas matrizes nem no PDF.
Sistema gera JSON aderente à Spec 02.
Sistema gera PDF operacional legível.
Sistema não introduz workflow administrativo.
