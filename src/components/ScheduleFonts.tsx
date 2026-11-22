"use client";

import Script from "next/script";

export default function ScheduleFonts() {
  return (
    <Script
      src="https://use.typekit.net/omr5ywq.js?v=2"
      strategy="afterInteractive"
      onLoad={() => {
        const { Typekit } = window as Window & {
          Typekit?: { load: (config: { kitId: string; scriptTimeout: number; async: boolean }) => void };
        };
        Typekit?.load({ kitId: 'omr5ywq', scriptTimeout: 3000, async: true });
      }}
    />
  );
}
