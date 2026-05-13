import { Onest } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import NavBar from "./NavBar";
import TopBar from "./TopBar";
import PWAInstaller from "./PWAInstaller";

const onest = Onest({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "Rentto · Alquilar en Venezuela",
  description: "Pago digital, contrato online, garantía ante impago.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${onest.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#065f46" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <TopBar />
        <main className="flex-1 pb-24">
          {children}
        </main>
        <NavBar />
        <PWAInstaller />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
