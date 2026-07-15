# 07 — Checklist de Aderência à Spec

Use em **toda** entrega (IA ou humana), antes do merge. Itens não aplicáveis à task: marcar `N/A`. Qualquer item aplicável não atendido → entrega **reprovada ou com ressalvas** (`14-REVIEW_REPORT_TEMPLATE.md`).

## Escopo

- [ ] A alteração pertence ao ROTA, e não ao SEI? (RN-095)
- [ ] A alteração não introduz workflow (status de análise, aprovação, pendência de processo, manifestação, histórico)? (RN-095)
- [ ] A alteração não cria status de pedido além da exceção `autos.status` proposta/vigente? (RN-011)
- [ ] A alteração não cria persistência transacional indevida (banco, endpoint de escrita, storage servidor)? (RN-096)
- [ ] A entrega implementa **apenas** o escopo da task (nada "aproveitado")?
- [ ] Nenhuma regra nova foi inventada — toda decisão cita `Spec XX §YY` ou `RN-xxx`, ou está marcada como inferência controlada?

## JSON (contrato)

- [ ] O JSON continua contendo apenas dados de operação? (RN-010)
- [ ] O JSON continua autossuficiente (leitores não precisam de recurso externo)? (RN-009)
- [ ] Nenhum campo novo foi adicionado sem alteração prévia da Spec 02?
- [ ] UUIDs existentes são preservadas em importação/edição? (RN-004)
- [ ] Entidades novas (inclusive cópias) recebem UUID nova? (RN-002, RN-007)
- [ ] Paradas referenciam Seção OU Local, nunca ambos, nunca nenhum? (RN-033)
- [ ] Nenhum valor monetário (R$) entrou no JSON? (RN-013)
- [ ] Distâncias em km, durações em segundos, arredondamento half-up 2 casas onde aplicável? (RN-014, RN-050)
- [ ] Dados congelados (rota, trechos, matrizes, descrição, município) não são recalculados por leitores? (RN-015)

## Domínio

- [ ] Seção e Local continuam entidades separadas (sem "papel", sem promoção automática)? (RN-025, RN-031)
- [ ] Ponto de rota não foi tratado como parada/Seção/Local (sem uuid, sem trecho, sem tarifa)? (RN-042)
- [ ] Serviço mantém identidade por UUID? (RN-001)
- [ ] `numero_n` não foi usado como identidade em nenhuma lógica? (RN-006)
- [ ] Extremos de itinerário continuam sendo Seções? (RN-035)
- [ ] Ida e Volta continuam referenciando o mesmo conjunto de Seções quando ambos existem? (RN-030)
- [ ] Tipificação tipo × característica respeitada (famílias, litoralidade, veículo único)? (RN-019..022)
- [ ] Viagem continua estratificada (um `dia_semana` + `viagem_feriado` booleano)? (RN-061)
- [ ] Feriado continua fora das contagens, com rótulo "semana padrão (sem feriados)"? (RN-069)

## Comparador

- [ ] Comparação usa UUID como base (nunca rótulo)? (RN-081)
- [ ] Entidade removida/adicionada/alterada/inalterada é identificada corretamente? (RN-081..083)
- [ ] O comparativo não foi gravado dentro do JSON nem altera os arquivos? (RN-080, RN-097)
- [ ] `status`/datas continuam fora do diff? (RN-012)
- [ ] Autos diferentes continuam bloqueando a comparação principal? (RN-084)
- [ ] Rota comparada por sinais estáveis, não por geometria byte-a-byte? (RN-087)
- [ ] Comparador continua sem chamar OSRM e sem persistir nada? (RN-080)

## Roteamento

- [ ] OSRM indisponível bloqueia rota inválida (sem fallback de linha reta, sem distância inventada)? (RN-048)
- [ ] Distância roteada vem exclusivamente do OSRM, convertida na fronteira? (RN-047, RN-050)
- [ ] Pontos de rota apenas condicionam o traçado (invariante trechos = paradas−1 preservado)? (RN-041..043)
- [ ] Abrir JSON continua sem chamar OSRM? (RN-052)
- [ ] Mensagens de erro seguem a Spec 04 §14 e não mencionam tarifa? (RN-049)

## UI/PDF (quando aplicável)

- [ ] Nomes de Seção no padrão `Cidade - Nome da Seção` em telas, tabelas, matrizes e PDF? (RN-076)
- [ ] Usuário digita horários de relógio; offsets não aparecem (nem no PDF)? (RN-067, RN-076)
- [ ] Matrizes triangulares inferiores, em km, sem R$? (RN-076)
- [ ] Locais fora da grade principal, da descrição textual e do corpo do PDF (só anexo)? (RN-031, RN-044, RN-076)
- [ ] Aviso de fronteira com o SEI presente nos PDFs? (RN-077)
- [ ] Exportação bloqueada com pendências bloqueantes? (RN-078)
- [ ] UI aderente ao design system (`18-DESIGN_SYSTEM.md`): componentes de `shared/ui`, tokens do `@theme`, sem `style=` inline fora das exceções? (DEC-050)
- [ ] `data-testid` e `aria-*` existentes preservados (E2E passam sem alterar seletores)? (DEC-050)

## Testes

- [ ] Toda regra RN alterada/implementada possui teste? (matriz `03`)
- [ ] Casos inválidos foram testados (não só o caminho feliz)?
- [ ] Há teste de regressão para UUID quando a task toca import/export/cópia? (RN-004, RN-007)
- [ ] Testes de roteamento usam mock do OSRM (nenhum teste depende do serviço público)?
- [ ] Fixtures canônicas reutilizadas (não inventar JSON ad hoc divergente do schema)?
- [ ] Verificações (typecheck/lint/testes) executadas e com resultado reportado honestamente?
