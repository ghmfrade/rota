import type { NextConfig } from "next";

// `output: "export"` gera site estático puro: rotas de API tornam-se
// impossíveis por construção — enforcement estrutural de RN-096
// (nada é salvo no servidor; exportar o JSON é o salvar — Spec 01 §5/§8).
const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
