---
name: revisar-aderencia
description: Revisa, em uma nova conversa após a implementação, uma TASK do ROTA contra as specs e regras RN — percorre o checklist docs-dev/07 item a item e preenche o template de revisão docs-dev/14, com parecer aprovado / com ressalvas / reprovado. Use após toda implementação, antes do merge; nunca continue a conversa que implementou a task.
---

# Revisar Aderência à Spec

Revise a implementação da task indicada (diff da branch/commit atual, salvo indicação contrária do usuário).

## Fronteira de conversa

Execute esta skill em **uma conversa nova**, separada daquela que implementou a TASK. A
revisão deve reconstruir suas conclusões a partir dos artefatos persistidos — task, specs,
código, testes, diff e resultados executados — e não das justificativas ou da memória da
implementação. Se a implementação acabou de ser feita nesta mesma conversa, pare, não
revise e oriente o usuário a iniciar outra conversa com `/revisar-aderencia TASK-XXX`.

## Leitura obrigatória

1. A task (objetivo, "Fora de escopo", critérios de aceite).
2. As specs referenciadas pela task, em `docs/specs/`.
3. As RN citadas em `docs-dev/01-RULE_INDEX.md`.
4. `docs-dev/07-CHECKLIST_ADERENCIA_SPEC.md` — o checklist a percorrer.
5. `docs-dev/14-REVIEW_REPORT_TEMPLATE.md` — o formato do parecer e os critérios de resultado.

## O que verificar

- Aderência às specs e às RN (cite `RN-xxx` em cada achado);
- Violações de escopo: código além do "Objetivo" ou dentro do "Fora de escopo";
- Workflow indevido ou campo de fluxo no JSON (NEG-001..007 de `docs-dev/11-NEGATIVE_REQUIREMENTS.md`);
- Preservação do contrato JSON e da regra de UUID (RN-004..007);
- Testes: existem, cobrem casos inválidos, não dependem do OSRM real (mock);
- Lacunas: regra da task sem teste; critério de aceite não verificado (matriz `docs-dev/03-TRACEABILITY_MATRIX.md`);
- **Consequências sobre outras tasks:** a revisão foca na task atual, mas é obrigatório apontar o que a task atual afeta ou depende em outras (o contrato JSON e as fronteiras entre módulos ligam tasks). Falar de outras tasks é esperado — o que muda é o rigor da afirmação (regra abaixo).

## Evidência canônica da suíte

1. Antes de executar a suíte pesada, rode `npm run test:all:verificar`.
2. Se `ultimo-test-all.log` estiver aprovado e o fingerprint coincidir, **não repita** a suíte: registre no parecer o executor e o fingerprint informados pelo verificador.
3. Se o log estiver ausente, truncado, vermelho ou desatualizado, rode **uma única vez** `npm run test:all:log -- --executor=Codex-revisao`, sequencialmente e sem outro build/E2E em paralelo; depois exija que `npm run test:all:verificar` fique verde.
4. Falha real é reportada como falha. Não reutilize log inválido, não converta vermelho em ressalva e não versione `ultimo-test-all.log`.

## Regra de afirmação sobre outras tasks (anti-alucinação)

Toda afirmação sobre o que **outra** task faz ou não faz — que arquivo emite tal alerta, que função já cobre tal caso, que a etapa X já exibe tal mensagem — só entra no parecer como fato se o arquivo real dessa task foi **aberto e lido nesta revisão** e citado com `caminho/arquivo.ts:linha`.

- Proibido afirmar comportamento de outra task por **inferência** (do nome da task, da RN, do que "deveria" fazer) ou por **memória** de conversas/pareceres anteriores. Pareceres antigos são snapshots datados, não fonte de verdade sobre o código de hoje.
- Não deu para abrir e conferir o arquivo? Escreva **"não verificado nesta revisão"** em vez de afirmar. Uma pendência aberta e honesta vale mais que um fato inventado.
- Referência solta a outra task, sem afirmar comportamento, é sempre permitida como ponteiro (ex.: "contadores ficam para a TASK-031").

## Entrega

1. Percorra `docs-dev/07-CHECKLIST_ADERENCIA_SPEC.md` **item a item** (marque `N/A` quando não se aplicar; qualquer item aplicável não atendido → ressalva ou reprovação).
2. Preencha o `docs-dev/14-REVIEW_REPORT_TEMPLATE.md` completo e **salve-o** em `docs-dev/14-REVISOES/TASK-XXX-<AAAAMMDD>.md` (o template manda arquivar o parecer junto da task). O parecer é sempre um arquivo, nunca só texto na conversa.
3. Parecer objetivo pelos critérios do template: **aprovado** (escopo exato, RN com testes, checklist limpo), **aprovado com ressalvas** (desvios menores, sem violar RN Alta nem NEG-xxx; ressalvas viram condições explícitas) ou **reprovado** (violação de RN Alta, NEG-xxx, escopo relevante, testes ausentes ou verificações falhando) — com a lista de problemas ordenada por severidade.
4. Atualize `docs-dev/19-STATUS_EXECUCAO.md` no mesmo movimento da revisão:
   - se o ciclo foi concluído, mova a task da lista de pendentes para a de executadas e atualize totais, ordem e achados de sequenciamento afetados;
   - se o parecer reprovar a entrega ou mantiver condição impeditiva, registre o estado real sem marcar a task como concluída;
   - se a task absorver, substituir ou desbloquear outra, reflita isso explicitamente no status para evitar execução duplicada ou salto silencioso.

## Commit

Comite o parecer salvo e a atualização de `docs-dev/19-STATUS_EXECUCAO.md` com a mensagem `Registra revisão de aderência da TASK-XXX: <parecer>` (segundo commit da convenção de dois commits por task — `docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md`). Este commit nunca é vazio: ele contém o arquivo do parecer e, quando o status realmente mudar, o status atualizado.

Só depois de revisão aprovada avança-se para a próxima task (`docs-dev/00` §3).
