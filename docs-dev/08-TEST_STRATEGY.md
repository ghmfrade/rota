# 08 — TEST_STRATEGY: Estratégia de Testes

**Princípios gerais:**

- Testes derivam de regras `RN-xxx` — o nome do teste cita a regra quando razoável (ex.: `rn004_import_preserva_uuids`).
- **Nenhum teste depende de serviço externo** — OSRM sempre mockado; base de municípios e listas estáticas são fixtures locais.
- Fixtures canônicas versionadas (TASK-041), começando pelo exemplo mínimo da Spec 02 §15.
- Caso inválido é obrigatório em toda regra de validação.

**Ferramentas recomendadas** (decisão de engenharia — confirmar em Q-003): Vitest (unitário/integração), Testing Library (componentes), Playwright (E2E), MSW ou stub injetado (mock OSRM), validação de schema com zod + snapshots de contrato.

---

## 1. Testes de contrato JSON

**Objetivo:** garantir que o schema da Spec 02 é aceito/recusado exatamente como especificado e que não regride entre versões.
**Exemplos:** fixture da Spec 02 §15 valida; mutação com `secao_uuid`+`local_uuid` simultâneos falha; campo extra `autos.aprovado_por` é rejeitado (schema fechado); `status:"vigente"` com `data_criacao` falha; snapshot do schema por `versao_schema`.
**O que não testar aqui:** algoritmos (cálculo de matriz, horários) — só forma.
**RN:** RN-001, RN-005, RN-008..011, RN-013, RN-014, RN-024, RN-033..041, RN-044, RN-054, RN-056..059, RN-061..063, RN-073.

## 2. Testes de validação de domínio

**Objetivo:** regras de negócio que aceitam/recusam estados: tipificação, 350 m, XOR de parada, extremos, Ida=Volta em Seções, integridade referencial.
**Exemplos:** Autos `Semiurbano` com Serviço `CR` falha; `CR`+`CL` no mesmo Autos falha; `ME` em Autos Litorâneo falha; `MX` aceito nos dois tipos rodoviários; sequência de inserções na Seção onde o candidato desloca o centroide e é recusado; Local com Ida/Volta a 400 m falha; itinerário com Local na primeira parada falha.
**O que não testar aqui:** interação de tela (E2E) e forma bruta do JSON (contrato).
**RN:** RN-017..023, RN-026..036, RN-057, RN-059.

## 3. Testes de cálculo

**Objetivo:** funções puras de cálculo com valores exatos.
**Exemplos:** Haversine com pares conhecidos; centroide (média simples); `dist(I,A,B)` somando trechos com Locais no meio; `valor_adotado` 6,00/6,10 → 6,05 (half-up); sugestão inicial de offsets por acúmulo; redistribuição proporcional (baseline 0/30/60, fixa 50 → 25; tail apeado; baseline degenerado uniforme); reset idempotente; contagens (viagens semanais, pares compráveis ∪ ponta-a-ponta sem dupla contagem, opções = viagens × pares); estratificação por faixa de horário; sugestões de seccionamento (menor entre Serviços; do próprio Serviço; empate).
**O que não testar aqui:** chamadas ao OSRM (categoria 4).
**RN:** RN-027, RN-050, RN-055, RN-056, RN-060, RN-064..066, RN-069, RN-072.

## 4. Testes de roteamento com mock do OSRM

**Objetivo:** cliente OSRM e montagem de `rota` sem tocar o serviço real.
**Exemplos:** URL montada com `overview=full&geometries=geojson&steps=true`; legs→trechos 1:1 sem pontos de rota; exemplo literal da Spec 03 §3.6.1 (A,p1,p2,p3,B,p4,C → `waypoints=0;4;6` → 2 trechos) e o fallback de fusão com 6 legs → 2 trechos; conversão m→km; timeout → 1 retry → mensagem de indisponibilidade; `NoRoute`/`NoSegment` sem retry, mensagem específica; **OSRM fora do ar impede conclusão da rota e a exportação**; resposta sem `steps` → rota válida, descrição só com marcos.
**O que não testar aqui:** desenho no mapa (E2E).
**RN:** RN-041..043, RN-047..053.

## 5. Testes de import/export

**Objetivo:** o ciclo salvar/retomar do Formulário.
**Exemplos:** **importar JSON e preservar UUID** (round-trip byte-comparável de UUIDs); criar nova Seção numa sessão → só ela tem UUID nova; exportar proposta → `data_criacao` de hoje, `status:"proposta"`; definir vigente → pede `data_publicacao`, remove `data_criacao`; identidade obsoleta (empresa fora da lista) bloqueia; JSON malformado bloqueia com categoria de erro; nome de arquivo sugerido correto.
**RN:** RN-004, RN-011, RN-017, RN-078, RN-079.

## 6. Testes do Comparador

**Objetivo:** casamento, taxonomia e leitura estática.
**Exemplos:** mesma UUID com campo mudado → **Alterada** (não removida+criada); UUID só no Arq. 1 → Removida; só no Arq. 2 → Adicionada; `numero_n` mudado com mesma UUID → mesma entidade (`antigo → novo`); dois arquivos que diferem só em `data_criacao` → **nenhuma** diferença operacional; Autos diferentes → bloqueio; taxa de casamento ~0 → alerta de UUIDs não preservados; entidade recriada (nome igual, UUID nova) → alerta, continua Removida+Adicionada; geometria diferente com paradas/distância dentro da tolerância → rota inalterada; JSONs que diferem só na grade de feriados → contagens principais idênticas; comparador roda 100% offline (espião garante zero requisições).
**O que não testar aqui:** o Formulário.
**RN:** RN-006, RN-012, RN-015, RN-069, RN-080..091.

## 7. Testes de PDF

**Objetivo:** estrutura e regras transversais dos dois PDFs (não pixel-perfect).
**Exemplos:** PDF operacional contém capa, resumo rotulado "semana padrão (sem feriados)", sequência de Seções, descrição textual, matrizes; **não** contém "R$", offsets, dados de workflow; aviso SEI presente; Locais só no anexo; PDF comparativo contém os dois cabeçalhos, resumo executivo, células `antigo → novo (Δ)`, anexo técnico com alertas.
**O que não testar aqui:** layout fino/visual (revisão humana).
**RN:** RN-074..077, RN-092.

## 8. Testes de UI (componentes)

**Objetivo:** comportamento de componentes isolados com estado real.
**Exemplos:** dropdown de característica filtrado pelo tipo; célula da grade recusa horário fora de ordem (fica em erro, não confirma); preencher primeira Seção cria Viagem e preenche passantes; painel de pendências lista e navega; município exibido somente-leitura e atualizado no arrasto.
**RN:** RN-019..023, RN-029, RN-063, RN-065, RN-067, RN-078.

## 9. Testes E2E

**Objetivo:** fluxos completos do usuário, com OSRM mockado na borda de rede.
**Exemplos:** criar documento do zero (aviso de identidade) → montar Serviço/Seções/itinerário → grade → matrizes → revisão → exportar proposta; carregar vigente → editar um horário → exportar → comparar os dois no Comparador → diff mostra exatamente a viagem alterada; falha de OSRM durante edição → pendência bloqueante → retry manual; gerar os dois PDFs.
**RN:** fluxos que amarram RN-004, RN-048, RN-052, RN-078, RN-079, RN-081.

## 10. Testes de regressão

**Objetivo:** proteger permanentemente as regras críticas contra mudanças futuras.
**Suíte fixa (roda sempre):**
- preservação de UUID no round-trip (RN-004);
- schema fechado rejeita campos de fluxo e R$ (RN-010, RN-013);
- XOR de Parada (RN-033) e extremos-Seção (RN-035);
- invariante trechos = paradas−1 com pontos de rota (RN-041);
- OSRM indisponível bloqueia exportação (RN-048);
- feriado não altera contagens (RN-069);
- Comparador offline e somente-leitura (RN-080);
- `status`/datas fora do diff (RN-012).

---

## Cenários nomeados exigidos (checklist mínimo)

| Cenário | Categoria | RN |
|---|---|---|
| Importar JSON e preservar UUID | 5, 10 | RN-004 |
| Criar nova Seção e gerar UUID | 2, 5 | RN-002 |
| Parada com `secao_uuid` e `local_uuid` simultâneos falha | 1, 2 | RN-033 |
| Autos semiurbano não pode receber característica rodoviária | 2 | RN-019/020 |
| OSRM fora do ar impede conclusão da rota | 4, 9 | RN-048 |
| Ponto de rota não entra na matriz de distâncias (nem cria trecho) | 4, 3 | RN-041/042 |
| Comparador identifica entidade alterada por mesma UUID | 6 | RN-081 |
| Comparador identifica entidade removida | 6 | RN-081 |
| Comparador identifica entidade nova | 6 | RN-081 |
| PDF operacional não contém dados de workflow | 7 | RN-010/074 |
| JSON exportado não contém status além de proposta/vigente | 1, 5 | RN-010/011 |
