import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Alex_Brush, Bodoni_Moda, Montserrat } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Tipografías de bordado (solo para mostrar la muestra; no se precargan en todas las páginas)
const alex = Alex_Brush({ subsets: ["latin"], weight: "400", variable: "--font-alex", preload: false });
const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", preload: false });
const montaser = Montserrat({ subsets: ["latin"], variable: "--font-montaser", preload: false });

export const metadata: Metadata = {
  title: "Micaela Diseño · Gestión",
  description: "Sistema de gestión de Micaela Diseño",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4EAE6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${cormorant.variable} ${inter.variable} ${alex.variable} ${bodoni.variable} ${montaser.variable}`}>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
