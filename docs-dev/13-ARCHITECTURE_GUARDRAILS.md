# 13 — ARCHITECTURE_GUARDRAILS: Guardrails Arquiteturais

**Fonte:** Spec 01 §2/§5/§8; Spec 03 §3; Spec 04 §7.3; Spec 05 §1–§2. Regras: RN-093..097.

---

## Arquitetura esperada

- **React/Next.js**, comportamento majoritariamente **client-side** (SPA).
- **Sem backend transacional no MVP** — nenhum banco, nenhum endpoint de escrita.
- **Geração client-side de JSON** (exportar = salvar) e **de PDF** (operacional e comparativo).
- **OSRM público direto pelo front** (`router.project-osrm.org`, perfil `driving`) — em produção, instância auto-hospedada/provedor com SLA (DEC-025, Q-007), mesma API.
- **Mapa client-side** (OSM/MapLibre); imagem do mapa no PDF por captura do canvas.
- **Listas estáticas servidas junto do app**: Autos, empresas, tipos; base de municípios (`municipios_sp.geojson` + `pop_municipios.csv`); futura tabela de tarifa da portaria (versão futura — hoje sem R$).
- **Ingestor futuro separado**, único lugar onde existirá **PostgreSQL** (Spec 06 pendente).
- Organização sugerida de módulos: `shared/` (schema do contrato, validadores, primitivas geo, contagens), `formulario/`, `comparador/` — `formulario/` e `comparador/` só se comunicam via arquivo JSON, e só dependem de `shared/`.

## Separação das ferramentas

```text
Formulário ≠ Comparador ≠ Ingestor ≠ SEI
```

- **Formulário**: edita operação, chama OSRM, calcula e **congela**; exporta JSON + PDF operacional.
- **Comparador**: lê dois JSONs congelados, casa por UUID, exibe diff, gera PDF comparativo; **nunca** chama OSRM, **nunca** escreve.
- **Ingestor** (futuro): lê JSON aprovado, materializa no PostgreSQL com UUID como chave; não participa do MVP.
- **SEI**: sistema externo; recebe os artefatos; dono de todo o fluxo formal. O ROTA não integra com o SEI — o usuário peticiona manualmente.

O único contrato entre as ferramentas é o **JSON de operação** (Spec 02). Nenhum estado compartilhado, nenhuma API entre elas, nenhum storage comum.

## Proibições arquiteturais

- ❌ não criar banco transacional para o Formulário;
- ❌ não criar autenticação de fluxo, login, papéis ou permissões;
- ❌ não criar módulo de aprovação (nem "definir como vigente" como estado interno — é só exportação);
- ❌ não criar tabela/coleção de pedidos;
- ❌ não criar status de análise;
- ❌ não armazenar JSONs no servidor como ciclo oficial (nem "biblioteca de versões");
- ❌ não acoplar Comparador ao Formulário (imports cruzados fora de `shared/`);
- ❌ não exigir Ingestor para o Formulário/Comparador funcionarem;
- ❌ não integrar com o SEI por API;
- ❌ não introduzir servidor de cálculo (rota/PDF/matriz são client-side);
- ❌ não fazer testes dependerem do OSRM público (mock sempre).

## Riscos comuns com IA (padrões a vetar em revisão)

| Padrão sedutor | Por que aparece | Por que é errado aqui |
|---|---|---|
| Criar backend "para salvar o progresso" | hábito de CRUD | RN-096; exportar JSON é o salvar (NEG-009) |
| CRUD de processo/pedidos | "todo sistema tem" | é o SEI (NEG-001) |
| Login/permissão "por segurança" | boilerplate comum | não-escopo explícito (NEG-016) |
| Tabela de histórico/auditoria | "boa prática" | workflow disfarçado (NEG-007) |
| Status no JSON (`em_analise`, `aprovado`) | modelar o mundo real | só `proposta`/`vigente` existem (RN-011) |
| Confundir JSON proposta com "pedido" | vocabulário de processo | proposta é fotografia de operação, não solicitação |
| Confundir PDF operacional com documento de aprovação | aparência oficial | aviso SEI obrigatório (RN-077) |
| Transformar Comparador em workflow (aprovar/rejeitar diff) | parece útil | Comparador descreve; decisão é humana, fora do ROTA (Spec 05 §2) |
| Recalcular rota "para garantir" no Comparador | zelo aparente | leitores leem o congelado (NEG-019) |
| Fallback de distância em linha reta quando OSRM falha | resiliência aparente | corrompe tarifa (NEG-015) |
| Cache/persistência de rotas no servidor | performance aparente | persistência indevida + acopla ferramenta a servidor |
| "Normalizar" UUIDs ou reindexar entidades no import | limpeza aparente | destrói a identidade (NEG-014) |

## Diretrizes de dependências

- Bibliotecas de mapa: MapLibre GL (fixado pela Spec 01 §8 — OSM/MapLibre).
- Roteamento: cliente HTTP fino próprio sobre a API pública do OSRM (sem SDK pesado), com URL base configurável (dev → demo; prod → instância própria).
- Validação de schema: biblioteca declarativa com modo *strict* (rejeitar campos extras) — necessária para RN-010.
- PDF: geração client-side (ex.: pdfmake/@react-pdf) — decisão em Q-003.
- Nenhuma dependência que exija servidor próprio (ORMs, filas, auth SDKs) até a Spec 06.
