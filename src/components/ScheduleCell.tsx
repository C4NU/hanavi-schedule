import React from 'react';
import { CharacterSchedule, ScheduleItem } from '@/types/schedule';
import styles from './ScheduleGrid.module.css';
import MarkdownEditor from './MarkdownEditor';
import { getReplayLabel } from '@/utils/character';
import DOMPurify from 'isomorphic-dompurify';
import BufferedInput from './BufferedInput';
import { ScheduleTheme } from '@/hooks/useScheduleTheme';
import { getV2ContentColor } from '@/data/v2ContentColors';

interface ScheduleCellProps {
    char: CharacterSchedule;
    day: string;
    index: number;
    item?: ScheduleItem;
    isEditable?: boolean;
    onCellUpdate?: (charId: string, day: string, field: keyof ScheduleItem, value: string) => void;
    onCellBlur?: (charId: string, day: string, field: keyof ScheduleItem, value: string) => void;
    handleOpenLinkModal: (charId: string, day: string, currentUrl: string) => void;
    trigger: () => void;
    touchStart: number | null;
    touchEnd: number | null;
    minSwipeDistance: number;
    style?: React.CSSProperties;
    onMemoAdded?: () => void;
    onMemoClick?: (item: ScheduleItem, charId: string) => void;
    splitMeta?: { index: number; total: number };
    onAddSplit?: (charId: string, day: string) => void;
    onRemoveSplit?: (charId: string, day: string, subIndex: number) => void;
    onDetailClick?: (char: CharacterSchedule, item: ScheduleItem) => void;
    onOpenBroadcastEditor?: (charId: string, day: string, typeOverride?: string) => void;
    theme?: ScheduleTheme;
}

const ScheduleCell: React.FC<ScheduleCellProps> = ({
    char, day, index, item, isEditable, onCellUpdate, onCellBlur, 
    handleOpenLinkModal, trigger, touchStart, touchEnd, minSwipeDistance, style,
    onMemoAdded, onMemoClick, splitMeta, onAddSplit, onRemoveSplit, onDetailClick,
    onOpenBroadcastEditor, theme = 'classic'
}) => {
    const isOff = item?.type === 'off' || (!item && !isEditable);
    const isV2 = theme === 'v2';
    
    let specialClass = '';
    if (item?.type === 'collab_maivi') specialClass = styles.collab_maivi;
    else if (item?.type === 'collab_hanavi') specialClass = styles.collab_hanavi;
    else if (item?.type === 'collab_universe') specialClass = styles.collab_universe;
    else if (item?.type === 'collab_external') specialClass = styles.collab;
    else if (item?.type === 'collab') specialClass = styles.collab;
    else if (item?.content?.includes('메이비 합방')) specialClass = styles.collab_maivi;

    const isCollabType = !!item?.type?.startsWith('collab') || specialClass !== '';

    const isPreparing = item?.content?.includes('스케쥴 준비중');
    const rawContent = item?.content || '';
    const plainText = rawContent.replace(/<[^>]*>?/gm, '');
    const textLen = plainText.length;
    const lineCount = (rawContent.match(/\n|<br|<\/div|<\/p/gi) || []).length;
    
    // 셀이 커진 만큼 기준점 상향 — 여유 공간이 있는데 줄바꿈만으로 축소되지 않게 함
    const complexityScore = textLen + (lineCount * 12);

    let textSizeClass = '';
    if (complexityScore > 200) textSizeClass = styles.textSizeXXXXS;
    else if (complexityScore > 170) textSizeClass = styles.textSizeXXXS;
    else if (complexityScore > 140) textSizeClass = styles.textSizeXXS;
    else if (complexityScore > 110) textSizeClass = styles.textSizeXS;
    else if (complexityScore > 80) textSizeClass = styles.textSizeS;

    const hasThemeClass = !!styles[char.colorTheme];
    const dynamicStyle: React.CSSProperties = {};
    if (!isOff) {
        if (isV2 && isCollabType) {
            // v2 합방: 상단 흰색 → 키컬러 그라데이션 (일반 셀의 역방향), 텍스트는 진한 핑크
            dynamicStyle.background = 'linear-gradient(180deg, #ffffff 0%, #ff8fab 100%)';
            dynamicStyle.borderColor = 'transparent';
        } else if (isV2 && char.colorBg) {
            // v2 일반: 멤버색 → 흰색 세로 그라데이션
            dynamicStyle.background = `linear-gradient(180deg, ${char.colorBg} 0%, #ffffff 100%)`;
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
    if (isV2 && isCollabType) timeStyle.color = '#ff4d88';

    // v2 내용 텍스트: 멤버별 시안 색상 (합방은 진한 핑크 고정, 미등록 멤버는 colorBorder 폴백)
    const contentColor = isV2
        ? (isCollabType ? '#ff4d88' : getV2ContentColor(char.id, char.colorBorder || undefined))
        : undefined;

    return (
        <div
            data-day-index={index}
            className={`
                ${styles.scheduleCell}
                ${styles[char.colorTheme] || ''}
                ${isOff ? styles.off : ''}
                ${specialClass}
                ${item?.videoUrl && !isEditable ? styles.hasLink : ''}
            `}
            style={{ ...dynamicStyle, ...style }}
            onClick={() => {
                const isSwipe = touchStart && touchEnd && Math.abs(touchStart - touchEnd) > minSwipeDistance;
                const handleClick = () => {
                    if (isEditable) {
                        // 분할 서브셀 클릭 → 다방송 개별 편집 시트
                        if (splitMeta) {
                            trigger();
                            onOpenBroadcastEditor?.(char.id, day);
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
            {isEditable && splitMeta ? (
                /* 분할 서브셀: 컴팩트 표시 — 클릭 시 다방송 편집 시트에서 개별 수정 */
                <>
                    <div className={styles.time} style={timeStyle}>{item?.time}</div>
                    {isV2 ? (
                        <div className={styles.v2ContentRow} style={{ color: contentColor }}>
                            <span className={styles.v2Arrow} aria-hidden="true">▸</span>
                            <div className={styles.content} title="클릭하여 개별 편집">
                                {plainText.slice(0, 60) || '(내용 없음)'}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.content} title="클릭하여 개별 편집">
                            {plainText.slice(0, 60) || '(내용 없음)'}
                        </div>
                    )}
                    <div className={styles.editBottomRow}>
                        <select
                            className={styles.editSelect}
                            value={item?.type || 'stream'}
                            onChange={(e) => {
                                e.stopPropagation();
                                onCellUpdate?.(char.id, day, 'type', e.target.value);
                            }}
                        >
                            <option value="stream">방송</option>
                            <option value="off">휴방</option>
                            <option value="collab_external">외부 합방</option>
                            <option value="collab">내부 합방</option>
                            <option value="collab_universe">하나비</option>
                        </select>
                    </div>
                </>
            ) : isEditable ? (
                <>
                    <div className={styles.editTimeRow}>
                        <BufferedInput
                            className={styles.editInput}
                            style={{ color: char.colorBorder || undefined }}
                            value={item?.time || ''}
                            onCommit={(value) => onCellUpdate?.(char.id, day, 'time', value)}
                            onBlurValue={(value) => onCellBlur?.(char.id, day, 'time', value)}
                            placeholder="시간"
                        />
                        {isEditable && (
                            <button
                                className={styles.editSplitBtn}
                                onClick={(e) => { e.stopPropagation(); onAddSplit?.(char.id, day); }}
                                title="시간대 추가 (셀 분할)"
                            >
                                ＋
                            </button>
                        )}
                        <button
                            className={`${styles.editLinkBtn} ${item?.videoUrl ? styles.hasLink : ''}`}
                            onClick={() => handleOpenLinkModal(char.id, day, item?.videoUrl || '')}
                            title="다시보기 링크 연결"
                        >
                            {item?.videoUrl ? (item.videoUrl.includes('ci.me') ? 'CI' : 'YT') : '🔗'}
                        </button>
                    </div>
                    <MarkdownEditor
                        className={styles.editTextArea}
                        value={item?.content || ''}
                        onChange={(val) => onCellUpdate?.(char.id, day, 'content', val)}
                        placeholder="컨텐츠"
                    />
                    <div className={styles.editBottomRow}>
                        <select
                            className={styles.editSelect}
                            value={item?.type || 'stream'}
                            onChange={(e) => {
                                onCellUpdate?.(char.id, day, 'type', e.target.value);
                                // 합방 타입 선택 시 참여자 지정 시트 자동 오픈 (선택 타입 즉시 전달)
                                if (e.target.value.startsWith('collab')) {
                                    onOpenBroadcastEditor?.(char.id, day, e.target.value);
                                }
                            }}
                        >
                            <option value="stream">방송</option>
                            <option value="off">휴방</option>
                            <option value="collab_external">외부 합방</option>
                            <option value="collab">내부 합방</option>
                            <option value="collab_universe">하나비</option>
                        </select>
                    </div>
                </>
            ) : (
                <>
                    {item && !isOff && (
                        <>
                            <div className={styles.timeRow}>
                                <div className={styles.time} style={timeStyle}>{item.time}</div>
                                {!isEditable && (
                                    <div
                                        className={styles.memoBadge}
                                        style={{ position: 'static', marginLeft: 'auto', marginRight: item.videoUrl ? '18px' : 0 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            trigger();
                                            onMemoClick?.(item, char.id);
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.memoIcon}>
                                            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                        </svg>
                                        <span>{item.memos?.length || 0}</span>
                                    </div>
                                )}
                            </div>
                            {item.videoUrl && (
                                <div
                                    className={styles.replayBadge}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        width: '16px',
                                        height: '16px',
                                        zIndex: 5
                                    }}
                                    title={`${char.name} ${getReplayLabel(char.name)}`}
                                >
                                    {item.videoUrl.includes('youtube.com') || item.videoUrl.includes('youtu.be') ? (
                                        <svg viewBox="0 0 24 24" fill="#FF0000">
                                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                                        </svg>
                                    ) : (
                                        <div style={{ backgroundColor: '#8956fb', borderRadius: '4px', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg viewBox="0 0 24 24" fill="white" style={{ width: '10px', height: '10px' }}>
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            )}
                            {!(isV2 && !plainText.trim()) && (
                                isV2 ? (
                                    <div className={styles.v2ContentRow} style={{ color: contentColor }}>
                                        <span className={styles.v2Arrow} aria-hidden="true">▸</span>
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
