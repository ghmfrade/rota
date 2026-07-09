# Revisão da TASK-008 (extensão — DEC-034)

**Revisor:** Claude (Opus 4.8), apoiando revisão humana
**Data:** 2026-07-09
**Commit/branch revisado:** `f5ccaca` (extensão) sobre `cfbadf6` (DEC-034), branch `master`. Escopo: a **extensão** da TASK-008 decorrente da DEC-034; o núcleo original já fora aprovado em `ac1c322`.

## Resultado

- [x] Aprovado
- [ ] Aprovado com ressalvas
- [ ] Reprovado

## Resumo da entrega

Extensão do módulo puro de tipificação (`src/shared/tipificacao/tabela.ts`) para materializar a DEC-034: campo `padrao` por tipo (`CR`/`CL`/`SU`/`SUL`), `caracteristicaPadrao(tipo)` e `reconverterServicosParaTipo(tipo, caracteristicas)` — que devolve o conjunto reconvertido e a lista de alterações `{indice, de, para}` para o aviso de UI. `servicosIncompativeisComTipo` foi mantida (recomentada como detecção que alimenta a reconversão). Testes em `testes/unitarios/tipificacao/tabela.test.ts`. Nenhum arquivo fora de `shared/tipificacao/` foi tocado.

## Regras RN verificadas

- **RN-023 — atendida.** Agora exprime reconversão ao padrão + aviso (não bloqueio), conforme DEC-034 e Spec 03 §10.4 / Spec 04 §5. Coberta por 7 casos, incluindo a invariante "nunca gera característica inválida".
- **RN-019/020/021/022 — atendidas e preservadas.** A tabela §10.2 não mudou; o `padrao` de cada tipo é sempre membro de `permitidas` (teste dedicado). `validarConjuntoDeCaracteristicas` intacta.
- **RN-024 — N/A** (não tocada; a reconversão só afeta `caracteristica_veiculo`).

## Specs verificadas

- **Spec 03 §10.2 — aderente:** partição por tipo inalterada; o `padrao` respeita família e litoralidade.
- **Spec 03 §10.4 — aderente:** reconversão "cega" ao padrão (não remapeamento `ME`→`MEL`), como a §10.4 corrigida e a DEC-034 determinam (opção (c) descartada). Evidência: teste `ME → CL`.
- **Spec 04 §5 — aderente à fronteira:** a mensagem/aviso e o gatilho de UI ficam explicitamente para a TASK-015 (comentado no código). Correto — é fronteira de UI, fora do módulo puro.

## Pontos corretos

- Módulo permanece puro (sem schema, UI ou OSRM) — respeita `13-ARCHITECTURE_GUARDRAILS` (`shared/`).
- `reconverterServicosParaTipo` preserva a ordem de entrada e só registra as posições alteradas — encaixe limpo no aviso da §5.
- `padrao` como campo explícito na tabela (em vez de `permitidas[0]`) evita acoplamento frágil à ordem do array.
- Invariante "nunca bloqueia" provada por teste sobre todo o enum.

## Problemas encontrados

Nenhum.

## Violações de escopo

Nenhuma. A extensão fica contida em `shared/tipificacao/`; não antecipa a UI da TASK-015 (só expõe o primitivo puro que ela consumirá). Sem "aproveitar para melhorar".

## Testes avaliados

- cobertura das RN da task: **sim** — RN-023 (reconversão) e a preservação de RN-019..022 têm testes; padrão por tipo testado 1 a 1.
- casos inválidos testados: **sim** — cross-família (`SU`→`CR`), litoralidade com neutro preservado (`EX`), cego≠esperto (`ME`→`CL`), conjunto vazio, já-compatível (sem alteração) e varredura do enum inteiro garantindo saída sempre válida.
- regressão de UUID: **N/A** (não toca import/export/cópia; só valores de enum).
- OSRM mockado: **N/A** (módulo não roteia).
- suíte executada com resultado: **verde** — `typecheck: OK`, `lint: OK`, tipificação 91/91; suíte completa 411/411.

## Checklist 07

- Escopo (6): ok — sem workflow, sem status além de `autos.status`, sem persistência; escopo exato; nenhuma regra inventada (cita Spec 03 §10 / DEC-034).
- JSON contrato (9): N/A em quase todos — nenhum campo novo, sem R$, sem recálculo de congelados; RN-010 ok (só troca `caracteristica_veiculo` entre valores do enum).
- Domínio: RN-019..022 ok; demais N/A.
- Comparador / Roteamento / UI-PDF: N/A.
- Testes (6): ok (RN com teste; casos inválidos; UUID N/A; OSRM N/A; sem fixture ad hoc; verificações reportadas honestamente).
- Resultado: itens aplicáveis **ok**, restantes **N/A**, **0 violados**.

## Pendências

- Nenhuma condição de merge. **Follow-up** (fora do escopo desta task): o comentário-TODO em `src/formulario/pendencias/pendencias.ts` (TASK-014) ainda lista "tipificação em revalidação" como bloqueante — será reescrito como alerta de reconversão quando as pendências da TASK-015 forem implementadas.

## Decisão

**Aprovado.** A extensão implementa exatamente a DEC-034, preserva as RN de tipificação existentes, não toca o contrato JSON nem cruza fronteiras de módulo, e vem com testes de casos válidos e inválidos, todos verdes. O primitivo puro está pronto para a TASK-015 consumir.
