"use client";

import { useRef, useState, useEffect } from "react";
import ScheduleGrid from '@/components/ScheduleGrid';
import { useSchedule } from "@/hooks/useSchedule";
import { domToPng } from "modern-screenshot";
import InfoModal from "@/components/InfoModal";
import { generateICS } from "@/utils/ics";
import { useHaptics } from "@/hooks/useHaptics";
import { defaultPatterns } from "web-haptics";
import { getMonday, formatWeekRange } from "@/utils/date";
import ScheduleSkeleton from '@/components/ScheduleSkeleton';
import { toast } from 'sonner';


export default function Home() {
  const { trigger } = useHaptics();
  
  const [currentDate, setCurrentDate] = useState<Date>(getMonday(new Date()));
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  // Lifted State for Sidebar/Filter
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Mobile specific state
  const [isMobileMenuDropdownOpen, setIsMobileMenuDropdownOpen] = useState(false);

  const weekRangeString = formatWeekRange(currentDate);
  const { schedule, isLoading } = useSchedule(weekRangeString);
  const scheduleRef = useRef<HTMLDivElement>(null);
  
  // Handle initial hydration carefully to match layout
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);


  // Sync initial characters when schedule loads
  useEffect(() => {
    if (schedule?.characters) {
      const allIds = schedule.characters.map(c => c.id);
      if (selectedCharacters.size === 0) {
        setSelectedCharacters(new Set(allIds));
      } else {
        // [AUTO-SYNC] Add any characters that are in the schedule but not in the current selection
        // This ensures newly added members are visible by default.
        const next = new Set(selectedCharacters);
        let changed = false;
        allIds.forEach(id => {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        });
        if (changed) setSelectedCharacters(next);
      }
    }
  }, [schedule]);

  const handlePrevWeek = () => {
    trigger();
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    trigger();
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };



  const handleDownloadCalendar = () => {
    trigger();
    if (!schedule) return;
    const icsContent = generateICS(schedule);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'hanavi_schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('캘린더 파일(ICS)이 생성되었습니다.');
  };

  const handleExport = async () => {
    trigger();
    if (!scheduleRef.current) return;

    try {
      const originalElement = scheduleRef.current;
      if (!originalElement) return;

      setIsExporting(true);
      
      // Create an off-screen container
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1400px'; // Increased width to prevent grid overflow
      container.style.backgroundColor = '#fff0f5';
      container.style.zIndex = '-1000';
      
      // Clone the element
      const clone = originalElement.cloneNode(true) as HTMLElement;
      clone.setAttribute('data-exporting', 'true');
      
      // Add to document
      container.appendChild(clone);
      document.body.appendChild(container);

      // Wait longer for all styles and images in the clone to settle
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const dataUrl = await domToPng(clone, {
        backgroundColor: '#fff0f5',
        scale: 2,
      });

      // Cleanup
      document.body.removeChild(container);
      setIsExporting(false);

      // Convert dataUrl to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      if (!blob) {
        toast.error('이미지 생성에 실패했습니다.');
        return;
      }

      const fileName = `hanabi-schedule-${new Date().toISOString().slice(0, 10)}.png`;

      // Check for Web Share API support (targeting mobile/tablet)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile && navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/png' });
        const shareData = {
          files: [file],
          title: '하나비 주간 스케줄',
        };

        if (navigator.canShare(shareData)) {
          try {
            trigger(defaultPatterns.success);
            await navigator.share(shareData);
            return;
          } catch (err) {
            // Ignore AbortError (user cancelled share)
            if ((err as Error).name === 'AbortError') return;
            console.error('Share failed:', err);
            // Fall through to download if share fails
          }
        }
      }

      // Fallback: Legacy download (Desktop)
      const link = document.createElement('a');
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('이미지가 성공적으로 저장되었습니다.');

    } catch (error) {
      console.error('Export failed:', error);
      toast.error('이미지 저장 중 오류가 발생했습니다.');
    }
  };

  if (!isClient || (isLoading && !schedule)) {
    return (
      <main className="main-layout relative">
        {isExporting && (
          <div className="fixed inset-0 z-[1000] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border-2 border-pink-100">
              <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
              <p className="font-bold text-gray-700">이미지 생성 중...</p>
              <p className="text-xs text-gray-400">잠시만 기다려주세요</p>
            </div>
          </div>
        )}
        <ScheduleSkeleton />
      </main>
    );
  }

  return (
    <main className="main-layout relative">
      {isExporting && (
        <div className="fixed inset-0 z-[1000] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border-2 border-pink-100">
            <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
            <p className="font-bold text-gray-700">이미지 생성 중...</p>
            <p className="text-xs text-gray-400">잠시만 기다려주세요</p>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Overlay */}
      {isMenuOpen && (
        <div className="hidden md:block fixed inset-0 bg-black/30 z-[90] backdrop-blur-sm animate-fade-in" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Desktop Sidebar Drawer */}
      {isMenuOpen && (
        <div className="hidden md:flex fixed top-0 right-0 h-full w-[320px] bg-white shadow-2xl z-[100] flex-col animate-slide-left border-l border-gray-100">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎇</span>
              <div>
                <div className="font-bold text-gray-800 text-lg">하나비 스케줄</div>
                <div className="text-xs text-gray-500 font-medium">주간 일정표</div>
              </div>
            </div>
            <button
              onClick={() => { trigger(); setIsMenuOpen(false); }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-400 hover:text-gray-700 font-bold bg-transparent"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            <div className="px-2 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Menu</div>

            <button
              onClick={handleDownloadCalendar}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
            >
              <span className="group-hover:scale-110 transition-transform">📅</span>
              <span>캘린더 추가 (ICS)</span>
            </button>

            <button
              onClick={handleExport}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
            >
              <span className="group-hover:scale-110 transition-transform">📥</span>
              <span>이미지로 저장</span>
            </button>

            <button
              onClick={() => { setIsInfoModalOpen(true); setIsMenuOpen(false); }}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
            >
              <span className="group-hover:scale-110 transition-transform">ℹ️</span>
              <span>사용 가이드</span>
            </button>

            <div className="h-px bg-gray-100 my-4 mx-2"></div>

            <div className="px-2 mb-4">
              <div className="text-xs font-bold text-gray-400 px-2 py-2 uppercase tracking-wider mb-2">Member Filter</div>
              <div className="flex justify-end mb-2 gap-2 px-1">
                <button
                  onClick={() => setSelectedCharacters(new Set(schedule.characters.map((c: any) => c.id)))}
                  className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 text-gray-600 font-bold"
                >
                  전체 선택
                </button>
                <button
                  onClick={() => setSelectedCharacters(new Set())}
                  className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 text-gray-600 font-bold"
                >
                  해제
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {schedule?.characters.map((char: any) => (
                  <button
                    key={char.id}
                    onClick={() => {
                      trigger();
                      const next = new Set(selectedCharacters);
                      if (next.has(char.id)) next.delete(char.id);
                      else next.add(char.id);
                      setSelectedCharacters(next);
                    }}
                    className={`p-3 rounded-xl text-sm font-bold text-center border transition-all hover:shadow-sm flex items-center justify-center gap-2 ${selectedCharacters.has(char.id) ? 'bg-pink-50 border-pink-200 text-pink-600 ring-2 ring-pink-100' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 opacity-60'}`}
                  >
                    {char.avatarUrl && (
                      <img src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`} className="w-4 h-4 rounded-full" />
                    )}
                    {char.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50 text-center text-xs text-gray-400">
            © Hanavi Schedule
          </div>
        </div>
      )}

      <ScheduleGrid
        ref={scheduleRef}
        data={schedule}
        onExport={handleExport}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}

        // Pass lifted state props
        selectedCharacters={selectedCharacters}
        onSelectionChange={setSelectedCharacters}
        isFilterPanelOpen={isFilterPanelOpen}
        onFilterPanelChange={setIsFilterPanelOpen}

        headerControls={
          <>
            {/* Mobile Menu Button - Re-implemented here to persist */}
            <button
              className="md:hidden fixed bottom-5 right-5 z-[101] w-[50px] h-[50px] flex items-center justify-center bg-white text-[#ffb6c1] rounded-full shadow-lg border-2 border-[#ffb6c1] font-bold text-xl transition-transform active:scale-95"
              onClick={() => { trigger(); setIsMobileMenuDropdownOpen(!isMobileMenuDropdownOpen); }}
            >
              ☰
            </button>

            {/* Mobile Dropdown Menu */}
            {isMobileMenuDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]" onClick={() => setIsMobileMenuDropdownOpen(false)} />
                <div className="fixed bottom-[80px] right-5 w-[200px] bg-white rounded-2xl p-2 z-[102] shadow-xl border border-pink-200 flex flex-col gap-[2px] animate-slide-up-fade">
                  <button className="w-full p-3 bg-white hover:bg-[#fff0f5] text-gray-600 hover:text-[#ffb6c1] rounded-xl font-bold text-sm text-left flex items-center gap-3 transition-colors" onClick={() => { setIsMobileMenuDropdownOpen(false); handleDownloadCalendar(); }}>
                    📅 캘린더 추가
                  </button>
                  <button className="w-full p-3 bg-white hover:bg-[#fff0f5] text-gray-600 hover:text-[#ffb6c1] rounded-xl font-bold text-sm text-left flex items-center gap-3 transition-colors" onClick={() => { setIsMobileMenuDropdownOpen(false); handleExport(); }}>
                    📥 이미지로 저장
                  </button>
                  <button className="w-full p-3 bg-white hover:bg-[#fff0f5] text-gray-600 hover:text-[#ffb6c1] rounded-xl font-bold text-sm text-left flex items-center gap-3 transition-colors" onClick={() => { setIsMobileMenuDropdownOpen(false); setIsInfoModalOpen(true); }}>
                    ℹ️ 사용 가이드
                  </button>
                  <button className="w-full p-3 bg-white hover:bg-[#fff0f5] text-gray-600 hover:text-[#ffb6c1] rounded-xl font-bold text-sm text-left flex items-center gap-3 transition-colors" onClick={() => { setIsMobileMenuDropdownOpen(false); setIsFilterPanelOpen(!isFilterPanelOpen); }}>
                    {isFilterPanelOpen ? '▼' : '▶'} 필터 설정
                  </button>
                </div>
              </>
            )}

            {/* Desktop Menu Trigger (Visible only on Desktop) */}
            <div className="hidden md:flex gap-2 items-center">
              <button
                className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 text-gray-600 font-bold flex items-center gap-2 transition-all"
                onClick={() => setIsMenuOpen(true)}
              >
                <span>☰</span>
                <span>메뉴</span>
              </button>
            </div>
          </>
        }

        dateSelector={
          <div className="relative">
            <button
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="text-lg md:text-xl font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 px-4 py-1 rounded-full transition-colors flex items-center gap-2 select-none"
            >
              {weekRangeString}
              <span className="text-xs text-gray-500">▼</span>
            </button>

            {/* Date Dropdown */}
            {isDateDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[150]" onClick={() => setIsDateDropdownOpen(false)} />
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[151] max-h-60 overflow-y-auto py-1">
                  {Array.from({ length: 9 }).map((_, i) => {
                    const offset = i - 4; // -4 to +4 weeks
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() + (offset * 7));
                    const rangeStr = formatWeekRange(d);
                    const isCurrent = offset === 0;

                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentDate(d);
                          setIsDateDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-pink-50 transition-colors flex justify-between items-center
                          ${isCurrent ? 'bg-pink-100 text-pink-600' : 'text-gray-700'}
                        `}
                      >
                        <span>{rangeStr}</span>
                        {isCurrent && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        }
      />

      {/* Global Info Modal */}
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
    </main>
  );
}
