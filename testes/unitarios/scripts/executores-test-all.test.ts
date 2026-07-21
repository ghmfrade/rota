import { EventEmitter } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { executarE2eControlado } from "../../../scripts/executar-e2e-controlado.mjs";
import { executarTestAll } from "../../../scripts/executar-test-all-log.mjs";
import { arquivoExiste } from "../../../scripts/infraestrutura-test-all.mjs";
import { MARCADOR_FIM_LOG, verificarLog } from "../../../scripts/verificar-log-test-all.mjs";

const caminhoFixture = resolve("testes/fixtures/scripts/processo-controlado.mjs");
const temporarios: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporarios.splice(0).map((caminho) =>
      rm(caminho, {
        recursive: true,
        force: true,
        maxRetries: 20,
        retryDelay: 100,
      }),
    ),
  );
}, 30_000);

async function criarProjetoTemporario() {
  const raiz = await mkdtemp(join(tmpdir(), "rota-executor-test-"));
  temporarios.push(raiz);
  await mkdir(join(raiz, "src"), { recursive: true });
  await writeFile(join(raiz, "src", "exemplo.ts"), "export const valor = 1;\n");
  await writeFile(join(raiz, "package.json"), '{"name":"fixture-executor"}\n');
  return raiz;
}

function comandoFixture(modo: string, valor = "0") {
  return {
    exibido: `fixture ${modo} ${valor}`,
    comando: process.execPath,
    argumentos: [caminhoFixture, modo, valor],
  };
}

function criarSaidaCapturada() {
  let conteudo = "";
  return {
    stream: {
      write(dados: string | Uint8Array) {
        conteudo += dados.toString();
        return true;
      },
    },
    ler: () => conteudo,
  };
}

async function aguardar(condicao: () => boolean | Promise<boolean>, timeoutMs = 5_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    if (await condicao()) return;
    await new Promise((resolvePromessa) => setTimeout(resolvePromessa, 20));
  }
  throw new Error("Timeout aguardando condição do teste de infraestrutura.");
}

async function obterPortaLivre() {
  const servidor = createServer();
  await new Promise<void>((resolvePromessa) => servidor.listen(0, "127.0.0.1", resolvePromessa));
  const endereco = servidor.address();
  if (!endereco || typeof endereco === "string") throw new Error("Endereço inesperado");
  await new Promise<void>((resolvePromessa, reject) =>
    servidor.close((erro) => (erro ? reject(erro) : resolvePromessa())),
  );
  return endereco.port;
}

async function encerrarProcessoFixture(pid: number) {
  try {
    process.kill(pid, "SIGTERM");
  } catch (erro: unknown) {
    if ((erro as NodeJS.ErrnoException).code !== "ESRCH") throw erro;
  }
  await aguardar(() => {
    try {
      process.kill(pid, 0);
      return false;
    } catch (erro: unknown) {
      return (erro as NodeJS.ErrnoException).code !== "EPERM";
    }
  });
  return { encerrado: true, detalhe: `PID fixture ${pid} encerrado diretamente` };
}

describe("orquestrador canônico real", () => {
  test.each([
    ["Vitest vermelho", comandoFixture("sair", "1"), comandoFixture("sair", "0")],
    ["Playwright vermelho", comandoFixture("sair", "0"), comandoFixture("sair", "1")],
  ])("%s produz log final vermelho e não reutilizável", async (_, unitarios, e2e) => {
    const raiz = await criarProjetoTemporario();
    const caminhoLog = join(raiz, "resultado.log");
    const saida = criarSaidaCapturada();

    const resultado = await executarTestAll({
      raizProjeto: raiz,
      executor: "Vitest",
      caminhoLog,
      timeoutTotalMs: 5_000,
      comandoUnitarios: unitarios,
      comandoE2e: e2e,
      stdout: saida.stream,
      stderr: saida.stream,
    });

    expect(resultado).toMatchObject({ codigo: 1, promovido: true });
    expect(await readFile(caminhoLog, "utf8")).toContain("Resultado geral: FALHOU");
    await expect(verificarLog({ raizProjeto: raiz, caminhoLog })).resolves.toMatchObject({
      valido: false,
    });
  });

  test("timeout encerra a etapa própria e registra código 124", async () => {
    const raiz = await criarProjetoTemporario();
    const caminhoLog = join(raiz, "timeout.log");
    const saida = criarSaidaCapturada();

    const resultado = await executarTestAll({
      raizProjeto: raiz,
      executor: "Vitest",
      caminhoLog,
      timeoutTotalMs: 3_000,
      comandoUnitarios: comandoFixture("travar"),
      comandoE2e: comandoFixture("sair", "0"),
      encerrarProcesso: encerrarProcessoFixture,
      stdout: saida.stream,
      stderr: saida.stream,
    });

    expect(resultado.codigo).toBe(1);
    expect(resultado.resultadoUnitarios).toMatchObject({ codigo: 124, timeout: true });
    expect(await readFile(caminhoLog, "utf8")).toContain("Timeout Testes unitários: sim");
  }, 15_000);

  test.each([
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ])("%s limpa a etapa e não promove log interrompido", async (sinal, codigo) => {
    const raiz = await criarProjetoTemporario();
    const caminhoLog = join(raiz, `${sinal}.log`);
    const emissorSinais = new EventEmitter();
    const saida = criarSaidaCapturada();
    const execucao = executarTestAll({
      raizProjeto: raiz,
      executor: "Vitest",
      caminhoLog,
      timeoutTotalMs: 10_000,
      comandoUnitarios: comandoFixture("travar"),
      comandoE2e: comandoFixture("sair", "0"),
      encerrarProcesso: encerrarProcessoFixture,
      emissorSinais,
      stdout: saida.stream,
      stderr: saida.stream,
    });

    await aguardar(async () => {
      const temporario = join(raiz, `.${sinal}.log.tmp-${process.pid}.log`);
      if (!(await arquivoExiste(temporario))) return false;
      return (await readFile(temporario, "utf8")).includes("PID da etapa:");
    });
    emissorSinais.emit(sinal);
    const resultado = await execucao;

    expect(resultado).toMatchObject({ codigo, promovido: false });
    expect(await arquivoExiste(caminhoLog)).toBe(false);
    const conteudoTemporario = await readFile(resultado.caminhoLogTemporario, "utf8");
    expect(conteudoTemporario).toContain(`Execução interrompida por ${sinal}`);
    expect(conteudoTemporario).not.toContain(MARCADOR_FIM_LOG);
  }, 20_000);

  test("erro de spawn passa pelo resumo e nunca produz falso verde", async () => {
    const raiz = await criarProjetoTemporario();
    const caminhoLog = join(raiz, "excecao.log");
    const saida = criarSaidaCapturada();

    const resultado = await executarTestAll({
      raizProjeto: raiz,
      executor: "Vitest",
      caminhoLog,
      timeoutTotalMs: 5_000,
      comandoUnitarios: {
        exibido: "comando inexistente",
        comando: join(raiz, "comando-inexistente"),
        argumentos: [],
      },
      comandoE2e: comandoFixture("sair", "0"),
      stdout: saida.stream,
      stderr: saida.stream,
    });

    expect(resultado.codigo).toBe(1);
    const log = await readFile(caminhoLog, "utf8");
    expect(log).toContain("Erro Testes unitários:");
    expect(log).toContain("Resultado geral: FALHOU");
  });

  test("exceção interna passa pelo finally e produz evidência vermelha", async () => {
    const raiz = await criarProjetoTemporario();
    const caminhoLog = join(raiz, "excecao-interna.log");
    const saida = criarSaidaCapturada();
    const comandoComExcecao = {
      exibido: "fixture com exceção",
      get comando(): string {
        throw new Error("exceção interna controlada");
      },
      argumentos: [],
    };

    const resultado = await executarTestAll({
      raizProjeto: raiz,
      executor: "Vitest",
      caminhoLog,
      timeoutTotalMs: 5_000,
      comandoUnitarios: comandoComExcecao,
      comandoE2e: comandoFixture("sair", "0"),
      stdout: saida.stream,
      stderr: saida.stream,
    });

    expect(resultado).toMatchObject({ codigo: 1, promovido: true });
    const log = await readFile(caminhoLog, "utf8");
    expect(log).toContain("Exceção no executor canônico: exceção interna controlada");
    expect(log).toContain("Resultado geral: FALHOU");
  });
});

describe("executor E2E controlado real", () => {
  test("Playwright vermelho retorna falha e encerra o servidor próprio", async () => {
    const raiz = process.cwd();
    const porta = await obterPortaLivre();
    const saida = criarSaidaCapturada();

    const resultado = await executarE2eControlado({
      raizProjeto: raiz,
      porta,
      timeoutBootMs: 3_000,
      timeoutTotalMs: 5_000,
      comandoBuild: comandoFixture("sair", "0"),
      comandoServidor: comandoFixture("http", String(porta)),
      comandoPlaywright: comandoFixture("sair", "1"),
      encerrarProcesso: encerrarProcessoFixture,
      preflight: async () => {},
      stdout: saida.stream,
      stderr: saida.stream,
    });

    expect(resultado.codigo).toBe(1);
    expect(saida.ler()).toContain("Código Playwright: 1");
    expect(saida.ler()).toContain("Limpeza servidor:");
  }, 15_000);

  test("timeout do Playwright encerra Playwright e servidor", async () => {
    const raiz = process.cwd();
    const porta = await obterPortaLivre();
    const saida = criarSaidaCapturada();

    const resultado = await executarE2eControlado({
      raizProjeto: raiz,
      porta,
      timeoutBootMs: 2_000,
      timeoutTotalMs: 500,
      comandoBuild: comandoFixture("sair", "0"),
      comandoServidor: comandoFixture("http", String(porta)),
      comandoPlaywright: comandoFixture("travar"),
      encerrarProcesso: encerrarProcessoFixture,
      preflight: async () => {},
      stdout: saida.stream,
      stderr: saida.stream,
    });

    expect(resultado.codigo).toBe(1);
    expect(saida.ler()).toContain("Limpeza servidor:");
  }, 15_000);

  test("SIGTERM durante Playwright limpa os PIDs próprios", async () => {
    const raiz = process.cwd();
    const porta = await obterPortaLivre();
    const emissorSinais = new EventEmitter();
    const saida = criarSaidaCapturada();
    const execucao = executarE2eControlado({
      raizProjeto: raiz,
      porta,
      timeoutBootMs: 3_000,
      timeoutTotalMs: 10_000,
      comandoBuild: comandoFixture("sair", "0"),
      comandoServidor: comandoFixture("http", String(porta)),
      comandoPlaywright: comandoFixture("travar"),
      encerrarProcesso: encerrarProcessoFixture,
      preflight: async () => {},
      emissorSinais,
      stdout: saida.stream,
      stderr: saida.stream,
    });

    await aguardar(() => saida.ler().includes("PID Playwright:"));
    emissorSinais.emit("SIGTERM");
    const resultado = await execucao;

    expect(resultado, saida.ler()).toMatchObject({ codigo: 143, sinal: "SIGTERM" });
    expect(saida.ler()).toContain("Limpeza Playwright:");
    expect(saida.ler()).toContain("Limpeza servidor:");
  }, 20_000);

  test("exceção no preflight limpa o servidor e retorna falha", async () => {
    const raiz = process.cwd();
    const porta = await obterPortaLivre();
    const saida = criarSaidaCapturada();

    const resultado = await executarE2eControlado({
      raizProjeto: raiz,
      porta,
      timeoutBootMs: 3_000,
      timeoutTotalMs: 5_000,
      comandoBuild: comandoFixture("sair", "0"),
      comandoServidor: comandoFixture("http", String(porta)),
      comandoPlaywright: comandoFixture("sair", "0"),
      encerrarProcesso: encerrarProcessoFixture,
      preflight: async () => {
        throw new Error("exceção controlada no preflight");
      },
      stdout: saida.stream,
      stderr: saida.stream,
    });

    expect(resultado.codigo).toBe(1);
    expect(saida.ler()).toContain("exceção controlada no preflight");
    expect(saida.ler()).toContain("Limpeza servidor:");
  }, 10_000);

  test("porta ocupada falha sem encerrar o servidor testemunha", async () => {
    const raiz = process.cwd();
    const testemunha = createServer((_, resposta) => resposta.end("testemunha"));
    await new Promise<void>((resolvePromessa) => testemunha.listen(0, "127.0.0.1", resolvePromessa));
    const endereco = testemunha.address();
    if (!endereco || typeof endereco === "string") throw new Error("Endereço inesperado");
    const saida = criarSaidaCapturada();
    try {
      const resultado = await executarE2eControlado({
        raizProjeto: raiz,
        porta: endereco.port,
        timeoutBootMs: 1_000,
        timeoutTotalMs: 2_000,
        comandoBuild: comandoFixture("sair", "0"),
        comandoServidor: comandoFixture("http", String(endereco.port)),
        comandoPlaywright: comandoFixture("sair", "0"),
        encerrarProcesso: encerrarProcessoFixture,
        preflight: async () => {},
        stdout: saida.stream,
        stderr: saida.stream,
      });

      expect(resultado.codigo).toBe(1);
      expect(testemunha.listening).toBe(true);
      expect(saida.ler()).toContain("recusou reutilizar");
    } finally {
      await new Promise<void>((resolvePromessa, reject) =>
        testemunha.close((erro) => (erro ? reject(erro) : resolvePromessa())),
      );
    }
  });
});
