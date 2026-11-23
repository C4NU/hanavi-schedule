"use client";

import React, { useState, useRef, forwardRef } from 'react';
import styles from './ScheduleGrid.module.css';
import headerStyles from './ScheduleHeader.module.css';
import adminStyles from './admin/AdminSchedule.module.css';
import detailStyles from './ScheduleCellDetail.module.css';
import { MenuIcon } from './MobileScheduleMenu';
import { WeeklySchedule, ScheduleItem } from '@/types/schedule';
import { V2_COLLAB_ACCENT } from '@/data/v2ContentColors';
import { generateICS } from '@/utils/ics';
import InfoModal from './InfoModal';
import MarkdownEditor from './MarkdownEditor';
import VideoLinkModal from './VideoLinkModal';
import PlatformLinkModal from './PlatformLinkModal';
import { CharacterSchedule } from '@/types/schedule';
import { useHaptics } from '@/hooks/useHaptics';
import { useSwipe } from '@/hooks/useSwipe';
import { splitScheduleItem, addTimePart, normalizeTimePart } from '@/utils/time';
import { formatWeekRangeShort } from '@/utils/date';
import { ScheduleTheme } from '@/hooks/useScheduleTheme';
import { isCollaborationType, normalizeEventType } from '@/utils/events';
import { getLegacyCollaborationMemberIds } from '@/utils/scheduleEditor';
import type { CollaborationUpdate } from '@/utils/scheduleEditor';

interface Props {
    data: WeeklySchedule;
    /** Full member source for collaboration fan-out when the visible grid is filtered. */
    collaborationCharacters?: CharacterSchedule[];
    onExport?: () => void;
    onPrevWeek?: () => void;
    onNextWeek?: () => void;
    isEditable?: boolean;
    onCellUpdate?: (charId: string, day: string, field: keyof ScheduleItem, value: string) => void;
    onPartUpdate?: (charId: string, day: string, partIndex: number, field: keyof ScheduleItem, value: string) => void;
    onAddPart?: (charId: string, day: string) => void;
    onCollabUpdate?: (update: CollaborationUpdate) => void;
    onCellBlur?: (charId: string, day: string, field: keyof ScheduleItem, value: string) => void;
    headerControls?: React.ReactNode;
    mobileTitleAction?: React.ReactNode;
    dateSelector?: React.ReactNode;
    // New props for external filter control
    selectedCharacters?: Set<string>;
    requestedDay?: { index: number };
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
    data, collaborationCharacters: collaborationCharactersProp, onExport, onPrevWeek, onNextWeek, isEditable, onCellUpdate, onPartUpdate, onAddPart, onCollabUpdate, onCellBlur,
    headerControls, mobileTitleAction, dateSelector,
    selectedCharacters: externalSelectedChars, requestedDay,
    onSelectionChange,
    isFilterPanelOpen: externalFilterOpen,
    onFilterPanelChange,
    viewMode = 'member',
    onMemoAdded,
    theme = 'classic'
}, ref) => {
    const { trigger } = useHaptics();
    const collaborationCharacters = collaborationCharactersProp ?? data.characters;
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
    const [cellDetail, setCellDetail] = useState<{ char: CharacterSchedule; item: ScheduleItem; day: string } | null>(null);
    const gridWrapper = useRef<HTMLDivElement>(null);
    const detailDescription = useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const copyScheduleText = (event: ClipboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
            const selection = document.getSelection();
            if (!selection || selection.isCollapsed || !event.clipboardData) return;
            const { anchorNode, focusNode } = selection;
            const insideSchedule = [gridWrapper.current, detailDescription.current].some(
                element => element?.contains(anchorNode) && element.contains(focusNode),
            );
            if (!insideSchedule) return;
            event.clipboardData.setData('text/plain', selection.toString());
            event.preventDefault();
        };
        document.addEventListener('copy', copyScheduleText);
        return () => document.removeEventListener('copy', copyScheduleText);
    }, []);

    const detailEvent = cellDetail?.item.eventId
        ? data.events?.find(event => event.id === cellDetail.item.eventId)
        : undefined;
    const isDetailCollab = isCollaborationType(detailEvent?.type) || isCollaborationType(cellDetail?.item.type);
    let detailMembers = cellDetail ? [cellDetail.char] : [];
    let detailGuests: string[] = [];
    if (cellDetail && isDetailCollab) {
        const { char, day, item } = cellDetail;
        const eventId = item.eventId;
        const memberIds = detailEvent?.memberIds.length ? detailEvent.memberIds : item.eventMemberIds;
        const relatedIds = memberIds?.length ? memberIds : eventId
            ? data.characters.filter(member => splitScheduleItem(member.schedule[day]).some(part => part.eventId === eventId)).map(member => member.id)
            : getLegacyCollaborationMemberIds(data, char.id, day, item) ?? [];
        const participantIds = new Set([char.id, ...relatedIds]);
        detailMembers = data.characters.filter(member => participantIds.has(member.id));
        detailGuests = detailEvent?.guests ?? item.guests ?? [];
    }
    const isFullGroup = isDetailCollab
        && detailMembers.length === 6
        && detailMembers.every(member => member.status !== 'graduated')
        && data.characters.filter(member => member.status !== 'graduated').length === 6;
    const memberNames = new Set(detailMembers.map(member => member.name.trim()));
    const guestNames = [...new Set(detailGuests.map(name => name.trim()).filter(name => name && !memberNames.has(name)))];
    const cellMemoCount = cellDetail?.item.memos?.length ?? 0;
    const openCellMemo = () => {
        if (!cellDetail) return;
        setActiveMemoItem({ item: cellDetail.item, charId: cellDetail.char.id });
        setCellDetail(null);
    };
    const [splitEditor, setSplitEditor] = useState<{
        charId: string; day: string; draft: { time: string; content: string }[]; type: string;
        participants: string[]; isCollab: boolean; eventId?: string; targetPartIndex?: number;
        source: {
            eventId?: string;
            time: string;
            content: string;
            type?: string;
            category?: string;
            legacyMemberIds?: string[];
            parts: Array<{ eventId?: string; time: string; content: string; type?: string; category?: string }>;
        };
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

    React.useEffect(() => {
        if (requestedDay) setCurrentDayIndex(requestedDay.index);
    }, [requestedDay]);

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

    const isV2 = theme === 'v2';
    const { collabGroups, skipCells, mixedCollabJoins, mixedCollabLabels } = React.useMemo(() => {
        const groups: { [day: string]: { [charId: string]: number } } = {};
        const skips: { [day: string]: Set<string> } = {};
        const joins: Record<string, Record<string, {
            partIndex: number;
            segment: 'first' | 'middle' | 'last';
            topLeftRadius: string;
            bottomLeftRadius: string;
            backgroundSize: string;
            backgroundPosition: string;
        }>> = {};
        const labels: {
            day: string;
            dayIndex: number;
            firstRow: number;
            rowCount: number;
            char: CharacterSchedule;
            item: ScheduleItem;
            halfWidth: boolean;
        }[] = [];

        DAYS.forEach((day, dayIndex) => {
            groups[day] = {};
            skips[day] = new Set<string>();
            joins[day] = {};

            const eventRows = new Map<string, { rowIndex: number; partIndex: number; split: boolean; part: ScheduleItem }[]>();
            filteredData.characters.forEach((char, rowIndex) => {
                if (isEditable && !isV2) return;
                const parts = splitScheduleItem(char.schedule[day]);
                const split = parts.length > 1;
                if (split && !isV2) return;
                const collabs = parts.filter(part => part.type?.startsWith('collab'));
                if (collabs.length !== 1 || !collabs[0].eventId) return;
                const part = collabs[0];
                const key = `${part.eventId}|${part.time}`;
                const rows = eventRows.get(key) || [];
                rows.push({ rowIndex, partIndex: parts.indexOf(part), split, part });
                eventRows.set(key, rows);
            });

            // 같은 이벤트의 연속 행만 연결한다. 개인 방송이 섞이면 각 행을 유지한다.
            eventRows.forEach((rows) => {
                let runStart = 0;
                for (let i = 1; i <= rows.length; i++) {
                    const isRunEnd = i === rows.length || rows[i].rowIndex !== rows[i - 1].rowIndex + 1;
                    if (!isRunEnd) continue;
                    const run = rows.slice(runStart, i);
                    runStart = i;
                    if (run.length < 2) continue;
                    const hasSplit = run.some(row => row.split);
                    if (isEditable && hasSplit) continue;
                    if (!isEditable && !hasSplit) {
                        const anchor = filteredData.characters[run[0].rowIndex].id;
                        groups[day][anchor] = run.length;
                        run.slice(1).forEach(({ rowIndex }) => skips[day].add(filteredData.characters[rowIndex].id));
                        continue;
                    }

                    const first = run[0];
                    const lowerMiddle = Math.floor(run.length / 2);
                    if (!isEditable) labels.push({
                        day,
                        dayIndex,
                        firstRow: first.rowIndex + 2,
                        rowCount: run.length,
                        char: filteredData.characters[first.rowIndex],
                        item: first.part,
                        halfWidth: run[lowerMiddle].split || run[Math.floor((run.length - 1) / 2)].split,
                    });
                    run.forEach(({ rowIndex, partIndex, split }, index) => {
                        const above = run[index - 1];
                        const below = run[index + 1];
                        joins[day][filteredData.characters[rowIndex].id] = {
                            partIndex,
                            segment: !above ? 'first' : !below ? 'last' : 'middle',
                            topLeftRadius: !above || (!split && above.split) ? '14px' : '0',
                            bottomLeftRadius: !below || (!split && below.split) ? '14px' : '0',
                            backgroundSize: `100% ${run.length * 100}%`,
                            backgroundPosition: `0 ${(index / (run.length - 1)) * 100}%`,
                        };
                    });
                }
            });
        });

        return { collabGroups: groups, skipCells: skips, mixedCollabJoins: joins, mixedCollabLabels: labels };
    }, [filteredData.characters, isEditable, isV2]);

    // ＋ 버튼: 시간 파트 추가 (셀 분할) / － 버튼: 파트 제거 (병합)
    const handleAddSplit = (charId: string, day: string) => {
        const char = filteredData.characters.find(c => c.id === charId);
        const rawItem = char?.schedule[day];
        if (onAddPart) {
            // Keep every newly-added broadcast as an editable part. This is
            // required for canonical collab+personal cells and also prevents
            // an empty second legacy part from being filtered out later.
            onAddPart(charId, day);
            return;
        }
        const rawTime = rawItem?.time || '';
        onCellUpdate?.(charId, day, 'time', addTimePart(rawTime));
    };


    // 다방송 편집 시트: 드래프트 기반 편집 (입력 중 분할 붕괴 방지), 적용 시 combined 재조합
    const handleOpenBroadcastEditor = (charId: string, day: string, typeOverride?: string, partIndex?: number) => {
        const char = filteredData.characters.find(c => c.id === charId);
        const raw = char?.schedule[day];
        if (!raw) return;
        const rawParts = splitScheduleItem(raw);
        const targetPart = partIndex === undefined ? undefined : rawParts[partIndex];
        const editorParts = targetPart ? [targetPart] : rawParts;
        const sourceItem = targetPart || raw;
        const effectiveType = typeOverride || sourceItem.type || 'stream';
        const isCollab = effectiveType.startsWith('collab');
        const isExplicitHanaviSelection = typeOverride === 'collab_universe' || typeOverride === 'collab_hanavi';
        const isHanaviCollab = effectiveType === 'collab_universe' || effectiveType === 'collab_hanavi' ||
            sourceItem.content.includes('하나비 합방') || sourceItem.content.includes('단체 방송') || sourceItem.content.includes('단체 합방');
        const availableCharacters = collaborationCharacters.filter((candidate) => candidate.status !== 'graduated');
        const source = {
            eventId: sourceItem.eventId,
            time: sourceItem.time,
            content: sourceItem.content,
            type: sourceItem.type,
            category: sourceItem.category,
            parts: editorParts.map((part) => ({
                eventId: part.eventId,
                time: part.time,
                content: part.content,
                type: part.type,
                category: part.category,
            })),
        };
        const legacyMemberIds = !sourceItem.eventId && isCollab
            ? getLegacyCollaborationMemberIds(
                { ...data, characters: collaborationCharacters },
                charId,
                day,
                source,
            )
            : undefined;
        const participants = legacyMemberIds?.length
                ? legacyMemberIds
                : isExplicitHanaviSelection
                    ? availableCharacters.map((candidate) => candidate.id)
                    : sourceItem.eventMemberIds?.length
                        ? [...sourceItem.eventMemberIds]
                        : isHanaviCollab && !sourceItem.eventId
                            ? availableCharacters.map((candidate) => candidate.id)
                            : [charId];
        setSplitEditor({
            charId, day,
            draft: editorParts.map(s => ({ time: s.time, content: stripHtml(s.content) })),
            type: effectiveType,
            participants: isCollab ? participants : [],
            isCollab,
            eventId: sourceItem.eventId,
            targetPartIndex: partIndex,
            source: { ...source, legacyMemberIds },
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
        const { charId, day, draft, targetPartIndex } = splitEditor;
        const time = draft.map(d => normalizeTimePart(d.time || '').trim()).filter(Boolean).join('+');
        const contents = draft.map(d => (d.content || '').trim()).filter(Boolean);
        const content = contents.length > 1 ? contents.join(' + ') : contents[0] ?? '';
        if (splitEditor.isCollab) {
            const eventId = splitEditor.eventId || (
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : ''
            );
            if (!eventId || !onCollabUpdate) return;
            onCollabUpdate({
                characterId: charId,
                day,
                eventId,
                time,
                content,
                type: normalizeEventType(splitEditor.type),
                participantIds: splitEditor.participants,
                source: splitEditor.source,
            });
        } else {
            if (targetPartIndex !== undefined && onPartUpdate) {
                onPartUpdate(charId, day, targetPartIndex, 'time', time);
                onPartUpdate(charId, day, targetPartIndex, 'content', content);
                onPartUpdate(charId, day, targetPartIndex, 'type', splitEditor.type);
            } else {
                onCellUpdate?.(charId, day, 'time', time);
                onCellUpdate?.(charId, day, 'content', content);
                onCellUpdate?.(charId, day, 'type', splitEditor.type);
            }
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

    const hasHeaderControls = !!headerControls;
    const useLegacyWeekNav = isEditable && !hasHeaderControls;
    const weekArrowClass = useLegacyWeekNav ? styles.navBtn : `${headerStyles.button} ${headerStyles.iconButton}`;

    const dateNav = (
        <div className={styles.dateNav} data-editable={useLegacyWeekNav || undefined}>
            {onPrevWeek && (
                <button
                    onClick={onPrevWeek}
                    type="button"
                    className={weekArrowClass}
                    aria-label="Previous Week"
                >
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    type="button"
                    className={weekArrowClass}
                    aria-label="Next Week"
                >
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
            )}
        </div>
    );

    const titleAction = mobileTitleAction && <div className={styles.mobileTitleAction}>{mobileTitleAction}</div>;

    return (
        <div ref={ref} className={styles.exportWrapper} data-theme={theme}>
            <div className={styles.container} data-theme={theme}>
                <header className={useLegacyWeekNav ? styles.header : `${styles.header} ${headerStyles.theme}`}>
                    <div
                        className={styles.titleRow}
                        data-styled-header={hasHeaderControls || undefined}
                        data-public-controls={!isEditable && hasHeaderControls || undefined}
                    >
                        <div className={styles.titleGroup}>
                            {isV2 ? (
                                <>
                                    <span className={styles.v2Badge}>WEEKLY SCHEDULE</span>
                                    <div className={styles.v2TitleRow}>
                                        <div className={styles.v2TitleLine}>
                                            <span className={styles.v2PlayIcon} aria-hidden="true">▶</span>
                                            <h1 className={styles.title}><span className={styles.titleText}>하나비 유니버스 주간 스케줄표</span></h1>
                                            {titleAction}
                                        </div>
                                        {dateNav}
                                        {/* 이미지 내보내기 전용 정적 날짜 — 라이브에서는 숨김 (data-exporting에서 표시) */}
                                        <span className={styles.v2ExportDate}>{formatWeekRangeShort(data.weekRange)}</span>
                                    </div>
                                </>
                            ) : hasHeaderControls ? (
                                <div className={styles.classicTitleRow}>
                                    <div className={styles.classicTitleLine}>
                                        <h1 className={styles.title}>하나비 주간 스케줄표</h1>
                                        {titleAction}
                                    </div>
                                    {dateNav}
                                </div>
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
                            type="button"
                            className={`${headerStyles.theme} ${headerStyles.button} ${headerStyles.iconButton} ${styles.mobileNavBtn} ${styles.prevBtn} ${!navBtnsVisible ? styles.navBtnHidden : ''}`}
                            onClick={() => { trigger(); pokeNavButtons(); setCurrentDayIndex(prev => (prev - 1 + 7) % 7); }}
                            aria-label="Previous Day"
                        >
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <button 
                            type="button"
                            className={`${headerStyles.theme} ${headerStyles.button} ${headerStyles.iconButton} ${styles.mobileNavBtn} ${styles.nextBtn} ${!navBtnsVisible ? styles.navBtnHidden : ''}`}
                            onClick={() => { trigger(); pokeNavButtons(); setCurrentDayIndex(prev => (prev + 1) % 7); }}
                            aria-label="Next Day"
                        >
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </>
                )}

                <div
                    className={styles.gridWrapper}
                    ref={gridWrapper}
                    data-public-member-view={(!isEditable && viewMode === 'member') || undefined}
                    data-editable-member-view={(isEditable && viewMode === 'member') || undefined}
                    onScroll={isV2 && viewMode === 'member' ? ({ currentTarget }) => {
                        const dayHeader = currentTarget.querySelector(`.${styles.grid} > .${styles.dayHeader}`);
                        const firstMember = currentTarget.querySelector(`.${styles.grid} > .${styles.charCell}`);
                        const overlap = currentTarget.scrollTop > 0 && dayHeader && firstMember
                            ? dayHeader.getBoundingClientRect().bottom - firstMember.getBoundingClientRect().top
                            : 0;
                        const strength = Math.min(1, Math.max(0, overlap / 12));
                        currentTarget.style.setProperty('--weekday-overlap', String(strength));
                    } : undefined}
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
                                    style={{ '--row-index': 1, '--day-column': index + 2 } as React.CSSProperties}
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
                                        const rawItem = char.schedule[day] ?? { time: '', content: '', type: 'stream' as const, placeholder: true };
                                        // "12:00+19:00" 다방송 셀 n분열 — 관리자/열람 동일 (WYSIWYG)
                                        const displayItems = splitScheduleItem(rawItem);
                                        const join = mixedCollabJoins[day]?.[char.id];
                                        const joinedStyle = join && {
                                            '--join-top-left-radius': join.topLeftRadius,
                                            '--join-bottom-left-radius': join.bottomLeftRadius,
                                            backgroundSize: join.backgroundSize,
                                            backgroundPosition: join.backgroundPosition,
                                        } as React.CSSProperties;

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
                                                    className={join ? `${styles.splitCellStack} ${styles.mixedCollabStack}` : styles.splitCellStack}
                                                    style={{ ...cellPlacement, '--solo-count': displayItems.length - 1 } as React.CSSProperties}
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
                                                            style={{ minHeight: 0, ...(join?.partIndex === subIdx && joinedStyle) }}
                                                            collabSegment={join?.partIndex === subIdx ? join.segment : undefined}
                                                            onMemoAdded={onMemoAdded}
                                                            onMemoClick={(item, charId) => setActiveMemoItem({ item, charId })}
                                                            onDetailClick={(c, i) => setCellDetail({ char: c, item: i, day })}
                                                            splitMeta={{ index: subIdx, total: displayItems.length }}
                                                            onCellUpdate={onCellUpdate}
                                                            onPartUpdate={onPartUpdate}
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
                                                style={{ ...cellPlacement, ...joinedStyle }}
                                                collabSegment={join?.segment}
                                                centeredCollab={isV2 && spanSize > 1}
                                                onMemoAdded={onMemoAdded}
                                                onMemoClick={(item, charId) => setActiveMemoItem({ item, charId })}
                                                onDetailClick={(c, i) => setCellDetail({ char: c, item: i, day })}
                                                onAddSplit={isEditable ? handleAddSplit : undefined}
                                                onOpenBroadcastEditor={isEditable ? handleOpenBroadcastEditor : undefined}
                                                theme={theme}
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                            {mixedCollabLabels.map(({ day, dayIndex, firstRow, rowCount, char, item, halfWidth }) => (
                                <ScheduleCell
                                    key={`collab-label-${day}-${firstRow}`}
                                    char={char}
                                    day={day}
                                    index={dayIndex}
                                    item={item}
                                    theme={theme}
                                    centeredCollab
                                    collabLabelOnly
                                    handleOpenLinkModal={handleOpenLinkModal}
                                    trigger={trigger}
                                    touchStart={null}
                                    touchEnd={null}
                                    minSwipeDistance={0}
                                    style={{
                                        gridRow: `${firstRow} / span ${rowCount}`,
                                        gridColumn: dayIndex + 2,
                                        '--collab-label-width': halfWidth ? 'calc(50% - 3px)' : '100%',
                                    } as React.CSSProperties}
                                />
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
                                        onItemClick={(char, item, day) => {
                                            if (isEditable) {
                                                trigger();
                                                const targetCharId = char.id.startsWith('merged-')
                                                    ? item.eventMemberIds?.[0] || char.id
                                                    : char.id;
                                                handleOpenLinkModal(targetCharId, day, item.videoUrl || '');
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
                        variant="sheet"
                        focusCloseOnOpen
                    >
                        <div className={adminStyles.sheetBody}>
                            {splitEditor.isCollab ? (
                                <>
                                    <div className={adminStyles.draftRow}>
                                        <input
                                            value={splitEditor.draft[0]?.time || ''}
                                            onChange={(e) => updateSplitDraft(0, 'time', e.target.value)}
                                            onBlur={(e) => updateSplitDraft(0, 'time', normalizeTimePart(e.target.value))}
                                            placeholder="HH:MM"
                                            aria-label="방송 시간"
                                        />
                                        <textarea
                                            value={splitEditor.draft[0]?.content || ''}
                                            onChange={(e) => updateSplitDraft(0, 'content', e.target.value)}
                                            rows={2}
                                            placeholder="합방 제목"
                                            aria-label="합방 제목"
                                        />
                                    </div>
                                    <div className={adminStyles.fieldGroup}>
                                        <div className="mb-2 font-semibold">
                                            참여 멤버 — 선택된 멤버들의 셀에 합방이 표시됩니다
                                        </div>
                                        <div className={adminStyles.dayButtons}>
                                            {collaborationCharacters.map((c) => {
                                                const on = splitEditor.participants.includes(c.id);
                                                return (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => toggleParticipant(c.id)}
                                                        type="button"
                                                        aria-pressed={on}
                                                        className={`${headerStyles.button} ${adminStyles.dayButton}`}
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
                                <div key={i} className={adminStyles.draftRow}>
                                    <input
                                        value={sub.time}
                                        onChange={(e) => updateSplitDraft(i, 'time', e.target.value)}
                                        onBlur={(e) => updateSplitDraft(i, 'time', normalizeTimePart(e.target.value))}
                                        placeholder="HH:MM"
                                        aria-label={`${i + 1}번째 방송 시간`}
                                    />
                                    <textarea
                                        value={sub.content}
                                        onChange={(e) => updateSplitDraft(i, 'content', e.target.value)}
                                        rows={2}
                                        placeholder="방송 내용"
                                        aria-label={`${i + 1}번째 방송 내용`}
                                    />
                                    {splitEditor.draft.length > 1 && (
                                        <button
                                            onClick={() => removeSplitDraft(i)}
                                            type="button"
                                            className={`${headerStyles.button} ${headerStyles.iconButton}`}
                                            aria-label={`${i + 1}번째 방송 제거`}
                                        >
                                            －
                                        </button>
                                    )}
                                </div>
                            ))}
                            </>
                            )}
                            {splitEditor.targetPartIndex === undefined && !splitEditor.isCollab && (
                                <button
                                    onClick={addSplitDraft}
                                    type="button"
                                    className={headerStyles.button}
                                >
                                    ＋ 방송 추가
                                </button>
                            )}
                            <label className={adminStyles.field}>
                                방송 유형
                                <select
                                    value={splitEditor.type}
                                    onChange={(e) => {
                                        const nextType = e.target.value;
                                        const nextIsCollab = nextType.startsWith('collab');
                                        const isHanavi = nextType === 'collab_universe' || nextType === 'collab_hanavi';
                                        const defaultParticipants = isHanavi
                                            ? collaborationCharacters.filter((candidate) => candidate.status !== 'graduated').map((candidate) => candidate.id)
                                            : [splitEditor.charId];
                                        setSplitEditor({
                                            ...splitEditor,
                                            type: nextType,
                                            isCollab: nextIsCollab,
                                            participants: nextIsCollab
                                                ? (splitEditor.participants.length ? splitEditor.participants : defaultParticipants)
                                                : [],
                                        });
                                    }}
                                >
                                    <option value="stream">방송</option>
                                    <option value="off">휴방</option>
                                    <option value="collab_external">외부 합방</option>
                                    <option value="collab">내부 합방</option>
                                    <option value="collab_universe">하나비</option>
                                </select>
                            </label>
                            <div className={adminStyles.actions}>
                                <button type="button" className={headerStyles.button} onClick={() => setSplitEditor(null)}>취소</button>
                                <button type="button" className={`${headerStyles.button} ${adminStyles.primary}`} onClick={applySplitDraft}>적용</button>
                            </div>
                        </div>
                    </BaseModal>
                );
            })()}

            <BaseModal
                isOpen={!!cellDetail}
                onClose={() => setCellDetail(null)}
                title={cellDetail && (
                    <span className={detailStyles.identity} data-collaboration={isDetailCollab || undefined}>
                        {isFullGroup ? <span className={detailStyles.participant}>하나비</span> : detailMembers.map(({ id, name, avatarUrl }) => (
                            <span key={id} className={detailStyles.participant}>
                                {avatarUrl && (
                                    <img
                                        src={avatarUrl.startsWith('http') ? `/api/proxy/image?url=${encodeURIComponent(avatarUrl)}` : avatarUrl}
                                        alt=""
                                        className={detailStyles.avatar}
                                    />
                                )}
                                <span>{name}</span>
                            </span>
                        ))}
                        {guestNames.map(name => <span key={name} className={detailStyles.participant}>{name}</span>)}
                        <span className={detailStyles.time}>{cellDetail.item.time || '시간 미정'}</span>
                    </span>
                )}
                maxWidth="440px"
                variant="sheet"
                accent={cellDetail ? (isV2 && isDetailCollab
                    ? V2_COLLAB_ACCENT
                    : { color: cellDetail.char.colorBorder, background: cellDetail.char.colorBg }) : undefined}
            >
                {cellDetail && (
                    <div className={detailStyles.content}>
                        {cellDetail.item.category && <span className={detailStyles.category}>{cellDetail.item.category}</span>}

                        {cellDetail.item.content && (
                            <div
                                className={detailStyles.description}
                                ref={detailDescription}
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cellDetail.item.content) }}
                            />
                        )}

                        {!!cellDetail.item.memos?.length && (
                            <section className={detailStyles.memos} aria-label="메모">
                                <h3>최근 메모</h3>
                                <ul>
                                    {cellDetail.item.memos.slice(-2).map(memo => (
                                        <li key={memo.id}>{memo.content.replace(/<[^>]*>?/g, '')}</li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <div className={detailStyles.actions}>
                            {cellDetail.char.cimeUrl && (
                                <a
                                    href={`${cellDetail.char.cimeUrl.replace(/\/$/, '')}/live`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${headerStyles.button} ${detailStyles.action}`}
                                >
                                    <MenuIcon name="link" size={16} />
                                    방송 바로가기
                                </a>
                            )}
                            {cellDetail.item.videoUrl && (
                                <a
                                    href={cellDetail.item.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => trigger()}
                                    className={`${headerStyles.button} ${detailStyles.action}`}
                                >
                                    <MenuIcon name="play" size={16} />
                                    {cellDetail.item.videoUrl.includes('ci.me') ? '씨미 다시보기' : '다시보기 보기'}
                                </a>
                            )}
                            <div className={detailStyles.memoActions}>
                                <button
                                    type="button"
                                    className={`${headerStyles.button} ${detailStyles.memoCount}`}
                                    aria-label={`메모 ${cellMemoCount}개 보기`}
                                    onClick={openCellMemo}
                                >
                                    <MenuIcon name="message" size={13} />
                                    {cellMemoCount > 99 ? '99+' : cellMemoCount}
                                </button>
                                <button
                                    type="button"
                                    className={`${headerStyles.button} ${detailStyles.action}`}
                                    onClick={openCellMemo}
                                >
                                    메모 남기기
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </BaseModal>
        </div >
    );
});


ScheduleGrid.displayName = 'ScheduleGrid';

export default ScheduleGrid;
