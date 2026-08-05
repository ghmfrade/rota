# Revisão da TASK-131 — rodada de correção 1

**Revisor:** Claude (Opus 5) — `/revisar-aderencia`, conversa nova, corrida orquestrada
**Data:** 2026-08-04
**Commit/branch revisado:** `14bc44b` na branch `orquestracao/20260805-0057`
("Corrige TASK-131 (rodada 1): distanciaM não inventa 0 quando o OSRM omite distance"),
sobre a entrega original `0d08403` já revisada em `14-REVISOES/TASK-131-20260804.md`
(aprovada com ressalvas). Escopo desta revisão: o diff da correção **e** a permanência das
conclusões da revisão anterior no estado atual do código.

## Resultado

- [x] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

A correção toca **dois** arquivos, +55/−6 linhas (`git show --stat 14bc44b`), exatamente os
dois que a ressalva apontava:

- `src/formulario/roteamento/nearest-osrm.ts` — `distanciaM` passa de obrigatório para
  opcional em `ResultadoViaMaisProxima` (`nearest-osrm.ts:42`) e o `?? 0` do retorno vira
  um spread condicional guardado por `Number.isFinite` (`nearest-osrm.ts:103-105`); o
  comentário do tipo documenta a razão (`nearest-osrm.ts:30-33`).
- `testes/unitarios/formulario/nearest-osrm.test.ts` — +45 linhas, quatro testes novos:
  `distance` ausente, `null`, `NaN` e `0` legítimo (`nearest-osrm.test.ts:133-176`).

Nenhum outro arquivo foi tocado. `cliente-osrm.ts`, `url-osrm.ts`, `falhas-osrm.ts`,
`extrair-rota.ts` e os testes do `/route` continuam **fora do diff** desde `0d08403`
(`git diff --stat HEAD~2 HEAD` lista só o parecer anterior, o `19-STATUS_EXECUCAO.md` e os
dois arquivos acima).

## Regras RN verificadas

- **RN-047** (forma da requisição, criticidade Alta) — **atendida, inalterada pela
  correção.** A montagem da URL não foi tocada: `${base}/nearest/v1/driving/${lon},${lat}?number=1`
  em `nearest-osrm.ts:72`, com `urlBaseOsrm` (DEC-029: override → env → demo). Os quatro
  testes de URL (`nearest-osrm.test.ts:28-92`) permanecem idênticos e verdes.
- **RN-048** (indisponibilidade do OSRM é bloqueante, criticidade **Alta**) — **atendida no
  sentido correto do seu alcance, e a correção não a aproxima.** O módulo continua sem
  importar `falhas-osrm.ts`/`cliente-osrm.ts` (`nearest-osrm.ts:1-2`: só `Ponto` e
  `urlBaseOsrm`); a DEC-112 item 3 (`docs-dev/10-DECISION_LOG.md:2055-2061`) limita
  explicitamente a RN-048 ao `/route` e à rota. Teste de regressão intacto
  (`nearest-osrm.test.ts:297-309`, incluindo a asserção de que o resultado não tem
  propriedade `falha`).
- **RN-049** (mensagem de erro não menciona tarifa) — **N/A verificado:** o módulo continua
  sem produzir texto de usuário; devolve `motivo: "rede" | "semResposta"`.
- **RN-050** (conversão/arredondamento na fronteira OSRM) — **N/A, e a correção reforça o
  ponto:** `distanciaM` é distância em metros do waypoint até a via, dado efêmero de UI, não
  `trecho.distancia_km`. Não é convertido nem arredondado — e agora tampouco é **inventado**.
- **RN-052** (abrir JSON não chama OSRM, criticidade Alta) — **atendida trivialmente:**
  segue sem chamador. Busca por `consultarViaMaisProxima|nearest-osrm` em `src/` e `testes/`
  retorna apenas os três arquivos da própria task (`nearest-osrm.ts`, `index.ts` do
  roteamento, `nearest-osrm.test.ts`). A verificação real cabe à TASK-133.
- **RN-096** (resultado efêmero, nada persistido) — **atendida:** o retorno é objeto local;
  nenhum arquivo de `src/shared/contrato` foi tocado por `0d08403` nem por `14bc44b`.
- **RN-080** (Comparador nunca chama OSRM) — **atendida:** o módulo vive em
  `src/formulario/roteamento/`; nada em `src/comparador/` o importa.

## Specs verificadas

- **Spec 01 §8** (OSRM público como serviço de roteamento) — **aderente:** nenhum serviço
  novo; a mesma base `urlBaseOsrm`, outro endpoint.
- **Spec 03 §3.2** (perfil `driving`, ordem `lon,lat`) — **aderente por analogia**, como a
  task e a DEC-112 autorizam; o desvio está declarado no cabeçalho do módulo
  (`nearest-osrm.ts:4-11`).
- **Spec 03 §3.5** (política de falhas do OSRM) — **corretamente não aplicada**, ancorada na
  DEC-112 item 3.
- **Spec 03 §3.6** (coordenada encaixada) — `waypoints[0].location` continua lido e devolvido
  como `localizacao`, **sem consumidor** (verificado por busca). O "Fora de escopo" permite
  ler e devolver.
- **Spec 04 §7.3** (indicador de carregamento) — **N/A:** não há UI nesta task; é
  pré-requisito da TASK-133.

## Pontos corretos

- **A ressalva 1 do parecer anterior foi resolvida na direção mais conservadora das duas
  sugeridas.** O parecer oferecia "tratar `distance` ausente como `semResposta`" **ou**
  "tornar `distanciaM` opcional"; a correção escolheu a segunda, que preserva a sugestão de
  nome (o valor útil) mesmo quando a distância não vem. Sugerir `"Via X"` sem distância é
  melhor para o usuário do que descartar a sugestão inteira por um campo acessório ausente,
  e não contradiz nada da DEC-112.
- **O guarda escolhido é o certo, não o conveniente.** `Number.isFinite(waypoint.distance)`
  (`nearest-osrm.ts:103`) rejeita `undefined`, `null`, `NaN` e `Infinity`, mas **aceita `0`**.
  Um `?? ` ou um `if (waypoint.distance)` teriam descartado o zero legítimo — que é
  justamente o caso "coordenada sobre a via", o mais comum quando o usuário clica em cima da
  rodovia. O teste `nearest-osrm.test.ts:167-176` fixa essa distinção explicitamente.
- **A ressalva 2 (lacuna de teste) foi coberta com folga.** Quatro casos, não um: ausência,
  `null`, `NaN` e `0`. Os três primeiros usam `expect(resultado).not.toHaveProperty("distanciaM")`
  — asserção de **ausência da chave**, não de valor `undefined`, que é o que a implementação
  por spread condicional de fato garante e é o que um consumidor com `"distanciaM" in r`
  observaria.
- **A correção usa spread condicional, e não atribuição de `undefined`.** `{...(cond ? {k:v} : {})}`
  omite a chave; `{k: undefined}` a criaria com valor `undefined`. Os testes provariam a
  diferença — e passam.
- **O comentário do tipo explica o *porquê*, não o *o quê*** (`nearest-osrm.ts:30-33`): "zero
  seria a leitura mais forte — 'sobre a via' — no caso de menor informação". Quem alterar o
  campo no futuro encontra o raciocínio, não só a regra.
- **Nada além da ressalva foi mexido.** Nenhum "aproveitar para melhorar" (`docs-dev/04`
  princípio 7): a correção é cirúrgica nos dois pontos apontados.
- **`typecheck` e `lint` limpos**, executados nesta revisão sobre `14bc44b`: `tsc --noEmit`
  e `eslint .` sem qualquer saída de erro.

## Problemas encontrados

**Nenhum problema de severidade Baixa, Média ou Alta.** Duas observações informativas, que
não são defeito e não geram condição:

1. **(Informativa — desvio formal do texto do critério de aceite, autorizado pelo parecer
   anterior)** O critério de aceite da task diz literalmente
   `{ ok: true, via?: string, distanciaM: number }` (`docs-dev/06-BACKLOG_INICIAL.md:8858`),
   isto é, `distanciaM` **obrigatório**. A correção o torna opcional. O desvio é deliberado,
   está fundamentado na ressalva 1 do parecer `TASK-131-20260804.md:108-118` e é a correção
   de um defeito real — o texto da task não previu o caso "OSRM omite `distance`". Não é
   inferência solta: é a aplicação de um princípio explícito da própria task ("nunca um nome
   inventado") ao campo vizinho. Registro só para que a **TASK-133 leia o tipo, não o texto
   do critério**: `distanciaM` pode ser `undefined` e qualquer limiar do tipo "só sugerir se
   a via estiver a menos de N metros" precisa decidir o que fazer nesse caso — e "sem
   distância" **não** pode virar "distância zero". (Nota simétrica: o código faz `via: string`
   obrigatório onde o critério escreve `via?: string`; é a leitura estrita e correta, já
   registrada no parecer anterior.)
2. **(Informativa — tipagem, sem efeito em runtime)** `Number.isFinite` não é um type guard
   do TypeScript, então dentro do ramo verdadeiro `waypoint.distance` continua tipado
   `number | undefined` e `{ distanciaM: waypoint.distance }` tipa como `number | undefined`.
   Compila porque `exactOptionalPropertyTypes` não está habilitado no `tsconfig.json`
   (verificado: `strict: true`, sem essa flag — `tsconfig.json:11`). O comportamento em
   runtime é correto e está coberto por teste; se um dia a flag for ligada, este ponto
   precisará de um `typeof waypoint.distance === "number" && Number.isFinite(...)`. Não é
   dívida desta task.

Nenhuma violação de RN de criticidade Alta e nenhuma violação de NEG-xxx.

## Violações de escopo

**Nenhuma.** O diff da correção toca dois arquivos, ambos criados pela própria task. Cada
item do "Fora de escopo" reconferido no estado atual:

- `solicitarRota`, `montarUrlOsrm`, `extrair-rota`, `falhas-osrm` — **intocados** desde
  `0d08403`; a correção não os inclui.
- Coordenada encaixada movendo Seção/Local — **não**: `localizacao` segue sem consumidor.
- Abreviação (TASK-130) ou exibição (TASK-133) — **ausentes**; o módulo não importa
  `abreviar-nome-de-via.ts`.
- Cache, fila, rate-limit, retry — **ausentes**; contagem de chamadas = 1 asseverada em três
  testes (`nearest-osrm.test.ts:245`, `:267`, `:284`).
- Uso do `/nearest` fora da criação de Parada — **impossível hoje**: não há chamador.

## Testes avaliados

- **cobertura das RN da task:** sim, para o que é verificável nesta camada. RN-047 (forma da
  URL) e RN-048-no-sentido-inverso têm testes diretos; RN-052 e RN-096 são atendidas por
  ausência de consumidor (fato conferido por busca) e viram critério real na TASK-133. A
  lacuna apontada na revisão anterior (comportamento de `distance` ausente) **está fechada**.
- **casos inválidos testados:** sim — 21 testes ao todo, dos quais 11 são casos inválidos
  (`name` ausente/vazio/só-espaços, `code != "Ok"`, `waypoints` vazio/ausente, fetch
  rejeitado, HTTP ≠ 2xx, corpo não-JSON, timeout, promessa que nunca rejeita) mais os três
  casos de `distance` fora do contrato. Todos os casos válidos e inválidos listados na task
  têm teste correspondente.
- **regressão de UUID:** N/A — a task não toca import/export/cópia nem entidade do contrato.
- **OSRM mockado:** sim, em 100% dos testes (`fetchFn` injetado); o único uso de ambiente é
  `vi.stubEnv`, desfeito no `afterEach` (`nearest-osrm.test.ts:23-26`). Nenhum teste toca a
  rede real.
- **suíte executada com resultado:** **verde, log canônico reutilizado sem repetir a suíte.**
  `npm run test:all:verificar` respondeu: *"Log canônico válido. Executor:
  `Claude-orquestrado`. Fingerprint:
  `0c471309f6580a203132e787d7a9a3fc832227ed4b69ee964be96e677725be6c`. Working tree:
  `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`."* Resumo real do
  `ultimo-test-all.log`: Vitest `Test Files 115 passed (115)` / `Tests 1674 passed (1674)`
  em 27.81 s, `Código Testes unitários: 0`; Playwright `111 passed (44.3s)`, `Código Testes
  E2E: 0`, servidor próprio (PID 15188) encerrado por `taskkill /PID 15188 /T /F` na limpeza,
  porta 3100; `Resultado geral: APROVADO`, fim em 2026-08-05T01:12:44Z, com marcador
  `FIM DO LOG CANÔNICO`. Os 1674 testes são os 1670 da entrega original **mais os 4 da
  correção**, o que confirma que o log cobre o estado corrigido; o fingerprint bate com o
  conteúdo atual do working tree. A suíte **não** foi reexecutada nesta revisão, conforme o
  passo 2 da skill. Adicionalmente, `npm run typecheck` e `npm run lint` foram executados
  aqui e vieram limpos.

## Checklist 07

**Resultado: 15 itens OK, 47 N/A, 0 violados.** (Mesma contagem da revisão anterior, com um
item saindo de "OK com ressalva parcial" para OK pleno.)

- **Escopo (6):** todos OK. Não é gestão de processo (RN-095); nenhum workflow, status ou
  persistência (RN-011/096); a correção implementa **apenas** o que a ressalva pediu; nenhuma
  regra nova — o desvio autorizado (usar o `/nearest`, fora do texto da Spec 03 §3.2) cita a
  DEC-112 no próprio código, e o desvio do critério de aceite está fundamentado no parecer
  anterior e registrado acima como inferência controlada.
- **JSON (10):** todos **N/A** — nenhum arquivo de `src/shared/contrato` tocado, nenhum campo
  novo, nenhuma entidade, nenhum valor persistido.
- **Domínio (9):** todos **N/A** — nenhuma entidade afetada, como a própria task declara.
- **Comparador (7):** todos **N/A**; "Comparador continua sem chamar OSRM" (RN-080) fica OK
  por verificação negativa (nenhum import a partir de `src/comparador/`).
- **Roteamento (5):** OSRM indisponível continua bloqueando a rota — OK, nada no `/route`
  mudou; distância roteada exclusivamente do OSRM — OK/N/A (`distanciaM` não é distância
  roteada, e agora **nem sequer é inventada** quando o OSRM não a informa, o que aproxima o
  módulo do espírito do item "sem distância inventada"); pontos de rota / invariante
  trechos = paradas−1 — N/A; abrir JSON não chama OSRM (RN-052) — OK por ausência de
  chamador; mensagens da Spec 04 §14 — N/A (não há mensagem).
- **UI/PDF (8):** todos **N/A** — nenhum `.tsx`, nenhum `data-testid`, nenhum token.
- **Testes (8):** **8 OK.** O item "toda regra RN implementada possui teste" agora é OK pleno:
  o caso de borda que faltava (`distance` ausente/não-finito) está fixado por quatro testes.
  Os itens de evidência canônica (log único, `verificar` verde, reutilização na revisão,
  porta liberada e PID encerrado) estão atendidos e transcritos acima.

## Pendências

- **Ressalvas 1 e 2 do parecer `TASK-131-20260804.md`: encerradas.** O `?? 0` não existe mais
  e o comportamento está fixado por teste. O "follow-up com prazo" registrado no
  `19-STATUS_EXECUCAO.md` (resolver antes de a TASK-133 ler `distanciaM`) **deixa de existir
  como dívida** — foi resolvido dentro do próprio ciclo da TASK-131.
- **Ressalva 3 do parecer anterior (informativa): permanece como era**, e continua não sendo
  defeito — o timeout depende de o `fetchFn` injetado honrar `signal`. Vale para o `fetch`
  global e para o mock do teste (que o honra explicitamente, `nearest-osrm.test.ts:272-278`).
- **Nenhuma Q-xxx aberta.** A Q-090 está decidida pela DEC-112, com as duas sub-questões
  contempladas.
- **Alteração de spec já registrada e ainda pendente do responsável** (não é dívida desta
  task): a DEC-112 aponta que a Spec 04 §7.1 deveria mencionar que o campo de nome pode
  nascer com sugestão editável, e que `docs-dev/01` (nota de alcance da RN-048) e
  `docs-dev/03` (linha do Spec 04 §7.1) devem ser atualizados quando o responsável pedir.
  Isso vale para a TASK-133, que é quem torna a sugestão visível.
- **Follow-ups herdados de outras tasks (TASK-128/129/130) e a pendência de registro da §3 do
  `19-STATUS_EXECUCAO.md`** (tabela terminando na 129 e total "102 tasks concluídas"
  divergente das linhas) seguem **sem dono** — esta revisão também não mexeu nisso.

## Consequências sobre outras tasks

- **TASK-133** (sugestão de nome na UI) — é a única consumidora prevista e é diretamente
  afetada por esta correção: o tipo `ResultadoViaMaisProxima` agora tem `distanciaM`
  **opcional** (`nearest-osrm.ts:42`), então qualquer limiar de distância precisa tratar
  `undefined` explicitamente. Segue herdando três obrigações não cobertas por esta entrega:
  (a) o indicador de carregamento da Spec 04 §7.3; (b) a garantia da RN-052 de que a consulta
  só ocorre em gesto explícito de criação; (c) o limite de volume — não consultar a cada
  tecla digitada. Código da TASK-133 **não verificado nesta revisão** (os arquivos previstos
  pela DEC-112 para ela não existem no repositório).
- **TASK-130** (abreviação de nome de via) — o parecer
  `docs-dev/14-REVISOES/TASK-130-20260804.md` a aprovou com ressalvas; **o código dela não foi
  aberto nesta revisão**, então não afirmo nada sobre seu comportamento. O que verifiquei é
  que a TASK-131 **não a importa**: as duas continuam independentes, como a task previa.
- **TASK-132** (coordenadas editáveis na criação) — não depende deste módulo. Código **não
  verificado nesta revisão**.
- **TASK-095** (criação inline) — a DEC-112 exige que sua suíte continue verde com o mock do
  `/nearest` falhando. Como não há chamador, a exigência é vacuamente satisfeita hoje e vira
  critério real na TASK-133. Arquivo da TASK-095 **não verificado nesta revisão**.
- **Contagem de tasks:** a TASK-131 nasceu depois do total de 8 tasks não concluídas (em
  `9cc4fa0`), então o total **permanece 8** — 6 executáveis, TASK-038 com bloqueio parcial e
  TASK-040 bloqueada. Nenhuma task foi absorvida ou substituída por esta correção.

## Decisão

**Aprovado.** A rodada de correção faz exatamente o que a ressalva pedia, nos dois arquivos
que a ressalva citava, sem tocar mais nada. O `distanciaM` deixou de inventar um `0` que
significaria a leitura mais forte possível ("coordenada sobre a via") justamente no caso de
menor informação; a escolha do guarda `Number.isFinite` preserva o zero **legítimo**, que é o
caso comum de quem clica em cima da rodovia; e os quatro testes novos fixam a distinção entre
"sem distância" e "distância zero" por ausência de chave, não por valor `undefined`.

As conclusões estruturais da revisão anterior seguem válidas no estado atual: a política de
falha bloqueante do `/route` (RN-048, criticidade Alta) permanece intocada e o novo cliente
continua incapaz de bloquear qualquer coisa — não por disciplina, mas porque não importa o
tipo que bloqueia. Evidência canônica verde e coerente com o código corrigido (1674 testes,
+4 em relação à entrega original), reutilizada sem repetir a suíte; `typecheck` e `lint`
limpos nesta revisão.

**Sem condição de merge e sem ressalva remanescente.** As duas observações informativas
acima são ponteiros para a TASK-133 (ler o tipo, não o texto do critério de aceite) e para
uma eventual futura ativação de `exactOptionalPropertyTypes` — nenhuma delas é dívida desta
task.
