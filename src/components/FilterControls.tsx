"use client";

import React, { useState } from 'react';
import styles from './FilterControls.module.css';

interface Props {
    characters: string[];
    selectedCharacters: Set<string>;
    onFilterChange: (selected: Set<string>) => void;
    onExport: () => void;
}

export default function FilterControls({ characters, selectedCharacters, onFilterChange, onExport }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = (charId: string) => {
        const newSelected = new Set(selectedCharacters);
        if (newSelected.has(charId)) {
            newSelected.delete(charId);
        } else {
            newSelected.add(charId);
        }
        onFilterChange(newSelected);
    };

    const handleSelectAll = () => {
        onFilterChange(new Set(characters));
    };

    const handleDeselectAll = () => {
        onFilterChange(new Set());
    };

    return (
        <div className={styles.container}>
            <button className={styles.toggleButton} onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '▼' : '▶'} 필터
            </button>

            {isOpen && (
                <div className={styles.filterPanel}>
                    <div className={styles.quickActions}>
                        <button onClick={handleSelectAll} className={styles.quickButton}>전체 선택</button>
                        <button onClick={handleDeselectAll} className={styles.quickButton}>전체 해제</button>
                    </div>

                    <div className={styles.checkboxGrid}>
                        {characters.map(charId => (
                            <label key={charId} className={styles.checkbox}>
                                <input
                                    type="checkbox"
                                    checked={selectedCharacters.has(charId)}
                                    onChange={() => handleToggle(charId)}
                                />
                                <span>{charId}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <button className={styles.exportButton} onClick={onExport}>
                📥 PNG 저장
            </button>
        </div>
    );
}
