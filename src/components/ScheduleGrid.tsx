"use client";

import React, { useState } from 'react';
import styles from './ScheduleGrid.module.css';
import { WeeklySchedule } from '@/types/schedule';

interface Props {
    data: WeeklySchedule;
    onExport?: () => void;
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export default function ScheduleGrid({ data, onExport }: Props) {
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(
        new Set(data.characters.map(c => c.id))
    );
    const [filterOpen, setFilterOpen] = useState(false);

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

    const filteredData = {
        ...data,
        characters: data.characters.filter(c => selectedCharacters.has(c.id))
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleRow}>
                    <h1 className={styles.title}>
                        하나비 주간 스케줄표 <span className={styles.date}>{data.weekRange}</span>
                    </h1>
                    <div className={styles.controls}>
                        <button className={styles.filterButton} onClick={() => setFilterOpen(!filterOpen)}>
                            {filterOpen ? '▼' : '▶'} 필터
                        </button>
                        <button className={styles.exportButton} onClick={onExport}>
                            📥 PNG 저장
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

            <div className={styles.gridWrapper}>
                <div className={styles.grid}>
                    {/* Header Row */}
                    <div className={styles.cornerCell}></div>
                    {DAYS.map(day => (
                        <div key={day} className={styles.dayHeader}>
                            {day}
                        </div>
                    ))}

                    {/* Character Rows */}
                    {data.characters.map(char => (
                        <React.Fragment key={char.id}>
                            {/* Character Info */}
                            <div className={`${styles.charCell} ${styles[char.colorTheme]}`}>
                                <div className={styles.avatarPlaceholder}>{char.name[0]}</div>
                                <span className={styles.charName}>{char.name}</span>
                            </div>

                            {/* Schedule Cells */}
                            {DAYS.map(day => {
                                const item = filteredData.characters.find(c => c.id === char.id)?.schedule[day];
                                const isOff = item?.type === 'off' || !item;
                                const isMaybeCollab = item?.content?.includes('메이비 합방');

                                return (
                                    <div
                                        key={`${char.id}-${day}`}
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
                                                <div className={styles.content}>{item.content}</div>
                                            </>
                                        )}
                                        {isOff && <div className={styles.offText}>{item?.content || 'OFF'}</div>}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}
