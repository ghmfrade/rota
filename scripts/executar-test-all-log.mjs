import {
  closeSync,
  openSync,
  renameSync,
  rmSync,
  writeSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calcularFingerprint,
  caminhoRelativo,
  encerrarArvoreProcesso,
  executarProcesso,
  FORMATO_LOG_TEST_ALL,
  garantirDiretorioDoArquivo,
  lerInteiroPositivo,
  lerOpcao,
  PORTA_E2E_PADRAO,
  TIMEOUT_BOOT_PADRAO_MS,
  TIMEOUT_TOTAL_PADRAO_MS,
} from "./infraestrutura-test-all.mjs";
import { MARCADOR_FIM_LOG } from "./verificar-log-test-all.mjs";

const raizProjeto = fileURLToPath(new URL("../", import.meta.url));
const argumentos = process.argv.slice(2);
const executor = lerOpcao(argumentos, "executor", "")?.trim();
const porta = lerInteiroPositivo(argumentos, "porta", PORTA_E2E_PADRAO);
const timeoutBootMs = lerInteiroPositivo(
  argumentos,
  "timeout-boot-ms",
  TIMEOUT_BOOT_PADRAO_MS,
);
const timeoutTotalMs = lerInteiroPositivo(
  argumentos,
  "timeout-total-ms",
  TIMEOUT_TOTAL_PADRAO_MS,
);
const argumentoLog = lerOpcao(argumentos, "log", "ultimo-test-all.log");
const caminhoLog = isAbsolute(argumentoLog) ? argumentoLog : resolve(raizProjeto, argumentoLog);
const caminhoLogTemporario = join(
  dirname(caminhoLog),
  `.${basename(caminhoLog)}.tmp-${process.pid}.log`,
);
const caminhoCliNpm = process.env.npm_execpath;

if (!executor) {
  throw new Error("Informe quem executa com --executor=humano, --executor=Codex ou equivalente.");
}
if (!caminhoCliNpm) {
  throw new Error("Execute este script por meio de npm run test:all:log.");
}

await garantirDiretorioDoArquivo(caminhoLog);
rmSync(caminhoLog, { force: true });
rmSync(caminhoLogTemporario, { force: true });
const descritorLog = openSync(caminhoLogTemporario, "wx");
let processoEtapa;
let interrompido = false;
let logFechado = false;

function registrar(texto) {
  writeSync(descritorLog, texto);
}

function fecharLog() {
  if (!logFechado) {
    closeSync(descritorLog);
    logFechado = true;
  }
}

function obterInformacaoGit(argumentosGit, fallback) {
  const resultado = spawnSync("git", argumentosGit, {
    cwd: raizProjeto,
    encoding: "utf8",
    windowsHide: true,
  });
  return resultado.status === 0 ? resultado.stdout.trim() || fallback : fallback;
}

function obterVersaoNpm() {
  const resultado = spawnSync(process.execPath, [caminhoCliNpm, "--version"], {
    cwd: raizProjeto,
    encoding: "utf8",
    windowsHide: true,
  });
  return resultado.status === 0 ? resultado.stdout.trim() : "indisponível";
}

async function interromper(sinal) {
  if (interrompido) {
    return;
  }
  interrompido = true;
  registrar(`\nExecução interrompida por ${sinal}; log temporário não promovido.\n`);
  if (processoEtapa?.pid) {
    const limpeza = await encerrarArvoreProcesso(processoEtapa.pid);
    registrar(`Limpeza após interrupção: ${limpeza.detalhe}\n`);
  }
  fecharLog();
  process.exit(sinal === "SIGINT" ? 130 : 143);
}

process.once("SIGINT", () => void interromper("SIGINT"));
process.once("SIGTERM", () => void interromper("SIGTERM"));

async function executarEtapa({ nome, comandoExibido, comando, argumentosComando, timeoutMs }) {
  registrar(`\n${"=".repeat(72)}\n${nome}\n${"=".repeat(72)}\n`);
  registrar(`Comando: ${comandoExibido}\n`);

  if (timeoutMs <= 0) {
    registrar("Etapa não iniciada: timeout total já esgotado.\n");
    return { codigo: 124, sinal: null, timeout: true, duracaoMs: 0, erro: null };
  }

  const resultado = await executarProcesso({
    comando,
    argumentos: argumentosComando,
    cwd: raizProjeto,
    env: { ...process.env, FORCE_COLOR: "0" },
    timeoutMs,
    aoIniciar: (processo) => {
      processoEtapa = processo;
      registrar(`PID da etapa: ${processo.pid}\n`);
    },
    aoStdout: (dados) => {
      process.stdout.write(dados);
      registrar(dados);
    },
    aoStderr: (dados) => {
      process.stderr.write(dados);
      registrar(dados);
    },
  });
  processoEtapa = undefined;

  const codigo = resultado.timeout ? 124 : resultado.codigo ?? 1;
  registrar(`\nCódigo ${nome}: ${codigo}\n`);
  registrar(`Sinal ${nome}: ${resultado.sinal ?? "nenhum"}\n`);
  registrar(`Timeout ${nome}: ${resultado.timeout ? "sim" : "não"}\n`);
  registrar(`Tempo ${nome}: ${resultado.duracaoMs} ms\n`);
  if (resultado.erro) {
    registrar(`Erro ${nome}: ${resultado.erro.message}\n`);
  }
  return { ...resultado, codigo };
}

const inicio = new Date();
const limiteTotal = inicio.getTime() + timeoutTotalMs;
let resultadoUnitarios = { codigo: 1, sinal: null, timeout: false, duracaoMs: 0 };
let resultadoE2e = { codigo: 1, sinal: null, timeout: false, duracaoMs: 0 };
let erroGeral;

try {
  const fingerprint = await calcularFingerprint(raizProjeto);
  const commit = obterInformacaoGit(["rev-parse", "HEAD"], "indisponível");
  const branch = obterInformacaoGit(["branch", "--show-current"], "indisponível");
  const estadoGit = obterInformacaoGit(["status", "--porcelain"], "");

  registrar("ROTA — evidência canônica da suíte completa\n");
  registrar(`Versão do formato: ${FORMATO_LOG_TEST_ALL}\n`);
  registrar(`Executor: ${executor}\n`);
  registrar(`Início: ${inicio.toISOString()}\n`);
  registrar(`Node.js: ${process.version}\n`);
  registrar(`npm: ${obterVersaoNpm()}\n`);
  registrar(`Branch: ${branch}\n`);
  registrar(`Commit: ${commit}\n`);
  registrar(`Working tree sujo: ${estadoGit ? "sim" : "não"}\n`);
  registrar(`Porta E2E: ${porta}\n`);
  registrar(`Timeout de boot: ${timeoutBootMs} ms\n`);
  registrar(`Timeout total: ${timeoutTotalMs} ms\n`);
  registrar(`Arquivos no fingerprint: ${fingerprint.arquivos.length}\n`);
  registrar(`Fingerprint SHA-256: ${fingerprint.sha256}\n`);
  registrar(`Log final: ${caminhoRelativo(raizProjeto, caminhoLog)}\n`);

  resultadoUnitarios = await executarEtapa({
    nome: "Testes unitários",
    comandoExibido: "npm test",
    comando: process.execPath,
    argumentosComando: [caminhoCliNpm, "test"],
    timeoutMs: limiteTotal - Date.now(),
  });

  resultadoE2e = await executarEtapa({
    nome: "Testes E2E",
    comandoExibido: `node scripts/executar-e2e-controlado.mjs --porta=${porta} --timeout-boot-ms=${timeoutBootMs}`,
    comando: process.execPath,
    argumentosComando: [
      resolve(raizProjeto, "scripts/executar-e2e-controlado.mjs"),
      `--porta=${porta}`,
      `--timeout-boot-ms=${timeoutBootMs}`,
      `--timeout-total-ms=${Math.max(1, limiteTotal - Date.now())}`,
    ],
    timeoutMs: limiteTotal - Date.now(),
  });
} catch (erro) {
  erroGeral = erro;
  registrar(`\nExceção no executor canônico: ${erro.message}\n`);
} finally {
  if (!interrompido && processoEtapa?.pid) {
    const limpeza = await encerrarArvoreProcesso(processoEtapa.pid);
    registrar(`Limpeza final da etapa: ${limpeza.detalhe}\n`);
  }
}

const aprovado =
  !erroGeral && resultadoUnitarios.codigo === 0 && resultadoE2e.codigo === 0;

registrar(`\n${"=".repeat(72)}\nRESUMO FINAL\n${"=".repeat(72)}\n`);
registrar(`Código Testes unitários: ${resultadoUnitarios.codigo}\n`);
registrar(`Sinal Testes unitários: ${resultadoUnitarios.sinal ?? "nenhum"}\n`);
registrar(`Tempo Testes unitários: ${resultadoUnitarios.duracaoMs} ms\n`);
registrar(`Código Testes E2E: ${resultadoE2e.codigo}\n`);
registrar(`Sinal Testes E2E: ${resultadoE2e.sinal ?? "nenhum"}\n`);
registrar(`Tempo Testes E2E: ${resultadoE2e.duracaoMs} ms\n`);
registrar(`Resultado geral: ${aprovado ? "APROVADO" : "FALHOU"}\n`);
registrar(`Fim: ${new Date().toISOString()}\n`);
registrar(`${MARCADOR_FIM_LOG}\n`);
fecharLog();
renameSync(caminhoLogTemporario, caminhoLog);

process.exitCode = aprovado ? 0 : 1;
