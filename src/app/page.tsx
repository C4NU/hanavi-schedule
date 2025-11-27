"use client";

import { useRef } from "react";
import ScheduleGrid from "@/components/ScheduleGrid";
import { useSchedule } from "@/hooks/useSchedule";
import html2canvas from "html2canvas";

export default function Home() {
  const { schedule } = useSchedule();
  const scheduleRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!scheduleRef.current) return;

    try {
      // Add exporting class to hide buttons
      scheduleRef.current.classList.add('exporting');

      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(scheduleRef.current, {
        backgroundColor: '#fff0f5',
        scale: 2,
        scrollX: 0,
        scrollY: 0,
      });

      // Remove exporting class
      scheduleRef.current.classList.remove('exporting');

      const link = document.createElement('a');
      link.download = `hanabi-schedule-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('PNG 저장에 실패했습니다.');
      // Make sure to remove class even if error occurs
      if (scheduleRef.current) {
        scheduleRef.current.classList.remove('exporting');
      }
    }
  };

  return (
    <main>
      <ScheduleGrid ref={scheduleRef} data={schedule} onExport={handleExport} />
    </main>
  );
}
