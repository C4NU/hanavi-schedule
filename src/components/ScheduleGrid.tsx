"use client";

import React, { useState, forwardRef } from 'react';
import styles from './ScheduleGrid.module.css';
import { WeeklySchedule, ScheduleItem } from '@/types/schedule';
import { generateICS } from '@/utils/ics';
import InfoModal from './InfoModal';

interface Props {
    data: WeeklySchedule;
    onExport?: () => void;
    onPrevWeek?: () => void;
    onNextWeek?: () => void;
    isEditable?: boolean;
    onCellUpdate?: (charId: string, day: string, field: keyof ScheduleItem, value: string) => void;
    onCellBlur?: (charId: string, day: string, field: keyof ScheduleItem, value: string) => void;
    headerControls?: React.ReactNode;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const ScheduleGrid = forwardRef<HTMLDivElement, Props>(({ data, onExport, onPrevWeek, onNextWeek, isEditable, onCellUpdate, onCellBlur, headerControls }, ref) => {
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(
        new Set(data.characters.map(c => c.id))
    );
    const [filterOpen, setFilterOpen] = useState(false);
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    const [currentDayIndex, setCurrentDayIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        const newSelected = new Set(selectedCharacters);
        if (newSelected.has(charId)) {
            newSelected.delete(charId);
        } else {
            newSelected.add(charId);
        }
        setSelectedCharacters(newSelected);
    };

    const handleSelectAll = () => {
        setSelectedCharacters(new Set(data.characters.map(c => c.id)));
    };

    const handleDeselectAll = () => {
        setSelectedCharacters(new Set());
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
        characters: data.characters.filter(c => selectedCharacters.has(c.id))
    };

    return (
        <div ref={ref} className={styles.exportWrapper}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.titleRow}>
                        <div className={styles.titleGroup}>
                            <h1 className={styles.title}>하나비 주간 스케줄표</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {onPrevWeek && (
                                    <button
                                        onClick={onPrevWeek}
                                        style={{
                                            background: 'none', border: '1px solid #ffb6c1', borderRadius: '50%',
                                            width: '30px', height: '30px', cursor: 'pointer', color: '#ffb6c1',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                        }}
                                        aria-label="Previous Week"
                                    >◀</button>
                                )}
                                <span className={styles.date} style={{ margin: 0 }}>{data.weekRange}</span>
                                {onNextWeek && (
                                    <button
                                        onClick={onNextWeek}
                                        style={{
                                            background: 'none', border: '1px solid #ffb6c1', borderRadius: '50%',
                                            width: '30px', height: '30px', cursor: 'pointer', color: '#ffb6c1',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                        }}
                                        aria-label="Next Week"
                                    >▶</button>
                                )}
                            </div>
                        </div>
                        <div className={styles.controls}>
                            {headerControls ? headerControls : (
                                !isEditable && (
                                    <>
                                        <button className={styles.mobileMenuBtn} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                                            ☰ 메뉴
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
                                                    <button className={styles.dropdownItem} onClick={() => { setIsMenuOpen(false); setFilterOpen(!filterOpen); }}>
                                                        {filterOpen ? '▼' : '▶'} 필터 설정
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
                                            <button className={`${styles.filterButton} ${styles.fullWidth}`} onClick={() => setFilterOpen(!filterOpen)}>
                                                {filterOpen ? '▼' : '▶'} 필터
                                            </button>
                                        </div>
                                    </>
                                )
                            )}
                        </div>
                    </div>

                    {
                        filterOpen && (
                            // ... existing filter panel
                            <div className={styles.filterPanel}>
                                <div className={styles.quickActions}>
                                    <button onClick={handleSelectAll} className={styles.quickButton}>전체 선택</button>
                                    <button onClick={handleDeselectAll} className={styles.quickButton}>전체 해제</button>
                                </div>
                                <div className={styles.checkboxGrid}>
                                    {data.characters.map(char => (
                                        <label key={char.id} className={styles.checkbox}>
                                            <input
                                                type="checkbox"
                                                checked={selectedCharacters.has(char.id)}
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
                                <a
                                    href={char.chzzkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${styles.charCell} ${styles[char.colorTheme]}`}
                                >
                                    {char.avatarUrl ? (
                                        <img
                                            src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`}
                                            alt={char.name}
                                            className={styles.avatarImage}
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className={styles.avatarPlaceholder}>{char.name[0]}</div>
                                    )}
                                    <span className={styles.charName}>{char.name}</span>
                                </a>

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

                                    return (
                                        <div
                                            key={`${char.id}-${day}`}
                                            data-day-index={index}
                                            className={`
                                                ${styles.scheduleCell}
                                                ${styles[char.colorTheme]}
                                                ${isOff ? styles.off : ''}
                                                ${specialClass}
                                            `}
                                        >
                                            {isEditable ? (
                                                // EDIT MODE
                                                <>
                                                    <input
                                                        className={styles.editInput}
                                                        value={item?.time || ''}
                                                        onChange={(e) => onCellUpdate?.(char.id, day, 'time', e.target.value)}
                                                        onBlur={(e) => onCellBlur?.(char.id, day, 'time', e.target.value)}
                                                        placeholder="시간"
                                                    />
                                                    <textarea
                                                        className={styles.editTextArea}
                                                        value={item?.content || ''}
                                                        onChange={(e) => onCellUpdate?.(char.id, day, 'content', e.target.value)}
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
                                                            <div className={`${styles.content} ${isPreparing ? styles.preparing : ''} ${textSizeClass}`}>
                                                                {isPreparing ? (
                                                                    <>
                                                                        스케쥴 준비중<br />
                                                                        <span className={styles.noBreak}>|･ω･)</span>
                                                                    </>
                                                                ) : (
                                                                    item.content
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
        </div >
    );
});

ScheduleGrid.displayName = 'ScheduleGrid';

export default ScheduleGrid;
