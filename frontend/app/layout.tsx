import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Stick Arcade",
  description: "Comece com precisão e siga com emoção",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Stick Arcade",
    description: "Comece com precisão e siga com emoção",
    images: ["https://res.cloudinary.com/drpfwdjfg/image/upload/v1780351996/pxvaj8bgeptut0qcpihs.png"],
    url: "https://stickarcade.com.br",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
