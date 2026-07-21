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
  obterIdentidadeWorkingTree,
  PORTA_E2E_PADRAO,
  TIMEOUT_BOOT_PADRAO_MS,
  TIMEOUT_TOTAL_PADRAO_MS,
} from "./infraestrutura-test-all.mjs";
import { MARCADOR_FIM_LOG } from "./verificar-log-test-all.mjs";

const raizProjetoPadrao = fileURLToPath(new URL("../", import.meta.url));
/** @type {{ once(evento: string, listener: () => void): unknown, removeListener(evento: string, listener: () => void): unknown }} */
const emissorSinaisPadrao = process;
/** @type {{ write(dados: string | Uint8Array): unknown }} */
const stdoutPadrao = process.stdout;
/** @type {{ write(dados: string | Uint8Array): unknown }} */
const stderrPadrao = process.stderr;

function obterInformacaoGit(raizProjeto, argumentosGit, fallback) {
  const resultado = spawnSync("git", argumentosGit, {
    cwd: raizProjeto,
    encoding: "utf8",
    windowsHide: true,
  });
  return resultado.status === 0 ? resultado.stdout.trim() || fallback : fallback;
}

function obterVersaoNpm(raizProjeto, caminhoCliNpm) {
  if (!caminhoCliNpm) {
    return "indisponível";
  }
  const resultado = spawnSync(process.execPath, [caminhoCliNpm, "--version"], {
    cwd: raizProjeto,
    encoding: "utf8",
    windowsHide: true,
  });
  return resultado.status === 0 ? resultado.stdout.trim() : "indisponível";
}

export async function executarTestAll({
  raizProjeto = raizProjetoPadrao,
  executor,
  porta = PORTA_E2E_PADRAO,
  timeoutBootMs = TIMEOUT_BOOT_PADRAO_MS,
  timeoutTotalMs = TIMEOUT_TOTAL_PADRAO_MS,
  caminhoLog = resolve(raizProjeto, "ultimo-test-all.log"),
  caminhoCliNpm = process.env.npm_execpath,
  comandoUnitarios,
  comandoE2e,
  encerrarProcesso = encerrarArvoreProcesso,
  emissorSinais = emissorSinaisPadrao,
  stdout = stdoutPadrao,
  stderr = stderrPadrao,
}) {
  if (!executor?.trim()) {
    throw new Error("Informe quem executa com --executor=humano, --executor=Codex ou equivalente.");
  }
  if ((!comandoUnitarios || !comandoE2e) && !caminhoCliNpm) {
    throw new Error("Execute este script por meio de npm run test:all:log.");
  }

  const etapaUnitarios = comandoUnitarios ?? {
    exibido: "npm test",
    comando: process.execPath,
    argumentos: [caminhoCliNpm, "test"],
  };
  const etapaE2e = comandoE2e ?? {
    exibido: `node scripts/executar-e2e-controlado.mjs --porta=${porta} --timeout-boot-ms=${timeoutBootMs}`,
    comando: process.execPath,
    argumentos: [
      resolve(raizProjeto, "scripts/executar-e2e-controlado.mjs"),
      `--porta=${porta}`,
      `--timeout-boot-ms=${timeoutBootMs}`,
    ],
  };
  const caminhoLogTemporario = join(
    dirname(caminhoLog),
    `.${basename(caminhoLog)}.tmp-${process.pid}.log`,
  );

  await garantirDiretorioDoArquivo(caminhoLog);
  rmSync(caminhoLog, { force: true });
  rmSync(caminhoLogTemporario, { force: true });
  const descritorLog = openSync(caminhoLogTemporario, "wx");
  let processoEtapa;
  let interrompido = false;
  let sinalRecebido;
  let logFechado = false;
  let promessaInterrupcao = Promise.resolve();

  function registrar(texto) {
    writeSync(descritorLog, texto);
  }

  function fecharLog() {
    if (!logFechado) {
      closeSync(descritorLog);
      logFechado = true;
    }
  }

  function interromper(sinal) {
    if (interrompido) {
      return;
    }
    interrompido = true;
    sinalRecebido = sinal;
    registrar(`\nExecução interrompida por ${sinal}; log temporário não promovido.\n`);
    promessaInterrupcao = (async () => {
      if (processoEtapa?.pid) {
        const limpeza = await encerrarProcesso(processoEtapa.pid);
        registrar(`Limpeza após interrupção: ${limpeza.detalhe}\n`);
      }
    })();
  }

  const aoSigint = () => interromper("SIGINT");
  const aoSigterm = () => interromper("SIGTERM");
  emissorSinais.once("SIGINT", aoSigint);
  emissorSinais.once("SIGTERM", aoSigterm);

  async function executarEtapa(nome, especificacao, timeoutMs) {
    registrar(`\n${"=".repeat(72)}\n${nome}\n${"=".repeat(72)}\n`);
    registrar(`Comando: ${especificacao.exibido}\n`);

    if (timeoutMs <= 0) {
      registrar("Etapa não iniciada: timeout total já esgotado.\n");
      return { codigo: 124, sinal: null, timeout: true, duracaoMs: 0, erro: null };
    }

    const resultado = await executarProcesso({
      comando: especificacao.comando,
      argumentos: especificacao.argumentos,
      cwd: raizProjeto,
      env: { ...process.env, ...especificacao.env, FORCE_COLOR: "0" },
      timeoutMs,
      aoIniciar: (processo) => {
        processoEtapa = processo;
        registrar(`PID da etapa: ${processo.pid}\n`);
      },
      aoStdout: (dados) => {
        stdout.write(dados);
        registrar(dados);
      },
      aoStderr: (dados) => {
        stderr.write(dados);
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
    const identidadeWorkingTree = await obterIdentidadeWorkingTree(raizProjeto);
    const commit = obterInformacaoGit(raizProjeto, ["rev-parse", "HEAD"], "indisponível");
    const branch = obterInformacaoGit(raizProjeto, ["branch", "--show-current"], "indisponível");
    const estadoGit = obterInformacaoGit(raizProjeto, ["status", "--porcelain"], "");

    registrar("ROTA — evidência canônica da suíte completa\n");
    registrar(`Versão do formato: ${FORMATO_LOG_TEST_ALL}\n`);
    registrar(`Executor: ${executor.trim()}\n`);
    registrar(`Início: ${inicio.toISOString()}\n`);
    registrar(`Node.js: ${process.version}\n`);
    registrar(`npm: ${obterVersaoNpm(raizProjeto, caminhoCliNpm)}\n`);
    registrar(`Branch: ${branch}\n`);
    registrar(`Commit: ${commit}\n`);
    registrar(`Working tree sujo: ${estadoGit ? "sim" : "não"}\n`);
    registrar(`Working tree canônico: ${identidadeWorkingTree.caminhoCanonico}\n`);
    registrar(`Identidade working tree SHA-256: ${identidadeWorkingTree.sha256}\n`);
    registrar(`Porta E2E: ${porta}\n`);
    registrar(`Timeout de boot: ${timeoutBootMs} ms\n`);
    registrar(`Timeout total: ${timeoutTotalMs} ms\n`);
    registrar(`Arquivos no fingerprint: ${fingerprint.arquivos.length}\n`);
    registrar(`Fingerprint SHA-256: ${fingerprint.sha256}\n`);
    registrar(`Log final: ${caminhoRelativo(raizProjeto, caminhoLog)}\n`);

    if (!interrompido) {
      resultadoUnitarios = await executarEtapa(
        "Testes unitários",
        etapaUnitarios,
        limiteTotal - Date.now(),
      );
    }
    if (!interrompido) {
      resultadoE2e = await executarEtapa(
        "Testes E2E",
        {
          ...etapaE2e,
          argumentos: [
            ...etapaE2e.argumentos,
            ...(comandoE2e
              ? []
              : [`--timeout-total-ms=${Math.max(1, limiteTotal - Date.now())}`]),
          ],
        },
        limiteTotal - Date.now(),
      );
    }
  } catch (erro) {
    erroGeral = erro;
    registrar(`\nExceção no executor canônico: ${erro.message}\n`);
  } finally {
    await promessaInterrupcao;
    if (processoEtapa?.pid) {
      const limpeza = await encerrarProcesso(processoEtapa.pid);
      registrar(`Limpeza final da etapa: ${limpeza.detalhe}\n`);
    }
    emissorSinais.removeListener("SIGINT", aoSigint);
    emissorSinais.removeListener("SIGTERM", aoSigterm);
  }

  if (interrompido) {
    fecharLog();
    return {
      codigo: sinalRecebido === "SIGINT" ? 130 : 143,
      caminhoLog,
      caminhoLogTemporario,
      promovido: false,
      resultadoUnitarios,
      resultadoE2e,
    };
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

  return {
    codigo: aprovado ? 0 : 1,
    caminhoLog,
    caminhoLogTemporario,
    promovido: true,
    resultadoUnitarios,
    resultadoE2e,
  };
}

async function principal() {
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
  const caminhoLog = isAbsolute(argumentoLog)
    ? argumentoLog
    : resolve(raizProjetoPadrao, argumentoLog);

  const resultado = await executarTestAll({
    executor,
    porta,
    timeoutBootMs,
    timeoutTotalMs,
    caminhoLog,
  });
  process.exitCode = resultado.codigo;
}

const executadoDiretamente =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (executadoDiretamente) {
  await principal();
}
