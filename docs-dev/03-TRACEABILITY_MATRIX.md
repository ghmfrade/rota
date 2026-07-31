# 03 — TRACEABILITY_MATRIX: Matriz de Rastreabilidade

**Liga:** regra (`RN-xxx`, ver `01-RULE_INDEX.md`) → spec de origem → entidade/fluxo → ferramenta afetada → implementação provável → teste esperado → criticidade.
**Convenções:** F = Formulário, C = Comparador, I = Ingestor (futuro). "Implementação provável" é sugestão de módulo (o projeto ainda não tem código); nomes finais são decididos nas tasks. Testes: U = unitário, INT = integração, E2E, CONTRATO = snapshot/validação de schema, PDF = teste de geração/conteúdo do PDF.

| Regra | Origem | Entidade/Fluxo | Ferramenta | Implementação provável | Teste esperado | Criticidade |
|---|---|---|---|---|---|---|
| RN-001 | Spec 01 §6; 02 §12 | UUID (4 entidades) | F/C/I | schema (zod) + criação de entidade | U + CONTRATO | Alta |
| RN-002 | Spec 01 §6; 02 §12 | Criação de entidade | F | factory de entidades (`crypto.randomUUID`) | U | Alta |
| RN-003 | Spec 02 §12 | Edição | F | reducers/stores de edição | U (regressão) | Alta |
| RN-004 | Spec 01 §6; 02 §12; 04 §3.1; DEC-053 | Import/export; promoção Serviço (novo) | F | importador de JSON; promoção `ServicoEmConstrucao → Servico` preserva UUID (TASK-061) | U + INT (import→export idempotente; round-trip de UUID pós-promoção) | **Alta** |
| RN-005 | Spec 02 §12/§14 | Documento | F/C/I | validador estrutural | U + CONTRATO | Alta |
| RN-006 | Spec 01 §6; 02 §6/§12; DEC-037 | Serviço | F/C/I | diff/persistência nunca usam `numero_n`; sufixo regenerado na troca de característica | U (diff por uuid; regeneração de sufixo) | Alta |
| RN-007 | Spec 02 §12; 04 §6/§8.3-5/§16 item 4; DEC-099 | Cópias aditivas (UUID nova) + sincronização entre grades (`Copiar (sobrescrever)` preserva a UUID do destino casado) | F | ações duplicar/copiar/semear (`formulario/viagens/copias-grade.ts`) | U + E2E | Alta |
| RN-008 | Spec 02 §3/§14 | Raiz | F/C/I | schema | CONTRATO | Média |
| RN-009 | Spec 01 §5; 02 §1 | Documento | F/C/I | schema + leitores sem fetch externo | CONTRATO + INT | Alta |
| RN-010 | Spec 01 §3; 02 §16 | Documento | F/C/I | schema **fechado** (rejeitar campos extras de fluxo) | CONTRATO (negativo) | **Alta** |
| RN-011 | Spec 02 §4.1 | Autos | F/C/I | schema condicional status/data | U + CONTRATO | Alta |
| RN-012 | Spec 02 §4.1; 05 §4.3 | Diff | C | comparador: lista de campos excluídos | U | Alta |
| RN-013 | Spec 02 §16; 03 §11 | Documento/PDF | F/C/I | schema sem campos monetários; PDF sem R$ | CONTRATO + PDF | Alta |
| RN-014 | Spec 02 §8; 03 §3.4 | Distâncias | F/C/I | conversão única na borda OSRM | U | Alta |
| RN-015 | Spec 02 §8/§10.2; 03 §12 | Dados congelados | C/I | leitores sem dependência de OSRM/cálculo | INT (comparador offline) | Alta |
| RN-016 | Spec 01 §8; 04 §3.2/§5 | Identificação | F | loader de listas estáticas | U + INT | Média |
| RN-017 | Spec 01 §8; 04 §3.1/§14 | Import | F | validação de carregamento | U + INT | Alta |
| RN-018 | Spec 02 §14; 04 §6; DEC-053 | Autos/Seções; Serviço completo (novo) | F/C/I | validador estrutural + remoção em cascata; promoção `ServicoEmConstrucao → Servico` produz o ≥1 Serviço completo no fluxo novo (TASK-061) | U | Média |
| RN-019..022 | Spec 01 §7; 03 §10 | Tipificação | F/C/I | módulo de tipificação (tabela por tipo) | U (tabela completa, casos inválidos) | Alta |
| RN-023 | Spec 03 §10.4; 04 §5; DEC-034; DEC-037 | Troca de tipo | F | reconversão ao padrão + aviso + regeneração do sufixo `numero_n` | U + E2E | Média |
| RN-024 | Spec 02 §6 | Serviço.carater | F/C | schema enum | CONTRATO | Média |
| RN-025 | Spec 02 §5 | Seção | F/C/I | modelo de dados | CONTRATO | Alta |
| RN-026 | Spec 02 §5.1 | SeçãoServiço | F/C/I | validador (direcionalidade × geoloc) | U | Alta |
| RN-027 | Spec 02 §5.2; 03 §7.2 | Seção (350 m) | F | módulo geo (haversine, centroide, INSERIR) | U (casos de borda: 1º/2º ponto, deslocamento de centroide) | Alta |
| RN-028 | Spec 03 §7.3; 05 §4.1 | Seção (350 m estático) | C/I | VALIDA_ESTATICO | U | Média |
| RN-029 | Spec 03 §2.3; 04 §7.1 | Município | F | ponto-em-polígono + fallback 2 km | U (borda, litoral, fora de SP) | Alta |
| RN-030 | Spec 02 §2/§14 | Ida×Volta Seções | F/C/I | validador estrutural | U | Alta |
| RN-031 | Spec 02 §7 | Local | F/C/I | modelo/schema | CONTRATO | Alta |
| RN-032 | Spec 02 §7.1; 03 §7.4 | Local (350 m) | F/C/I | validação pareada | U | Alta |
| RN-033 | Spec 02 §10.1 | Parada XOR | F/C/I | schema (union discriminada) | U + CONTRATO (negativo) | Alta |
| RN-034 | Spec 02 §10.1/§14 | Ordem de paradas | F/C/I | validador | U | Alta |
| RN-035 | Spec 02 §10.1 | Extremos Seção | F/C/I | validador | U (negativo: Local na ponta) | Alta |
| RN-036 | Spec 02 §10.1 | Referências | F/C/I | validador referencial | U | Alta |
| RN-037 | Spec 02 §10.1 | Parada sem horário | F | modelo | CONTRATO | Média |
| RN-038 | Spec 02 §10/§14 | Itinerários | F/C/I | schema | U + CONTRATO | Alta |
| RN-039 | Spec 02 §10/§11 | Viagem no itinerário | F/C/I | schema | CONTRATO | Alta |
| RN-040 | Spec 02 §10.2/§14 | Rota | F/C/I | schema + validador de somas | U | Alta |
| RN-041 | Spec 02 §10.3; 03 §3.3/§3.6 | Trechos | F/C/I | validador + montagem de rota | U (com/sem pontos de rota) | Alta |
| RN-042 | Spec 02 §10.4; 03 §3.6 | Pontos de rota | F/C | schema + roteador | U + CONTRATO | Alta |
| RN-043 | Spec 03 §3.6 | Efeito no traçado | F | roteador | INT (mock OSRM) | Média |
| RN-044 | Spec 02 §10.5; 03 §3.7 | Descrição textual | F/C/I | módulo DESCRICAO + validador | U (marcos, ordem, sem Locais) | Alta |
| RN-045 | Spec 03 §3.7.5 | Limpeza de nomes | F | função LIMPA | U (dedupe, vazios, não consecutivos) | Média |
| RN-046 | Spec 03 §3.7.7; 04 §7.4 | Congelamento descrição | F/C/I | fluxo de recálculo | INT + E2E | Alta |
| RN-047 | Spec 03 §3.2/§3.3 | Requisição OSRM | F | cliente OSRM | U (montagem de URL) + INT (mock) | Alta |
| RN-048 | Spec 03 §3.5; 04 §7.3/§11 | Bloqueio OSRM | F | cliente OSRM + painel de pendências | INT (mock de falha) + E2E | **Alta** |
| RN-049 | Spec 03 §3.5; 04 §14 | Mensagens | F | catálogo de mensagens | U (texto sem "tarifa") | Média |
| RN-050 | Spec 03 §3.4 | Arredondamento | F | conversor m→km half-up | U (0,005→0,01; soma=total) | Alta |
| RN-051 | Spec 03 §3.6/§3.6.1 | legs→trechos | F | cliente OSRM (waypoints + fusão) | U (exemplo 3.6.1 literal) | Alta |
| RN-052 | Spec 03 §3.6.2; 04 §3.1/§7.3 | Abrir sem OSRM | F | fluxo de abertura | INT (nenhuma chamada) + E2E | Alta |
| RN-053 | Spec 03 §3.2/§3.7.8 | OSRM sem steps | F | compositor de descrição | U (degradação) | Baixa |
| RN-054 | Spec 02 §8/§14; 03 §4 | Matriz distâncias | F/C/I | módulo de matriz + validador | U (combinações completas) | Alta |
| RN-055 | Spec 03 §4.2 | Soma de trechos | F | módulo de matriz | U (com Locais no meio; min/max) | Alta |
| RN-056 | Spec 02 §8; 03 §5 | valor_adotado | F/C/I | módulo de matriz | U (média half-up; unidirecional) | Alta |
| RN-057 | Spec 02 §14; 03 §4.4 | ≥2 Seções | F/C/I | validador | U | Alta |
| RN-058 | Spec 02 §9 | Seccionamento | F/C/I | schema + editor de matriz | U + CONTRATO | Alta |
| RN-059 | Spec 02 §9/§14 | Par íntegro | F/C/I | validador | U (duplicata, par fora da matriz) | Alta |
| RN-060 | Spec 03 §6; 04 §9.2 | Sugestões | F | funções de sugestão (2 modos) | U (menor entre serviços; próprio) | Média |
| RN-061 | Spec 02 §11/§6.1; 04 §8; DEC-081 | Viagem estratificada (grade única; `tabela_excepcional_uuid` + invariante) | F/C/I | schema + grade | U + CONTRATO (invariante feriado×excepcional) | Alta |
| RN-062 | Spec 02 §11 | Reforço de horário (tupla c/ `tabela_excepcional_uuid`) | F/C/I | validador (não-unicidade) | U | Baixa |
| RN-063 | Spec 02 §11.1/§14 | horarios_paradas | F/C/I | validador | U (faltando parada, decrescente, 1º≠0) | Alta |
| RN-064 | Spec 03 §8.1 | Sugestão de offsets | F | módulo de horários | U (acúmulo, formato HMS) | Média |
| RN-065 | Spec 03 §8.2; 04 §8.2 | Redistribuição | F | módulo de horários (âncoras) | U (exemplo A/a/B literal; tail; degenerado) | Alta |
| RN-066 | Spec 03 §8.3 | Reset | F | módulo de horários | U (idempotência; preserva saída) | Média |
| RN-067 | Spec 04 §8.2; 05 §12.3 | Horários de relógio | F/C | conversão UI↔offset | U + E2E | Alta |
| RN-068 | Spec 03 §9.1; DEC-081 | Grade de feriados (substitui comum **e** excepcional; precedência) | F/C | semântica (docs/UI) | U (contagens; precedência) | Alta |
| RN-069 | Spec 03 §9.2/§9.4; 04 §10; DEC-081 | Contagens sem feriado **nem excepcional** | F/C | módulo de contagens | U (JSONs que só diferem em feriado **ou** excepcional) | Alta |
| RN-070 | Spec 03 §9.1 | Calendário externo | F/C/I | (ausência de código) | CONTRATO (sem campo de data de feriado) | Média |
| RN-071 | Spec 03 §9.3; 04 §11 | Feriado vazio | F | painel de alertas | U | Baixa |
| RN-072 | Spec 03 §9.4 | Fórmulas de contagem | F/C | módulo de contagens | U (ponta-a-ponta na união; estratificação) | Alta |
| RN-073 | Spec 01 §4/§8 | Opção derivada | F/C | módulo de contagens | CONTRATO (sem campo no JSON) | Média |
| RN-074..077 | Spec 04 §13; 05 §17.2 | PDF operacional | F | gerador de PDF | PDF (estrutura, aviso, sem R$/offsets) | Alta/Média |
| RN-078 | Spec 04 §11/§12 | Bloqueio de exportação | F | painel de pendências + export | INT + E2E | Alta |
| RN-079 | Spec 02 §4.1; 04 §12 | Exportar/vigente | F | ações de exportação | INT (status/datas/nome de arquivo) | Alta |
| RN-080 | Spec 05 §1/§2 | Comparador estático | C | arquitetura do comparador | INT (offline, sem OSRM) | Alta |
| RN-081 | Spec 05 §5.2 | Casamento UUID | C | motor de diff | U (add/rem/alt/inalt) | Alta |
| RN-082 | Spec 05 §5.3 | Casamento contextual | C | motor de diff | U (itinerário, parada por referência, pares) | Alta |
| RN-083 | Spec 05 §6 | Taxonomia | C | motor de diff | U (propagação; Δ posicional) | Alta |
| RN-084 | Spec 05 §4.4 | Autos diferentes | C | validação de entrada | U + E2E | Alta |
| RN-085 | Spec 05 §5.4 | Entidade recriada | C | heurística de alerta | U (sinaliza, não casa) | Média |
| RN-086 | Spec 05 §5.5/§8.4 | UUIDs não preservados | C | detector de taxa de casamento | U | Alta |
| RN-087 | Spec 05 §15.3; 04 §18 | Rota por sinais estáveis | C | comparador de rota | U (geometria difere, sinais iguais → inalterada) | Alta |
| RN-088 | Spec 05 §12 | Diff de horário | C | tela/PDF de horários | U (formato antigo→novo Δ) | Média |
| RN-089 | Spec 05 §10/§11/§13/§14 | Contagens e matrizes | C | telas de comparação | U + INT | Média |
| RN-090 | Spec 05 §3.1/§7.2 | Rótulos/troca de lados | C | UI de carregamento | U (espelhamento do Δ) + E2E | Baixa |
| RN-091 | Spec 05 §4 | Validação de entrada | C | pipeline de validação | U + INT | Alta |
| RN-092 | Spec 05 §17 | PDF comparativo | C | gerador de PDF comparativo | PDF | Alta |
| RN-093 | Spec 01 §2/§10 | Ingestor futuro | I | (nenhuma agora) | — (guardrail de revisão) | Alta |
| RN-094 | Spec 01 §6; 02 §12 | UUID como chave | I | (Spec 06 futura) | — | Média |
| RN-095 | Spec 01 §1/§3 | Zero gestão | F/C/I | (ausência de código) | CONTRATO negativo + revisão | **Alta** |
| RN-096 | Spec 01 §5; 04 §2.1 | Sem persistência | F | (ausência de backend) | revisão + E2E (sem chamadas de escrita) | Alta |
| RN-097 | Spec 01 §2 | Desacoplamento | F/C/I | separação de módulos/rotas | revisão de arquitetura | Alta |
| RN-098 | Spec 02 §6.1/§14; 04 §8.5; DEC-081; DEC-098 | TabelaExcepcional (`servico.tabelas_excepcionais[]`) | F/C/I | schema (zod strict) + validador (cardinalidade, `descricao` condicional, sem sobreposição) + migração 1.0→1.1 + CRUD no Formulário com remoção somente quando vazia | U + CONTRATO + E2E (negativos: 2ª verão, descricao ausente em personalizado, remoção referenciada bloqueada com quantidade) | Alta |
| RN-099 | Spec 02 §11/§6.1; 03 §9.1/§9.2; 04 §8.5; 05 §10.4/§12.3; DEC-081; DEC-098; DEC-099 | Grade excepcional da Viagem (referência, invariante, integridade na remoção, precedência, contagens, semeadura, diff) | F/C/I | schema (referência + invariante) + bloqueio de remoção sem cascata/conversão + grade no Formulário + contagens + diff por `uuid` da tabela | U + CONTRATO + INT + E2E (remoção preserva tabela e Viagens associadas; `Copiar (sobrescrever)` normaliza discriminadores) | Alta |

---

# Lacunas encontradas

## Regras sem teste automatizável óbvio

- **RN-093/RN-094 (Ingestor):** não há código a testar até a Spec 06 existir — proteção é por revisão (checklist) e pelo guardrail "não antecipar Ingestor".
- **RN-095/RN-096/RN-097 (regras negativas/arquiteturais):** parcialmente testáveis (schema fechado rejeitando campos de fluxo; E2E sem chamadas de rede de escrita); o restante é revisão humana com `07-CHECKLIST_ADERENCIA_SPEC.md`. Possível lint arquitetural (ex.: proibir import de módulo do Comparador dentro do Formulário).
- **RN-027 (350 m incremental):** depende da ordem de inserção — testável por sequências determinísticas, mas a validação plena "de produção" só ocorre na edição; a checagem estática (RN-028) cobre leitores.
- **Regras de UX pura** (RN-049 texto de mensagem, RN-090 rótulos): testes de conteúdo/E2E simples, valor moderado.

## Regras ambíguas (registradas em 16-OPEN_QUESTIONS.md)

- ~~**Q-001**~~ — **decidida (DEC-026):** a Spec 03 §10.2 v0.5 fechou a partição código-a-código (`CR`, `ME`, `ML`, `MM` só Rodoviário; `CL`, `MEL`, `MLL`, `MML` só Litorâneo; `EX`/`LE`/`MX` em ambos; `SL` não existe). RN-021/RN-022 atualizadas.
- **Q-004:** tolerância numérica de `distancia_km`/`duracao_s` para "rota alterada" no Comparador (Spec 05 §15.3) — afeta RN-087.
- **Q-005:** formato do recurso estático das listas de Autos/empresas/tipos (Spec 01 §8 diz "JSON estático", sem schema fechado) — afeta RN-016/RN-017.
- ~~**Q-006**~~ — **decidida (DEC-031):** distância à fronteira no fallback de 2 km do município é a mínima **ponto→segmento** (Haversine) sobre os anéis do polígono, com curto-circuito por bounding box; teto de 2 km e erro "fora de SP" inalterados. RN-029 implementada (TASK-011).

## Conflitos entre specs

- **CONFLITO-01 (prompt × specs):** modelo antigo de Viagem ("regra binária de feriado") citado no prompt gerador; superado pela Spec 02 §11 v0.6. Specs prevalecem — nenhum documento derivado usa o modelo antigo.
- **CONFLITO-02 (redação):** Spec 03 §3.7.3 menciona Locais "existindo normalmente em `matriz_distancias`" — Locais não têm entradas na matriz (RN-054); seus trechos são somados (RN-055). Sem impacto normativo; sugerida correção de redação (não alterar a spec sem decisão humana — Q-002).

## Pontos que exigem decisão humana antes da implementação relevante

- **Q-003:** stack de teste e bibliotecas (schema: zod?; PDF: pdfmake/react-pdf?; mapa: MapLibre já fixado na Spec 01 §8) — decisão de engenharia, não de spec.
- **Q-007:** OSRM auto-hospedado para produção (Spec 04 §7.3 registra o requisito; falta decisão de infra/prazo).
- **Q-008:** modo opcional "comparar Autos diferentes" (Spec 05 §4.4/§21.2) — implementar já como escape ou deixar fora do MVP 4.
- **Spec 06 inexistente** — qualquer task de Ingestor está bloqueada por definição (RN-093).
