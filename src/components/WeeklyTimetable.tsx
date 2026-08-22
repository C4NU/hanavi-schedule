"use client";

import React, { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import styles from './WeeklyTimetable.module.css';
import { WeeklySchedule, CharacterSchedule, ScheduleItem } from '@/types/schedule';
import { timeToMinutes, TIMETABLE_CONFIG, minutesToTime } from '@/utils/date';
import { splitScheduleItem } from '@/utils/time';

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

            // 1) "12:00+19:00"처럼 한 칸에 압축된 다방송을 시간대별로 분열
            //    시간이 비었거나 "??:??"여도(기본 방송 시간이 있으면) 칸을 차지한다
            const exploded: { char: CharacterSchedule; item: ScheduleItem }[] = [];
            filteredChars.forEach(char => {
                splitScheduleItem(char.schedule[day]).forEach(item => {
                    if (item.type === 'off') return;
                    const hasTime = (item.time || '').trim() !== '';
                    const hasContent = (item.content || '').trim() !== '';
                    if (!hasTime && !hasContent) return;
                    exploded.push({ char, item });
                });
            });

            // 2) 합방(collab*)은 시간 무관하게 하루 단위로 하나로 병합 (멤버별 시작 시간이 달라도)
            const collabEntries = exploded.filter(e => e.item.type?.startsWith('collab'));
            const soloEntries = exploded.filter(e => !e.item.type?.startsWith('collab'));

            if (collabEntries.length === 1) {
                grouped[day].push(collabEntries[0]);
            } else if (collabEntries.length > 1) {
                // 대표 아이템: 내용이 있는 첫 엔트리 우선, 없으면 가장 이른 시간
                const titled = collabEntries.find(e => e.item.content.trim() !== '');
                const earliest = [...collabEntries].sort((a, b) =>
                    (timeToMinutes(a.item.time) ?? timeToMinutes(a.char.defaultTime || '') ?? 1440) -
                    (timeToMinutes(b.item.time) ?? timeToMinutes(b.char.defaultTime || '') ?? 1440)
                )[0];
                const rep = titled ?? earliest;
                grouped[day].push({
                    char: {
                        id: `merged-${day}-collab`,
                        name: `합방 ${collabEntries.length}인`,
                        colorBg: '#ffeef2',
                        colorBorder: '#ff8fab',
                        colorTheme: 'white',
                        avatarUrl: '',
                        defaultTime: earliest.char.defaultTime,
                        schedule: {}
                    },
                    item: {
                        ...rep.item,
                        // 대표 표시 시간이 유효하지 않으면 기본 방송 시간으로 좌표 확보
                        time: timeToMinutes(earliest.item.time) !== null ? earliest.item.time : (earliest.char.defaultTime || earliest.item.time),
                    }
                });
            }

            // 3) 개인 방송은 같은 시간+같은 내용일 때만 병합
            const timeContentMap: { [key: string]: { char: CharacterSchedule; item: ScheduleItem }[] } = {};
            soloEntries.forEach(({ char, item }) => {
                const key = `${item.time}_${item.content}`;
                if (!timeContentMap[key]) timeContentMap[key] = [];
                timeContentMap[key].push({ char, item });
            });

            Object.values(timeContentMap).forEach(entries => {
                if (entries.length > 1) {
                    grouped[day].push({
                        char: {
                            id: `merged-${day}-${entries[0].item.time}`,
                            name: '합방',
                            colorBg: '#fffafa', // Very light lavender blush/white
                            colorBorder: '#ffb6c1',
                            colorTheme: 'white',
                            avatarUrl: '',
                            schedule: {}
                        },
                        item: {
                            ...entries[0].item,
                            // Content remains same
                        }
                    });
                } else {
                    grouped[day].push(entries[0]);
                }
            });

            // Sort by time
            grouped[day].sort((a, b) => (
                (timeToMinutes(a.item.time) ?? timeToMinutes(a.char.defaultTime || '') ?? 1440) -
                (timeToMinutes(b.item.time) ?? timeToMinutes(b.char.defaultTime || '') ?? 1440)
            ));
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

        // 블록 좌표: 아이템 시간이 유효하지 않으면("??:??" 등) 멤버 기본 방송 시간 사용
        const resolveMinutes = (entry: { char: CharacterSchedule; item: ScheduleItem }) =>
            timeToMinutes(entry.item.time) ?? timeToMinutes(entry.char.defaultTime || '');

        // Simple overlap detection (split width)
        // Group overlapping blocks
        const groups: { char: CharacterSchedule; item: ScheduleItem }[][] = [];
        let currentGroup: { char: CharacterSchedule; item: ScheduleItem }[] = [];

        schedules.forEach((current, i) => {
            if (i === 0) {
                currentGroup.push(current);
            } else {
                const last = schedules[i - 1];
                const lastStart = resolveMinutes(last);
                const currentStart = resolveMinutes(current);
                if (lastStart === null || currentStart === null) return;
                const lastEnd = lastStart + defaultDuration;

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
                const startMins = resolveMinutes(entry);
                if (startMins === null) return;
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

    const timeLabels = Array.from({ length: Math.ceil((endHour - startHour) / 2) + 1 }, (_, i) => startHour + (i * 2));

    return (
        <div className={styles.container}>
            <div className={styles.timetableWrapper}>
                {/* Header Row */}
                <div className={styles.headerRow}>
                    {DAY_LABELS.map((label, i) => (
                        <div key={i} className={styles.dayHeader}>
                            {label}
                        </div>
                    ))}
                </div>
                
                {/* Timetable Body */}
                <div className={styles.body}>
                    {/* Grid Lines */}
                    <div className={styles.gridLines}>
                        {timeLabels.map(hour => (
                            <div key={hour} className={styles.gridLine} style={{ height: rowHeight * 2 }}></div>
                        ))}
                    </div>

                    {/* Event Columns */}
                    <div className={styles.daysContainer}>
                        {DAYS.map(day => {
                            const schedules = getSchedulesWithPositions(daySchedules[day]);
                            return (
                                <div key={day} className={styles.dayColumn}>
                                    {schedules.map((entry, idx) => {
                                        const startTime = entry.item.time;
                                        
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
                                                <div className={styles.blockTime}>{startTime}</div>
                                                <div className={styles.charName}>{entry.char.name}</div>
                                                <div 
                                                    className={styles.content}
                                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(entry.item.content) }}
                                                />
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
