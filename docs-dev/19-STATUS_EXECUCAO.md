# 19 — STATUS_EXECUCAO: o que já foi executado e o que falta

**Atualização mais recente:** 2026-07-30 (branch `redesign`) — **TASK-119
concluída e aprovada, sem ressalvas**. A implementação `233501e` entrega o
detector puro de partidas coincidentes, destaque somente dos reforços, alerta
agregado por Serviço com navegação para a primeira origem e toggle de seleção
da DEC-096, incluindo as grades excepcionais exigidas pela DEC-097. O parecer
`14-REVISOES/TASK-119-20260730.md` reutiliza a suíte verde (1.353 unitários +
99 E2E; fingerprint `e63c991d…`; identidade `498d7fa6…`). A TASK-119 sai da
fila; restam **13 tasks não concluídas: 11 executáveis, a TASK-038 com bloqueio
parcial e a TASK-040 bloqueada**.

**Histórico anterior (2026-07-30):** **TASK-105 concluída e aprovada, sem
ressalvas**. A implementação `2a8da0c` entrega uma grade por Tabela excepcional,
criação com os discriminadores RN-099 e a semeadura dos dias comuns com
sobrescrita por UUIDs novas ou mescla por multiconjunto preservando as UUIDs
casadas. O parecer `14-REVISOES/TASK-105-20260730.md` reutiliza a suíte verde
(1.342 unitários + 97 E2E; fingerprint `ec337f4d…`; identidade `498d7fa6…`). A
TASK-105 sai da fila, satisfaz a dependência da TASK-112 e desbloqueia a
TASK-119 pela DEC-097; restam **14 tasks não concluídas: 12 executáveis, a
TASK-038 com bloqueio parcial e a TASK-040 bloqueada**.

**Histórico anterior (2026-07-30):** **TASK-104 concluída e aprovada, sem
ressalvas remanescentes**. A implementação `9adf7d9` entrega CRUD, filtro,
cardinalidade, descrição condicional, preservação de UUID e remoção sem
cascata; `a1d96b1` versiona Q-076/DEC-098, e `bd679d1` incorpora a política de
remoção à task, RN-098/RN-099 e matriz `03`. O parecer
`14-REVISOES/TASK-104-20260730.md` reutiliza a suíte verde (1.334 unitários +
96 E2E; fingerprint `2f4af731…`; identidade `498d7fa6…`). A TASK-104 sai da
fila e desbloqueia a TASK-105; restam **15 tasks não concluídas: 12
executáveis, a TASK-038 com bloqueio parcial e as TASK-040/TASK-119
bloqueadas**.

**Histórico anterior (2026-07-30):** **TASK-117 concluída e aprovada, sem
ressalvas remanescentes**. A implementação `feb82b2` atende às operações de dia
no cabeçalho e à recomposição do headway; o commit `bf98389` versiona
isoladamente TASK-117, Q-071/DEC-093 e a variante `alternador`, encerrando a
condição documental do parecer anterior. A reavaliação final
`14-REVISOES/TASK-117-20260730-reavaliacao.md` reutiliza a suíte canônica verde
(1.326 unitários + 93 E2E; fingerprint `de9a38e3…`; identidade `498d7fa6…`).
A TASK-117 sai da fila; restam **16 tasks não concluídas: 14 executáveis, a
TASK-038 com bloqueio parcial e a TASK-040 bloqueada**.

**Histórico anterior (2026-07-30):** **TASK-118 concluída e aprovada, sem
ressalvas remanescentes**. A implementação `7ac010f` torna a geração por
headway idempotente no mesmo dia e grade; a regularização documental `2a72bd1`
versiona TASK-118, Q-072 e DEC-094 e corrige o estado da task para
desbloqueada. A confirmação independente
`14-REVISOES/TASK-118-20260730-confirmacao.md` ratifica o parecer final e
reutiliza a suíte canônica verde (1.326 unitários + 93 E2E; fingerprint
`de9a38e3…`; identidade `498d7fa6…`). A TASK-118 sai da fila; restam **17 tasks
não concluídas: 15 executáveis, a TASK-038 com bloqueio parcial e a TASK-040
bloqueada**.

**Histórico anterior (2026-07-30):** **TASK-117 reavaliada e aprovada com
ressalva impeditiva de merge**. O commit `feb82b2`
fecha as duas condições técnicas do parecer anterior: restaura
`dialogo-opcoes-apagar` e acrescenta as regressões E2E da grade de feriados,
cores e geometria do headway. O parecer
`14-REVISOES/TASK-117-20260730.md` confirmou código aderente e suíte canônica
verde (1.326 unitários + 93 E2E; fingerprint `de9a38e3…`; identidade
`498d7fa6…`). A condição restante é documental: TASK-117, Q-071/DEC-093 e a
documentação da variante `alternador` ainda existem somente no working tree,
misturadas a artefatos de outras tasks. A TASK-117 permanece na fila até esses
documentos serem versionados isoladamente e reavaliados; restam **18 tasks não
concluídas: 16 executáveis, a TASK-038 com bloqueio parcial e a TASK-040
bloqueada**.

**Histórico anterior (2026-07-30):** **TASK-118 implementada e aprovada com
ressalva impeditiva de merge**. O commit `7ac010f`
torna a geração por headway idempotente no mesmo dia e grade, preserva as
Viagens preexistentes e cria somente os horários ausentes; o parecer
`14-REVISOES/TASK-118-20260730.md` confirmou aderência integral do código e a
suíte canônica verde (1.326 unitários + 93 E2E; fingerprint `1ca8809d…`;
identidade `498d7fa6…`). A condição é documental: TASK-118, Q-072 e DEC-094
ainda existem somente no working tree, e o cabeçalho da task continua
obsoletamente como “bloqueada (Q-072)”. A TASK-118 entra na fila e não é marcada
como concluída até esses artefatos serem versionados/corrigidos e reavaliados;
restam **18 tasks não concluídas: 16 executáveis, a TASK-038 com bloqueio parcial
e a TASK-040 bloqueada**.

**Histórico anterior (2026-07-29):** **TASK-117 implementada e aprovada com
ressalvas impeditivas de merge**. O parecer
`14-REVISOES/TASK-117-20260729.md` confirmou os motores de cópia/remoção/headway,
a máscara temporal e a suíte canônica verde (1.323 unitários + 92 E2E;
fingerprint `781394e9…`; identidade `498d7fa6…`), mas registrou duas condições:
restaurar o seletor estável `dialogo-opcoes-apagar`, removido contra a DEC-050 e
o critério explícito da task, e acrescentar as regressões E2E de operações no
cabeçalho da grade de feriados e da composição visual do headway. A TASK-117
entra na fila e não é marcada como concluída; restam **16 tasks não concluídas:
14 executáveis, a TASK-038 com bloqueio parcial e a TASK-040 bloqueada**.

**Histórico anterior (2026-07-29):** **TASK-110
concluída e aprovada na reavaliação**. A implementação `8cc8908`, corrigida em
`d594034`, preserva todos os reforços da origem durante a cópia de dia, mantém
a guarda contra horários preexistentes no destino e contém/estabiliza o foco
no componente `Dialogo`. O parecer
`14-REVISOES/TASK-110-20260729.md` registra a reavaliação aprovada e reutiliza
a evidência canônica verde (1.317 unitários + 92 E2E; fingerprint
`6006de40…`; identidade `498d7fa6…`). A TASK-110 sai da fila; restam **15
tasks não concluídas: 13 executáveis, a TASK-038 com bloqueio parcial e a
TASK-040 bloqueada**.

**Histórico anterior (2026-07-28):** a TASK-110 havia sido implementada em
`8cc8908` e reprovada no parecer `14-REVISOES/TASK-110-20260728.md`: a cópia
em lote colapsava reforços válidos da origem e o novo modal não continha nem
estabilizava o foco. Antes nesta data, a **TASK-109
implementada e aprovada com ressalvas**. A implementação `1174657` substituiu
o seletor/botão antigo pelo arrasto até qualquer dia e por
`Ctrl+←`/`Ctrl+→` sem wrap, reutilizando a guarda por horário e criando UUID
nova. O parecer `14-REVISOES/TASK-109-20260728.md` confirmou código e suíte
canônica verdes (1.306 unitários + 89 E2E; fingerprint `d934b59a…`;
identidade `498d7fa6…`), mas registrou uma **condição de merge**: falta o E2E
explícito de soltar fora de qualquer coluna e provar o cancelamento. Por isso a
TASK-109 permanece na fila e a contagem continua em **16 tasks não concluídas:
14 executáveis, a TASK-038 com bloqueio parcial e a TASK-040 bloqueada**.
Antes nesta data, a **TASK-108
concluída e aprovada**. A implementação `33fc68b` adicionou a geração em lote
por headway até horário-limite inclusivo, preservando dia, grade e offsets e
criando UUID nova para cada Viagem; parecer em
`14-REVISOES/TASK-108-20260728.md`, com evidência canônica verde (1.302
unitários + 87 E2E; fingerprint `1453c200…`; identidade `498d7fa6…`). A fila
atual tem **16 tasks não concluídas: 14 executáveis, a TASK-038 com bloqueio
parcial e a TASK-040 bloqueada**. A TASK-109 passa a abrir a ordem recomendada
do Grupo H. Antes nesta data, a **TASK-116
concluída e aprovada na reavaliação**. A implementação `92414d2` separou o
rascunho local da confirmação por `Enter`/`Tab`; a correção `213626d`
normalizou também a confirmação de um valor equivalente e acrescentou as
regressões de `Enter`/`Tab` e do parcial inválido `10:3`. Parecer final em
`14-REVISOES/TASK-116-20260728.md`, com evidência canônica verde (1.294
unitários + 86 E2E; fingerprint `886d8c53…`; identidade `498d7fa6…`). A fila
atual tem **17 tasks não concluídas: 15 executáveis, a TASK-038 com bloqueio
parcial e a TASK-040 bloqueada**. Antes nesta data, a **TASK-116 havia sido
reprovada** porque o caminho equivalente mantinha `0800` em vez de `08:00`.
Antes nesta data, a **TASK-115 foi
concluída e aprovada**. A implementação `61bf31d` reencontra a célula pela
grade, UUID da Viagem, Seção e dia após criação/reordenação ou redistribuição,
mantém o cursor no fim do horário confirmado e preserva Enter/Tab; parecer
aprovado em `14-REVISOES/TASK-115-20260728.md`, com evidência canônica verde
(1.289 unitários + 82 E2E). A grade excepcional ainda não é renderizada; o E2E
previsto da TASK-105 deve confirmar nela a herança desse comportamento. A fila
anterior tinha **17 tasks não concluídas: 15 executáveis, a TASK-038 com
bloqueio parcial e a TASK-040 bloqueada**. Antes nesta data, a **TASK-114 foi
concluída e aprovada**: a implementação `13e583b` mantém “Restaurar sugestão” e
“Apagar viagem” inteiramente visíveis e clicáveis em domingo, sem alterar a posição
usada de segunda a sábado nem o `overflow-x-auto` de `Tabela`; parecer em
`14-REVISOES/TASK-114-20260728.md`. Também nesta data, a
**Q-070/DEC-092** reescreveu a TASK-109: a cópia unitária entre dias deixa de
usar setas visíveis e passa a usar arrasto até qualquer dia, com
`Ctrl+←`/`Ctrl+→` para dias adjacentes; a Spec 04 §8.3 já está alinhada.

**Histórico anterior (2026-07-27):** **TASK-113
concluída e aprovada na reavaliação final**. A implementação `ccc2572` mantém
dois últimos deslocamentos válidos independentes no estado local da instância
de `EtapaViagens`; a correção `1c70bb3` seleciona novamente o sentido após a
troca de Serviço e localiza a ação posterior na última Seção, eliminando o
defeito do E2E que motivou a reprovação inicial. O parecer final
`14-REVISOES/TASK-113-20260727-final.md` aprova a entrega sem pendências, com
evidência canônica verde reutilizada (1.282 unitários + 80 E2E; fingerprint
`9ab972fc…`; identidade `498d7fa6…`). TASK-113, Q-069 e DEC-091 são
versionadas no fechamento do ciclo. A TASK-113 sai do Grupo H; pendentes:
16 → 15. Antes nesta data — **TASK-113 foi reprovada na primeira revisão** em
`14-REVISOES/TASK-113-20260727.md`, porque o E2E trocava para o Serviço
`0001-2SU` sem selecionar novamente o sentido; o código de produção já estava
aderente à DEC-091. Antes nesta data — **TASK-107
concluída e aprovada na reavaliação final**. A implementação `8143f6b` e as
correções `d23b30e`/`61b6d0a` entregam o motor de inserção relativa, controles
±X legíveis, ação posterior após a última Seção, X no topo à direita e hover
separado do foco de teclado. O responsável confirmou que o restaurar deve
ficar **abaixo do X**; a orientação, dada durante a implementação mas não
persistida, foi registrada como **Q-068/DEC-090** e prevalece sobre esse
detalhe da imagem-modelo. O parecer
`14-REVISOES/TASK-107-20260727.md` está aprovado, com evidência canônica verde
(1.282 unitários + 79 E2E; fingerprint `f30dd3a1…`; identidade
`498d7fa6…`). A TASK-107 sai do Grupo H; pendentes: 16 → 15. A ação antiga
“Copiar” permanece atribuída à TASK-109 pela **DEC-089**, sem condição
remanescente para a 107. Antes nesta data — **TASK-106
concluída e aprovada**. A correção `75f2afa` fechou seleção contínua, Enter
entre Viagens, Tab em células criáveis e retirou “Apagar bloco” conforme a
**Q-066/DEC-088**. O commit `5e03efa` documentou as variantes públicas
`densidade="padrao"|"compacta"` de `Campo`/`Select`, resolvendo a única
ressalva da reavaliação anterior. O parecer final
`14-REVISOES/TASK-106-20260727-final.md` aprovou a entrega sem pendências, com
evidência canônica verde (fingerprint `8016e953…`; identidade `498d7fa6…`).
A TASK-106 sai do Grupo H e libera formalmente as TASK-107..111. Pendentes:
17 → 16. Antes nesta
data — **TASK-103 concluída e aprovada**. A implementação `99a64c5` restringe a semana padrão às
Viagens comuns (`viagem_feriado = false` e `tabela_excepcional_uuid = null`) e
centraliza o rótulo “sem feriados nem operação excepcional”; fórmula, invariância
total/por faixa e exibição têm testes. Parecer aprovado em
`14-REVISOES/TASK-103-20260727.md`; suíte canônica verde (1.255 unitários + 73
E2E; fingerprint `23722e05…`; identidade `498d7fa6…`). O Grupo G passa de 3
para 2 pendentes, sem alterar a ordem `104 → 105`. Pendentes: 18 → 17. Antes
nesta data — **TASK-102 concluída e aprovada**. A implementação `8057b2f` elevou
o contrato executável para `"1.1"` com `servico.tabelas_excepcionais[]`,
`viagem.tabela_excepcional_uuid`, defaults compatíveis com documentos `"1.0"`,
validações de RN-098/RN-099 e round-trip de UUID. Parecer aprovado em
`14-REVISOES/TASK-102-20260727.md`; suíte canônica verde (1.251 unitários + 73
E2E; fingerprint `a71219d2…`; identidade `498d7fa6…`). A fundação desbloqueou
TASK-103/104; TASK-105 continua dependendo também da TASK-104. Pendentes:
19 → 18. Antes nesta data — **redesign da
grade de horários (proposta do responsável)**: criadas **TASK-106..112** (Grupo H
da §5) e **Q-060..Q-065** (`docs-dev/16`). A TASK-106 (fundação visual/interativa
da grade) é **spec-backed** (Spec 04 §8.1/§8.2/§8.3 + design system DEC-050) e roda
**desbloqueada**; as TASK-107..112 introduzem gestos **não descritos nas specs**
(inserção por offset, cópia por headway, cópia p/ dia adjacente + dedup, operações
de dia inteiro, modo compacto, origem estendida da cópia). Na **mesma data o
responsável decidiu** as Q-060..065 (via `/registrar-decisao`): **DEC-082..087**.
Com isso, **TASK-107..111 ficaram desbloqueadas** (DEC-082..086). A DEC-087 (mescla =
sincronização preservando UUID, **exceção à RN-007**) exigia alteração de spec: a
**Spec 04 §8.4/§8.5 foi atualizada** pelo responsável (semeadura com origem
selecionável; "mesclar" = sincronização preservando UUID; "sobrescrever" = UUIDs
novas) e a **carve-out da RN-007 foi registrada** no `01-RULE_INDEX.md` e
`03-TRACEABILITY_MATRIX.md` — com isso a **TASK-112 também ficou desbloqueada** e a
parte "mesclar" da **TASK-105** deixou de estar condicionada. O casamento sob
duplicatas (RN-062) ficou resolvido na própria spec (§8.5, "por contagem"), sem Q
nova. Também foi fixado que os botões de ação da Viagem surgem **no hover** (não na
seleção) — dobrado na TASK-106. **Todo o Grupo H (106..112) está desbloqueado.**
Pendentes: 12 → 19. Antes nesta data — **operação
excepcional (DEC-081/Q-059)**: criadas **TASK-102..105** (Grupo G da §5),
Specs 02/03/04/05 atualizadas para o contrato v1.1, RN-098/099 criadas e
RN-061/062/068/069 ajustadas; as pendentes de PDF/Comparador (033/034/036/037/039)
foram **anotadas** (escopo ampliado, sem task nova — ver §6.6). Pendentes: 8 → 12.
Antes nesta data — a **TASK-101 foi concluída**. A implementação `4051430` reconcilia `secao.servicos[]` ao
duplicar um Serviço; após o parecer inicial com ressalvas
(`14-REVISOES/TASK-101-20260727.md`), o commit `79a2ed3` acrescentou o
round-trip exportação→importação, a prova E2E de zero chamadas ao OSRM e o caso
inválido parcial. A reavaliação
`14-REVISOES/TASK-101-20260727-reavaliacao.md` aprovou a entrega sem pendências.
A suíte canônica está verde (1225 unitários + 73 E2E; fingerprint
`2669b2eb…`; identidade `498d7fa6…`). A TASK-101 saiu do Grupo A-ter: o total
de pendentes passa de 9 para 8.

**Para que serve:** dar uma visão única e verificável do **estado de execução** de todas as tasks do `06-BACKLOG_INICIAL.md`, com a **ordem recomendada** do que ainda falta e uma estimativa de **complexidade**. Existe porque o backlog descreve *o conteúdo* de cada task, mas não registra *o que já rodou* — e essa lacuna já deixou pelo menos uma task ser pulada silenciosamente (ver §6).

**O que este documento NÃO é:** não é fonte de verdade sobre o conteúdo, escopo ou regras de nenhuma task — isso continua sendo o `06-BACKLOG_INICIAL.md` (e, acima dele, as specs e o `01-RULE_INDEX.md`, conforme a hierarquia do `00-README-SPEC-DRIVEN.md`). Aqui só se registra **status e sequenciamento**. Em caso de divergência sobre escopo, o backlog vence.


---

## 1. Como manter (evitar que uma task seja pulada de novo)

Este documento só cumpre a função se for atualizado no mesmo movimento do ciclo da task:

1. Ao **concluir** uma task (implementação + `/revisar-aderencia` registrada em `14-REVISOES/`), mova-a da §5 para a §3.
2. Ao **criar** uma task nova (`/nova-task`), acrescente-a na §5, na posição da ordem recomendada, com a complexidade estimada — e **confira se ela não se sobrepõe a uma task pendente** (foi exatamente o que faltou entre a TASK-046 e a TASK-087; ver §6).
3. Ao **pular deliberadamente** uma task da ordem recomendada, registre o motivo na §6. Pular sem registrar é o defeito que este documento existe para impedir.

**Método de verificação do status** (reproduzível): uma task conta como executada quando existe commit `Implementa TASK-xxx` no histórico **e/ou** arquivo de parecer em `docs-dev/14-REVISOES/TASK-xxx-*.md`. Comandos usados no levantamento:

```bash
git log --all --oneline | grep -oiE "Implementa TASK-[0-9]{3}" | sort -u
ls docs-dev/14-REVISOES/
```

## 2. Legenda de complexidade

Escala de **1 a 5**, combinando esforço e risco de regressão — não só volume de código. Aplica-se **somente às tasks pendentes** (§5); as já executadas não recebem nota.

| Nota | Significado |
|:---:|---|
| **1** | Trivial: poucos pontos de código, sem lógica de domínio nova. |
| **2** | Pequena: escopo fechado, primitivas já existem, testes diretos. |
| **3** | Média: lógica nova ou vários pontos de código; risco moderado de regressão. |
| **4** | Grande: regra de domínio com múltiplos casos, ou superfície ampla de UI. |
| **5** | Refactor grande na superfície mais ativa do app; alto risco de regressão. |

---

## 3. Tasks executadas

99 tasks concluídas. Agrupadas pela fase do backlog.

### Fases 1–3 — Fundação, contrato JSON e validações de domínio

| Task | Título resumido |
|---|---|
| 001 | Bootstrap do projeto Next.js |
| 002 | Recursos estáticos: listas e base de municípios |
| 003 | Schema base do JSON de operação |
| 102 | Contrato v1.1: TabelasExcepcionais + referência excepcional na Viagem (RN-098/RN-099) |
| 004 | Validador XOR de Parada e extremos-Seção — ⚠️ ver §4 |
| 005 | Factory de entidades com UUID |
| 006 | Importação de JSON com preservação de UUID |
| 007 | Exportação de JSON (proposta / vigente) |
| 008 | Módulo de tipificação tipo × característica |
| 009 | Primitivas geoespaciais: Haversine e centroide |
| 010 | Regra dos 350 m (incremental e pareada) |
| 011 | Derivação de município por ponto-em-polígono |
| 012 | Checagens estáticas consolidadas de leitor |

### Fase 4 — Formulário

| Task | Título resumido |
|---|---|
| 013 | Tela inicial: carregar JSON × criar do zero |
| 014 | Layout por etapas + painel de pendências |
| 015 | Etapa Identificação |
| 016 | Etapa Serviços (CRUD + duplicar) |
| 101 | Duplicar Serviço reconcilia as contribuições das Seções compartilhadas |
| 017 | Editor de Seções no mapa |
| 018 | Editor de Locais no mapa |
| 019 | Montagem do itinerário (paradas + tabela lateral) |

### Fases 5–6 — Mapa, roteamento, distâncias e seccionamento

| Task | Título resumido |
|---|---|
| 020 | Mapa base MapLibre/OSM |
| 021 | Cliente OSRM |
| 022 | Tratamento de falha do OSRM (bloqueante) |
| 023 | Pontos de rota (forçar traçado) |
| 024 | Recalcular × abrir congelado |
| 025 | Descrição textual do itinerário |
| 026 | Cálculo da matriz de distâncias |
| 027 | Editor da matriz de seccionamento |
| 048 | Display read-only da matriz de distâncias |

### Fase 7 — Viagens, horários e revisão final

| Task | Título resumido |
|---|---|
| 028 | Grade de horários (dias comuns) |
| 029 | Edição de horário passante (âncoras + redistribuição) |
| 030 | Tabela de feriados e cópias |
| 031 | Contagens e resumo operacional |
| 103 | Contagens excluem operação excepcional da semana padrão (RN-069/RN-099) |
| 104 | CRUD e filtro das Tabelas excepcionais por Serviço (RN-098/RN-099) |
| 105 | Grade de horários da Tabela excepcional + semeadura dos dias comuns (RN-007/RN-099) |
| 032 | Revisão e validação final |

### Fase 12 — Qualidade e follow-ups

| Task | Título resumido |
|---|---|
| 041 | Fixtures canônicas de JSON |
| 042 | Suíte de regressão de UUID e contrato |
| 043 | Consolidação do arredondamento half-up |
| 044 | Pendência bloqueante de itinerário sem rota válida |
| 045 | Fetch-espião ativo na garantia de abertura sem OSRM |
| 046 | Reconciliação de horários/offsets quando o itinerário muda |
| 047 | Feedback do motivo de o recálculo não ocorrer |

### Fase 13 — Redesign visual (DEC-050)

| Task | Título resumido |
|---|---|
| 049 | Fundação do design system: Tailwind 4 + tokens |
| 050 | Componentes base `shared/ui` + ícones-carimbo |
| 051 | Shell full-screen + sidebar de carimbos |
| 052 | Tela inicial redesenhada |
| 053 | Etapa Identificação com `shared/ui` |
| 054 | Etapa Serviços com `shared/ui` |
| 055 | Etapa Seções, Locais e Itinerários + editores |
| 056 | Etapas Viagens e Matrizes + varredura final |
| 057 | Contadores de viagens semanais por Serviço |
| 058 | Ressalvas pendentes das revisões do bloco |

### Correções da etapa de itinerários (mapa/rota) e follow-ups recentes

| Task | Título resumido |
|---|---|
| 059 | Desenhar a rota ativa no mapa |
| 060 | Unificar os dois mapas num único mapa + tabela lateral |
| 061 | Promover `ServicoEmConstrucao` no fluxo "novo" |
| 063 | Gesto de ponto de rota no mapa único |
| 066 | Re-ancorar pontos de rota quando as paradas mudam |
| 071 | Pontos de rota sobrevivem a um recálculo que falha |
| 072 | Unificar o CRUD da etapa Serviços no modo "novo" |
| 073 | Tela inicial: cartões inteiros clicáveis |
| 074 | Coluna lateral: reuso de Seção + rolagem própria |
| 080 | Promover `ServicoEmConstrucao` no modo "carregado" |
| 081 | Alerta "tabela de feriados vazia" na Revisão |
| 084 | Remover parada limpa `secao.servicos[]` + Seção órfã (RN-018) |
| 085 | Erros que bloqueiam a exportação ficam visíveis |
| 086 | Diagnóstico técnico de DEV para os erros do gate |
| 082 | Bloquear exportação com violação de 350 m ou tipificação |
| 083 | Descartar ponto de rota órfão na remoção de extremo (DEC-068) |
| 088 | Remover Seção reconcilia `matriz_seccionamento` com `matriz_distancias` (RN-059) |
| 065 | Inverter os gestos do mapa único: esquerdo = ponto de rota, direito = menu Seção/Local |
| 067 | Inserção posicional: clique direito sobre a linha insere a parada entre as paradas do trecho |
| 068 | Vocabulário visual + degradação do clique + erro contextual de Local em extremo |
| 069 | Affordance de hover sobre a linha + vértice fantasma projetado |
| 079 | Pontos de rota na lista lateral intercalados |
| 064 | Sincronização de seleção tabela↔mapa (com scroll-into-view) |
| 089 | E2E de recálculo afere ausência de bloqueante — absorvida pela TASK-068 |
| 090 | Executor canônico e controlado da suíte completa |
| 091 | Redesenho da tabela lateral unificada (colunas, zebra, densidade, "X") — desbloqueada pela DEC-073 |
| 092 | Setas de mover lado a lado + testes-guarda pendentes das revisões da 091/064 |
| 077 | Volta espelhada: montagem automática na ordem inversa da Ida + reuso ofertando só Seções de outros Serviços (DEC-063/DEC-071) |
| 093 | Espelho Ida↔Volta suprimido quando o movimento de Seção não altera a subsequência de Seções (DEC-074) |
| 094 | Local nasce unidirecional; o "X" da tabela remove a entidade Local inteira (DEC-075/DEC-076) |
| 095 | Formulário de nome de Seção/Local vira linha-formulário inline na tabela, na posição de inserção (DEC-077) |
| 096 | `servico.locais[]` gravado pelo caminho unificado da DEC-053 — Local deixa de sumir no modo "novo" após a promoção (RN-036) |
| 097 | Arrasto de marcador não é revertido pelo re-render do hover da linha (RN-052) |
| 098 | Clique direito sobre a linha entrega a coordenada projetada no traçado (DEC-078) |
| 078 | Realocação de Seção por botão: esquerdo move o cluster, direito move o ponto corrente (DEC-061/DEC-079) — reprovada em `b8d0301`, corrigida em `714028b` (`stopPropagation` no botão direito), aprovada na reavaliação |
| 100 | Botão "redefinir Seção": colapsa todas as contribuições no ponto do Serviço/sentido em edição (DEC-080) — aprovada com ressalvas (`14-REVISOES/TASK-100-20260724.md`); ressalva única (commitar os docs de fundamentação) **resolvida em `668124b`** (adendo no parecer) |
| 075 | Identificação (fluxo novo): pré-visualização do Autos trocável + confirmação explícita ("Confirmar Autos") antes de congelar `codigo`/`empresa` (DEC-064) — aprovada (`14-REVISOES/TASK-075-20260724.md`) |
| 106 | Redesign da grade de horários: layout tabular compacto, ordenação temporal, seleção contínua, ações no hover e navegação Tab/Enter — aprovada no parecer final `14-REVISOES/TASK-106-20260727-final.md` |
| 107 | Inserção de Viagem por offset relativo (±X min), com offsets herdados, UUID nova e composição visual da DEC-090 — aprovada em `14-REVISOES/TASK-107-20260727.md` |
| 108 | Cópia de Viagem por headway até horário-limite inclusivo — aprovada em `14-REVISOES/TASK-108-20260728.md` |
| 118 | Guarda idempotente na geração por headway, preservando horários preexistentes e criando somente os ausentes — aprovada sem ressalvas; confirmação independente em `14-REVISOES/TASK-118-20260730-confirmacao.md` |
| 113 | Últimos deslocamentos relativos independentes por direção e compartilhados na instância da etapa (DEC-091) — aprovada no parecer final `14-REVISOES/TASK-113-20260727-final.md` |
| 114 | Ações “Restaurar sugestão” e “Apagar viagem” visíveis e clicáveis em domingo — aprovada em `14-REVISOES/TASK-114-20260728.md` |
| 115 | Foco preservado após criação/reordenação da Viagem e redistribuição — aprovada em `14-REVISOES/TASK-115-20260728.md`; a TASK-105 deve exercer a herança na futura grade excepcional |
| 116 | Confirmação de horário somente por `Enter`/`Tab`, com rascunho local e normalização final — aprovada na reavaliação em `14-REVISOES/TASK-116-20260728.md`; a TASK-105 deve exercer a herança na futura grade excepcional |
| 110 | Operações de dia inteiro: copiar dia para vários destinos e apagar as Viagens de um dia — aprovada na reavaliação em `14-REVISOES/TASK-110-20260729.md` após a correção `d594034` preservar reforços e completar o foco modal |
| 117 | Operações de dia no cabeçalho e recomposição do headway — aprovada na reavaliação final em `14-REVISOES/TASK-117-20260730-reavaliacao.md` após `bf98389` versionar TASK-117, Q-071/DEC-093 e a variante `alternador` |
| 119 | Destaque e alerta de partidas coincidentes, com reforços laranja, navegação por Serviço/sentido/grade e toggle de seleção — aprovada em `14-REVISOES/TASK-119-20260730.md` |

---

## 4. Pendências de **registro** (código entregue, ciclo não fechado)

Nenhuma destas exige reimplementação — são lacunas de rastreabilidade.

- **TASK-004** — o único commit é `5d0ba4b WIP TASK-004 (interrompida no meio do ciclo): implementa RN-036`, e **não há parecer** em `14-REVISOES/`. Verificação do código, porém, mostra o conteúdo **entregue**: RN-033 (XOR) em `src/shared/contrato/esquema.ts`; RN-034/035/036 em `src/shared/contrato/validacoes-estruturais.ts`; testes em `testes/unitarios/contrato/paradas-itinerarios.test.ts`. **Ação sugerida:** rodar `/revisar-aderencia` na 004 para fechar o ciclo formalmente, ou registrar aqui que foi absorvida pelas tasks seguintes.
- **TASK-001..012, 041, 042** — implementadas antes de o processo de parecer existir (os pareceres começam em 2026-07-09, com TASK-008/013). Ausência de arquivo em `14-REVISOES/` é esperada e não indica pendência.

---

## 5. Tasks a executar — ordem recomendada

**Estado atual: 13 tasks não concluídas: 11 executáveis, a TASK-038 com bloqueio
parcial e a TASK-040 bloqueada.** Em 2026-07-30, a **TASK-119 saiu da fila**:
implementada em `233501e` e aprovada sem ressalvas em
`14-REVISOES/TASK-119-20260730.md`; a detecção, o destaque e a navegação cobrem
também as grades excepcionais, conforme DEC-097. Também em 2026-07-30, a
**TASK-105 saiu da fila**:
implementada em `2a8da0c` e aprovada sem ressalvas em
`14-REVISOES/TASK-105-20260730.md`; a TASK-112 tem sua dependência satisfeita e
a TASK-119 fica desbloqueada pela DEC-097. Também em 2026-07-30, a **TASK-104
saiu da fila**: implementada em `9adf7d9`, regularizada documentalmente em
`a1d96b1`/`bd679d1` e aprovada sem ressalvas remanescentes em
`14-REVISOES/TASK-104-20260730.md`; a TASK-105 fica desbloqueada. Também em
2026-07-30, a **TASK-117 saiu da fila**:
implementada em `feb82b2`, regularizada documentalmente em `bf98389` e aprovada
na reavaliação final
`14-REVISOES/TASK-117-20260730-reavaliacao.md`. Em 2026-07-29, a **TASK-110
saiu da fila**:
implementada em `8cc8908`, corrigida em `d594034` e aprovada na reavaliação
`14-REVISOES/TASK-110-20260729.md`; reforços da origem são preservados e o
`Dialogo` contém, estabiliza e restaura o foco. Em 2026-07-28, a **TASK-108
saiu da fila**:
implementada em `33fc68b` e aprovada em
`14-REVISOES/TASK-108-20260728.md`; a ordem do Grupo H passa a começar pela
TASK-109. Antes nesta data, a **TASK-116 saiu da fila**:
a implementação `92414d2`, corrigida em `213626d`, foi aprovada na reavaliação
`14-REVISOES/TASK-116-20260728.md`; o caminho equivalente volta a `HH:MM` e as
regressões cobrem `Enter`/`Tab` e o parcial `10:3`. Antes disso, a TASK-116
havia entrado na fila de correção após a primeira revisão reprovar `92414d2`
por violação da RN-067. Antes disso,
a **TASK-115 saiu da fila**:
implementada em `61bf31d` e aprovada em
`14-REVISOES/TASK-115-20260728.md`; o E2E futuro da TASK-105 deve confirmar a
herança do foco na grade excepcional ainda não renderizada. A TASK-114 foi
criada, implementada e aprovada entre
atualizações deste status; por isso entra diretamente nas executadas sem alterar
o total líquido. Em 2026-07-27, a TASK-107 saiu da lista
após as correções `d23b30e`/`61b6d0a` e a reavaliação final aprovada. A
posição deliberada do restaurar abaixo do X foi persistida na
**Q-068/DEC-090**, eliminando a divergência aparente com a imagem-modelo. A
ação antiga “Copiar” deve sair na TASK-109 conforme a DEC-089, sem pendência
para a 107. Antes disso, a TASK-106 saiu da lista:
implementada em `c2db60a`, corrigida em `75f2afa` e **aprovada** no parecer
final `14-REVISOES/TASK-106-20260727-final.md`, após `5e03efa` documentar a
prop pública `densidade` de `Campo`/`Select` no design system. As três falhas
funcionais estão fechadas e “Apagar bloco” foi retirado conforme
Q-066/**DEC-088**; as TASK-107..111 estão liberadas. Antes disso, a TASK-103 saiu da lista:
implementada em `99a64c5` e aprovada em
`14-REVISOES/TASK-103-20260727.md`; o Grupo G passa de 3 para 2 pendentes, sem
alterar a ordem `104 → 105`. Antes disso, a TASK-102 saiu da lista:
implementada em `8057b2f` e aprovada em
`14-REVISOES/TASK-102-20260727.md`; o Grupo G passa de 4 para 3 pendentes e a
fundação de contrato de 103/104 fica cumprida. Antes disso, após a TASK-101 sair da
lista (reavaliação aprovada em `14-REVISOES/TASK-101-20260727-reavaliacao.md`,
8 pendentes), foram **criadas 4 tasks** da operação excepcional (DEC-081/Q-059):
**TASK-102..105** (Grupo G abaixo), levando o total a **12**; em seguida, o
**redesign da grade de horários** adicionou **TASK-106..112** (Grupo H,
Q-060..065), levando a **19**. As Q-060..065 foram **decididas no mesmo dia**
(DEC-082..087) e a Spec 04 §8.4/§8.5 exigida pela DEC-087 foi aplicada: as **7 tasks
do Grupo H (106..112) estão desbloqueadas**. O texto cronológico abaixo preserva os
totais históricos de cada revisão anterior.

> **Atualização desta revisão:** a **TASK-091 foi concluída** — a Q-052 foi decidida (**DEC-073**), implementação `f1eca46`, parecer **aprovado com ressalvas** em `14-REVISOES/TASK-091-20260722.md` (condição: commitar o registro da DEC-073; follow-ups: teste-guarda das quatro colunas/vocabulário e teste de desseleção sobre Local extremo herdado da 064 — este último **segue aberto**, não foi absorvido pela 091). Antes: a **TASK-064 foi concluída** — implementação `d6a5fcf` + fixes `50f840b`/`7a3084f`, parecer **aprovado com ressalvas** em `14-REVISOES/TASK-064-20260722.md`. Nenhuma das duas faz parte da lista abaixo.

9 tasks pendentes (**atualização desta revisão, 2026-07-24**: a **TASK-075 saiu da lista** — implementada em `cf13b46` e **aprovada** em `14-REVISOES/TASK-075-20260724.md` (pré-visualização do Autos + "Confirmar Autos" antes de congelar, DEC-064); Grupo D perde a task de encaixe livre, sem mudança de restrição para as demais. Antes nesta data: a **TASK-100 saiu da lista** — implementada em `288dec9` e **aprovada com ressalvas** em `14-REVISOES/TASK-100-20260724.md` (condição de merge: commitar os docs de fundamentação DEC-080/Q-058/TASK-100, hoje soltos no working tree); reusa o motor de translação da TASK-078 com destino fixo, suíte canônica verde. Antes nesta data: a **TASK-078 saiu da lista** — reprovada em `b8d0301` e corrigida em `714028b` (`stopPropagation()` no botão direito), **aprovada** na reavaliação `14-REVISOES/TASK-078-20260724-reavaliacao.md`; com ela entregue, a **TASK-100** passa à posição 1 do Grupo C, com sua dependência dura cumprida. Antes nesta data: as **TASK-070 e TASK-076 saíram da lista por cancelamento** — decisão do responsável, ver cabeçalho; o **Grupo B fica encerrado** sem nenhuma task pendente restante; **entrou na lista** a **TASK-100**, nova, criada em 2026-07-24 (Q-058/DEC-080)). Antes, as **TASK-097 e TASK-098 saíram da lista** — concluídas e aprovadas em 2026-07-24, ver cabeçalho e o Grupo A-bis abaixo, que fica **encerrado**. **Entrou na lista em 2026-07-24** também a **TASK-099** (Grupo D, complexidade 1, **prioridade baixa**): refactor puro de nomenclatura de código — `aoAtualizarSessao` (troca a sessão inteira) e `aoAtualizarSecao` (entrega UMA Seção) diferem por uma letra, são homófonos e convivem no mesmo componente, e como o fluxo é sempre `aoAtualizarSecao` → host → callback de sessão, trocar um pelo outro compila em silêncio onde as assinaturas casam. Levantada na `/analisar-task` da TASK-097 e deixada fora do escopo dela; **não é bug**. Como "Seção" é nomenclatura de spec e intocável (`docs-dev/04` princípio 12), quem renomeia é o lado da sessão — nome proposto **`aoDefinirSessao`** (desfaz a colisão no verbo, espelha o `definirSessao` real de `aplicacao-formulario.tsx:30` e preserva o vocabulário "sessão", o que sustenta deixar o tipo `SessaoFormulario` fora do escopo). A confirmação do nome é decisão de código, sem Q-xxx/DEC-xxx. **Restrição dura: roda depois de 097 (entregue), 098 (entregue) e 078 (entregue); as TASK-070/076 foram canceladas** (todas tocam `etapa-itinerarios.tsx`/`shared/mapa/mapa.tsx`). **Entraram na lista em 2026-07-24** as **TASK-097** e **TASK-098**, criadas a partir de dois bugs relatados manualmente pelo responsável (ver cabeçalho e o Grupo A-bis abaixo): a 097 é defeito puro contra a Spec 04 §7.3 itens 4/5/6 e a RN-052, com causa-raiz confirmada em diagnóstico, e assume a **prioridade máxima** por ser bug vivo que descarta trabalho do usuário em silêncio e por ser pré-requisito de três tasks já pendentes (070, 078 e, por recomendação, 076); a 098 implementa a **DEC-078** (Q-056), que estende ao clique direito a projeção sobre o traçado já fixada pela DEC-072 para o clique esquerdo. A **TASK-095** saiu da lista: o formulário de nome de Seção/Local deixou de ser um `Painel` abaixo do mapa e virou uma **linha-formulário inline na tabela lateral, na posição de inserção** (DEC-077); o `EditorMapaItinerario` só reporta a intenção via `aoIniciarCriacaoParada` e o host monta/confirma a linha na tabela reusando os motores puros da TASK-017/018. Implementada em `2ed41d3` e **aprovada** em `14-REVISOES/TASK-095-20260723.md` — todos os oito critérios com teste, `data-testid` de criação preservados, sem mudança de contrato/fluxo, suíte canônica verde. A **TASK-094** saiu da lista: Local unidirecional na criação (DEC-075) + "X" removendo a entidade Local inteira (DEC-076); implementada em `2350be2` e **aprovada** em `14-REVISOES/TASK-094-20260723.md` — supera a lacuna da DEC-045 (entidade Local antes inapagável) e encerra o gesto "Excluir ponto deste sentido" (`excluir-sentido-*` removidos, exceção autorizada pela DEC-076). A **TASK-093** saiu da lista: criada em 2026-07-23 pela **DEC-074** (condição do parecer da TASK-077), implementada em `faf4364` e **aprovada** em `14-REVISOES/TASK-093-20260723.md` no mesmo dia — `moverParada` só emite gesto de Seção quando a subsequência de Seções muda; a condição de sequenciamento "093 antes da 076" está cumprida e a TASK-076 segue liberada. A **TASK-077** saiu da lista: implementada em `553d1e6` — espelhamento Ida↔Volta por gesto atômico de Seção (DEC-063/DEC-071), ordem inversa como validação estrutural dura da RN-030, reuso filtrado. Herdou corretamente a limpeza de Seção órfã (084) e a reconciliação de horários (046)/matrizes (088), aplicadas no write-back de CADA sentido, na ordem editado→espelhado. **Aprovada com ressalvas** em `14-REVISOES/TASK-077-20260722.md`; as três ressalvas foram resolvidas pela **DEC-074** — a primeira virou a TASK-093, as outras duas (aviso DEC-068 no sentido espelhado; E2E de exportação com Volta derivada) foram **encerradas sem ação**. A **TASK-092** saiu da lista: criada e concluída em 2026-07-22 — implementada em `8e33b09` e **aprovada** em `14-REVISOES/TASK-092-20260722.md`; setas lado a lado sem wrap, testes-guarda das quatro colunas/vocabulário/`aria-label` e da desseleção sobre Local extremo (follow-ups da 091 e da 064 **fechados**). A **TASK-079** saiu da lista: implementada em `4e61327` e **aprovada** em `docs-dev/14-REVISOES/TASK-079-20260721.md`; a lista lateral única intercala pontos e Paradas, as setas reancoram e recalculam, e o estado de Local extremo permanece na linha correta. A **TASK-069** saiu da lista: implementada em `f995680` e **aprovada** em `docs-dev/14-REVISOES/TASK-069-20260721.md`; hover e clique usam a mesma coordenada projetada, o fantasma é efêmero e o hover não chama OSRM. A **TASK-089** saiu da lista: a correção foi absorvida pelo commit `37502b4` da TASK-068 e **aprovada com ressalva de rastreabilidade** em `docs-dev/14-REVISOES/TASK-089-20260721.md`; o cenário afere ausência de bloqueante, passa 3/3 e a suíte canônica está verde. A **TASK-068** saiu da lista: a entrega inicial `37502b4` foi reprovada em `14-REVISOES/TASK-068-20260721.md`, corrigida em `861b5a4` e **aprovada** em `14-REVISOES/TASK-068-20260721-reavaliacao.md`; a correção completou a cobertura de RN-035/fallback, impediu a promoção do Serviço com Local extremo e a suíte canônica terminou verde. A **TASK-090** também saiu da lista: a entrega inicial `735c992` foi reprovada em `14-REVISOES/TASK-090-20260721.md`, corrigida em `aa79302` e **aprovada** em `14-REVISOES/TASK-090-20260721-reavaliacao.md`; o executor canônico agora rejeita log de outro working tree e cobre os caminhos negativos reais. A ordem abaixo respeita as dependências declaradas nas próprias tasks; onde há folga, ela é indicada. A antiga prioridade máxima (TASK-082) foi concluída; a visibilidade dos motivos usa a infraestrutura entregue pelas TASK-085/086. O Grupo A (bug vivo de integridade das matrizes) foi fechado pela **TASK-088**, implementada em `2b27c9a` e aprovada em `docs-dev/14-REVISOES/TASK-088-20260720.md` — não há mais bug bloqueando a exportação após remover uma Seção. A **TASK-065** saiu da lista de pendentes: reprovada em 2026-07-20 por E2E vermelho, foi corrigida em `6469a04` e **aprovada com ressalvas** na reavaliação `docs-dev/14-REVISOES/TASK-065-20260720-reavaliacao.md`. A **TASK-067** também saiu: implementada em `b2b3ab7` e **aprovada com ressalvas** em `docs-dev/14-REVISOES/TASK-067-20260720.md` — a condição de entrada herdada da 065 (teste do hit-test de `contextmenu`) foi cumprida por `testes/unitarios/mapa/mapa.test.tsx`, e sua condição de merge foi absorvida e concluída pela TASK-068.

### Grupo A-bis — Bugs vivos de gesto do mapa (2026-07-24)

Relatados manualmente pelo responsável, com causa-raiz localizada em `src/shared/mapa/mapa.tsx`. A **TASK-097 saiu da lista**: implementada em `6b1360f` e **aprovada** em `14-REVISOES/TASK-097-20260724.md` — invariante de arrasto na primitiva (o marcador em arrasto não é reposicionado pelo re-render do hover), RN-052 (Alta) restaurada, suíte canônica verde. Com ela entregue, o "antes da 070 / dura antes da 078 / recomendada antes da 076" está **cumprido**. A **TASK-098 também saiu da lista**: implementada em `c91067e` e **aprovada** em `14-REVISOES/TASK-098-20260724.md` — `contextmenu` sobre a linha passa a entregar a coordenada projetada (DEC-078), com a mesma paridade que o `click` já tem desde a DEC-072; suíte canônica verde. Grupo A-bis **encerrado**, nenhuma task pendente restante nele.

### Grupo B — Ramo do mapa e pontos de rota — **encerrado (2026-07-24)**

Fecha a UX de mapa e interações. Depende só do que já está entregue (060, 063, 065, 066, 067, 071).

A **TASK-070** (clique sobre o vértice remove o ponto de rota) foi **cancelada em 2026-07-24** por decisão do responsável: o botão "Remover" da tabela lateral já cobre a remoção de forma simples e suficiente. Não há mais nenhuma task pendente neste grupo.

A **TASK-092** saiu da lista: implementada em `8e33b09` e **aprovada** em `14-REVISOES/TASK-092-20260722.md` — os follow-ups de teste do parecer da 091 e o teste de desseleção herdado da 064 estão fechados. A **TASK-091** saiu da lista: a **Q-052** foi decidida (**DEC-073** — variante local de `Tabela`/`Botao` por prop, Tipo vazio para ponto de rota, precedência de canais fundo/texto/borda), implementada em `f1eca46` e **aprovada com ressalvas** em `14-REVISOES/TASK-091-20260722.md`. Condição do ciclo: commitar o registro da DEC-073 (`docs-dev/10` + `docs-dev/16`). Follow-ups de teste (não bloqueiam): teste-guarda das quatro colunas/vocabulário de Tipo/`aria-label` do "X" e o teste de desseleção sobre Local extremo herdado da revisão da 064.

**Condição de merge da TASK-067 concluída pela TASK-068** (parecer `14-REVISOES/TASK-067-20260720.md`, problema 1): com
montagem inválida e a última rota válida ainda desenhada, o clique direito **sobre a linha** descarta
a Seção/Local criada **sem mensagem** — `prepararInsercaoDeParada` devolve `undefined`
(`src/formulario/itinerarios/etapa-itinerarios.tsx:490,499,510`) e os chamadores só retornam. A
correção prescrita pela DEC-055 é degradar para o caminho "fora da linha" (acrescentar ao fim), com
teste do caso "montagem inválida + linha desenhada". Não exige Q-xxx. **Encaminhada em 2026-07-21:**
por decisão do responsável, virou o **item D da TASK-068** — concluído e coberto por testes; não há task própria para ela.

**Feedback contextual do Local em extremo (Q-049/DEC-070, 2026-07-21):** o fallback mantém o Local
na lista de edição, mas a ocorrência no primeiro/último lugar fica inválida: linha correspondente da
tabela em vermelho com explicação no hover/foco, marcador circular verde com borda vermelha, aviso
geral da TASK-047 preservado e zero OSRM/conclusão/exportação enquanto RN-035 persistir. A TASK-068
implementou; a TASK-079 preservou o estado na lista unificada; a TASK-064 compôs a seleção sobre ele sem mascará-lo (revisão de 2026-07-22); a TASK-076 mantém a obrigação explícita de compô-lo.

A cadeia `079 → 064` está **concluída** (a 064 projetou a seleção sobre a lista unificada e compôs com a DEC-070). Permanece a trava rígida `068 → 076` (preservação da DEC-070); as travas `068 → 069` e `068 → 079` foram concluídas. As demais têm folga entre si.

### Grupo C — Grandes refactors de sentido e Seção

As próprias tasks pedem rodar **depois** do Grupo B, para não retrabalhar a superfície mais ativa.

A **TASK-077** saiu da lista: implementada em `553d1e6` e **aprovada com ressalvas** em `14-REVISOES/TASK-077-20260722.md` — espelhamento Ida↔Volta por gesto atômico de Seção (DEC-063/DEC-071). As três ressalvas do parecer foram resolvidas pela **DEC-074** (2026-07-23): a condição virou a **TASK-093**, implementada em `faf4364` e **aprovada** em `14-REVISOES/TASK-093-20260723.md`; os follow-ups de aviso DEC-068 no sentido espelhado e de E2E de exportação foram **encerrados sem ação**; ver §3 e o cabeçalho deste documento.

A **TASK-076** (Ida e Volta no mesmo mapa: abas, tracejado, dois painéis) foi **cancelada em 2026-07-24** por decisão do responsável: a troca de aba entre sentidos já é simples e a informação já está bem estruturada — era a task mais cara do backlog pendente (complexidade 5) sem ganho percebido que a justificasse.

A **TASK-078** saiu da lista: realocação de Seção por botão (DEC-061/**DEC-079**) — botão esquerdo translada o cluster inteiro, direito move só o ponto do Serviço/sentido corrente. Entrega original `4bd5703` **reprovada** em `b8d0301` (botão direito indistinguível do esquerdo); corrigida em `714028b` (`stopPropagation()` no `mousedown` do botão direito, mais mock fiel do `_addDragHandler` e E2E de navegador real dos dois gestos) e **aprovada** em `14-REVISOES/TASK-078-20260724-reavaliacao.md`. **Desbloqueia a TASK-100**, que reusa o motor de translação (`transladarSecao`) com destino fixo.

A **TASK-100** saiu da lista: botão "redefinir Seção" na tabela lateral (Q-058/**DEC-080**) — colapsa todas as contribuições da Seção (`secao.servicos[]`, Ida e Volta, de todos os Serviços) na coordenada do Serviço/sentido em edição no momento do clique, sob confirmação OK/Cancelar. Implementada em `288dec9` (função pura `redefinirSecao`, variante de `transladarSecao` com destino fixo; coluna "Redefinir" na tabela; cascata delegada a `aoTransladarSecao`, o mesmo caminho da TASK-078 — RN-052/054..057/048 sem duplicação) e **aprovada com ressalvas** em `14-REVISOES/TASK-100-20260724.md`. RN-004/026/027/029 com teste na função pura; convergência multi-Serviço e 4 chamadas OSRM provadas em integração e E2E (OSRM sempre mockado); suíte canônica **verde** (log reutilizado; fingerprint `19967314…`; identidade `498d7fa6…` do mesmo working tree). **Ressalva/condição de merge — resolvida:** os documentos que fundamentam a task — `06-BACKLOG_INICIAL.md` (TASK-100), `10-DECISION_LOG.md` (DEC-080) e `16-OPEN_QUESTIONS.md` (Q-058, mais o spillover Q-057/DEC-079 da TASK-078) — foram versionados em `668124b` (adendo no parecer); working tree limpo, sem condição de merge pendente.

### Grupo D — UX restante e qualidade

| # | Task | Complex. | Observação |
|:---:|---|:---:|---|
| 4 | **062** — E2E do fluxo "criar do zero" ponta a ponta | **3** | Depois do mapa estabilizado, senão os seletores mudam de novo. |
| 12 | **099** — Renomear `aoAtualizarSessao` → `aoDefinirSessao` (par homófono com `aoAtualizarSecao`) | **1** | **Prioridade baixa; roda por último deste grupo.** Refactor puro de nomenclatura, 59 ocorrências em 11 arquivos, sem mudança de comportamento. **Restrição dura de sequenciamento: depois de 097 (entregue), 098 (entregue), 078 (entregue) e 100** — todas editam `etapa-itinerarios.tsx` ou `shared/mapa/mapa.tsx`, e um rename atravessado nessa fila só gera conflito de merge. (As TASK-070/076, que também tocavam esses arquivos, foram canceladas em 2026-07-24 e saem desta restrição.) Nome final a confirmar pelo responsável (decisão de código, sem Q-xxx). |

### Grupo E — Fases originais restantes (MVP 3 em diante)

Independentes do ramo do mapa: nada aqui bloqueia ou é bloqueado por ele.

| # | Task | Complex. | Observação |
|:---:|---|:---:|---|
| 5 | **033** — PDF operacional: estrutura e identificação | **4** | Subsistema novo (@react-pdf) + captura do mapa. |
| 6 | **034** — PDF operacional: tabelas horárias e matrizes | **3** | Sobre a 033. |
| 7 | **035** — Comparador: carregamento e validação dos dois arquivos | **3** | |
| 8 | **036** — Motor de diff por UUID + taxonomia | **5** | Núcleo do Comparador; casamento por UUID e por contexto. |
| 9 | **037** — Telas de comparação | **4** | Superfície ampla (5 visões/abas). |
| 10 | **038** — Mapa comparativo | **3** | Bloqueio parcial: Q-004 (tolerância). |
| 11 | **039** — PDF comparativo completo | **4** | |

### Grupo G — Operação excepcional (DEC-081 / Q-059)

Recurso novo decidido em 2026-07-27 (tabelas de operação excepcional por Serviço — férias de verão/inverno/personalizado, categoria **textual**, sem datas). Specs 02/03/04/05 já atualizadas (contrato v1.1); RN-098/RN-099 criadas, RN-061/062/068/069 ajustadas. As **TASK-102, TASK-103, TASK-104 e TASK-105 estão concluídas e aprovadas**. A TASK-104 foi implementada em `9adf7d9`, regularizada em `a1d96b1`/`bd679d1` e aprovada sem ressalvas em `14-REVISOES/TASK-104-20260730.md`. A TASK-105 foi implementada em `2a8da0c` e aprovada sem ressalvas em `14-REVISOES/TASK-105-20260730.md`; o grupo base está concluído, a dependência da TASK-112 foi satisfeita e a TASK-119 ficou desbloqueada conforme DEC-097.

**Superfícies pendentes alteradas pela DEC-081 (não viram task nova — anotadas no backlog):** **TASK-034** (PDF: tabelas excepcionais + rótulo), **TASK-033** (rótulo/`versao_schema`), **TASK-036** (diff: casar tabela por `uuid` + mudança de grade), **TASK-037** (telas: grades excepcionais separadas + rótulo), **TASK-039** (PDF comparativo). Cobertas ao construí-las, lendo as specs já atualizadas — evita task paralela sobre superfície não construída (lição §6.2). Nenhuma task pendente foi **anulada**.

### Grupo H — Redesign da grade de horários (proposta 2026-07-27)

Proposta do responsável em 2026-07-27 (Excel de layout + 4 imagens em `docs-dev/`). As **TASK-106, 107, 108, 110, 113, 114, 115, 116, 117, 118 e 119 estão concluídas e aprovadas**. A 106 consolidou seleção, Enter/Tab, retirada de “Apagar bloco” e densidade pública de `Campo`/`Select`; a 107 entregou inserção relativa e a composição da DEC-090; a 108 entregou a geração em lote por headway da DEC-083; a 110 entregou cópia e remoção de dia inteiro; a 113 preservou os dois últimos deslocamentos da DEC-091; a 114 manteve as ações inteiramente visíveis em domingo; a 115 fez o foco acompanhar a UUID da Viagem após criação/reordenação e redistribuição; a 116 passou a confirmar horários somente por `Enter`/`Tab`, com rascunho local e normalização final; a 117 reancorou as operações de dia nos cabeçalhos e recompôs o headway conforme a DEC-093; a 118 tornou o headway idempotente pela DEC-094; e a 119 destacou somente os reforços coincidentes, agregou o alerta por Serviço, navegou para a primeira origem e acrescentou o toggle da DEC-096. A entrega `8cc8908` da TASK-110 foi corrigida em `d594034` e aprovada na reavaliação `14-REVISOES/TASK-110-20260729.md`: a cópia preserva reforços da origem e o `Dialogo` contém, estabiliza e restaura o foco. A entrega `92414d2` da TASK-116 foi corrigida em `213626d` e aprovada na reavaliação `14-REVISOES/TASK-116-20260728.md`; o E2E da TASK-105 confirmou a herança na grade excepcional. A **TASK-117 foi aprovada na reavaliação final** `14-REVISOES/TASK-117-20260730-reavaliacao.md` após `bf98389` encerrar a ressalva documental. A **TASK-118 foi aprovada na reavaliação final** `14-REVISOES/TASK-118-20260730-reavaliacao.md` após `2a72bd1` versionar TASK-118/Q-072/DEC-094 e encerrar a única ressalva documental. A **TASK-119 foi implementada em `233501e` e aprovada sem ressalvas** no parecer `14-REVISOES/TASK-119-20260730.md`; cobre também as grades excepcionais exigidas pela DEC-097 e permanece independente da guarda da TASK-118. A **TASK-109 foi implementada em `1174657` e aprovada com ressalvas** no parecer `14-REVISOES/TASK-109-20260728.md`: arrasto e atalhos estão aderentes, mas falta a regressão E2E explícita de soltar fora de qualquer coluna. Ela permanece na fila até a condição de merge ser corrigida e reavaliada. A TASK-112 já pode reutilizar o motor de sincronização entregue pela TASK-105. Botões de ação da Viagem surgem **no hover**.

| # | Task | Complex. | Estado | Observação |
|:---:|---|:---:|---|---|
| 1 | **109** — Cópia unitária entre dias por arrasto + atalhos para dias adjacentes | **2** | Implementada; aprovada com ressalva impeditiva | Código e suíte verdes em `1174657`; falta E2E de drop fora de qualquer coluna e reavaliação antes do merge. |
| 2 | **111** — Modo compacto: ocultar Seções intermediárias e final | **2** | Desbloqueada (DEC-086; TASK-106 aprovada) | Versão simples do PDF é da TASK-034 (§13.2). |
| 3 | **112** — "Copiar dias comuns" origem estendida + mescla = sincronização preservando UUID | **4** | Desbloqueada (DEC-087; dependência 105 satisfeita) | Spec 04 §8.4/§8.5 aplicada + carve-out RN-007 registrada. Reusa o motor de sincronização entregue pela 105. |

**Ação de spec (DEC-087) — concluída:** a **Spec 04 §8.4/§8.5** foi atualizada (origem selecionável; "mesclar" = sincronização preservando UUID; "sobrescrever" = UUIDs novas) e a **carve-out da RN-007** foi registrada no `01-RULE_INDEX.md` e `03-TRACEABILITY_MATRIX.md`. O casamento sob duplicatas (RN-062) ficou resolvido na spec (§8.5, "por contagem").

### Grupo F — Bloqueada

| Task | Complex. | Observação |
|---|:---:|---|
| **040** — Spec 06 + plano do Ingestor | — | **Não implementar** antes da decisão humana (RN-093). Depende dos MVPs 0–4 entregues. |

---

## 6. Achados de sequenciamento (registro para não repetir)

### 6.1 TASK-046 foi pulada silenciosamente — resolvido em 2026-07-20

A ordem recomendada do `06-BACKLOG_INICIAL.md` prevê `… 028 → 046 → 029 → 030 → 031 → 032`. As tasks 029, 030, 031 e 032 foram executadas, mas a **046 não** — existe apenas o commit que a criou (`c86397f`, junto com a 047). Consequência: a reconciliação de `horarios_paradas` na mudança de itinerário (DEC-048/Q-029) nunca entrou, e a violação **RN-063** ficou alcançável pelo usuário — que é justamente o bug reportado em 2026-07-18 e transformado na TASK-087.

**Resolução:** a TASK-046 foi implementada no commit `ef08312` e aprovada no
parecer `docs-dev/14-REVISOES/TASK-046-20260720.md` (commit `a15986d`). A skill
`revisar-aderencia` passou a exigir a atualização deste documento no mesmo ciclo.

**Lição registrada:** a ordem recomendada do backlog não era conferida contra o que efetivamente rodou. É a razão de existir deste documento (§1).

### 6.2 TASK-087 foi absorvida pela TASK-046 — resolvido em 2026-07-20

A 087 (remover parada reconcilia `horarios_paradas`) é a **fatia "remover" do caso (a) da 046**, que já cobre inserir/remover/reordenar. A 087 foi redigida sem citar a 046 em nenhum ponto — nem no contexto, nem nas dependências.

**Risco concreto se a 087 for implementada isolada:** o write-back `servicosComItinerarioAtualizado` (`src/formulario/itinerarios/etapa-itinerarios.tsx`) é chamado por `aplicarNovasParadas` **tanto** quando o conjunto/ordem de paradas muda **quanto** nos gestos de ponto de rota e arrasto de coordenada (paradas inalteradas). Reconciliar os offsets "sempre que o write-back rodar" recomputaria os horários também nesses gestos — violando o **caso (b) da DEC-048**, que manda **preservar** os `offset_horario` gravados quando ordem e conjunto não mudam. Trocaria um bug de bloqueio por uma perda silenciosa de horários do usuário.

**Resolução:** a implementação da TASK-046 cobre remoção, inserção e
reordenação, preserva offsets quando a sequência não muda e inclui o caso de
remoção da TASK-087 como regressão. A TASK-087 está absorvida e não deve ser
implementada isoladamente.

O write-back atual verificado na revisão é `servicosComItinerarioAtualizado`.

### 6.3 TASK-004 fechada sem parecer

Ver §4. Código entregue, ciclo formal não encerrado.

### 6.4 `etapa-itinerarios.spec.ts:71` ficou desatualizado desde a TASK-081 — resolvido em 2026-07-21

Achado na reavaliação da TASK-065 (`14-REVISOES/TASK-065-20260720-reavaliacao.md`, problema 4). O E2E `mover parada recalcula com sucesso …` exige `painel-pendencias → pendencia-item` com contagem **0**, mas o fixture `carregar-multi-servico.json` passou a produzir o alerta *"Serviços 0001-1SU, 0001-2SU sem grade de feriados"*, emitido atualmente por `src/formulario/pendencias/pendencias.ts:200` — introduzido pela **TASK-081** (`06a7ed4`). Falha determinística (3/3 em `--repeat-each=3`), e **não** é a flakiness intermitente descrita no parecer anterior da 065.

**Atribuição:** não é da TASK-065 — nenhum dos seus commits toca `src/formulario/pendencias/`. É débito de teste da TASK-081, que acrescentou o alerta sem atualizar o E2E que assume zero pendências nesse fixture.

**Resolução:** a correção foi absorvida pelo commit `37502b4` da TASK-068: a asserção agora filtra `pendencia-item` por `data-severidade="bloqueante"`, preservando a prova de recálculo e o caso inválido `NoRoute`. A revisão `docs-dev/14-REVISOES/TASK-089-20260721.md` aprovou a entrega com ressalva pela ausência de commit próprio; o cenário passou 3/3, a suíte canônica ficou verde e a TASK-089 não deve ser reimplementada.

### 6.5 TASK-096 nasceu fora da §5 — regularizada em 2026-07-23

A TASK-096 foi criada em `a3cfa86` tocando **apenas** o `06-BACKLOG_INICIAL.md`; nunca entrou na §5 deste documento, contrariando o item 2 do §1 ("ao criar uma task nova, acrescente-a na §5"). Como implementação (`5404f48`) e revisão (`14-REVISOES/TASK-096-20260723.md`) vieram no mesmo dia, a lacuna não chegou a esconder nada — mas é o mesmo padrão do §6.1, e por isso fica registrado.

**Resolução:** a task entrou direto na §3 (executadas) no movimento da revisão. A contagem de pendentes da §5 não muda: a 096 nunca esteve lá.

### 6.6 Operação excepcional (DEC-081): PDF/Comparador anotados, não duplicados — 2026-07-27

Ao criar as TASK-102..105, a verificação de sobreposição (item 2 do §1) mostrou que a operação excepcional **altera** cinco tasks **pendentes** cujas superfícies ainda não existem: **TASK-033/034** (PDF operacional) e **TASK-036/037/039** (Comparador). As Specs 04 §8.5/§13 e 05 §10.4/§12.3 já foram atualizadas, então quem implementar essas tasks lerá o escopo excepcional direto da spec.

**Decisão:** **não** criar tasks paralelas de PDF/diff excepcional. Criar uma "TASK-106 PDF excepcional" sobre a TASK-034 ainda não construída reproduziria exatamente o padrão do §6.2 (TASK-087 absorvida pela 046): duas tasks disputando a mesma superfície, uma absorvendo a outra. Em vez disso, cada pendente recebeu uma **"Nota (DEC-081)"** no `06-BACKLOG_INICIAL.md` fixando o acréscimo de escopo. As tasks **concluídas** afetadas foram tratadas: TASK-031 (contagens) foi atualizada e aprovada pela **TASK-103**; TASK-028/030/032 são estendidas por 104/105 sem alteração.

**Nenhuma task pendente foi anulada** pela DEC-081 — só ampliadas (034/036/037/039) ou pontualmente rotuladas (033).
