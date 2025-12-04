"use client";

import InfoModal from './InfoModal';

// ... existing imports

const ScheduleGrid = forwardRef<HTMLDivElement, Props>(({ data, onExport }, ref) => {
    const [selectedCharacters, setSelectedCharacters] = useState<Set<string>>(
        new Set(data.characters.map(c => c.id))
    );
    const [filterOpen, setFilterOpen] = useState(false);
    const [infoModalOpen, setInfoModalOpen] = useState(false);
    // ... existing state

    // ... existing handlers

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
                                <button className={`${styles.filterButton} ${styles.fullWidth}`} onClick={() => setFilterOpen(!filterOpen)}>
                                    {filterOpen ? '▼' : '▶'} 필터
                                </button>
                            </div>
                        </div>
                    </div>

                    {filterOpen && (
                        // ... existing filter panel
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

                {/* ... existing grid */}
                <div
                    className={styles.gridWrapper}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <div
                        className={styles.grid}
                        data-current-day={currentDayIndex}
                        style={{ '--char-count': filteredData.characters.length } as React.CSSProperties}
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
                                    {char.avatarUrl ? (
                                        <img
                                            src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`}
                                            alt={char.name}
                                            className={styles.avatarImage}
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className={styles.avatarPlaceholder}>{char.name[0]}</div>
                                    )}
                                    <span className={styles.charName}>{char.name}</span>
                                </a>

                                {/* Schedule Cells */}
                                {DAYS.map((day, index) => {
                                    const item = char.schedule[day];
                                    const isOff = item?.type === 'off' || !item;
                                    // Determine special class based on type
                                    let specialClass = '';
                                    if (item?.type === 'collab_maivi') specialClass = styles.collab_maivi;
                                    else if (item?.type === 'collab_hanavi') specialClass = styles.collab_hanavi;
                                    else if (item?.type === 'collab_universe') specialClass = styles.collab_universe;
                                    else if (item?.type === 'collab') specialClass = styles.collab;
                                    // Backward compatibility for content string
                                    else if (item?.content?.includes('메이비 합방')) specialClass = styles.collab_maivi;

                                    const isPreparing = item?.content?.includes('스케쥴 준비중');

                                    return (
                                        <div
                                            key={`${char.id}-${day}`}
                                            data-day-index={index}
                                            className={`
                                                ${styles.scheduleCell}
                                                ${styles[char.colorTheme]}
                                                ${isOff ? styles.off : ''}
                                                ${specialClass}
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
            <InfoModal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
        </div>
    );
});

ScheduleGrid.displayName = 'ScheduleGrid';

export default ScheduleGrid;
