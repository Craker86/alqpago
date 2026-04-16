import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Rentto - Paga tu alquiler fácil",
description: "La app para pagar tu alquiler en Venezuela",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
  <head>
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#065f46" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  </head>
      <body className="min-h-full flex flex-col font-sans">

        {/* CONTENIDO DE LA PAGINA - cada page.js se renderiza aqui */}
        <main className="flex-1 pb-20">
          {children}
        </main>

        {/* BARRA DE NAVEGACION INFERIOR - aparece en TODAS las pantallas */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto">
          <div className="flex justify-around py-2 pb-5">

            <Link href="/" className="flex flex-col items-center gap-1 text-emerald-700">
              <span className="text-lg">🏠</span>
              <span className="text-[10px] font-medium">Inicio</span>
            </Link>

            <Link href="/pagar" className="flex flex-col items-center gap-1 text-gray-400">
              <span className="text-lg">💰</span>
              <span className="text-[10px] font-medium">Pagar</span>
            </Link>

            <Link href="/contrato" className="flex flex-col items-center gap-1 text-gray-400">
              <span className="text-lg">📄</span>
              <span className="text-[10px] font-medium">Contrato</span>
            </Link>

            <Link href="/perfil" className="flex flex-col items-center gap-1 text-gray-400">
              <span className="text-lg">👤</span>
              <span className="text-[10px] font-medium">Perfil</span>
            </Link>

          </div>
        </nav>

      </body>
    </html>
  );
}