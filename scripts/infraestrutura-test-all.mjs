import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  realpath,
  stat,
} from "node:fs/promises";
import { constants as constantesFs } from "node:fs";
import { createServer } from "node:net";
import { relative, resolve, sep } from "node:path";
import { spawn, spawnSync } from "node:child_process";

export const FORMATO_LOG_TEST_ALL = "2";
export const PORTA_E2E_PADRAO = 3100;
export const TIMEOUT_BOOT_PADRAO_MS = 60_000;
export const TIMEOUT_TOTAL_PADRAO_MS = 10 * 60_000;

const DIRETORIOS_FINGERPRINT = ["data", "public", "scripts", "src", "testes"];
const ARQUIVOS_FINGERPRINT = [
  "eslint.config.mjs",
  "next.config.ts",
  "package-lock.json",
  "package.json",
  "playwright.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "vitest.config.ts",
];

function normalizarCaminho(caminho) {
  return caminho.split(sep).join("/");
}

async function listarArquivosRecursivamente(raizProjeto, caminhoRelativo) {
  const caminhoAbsoluto = resolve(raizProjeto, caminhoRelativo);
  let entradas;

  try {
    entradas = await readdir(caminhoAbsoluto, { withFileTypes: true });
  } catch (erro) {
    if (erro?.code === "ENOENT") {
      return [];
    }
    throw erro;
  }

  const arquivos = [];
  for (const entrada of entradas.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))) {
    const relativo = normalizarCaminho(`${caminhoRelativo}/${entrada.name}`);
    if (entrada.isDirectory()) {
      arquivos.push(...(await listarArquivosRecursivamente(raizProjeto, relativo)));
    } else if (entrada.isFile()) {
      arquivos.push(relativo);
    }
  }
  return arquivos;
}

export async function listarArquivosDoFingerprint(raizProjeto) {
  const arquivos = [];

  for (const diretorio of DIRETORIOS_FINGERPRINT) {
    arquivos.push(...(await listarArquivosRecursivamente(raizProjeto, diretorio)));
  }

  for (const arquivo of ARQUIVOS_FINGERPRINT) {
    try {
      const informacao = await stat(resolve(raizProjeto, arquivo));
      if (informacao.isFile()) {
        arquivos.push(arquivo);
      }
    } catch (erro) {
      if (erro?.code !== "ENOENT") {
        throw erro;
      }
    }
  }

  return [...new Set(arquivos)].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function calcularFingerprint(raizProjeto) {
  const hash = createHash("sha256");
  const arquivos = await listarArquivosDoFingerprint(raizProjeto);

  for (const caminhoRelativo of arquivos) {
    hash.update(caminhoRelativo, "utf8");
    hash.update("\0");
    hash.update(await readFile(resolve(raizProjeto, caminhoRelativo)));
    hash.update("\0");
  }

  return {
    algoritmo: "sha256",
    arquivos,
    sha256: hash.digest("hex"),
  };
}

export async function obterIdentidadeWorkingTree(raizProjeto) {
  const caminhoCanonico = normalizarCaminho(await realpath(raizProjeto));
  const caminhoParaHash = process.platform === "win32"
    ? caminhoCanonico.toLocaleLowerCase("en-US")
    : caminhoCanonico;

  return {
    caminhoCanonico,
    sha256: createHash("sha256").update(caminhoParaHash, "utf8").digest("hex"),
  };
}

export function lerOpcao(argumentos, nome, fallback) {
  const prefixo = `--${nome}=`;
  const argumento = argumentos.find((item) => item.startsWith(prefixo));
  return argumento ? argumento.slice(prefixo.length) : fallback;
}

export function lerInteiroPositivo(argumentos, nome, fallback) {
  const valor = Number(lerOpcao(argumentos, nome, fallback));
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new Error(`A opção --${nome} deve ser um inteiro positivo.`);
  }
  return valor;
}

export async function verificarPortaLivre(porta, host = "127.0.0.1") {
  return new Promise((resolvePromessa, reject) => {
    const servidor = createServer();
    servidor.unref();
    servidor.once("error", (erro) => {
      if (erro?.code === "EADDRINUSE" || erro?.code === "EACCES") {
        resolvePromessa(false);
        return;
      }
      reject(erro);
    });
    servidor.listen({ host, port: porta, exclusive: true }, () => {
      servidor.close((erro) => (erro ? reject(erro) : resolvePromessa(true)));
    });
  });
}

export async function aguardarHealthCheck(url, timeoutMs, intervaloMs = 250, sinal) {
  const inicio = Date.now();
  let ultimoErro;

  while (Date.now() - inicio < timeoutMs) {
    if (sinal?.aborted) {
      throw new Error(`Health check cancelado em ${url}.`);
    }
    try {
      const controlador = new AbortController();
      const cancelar = () => controlador.abort();
      sinal?.addEventListener("abort", cancelar, { once: true });
      const temporizador = setTimeout(() => controlador.abort(), Math.min(2_000, timeoutMs));
      try {
        const resposta = await fetch(url, { signal: controlador.signal });
        if (resposta.ok) {
          return Date.now() - inicio;
        }
        ultimoErro = new Error(`health check respondeu HTTP ${resposta.status}`);
      } finally {
        clearTimeout(temporizador);
        sinal?.removeEventListener("abort", cancelar);
      }
    } catch (erro) {
      ultimoErro = erro;
    }

    await new Promise((resolvePromessa) => setTimeout(resolvePromessa, intervaloMs));
  }

  throw new Error(
    `Timeout de ${timeoutMs} ms aguardando health check em ${url}${
      ultimoErro ? `: ${ultimoErro.message}` : "."
    }`,
  );
}

function processoExiste(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (erro) {
    return erro?.code === "EPERM";
  }
}

async function aguardarEncerramento(pid, timeoutMs = 3_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    if (!processoExiste(pid)) {
      return true;
    }
    await new Promise((resolvePromessa) => setTimeout(resolvePromessa, 50));
  }
  return !processoExiste(pid);
}

export async function encerrarArvoreProcesso(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return { encerrado: false, detalhe: "PID ausente ou inválido" };
  }

  if (!processoExiste(pid)) {
    return { encerrado: true, detalhe: `PID ${pid} já estava encerrado` };
  }

  if (process.platform === "win32") {
    const resultado = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      encoding: "utf8",
      windowsHide: true,
    });
    let encerrado = await aguardarEncerramento(pid);
    if (!encerrado) {
      try {
        process.kill(pid, "SIGKILL");
      } catch (erro) {
        if (erro?.code !== "ESRCH") {
          return {
            encerrado: false,
            detalhe: `taskkill falhou e o fallback direto não encerrou o PID próprio ${pid}: ${erro.message}`,
          };
        }
      }
      encerrado = await aguardarEncerramento(pid);
    }
    return {
      encerrado,
      detalhe:
        resultado.status === 0
          ? `árvore do PID próprio ${pid} encerrada com taskkill /PID ${pid} /T /F`
          : encerrado
            ? `PID próprio ${pid} encerrado diretamente após indisponibilidade de taskkill: ${
                resultado.stderr || resultado.stdout
              }`
            : `taskkill e fallback direto falharam para o PID próprio ${pid}: ${
                resultado.stderr || resultado.stdout
              }`,
    };
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch (erro) {
    if (erro?.code !== "ESRCH") {
      throw erro;
    }
  }
  if (await aguardarEncerramento(pid)) {
    return { encerrado: true, detalhe: `grupo do PID próprio ${pid} encerrado com SIGTERM` };
  }

  try {
    process.kill(-pid, "SIGKILL");
  } catch (erro) {
    if (erro?.code !== "ESRCH") {
      throw erro;
    }
  }
  const encerrado = await aguardarEncerramento(pid);
  return {
    encerrado,
    detalhe: encerrado
      ? `grupo do PID próprio ${pid} encerrado com SIGKILL`
      : `não foi possível encerrar o grupo do PID próprio ${pid}`,
  };
}

export function executarProcesso({
  comando,
  argumentos = /** @type {string[]} */ ([]),
  cwd,
  env = process.env,
  timeoutMs,
  aoIniciar = undefined,
  aoStdout = undefined,
  aoStderr = undefined,
}) {
  return new Promise((resolvePromessa) => {
    const inicio = Date.now();
    const processo = spawn(comando, argumentos, {
      cwd,
      env,
      detached: process.platform !== "win32",
      stdio: ["inherit", "pipe", "pipe"],
      windowsHide: true,
    });
    let encerramentoSolicitado = false;
    let temporizador;
    let resolvido = false;

    aoIniciar?.(processo);
    processo.stdout?.on("data", (dados) => aoStdout?.(dados));
    processo.stderr?.on("data", (dados) => aoStderr?.(dados));

    const concluir = (resultado) => {
      if (resolvido) {
        return;
      }
      resolvido = true;
      if (temporizador) {
        clearTimeout(temporizador);
      }
      resolvePromessa({ ...resultado, duracaoMs: Date.now() - inicio, pid: processo.pid });
    };

    processo.once("error", (erro) => concluir({ codigo: null, sinal: null, erro, timeout: false }));
    processo.once("close", (codigo, sinal) =>
      concluir({ codigo, sinal, erro: null, timeout: encerramentoSolicitado }),
    );

    if (timeoutMs) {
      temporizador = setTimeout(async () => {
        encerramentoSolicitado = true;
        const limpeza = await encerrarArvoreProcesso(processo.pid);
        if (!limpeza.encerrado) {
          processo.kill("SIGKILL");
          setTimeout(
            () =>
              concluir({
                codigo: null,
                sinal: null,
                erro: new Error(limpeza.detalhe),
                timeout: true,
              }),
            1_000,
          ).unref();
        }
      }, timeoutMs);
    }
  });
}

export async function garantirDiretorioDoArquivo(caminhoArquivo) {
  const separador = Math.max(caminhoArquivo.lastIndexOf("/"), caminhoArquivo.lastIndexOf("\\"));
  if (separador > 0) {
    await mkdir(caminhoArquivo.slice(0, separador), { recursive: true });
  }
}

export async function arquivoExiste(caminho) {
  try {
    await access(caminho, constantesFs.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function caminhoRelativo(raizProjeto, caminho) {
  return normalizarCaminho(relative(raizProjeto, caminho));
}
