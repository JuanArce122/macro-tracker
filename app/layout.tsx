import type { Metadata, Viewport } from "next";
import { Inter, Oswald, Bebas_Neue, Fraunces } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import SessionProvider from "./components/SessionProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// Fraunces se mantiene cargada solo durante la migración tipográfica
// (Fases 2-4). Se elimina al cerrar la Fase 4.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Macro Tracker",
  description: "Trackea tus macros diarios con IA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Macro Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F5F1EA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${oswald.variable} ${bebas.variable} ${fraunces.variable} h-full`}>
      <head>
        {/* Aplica .dark antes de hidratar para evitar flash.
            Default = light: solo aplica si el usuario eligió "dark" explícitamente
            o "system" + el SO está en oscuro. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-full bg-bg-tertiary antialiased">
        <SessionProvider>
          <ServiceWorkerRegistration />
          <div className="mx-auto max-w-[430px] min-h-full flex flex-col bg-bg-primary">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
