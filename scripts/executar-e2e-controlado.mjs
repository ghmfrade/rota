import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  aguardarHealthCheck,
  encerrarArvoreProcesso,
  executarProcesso,
  lerInteiroPositivo,
  PORTA_E2E_PADRAO,
  TIMEOUT_BOOT_PADRAO_MS,
  TIMEOUT_TOTAL_PADRAO_MS,
  verificarPortaLivre,
} from "./infraestrutura-test-all.mjs";

const raizProjeto = fileURLToPath(new URL("../", import.meta.url));
const argumentos = process.argv.slice(2);
const host = "127.0.0.1";
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
const urlBase = `http://${host}:${porta}`;
const caminhoCliNpm = process.env.npm_execpath;

if (!caminhoCliNpm) {
  throw new Error("Execute este script por meio de um comando npm do projeto.");
}

let servidorNext;
let processoBuild;
let processoPlaywright;
let limpezaConcluida = false;
let limpezaAprovada = true;
let encerrandoPorSinal = false;
let sinalRecebido;

async function limparProcessosProprios() {
  if (limpezaConcluida) {
    return limpezaAprovada;
  }
  limpezaConcluida = true;

  if (processoBuild?.pid) {
    const resultadoBuild = await encerrarArvoreProcesso(processoBuild.pid);
    process.stdout.write(`Limpeza build: ${resultadoBuild.detalhe}\n`);
    limpezaAprovada &&= resultadoBuild.encerrado;
  }
  if (processoPlaywright?.pid) {
    const resultadoPlaywright = await encerrarArvoreProcesso(processoPlaywright.pid);
    process.stdout.write(`Limpeza Playwright: ${resultadoPlaywright.detalhe}\n`);
    limpezaAprovada &&= resultadoPlaywright.encerrado;
  }
  if (servidorNext?.pid) {
    const resultadoServidor = await encerrarArvoreProcesso(servidorNext.pid);
    process.stdout.write(`Limpeza servidor: ${resultadoServidor.detalhe}\n`);
    limpezaAprovada &&= resultadoServidor.encerrado;
  }
  return limpezaAprovada;
}

async function tratarSinal(sinal) {
  if (encerrandoPorSinal) {
    return;
  }
  encerrandoPorSinal = true;
  sinalRecebido = sinal;
  process.stderr.write(`Executor E2E interrompido por ${sinal}.\n`);
  await limparProcessosProprios();
}

async function validarInicializacaoChromium(url, limiteMs) {
  const { chromium } = await import("@playwright/test");

  await Promise.all(
    Array.from({ length: 4 }, async (_, indice) => {
      let ultimoErro;

      for (let tentativa = 1; tentativa <= 2; tentativa += 1) {
        const restanteMs = limiteMs - Date.now();
        if (restanteMs <= 0) {
          throw new Error("Timeout total atingido durante o preflight Chromium.");
        }

        const navegador = await chromium.launch({ headless: true });
        try {
          const pagina = await navegador.newPage();
          await pagina.goto(url, {
            waitUntil: "load",
            timeout: Math.min(30_000, restanteMs),
          });
          process.stdout.write(
            `Preflight Chromium ${indice + 1}/4 aprovado (tentativa ${tentativa}).\n`,
          );
          return;
        } catch (erro) {
          ultimoErro = erro;
          process.stdout.write(
            `Preflight Chromium ${indice + 1}/4 repetido após tentativa ${tentativa}: ${erro.message}\n`,
          );
        } finally {
          await navegador.close();
        }
      }

      throw new Error(
        `Preflight Chromium ${indice + 1}/4 não estabilizou: ${ultimoErro?.message ?? "erro desconhecido"}`,
      );
    }),
  );
}

process.once("SIGINT", () => void tratarSinal("SIGINT"));
process.once("SIGTERM", () => void tratarSinal("SIGTERM"));

const inicio = Date.now();

try {
  if (!(await verificarPortaLivre(porta, host))) {
    throw new Error(
      `A porta dedicada ${porta} já está ocupada. O executor recusou reutilizar o servidor existente.`,
    );
  }

  process.stdout.write(`Porta E2E: ${porta}\n`);
  process.stdout.write(`URL E2E: ${urlBase}\n`);
  process.stdout.write("Comando build controlado: npm run build\n");

  const resultadoBuild = await executarProcesso({
    comando: process.execPath,
    argumentos: [caminhoCliNpm, "run", "build"],
    cwd: raizProjeto,
    env: {
      ...process.env,
      FORCE_COLOR: "0",
      ROTA_E2E_CONTROLADO: "1",
      ROTA_PORTA_E2E: String(porta),
    },
    timeoutMs: Math.min(timeoutBootMs, timeoutTotalMs),
    aoIniciar: (processo) => {
      processoBuild = processo;
      process.stdout.write(`PID build Next: ${processo.pid}\n`);
    },
    aoStdout: (dados) => process.stdout.write(dados),
    aoStderr: (dados) => process.stderr.write(dados),
  });
  processoBuild = undefined;

  if (resultadoBuild.timeout) {
    throw new Error(`Timeout de boot de ${timeoutBootMs} ms durante o build Next.`);
  }
  if (resultadoBuild.erro) {
    throw resultadoBuild.erro;
  }
  if (resultadoBuild.codigo !== 0) {
    throw new Error(`Build Next controlado terminou com código ${resultadoBuild.codigo}.`);
  }
  if (sinalRecebido) {
    throw new Error(`execução interrompida por ${sinalRecebido} durante o build.`);
  }

  const caminhoNext = resolve(raizProjeto, "node_modules", "next", "dist", "bin", "next");
  process.stdout.write(
    `Comando servidor: next start --hostname ${host} --port ${porta}\n`,
  );

  servidorNext = spawn(
    process.execPath,
    [
      caminhoNext,
      "start",
      "--hostname",
      host,
      "--port",
      String(porta),
    ],
    {
      cwd: raizProjeto,
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        ROTA_E2E_CONTROLADO: "1",
        ROTA_PORTA_E2E: String(porta),
      },
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  process.stdout.write(`PID servidor Next: ${servidorNext.pid}\n`);
  servidorNext.stdout.on("data", (dados) => process.stdout.write(dados));
  servidorNext.stderr.on("data", (dados) => process.stderr.write(dados));

  const falhaPrematuraServidor = new Promise((_, reject) => {
    servidorNext.once("error", reject);
    servidorNext.once("close", (codigo, sinal) => {
      if (!limpezaConcluida || sinalRecebido) {
        reject(
          new Error(
            `Servidor Next encerrou antes dos testes (código ${codigo ?? "indefinido"}, sinal ${
              sinal ?? "nenhum"
            }).`,
          ),
        );
      }
    });
  });

  const controladorHealth = new AbortController();
  let duracaoBootMs;
  const restanteBootMs = timeoutBootMs - (Date.now() - inicio);
  if (restanteBootMs <= 0) {
    throw new Error(`Timeout de boot de ${timeoutBootMs} ms atingido antes do health check.`);
  }
  try {
    duracaoBootMs = await Promise.race([
      aguardarHealthCheck(
        urlBase,
        Math.min(restanteBootMs, timeoutTotalMs - (Date.now() - inicio)),
        250,
        controladorHealth.signal,
      ),
      falhaPrematuraServidor,
    ]);
  } finally {
    controladorHealth.abort();
  }
  if (sinalRecebido) {
    throw new Error(`execução interrompida por ${sinalRecebido}`);
  }
  process.stdout.write(`Health check aprovado em ${duracaoBootMs} ms.\n`);

  // Neste host Windows, a primeira carga pesada de processos Chromium pode
  // expirar mesmo com o servidor pronto. O preflight abre exatamente quatro
  // navegadores descartáveis e exige uma carga verde antes de iniciar os casos;
  // a suíte preserva seus quatro workers, asserções, timeouts e zero retries.
  await validarInicializacaoChromium(urlBase, inicio + timeoutTotalMs);
  process.stdout.write("Preflight dos quatro processos Chromium concluído.\n");

  const restanteMs = timeoutTotalMs - (Date.now() - inicio);
  if (restanteMs <= 0) {
    throw new Error(`Timeout total de ${timeoutTotalMs} ms atingido após o boot.`);
  }

  process.stdout.write("Comando Playwright: npm run test:e2e\n");
  const resultadoPlaywright = await executarProcesso({
    comando: process.execPath,
    argumentos: [caminhoCliNpm, "run", "test:e2e"],
    cwd: raizProjeto,
    env: {
      ...process.env,
      FORCE_COLOR: "0",
      ROTA_E2E_CONTROLADO: "1",
      ROTA_PORTA_E2E: String(porta),
    },
    timeoutMs: restanteMs,
    aoIniciar: (processo) => {
      processoPlaywright = processo;
      process.stdout.write(`PID Playwright: ${processo.pid}\n`);
    },
    aoStdout: (dados) => process.stdout.write(dados),
    aoStderr: (dados) => process.stderr.write(dados),
  });
  processoPlaywright = undefined;

  if (sinalRecebido) {
    throw new Error(`execução interrompida por ${sinalRecebido}`);
  }

  process.stdout.write(`Código Playwright: ${resultadoPlaywright.codigo ?? "indefinido"}\n`);
  process.stdout.write(`Sinal Playwright: ${resultadoPlaywright.sinal ?? "nenhum"}\n`);
  process.stdout.write(`Tempo Playwright: ${resultadoPlaywright.duracaoMs} ms\n`);

  if (resultadoPlaywright.timeout) {
    throw new Error(`Timeout total de ${timeoutTotalMs} ms durante o Playwright.`);
  }
  if (resultadoPlaywright.erro) {
    throw resultadoPlaywright.erro;
  }
  if (resultadoPlaywright.codigo !== 0) {
    process.exitCode = resultadoPlaywright.codigo || 1;
  }
} catch (erro) {
  process.stderr.write(`Falha no executor E2E controlado: ${erro.message}\n`);
  process.exitCode = sinalRecebido === "SIGINT" ? 130 : sinalRecebido === "SIGTERM" ? 143 : 1;
} finally {
  if (!(await limparProcessosProprios())) {
    process.stderr.write("Falha ao confirmar o encerramento de todos os PIDs próprios.\n");
    process.exitCode = 1;
  }
  process.stdout.write(`Tempo total E2E controlado: ${Date.now() - inicio} ms\n`);
}
