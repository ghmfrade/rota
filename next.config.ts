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
};

export default nextConfig;
