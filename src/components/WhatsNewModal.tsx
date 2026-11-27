"use client";

import { useState } from 'react';
import { SCHEDULE_RELEASES } from '@/data/scheduleRelease';
import BaseModal from './BaseModal';
import headerStyles from './ScheduleHeader.module.css';

export default function WhatsNewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="What’s New" maxWidth="480px" variant="sheet" focusCloseOnOpen>
            {isOpen && <ReleaseHistory />}
        </BaseModal>
    );
}

function ReleaseHistory() {
    const [index, setIndex] = useState(0);
    const { version, changes } = SCHEDULE_RELEASES[index];
    return (
        <div className="grid gap-4 border-t border-pink-100 pt-3">
            <section aria-label={`버전 ${version}`} aria-live="polite" className="grid gap-3 text-sm leading-relaxed text-stone-700">
                <h3 className="font-semibold text-stone-900">{version}</h3>
                <ul className="grid list-disc gap-2 ps-5 [word-break:keep-all]">
                    {changes.map(change => <li key={change}>{change}</li>)}
                </ul>
            </section>
            <nav aria-label="버전 탐색" className="grid grid-cols-2 gap-2">
                <button type="button" className={`${headerStyles.button} min-h-10 disabled:opacity-45`}
                    disabled={index === SCHEDULE_RELEASES.length - 1} onClick={() => setIndex(index + 1)}>이전 버전</button>
                <button type="button" className={`${headerStyles.button} min-h-10 disabled:opacity-45`}
                    disabled={index === 0} onClick={() => setIndex(index - 1)}>다음 버전</button>
            </nav>
        </div>
    );
}
