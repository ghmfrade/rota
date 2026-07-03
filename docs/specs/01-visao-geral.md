# Spec 01 — Visão Geral do Sistema

**Projeto:** ROTA — Registro de Operação e Tabelas de Autos (WebApp de tabelas operacionais de linhas de ônibus intermunicipais)
**Órgão:** ARTESP / SUCOL
**Status:** Em definição — v0.2 (reescrita)
**Stack:** Frontend React/Next.js (SPA, client-side) · sem backend transacional · roteamento via OSRM público · PostgreSQL apenas no Ingestor futuro
**Substitui:** a v0.1 desta spec (sistema de gestão com ciclo de vida de Pedido). O antigo modelo de dados (Spec 02 v0.1) fica obsoleto na parte de workflow; seu conteúdo de domínio migra para o Esquema do JSON (Spec 02) e para o Modelo PostgreSQL do Ingestor (Spec 06).

---

## 1. Objetivo do Sistema

O ROTA **não é um sistema de gestão de processo**. Toda a gestão — quem pediu o quê e quando, pendências, concordâncias, aprovação, e-mails, arquivamento — permanece no **SEI**. O ROTA é um conjunto de **ferramentas de apoio à elaboração e verificação** de tabelas operacionais, que não conhecem status, fluxo, nem aprovação.

O sistema:

1. Permite que a empresa de transporte **monte a operação de um Autos** (Serviços, itinerários, paradas, horários, seccionamento) de forma estruturada, com mapa e todas as regras de negócio.
2. Gera, ao final, dois artefatos: um **PDF operacional** (dados + rotas) e um **arquivo JSON** com toda a operação proposta.
3. A empresa **peticiona esses artefatos no SEI**, e daí em diante é o SEI que conduz tudo — o técnico concorda, discorda ou levanta pendência **por e-mail via SEI**, fora do ROTA.
4. Oferece uma ferramenta **separada** para comparar duas versões da operação (vigente × proposta), a partir dos respectivos JSONs.
5. No futuro, oferece uma ferramenta para o técnico **ingerir o JSON aprovado** e alimentar o banco oficial em PostgreSQL.

---

## 2. Arquitetura — Três Ferramentas Desacopladas

As três ferramentas **não compartilham estado**. O único contrato entre elas é o **JSON de operação**.

| Ferramenta             | Entrada                                                                                    | Saída                                                                                         | Persistência                       |
| ---------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Formulário** (agora) | Listas estáticas de Autos/empresas/tipos; opcionalmente um JSON vigente para pré-preencher | PDF operacional + rotas; JSON de operação (`proposta` **ou** marcado como `vigente` — ver §8) | Nenhuma — nada é salvo no servidor |
| **Comparador** (agora) | JSON vigente + JSON proposta                                                               | Diff na tela + PDF comparativo próprio                                                        | Nenhuma                            |
| **Ingestor** (futuro)  | JSON aprovado                                                                              | Registros no PostgreSQL oficial                                                               | PostgreSQL                         |

```
                    ┌─────────────┐
  listas estáticas →│ FORMULÁRIO  │→ PDF operacional
  (JSON vigente opc)│             │→ JSON de operação ──┐
                    └─────────────┘                     │
                                                        ├─→ peticionado no SEI
  JSON vigente ┐    ┌─────────────┐                     │   (fluxo, pendências,
  JSON proposta├───→│ COMPARADOR  │→ diff + PDF comp.    │    aprovação = SEI)
               ┘    └─────────────┘                     │
                                                        ▼
                    ┌─────────────┐              JSON aprovado
                    │  INGESTOR   │←─────────────────────┘
                    │  (futuro)   │→ PostgreSQL oficial
                    └─────────────┘
```

---

## 3. Escopo e Não-Escopo

**Está no escopo do ROTA:**

- Entrada estruturada da operação, com mapa e validações de negócio.
- Cálculo de rota (street-snapped) e de horários de passagem — client-side.
- Geração do PDF operacional e do JSON — client-side.
- Comparação de dois JSONs, com diff visual e PDF comparativo.
- (Futuro) ingestão do JSON aprovado no banco oficial.

**NÃO está no escopo do ROTA (é do SEI):**

- Status/ciclo de vida do pedido (rascunho, análise, aprovado…), pendências, manifestações, diálogo técnico↔empresa.
- Prazo de vigência, publicação em DOE, suplantação.
- Registro de quem pediu, quando, e histórico de tratativas.
- Auditoria, permissões, autenticação de fluxo.

Consequência: **o ROTA não tem modelo de estado nem de permissões.** O JSON carrega apenas **dados de operação** — nenhum campo de workflow.

**Limitação de modelagem — linhas circulares e Seção repetida estão fora de escopo.** O esquema exige que todo itinerário tenha ao menos **2 Seções distintas**, com primeira e última parada sendo Seções **distintas** (Spec 02 §10.1, §14), e não admite a mesma Seção repetida no itinerário (Spec 03 §4.4). Logo, uma linha **circular** (que sai e retorna ao **mesmo** terminal) ou que revisita uma Seção **não** pode ser modelada como um único Serviço. Esses casos — poucos no sistema — devem ser representados como **dois Serviços encadeados**, em que um termina onde o outro começa; cabe ao usuário conectar os horários (o fim das viagens de um com o início do seguinte). Não há suporte automático a esse encadeamento no ROTA.

**Exceção deliberada e estreita:** o JSON se autodeclara `proposta` (com a data em que foi gerado) ou `vigente` (com a data de publicação, informada pelo usuário) — ver Spec 02 §4. Isso **não** é o ciclo de vida do SEI (rascunho→análise→aprovado→vigente, com pendências e aprovação); é só uma etiqueta binária para o Comparador/Ingestor saberem o que estão lendo sem depender de convenção de nome de arquivo. Não guarda autor, prazo, DOE, nem qualquer outro dado de fluxo.

---

## 4. Glossário

| Termo                         | Definição                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Autos de Linha**            | Identificador regulatório principal (código `0000`). Agrupa um ou mais Serviços sob o mesmo processo administrativo.                                                                                                                                                                                                                                        |
| **Tipo de Autos**             | Classificação: Semiurbano, Semiurbano Litorâneo, Rodoviário, Rodoviário Litorâneo. Define regras de variação permitida.                                                                                                                                                                                                                                     |
| **Serviço**                   | Variação operacional dentro de um Autos — combinação de itinerário (caráter: principal, parcial, semidireta etc.) e característica de veículo. Rótulo humano `0000-NXX`; identidade de máquina por **UUID estável** (ver §6).                                                                                                                               |
| **Característica de veículo** | Duas famílias (ver §7): **semiurbana** (SU, SUL) e **rodoviária** (convencional `CR`/`CL`, `EX`, `LE` e mistos). O tipo do Autos fixa a família. A tabela fechada código-a-código está na Spec 03 §10.2.                                                                                                                                                    |
| **Seção**                     | Ponto físico georreferenciado que define tarifa e participa do seccionamento tarifário. É entidade do **Autos** (`autos.secoes[]`), compartilhada por todos os Serviços que passam por ali — cada Serviço contribui sua própria geolocalização de Ida e/ou Volta. **Vive dentro do próprio JSON do Autos** — não há cadastro mestre global. Ver Spec 02 §5. |
| **Local**                     | Ponto físico georreferenciado **sem** relevância tarifária (embarque/desembarque comum), usado pelos itinerários de **um** Serviço. É entidade do **Serviço** (`servico.locais[]`), não compartilhada com outros Serviços. Ver Spec 02 §7.                                                                                                                  |
| **Parada**                    | Ocorrência de uma Seção **ou** de um Local (nunca os dois, nunca nenhum) dentro do itinerário de um Serviço, com posição na sequência.                                                                                                                                                                                                                      |
| **Seccionamento tarifário**   | Regra que define entre quais pares de Seções é permitida a venda de passagem parcial.                                                                                                                                                                                                                                                                       |
| **Itinerário**                | Sequência ordenada de paradas de um Serviço, em um sentido (Ida/Volta), com a rota georreferenciada entre elas.                                                                                                                                                                                                                                             |
| **Viagem**                    | Saída específica de um Serviço: horário de saída, horários de passagem por parada, dias da semana e regra de feriado.                                                                                                                                                                                                                                       |
| **Opção de Deslocamento**     | Estatística **derivada** (par origem-destino comprável por viagem × seccionamento). Não é dado de entrada. Algoritmo de cálculo fechado na Spec 03 §9.4.                                                                                                                                                                                                    |
| **JSON de operação**          | Artefato-contrato: fotografia completa e independente da operação de **um** Autos. Ver §5.                                                                                                                                                                                                                                                                  |

_Termos removidos por saírem de escopo:_ Pedido de Alteração, Processo SEI (como entidade do sistema), Pendência, Manifestação, Justificativa, atores de fluxo. Passam a ser tratados no SEI.

---

## 5. O JSON de Operação — o Contrato

O JSON é a peça central do projeto. Princípios:

- **Só operação.** Contém a árvore completa de **um** Autos: identificação (código, tipo, empresa) + Seções (compartilhadas entre Serviços) + Serviços → Locais → Itinerários → Paradas → Matriz de Distâncias → Seccionamento → Viagens → Horários. **Nenhum** campo de status, fluxo, autor, data ou aprovação. Árvore completa:

  ```
  autos.secoes[]                                (entidades, compartilhadas entre Serviços)
    └─ servicos[]                                (uma entrada por Serviço que usa a Seção)

  servicos[].locais[]                            (entidades, não compartilhadas)

  servicos[].itinerarios[].paradas[]             (referências: secao_uuid XOR local_uuid)

  servicos[].matriz_distancias[]                 (pares de secao_uuid, todas as combinações)
  servicos[].matriz_seccionamento[]               (pares de secao_uuid, habilitados p/ passagem parcial)
  ```

  Ver árvore completa e detalhada na Spec 02 §2.

- **Autossuficiente.** Todas as Seções e Locais que o Autos usa estão embutidos no próprio JSON, com `uuid` local ao documento — Paradas **referenciam** Seções/Locais por `uuid` (não os embutem), e a `matriz_seccionamento` referencia pares de **Seções**, não de pontos genéricos. Não depende de nenhum cadastro externo para ser lido.
- **É o "salvar".** O formulário não persiste nada no servidor: exportar o JSON é salvar; retomar o trabalho é reimportar o JSON.
- **É a baseline do comparativo.** O Comparador recebe dois JSONs (vigente e proposta) e produz o diff. O comparativo **não** está dentro do JSON nem do formulário.
- **É a carga do banco.** No futuro, o Ingestor lê o JSON aprovado e materializa esses mesmos registros no PostgreSQL — reaproveitando as UUIDs como chave (ver §6).

O esquema detalhado é a **Spec 02**.

---

## 6. Identidade Estável (UUID)

Para o Comparador casar "a mesma entidade" entre duas versões, cada uma das quatro entidades com identidade própria — **Seção**, **Serviço**, **Local** e **Viagem** (Spec 02 §12) — carrega uma **UUID estável**, distinta do rótulo humano:

- **`numero_n`** (`0000-1CR`, só em Serviço) é **só display** — sequencial por ordem de cadastro, sem lógica de posição, e potencialmente reaproveitável. Não serve como identidade.
- **`uuid`** é gerada **no momento da criação** da entidade (Seção, Serviço, Local ou Viagem), client-side, como número aleatório (UUIDv4 via `crypto.randomUUID()`) — sem sequência, sem servidor, sem coordenação. Colisão é desprezível.
- **Unicidade da `uuid` é no documento inteiro, entre todas as entidades** (Seção, Serviço, Local e Viagem) — não só dentro da própria categoria. Inclusive Local, que apesar de não ser compartilhado entre Serviços não pode reaproveitar `uuid` de nenhuma outra entidade do mesmo documento (Spec 02 §12).
- **Regra dura (Spec 02 e Spec 04):** importar um JSON **preserva** as UUIDs existentes; **apenas** entidades criadas naquela edição ganham UUID nova. Se o formulário regenerasse UUIDs ao importar, o diff viraria "removeu tudo e criou tudo".

Diff resultante no Comparador:

- mesma UUID nos dois JSONs → mesma entidade, compara campo a campo;
- UUID só no vigente → removida/cancelada;
- UUID só na proposta → nova.

**A estabilidade das UUIDs só funciona se a proposta for construída a partir do vigente.** Todo o valor do diff campo-a-campo pressupõe que a proposta **importe o JSON vigente como base**, herdando as UUIDs e alterando só o que mudou. Se a empresa montar a proposta **do zero** (ou tiver perdido o JSON vigente), todas as UUIDs serão novas e o Comparador reportará "removeu tudo e criou tudo" — inútil justamente para o caso de _alterar_ uma linha existente. Por isso o Formulário (Spec 04) deve tornar **"carregar o JSON vigente como base" o caminho padrão e fortemente guiado para alterações** (distinto de criar um Autos de linha novo), e o modo de falha "proposta do zero sobre linha existente" deve ser documentado como tal. Esta spec registra a dependência; a UI que a induz é da Spec 04.

Bônus de arquitetura: no Ingestor, a UUID vira o id da linha no PostgreSQL — a identidade da entidade é a mesma em formulário → JSON → banco, sem tradução. Isso depende diretamente da unicidade global de `uuid` (mesmo para Local): se duas entidades do mesmo documento pudessem compartilhar `uuid`, o Ingestor não saberia qual linha do banco cada uma deveria virar.

---

## 7. Regras de Tipificação do Autos de Linha

A característica de veículo pertence a **duas famílias distintas, que nunca se misturam num mesmo Autos** — o `tipo` do Autos escolhe a família:

| Tipo de Autos        | Família    | Permite variação de característica? | Observações                                                                                                                                                                           |
| -------------------- | ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Semiurbano           | semiurbana | Não (veículo único)                 | Todos os Serviços usam `SU`; múltiplos Serviços apenas por variação de itinerário/caráter                                                                                             |
| Semiurbano Litorâneo | semiurbana | Não (veículo único)                 | Todos usam `SUL`                                                                                                                                                                      |
| Rodoviário           | rodoviária | Sim                                 | Convencional `CR`, `EX`, `LE` e mistos (`ME`, `ML`, `MX`, `MM`); nunca `SU`/`SUL` nem as formas litorâneas                                                                            |
| Rodoviário Litorâneo | rodoviária | Sim                                 | Convencional é `CL` (litorâneo), nunca `CR`; `EX`, `LE` e mistos litorâneos (`MEL`, `MLL`, `MXL`, `MML`). `CR` e `CL` nunca coexistem; `SU`/`SUL` nunca aparecem em Autos rodoviário. |

**Códigos de característica de veículo:**

- **Família semiurbana:** SU (Semiurbano), SUL (Semiurbano Litorâneo).
- **Família rodoviária — Rodoviário (não-litorâneo):** CR (Convencional Rodoviário), EX (Executivo), LE (Leito), ME (Misto Convencional + Executivo), ML (Misto Convencional + Leito), MX (Misto Executivo + Leito), MM (Misto Convencional + Executivo + Leito).
- **Família rodoviária — Rodoviário Litorâneo:** CL (Convencional Rodoviário Litorâneo), EX (Executivo), LE (Leito), MEL (Misto Convencional Litorâneo + Executivo), MLL (Misto Convencional Litorâneo + Leito), MXL (Misto Executivo + Leito), MML (Misto Convencional Litorâneo + Executivo + Leito).

O Semileito não existe no domínio. A partição fechada código-a-código, por `tipo` de Autos, é a Spec 03 §10.2.

Essas regras (família por tipo, variação só no rodoviário, veículo único no semiurbano, exclusividade `SU`×`SUL` e `CR`×`CL` por litoralidade) são **validações do formulário**, detalhadas na Spec 03 §10.

---

## 8. Decisões de Design Já Tomadas

- **Zero gestão no ROTA.** Todo fluxo, pendência, aprovação, vigência e histórico ficam no SEI. O JSON e o PDF são o que se peticiona.
- **Três ferramentas desacopladas** unidas só pelo JSON: Formulário, Comparador, Ingestor (futuro).
- **JSON contém apenas dados de operação** — sem status, autor, data, comparativo ou qualquer metadado de fluxo.
- **Comparativo é ferramenta separada.** Recebe JSON vigente + JSON proposta, compara na tela e gera **PDF comparativo próprio**, distinto do PDF operacional do formulário.
- **Formulário não guarda nada no servidor.** Backend praticamente inexistente. Roteamento, cálculo de horários e geração do PDF são **client-side**.
- **Roteamento via OSRM público** (`router.project-osrm.org`), chamado direto pelo front. Se o serviço estiver indisponível, **não se prossegue com rota não roteada** e exibe-se uma **mensagem de erro clara** informando que o serviço de rotas está temporariamente fora do ar (ex.: _"Serviço de cálculo de rotas temporariamente indisponível — tente novamente em instantes."_). O motivo de bloquear é que a **distância roteada alimenta a tarifa**, então uma rota não calculada tornaria a tabela inválida — mas isso é a **justificativa** da decisão, **não** o texto da mensagem: a mensagem fala só da indisponibilidade do serviço. O algoritmo detalhado (mensagens por tipo de erro, retentativa) está na Spec 03 §3.5.
- **OSRM só é chamado para _alterar_ itinerários — nunca para _abrir_ um JSON.** `router.project-osrm.org` é o **servidor de demonstração** do OSRM (sem SLA, com limites de uso, desencorajado para produção); para reduzir essa dependência a ferramenta **nunca** reconsulta o OSRM só para exibir. Ao carregar um Autos, o mapa desenha a `rota.geometria` **congelada** no JSON (Spec 02 §10.2). O OSRM gratuito é acionado **apenas** quando o usuário efetivamente altera um itinerário — inserir/mover Seção, Local ou ponto de rota — recalculando o trecho afetado. Isso mantém leitura e reedição funcionando mesmo com o demo instável, e abre caminho para eventual auto-hospedagem sem mudar o contrato.
- **Cada rota registra sua procedência.** `rota` guarda `fonte_calculo` (motor/instância que a gerou), `data_calculo` e `perfil` (Spec 02 §10.2). Assim o Comparador (Spec 05) sabe que rotas de fontes/datas diferentes podem divergir levemente por ruído do mapa — e compara por sinais estáveis, com tolerância, não bit-a-bit (Spec 03 §3.6.2).
- **Forçar o traçado da rota (pontos de rota).** O traçado que o OSRM sugere nem sempre é o que o ônibus percorre. O usuário pode inserir **pontos de rota** — vértices arrastáveis sobre a rota calculada, que forçam o traçado a passar por determinada via. **Não são Seção, Local nem Parada** e têm propósito único (condicionar a rota): sem tarifa, sem `uuid`, fora de `matriz_distancias`/`matriz_seccionamento` e da regra dos 350 m. São **persistidos no JSON** (`rota.pontos_de_rota`) só para reproduzir a rota forçada ao reeditar. Regra de negócio na Spec 03 §3.6, esquema na Spec 02 §10.4, interação de mapa na Spec 04.
- **Mapa e tiles client-side** (OSM/MapLibre); imagem do mapa no PDF por captura do próprio canvas.
- **Listas de Autos, empresas e tipos vêm de JSON estático** servido junto do app (no futuro, gerado a partir do PostgreSQL).
- **Origem dos dados de identificação:** a empresa escolhe Autos/empresa/tipo a partir das listas para montar uma proposta **ou** carrega um JSON vigente que pré-preenche esses valores. Ao carregar JSON vigente, os valores usados são os do JSON — **desde que** empresa, Autos e tipo existam nas listas disponíveis. Caso não existam, **bloquear o carregamento** com mensagem clara (propor contra identidade obsoleta é pior que reescolher).
- **Quem produz o JSON `vigente` é o próprio Formulário.** Por padrão, exportar gera `status: "proposta"` com `data_criacao` automática (Spec 02 §4.1). Mas depois que a proposta é aprovada no SEI, alguém precisa transformá-la no **JSON vigente** que servirá de baseline do próximo comparativo e de carga do Ingestor. Essa transição é **ação explícita do Formulário**: expor um comando "definir como vigente" que pede a `data_publicacao` (informada manualmente) e exporta um novo JSON com `status: "vigente"` — **preservando todas as UUIDs** (Spec 02 §12), sem tocar em nenhum outro dado de operação. Sem essa ação, o vigente só surgiria por edição manual do JSON (arriscada e não controlada). Não é ciclo de vida do SEI — é só a etiqueta binária da Spec 02 §4.1 sendo trocada de forma controlada. Detalhe de UI na Spec 04; o esquema está na Spec 02 §4.1.
- **Ponto georreferenciado global deixa de existir.** Cada Autos tem suas próprias Seções e Locais, embutidos no seu JSON, com `uuid` local ao documento. Sem cadastro mestre, sem reconciliação entre Autos, sem busca por raio como conceito central.
- **UUID estável por Seção, Serviço, Local e Viagem**, gerada na criação (client-side, UUIDv4); `numero_n` (só em Serviço) é só display; importar preserva UUID, só a entidade nova ganha UUID nova.
- **Seção e Local são entidades distintas**, não papéis contextuais de um mesmo ponto. Seção é entidade do Autos (compartilhada entre Serviços, define tarifa); Local é entidade do Serviço (não compartilhado, sem tarifa). O campo `papel` que existia num desenho anterior foi eliminado — o tipo é dado pela coleção que contém o ponto (`autos.secoes` vs. `servico.locais`). Ver Spec 02 §2, §13 item 6.
- **Ida e Volta de um mesmo Serviço referenciam o mesmo conjunto de Seções** — quando os dois itinerários existem, toda Seção atendida pela Ida também é atendida pela Volta (e vice-versa), garantindo que `matriz_distancias` sempre tenha como calcular cada par (Spec 02 §2, §8). Só os Locais comuns intermediários podem divergir livremente entre os dois sentidos. Uma mesma Seção pode ter geolocalizações ligeiramente diferentes entre Ida e Volta (Spec 02 §5.2). Quando a divergência é grande o bastante para não fazer sentido compartilhar a Seção entre os sentidos, **cria-se dois Serviços** (um só de Ida com Volta vazia, outro só de Volta) e o cálculo tarifário considera só o sentido populado.
- **Viagem tem frequência semanal** (dias da semana) + flag de feriado, não data fixa.
- **Opção de Deslocamento é estatística calculada**, não dado de entrada.

---

## 9. Questões em Aberto

1. ~~UUID em Viagem~~ — **decidido na Spec 02:** Viagem carrega UUID obrigatória, mesma regra de Seção, Serviço e Local.
2. ~~Caráter do itinerário~~ — **decidido na Spec 02:** vira campo explícito (`carater`) no Serviço, não derivado.
3. ~~Horário na parada: relativo × absoluto~~ — **decidido na Spec 02:** offset relativo à saída (`offset_horario`), no nível da **Viagem** (`viagem.horarios_paradas[]`, não da Parada — Spec 02 §13 item 15), resolvido em horário absoluto via `horario_saida + offset_horario`.
4. ~~`regra_feriado` — valores do enum~~ — **decidido na Spec 03:** enum de **4 valores** — `"circula_inclusive_se_for_feriado"` (feriado indiferente), `"nao_circula_em_feriado"` (não roda em feriado), `"somente_em_feriado"` (só roda quando o dia servido é feriado) e `"circula_em_feriado"` (roda a grade e **também** em qualquer feriado, aditivo). Não há grade nem redistribuição de horário específica de feriado, e a etiqueta não afeta contagem de viagens/opções de deslocamento — exceto `"somente_em_feriado"`, que conta `0` na semana padrão por só operar em feriado (Spec 03 §9). A "redistribuição proporcional" que se cogitava aqui era, na verdade, o recálculo de horários de passagem ao editar um horário a jusante (Spec 03 §8.2), sem relação com feriado.
5. ~~Limite de divergência espacial dentro de uma Seção~~ — **fixado na Spec 02:** Seção é entidade do Autos (não do Serviço), compartilhada por todos os Serviços que passam por ali (Spec 02 §5). A regra de 350 metros é um clustering por centroide cumulativo: cada novo ponto (Ida ou Volta, de qualquer Serviço) contribuído à Seção deve estar a ≤ 350 m do centroide dos pontos já aceitos nela. Acima disso, é necessária uma Seção separada. O algoritmo/momento de validação desse limite (Spec 02 §5.2) fica detalhado na Spec 03/04.

---

## 10. Próximos Documentos da Especificação

- [x] **Spec 02 — Esquema do JSON de Operação** (o contrato: entidades, campos, UUIDs, validações estruturais)
- [x] **Spec 03 — Regras de Negócio e Cálculo** (seccionamento, tarifa, cálculo/redistribuição de horários, roteamento, `regra_feriado`, tipificação)
- [ ] **Spec 04 — Formulário** (UI, mapa, import/export de JSON, geração do PDF operacional)
- [ ] **Spec 05 — Comparador** (dois JSONs → diff → PDF comparativo)
- [ ] **Spec 06 — Ingestor + Modelo PostgreSQL** (futuro: ingestão do JSON aprovado no banco oficial)
