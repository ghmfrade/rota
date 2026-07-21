import { createServer } from "node:http";

const [modo = "sair", valor = "0"] = process.argv.slice(2);

if (modo === "sair") {
  process.exitCode = Number(valor);
} else if (modo === "travar") {
  process.stdout.write("PROCESSO_CONTROLADO_PRONTO\n");
  setInterval(() => {}, 1_000);
} else if (modo === "http") {
  const porta = Number(valor);
  const servidor = createServer((_, resposta) => {
    resposta.statusCode = 200;
    resposta.end("pronto");
  });
  servidor.listen(porta, "127.0.0.1", () => {
    process.stdout.write(`SERVIDOR_CONTROLADO_PRONTO:${porta}\n`);
  });
} else if (modo === "excecao") {
  throw new Error("exceção controlada da fixture");
} else {
  throw new Error(`Modo de fixture desconhecido: ${modo}`);
}
