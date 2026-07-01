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

| Ferramenta | Entrada | Saída | Persistência |
|---|---|---|---|
| **Formulário** (agora) | Listas estáticas de Autos/empresas/tipos; opcionalmente um JSON vigente para pré-preencher | PDF operacional + rotas; JSON de operação | Nenhuma — nada é salvo no servidor |
| **Comparador** (agora) | JSON vigente + JSON proposta | Diff na tela + PDF comparativo próprio | Nenhuma |
| **Ingestor** (futuro) | JSON aprovado | Registros no PostgreSQL oficial | PostgreSQL |

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
- Status/ciclo de vida do pedido (rascunho, proposta, análise, aprovado, vigente…).
- Pendências (correção/acordo), manifestações, diálogo técnico↔empresa.
- Aprovação, prazo/data de vigência, publicação em DOE, suplantação.
- Registro de quem pediu, quando, e histórico de tratativas.
- Auditoria, permissões, autenticação de fluxo.

Consequência: **o ROTA não tem modelo de estado nem de permissões.** O JSON carrega apenas **dados de operação** — nenhum campo de workflow.

---

## 4. Glossário

| Termo | Definição |
|---|---|
| **Autos de Linha** | Identificador regulatório principal (código `0000`). Agrupa um ou mais Serviços sob o mesmo processo administrativo. |
| **Tipo de Autos** | Classificação: Semiurbano, Semiurbano Litorâneo, Rodoviário, Rodoviário Litorâneo. Define regras de variação permitida. |
| **Serviço** | Variação operacional dentro de um Autos — combinação de itinerário (caráter: principal, parcial, semidireta etc.) e característica de veículo. Rótulo humano `0000-NXX`; identidade de máquina por **UUID estável** (ver §6). |
| **Característica de veículo** | RO, ROL, EX, LE, SL e mistos (ver §7). |
| **Ponto (de operação)** | Ponto físico georreferenciado (cidade + nome + coordenadas) usado por um Serviço. **Vive dentro do próprio JSON do Autos** — não há mais cadastro mestre global. Cada Autos tem seus próprios pontos, com id local ao documento. |
| **Papel do ponto** | Contextual dentro de um itinerário: **Seção** (define tarifa; participa do seccionamento) ou **Ponto comum** (embarque/desembarque, sem tarifa). |
| **Parada** | Ocorrência de um ponto dentro do itinerário de um Serviço, com papel (Seção/Ponto) e posição na sequência. |
| **Seccionamento tarifário** | Regra que define entre quais pares de Seções é permitida a venda de passagem parcial. |
| **Itinerário** | Sequência ordenada de paradas de um Serviço, em um sentido (Ida/Volta), com a rota georreferenciada entre elas. |
| **Viagem** | Saída específica de um Serviço: horário de saída, horários de passagem por parada, dias da semana e regra de feriado. |
| **Opção de Deslocamento** | Estatística **derivada** (par origem-destino comprável por viagem × seccionamento). Não é dado de entrada. |
| **JSON de operação** | Artefato-contrato: fotografia completa e independente da operação de **um** Autos. Ver §5. |

*Termos removidos por saírem de escopo:* Pedido de Alteração, Processo SEI (como entidade do sistema), Pendência, Manifestação, Justificativa, atores de fluxo. Passam a ser tratados no SEI.

---

## 5. O JSON de Operação — o Contrato

O JSON é a peça central do projeto. Princípios:

- **Só operação.** Contém a árvore completa de **um** Autos: identificação (código, tipo, empresa) + Serviços → Itinerários → Paradas (com pontos embutidos) → Seccionamento → Viagens → Horários. **Nenhum** campo de status, fluxo, autor, data ou aprovação.
- **Autossuficiente.** Todos os pontos que o Autos usa estão embutidos no próprio JSON, com id local ao documento (a `matriz_seccionamento` referencia pares desses pontos). Não depende de nenhum cadastro externo para ser lido.
- **É o "salvar".** O formulário não persiste nada no servidor: exportar o JSON é salvar; retomar o trabalho é reimportar o JSON.
- **É a baseline do comparativo.** O Comparador recebe dois JSONs (vigente e proposta) e produz o diff. O comparativo **não** está dentro do JSON nem do formulário.
- **É a carga do banco.** No futuro, o Ingestor lê o JSON aprovado e materializa esses mesmos registros no PostgreSQL — reaproveitando as UUIDs como chave (ver §6).

O esquema detalhado é a **Spec 02**.

---

## 6. Identidade Estável (UUID)

Para o Comparador casar "o mesmo Serviço" entre duas versões, cada Serviço (e cada Ponto) carrega uma **UUID estável**, distinta do rótulo humano:

- **`numero_n`** (`0000-1RO`) é **só display** — sequencial por ordem de cadastro, sem lógica de posição, e potencialmente reaproveitável. Não serve como identidade.
- **`uuid`** é gerada **no momento da criação** do Serviço/Ponto, client-side, como número aleatório (UUIDv4 via `crypto.randomUUID()`) — sem sequência, sem servidor, sem coordenação. Colisão é desprezível.
- **Regra dura (Spec 02 e Spec 04):** importar um JSON **preserva** as UUIDs existentes; **apenas** Serviços/Pontos criados naquela edição ganham UUID nova. Se o formulário regenerasse UUIDs ao importar, o diff viraria "removeu tudo e criou tudo".

Diff resultante no Comparador:
- mesma UUID nos dois JSONs → mesmo Serviço, compara campo a campo;
- UUID só no vigente → removido/cancelado;
- UUID só na proposta → novo.

Bônus de arquitetura: no Ingestor, a UUID vira o id da linha no PostgreSQL — a identidade do Serviço é a mesma em formulário → JSON → banco, sem tradução.

---

## 7. Regras de Tipificação do Autos de Linha

| Tipo de Autos | Permite variação de característica de veículo? | Observações |
|---|---|---|
| Semiurbano | Não (veículo único) | Múltiplos Serviços apenas por variação de itinerário/caráter |
| Semiurbano Litorâneo | Não (veículo único) | Idem |
| Rodoviário | Sim | RO, EX, LE, SL e mistos |
| Rodoviário Litorâneo | Sim | Idem, mas `RO` é substituído por `ROL`. `RO` e `ROL` nunca coexistem no mesmo Autos. |

**Códigos de característica de veículo:** RO (Convencional), ROL (Convencional Litorâneo), EX (Executivo), LE (Leito), SL (Semi-leito), e mistos MLEX, MLRO, MEXR, MLES, MEXS, MROS, MIST (misto de 3 tipos, raro).

Essas regras (tipo → característica permitida, exclusividade RO/ROL, veículo único no semiurbano) são **validações do formulário**, detalhadas na Spec 03.

---

## 8. Decisões de Design Já Tomadas

- **Zero gestão no ROTA.** Todo fluxo, pendência, aprovação, vigência e histórico ficam no SEI. O JSON e o PDF são o que se peticiona.
- **Três ferramentas desacopladas** unidas só pelo JSON: Formulário, Comparador, Ingestor (futuro).
- **JSON contém apenas dados de operação** — sem status, autor, data, comparativo ou qualquer metadado de fluxo.
- **Comparativo é ferramenta separada.** Recebe JSON vigente + JSON proposta, compara na tela e gera **PDF comparativo próprio**, distinto do PDF operacional do formulário.
- **Formulário não guarda nada no servidor.** Backend praticamente inexistente. Roteamento, cálculo de horários e geração do PDF são **client-side**.
- **Roteamento via OSRM público** (`router.project-osrm.org`), chamado direto pelo front. Se o serviço estiver indisponível, exibir **mensagem de erro clara** (distância alimenta a tarifa, então não se prossegue com rota não roteada).
- **Mapa e tiles client-side** (OSM/MapLibre); imagem do mapa no PDF por captura do próprio canvas.
- **Listas de Autos, empresas e tipos vêm de JSON estático** servido junto do app (no futuro, gerado a partir do PostgreSQL).
- **Origem dos dados de identificação:** a empresa escolhe Autos/empresa/tipo a partir das listas para montar uma proposta **ou** carrega um JSON vigente que pré-preenche esses valores. Ao carregar JSON vigente, os valores usados são os do JSON — **desde que** empresa, Autos e tipo existam nas listas disponíveis. Caso não existam, **bloquear o carregamento** com mensagem clara (propor contra identidade obsoleta é pior que reescolher).
- **Ponto georreferenciado global deixa de existir.** Cada Autos tem seus próprios pontos, embutidos no seu JSON, com id local ao documento. Sem cadastro mestre, sem reconciliação entre Autos, sem busca por raio como conceito central.
- **UUID estável por Serviço e por Ponto**, gerada na criação (client-side, UUIDv4); `numero_n` é só display; importar preserva UUID, só o novo ganha UUID nova.
- **Seção e Ponto são papéis contextuais** de um ponto dentro de um itinerário, não tipos de entidade distintos.
- **Ida e Volta compartilham identidade de Seção** (mesmo nome/cidade), podendo divergir só em coordenadas. Quando divergem a ponto de não fazer sentido compartilhar, **cria-se dois Serviços** (um só de Ida com Volta vazia, outro só de Volta) e o cálculo tarifário considera só o sentido populado.
- **Viagem tem frequência semanal** (dias da semana) + flag de feriado, não data fixa.
- **Opção de Deslocamento é estatística calculada**, não dado de entrada.

---

## 9. Questões em Aberto

1. ~~UUID em Viagem~~ — **decidido na Spec 02:** Viagem carrega UUID obrigatória, mesma regra de Serviço e Ponto.
2. ~~Caráter do itinerário~~ — **decidido na Spec 02:** vira campo explícito (`carater`) no Serviço, não derivado.
3. ~~Horário na parada: relativo × absoluto~~ — **decidido na Spec 02:** offset relativo à saída (`offset_horario`) no nível da Parada, resolvido em horário absoluto por Viagem.
4. **`regra_feriado` — valores do enum a definir na Spec 03**, junto do algoritmo de redistribuição proporcional de horários.
5. **Limite de divergência espacial dentro de uma Seção — fixado na Spec 02:** Seção é entidade do Autos (não do Serviço), compartilhada por todos os Serviços que passam por ali (Spec 02 §5). A regra de 350 metros é um clustering por centroide cumulativo: cada novo ponto (Ida ou Volta, de qualquer Serviço) contribuído à Seção deve estar a ≤ 350 m do centroide dos pontos já aceitos nela. Acima disso, é necessária uma Seção separada. O algoritmo/momento de validação desse limite fica para a Spec 03/04.

---

## 10. Próximos Documentos da Especificação

- [x] **Spec 02 — Esquema do JSON de Operação** (o contrato: entidades, campos, UUIDs, validações estruturais)
- [ ] **Spec 03 — Regras de Negócio e Cálculo** (seccionamento, tarifa, cálculo/redistribuição de horários, roteamento, `regra_feriado`, tipificação)
- [ ] **Spec 04 — Formulário** (UI, mapa, import/export de JSON, geração do PDF operacional)
- [ ] **Spec 05 — Comparador** (dois JSONs → diff → PDF comparativo)
- [ ] **Spec 06 — Ingestor + Modelo PostgreSQL** (futuro: ingestão do JSON aprovado no banco oficial)
