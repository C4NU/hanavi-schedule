"use client";

import React, { useState, forwardRef } from 'react';
import styles from './ScheduleGrid.module.css';
import { WeeklySchedule, ScheduleItem } from '@/types/schedule';
import { generateICS } from '@/utils/ics';
import InfoModal from './InfoModal';
import MarkdownEditor from './MarkdownEditor';
import YouTubeLinkModal from './YouTubeLinkModal';
import PlatformLinkModal from './PlatformLinkModal';
import { CharacterSchedule } from '@/types/schedule';
import { useHaptics } from '@/hooks/useHaptics';
import { useSwipe } from '@/hooks/useSwipe';

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
}

import FilterPanel from './FilterPanel';
import CharacterCell from './CharacterCell';
import ScheduleCell from './ScheduleCell';
import WeeklyTimetable from './WeeklyTimetable';
import MemoPopover from './MemoPopover';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const ScheduleGrid = forwardRef<HTMLDivElement, Props>(({
    data, onExport, onPrevWeek, onNextWeek, isEditable, onCellUpdate, onCellBlur,
    headerControls, dateSelector,
    selectedCharacters: externalSelectedChars,
    onSelectionChange,
    isFilterPanelOpen: externalFilterOpen,
    onFilterPanelChange,
    viewMode = 'member',
    onMemoAdded
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
    const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
    const [platformModalOpen, setPlatformModalOpen] = useState(false);
    const [selectedCharForModal, setSelectedCharForModal] = useState<CharacterSchedule | null>(null);
    const [currentEditCell, setCurrentEditCell] = useState<{ charId: string, day: string, url: string } | null>(null);
    const [activeMemoItem, setActiveMemoItem] = useState<{ item: ScheduleItem, charId: string } | null>(null);

    // Set initial day to current day of week on mount (Client-side only to avoid hydration mismatch)
    React.useEffect(() => {
        const today = new Date().getDay(); // 0 (Sun) - 6 (Sat)
        // Convert to 0 (Mon) - 6 (Sun)
        const initialIndex = (today + 6) % 7;
        setCurrentDayIndex(initialIndex);
    }, []);

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
        setYoutubeModalOpen(true);
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

    const filteredData = {
        ...data,
        characters: data.characters.filter(c => activeSelectedChars.has(c.id))
    };

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
                const isHanaviCollab = item?.type === 'collab_hanavi' || 
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

    return (
        <div ref={ref} className={styles.exportWrapper}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.titleRow}>
                        <div className={styles.titleGroup}>
                            <h1 className={styles.title}>하나비 주간 스케줄표</h1>
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
                                    <span className={styles.date} style={{ margin: 0 }}>{data.weekRange}</span>
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
                        </div>
                        <div className={styles.controls}>
                            {headerControls ? headerControls : (
                                !isEditable && (
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
                            className={`${styles.mobileNavBtn} ${styles.prevBtn}`}
                            onClick={() => { trigger(); setCurrentDayIndex(prev => (prev - 1 + 7) % 7); }}
                            aria-label="Previous Day"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <button 
                            className={`${styles.mobileNavBtn} ${styles.nextBtn}`}
                            onClick={() => { trigger(); setCurrentDayIndex(prev => (prev + 1) % 7); }}
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
                            <div className={styles.cornerCell}></div>
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
                                        
                                        return (
                                            <ScheduleCell 
                                                key={`${char.id}-${day}`}
                                                char={char}
                                                day={day}
                                                index={index}
                                                item={char.schedule[day]}
                                                isEditable={isEditable}
                                                onCellUpdate={onCellUpdate}
                                                onCellBlur={onCellBlur}
                                                handleOpenLinkModal={handleOpenLinkModal}
                                                trigger={trigger}
                                                touchStart={touchStart}
                                                touchEnd={touchEnd}
                                                minSwipeDistance={minSwipeDistance}
                                                style={{ 
                                                    '--row-index': charIndex + 2,
                                                    '--span-size': spanSize,
                                                    '--col-index': index + 2,
                                                    gridRow: spanSize > 1 ? `var(--row-index) / span var(--span-size)` : undefined,
                                                    gridColumn: spanSize > 1 ? `var(--col-index)` : undefined
                                                } as React.CSSProperties}
                                                onMemoAdded={onMemoAdded}
                                                onMemoClick={(item, charId) => setActiveMemoItem({ item, charId })}
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Weekly Integrated View */}
                        <div className={`${styles.weeklyViewWrapper} ${viewMode === 'weekly' ? styles.activeView : styles.inactiveView}`}>
                            <WeeklyTimetable 
                                data={data} 
                                selectedCharacters={activeSelectedChars}
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
                    </div>
                </div >
            </div >

            <InfoModal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
            <YouTubeLinkModal
                isOpen={youtubeModalOpen}
                onClose={() => setYoutubeModalOpen(false)}
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
                    memos={activeMemoItem.item.memos || []}
                    charId={activeMemoItem.charId}
                    onClose={() => setActiveMemoItem(null)}
                    onMemoAdded={() => {
                        onMemoAdded?.();
                        // Optional: close or keep open. Let's keep open but refresh happens via parent.
                    }}
                />
            )}
        </div >
    );
});


ScheduleGrid.displayName = 'ScheduleGrid';

export default ScheduleGrid;
