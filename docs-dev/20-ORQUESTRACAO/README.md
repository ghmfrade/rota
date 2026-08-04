# 20 — ORQUESTRAÇÃO: execução sequencial de várias tasks sem supervisão intermediária

**Status deste documento:** proposta de desenho, aguardando revisão humana. Nada aqui está
implementado. · **Data:** 2026-08-04 · **Autor:** Claude (Opus 5), a pedido do responsável.

---

## 1. Problema

O ciclo atual (`CLAUDE.md` — "Ciclo por task") é bom e não está em questão: `/analisar-task`
→ aprovação humana → `/implementar-task` → **nova conversa** → `/revisar-aderencia`. O custo é
que ele exige o humano em pelo menos três pontos por task. Para uma fila de tasks pequenas e
já bem especificadas (ex.: TASK-131 até TASK-138), isso significa dezenas de interrupções para
aprovar planos que raramente mudam.

O que se quer: disparar **"execute da TASK-x até a TASK-y"**, deixar rodar, e revisar o
conjunto uma única vez no fim — sem que uma task problemática queime tokens indefinidamente
nem contamine as seguintes com decisões inventadas.

O que **não** se quer: enfraquecer o modelo atual. Este documento propõe um caminho
**paralelo**. O modo manual continua idêntico, é a referência de comportamento e é o fallback
sempre que a orquestração parar.

---

## 2. Decisão estruturante: o orquestrador é um script, não uma conversa

Um orquestrador implementado como conversa do Claude chamando subagentes tem três defeitos
fatais para este uso:

1. **Ele mesmo vira a conversa gigante** — acumula o resumo de cada task da fila, exatamente o
   que se quer evitar;
2. **Não é retomável** — perda de contexto ou queda no meio derruba a corrida inteira;
3. **A fronteira de conversa vira promessa de prompt**, não garantia. A `/revisar-aderencia`
   exige literalmente conversa nova, reconstruída dos artefatos persistidos.

Portanto: **a máquina de estados é determinística (Node), e o Claude é invocado por fase, em
processo separado, via `claude -p` (headless).** Cada fase nasce com contexto zero, salvo uma
exceção deliberada (§4). O loop de controle custa zero token.

Consequência positiva: a fronteira de conversa da revisão passa a ser **estrutural** — não há
como a revisão "lembrar" da implementação, porque é outro processo.

---

## 3. Artefatos

```
scripts/orquestrar-tasks.mjs          o loop, o estado, o budget, o git
docs-dev/20-ORQUESTRACAO/
  README.md                           este documento (desenho)
  corridas/
    <AAAAMMDD-hhmm>/
      ledger.json                     estado retomável, uma linha por fase
      relatorio.md                    o que o humano lê quando a corrida termina
.claude/skills/
  analisar-verdito/SKILL.md           nova — decide SEGUIR/CORRIGIR/PARAR
  analisar-correcao/SKILL.md          nova — planeja a correção de um parecer
  registrar-questao/SKILL.md          nova — acrescenta Q-xxx Pendente ao docs-dev/16 (§7)
```

**Zero alteração** em skills existentes, hooks, `settings.json` ou specs. As três skills novas
são aditivas e servem também ao uso manual. O único derivado que a corrida escreve além dos já
escritos pelo ciclo normal (`14-REVISOES/`, `19-STATUS_EXECUCAO.md`) é o
`16-OPEN_QUESTIONS.md`, em modo append e apenas com perguntas (§7).

`ledger.json` e `relatorio.md` são **efêmeros por natureza**, como o `ultimo-test-all.log`:
registro de execução, nunca fonte de verdade de negócio. `corridas/` fica no `.gitignore`.

---

## 4. Como sai "opus analisa, sonnet implementa, na mesma conversa"

Dois processos, uma sessão:

```
claude -p --model opus --output-format json  "/analisar-task TASK-131"
  → o script captura o session_id do JSON de saída

claude -p --resume <session_id> --model sonnet  "/implementar-task TASK-131"
  → mesma conversa, contexto da análise preservado, modelo trocado
```

`--resume` preserva o histórico; `--model` na retomada troca quem responde. É o único
mecanismo que entrega literalmente "análise em opus e implementação em sonnet na mesma
conversa".

A revisão é **processo novo, sem `--resume`, em opus**. Idem o analisador de verdito e a
análise de correção.

**Este `--resume` é a única exceção ao contexto zero por fase, e é intencional:** o
`/implementar-task` já exige, por skill, o plano aprovado da análise na mesma conversa.

### Aprovação do plano em modo orquestrado

No modo manual, a análise para e aguarda aprovação humana. Na corrida, essa aprovação é
substituída por **aprovação por triagem automática** (§5, fase 3): o script só deixa passar
para a implementação uma análise que não se declarou bloqueada, não propôs Q-xxx nova e não
marcou inferência controlada de alto impacto. Qualquer um desses três casos **para a task**.
Ou seja: a corrida não aprova planos duvidosos — ela recusa-se a executá-los.

---

## 5. Ciclo por task

Uma task por vez, sempre sequencial (justificativa em §8).

| # | Fase | Quem | Contexto | Saída |
|---|---|---|---|---|
| 1 | PREPARO | script | — | working tree limpo, task existe em `06`/`19`, dependências de `19` satisfeitas |
| 2 | ANÁLISE | opus | novo | `/analisar-task TASK-N` + `session_id` guardado |
| 3 | TRIAGEM | script | — | passa / PARA (sem gastar a fase de implementação) |
| 4 | IMPLEMENTAÇÃO | sonnet | `--resume` da fase 2 | `/implementar-task TASK-N`, suíte verde, commit `Implementa TASK-N: …` |
| 5 | REVISÃO | opus | novo | `/revisar-aderencia TASK-N` → parecer em `docs-dev/14-REVISOES/`, commit da revisão |
| 6 | VEREDITO | opus | novo, mínimo | JSON `SEGUIR` / `CORRIGIR` / `PARAR` |
| 7 | ROTEAMENTO | script | — | próxima task, rodada de correção, ou fim da corrida |

Rodada de correção (só quando a fase 6 disser `CORRIGIR`):

| # | Fase | Quem | Contexto | Saída |
|---|---|---|---|---|
| 4a | ANÁLISE DA CORREÇÃO | opus | novo — lê parecer, task, specs citadas | plano de correção restrito às ressalvas |
| 4b | CORREÇÃO | sonnet | `--resume` de 4a | commit `Corrige TASK-N (rodada k): …`, suíte verde |
| → | volta à fase 5 | | | nova revisão, novo veredito |

**Limite duro: 3 rodadas de correção por task** (`--max-correcoes`, decisão do responsável em
2026-08-04). A quarta não existe — vira `PARAR`.

> Não confundir com `--max-turns` (§9): aquele limita os turnos do modelo **dentro de uma
> fase**; este limita quantas vezes o ciclo revisão→correção→revisão se repete na mesma task.

---

## 6. O analisador de verdito

É o componente que decide se vale a pena continuar. Duas características o tornam barato e
confiável:

- **Não conversa.** Recebe apenas: o parecer persistido em `docs-dev/14-REVISOES/`, o
  `git diff --stat` da task e o resumo das fases anteriores no ledger (poucos KB). Nunca o
  diff completo, nunca o contexto da implementação.
- **Devolve contrato fechado**, lido pelo script:

```json
{
  "verdito": "SEGUIR | CORRIGIR | PARAR",
  "motivo": "uma frase objetiva",
  "rn_envolvidas": ["RN-xxx"],
  "custo_estimado_correcao": "baixo | medio | alto",
  "q_proposta": null,
  "evidencia": "docs-dev/14-REVISOES/TASK-131-20260804.md:linha"
}
```

Saída fora do formato, ou `verdito` ausente → o script trata como `PARAR` (falha fechada).

### Política de parada — vinculante

**PARAR** (congela a corrida e aguarda o humano) em qualquer um destes:

- parecer **reprovado**, ou "aprovado com ressalvas" contendo condição impeditiva;
- violação de **RN de severidade Alta**, de **NEG-xxx**, do contrato JSON (RN-008..015) ou da
  regra de UUID (RN-004..007);
- necessidade de **alteração de spec** (`docs/specs/**` é read-only — sempre humano);
- **Q-xxx nova sem decisão** registrada em `docs-dev/10`;
- 3ª rodada de correção da mesma task não resolveu;
- `npm run test:all:log` vermelho após 2 tentativas, ou `test:all:verificar` recusando a
  evidência;
- **diff além do previsto**: arquivos tocados > 2× o "Arquivos previstos" da análise, ou
  arquivo fora do módulo declarado — sinal de escopo vazando (`docs-dev/04` princípio 7);
- budget da corrida atingido (§7);
- fase que estourou `--max-turns` ou terminou com erro de processo.

**CORRIGIR** apenas para defeito **local e mecânico**, que não cria regra de negócio: teste
faltando, caso inválido não coberto, falha de lint/typecheck, ressalva pontual com correção
óbvia e delimitada, `custo_estimado_correcao` = `baixo` ou `medio`.

**SEGUIR**: aprovado, ou aprovado com ressalvas registradas como follow-up sem condição de
merge pendente.

Na dúvida entre `CORRIGIR` e `PARAR`, o analisador deve escolher `PARAR`. Uma corrida que para
cedo custa uma retomada; uma corrida que insiste custa tokens e um histórico de commits sujo.

---

## 7. Qs sim, DEC nunca

**Decisão do responsável (2026-08-04): o orquestrador nunca registra DEC-xxx.**

Registrar decisão automaticamente quebraria o não-negociável nº 2 do `CLAUDE.md` ("não
inventar regra de negócio") e a pré-condição literal da `/registrar-decisao` — que só executa
decisão explícita do responsável pelo domínio, dada literalmente na conversa. Se o modelo
decidisse, o `docs-dev/10-DECISION_LOG.md` deixaria de ser registro de decisão humana e
viraria opinião de modelo, herdada em silêncio por todas as tasks seguintes.

### A pergunta o robô registra; a resposta é sua

Isso não é concessão: é o que o protocolo **já** manda. `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md`
item 2 — "Lacuna → registrar em `16-OPEN_QUESTIONS.md`, nunca decidir sozinho". A Q-089 nasceu
exatamente assim no ciclo manual (commit `aeae0db`). A corrida apenas mantém a prática.

A fronteira, portanto, é entre dois arquivos e duas skills:

| | Arquivo | Skill | Quem pode |
|---|---|---|---|
| **Pergunta** | `docs-dev/16-OPEN_QUESTIONS.md`, status `Pendente` | `/registrar-questao` (nova) | orquestrador e humano |
| **Resposta** | `docs-dev/10-DECISION_LOG.md` (`DEC-xxx`) | `/registrar-decisao` (existente) | **só o humano** |

### Skill `/registrar-questao` — escopo mínimo

1. Lê `docs-dev/16` e acha o **próximo `Q-xxx` sequencial livre** (numeração nunca reutilizada,
   como no `10`). A corrida é serial (§8), então não há disputa de numeração.
2. **Acrescenta** a entrada ao fim da seção temática correspondente — `append`, nunca
   `index`/`replace` em marcador repetido, pela regra de edição de derivados longos do
   `CLAUDE.md`. Depois de escrever, confere `git diff --numstat`: qualquer linha removida →
   restaura do `HEAD` e refaz.
3. Formato idêntico ao das Q existentes: **Contexto**, **Spec relacionada**, **Impacto se não
   decidir**, **Opções possíveis** (numeradas), **Recomendação técnica** (permitida — é
   argumento, não decisão) e **`Decisão:` Pendente**, vazio.
4. **Proibições:** nunca escrever no `docs-dev/10`; nunca marcar a Q como decidida; nunca
   redigir a recomendação como se fosse a decisão; nunca tocar `docs/specs/**`.

### Fluxo quando surge ambiguidade real, em qualquer fase

1. A fase invoca `/registrar-questao` e a Q entra no `16` como `Pendente`.
2. A task é marcada **PARADA-POR-Q** no ledger, com o número da Q. Nenhum código dela é
   commitado além do que já estava verde.
3. Comportamento da fila, por flag:
   - **padrão (`--parar-na-primeira`)**: a corrida termina ali;
   - **`--pular-bloqueadas`**: segue para a próxima task que **não** dependa da task parada nem
     da mesma área (dependências lidas de `docs-dev/19-STATUS_EXECUCAO.md`; na dúvida sobre
     dependência, não pula).
4. No fim, o `relatorio.md` lista as Q abertas na corrida, por número. Você decide todas de uma
   vez e roda `/registrar-decisao` por Q — que continua sendo o **único** caminho até o
   `docs-dev/10`.

Efeito colateral desejável: em vez de N interrupções espalhadas, uma sessão única de decisões.

---

## 8. Restrições do ambiente que o desenho respeita

- **Sequencialidade obrigatória.** `npm run test:all:log` sobe um Next próprio na porta 3100 e
  o `test:all:verificar` valida fingerprint do conteúdo **e identidade do working tree**. Duas
  tasks em paralelo — ou em worktrees distintos — invalidam a evidência canônica. A corrida é
  estritamente serial, e nunca roda build/E2E em paralelo com uma fase.
- **Hook `Stop`.** `verificar-rastreabilidade.mjs --hook` dispara ao fim de **cada** processo
  headless. Isso é a favor (rastreabilidade verificada por fase), mas o script precisa ler a
  saída do hook como sinal de fase — bloqueio do hook é `PARAR`, não ruído.
- **Hook `protect-specs`.** Continua valendo em todas as fases; nenhuma fase da corrida tem
  qualquer motivo para tocar `docs/specs/**`.
- **Git.** A corrida roda em branch própria `orquestracao/<AAAAMMDD-hhmm>`, criada a partir da
  branch de trabalho atual. Commits seguem a convenção de dois commits por task já existente
  (implementação e revisão separados), mais os commits de correção. Uma corrida ruim se
  descarta inteira sem contaminar a branch de trabalho; uma corrida boa entra por merge após
  sua revisão manual.
- **Working tree sujo no PREPARO → PARAR imediato.** Nunca misturar trabalho manual em curso
  com uma corrida.

---

## 9. Controle de tokens

- Nada de contexto trafega entre fases **exceto** o `session_id` análise→implementação e
  análise-de-correção→correção. Todas as demais fases leem artefatos do disco — que é o que as
  skills já mandam fazer.
- **Teto por fase, em duas camadas.** A CLI instalada (2.1.221) **não tem `--max-turns`** — foi
  verificado no `--help`. O teto é montado com o que existe:
  1. **Timeout de parede**, que mata a árvore de processos (`taskkill /T /F` no Windows). É a
     trava dura: nenhum processo da corrida sobrevive ao orquestrador desistir dele.
  2. **Teto de turnos conferido depois**, lendo `num_turns` do JSON de resultado. Estourou =
     a fase se enrolou = `PARAR`. Não impede o gasto daquela fase, mas impede que a corrida
     continue em cima de uma fase que perdeu o rumo.

  Um *turno* é uma resposta do modelo mais as ferramentas que ela chama; nada disso tem
  relação com `--max-correcoes` (§5). Valores iniciais, a calibrar pelo custo real do ledger:

  | Fase | Turnos | Timeout | Por quê |
  |---|---|---|---|
  | Análise | 30 | 20 min | leitura de specs e RN, sem edição |
  | Implementação | 90 | 75 min | edita, teste direcionado, lint, typecheck, build, suíte final |
  | Análise da correção | 25 | 20 min | lê parecer e specs citadas |
  | Correção | 60 | 60 min | escopo restrito às ressalvas |
  | Revisão | 60 | 45 min | checklist `07` item a item, parecer, `19` |
  | Veredito | 8 | 10 min | lê parecer + `--stat`, devolve JSON |

- **`--budget-usd`** além do `--budget-turnos`: o JSON de resultado traz `total_cost_usd` por
  fase, então o custo real é acumulado no ledger e comparado a cada fase.
- O analisador de verdito recebe parecer + `--stat`, jamais o diff completo.
- **Budget global da corrida** no ledger (turnos totais e/ou custo e/ou tempo de parede).
  Atingido → `PARAR` com relatório do que ficou pronto.
- Toda fase escreve seu custo no ledger, para calibrar as corridas seguintes com dado real.

---

## 10. Interface

```
npm run orquestrar -- --de TASK-130 --ate TASK-133 [opções]
node scripts/orquestrar-tasks.mjs --de TASK-130 --ate TASK-133 [opções]

  --tasks TASK-131,TASK-134,TASK-140   lista explícita, alternativa a --de/--ate
  --executar                           EXECUTA DE VERDADE (sem isto, é ensaio)
  --ensaio                             imprime o plano e não executa nada (PADRÃO)
  --parar-na-primeira                  (padrão) primeira parada encerra a corrida
  --pular-bloqueadas                   segue para a próxima task independente
  --max-correcoes 3                    (padrão 3; teto rígido, não configurável acima disso)
  --budget-turnos 600                  budget global de turnos
  --budget-usd 25                      budget global de custo
  --permissoes acceptEdits             (padrão) ou bypassPermissions
  --retomar <id-da-corrida>            continua do ledger, da fase onde parou

  ROTA_CLAUDE_CLI=<caminho>            executável do Claude Code, se fora do PATH
```

**O ensaio é o padrão, e isso é deliberado:** o comando sem `--executar` nunca gasta um token.
Gastar exige um ato explícito, porque o erro caro aqui (disparar a fila errada) é silencioso e
só aparece na fatura.

A ordem de execução respeita `docs-dev/19-STATUS_EXECUCAO.md`: se a ordem registrada lá
contradiz o intervalo pedido, o script **avisa e para**, não reordena por conta própria.

### `--parar-na-primeira` × `--pular-bloqueadas`

Fila 131..138, a 133 para. Com o padrão, a corrida encerra ali: você recebe 131 e 132 prontas e
uma Q para decidir — previsível, sem buraco no meio. Com `--pular-bloqueadas`, a corrida tenta
134..138 e só evita as que dependam da 133; rende mais por corrida, mas o relatório sai com
lacunas e existe o risco de pular uma dependência não declarada no `19`. **Padrão é
`--parar-na-primeira`**; use o outro quando a fila for de tasks visivelmente independentes.

### Antes × depois da corrida

- **Antes:** `--ensaio` imprime na tela a fila resolvida, a ordem, as dependências lidas do `19`
  e os tetos que valerão. Não executa nada e não escreve arquivo.
- **Depois:** `corridas/<id>/relatorio.md` — o documento de aceitação do lote. Uma seção por
  task, na ordem executada, cada uma com: **resultado** (concluída / parada-por-Q /
  parada-por-parecer / não iniciada), **parecer** com link para `14-REVISOES/`, **commits**,
  **arquivos tocados × previstos na análise**, **rodadas de correção gastas**, **Q aberta**
  (número e título, se houver), **ressalvas herdadas** que viraram follow-up, e **custo**
  (turnos por fase). Fecha com o resumo da corrida: quantas concluíram, onde parou, o que você
  precisa decidir, e o comando de retomada.

---

## 11. O que este desenho deliberadamente não faz

- **Não aprova plano no lugar do humano** — recusa executar plano duvidoso (§4).
- **Não decide regra de negócio** — nem por "recomendação óbvia" (§7).
- **Não altera spec, nem derivado de spec**, exceto os que as skills já alteram no ciclo normal
  (`14-REVISOES/`, `19-STATUS_EXECUCAO.md`).
- **Não paraleliza** (§8).
- **Não substitui a revisão humana final** — o objetivo declarado é justamente concentrá-la no
  fim da fila, não eliminá-la.
- **Não insiste.** Toda ambiguidade do próprio orquestrador resolve-se em `PARAR`.

---

## 12. Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Cascata silenciosa: task N errada contamina N+1 | Veredito por task, `PARAR` fecha a fila por padrão; branch descartável |
| Analisador de verdito "otimista" e vira carimbo de SEGUIR | Contrato JSON fechado + regra "na dúvida, PARAR" + o parecer é do opus, não do implementador |
| Correção em loop consumindo tokens | Teto rígido de 3 rodadas |
| `--resume` acumulando contexto na fase de implementação | É uma conversa de duas fases, curta por construção; medida no ledger desde a 1ª corrida |
| Análise passa na triagem mas o plano era ruim | Aceito e explícito: é o preço de não ter humano no meio. Mitigado pelo diff-guard (§6) e pela revisão em opus |
| Ledger/relatório virarem "fonte de verdade" | Marcados como efêmeros, fora do versionamento (`corridas/` no `.gitignore`) |

---

## 13. Decidido na revisão de 2026-08-04

1. **`--max-correcoes` = 3** (era 2 na proposta). `--max-turns` é outra coisa — trava por fase,
   §9 — e os tetos da tabela são ponto de partida, calibráveis pelo custo real do ledger.
2. **`--parar-na-primeira` fica como padrão** (§10).
3. **As Q vão direto para o `docs-dev/16`, status `Pendente`, por uma skill nova
   `/registrar-questao`** (§7). Não há diretório paralelo de Qs. O `docs-dev/10` continua
   exclusivo do humano, via `/registrar-decisao`.
4. **`relatorio.md` é pós-corrida**, não pré (§10); o pré é o `--ensaio`.

### Ainda em aberto (revisado após a implementação)

- Budget global padrão (`--budget-turnos`) — só dá para calibrar com o custo real da primeira
  corrida; sugestão de partida: rodar a primeira sem budget e medir.
- Portão opcional `--aprovar-planos`: imprimir as N análises no início da corrida e esperar um
  ok único antes de qualquer implementação. Mitiga o risco "plano ruim passou na triagem"
  (§12) ao custo de uma interrupção por corrida. **Não incluído** até você pedir.

---

## 14. O que a implementação acrescentou ao desenho

Escrito em `scripts/orquestrar-tasks.mjs` (Node ESM puro, sem dependências) mais três skills
novas. Decisões tomadas na implementação, todas no sentido de não gastar token à toa e não
destruir trabalho:

- **Ensaio é o padrão.** Gastar exige `--executar` (§10).
- **Preflight que recusa correr:** working tree sujo, branch `main`/`master`, ou `node_modules`
  ausente abortam antes de qualquer processo. Working tree sujo é recusa, não aviso — a corrida
  jamais mistura trabalho manual em curso com commits automáticos.
- **Trava de corrida** (`corridas/.trava`): duas corridas simultâneas brigariam pela porta 3100
  e invalidariam o fingerprint do `test:all:verificar` (§8).
- **Triagem antes da fase cara.** A análise (opus, barata) escreve um sinal JSON; o script lê e
  só então gasta a implementação (sonnet, cara). Task bloqueada, ambiguidade nova ou inferência
  de alto impacto param **antes** de implementar. O prompt manda: *"na dúvida entre true e
  false, escreva true"*.
- **Sinais em arquivo, não em prosa.** Cada fase escreve um JSON pequeno num caminho que o
  script indica; o roteamento lê o arquivo, nunca interpreta o texto da conversa. Sinal ausente
  ou malformado = `PARAR`.
- **Nenhuma skill existente foi tocada.** As instruções extras (escrever o sinal, não pedir
  aprovação) vão como sufixo do prompt que invoca a skill.
- **`--allowedTools` explícito.** O `settings.json` do projeto só libera leitura de git; sem
  liberar `git add`/`git commit` a fase travaria num prompt de permissão que ninguém
  responderia. Modo padrão `acceptEdits`; `bypassPermissions` é opt-in. Em qualquer modo o hook
  `protect-specs` continua valendo — `docs/specs/**` segue read-only.
- **Timeout que mata a árvore de processos**, já que a CLI não tem `--max-turns` (§9).
- **Diff-guard** comparando arquivos tocados contra os previstos na análise (§6).
- **Dependências lidas por oração, não por linha.** A seção "Dependências" do backlog é prosa:
  a mesma linha diz *"Independente das TASK-130/131"* e *"a TASK-133 depende desta"*. O parser
  descarta orações que negam ou invertem a relação e, onde o texto é ambíguo, conta como
  dependência — errar para mais só faz pular uma task que talvez pudesse rodar; errar para
  menos faz rodar sobre base quebrada.
- **Nada de reset automático.** Quando para, para e conta: o ledger guarda o SHA anterior a
  cada task para você desfazer manualmente se quiser.
- **`corridas/` no `.gitignore`** — registro efêmero, como o `ultimo-test-all.log`.

### Verificado até aqui

Sintaxe, `--ajuda`, ensaio real sobre a fila TASK-130..133 com as dependências corretas, e as
recusas: working tree sujo, `--max-correcoes` acima do teto, task inexistente, intervalo
invertido, ausência de argumentos. `npm run lint` limpo.

**Não verificado:** nenhuma corrida real foi executada — o caminho de execução (`--executar`)
nunca rodou uma fase. A primeira corrida de verdade deve ser de **uma task só**
(`--tasks TASK-130`), com budget curto, e acompanhada.
