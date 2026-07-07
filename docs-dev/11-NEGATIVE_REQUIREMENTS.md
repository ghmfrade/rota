# 11 — NEGATIVE_REQUIREMENTS: O Que o Sistema NÃO Deve Fazer

O maior risco do desenvolvimento com IA é adicionar coisa bonita, plausível e **fora de escopo**. Este documento é o freio. Cada item tem ID `NEG-xxx` estável e instrução de revisão. Regras normativas correspondentes: Grupo 20 do `01-RULE_INDEX.md`.

---

## NEG-001 — O ROTA não deve gerenciar processo

**O que é proibido:** qualquer modelagem de ciclo de vida de pedido: rascunho/em análise/aprovado, tramitação, fila de trabalho, atribuição a técnico.
**Por que é proibido:** a gestão é do SEI (Spec 01 §1/§3); duplicá-la cria duas fontes de verdade e recoloca o ROTA no desenho v0.1, deliberadamente abandonado.
**Risco se a IA implementar errado:** o app "evolui" para um mini-SEI; o JSON ganha campos de estado; o Comparador passa a acusar diffs falsos.
**Como revisar:** buscar por termos como `status` (fora de `autos.status`), `workflow`, `etapa`, `analise`, `tramit` no diff; checklist Escopo do `07`.

## NEG-002 — O ROTA não deve aprovar pedido

**O que é proibido:** botão/ação/campo de aprovar, reprovar, homologar; "definir como vigente" **não** é aprovação (é ação técnica pós-SEI — Spec 04 §12.2).
**Por que é proibido:** aprovação é ato administrativo do SEI.
**Risco:** usuários passam a tratar o ROTA como fonte da vigência real.
**Como revisar:** a ação "definir como vigente" apenas pede `data_publicacao` e gera arquivo; nenhum estado interno muda de "não aprovado" para "aprovado".

## NEG-003 — O ROTA não deve ter status de análise

**O que é proibido:** campos/telas de situação da análise técnica (em revisão, com pendência, aguardando empresa).
**Por que é proibido:** Spec 01 §3 — não-escopo explícito.
**Risco:** JSON contaminado com fluxo → diff falso, ingestão suja.
**Como revisar:** schema fechado deve rejeitar; teste de contrato negativo (RN-010).

## NEG-004 — O ROTA não deve armazenar pendências

**O que é proibido:** persistir pendências de processo (as *pendências de validação* da Spec 04 §11 são efêmeras, de sessão, e nunca vão para o JSON).
**Por que é proibido:** pendência de processo é diálogo técnico↔empresa, que ocorre por e-mail via SEI.
**Risco:** confusão entre pendência de validação (ok, efêmera) e pendência de processo (proibida).
**Como revisar:** o JSON exportado nunca contém lista de pendências; o painel de pendências zera ao recarregar o arquivo (recalculado, não persistido).

## NEG-005 — O ROTA não deve registrar manifestações técnicas

**O que é proibido:** campos de parecer, concordância, justificativa, comentário de análise.
**Por que é proibido:** Spec 01 §3/§4 (termos removidos do glossário).
**Risco:** vira sistema de comunicação paralelo ao SEI.
**Como revisar:** inexistência de campos de texto livre "de análise" no JSON e nas telas.

## NEG-006 — O ROTA não deve substituir o SEI

**O que é proibido:** qualquer funcionalidade cujo argumento seja "assim não precisa ir ao SEI".
**Por que é proibido:** o produto é apoio à elaboração; o processo é do SEI (DEC-001/002).
**Risco:** institucionalmente inaceitável; PDFs sem valor oficial tratados como oficiais.
**Como revisar:** avisos obrigatórios presentes nos PDFs (RN-077); nenhuma promessa de oficialidade na UX.

## NEG-007 — O JSON não deve ter dados de workflow

**O que é proibido:** status (além de `autos.status` proposta/vigente), autor, prazo, DOE, histórico, permissões, timestamps de tramitação.
**Por que é proibido:** Spec 02 §16 — o JSON é só operação; a exceção é estreita e documentada (RN-011).
**Risco:** todo leitor (Comparador, Ingestor) herda o lixo; diffs falsos.
**Como revisar:** teste de contrato com schema fechado; revisão de qualquer campo novo contra a Spec 02.

## NEG-008 — O Comparador não deve alterar JSON

**O que é proibido:** escrever nos arquivos de entrada, "corrigir" dados, gravar o resultado do comparativo dentro do JSON, persistir no servidor.
**Por que é proibido:** Comparador é somente-leitura (Spec 05 §2; RN-080).
**Risco:** o comparativo vira dado de operação e contamina o contrato.
**Como revisar:** teste de imutabilidade (hash dos objetos de entrada antes/depois); nenhuma API de escrita.

## NEG-009 — O Formulário não deve salvar no servidor

**O que é proibido:** endpoints de escrita, banco, storage, autosave em nuvem, "histórico de versões" server-side.
**Por que é proibido:** exportar o JSON **é** o salvar (Spec 01 §5; RN-096).
**Risco:** nasce um backend transacional e, com ele, autenticação, permissão, auditoria — o pacote inteiro que o projeto excluiu.
**Como revisar:** nenhuma rota de API de escrita no app; E2E confirma operação 100% client-side.

## NEG-010 — O Ingestor não deve ser antecipado no MVP

**O que é proibido:** implementar ingestão, modelos PostgreSQL, migrações ou "esqueletos" de Ingestor antes da Spec 06 + decisão humana.
**Por que é proibido:** RN-093; Spec 06 não existe; o desenho do banco depende de decisões não tomadas.
**Risco:** retrabalho e acoplamento prematuro do contrato ao banco.
**Como revisar:** nenhum código/dep de banco no repositório até decisão registrada no `10-DECISION_LOG.md`.

## NEG-011 — Ponto de rota não deve virar parada

**O que é proibido:** dar `uuid`, nome, município, horário ou trecho a ponto de rota; exibi-lo na tabela de paradas; contá-lo em matriz.
**Por que é proibido:** propósito único de condicionar o traçado (Spec 03 §3.6; RN-042).
**Risco:** o invariante trechos = paradas−1 quebra; matrizes e horários corrompem.
**Como revisar:** testes do invariante; UI mostra ponto de rota em sub-lista própria sem rótulo.

## NEG-012 — Local não deve virar Seção automaticamente

**O que é proibido:** "promover" Local a Seção (ou vice-versa) preservando a entidade; inferir tarifa de um Local.
**Por que é proibido:** são entidades distintas por decisão (DEC-013); conversão implícita mascara decisão tarifária.
**Risco:** tarifa aplicada a ponto comum; seccionamento inconsistente.
**Como revisar:** não existe ação de conversão; criar Seção onde havia Local é criação nova (UUID nova) com remoção explícita do Local.

## NEG-013 — `numero_n` não deve ser usado como identidade

**O que é proibido:** casar, indexar, persistir ou deduplicar por `numero_n` (ou por `nome` de Seção/Local).
**Por que é proibido:** é display, reaproveitável (RN-006).
**Risco:** diff e ingestão erradas quando o rótulo muda.
**Como revisar:** grep por `numero_n` em código de diff/chave; testes RN-006.

## NEG-014 — UUID não deve ser regenerada na importação

**O que é proibido:** gerar UUIDs novas para entidades vindas do arquivo, "normalizar" UUIDs, reindexar.
**Por que é proibido:** regra dura RN-004 — sem ela o Comparador é inútil.
**Risco:** diff "removeu tudo e criou tudo"; perda da baseline.
**Como revisar:** teste de round-trip obrigatório em qualquer task que toque import.

## NEG-015 — Rota sem cálculo OSRM válido não deve ser aceita como final

**O que é proibido:** fallback de linha reta, distância digitada à mão, "usar a última rota conhecida" silenciosamente, exportar com itinerário sem rota.
**Por que é proibido:** a distância roteada alimenta a tarifa (DEC-011; RN-048).
**Risco:** tabela tarifária inválida peticionada no SEI.
**Como revisar:** testes de bloqueio com mock de falha; gate de exportação.

## NEG-016 — Sem autenticação de fluxo, permissões ou auditoria

**O que é proibido:** login, papéis, controle de acesso, trilha de auditoria de quem editou o quê.
**Por que é proibido:** Spec 01 §3 — não-escopo ("o ROTA não tem modelo de estado nem de permissões").
**Risco:** puxa backend e gestão de identidade sem necessidade.
**Como revisar:** nenhuma dependência de auth no projeto.

## NEG-017 — Sem R$ em JSON, telas e PDFs (nesta versão)

**O que é proibido:** persistir/exibir valores monetários; embutir a tabela de tarifa da portaria no contrato.
**Por que é proibido:** DEC-022; conversão é externa e muda por portaria.
**Risco:** valores desatualizados com aparência oficial.
**Como revisar:** teste de ausência de "R$"; schema sem campos monetários.

## NEG-018 — Não misturar feriado nas contagens

**O que é proibido:** somar viagens de feriado a viagens semanais/opções de deslocamento; exibir contagem sem o rótulo "semana padrão (sem feriados)".
**Por que é proibido:** RN-069 — o ROTA não sabe quando cai feriado (calendário externo).
**Risco:** estatísticas erradas no PDF e no diff.
**Como revisar:** teste "JSONs que diferem só em feriado têm contagens idênticas"; rótulo presente.

## NEG-019 — Leitores não recalculam o congelado

**O que é proibido:** Comparador/Ingestor/PDF chamarem OSRM, re-derivarem município, recomputarem matriz/descrição/horário.
**Por que é proibido:** RN-015 — o documento é autoconsistente; recalcular gera divergência com o que foi assinado/peticionado.
**Risco:** o mesmo arquivo "muda" dependendo de quem lê.
**Como revisar:** teste de operação offline; espião de rede zerado.

## NEG-020 — Não acoplar Comparador ao Formulário (nem exigir Ingestor)

**O que é proibido:** fluxo do Formulário que dependa do Comparador (ou vice-versa); import direto de estado entre ferramentas; qualquer feature que exija o Ingestor para funcionar.
**Por que é proibido:** DEC-003 — desacoplamento total; contrato único é o arquivo JSON.
**Risco:** entrelaçamento que impede evolução independente.
**Como revisar:** dependências entre módulos `formulario/` e `comparador/` restritas a `shared/` (contrato); revisão de imports.
