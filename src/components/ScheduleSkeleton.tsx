"use client";

import React from 'react';
import styles from './ScheduleGrid.module.css';

const ScheduleSkeleton = () => {
    // Generate a fixed number of skeleton rows (e.g., 6 members)
    const skeletonRows = Array.from({ length: 6 });
    const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    return (
        <div className={styles.exportWrapper}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.titleRow}>
                        <div className={styles.titleGroup}>
                            <div className={`${styles.title} skeleton`} style={{ width: '280px', height: '3rem', borderRadius: '10px' }}>&nbsp;</div>
                            <div className={styles.dateNav} style={{ marginTop: '10px' }}>
                                <div className="skeleton" style={{ width: '200px', height: '1.5rem', borderRadius: '20px' }}>&nbsp;</div>
                            </div>
                        </div>
                        <div className={styles.controls}>
                            <div className="skeleton" style={{ width: '120px', height: '40px', borderRadius: '10px' }}>&nbsp;</div>
                        </div>
                    </div>
                </header>

                <div className={styles.gridWrapper}>
                    <div className={styles.grid} style={{ '--char-count': 6 } as React.CSSProperties}>
                        {/* Corner Cell */}
                        <div className={styles.cornerCell}></div>
                        
                        {/* Day Headers */}
                        {DAYS.map((day) => (
                            <div key={day} className={styles.dayHeader} style={{ background: '#f0f0f0' }}>
                                <div className="skeleton" style={{ width: '60%', height: '1rem', margin: '0 auto' }}>&nbsp;</div>
                            </div>
                        ))}

                        {/* Skeleton Rows */}
                        {skeletonRows.map((_, i) => (
                            <React.Fragment key={i}>
                                {/* Character Cell Skeleton */}
                                <div className={styles.charCell} style={{ background: '#f5f5f5', border: 'none' }}>
                                    <div className="skeleton-circle skeleton" style={{ width: '40px', height: '40px', marginBottom: '8px' }}></div>
                                    <div className="skeleton" style={{ width: '60%', height: '0.8rem' }}></div>
                                </div>

                                {/* Schedule Cell Skeletons */}
                                {DAYS.map((day) => (
                                    <div key={day} className={styles.scheduleCell} style={{ background: 'white', borderColor: '#f0f0f0' }}>
                                        <div className="skeleton" style={{ width: '50%', height: '1.1rem', marginBottom: '10px' }}></div>
                                        <div className="skeleton" style={{ width: '80%', height: '0.9rem', marginBottom: '4px' }}></div>
                                        <div className="skeleton" style={{ width: '40%', height: '0.9rem' }}></div>
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleSkeleton;
