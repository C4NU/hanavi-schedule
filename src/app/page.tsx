"use client";

import { useRef } from "react";
import ScheduleGrid from '@/components/ScheduleGrid';
import PushTester from '@/components/PushTester';
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

      const link = document.createElement('a');
      link.download = `hanabi-schedule-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('PNG 저장에 실패했습니다.');
    }
  };

  return (
    <main className="main-layout">
      <ScheduleGrid ref={scheduleRef} data={schedule} onExport={handleExport} />
      <PushTester />
    </main>
  );
}
