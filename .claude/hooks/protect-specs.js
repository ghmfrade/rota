#!/usr/bin/env node
// Hook PreToolUse: bloqueia Edit/Write/MultiEdit/NotebookEdit em docs/specs/**
// Origem da regra: docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md — specs sao read-only
// para quem implementa; sugestoes vao para docs-dev/16-OPEN_QUESTIONS.md.
//
// Escrito em Node.js (nao PowerShell/bash) para rodar identico no Windows local
// e no Linux do Codespaces — Node e o runtime do proprio projeto.
//
// Contrato do hook: le o JSON do stdin; exit 2 = bloqueia a chamada e devolve a
// mensagem de stderr ao agente; exit 0 = permite. Qualquer erro interno => exit 0
// (falha aberta: nunca travar por falso positivo de parsing).

const fs = require("fs");

let raw = "";
try {
  raw = fs.readFileSync(0, "utf8");
} catch {
  process.exit(0);
}
if (!raw.trim()) process.exit(0);

let data;
try {
  data = JSON.parse(raw);
} catch {
  process.exit(0);
}

const input = data.tool_input || {};
const path = input.file_path || input.notebook_path;
if (!path) process.exit(0);

// Normaliza separadores e compara sem case
const norm = path.replace(/\\/g, "/").toLowerCase();
if (/(^|\/)docs\/specs\//.test(norm)) {
  process.stderr.write(
    "BLOQUEADO: docs/specs/** e read-only para quem implementa " +
      "(docs-dev/04-AI_IMPLEMENTATION_PROTOCOL.md). Sugestoes de mudanca de spec " +
      "devem ser registradas como Q-xxx em docs-dev/16-OPEN_QUESTIONS.md - nao edite a spec."
  );
  process.exit(2);
}

process.exit(0);
