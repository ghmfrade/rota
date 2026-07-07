# 09 — DEFINITION_OF_DONE: Definição Oficial de Pronto

Uma task só é **pronta** quando **todos** os itens da base valem, mais os itens do seu tipo de entrega. "Quase pronto com follow-up silencioso" não existe — pendência vira item explícito na task/`16-OPEN_QUESTIONS.md`.

## Base (toda task)

- [ ] Implementa **exatamente** o escopo da task (nem menos, nem "bônus").
- [ ] Referencia as regras RN e specs fonte; código usa a nomenclatura oficial.
- [ ] Respeita as specs; nenhuma regra nova sem documentação (inferências marcadas).
- [ ] Não viola a separação ROTA/SEI (RN-095) nem cria persistência indevida (RN-096).
- [ ] Mantém o JSON como contrato (nenhum campo fora da Spec 02; RN-010).
- [ ] Possui testes adequados (categorias da `08`), incluindo casos inválidos.
- [ ] Passa em todas as verificações existentes (typecheck, lint, suíte completa — inclusive regressão de UUID).
- [ ] Checklist `07` percorrido; resultado registrado com `14-REVIEW_REPORT_TEMPLATE.md`.
- [ ] Documentação derivada atualizada quando necessário (RULE_INDEX/matriz/backlog **não** mudam sem causa; `16-OPEN_QUESTIONS.md` ganha as dúvidas novas).
- [ ] Dúvidas e decisões pendentes registradas — nunca resolvidas por conta própria.

## Por tipo de entrega

### Entrega de schema (contrato JSON)

- [ ] Mudança precedida de alteração na Spec 02 (ou task explicitamente aprovada para isso).
- [ ] Schema fechado (campo desconhecido rejeitado); casos negativos por validação nova.
- [ ] Fixtures canônicas atualizadas; snapshot de contrato atualizado conscientemente.
- [ ] Avaliado impacto em `versao_schema` (quebra leitura antiga? → incrementar e registrar).

### Entrega de validação

- [ ] Severidade correta: bloqueante × alerta, conforme a spec (ex.: 350 m estático é alerta no Comparador, RN-028).
- [ ] Mensagem de erro conforme Spec 04 §14 / Spec 05 §18 (operacional, sem nomes internos, sem tarifa).
- [ ] Testado o par aceito/recusado de cada fronteira (ex.: 350 m exato passa; 351 m falha).

### Entrega de UI

- [ ] Padrões transversais: `Cidade - Nome da Seção`; horários de relógio (sem offsets); km sem R$; semana padrão rotulada.
- [ ] Pendências integradas ao painel (bloqueantes travam exportação).
- [ ] Nenhuma tela expõe `uuid`, `offset_horario` cru ou nomes internos do schema (Spec 04 §2.4).
- [ ] Estados de erro da Spec 04 §14 cobertos.

### Entrega de cálculo

- [ ] Função pura, determinística, testada com valores exatos das specs (exemplos literais quando existem).
- [ ] Arredondamento half-up 2 casas onde aplicável; unidades km/segundos corretas.
- [ ] Casos de borda da spec cobertos (unidirecional, degenerado, empate, vazio).

### Entrega de mapa/rota

- [ ] OSRM mockado nos testes; falha bloqueante tratada; sem fallback de linha reta.
- [ ] Invariante trechos = paradas−1 testado com e sem pontos de rota.
- [ ] Abrir JSON não dispara requisição (teste com espião).
- [ ] Recálculo dispara nas edições certas (e só nelas).

### Entrega de PDF

- [ ] Estrutura da spec presente e na ordem (Spec 04 §13 / Spec 05 §17).
- [ ] Proibições verificadas por teste: sem R$, sem offsets, sem workflow; aviso SEI presente.
- [ ] Locais restritos ao anexo técnico.
- [ ] Legibilidade revisada por humano (tipografia tabular, quebras).

### Entrega de comparador

- [ ] Casamento por UUID intocado (nenhuma heurística casa entidades).
- [ ] Roda offline (zero requisições) e não muta os JSONs de entrada (teste de imutabilidade).
- [ ] `status`/datas fora do diff; Δ posicional Arq.2−Arq.1.
- [ ] Semana padrão × feriados separados em toda tela/PDF tocado.

### Entrega de ingestor

- [ ] **Pré-condição dura:** decisão humana registrada + Spec 06 existente (RN-093). Sem isso, não há DoD — a entrega é inválida por definição.
- [ ] UUID como chave; checagens estáticas aplicadas; nenhuma escrita fora do escopo aprovado.
