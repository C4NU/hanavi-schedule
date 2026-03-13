import React from 'react';
import { CharacterSchedule, ScheduleItem } from '@/types/schedule';
import styles from './ScheduleGrid.module.css';
import MarkdownEditor from './MarkdownEditor';

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
}

const ScheduleCell: React.FC<ScheduleCellProps> = ({
    char, day, index, item, isEditable, onCellUpdate, onCellBlur, 
    handleOpenLinkModal, trigger, touchStart, touchEnd, minSwipeDistance
}) => {
    const isOff = item?.type === 'off' || (!item && !isEditable);
    
    let specialClass = '';
    if (item?.type === 'collab_maivi') specialClass = styles.collab_maivi;
    else if (item?.type === 'collab_hanavi') specialClass = styles.collab_hanavi;
    else if (item?.type === 'collab_universe') specialClass = styles.collab_universe;
    else if (item?.type === 'collab') specialClass = styles.collab;
    else if (item?.content?.includes('메이비 합방')) specialClass = styles.collab_maivi;

    const isPreparing = item?.content?.includes('스케쥴 준비중');
    const textLen = item?.content?.length || 0;
    let textSizeClass = '';
    if (textLen > 90) textSizeClass = styles.textSizeXXS;
    else if (textLen > 60) textSizeClass = styles.textSizeXS;
    else if (textLen > 30) textSizeClass = styles.textSizeS;

    const dynamicStyle: React.CSSProperties = {};
    if (!isOff && char.colorBg) dynamicStyle.backgroundColor = char.colorBg;
    if (!isOff && char.colorBorder) dynamicStyle.borderColor = char.colorBorder;

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
            style={dynamicStyle}
            onClick={() => {
                const isSwipe = touchStart && touchEnd && Math.abs(touchStart - touchEnd) > minSwipeDistance;
                if (!isSwipe && item?.videoUrl && !isEditable) {
                    trigger();
                    window.open(item.videoUrl, '_blank');
                }
            }}
        >
            {isEditable ? (
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
};

export default ScheduleCell;
