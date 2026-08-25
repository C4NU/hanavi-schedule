import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import NotificationManager from "@/components/NotificationManager";
import ToastProvider from "@/components/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

// v2 테마 타이포그래피 — Montserrat(시간/날짜/그리드 영역), Pretendard(타이틀/일정 내용)
// Montserrat: Google Fonts (OFL) — 300 Light / 600 Semibold / 800 Extrabold
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "600", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

// Pretendard: Google Fonts 미수록 — 공식 저장소(orioncactus/pretendard) 가변 폰트 셀프호스팅 (OFL)
// 라이센스: src/app/fonts/OFL-Pretendard.txt, OFL-Montserrat.txt
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  weight: "45 920",
  variable: "--font-pretendard",
  display: "swap",
});

// ZEN SERIF: ODDATELIER(OA Entertainment) 배포 서체 — 멤버 이름 배지/배지/푸터 캡션
// 출처·라이센스: src/app/fonts/ZEN-SERIF-LICENSE.txt
const zenSerif = localFont({
  src: "./fonts/ZEN-SERIF-Regular.ttf",
  weight: "400",
  variable: "--font-zen-serif",
  display: "swap",
});

// Cafe24 Ssurround: Cafe24 배포 라운드 고딕 — v2 멤버별 일정 내용 텍스트
// 출처·라이센스: src/app/fonts/CAFE24-SSURROUND-LICENSE.txt
const cafe24Ssurround = localFont({
  src: "./fonts/Cafe24Ssurround.woff",
  weight: "400",
  variable: "--font-cafe24",
  display: "swap",
});

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
      <body className={`${inter.className} ${montserrat.variable} ${pretendard.variable} ${zenSerif.variable} ${cafe24Ssurround.variable}`} suppressHydrationWarning>
        <NotificationManager />
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
