import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// RN-096 — o Formulário não persiste no servidor: nenhuma rota de API pode
// existir no app (Spec 01 §5/§8; NEG-009). O export estático do Next
// (`output: "export"` em next.config.ts) já quebra o build se surgir uma
// rota de API; esta varredura é a guarda de regressão independente do build.
function varrerHandlersDeApi(raiz: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(raiz, { withFileTypes: true })) {
    const caminho = join(raiz, entrada.name);
    if (entrada.isDirectory()) {
      encontrados.push(...varrerHandlersDeApi(caminho));
    } else if (/^route\.(ts|tsx|js|mjs)$/.test(entrada.name)) {
      encontrados.push(caminho);
    }
  }
  return encontrados;
}

const APP_DIR = join(__dirname, "..", "..", "src", "app");

describe("rn096_sem_rota_de_api_de_escrita", () => {
  it("src/app/ não contém nenhum handler de rota de API", () => {
    expect(varrerHandlersDeApi(APP_DIR)).toEqual([]);
  });

  describe("caso inválido: a varredura detecta handler de API introduzido", () => {
    let dirTemporario: string;

    afterEach(() => {
      rmSync(dirTemporario, { recursive: true, force: true });
    });

    it("recusa árvore com route.ts de escrita (POST)", () => {
      dirTemporario = mkdtempSync(join(tmpdir(), "rn096-"));
      const dirRota = join(dirTemporario, "app", "api", "operacao");
      mkdirSync(dirRota, { recursive: true });
      writeFileSync(
        join(dirRota, "route.ts"),
        "export async function POST() { return new Response(null, { status: 201 }); }\n",
      );

      const encontrados = varrerHandlersDeApi(dirTemporario);
      expect(encontrados).toHaveLength(1);
      expect(encontrados[0]).toContain(join("api", "operacao", "route.ts"));
    });
  });
});
