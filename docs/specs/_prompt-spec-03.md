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
- **Itinerário** (1 ou 2, `sentido` ida/volta): `paradas[]` (cada uma XOR `secao_uuid`/`local_uuid`), `rota{geometria, distancia_m, duracao_s, trechos[]}`, `viagens[]`.
- **Viagem**: `uuid, horario_saida, dias_semana[], regra_feriado, horarios_paradas[]` (offset por parada, por viagem).
- **UUID estável** (UUIDv4, client-side) em Seção, Serviço, Local, Viagem; preservada na reimportação; `numero_n` é só display.
- **`matriz_distancias`** (por Serviço, metros): `distancia_trecho_ida?`, `distancia_trecho_volta?`, `valor_adotado_de_distancia`.
- **`matriz_seccionamento`** (por Serviço, km): pares habilitados p/ passagem parcial + `distancia_km`.
- **JSON nunca guarda R$** — só distâncias; tarifa em R$ é externa (portaria).

---

## Escopo da Spec 03 — o que ela DEVE definir

A Spec 02 empurrou explicitamente estes itens para a Spec 03. Cada um precisa virar seção com algoritmo/decisão:

1. **Cálculo de `matriz_distancias` a partir da rota** — como somar `rota.trechos[].distancia_m` entre a posição de duas Seções (incluindo os Locais intermediários) para produzir cada par; por Ida e por Volta.
2. **Composição de `valor_adotado_de_distancia`** — média simples entre ida/volta? outro critério? arredondamento? unidirecional = valor único.
3. **Sugestão de menor distância entre Serviços** para preencher `matriz_seccionamento.distancia_km` — ler `valor_adotado_de_distancia` de **todos** os Serviços do Autos que atendem o par, pegar o menor; **atenção à conversão metros→km**; é sugestão de UI (o JSON guarda o valor confirmado).
4. **Algoritmo de roteamento / chamada OSRM** — como montar a requisição, tratamento de indisponibilidade (mensagem de erro clara, não prosseguir — distância alimenta a tarifa), street-snapping, extração de `geometria`/`distancia_m`/`duracao_s`/`trechos`.
5. **Algoritmo do centroide para a regra dos 350 m** (§5.2 da Spec 02) — média simples de lat/long vs. centroide geodésico; cumulativo por ordem de inserção; comportamento no Formulário; validação pareada equivalente para Local (§7.1).
6. **`regra_feriado`** — **definir o enum** (valores) e o **algoritmo de redistribuição proporcional de horários** em feriado (questão em aberto desde a Spec 01 §9.4).
7. **Sugestão inicial dos `offset_horario`** de cada Viagem a partir de `rota.trechos[].duracao_s` acumulados, editável pelo usuário.
8. **Regras de tipificação** `tipo` × `caracteristica_veiculo` permitido — tabela Semiurbano/Semiurbano Litorâneo (veículo único) × Rodoviário/Rodoviário Litorâneo (variação permitida), exclusividade RO/ROL, quais Serviços podem coexistir.
9. **Tabela oficial de tarifa a partir de `distancia_km`** — documentar que é externa (portaria), como o ROTA a referencia sem guardar R$ no JSON.

### Fora de escopo da Spec 03
Forma do JSON (é a Spec 02); UI/mapa/PDF (Spec 04); diff (Spec 05); PostgreSQL (Spec 06).

---

## Pendências das specs 01/02 a resolver de passagem

Ao escrever a Spec 03, resolver/registrar estes pontos levantados na revisão:

- **[Estrutural] `matriz_distancias` "todos os pares" pode ser insatisfazível** quando um par de Seções não co-ocorre em nenhum itinerário único (ex.: Seção só na Ida e outra só na Volta). Decidir a regra de negócio: exigir que Ida/Volta atendam o mesmo conjunto de Seções, **ou** restringir os pares exigidos aos que co-ocorrem num itinerário. Alinhar com a validação da Spec 02 §14.
- **[Unidades] metros × km** entre `matriz_distancias` e `matriz_seccionamento` — fixar a conversão na regra de sugestão e evitar ambiguidade.
- **[Comparador] campos meta** — deixar claro (para a Spec 05) que `status`/`data_criacao`/`data_publicacao` não entram no diff campo-a-campo.
- **Regra dos 350 m depende da ordem de inserção** e é inauditável no JSON final — a Spec 03 deve descrever o momento/algoritmo de validação no Formulário e assumir documento já válido no Comparador/Ingestor.

---

## Instruções de forma para a Spec 03

- Escrever em **português**, no mesmo estilo e formatação das specs 01 e 02 (cabeçalho com Projeto/Depende de/Status/Escopo; seções numeradas; tabelas; blocos de decisão fechada; exemplos).
- Cabeçalho: `Depende de: Spec 01 e Spec 02`; `Status: Em definição — v0.1`.
- Cada algoritmo com: entrada, saída, passos, casos de borda (unidirecional, OSRM indisponível, par ausente, empate de menor distância).
- Ser explícito sobre o que **permanece em aberto** para a Spec 04 (o que é cálculo de UI vs. regra de negócio).
- Terminar com seção "Decisões Fechadas Nesta Spec" e "Próximos Documentos" (04 Formulário, 05 Comparador, 06 Ingestor).
- Nomear o arquivo `docs/specs/03-regras-de-negocio-calculo.md` (é o link que a Spec 02 já referencia).

> Sugestão paralela: aproveitar para atualizar a Spec 01 (glossário "Ponto/papel" → "Seção/Local", §6 UUID nas 4 entidades, §5 descrição da árvore, higiene das Questões em Aberto), já que ela ficou defasada em relação à Spec 02.
