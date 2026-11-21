"use client";

import BaseModal from './BaseModal';

export default function WhatsNewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title="What’s New" maxWidth="480px">
            <section aria-label="버전 2.0.3" className="grid gap-2 text-sm text-stone-700">
                <h3 className="font-semibold text-stone-900">2.0.3</h3>
                <ul className="grid list-disc gap-2 pl-5">
                    <li>합방에 멤버를 추가해도 기존 멤버의 합류 시간이 유지됩니다.</li>
                    <li>공개 시간표의 필터와 이미지 저장 버튼을 다듬었습니다.</li>
                </ul>
            </section>
        </BaseModal>
    );
}
