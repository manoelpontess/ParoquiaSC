import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bingão Paróquia Santa Cruz — Venda de Mesas",
  description: "Sistema de venda de mesas e gestão de reservas do Bingão da Paróquia Santa Cruz, Manaus.",
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
