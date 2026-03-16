import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NotificationManager from "@/components/NotificationManager";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "하나비 스케줄",
  description: "하나비 멤버들의 주간 스케줄",
  manifest: "/manifest.json",
  icons: {
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "하나비",
  },
};

export const viewport = {
  themeColor: "#ffb6c1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <NotificationManager />
        <Toaster position="bottom-center" richColors />
        {children}
      </body>
    </html>
  );
}
