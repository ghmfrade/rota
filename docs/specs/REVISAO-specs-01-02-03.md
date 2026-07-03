# Revisão Crítica — Specs 01, 02 e 03

**Data:** 2026-07-02
**Objetivo:** Encontrar falhas, contradições e lacunas nas Specs 01 (Visão Geral), 02 (Esquema JSON) e 03 (Regras de Negócio) **antes** de escrever a Spec 04 (Formulário).
**Nota:** Os 11 problemas da revisão anterior (`old/PROBLEMAS-ENCONTRADOS.md`, sobre 01/02) foram em grande parte **resolvidos** nas versões atuais (matriz em km; invariante "mesmo conjunto de Seções" Ida/Volta; UUID global; terminologia Seção/Local; enum binário de `regra_feriado`; nota do Comparador em §4.1). Este documento lista o que **ainda** falta.

Cada item traz: severidade, referência, o problema, o cenário de quebra e a solução proposta. A ordenação prioriza o que **bloqueia ou condiciona a Spec 04**.

---

## 🔴 Bloqueiam a Spec 04 (decidir antes de avançar)

### P1. "Opção de Deslocamento" é usada como regra de negócio, mas nunca é definida como cálculo

**Ref.:** Spec 01 §4 (glossário), Spec 03 §9.2, §12.

**Problema:** A Opção de Deslocamento é declarada "estatística derivada (par origem-destino comprável por viagem × seccionamento)" no glossário e é citada como regra crucial em Spec 03 §9.2 ("feriado não altera contagem de viagens **nem de opções de deslocamento**"). Mas **nenhuma das três specs define o algoritmo** de contagem: o que conta como um par comprável, como o seccionamento entra, se multiplica por viagem, por dia da semana, por sentido, etc. A Spec 03 é justamente o documento de "Regras de Negócio e Cálculo" — é onde essa definição deveria estar.

**Cenário de quebra:** A Spec 04 (PDF operacional) e a Spec 05 (Comparador) **ambas** dependem dessa contagem (o Comparador precisa comparar "nº de opções de deslocamento" entre versões). Sem a fórmula, dois implementadores contam de formas diferentes e o número no PDF ≠ número no Comparador.

**Solução:** Adicionar uma seção nova na Spec 03 (ex.: §9.4 ou uma §10 dedicada) definindo com precisão o conceito.
Para o cálculo utiliza-se:
(a) N° de conjuntos de pares O-D compráveis de um Serviço = pares em `matriz_seccionamento`
(b) Total de Viagens semanais de cada viagem dentro de "viagens" (frequencia semanal daquele horário) em cada sentido existente na **semana_padrao**.

cálculo:
b_viagem_1_ida = len(dias_semana_da_viagem_1_ida)
opcoes_de_deslocamento_ida = a _ (b_viagem_1_ida + b_viagem_2_ida + b_viagem_3_ida...)
opcoes_de_deslocamento_volta = a _ (b_viagem_1_volta + b_viagem_2_volta + b_viagem_3_volta...)

Fechar isto **antes** da Spec 04.

---

### P2. Tipificação de mistos rodoviários × litoralidade: declarada "fechada", mas na prática indefinida e internamente contraditória

**Ref.:** Spec 03 §10.2 (tabela), §10.3 regra 3, §10.4; Spec 01 §7; Spec 02 §6.

**Problema:** A §10.3 regra 3 diz que o **componente convencional** de um misto segue a litoralidade (`RO` em não-litorâneo, `ROL` em litorâneo). Mas os códigos de misto do enum (`MLRO`, `MEXR`, `MROS` carregam "RO"; **não existe** variante litorânea tipo "MLROL") **não conseguem expressar** um convencional litorâneo. A tabela §10.2 lista genericamente "+ mistos rodoviários" **tanto** em Rodoviário **quanto** em Rodoviário Litorâneo, sem partição código-a-código. O próprio texto admite que a partição fechada "é acrescentada aqui **se a operação exigir**" — ou seja, está em aberto, apesar de a seção se intitular "decisões fechadas".

**Cenário de quebra:** A validação de tipificação da Spec 04 precisa decidir, deterministicamente, se `MLRO` é permitido num Autos "Rodoviário Litorâneo". A spec atual não permite responder isso — a regra 3 sugere "não" (tem RO, não ROL), mas a tabela §10.2 sugere "sim" (mistos permitidos em ambos). Contradição.

**Solução:** Produzir uma tabela **fechada, código-a-código**, mapeando cada um dos `tipo`(s) permitido(s).

Alterar Spec01 e 03, com as informações da tabela abaixo. O Semileito foi removido, ele não precisa existir.
Alterar também o exemplo do json, para adequar aos codigos de `caracteristica_veiculo`.

Detalhamento das características do veículo permitidas por tipo de Autos

atributo: `caracteristica_veiculo`

Tipo do Autos Semiurbano:

- "SU" - Semiurbano

Tipo do Autos Litorâneos:

- "SUL" - Semiurbano Litorâneo

Tipo do Autos Rodoviário

- "CR": Convencional Rodoviário
- "EX": Executivo
- "LE": Leito
- "ME": Misto Convencional Rodoviário e Executivo
- "ML": Misto Convencional e Leito
- "MX": Misto Executivo e Leito
- "MM": Misto Convencional Rodoviário, Executivo e Leito.

Tipo do Autos Rodoviário Litorâneo

- "CL": Convencional Rodoviário Litorâneo
- "EX": Executivo
- "LE": Leito
- "MEL": Misto Convencional Rodoviário Litorâneo e Executivo
- "MLL": Misto Convencional Rodoviário Litorâneo e Leito
- "MXL": Misto Executivo e Leito
- "MML": Misto Convencional Rodoviário Litorâneo, Executivo e Leito.

---

### P3. Origem do JSON "vigente" não está atribuída a nenhuma ferramenta/ator

**Ref.:** Spec 02 §4.1; Spec 01 §2 (tabela de ferramentas), §8.

**Problema:** O Formulário gera `status: "proposta"` com `data_criacao` **automática**. Mas o Comparador (entrada "vigente × proposta") e o pré-preenchimento (§8) precisam de um JSON **vigente** (`status: "vigente"` + `data_publicacao` manual). A Spec 02 §4.1 só diz que virar vigente "é feito gerando um novo JSON com o status e a data corretos" — **não diz qual ferramenta faz isso, quem aciona, nem quando**. A tabela de ferramentas da Spec 01 §2 mostra o Formulário produzindo "JSON de operação" genericamente, sem o passo de marcação como vigente.

**Cenário de quebra:** Depois da aprovação no SEI, alguém precisa transformar a proposta aprovada no JSON vigente que servirá de baseline futura. Se nenhuma ferramenta oferece "marcar como vigente + informar data de publicação", esse artefato nunca é produzido de forma controlada (fica edição manual do JSON, arriscada).

**Solução:** Atribuir explicitamente à Spec 04 (Formulário): expor no Formulário a ação "definir status = vigente" com campo de `data_publicacao`, preservando todas as UUIDs. Registrar essa responsabilidade em Spec 01 §2/§8 e Spec 02 §4.1.

---

### P4. O valor do diff depende de a proposta ser derivada do vigente — e isso não é exigido nem guiado

**Ref.:** Spec 01 §6, §8; Spec 02 §12.

**Problema:** Toda a proposta de valor das UUIDs estáveis (diff campo-a-campo) pressupõe que a proposta seja construída **importando o JSON vigente como base** (UUIDs preservadas). Se a empresa montar a proposta **do zero**, todas as UUIDs são novas e o Comparador reporta "removeu tudo e criou tudo" — exatamente o que Spec 01 §6 diz que se quer evitar. Hoje isso é só uma recomendação implícita; nada obriga nem orienta o caminho "importar vigente primeiro".

**Cenário de quebra:** Empresa faz alteração de uma linha existente, mas começa do zero (ou perdeu o JSON vigente). O Comparador fica inútil para aquela alteração.

**Solução:** A Spec 04 deve tornar "carregar JSON vigente como base" o caminho **padrão e fortemente guiado** para _alterações_ (vs. criação de novo Autos de linha), e documentar o modo de falha. Vale uma nota em Spec 01 §6 deixando claro que a estabilidade das UUIDs só funciona nesse fluxo.

---

## 🟡 Precisam de decisão, mas não travam o início da Spec 04

### P5. Comparação de rota por `geometria` congelada é frágil (falsos positivos)

**Ref.:** Spec 02 §10.2; Spec 03 §3.6.2.

**Problema:** `rota.geometria`/`distancia_km` são congelados a partir do OSRM no momento da geração. Dois JSONs gerados em datas diferentes (mapa/versão do OSRM público mudou) podem ter geometria e distância **ligeiramente diferentes mesmo com paradas idênticas**. O Comparador, ao comparar geometria/distância, acusaria "rota mudou" quando nada mudou no dado de entrada.

**Cenário de quebra:** Vigente roteado em jan/2026, proposta roteada em jul/2026, mesmas paradas → diff falso de rota em todos os itinerários.

**Solução:** Deixar consignado (para a Spec 05) que a comparação de rota deve se basear em sinais **estáveis/semânticos** — sequência de paradas, `pontos_de_rota`, e distâncias na `matriz_distancias` com **tolerância** — e não em igualdade bit-a-bit de `geometria`. Registrar já em Spec 03 §3.6.2 como orientação ao Comparador.

### P6. Remoção/edição de ponto de uma Seção pode quebrar o invariante dos 350 m; a justificativa em §7.2 está incorreta

**Ref.:** Spec 03 §7.2 (casos de borda).

**Problema:** (a) O §7.2 afirma "o centroide de um subconjunto não viola o limiar se o do conjunto maior não violava" — isso é **falso** como enunciado geral (existe conjunto que satisfaz o invariante do centroide final e, ao remover um ponto, passa a violá-lo). (b) O algoritmo de inserção incremental **não cobre a edição** das coordenadas de um ponto já existente (arrastar uma geolocalização no mapa), que claramente pode romper o invariante. A revalidação na remoção é tratada como "pode revalidar por robustez" (opcional).

**Cenário de quebra:** Usuário move uma geolocalização de uma Seção compartilhada; o novo conjunto viola os 350 m mas nada revalida → JSON gerado falha na checagem estática (§7.3) do Comparador/Ingestor.

**Solução:** Tornar a revalidação **obrigatória** em remoção **e** edição; definir "editar coordenada" como remover+reinserir com a checagem plena de §7.2; remover a justificativa matemática incorreta (basta dizer "revalida-se o conjunto resultante").

### P7. Linhas circulares (mesmo terminal no início e no fim) não são suportadas — e isso não está no não-escopo

**Ref.:** Spec 02 §10.1, §14; Spec 03 §4.4.

**Problema:** §14 exige ≥2 Seções **distintas**; §10.1 exige que primeira e última parada sejam Seções distintas; §4.4 diz "Seção repetida no itinerário: fora do escopo". Logo, uma linha que começa e termina no **mesmo** terminal (circular), ou que revisita uma Seção, é inválida — mas essa limitação **não aparece** no não-escopo da Spec 01 §3.

**Cenário de quebra:** Linha semiurbana circular (sai e volta ao mesmo terminal) não pode ser modelada, e nada avisa o usuário disso antecipadamente.

**Solução:** Ou (a) declarar explicitamente em Spec 01 §3 que linhas circulares/com Seção repetida estão fora de escopo; Casos de linhas circulares deverão ser tratados como dois serviços em que um termina onde o outro começa, ficando responsabilidade do usuário conectar os horários de fim das viagens com o início da seguinte. (não são muitos casos desse no nosso sistema)

### P8. Dependência do OSRM demo público como infraestrutura de produção

**Ref.:** Spec 01 §8; Spec 03 §3.2, §3.5, §3.6.

**Problema:** `router.project-osrm.org` é o **servidor de demonstração** do projeto OSRM — sem SLA, com limites de uso, e cujos termos desencorajam uso em produção. A Spec 03 §3.6 ainda assume comportamento específico (`waypoints` no serviço `route`) que o demo pode não honrar (a própria spec prevê fallback, o que evidencia a incerteza). Para uma ferramenta da ARTESP, depender do demo é risco operacional real, não só de indisponibilidade pontual.

**Solução:** Registrar como decisão de arquitetura para a Spec 04:

- Ao carregar um arquivo JSON dos Autos, nunca depender do OSRM para abrir itinerarios. Os mapas carregam o itinerário salvo em "rota". Usa-se o OSRM gratuito apenas para alterar os itinerarios de alguma forma (inserir ou alterar local de secao, ponto de parada ou ponto de rota)
- Registrar qual motor gerou a rota (alteraçao no spec 02) [`fonte_calculo`, `data_calculo`, `perfil`]

---

## 🟢 Higiene / menores

### P9. Formato de tempo diverge entre Spec 02 e Spec 03 no caso > 24 h

**Ref.:** Spec 02 §11 (HH:MM:SS) vs Spec 03 §8.1 ("o formato não impõe teto de 2 dígitos na hora").

**Problema:** A Spec 02 tipa `offset_horario`/`horario_saida` como `HH:MM:SS` (sugere 2 dígitos, validável por regex fixa); a Spec 03 admite hora com mais de 2 dígitos. Ambiguidade para a validação estrutural.

**Solução:** Escolher um: como o domínio é intermunicipal (< 24 h), fixar os offsets (tempo de deslocamento)`HH:MM:SS` com `HH` em 00–23 e alinhar as duas specs.

### P10. Redação da unicidade de UUID: "dentro da sua categoria" vs "documento inteiro"

**Ref.:** Spec 02 §14 ("único dentro da sua categoria") vs §6/§12 e Spec 01 §6 (unicidade no documento inteiro, para o Ingestor usar como PK).

**Problema:** A §14 diz "único dentro da sua categoria, no documento inteiro"; §12 e Spec 01 §6 justificam unicidade **global** (para o Ingestor não ter ambiguidade). Colisão UUIDv4 é desprezível, então é só redação — mas as frases parecem dizer coisas diferentes.

**Solução:** Uniformizar para "cada `uuid` é único no documento inteiro, entre todas as entidades (Seção, Serviço, Local, Viagem)".

### P11. Exemplo de `matriz_seccionamento` (Spec 02 §15) não corresponde a nenhum dos dois modos de sugestão

**Ref.:** Spec 02 §15 vs Spec 03 §6.

**Problema:** No exemplo, `matriz_seccionamento` usa 8/6/14, enquanto o `valor_adotado_de_distancia` do próprio Serviço é 8/6,05/14,05 e "menor distância" (Serviço único) daria o mesmo. Os valores 6 e 14 não batem com nenhum modo nem com edição explicada — parecem arredondamentos manuais não comentados, o que confunde quem usa o exemplo para entender §6.

**Solução:** Ajustar o exemplo para refletir um dos modos (6,05 / 14,05) ou adicionar nota "valores editados manualmente pelo usuário após a sugestão".

### P12. Notação de sub-referência `§13.6`, `§13.15` (Spec 01)

**Ref.:** Spec 01 §6, §8.

**Problema:** "Spec 02 §13.6" / "§13.15" significam "§13, item 6/15" da lista de decisões, mas a notação sugere subseções inexistentes.

**Solução:** Trocar por "Spec 02 §13, item 15" (ou similar) para não induzir a procurar uma subseção.

### P13. Contagem "semana padrão" vs operação real de feriado — garantir rotulagem no PDF

**Ref.:** Spec 03 §9.2, §9.3.

**Problema:** Como `regra_feriado: "circula"` é aditivo mas **não** entra na contagem, o "nº de viagens" é um valor **nominal da semana padrão**, que diverge da operação real em semanas com feriado. É decisão consciente e correta, mas o PDF/legenda precisa deixar claro que o número é "semana padrão (sem feriado)".

**Solução:** Requisito de exibição para a Spec 04: rotular explicitamente as contagens como "semana padrão" e apresentar `regra_feriado` como informação separada. Sem mudança de regra — apenas apresentação.

---

## Resumo executivo

| #   | Severidade | Tema                                | Ação principal                              |
| --- | ---------- | ----------------------------------- | ------------------------------------------- |
| P1  | 🔴         | Opção de Deslocamento sem algoritmo | Definir cálculo na Spec 03                  |
| P2  | 🔴         | Mistos × litoralidade contraditório | Tabela fechada código-a-código na Spec 03   |
| P3  | 🔴         | Origem do JSON "vigente"            | Atribuir ação ao Formulário (Spec 04)       |
| P4  | 🔴         | Diff exige derivar do vigente       | Guiar fluxo "importar vigente" na Spec 04   |
| P5  | 🟡         | Diff de rota por geometria          | Comparar por sinais estáveis (Spec 05)      |
| P6  | 🟡         | 350 m em remoção/edição             | Revalidação obrigatória; corrigir §7.2      |
| P7  | 🟡         | Linhas circulares                   | Declarar no não-escopo ou suportar          |
| P8  | 🟡         | OSRM demo em produção               | Prever auto-hospedagem (req. não-funcional) |
| P9  | 🟢         | Formato de tempo > 24 h             | Uniformizar HH:MM:SS                        |
| P10 | 🟢         | Redação unicidade UUID              | Uniformizar "documento inteiro"             |
| P11 | 🟢         | Exemplo de seccionamento            | Ajustar/anotar                              |
| P12 | 🟢         | Notação §13.6/§13.15                | Reescrever referência                       |
| P13 | 🟢         | Rótulo "semana padrão" no PDF       | Requisito de exibição (Spec 04)             |

**Recomendação para abrir caminho à Spec 04:** resolver **P1–P4** primeiro (P1 e P2 dentro da própria Spec 03; P3 e P4 como escopo explícito da Spec 04). P5–P8 podem ser registrados como notas direcionadas às specs 04/05. P9–P13 são correções de texto que podem ser feitas em lote nas Specs 01/02/03.
