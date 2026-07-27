# Reavaliação da TASK-101

**Revisor:** Codex
**Data:** 2026-07-27
**Commit/branch revisado:** `79a2ed3` (`redesign`), sobre a implementação
`4051430` e o parecer anterior `346c7e1`

## Resultado

- [x] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

A implementação reconcilia `secao.servicos[]` ao duplicar um Serviço completo:
cada Seção usada recebe uma contribuição identificada pela UUID nova da cópia,
com as geolocalizações disponíveis na contribuição original
(`src/formulario/servicos/duplicar.ts:104`). O commit de correção `79a2ed3`
acrescenta as provas que faltavam no parecer anterior: round-trip real,
monitoramento E2E de zero chamadas ao OSRM e caso inválido parcial.

## Regras RN verificadas

- RN-007 — atendida: `duplicarServico` cria UUIDs novas para Serviço, Locais e
  Viagens, preserva `parada.secao_uuid`, e a reconciliação acrescenta a
  contribuição própria da cópia (`duplicar.ts:56-91,104-158`).
- RN-026 — atendida: os sentidos presentes na cópia determinam quais
  geolocalizações são copiadas; o teste cobre Serviços bidirecional e
  unidirecional e a ausência parcial de uma coordenada exigida
  (`servicos-duplicar.test.ts:301-330,376-415`).
- RN-036 — atendida: o documento reconciliado passa na validação estrutural e o
  caso inválido parcial permanece inválido, sem coordenada inventada
  (`servicos-duplicar.test.ts:247-255,404-414`).
- RN-025 — atendida: as UUIDs das Seções compartilhadas e suas referências são
  preservadas; somente o array de contribuições das Seções usadas é ampliado
  (`duplicar.ts:121-156`).
- RN-018 — atendida: Seção não referenciada pela cópia não recebe contribuição
  órfã (`servicos-duplicar.test.ts:333-354`).
- RN-004/RN-005 — atendidas: o teste exporta e reimporta o documento duplicado,
  compara todas as UUIDs, referências de Seção e pares Seção×contribuição,
  confirma a presença da cópia e a unicidade global
  (`servicos-duplicar.test.ts:260-300`).

## Specs verificadas

- Spec 02 §5/§5.1 — aderente: uma contribuição por Serviço que usa a Seção,
  condicionada aos sentidos presentes.
- Spec 02 §12 — aderente: cópia recebe identidade nova; Seções e demais
  identidades existentes sobrevivem ao round-trip.
- Spec 02 §14 — aderente: documento duplicado válido passa no schema com as
  validações estruturais; origem parcialmente inválida não é mascarada.
- Spec 04 §6 — aderente: duplicação preserva as Seções compartilhadas,
  pré-preenche suas contribuições e não chama o OSRM.
- Spec 04 §7/§7.3 — aderente: o E2E abre a cópia na etapa de itinerários e
  encontra os três marcadores de Seção
  (`testes/e2e/servicos.spec.ts:194-224`).

## Pontos corretos

- A correção de cobertura alterou somente os dois arquivos de teste
  correspondentes às ressalvas; o código produtivo aprovado anteriormente
  permaneceu intacto.
- O round-trip usa as rotinas reais `exportarComoProposta` e
  `importarDocumento`, não uma serialização simulada.
- O E2E instala a interceptação antes de carregar o documento, abortaria
  qualquer chamada ao endpoint público e exige contagem zero ao final
  (`servicos.spec.ts:197-201,222`).
- A contribuição parcialmente inválida copia a Ida existente, não inventa a
  Volta ausente e mantém o documento reprovado pelo schema.
- Não há alteração de contrato, workflow, backend, persistência servidor,
  valores monetários, Comparador, rota ou matriz; NEG-001..020 permanecem
  respeitados.
- Nenhum `data-testid` ou `aria-*` foi alterado.

## Problemas encontrados

- Nenhum.

## Violações de escopo

- Nenhuma.

## Testes avaliados

- cobertura das RN da task: sim — RN-004/005/007/018/025/026/036
- casos inválidos testados: sim — Seção sem contribuição original, contribuição
  sem geolocalização exigida e Seção não referenciada
- regressão de UUID (se aplicável): sim — criação, preservação em memória,
  unicidade e round-trip exportação→importação do documento duplicado
- OSRM mockado: sim — o E2E intercepta o endpoint público, aborta eventual
  requisição e afirma zero chamadas
- suíte executada com resultado: verde; evidência reutilizada, executor
  `Codex`, fingerprint
  `2669b2eb2365f5cb47c397c78ac650f47d57997d55d1f7583cadd91c2a949461`,
  identidade do working tree
  `498d7fa6397724af2122bdced82f79ddd9749373d9277b227d3e2a3884f91763`;
  93 arquivos/1225 testes unitários e 73 E2E aprovados, códigos 0 e limpeza do
  servidor próprio confirmada

## Checklist 07

Resultado: **28 itens ok, 25 N/A, 0 violados**.

Os itens N/A concentram-se em Comparador, PDF, valores/unidades não alterados,
tipificação, viagens/feriados e algoritmos de roteamento fora do escopo. Todos
os itens aplicáveis de escopo, JSON, domínio, UI e testes foram atendidos.

## Pendências

- Nenhuma.

## Decisão

**Aprovado.** As três lacunas de cobertura do parecer anterior foram corrigidas
por testes dirigidos e passaram na evidência canônica do mesmo working tree. O
comportamento produtivo permanece aderente às RN e specs, o escopo é exato e o
checklist não contém violação. A TASK-101 pode sair da lista de pendentes e ser
marcada como concluída.
