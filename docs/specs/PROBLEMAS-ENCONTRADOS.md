# Problemas Encontrados na Revisão das Specs 01 e 02

Data da revisão: 2026-07-01

---

## 🔴 Problemas Estruturais (merecem correção antes da Spec 03)

### 1. `matriz_distancias` "todos os pares" é impossível de satisfazer em alguns casos

**Referência:** Spec 02 §8 (linhas 170-192), validação estrutural §14 (linhas 348-349).

**Problema:** A validação exige uma entrada para **cada par não-ordenado** de Seções distintas atendidas (união Ida+Volta), e exige que ao menos um de `distancia_trecho_ida`/`volta` esteja presente. Mas a distância só existe se **um mesmo itinerário** contém as duas Seções. 

**Cenário de quebra:** Se uma Seção B é atendida **só na Ida** e uma Seção D é atendida **só na Volta** (caso legítimo: semidireta que difere entre sentidos, permitida pela Spec 01 §8), o par **B‑D não ocorre em nenhum itinerário** → nenhum trecho de rota conecta as duas → impossível calcular a distância → regra insatisfazível.

**Solução necessária:** Decidir a regra de negócio na Spec 03:
- **Opção A:** Exigir que Ida e Volta atendam o **mesmo conjunto** de Seções (restrição de modelo).
- **Opção B:** Restringir os pares exigidos aos que **co-ocorrem num itinerário** (Ida ou Volta, mas no mesmo itinerário).
- Alinhar com a validação estrutural da Spec 02 §14.

---

### 2. Mistura de unidades: metros em `matriz_distancias`, km em `matriz_seccionamento`

**Referência:** Spec 02 §8 (linha 184-186: metros) vs §9 (linha 208-210: km).

**Problema:** 
- `matriz_distancias` usa **metros**: `"valor_adotado_de_distancia": 8000` 
- `matriz_seccionamento` usa **km**: `"distancia_km": 8`
- A regra de sugestão (Spec 02 §9, linha 210) lê `valor_adotado_de_distancia` (metros) para preencher `distancia_km` (km) — conversão ÷1000 implícita, footgun clássico de erro de unidade.

**Consequência:** Risco de conversão errada, valores não conferem durante validação/geração de PDF.

**Solução:** Na Spec 03, deixar explícito:
- Conversão metros → km (divisão por 1000, arredondamento?).
- Validar que os valores batem na geração do JSON.
- Reforçar na Spec 04 (Formulário) a conversão de unidades.

---

### 3. UUIDs do exemplo violam a própria validação de formato

**Referência:** Spec 02 §14 (linha 340: exige UUIDv4 válido) vs §15 (linhas 370+: exemplo com `"sec-0001-..."`, `"loc-0001-..."`).

**Problema:** Exemplos usam `"sec-0001-4a3b-9c4d-5e6f7a8b9c0d"`, `"loc-0001-4a3b-9c4d-5e6f7a8b9c0d"`, etc. — **não são UUIDv4 válidos**. A validação estrutural exige formato UUIDv4 (Spec 02 §14, linha 340).

**Impacto:** Reduz confiança no exemplo; código que valide formato quebra no exemplo.

**Solução:** Gerar UUIDs reais (UUIDv4 válidos) para o exemplo, ou marcar explicitamente como "ilustrativo, não conforme para fins de validação".

---

### 4. Unicidade de UUID de Local é por-Serviço, mas o Ingestor assume global

**Referência:** Spec 02 §12 (linha 298: "Local: dentro do Serviço") vs Spec 01 §6 (linha 122: "a UUID vira o id da linha no PostgreSQL").

**Problema:** 
- Spec 02 define unicidade de Local como **local ao Serviço** ("Para Local, a unicidade é dentro do escopo do Serviço").
- Spec 01 assume que UUID é **identidade global** para o Ingestor ("no Ingestor, a UUID vira o id da linha no PostgreSQL — a identidade do Serviço é a mesma em formulário → JSON → banco").

**Cenário:** Dois Serviços do mesmo Autos podem ter Locais com o mesmo UUID (colisão aceita). Ao ingerir no PostgreSQL, **qual Local vence?** A arquitetura do Ingestor quebra.

**Nota de risco:** Com UUIDv4 aleatório, a colisão é desprezível (~1/5×10³⁶). Mas o **contrato é mais fraco** que a garantia que o Ingestor assume.

**Solução:** Estender a regra de unicidade de Local para **global** (único no documento inteiro), alinhando com Seção, Serviço e Viagem. Atualizar Spec 02 §12.

---

## 🟡 Desalinhamento Spec 01 ↔ Spec 02

### 5. Terminologia "Ponto/papel" (Spec 01) já foi substituída por "Seção/Local" (Spec 02)

**Referência:** Spec 01 §4 (glossário, linhas 82-83), §5 (linha 99-100), §8 (linha 152) vs Spec 02 §13.6 (linha 318).

**Problema:** Spec 01 ainda descreve o modelo com terminologia antiga:
- Glossário (§4): "Ponto (de operação)", "Papel do ponto", "Cada Autos tem seus próprios pontos".
- §5: "Paradas (com pontos embutidos)" e "a `matriz_seccionamento` referencia pares desses pontos".
- §8: "Ponto georreferenciado global deixa de existir. Cada Autos tem seus próprios pontos".

A Spec 02 §13.6 **eliminou explicitamente** o campo `papel` e substituiu "Ponto" por dois conceitos: **Seção** (entidade do Autos, compartilhada) e **Local** (entidade do Serviço, não compartilhado).

**Impacto:** Quem lê Spec 01 fica confuso. A Spec 02 referencia "Seção", a Spec 01 fala de "Ponto". Parecem conceitos diferentes.

**Solução:** Atualizar Spec 01 §4 (glossário), §5 (descrição da árvore), §8 para usar "Seção" e "Local" corretamente, alinhado com a Spec 02.

---

### 6. Spec 01 §5 descreve a árvore de forma incorreta

**Referência:** Spec 01 §5 (linhas 99-100), Spec 02 §2 (linhas 23-49).

**Problema:**
- Spec 01 diz: "Paradas (com pontos embutidos)" — **incorreto**. Na Spec 02, Paradas **referenciam** pontos por uuid, não os embutem.
- Spec 01 diz: "a `matriz_seccionamento` referencia pares desses pontos" — **incorreto**. `matriz_seccionamento` referencia **Seções**, não pontos genéricos.

**Árvore correta** (Spec 02 §2):
```
autos.secoes[] (entidades, compartilhadas)
  └─ servicos[] (entrada por Serviço que usa a Seção)

servicos[].locais[] (entidades, não compartilhadas)

servicos[].itinerarios[].paradas[] (referências: secao_uuid XOR local_uuid)

servicos[].matriz_seccionamento[] (pares de secao_uuid)
```

**Solução:** Reescrever Spec 01 §5 com a árvore correta.

---

### 7. Spec 01 §6 e §8 listam só 2 das 4 entidades com UUID

**Referência:** Spec 01 §6 (linhas 109-115), §8 (linha 153) vs Spec 02 §12 (linhas 291-299).

**Problema:** Spec 01 menciona UUID em "Serviço" e "Ponto" (ao qual a Spec 02 chama "Seção" e "Local"). Mas a Spec 02 §12 tem **quatro** entidades com UUID obrigatória:
1. **Seção**
2. **Serviço**
3. **Local**
4. **Viagem** (decidido na Spec 02 §13.1)

Spec 01 §6 precisa ser atualizada para listar as 4, e §8 deve mencionar que Viagem também tem UUID estável.

**Solução:** Atualizar Spec 01 §6 e §8.

---

### 8. "Questões em Aberto" (Spec 01 §9) com higiene ruim

**Referência:** Spec 01 §9 (linhas 161-167).

**Problema:** 
- Itens 1‑3 estão resolvidos (UUID em Viagem, Caráter explícito, Horário relativo) e têm ~~risco~~ (riscados).
- Item 4 (`regra_feriado`) está genuinamente em aberto para a Spec 03.
- **Item 5** (limite de 350m, agora "Seção é entidade do Autos, regra de centroide cumulativo") diz "fixado na Spec 02" mas **não está riscado** — continua listado como aberto.

**Impacto:** Confunde leitor — qual questão está realmente aberta para as próximas specs?

**Solução:** Riscar itens 1-3 corretamente, riscar item 5 (resolvido na Spec 02), deixar só o item 4 genuinamente aberto.

---

## 🟢 Menores / a Observar

### 9. Comparador não está documentado que ignora campos meta no diff

**Referência:** Spec 02 §4.1 (linhas 89-93).

**Problema:** Spec 02 define que JSON tem `data_criacao` (se proposta) ou `data_publicacao` (se vigente). A **Spec 05 (Comparador)** não está escrita ainda, mas é óbvio que esse campo **não deve** gerar diff — `data_criacao` muda a cada export, senão todo diff acusaria "mudou a data de criação".

**Risco:** Sem deixar documentado, o Comparador pode erroneamente incluir esses campos no diff.

**Solução:** Adicionar nota na Spec 02 §4.1 ou criar anotação para ser retomada na Spec 05: "Campos `data_criacao`, `data_publicacao` e `status` não participam da comparação campo-a-campo no Comparador (Spec 05) — são apenas autodeclaração do documento."

---

### 10. Regra dos 350m depende da ordem de inserção e é inauditável

**Referência:** Spec 02 §5.2 (linhas 118-130).

**Problema:** O algoritmo de centroide cumulativo depende da **ordem de inserção** dos pontos. Um JSON final não guarda essa ordem (o array `servicos[].secoes[]` é só estrutura, sem histórico). Dois históricos de edição completamente diferentes podem produzir clusters diferentes.

A Spec 02 §5.2 já reconhece: "como esta regra depende da ordem de inserção (histórico de edição), sua validação plena só é possível no momento da edição, no Formulário (client-side)."

**Consequência:** O Comparador e o Ingestor **assumem que o documento já é válido** — não conseguem re-derivar a ordem nem validar a regra independentemente.

**Risco:** Se o JSON vier de fora (ex.: manualmente editado), ninguém consegue validar se a regra dos 350m foi respeitada.

**Solução:** Na Spec 03, documentar claramente:
- A validação plena (cumulativa) é responsabilidade do **Formulário** (Spec 04).
- Comparador (Spec 05) e Ingestor (Spec 06) **assumem válido**.
- Se necessário validar JSON de origem desconhecida, usar uma heurística menos rigorosa (ex.: todos os pontos da Seção a ≤350m do centroide final?).

---

### 11. `regra_feriado` é obrigatório mas enum não existe até Spec 03

**Referência:** Spec 02 §11 (linha 272): "`regra_feriado` é obrigatório" vs Spec 01 §9.4 (questão em aberto).

**Problema:** O campo é obrigatório no JSON, mas o enum de valores válidos **não é definido até a Spec 03**. Hoje é impossível validar qualquer JSON de forma estrita.

**Impacto:** Menor — é sequência lógica de specs — mas impede testes de validação antes da Spec 03.

**Solução:** Na Spec 02 §11, adicionar nota: "Enum de `regra_feriado` definido na Spec 03 §X". Na Spec 03, definir logo.

---

## Resumo Executivo

| Severidade | Qtd | Ação |
|---|---|---|
| 🔴 Estrutural | 4 | **Deve ser resolvido na Spec 03** (decisões de negócio) ou correção imediata em Spec 01/02 |
| 🟡 Desalinhamento | 4 | **Atualizar Spec 01** para alinhar com Spec 02 |
| 🟢 Menor | 3 | Registrar para Spec 03/04/05, documentação/risco baixo |

**Recomendação:** Antes de escrever a Spec 03, atualizar a Spec 01 (seções 4, 5, 6, 8, 9) para eliminar desalinhamento. Isso deixa as bases claras para a Spec 03 resolver os 4 problemas estruturais.
