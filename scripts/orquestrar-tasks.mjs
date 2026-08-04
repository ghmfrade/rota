// Orquestrador de execução sequencial de tasks (desenho em docs-dev/20-ORQUESTRACAO/README.md).
//
// A máquina de estados é determinística e vive AQUI, em Node — o modelo nunca
// controla o laço. Cada fase é um processo `claude -p` separado, com contexto
// zero, salvo o par análise→implementação, que compartilha sessão via --resume
// (é o que a skill /implementar-task exige: plano aprovado na mesma conversa).
//
// Princípios inegociáveis deste script:
//   1. FALHA FECHADA. Saída inesperada, sinal ausente, JSON inválido, processo
//      com código != 0, timeout, budget estourado — tudo vira PARAR. Nunca
//      "seguir mesmo assim".
//   2. NÃO QUEIMA TOKEN À TOA. Modo padrão é ENSAIO (não executa nada); teto de
//      tempo por fase que mata o processo; teto de turnos por fase conferido no
//      resultado; budget global de custo e de turnos; triagem barata em opus
//      antes de gastar a fase cara de implementação.
//   3. NÃO DECIDE REGRA DE NEGÓCIO. Pergunta (Q-xxx Pendente no docs-dev/16) o
//      robô registra; resposta (DEC-xxx no docs-dev/10) é sempre humana.
//   4. NÃO DESTRÓI TRABALHO. Exige working tree limpo, roda em branch própria,
//      nunca faz reset/checkout destrutivo — quando para, para e conta.
//
// Node ESM puro, sem dependências, igual no Windows local e no Codespaces.

import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  appendFileSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const RAIZ = resolve(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
const DIR_CORRIDAS = join(RAIZ, "docs-dev", "20-ORQUESTRACAO", "corridas");
const ARQ_BACKLOG = join(RAIZ, "docs-dev", "06-BACKLOG_INICIAL.md");
const ARQ_TRAVA = join(DIR_CORRIDAS, ".trava");

// ---------------------------------------------------------------------------
// Tetos por fase. `turnos` é conferido DEPOIS da fase (a CLI 2.1.x não tem
// --max-turns); `minutos` é o timeout real, que mata o processo. O timeout é a
// trava dura contra processo perdido; o teto de turnos é o sinal de que a fase
// se enrolou e a corrida não deve continuar em cima dela.
// ---------------------------------------------------------------------------
const FASES = {
  analise: { modelo: "opus", turnos: 30, minutos: 20 },
  implementacao: { modelo: "sonnet", turnos: 90, minutos: 75 },
  analiseCorrecao: { modelo: "opus", turnos: 25, minutos: 20 },
  correcao: { modelo: "sonnet", turnos: 60, minutos: 60 },
  revisao: { modelo: "opus", turnos: 60, minutos: 45 },
  veredito: { modelo: "opus", turnos: 8, minutos: 10 },
};

const MAX_CORRECOES_TETO = 3; // teto rígido — --max-correcoes não sobe daqui.

// Ferramentas liberadas nas fases. `git commit`/`git add` não estão no
// settings.json do projeto (que só libera leitura de git), e sem isso a fase
// trava num prompt de permissão que nunca será respondido.
const FERRAMENTAS = [
  "Bash(npm:*)",
  "Bash(npx:*)",
  "Bash(node:*)",
  "Bash(git status:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "Bash(git show:*)",
  "Bash(git add:*)",
  "Bash(git commit:*)",
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function morrer(mensagem) {
  console.error(`\n[orquestrador] ERRO: ${mensagem}\n`);
  liberarTrava();
  process.exit(1);
}

function log(mensagem) {
  const hora = new Date().toISOString().slice(11, 19);
  console.log(`[${hora}] ${mensagem}`);
}

function git(args, { permitirFalha = false } = {}) {
  const r = spawnSync("git", args, { cwd: RAIZ, encoding: "utf8" });
  if (r.status !== 0 && !permitirFalha) {
    morrer(`git ${args.join(" ")} falhou:\n${r.stderr || r.stdout}`);
  }
  return (r.stdout || "").trim();
}

/** Localiza o executável do Claude Code sem depender do PATH. */
function resolverCli() {
  if (process.env.ROTA_CLAUDE_CLI) {
    if (!existsSync(process.env.ROTA_CLAUDE_CLI)) {
      morrer(`ROTA_CLAUDE_CLI aponta para caminho inexistente: ${process.env.ROTA_CLAUDE_CLI}`);
    }
    return process.env.ROTA_CLAUDE_CLI;
  }

  const noPath = spawnSync(process.platform === "win32" ? "where" : "which", ["claude"], {
    encoding: "utf8",
  });
  if (noPath.status === 0) {
    const primeiro = (noPath.stdout || "").split(/\r?\n/).find((l) => l.trim());
    if (primeiro) return primeiro.trim();
  }

  // Instalação embutida na extensão do VS Code (caso desta máquina).
  const base = join(process.env.USERPROFILE || process.env.HOME || "", ".vscode", "extensions");
  if (existsSync(base)) {
    const candidatos = readdirSync(base)
      .filter((d) => d.startsWith("anthropic.claude-code-"))
      .sort()
      .reverse()
      .map((d) => join(base, d, "resources", "native-binary", "claude.exe"))
      .filter((p) => existsSync(p));
    if (candidatos.length > 0) return candidatos[0];
  }

  morrer(
    "não encontrei o executável do Claude Code. Defina ROTA_CLAUDE_CLI com o caminho completo.",
  );
}

function lerJsonSeguro(caminho) {
  if (!existsSync(caminho)) return null;
  try {
    return JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Trava de execução — duas corridas simultâneas invalidariam a evidência
// canônica da suíte (fingerprint + identidade do working tree do
// test:all:verificar) e brigariam pela porta 3100.
// ---------------------------------------------------------------------------

let travaMinha = false;

function tomarTrava() {
  mkdirSync(DIR_CORRIDAS, { recursive: true });
  if (existsSync(ARQ_TRAVA)) {
    const dono = readFileSync(ARQ_TRAVA, "utf8").trim();
    morrer(
      `já existe corrida em andamento (${dono}). Se ela morreu, apague ${ARQ_TRAVA} e rode de novo.`,
    );
  }
  writeFileSync(ARQ_TRAVA, `pid ${process.pid} · ${new Date().toISOString()}\n`, "utf8");
  travaMinha = true;
}

function liberarTrava() {
  if (travaMinha && existsSync(ARQ_TRAVA)) {
    try {
      rmSync(ARQ_TRAVA);
    } catch {
      /* nada a fazer */
    }
    travaMinha = false;
  }
}

process.on("exit", liberarTrava);
process.on("SIGINT", () => {
  log("interrompido pelo usuário — o ledger está salvo, retome com --retomar.");
  liberarTrava();
  process.exit(130);
});

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------

function lerArgumentos(argv) {
  const a = {
    de: null,
    ate: null,
    tasks: null,
    executar: false, // ENSAIO é o padrão: sem --executar, nada é gasto.
    pularBloqueadas: false,
    maxCorrecoes: 3,
    budgetTurnos: 0, // 0 = sem teto global de turnos
    budgetUsd: 0, // 0 = sem teto global de custo
    retomar: null,
    permissoes: "acceptEdits",
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const proximo = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) morrer(`${arg} exige um valor`);
      i += 1;
      return v;
    };
    switch (arg) {
      case "--de": a.de = proximo().toUpperCase(); break;
      case "--ate": a.ate = proximo().toUpperCase(); break;
      case "--tasks": a.tasks = proximo().toUpperCase().split(",").map((t) => t.trim()); break;
      case "--executar": a.executar = true; break;
      case "--ensaio": a.executar = false; break;
      case "--pular-bloqueadas": a.pularBloqueadas = true; break;
      case "--parar-na-primeira": a.pularBloqueadas = false; break;
      case "--max-correcoes": a.maxCorrecoes = Number(proximo()); break;
      case "--budget-turnos": a.budgetTurnos = Number(proximo()); break;
      case "--budget-usd": a.budgetUsd = Number(proximo()); break;
      case "--retomar": a.retomar = proximo(); break;
      case "--permissoes": a.permissoes = proximo(); break;
      case "--ajuda":
      case "-h":
        imprimirAjuda();
        process.exit(0);
        break;
      default:
        morrer(`argumento desconhecido: ${arg}`);
    }
  }

  if (!Number.isInteger(a.maxCorrecoes) || a.maxCorrecoes < 0 || a.maxCorrecoes > MAX_CORRECOES_TETO) {
    morrer(`--max-correcoes deve ser inteiro entre 0 e ${MAX_CORRECOES_TETO} (teto rígido)`);
  }
  if (!["acceptEdits", "bypassPermissions"].includes(a.permissoes)) {
    morrer("--permissoes aceita apenas 'acceptEdits' (padrão) ou 'bypassPermissions'");
  }
  if (!a.retomar && !a.tasks && !(a.de && a.ate)) {
    morrer("informe --de X --ate Y, ou --tasks LISTA, ou --retomar <id>");
  }
  return a;
}

function imprimirAjuda() {
  console.log(`
Orquestrador de tasks do ROTA — desenho em docs-dev/20-ORQUESTRACAO/README.md

  node scripts/orquestrar-tasks.mjs --de TASK-130 --ate TASK-133 [opções]

  --de / --ate TASK-XXX     intervalo, na ordem do backlog
  --tasks A,B,C             lista explícita (alternativa ao intervalo)
  --executar                EXECUTA DE VERDADE. Sem isto, o padrão é ensaio.
  --ensaio                  só imprime o plano (padrão)
  --parar-na-primeira       (padrão) a primeira parada encerra a corrida
  --pular-bloqueadas        segue para a próxima task sem dependência da parada
  --max-correcoes N         rodadas de correção por task (0..3, padrão 3)
  --budget-turnos N         teto global de turnos da corrida
  --budget-usd N            teto global de custo da corrida
  --permissoes MODO         acceptEdits (padrão) | bypassPermissions
  --retomar <id-da-corrida> continua do ledger, da fase onde parou

Variável de ambiente ROTA_CLAUDE_CLI: caminho do executável do Claude Code.
`);
}

// ---------------------------------------------------------------------------
// Backlog: quais tasks existem, em que ordem, e de que dependem
// ---------------------------------------------------------------------------

function lerBacklog() {
  if (!existsSync(ARQ_BACKLOG)) morrer(`backlog não encontrado: ${ARQ_BACKLOG}`);
  const texto = readFileSync(ARQ_BACKLOG, "utf8");
  const linhas = texto.split(/\r?\n/);
  const tasks = [];
  let atual = null;
  let secao = null;

  for (const linha of linhas) {
    const cabecalho = /^#\s+(TASK-\d+)\s*[—-]\s*(.+)$/.exec(linha);
    if (cabecalho) {
      atual = { id: cabecalho[1], titulo: cabecalho[2].trim(), dependencias: [], bloqueada: false };
      tasks.push(atual);
      secao = null;
      continue;
    }
    if (!atual) continue;
    const sub = /^##\s+(.+)$/.exec(linha);
    if (sub) {
      secao = sub[1].trim().toLowerCase();
      continue;
    }
    if (secao === "dependências" || secao === "dependencias") {
      for (const dep of extrairDependencias(linha, atual.id)) {
        if (!atual.dependencias.includes(dep)) atual.dependencias.push(dep);
      }
      if (/Q-\d+/.test(linha) && /sem decis[ãa]o|nasce bloqueada|pendente/i.test(linha)) {
        atual.bloqueada = true;
      }
    }
  }
  return tasks;
}

/**
 * Extrai dependências reais de uma linha da seção "Dependências".
 *
 * A seção é prosa, não lista de máquina: a mesma linha diz "Independente das
 * TASK-130/131" e "a TASK-133 depende desta" — citar não é depender. O filtro
 * age por ORAÇÃO, descartando as que negam ou invertem a relação. Onde o texto
 * for ambíguo o resultado é conservador (conta como dependência), porque o
 * único efeito de uma dependência a mais é a corrida pular uma task que talvez
 * pudesse rodar — barato — enquanto uma a menos faz rodar sobre base quebrada.
 */
function extrairDependencias(linha, idAtual) {
  const NEGACOES =
    /nenhuma task|independente|paralelizável|paralelizavel|depende desta|depende deste|precede|desbloqueia|não depende|nao depende/i;
  const encontradas = [];
  for (const oracao of linha.split(/(?<=\.)\s+|;\s+/)) {
    if (NEGACOES.test(oracao)) continue;
    for (const m of oracao.matchAll(/TASK-\d+/g)) {
      if (m[0] !== idAtual) encontradas.push(m[0]);
    }
  }
  return encontradas;
}

function resolverFila(args, backlog) {
  const indice = new Map(backlog.map((t, i) => [t.id, i]));
  if (args.tasks) {
    for (const t of args.tasks) if (!indice.has(t)) morrer(`${t} não existe no backlog`);
    return args.tasks.map((t) => backlog[indice.get(t)]);
  }
  if (!indice.has(args.de)) morrer(`${args.de} não existe no backlog`);
  if (!indice.has(args.ate)) morrer(`${args.ate} não existe no backlog`);
  const i = indice.get(args.de);
  const j = indice.get(args.ate);
  if (j < i) morrer(`--ate (${args.ate}) vem antes de --de (${args.de}) na ordem do backlog`);
  return backlog.slice(i, j + 1);
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

function criarCorrida(args, fila) {
  const id = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 13)
    .replace(/(\d{8})(\d{4})/, "$1-$2");
  const dir = join(DIR_CORRIDAS, id);
  mkdirSync(dir, { recursive: true });
  const ledger = {
    id,
    iniciadaEm: new Date().toISOString(),
    branch: `orquestracao/${id}`,
    branchOrigem: git(["rev-parse", "--abbrev-ref", "HEAD"]),
    shaOrigem: git(["rev-parse", "HEAD"]),
    opcoes: {
      pularBloqueadas: args.pularBloqueadas,
      maxCorrecoes: args.maxCorrecoes,
      budgetTurnos: args.budgetTurnos,
      budgetUsd: args.budgetUsd,
      permissoes: args.permissoes,
    },
    fila: fila.map((t) => t.id),
    custo: { turnos: 0, usd: 0 },
    tasks: {},
    fases: [],
    encerramento: null,
  };
  salvarLedger(ledger);
  return ledger;
}

function caminhoLedger(id) {
  return join(DIR_CORRIDAS, id, "ledger.json");
}

function salvarLedger(ledger) {
  writeFileSync(caminhoLedger(ledger.id), `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
}

function carregarLedger(id) {
  const l = lerJsonSeguro(caminhoLedger(id));
  if (!l) morrer(`corrida ${id} não encontrada ou ledger ilegível`);
  return l;
}

// ---------------------------------------------------------------------------
// Execução de uma fase
// ---------------------------------------------------------------------------

/**
 * Roda uma fase headless. Devolve { ok, resultado, motivo }.
 * Falha fechada: qualquer anormalidade devolve ok:false com motivo legível.
 */
async function executarFase({ cli, ledger, task, nome, config, prompt, sessionId, resumir }) {
  const dir = join(DIR_CORRIDAS, ledger.id);
  const args = ["-p", "--output-format", "json", "--model", config.modelo,
    "--permission-mode", ledger.opcoes.permissoes,
    "--allowedTools", ...FERRAMENTAS];
  if (resumir) args.push("--resume", sessionId);
  else if (sessionId) args.push("--session-id", sessionId);

  log(`  ▸ ${nome} (${config.modelo}, teto ${config.turnos} turnos / ${config.minutos} min)`);

  const inicio = Date.now();
  const { codigo, saida, erro, matouPorTimeout } = await rodarProcesso({
    cli, args, prompt, limiteMs: config.minutos * 60_000,
  });

  const duracaoMin = ((Date.now() - inicio) / 60_000).toFixed(1);
  appendFileSync(join(dir, `bruto-${task}-${nome}.log`), saida + (erro ? `\n[stderr]\n${erro}` : ""), "utf8");

  const registro = { task, fase: nome, modelo: config.modelo, duracaoMin: Number(duracaoMin) };

  if (matouPorTimeout) {
    registro.resultado = "timeout";
    ledger.fases.push(registro);
    return { ok: false, motivo: `fase ${nome} estourou o timeout de ${config.minutos} min e foi encerrada` };
  }
  if (codigo !== 0) {
    registro.resultado = "erro-processo";
    ledger.fases.push(registro);
    return { ok: false, motivo: `fase ${nome} terminou com código ${codigo}: ${erro.slice(0, 400)}` };
  }

  let resultado;
  try {
    resultado = JSON.parse(saida);
  } catch {
    registro.resultado = "json-invalido";
    ledger.fases.push(registro);
    return { ok: false, motivo: `fase ${nome} não devolveu JSON válido` };
  }

  const turnos = Number(resultado.num_turns ?? 0);
  const usd = Number(resultado.total_cost_usd ?? 0);
  ledger.custo.turnos += turnos;
  ledger.custo.usd += usd;
  Object.assign(registro, {
    turnos,
    usd: Number(usd.toFixed(4)),
    sessionId: resultado.session_id ?? sessionId ?? null,
    resultado: resultado.is_error ? "erro-modelo" : "ok",
  });
  ledger.fases.push(registro);
  salvarLedger(ledger);

  if (resultado.is_error) {
    return { ok: false, motivo: `fase ${nome} reportou erro do modelo` };
  }
  if (turnos > config.turnos) {
    return {
      ok: false,
      motivo: `fase ${nome} gastou ${turnos} turnos, acima do teto de ${config.turnos} — sinal de que se enrolou`,
    };
  }
  const estouro = verificarBudget(ledger);
  if (estouro) return { ok: false, motivo: estouro };

  return { ok: true, resultado, sessionId: resultado.session_id ?? sessionId };
}

function verificarBudget(ledger) {
  const { budgetTurnos, budgetUsd } = ledger.opcoes;
  if (budgetTurnos > 0 && ledger.custo.turnos > budgetTurnos) {
    return `budget global de turnos estourado (${ledger.custo.turnos} > ${budgetTurnos})`;
  }
  if (budgetUsd > 0 && ledger.custo.usd > budgetUsd) {
    return `budget global de custo estourado (US$ ${ledger.custo.usd.toFixed(2)} > ${budgetUsd})`;
  }
  return null;
}

function encerrarArvore(pid) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try { process.kill(-pid, "SIGKILL"); } catch { try { process.kill(pid, "SIGKILL"); } catch { /* ok */ } }
  }
}

/**
 * Roda o processo filho até o fim, com timeout que mata a árvore inteira.
 * O timeout é a trava dura contra fase perdida: nenhum processo desta corrida
 * pode ficar rodando sozinho depois que o orquestrador desistiu dele.
 */
function rodarProcesso({ cli, args, prompt, limiteMs }) {
  return new Promise((resolvido) => {
    const filho = spawn(cli, args, { cwd: RAIZ, stdio: ["pipe", "pipe", "pipe"] });
    let saida = "";
    let erro = "";
    let matouPorTimeout = false;

    filho.stdout.on("data", (d) => { saida += d; });
    filho.stderr.on("data", (d) => { erro += d; });
    filho.stdin.on("error", () => { /* filho pode fechar stdin antes; não é fatal */ });
    filho.stdin.end(prompt, "utf8");

    const timer = setTimeout(() => {
      matouPorTimeout = true;
      encerrarArvore(filho.pid);
    }, limiteMs);

    filho.on("error", (e) => {
      clearTimeout(timer);
      resolvido({ codigo: -1, saida, erro: `${erro}\n${e.message}`, matouPorTimeout });
    });
    filho.on("close", (codigo) => {
      clearTimeout(timer);
      resolvido({ codigo, saida, erro, matouPorTimeout });
    });
  });
}

// ---------------------------------------------------------------------------
// Prompts das fases. Cada uma invoca a skill oficial e acrescenta a instrução
// do arquivo-sinal — que é como o script (e não o modelo) toma as decisões de
// roteamento. Nenhuma skill existente é alterada.
// ---------------------------------------------------------------------------

function promptAnalise(task, arqSinal) {
  return `/analisar-task ${task}

Contexto de execução: esta conversa faz parte de uma corrida orquestrada
(docs-dev/20-ORQUESTRACAO/README.md). Não há humano disponível para aprovar o
plano agora, então NÃO peça aprovação e NÃO implemente nada — apenas produza a
"Análise da Task" completa, como manda a skill.

Ao terminar a análise, escreva o arquivo ${arqSinal} com exatamente este JSON e
mais nada:

{
  "bloqueada": <true se a task depende de Q-xxx sem decisão em docs-dev/10, ou se
                a spec não sustenta o que a task pede>,
  "ambiguidade_nova": <true se a análise identificou ambiguidade que exige Q-xxx nova>,
  "inferencia_alto_impacto": <true se alguma inferência controlada muda contrato
                              JSON, RN de severidade Alta ou fronteira de módulo>,
  "arquivos_previstos": <número inteiro de arquivos em "Arquivos previstos">,
  "motivo": "<uma frase — vazia se nada disso ocorreu>"
}

Na dúvida entre true e false em qualquer campo, escreva true: parar a corrida é
barato, seguir com plano ruim não é.`;
}

function promptImplementacao(task, arqSinal) {
  return `/implementar-task ${task}

Contexto de execução: corrida orquestrada, sem humano no meio. Siga a skill à
risca, inclusive a suíte canônica final e o commit da implementação.

Se surgir ambiguidade nova durante a implementação, NÃO decida: rode
/registrar-questao para abrir a Q-xxx como Pendente em docs-dev/16, pare a
implementação e registre isso no sinal abaixo.

Ao terminar, escreva o arquivo ${arqSinal} com exatamente este JSON e mais nada:

{
  "concluida": <true se a implementação terminou e foi commitada>,
  "suite_verde": <true se npm run test:all:verificar aceitou a evidência>,
  "q_registrada": "<Q-xxx aberta agora, ou null>",
  "motivo_parada": "<uma frase, ou null se concluiu>"
}

Reporte resultado real. Suíte vermelha é "suite_verde": false — nunca maquie.`;
}

function promptRevisao(task) {
  return `/revisar-aderencia ${task}

Contexto de execução: corrida orquestrada. Esta é uma conversa NOVA, sem
memória da implementação — reconstrua tudo dos artefatos persistidos, como a
skill exige. Salve o parecer em docs-dev/14-REVISOES/ e atualize o
docs-dev/19-STATUS_EXECUCAO.md conforme a skill manda, e comite a revisão.`;
}

function promptVeredito(task, arqParecer, arqSinal, rodada, maxCorrecoes) {
  return `/analisar-verdito ${task}

Parecer a julgar: ${arqParecer}
Rodadas de correção já gastas nesta task: ${rodada} de ${maxCorrecoes}.
Escreva o veredito em: ${arqSinal}`;
}

function promptAnaliseCorrecao(task, arqParecer) {
  return `/analisar-correcao ${task}

Parecer que motiva a correção: ${arqParecer}`;
}

function promptCorrecao(task, rodada, arqSinal) {
  return `Aplique agora o plano de correção que você acabou de produzir para a
${task} (rodada ${rodada}).

Limites: só o que o parecer apontou; nada de melhorias oportunistas; nenhuma
regra de negócio nova (ambiguidade → /registrar-questao e pare). Rode a suíte
canônica com npm run test:all:log -- --executor=Claude-orquestrado e confirme
com npm run test:all:verificar. Comite com a mensagem
"Corrige ${task} (rodada ${rodada}): <o que foi corrigido>".

Ao terminar, escreva ${arqSinal} com exatamente este JSON e mais nada:

{
  "concluida": <bool>,
  "suite_verde": <bool>,
  "q_registrada": "<Q-xxx ou null>",
  "motivo_parada": "<uma frase, ou null>"
}`;
}

// ---------------------------------------------------------------------------
// Ciclo de uma task
// ---------------------------------------------------------------------------

async function executarTask({ cli, ledger, task, maxCorrecoes }) {
  const dir = join(DIR_CORRIDAS, ledger.id);
  const estado = ledger.tasks[task] ?? { task, correcoes: 0, situacao: "em-andamento", eventos: [] };
  ledger.tasks[task] = estado;
  estado.shaAntes = git(["rev-parse", "HEAD"]);

  const parar = (situacao, motivo) => {
    estado.situacao = situacao;
    estado.motivo = motivo;
    salvarLedger(ledger);
    log(`  ✖ ${task}: ${situacao} — ${motivo}`);
    return { verdito: "PARAR", motivo };
  };

  // --- Fase 2: ANÁLISE (opus) --------------------------------------------
  const arqTriagem = join(dir, `triagem-${task}.json`);
  if (existsSync(arqTriagem)) rmSync(arqTriagem);
  const sessao = randomUUID();
  const analise = await executarFase({
    cli, ledger, task, nome: "analise", config: FASES.analise,
    prompt: promptAnalise(task, arqTriagem), sessionId: sessao,
  });
  if (!analise.ok) return parar("parada-por-falha", analise.motivo);

  // --- Fase 3: TRIAGEM (script, custo zero) -------------------------------
  const triagem = lerJsonSeguro(arqTriagem);
  if (!triagem) return parar("parada-por-falha", "a análise não deixou o sinal de triagem legível");
  if (triagem.bloqueada) return parar("parada-por-bloqueio", triagem.motivo || "análise declarou a task bloqueada");
  if (triagem.ambiguidade_nova) return parar("parada-por-q", triagem.motivo || "ambiguidade nova identificada na análise");
  if (triagem.inferencia_alto_impacto) return parar("parada-por-inferencia", triagem.motivo || "inferência controlada de alto impacto");
  estado.arquivosPrevistos = Number(triagem.arquivos_previstos ?? 0);

  // --- Fase 4: IMPLEMENTAÇÃO (sonnet, mesma sessão) -----------------------
  const arqImpl = join(dir, `implementacao-${task}.json`);
  if (existsSync(arqImpl)) rmSync(arqImpl);
  const impl = await executarFase({
    cli, ledger, task, nome: "implementacao", config: FASES.implementacao,
    prompt: promptImplementacao(task, arqImpl), sessionId: analise.sessionId, resumir: true,
  });
  if (!impl.ok) return parar("parada-por-falha", impl.motivo);

  const sinalImpl = lerJsonSeguro(arqImpl);
  if (!sinalImpl) return parar("parada-por-falha", "a implementação não deixou sinal legível");
  if (sinalImpl.q_registrada) return parar("parada-por-q", `Q aberta durante a implementação: ${sinalImpl.q_registrada}`);
  if (!sinalImpl.concluida) return parar("parada-por-falha", sinalImpl.motivo_parada || "implementação não concluída");
  if (!sinalImpl.suite_verde) return parar("parada-por-suite", "suíte canônica não ficou verde");

  const guarda = conferirDiff(estado);
  if (guarda) return parar("parada-por-escopo", guarda);

  // --- Fases 5→7: REVISÃO / VEREDITO / CORREÇÃO ---------------------------
  for (let rodada = 0; rodada <= maxCorrecoes; rodada += 1) {
    const revisao = await executarFase({
      cli, ledger, task, nome: `revisao-r${rodada}`, config: FASES.revisao,
      prompt: promptRevisao(task), sessionId: randomUUID(),
    });
    if (!revisao.ok) return parar("parada-por-falha", revisao.motivo);

    const parecer = acharParecer(task);
    if (!parecer) return parar("parada-por-falha", "a revisão não deixou parecer em docs-dev/14-REVISOES/");

    const arqVeredito = join(dir, `veredito-${task}-r${rodada}.json`);
    if (existsSync(arqVeredito)) rmSync(arqVeredito);
    const vd = await executarFase({
      cli, ledger, task, nome: `veredito-r${rodada}`, config: FASES.veredito,
      prompt: promptVeredito(task, parecer, arqVeredito, rodada, maxCorrecoes),
      sessionId: randomUUID(),
    });
    if (!vd.ok) return parar("parada-por-falha", vd.motivo);

    const veredito = lerJsonSeguro(arqVeredito);
    if (!veredito || !["SEGUIR", "CORRIGIR", "PARAR"].includes(veredito.verdito)) {
      return parar("parada-por-falha", "veredito ausente ou fora do contrato — falha fechada");
    }
    estado.eventos.push({ rodada, verdito: veredito.verdito, motivo: veredito.motivo, parecer });
    salvarLedger(ledger);

    if (veredito.verdito === "SEGUIR") {
      estado.situacao = "concluida";
      estado.parecer = parecer;
      salvarLedger(ledger);
      log(`  ✔ ${task}: concluída (${rodada} rodada(s) de correção)`);
      return { verdito: "SEGUIR" };
    }
    if (veredito.verdito === "PARAR") {
      return parar("parada-por-parecer", veredito.motivo || "veredito PARAR");
    }
    if (rodada === maxCorrecoes) {
      return parar("parada-por-correcoes", `esgotou as ${maxCorrecoes} rodadas de correção`);
    }

    // --- rodada de correção: análise (opus) + correção (sonnet) ------------
    const sessaoCorrecao = randomUUID();
    const ac = await executarFase({
      cli, ledger, task, nome: `analise-correcao-r${rodada + 1}`, config: FASES.analiseCorrecao,
      prompt: promptAnaliseCorrecao(task, parecer), sessionId: sessaoCorrecao,
    });
    if (!ac.ok) return parar("parada-por-falha", ac.motivo);

    const arqCorr = join(dir, `correcao-${task}-r${rodada + 1}.json`);
    if (existsSync(arqCorr)) rmSync(arqCorr);
    const corr = await executarFase({
      cli, ledger, task, nome: `correcao-r${rodada + 1}`, config: FASES.correcao,
      prompt: promptCorrecao(task, rodada + 1, arqCorr), sessionId: ac.sessionId, resumir: true,
    });
    if (!corr.ok) return parar("parada-por-falha", corr.motivo);

    const sinalCorr = lerJsonSeguro(arqCorr);
    if (!sinalCorr) return parar("parada-por-falha", "a correção não deixou sinal legível");
    if (sinalCorr.q_registrada) return parar("parada-por-q", `Q aberta na correção: ${sinalCorr.q_registrada}`);
    if (!sinalCorr.concluida || !sinalCorr.suite_verde) {
      return parar("parada-por-falha", sinalCorr.motivo_parada || "correção não concluída ou suíte vermelha");
    }
    estado.correcoes = rodada + 1;
    salvarLedger(ledger);
  }
  return parar("parada-por-correcoes", "laço de correção encerrado sem veredito de seguir");
}

/** Diff-guard: escopo vazando aparece como diff muito além do previsto. */
function conferirDiff(estado) {
  const arquivos = git(["diff", "--name-only", `${estado.shaAntes}..HEAD`])
    .split(/\r?\n/)
    .filter((l) => l.trim());
  estado.arquivosTocados = arquivos.length;
  const previstos = estado.arquivosPrevistos;
  if (previstos > 0 && arquivos.length > previstos * 2) {
    return `diff tocou ${arquivos.length} arquivos, mais que o dobro dos ${previstos} previstos na análise — escopo vazando`;
  }
  return null;
}

function acharParecer(task) {
  const dir = join(RAIZ, "docs-dev", "14-REVISOES");
  if (!existsSync(dir)) return null;
  const candidatos = readdirSync(dir).filter((f) => f.startsWith(`${task}-`)).sort();
  if (candidatos.length === 0) return null;
  return join("docs-dev", "14-REVISOES", candidatos[candidatos.length - 1]);
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

function escreverRelatorio(ledger) {
  const dir = join(DIR_CORRIDAS, ledger.id);
  const l = [];
  l.push(`# Corrida ${ledger.id}`, "");
  l.push(`**Branch:** \`${ledger.branch}\` (de \`${ledger.branchOrigem}\` em \`${ledger.shaOrigem.slice(0, 7)}\`)`);
  l.push(`**Início:** ${ledger.iniciadaEm} · **Fim:** ${new Date().toISOString()}`);
  l.push(`**Custo:** ${ledger.custo.turnos} turnos · US$ ${ledger.custo.usd.toFixed(2)}`);
  l.push(`**Encerramento:** ${ledger.encerramento ?? "—"}`, "", "---", "");

  for (const id of ledger.fila) {
    const t = ledger.tasks[id];
    l.push(`## ${id}`, "");
    if (!t) {
      l.push("**Resultado:** não iniciada.", "");
      continue;
    }
    l.push(`**Resultado:** ${t.situacao}${t.motivo ? ` — ${t.motivo}` : ""}`);
    if (t.parecer) l.push(`**Parecer:** [${t.parecer}](../../../${t.parecer.replace(/\\/g, "/")})`);
    l.push(`**Rodadas de correção:** ${t.correcoes} · **Arquivos tocados:** ${t.arquivosTocados ?? "—"} (previstos ${t.arquivosPrevistos ?? "—"})`);
    const fases = ledger.fases.filter((f) => f.task === id);
    const turnos = fases.reduce((s, f) => s + (f.turnos ?? 0), 0);
    const usd = fases.reduce((s, f) => s + (f.usd ?? 0), 0);
    l.push(`**Custo da task:** ${turnos} turnos · US$ ${usd.toFixed(2)}`);
    if (t.eventos?.length) {
      l.push("", "| Rodada | Veredito | Motivo |", "|---|---|---|");
      for (const e of t.eventos) l.push(`| ${e.rodada} | ${e.verdito} | ${e.motivo ?? ""} |`);
    }
    l.push("");
  }

  l.push("---", "", "## O que você precisa decidir", "");
  const paradas = ledger.fila.map((id) => ledger.tasks[id]).filter((t) => t && t.situacao?.startsWith("parada"));
  if (paradas.length === 0) l.push("Nada pendente — a fila inteira concluiu.");
  for (const t of paradas) {
    l.push(`- **${t.task}** (${t.situacao}): ${t.motivo}`);
    if (t.situacao === "parada-por-q") {
      l.push("  - Decida a Q em \`docs-dev/16-OPEN_QUESTIONS.md\` e rode \`/registrar-decisao\`.");
    }
  }
  l.push("", `Retomar: \`node scripts/orquestrar-tasks.mjs --retomar ${ledger.id} --executar\``, "");

  const caminho = join(dir, "relatorio.md");
  writeFileSync(caminho, l.join("\n"), "utf8");
  return caminho;
}

// ---------------------------------------------------------------------------
// Preflight e main
// ---------------------------------------------------------------------------

function preflight() {
  const sujo = git(["status", "--porcelain"]);
  if (sujo) {
    morrer(
      "working tree sujo. Comite ou guarde suas alterações antes — a corrida nunca " +
        `mistura trabalho manual em curso.\n${sujo}`,
    );
  }
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch === "main" || branch === "master") {
    morrer(`você está em ${branch}. Mude para uma branch de trabalho antes de orquestrar.`);
  }
  if (!existsSync(join(RAIZ, "node_modules"))) {
    morrer("node_modules ausente — rode npm install antes (a suíte canônica precisa dele).");
  }
}

async function main() {
  const args = lerArgumentos(process.argv);
  const cli = resolverCli();
  const backlog = lerBacklog();

  let ledger;
  let fila;
  if (args.retomar) {
    ledger = carregarLedger(args.retomar);
    fila = ledger.fila
      .filter((id) => !ledger.tasks[id] || ledger.tasks[id].situacao !== "concluida")
      .map((id) => backlog.find((t) => t.id === id));
    log(`retomando corrida ${ledger.id}: faltam ${fila.length} task(s)`);
  } else {
    fila = resolverFila(args, backlog);
  }

  console.log("");
  log(`CLI: ${cli}`);
  log(`fila (${fila.length}): ${fila.map((t) => t.id).join(", ")}`);
  log(`modo: ${args.executar ? "EXECUÇÃO REAL" : "ENSAIO (nada será gasto)"}`);
  log(`parada: ${args.pularBloqueadas ? "pula bloqueadas" : "para na primeira"} · correções: até ${args.maxCorrecoes}`);
  for (const t of fila) {
    const dep = t.dependencias.length ? ` (depende de ${t.dependencias.join(", ")})` : "";
    console.log(`         · ${t.id} — ${t.titulo}${dep}`);
  }
  console.log("");

  if (!args.executar) {
    log("ensaio: nada foi executado. Acrescente --executar para valer.");
    return;
  }

  preflight();
  tomarTrava();

  if (!args.retomar) {
    ledger = criarCorrida(args, fila);
    git(["checkout", "-b", ledger.branch]);
    log(`branch da corrida: ${ledger.branch}`);
  }

  const paradas = new Set();
  for (const t of fila) {
    if (paradas.size > 0 && !ledger.opcoes.pularBloqueadas) {
      ledger.tasks[t.id] = { task: t.id, situacao: "nao-iniciada", correcoes: 0, eventos: [] };
      continue;
    }
    const dependeDeParada = t.dependencias.some((d) => paradas.has(d));
    if (dependeDeParada) {
      ledger.tasks[t.id] = {
        task: t.id, situacao: "nao-iniciada", correcoes: 0, eventos: [],
        motivo: `depende de task parada (${t.dependencias.filter((d) => paradas.has(d)).join(", ")})`,
      };
      salvarLedger(ledger);
      continue;
    }

    log(`▶ ${t.id} — ${t.titulo}`);
    const r = await executarTask({ cli, ledger, task: t.id, maxCorrecoes: ledger.opcoes.maxCorrecoes });
    if (r.verdito === "PARAR") {
      paradas.add(t.id);
      if (!ledger.opcoes.pularBloqueadas) {
        ledger.encerramento = `parou em ${t.id}: ${r.motivo}`;
        salvarLedger(ledger);
        break;
      }
    }
    const estouro = verificarBudget(ledger);
    if (estouro) {
      ledger.encerramento = estouro;
      salvarLedger(ledger);
      break;
    }
  }

  if (!ledger.encerramento) {
    ledger.encerramento = paradas.size === 0 ? "fila concluída" : `concluída com ${paradas.size} task(s) parada(s)`;
  }
  salvarLedger(ledger);
  const relatorio = escreverRelatorio(ledger);

  console.log("");
  log(`encerramento: ${ledger.encerramento}`);
  log(`custo: ${ledger.custo.turnos} turnos · US$ ${ledger.custo.usd.toFixed(2)}`);
  log(`relatório: ${relatorio}`);
  liberarTrava();
}

main().catch((e) => {
  liberarTrava();
  console.error(`\n[orquestrador] falha inesperada: ${e?.stack || e}\n`);
  process.exit(1);
});
