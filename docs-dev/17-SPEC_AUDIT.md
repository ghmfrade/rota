# 17 — SPEC_AUDIT: Auditoria das Specs Existentes

**Data da auditoria:** 2026-07-07. **Escopo:** `docs/specs/*.md` (5 arquivos ativos; `docs/specs/old/` e `docs/specs/future/` não são normativos).

---

## 1. Arquivos de spec encontrados

| Arquivo | Versão | Status declarado |
|---|---|---|
| `01-visao-geral.md` | v0.6 | Em definição |
| `02-esquema-json-operacao.md` | v0.9 | Em definição |
| `03-regras-de-negocio-calculo.md` | v0.5 | Em definição |
| `04-formulario-ux-pdf.md` | v0.3 | Em definição |
| `05-comparador-json-operacao.md` | v0.1 | Em definição |
| `06 — Ingestor + PostgreSQL` | — | **Inexistente (pendente)** |

Não normativos: `old/` (prompts e revisões históricas: CRIAR-spec-04/05, REVISAO-specs-01-02-03, PROBLEMAS-ENCONTRADOS etc.); `future/CRIAR-estrutura-spec-driven.md` (prompt que gerou este kit).

## 2. Resumo de cada spec

- **Spec 01 — Visão Geral:** identidade do produto (apoio à elaboração, não gestão), três ferramentas desacopladas, JSON como contrato, UUID estável, tipificação em famílias, decisões de design e histórico de questões (todas as 5 fechadas). Substituiu a v0.1 (sistema de gestão).
- **Spec 02 — Esquema do JSON:** o contrato completo: árvore, campos, tipos, condicionalidades (`status`+data), regra de UUID, 350 m estrutural, matrizes, viagem estratificada, descrição textual, validações estruturais (§14) e exemplo completo (§15). 23 decisões fechadas com histórico de superações.
- **Spec 03 — Regras de Negócio e Cálculo:** algoritmos: Haversine/centroide, município ponto-em-polígono, OSRM (requisição/extração/arredondamento/erros), pontos de rota (com exemplo trabalhado), descrição textual, matriz de distâncias, `valor_adotado`, sugestões de seccionamento, 350 m (incremental/estática/pareada), horários (sugestão/redistribuição/reset), feriado e contagens, tipificação, tarifa externa; tabela de fronteira com a Spec 04 (§12).
- **Spec 04 — Formulário:** UX por etapas, tela inicial (carregar × criar), mapa integrado (Seções/Locais/pontos de rota), painel de descrição textual, grade de horários (comum/feriados), matrizes, resumo operacional com faixas, revisão (bloqueantes × alertas), exportação, PDF operacional detalhado, catálogo de mensagens de erro, 22 critérios de aceite; registra as alterações que induziu nas Specs 01–03.
- **Spec 05 — Comparador:** entradas e rótulos, validação por arquivo/entre arquivos, casamento por UUID + contexto, taxonomia, telas (visão geral→mapa), fórmulas reaproveitadas, PDF comparativo, mensagens de erro, 15 critérios de aceite, pontos futuros explícitos.

## 3. Assuntos cobertos

Domínio e entidades; contrato JSON completo com validações; identidade/UUID; roteamento e falhas; pontos de rota; descrição textual; município derivado; matrizes; horários e feriados; contagens; tipificação; UX do Formulário; PDFs (operacional e comparativo); diff completo; mensagens de erro; fronteiras entre specs (mecanismo maduro de referência cruzada e superação registrada).

## 4. Assuntos ausentes

1. **Spec 06 / Ingestor + PostgreSQL** — inexistente (Q-009).
2. **Schema das listas estáticas** de Autos/empresas/tipos (Q-005).
3. ~~Partição código-a-código dos mistos rodoviários~~ — **resolvida** em 2026-07-07 (DEC-026; Spec 03 §10.2 v0.5; códigos definitivos `CR`/`CL`/`EX`/`LE`/`ME`/`MEL`/`ML`/`MLL`/`MX`/`MM`/`MML`; `SL` não existe).
4. **Tolerância numérica** do diff de rota (Q-004).
5. **Distância ponto→fronteira** no fallback de município (Q-006).
6. **Recuperação de sessão local** (perda de trabalho sem exportar) — não tratada (Q-011).
7. **Requisitos não-funcionais** além do OSRM: metas de desempenho (Autos grandes no diff/PDF), acessibilidade, i18n, navegadores suportados.
8. **Forma do recurso de tarifa da portaria** (deliberadamente adiado — Q-010).
9. **Detalhes de PDF**: fontes, limites de página, comportamento com dezenas de Seções (qualidade, não contrato).

## 5. Conflitos encontrados

- **CONFLITO-01 (externo):** prompt gerador deste kit × specs — modelo antigo de Viagem ("regra binária de feriado"). Superado; specs prevalecem (RN-061). Sem ação nas specs.
- **CONFLITO-02 (interno, redação):** Spec 03 §3.7.3 cita `matriz_distancias` entre os lugares onde Locais "continuam existindo"; contradiz (na letra) a Spec 02 §8. Sem efeito normativo; correção de redação sugerida (Q-002).
- Nenhum outro conflito normativo identificado — as divergências históricas (ex.: `regra_feriado`, mensagem de tarifa, `offset` na Parada, campo `papel`) estão **explicitamente superadas e registradas** nas próprias specs, o que é um ponto forte.

## 6. Duplicidades

Redundância **intencional e consistente** (mesma regra citada em várias specs com referência cruzada): faixas de horário (Spec 04 §10 = Spec 05 §10.2), padrão `Cidade - Nome da Seção`, "semana padrão", regras de km/sem R$/sem offsets, validações da Spec 02 §14 reapresentadas na Spec 05 §4.1. Risco baixo: manutenção futura deve atualizar todos os pontos (o RULE_INDEX centraliza isso via RN).

## 7. Regras críticas (top 10)

1. **RN-004** — importar preserva UUIDs (sem isso o Comparador morre).
2. **RN-010/011** — JSON só de operação; exceção estreita `status`+data.
3. **RN-095/096/097** — zero gestão; sem persistência de servidor; ferramentas desacopladas.
4. **RN-048** — OSRM indisponível bloqueia (a distância alimenta a tarifa).
5. **RN-033/035** — Parada XOR e extremos-Seção.
6. **RN-041/042** — invariante de trechos; pontos de rota sem identidade.
7. **RN-025/031** — Seção (Autos, tarifa) ≠ Local (Serviço, comum).
8. **RN-054..056** — matriz de distâncias intra-Serviço, congelada, média half-up.
9. **RN-061/068/069** — viagem estratificada; feriado substitui e não conta.
10. **RN-081/087** — diff por UUID; rota por sinais estáveis.

## 8. Trechos que exigem esclarecimento

Consolidados em `16-OPEN_QUESTIONS.md`: Q-002 (redação §3.7.3), Q-004 (tolerância), Q-005 (listas), Q-006 (fronteira do município), Q-011 (rascunho local). Q-001 (mistos) foi **decidida** em 2026-07-07 (DEC-026). Nenhum dos pendentes impede o início do MVP 0; Q-005 deve ser a primeira decisão (bloqueia TASK-002).

## 9. Recomendações de reorganização (sem alterar os originais)

1. Manter as specs como estão — a rastreabilidade agora passa pelo `01-RULE_INDEX.md` (não fragmentar as specs).
2. Consolidar futuras correções de redação (Q-002) em revisões de versão explícitas, mantendo o padrão de "Decisões Fechadas" com superações.
3. Quando a Spec 06 nascer, seguir o mesmo padrão (dependências, decisões fechadas, critérios de aceite).
4. Considerar um `CHANGELOG.md` em `docs/specs/` (as versões estão nos cabeçalhos, mas o histórico entre arquivos é reconstruível só pelo git).
5. Mover permanentemente prompts executados para `docs/specs/old/` (padrão já praticado).

## 10. Avaliação de prontidão para implementação

| Área | Prontidão | Observação |
|---|---|---|
| Contrato JSON (Spec 02) | **Pronto para implementação** | Validações §14 + exemplo §15 dão base de teste imediata. |
| Regras/cálculo (Spec 03) | **Pronto para implementação** | Algoritmos com pseudocódigo e casos de borda; pende Q-006 (pontual; Q-001 resolvida — DEC-026). |
| Formulário (Spec 04) | **Parcialmente pronto** | UX bem definida; pende Q-005 (listas — bloqueia identificação) e Q-011 (rascunho); grade de horários exigirá refinamento visual em implementação. |
| PDF operacional (Spec 04 §13) | **Parcialmente pronto** | Estrutura fechada; qualidade tipográfica/paginação a refinar na prática. |
| Comparador (Spec 05) | **Parcialmente pronto** | Modelo de diff completo; pende Q-004 (tolerância) e Q-008 (escape opcional). |
| Ingestor | **Insuficiente** | Spec 06 inexistente — bloqueado por definição (RN-093). |
| Infra de produção (OSRM) | **Precisa de decisão** | Q-007 antes do release do MVP 2. |

**Conclusão:** o conjunto 01–05 está maduro e incomumente bem referenciado entre si; o caminho MVP 0 (contrato + validações) pode começar imediatamente, com Q-003 e Q-005 como únicas decisões prévias necessárias.
