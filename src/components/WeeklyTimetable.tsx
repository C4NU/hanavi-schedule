"use client";

import ReplayIcon from './ReplayIcon';
import { scheduleReplays } from '@/utils/scheduleReplay';
import React, { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import styles from './WeeklyTimetable.module.css';
import loadingStyles from './ScheduleSkeleton.module.css';
import { WeeklySchedule, CharacterSchedule, ScheduleItem } from '@/types/schedule';
import { timeToMinutes, TIMETABLE_CONFIG, minutesToTime } from '@/utils/date';
import { splitScheduleItem } from '@/utils/time';
import { ScheduleTheme } from '@/hooks/useScheduleTheme';
import { getV2BroadcastGradient, V2_CELL_COLOR_OVERRIDES, V2_COLLAB_ACCENT } from '@/data/v2ContentColors';

interface Props {
    data: WeeklySchedule;
    selectedCharacters: Set<string>;
    loading?: boolean;
    onItemClick?: (char: CharacterSchedule, item: ScheduleItem, day: string) => void;
    theme?: ScheduleTheme;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const LOADING_HOURS = [[2, 8], [4], [2, 6], [5], [3, 8], [6], [4, 10]];

const WeeklyTimetable: React.FC<Props> = ({ data, selectedCharacters, loading = false, onItemClick, theme = 'classic' }) => {
    const isV2 = theme === 'v2';
    const { startHour, endHour, rowHeight, defaultDuration } = TIMETABLE_CONFIG;
    const startMinutes = startHour * 60;

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

            // 2) 이벤트 ID가 같은 합방만 하나의 블록으로 병합한다.
            // 서로 다른 일요일 합방을 하루 전체로 합치지 않는다.
            const eventGroups = new Map<string, { char: CharacterSchedule; item: ScheduleItem }[]>();
            const unkeyedCollabs: { char: CharacterSchedule; item: ScheduleItem }[] = [];
            const soloEntries: { char: CharacterSchedule; item: ScheduleItem }[] = [];

            exploded.forEach((entry) => {
                if (!entry.item.type?.startsWith('collab')) {
                    soloEntries.push(entry);
                    return;
                }
                if (!entry.item.eventId) {
                    unkeyedCollabs.push(entry);
                    return;
                }
                const entries = eventGroups.get(`${entry.item.eventId}|${entry.item.time}`) || [];
                entries.push(entry);
                eventGroups.set(`${entry.item.eventId}|${entry.item.time}`, entries);
            });

            eventGroups.forEach((entries) => {
                const titled = entries.find((entry) => entry.item.content.trim() !== '');
                const earliest = [...entries].sort((a, b) =>
                    (timeToMinutes(a.item.time) ?? timeToMinutes(a.char.defaultTime || '') ?? 1440) -
                    (timeToMinutes(b.item.time) ?? timeToMinutes(b.char.defaultTime || '') ?? 1440)
                )[0];
                const rep = titled ?? earliest;
                grouped[day].push({
                    char: {
                        id: `merged-${day}-${entries[0].item.eventId}-${entries[0].item.time}`,
                        name: `합방 ${entries.map(entry => entry.char.name).join('·')}`,
                        colorBg: '#ffeef2',
                        colorBorder: '#ff8fab',
                        colorTheme: 'white',
                        avatarUrl: '',
                        defaultTime: earliest.char.defaultTime,
                        schedule: {}
                    },
                    item: {
                        ...rep.item,
                        eventId: entries[0].item.eventId,
                        time: timeToMinutes(earliest.item.time) !== null ? earliest.item.time : (earliest.char.defaultTime || earliest.item.time),
                    }
                });
            });

            // Legacy cells without event IDs stay visible individually until
            // they are migrated; they must not be guessed into one event.
            grouped[day].push(...unkeyedCollabs, ...soloEntries);

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

        const groups: { char: CharacterSchedule; item: ScheduleItem; start: number }[][] = [];
        let previousStart = -Infinity;
        for (const entry of schedules) {
            const start = timeToMinutes(entry.item.time) ?? timeToMinutes(entry.char.defaultTime || '');
            if (start === null) continue;
            if (start >= previousStart + defaultDuration) groups.push([]);
            groups.at(-1)?.push({ ...entry, start });
            previousStart = start;
        }

        // Process each group to assign widths
        groups.forEach(group => {
            group.forEach((entry, idx) => {
                // Clamp to timetable range
                const relativeStart = Math.max(0, entry.start - startMinutes);
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

    const positionedSchedules = DAYS.map(day => getSchedulesWithPositions(daySchedules[day]));
    const labelInterval = rowHeight * 2;
    const lastCardBottom = Math.max(0, ...positionedSchedules.flatMap(day => day.map(entry => entry.top + entry.height)));
    const v2Height = Math.max(8 * rowHeight, loading ? 12 * rowHeight : 0,
        Math.ceil(lastCardBottom / labelInterval) * labelInterval + 12);
    const timeLabels = Array.from({ length: isV2 ? Math.ceil(v2Height / labelInterval) : Math.ceil((endHour - startHour) / 2) + 1 },
        (_, index) => startHour + index * 2);

    return (
        <div className={styles.container} data-theme={theme}>
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
                <div className={styles.body} style={isV2 ? { height: v2Height } : undefined}>
                    {/* Grid Lines */}
                    <div className={styles.gridLines}>
                        {timeLabels.map(hour => (
                            <div key={hour} className={styles.gridLine} style={{ height: rowHeight * 2 }}></div>
                        ))}
                    </div>

                    {/* Event Columns */}
                    <div className={styles.daysContainer}>
                        {DAYS.map((day, dayIndex) => {
                            const schedules = positionedSchedules[dayIndex];
                            return (
                                <div key={day} className={styles.dayColumn}>
                                    {loading && LOADING_HOURS[dayIndex].map(hour => (
                                        <div
                                            key={hour}
                                            className={`${styles.scheduleBlock} ${loadingStyles.weeklyBlock}`}
                                            style={{ top: hour * rowHeight, height: defaultDuration / 60 * rowHeight }}
                                        >
                                            <div className={loadingStyles.time} />
                                            <div className={loadingStyles.title} />
                                        </div>
                                    ))}
                                    {schedules.map((entry, idx) => {
                                        const startTime = entry.item.time;
                                        const isCollabBlock = !!entry.item.type?.startsWith('collab') || entry.char.id.startsWith('merged-');
                                        const palette = isV2 && !isCollabBlock ? V2_CELL_COLOR_OVERRIDES[entry.char.id] : undefined;

                                        const blockStyle: React.CSSProperties = {
                                            top: entry.top,
                                            height: entry.height,
                                            left: entry.left,
                                            width: entry.width,
                                            zIndex: entry.zIndex,
                                        };
                                        if (isV2) {
                                            // v2: 세로 그라데이션 카드, 합방은 흰색→키컬러 그라데이션 + 진한 핑크 텍스트
                                            blockStyle.backgroundImage = getV2BroadcastGradient(entry.char.id, entry.char.colorBg, isCollabBlock);
                                            blockStyle.border = 'none';
                                            blockStyle.color = isCollabBlock ? V2_COLLAB_ACCENT.color : (palette?.time || entry.char.colorBorder || '#333');
                                        } else {
                                            blockStyle.backgroundColor = entry.char.colorBg || '#fff';
                                            blockStyle.borderColor = entry.char.colorBorder || '#ddd';
                                            blockStyle.color = entry.char.colorBorder || '#333';
                                        }

                                        return (
                                            <div
                                                key={`${entry.char.id}-${idx}`}
                                                className={`${styles.scheduleBlock} ${isV2 && isCollabBlock ? styles.collabBlock : ''}`}
                                                style={blockStyle}
                                                onClick={() => onItemClick?.(entry.char, entry.item, day)}
                                            >
                                                <div className={styles.blockTime}>
                                                    {startTime}
                                                    {scheduleReplays(entry.item).length > 0 && (
                                                        <span role="img" aria-label="다시보기 있음" title="다시보기 있음"><ReplayIcon size={12} /></span>
                                                    )}
                                                </div>
                                                <div className={styles.charName}>{entry.char.name}</div>
                                                <div 
                                                    className={styles.content}
                                                    style={palette?.content ? { color: palette.content } : undefined}
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
