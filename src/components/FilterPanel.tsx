import React from 'react';
import { WeeklySchedule } from '@/types/schedule';
import styles from './ScheduleGrid.module.css';

interface FilterPanelProps {
    data: WeeklySchedule;
    activeSelectedChars: Set<string>;
    handleToggle: (charId: string) => void;
    handleSelectAll: () => void;
    handleDeselectAll: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
    data,
    activeSelectedChars,
    handleToggle,
    handleSelectAll,
    handleDeselectAll
}) => {
    return (
        <div className={styles.filterPanel}>
            <div className={styles.quickActions}>
                <button onClick={handleSelectAll} className={styles.quickButton}>전체 선택</button>
                <button onClick={handleDeselectAll} className={styles.quickButton}>전체 해제</button>
            </div>
            <div className={styles.checkboxGrid}>
                {data.characters.map(char => (
                    <label key={char.id} className={`${styles.checkbox} ${activeSelectedChars.has(char.id) ? styles[char.colorTheme] : ''}`}>
                        <input
                            type="checkbox"
                            checked={activeSelectedChars.has(char.id)}
                            onChange={() => handleToggle(char.id)}
                        />
                        <span>{char.name}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default FilterPanel;
