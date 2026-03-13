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
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const ScheduleGrid = forwardRef<HTMLDivElement, Props>(({
    data, onExport, onPrevWeek, onNextWeek, isEditable, onCellUpdate, onCellBlur,
    headerControls, dateSelector,
    // Destructure new props
    selectedCharacters: externalSelectedChars,
    onSelectionChange,
    isFilterPanelOpen: externalFilterOpen,
    onFilterPanelChange
}, ref) => {
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
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
    const [platformModalOpen, setPlatformModalOpen] = useState(false);
    const [selectedCharForModal, setSelectedCharForModal] = useState<CharacterSchedule | null>(null);
    const [currentEditCell, setCurrentEditCell] = useState<{ charId: string, day: string, url: string } | null>(null);

    // Set initial day to current day of week on mount (Client-side only to avoid hydration mismatch)
    React.useEffect(() => {
        const today = new Date().getDay(); // 0 (Sun) - 6 (Sat)
        // Convert to 0 (Mon) - 6 (Sun)
        const initialIndex = (today + 6) % 7;
        setCurrentDayIndex(initialIndex);
    }, []);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            // Next day
            setCurrentDayIndex(prev => (prev + 1) % 7);
        }
        if (isRightSwipe) {
            // Previous day
            setCurrentDayIndex(prev => (prev - 1 + 7) % 7);
        }
    };

    const handleToggle = (charId: string) => {
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
        const allChars = new Set(data.characters.map(c => c.id));
        if (onSelectionChange) {
            onSelectionChange(allChars);
        } else {
            setInternalSelectedChars(allChars);
        }
    };

    const handleDeselectAll = () => {
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
        document.body.removeChild(link);
    };

    const filteredData = {
        ...data,
        characters: data.characters.filter(c => activeSelectedChars.has(c.id))
    };

    const handleFilterToggle = () => {
        if (onFilterPanelChange) {
            onFilterPanelChange(!activeFilterOpen);
        } else {
            setInternalFilterOpen(!internalFilterOpen);
        }
    };

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
                                        style={{
                                            background: 'none', border: '1px solid #ffb6c1', borderRadius: '50%',
                                            width: '30px', height: '30px', cursor: 'pointer', color: '#ffb6c1',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                        }}
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
                                        style={{
                                            background: 'none', border: '1px solid #ffb6c1', borderRadius: '50%',
                                            width: '30px', height: '30px', cursor: 'pointer', color: '#ffb6c1',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                        }}
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
                                        <button className={styles.mobileMenuBtn} onClick={() => setIsMenuOpen(!isMenuOpen)}>
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

                    {
                        activeFilterOpen && (
                            // ... existing filter panel
                            <div className={styles.filterPanel}>
                                <div className={styles.quickActions}>
                                    <button onClick={handleSelectAll} className={styles.quickButton}>전체 선택</button>
                                    <button onClick={handleDeselectAll} className={styles.quickButton}>전체 해제</button>
                                </div>
                                <div className={styles.checkboxGrid}>
                                    {data.characters.map(char => (
                                        <label key={char.id} className={`${styles.checkbox} ${activeSelectedChars.has(char.id) ? styles[char.colorTheme] : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={activeSelectedChars.has(char.id)}
                                                onChange={() => handleToggle(char.id)}
                                            />
                                            <span>{char.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )
                    }
                </header >

                {/* ... existing grid */}
                < div
                    className={styles.gridWrapper}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <div
                        className={`${styles.grid} ${isEditable ? styles.editing : ''}`}
                        data-current-day={currentDayIndex}
                        data-char-count={filteredData.characters.length}
                        style={{ '--char-count': filteredData.characters.length } as React.CSSProperties}
                    >
                        {/* Header Row */}
                        <div className={styles.cornerCell}></div>
                        {DAYS.map((day, index) => (
                            <div
                                key={day}
                                className={styles.dayHeader}
                                data-day-index={index}
                            >
                                {day}
                            </div>
                        ))}

                        {/* Character Rows */}
                        {filteredData.characters.map(char => (
                            <React.Fragment key={char.id}>
                                {/* Character Info */}
                                <div
                                    className={`${styles.charCell} ${styles[char.colorTheme] || ''}`}
                                    style={{
                                        ...(char.avatarUrl ? {
                                            backgroundImage: `url(${char.avatarUrl.startsWith('http')
                                                ? `/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`
                                                : char.avatarUrl
                                                })`
                                        } : {}),
                                        ...(char.colorBg ? { backgroundColor: char.colorBg } : {}),
                                        ...(char.colorBorder ? { borderColor: char.colorBorder } : {}),
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => handleOpenPlatformModal(char)}
                                >
                                    {!char.avatarUrl && (
                                        <div className={styles.avatarPlaceholder}>{char.name[0]}</div>
                                    )}
                                    <div className={styles.nameOverlay}>{char.name}</div>
                                </div>

                                {/* Schedule Cells */}
                                {DAYS.map((day, index) => {
                                    const item = char.schedule[day];
                                    // In Edit Mode, we treat empty items as Stream (default inputs), so only explicit 'off' is Off.
                                    // In View Mode, empty items are Off.
                                    const isOff = item?.type === 'off' || (!item && !isEditable);
                                    // Determine special class based on type
                                    let specialClass = '';
                                    if (item?.type === 'collab_maivi') specialClass = styles.collab_maivi;
                                    else if (item?.type === 'collab_hanavi') specialClass = styles.collab_hanavi;
                                    else if (item?.type === 'collab_universe') specialClass = styles.collab_universe;
                                    else if (item?.type === 'collab') specialClass = styles.collab;
                                    // Backward compatibility for content string
                                    else if (item?.content?.includes('메이비 합방')) specialClass = styles.collab_maivi;

                                    const isPreparing = item?.content?.includes('스케쥴 준비중');

                                    // Dynamic Text Sizing Logic
                                    const textLen = item?.content?.length || 0;
                                    let textSizeClass = '';
                                    if (textLen > 90) textSizeClass = styles.textSizeXXS;
                                    else if (textLen > 60) textSizeClass = styles.textSizeXS;
                                    else if (textLen > 30) textSizeClass = styles.textSizeS;

                                    // Dynamic User Styles
                                    const dynamicStyle: React.CSSProperties = {};
                                    if (!isOff && char.colorBg) dynamicStyle.backgroundColor = char.colorBg;
                                    if (!isOff && char.colorBorder) dynamicStyle.borderColor = char.colorBorder;

                                    // Fallback text color for time if custom border color is set (assuming border matches text color usually)
                                    // CSS Module doesn't easily support dynamic inner classes, so we might need inline styles for children if we want perfect match.
                                    // For now, let's just apply border/bg.

                                    return (
                                        <div
                                            key={`${char.id}-${day}`}
                                            data-day-index={index}
                                            className={`
                                                ${styles.scheduleCell}
                                                ${styles[char.colorTheme] || ''}
                                                ${isOff ? styles.off : ''}
                                                ${specialClass}
                                                ${item?.videoUrl && !isEditable ? styles.hasLink : ''}
                                            `}
                                            style={dynamicStyle}
                                            onClick={(e) => {
                                                // Prevent click if it might be a swipe (basic check)
                                                // The swipe logic uses touch events on the parent.
                                                // If touchEnd is populated and distance is large, it's a swipe.
                                                // However, touchEnd might be null on simple tap.
                                                const isSwipe = touchStart && touchEnd && Math.abs(touchStart - touchEnd) > minSwipeDistance;
                                                if (!isSwipe && item?.videoUrl && !isEditable) {
                                                    // Stop propagation to prevent grid swipes if needed, mainly for UX
                                                    // e.stopPropagation(); 
                                                    window.open(item.videoUrl, '_blank');
                                                }
                                            }}
                                        >
                                            {isEditable ? (
                                                // EDIT MODE
                                                <>
                                                    <div className={styles.editTimeRow}>
                                                        <input
                                                            className={styles.editInput}
                                                            value={item?.time || ''}
                                                            onChange={(e) => onCellUpdate?.(char.id, day, 'time', e.target.value)}
                                                            onBlur={(e) => onCellBlur?.(char.id, day, 'time', e.target.value)}
                                                            placeholder="시간"
                                                        />
                                                        <button
                                                            className={`${styles.editLinkBtn} ${item?.videoUrl ? styles.hasLink : ''}`}
                                                            onClick={() => handleOpenLinkModal(char.id, day, item?.videoUrl || '')}
                                                            title="YouTube 링크 연결"
                                                        >
                                                            {item?.videoUrl ? 'YT' : '🔗'}
                                                        </button>
                                                    </div>
                                                    <MarkdownEditor
                                                        className={styles.editTextArea}
                                                        value={item?.content || ''}
                                                        onChange={(val) => onCellUpdate?.(char.id, day, 'content', val)}
                                                        placeholder="컨텐츠"
                                                    />
                                                    <select
                                                        className={styles.editSelect}
                                                        value={item?.type || 'stream'}
                                                        onChange={(e) => onCellUpdate?.(char.id, day, 'type', e.target.value)}
                                                    >
                                                        <option value="stream">방송</option>
                                                        <option value="off">휴방</option>
                                                        <option value="collab">합방</option>
                                                        <option value="collab_maivi">메이비</option>
                                                        <option value="collab_hanavi">하나비</option>
                                                        <option value="collab_universe">유니버스</option>
                                                    </select>
                                                </>
                                            ) : (
                                                // VIEW MODE
                                                <>
                                                    {item && !isOff && (
                                                        <>
                                                            <div className={styles.time}>{item.time}</div>
                                                            {item.videoUrl && (
                                                                <div
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: '4px',
                                                                        right: '4px',
                                                                        width: '16px',
                                                                        height: '16px',
                                                                        zIndex: 5
                                                                    }}
                                                                    title="다시보기 링크"
                                                                >
                                                                    <svg viewBox="0 0 24 24" fill="#FF0000">
                                                                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                            <div className={`${styles.content} ${isPreparing ? styles.preparing : ''} ${textSizeClass}`}>
                                                                {isPreparing ? (
                                                                    <>
                                                                        스케쥴 준비중<br />
                                                                        <span className={styles.noBreak}>|･ω･)</span>
                                                                    </>
                                                                ) : (
                                                                    <div
                                                                        className={`
                                                                            ${item.content.length > 50 ? styles.textSizeS : ''}
                                                                            ${item.content.length > 80 ? styles.textSizeXS : ''}
                                                                            ${item.content.length > 120 ? styles.textSizeXXS : ''}
                                                                        `}
                                                                        dangerouslySetInnerHTML={{ __html: item.content }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                    {isOff && <div className={`${styles.offText} ${isPreparing ? styles.preparing : ''}`}>
                                                        {isPreparing ? (
                                                            <>
                                                                스케쥴 준비중<br />
                                                                <span className={styles.noBreak}>|･ω･)</span>
                                                            </>
                                                        ) : (
                                                            '휴방'
                                                        )}
                                                    </div>}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
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
        </div >
    );
});

ScheduleGrid.displayName = 'ScheduleGrid';

export default ScheduleGrid;
