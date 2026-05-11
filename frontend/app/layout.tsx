import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JC Games Store",
  description: "Hardware de Elite",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
