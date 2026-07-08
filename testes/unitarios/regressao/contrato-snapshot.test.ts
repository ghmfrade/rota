import { describe, expect, it } from "vitest";
import { z } from "zod";
import { esquemaDocumentoOperacaoBase } from "@/shared/contrato";
import { documentoExemploMinimo } from "../../fixtures";

// Regressão permanente (categoria 10 da docs-dev/08 §10) — snapshot da FORMA do
// contrato ancorado por `versao_schema`. Qualquer mudança estrutural do schema
// (campo novo/removido, tipo alterado, `strict` afrouxado) quebra este snapshot
// de propósito: campo novo no JSON exige alterar a Spec 02 ANTES do código e
// bumpar `versao_schema` (RN-008/RN-010). A quebra é o sinal — atualizar o
// snapshot é decisão consciente, não conserto automático.
//
// *Inferência controlada:* o mecanismo escolhido é `z.toJSONSchema` sobre o
// shape base (esquema.ts). Ele captura chaves, tipos e o fechamento `strict`;
// NÃO captura as validações cruzadas do §14 (integridade referencial, somas),
// que vivem em validacoes-estruturais.ts e já são cobertas pelas variantes
// inválidas da TASK-041. `versao_schema` é `z.string()` no contrato (não um
// literal), então o valor vigente ("1.0") vem da fixture canônica e ancora o
// snapshot.

describe("RN-008/RN-010 — snapshot do contrato por versao_schema", () => {
  it("a forma estrutural do contrato não muda sem revisão consciente", () => {
    const versao_schema = documentoExemploMinimo().versao_schema;
    const contrato = z.toJSONSchema(esquemaDocumentoOperacaoBase, {
      unrepresentable: "any",
    });
    expect({ versao_schema, contrato }).toMatchSnapshot();
  });

  it("a versao_schema alvo do contrato é a esperada", () => {
    expect(documentoExemploMinimo().versao_schema).toBe("1.0");
  });
});
