import React from 'react';
import { CharacterSchedule, ScheduleItem } from '@/types/schedule';
import styles from './ScheduleGrid.module.css';
import MarkdownEditor from './MarkdownEditor';
import { getReplayLabel } from '@/utils/character';
import DOMPurify from 'isomorphic-dompurify';

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
}

const ScheduleCell: React.FC<ScheduleCellProps> = ({
    char, day, index, item, isEditable, onCellUpdate, onCellBlur, 
    handleOpenLinkModal, trigger, touchStart, touchEnd, minSwipeDistance, style
}) => {
    const isOff = item?.type === 'off' || (!item && !isEditable);
    
    let specialClass = '';
    if (item?.type === 'collab_maivi') specialClass = styles.collab_maivi;
    else if (item?.type === 'collab_hanavi') specialClass = styles.collab_hanavi;
    else if (item?.type === 'collab_universe') specialClass = styles.collab_universe;
    else if (item?.type === 'collab') specialClass = styles.collab;
    else if (item?.content?.includes('메이비 합방')) specialClass = styles.collab_maivi;

    const isPreparing = item?.content?.includes('스케쥴 준비중');
    const rawContent = item?.content || '';
    // Strip HTML tags to get accurate text length for complexity score
    const plainText = rawContent.replace(/<[^>]*>?/gm, '');
    const textLen = plainText.length;
    // Count literal newlines, <br/>, and closing tags that usually imply a new line
    const lineCount = (rawContent.match(/\n|<br|<\/div|<\/p/gi) || []).length;
    
    // Weighted complexity score: length + (newlines * factor)
    const complexityScore = textLen + (lineCount * 12);
    
    let textSizeClass = '';
    if (complexityScore > 100) textSizeClass = styles.textSizeXXXXS;
    else if (complexityScore > 75) textSizeClass = styles.textSizeXXXS;
    else if (complexityScore > 50) textSizeClass = styles.textSizeXXS;
    else if (complexityScore > 30) textSizeClass = styles.textSizeXS;
    else if (complexityScore > 15) textSizeClass = styles.textSizeS;

    const hasThemeClass = !!styles[char.colorTheme];
    const dynamicStyle: React.CSSProperties = {};
    if (!isOff && char.colorBg) dynamicStyle.backgroundColor = char.colorBg;
    if (!isOff && char.colorBorder) dynamicStyle.borderColor = char.colorBorder;

    // Fallback text colors for members without hardcoded CSS themes
    const timeStyle: React.CSSProperties = {};
    const offTextStyle: React.CSSProperties = {};
    
    if (char.colorBorder) {
        timeStyle.color = char.colorBorder;
        // Apply member's border color to offText as requested
        offTextStyle.color = char.colorBorder;
    }

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
                            <div className={styles.time} style={timeStyle}>{item.time}</div>
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
                                    title={`${char.name} ${getReplayLabel(char.name)}`}
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
                                        dangerouslySetInnerHTML={{ 
                                            __html: DOMPurify.sanitize(
                                                item.content.replace(/style="[^"]*font-size:[^"]*"/g, 'style=""')
                                                            .replace(/font-size:[^;"]*;?/g, '')
                                            )
                                        }}
                                    />
                                )}
                            </div>
                        </>
                    )}
                    {isOff && <div className={`${styles.offText} ${isPreparing ? styles.preparing : ''}`} style={offTextStyle}>
                        {isPreparing ? (
                            <>
                                스케쥴 준비중<br />
                                <span className={styles.noBreak}>|･ω･)</span>
                            </>
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
