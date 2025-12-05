"use client";

import { useRef } from "react";
import ScheduleGrid from '@/components/ScheduleGrid';
import { useSchedule } from "@/hooks/useSchedule";
import html2canvas from "html2canvas";

export default function Home() {
  const { schedule } = useSchedule();
  const scheduleRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!scheduleRef.current) return;

    try {
      // Clone the element
      const clone = scheduleRef.current.cloneNode(true) as HTMLElement;

      // Apply export styles to the clone
      clone.classList.add('exporting');

      // Position clone off-screen but visible
      clone.style.position = 'fixed';
      clone.style.top = '-10000px';
      clone.style.left = '-10000px';
      clone.style.zIndex = '-1000';

      // Append to body
      document.body.appendChild(clone);

      // Wait for DOM/Styles to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clone, {
        backgroundColor: '#fff0f5',
        scale: 2,
        scrollX: 0,
        scrollY: 0,
        useCORS: true, // Enable CORS for external images
        allowTaint: true, // Allow tainted images
      });

      // Remove clone
      document.body.removeChild(clone);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('이미지 생성에 실패했습니다.');
          return;
        }

        const fileName = `hanabi-schedule-${new Date().toISOString().slice(0, 10)}.png`;

        // Check for Web Share API support (targeting mobile/tablet)
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], fileName, { type: 'image/png' });
          const shareData = {
            files: [file],
            title: '하나비 주간 스케줄',
          };

          if (navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
              return;
            } catch (err) {
              // Ignore AbortError (user cancelled share)
              if ((err as Error).name === 'AbortError') return;
              console.error('Share failed:', err);
              // Fall through to download if share fails (optional, but good for robustness)
            }
          }
        }

        // Fallback: Legacy download (Desktop)
        const link = document.createElement('a');
        link.download = fileName;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);

      }, 'image/png');
    } catch (error) {
      console.error('Export failed:', error);
      alert('PNG 저장에 실패했습니다.');
    }
  };

  return (
    <main className="main-layout">
      <ScheduleGrid ref={scheduleRef} data={schedule} onExport={handleExport} />
    </main>
  );
}
