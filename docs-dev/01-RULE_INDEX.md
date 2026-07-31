# 01 — RULE_INDEX: Índice Consolidado de Regras de Negócio

**Fonte:** `docs/specs/01-visao-geral.md` (Spec 01), `02-esquema-json-operacao.md` (Spec 02), `03-regras-de-negocio-calculo.md` (Spec 03), `04-formulario-ux-pdf.md` (Spec 04), `05-comparador-json-operacao.md` (Spec 05).
**Convenções:** IDs `RN-xxx` são estáveis e nunca reutilizados. `Afeta` usa: Formulário (F), Comparador (C), Ingestor (I), JSON (J), PDF (P), Testes (T). Regras implícitas estão marcadas `Inferência controlada`. Dúvidas viram `DÚVIDA` (e `Q-xxx` em `16-OPEN_QUESTIONS.md`); conflitos viram `CONFLITO`.

**Formato:** entradas compactas — campos sem conteúdo relevante são omitidos, nunca inventados.

---

## Grupo 1 — Identidade e UUID

## RN-001 — UUID estável nas quatro entidades

**Descrição:** Seção, Serviço, Local e Viagem carregam `uuid` (UUIDv4) como identidade estável, distinta de qualquer rótulo humano.
**Origem:** Spec 01 §6; Spec 02 §12.
**Tipo:** Domínio | JSON. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.
**Critérios objetivos:** todo objeto dessas quatro coleções tem `uuid` string em formato UUIDv4.
**Exemplos válidos:** Viagem com `"uuid": "ba65e897-1113-4c79-922b-ae0e790f55c4"`.
**Exemplos inválidos:** Seção sem `uuid`; `uuid` no formato `"secao-1"`.

## RN-002 — UUID gerada na criação, client-side

**Descrição:** A UUID é gerada no momento da criação da entidade, client-side, via `crypto.randomUUID()` — sem sequência, sem servidor, sem coordenação.
**Origem:** Spec 01 §6; Spec 02 §12.
**Tipo:** Domínio | Arquitetura. **Criticidade:** Alta. **Afeta:** F, J, T.
**Critérios objetivos:** nenhuma chamada de servidor para obter id; nenhuma UUID derivada de conteúdo.

## RN-003 — UUID nunca regenerada por edição

**Descrição:** Editar o conteúdo de uma entidade nunca troca sua `uuid`; a UUID só existe uma vez, na criação.
**Origem:** Spec 02 §12.
**Tipo:** Domínio. **Criticidade:** Alta. **Afeta:** F, C, J, T.
**Exemplos inválidos:** renomear uma Seção e o Formulário gerar `uuid` nova.

## RN-004 — Importar JSON preserva UUIDs

**Descrição:** Ao importar um JSON, todas as UUIDs existentes são preservadas tal como estão no arquivo; somente entidades novas criadas na sessão recebem UUID nova. Sem isso, o diff do Comparador degenera em "removeu tudo e criou tudo".
**Origem:** Spec 01 §6 ("regra dura"); Spec 02 §12; Spec 04 §3.1.
**Tipo:** Domínio | Validação. **Criticidade:** **Alta (crítica nº 1 do projeto)**. **Afeta:** F, C, I, J, T.
**Critérios objetivos:** importar + exportar sem edição produz o mesmo conjunto de UUIDs, byte a byte.
**Exemplos válidos:** carregar vigente, mudar um horário, exportar → todas as UUIDs iguais, exceto nenhuma (nenhuma entidade nova).
**Exemplos inválidos:** qualquer regeneração de UUID em importação.

## RN-005 — Unicidade de UUID no documento inteiro

**Descrição:** Duas entidades da mesma categoria nunca compartilham `uuid` no documento; a unicidade é global no documento para as quatro entidades — inclusive Local, mesmo não sendo compartilhado entre Serviços (permite ao Ingestor usar a UUID direto como chave no PostgreSQL).
**Origem:** Spec 01 §6; Spec 02 §12, §14.
**Tipo:** Validação | JSON. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.
**Exemplos inválidos:** dois Locais de Serviços diferentes com a mesma `uuid`.

## RN-006 — `numero_n` é só display

**Descrição:** `numero_n` (`"0000-NXX"`, só em Serviço) é rótulo de exibição — sequencial por ordem de cadastro, potencialmente reaproveitável. Nunca é chave de identidade em diff, persistência ou lógica. O sufixo embute a `caracteristica_veiculo` (ex.: `"0000-1CR"`) e é **regenerado quando a característica muda** — por edição direta ou reconversão na troca de tipo (RN-023) —, preservando o número sequencial e permanecendo editável (DEC-037). Regenerar o rótulo nunca o torna identidade.
**Origem:** Spec 01 §6; Spec 02 §6, §12; Spec 03 §10.3 regra 5; DEC-037.
**Tipo:** Domínio. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.
**Exemplos inválidos:** Comparador casando Serviços por `numero_n`; Ingestor usando `numero_n` como chave.

## RN-007 — Cópias aditivas criam entidades novas; a sincronização entre grades preserva a UUID do destino

**Descrição:** Operações **aditivas** de cópia — duplicar Serviço, copiar uma Viagem para outro dia, copiar um dia para outros dias, semear grade em **destino vazio** — criam entidades novas, com UUIDs novas. Só a entidade original mantém identidade. No duplicar Serviço, as referências a Seções (`secao_uuid`) são mantidas (Seção é compartilhada), mas o novo Serviço contribui suas próprias geolocalizações. **Semeadura entre grades (Spec 04 §8.4/§8.5; DEC-099):** existe uma **única** ação, **`Copiar (sobrescrever)`**, cuja semântica é a **sincronização preservando identidade** — as Viagens do destino **ausentes** na origem são **removidas**; as que **casam** com a origem (mesmo `dia_semana + horario_saida` na grade) **mantêm o `uuid` que já possuíam no destino** e têm apenas os `horarios_paradas` atualizados para os da origem; as Viagens da origem **ausentes** no destino são **acrescentadas** com **UUID nova**. As UUIDs da origem **nunca** são reutilizadas no destino (RN-005). Reforços coincidentes são pareados pela **ordem estável** nos arrays (DEC-099; RN-062). Serve à estabilidade de identidade no Comparador (RN-004) — o diff mostra "horário de passagem alterado", não "removida + criada".
**Origem:** Spec 02 §11 (campo `uuid`), §12; Spec 04 §6, §8.3–§8.5, §16 item 4; DEC-099 (DEC-087 superada em parte).
**Tipo:** Domínio | UI. **Criticidade:** Alta. **Afeta:** F, C, J, T.
**Exemplos inválidos:** `Copiar (sobrescrever)` reutilizando as UUIDs das Viagens de origem, ou trocando a UUID de uma Viagem do destino que casa por `dia_semana + horario_saida`; semear **destino vazio** com as UUIDs da origem; copiar uma Viagem para outro dia (ou um dia para outros dias) reaproveitando a UUID da Viagem original.

---

## Grupo 2 — Estrutura do JSON

## RN-008 — `versao_schema` obrigatório na raiz

**Descrição:** O documento tem `versao_schema` (string) na raiz — versionamento estrutural do contrato, não metadado de fluxo.
**Origem:** Spec 02 §3, §13 item 14, §14.
**Tipo:** JSON. **Criticidade:** Média. **Afeta:** F, C, I, J, T.

## RN-009 — JSON autossuficiente

**Descrição:** O JSON contém tudo que o Autos usa (Seções, Locais embutidos, rota, matrizes, `municipio` congelado); Paradas referenciam por `uuid`, nunca embutem; nenhuma dependência de cadastro externo para leitura.
**Origem:** Spec 01 §5; Spec 02 §1; Spec 05 §3.2.
**Tipo:** JSON | Arquitetura. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.
**Exemplos inválidos:** Parada com objeto de Seção embutido; Comparador que precisa da base de municípios para exibir nomes.

## RN-010 — JSON contém apenas dados de operação

**Descrição:** Nenhum campo de status de pedido, workflow, aprovação, pendência, manifestação, autor, auditoria, histórico, DOE ou vigência processual. Única exceção: RN-011.
**Origem:** Spec 01 §3, §5; Spec 02 §1, §16.
**Tipo:** JSON | Arquitetura. **Criticidade:** **Alta (regra de fronteira do produto)**. **Afeta:** F, C, I, J, P, T.
**Exemplos inválidos:** `autos.aprovado_por`, `autos.historico[]`, `pendencias[]`.

## RN-011 — `autos.status` + data condicional (exceção estreita)

**Descrição:** `autos.status` ∈ {`"proposta"`, `"vigente"`}; exatamente um dos campos `data_criacao` (se proposta, automática) / `data_publicacao` (se vigente, manual) presente — nunca os dois, nunca nenhum. É autodeclaração do arquivo para Comparador/Ingestor, não ciclo de vida do SEI; não é porta para outros campos de fluxo.
**Origem:** Spec 01 §3 (exceção deliberada); Spec 02 §4, §4.1, §13 item 18, §16.
**Tipo:** JSON | Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.
**Exemplos válidos:** `{"status":"proposta","data_criacao":"2026-07-01"}`.
**Exemplos inválidos:** `status:"vigente"` com `data_criacao`; os dois campos de data presentes; `status:"em_analise"`.

## RN-012 — `status`/datas fora do diff

**Descrição:** `status`, `data_criacao` e `data_publicacao` são exibidos como cabeçalho no Comparador, mas **nunca** participam do diff campo-a-campo (senão todo diff acusaria "mudou a data de criação").
**Origem:** Spec 02 §4.1 (nota para a Spec 05); Spec 05 §4.3.
**Tipo:** Comparador. **Criticidade:** Alta. **Afeta:** C, P, T.

## RN-013 — JSON nunca guarda R$

**Descrição:** Nenhum valor monetário no JSON; a conversão distância→R$ é externa (portaria ARTESP) e efêmera de exibição. Nesta versão, nem UX nem PDF exibem R$.
**Origem:** Spec 02 §9, §13 item 12, §16; Spec 03 §11; Spec 04 §2.8, §9.2; Spec 05 §14.1.
**Tipo:** JSON | Domínio. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.

## RN-014 — Toda distância em km; duração em segundos

**Descrição:** Todos os campos de distância do documento são em km (`rota.distancia_km`, `trechos[].distancia_km`, `matriz_distancias.*`, `matriz_seccionamento.distancia_km`); a única grandeza em outra unidade é `duracao_s` (segundos). A conversão m→km ocorre uma única vez, na fronteira com o OSRM.
**Origem:** Spec 02 §8 (unidade), §13 item 17; Spec 03 §1, §3.4.
**Tipo:** JSON | Cálculo. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.
**Exemplos inválidos:** gravar `leg.distance` (metros) direto em `distancia_km`.

## RN-015 — Dados computados são congelados; leitores não recalculam

**Descrição:** `rota` (geometria, trechos, distância, duração), `descricao_itinerario`, `matriz_distancias` e `municipio` são computados no Formulário e congelados no JSON. Comparador, Ingestor e PDF apenas leem — nunca recalculam contra OSRM nem re-derivam.
**Origem:** Spec 02 §8, §10.2, §10.5; Spec 03 §1, §3.6.2, §3.7.7, §12; Spec 05 §1, §2.
**Tipo:** Arquitetura | JSON. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.

---

## Grupo 3 — Autos, tipo e empresa

## RN-016 — Identificação vem de listas estáticas

**Descrição:** `codigo`, `tipo` e `empresa` vêm das listas estáticas servidas junto do app (ou do JSON carregado). "Criar do zero" não cria Autos administrativo — seleciona um Autos existente das listas.
**Origem:** Spec 01 §8; Spec 02 §4; Spec 04 §3.2, §5.
**Tipo:** Domínio | UI. **Criticidade:** Média. **Afeta:** F, J, T.

## RN-017 — Bloqueio de carregamento por identidade obsoleta

**Descrição:** Ao carregar um JSON, se `codigo`, `empresa` ou `tipo` não existirem nas listas estáticas atuais, o carregamento é **bloqueado** com mensagem clara (propor contra identidade obsoleta é pior que reescolher).
**Origem:** Spec 01 §8; Spec 02 §4; Spec 04 §3.1 item 3, §14.
**Tipo:** Validação | UI. **Criticidade:** Alta. **Afeta:** F, T.
**Exemplos inválidos:** carregar JSON com empresa extinta e permitir edição.

## RN-018 — Mínimos estruturais do Autos

**Descrição:** `autos.servicos` tem ao menos 1 elemento; cada Seção tem `servicos[]` com ao menos 1 entrada, e cada `servico_uuid` referenciado existe e tem ao menos uma Parada apontando para a Seção. Remover o último Serviço que usa uma Seção remove a Seção do documento.
**Origem:** Spec 02 §4, §5, §14; Spec 04 §6 (remoção).
**Tipo:** Validação | JSON. **Criticidade:** Média. **Afeta:** F, C, I, J, T.

---

## Grupo 4 — Tipificação e característica de veículo

## RN-019 — Duas famílias que nunca se misturam

**Descrição:** Característica de veículo pertence à família **semiurbana** (`SU`, `SUL`) ou **rodoviária** (`CR`, `CL`, `EX`, `LE`, `ME`, `MEL`, `ML`, `MLL`, `MX`, `MM`, `MML`). Não existe `SL` (Semileito). O `tipo` do Autos fixa a família; nunca há código de uma família num Autos da outra.
**Origem:** Spec 01 §7; Spec 02 §6; Spec 03 §10.1, §10.3 regra 1.
**Tipo:** Validação | Domínio. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.
**Exemplos inválidos:** Autos `Rodoviário` com Serviço `SU`.

## RN-020 — Veículo único no semiurbano

**Descrição:** Em `Semiurbano` todos os Serviços têm `caracteristica_veiculo == "SU"`; em `Semiurbano Litorâneo`, todos `== "SUL"`. Serviços múltiplos variam apenas por itinerário/`carater`.
**Origem:** Spec 01 §7; Spec 03 §10.2, §10.3 regra 2.
**Tipo:** Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.
**Exemplos inválidos:** Autos Semiurbano com um Serviço `SU` e outro `SUL`.

## RN-021 — Variação no rodoviário, dentro do conjunto do tipo

**Descrição:** `Rodoviário` permite `CR`, `EX`, `LE`, `ME`, `ML`, `MX`, `MM` (proibidos `CL`, `MEL`, `MLL`, `MML`, `SU`, `SUL`); `Rodoviário Litorâneo` permite `CL`, `EX`, `LE`, `MEL`, `MLL`, `MX`, `MML` (proibidos `CR`, `ME`, `ML`, `MM`, `SU`, `SUL`). Serviços do mesmo Autos podem ter características diferentes. Partição código-a-código fechada (Spec 03 §10.2 v0.5).
**Origem:** Spec 01 §7; Spec 03 §10.2, §10.3 regra 4.
**Tipo:** Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

## RN-022 — Litoralidade fixa a forma convencional

**Descrição:** `CR` e `CL` nunca coexistem; `SU` e `SUL` nunca coexistem. Autos litorâneo usa a forma litorânea, jamais a não-litorânea (e vice-versa). Nos mistos com componente convencional, a exclusividade é por código: `ME`×`MEL`, `ML`×`MLL` e `MM`×`MML` nunca coexistem. `EX`, `LE` e `MX` são neutros à litoralidade (mesmo código nos dois tipos rodoviários — executivo e leito não têm forma litorânea).
**Origem:** Spec 01 §7; Spec 03 §10.2, §10.3 regra 3, §10.4 (v0.5).
**Tipo:** Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.
**Observações:** Q-001 **decidida** (DEC-026): partição código-a-código fechada na Spec 03 §10.2; `SL` não existe.

## RN-023 — Trocar o tipo reconverte os Serviços ao padrão do tipo

**Descrição:** O `tipo` do Autos é editável a qualquer momento (documento novo ou carregado; `codigo`/`empresa` não são editáveis após criado). Ao trocar o `tipo`, cada Serviço cuja `caracteristica_veiculo` não pertença ao novo tipo é **reconvertido automaticamente para a forma convencional (padrão) do tipo** (`Rodoviário`→`CR`, `Rodoviário Litorâneo`→`CL`, `Semiurbano`→`SU`, `Semiurbano Litorâneo`→`SUL`), com **aviso** listando o que mudou. **Nunca bloqueia** (a reconversão é sempre possível — o padrão pertence ao tipo). A reconversão também **regenera o sufixo do `numero_n`** de cada Serviço convertido para a nova característica, preservando o sequencial (RN-006; DEC-037).
**Origem:** Spec 03 §10.4; Spec 04 §5; DEC-034; DEC-037.
**Tipo:** Domínio | UI. **Criticidade:** Média. **Afeta:** F, T.

## RN-024 — `carater` é campo explícito

**Descrição:** `carater` ∈ {`"principal"`, `"parcial"`, `"semidireta"`} é declarado pela empresa, não derivado do conjunto de paradas. A lista da Spec 02 §6 é a fonte de verdade dos valores.
**Origem:** Spec 02 §6, §13 item 2; Spec 01 §9 item 2.
**Tipo:** Domínio | JSON. **Criticidade:** Média. **Afeta:** F, C, J, T.

---

## Grupo 5 — Seções

## RN-025 — Seção é entidade do Autos, compartilhada

**Descrição:** Seção vive em `autos.secoes[]`, é compartilhada por todos os Serviços do Autos que passam por ali (mesmo `uuid`), define tarifa e participa do seccionamento. Não há cadastro mestre global — vive dentro do próprio JSON.
**Origem:** Spec 01 §4, §8; Spec 02 §2, §5, §13 item 5.
**Tipo:** Domínio | JSON. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.

## RN-026 — Cada Serviço contribui suas geolocalizações à Seção

**Descrição:** `secao.servicos[]` tem uma entrada por Serviço que usa a Seção, com `geolocalizacao_ida`/`geolocalizacao_volta` próprias. Obrigatoriedade segue a direcionalidade do Serviço: bidirecional → ambas; unidirecional → só a do sentido.
**Origem:** Spec 02 §5.1.
**Tipo:** JSON | Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

## RN-027 — Regra dos 350 m por centroide cumulativo (Seção)

**Descrição:** Todos os pontos contribuídos a uma Seção (qualquer Serviço, qualquer sentido) formam um cluster: na inserção, calcula-se o centroide **resultante** (média simples de lat/lon) e recusa-se o candidato se qualquer ponto do conjunto resultante ficar a > 350 m dele (Haversine, R = 6.371.000 m). 1º ponto aceito sem checagem. Recusa → criar Seção nova (outro `uuid`, nome distinto).
**Origem:** Spec 01 §9 item 5; Spec 02 §5.2; Spec 03 §2.1, §2.2, §7.2.
**Tipo:** Validação | Cálculo. **Criticidade:** Alta. **Afeta:** F, T.
**Exemplos válidos:** 2º ponto a 600 m do 1º (ambos ≤ 350 m do ponto médio).
**Exemplos inválidos:** 2º ponto a 800 m do 1º; candidato que empurra ponto já aceito para fora dos 350 m do novo centroide.
**Observações:** depende da ordem de inserção — intrínseco e aceito.

## RN-028 — Checagem estática fraca dos 350 m (leitores)

**Descrição:** Comparador/Ingestor, sem histórico de inserção, validam a Seção pela checagem fraca: centroide de todos os pontos finais, todos a ≤ 350 m. Violação → **alerta técnico** (Comparador não bloqueia).
**Origem:** Spec 02 §5.2; Spec 03 §7.3; Spec 05 §4.1.
**Tipo:** Validação. **Criticidade:** Média. **Afeta:** C, I, T.
**Observações:** severidade nos leitores estáticos = alerta técnico, nunca bloqueante — o pareado de Local (RN-032) segue a mesma regra (Q-013 decidida → DEC-032).

## RN-029 — Município derivado por ponto-em-polígono

**Descrição:** `municipio` de Seção e Local é derivado da geolocalização (ray casting sobre `municipios_sp.geojson`, join com `pop_municipios.csv`), nunca digitado; fallback ao polígono mais próximo até 2 km; acima disso, erro bloqueante ("fora de SP"). Seção decide pelo centroide dos pontos; Local pelo ponto único ou ponto médio Ida/Volta. Valor persiste congelado.
**Origem:** Spec 02 §5, §7, §13 item 22; Spec 03 §2.3; Spec 04 §7.1, §14.
**Tipo:** Cálculo | Validação. **Criticidade:** Alta. **Afeta:** F, J, P, T.

## RN-030 — Ida e Volta referenciam o mesmo conjunto de Seções

**Descrição:** Quando um Serviço tem os dois itinerários, o conjunto de Seções referenciadas pelas paradas de Ida é idêntico ao de Volta (a ordem deve ser a inversa, ABCD vira DCBA; Locais podem divergir livremente). Garante que `matriz_distancias` é sempre satisfazível. Divergência grande → criam-se dois Serviços unidirecionais.
**Origem:** Spec 01 §8; Spec 02 §2, §14.
**Tipo:** Validação | Domínio. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

---

## Grupo 6 — Locais

## RN-031 — Local é entidade do Serviço, sem tarifa, não compartilhado

**Descrição:** Local vive em `servico.locais[]`, pertence a um único Serviço, não tem relevância tarifária, não participa de `matriz_distancias` nem de `matriz_seccionamento` (como par), nem da descrição textual.
**Origem:** Spec 01 §4, §8; Spec 02 §2, §7, §13 item 7.
**Tipo:** Domínio | JSON. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.

## RN-032 — Geolocalizações do Local e regra dos 350 m pareada

**Descrição:** Local tem ao menos uma de `geolocalizacao_ida`/`geolocalizacao_volta` (independentemente opcionais). Se ambas presentes, distância Haversine entre elas ≤ 350 m; acima disso, dois Locais distintos com nomes diferentes. Parada de sentido X só referencia Local com `geolocalizacao_X` preenchida.
**Origem:** Spec 02 §7.1; Spec 03 §7.4.
**Tipo:** Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.
**Observações:** bloqueante no gesto de edição do Formulário; nos leitores estáticos (import, Comparador, Ingestor) é **alerta técnico não bloqueante** (Q-013 decidida → DEC-032).

---

## Grupo 7 — Paradas

## RN-033 — Parada: XOR `secao_uuid`/`local_uuid`

**Descrição:** Cada Parada referencia **exatamente um** de `secao_uuid` (em `autos.secoes`) ou `local_uuid` (em `servico.locais` do mesmo Serviço) — nunca os dois, nunca nenhum.
**Origem:** Spec 01 §4; Spec 02 §2, §10.1, §13 item 13.
**Tipo:** Validação | JSON. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.
**Exemplos inválidos:** `{"ordem":2,"secao_uuid":"…","local_uuid":"…"}`; `{"ordem":2}`.

## RN-034 — Ordem 1-based, crescente, sem lacunas; mínimo 2 paradas

**Descrição:** `ordem` é 1-based, estritamente crescente e sem lacunas; todo itinerário tem no mínimo 2 paradas.
**Origem:** Spec 02 §10, §10.1, §14.
**Tipo:** Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

## RN-035 — Extremos são sempre Seção

**Descrição:** A primeira e a última Parada de todo itinerário referenciam Seção, nunca Local. Locais só aparecem como paradas intermediárias. Consequência: todo itinerário atende ≥ 2 Seções.
**Origem:** Spec 02 §10.1, §14.
**Tipo:** Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

## RN-036 — Referências de Parada íntegras e com geolocalização do sentido

**Descrição:** Parada com `secao_uuid` exige entrada da Seção para o Serviço corrente com `geolocalizacao_<sentido>` preenchida; Parada com `local_uuid` exige Local do mesmo Serviço com `geolocalizacao_<sentido>` preenchida.
**Origem:** Spec 02 §10.1.
**Tipo:** Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

## RN-037 — Parada não carrega horário

**Descrição:** O tempo de passagem é dado por Viagem (`horarios_paradas[]`), não pela Parada — o mesmo conjunto de paradas tem offsets diferentes entre viagens (trânsito).
**Origem:** Spec 02 §10.1, §13 item 15.
**Tipo:** Domínio | JSON. **Criticidade:** Média. **Afeta:** F, J, T.

---

## Grupo 8 — Itinerários

## RN-038 — 1 ou 2 itinerários, sentidos distintos; unidirecional é válido

**Descrição:** Serviço tem 1 ou 2 itinerários (`sentido` ∈ {`ida`, `volta`}), sem repetição de sentido. Serviço só-Ida ou só-Volta é válido.
**Origem:** Spec 01 §8; Spec 02 §10, §14.
**Tipo:** Validação | JSON. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

## RN-039 — Viagem pertence ao Itinerário

**Descrição:** `viagens[]` fica no Itinerário (uma viagem percorre as paradas de um único sentido), com mínimo 1 viagem por itinerário.
**Origem:** Spec 02 §10, §11, §13 item 4, §14.
**Tipo:** JSON | Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

---

## Grupo 9 — Rotas e pontos de rota

## RN-040 — `rota` completa e coerente

**Descrição:** Todo itinerário tem `rota` com `geometria` (LineString GeoJSON `[lon,lat]`), `distancia_km`, `duracao_s`, `descricao_itinerario`, `trechos[]` e `pontos_de_rota[]` (default `[]`). `distancia_km` = soma de `trechos[].distancia_km`; `duracao_s` = soma de `trechos[].duracao_s`.
**Origem:** Spec 02 §10.2, §14.
**Tipo:** JSON | Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

## RN-041 — Invariante de trechos

**Descrição:** `rota.trechos` tem exatamente `paradas.length − 1` elementos, um por par consecutivo (`parada_destino_ordem == parada_origem_ordem + 1`), sem lacunas nem repetição. Pontos de rota **nunca** alteram essa contagem.
**Origem:** Spec 02 §10.3, §10.4, §14; Spec 03 §3.3, §3.6 regra 3.
**Tipo:** Validação | Cálculo. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

## RN-042 — Pontos de rota: propósito único, sem identidade

**Descrição:** Pontos de rota forçam o traçado por vias específicas. Não são Seção, Local nem Parada; sem `uuid`, sem tarifa, fora de matrizes e da regra dos 350 m; não geram parada, trecho nem horário; não viram item da descrição. Persistidos (`apos_parada_ordem` ∈ `[1, paradas.length−1]`, lat, lon) apenas para reproduzir a rota forçada na reedição. Ordem de travessia = (`apos_parada_ordem`, índice no array).
**Origem:** Spec 01 §8; Spec 02 §10.4, §13 item 19; Spec 03 §3.6, §3.6.1, §3.6.2.
**Tipo:** Domínio | JSON | Cálculo. **Criticidade:** Alta. **Afeta:** F, C, J, T.
**Exemplos inválidos:** ponto de rota com `uuid`; ponto de rota criando um trecho extra; `apos_parada_ordem == paradas.length`.

## RN-043 — Forçar traçado altera distâncias (desejado)

**Descrição:** Pontos de rota entram como coordenadas intermediárias na requisição OSRM e mudam `geometria`, `trechos`, `distancia_km` e, por consequência, `matriz_distancias` e sugestões de offset — comportamento correto e esperado.
**Origem:** Spec 03 §3.6 regras 2 e 4.
**Tipo:** Cálculo. **Criticidade:** Média. **Afeta:** F, J, T.

## RN-044 — Descrição textual: só Seções e vias

**Descrição:** `rota.descricao_itinerario` (`texto` + `itens[]`) intercala apenas as Seções do itinerário (marcos, rótulo `Cidade - Nome da Seção`) com os nomes das vias percorridas entre elas. Locais comuns **nunca** entram; pontos de rota não viram item. Ao menos 2 itens `secao`; primeiro e último itens são a primeira e a última Seção; itens `secao` na mesma ordem do itinerário; item `secao` traz `secao_uuid`+`rotulo`, item `via` traz `nome`.
**Origem:** Spec 02 §10.5, §13 item 23, §14; Spec 03 §3.7.2, §3.7.3.
**Tipo:** JSON | Cálculo | Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.

## RN-045 — Limpeza dos nomes de via

**Descrição:** Sobre a sequência de `step.name` por intervalo entre Seções: remover vazios/nulos; colapsar repetições consecutivas; preservar repetições não consecutivas; padronizar espaços; não inventar nomes; **vias sem nome são omitidas** (sem marcador genérico). Limpeza por intervalo, não global.
**Origem:** Spec 03 §3.7.5, §3.7.6.
**Tipo:** Cálculo. **Criticidade:** Média. **Afeta:** F, J, P, T.

## RN-046 — Descrição derivada, congelada, recalculada com a rota

**Descrição:** A descrição é derivada da rota roteirizada e congelada no JSON; recalcula-se exatamente quando a rota é recalculada (paradas, coordenadas, pontos de rota); abrir JSON exibe a gravada sem chamar OSRM; sem edição manual do texto nesta versão. Leitores só leem.
**Origem:** Spec 03 §3.7.7; Spec 04 §7.4.
**Tipo:** Cálculo | UI. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.

---

## Grupo 10 — OSRM e roteamento

## RN-047 — Forma da requisição OSRM

**Descrição:** OSRM público, perfil `driving`, `GET /route/v1/driving/{coords}` com `overview=full&geometries=geojson&steps=true&annotations=false&continue_straight=false`; coordenadas `lon,lat` na ordem das paradas (com pontos de rota intercalados); `steps=true` serve exclusivamente aos nomes de via; geometria vem sempre de `overview`, distância/duração dos legs.
**Origem:** Spec 01 §8; Spec 03 §3.2, §3.3.
**Tipo:** Arquitetura | Cálculo. **Criticidade:** Alta. **Afeta:** F, T.

## RN-048 — Indisponibilidade do OSRM é bloqueante

**Descrição:** Sem degradação silenciosa nem fallback para linha reta. Falha de rede/timeout → não produzir `rota`, mensagem de indisponibilidade, 1 retry automático; `NoRoute`/`NoSegment`/`code != Ok` → bloquear com mensagem específica, sem retry. Enquanto qualquer itinerário estiver sem rota válida, não há `matriz_distancias` nem exportação de JSON/PDF.
**Origem:** Spec 01 §8; Spec 03 §3.5; Spec 04 §7.3, §11, §14.
**Tipo:** Validação | Arquitetura. **Criticidade:** **Alta (bloqueio tarifário)**. **Afeta:** F, T.
**Exemplos inválidos:** exportar JSON com itinerário sem rota; calcular distância em linha reta como fallback.

## RN-049 — Mensagem de erro não menciona tarifa

**Descrição:** "Distância roteada alimenta a tarifa" é o **motivo** do bloqueio, não o texto exibido. A mensagem fala só da indisponibilidade/problema do serviço de rotas.
**Origem:** Spec 01 §8; Spec 03 §3.5 (nota corretiva); Spec 04 §14.
**Tipo:** UI. **Criticidade:** Média. **Afeta:** F, T.

## RN-050 — Conversão e arredondamento na fronteira OSRM

**Descrição:** `trecho.distancia_km = round(leg.distance/1000, 2)` (half-up); `trecho.duracao_s = round(leg.duration)`; totais por **soma dos trechos já arredondados** (nunca o total global do OSRM), garantindo `rota.distancia_km == Σ trechos` sem erro de fechamento.
**Origem:** Spec 03 §3.4.
**Tipo:** Cálculo. **Criticidade:** Alta. **Afeta:** F, J, T.

## RN-051 — Mapeamento legs→trechos com pontos de rota

**Descrição:** Preferencial: parâmetro `waypoints={índices das paradas}` (pontos de rota como pass-through, `legs == paradas−1`). Fallback: fusão de legs (soma de distance/duration entre paradas consecutivas). Resultado idêntico nos dois caminhos.
**Origem:** Spec 03 §3.6, §3.6.1.
**Tipo:** Cálculo. **Criticidade:** Alta. **Afeta:** F, T.

## RN-052 — Abrir JSON não chama OSRM; editar recalcula

**Descrição:** Abrir um JSON desenha a rota e a descrição congeladas, sem requisição. Alterar itinerário/paradas/coordenadas/pontos de rota recalcula (no "soltar" de cada gesto).
**Origem:** Spec 03 §3.6.2, §3.7.7; Spec 04 §3.1 item 6, §7.3.
**Tipo:** UI | Arquitetura. **Criticidade:** Alta. **Afeta:** F, T.

## RN-053 — OSRM sem steps degrada só a descrição

**Descrição:** Se a instância pública não retornar `steps`/`name`, rota, trechos e matrizes seguem válidos; a descrição fica só com os marcos (Seções adjacentes) — documento não é invalidado.
**Origem:** Spec 03 §3.2 (compatibilidade), §3.7.8.
**Tipo:** Cálculo. **Criticidade:** Baixa. **Afeta:** F, J, T.

---

## Grupo 11 — Matriz de distâncias

## RN-054 — Matriz por Serviço, todas as combinações, intra-Serviço

**Descrição:** `matriz_distancias` pertence ao Serviço e tem exatamente uma entrada por combinação não-ordenada de duas Seções distintas atendidas (todas as combinações, não só consecutivas); `secao_a_uuid ≠ secao_b_uuid`; sem duplicatas. É inteiramente intra-Serviço — nunca lê dados de outro Serviço.
**Origem:** Spec 02 §8, §14; Spec 03 §4.
**Tipo:** JSON | Cálculo | Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.
**Exemplos válidos:** Serviço com Seções A, B, C, D → entradas AB, AC, AD, BC, BD, CD.

## RN-055 — Distância por sentido = soma de trechos entre as Seções

**Descrição:** `dist(I, A, B)` = Σ `trecho.distancia_km` para trechos com `parada_origem_ordem ∈ [min(posA,posB), max−1]` — inclui automaticamente os Locais intermediários. Arredondada a 2 casas.
**Origem:** Spec 02 §8; Spec 03 §4.2.
**Tipo:** Cálculo. **Criticidade:** Alta. **Afeta:** F, J, T.

## RN-056 — `valor_adotado_de_distancia` = média Ida/Volta

**Descrição:** Ambos os sentidos presentes → média aritmética simples, half-up 2 casas; unidirecional → o único valor. Presença de `distancia_trecho_ida`/`volta` segue exatamente a direcionalidade do Serviço (bidirecional → ambos sempre; unidirecional → exatamente um). Sem campo de duração na matriz.
**Origem:** Spec 02 §8, §13 item 17; Spec 03 §4.3, §5.
**Tipo:** Cálculo | Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.
**Exemplos válidos:** ida 6,00 + volta 6,10 → 6,05.

## RN-057 — Mínimo de 2 Seções por Serviço

**Descrição:** Todo Serviço atende ao menos 2 Seções distintas (consequência de RN-034/RN-035), para existir ao menos um par em `matriz_distancias`.
**Origem:** Spec 02 §14; Spec 03 §4.4.
**Tipo:** Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

---

## Grupo 12 — Matriz de seccionamento

## RN-058 — Seccionamento: pares habilitados com distância confirmada

**Descrição:** `matriz_seccionamento` (default `[]`) define os pares de Seções com venda de passagem parcial permitida, com `distancia_km` **confirmada/editada pelo usuário** (a sugestão não é persistida como tal). Valor é sempre distância, nunca R$.
**Origem:** Spec 02 §9, §13 item 11.
**Tipo:** JSON | Domínio. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.

## RN-059 — Par de seccionamento íntegro

**Descrição:** Par não-direcional (`{a,b} == {b,a}`), sem duplicatas, `secao_a_uuid ≠ secao_b_uuid`, e o par deve existir em `matriz_distancias` do mesmo Serviço.
**Origem:** Spec 02 §9, §14.
**Tipo:** Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

## RN-060 — Duas sugestões de distância (UI, em lote)

**Descrição:** Botão "Sugerir menor distância" = mínimo de `valor_adotado_de_distancia` do par entre **todos** os Serviços do Autos que atendem ambas as Seções; botão "Sugerir distâncias do serviço" = `valor_adotado` do próprio Serviço. Ambos em lote sobre os pares habilitados; o último acionado (ou edição manual) vale; sem conversão de unidade.
**Origem:** Spec 02 §9; Spec 03 §6; Spec 04 §9.2.
**Tipo:** Cálculo | UI. **Criticidade:** Média. **Afeta:** F, T.

---

## Grupo 13 — Viagens

## RN-061 — Viagem estratificada por dia

**Descrição:** Cada Viagem é uma partida num **único** `dia_semana` (enum de 7 valores), com `viagem_feriado` booleano e `horario_saida` (`HH:MM:SS`). Um horário de seg–sex são 5 Viagens (UUIDs e offsets próprios). Substitui o desenho `dias_semana[]` + `regra_feriado`. Cada Viagem pertence a **exatamente uma** grade — comum, feriado ou uma **tabela excepcional** —, dadas por `viagem_feriado` + `tabela_excepcional_uuid` (`string | null`, default `null`); **invariante:** se `tabela_excepcional_uuid ≠ null` então `viagem_feriado = false` (DEC-081).
**Origem:** Spec 02 §11, §13 item 21, §6.1; Spec 01 §8; Spec 04 §8; DEC-081.
**Tipo:** Domínio | JSON. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.

## RN-062 — Reforço de horário é válido

**Descrição:** Duas Viagens do mesmo itinerário podem ter o mesmo `dia_semana` e `horario_saida` — não há validação de unicidade dessa combinação, nem da tupla `(dia_semana, horario_saida, viagem_feriado, tabela_excepcional_uuid)`.
**Origem:** Spec 02 §11, §14.
**Tipo:** Validação. **Criticidade:** Baixa. **Afeta:** F, C, J, T.

---

## Grupo 14 — Horários e offsets

## RN-063 — `horarios_paradas` completo e monotônico

**Descrição:** `horarios_paradas` tem exatamente um elemento por Parada do itinerário (mesmo conjunto de `ordem`); ordenando por `parada_ordem`, `offset_horario` é não decrescente; o primeiro é `"00:00:00"`. Offset pertence à Viagem, não à Parada.
**Origem:** Spec 02 §11.1, §13 item 15, §14.
**Tipo:** Validação | JSON. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

## RN-064 — Sugestão inicial por acúmulo de durações

**Descrição:** Ao criar a Viagem, offsets pré-preenchidos por acúmulo de `trecho.duracao_s` (primeira parada `00:00:00`), formatados `HH:MM:SS`.
**Origem:** Spec 03 §8.1.
**Tipo:** Cálculo. **Criticidade:** Média. **Afeta:** F, T.

## RN-065 — Redistribuição proporcional entre âncoras

**Descrição:** Editar manualmente o horário de uma parada a jusante torna-a âncora; paradas derivadas entre duas âncoras são reinterpoladas proporcionalmente ao baseline (`B_k`); tail após a última âncora mantém as durações de baseline apeadas a ela; baseline degenerado → distribuição uniforme. A UI não permite âncora fora de ordem. Tudo por Viagem.
**Origem:** Spec 03 §8.2; Spec 04 §8.2.
**Tipo:** Cálculo | UI. **Criticidade:** Alta. **Afeta:** F, T.
**Exemplos válidos:** baseline A=0, a=30, B=60 min; fixar B=50 → a=25.

## RN-066 — Reset à sugestão inicial

**Descrição:** Operação que descarta todas as âncoras manuais de uma Viagem e recalcula offsets pela sugestão inicial, preservando `horario_saida`, `dia_semana`, `viagem_feriado` e `uuid`. Idempotente. Escopo por Viagem ou em lote (UI).
**Origem:** Spec 03 §8.3; Spec 04 §8.2.
**Tipo:** Cálculo | UI. **Criticidade:** Média. **Afeta:** F, T.

## RN-067 — Usuário digita horários de relógio, nunca offsets

**Descrição:** A grade recebe horários absolutos (HH:MM); o Formulário converte para `offset_horario` internamente e gera `horarios_paradas[]` completo (incluindo Locais ocultos). Offsets só em modo avançado; nunca no PDF. Comparador exibe horários absolutos (`horario_saida + offset`).
**Origem:** Spec 04 §2.4–§2.5, §8.2, §13.3; Spec 05 §1, §12.3.
**Tipo:** UI. **Criticidade:** Alta. **Afeta:** F, C, P, T.

---

## Grupo 15 — Feriados

## RN-068 — Grade de feriados substitui integralmente a comum

**Descrição:** Num feriado, operam **apenas** as Viagens `viagem_feriado = true` daquele `dia_semana`; as comuns **e as excepcionais** do dia não operam. Precedência **feriado > excepcional > comum** (DEC-081). As grades são independentes (feriado pode ter mais, menos ou nenhuma viagem).
**Origem:** Spec 02 §11; Spec 03 §9.1; DEC-081.
**Tipo:** Domínio. **Criticidade:** Alta. **Afeta:** F, C, J, P, T.

## RN-069 — Feriado não altera contagens

**Descrição:** Todas as contagens (viagens semanais, opções de deslocamento) usam a **semana padrão** = grade comum: exclusivamente Viagens com `viagem_feriado = false` **e** `tabela_excepcional_uuid = null`. Viagens de feriado **e excepcionais nunca** entram nas contagens. Dois JSONs que difiram só na grade de feriados **ou nas tabelas excepcionais** têm contagens idênticas. Contagens sempre rotuladas "semana padrão (sem feriados nem operação excepcional)".
**Origem:** Spec 03 §9.2, §9.4; Spec 04 §6, §10, §13.3; Spec 05 §10.4; DEC-081.
**Tipo:** Cálculo | Domínio. **Criticidade:** Alta. **Afeta:** F, C, P, T.

## RN-070 — Calendário de feriados é externo

**Descrição:** O ROTA e o JSON não sabem quais datas são feriado — o documento diz o que acontece num feriado que caia em cada dia da semana, não quando.
**Origem:** Spec 01 §8; Spec 02 §11; Spec 03 §9.1.
**Tipo:** Domínio | Arquitetura. **Criticidade:** Média. **Afeta:** F, C, I, J, T.

## RN-071 — Grade de feriados vazia é válida (alerta)

**Descrição:** Nenhuma Viagem de feriado = em feriados o serviço não opera — válido, tratado como alerta não bloqueante (pode ser intencional). Viagem de feriado sem comum correspondente também é válida.
**Origem:** Spec 03 §9.3; Spec 04 §11.
**Tipo:** Validação | UI. **Criticidade:** Baixa. **Afeta:** F, T.

## RN-072 — Fórmulas de contagem

**Descrição:** `viagens_semana(servico, sentido)` = nº de Viagens comuns do sentido. `pares_compraveis(servico)` = pares da `matriz_seccionamento` ∪ par ponta-a-ponta (sempre comprável; união evita dupla contagem). `opcoes(servico, sentido)` = viagens_semana × |pares_compraveis|. Totais: Serviço = Ida+Volta; Autos = Σ Serviços. Estratificação por faixa usa o `horario_saida`.
**Origem:** Spec 01 §4; Spec 03 §9.4; Spec 04 §10.
**Tipo:** Cálculo. **Criticidade:** Alta. **Afeta:** F, C, P, T.

## RN-073 — Opção de deslocamento é derivada, não entrada

**Descrição:** Opção de deslocamento é estatística calculada (par O-D comprável × viagem), nunca dado digitado pelo usuário nem campo do JSON.
**Origem:** Spec 01 §4, §8; Spec 03 §9.4.
**Tipo:** Domínio. **Criticidade:** Média. **Afeta:** F, C, P, T.

---

## Grupo 16 — PDF operacional

## RN-074 — PDF operacional client-side com estrutura fixa

**Descrição:** Gerado client-side; estrutura: capa/identificação, resumo (contadores §10 rotulados), Serviços, itinerários por Serviço/sentido (título, sequência de Seções com setas, descrição textual, imagem do mapa por captura de canvas), tabela horária (2 versões), matriz de distâncias, matriz de seccionamento, anexo técnico, rodapé com `versao_schema` + aviso SEI.
**Origem:** Spec 01 §2, §8; Spec 04 §13.1.
**Tipo:** PDF. **Criticidade:** Alta. **Afeta:** F, P, T.

## RN-075 — Duas versões da tabela horária

**Descrição:** Versão simples no corpo (só horários de saída por dia); versão detalhada no anexo técnico (todos os passantes por Seção) — ambas sem Locais e sem offsets.
**Origem:** Spec 04 §13.2.
**Tipo:** PDF. **Criticidade:** Média. **Afeta:** F, P, T.

## RN-076 — Regras transversais do PDF

**Descrição:** Nomes sempre `Cidade - Nome da Seção`; matrizes triangulares inferiores com "X" na diagonal, em km; **sem R$**; **sem offsets em lugar nenhum**; contagens rotuladas "semana padrão (sem feriados)"; feriados só na tabela de feriados; Locais só no anexo técnico (sem horários).
**Origem:** Spec 04 §7.1, §9, §13.2–§13.4.
**Tipo:** PDF | UI. **Criticidade:** Alta. **Afeta:** F, P, T.

## RN-077 — Aviso de fronteira com o SEI no PDF

**Descrição:** Rodapé obrigatório: "O fluxo administrativo (análise, pendências e aprovação) permanece no SEI. Este documento não substitui a publicação oficial." (equivalente no PDF comparativo).
**Origem:** Spec 04 §13.1 item 9; Spec 05 §17.2 item 1.
**Tipo:** PDF. **Criticidade:** Média. **Afeta:** F, C, P, T.

## RN-078 — Exportação bloqueada com pendências

**Descrição:** Erros bloqueantes (§11 da Spec 04: estrutura inválida, rota ausente/desatualizada, descrição ausente com rota presente, matriz desatualizada, horários fora de ordem, ponto incompleto/município não derivável, 350 m violado, tipificação violada, itinerário sem viagem) impedem gerar JSON e PDF. Alertas não bloqueiam.
**Origem:** Spec 04 §11, §12, §14.
**Tipo:** Validação | UI. **Criticidade:** Alta. **Afeta:** F, T.

## RN-079 — Exportar proposta / definir como vigente

**Descrição:** "Exportar proposta": `status:"proposta"`, `data_criacao` automática, UUIDs preservadas, nome sugerido `rota-{codigo}-proposta-{data}.json`. "Definir como vigente": ação técnica (não é aprovação), pede `data_publicacao` manual, remove `data_criacao`, `status:"vigente"`, UUIDs preservadas. Ambas passam pela validação bloqueante.
**Origem:** Spec 02 §4.1; Spec 04 §12.
**Tipo:** UI | JSON. **Criticidade:** Alta. **Afeta:** F, J, T.

---

## Grupo 17 — Comparador

## RN-080 — Comparador é leitor estático, somente-leitura, sem persistência

**Descrição:** Recebe dois JSONs válidos; não chama OSRM, não recalcula rota/matriz/município/descrição, não altera os arquivos, não salva nada no servidor. Reaproveita das regras de cálculo apenas as checagens estáticas (350 m, tipificação) e a contagem neutra a feriado.
**Origem:** Spec 01 §2, §8; Spec 03 §12; Spec 05 §1, §2.
**Tipo:** Arquitetura | Comparador. **Criticidade:** Alta. **Afeta:** C, T.

## RN-081 — Casamento por UUID (regra dura)

**Descrição:** Para Seção, Serviço, Local e Viagem: mesma UUID nos dois arquivos → mesma entidade (compara campos); UUID só no Arq. 1 → Removida; só no Arq. 2 → Adicionada. Nenhuma heurística substitui essa regra.
**Origem:** Spec 01 §6; Spec 02 §12; Spec 05 §5.1–§5.2.
**Tipo:** Comparador. **Criticidade:** Alta. **Afeta:** C, P, T.

## RN-082 — Casamento por contexto para dados sem UUID

**Descrição:** Itinerário: `servico_uuid`+`sentido`. Parada: itinerário casado + Seção/Local referenciado (não pela `ordem`). ParDistância/ParSeção: Serviço casado + par não-ordenado de `secao_uuid`. Geolocalização de Seção: Seção+Serviço+sentido. Horário: Viagem casada + `parada_ordem`. Ponto de rota: **não** é comparado par-a-par (efeito observável).
**Origem:** Spec 05 §5.3; Spec 03 §3.6.2.
**Tipo:** Comparador. **Criticidade:** Alta. **Afeta:** C, T.

## RN-083 — Taxonomia fixa de diferenças

**Descrição:** Adicionado / Removido / Alterado / Inalterado / Alerta técnico. Direção posicional: Δ = Arq. 2 − Arq. 1. "Campo operacional" exclui autodeclaração (RN-012) e igualdade byte-a-byte de `geometria`. Propagação: Serviço é Alterado se qualquer coisa abaixo mudou.
**Origem:** Spec 05 §6.
**Tipo:** Comparador. **Criticidade:** Alta. **Afeta:** C, P, T.

## RN-084 — Bloqueio de Autos diferentes

**Descrição:** `autos.codigo` diferente entre os arquivos bloqueia a comparação principal (UUIDs nunca coincidiriam; diff degeneraria). Modo opcional "justapor assim mesmo" só justapõe agregados, não casa por UUID e não gera o PDF padrão.
**Origem:** Spec 05 §4.2, §4.4.
**Tipo:** Comparador | Validação. **Criticidade:** Alta. **Afeta:** C, T.

## RN-085 — Heurística de "entidade recriada" sinaliza, não casa

**Descrição:** Removida+Adicionada com nome/rótulo muito semelhante pode gerar alerta de "possível entidade recriada" — auxílio de leitura; nunca reclassifica para "Alterada".
**Origem:** Spec 05 §5.4.
**Tipo:** Comparador. **Criticidade:** Média. **Afeta:** C, P, T.

## RN-086 — Alerta de UUIDs não preservados

**Descrição:** Taxa de casamento por UUID anormalmente baixa (JSON criado do zero) → alerta proeminente na visão geral e no PDF, explicando que o diff campo-a-campo perde valor.
**Origem:** Spec 04 §3.2; Spec 05 §4.2, §5.5, §8.4.
**Tipo:** Comparador. **Criticidade:** Alta. **Afeta:** C, P, T.

## RN-087 — Rota comparada por sinais estáveis

**Descrição:** "Rota mudou" nunca é decidido por diferença byte-a-byte de `geometria`. Sinais estáveis: conjunto/ordem de paradas, pontos de rota pelo efeito, `distancia_km`/`duracao_s` com tolerância, e `descricao_itinerario.itens` (mais estável que `texto`). Deslocamento de Seção/Local relatado em metros via Haversine.
**Origem:** Spec 04 §18; Spec 05 §15.3–§15.4.
**Tipo:** Comparador. **Criticidade:** Alta. **Afeta:** C, P, T.
**Observações:** `DÚVIDA` — o valor da tolerância de distância/duração não está fixado. Ver Q-004.

## RN-088 — Diff de horário em `antigo → novo (Δ min)`

**Descrição:** Viagem casada por UUID: `horario_saida` e passantes por Seção mostrados como `08:00 → 08:15 (+15 min)`, horários absolutos, `Cidade - Nome da Seção`; mudanças de `dia_semana` e `viagem_feriado` mostradas como transição. Semana padrão e feriados separados; Locais só em anexo técnico.
**Origem:** Spec 05 §12.
**Tipo:** Comparador. **Criticidade:** Média. **Afeta:** C, P, T.

## RN-089 — Comparação de contagens e matrizes

**Descrição:** Viagens e opções comparadas por Serviço × sentido × faixa (faixas da Spec 04 §10) + totais, semana padrão; matrizes comparadas célula a célula (par casado) com estados igual/alterado/adicionado/removido e resumos por Serviço (maior aumento/redução, pares alterados, Δ ponta-a-ponta, impacto em pares compráveis).
**Origem:** Spec 05 §10, §11, §13, §14.
**Tipo:** Comparador | Cálculo. **Criticidade:** Média. **Afeta:** C, P, T.

## RN-090 — Rótulos Arquivo 1/Arquivo 2 configuráveis; direção posicional

**Descrição:** Arquivos são "Arquivo 1"/"Arquivo 2" (suporta vigente×proposta, proposta×proposta etc.); rótulo sugerido de `status`+data, editável, só exibição; trocar lados espelha o diff.
**Origem:** Spec 05 §3.1, §7.2.
**Tipo:** Comparador | UI. **Criticidade:** Baixa. **Afeta:** C, P, T.

## RN-091 — Validação de entrada do Comparador

**Descrição:** Por arquivo: JSON bem-formado, schema Spec 02 §14, UUIDs únicas (bloqueantes); 350 m estático e tipificação (alertas técnicos). Entre arquivos: mesmo Autos (bloqueante), `versao_schema` diferente (alerta, prossegue).
**Origem:** Spec 05 §4.
**Tipo:** Comparador | Validação. **Criticidade:** Alta. **Afeta:** C, T.

---

## Grupo 18 — PDF comparativo

## RN-092 — PDF comparativo próprio e completo

**Descrição:** Distinto do PDF operacional; client-side; estrutura: capa (dois arquivos + aviso SEI), resumo executivo, Serviços, viagens por faixa, opções, tabela horária comparativa, matrizes, mapas comparativos, anexo técnico (diffs campo-a-campo, Locais, pontos de rota por efeito, alertas, schema). Mesmas regras transversais (km, sem R$, sem offsets, `Cidade - Nome`, semana padrão rotulada).
**Origem:** Spec 01 §2, §8; Spec 05 §17.
**Tipo:** PDF | Comparador. **Criticidade:** Alta. **Afeta:** C, P, T.

---

## Grupo 19 — Ingestor futuro

## RN-093 — Ingestor é futuro e não bloqueia nada

**Descrição:** O Ingestor (JSON aprovado → PostgreSQL oficial) é ferramenta futura (Spec 06 inexistente); não faz parte do fluxo inicial; Formulário e Comparador funcionam sem ele. Não deve ser antecipado no MVP.
**Origem:** Spec 01 §2, §10; Spec 05 §21.
**Tipo:** Arquitetura | Ingestor. **Criticidade:** Alta. **Afeta:** I, T.

## RN-094 — UUID como chave no PostgreSQL

**Descrição:** No Ingestor, a UUID da entidade vira o id da linha — a identidade é a mesma em formulário → JSON → banco, sem tradução (depende de RN-005). Ingestor aplica as mesmas checagens estáticas dos leitores.
**Origem:** Spec 01 §6; Spec 02 §12; Spec 03 §14; Spec 05 §21.
**Tipo:** Ingestor | Arquitetura. **Criticidade:** Média (futura). **Afeta:** I, T.

---

## Grupo 20 — Regras negativas (o que o ROTA não deve fazer)

_(Detalhamento com riscos e revisão em `11-NEGATIVE_REQUIREMENTS.md` — aqui só o índice normativo.)_

## RN-095 — ROTA não é sistema de gestão de processo

**Descrição:** Sem status de pedido, ciclo de vida, pendência, manifestação, aprovação, prazo de vigência, DOE, registro de autoria, histórico de tratativas, auditoria, permissões ou autenticação de fluxo. Tudo isso é SEI.
**Origem:** Spec 01 §1, §3; Spec 04 §16 (critério 16); Spec 05 nota de posicionamento.
**Tipo:** Arquitetura | Domínio. **Criticidade:** **Alta (identidade do produto)**. **Afeta:** F, C, I, J, P, T.

## RN-096 — Formulário não persiste no servidor

**Descrição:** Nada é salvo no servidor; exportar o JSON **é** o salvar; retomar é reimportar. Sem backend transacional no MVP.
**Origem:** Spec 01 §2, §5, §8; Spec 04 §2.1.
**Tipo:** Arquitetura. **Criticidade:** Alta. **Afeta:** F, J, T.

## RN-097 — Ferramentas desacopladas; contrato único é o JSON

**Descrição:** Formulário, Comparador e Ingestor não compartilham estado; o único contrato é o JSON de operação. Comparador não altera JSON; comparativo não é gravado dentro do JSON nem do formulário.
**Origem:** Spec 01 §2, §5, §8; Spec 05 §2.
**Tipo:** Arquitetura. **Criticidade:** Alta. **Afeta:** F, C, I, J, T.

---

## Grupo 21 — Operação excepcional

## RN-098 — Entidade TabelaExcepcional no Serviço

**Descrição:** `servico.tabelas_excepcionais[]` é uma coleção de grades de operação excepcional, cada elemento `{ uuid, tipo, descricao? }`. `uuid` é UUIDv4 preservada na importação (identidade — RN-001..004). `tipo ∈ { "ferias_verao", "ferias_inverno", "personalizado" }`: os dois primeiros são rótulos fixos (filtráveis por serem valores fechados), o terceiro é categoria livre. `descricao` (string) é **obrigatória sse `tipo == "personalizado"`** e ausente/nula nos demais. **Cardinalidade:** no máximo **uma** `ferias_verao` e **uma** `ferias_inverno` por Serviço (tipos canônicos únicos); `personalizado` pode repetir. **Não** há verificação de sobreposição entre tabelas — a vigência é categoria textual, responsabilidade do usuário. **Remoção (DEC-098):** uma tabela só pode ser removida quando nenhuma Viagem do mesmo Serviço a referencia; caso contrário, o Formulário bloqueia a ação, informa a quantidade associada e não aplica cascata nem conversão para a grade comum. Campos opcionais com default (`versao_schema` 1.0 → 1.1; documentos antigos seguem válidos).
**Origem:** Spec 02 §6.1, §14, §13; Spec 04 §8.5; DEC-081; DEC-098.
**Tipo:** Domínio | JSON | Validação. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.

## RN-099 — Grade excepcional da Viagem e sua semântica

**Descrição:** Uma Viagem com `tabela_excepcional_uuid ≠ null` pertence à tabela excepcional (do mesmo Serviço) de igual `uuid` — não à grade comum nem à de feriado; a referência deve apontar para uma tabela existente. Invariante: `tabela_excepcional_uuid ≠ null ⇒ viagem_feriado = false` (RN-061). **Integridade na remoção (DEC-098):** enquanto houver qualquer Viagem do Serviço referenciando a UUID da tabela, sua remoção é bloqueada com a quantidade associada; não há cascata nem conversão silenciosa da Viagem para a grade comum. **Precedência feriado > excepcional > comum:** em feriado, a operação de feriado prevalece e a excepcional cai; a tabela excepcional **não** tem sub-grade de feriado própria (RN-068). Viagens excepcionais **não** entram nas contagens da semana padrão (RN-069). No Formulário, cada tabela excepcional é uma grade própria (mesma estrutura da grade comum), semeável pela ação única `Copiar (sobrescrever)` (Spec 04 §8.5), que sincroniza a grade com a origem escolhida preservando o `uuid` das Viagens casadas do destino e gerando UUID nova só para as acrescentadas (RN-007; DEC-099). No Comparador, cada grade excepcional é casada por `uuid` da tabela e exibida em tabela separada, sem misturar; mudança de grade aparece como `comum → Férias de verão`, etc.
**Origem:** Spec 02 §11, §6.1; Spec 03 §9.1, §9.2; Spec 04 §8.5; Spec 05 §10.4, §12.3; DEC-081; DEC-098; DEC-099.
**Tipo:** Domínio | JSON. **Criticidade:** Alta. **Afeta:** F, C, I, J, P, T.

---

## Anotações de conflito e dúvida (resumo)

| ID            | Tipo            | Descrição                                                                                                                                                                                                                                                        | Encaminhamento                                              |
| ------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| CONFLITO-01   | Prompt × Specs  | O prompt gerador deste kit (regra 24) descreve Viagem com "frequência semanal e regra binária de feriado" — modelo **superado** pela Spec 02 §11 v0.6 (Viagem estratificada por dia + `viagem_feriado` booleano). **As specs prevalecem** (RN-061).              | Registrado; nenhum documento deste kit usa o modelo antigo. |
| CONFLITO-02   | Redação Spec 03 | §3.7.3 lista `matriz_distancias` entre os lugares onde Locais "continuam existindo normalmente"; Locais não têm entrada na matriz (pares são de Seções — RN-054), apenas seus trechos são somados (RN-055). Conflito aparente de redação, sem impacto normativo. | Ver Q-002.                                                  |
| ~~DÚVIDA-01~~ | Spec 03 §10.2   | ~~Partição código-a-código dos mistos rodoviários não fechada.~~ **Resolvida (DEC-026):** Spec 03 v0.5 fechou a partição com os códigos definitivos (`CR`/`CL`, `EX`, `LE`, `ME`/`MEL`, `ML`/`MLL`, `MX`, `MM`/`MML`); `SL` não existe.                          | Q-001 decidida.                                             |
| DÚVIDA-02     | Spec 05 §15.3   | Tolerância numérica para "distância/duração com tolerância" não fixada.                                                                                                                                                                                          | Q-004.                                                      |
