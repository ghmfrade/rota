# ROTA — instruções para o Codex

Este repositório usa desenvolvimento guiado por especificações. O arquivo
`CLAUDE.md` continua sendo a fonte canônica das instruções operacionais
compartilhadas entre agentes. Antes de analisar, planejar, implementar ou revisar
qualquer task, leia `CLAUDE.md` integralmente e trate todas as regras dele como
vinculantes também para o Codex.

## Regras invariáveis

- `docs/specs/**` é somente leitura para quem implementa. Nunca crie, altere,
  mova, renomeie ou remova arquivos nessa árvore. Registre propostas como Q-xxx
  em `docs-dev/16-OPEN_QUESTIONS.md`.
- A hierarquia de verdade é: specs originais > `docs-dev/01-RULE_INDEX.md` >
  demais derivados > task > código.
- Não invente regras de negócio. Lacunas e conflitos exigem Q-xxx e decisão
  humana; não os resolva por suposição.
- Trabalhe em uma task por vez e respeite literalmente o campo "Fora de escopo".
- O modo padrão é supervisionado: use a skill `analisar-task`, apresente o plano
  e aguarde aprovação humana antes de usar `implementar-task`.
- Depois de implementar, encerre a conversa. Em uma nova conversa, use
  `revisar-aderencia` antes de avançar para outra task; nunca implemente e revise
  formalmente a mesma task na mesma conversa.
- Preserve o contrato JSON, as UUIDs importadas e todos os requisitos negativos
  documentados em `docs-dev/11-NEGATIVE_REQUIREMENTS.md`.
- Use português e a nomenclatura oficial das specs em código, comentários,
  documentação e mensagens.

## Skills do projeto

As skills específicas do ROTA estão em `.agents/skills/` e reutilizam as
definições canônicas mantidas em `.claude/skills/`:

- `analisar-task`
- `implementar-task`
- `investigar-conflito`
- `nova-task`
- `registrar-decisao`
- `revisar-aderencia`

Quando uma dessas skills for aplicável ou explicitamente solicitada, leia o seu
`SKILL.md` e o arquivo canônico referenciado por ele antes de executar ações.

## Verificações

Use os comandos definidos em `CLAUDE.md` e `package.json`. Nunca reporte uma
verificação como aprovada sem executá-la. Falhas devem ser apresentadas como
falhas, com a causa observada.
