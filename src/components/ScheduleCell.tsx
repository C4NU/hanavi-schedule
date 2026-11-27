import React from 'react';
import { CharacterSchedule, ScheduleItem } from '@/types/schedule';
import styles from './ScheduleGrid.module.css';
import MarkdownEditor from './MarkdownEditor';
import { scheduleReplays } from '@/utils/scheduleReplay';
import ReplayIcon from './ReplayIcon';
import DOMPurify from 'isomorphic-dompurify';
import BufferedInput from './BufferedInput';
import { ScheduleTheme } from '@/hooks/useScheduleTheme';
import { getV2BroadcastGradient, getV2ContentColor, V2_CELL_COLOR_OVERRIDES, V2_COLLAB_ACCENT } from '@/data/v2ContentColors';
import BroadcastMoreButton from './admin/BroadcastMoreButton';
import BroadcastTypePicker from './admin/BroadcastTypePicker';
import { fitScheduleContent } from '@/utils/fitScheduleContent';

interface ScheduleCellProps {
    char: CharacterSchedule;
    day: string;
    index: number;
    item?: ScheduleItem;
    isEditable?: boolean;
    onCellUpdate?: (charId: string, day: string, field: keyof ScheduleItem, value: string) => void;
    onPartUpdate?: (charId: string, day: string, partIndex: number, field: keyof ScheduleItem, value: string) => void;
    onCellBlur?: (charId: string, day: string, field: keyof ScheduleItem, value: string) => void;
    handleOpenLinkModal: (charId: string, day: string, item: ScheduleItem) => void;
    trigger: () => void;
    touchStart: number | null;
    touchEnd: number | null;
    minSwipeDistance: number;
    style?: React.CSSProperties;
    onMemoAdded?: () => void;
    onMemoClick?: (item: ScheduleItem, charId: string) => void;
    splitMeta?: { index: number; total: number };
    collabSegment?: 'first' | 'middle' | 'last';
    centeredCollab?: boolean;
    collabLabelOnly?: boolean;
    onAddSplit?: (charId: string, day: string) => void;
    onRemoveSplit?: (charId: string, day: string, subIndex: number) => void;
    onDetailClick?: (char: CharacterSchedule, item: ScheduleItem) => void;
    onOpenBroadcastEditor?: (charId: string, day: string, typeOverride?: string, partIndex?: number) => void;
    theme?: ScheduleTheme;
}

const ScheduleCell: React.FC<ScheduleCellProps> = ({
    char, day, index, item, isEditable, onCellUpdate, onCellBlur, 
    handleOpenLinkModal, trigger, touchStart, touchEnd, minSwipeDistance, style,
    onMemoAdded, onMemoClick, splitMeta, collabSegment, centeredCollab, collabLabelOnly,
    onAddSplit, onRemoveSplit, onDetailClick, onPartUpdate,
    onOpenBroadcastEditor, theme = 'classic'
}) => {
    const isOff = item?.type === 'off';
    const isV2 = theme === 'v2';
    
    let specialClass = '';
    if (item?.type === 'collab_maivi') specialClass = styles.collab_maivi;
    else if (item?.type === 'collab_hanavi') specialClass = styles.collab_hanavi;
    else if (item?.type === 'collab_universe') specialClass = styles.collab_universe;
    else if (item?.type === 'collab_external') specialClass = styles.collab;
    else if (item?.type === 'collab') specialClass = styles.collab;
    else if (item?.content?.includes('메이비 합방')) specialClass = styles.collab_maivi;

    const isCollabType = !!item?.type?.startsWith('collab') || specialClass !== '';
    const palette = isV2 && !isCollabType ? V2_CELL_COLOR_OVERRIDES[char.id] : undefined;
    const replays = item ? scheduleReplays(item) : [];
    const memoCount = item?.memos?.length ?? 0;

    const isPreparing = item?.content?.includes('스케쥴 준비중');
    const rawContent = item?.content || '';
    const fittedRow = React.useRef<HTMLDivElement>(null);
    const refit = React.useRef<() => void>(undefined);
    React.useLayoutEffect(() => {
        const row = fittedRow.current;
        const cell = row?.parentElement;
        if (!row || !cell) return;

        let frame = 0;
        let disposed = false;
        const measure = () => {
            if (disposed) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => fitScheduleContent(row));
        };
        refit.current = measure;
        fitScheduleContent(row);
        const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
        observer?.observe(cell);
        void document.fonts?.ready.then(measure);
        return () => {
            disposed = true;
            refit.current = undefined;
            observer?.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [rawContent, theme, centeredCollab, collabSegment, isEditable, isOff, item?.time]);
    // 편집기가 붙인 끝의 빈 문단은 합방 제목의 높이에 포함하지 않는다.
    const centeredContent = centeredCollab
        ? rawContent.trimEnd().replace(/(?:<(?:div|p)>\s*<br\s*\/?>\s*<\/(?:div|p)>\s*)+$/i, '')
        : rawContent;
    const plainText = rawContent.replace(/<[^>]*>?/gm, '');
    // 본문 끝의 빈 줄과 컨테이너 태그는 화면에 보이는 줄 수에 포함하지 않는다.
    const sizingText = isV2
        ? rawContent.replace(/<br\b[^>]*>|<\/(?:div|p)>/gi, '\n').replace(/<[^>]*>?/gm, '').trim()
        : plainText;
    const textLen = isV2 ? sizingText.replace(/\s+/g, ' ').length : sizingText.length;
    const lineCount = ((isV2 ? sizingText.match(/\n/g) : rawContent.match(/\n|<br|<\/div|<\/p/gi)) || []).length;
    
    // 셀이 커진 만큼 기준점 상향 — 여유 공간이 있는데 줄바꿈만으로 축소되지 않게 함
    const complexityScore = textLen + (lineCount * 12);

    let textSizeClass = '';
    if (complexityScore > 200) textSizeClass = styles.textSizeXXXXS;
    else if (complexityScore > 170) textSizeClass = styles.textSizeXXXS;
    else if (complexityScore > 140) textSizeClass = styles.textSizeXXS;
    else if (complexityScore > 110) textSizeClass = styles.textSizeXS;
    else if (complexityScore > 80) textSizeClass = styles.textSizeS;

    const hasThemeClass = !!styles[char.colorTheme];
    const dynamicStyle: React.CSSProperties & { '--schedule-content-color'?: string } = {};
    if (!isOff && !collabLabelOnly) {
        if (isV2) {
            dynamicStyle.backgroundImage = getV2BroadcastGradient(char.id, char.colorBg, isCollabType);
            dynamicStyle.borderColor = 'transparent';
        } else {
            if (char.colorBg) dynamicStyle.backgroundColor = char.colorBg;
            if (char.colorBorder) dynamicStyle.borderColor = char.colorBorder;
        }
    }

    const timeStyle: React.CSSProperties = {};
    const offTextStyle: React.CSSProperties = {};
    
    if (char.colorBorder) {
        timeStyle.color = char.colorBorder;
        if (!isV2) offTextStyle.color = char.colorBorder;
    }
    if (isV2 && isCollabType) timeStyle.color = V2_COLLAB_ACCENT.color;
    else if (palette?.time) timeStyle.color = palette.time;

    // v2 내용 텍스트: 멤버별 시안 색상 (합방은 진한 핑크 고정, 미등록 멤버는 colorBorder 폴백)
    const contentColor = isV2
        ? (isCollabType ? V2_COLLAB_ACCENT.color : getV2ContentColor(char.id, char.colorBorder || undefined))
        : undefined;
    dynamicStyle['--schedule-content-color'] = contentColor;

    const typePicker = isEditable && (
        <BroadcastTypePicker
            value={item?.type || 'stream'}
            onChange={(type) => {
                // 합방 유형과 참여자는 편집 시트에서 함께 적용한다.
                if ((type.startsWith('collab') || isCollabType) && onOpenBroadcastEditor) {
                    onOpenBroadcastEditor(char.id, day, type, splitMeta?.index);
                } else if (splitMeta && onPartUpdate) {
                    onPartUpdate(char.id, day, splitMeta.index, 'type', type);
                } else {
                    onCellUpdate?.(char.id, day, 'type', type);
                }
            }}
        />
    );

    return (
        <div
            data-day-index={index}
            data-collab-segment={collabSegment}
            className={`
                ${styles.scheduleCell}
                ${styles[char.colorTheme] || ''}
                ${isOff ? styles.off : ''}
                ${specialClass}
                ${centeredCollab ? styles.centeredCollab : ''}
                ${collabLabelOnly ? styles.collabLabel : ''}
                ${replays.length > 0 && !isEditable ? styles.hasLink : ''}
            `}
            style={{ ...dynamicStyle, ...style }}
            onClick={collabLabelOnly ? undefined : () => {
                const isSwipe = touchStart && touchEnd && Math.abs(touchStart - touchEnd) > minSwipeDistance;
                const handleClick = () => {
                    if (isEditable) {
                        // 분할 서브셀 클릭 → 다방송 개별 편집 시트
                        if (splitMeta) {
                            trigger();
                            onOpenBroadcastEditor?.(char.id, day, undefined, splitMeta.index);
                        }
                        return;
                    }
                    trigger();
                    onDetailClick?.(char, item || ({ time: '', content: '' } as ScheduleItem));
                };
                if (!isSwipe) {
                    handleClick();
                }
            }}
        >
            {isEditable ? (
                <>
                    {isOff ? (
                        <>
                            {isV2 && !splitMeta && <div className={`${styles.editTimeRow} ${styles.editOfflineControls}`}>{typePicker}</div>}
                            <div className={styles.editOffline}>
                                <span className={styles.offText} style={offTextStyle}>OFFLINE</span>
                            </div>
                        </>
                    ) : splitMeta ? (
                        <>
                            <div className={styles.time} style={timeStyle}>{item?.time}</div>
                            {isV2 ? (
                                <div ref={fittedRow} data-fit-content className={styles.v2ContentRow} style={{ color: contentColor }}>
                                    <span className={styles.v2Arrow} aria-hidden="true" />
                                    <div className={styles.content} title="클릭하여 개별 편집">
                                        {plainText || '(내용 없음)'}
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.content} title="클릭하여 개별 편집">
                                    {plainText || '(내용 없음)'}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className={styles.editTimeRow}>
                                <BufferedInput
                                    className={styles.editInput}
                                    style={{ color: timeStyle.color }}
                                    value={item?.time || ''}
                                    onCommit={(value) => onCellUpdate?.(char.id, day, 'time', value)}
                                    onBlurValue={(value) => onCellBlur?.(char.id, day, 'time', value)}
                                    placeholder="시간"
                                />
                                {typePicker}
                                <BroadcastMoreButton
                                    onAdd={onAddSplit ? () => onAddSplit(char.id, day) : undefined}
                                    onEditLink={() => handleOpenLinkModal(char.id, day, item ?? { time: '', content: '' })}
                                    hasLink={replays.length > 0}
                                />
                            </div>
                            <div ref={isV2 ? fittedRow : undefined} data-fit-content={isV2 || undefined} data-fit-editor={isV2 || undefined} className={styles.editContentRow}>
                                {isV2 && <span className={styles.v2Arrow} aria-hidden="true" />}
                                <MarkdownEditor
                                    className={styles.editTextArea}
                                    value={item?.content || ''}
                                    onChange={(val) => onCellUpdate?.(char.id, day, 'content', val)}
                                    onBlur={() => refit.current?.()}
                                    placeholder="컨텐츠"
                                />
                            </div>
                        </>
                    )}
                    {(splitMeta || (isOff && !isV2)) && <div className={styles.editBottomRow} data-fit-reserved>{typePicker}</div>}
                </>
            ) : (
                <>
                    {item && !isOff && (!collabSegment || collabSegment === 'first') && (
                        <>
                            <div className={styles.timeRow}>
                                {!collabSegment && <div className={styles.time} style={timeStyle}>{item.time || '?'}</div>}
                                {isCollabType && !centeredCollab && !collabSegment && <span className={styles.categoryChip}>합방</span>}
                                {!collabSegment && replays.length > 0 && (
                                    <span className={styles.inlineReplay} role="img" aria-label="다시보기 있음" title="다시보기 있음">
                                        <ReplayIcon size={13} />
                                    </span>
                                )}
                                {isV2 && !collabLabelOnly && memoCount > 0 && (
                                    <button
                                        type="button"
                                        className={styles.v2MemoCount}
                                        aria-label={`메모 ${memoCount}개 보기`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            trigger();
                                            onMemoClick?.(item, char.id);
                                        }}
                                    >
                                        {memoCount > 9 ? '9+' : memoCount}
                                    </button>
                                )}
                                {!isV2 && (
                                    <div
                                        className={styles.memoBadge}
                                        style={{ position: 'static', marginLeft: 'auto', marginRight: 0 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            trigger();
                                            onMemoClick?.(item, char.id);
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.memoIcon}>
                                            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                        </svg>
                                        <span>{memoCount}</span>
                                    </div>
                                )}
                            </div>
                            {!collabSegment && !(isV2 && !plainText.trim()) && (
                                isV2 ? (
                                    <div ref={fittedRow} data-fit-content className={styles.v2ContentRow} style={{ color: contentColor }}>
                                        <span className={styles.v2Arrow} aria-hidden="true" />
                                        <div className={`${styles.content} ${isPreparing ? styles.preparing : ''}`}>
                                            {isPreparing ? (
                                                <>
                                                    스케쥴 준비중<br />
                                                    <span className={styles.noBreak}>|･ω･)</span>
                                                </>
                                            ) : (
                                                <div
                                                    dangerouslySetInnerHTML={{ 
                                                        __html: DOMPurify.sanitize(
                                                            centeredContent.replace(/style="[^"]*font-size:[^"]*"/g, 'style=""')
                                                                        .replace(/font-size:[^;"]*;?/g, '')
                                                        )
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`${styles.content} ${isPreparing ? styles.preparing : ''} ${textSizeClass}`}>
                                        {isPreparing ? (
                                            <>
                                                스케쥴 준비중<br />
                                                <span className={styles.noBreak}>|･ω･)</span>
                                            </>
                                        ) : (
                                            <div
                                                dangerouslySetInnerHTML={{ 
                                                    __html: DOMPurify.sanitize(
                                                        item.content.replace(/style="[^"]*font-size:[^"]*"/g, 'style=""')
                                                                    .replace(/font-size:[^;"]*;?/g, '')
                                                    )
                                                }}
                                            />
                                        )}
                                    </div>
                                )
                            )}

                            {item.category && (
                                <div className={styles.bottomRow}>
                                    <div className={styles.categoryChip}>
                                        {item.category}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {isOff && <div className={`${styles.offText} ${isPreparing ? styles.preparing : ''}`} style={offTextStyle}>
                        {isPreparing ? (
                            <>
                                스케쥴 준비중<br />
                                <span className={styles.noBreak}>|･ω･)</span>
                            </>
                        ) : isV2 ? (
                            'OFFLINE'
                        ) : (
                            `${char.name} 휴방`
                        )}
                    </div>}
                </>
            )}
        </div>
    );
};

export default ScheduleCell;
