import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Equidade de Gênero em TI",
  description: "Dashboard do protocolo Natal/2026 para M1, M2, M3, M4 e M5.",
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
