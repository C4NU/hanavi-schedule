import React from 'react';
import { CharacterSchedule } from '@/types/schedule';
import styles from './ScheduleGrid.module.css';

interface CharacterCellProps {
    char: CharacterSchedule;
    onClick: () => void;
    style?: React.CSSProperties;
}

const CharacterCell: React.FC<CharacterCellProps> = ({ char, onClick, style }) => {
    return (
        <div
            className={`${styles.charCell} ${styles[char.colorTheme] || ''}`}
            style={{
                ...(char.colorBg ? { backgroundColor: char.colorBg } : {}),
                ...(char.colorBorder ? { borderColor: char.colorBorder } : {}),
                cursor: 'pointer',
                ...style
            }}
            onClick={onClick}
        >
            {char.avatarUrl ? (
                <img 
                    src={char.avatarUrl.startsWith('http')
                        ? `/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`
                        : char.avatarUrl
                    } 
                    className={styles.charAvatar}
                    alt={char.name}
                    crossOrigin="anonymous"
                />
            ) : (
                <div className={styles.avatarPlaceholder}>{char.name[0]}</div>
            )}
            <div className={styles.nameOverlay}>{char.name}</div>
        </div>
    );
};

export default CharacterCell;
