"use client";

import { SCHEDULE_RELEASE_VERSION } from '@/data/scheduleRelease';

import BaseModal from './BaseModal';

export default function WhatsNewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="What’s New" maxWidth="480px" variant="sheet" focusCloseOnOpen>
            <section aria-label={`버전 ${SCHEDULE_RELEASE_VERSION}`} className="grid gap-3 border-t border-pink-100 pt-3 text-sm leading-relaxed text-stone-700">
                <h3 className="font-semibold text-stone-900">{SCHEDULE_RELEASE_VERSION}</h3>
                <ul className="grid list-disc gap-2 ps-5 [word-break:keep-all]">
                    <li>방송 제목으로 지난 시간표를 찾을 수 있어요.</li>
                    <li>모바일에서 주차와 요일을 바꾸기 쉽도록 메뉴와 버튼을 다듬었어요.</li>
                    <li>관리자 편집 시트와 저장 후 업데이트 알림의 디자인을 맞췄어요.</li>
                </ul>
            </section>
        </BaseModal>
    );
}
