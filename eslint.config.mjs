import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Fronteiras de módulos (RN-097, docs-dev/13): formulario/ e comparador/ não
// se importam mutuamente — o único contrato entre as ferramentas é o arquivo
// JSON de operação (Spec 01 §2). Ambos podem depender de shared/; shared/ não
// depende de nenhum dos dois.
const fronteirasDeModulos = [
  {
    files: ["src/formulario/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/comparador/**", "@/comparador/**"],
              message:
                "formulario/ não importa de comparador/ — ferramentas desacopladas; contrato único é o JSON de operação (RN-097).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/comparador/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/formulario/**", "@/formulario/**"],
              message:
                "comparador/ não importa de formulario/ — ferramentas desacopladas; contrato único é o JSON de operação (RN-097).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/formulario/**",
                "@/formulario/**",
                "**/comparador/**",
                "@/comparador/**",
              ],
              message:
                "shared/ é a base comum (contrato, validadores, primitivas) e não depende das ferramentas (RN-097).",
            },
          ],
        },
      ],
    },
  },
];

const eslintConfig = defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  ...fronteirasDeModulos,
  globalIgnores([
    ".claude/**",
    ".codex/**",
    "node_modules/**",
    ".next/**",
    ".next-e2e-controlado/**",
    "out/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
