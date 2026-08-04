import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Vector Studio AI — Vectorización profesional",
  description:
    "Vector Studio AI convierte imágenes raster (PNG, JPG, WEBP, BMP, TIFF) en vectores SVG editables de alta calidad: logotipos, ilustraciones, stickers, DTF, serigrafía, láser, CNC e impresión.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
