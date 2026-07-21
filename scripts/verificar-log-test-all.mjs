import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  calcularFingerprint,
  FORMATO_LOG_TEST_ALL,
  lerOpcao,
} from "./infraestrutura-test-all.mjs";

export const MARCADOR_FIM_LOG = "FIM DO LOG CANÔNICO";

function capturar(texto, rotulo) {
  const expressao = new RegExp(`^${rotulo}:\\s*(.+)$`, "m");
  return texto.match(expressao)?.[1]?.trim();
}

export function analisarConteudoLog(conteudo, fingerprintAtual) {
  const motivos = [];
  const formato = capturar(conteudo, "Versão do formato");
  const executor = capturar(conteudo, "Executor");
  const fingerprintRegistrado = capturar(conteudo, "Fingerprint SHA-256");
  const codigoUnitarios = capturar(conteudo, "Código Testes unitários");
  const codigoE2e = capturar(conteudo, "Código Testes E2E");
  const resultadoGeral = capturar(conteudo, "Resultado geral");
  const linhas = conteudo.trimEnd().split(/\r?\n/);

  if (linhas.at(-1) !== MARCADOR_FIM_LOG) {
    motivos.push("log truncado ou sem marcador final");
  }
  if (formato !== FORMATO_LOG_TEST_ALL) {
    motivos.push(`formato do log incompatível (${formato || "ausente"})`);
  }
  if (!executor) {
    motivos.push("executor não informado");
  }
  if (codigoUnitarios !== "0") {
    motivos.push(`testes unitários não aprovados (código ${codigoUnitarios || "ausente"})`);
  }
  if (codigoE2e !== "0") {
    motivos.push(`testes E2E não aprovados (código ${codigoE2e || "ausente"})`);
  }
  if (resultadoGeral !== "APROVADO") {
    motivos.push(`resultado geral não aprovado (${resultadoGeral || "ausente"})`);
  }
  if (!fingerprintRegistrado) {
    motivos.push("fingerprint ausente");
  } else if (fingerprintRegistrado !== fingerprintAtual) {
    motivos.push("fingerprint diverge do conteúdo atual");
  }

  return {
    valido: motivos.length === 0,
    motivos,
    executor: executor || null,
    fingerprint: fingerprintRegistrado || null,
  };
}

export async function verificarLog({ raizProjeto, caminhoLog }) {
  let conteudo;
  try {
    conteudo = await readFile(caminhoLog, "utf8");
  } catch (erro) {
    if (erro?.code === "ENOENT") {
      return {
        valido: false,
        motivos: [`log ausente em ${caminhoLog}`],
        executor: null,
        fingerprint: null,
      };
    }
    throw erro;
  }

  const fingerprintAtual = await calcularFingerprint(raizProjeto);
  return analisarConteudoLog(conteudo, fingerprintAtual.sha256);
}

async function principal() {
  const raizProjeto = fileURLToPath(new URL("../", import.meta.url));
  const caminhoLog = resolve(
    raizProjeto,
    lerOpcao(process.argv.slice(2), "log", "ultimo-test-all.log"),
  );
  const resultado = await verificarLog({ raizProjeto, caminhoLog });

  if (resultado.valido) {
    process.stdout.write(
      `Log canônico válido. Executor: ${resultado.executor}. Fingerprint: ${resultado.fingerprint}.\n`,
    );
    return;
  }

  process.stderr.write(`Log canônico inválido: ${resultado.motivos.join("; ")}.\n`);
  process.exitCode = 1;
}

const executadoDiretamente =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (executadoDiretamente) {
  await principal();
}
