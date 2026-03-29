"use client";

import React from 'react';
import BaseModal from './BaseModal';

interface AdminInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AdminInfoModal: React.FC<AdminInfoModalProps> = ({ isOpen, onClose }) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="관리자 페이지 사용 가이드 🛠️"
            maxWidth="600px"
        >
            <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
                <section>
                    <h3 className="font-bold text-gray-800 mb-2 border-l-4 border-pink-400 pl-2">관리자 페이지란?</h3>
                    <p>
                        멤버들의 주간 스케줄을 직접 수정하고 관리할 수 있는 전용 공간입니다.
                        여기서 변경한 내용은 즉시 사용자 페이지에 반영되며, 알림을 보낼 수도 있습니다.
                    </p>
                </section>

                <section>
                    <h3 className="font-bold text-gray-800 mb-2 border-l-4 border-pink-400 pl-2">링크 버튼 기능 🔗</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>YT 버튼</strong>: 각 스케줄 셀에 YouTube 다시보기 링크를 연결할 수 있습니다.</li>
                        <li>링크가 연결되면 버튼이 <strong>[YT]</strong>로 표시되며, 수정 모드에서도 바로 확인할 수 있습니다.</li>
                    </ul>
                </section>

                <section>
                    <h3 className="font-bold text-gray-800 mb-2 border-l-4 border-pink-400 pl-2">텍스트 입력 및 서식 ✍️</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>서식 도구</strong>: 텍스트를 드래그하면 <strong>서식 툴바</strong>가 나타나 볼드, 이탈릭, 취소선을 적용할 수 있습니다.</li>
                        <li><strong>단축키 지원</strong>:
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-mono border"><b>Bold</b>: Cmd+B</span>
                                <span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-mono border"><i>Italic</i>: Cmd+I</span>
                                <span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-mono border"><del>Strike</del>: Cmd+Shift+X</span>
                            </div>
                        </li>
                    </ul>
                </section>

                <section>
                    <h3 className="font-bold text-gray-800 mb-2 border-l-4 border-pink-400 pl-2">시간 입력 특수 기능 ⏰</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>휴방 처리</strong>: 타입을 '휴방'으로 선택하면 시간과 내용이 자동으로 비활성화 처리됩니다.</li>
                        <li><strong>자동 포맷팅</strong>: 방송 시간에 숫자만 입력(예: 13)해도 자동으로 시간 형식(13:00)으로 변환됩니다.</li>
                    </ul>
                </section>

                <section>
                    <h3 className="font-bold text-gray-800 mb-2 border-l-4 border-pink-400 pl-2">멤버 관리 및 정렬 👥</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>멤버 추가/제거</strong>: '멤버 추가' 버튼으로 자유롭게 멤버를 늘리거나 줄일 수 있습니다.</li>
                        <li><strong>상세 설정</strong>: 기본 방송 시간, 정기 휴방일, 고유 테마 색상(Hex)을 직접 설정할 수 있습니다.</li>
                        <li><strong>자동 정렬</strong>: 시간을 입력하면 적절한 순번이 자동으로 계산됩니다.</li>
                    </ul>
                </section>

                <div className="p-4 bg-pink-50 rounded-xl border border-pink-100 text-xs text-pink-600 font-medium">
                    💡 저장이 완료되면 자동으로 사용자가 변경 사항을 알 수 있도록 알림(Web Push) 발송 프로세스가 시작됩니다.
                </div>
            </div>
        </BaseModal>
    );
};

export default AdminInfoModal;
