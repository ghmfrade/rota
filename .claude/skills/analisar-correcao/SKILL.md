---
name: analisar-correcao
description: Planeja a correção das ressalvas de um parecer de /revisar-aderencia, sem sair do que o parecer apontou. Entrega um plano curto e fechado, para ser aplicado em seguida na mesma conversa. Use dentro do orquestrador (docs-dev/20-ORQUESTRACAO) ou manualmente após uma revisão com ressalvas.
---

# Analisar Correção

Você vai planejar a correção dos problemas que **um parecer já apontou**. Não implemente nada
nesta fase: o plano é aplicado no turno seguinte, na mesma conversa.

## Leitura obrigatória

1. O **parecer** indicado no prompt (`docs-dev/14-REVISOES/TASK-XXX-AAAAMMDD.md`), inteiro.
2. A **task** original — em especial o "Objetivo" e o **"Fora de escopo"**.
3. As specs e RN **citadas pelo parecer** (só essas).
4. Os arquivos que o parecer aponta como defeituosos, lidos de verdade.

## O escopo é o parecer, não a task

Esta é a regra que faz a diferença entre corrigir e estragar:

- Corrija **apenas** o que o parecer listou como problema ou ressalva. Item por item.
- O "Fora de escopo" da task continua **vinculante** — o parecer não o revoga.
- Não refatore de passagem, não renomeie, não "aproveite para melhorar", não mexa em teste que
  o parecer não citou.
- Achou outro defeito, fora do parecer? **Anote como follow-up** no plano e deixe para outra
  task. Não corrija agora.

## Se o parecer exigir decidir regra de negócio — pare

Se corrigir um item implicar escolher entre leituras da spec, inventar comportamento, ou mudar
o contrato JSON: **não corrija**. Rode `/registrar-questao` para abrir a Q-xxx como Pendente e
declare a task parada. O `docs-dev/04` é explícito: ambiguidade nova **interrompe** a task.

Idem se a correção exigir alterar `docs/specs/**`: aponte e pare.

## Entrega

Um plano curto, nesta forma:

1. **Itens a corrigir** — um por linha, cada um citando o trecho do parecer que o originou
   (`parecer.md:linha`) e a RN envolvida.
2. **Arquivos a tocar** — caminho a caminho, com o que muda em cada um. Se a lista crescer
   muito além do que o parecer sugere, isso é sinal de que você saiu do escopo: reveja.
3. **Testes** — quais criar ou ajustar, com os casos inválidos. Toda correção de RN precisa de
   teste que falharia antes dela; OSRM sempre mockado.
4. **O que fica de fora** — itens do parecer que você **não** vai corrigir e por quê
   (follow-up, fora de escopo, exige decisão humana).
5. **Riscos** — o que essa correção pode quebrar noutro lugar.

Se a conclusão for "não dá para corrigir sem decisão humana", entregue isso como resposta
única, com o motivo, e não proponha plano.
