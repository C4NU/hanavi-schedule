"use client";

import { useRef, useState, useEffect } from "react";
import Script from "next/script";
import ScheduleGrid from '@/components/ScheduleGrid';
import { useSchedule } from "@/hooks/useSchedule";
import { useExportSchedule } from "@/hooks/useExportSchedule";
import InfoModal from "@/components/InfoModal";
import WhatsNewModal from "@/components/WhatsNewModal";
import ScheduleHeaderPicker from "@/components/ScheduleHeaderPicker";
import MobileScheduleMenu from "@/components/MobileScheduleMenu";
import PersonalScheduleModal from "@/components/PersonalScheduleModal";
import { generateICS } from "@/utils/ics";
import { useHaptics } from "@/hooks/useHaptics";
import { defaultPatterns } from "web-haptics";
import { getMonday, formatWeekRange, formatWeekRangeShort } from "@/utils/date";
import ScheduleSkeleton from '@/components/ScheduleSkeleton';
import { toast } from 'sonner';
import { usePWA } from "@/hooks/usePWA";
import PWAInstructions from "@/components/PWAInstructions";
import { useScheduleTheme } from "@/hooks/useScheduleTheme";
import styles from "./page.module.css";
import headerStyles from "@/components/ScheduleHeader.module.css";

const desktopMenuItem = 'w-full text-left px-4 py-3 rounded-full hover:bg-gray-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group';
const imageExportStates = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-700 disabled:cursor-not-allowed disabled:opacity-50';

const viewOptions = [
  { value: 'member', label: '멤버별' },
  { value: 'weekly', label: '주간 통합' },
] as const;

const skinOptions = [
  { value: 'v2', label: '신규' },
  { value: 'classic', label: '클래식' },
] as const;

export default function Home() {
  const { trigger } = useHaptics();
  
  const [currentDate, setCurrentDate] = useState<Date>(getMonday(new Date()));
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  // Lifted State for Sidebar/Filter
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const whatsNewButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(new Set());
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Mobile specific state
  const [isPWAInstructionsOpen, setIsPWAInstructionsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'member' | 'weekly'>('member');
  const [isPersonalScheduleModalOpen, setIsPersonalScheduleModalOpen] = useState(false);

  const { theme, setTheme } = useScheduleTheme();

  const { canInstall, installPWA } = usePWA();

  const weekRangeString = formatWeekRange(currentDate);
  const { schedule, isLoading, mutate } = useSchedule(weekRangeString);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const { exportImage, isExporting } = useExportSchedule(trigger);
  
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
    if (link.parentNode) {
      document.body.removeChild(link);
    }
    toast.success('캘린더 파일(ICS)이 생성되었습니다.');
  };

  const handleExport = () => exportImage(scheduleRef, defaultPatterns);

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

  const skinSelector = (
    <ScheduleHeaderPicker
      label="시간표 스킨"
      options={skinOptions}
      value={theme}
      onChange={skin => { trigger(); setTheme(skin); }}
    />
  );

  const whatsNewButton = (
    <button
      type="button"
      className={`${headerStyles.button} ${headerStyles.iconButton}`}
      onClick={event => {
        whatsNewButtonRef.current = event.currentTarget;
        setIsWhatsNewOpen(true);
      }}
      aria-label="What’s New"
      aria-haspopup="dialog"
      title="What’s New"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
        <path d="M3 11v2a2 2 0 0 0 2 2h3l3 5h2l-2-5 8 3V6l-8 3H5a2 2 0 0 0-2 2Z" />
        <path d="M8 9v6" />
      </svg>
    </button>
  );

  return (
    <main className="main-layout relative">
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
        <div className={`${headerStyles.theme} ${headerStyles.actionLabels} hidden md:flex fixed top-0 right-0 h-full w-[320px] bg-white shadow-2xl z-[100] flex-col animate-slide-left border-l border-gray-100`}>
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
              className={desktopMenuItem}
            >
              <span className="group-hover:scale-110 transition-transform">📅</span>
              <span>캘린더 추가 (ICS)</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className={`${desktopMenuItem} ${imageExportStates}`}
            >
              <span aria-hidden="true" className="group-hover:scale-110 transition-transform">📥</span>
              <span>이미지로 저장</span>
            </button>

            <button
              onClick={() => { setIsPersonalScheduleModalOpen(true); setIsMenuOpen(false); }}
              className={desktopMenuItem}
            >
              <span className="group-hover:scale-110 transition-transform">✨</span>
              <span>개인 일정 카드 생성</span>
            </button>

            <button
              onClick={() => { setIsInfoModalOpen(true); setIsMenuOpen(false); }}
              className={desktopMenuItem}
            >
              <span className="group-hover:scale-110 transition-transform">ℹ️</span>
              <span>사용 가이드</span>
            </button>

            <a
              href="https://cafe.naver.com/officialhanavi"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-left px-4 py-3 rounded-full hover:bg-green-50 flex items-center gap-3 font-bold text-gray-700 transition-colors group"
            >
              <span className="group-hover:scale-110 transition-transform">☕</span>
              <span>네이버 팬카페</span>
            </a>

            {canInstall && (
              <button
                onClick={async () => {
                  const result = await installPWA();
                  if (result === 'ios-manual') {
                    setIsPWAInstructionsOpen(true);
                  }
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-full bg-pink-50 hover:bg-pink-100 flex items-center gap-3 font-bold text-pink-600 transition-colors group mt-2"
              >
                <span className="group-hover:scale-110 transition-transform">✨</span>
                <span>웹 앱으로 만들기</span>
              </button>
            )}

            <div className="h-px bg-gray-100 my-4 mx-2"></div>

            <div className="px-2 mb-4">
              <div className="text-xs font-bold text-gray-400 px-2 py-2 uppercase tracking-wider mb-2">Member Filter</div>
              <div className="flex justify-end mb-2 gap-2 px-1">
                <button
                  type="button"
                  onClick={() => setSelectedCharacters(new Set(schedule.characters.map((member) => member.id)))}
                  disabled={schedule.characters.every(({ id }) => selectedCharacters.has(id))}
                  className={`${styles.scheduleAction} ${styles.filterShortcut}`}
                >
                  전체 선택
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCharacters(new Set())}
                  disabled={selectedCharacters.size === 0}
                  className={`${styles.scheduleAction} ${styles.filterShortcut}`}
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
                    className={`p-3 rounded-full text-sm font-bold text-center border transition-all hover:shadow-sm flex items-center justify-center gap-2 ${selectedCharacters.has(char.id) ? 'bg-pink-50 border-pink-200 text-pink-600 ring-2 ring-pink-100' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 opacity-60'}`}
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
            © 2026 Uplift Assets. Created by 반짝이. Used with Permission.
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onMemoAdded={() => mutate()}
        theme={theme}

        mobileTitleAction={whatsNewButton}
        headerControls={
          <>
            <div className="hidden md:flex">{whatsNewButton}</div>
            <div className="hidden items-center gap-3 md:flex">
              <ScheduleHeaderPicker
                label="시간표 보기"
                options={viewOptions}
                value={viewMode}
                onChange={view => { trigger(); setViewMode(view); }}
              />
              {skinSelector}
            </div>

            <MobileScheduleMenu
              onOpen={() => trigger()}
              sections={[
                {
                  title: '내보내기',
                  rows: [
                    { label: '캘린더 추가', icon: 'calendar', onSelect: handleDownloadCalendar },
                    { label: '이미지로 저장', icon: 'download', disabled: isExporting, onSelect: handleExport },
                    { label: '개인 일정 카드 생성', icon: 'card', onSelect: () => setIsPersonalScheduleModalOpen(true) },
                  ],
                },
                {
                  title: '표시 방식',
                  skinSelector,
                  rows: [
                    { label: '멤버별 보기', icon: viewMode === 'member' ? 'check' : 'circle', pressed: viewMode === 'member', onSelect: () => { trigger(); setViewMode('member'); } },
                    { label: '주간 통합 보기', icon: viewMode === 'weekly' ? 'check' : 'circle', pressed: viewMode === 'weekly', onSelect: () => { trigger(); setViewMode('weekly'); } },
                    { label: '필터 설정', icon: 'filter', pressed: isFilterPanelOpen, onSelect: () => setIsFilterPanelOpen(open => !open) },
                  ],
                },
                {
                  title: '안내',
                  rows: [
                    { label: '사용 가이드', icon: 'help', onSelect: () => setIsInfoModalOpen(true) },
                    { label: '네이버 팬카페', icon: 'link', href: 'https://cafe.naver.com/officialhanavi' },
                    ...(canInstall ? [{ label: '웹 앱으로 만들기', icon: 'download' as const, onSelect: async () => {
                      const result = await installPWA();
                      if (result === 'ios-manual') setIsPWAInstructionsOpen(true);
                    } }] : []),
                  ],
                },
              ]}
            />

            {/* Desktop Menu Trigger (Visible only on Desktop) */}
            <div className="hidden md:flex gap-2 items-center">
              <button
                type="button"
                className={headerStyles.button}
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen(true)}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>메뉴</span>
              </button>
            </div>
          </>
        }

        dateSelector={
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(open => !open)}
              aria-expanded={isDateDropdownOpen}
              className={`${headerStyles.button} ${headerStyles.dateButton}`}
            >
              <span className={headerStyles.dateLabel}>
                {theme === 'v2' ? formatWeekRangeShort(weekRangeString) : weekRangeString}
              </span>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* Date Dropdown */}
            {isDateDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[150]" onClick={() => setIsDateDropdownOpen(false)} />
                <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 z-[151] max-h-60 overflow-y-auto p-1 ${headerStyles.dateOptions}`}>
                  {Array.from({ length: 9 }).map((_, i) => {
                    const offset = i - 4; // -4 to +4 weeks
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() + (offset * 7));
                    const rangeStr = formatWeekRange(d);
                    const isCurrent = offset === 0;

                    return (
                      <button
                        key={i}
                        type="button"
                        aria-current={isCurrent ? 'true' : undefined}
                        onClick={() => {
                          setCurrentDate(d);
                          setIsDateDropdownOpen(false);
                        }}
                        className={headerStyles.dateOption}
                      >
                        <span className={headerStyles.dateLabel}>{rangeStr}</span>
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
      <WhatsNewModal isOpen={isWhatsNewOpen} onClose={() => {
        setIsWhatsNewOpen(false);
        whatsNewButtonRef.current?.focus();
      }} />

      {/* PWA Instructions Modal */}
      <PWAInstructions isOpen={isPWAInstructionsOpen} onClose={() => setIsPWAInstructionsOpen(false)} />

      {/* Personal Schedule Modal */}
      {schedule && (
        <PersonalScheduleModal
          isOpen={isPersonalScheduleModalOpen}
          onClose={() => setIsPersonalScheduleModalOpen(false)}
          characters={schedule.characters}
          currentDate={currentDate}
          weekRangeString={weekRangeString}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
        />
      )}
    </main>
  );
}
