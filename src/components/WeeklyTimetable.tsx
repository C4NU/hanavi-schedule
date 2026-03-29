"use client";

import React, { useMemo } from 'react';
import styles from './WeeklyTimetable.module.css';
import { WeeklySchedule, CharacterSchedule, ScheduleItem } from '@/types/schedule';
import { timeToMinutes, TIMETABLE_CONFIG, minutesToTime } from '@/utils/date';

interface Props {
    data: WeeklySchedule;
    selectedCharacters: Set<string>;
    onItemClick?: (char: CharacterSchedule, item: ScheduleItem) => void;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const WeeklyTimetable: React.FC<Props> = ({ data, selectedCharacters, onItemClick }) => {
    const { startHour, endHour, rowHeight, defaultDuration } = TIMETABLE_CONFIG;
    const startMinutes = startHour * 60;
    const totalMinutes = (endHour - startHour) * 60;

    // Filter and group schedules by day
    const daySchedules = useMemo(() => {
        const filteredChars = data.characters.filter(c => selectedCharacters.has(c.id));
        const grouped: { [key: string]: { char: CharacterSchedule; item: ScheduleItem }[] } = {};

        DAYS.forEach(day => {
            grouped[day] = [];
            filteredChars.forEach(char => {
                const item = char.schedule[day];
                if (item && item.time && item.type !== 'off') {
                    grouped[day].push({ char, item });
                }
            });

            // Sort by time
            grouped[day].sort((a, b) => timeToMinutes(a.item.time) - timeToMinutes(b.item.time));
        });

        return grouped;
    }, [data, selectedCharacters]);

    // Function to calculate overlapping groups and positions
    const getSchedulesWithPositions = (schedules: { char: CharacterSchedule; item: ScheduleItem }[]) => {
        const result: { 
            char: CharacterSchedule; 
            item: ScheduleItem; 
            top: number; 
            height: number; 
            left: string; 
            width: string; 
            zIndex: number;
        }[] = [];

        // Simple overlap detection (split width)
        // Group overlapping blocks
        const groups: { char: CharacterSchedule; item: ScheduleItem }[][] = [];
        let currentGroup: { char: CharacterSchedule; item: ScheduleItem }[] = [];

        schedules.forEach((current, i) => {
            if (i === 0) {
                currentGroup.push(current);
            } else {
                const last = schedules[i - 1];
                const lastEnd = timeToMinutes(last.item.time) + defaultDuration;
                const currentStart = timeToMinutes(current.item.time);

                if (currentStart < lastEnd) {
                    currentGroup.push(current);
                } else {
                    groups.push(currentGroup);
                    currentGroup = [current];
                }
            }
        });
        if (currentGroup.length > 0) groups.push(currentGroup);

        // Process each group to assign widths
        groups.forEach(group => {
            group.forEach((entry, idx) => {
                const startMins = timeToMinutes(entry.item.time);
                // Clamp to timetable range
                const relativeStart = Math.max(0, startMins - startMinutes);
                const top = (relativeStart / 60) * rowHeight;
                const height = (defaultDuration / 60) * rowHeight;
                
                const widthVal = 100 / group.length;
                const leftVal = widthVal * idx;

                result.push({
                    char: entry.char,
                    item: entry.item,
                    top,
                    height,
                    width: `${widthVal}%`,
                    left: `${leftVal}%`,
                    zIndex: 10 + idx,
                });
            });
        });

        return result;
    };

    const timeLabels = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    return (
        <div className={styles.container}>
            <div className={styles.timetableWrapper}>
                {/* Header Row */}
                <div className={styles.headerRow}>
                    <div className={styles.corner}></div>
                    {DAY_LABELS.map((label, i) => (
                        <div key={i} className={styles.dayHeader}>
                            {label}
                        </div>
                    ))}
                </div>

                {/* Timetable Body */}
                <div className={styles.body}>
                    {/* Time Scale */}
                    <div className={styles.timeColumn}>
                        {timeLabels.map(hour => (
                            <div key={hour} className={styles.timeLabel} style={{ height: rowHeight }}>
                                {hour > 23 ? `새벽 ${hour - 24}:00` : `${hour}:00`}
                            </div>
                        ))}
                    </div>

                    {/* Grid Lines */}
                    <div className={styles.gridLines}>
                        {timeLabels.map(hour => (
                            <div key={hour} className={styles.gridLine} style={{ height: rowHeight }}></div>
                        ))}
                    </div>

                    {/* Event Columns */}
                    <div className={styles.daysContainer}>
                        {DAYS.map(day => {
                            const schedules = getSchedulesWithPositions(daySchedules[day]);
                            return (
                                <div key={day} className={styles.dayColumn}>
                                    {schedules.map((entry, idx) => {
                                        const startTime = timeToMinutes(entry.item.time);
                                        const endTimeStr = minutesToTime(startTime + defaultDuration);
                                        
                                        return (
                                            <div
                                                key={`${entry.char.id}-${idx}`}
                                                className={styles.scheduleBlock}
                                                style={{
                                                    top: entry.top,
                                                    height: entry.height,
                                                    left: entry.left,
                                                    width: entry.width,
                                                    zIndex: entry.zIndex,
                                                    backgroundColor: entry.char.colorBg || '#fff',
                                                    borderColor: entry.char.colorBorder || '#ddd',
                                                    color: entry.char.colorBorder || '#333',
                                                }}
                                                onClick={() => onItemClick?.(entry.char, entry.item)}
                                            >
                                                <div className={styles.charName}>{entry.char.name}</div>
                                                <div 
                                                    className={styles.content}
                                                    dangerouslySetInnerHTML={{ __html: entry.item.content }}
                                                />
                                                <div className={styles.timeRange}>
                                                    {entry.item.time} - {endTimeStr}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklyTimetable;
