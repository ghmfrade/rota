// Verificação de rastreabilidade de Q-xxx / DEC-xxx.
//
// Motivo (docs-dev/16 Q-019..021, DEC-038..041): decisões e perguntas foram
// decididas em conversa mas nunca arquivadas nos arquivos canônicos, vivendo só
// em pareceres e comentários de código. Este check é a trava MECÂNICA contra
// esse esquecimento: toda referência `Q-0NN`/`DEC-0NN` citada em `docs-dev/` ou
// `src/` DEVE ter uma entrada canônica — `## Q-0NN` em
// `docs-dev/16-OPEN_QUESTIONS.md` e `## DEC-0NN` em `docs-dev/10-DECISION_LOG.md`.
// Referência órfã (citada mas não definida) = falha.
//
// Dois modos:
//   - CLI (`node scripts/verificar-rastreabilidade.mjs`): imprime o relatório e
//     sai com código 1 se houver órfãs (para `npm run check:rastreabilidade`).
//   - `--hook` (Stop hook do Claude Code): consome/ignora o JSON do stdin; se
//     houver órfãs, emite um aviso NÃO BLOQUEANTE (systemMessage) e sai 0.
//     Nunca bloqueia o encerramento do turno — é advisory, e falha aberta.
//
// Node ESM puro, sem dependências — roda igual no Windows local e no Codespaces.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(fileURLToPath(new URL(".", import.meta.url)), "..");

// Onde procurar referências (o padrão de falha ocorreu em docs-dev/ e src/).
const RAIZES_VARREDURA = ["docs-dev", "src"];
const EXTENSOES = new Set([".md", ".ts", ".tsx"]);

// Arquivos canônicos que DEFINEM cada entidade (heading `## Q-0NN` / `## DEC-0NN`).
const ARQ_QUESTOES = "docs-dev/16-OPEN_QUESTIONS.md";
const ARQ_DECISOES = "docs-dev/10-DECISION_LOG.md";

/** Caminha recursivamente numa raiz, devolvendo os arquivos com extensão alvo. */
function listarArquivos(raizRelativa) {
  const arquivos = [];
  const pilha = [join(RAIZ, raizRelativa)];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    let entradas;
    try {
      entradas = readdirSync(atual);
    } catch {
      continue; // raiz inexistente — ignora
    }
    for (const entrada of entradas) {
      const caminho = join(atual, entrada);
      let info;
      try {
        info = statSync(caminho);
      } catch {
        continue;
      }
      if (info.isDirectory()) {
        if (entrada === "node_modules" || entrada === ".git") continue;
        pilha.push(caminho);
      } else if (EXTENSOES.has(extname(entrada))) {
        arquivos.push(caminho);
      }
    }
  }
  return arquivos;
}

/** Conjunto de números (ex.: "019") definidos por `## <prefixo>-0NN` num arquivo. */
function definicoesCanonicas(arquivoRelativo, prefixo) {
  const definidas = new Set();
  let conteudo;
  try {
    conteudo = readFileSync(join(RAIZ, arquivoRelativo), "utf8");
  } catch {
    return definidas;
  }
  const re = new RegExp(`^##\\s+${prefixo}-(\\d{3})\\b`, "gm");
  let m;
  while ((m = re.exec(conteudo)) !== null) definidas.add(m[1]);
  return definidas;
}

/**
 * Varre os arquivos e devolve as referências órfãs de um prefixo: cada número
 * citado (`<prefixo>-0NN`) que não está em `definidas`, com os arquivos que o
 * citam (para a mensagem apontar onde corrigir).
 */
function acharOrfas(arquivos, prefixo, definidas) {
  const re = new RegExp(`${prefixo}-(\\d{3})`, "g");
  const orfas = new Map(); // número → Set(caminhos relativos)
  for (const arquivo of arquivos) {
    let conteudo;
    try {
      conteudo = readFileSync(arquivo, "utf8");
    } catch {
      continue;
    }
    let m;
    while ((m = re.exec(conteudo)) !== null) {
      const numero = m[1];
      if (definidas.has(numero)) continue;
      const relativo = arquivo.slice(RAIZ.length + 1);
      if (!orfas.has(numero)) orfas.set(numero, new Set());
      orfas.get(numero).add(relativo);
    }
  }
  return orfas;
}

function executar() {
  const arquivos = RAIZES_VARREDURA.flatMap(listarArquivos);
  const qDefinidas = definicoesCanonicas(ARQ_QUESTOES, "Q");
  const decDefinidas = definicoesCanonicas(ARQ_DECISOES, "DEC");

  const qOrfas = acharOrfas(arquivos, "Q", qDefinidas);
  const decOrfas = acharOrfas(arquivos, "DEC", decDefinidas);
  return { qOrfas, decOrfas };
}

/** Formata as órfãs de um prefixo em linhas legíveis para o relatório/aviso. */
function formatar(orfas, prefixo, arquivoCanonico) {
  if (orfas.size === 0) return [];
  const linhas = [
    `${orfas.size} referência(s) órfã(s) de ${prefixo}-xxx — citadas mas sem entrada em ${arquivoCanonico}:`,
  ];
  for (const numero of [...orfas.keys()].sort()) {
    const arquivos = [...orfas.get(numero)].sort().join(", ");
    linhas.push(`  - ${prefixo}-${numero} (citada em: ${arquivos})`);
  }
  return linhas;
}

const modoHook = process.argv.includes("--hook");
if (modoHook) {
  // Stop hook: drena o stdin (o Claude Code envia um JSON), mas o ignoramos.
  try {
    readFileSync(0, "utf8");
  } catch {
    /* sem stdin — segue */
  }
}

let resultado;
try {
  resultado = executar();
} catch (erro) {
  // Falha aberta: um erro interno nunca deve travar o turno nem o commit.
  if (!modoHook) {
    console.error(`[verificar-rastreabilidade] erro interno, ignorado: ${erro}`);
  }
  process.exit(0);
}

const { qOrfas, decOrfas } = resultado;
const linhas = [
  ...formatar(qOrfas, "Q", ARQ_QUESTOES),
  ...formatar(decOrfas, "DEC", ARQ_DECISOES),
];
const temOrfas = linhas.length > 0;

if (modoHook) {
  if (temOrfas) {
    const aviso =
      "Rastreabilidade: há Q/DEC citadas sem entrada canônica. Registre-as " +
      "(DEC em docs-dev/10 + Q em docs-dev/16) antes de fechar.\n" +
      linhas.join("\n");
    // Aviso NÃO bloqueante: aparece para o usuário/agente, mas não trava o Stop.
    process.stdout.write(JSON.stringify({ systemMessage: aviso }));
  }
  process.exit(0);
}

// Modo CLI.
if (temOrfas) {
  console.error("✗ Rastreabilidade de decisões: FALHOU\n");
  console.error(linhas.join("\n"));
  console.error(
    "\nCorrija registrando a decisão (DEC em docs-dev/10-DECISION_LOG.md) e a " +
      "pergunta (Q em docs-dev/16-OPEN_QUESTIONS.md).",
  );
  process.exit(1);
}
console.log("✓ Rastreabilidade de decisões: OK (toda Q/DEC citada tem entrada canônica).");
process.exit(0);
