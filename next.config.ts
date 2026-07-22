import type { NextConfig } from "next";

const caminhoE2eControlado = process.env.ROTA_E2E_CONTROLADO === "1";

// `output: "export"` gera site estático puro: rotas de API tornam-se
// impossíveis por construção — enforcement estrutural de RN-096
// (nada é salvo no servidor; exportar o JSON é o salvar — Spec 01 §5/§8).
const nextConfig: NextConfig = {
  // O artefato de produção permanece exportável/estático. O executor E2E
  // usa um build isolado compatível com `next start`, sem alterar o produto.
  output: caminhoE2eControlado ? undefined : "export",
  // Um `next dev` humano pode permanecer ativo em `.next`. O executor canônico
  // usa outro diretório para que seu servidor próprio não reutilize nem dispute
  // o lock daquele processo, mesmo operando em uma porta dedicada.
  distDir: caminhoE2eControlado ? ".next-e2e-controlado" : ".next",
  // O Next 16 bloqueia requisições cross-origin aos recursos internos do
  // `next dev` (`/_next/webpack-hmr`, `/_next/*`) quando o host não está
  // listado. Os E2E navegam por 127.0.0.1 (playwright.config.ts), que o dev
  // server trata como origem distinta de `localhost` — sem esta liberação, a
  // página não hidrata e a suíte inteira falha. Efeito só em `next dev`:
  // ignorado no export estático e no `next start` do executor canônico.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
