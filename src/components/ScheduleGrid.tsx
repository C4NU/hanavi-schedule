"use client";

import React, { useState, useRef, forwardRef } from 'react';
import styles from './ScheduleGrid.module.css';
import { WeeklySchedule, ScheduleItem } from '@/types/schedule';
import { generateICS } from '@/utils/ics';
import InfoModal from './InfoModal';
import MarkdownEditor from './MarkdownEditor';
import VideoLinkModal from './VideoLinkModal';
import PlatformLinkModal from './PlatformLinkModal';
import { CharacterSchedule } from '@/types/schedule';
import { useHaptics } from '@/hooks/useHaptics';
import { useSwipe } from '@/hooks/useSwipe';
import { splitScheduleItem, joinScheduleItems, addTimePart } from '@/utils/time';
import { formatWeekRangeShort } from '@/utils/date';
import { ScheduleTheme } from '@/hooks/useScheduleTheme';

interface Props {
    data: WeeklySchedule;
    onExport?: () => void;
    onPrevWeek?: () => void;
    onNextWeek?: () => void;
    isEditable?: boolean;
    onCellUpdate?: (charId: string, day: string, field: keyof ScheduleItem, value: string) => void;
    onCellBlur?: (charId: string, day: string, field: keyof ScheduleItem, value: string) => void;
    headerControls?: React.ReactNode;
    dateSelector?: React.ReactNode;
    // New props for external filter control
    selectedCharacters?: Set<string>;
    onSelectionChange?: (newSet: Set<string>) => void;
    isFilterPanelOpen?: boolean;
    onFilterPanelChange?: (isOpen: boolean) => void;
    viewMode?: 'member' | 'weekly';
    onViewModeChange?: (mode: 'member' | 'weekly') => void;
    onMemoAdded?: () => void;
    theme?: ScheduleTheme;
}

import FilterPanel from './FilterPanel';
import CharacterCell from './CharacterCell';
import ScheduleCell from './ScheduleCell';
import WeeklyTimetable from './WeeklyTimetable';
import MemoPopover from './MemoPopover';
import BaseModal from './BaseModal';
import DOMPurify from 'isomorphic-dompurify';
import { stripHtml } from '@/utils/text';
import StudentIDCard from './StudentIDCard';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const ScheduleGrid = forwardRef<HTMLDivElement, Props>(({
    data, onExport, onPrevWeek, onNextWeek, isEditable, onCellUpdate, onCellBlur,
    headerControls, dateSelector,
    selectedCharacters: externalSelectedChars,
    onSelectionChange,
    isFilterPanelOpen: externalFilterOpen,
    onFilterPanelChange,
    viewMode = 'member',
    onMemoAdded,
    theme = 'classic'
}, ref) => {
    const { trigger } = useHaptics();
    // Internal state fallback
    const [internalSelectedChars, setInternalSelectedChars] = useState<Set<string>>(
        new Set(data.characters.map(c => c.id))
    );
    const [internalFilterOpen, setInternalFilterOpen] = useState(false);

    // Use external if provided, else internal
    const activeSelectedChars = externalSelectedChars ?? internalSelectedChars;
    const activeFilterOpen = externalFilterOpen ?? internalFilterOpen;

    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [currentDayIndex, setCurrentDayIndex] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [platformModalOpen, setPlatformModalOpen] = useState(false);
    const [selectedCharForModal, setSelectedCharForModal] = useState<CharacterSchedule | null>(null);
    const [currentEditCell, setCurrentEditCell] = useState<{ charId: string, day: string, url: string } | null>(null);
    const [activeMemoItem, setActiveMemoItem] = useState<{ item: ScheduleItem, charId: string } | null>(null);
    const [cellDetail, setCellDetail] = useState<{ char: CharacterSchedule; item: ScheduleItem } | null>(null);
    const [splitEditor, setSplitEditor] = useState<{
        charId: string; day: string; draft: { time: string; content: string }[]; type: string;
        participants: string[]; isCollab: boolean;
    } | null>(null);

    // 모바일 좌/우 네비 버튼 자동 숨김 — 조작(요일 변경/뷰 전환)이 없으면 3초 후 페이드아웃
    const [navBtnsVisible, setNavBtnsVisible] = useState(true);
    const navHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pokeNavButtons = React.useCallback(() => {
        setNavBtnsVisible(true);
        if (navHideTimer.current) clearTimeout(navHideTimer.current);
        navHideTimer.current = setTimeout(() => setNavBtnsVisible(false), 3000);
    }, []);
    React.useEffect(() => () => {
        if (navHideTimer.current) clearTimeout(navHideTimer.current);
    }, []);

    // Set initial day to current day of week on mount (Client-side only to avoid hydration mismatch)
    React.useEffect(() => {
        const today = new Date().getDay(); // 0 (Sun) - 6 (Sat)
        // Convert to 0 (Mon) - 6 (Sun)
        const initialIndex = (today + 6) % 7;
        setCurrentDayIndex(initialIndex);
    }, []);

    // 요일 변경/뷰 전환/마운트 시 버튼을 다시 표시하고 3초 타이머 시작
    React.useEffect(() => {
        pokeNavButtons();
    }, [currentDayIndex, viewMode, pokeNavButtons]);

    const { swipeHandlers, touchStart, touchEnd, minSwipeDistance } = useSwipe({
        onSwipeLeft: () => setCurrentDayIndex(prev => (prev + 1) % 7),
        onSwipeRight: () => setCurrentDayIndex(prev => (prev - 1 + 7) % 7)
    });

    const handleToggle = (charId: string) => {
        trigger();
        const newSelected = new Set(activeSelectedChars);
        if (newSelected.has(charId)) {
            newSelected.delete(charId);
        } else {
            newSelected.add(charId);
        }

        if (onSelectionChange) {
            onSelectionChange(newSelected);
        } else {
            setInternalSelectedChars(newSelected);
        }
    };


    const handleSelectAll = () => {
        trigger();
        const allChars = new Set(data.characters.map(c => c.id));
        if (onSelectionChange) {
            onSelectionChange(allChars);
        } else {
            setInternalSelectedChars(allChars);
        }
    };

    const handleDeselectAll = () => {
        trigger();
        const emptySet = new Set<string>();
        if (onSelectionChange) {
            onSelectionChange(emptySet);
        } else {
            setInternalSelectedChars(emptySet);
        }
    };

    const handleOpenLinkModal = (charId: string, day: string, currentUrl: string) => {
        setCurrentEditCell({ charId, day, url: currentUrl });
        setVideoModalOpen(true);
    };

    const handleOpenPlatformModal = (char: CharacterSchedule) => {
        setSelectedCharForModal(char);
        setPlatformModalOpen(true);
    };

    const handleSaveLink = (url: string) => {
        if (currentEditCell) {
            onCellUpdate?.(currentEditCell.charId, currentEditCell.day, 'videoUrl', url);
        }
    };

    const handleDownloadCalendar = () => {
        const icsContent = generateICS(data);
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
    };

    const filteredData = React.useMemo(() => ({
        ...data,
        characters: data.characters.filter(c => activeSelectedChars.has(c.id))
    }), [data, activeSelectedChars]);

    const handleFilterToggle = () => {
        trigger();
        if (onFilterPanelChange) {
            onFilterPanelChange(!activeFilterOpen);
        } else {
            setInternalFilterOpen(!internalFilterOpen);
        }
    };

    // Pre-calculate collaboration groups and skip sets for dynamic merging
    const { collabGroups, skipCells } = React.useMemo(() => {
        const groups: { [day: string]: { [charId: string]: number } } = {};
        const skips: { [day: string]: Set<string> } = {};
        
        DAYS.forEach(day => {
            groups[day] = {};
            skips[day] = new Set<string>();
            let currentMergeStartId: string | null = null;
            let count = 0;
            
            filteredData.characters.forEach((char, idx) => {
                const item = char.schedule[day];
                const isHanaviCollab = item?.type?.startsWith('collab') ||
                                     item?.content?.includes('하나비 합방') ||
                                     item?.content?.includes('단체 방송') ||
                                     item?.content?.includes('단체 합방');
                
                if (isHanaviCollab) {
                    if (currentMergeStartId === null) {
                        currentMergeStartId = char.id;
                        count = 1;
                    } else {
                        count++;
                        skips[day].add(char.id);
                    }
                } else {
                    if (currentMergeStartId !== null) {
                        groups[day][currentMergeStartId] = count;
                        currentMergeStartId = null;
                        count = 0;
                    }
                }
            });
            
            if (currentMergeStartId !== null) {
                groups[day][currentMergeStartId] = count;
            }
        });
        
        return { collabGroups: groups, skipCells: skips };
    }, [filteredData.characters]);

    // ＋ 버튼: 시간 파트 추가 (셀 분할) / － 버튼: 파트 제거 (병합)
    const handleAddSplit = (charId: string, day: string) => {
        const char = filteredData.characters.find(c => c.id === charId);
        const rawTime = char?.schedule[day]?.time || '';
        onCellUpdate?.(charId, day, 'time', addTimePart(rawTime));
    };


    // 다방송 편집 시트: 드래프트 기반 편집 (입력 중 분할 붕괴 방지), 적용 시 combined 재조합
    const handleOpenBroadcastEditor = (charId: string, day: string, typeOverride?: string) => {
        const char = filteredData.characters.find(c => c.id === charId);
        const raw = char?.schedule[day];
        if (!raw) return;
        const effectiveType = typeOverride || raw.type || 'stream';
        const isCollab = effectiveType.startsWith('collab');
        setSplitEditor({
            charId, day,
            draft: splitScheduleItem(raw).map(s => ({ time: s.time, content: stripHtml(s.content) })),
            type: effectiveType,
            participants: isCollab ? [...(raw.eventMemberIds || [charId])] : [],
            isCollab,
        });
    };

    const updateSplitDraft = (subIdx: number, field: 'time' | 'content', value: string) => {
        setSplitEditor(prev => {
            if (!prev) return prev;
            const draft = [...prev.draft];
            draft[subIdx] = { ...draft[subIdx], [field]: value };
            return { ...prev, draft };
        });
    };

    const addSplitDraft = () => {
        setSplitEditor(prev => {
            if (!prev) return prev;
            return { ...prev, draft: [...prev.draft, { time: '20:00', content: '' }] };
        });
    };

    const removeSplitDraft = (subIdx: number) => {
        setSplitEditor(prev => {
            if (!prev || prev.draft.length <= 1) return prev;
            const draft = prev.draft.filter((_, i) => i !== subIdx);
            return { ...prev, draft };
        });
    };

    // 적용: 드래프트를 combined 문자열로 재조합해 반영 (부분 입력도 안전)
    const applySplitDraft = () => {
        if (!splitEditor) return;
        const { charId, day, draft } = splitEditor;
        const time = draft.map(d => (d.time || '').trim()).filter(Boolean).join('+');
        const contents = draft.map(d => (d.content || '').trim()).filter(Boolean);
        const content = contents.length > 1 ? contents.join(' + ') : contents[0] ?? '';
        onCellUpdate?.(charId, day, 'time', time);
        onCellUpdate?.(charId, day, 'content', content);
        onCellUpdate?.(charId, day, 'type', splitEditor.type);
        if (splitEditor.isCollab) {
            onCellUpdate?.(charId, day, 'eventMemberIds', splitEditor.participants as unknown as string);
        }
        setSplitEditor(null);
    };

    const toggleParticipant = (memberId: string) => {
        setSplitEditor(prev => {
            if (!prev) return prev;
            const has = prev.participants.includes(memberId);
            return {
                ...prev,
                participants: has ? prev.participants.filter(id => id !== memberId) : [...prev.participants, memberId],
            };
        });
    };

    const isV2 = theme === 'v2';

    const dateNav = (
        <div className={styles.dateNav}>
            {onPrevWeek && (
                <button
                    onClick={onPrevWeek}
                    className={styles.navBtn}
                    aria-label="Previous Week"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
            )}
            {dateSelector ? (
                dateSelector
            ) : (
                isV2 ? null : <span className={styles.date} style={{ margin: 0 }}>{data.weekRange}</span>
            )}
            {onNextWeek && (
                <button
                    onClick={onNextWeek}
                    className={styles.navBtn}
                    aria-label="Next Week"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
            )}
        </div>
    );

    return (
        <div ref={ref} className={styles.exportWrapper} data-theme={theme}>
            <div className={styles.container} data-theme={theme}>
                <header className={styles.header}>
                    <div className={styles.titleRow}>
                        <div className={styles.titleGroup}>
                            {isV2 ? (
                                <>
                                    <span className={styles.v2Badge}>WEEKLY SCHEDULE</span>
                                    <div className={styles.v2TitleRow}>
                                        <div className={styles.v2TitleLine}>
                                            <span className={styles.v2PlayIcon} aria-hidden="true">▶</span>
                                            <h1 className={styles.title}>하나비 유니버스 주간 스케줄표</h1>
                                        </div>
                                        {dateNav}
                                        {/* 이미지 내보내기 전용 정적 날짜 — 라이브에서는 숨김 (data-exporting에서 표시) */}
                                        <span className={styles.v2ExportDate}>{formatWeekRangeShort(data.weekRange)}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h1 className={styles.title}>하나비 주간 스케줄표</h1>
                                    {dateNav}
                                </>
                            )}
                        </div>
                        <div className={styles.controls}>
                            {headerControls ? headerControls : (
                                !isEditable ? (
                                    <>
                                        <button className={styles.mobileMenuBtn} onClick={() => { trigger(); setIsMenuOpen(!isMenuOpen); }}>
                                            ☰
                                        </button>
                                        {/* Mobile Dropdown Menu */}
                                        {isMenuOpen && (
                                            <>
                                                <div className={styles.dropdownOverlay} onClick={() => setIsMenuOpen(false)} />
                                                <div className={styles.dropdownMenu}>
                                                    <button className={styles.dropdownItem} onClick={() => { setIsMenuOpen(false); handleDownloadCalendar(); }}>
                                                        📅 캘린더 추가
                                                    </button>
                                                    <button className={styles.dropdownItem} onClick={() => { setIsMenuOpen(false); onExport?.(); }}>
                                                        📥 이미지로 저장
                                                    </button>
                                                    <button className={styles.dropdownItem} onClick={() => { setIsMenuOpen(false); setInfoModalOpen(true); }}>
                                                        ℹ️ 사용 가이드
                                                    </button>
                                                    <button className={styles.dropdownItem} onClick={() => { setIsMenuOpen(false); handleFilterToggle(); }}>
                                                        {activeFilterOpen ? '▼' : '▶'} 필터 설정
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                        <div className={styles.controlRow}>
                                            <button className={styles.exportButton} onClick={handleDownloadCalendar}>
                                                📅 캘린더 추가
                                            </button>
                                            <button className={styles.exportButton} onClick={onExport}>
                                                📥 이미지로 저장
                                            </button>
                                        </div>
                                        <div className={styles.filterGroup}>
                                            <button
                                                className={styles.infoButton}
                                                onClick={() => setInfoModalOpen(true)}
                                                aria-label="사용 가이드"
                                            >
                                                i
                                            </button>
                                            <button className={`${styles.filterButton} ${styles.fullWidth}`} onClick={handleFilterToggle}>
                                                {activeFilterOpen ? '▼' : '▶'} 필터
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className={styles.filterGroup} style={{ gap: '10px' }}>
                                        <button
                                            className={styles.exportButton}
                                            onClick={() => setInfoModalOpen(true)}
                                            style={{ backgroundColor: '#8956fb', color: 'white', borderColor: '#8956fb', fontSize: '0.85rem' }}
                                        >
                                            🔄 씨미 동기화 도구
                                        </button>
                                        <button
                                            className={styles.infoButton}
                                            onClick={() => setInfoModalOpen(true)}
                                            aria-label="사용 가이드"
                                            style={{ margin: 0 }}
                                        >
                                            i
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {activeFilterOpen && (
                        <FilterPanel 
                            data={data}
                            activeSelectedChars={activeSelectedChars}
                            handleToggle={handleToggle}
                            handleSelectAll={handleSelectAll}
                            handleDeselectAll={handleDeselectAll}
                        />
                    )}
                </header >
                
                {viewMode === 'member' && (
                    <>
                        <button 
                            className={`${styles.mobileNavBtn} ${styles.prevBtn} ${!navBtnsVisible ? styles.navBtnHidden : ''}`}
                            onClick={() => { trigger(); pokeNavButtons(); setCurrentDayIndex(prev => (prev - 1 + 7) % 7); }}
                            aria-label="Previous Day"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <button 
                            className={`${styles.mobileNavBtn} ${styles.nextBtn} ${!navBtnsVisible ? styles.navBtnHidden : ''}`}
                            onClick={() => { trigger(); pokeNavButtons(); setCurrentDayIndex(prev => (prev + 1) % 7); }}
                            aria-label="Next Day"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </>
                )}

                <div
                    className={styles.gridWrapper}
                    {...swipeHandlers}
                >
                    <div className={`${styles.viewContainer} ${viewMode === 'weekly' ? styles.showWeekly : styles.showMember}`}>
                        {/* Member View */}
                        <div
                            className={`${styles.grid} ${isEditable ? styles.editing : ''} ${viewMode === 'member' ? styles.activeView : styles.inactiveView}`}
                            data-current-day={currentDayIndex}
                            data-char-count={filteredData.characters.length}
                            style={{ 
                                '--char-count': filteredData.characters.length,
                                '--current-day': currentDayIndex 
                            } as React.CSSProperties}
                        >
                            {/* Header Row */}
                            <div className={styles.cornerCell}>{isV2 ? '✱' : ''}</div>
                            {DAYS.map((day, index) => (
                                <div
                                    key={day}
                                    className={styles.dayHeader}
                                    data-day-index={index}
                                    style={{ '--row-index': 1 } as React.CSSProperties}
                                >
                                    {day}
                                </div>
                            ))}

                            {/* Character Rows */}
                            {filteredData.characters.map((char, charIndex) => (
                                <React.Fragment key={char.id}>
                                    <CharacterCell 
                                        char={char}
                                        onClick={() => { trigger(); handleOpenPlatformModal(char); }}
                                        style={{ '--row-index': charIndex + 2 } as React.CSSProperties}
                                    />

                                    {DAYS.map((day, index) => {
                                        if (skipCells[day]?.has(char.id)) return null;

                                        const spanSize = collabGroups[day]?.[char.id] || 1;
                                        const rawItem = char.schedule[day];
                                        // "12:00+19:00" 다방송 셀 n분열 — 관리자/열람 동일 (WYSIWYG)
                                        const displayItems = splitScheduleItem(rawItem);

                                        const cellPlacement = {
                                            '--row-index': charIndex + 2,
                                            '--span-size': spanSize,
                                            '--col-index': index + 2,
                                            gridRow: spanSize > 1 ? `var(--row-index) / span var(--span-size)` : undefined,
                                            gridColumn: spanSize > 1 ? `var(--col-index)` : undefined
                                        } as React.CSSProperties;

                                        if (displayItems.length > 1) {
                                            return (
                                                <div
                                                    key={`${char.id}-${day}`}
                                                    data-day-index={index}
                                                    className={styles.splitCellStack}
                                                    style={cellPlacement}
                                                >
                                                    {displayItems.map((subItem, subIdx) => (
                                                        <ScheduleCell
                                                            key={`${char.id}-${day}-${subIdx}`}
                                                            char={char}
                                                            day={day}
                                                            index={index}
                                                            item={subItem}
                                                            isEditable={isEditable}
                                                            handleOpenLinkModal={handleOpenLinkModal}
                                                            trigger={trigger}
                                                            touchStart={touchStart}
                                                            touchEnd={touchEnd}
                                                            minSwipeDistance={minSwipeDistance}
                                                            style={{ flex: 1, minHeight: 0 } as React.CSSProperties}
                                                            onMemoAdded={onMemoAdded}
                                                            onMemoClick={(item, charId) => setActiveMemoItem({ item, charId })}
onDetailClick={(c, i) => setCellDetail({ char: c, item: i })}
                                                            splitMeta={{ index: subIdx, total: displayItems.length }}
                                                            onOpenBroadcastEditor={isEditable ? handleOpenBroadcastEditor : undefined}
                                                            theme={theme}
                                                        />
                                                    ))}
                                                </div>
                                            );
                                        }

                                        return (
                                            <ScheduleCell 
                                                key={`${char.id}-${day}`}
                                                char={char}
                                                day={day}
                                                index={index}
                                                item={rawItem}
                                                isEditable={isEditable}
                                                onCellUpdate={onCellUpdate}
                                                onCellBlur={onCellBlur}
                                                handleOpenLinkModal={handleOpenLinkModal}
                                                trigger={trigger}
                                                touchStart={touchStart}
                                                touchEnd={touchEnd}
                                                minSwipeDistance={minSwipeDistance}
                                                style={cellPlacement}
                                                onMemoAdded={onMemoAdded}
                                                onMemoClick={(item, charId) => setActiveMemoItem({ item, charId })}
onDetailClick={(c, i) => setCellDetail({ char: c, item: i })}
                                                onAddSplit={isEditable ? handleAddSplit : undefined}
                                                onOpenBroadcastEditor={isEditable ? handleOpenBroadcastEditor : undefined}
                                                theme={theme}
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Weekly Integrated View */}
                        <div className={`${styles.weeklyViewWrapper} ${viewMode === 'weekly' ? styles.activeView : styles.inactiveView}`}>
                            <div className={styles.weeklyContentContainer}>
                                <div className={styles.weeklyTimetableLeft}>
                                    <WeeklyTimetable 
                                        data={data} 
                                        selectedCharacters={activeSelectedChars}
                                        theme={theme}
                                        onItemClick={(char, item) => {
                                            if (isEditable) {
                                                trigger();
                                                handleOpenLinkModal(char.id, 'MON', item.videoUrl || ''); // Day integration logic might need refinement if used for editing
                                            } else if (item.videoUrl) {
                                                trigger();
                                                window.open(item.videoUrl, '_blank');
                                            }
                                        }}
                                    />
                                </div>
                                <div className={styles.weeklyCardsRight}>
                                    {data.characters.map((char, idx) => {
                                        // 각각 다른 기울기와 오프셋을 갖도록 회전 각도 배열 정의
                                        const rotations = [2.5, -3.5, 1.5, -2, 3, -1.5, 2];
                                        const rotateDeg = rotations[idx % rotations.length];
                                        // 좌/우 지그재그 배치 오프셋 (홀수는 우측, 짝수는 좌측)
                                        const offsetX = idx % 2 === 0 ? -25 : 25;
                                        // 모바일 상/하 지그재그 배치 오프셋 (홀수는 하단, 짝수는 상단)
                                        const offsetY = idx % 2 === 0 ? -12 : 12;
                                        return (
                                            <div 
                                                key={char.id} 
                                                className={styles.cardWrapper}
                                                style={{
                                                    '--rotate-deg': `${rotateDeg}deg`,
                                                    '--offset-x': `${offsetX}px`,
                                                    '--offset-y': `${offsetY}px`,
                                                    zIndex: 10 + idx
                                                } as React.CSSProperties}
                                            >
                                                <StudentIDCard character={char} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div >

                    {isV2 && (
                        <div className={styles.v2FooterCaption}>
                            A WORLD WHERE DREAMING GIRLS ENCOUNTER THE MELODY OF HOPE. VIRTUAL GAKUIN UNIVERSE PRODUCED BY UPLIFT CORPORATION
                        </div>
                    )}
            </div >

            <InfoModal 
                isOpen={infoModalOpen} 
                onClose={() => setInfoModalOpen(false)} 
                isAdmin={isEditable}
            />
            <VideoLinkModal
                isOpen={videoModalOpen}
                onClose={() => setVideoModalOpen(false)}
                initialUrl={currentEditCell?.url}
                onSave={handleSaveLink}
            />
            <PlatformLinkModal 
                isOpen={platformModalOpen}
                onClose={() => setPlatformModalOpen(false)}
                character={selectedCharForModal}
            />

            {activeMemoItem && (
                <MemoPopover
                    scheduleItemId={activeMemoItem.item.id || ''}
                    eventId={activeMemoItem.item.eventId}
                    memos={activeMemoItem.item.memos || []}
                    charId={activeMemoItem.charId}
                    onClose={() => setActiveMemoItem(null)}
                    onMemoAdded={() => {
                        onMemoAdded?.();
                        // Optional: close or keep open. Let's keep open but refresh happens via parent.
                    }}
                />
            )}

            {/* 다방송 편집 시트 (관리자: 분할 셀 클릭) */}
            {splitEditor && (() => {
                const sChar = filteredData.characters.find(c => c.id === splitEditor.charId);
                if (!sChar) return null;
                const dayKr = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' }[splitEditor.day] || '';
                return (
                    <BaseModal
                        isOpen
                        onClose={() => setSplitEditor(null)}
                        title={`${sChar.name} · ${dayKr}요일 다방송 편집`}
                        maxWidth="460px"
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {splitEditor.isCollab ? (
                                <>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <input
                                            value={splitEditor.draft[0]?.time || ''}
                                            onChange={(e) => updateSplitDraft(0, 'time', e.target.value)}
                                            placeholder="HH:MM"
                                            style={{ width: 76, flexShrink: 0, padding: '8px 6px', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 700, fontSize: 14 }}
                                        />
                                        <textarea
                                            value={splitEditor.draft[0]?.content || ''}
                                            onChange={(e) => updateSplitDraft(0, 'content', e.target.value)}
                                            rows={2}
                                            placeholder="합방 제목"
                                            style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                                        />
                                    </div>
                                    <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 10 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6 }}>
                                            참여 멤버 — 선택된 멤버들의 셀에 합방이 표시됩니다
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {filteredData.characters.map((c) => {
                                                const on = splitEditor.participants.includes(c.id);
                                                return (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => toggleParticipant(c.id)}
                                                        style={{
                                                            padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                                                            border: `1px solid ${on ? c.colorBorder || '#ff8fab' : '#e5e7eb'}`,
                                                            background: on ? `${c.colorBg || '#ffeef2'}` : 'white',
                                                            color: on ? c.colorBorder || '#333' : '#9ca3af',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {c.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                            <>
                            {splitEditor.draft.map((sub, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <input
                                        value={sub.time}
                                        onChange={(e) => updateSplitDraft(i, 'time', e.target.value)}
                                        placeholder="HH:MM"
                                        style={{ width: 76, flexShrink: 0, padding: '8px 6px', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 700, fontSize: 14 }}
                                    />
                                    <textarea
                                        value={sub.content}
                                        onChange={(e) => updateSplitDraft(i, 'content', e.target.value)}
                                        rows={2}
                                        placeholder="방송 내용"
                                        style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                                    />
                                    {splitEditor.draft.length > 1 && (
                                        <button
                                            onClick={() => removeSplitDraft(i)}
                                            className={styles.editSplitBtn}
                                            style={{ width: 28, height: 28, marginTop: 4 }}
                                            title="이 방송 제거"
                                        >
                                            －
                                        </button>
                                    )}
                                </div>
                            ))}
                            </>
                            )}
                            <button
                                onClick={addSplitDraft}
                                className={styles.editSplitBtn}
                                style={{ width: '100%', height: 34, borderRadius: 8, fontSize: 13, fontWeight: 700 }}
                            >
                                ＋ 방송 추가
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, borderTop: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af' }}>방송 타입</span>
                                <select
                                    className={styles.editSelect}
                                    value={splitEditor.type}
                                    onChange={(e) => setSplitEditor({ ...splitEditor, type: e.target.value })}
                                >
                                    <option value="stream">방송</option>
                                    <option value="off">휴방</option>
                                    <option value="collab_external">외부 합방</option>
                                    <option value="collab">내부 합방</option>
                                    <option value="collab_universe">하나비</option>
                                </select>
                            </div>
                            <button
                                onClick={applySplitDraft}
                                className={styles.editSplitBtn}
                                style={{ width: '100%', height: 38, borderRadius: 8, fontSize: 14, fontWeight: 700, background: '#ff8fab', borderColor: '#ff8fab', color: 'white' }}
                            >
                                적용
                            </button>
                        </div>
                    </BaseModal>
                );
            })()}

            {/* 셀 상세 시트 (열람 모드 클릭) */}
            <BaseModal
                isOpen={!!cellDetail}
                onClose={() => setCellDetail(null)}
                title={cellDetail?.char.name || ''}
                maxWidth="380px"
            >
                {cellDetail && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {cellDetail.char.avatarUrl && (
                                <img
                                    src={`/api/proxy/image?url=${encodeURIComponent(cellDetail.char.avatarUrl)}`}
                                    alt={cellDetail.char.name}
                                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${cellDetail.char.colorBorder || '#ffb6c1'}` }}
                                />
                            )}
                            <div>
                                <div style={{ fontSize: cellDetail.item.time, fontWeight: 800, color: cellDetail.char.colorBorder || '#333' }}>
                                    {cellDetail.item.time || '시간 미정'}
                                </div>
                                <div style={{ fontSize: 12, color: '#888', fontWeight: 700 }}>{cellDetail.char.name}</div>
                            </div>
                        </div>

                        {cellDetail.item.category && (
                            <div>
                                <span className={styles.categoryChip}>{cellDetail.item.category}</span>
                            </div>
                        )}

                        <div
                            className={styles.content}
                            style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: 10, whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cellDetail.item.content || '') }}
                        />

                        {(cellDetail.item.memos?.length || 0) > 0 && (
                            <div style={{ fontSize: 13, color: '#555', background: '#fff7fa', borderRadius: 10, padding: '8px 12px' }}>
                                💬 메모 {cellDetail.item.memos!.length}개
                                <div style={{ marginTop: 4, color: '#999', fontSize: 12 }}>
                                    {cellDetail.item.memos!.slice(-2).map(m => (
                                        <div key={m.id} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            · {m.content.replace(/<[^>]*>?/gm, '')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {cellDetail.char.cimeUrl && (
                                    <a
                                        href={`${cellDetail.char.cimeUrl.replace(/\/$/, '')}/live`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className={styles.memoBadge}
                                        style={{ position: 'static', height: 36, padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                                        title="씨미 라이브 바로가기"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src="/assets/icons/CIME-Icon-PP.png" alt="CIME" style={{ width: 16, height: 16, borderRadius: 4 }} />
                                        방송 바로가기
                                    </a>
                                )}
                                {cellDetail.item.videoUrl && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            trigger();
                                            window.open(cellDetail.item.videoUrl, '_blank');
                                        }}
                                        className={styles.editLinkBtn}
                                        style={{ width: 'auto', padding: '0 14px', borderRadius: 999, height: 36, fontSize: 13, fontWeight: 700 }}
                                    >
                                        ▶ {cellDetail.item.videoUrl.includes('ci.me') ? '씨미 다시보기' : '다시보기 보기'}
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const target = { item: cellDetail.item, charId: cellDetail.char.id };
                                    setCellDetail(null);
                                    setActiveMemoItem(target);
                                }}
                                className={styles.memoBadge}
                                style={{ position: 'static', height: 36, padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}
                            >
                                💬 메모 남기기
                            </button>
                        </div>
                    </div>
                )}
            </BaseModal>
        </div >
    );
});


ScheduleGrid.displayName = 'ScheduleGrid';

export default ScheduleGrid;
