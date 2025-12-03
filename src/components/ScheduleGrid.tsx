"use client";

import React, { useState, forwardRef } from 'react';
import styles from './ScheduleGrid.module.css';
import { WeeklySchedule } from '@/types/schedule';

import { generateICS } from '@/utils/ics';

interface Props {
    data: WeeklySchedule;
    onExport?: () => void;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const ScheduleGrid = forwardRef<HTMLDivElement, Props>(({ data, onExport }, ref) => {
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(
        new Set(data.characters.map(c => c.id))
    );
    const [filterOpen, setFilterOpen] = useState(false);
    const [currentDayIndex, setCurrentDayIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

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
                            <span className={styles.date}>{data.weekRange}</span>
                        </div>
                        <div className={styles.controls}>
                            <button className={styles.filterButton} onClick={() => setFilterOpen(!filterOpen)}>
                                {filterOpen ? '▼' : '▶'} 필터
                            </button>
                            <button className={styles.exportButton} onClick={handleDownloadCalendar}>
                                📅 캘린더 추가
                            </button>
                            <button className={styles.exportButton} onClick={onExport}>
                                📥 이미지로 저장
                            </button>
                        </div>
                    </div>

                    {filterOpen && (
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
                    )}
                </header>

                <div
                    className={styles.gridWrapper}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <div
                        className={styles.grid}
                        data-current-day={currentDayIndex}
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
                                    <div className={styles.avatarPlaceholder}>{char.name[0]}</div>
                                    <span className={styles.charName}>{char.name}</span>
                                </a>

                                {/* Schedule Cells */}
                                {DAYS.map((day, index) => {
                                    const item = char.schedule[day];
                                    const isOff = item?.type === 'off' || !item;
                                    const isMaybeCollab = item?.content?.includes('메이비 합방');
                                    const isPreparing = item?.content?.includes('스케쥴 준비중');

                                    return (
                                        <div
                                            key={`${char.id}-${day}`}
                                            data-day-index={index}
                                            className={`
                                                ${styles.scheduleCell}
                                                ${styles[char.colorTheme]}
                                                ${isOff ? styles.off : ''}
                                                ${isMaybeCollab ? styles.maybeCollab : ''}
                                            `}
                                        >
                                            {item && !isOff && (
                                                <>
                                                    <div className={styles.time}>{item.time}</div>
                                                    <div className={`${styles.content} ${isPreparing ? styles.preparing : ''}`}>
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
                                                    item?.content || 'OFF'
                                                )}
                                            </div>}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

ScheduleGrid.displayName = 'ScheduleGrid';

export default ScheduleGrid;
