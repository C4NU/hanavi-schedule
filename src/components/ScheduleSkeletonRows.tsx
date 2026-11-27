import { Fragment, type CSSProperties } from 'react';
import styles from './ScheduleGrid.module.css';
import loadingStyles from './ScheduleSkeleton.module.css';

export const DEFAULT_SCHEDULE_SKELETON_ROWS = 6;

export default function ScheduleSkeletonRows({ rowCount, days }: { rowCount: number; days: string[] }) {
    return Array.from({ length: rowCount }, (_, row) => (
        <Fragment key={row}>
            <div
                className={styles.charCell}
                style={{
                    '--row-index': row + 2,
                    '--member-color': 'var(--schedule-loading-block)',
                    '--member-profile-background': 'var(--schedule-loading-block)',
                } as CSSProperties}
            >
                <div className={styles.charAvatar} />
                <div className={styles.nameOverlay}>
                    <span className={`${styles.nameText} ${loadingStyles.memberName}`} />
                </div>
            </div>
            {days.map((day, index) => (
                <div
                    key={day}
                    className={`${styles.scheduleCell} ${loadingStyles.broadcast}`}
                    data-day-index={index}
                    style={{ '--row-index': row + 2, '--col-index': index + 2 } as CSSProperties}
                >
                    <div className={loadingStyles.time} />
                    <div className={loadingStyles.title} />
                </div>
            ))}
        </Fragment>
    ));
}
