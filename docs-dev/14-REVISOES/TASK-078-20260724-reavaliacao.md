# Revisão da TASK-078 — reavaliação após correção da reprovação

**Revisor:** Claude (revisão automatizada, conversa separada da implementação)
**Data:** 2026-07-24
**Commit/branch revisado:** `714028b` (branch `redesign`) — correção da reprovação registrada em `b8d0301` sobre a entrega original `4bd5703`.

## Resultado

- [x] **Aprovado**
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

Reavaliação do único defeito que reprovou a TASK-078 na primeira passagem
(`14-REVISOES/TASK-078-20260724.md`): o arrasto com o **botão direito** transladava a
Seção inteira em vez de mover só o ponto do Serviço/sentido corrente, porque o `mousedown`
custom do botão direito chamava apenas `evento.preventDefault()`, deixando o evento
borbulhar até o container do mapa e engatar o arrasto nativo do MapLibre. A correção
(`714028b`) adiciona `evento.stopPropagation()` no `mousedown` quando `button === 2`
([mapa.tsx:606](../../src/shared/mapa/mapa.tsx#L606)) e substitui a cobertura de teste que
dava falso verde por testes que exercitam a interação real — um E2E de navegador real
(dois casos) e um mock de `Marker` que agora modela o `_addDragHandler` nativo. Nenhuma
mudança na lógica de domínio (`transladarSecao`, cascata `aoTransladarSecao`), que já
estava correta e foi preservada.

## Correção verificada (causa-raiz da reprovação, agora fechada)

A reprovação apontou que `preventDefault()` não impede o arrasto nativo, pois este é ligado
ao `mousedown` **sintético do mapa** (`_addDragHandler`), sem filtro de botão. A correção
usa `stopPropagation()`. Confirmei o mecanismo no código-fonte real do maplibre-gl 5.24.0
instalado:

- O `_addDragHandler` é ligado ao `mousedown` do mapa via `this._map.on('mousedown', this._addDragHandler)`
  (`node_modules/maplibre-gl/dist/maplibre-gl-dev.js:75023`).
- Esse evento sintético é gerado por um listener DOM que o `MapEventHandler` registra em
  **`getCanvasContainer()`** (`el = map.getCanvasContainer()` na criação do handler,
  linha 68412; `element.addEventListener('mousedown', this.mousedown)`, linha 74271).
- O elemento do `Marker` é **filho** desse container (`map.getCanvasContainer().appendChild(this._element)`,
  linha 74707); o listener nativo do próprio marcador (linha 74674) só chama `preventDefault()`,
  nunca `stopPropagation()`.

Logo, o arrasto nativo depende da **propagação por borbulhamento** do `mousedown` do
marcador até o container. `evento.stopPropagation()` no listener custom do marcador (fase
de borbulhamento, no alvo) impede o evento de alcançar o container → o `MapEventHandler`
não gera o `mousedown` sintético → `_addDragHandler` não roda → **o arrasto nativo não
engata no botão direito**. Como a supressão é condicionada a `button === 2`, o botão
esquerdo continua borbulhando e transladando (translação rígida do cluster). A correção é
exatamente a apontada como caminho de correção nº 1 do parecer de reprovação.

## Test gap fechado (a falsa confiança do parecer anterior)

O parecer de reprovação mostrou que o teste unitário guardião passava só porque o `Marker`
mockado nunca ligava o `mousedown` DOM ao arrasto nativo. A correção reescreve o dublê:

- O mock do `Marker` agora modela o `_addDragHandler` real —
  `addTo` anexa o elemento ao `getCanvasContainer()` do mock e, quando `draggable`, liga um
  listener de `mousedown` **no container** que dispara `dragstart`/`dragend` se o alvo está
  dentro do elemento, **sem filtrar botão** ([mapa.test.tsx](../../testes/unitarios/mapa/mapa.test.tsx))
  — fiel ao acoplamento que quebrava em produção.
- Sentinela nova de fidelidade: "botão esquerdo real (mousedown DOM que borbulha até o
  container) engata o arrasto nativo e chama `aoArrastar`, não `aoArrastarComBotaoDireito`"
  — prova que a supressão é **seletiva por botão**, não um bloqueio geral do `mousedown`.
- Com o mock fiel, a asserção "botão direito não chama `aoArrastar`" só passa se o
  `stopPropagation` estiver de fato implementado.

E2E de navegador real (sem dublê do MapLibre), em `testes/e2e/etapa-itinerarios.spec.ts`:
- **botão ESQUERDO** revela o cluster em cor neutra durante o arrasto (translação real
  engata) — passou;
- **botão DIREITO NÃO revela o cluster** (regressão-guarda do defeito exato da reprovação),
  e não abre `contextmenu`/menu — passou.

Isso fecha a lacuna "regra da task sem teste válido" que sustentava a reprovação: a
distinção de botão agora tem teste que exercita a interação real, em dois níveis.

## Regras RN verificadas

- **RN-004/001** — atendida: `transladarSecao` preserva `secao.uuid` (`...entrada.secao`) e
  cada `servico_uuid` de `secao.servicos[]`, nunca cria/descarta entradas
  ([fluxos-secao.ts:269-291](../../src/formulario/secoes/fluxos-secao.ts#L269-L291)). Coberta
  por teste próprio (inalterada desde a entrega original).
- **RN-027 (350 m)** — atendida por construção: a translação aplica o mesmo vetor a todos os
  pontos; distâncias ao centroide inalteradas, nenhuma recusa por 350 m possível no botão
  esquerdo.
- **RN-029 (município re-derivado; fora de SP recusa)** — atendida: `derivarMunicipio` sobre
  o novo centroide; `fora_de_sp` recusa integral (nenhum ponto movido).
- **RN-052 (recálculo em cascata)** — atendida na camada de host (`aoTransladarSecao`
  recalcula todos os itinerários dos Serviços que referenciam a Seção) e **agora alcançável
  pelo gesto pretendido**: o botão direito deixa de sequestrar o gesto do botão esquerdo.
- **RN-048 (falha de OSRM isolada por itinerário)** — atendida na cascata (inalterada).
- **RN-054..057 (matrizes reconciliadas)** — atendidas na cascata (inalteradas).

## Specs verificadas

- **Spec 04 §7.1** (arrasto por ponto vs. translação) — **aderente**: a distinção por botão
  agora isola o arrasto por ponto (direito) da translação (esquerdo), provado em navegador
  real. Era o item "divergente na integração" da reprovação.
- **Spec 03 §7.2/§2.3** (350 m preservado, município derivado) — aderente na função pura.

## Pontos corretos

- `stopPropagation()` cirúrgico e condicionado ao botão, com comentário que explica a
  causa-raiz e o porquê de `preventDefault()` sozinho não bastar.
- Correção da lógica de domínio: **nenhuma** — a `transladarSecao` e a cascata, corretas
  desde a origem, não foram tocadas; o defeito era exclusivo de integração de gesto e a
  correção ficou restrita a ele.
- Testes reforçados atacam justamente a interação que antes era mockada de forma
  complacente; o mock ficou mais fiel ao MapLibre real (não só mais um caso feliz).
- Supressão do `contextmenu` nativo preservada e reafirmada por asserção no E2E do botão
  direito (não abre `menuitem`).

## Problemas encontrados

Nenhum. O único defeito que reprovava a task foi corrigido e está guardado por teste que
exercita a interação real.

## Violações de escopo

Nenhuma. A correção toca só `src/shared/mapa/mapa.tsx` (+6 linhas: `stopPropagation` +
comentário) e os dois arquivos de teste. Sem mudança de contrato JSON/schema, sem campo de
fluxo, sem `data-testid`/`aria-*` existente alterado.

## Testes avaliados

- cobertura das RN da task: **sim** — função pura (UUID/350 m/município/fora de SP), cascata
  (RN-052/048) e **distinção de botão** (unitário fiel + E2E real) todas cobertas.
- casos inválidos testados: sim (fora de SP na função pura; botão direito não engata a
  translação — regressão-guarda em navegador real).
- regressão de UUID: sim (função pura, teste próprio).
- OSRM mockado: sim (E2E roteia `router.project-osrm.org` para resposta mockada).
- suíte executada com resultado: **verde**. `npm run test:all:verificar` validou o log
  canônico sem repetir a suíte — Executor: **Claude**; Fingerprint:
  `0d01cc6a57f67cce4c9adad5232a5359f45ad63d41ec7734d6e76546b9ed5a4a`; Working tree:
  `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`. Marcador final
  presente, códigos 0/0, `Resultado geral: APROVADO`. Unitários: 1201 passed (92 arquivos).
  E2E: 69 passed — incluindo os dois novos casos TASK-078 (`ok 23` botão esquerdo revela o
  cluster; `ok 24` botão direito **não** revela). O fingerprint mudou em relação ao log da
  reprovação (`3f6a44e…` → `0d01cc6a…`), confirmando que o log reflete o código corrigido
  (o fingerprint cobre `src/` e `testes/`); a identidade do working tree é a mesma por ser
  o mesmo diretório (hash do caminho, não do conteúdo).

## Checklist 07

Escopo, JSON (contrato intocado), domínio, roteamento, UI/PDF (nenhum `data-testid`/`aria-*`
alterado): itens aplicáveis atendidos. **Testes**: os itens "Toda regra RN implementada
possui teste", "Casos inválidos testados", "OSRM mockado" e "evidência de uma única
execução `test:all:log` confirmada por `test:all:verificar`" — **agora atendidos** (eram os
itens não atendidos na reprovação). Demais itens N/A.

## Pendências

Nenhuma impeditiva. Ponteiro (sem afirmação de comportamento): a **TASK-100** (DEC-080)
reusa o motor de translação (`transladarSecao`) que esta task introduz, com destino fixo —
fica liberada a partir da entrega aprovada da 078.

## Histórico

- Entrega original `4bd5703` — **reprovada** em `b8d0301`
  (`14-REVISOES/TASK-078-20260724.md`): botão direito indistinguível do esquerdo.
- Correção `714028b` — **esta reavaliação**: defeito fechado, aprovado.

## Decisão

**Aprovado.** O mecanismo central da task — a distinção de gesto por botão (DEC-079) —
passou a funcionar em uso real: com `stopPropagation()` no `mousedown` do botão direito, o
arrasto nativo do MapLibre não engata, o botão direito move só o ponto do Serviço/sentido
corrente e o botão esquerdo translada a Seção inteira. A causa-raiz da reprovação foi
confirmada no código-fonte do maplibre-gl instalado e a correção é exatamente a indicada no
caminho de correção do parecer anterior. O teste que dava falso verde foi substituído por
cobertura que exercita a interação real (mock fiel do `_addDragHandler` + E2E de navegador
real com regressão-guarda dos dois botões). A lógica de domínio, correta desde a origem
(`transladarSecao` preserva UUIDs/350 m/município; cascata recalcula todos os Serviços —
RN-004/027/029/052/048/054..057), foi preservada. Suíte canônica verde, com os dois novos
E2E cobrindo o defeito. Escopo exato, sem mudança de contrato. Task concluída.
