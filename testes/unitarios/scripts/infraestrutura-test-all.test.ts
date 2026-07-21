import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import {
  aguardarHealthCheck,
  calcularFingerprint,
  encerrarArvoreProcesso,
  executarProcesso,
  lerInteiroPositivo,
  obterIdentidadeWorkingTree,
  verificarPortaLivre,
} from "../../../scripts/infraestrutura-test-all.mjs";
import {
  analisarConteudoLog,
  MARCADOR_FIM_LOG,
  verificarLog,
} from "../../../scripts/verificar-log-test-all.mjs";

const temporarios: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporarios.splice(0).map((caminho) => rm(caminho, { recursive: true, force: true })),
  );
});

async function criarProjetoTemporario() {
  const raiz = await mkdtemp(join(tmpdir(), "rota-test-all-"));
  temporarios.push(raiz);
  await mkdir(join(raiz, "src"), { recursive: true });
  await mkdir(join(raiz, "testes"), { recursive: true });
  await writeFile(join(raiz, "src", "exemplo.ts"), "export const valor = 1;\n");
  await writeFile(join(raiz, "package.json"), '{"name":"fixture"}\n');
  return raiz;
}

function montarLogAprovado(fingerprint: string, identidadeWorkingTree: string) {
  return [
    "ROTA — evidência canônica da suíte completa",
    "Versão do formato: 2",
    "Executor: Codex",
    `Identidade working tree SHA-256: ${identidadeWorkingTree}`,
    `Fingerprint SHA-256: ${fingerprint}`,
    "Código Testes unitários: 0",
    "Código Testes E2E: 0",
    "Resultado geral: APROVADO",
    "Fim: 2026-07-21T12:00:00.000Z",
    MARCADOR_FIM_LOG,
    "",
  ].join("\n");
}

describe("fingerprint canônico", () => {
  test("é determinístico e independe de logs efêmeros", async () => {
    const raiz = await criarProjetoTemporario();
    const primeiro = await calcularFingerprint(raiz);
    await writeFile(join(raiz, "ultimo-test-all.log"), "resultado antigo");
    const segundo = await calcularFingerprint(raiz);

    expect(segundo.sha256).toBe(primeiro.sha256);
    expect(segundo.arquivos).toEqual(["package.json", "src/exemplo.ts"]);
  });

  test("muda quando o conteúdo testado muda", async () => {
    const raiz = await criarProjetoTemporario();
    const anterior = await calcularFingerprint(raiz);
    await writeFile(join(raiz, "src", "exemplo.ts"), "export const valor = 2;\n");
    const atual = await calcularFingerprint(raiz);

    expect(atual.sha256).not.toBe(anterior.sha256);
  });
});

describe("verificador do log", () => {
  test("aceita resultado completo, verde e do conteúdo atual", async () => {
    const raiz = await criarProjetoTemporario();
    const fingerprint = await calcularFingerprint(raiz);
    const identidadeWorkingTree = await obterIdentidadeWorkingTree(raiz);
    const caminhoLog = join(raiz, "ultimo-test-all.log");
    await writeFile(
      caminhoLog,
      montarLogAprovado(fingerprint.sha256, identidadeWorkingTree.sha256),
    );

    await expect(verificarLog({ raizProjeto: raiz, caminhoLog })).resolves.toMatchObject({
      valido: true,
      executor: "Codex",
    });
  });

  test.each([
    ["truncado", (log: string) => log.replace(`${MARCADOR_FIM_LOG}\n`, "")],
    ["vermelho", (log: string) => log.replace("Código Testes E2E: 0", "Código Testes E2E: 1")],
    ["sem executor", (log: string) => log.replace("Executor: Codex\n", "")],
    ["com formato antigo", (log: string) => log.replace("Versão do formato: 2", "Versão do formato: 1")],
    ["conteúdo diferente", (log: string) => log.replace(/Fingerprint SHA-256: .+/, "Fingerprint SHA-256: outro")],
    ["sem working tree", (log: string) => log.replace(/Identidade working tree SHA-256: .+\n/, "")],
  ])("rejeita log %s", async (_, alterar) => {
    const resultado = analisarConteudoLog(
      alterar(montarLogAprovado("atual", "working-tree-atual")),
      "atual",
      "working-tree-atual",
    );
    expect(resultado.valido).toBe(false);
    expect(resultado.motivos.length).toBeGreaterThan(0);
  });

  test("rejeita log copiado de outro working tree com conteúdo idêntico", async () => {
    const origem = await criarProjetoTemporario();
    const destino = await criarProjetoTemporario();
    const fingerprintOrigem = await calcularFingerprint(origem);
    const fingerprintDestino = await calcularFingerprint(destino);
    const identidadeOrigem = await obterIdentidadeWorkingTree(origem);
    const caminhoLogDestino = join(destino, "ultimo-test-all.log");

    expect(fingerprintDestino.sha256).toBe(fingerprintOrigem.sha256);
    await writeFile(
      caminhoLogDestino,
      montarLogAprovado(fingerprintOrigem.sha256, identidadeOrigem.sha256),
    );

    const resultado = await verificarLog({ raizProjeto: destino, caminhoLog: caminhoLogDestino });
    expect(resultado.valido).toBe(false);
    expect(resultado.motivos).toContain("log pertence a outro working tree");
  });

  test("rejeita log ausente com motivo operacional", async () => {
    const raiz = await criarProjetoTemporario();
    const resultado = await verificarLog({
      raizProjeto: raiz,
      caminhoLog: join(raiz, "inexistente.log"),
    });

    expect(resultado).toMatchObject({ valido: false, executor: null });
    expect(resultado.motivos[0]).toContain("log ausente");
  });
});

describe("porta, health check e lifecycle", () => {
  test("recusa porta ocupada sem encerrar o servidor testemunha", async () => {
    const servidor = createServer((_, resposta) => resposta.end("ok"));
    await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
    try {
      const endereco = servidor.address();
      if (!endereco || typeof endereco === "string") throw new Error("Endereço inesperado");
      await expect(verificarPortaLivre(endereco.port)).resolves.toBe(false);
      expect(servidor.listening).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) =>
        servidor.close((erro) => (erro ? reject(erro) : resolve())),
      );
    }
  });

  test("health check aprova servidor pronto e expira quando não há servidor", async () => {
    const servidor = createServer((_, resposta) => {
      resposta.statusCode = 200;
      resposta.end("pronto");
    });
    await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
    const endereco = servidor.address();
    if (!endereco || typeof endereco === "string") throw new Error("Endereço inesperado");
    const url = `http://127.0.0.1:${endereco.port}`;
    await expect(aguardarHealthCheck(url, 1_000, 10)).resolves.toBeGreaterThanOrEqual(0);
    await new Promise<void>((resolve, reject) =>
      servidor.close((erro) => (erro ? reject(erro) : resolve())),
    );

    await expect(aguardarHealthCheck(url, 100, 10)).rejects.toThrow("Timeout");
  });

  test("health check cancelado não mantém o executor preso até o timeout", async () => {
    const controlador = new AbortController();
    controlador.abort();

    await expect(
      aguardarHealthCheck("http://127.0.0.1:1", 60_000, 10, controlador.signal),
    ).rejects.toThrow("cancelado");
  });

  test(
    "cleanup encerra somente a árvore do PID próprio",
    async () => {
      const criarTestemunha = () =>
        spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
          detached: process.platform !== "win32",
          stdio: "ignore",
          windowsHide: true,
        });
      const alvo = criarTestemunha();
      const testemunha = criarTestemunha();
      try {
        await Promise.all([
          new Promise<void>((resolve, reject) => {
            alvo.once("spawn", resolve);
            alvo.once("error", reject);
          }),
          new Promise<void>((resolve, reject) => {
            testemunha.once("spawn", resolve);
            testemunha.once("error", reject);
          }),
        ]);
        const fechamentoAlvo = new Promise<void>((resolve) => alvo.once("close", () => resolve()));
        const resultado = await encerrarArvoreProcesso(alvo.pid!);
        await Promise.race([
          fechamentoAlvo,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`alvo não encerrou: ${resultado.detalhe}`)), 2_000),
          ),
        ]);

        expect(resultado.encerrado).toBe(true);
        expect(() => process.kill(testemunha.pid!, 0)).not.toThrow();
      } finally {
        alvo.kill("SIGKILL");
        testemunha.kill("SIGKILL");
      }
    },
    20_000,
  );

  test("parâmetros de timeout rejeitam zero e texto", () => {
    expect(() => lerInteiroPositivo(["--timeout=0"], "timeout", 10)).toThrow(
      "inteiro positivo",
    );
    expect(() => lerInteiroPositivo(["--timeout=abc"], "timeout", 10)).toThrow(
      "inteiro positivo",
    );
  });

  test(
    "timeout encerra o processo próprio e retorna falha controlada",
    async () => {
      const resultado = await executarProcesso({
        comando: process.execPath,
        argumentos: ["-e", "setInterval(() => {}, 1000)"],
        cwd: process.cwd(),
        timeoutMs: 200,
      });

      expect(resultado.timeout).toBe(true);
      expect(resultado.codigo).not.toBe(0);
    },
    10_000,
  );
});
