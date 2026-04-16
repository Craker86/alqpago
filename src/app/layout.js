import { Geist } from "next/font/google";
import "./globals.css";
import NavBar from "./NavBar";

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
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <main className="flex-1 pb-20">
          {children}
        </main>
        <NavBar />
      </body>
    </html>
  );
}