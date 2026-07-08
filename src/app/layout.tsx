import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROTA — Registro de Operação e Tabelas de Autos",
  description:
    "Ferramentas de apoio à elaboração e verificação de tabelas operacionais de linhas intermunicipais (ARTESP/SUCOL).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
