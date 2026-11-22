"use client";

import { SCHEDULE_RELEASE_VERSION } from '@/data/scheduleRelease';

import BaseModal from './BaseModal';

export default function WhatsNewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="What’s New" maxWidth="480px" variant="sheet" focusCloseOnOpen>
            <section aria-label={`버전 ${SCHEDULE_RELEASE_VERSION}`} className="grid gap-3 border-t border-pink-100 pt-3 text-sm leading-relaxed text-stone-700">
                <h3 className="font-semibold text-stone-900">{SCHEDULE_RELEASE_VERSION}</h3>
                <ul className="grid list-disc gap-2 ps-5 [word-break:keep-all]">
                    <li>합방에 멤버를 추가해도 기존 멤버의 합류 시간이 유지됩니다.</li>
                    <li>공개 시간표의 필터와 이미지 저장 버튼을 다듬었습니다.</li>
                    <li>관리자 편집 화면의 글꼴과 셀 배치를 공개 시간표에 맞췄습니다.</li>
                    <li>시간표에서 방송 내용을 복사하면 배경색 없이 붙여넣을 수 있습니다.</li>
                </ul>
            </section>
        </BaseModal>
    );
}
