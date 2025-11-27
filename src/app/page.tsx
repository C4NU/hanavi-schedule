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
      const canvas = await html2canvas(scheduleRef.current, {
        backgroundColor: '#fff0f5',
        scale: 2,
        useCORS: true,
      });

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
    <main>
      <div ref={scheduleRef} className="export-container">
        <ScheduleGrid data={schedule} onExport={handleExport} />
      </div>
    </main>
  );
}
