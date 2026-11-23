import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './MobileScheduleMenu.module.css';
import headerStyles from './ScheduleHeader.module.css';

const iconPaths = {
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    menu: 'M4 6h16M4 12h16M4 18h16',
    calendar: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM7 3v4m10-4v4M3 10h18',
    download: 'M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3',
    card: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 4h4v6H7zm7 1h4m-4 4h4',
    filter: 'M4 6h16M7 12h10m-7 6h4',
    search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-1.5 4.5L21 21',
    check: 'M20 6 9 17l-5-5',
    circle: 'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0Z',
    help: 'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0ZM9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01',
    link: 'M13 5h6v6m0-6-8 8m6 0v6H5V7h6',
    close: 'm6 6 12 12M18 6 6 18',
    bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0',
    play: 'M8 5v14l11-7L8 5Z',
    edit: 'm14 6 4 4M4 20l4-.8L20 7l-4-4L4 15.2Z',
    people: 'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m19 0v-2a4 4 0 0 0-3-4m-4-3a4 4 0 0 0 0-8M13 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    logout: 'M11 4H5v16h6m-2-8h12m-4-4 4 4-4 4',
    message: 'M20 15a2 2 0 0 1-2 2H9l-5 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z',
};

type Row = {
    label: string;
    icon: keyof typeof iconPaths;
    pressed?: boolean;
    disabled?: boolean;
} & ({ onSelect: () => void; href?: never } | { href: string; onSelect?: never });

type Section = { title: string; rows: Row[]; skinSelector?: ReactNode };

export default function MobileScheduleMenu({ sections, onOpen }: {
    sections: Section[];
    onOpen: () => void;
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const desktop = window.matchMedia('(min-width: 768px)');
        const closeOnDesktop = () => { if (desktop.matches) dialog.close(); };
        desktop.addEventListener('change', closeOnDesktop);
        return () => desktop.removeEventListener('change', closeOnDesktop);
    }, []);

    return (
        <div className={styles.menu}>
            <button
                type="button"
                className={styles.trigger}
                aria-label="메뉴"
                aria-haspopup="dialog"
                aria-controls="mobile-schedule-menu"
                aria-expanded={isOpen}
                onClick={() => {
                    dialogRef.current?.showModal();
                    setIsOpen(true);
                    onOpen();
                }}
            >
                <MenuIcon name="menu" />
            </button>
            <dialog
                ref={dialogRef}
                id="mobile-schedule-menu"
                className={styles.panel}
                aria-labelledby="mobile-schedule-menu-title"
                onClose={event => {
                    if (!event.currentTarget.open) setIsOpen(false);
                }}
                onClick={event => {
                    if (event.target === event.currentTarget) dialogRef.current?.close();
                }}
            >
                <div className={styles.morphIcon} aria-hidden="true"><MenuIcon name="menu" /></div>
                <div className={styles.content}>
                    <div className={styles.heading}>
                        <h2 id="mobile-schedule-menu-title">시간표 설정</h2>
                        <button className={`${styles.close} ${headerStyles.sheetClose}`} type="button" aria-label="메뉴 닫기" onClick={() => dialogRef.current?.close()}>
                            <MenuIcon name="close" />
                        </button>
                    </div>
                    {sections.map(section => (
                        <section key={section.title} className={styles.section} aria-label={section.title}>
                            <h3>{section.title}</h3>
                            {section.rows.map(row => {
                                const content = <><MenuIcon name={row.icon} />{row.label}</>;
                                return row.href ? (
                                    <a key={row.label} className={styles.row} href={row.href} target="_blank" rel="noopener noreferrer" onClick={() => dialogRef.current?.close()}>
                                        {content}
                                    </a>
                                ) : (
                                    <button
                                        key={row.label}
                                        className={styles.row}
                                        type="button"
                                        aria-pressed={row.pressed}
                                        disabled={row.disabled}
                                        onClick={() => {
                                            dialogRef.current?.close();
                                            row.onSelect?.();
                                        }}
                                    >
                                        {content}
                                    </button>
                                );
                            })}
                            {section.skinSelector && (
                                <div className={styles.skin}>
                                    <span>스킨</span>
                                    {section.skinSelector}
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </dialog>
        </div>
    );
}

export function MenuIcon({ name, size = 20 }: { name: keyof typeof iconPaths; size?: number }) {
    return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
            <path d={iconPaths[name]} />
        </svg>
    );
}
