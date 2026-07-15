# 18 — DESIGN_SYSTEM: Padrão Visual do ROTA

**Status:** vinculante para toda task que toque UI (DEC-050/Q-031). Subordinado à Spec 04: em divergência, o **comportamento/estrutura** da spec sempre prevalece — este documento só governa **aparência**.
**Base técnica:** Tailwind CSS 4 (tokens via `@theme` em `src/app/globals.css`), processamento em build. Nenhuma biblioteca de UI ou de ícones externa.

---

## 1. Princípios

1. **Aparência sóbria e institucional** — paleta azul/cinza, superfícies claras, profundidade por sombra sutil, transições curtas. Nada de gradientes chamativos ou animação gratuita.
2. **Comportamento intocável** — o redesign nunca altera validação, fluxo, contrato JSON, mensagens da Spec 04 §14, `data-testid` ou `aria-*` existentes. E2E passam sem alterar seletores.
3. **Componente antes de elemento cru** — botão, campo, select, painel, selo, tabela e tooltip vêm de `src/shared/ui/`; nunca estilizar um elemento cru localmente para "sair mais rápido".
4. **Tokens antes de valor solto** — cores, sombras, raios e durações vêm dos tokens do `@theme`; valores hexadecimais/px avulsos em componente são proibidos.
5. **Full-screen** — o app ocupa a viewport inteira (`100dvh`); cada região tem seu próprio scroll. O `body` não rola horizontalmente.

## 2. Tokens (`@theme` em `src/app/globals.css`)

### Cores

| Token | Valor | Uso |
|---|---|---|
| `--color-azul-50` | `#eff6ff` | fundo de item ativo suave, hover de linha |
| `--color-azul-100` | `#dbeafe` | fundo de selo/realce |
| `--color-azul-300` | `#93c5fd` | bordas de foco secundárias |
| `--color-azul-600` | `#2563eb` | **cor primária** — botão primário, item ativo, links |
| `--color-azul-700` | `#1d4ed8` | hover do primário |
| `--color-azul-900` | `#1e3a5f` | cabeçalho/sidebar escuros, texto sobre azul claro |
| `--color-cinza-50` | `#f8fafc` | fundo geral do conteúdo |
| `--color-cinza-100` | `#f1f5f9` | fundo de painel secundário, zebra de tabela |
| `--color-cinza-200` | `#e2e8f0` | bordas padrão |
| `--color-cinza-400` | `#94a3b8` | texto desabilitado, placeholder |
| `--color-cinza-500` | `#64748b` | texto secundário |
| `--color-cinza-700` | `#334155` | **texto padrão** |
| `--color-cinza-900` | `#0f172a` | títulos |
| `--color-erro` | `#dc2626` | pendência **bloqueante**, botão perigo, erro de campo |
| `--color-alerta` | `#d97706` | pendência **alerta** (não bloqueante) |
| `--color-sucesso` | `#16a34a` | confirmações, estado válido |

A distinção bloqueante × alerta do painel de pendências (Spec 04 §11) usa **sempre** `--color-erro` × `--color-alerta` — nunca inverter nem aproximar os dois.

### Tipografia, raios, sombras, transições

- **Fonte:** `system-ui` stack (a atual) — sem fonte externa (export estático, sem rede).
- **Escala:** títulos `text-2xl/xl/lg` semibold em `cinza-900`; corpo `text-sm`/`text-base` em `cinza-700`; auxiliar `text-xs` em `cinza-500`.
- **Raios:** `--radius-painel: 12px` (painéis/cartões), `--radius-controle: 8px` (botões/campos), círculo para carimbos.
- **Sombras:** `--shadow-sombra-1` (`0 1px 2px rgb(15 23 42 / 0.06)`) para controles em repouso; `--shadow-sombra-2` (`0 2px 8px rgb(15 23 42 / 0.10)`) para painéis e hover de controle; `--shadow-sombra-3` (`0 8px 24px rgb(15 23 42 / 0.16)`) para elementos flutuantes (tooltip, diálogo, painel de pendências aberto).
- **Transições:** `--transicao-rapida: 150ms cubic-bezier(0.2, 0, 0, 1)` (hover/foco), `--transicao-media: 250ms` (abrir/fechar painéis). Respeitar `prefers-reduced-motion: reduce` (desligar transform/animação).

## 3. Componentes base (`src/shared/ui/`)

Todos client-side, sem dependência fora de `shared/`, com props em português e testes unitários próprios.

| Componente | Contrato visual |
|---|---|
| `Botao` | variantes `primario` (fundo `azul-600`, texto branco, `sombra-1`; hover `azul-700` + `sombra-2` + elevação `-translate-y-px`), `secundario` (borda `cinza-200`, fundo branco, texto `cinza-700`), `perigo` (fundo `erro`), `fantasma` (sem borda, hover `cinza-100`). Foco: anel `azul-300`. Desabilitado: opacidade + cursor. Nunca altera `type`/handlers recebidos. |
| `Campo` / `Select` | rótulo `text-xs` `cinza-500` acima; controle com borda `cinza-200`, `radius-controle`, foco com anel azul; erro com borda/texto `erro`. Encapsula `<input>`/`<select>` nativos repassando props (inclusive `data-testid`). |
| `Painel` | superfície `radius-painel`, `sombra-2`, título opcional; variante colapsável preserva o padrão `<details>/<summary>` existente. Superfície por prop `tom`: `padrao` (branca, borda `cinza-200`), `informativo` (borda `azul-300`, fundo `azul-50`, texto `azul-900` — avisos), `destacado` (borda + anel `azul-600` — caminho recomendado da Spec 04 §3). Profundidade por prop `elevacao`: `padrao` (`sombra-2`) ou `flutuante` (`sombra-3`, só diálogos). |
| `Selo` | badge compacto (status `proposta`/`vigente`, contagens): fundo `azul-100`/`cinza-100`/`erro`-suave conforme tom, texto `text-xs` semibold. |
| `Tabela` | wrapper com `overflow-x-auto`; cabeçalho `cinza-100` sticky, linhas com zebra `cinza-50` e hover `azul-50`; células `text-sm`. Nunca altera a estrutura semântica `<table>/<thead>/<tbody>` existente. |
| `Tooltip` | flutuante `cinza-900` texto branco, `sombra-3`, `radius-controle`; **segue o cursor** via `onMouseMove` (com offset fixo), aparece com atraso ~300 ms e fade `transicao-rapida`. Só decorativo: o rótulo acessível continua no elemento (`aria-label`/texto), nunca só no tooltip. |
| `Carimbo` | **botão** circular (`<button>`, `rotulo` obrigatório → `aria-label`) com ícone SVG próprio dentro de moldura circular (borda 2px) — usado no stepper. Estados: repouso (traço `cinza-500`, fundo transparente), hover (traço `azul-600`, fundo `azul-50`), **ativo** (fundo `azul-600`, traço branco, `sombra-2`). Transição `transicao-rapida`. |
| `MolduraCarimbo` | mesma moldura circular, **decorativa** (`<span>`, nasce `aria-hidden`) — para ícone-carimbo sem ação, como nos cartões da tela inicial. Tons `repouso`/`destaque`/`ativo`. Forma e tons vêm do mesmo módulo do `Carimbo`: o círculo nunca é redesenhado localmente. Onde o carimbo **não** clica, usar esta — nunca o `Carimbo`, que injetaria um botão que não faz nada (§1.2). |

## 4. Ícones-carimbo

SVGs próprios (24×24, `stroke` uniforme 1.75, `fill="none"`, `currentColor`), catálogo em `src/shared/ui/carimbos/`:

| Ícone | Uso |
|---|---|
| sigla **"ID"** | etapa Identificação |
| ônibus | etapa Serviços |
| mapinha (dobras + traçado) | etapa Seções, Locais e Itinerários |
| relógio | etapa Viagens e horários |
| grade triangular | etapa Matrizes |
| lista com check | etapa Revisão |
| seta de download | etapa Exportação JSON/PDF |
| pasta | tela inicial — Carregar JSON existente |
| folha nova | tela inicial — Criar Autos do zero |

Nomenclatura oficial das specs nos rótulos (nunca traduzir/renomear conceitos — doc 04 princípio 12).

## 5. Padrões de layout

- **Shell do formulário:** `100dvh` em grid — **sidebar fixa à esquerda** (largura ~72px, fundo `azul-900`, coluna de `Carimbo`s das 7 etapas, item ativo destacado, tooltip com o nome da etapa no hover) + coluna de conteúdo (cabeçalho persistente compacto no topo; área de etapa com scroll próprio e `max-width` ~72rem centralizada, fundo `cinza-50`). A sidebar implementa o "stepper lateral" da Spec 04 §4: continua um `<nav>` com `<ol>/<li>/<button>`, `aria-current="step"`, navegação livre.
- **Painel de pendências e resumo operacional:** colapsáveis no shell (Spec 04 §4), com contagem visível quando fechados (selo `erro`/`alerta`); abertos, apresentam-se como cartão elevado (`sombra-2`) **no fluxo do conteúdo, nunca sobrepondo elementos interativos** — overlay que intercepta cliques quebra o formulário (comportamento prevalece, §1.2). `sombra-3` fica reservada a flutuantes efêmeros (tooltip, diálogo).
- **Tela inicial:** full-screen, hero centrado (título + descrição), dois cartões de ação lado a lado (`Painel` + `MolduraCarimbo` de pasta/folha — decorativa, pois quem clica é o input/botão do cartão, não o carimbo), com o caminho "Carregar JSON existente" visualmente destacado como recomendado (Spec 04 §3) via `Painel tom="destacado"` + `Selo`.
- **Mapa:** em destaque na etapa de itinerários (Spec 04 §7), moldura `radius-painel` + `sombra-2`; a tabela lateral de paradas acompanha na mesma linha visual.

## 6. Regras de consistência (vinculantes — checadas na revisão de aderência)

1. **Proibido `style=` inline**, exceto dimensões dinâmicas calculadas em runtime (ex.: container do mapa, posição do tooltip que segue o cursor).
2. Todo botão/campo/select/painel/selo/tabela/tooltip vem de `src/shared/ui/`.
3. Cores/sombras/raios/durações **só** via tokens/utilitários do `@theme` — nenhum hex/px avulso em componente.
4. **Variação de aparência de um componente de `shared/ui` vem de prop, nunca de `className` por cima.** Utilitários Tailwind conflitantes (duas cores de borda, dois fundos, duas sombras, dois `size-*`) têm a mesma especificidade e resolvem-se pela **ordem de emissão no CSS** — que segue a ordem dos tokens no `@theme`, não a ordem em que as classes foram escritas. Sobrepor perde em silêncio: sem erro, sem teste vermelho, só a tela saindo diferente do planejado. Precedente real: `border-azul-300 bg-azul-50` sobre o `Painel` deixou os avisos de modo brancos até a revisão da TASK-052. Falta a variante de que você precisa? Adicione a prop ao componente e documente aqui — não contorne por `className`. `className` continua livre para o que não disputa: posição, espaçamento, largura, `text-sm`.
5. `data-testid` e `aria-*` existentes são **intocáveis**; novos elementos interativos nascem acessíveis (rótulo, foco visível, `aria-*`).
6. O utilitário `sr-only` existe de verdade no CSS (hoje é referenciado e não definido).
7. Rótulos usam a nomenclatura oficial (Autos, Serviço, Seção, Local, Parada, `numero_n`…) e o padrão `Cidade - Nome da Seção` (RN-076).
8. Toda tela **nova** (Revisão, Exportação, Comparador, futuras) nasce sob este documento — não existe "estilizar depois".

## 7. O que este documento NÃO governa

Comportamento, fluxo, mensagens, validações, contrato JSON, regras de negócio — tudo isso permanece nas specs e RNs. Mudança de comportamento nunca entra por task de design; se uma melhoria visual exigir mudar comportamento, vira Q-xxx.
