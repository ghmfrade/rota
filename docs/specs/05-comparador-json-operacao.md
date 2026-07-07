# Spec 05 — Comparador de JSONs de Operação

**Projeto:** ROTA — Registro de Operação e Tabelas de Autos
**Depende de:** [Spec 01 — Visão Geral do Sistema](01-visao-geral.md), [Spec 02 — Esquema do JSON de Operação](02-esquema-json-operacao.md), [Spec 03 — Regras de Negócio e Cálculo](03-regras-de-negocio-calculo.md), [Spec 04 — Formulário: UX, Mapa, Importação/Exportação e PDF Operacional](04-formulario-ux-pdf.md)
**Status:** Em definição — v0.1 (comparação por UUID; diff campo-a-campo; PDF comparativo; mapa comparativo lendo a rota congelada)
**Escopo:** Como funciona a ferramenta **Comparador** — a segunda das três ferramentas desacopladas do ROTA (Spec 01 §2). Recebe **dois JSONs de operação válidos** (Spec 02), casa suas entidades por identidade estável (UUID), apresenta as diferenças na tela e gera um **PDF comparativo próprio**, distinto do PDF operacional do Formulário (Spec 04 §13). Define, em nível de produto, regra de negócio, UX e PDF, o comportamento do Comparador. **Não é escopo desta spec (fronteira):** o schema do JSON (Spec 02); as fórmulas de cálculo, roteamento e contagem (Spec 03) — o Comparador **lê o congelado**, não recalcula; o Formulário e o PDF operacional (Spec 04); o Ingestor e o PostgreSQL (Spec 06); e todo o fluxo administrativo — análise, pendências, aprovação, publicação, vigência real —, que **permanece no SEI** (Spec 01 §3).

> **Nota de posicionamento.** O Comparador **não é** sistema de aprovação, workflow ou tramitação. O SEI continua responsável por análise, pendências, aprovação e publicação (Spec 01 §1, §3). O Comparador **apenas** lê dois JSONs, mostra diferenças e gera PDF comparativo — sem alterar os arquivos, sem chamar o OSRM e sem persistir nada no servidor.

---

## 1. Papel deste Documento

A Spec 01 §2 previu o Comparador como ferramenta separada, unida ao resto do sistema **só pelo JSON**; a Spec 02 §4.1 e §12 deixaram notas explícitas sobre o que o Comparador deve e não deve tratar como diferença (identidade por UUID; `status`/datas fora do diff); a Spec 03 §7.3/§7.4 e §9.2 fixaram o que o Comparador reaproveita das regras de cálculo (só as **checagens estáticas** e a **contagem neutra a feriado** — nunca recálculo); e a Spec 04 §18 registrou três recomendações diretas para esta spec (diff de Viagem por Viagem-dia; comparar rota por sinais estáveis, não por igualdade de `geometria`; comparar a descrição do itinerário pela lista estruturada `descricao_itinerario.itens`). Este documento resolve tudo isso: define entradas, validação, casamento, taxonomia de diferenças, cada tela de comparação, os filtros, o PDF comparativo, os estados de erro e os critérios de aceite.

Princípios herdados que restringem todo o comportamento do Comparador:

- **Leitor estático.** Comparador e Ingestor **leem** o congelado (rota, trechos, matrizes, descrição, contagens); **nunca** recalculam contra o OSRM nem re-derivam distância/horário/matriz (Spec 02 §8, §10.2; Spec 03 §1, §12).
- **Não chama OSRM.** Nenhuma requisição de roteamento acontece no Comparador (Spec 01 §8; Spec 03 §12).
- **Não altera os JSONs** de entrada e **não salva nada no servidor** (Spec 01 §2 — persistência "Nenhuma").
- **Identidade é por UUID** (Spec 01 §6; Spec 02 §12), nunca por rótulo humano (`numero_n`, `nome`).
- **Padrão visual de Seção é sempre `Cidade - Nome da Seção`** (Spec 04 §7.1), em todas as telas, tabelas, matrizes e no PDF.
- **Sem offsets para o usuário comum** (Spec 04 §2.5): o Comparador apresenta **horários absolutos** de saída/passagem, resolvidos por `horario_saida + offset_horario` (Spec 02 §11.1), nunca os offsets crus.
- **Sem R$** (Spec 04 §2.8): matrizes e resumos exibem distância em **km**; a conversão distância→R$ permanece externa (Spec 03 §11), fora desta versão.

---

## 2. Escopo e Não-Escopo do Comparador

**Está no escopo do Comparador:**

- Carregar **dois** JSONs de operação (Spec 02) e rotulá-los como **Arquivo 1** e **Arquivo 2**, com rótulos configuráveis pelo usuário (§3, §7).
- Validar que os dois arquivos são JSONs de operação válidos e **comparáveis** (§4).
- Casar entidades entre os dois arquivos por **UUID** (§5) e classificar cada diferença numa taxonomia simples (§6).
- Apresentar, na tela, o comparativo: visão geral (§8), Serviços (§9), viagens por faixa (§10), opções de deslocamento (§11), tabela horária detalhada (§12), matriz de distâncias (§13), matriz tarifária/seccionamento (§14) e mapa comparativo dos itinerários (§15).
- Gerar um **PDF comparativo** completo (§17).

**NÃO está no escopo do Comparador (é do SEI ou de outra ferramenta):**

- Aprovação, pendência, manifestação, tramitação, workflow, vigência real, publicação em DOE — tudo do **SEI** (Spec 01 §3).
- Recalcular rota, distância, matriz, horário, descrição do itinerário ou município — é do **Formulário** (Spec 03/04); o Comparador lê o congelado.
- Chamar o OSRM (Spec 01 §8).
- Editar, corrigir ou salvar os JSONs — o Comparador é **somente-leitura** sobre os dois arquivos.
- Ingerir no PostgreSQL — é do **Ingestor** (Spec 06).
- Decidir qual arquivo "vence" — o Comparador **descreve** diferenças; a decisão é humana, fora do ROTA.

---

## 3. Entradas do Comparador

O único contrato de entrada são **dois JSONs de operação válidos** conforme Spec 02. Não há outra entrada obrigatória — nenhuma lista estática, nenhum acesso a servidor, nenhum recurso além dos dois arquivos.

### 3.1 Os dois arquivos e seus rótulos

- O Comparador chama os arquivos de **Arquivo 1** e **Arquivo 2** — **não** "vigente/proposta" de forma rígida —, porque a comparação precisa suportar todos os cenários:
  - vigente × proposta;
  - proposta × proposta;
  - vigente antigo × vigente novo;
  - arquivo 1 × arquivo 2 genérico.
- Ao carregar cada arquivo, o Comparador **sugere um rótulo** a partir do `autos.status` e da data de cada JSON (Spec 02 §4/§4.1): ex.: `Vigente (publicado em 2026-03-01)`, `Proposta (criada em 2026-07-01)`. O usuário pode **editar** o rótulo livremente (ex.: "Proposta A", "Proposta B", "Vigente 2025", "Vigente 2026").
- O rótulo é apenas **exibição** — orienta a leitura das colunas "Arq. 1"/"Arq. 2" nas tabelas e no PDF. Não altera nenhuma regra de comparação: a direção do diff (o que é "antigo" e o que é "novo") é **posicional** — Arquivo 1 é o lado esquerdo/anterior, Arquivo 2 é o lado direito/posterior (§6).

### 3.2 Recursos estáticos (opcionais)

- Os JSONs são **autossuficientes** (Spec 01 §5): trazem `municipio` já derivado e congelado (Spec 02 §5/§7), rota, trechos, matrizes e descrição já congelados. O Comparador **não precisa** da base de municípios nem de listas estáticas para operar.
- A base de municípios de SP (`municipios_sp.geojson` + `pop_municipios.csv`) e a tabela de tarifa da portaria (Spec 03 §11) **não** são entradas do Comparador nesta versão (sem R$ — §1). Ficam disponíveis para uma versão futura, se acoplada tabela tarifária.

---

## 4. Validação dos JSONs Carregados

Antes de comparar, o Comparador valida cada arquivo e a compatibilidade entre eles. As checagens dividem-se em **por arquivo** e **entre arquivos**.

### 4.1 Validação por arquivo (cada JSON isolado)

Aplica as validações estruturais da Spec 02 §14 e as checagens estáticas que a Spec 03 delegou a leitores estáticos (§7.3, §7.4):

| Checagem | Origem | Falha |
|---|---|---|
| É JSON bem-formado | — | **Bloqueante** — o arquivo não é sequer JSON. |
| Segue o schema da Spec 02 (`versao_schema`, árvore, tipos, XOR de Parada, extremos-Seção, contagens de trechos etc.) | Spec 02 §14 | **Bloqueante** — não é um JSON de operação válido. |
| UUID bem-formado e único por categoria no documento | Spec 02 §12/§14 | **Bloqueante** se ausente/duplicado onde é obrigatório; ver §4.3 para o caso de UUID faltante que compromete o casamento. |
| Regra dos 350 m (checagem estática fraca, centroide dos pontos finais) | Spec 03 §7.3/§7.4 | **Alerta técnico** — o Comparador sinaliza, não bloqueia (não tem o histórico de inserção; Spec 03 §7.3). |
| Tipificação `tipo` × `caracteristica_veiculo` | Spec 03 §10 | **Alerta técnico** — sinaliza inconsistência, não bloqueia a comparação. |

O Comparador **não re-deriva** município, rota, matriz nem contagem para validar — usa o que está congelado. As checagens de 350 m e tipificação são as **estáticas** que a Spec 03 §12 explicitamente autoriza ao leitor estático; qualquer violação vira **alerta técnico** (§6), não impede a comparação.

### 4.2 Validação entre arquivos (compatibilidade)

| Checagem | Regra | Ação |
|---|---|---|
| **Mesmo Autos** (`autos.codigo`) | Os dois JSONs devem ser do **mesmo** Autos. | **Bloqueio da comparação principal** (§4.4). |
| **Versão de schema** (`versao_schema`) | Comparar mesmo com versões diferentes é permitido; versões distintas geram **alerta técnico** e podem reduzir a confiabilidade campo-a-campo (campos novos/removidos entre versões). | **Alerta técnico**; comparação prossegue. |
| **Preservação de UUID** | Heurística (§5.4): se quase nenhuma entidade casa por UUID e há forte semelhança de nome/rótulo, provavelmente um dos JSONs foi criado do zero sem preservar identidade (Spec 04 §3.2). | **Alerta técnico** proeminente na visão geral (§8). |

### 4.3 `status`, `data_criacao`, `data_publicacao` — exibir, não comparar

Conforme a **nota explícita para a Spec 05** na Spec 02 §4.1: `status`, `data_criacao` e `data_publicacao` são **autodeclaração** do documento, **não** dado de operação comparável.

- São **exibidos** no cabeçalho de cada arquivo (na visão geral §8, no PDF §17) — para o usuário saber o que carregou.
- **Não participam** do diff campo-a-campo. Se participassem, todo diff acusaria falsamente "mudou a data de criação", já que `data_criacao` muda a cada exportação (Spec 02 §4.1).
- Uma diferença de `status` (ex.: Arq. 1 `vigente` × Arq. 2 `proposta`) é informação de cabeçalho, **nunca** uma "diferença operacional".

### 4.4 Bloqueio por Autos diferentes (decisão justificada)

**Decisão fechada: comparar dois JSONs de Autos diferentes é bloqueado como comparação principal.**

Justificativa: a comparação principal do Comparador é **"duas versões de um mesmo Autos"** (Spec 01 §2 — "vigente × proposta"; título desta spec). Todo o casamento é por **UUID de entidade dentro do documento** (Spec 02 §12); UUIDs de Autos diferentes **nunca** coincidem (são gerados independentemente em documentos distintos — Spec 01 §6), então o diff degeneraria em "removeu tudo do Autos A, adicionou tudo do Autos B" — ruído sem valor analítico, e potencialmente enganoso (sugeriria equivalências de Serviço/Seção que não existem). Além disso, a semântica de "Δ viagens", "Δ opções", "Δ distância" só faz sentido dentro do mesmo Autos.

- **Comportamento:** ao detectar `autos.codigo` diferente entre os dois arquivos, o Comparador **bloqueia** a comparação principal com mensagem clara (§18) e mostra os dois cabeçalhos lado a lado, deixando explícito que os Autos são diferentes.
- **Escape controlado (opcional, fora da comparação principal):** o Comparador pode oferecer um modo explícito "comparar assim mesmo (Autos diferentes)" que **apenas** justapõe métricas agregadas (contagens totais, nº de Serviços/Seções) sem tentar casar entidades por UUID — deixando visualmente marcado que **não** é uma comparação de versões do mesmo Autos. Esse modo **não** gera o PDF comparativo padrão (§17) e é rotulado como justaposição, não diff. É opcional nesta versão; a recomendação é **bloquear** por padrão.

---

## 5. Estratégia de Casamento entre Entidades

O casamento é feito **prioritariamente por `uuid`** — a regra de identidade estável das Specs 01 §6 e 02 §12. É o coração do Comparador: sem ele, o diff não distingue "alterou" de "removeu e recriou".

### 5.1 Entidades com UUID (casáveis)

As **quatro** entidades que carregam `uuid` estável (Spec 02 §12) são as unidades de casamento:

| Entidade | Coleção | Escopo de unicidade da UUID |
|---|---|---|
| **Seção** | `autos.secoes[]` | Documento inteiro |
| **Serviço** | `autos.servicos[]` | Documento inteiro |
| **Local** (comum) | `servico.locais[]` | Documento inteiro (mesmo não sendo compartilhado — Spec 02 §12) |
| **Viagem** | `itinerario.viagens[]` | Documento inteiro |

### 5.2 Regra principal — casar por UUID

Para cada categoria de entidade, o Comparador compara o conjunto de UUIDs do Arquivo 1 com o do Arquivo 2:

- **mesma `uuid` nos dois arquivos** = **mesma entidade** → comparar campos (Alterado ou Inalterado, §6);
- **`uuid` presente apenas no Arquivo 1** = entidade **Removida** (existia antes, saiu);
- **`uuid` presente apenas no Arquivo 2** = entidade **Adicionada** (nova).

Isso vale para Seção, Serviço, Local e Viagem (Spec 02 §12, diff resultante). É a regra **dura** — não é substituída por nenhuma heurística.

### 5.3 Entidades e valores sem UUID (casados por contexto)

Alguns dados relevantes **não** têm `uuid` próprio e são casados pelo **contexto do pai já casado** (por UUID) mais uma chave estrutural:

| Dado | Chave de casamento | Observação |
|---|---|---|
| **Itinerário** | `servico_uuid` (pai) + `sentido` (`ida`/`volta`) | Um Serviço tem no máximo um itinerário por sentido (Spec 02 §10) — a chave é única. |
| **Parada** | itinerário casado + `secao_uuid`/`local_uuid` que ela referencia (também casáveis) | A `ordem` pode mudar sem que a parada "mude de identidade"; casa-se pela Seção/Local referenciado, não pela `ordem`. |
| **ParDistância** (`matriz_distancias`) | Serviço casado + par não-ordenado `{secao_a_uuid, secao_b_uuid}` | Ambas as Seções são casadas por UUID (§5.2). |
| **ParSeção** (`matriz_seccionamento`) | Serviço casado + par não-ordenado `{secao_a_uuid, secao_b_uuid}` | Idem. |
| **Ponto de rota** | Não é entidade comparável (sem `uuid`) | O Comparador **não** os compara par-a-par; a mudança de traçado aparece pelo **efeito observável** (§15.3, Spec 03 §3.6.2). |
| **Geolocalização de Seção por Serviço** | Seção casada + Serviço casado + sentido | Compara `geolocalizacao_<sentido>` da entrada `secao.servicos[servico_uuid]` (§15.4). |
| **HorárioParada / offset** | Viagem casada + `parada_ordem` da parada casada | Comparado como **horário absoluto** de passagem, nunca como offset cru (§1, §12.4). |

### 5.4 Heurística opcional de "entidade recriada" (não substitui a regra por UUID)

Quando houver entidade **sem** correspondência de UUID (aparente Removida no Arq. 1 + aparente Adicionada no Arq. 2), mas com **nome/rótulo muito semelhante** (ex.: mesma Seção `Santos - Terminal Central` com UUID diferente), o Comparador **pode** apresentar um **alerta de "possível entidade recriada"**:

- É um **auxílio de leitura**, exibido como **Alerta técnico** (§6) ao lado do par Removida/Adicionada — nunca reclassifica automaticamente para "Alterada".
- **Não substitui** a regra principal: sob a regra por UUID, essas entidades continuam sendo uma Removida e uma Adicionada.
- Critério da semelhança (nome normalizado igual, mesmo `municipio`, proximidade geográfica dentro de um limiar) é detalhe de implementação; a decisão de produto é: **sinalizar, não casar**.

### 5.5 Impacto de JSON criado do zero (identidade não preservada)

A Spec 04 §3.2 avisa: um documento criado do zero, sem partir de um JSON anterior, **não preserva UUIDs** — todas as entidades ganham UUID nova (Spec 02 §12). Consequência direta no Comparador:

- Se o usuário comparar um JSON vigente com uma proposta **criada do zero** (em vez de carregada e editada), o Comparador verá **todas** as entidades antigas como **Removidas** e **todas** as novas como **Adicionadas** — mesmo que operacionalmente sejam "as mesmas" Seções/Serviços com pequenas mudanças.
- O Comparador detecta esse padrão (taxa de casamento por UUID próxima de zero) e exibe o **alerta de UUIDs não preservados** com destaque na visão geral (§8) e no PDF (§17), explicando que o diff campo-a-campo perde valor e que a comparação recai sobre "adicionado/removido" em bloco.
- A **prevenção** é do Formulário (carregar o JSON vigente para editar — Spec 04 §3.1/§3.2); o Comparador apenas **relata** a consequência, com clareza.

---

## 6. Tipos de Diferença (Taxonomia)

Taxonomia simples, aplicada uniformemente a **Serviços, Seções, Locais, Itinerários, Viagens, Matrizes (pares) e Rotas**:

| Tipo | Definição | Como se detecta |
|---|---|---|
| **Adicionado** | Existe **apenas** no Arquivo 2. | UUID (ou chave de contexto) só no Arq. 2 (§5). |
| **Removido** | Existe **apenas** no Arquivo 1. | UUID (ou chave de contexto) só no Arq. 1 (§5). |
| **Alterado** | Existe nos **dois**, mas algum campo **operacional** mudou. | Entidade casada com ≥ 1 campo comparável divergente. |
| **Inalterado** | Existe nos dois e **nenhum** campo operacional mudou. | Entidade casada, todos os campos comparáveis iguais. |
| **Alerta técnico** | Comparação possível, mas com **risco de baixa confiabilidade**. | Ausência de UUID onde deveria haver; schema incompatível; documento criado do zero; violação de 350 m/tipificação na checagem estática; "possível entidade recriada". |

Regras da taxonomia:

- **"Campo operacional"** exclui os campos de autodeclaração (`status`, `data_criacao`, `data_publicacao` — §4.3) e os campos **derivados/congelados que não representam intenção operacional** por si (ex.: igualdade byte-a-byte de `rota.geometria` — comparada por sinais estáveis, §15.3). Inclui: característica de veículo, caráter, direcionalidade, conjunto de paradas/Seções, horários absolutos, distâncias das matrizes, pares habilitados no seccionamento, geolocalizações, `descricao_itinerario.itens`.
- **Direção do diff é posicional:** Arquivo 1 é o estado **anterior**, Arquivo 2 o **posterior**. "Adicionado" e "Removido" são sempre relativos a essa ordem. Todo `Δ` é `valor(Arq. 2) − valor(Arq. 1)` (positivo = aumento do Arq. 1 para o Arq. 2).
- **Alerta técnico não é excludente:** uma entidade pode ser "Alterada" **e** carregar um alerta técnico (ex.: alterada, mas num documento com schema incompatível). O alerta acompanha a diferença, não a substitui.
- **Propagação:** um Serviço é "Alterado" se qualquer coisa abaixo dele mudou (paradas, itinerário, matriz, viagens); a visão geral (§8) agrega, e as telas específicas (§9–§15) detalham onde.

---

## 7. Tela Inicial e Carregamento dos Arquivos

### 7.1 Carregamento

Duas áreas de upload, lado a lado — **Arquivo 1** (esquerda) e **Arquivo 2** (direita):

1. O usuário escolhe um `.json` em cada área (arrastar-e-soltar ou seletor de arquivo).
2. Para cada arquivo, o Comparador roda a **validação por arquivo** (§4.1). Arquivo que falhe em checagem bloqueante exibe o erro (§18) e não entra na comparação.
3. Com os dois arquivos válidos, roda a **validação entre arquivos** (§4.2): Autos diferentes → bloqueio (§4.4); schema/UUID → alertas técnicos.
4. Cada arquivo recebe um **rótulo sugerido** a partir de `status`+data (§3.1), **editável** pelo usuário num campo ao lado do nome do arquivo.
5. Botão **"Comparar"** (habilitado só com dois arquivos válidos e comparáveis) leva à **Visão Geral** (§8).

### 7.2 Ordem e troca dos arquivos

- O usuário pode **inverter** Arquivo 1 ↔ Arquivo 2 com um botão ("trocar lados"), útil quando carregou na ordem errada — isso apenas espelha a direção do diff (todo `Δ` troca de sinal; "Adicionado" vira "Removido" e vice-versa).
- Trocar/recarregar um dos arquivos re-executa a validação e o casamento; nada é persistido entre sessões (§1).

### 7.3 O que a tela inicial mostra antes de comparar

Para cada arquivo carregado, um cartão com: nome do arquivo, `autos.codigo`, `empresa`, `tipo`, `status` + data, `versao_schema` — os campos de cabeçalho (§4.3), **antes** de qualquer diff, para o usuário confirmar que carregou os arquivos certos.

---

## 8. Visão Geral do Comparativo

Primeira tela após "Comparar" — o **resumo executivo** do diff. É a resposta rápida a "o que mudou entre os dois arquivos".

### 8.1 Cabeçalho comparativo

Dois blocos lado a lado (Arq. 1 | Arq. 2), cada um com: rótulo (editável — §3.1), `autos.codigo` (idêntico, por §4.4), `empresa`, `tipo`, `status`, data (`data_criacao`/`data_publicacao`), `versao_schema`. Campos de autodeclaração exibidos, **não** contados como diferença (§4.3). Diferenças de `empresa`/`tipo` (raras no mesmo Autos) aparecem destacadas como cabeçalho, com nota.

### 8.2 Placar de diferenças

Contadores agregados, por categoria da taxonomia (§6):

- **Serviços:** adicionados / removidos / alterados / inalterados.
- **Seções:** adicionadas / removidas / alteradas / inalteradas.
- **Locais comuns:** adicionados / removidos / alterados (em visualização técnica — §1/§12.5).
- **Viagens (semana padrão):** variação total de viagens semanais (Δ), por Serviço e no Autos (§10).
- **Opções de deslocamento (semana padrão):** variação total (Δ), por Serviço e no Autos (§11).
- **Matriz de distâncias:** nº de pares alterados / adicionados / removidos; maior aumento e maior redução (§13.4).
- **Matriz tarifária / seccionamento:** pares adicionados / removidos / com distância alterada; impacto em pares O-D compráveis (§14.4).

### 8.3 Principais alterações (destaques)

Lista curta e priorizada dos maiores impactos — para o técnico ir direto ao que importa:

- maiores variações de viagens por Serviço;
- maiores variações de opções de deslocamento;
- maiores mudanças de distância de itinerário (por sentido);
- Serviços adicionados/removidos;
- Seções adicionadas/removidas.

### 8.4 Alertas na visão geral

- **UUIDs possivelmente não preservados** (§5.5) — destaque forte quando a taxa de casamento por UUID é anormalmente baixa: *"Os arquivos parecem não preservar a identidade das entidades — o comparativo pode estar tratando entidades equivalentes como removidas/adicionadas."*
- **Schema incompatível** (§4.2) — versões de `versao_schema` diferentes.
- **Checagens estáticas** (350 m, tipificação — §4.1) que falharam em algum arquivo.

### 8.5 Ação de PDF

Botão **"Gerar PDF comparativo"** (§17), disponível a partir daqui e das demais abas.

---

## 9. Comparação de Serviços

Casamento por `uuid` de Serviço (§5.2). Tabela de Serviços com situação e campos comparados.

### 9.1 Tabela de Serviços

| Serviço (`numero_n`) | Situação | Característica veículo | Caráter | Direcionalidade | Δ viagens | Δ opções |
|---|---|---|---|---|---|---|

- **Serviço** exibido pelo rótulo humano `numero_n` (Spec 02 §6) — **mas** casado por `uuid` (o `numero_n` pode ter mudado sem trocar de identidade; se mudou, mostra-se `antigo → novo`).
- **Situação:** Adicionado / Removido / Alterado / Inalterado (§6).
- Campos comparados por Serviço casado: `caracteristica_veiculo`, `carater`, direcionalidade (quais sentidos existem: só Ida / só Volta / ambos), `numero_n` (display).
- **Δ viagens / Δ opções:** resumo das contagens da semana padrão (§10, §11) para navegação rápida.

### 9.2 Campos alterados de um Serviço

Ao expandir um Serviço "Alterado", mostra os campos que mudaram no padrão `antigo → novo` (ex.: `caráter: principal → parcial`; `direcionalidade: ambos → só Ida`). Mudança de direcionalidade é destacada, porque muda a existência de itinerários e afeta matrizes/contagens.

### 9.3 Serviços adicionados/removidos

- **Adicionado:** exibe o Serviço novo com seu resumo (do Arq. 2), marcado como novo — não há "antigo" a comparar.
- **Removido:** exibe o Serviço que saiu (do Arq. 1), marcado como removido.

---

## 10. Comparação de Viagens Ofertadas por Faixa de Horário

Compara a **quantidade de viagens ofertadas**, seguindo a fórmula de contagem da Spec 03 §9.4 e a **semana padrão, sem feriados** (Spec 03 §9.2) — Viagens com `viagem_feriado = false`. Viagens de feriado vão em tabela separada (§10.4), **sem misturar**.

### 10.1 Dimensões da comparação

A contagem é comparada:

- **por Serviço** (casado por UUID);
- **por sentido:** Ida, Volta;
- **em combinação Ida + Volta** (Combinado);
- **por faixa de horário** (§10.2);
- **no total de todos os horários** (linha de total por Serviço);
- **no total do Autos** (soma dos Serviços).

A classificação da faixa usa o **`horario_saida` da Viagem** (Spec 03 §9.4, "estratificação por faixa"; faixas da Spec 04 §10).

### 10.2 Faixas de horário (herdadas da Spec 04 §10)

| Faixa | Intervalo |
|---|---|
| Madrugada | 00:00–04:59 |
| Pico manhã | 05:00–08:59 |
| Entre-pico manhã | 09:00–10:59 |
| Entre-pico almoço | 11:00–13:59 |
| Entre-pico tarde | 14:00–16:59 |
| Pico tarde | 17:00–19:59 |
| Noite | 20:00–23:59 |

### 10.3 Tabela de comparação (por Serviço)

Mínimo de colunas (uma linha por faixa + linha de total):

| Serviço | Faixa | Ida Arq. 1 | Ida Arq. 2 | Δ Ida | Volta Arq. 1 | Volta Arq. 2 | Δ Volta | Combinado Arq. 1 | Combinado Arq. 2 | Δ Combinado |
|---|---|---|---|---|---|---|---|---|---|---|

- Uma linha por **faixa** (§10.2), mais uma linha **"Total — todos os horários"** por Serviço.
- **Combinado = Ida + Volta** em cada faixa.
- Cada `Δ` = `Arq. 2 − Arq. 1` (positivo = aumentou; §6).
- Abaixo dos Serviços, um bloco **"Total do Autos"** com a mesma estrutura (faixas × Ida/Volta/Combinado, com Δ), somando todos os Serviços.

### 10.4 Viagens de feriado (tabela separada)

- As Viagens com `viagem_feriado = true` **não** entram na contagem principal (Spec 03 §9.2) — aparecem numa **tabela de feriados própria**, com a mesma estrutura de faixas, comparando Arq. 1 × Arq. 2.
- Rótulo obrigatório: a tabela principal é **"semana padrão (sem feriados)"** (Spec 04 §10/§13.3); a de feriados é claramente marcada como operação de feriado.
- Dois JSONs que difiram **apenas** na grade de feriados têm as **mesmas** contagens principais (Spec 03 §9.2) — a diferença aparece só na tabela de feriados.

---

## 11. Comparação de Opções de Deslocamento por Faixa e Total

Compara as **opções de deslocamento** — estatística derivada (Spec 01 §4; Spec 03 §9.4): `opções(serviço, sentido) = viagens_semana(serviço, sentido) × |pares_compraveis(serviço)|`, sempre na **semana padrão** (Spec 03 §9.2). O Comparador **lê/recompõe** essa estatística a partir dos dados congelados dos dois arquivos — não inventa regra nova; aplica a fórmula fechada da Spec 03 a cada arquivo e compara os resultados.

### 11.1 O que o Comparador calcula por arquivo

Para **cada arquivo**, por Serviço e sentido (usando as fórmulas da Spec 03 §9.4):

- **pares O-D compráveis** = `matriz_seccionamento` ∪ par ponta-a-ponta (Spec 03 §9.4);
- **viagens por faixa** (§10);
- **opções de deslocamento por faixa** = viagens da faixa × pares compráveis;
- **opções totais no Serviço** = Ida + Volta;
- **opções totais no Autos** = Σ dos Serviços.

### 11.2 Tabela de comparação (por Serviço)

| Serviço | Faixa | Opções Ida Arq. 1 | Opções Ida Arq. 2 | Δ Ida | Opções Volta Arq. 1 | Opções Volta Arq. 2 | Δ Volta | Opções Combinadas Arq. 1 | Opções Combinadas Arq. 2 | Δ Combinado |
|---|---|---|---|---|---|---|---|---|---|---|

- Uma linha por **faixa**, mais **"Total — todos os horários"** por Serviço, mais **"Total do Autos"**.
- Combinada = Ida + Volta; cada `Δ` = `Arq. 2 − Arq. 1`.

### 11.3 Por que as opções mudam (explicação exibida)

Como opção de deslocamento é `viagens × pares compráveis`, uma variação pode vir de **qualquer** dos fatores. O Comparador exibe uma nota explicando as causas possíveis, para o técnico interpretar o Δ:

- **aumento/redução de viagens** (fator "viagens" — §10);
- **mudança no seccionamento** (fator "pares compráveis" — §14): pares habilitados/desabilitados alteram `|pares_compraveis|`;
- **inclusão/remoção de Seções** (muda o conjunto de pares possíveis e o par ponta-a-ponta);
- **mudança de Serviço** (Serviço adicionado/removido);
- **alteração de direcionalidade** (ganhar/perder um sentido muda viagens **e** o cálculo por sentido).

Quando possível, o Comparador **atribui** a variação de opções de um Serviço aos fatores (ex.: "+120 opções: +8 viagens na Ida × 15 pares; seccionamento inalterado"), como leitura auxiliar.

---

## 12. Comparação de Tabelas Horárias (Detalhada)

Além dos totais por faixa (§10), uma visão **detalhada** por horário, casando Viagens por `uuid` (Spec 02 §11/§12; Spec 04 §18). A tabela principal mostra **Seções**, não Locais comuns; horários **absolutos**, nunca offsets.

### 12.1 Escopo e seleção

Por **Serviço** e **sentido** (Ida/Volta), o usuário vê o diff das Viagens. Seleção de Serviço e sentido no topo; separação entre **semana padrão** (Viagens `viagem_feriado = false`) e **feriados** (`= true`), sem misturar (§10.4; Spec 03 §9.2).

### 12.2 Situações de Viagem que a tela mostra

Casando por `uuid` de Viagem (§5.2):

- **viagens adicionadas** (UUID só no Arq. 2);
- **viagens removidas** (UUID só no Arq. 1);
- **viagens mantidas com horário alterado** (mesma UUID, `horario_saida`/horários de passagem diferentes);
- **viagens mantidas sem alteração** (mesma UUID, tudo igual);
- **mudança de dia da semana** (`dia_semana` diferente na mesma Viagem);
- **mudança entre viagem comum e viagem de feriado** (`viagem_feriado` diferente na mesma Viagem);
- **mudança nos horários passantes pelas Seções** (offsets diferentes → horários absolutos de passagem diferentes por Seção).

### 12.3 Formato do diff de horário

Quando a **mesma Viagem** existe nos dois arquivos, o formato é **horário antigo → horário novo (Δ minutos)**:

```
segunda, Ida, 08:00 → 08:15 (+15 min)
```

- O `Δ` é a diferença em minutos (positivo = atrasou/mais tarde; negativo = adiantou).
- Para os **horários passantes por Seção**, cada Seção alterada mostra seu próprio `antigo → novo (Δ)`, com o nome no padrão `Cidade - Nome da Seção` (§1). Horários são **absolutos** (`horario_saida + offset` — Spec 02 §11.1), nunca offsets crus (§1).
- Mudança de `dia_semana` mostra `segunda → terça`; mudança de `viagem_feriado` mostra `comum → feriado` (ou vice-versa).

### 12.4 Tabela principal — Seções, não Locais

- Linhas da tabela detalhada = **Seções** do itinerário, na ordem da travessia, padrão `Cidade - Nome da Seção` (Spec 04 §8.1/§13.2).
- **Locais comuns não aparecem** na tabela principal (Spec 04 §2.5/§8.1) — vão para **anexo técnico** (§12.5, §17 item 10).
- Colunas conforme a grade da Spec 04 §8.1 (dias/blocos), agora em modo comparativo (antigo → novo por célula).

### 12.5 Locais comuns (anexo técnico)

Diferenças de horário de passagem por **Locais comuns** (offsets internos) e adição/remoção/alteração de Locais aparecem só na **visualização técnica** ou no **anexo do PDF** (§17 item 10) — nunca como elemento principal (§1; Spec 04 §7.2/§13.1).

---

## 13. Comparação da Matriz de Distâncias

Compara `matriz_distancias` (Spec 02 §8), **por Serviço**, casando pares por `{secao_a_uuid, secao_b_uuid}` (§5.3). Lê o congelado — **não** recalcula (Spec 03 §4/§12).

### 13.1 UX da matriz (herdada da Spec 04 §9.1)

- **Triangular inferior**, diagonal com **`X`**;
- cabeçalhos de linha e coluna no padrão **`Cidade - Nome da Seção`**;
- valores em **km**;
- **uma matriz por Serviço**, com **seletor de Serviço** no topo;
- somente-leitura (é matriz computada — Spec 02 §8).

### 13.2 Diferença por célula

Cada célula (par de Seções) mostra a diferença entre Arq. 1 e Arq. 2, usando `valor_adotado_de_distancia` (Spec 02 §8):

| Estado | Formato da célula |
|---|---|
| sem mudança | `12,40 km` |
| alterado | `12,40 → 13,10 km (+0,70)` |
| adicionado (par só no Arq. 2) | `— → 13,10 km` |
| removido (par só no Arq. 1) | `12,40 km → —` |

- `Δ` = `Arq. 2 − Arq. 1`, em km, com sinal.
- Pares aparecem/desaparecem quando Seções são adicionadas/removidas ou quando a direcionalidade muda.

### 13.3 Detalhe expandido Ida/Volta

Quando existirem `distancia_trecho_ida` e `distancia_trecho_volta` (Serviço bidirecional — Spec 02 §8), a célula permite **detalhe expandido**, como na Spec 04 §9.1:

- **valor adotado** (`valor_adotado_de_distancia`) — Arq. 1 → Arq. 2;
- **distância Ida** (`distancia_trecho_ida`) — Arq. 1 → Arq. 2;
- **distância Volta** (`distancia_trecho_volta`) — Arq. 1 → Arq. 2;
- **diferença absoluta** (km);
- **diferença percentual** (%).

### 13.4 Resumo por Serviço

- **maior aumento** de distância (par e Δ);
- **maior redução** (par e Δ);
- **quantidade de pares alterados**;
- **quantidade de pares adicionados / removidos**;
- **alteração da distância total dos itinerários por sentido** (`rota.distancia_km` de Ida e de Volta — Spec 02 §10.2 — Arq. 1 → Arq. 2, com Δ em km e %).

---

## 14. Comparação da Matriz Tarifária / Seccionamento

Compara a matriz de distância **para tarifas**, que no schema é a **`matriz_seccionamento`** (Spec 02 §9) — pares habilitados para venda de passagem parcial, com a distância de referência em km. Chamada aqui de **"Matriz Tarifária / Seccionamento"**.

### 14.1 O que é comparado (e o que não é)

- Compara-se a **`matriz_seccionamento`** de cada Serviço: quais pares estão **habilitados** e com que **`distancia_km`** (Spec 02 §9).
- **Não se inventa valor monetário em R$** — o JSON nunca guarda R$ (Spec 02 §16); a conversão distância→R$ é externa, por portaria (Spec 03 §11). Esta versão compara **distâncias em km** (§1). A tarifa monetária permanece **externa**, salvo se uma spec futura acoplar a tabela tarifária (Spec 03 §11) — ponto explicitamente deixado em aberto.

### 14.2 UX da matriz

Semelhante à de distâncias (§13.1) e à Spec 04 §9.2:

- **triangular inferior**, diagonal **`X`**;
- cabeçalhos `Cidade - Nome da Seção`;
- **pares não habilitados** com **`—`**;
- **pares habilitados** com distância em km;
- **uma matriz por Serviço**, com seletor;
- comparação **célula a célula**.

### 14.3 Estados possíveis por célula

| Estado | Formato |
|---|---|
| par habilitado nos dois, distância **igual** | `12,40 km` |
| par habilitado nos dois, distância **alterada** | `12,40 → 13,10 km (+0,70)` |
| par habilitado **apenas no Arq. 1** (removido do seccionamento) | `12,40 km → —` |
| par habilitado **apenas no Arq. 2** (adicionado ao seccionamento) | `— → 13,10 km` |
| par **não habilitado** nos dois | `—` |

### 14.4 Resumo por Serviço

- **pares tarifários adicionados** (habilitados só no Arq. 2);
- **pares tarifários removidos** (habilitados só no Arq. 1);
- **pares mantidos com distância alterada**;
- **impacto no número de pares O-D compráveis** (Spec 03 §9.4: `matriz_seccionamento` ∪ ponta-a-ponta) — Δ de `|pares_compraveis|` por Serviço;
- **impacto nas opções de deslocamento** — vínculo com §11 (mudança de pares compráveis multiplica as viagens).

---

## 15. Comparação de Itinerários no Mapa

Tela de **mapa comparativo**. O Comparador **desenha `rota.geometria` já congelada** no JSON (Spec 02 §10.2) — **não recalcula rota nem chama OSRM** (§1; Spec 01 §8; Spec 03 §12).

### 15.1 Seleção

- **Seletor de Serviço** (casado por UUID);
- **Seletor de sentido:** Ida ou Volta;
- comparação **Arquivo 1 × Arquivo 2** do itinerário daquele Serviço/sentido (casado por `servico_uuid` + `sentido` — §5.3).

### 15.2 Modos de visualização

Alternância entre, no mínimo:

- **sobreposição** das duas rotas no mesmo mapa (Arq. 1 e Arq. 2 com cores distintas);
- **lado a lado** (dois mapas sincronizados);
- **apenas Arquivo 1**;
- **apenas Arquivo 2**.

### 15.3 Destaques visuais

- **rota inalterada** (traçado equivalente entre os arquivos);
- **trecho alterado**;
- **Seção adicionada** / **Seção removida** (por UUID — §5.2);
- **Seção mantida com geolocalização alterada** (§15.4);
- **Local comum adicionado / removido / alterado** — em **camada técnica opcional** (§1; oculta por padrão).

> **Comparação de rota por sinais estáveis, não por igualdade de `geometria`** (Spec 04 §18; Spec 03 §3.6.2). O Comparador **não** decide "rota mudou" por diferença byte-a-byte de `rota.geometria` (sensível a ruído de roteamento). Usa sinais estáveis: conjunto/ordem de **paradas** (Seções e Locais), presença/posição de **pontos de rota** (que não têm UUID — comparados pelo **efeito**, não par-a-par — Spec 03 §3.6.2), e **`rota.distancia_km`/`duracao_s` com tolerância**. Divergência acima da tolerância → "trecho alterado". A `descricao_itinerario` pode ser comparada pela lista estruturada **`itens`** (Spec 02 §10.5; Spec 04 §18), mais estável que o `texto` corrido, para detectar mudança de vias/marcos.

### 15.4 Geolocalização de Seções e Locais

- Coordenadas vêm **do JSON** (Spec 02 §5.1/§7) — não recalculadas.
- Quando a **mesma entidade** (mesma UUID) tem **coordenada diferente** entre os arquivos, o Comparador mostra a **distância em metros** entre o ponto antigo e o novo, usando a **primitiva geodésica (Haversine) da Spec 03 §2.1** — a mesma função de distância em linha reta já fixada, aplicada aqui só para **relatar** o deslocamento (não para recalcular rota).
- Vale para Seção (por Serviço e sentido — §5.3) e para Local (Ida/Volta).

### 15.5 Resumo no painel lateral

Por Serviço/sentido selecionado:

- **distância total** Arq. 1 e Arq. 2 (`rota.distancia_km`) + diferença em **km e %**;
- **duração total** Arq. 1 e Arq. 2 (`rota.duracao_s`) + diferença em **minutos**;
- **número de Seções**;
- **número de Locais comuns**;
- **número de pontos de rota** (Arq. 1 e Arq. 2 — informativo; comparados pelo efeito, §15.3).

---

## 16. Filtros, Seletores e Navegação

### 16.1 Filtros mínimos

- **Serviço**;
- **sentido** (Ida/Volta);
- **dia da semana**;
- **viagem comum / viagem de feriado**;
- **faixa de horário** (§10.2);
- **mostrar todos / apenas alterados**;
- **tipo de diferença**: adicionado, removido, alterado, inalterado (§6);
- **Seção origem/destino** (para as matrizes §13/§14).

### 16.2 Navegação por abas

1. **Visão Geral** (§8)
2. **Serviços** (§9)
3. **Horários e Viagens** (§10, §12)
4. **Opções de Deslocamento** (§11)
5. **Matrizes** (§13, §14)
6. **Mapa** (§15)
7. **PDF Comparativo** (§17)

O filtro ativo (ex.: "apenas alterados", Serviço X) persiste ao trocar de aba, para o usuário seguir um mesmo recorte pelo comparativo.

---

## 17. PDF Comparativo

O PDF comparativo é **distinto do PDF operacional** da Spec 04 §13 — é o artefato próprio do Comparador (Spec 01 §2/§8). Deve permitir que um técnico da ARTESP **compare perfeitamente** os dois JSONs. Gerado **client-side** (Spec 01 §8), somente-leitura sobre os arquivos.

### 17.1 Princípios do PDF comparativo

- Legível para **análise técnica** — detalhes internos ficam no **Anexo Técnico** (item 10); a parte principal evita excesso de detalhe.
- Padrão `Cidade - Nome da Seção` em toda parte; matrizes **triangulares inferiores**, em **km**, **sem R$** (§1); **sem offsets** (horários absolutos).
- Semana padrão e feriados **separados** e rotulados (Spec 03 §9.2; Spec 04 §13.3).
- Aviso de que é **apoio técnico e não substitui o SEI**.

### 17.2 Estrutura

1. **Capa**
   - título: **`ROTA — Comparativo de Operação`**;
   - `autos.codigo`; `empresa`; `tipo`;
   - **Arquivo 1:** rótulo/nome, `status`, data, `versao_schema`;
   - **Arquivo 2:** rótulo/nome, `status`, data, `versao_schema`;
   - data/hora de geração do PDF;
   - aviso: *"Documento de apoio técnico. O fluxo administrativo (análise, pendências, aprovação e publicação) permanece no SEI. Este documento não substitui a publicação oficial."*

2. **Resumo Executivo**
   - principais diferenças (§8.3);
   - total de Serviços adicionados/removidos/alterados;
   - total de Seções adicionadas/removidas/alteradas;
   - variação total de viagens (semana padrão);
   - variação total de opções de deslocamento;
   - principais impactos de distância;
   - principais impactos de seccionamento/tarifa operacional;
   - alertas (UUIDs não preservados, schema incompatível — §8.4).

3. **Comparação de Serviços** (§9)
   - Serviço por Serviço; característica de veículo; caráter; direcionalidade; situação (adicionado/removido/alterado/inalterado).

4. **Comparação de Viagens por Faixa de Horário** (§10)
   - por Serviço; Ida; Volta; Combinado; por faixa; total de todos os horários; total do Autos. Semana padrão; feriados em bloco separado (§10.4).

5. **Comparação de Opções de Deslocamento** (§11)
   - por Serviço; Ida; Volta; Combinado; por faixa; total de todos os horários; total do Autos.

6. **Tabela Horária Comparativa** (§12)
   - viagens adicionadas; removidas; alteradas; horários antigos e novos (`antigo → novo (Δ)`); diferenças em minutos; **semana padrão e feriados separados**; Seções (não Locais).

7. **Comparação da Matriz de Distâncias** (§13)
   - uma matriz por Serviço; triangular inferior; valores `Arq. 1 → Arq. 2`; diferenças em km; resumo de pares alterados (§13.4).

8. **Comparação da Matriz Tarifária / Seccionamento** (§14)
   - uma matriz por Serviço; triangular inferior; pares habilitados/desabilitados; distâncias alteradas; impacto nos pares O-D compráveis.

9. **Comparação de Itinerários e Mapas** (§15)
   - imagem comparativa por Serviço e sentido (rotas **sobrepostas** ou **lado a lado** — captura do canvas, Spec 01 §8); distância/duração antiga e nova; Seções adicionadas/removidas/movidas (deslocamento em metros — §15.4).

10. **Anexo Técnico**
    - lista completa de diferenças **campo-a-campo** relevantes;
    - **Locais comuns** alterados (nome, município, posição, presença por sentido);
    - **pontos de rota** alterados (efeito no traçado/distância — §15.3);
    - **alertas de validação** (350 m, tipificação, schema — §4);
    - **entidades sem correspondência por UUID** (possível recriação — §5.4/§5.5);
    - informações de **schema** (`versao_schema` de cada arquivo).

---

## 18. Estados de Erro e Mensagens

Mensagens **operacionais** e compreensíveis para usuário técnico, sem expor nomes internos do schema quando desnecessário (mesmo princípio da Spec 04 §14).

| Situação | Comportamento | Exemplo de mensagem |
|---|---|---|
| Arquivo não é JSON | Bloqueia aquele arquivo | "O arquivo [nome] não é um JSON válido. Verifique se foi gerado pelo ROTA." |
| JSON não segue o schema (Spec 02) | Bloqueia aquele arquivo | "O arquivo [nome] não é um JSON de operação válido: [detalhe]." |
| Versões de schema incompatíveis | Alerta técnico; comparação prossegue | "Os arquivos usam versões de schema diferentes ([v1] × [v2]). Alguns campos podem não ser comparáveis." |
| **Autos diferentes** | **Bloqueia a comparação principal** (§4.4) | "Os arquivos são de Autos diferentes ([código 1] × [código 2]). O comparativo compara duas versões do mesmo Autos." |
| Ausência de `uuid` onde deveria haver | Alerta técnico; casamento degradado | "Há entidades sem identificador estável — o comparativo pode tratá-las como novas/removidas." |
| JSON criado do zero (identidade não preservada) | Alerta técnico proeminente (§5.5) | "Os arquivos parecem não preservar a identidade das entidades. O comparativo pode acusar remoções/adições onde houve apenas edição." |
| Serviço existe em um arquivo e não no outro | Marca como adicionado/removido (não é erro) | "Serviço [numero_n] existe apenas no [rótulo do arquivo]." |
| Seção existe em um arquivo e não no outro | Marca como adicionada/removida (não é erro) | "Seção [Cidade - Nome] existe apenas no [rótulo do arquivo]." |
| Matriz de distância ausente/incompleta | Alerta técnico na comparação de matrizes | "A matriz de distâncias do Serviço [numero_n] está ausente ou incompleta em [arquivo] — comparação parcial." |
| Matriz de seccionamento ausente | Informativo (é opcional — Spec 02 §6) | "O Serviço [numero_n] não tem pares de seccionamento em [arquivo]." |
| Rota sem geometria | Alerta técnico no mapa | "O itinerário [Serviço/sentido] não tem traçado gravado em [arquivo] — não é possível desenhá-lo." |
| Itinerário sem viagens | Alerta técnico | "O itinerário [Serviço/sentido] não tem viagens em [arquivo]." |

---

## 19. Critérios de Aceite

1. Usuário consegue **carregar dois JSONs válidos** (§7).
2. Sistema **valida se os JSONs são comparáveis** — schema, mesmo Autos, schema/UUID (§4).
3. Sistema **compara entidades por UUID** (Seção, Serviço, Local, Viagem) (§5).
4. Sistema mostra **Serviços adicionados, removidos e alterados** (§9).
5. Sistema **compara viagens por faixa de horário**, por Ida, Volta, Combinado e total (§10).
6. Sistema **compara opções de deslocamento** por faixa, por Ida, Volta, Combinado e total (§11).
7. Sistema mostra **total do Serviço e total do Autos** (viagens e opções) (§10, §11).
8. Sistema **compara a matriz de distâncias** em formato triangular (§13).
9. Sistema **compara a matriz tarifária/seccionamento** em formato triangular (§14).
10. Sistema mostra **mapa comparativo** dos itinerários por Serviço e sentido (§15).
11. Sistema **gera PDF comparativo completo** (§17).
12. Sistema **não chama OSRM nem recalcula rotas** (§1, §2, §15).
13. Sistema **não altera os JSONs de entrada** (§1, §2).
14. Sistema **distingue semana padrão de operação de feriado** (§10.4, §12; Spec 03 §9.2).
15. Sistema **não exibe offsets como dado principal de usuário** — apresenta horários absolutos (§1, §12.3).

---

## 20. Decisões Fechadas Nesta Spec

1. **Arquivo 1 / Arquivo 2, com rótulos configuráveis** — UX não é rígida "vigente/proposta"; rótulos sugeridos a partir de `status`+data, editáveis; direção do diff é posicional (§3, §7).
2. **Casamento prioritário por UUID** para as quatro entidades (Seção, Serviço, Local, Viagem); dados sem UUID casam por contexto do pai casado + chave estrutural (§5). Heurística de "entidade recriada" **sinaliza, não casa** (§5.4).
3. **Bloqueio por Autos diferentes** na comparação principal, justificado por UUIDs não coincidirem entre documentos distintos; modo "justapor mesmo assim" é opcional e não gera o PDF padrão (§4.4).
4. **`status`/`data_criacao`/`data_publicacao` são cabeçalho, não diff** (Spec 02 §4.1) — exibidos, nunca contados como diferença operacional (§4.3).
5. **Taxonomia fixa:** Adicionado, Removido, Alterado, Inalterado, Alerta técnico — aplicada a Serviços, Seções, Locais, Itinerários, Viagens, Matrizes e Rotas (§6).
6. **Semana padrão × feriado sempre separados** (Spec 03 §9.2): contagens de viagens e opções usam só `viagem_feriado = false`; feriados em tabela própria (§10.4, §12).
7. **Faixas de horário herdadas da Spec 04 §10**, classificadas por `horario_saida` (§10.2).
8. **Diff de horário em `antigo → novo (Δ minutos)`**, sempre em horário absoluto, casado por UUID de Viagem (§12.3).
9. **Matrizes triangulares inferiores, em km, sem R$** (Spec 04 §9); célula comparativa com os quatro estados (igual/alterado/adicionado/removido) para distâncias e seccionamento (§13.2, §14.3).
10. **Matriz "tarifária" = `matriz_seccionamento`** — sem inventar R$; tarifa monetária permanece externa (Spec 03 §11), salvo spec futura (§14.1).
11. **Mapa desenha a rota congelada, não recalcula** (Spec 02 §10.2; Spec 03 §12); comparação de rota por **sinais estáveis** (paradas, pontos de rota por efeito, distância com tolerância, `descricao_itinerario.itens`), não por igualdade de `geometria` (Spec 04 §18); deslocamento de Seção/Local pela **Haversine da Spec 03 §2.1** (§15.3, §15.4).
12. **PDF comparativo próprio** (distinto do operacional — Spec 04 §13), com parte principal enxuta e Anexo Técnico para detalhes campo-a-campo, Locais, pontos de rota, alertas e schema (§17).
13. **Comparador é somente-leitura e sem persistência** — não altera os JSONs, não chama OSRM, não salva no servidor (§1, §2).

---

## 21. Próximos Documentos

- [x] **Spec 01 — Visão Geral** · [x] **Spec 02 — Esquema do JSON** · [x] **Spec 03 — Regras de Negócio e Cálculo** · [x] **Spec 04 — Formulário**
- [ ] **Spec 06 — Ingestor + Modelo PostgreSQL** (futuro): ingestão do JSON aprovado no banco oficial; reaproveita as **UUIDs como chave** (Spec 01 §6; Spec 02 §12) e as **checagens estáticas** (Spec 03 §7.3/§7.4) — o mesmo ferramental de leitura estática que o Comparador usa aqui.

### Pontos deixados explicitamente em aberto para versões futuras

1. **Tarifa monetária no comparativo** — acoplar a tabela de tarifa da portaria (Spec 03 §11) para comparar valores em R$ derivados das distâncias, se uma spec futura decidir trazer R$ para dentro do ROTA (§14.1). Hoje: só km.
2. **Modo "Autos diferentes"** — se houver demanda real de justapor Autos distintos (não versões do mesmo), formalizar o modo de justaposição do §4.4 como recurso de primeira classe (com seu próprio PDF), em vez de escape opcional.
3. **Refino da heurística de "entidade recriada"** (§5.4) — critérios de semelhança (nome/município/proximidade) e limiares, caso a implantação (muitos JSONs criados do zero) mostre que o casamento por UUID sozinho é insuficiente na prática.
