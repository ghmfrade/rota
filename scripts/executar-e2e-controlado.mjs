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

const raizProjetoPadrao = fileURLToPath(new URL("../", import.meta.url));
/** @type {{ once(evento: string, listener: () => void): unknown, removeListener(evento: string, listener: () => void): unknown }} */
const emissorSinaisPadrao = process;
/** @type {{ write(dados: string | Uint8Array): unknown }} */
const stdoutPadrao = process.stdout;
/** @type {{ write(dados: string | Uint8Array): unknown }} */
const stderrPadrao = process.stderr;

async function validarInicializacaoChromium(url, limiteMs, escrever) {
  const { chromium } = await import("@playwright/test");

  // Aquece quatro processos, mas em sequência: o Playwright continua usando
  // quatro workers; apenas se evita uma rajada artificial antes da suíte.
  for (let indice = 0; indice < 4; indice += 1) {
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
        escrever(`Preflight Chromium ${indice + 1}/4 aprovado (tentativa ${tentativa}).\n`);
        ultimoErro = undefined;
        break;
      } catch (erro) {
        ultimoErro = erro;
        escrever(
          `Preflight Chromium ${indice + 1}/4 repetido após tentativa ${tentativa}: ${erro.message}\n`,
        );
      } finally {
        await navegador.close();
      }
    }

    if (ultimoErro) {
      throw new Error(
        `Preflight Chromium ${indice + 1}/4 não estabilizou: ${ultimoErro.message}`,
      );
    }
  }
}

export async function executarE2eControlado({
  raizProjeto = raizProjetoPadrao,
  porta = PORTA_E2E_PADRAO,
  timeoutBootMs = TIMEOUT_BOOT_PADRAO_MS,
  timeoutTotalMs = TIMEOUT_TOTAL_PADRAO_MS,
  caminhoCliNpm = process.env.npm_execpath,
  comandoBuild,
  comandoServidor,
  comandoPlaywright,
  encerrarProcesso = encerrarArvoreProcesso,
  preflight = validarInicializacaoChromium,
  emissorSinais = emissorSinaisPadrao,
  stdout = stdoutPadrao,
  stderr = stderrPadrao,
}) {
  if ((!comandoBuild || !comandoServidor || !comandoPlaywright) && !caminhoCliNpm) {
    throw new Error("Execute este script por meio de um comando npm do projeto.");
  }

  const host = "127.0.0.1";
  const urlBase = `http://${host}:${porta}`;
  const build = comandoBuild ?? {
    exibido: "npm run build",
    comando: process.execPath,
    argumentos: [caminhoCliNpm, "run", "build"],
  };
  const servidor = comandoServidor ?? {
    exibido: `next start --hostname ${host} --port ${porta}`,
    comando: process.execPath,
    argumentos: [
      resolve(raizProjeto, "node_modules", "next", "dist", "bin", "next"),
      "start",
      "--hostname",
      host,
      "--port",
      String(porta),
    ],
  };
  const playwright = comandoPlaywright ?? {
    exibido: "npm run test:e2e",
    comando: process.execPath,
    argumentos: [caminhoCliNpm, "run", "test:e2e"],
  };
  const escreverOut = (dados) => stdout.write(dados);
  const escreverErro = (dados) => stderr.write(dados);
  const ambienteControlado = {
    ...process.env,
    FORCE_COLOR: "0",
    ROTA_E2E_CONTROLADO: "1",
    ROTA_PORTA_E2E: String(porta),
  };

  let servidorNext;
  let processoBuild;
  let processoPlaywright;
  let limpezaConcluida = false;
  let limpezaAprovada = true;
  let encerrandoPorSinal = false;
  let sinalRecebido;
  let promessaSinal = Promise.resolve();
  let codigoSaida = 0;

  async function limparProcessosProprios() {
    if (limpezaConcluida) {
      return limpezaAprovada;
    }
    limpezaConcluida = true;

    if (processoBuild?.pid) {
      const resultadoBuild = await encerrarProcesso(processoBuild.pid);
      escreverOut(`Limpeza build: ${resultadoBuild.detalhe}\n`);
      limpezaAprovada &&= resultadoBuild.encerrado;
    }
    if (processoPlaywright?.pid) {
      const resultadoPlaywright = await encerrarProcesso(processoPlaywright.pid);
      escreverOut(`Limpeza Playwright: ${resultadoPlaywright.detalhe}\n`);
      limpezaAprovada &&= resultadoPlaywright.encerrado;
    }
    if (servidorNext?.pid) {
      const resultadoServidor = await encerrarProcesso(servidorNext.pid);
      escreverOut(`Limpeza servidor: ${resultadoServidor.detalhe}\n`);
      limpezaAprovada &&= resultadoServidor.encerrado;
    }
    return limpezaAprovada;
  }

  function tratarSinal(sinal) {
    if (encerrandoPorSinal) {
      return;
    }
    encerrandoPorSinal = true;
    sinalRecebido = sinal;
    escreverErro(`Executor E2E interrompido por ${sinal}.\n`);
    promessaSinal = limparProcessosProprios();
  }

  const aoSigint = () => tratarSinal("SIGINT");
  const aoSigterm = () => tratarSinal("SIGTERM");
  emissorSinais.once("SIGINT", aoSigint);
  emissorSinais.once("SIGTERM", aoSigterm);

  const inicio = Date.now();

  try {
    if (!(await verificarPortaLivre(porta, host))) {
      throw new Error(
        `A porta dedicada ${porta} já está ocupada. O executor recusou reutilizar o servidor existente.`,
      );
    }

    escreverOut(`Porta E2E: ${porta}\n`);
    escreverOut(`URL E2E: ${urlBase}\n`);
    escreverOut(`Comando build controlado: ${build.exibido}\n`);

    const resultadoBuild = await executarProcesso({
      comando: build.comando,
      argumentos: build.argumentos,
      cwd: raizProjeto,
      env: { ...ambienteControlado, ...build.env },
      timeoutMs: Math.min(timeoutBootMs, timeoutTotalMs),
      aoIniciar: (processo) => {
        processoBuild = processo;
        escreverOut(`PID build Next: ${processo.pid}\n`);
      },
      aoStdout: escreverOut,
      aoStderr: escreverErro,
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

    escreverOut(`Comando servidor: ${servidor.exibido}\n`);
    servidorNext = spawn(servidor.comando, servidor.argumentos, {
      cwd: raizProjeto,
      env: { ...ambienteControlado, ...servidor.env },
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    escreverOut(`PID servidor Next: ${servidorNext.pid}\n`);
    servidorNext.stdout.on("data", escreverOut);
    servidorNext.stderr.on("data", escreverErro);

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
          25,
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
    escreverOut(`Health check aprovado em ${duracaoBootMs} ms.\n`);

    await preflight(urlBase, inicio + timeoutTotalMs, escreverOut);
    escreverOut("Preflight dos quatro processos Chromium concluído.\n");

    const restanteMs = timeoutTotalMs - (Date.now() - inicio);
    if (restanteMs <= 0) {
      throw new Error(`Timeout total de ${timeoutTotalMs} ms atingido após o boot.`);
    }

    escreverOut(`Comando Playwright: ${playwright.exibido}\n`);
    const resultadoPlaywright = await executarProcesso({
      comando: playwright.comando,
      argumentos: playwright.argumentos,
      cwd: raizProjeto,
      env: { ...ambienteControlado, ...playwright.env },
      timeoutMs: restanteMs,
      aoIniciar: (processo) => {
        processoPlaywright = processo;
        escreverOut(`PID Playwright: ${processo.pid}\n`);
      },
      aoStdout: escreverOut,
      aoStderr: escreverErro,
    });
    processoPlaywright = undefined;

    if (sinalRecebido) {
      throw new Error(`execução interrompida por ${sinalRecebido}`);
    }

    escreverOut(`Código Playwright: ${resultadoPlaywright.codigo ?? "indefinido"}\n`);
    escreverOut(`Sinal Playwright: ${resultadoPlaywright.sinal ?? "nenhum"}\n`);
    escreverOut(`Tempo Playwright: ${resultadoPlaywright.duracaoMs} ms\n`);

    if (resultadoPlaywright.timeout) {
      throw new Error(`Timeout total de ${timeoutTotalMs} ms durante o Playwright.`);
    }
    if (resultadoPlaywright.erro) {
      throw resultadoPlaywright.erro;
    }
    if (resultadoPlaywright.codigo !== 0) {
      codigoSaida = resultadoPlaywright.codigo || 1;
    }
  } catch (erro) {
    escreverErro(`Falha no executor E2E controlado: ${erro.message}\n`);
    codigoSaida = sinalRecebido === "SIGINT" ? 130 : sinalRecebido === "SIGTERM" ? 143 : 1;
  } finally {
    await promessaSinal;
    if (!(await limparProcessosProprios())) {
      escreverErro("Falha ao confirmar o encerramento de todos os PIDs próprios.\n");
      codigoSaida = 1;
    }
    emissorSinais.removeListener("SIGINT", aoSigint);
    emissorSinais.removeListener("SIGTERM", aoSigterm);
    escreverOut(`Tempo total E2E controlado: ${Date.now() - inicio} ms\n`);
  }

  return { codigo: codigoSaida, sinal: sinalRecebido ?? null };
}

async function principal() {
  const argumentos = process.argv.slice(2);
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
  const resultado = await executarE2eControlado({ porta, timeoutBootMs, timeoutTotalMs });
  process.exitCode = resultado.codigo;
}

const executadoDiretamente =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (executadoDiretamente) {
  await principal();
}
