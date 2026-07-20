#!/usr/bin/env node
// Hook PreToolUse do Codex: bloqueia alterações em docs/specs/**.
// A fonte da regra é docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md.
//
// O Codex envia edições apply_patch em tool_input.command, enquanto ferramentas
// de edição compatíveis podem enviar file_path/notebook_path. O hook cobre os
// dois contratos e também rejeita comandos de shell explicitamente mutadores.
// exit 2 + stderr bloqueia a chamada. Erros internos falham de forma fechada
// quando a chamada pretendia alterar arquivos, para preservar as specs.

const fs = require("fs");

const MENSAGEM =
  "BLOQUEADO: docs/specs/** é read-only para quem implementa " +
  "(docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md). Sugestões de mudança devem " +
  "ser registradas como Q-xxx em docs-dev/16-OPEN_QUESTIONS.md; não edite a spec.";

function bloquear(mensagem = MENSAGEM) {
  process.stderr.write(mensagem);
  process.exit(2);
}

function normalizar(valor) {
  return String(valor ?? "")
    .replace(/\\/g, "/")
    .replace(/["']/g, "")
    .toLowerCase();
}

function contemCaminhoSpec(valor) {
  return /(^|[\s:/])docs\/specs(?:\/|\s|$)/i.test(normalizar(valor));
}

function caminhosDeclarados(input) {
  const encontrados = [];
  const chavesDeCaminho = /^(?:file_?path|notebook_?path|path|target|destination|source|old_?path|new_?path)$/i;

  function visitar(valor, chave = "") {
    if (typeof valor === "string") {
      if (chavesDeCaminho.test(chave)) encontrados.push(valor);
      return;
    }
    if (Array.isArray(valor)) {
      for (const item of valor) visitar(item, chave);
      return;
    }
    if (valor && typeof valor === "object") {
      for (const [subchave, subvalor] of Object.entries(valor)) {
        visitar(subvalor, subchave);
      }
    }
  }

  visitar(input);
  return encontrados;
}

function caminhosDoPatch(patch) {
  const caminhos = [];
  const cabecalho = /^\*\*\*\s+(?:Add|Update|Delete)\s+File:\s*(.+)$/gim;
  const movimento = /^\*\*\*\s+Move\s+to:\s*(.+)$/gim;
  let correspondencia;

  while ((correspondencia = cabecalho.exec(patch)) !== null) {
    caminhos.push(correspondencia[1].trim());
  }
  while ((correspondencia = movimento.exec(patch)) !== null) {
    caminhos.push(correspondencia[1].trim());
  }
  return caminhos;
}

function shellPodeAlterarSpecs(comando) {
  if (!contemCaminhoSpec(comando)) return false;

  const mutacoes = [
    /(?:^|[\s;&|])(?:rm|del|erase|rmdir|mv|move|cp|copy|ren|rename|touch|truncate)\b/i,
    /\b(?:Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|Rename-Item|New-Item|Clear-Content)\b/i,
    /\bgit\s+(?:apply|checkout|restore|clean|mv|rm)\b/i,
    /\b(?:sed|perl)\b[^\r\n]*(?:\s-i\b|--in-place\b)/i,
    /\b(?:node|nodejs|python|python3|ruby|php)\b/i,
    /\bapply_patch\b/i,
    /(^|[^<])>{1,2}(?![=>])/,
  ];

  return mutacoes.some((padrao) => padrao.test(comando));
}

let bruto = "";
try {
  bruto = fs.readFileSync(0, "utf8");
} catch {
  bloquear("BLOQUEADO: o hook de proteção não conseguiu ler a chamada pendente.");
}

if (!bruto.trim()) process.exit(0);

let evento;
try {
  evento = JSON.parse(bruto);
} catch {
  bloquear("BLOQUEADO: o hook de proteção recebeu uma chamada inválida.");
}

const nomeFerramenta = String(evento.tool_name ?? "");
const input = evento.tool_input ?? {};

if (caminhosDeclarados(input).some(contemCaminhoSpec)) bloquear();

const comando = typeof input.command === "string" ? input.command : "";
if (/^(?:apply_patch|Edit|Write|MultiEdit|NotebookEdit)$/i.test(nomeFerramenta)) {
  if (caminhosDoPatch(comando).some(contemCaminhoSpec)) bloquear();
}

if (/^Bash$/i.test(nomeFerramenta) && shellPodeAlterarSpecs(comando)) bloquear();

process.exit(0);

