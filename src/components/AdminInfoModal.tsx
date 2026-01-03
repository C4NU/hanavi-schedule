import React from 'react';
import styles from './InfoModal.module.css'; // Reusing existing styles

interface AdminInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AdminInfoModal: React.FC<AdminInfoModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>&times;</button>

                <h2 className={styles.title}>관리자 페이지 사용 가이드 🛠️</h2>

                <div className={styles.content}>
                    <section>
                        <h3>관리자 페이지란?</h3>
                        <p>
                            멤버들의 주간 스케줄을 직접 수정하고 관리할 수 있는 전용 공간입니다.
                            여기서 변경한 내용은 즉시 사용자 페이지에 반영되며, 알림을 보낼 수도 있습니다.
                        </p>
                    </section>

                    <section>
                        <h3>링크 버튼 기능 🔗</h3>
                        <ul>
                            <li><strong>YT 버튼</strong>: 각 스케줄 셀에 YouTube 다시보기 링크를 연결할 수 있습니다.</li>
                            <li>링크가 연결되면 버튼이 <strong>[YT]</strong>로 표시되며, 수정 모드에서도 바로 확인할 수 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h3>텍스트 입력 및 서식 ✍️</h3>
                        <ul>
                            <li><strong>서식 도구</strong>: 텍스트를 마우스로 드래그하면 <strong>서식 툴바</strong>가 나타나 볼드, 이탈릭, 취소선을 적용할 수 있습니다.</li>
                            <li><strong>단축키 지원</strong>:
                                <ul className="list-none pl-4 mt-1 text-sm text-gray-500">
                                    <li>• <strong>굵게</strong>: Ctrl(Cmd) + B</li>
                                    <li>• <strong>기울임</strong>: Ctrl(Cmd) + I</li>
                                    <li>• <strong>취소선</strong>: Ctrl(Cmd) + Shift + X</li>
                                </ul>
                            </li>
                            <li><strong>이모지</strong>: 윈도우 키 + . (마침표) 또는 맥의 Ctrl + Cmd + Space를 눌러 이모지를 넣을 수 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h3>주요 기능 특징 ✨</h3>
                        <ul>
                            <li><strong>자동 저장 방지</strong>: 실수를 방지하기 위해 '저장하기' 버튼을 눌러야만 실제 서버에 반영됩니다.</li>
                            <li><strong>실시간 미리보기</strong>: 입력하는 대로 화면에 바로 반영되어 사용자가 볼 화면을 미리 짐작할 수 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h3>시간 입력 특수 기능 ⏰</h3>
                        <ul>
                            <li><strong>휴방 처리</strong>: 타입을 '휴방'으로 선택하면 시간과 내용이 자동으로 비활성화 처리됩니다.</li>
                            <li><strong>합방 색상</strong>: 합방(메이비, 하나비, 유니버스 등)을 선택하면 해당 합방 테마 색상이 자동으로 적용됩니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h3>저장 및 알림 기능 🔔</h3>
                        <ul>
                            <li><strong>알림 전송</strong>: 저장이 완료되면 자동으로 사용자가 변경 사항을 알 수 있도록 알림(Web Push) 발송 프로세스가 시작됩니다.</li>
                            <li><strong>취소 가능</strong>: 알림 전송 전 5초간의 대기 시간이 주어지며, 이때 '취소'를 누르면 알림 없이 조용히 저장만 할 수 있습니다.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AdminInfoModal;
