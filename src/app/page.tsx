"use client";

import { useRef, useState, useEffect } from "react";
import ScheduleGrid from '@/components/ScheduleGrid';
import { useSchedule } from "@/hooks/useSchedule";
import { dismissReleaseNotice, useReleaseNotice } from "@/hooks/useReleaseNotice";
import { useExportSchedule } from "@/hooks/useExportSchedule";
import InfoModal from "@/components/InfoModal";
import WhatsNewModal from "@/components/WhatsNewModal";
import ScheduleWeekPicker from "@/components/ScheduleWeekPicker";
import ScheduleHeaderPicker from "@/components/ScheduleHeaderPicker";
import MobileScheduleMenu, { MenuIcon } from "@/components/MobileScheduleMenu";
import PersonalScheduleModal from "@/components/PersonalScheduleModal";
import { generateICS } from "@/utils/ics";
import { useHaptics } from "@/hooks/useHaptics";
import { defaultPatterns } from "web-haptics";
import { getMonday, formatWeekRange } from "@/utils/date";
import ScheduleSkeleton from '@/components/ScheduleSkeleton';
import { toast } from 'sonner';
import { usePWA } from "@/hooks/usePWA";
import PWAInstructions from "@/components/PWAInstructions";
import { useScheduleTheme } from "@/hooks/useScheduleTheme";
import styles from "./page.module.css";
import headerStyles from "@/components/ScheduleHeader.module.css";
import menuStyles from "@/components/MobileScheduleMenu.module.css";


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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const desktopMenuPanelRef = useRef<HTMLElement>(null);
  const desktopMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const showReleaseNotice = useReleaseNotice();
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

  useEffect(() => {
    if (!isMenuOpen) return;
    const anchor = desktopMenuRef.current;
    const panel = desktopMenuPanelRef.current;
    if (!anchor || !panel) return;

    const desktop = window.matchMedia('(min-width: 768px)');
    const fitPanelToViewport = () => {
      const top = anchor.getBoundingClientRect().top + panel.offsetTop;
      panel.style.setProperty('--desktop-popover-height', `${Math.max(0, window.innerHeight - top - 12)}px`);
    };
    const closeOnMobile = () => {
      if (!desktop.matches) setIsMenuOpen(false);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !desktopMenuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    fitPanelToViewport();
    const headerSizing = new ResizeObserver(fitPanelToViewport);
    headerSizing.observe(anchor.closest('header') ?? anchor);
    desktop.addEventListener('change', closeOnMobile);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    window.addEventListener('resize', fitPanelToViewport);
    window.addEventListener('scroll', fitPanelToViewport, true);
    return () => {
      headerSizing.disconnect();
      desktop.removeEventListener('change', closeOnMobile);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      window.removeEventListener('resize', fitPanelToViewport);
      window.removeEventListener('scroll', fitPanelToViewport, true);
    };
  }, [isMenuOpen]);

  const closeDesktopMenu = () => {
    setIsMenuOpen(false);
    desktopMenuButtonRef.current?.focus();
  };


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

  const desktopMenu = (
    <section ref={desktopMenuPanelRef} id="desktop-schedule-menu" aria-labelledby="desktop-schedule-menu-title" className={`${styles.desktopPopover} ${headerStyles.actionLabels}`}>
      <div className={menuStyles.heading}>
        <h2 id="desktop-schedule-menu-title">시간표 설정</h2>
        <button className={`${menuStyles.close} ${headerStyles.sheetClose}`} type="button" aria-label="메뉴 닫기" onClick={closeDesktopMenu}>
          <MenuIcon name="close" />
        </button>
      </div>

      <section className={menuStyles.section} aria-label="내보내기">
        <h3>내보내기</h3>
        <button className={menuStyles.row} type="button" onClick={handleDownloadCalendar}>
          <MenuIcon name="calendar" />
          캘린더 추가 (ICS)
        </button>
        <button className={menuStyles.row} type="button" onClick={handleExport} disabled={isExporting}>
          <MenuIcon name="download" />
          이미지로 저장
        </button>
        <button className={menuStyles.row} type="button" onClick={() => { closeDesktopMenu(); setIsPersonalScheduleModalOpen(true); }}>
          <MenuIcon name="card" />
          개인 일정 카드 생성
        </button>
      </section>

      <section className={menuStyles.section} aria-label="안내">
        <h3>안내</h3>
        <button className={menuStyles.row} type="button" onClick={() => { closeDesktopMenu(); setIsInfoModalOpen(true); }}>
          <MenuIcon name="help" />
          사용 가이드
        </button>
        <a className={menuStyles.row} href="https://cafe.naver.com/officialhanavi" target="_blank" rel="noopener noreferrer">
          <MenuIcon name="link" />
          네이버 팬카페
        </a>
        {canInstall && (
          <button className={menuStyles.row} type="button" onClick={async () => {
            const result = await installPWA();
            closeDesktopMenu();
            if (result === 'ios-manual') setIsPWAInstructionsOpen(true);
          }}>
            <MenuIcon name="download" />
            웹 앱으로 만들기
          </button>
        )}
      </section>

      <section className={menuStyles.section} aria-label="멤버 필터">
        <h3>멤버 필터</h3>
        <div className="px-2 py-2">
          <div className={`${styles.memberFilterGrid} mb-2`}>
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
              전체 해제
            </button>
          </div>
          <div className={styles.memberFilterGrid}>
            {schedule.characters.map((char) => (
              <button
                key={char.id}
                type="button"
                aria-pressed={selectedCharacters.has(char.id)}
                onClick={() => {
                  trigger();
                  const next = new Set(selectedCharacters);
                  if (next.has(char.id)) next.delete(char.id);
                  else next.add(char.id);
                  setSelectedCharacters(next);
                }}
                className={styles.memberChoice}
              >
                {char.avatarUrl && (
                  <img src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`} alt="" className="w-4 h-4 rounded-full" />
                )}
                {char.name}
                {selectedCharacters.has(char.id) && <span className={styles.memberCheck}><MenuIcon name="check" size={14} /></span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.desktopPopoverCredit}>
        <span>© 2026 Uplift Assets.</span>
        <span>Created by 반짝이. Used with Permission.</span>
      </div>
    </section>
  );

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

            <div
              ref={desktopMenuRef}
              className="relative hidden items-center md:flex"
              onKeyDown={event => {
                if (!isMenuOpen || event.key !== 'Escape') return;
                event.stopPropagation();
                closeDesktopMenu();
              }}
              onBlur={event => {
                if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
                  setIsMenuOpen(false);
                }
              }}
            >
              <button
                type="button"
                ref={desktopMenuButtonRef}
                className={headerStyles.button}
                aria-expanded={isMenuOpen}
                aria-controls={isMenuOpen ? 'desktop-schedule-menu' : undefined}
                onClick={() => setIsMenuOpen(open => !open)}
              >
                <MenuIcon name="menu" size={16} />
                <span>메뉴</span>
              </button>
              {isMenuOpen && desktopMenu}
            </div>
          </>
        }

        dateSelector={<ScheduleWeekPicker date={currentDate} theme={theme} onChange={setCurrentDate} />}
      />

      {/* Global Info Modal */}
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
      <WhatsNewModal isOpen={showReleaseNotice || isWhatsNewOpen} onClose={() => {
        dismissReleaseNotice();
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
