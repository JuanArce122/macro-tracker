import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import SessionProvider from "./components/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full`}>
      <body className="h-full bg-gray-100 antialiased">
        <SessionProvider>
          <ServiceWorkerRegistration />
          <div className="mx-auto max-w-[430px] min-h-full flex flex-col bg-gray-50 dark:bg-gray-900">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
