# Prompt — Escrever a Spec 03 (Regras de Negócio e Cálculo)

Use este arquivo como briefing para gerar a **Spec 03 — Regras de Negócio e Cálculo** do projeto ROTA. Leia antes as specs [01](01-visao-geral.md) e [02](02-esquema-json-operacao.md), que são o contexto obrigatório.

---

## Contexto do projeto (resumo)

**ROTA** = WebApp de tabelas operacionais de linhas de ônibus intermunicipais (ARTESP/SUCOL). **Não é sistema de gestão** — todo fluxo/aprovação/pendência vive no SEI. São três ferramentas desacopladas unidas por um único contrato, o **JSON de operação**: **Formulário** (monta a operação, gera PDF + JSON, client-side, sem backend), **Comparador** (dois JSONs → diff → PDF comparativo), **Ingestor** (futuro, JSON aprovado → PostgreSQL).

**Stack:** React/Next.js SPA client-side, roteamento via OSRM público (`router.project-osrm.org`), mapa OSM/MapLibre. Sem backend transacional.

### Modelo de dados já fechado (Spec 02) — não reabrir
- Árvore: `Documento(versao_schema, autos)` → `autos(codigo, tipo, empresa, status, data_*, secoes[], servicos[])`.
- **Seção** é entidade do **Autos** (`autos.secoes[]`), compartilhada por todos os Serviços que passam por ali; define tarifa; cada Serviço contribui sua `geolocalizacao_ida/volta` via `secao.servicos[]`.
- **Local** (ponto comum, sem tarifa) vive no **Serviço** (`servico.locais[]`), não compartilhado.
- **Serviço**: `uuid, numero_n, caracteristica_veiculo, carater, locais[], matriz_distancias[], matriz_seccionamento[], itinerarios[]`.
- **Itinerário** (1 ou 2, `sentido` ida/volta): `paradas[]` (cada uma XOR `secao_uuid`/`local_uuid`), `rota{geometria, distancia_km, duracao_s, trechos[]}`, `viagens[]`. Quando um Serviço tem os dois itinerários, Ida e Volta referenciam o mesmo conjunto de Seções (só os Locais intermediários podem divergir).
- **Viagem**: `uuid, horario_saida, dias_semana[], regra_feriado, horarios_paradas[]` (offset por parada, por viagem).
- **UUID estável** (UUIDv4, client-side) em Seção, Serviço, Local, Viagem; unicidade **no documento inteiro** para as quatro (inclusive Local); preservada na reimportação; `numero_n` é só display.
- **Todo campo de distância do esquema é em km** — não há mais mistura de unidades: `rota.distancia_km`, `rota.trechos[].distancia_km`, `matriz_distancias` (`distancia_trecho_ida?`, `distancia_trecho_volta?`, `valor_adotado_de_distancia`, todos em km) e `matriz_seccionamento.distancia_km` usam a mesma unidade.
- **JSON nunca guarda R$** — só distâncias; tarifa em R$ é externa (portaria).

---

## Escopo da Spec 03 — o que ela DEVE definir

A Spec 02 empurrou explicitamente estes itens para a Spec 03. Cada um precisa virar seção com algoritmo/decisão:

1. **Cálculo de `matriz_distancias` a partir da rota** — como somar `rota.trechos[].distancia_km` entre a posição de duas Seções (incluindo os Locais intermediários) para produzir cada par; por Ida e por Volta.
2. **Composição de `valor_adotado_de_distancia`** — média simples entre ida/volta? outro critério? arredondamento? unidirecional = valor único.
3. **Sugestão de menor distância entre Serviços** para preencher `matriz_seccionamento.distancia_km` — ler `valor_adotado_de_distancia` de **todos** os Serviços do Autos que atendem o par, pegar o menor; ambos os campos já estão em km (Spec 02 §8), sem conversão de unidade necessária; é sugestão de UI (o JSON guarda o valor confirmado).
4. **Algoritmo de roteamento / chamada OSRM** — como montar a requisição, tratamento de indisponibilidade (mensagem de erro clara, não prosseguir — distância alimenta a tarifa), street-snapping, extração de `geometria`/`trechos`, e conversão da distância retornada pelo OSRM (metros) para `distancia_km`/`duracao_s` no momento de montar `rota`.
5. **Algoritmo do centroide para a regra dos 350 m** (§5.2 da Spec 02) — definir:
   - **Cálculo do centroide**: média simples de lat/long vs. centroide geodésico (escolher e justificar).
   - **Validação de inserção no Formulário (preservação de invariante)**: ao inserir um ponto numa Seção, não basta checar se o candidato está a ≤350 m do centroide atual — o algoritmo deve calcular o **centroide que resultaria** da inserção (pontos já aceitos + candidato) e **recusar** a inserção se, sob esse novo centroide, **qualquer ponto já aceito** passar a ficar a >350 m dele. Isso garante o invariante de que todos os pontos de uma Seção estão sempre ≤350 m do centroide final, não só do centroide vigente no momento em que cada um foi inserido (Spec 02 §5.2, parágrafo "Validação no momento da inserção").
   - **Checagem fraca para JSON de origem desconhecida** (Comparador/Ingestor, que não têm o histórico de inserção): calcular o centroide de todos os pontos finais de cada Seção e verificar se todos estão ≤350 m dele — necessária mas não estritamente equivalente à validação incremental; basta para sinalizar violação grosseira (Spec 02 §5.2, parágrafo "Validação de um JSON de origem desconhecida").
   - **Validação pareada equivalente para Local** (§7.1 da Spec 02) — sem clustering multi-serviço, só distância em linha reta entre `geolocalizacao_ida` e `geolocalizacao_volta` do mesmo Local.
   - Deixar claro o que é responsabilidade do **Formulário** (Spec 04) vs. o que é o algoritmo/decisão desta Spec 03.
6. **`regra_feriado`** — **definir o enum** (valores) e o **algoritmo de redistribuição proporcional de horários** em feriado (questão em aberto desde a Spec 01 §9.4).
7. **Sugestão inicial dos `offset_horario`** de cada Viagem a partir de `rota.trechos[].duracao_s` acumulados, editável pelo usuário.
8. **Regras de tipificação** `tipo` × `caracteristica_veiculo` permitido — tabela Semiurbano/Semiurbano Litorâneo (veículo único) × Rodoviário/Rodoviário Litorâneo (variação permitida), exclusividade RO/ROL, quais Serviços podem coexistir.
9. **Tabela oficial de tarifa a partir de `distancia_km`** — documentar que é externa (portaria), como o ROTA a referencia sem guardar R$ no JSON.

### Fora de escopo da Spec 03
Forma do JSON (é a Spec 02); UI/mapa/PDF (Spec 04); diff (Spec 05); PostgreSQL (Spec 06).

---

## Pendências das specs 01/02 já resolvidas (ver `PROBLEMAS-ENCONTRADOS.md`)

A revisão das Specs 01/02 encontrou 11 problemas, documentados em [`PROBLEMAS-ENCONTRADOS.md`](PROBLEMAS-ENCONTRADOS.md). Os 4 estruturais e os 4 de desalinhamento já foram corrigidos diretamente nas Specs 01/02 (não é mais trabalho da Spec 03):

- **`matriz_distancias` "todos os pares"** — resolvido exigindo que Ida e Volta, quando ambos existem, referenciem o mesmo conjunto de Seções (Spec 02 §2, §14).
- **Unidades metros × km** — resolvido: todo campo de distância do esquema (`rota.distancia_km`, `rota.trechos[].distancia_km`, `matriz_distancias`, `matriz_seccionamento.distancia_km`) está em km; só o OSRM fala em metros, na fronteira de entrada.
- **UUIDs do exemplo inválidos** — corrigido, exemplo da Spec 02 §15 agora usa UUIDv4 válidos.
- **Unicidade de UUID de Local** — corrigida para global (documento inteiro), alinhado com Seção/Serviço/Viagem (Spec 02 §12).
- **Terminologia Ponto/papel × Seção/Local, árvore do documento, UUID nas 4 entidades, higiene das Questões em Aberto** — Spec 01 §4/§5/§6/§8/§9 atualizada.

Os 3 problemas menores seguem para as specs indicadas, e a Spec 03 deve tratar os que lhe cabem:

- **[Comparador] campos meta** — já anotado na Spec 02 §4.1 que `status`/`data_criacao`/`data_publicacao` não entram no diff campo-a-campo; a Spec 05 só precisa aplicar.
- **Regra dos 350 m depende da ordem de inserção** — Spec 02 §5.2 já descreve o algoritmo de validação incremental no Formulário (recalcular o centroide candidato e verificar se algum ponto já aceito ficaria fora do limite) e a checagem mais fraca para JSON de origem desconhecida. A Spec 03 detalha o algoritmo exato de centroide (item 5 abaixo).
- **`regra_feriado` sem enum** — já anotado que o enum é definido nesta Spec 03 (item 6 abaixo); Spec 02 §14 já valida contra esse enum.

---

## Instruções de forma para a Spec 03

- Escrever em **português**, no mesmo estilo e formatação das specs 01 e 02 (cabeçalho com Projeto/Depende de/Status/Escopo; seções numeradas; tabelas; blocos de decisão fechada; exemplos).
- Cabeçalho: `Depende de: Spec 01 e Spec 02`; `Status: Em definição — v0.1`.
- Cada algoritmo com: entrada, saída, passos, casos de borda (unidirecional, OSRM indisponível, par ausente, empate de menor distância).
- Ser explícito sobre o que **permanece em aberto** para a Spec 04 (o que é cálculo de UI vs. regra de negócio).
- Terminar com seção "Decisões Fechadas Nesta Spec" e "Próximos Documentos" (04 Formulário, 05 Comparador, 06 Ingestor).
- Nomear o arquivo `docs/specs/03-regras-de-negocio-calculo.md` (é o link que a Spec 02 já referencia).
