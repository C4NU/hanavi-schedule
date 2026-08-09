"use client";

import React from 'react';
import styles from './InfoModal.module.css';
import BaseModal from './BaseModal';
import { supabase } from '@/lib/supabaseClient';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    isAdmin?: boolean;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, isAdmin }) => {
    const [email, setEmail] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [syncResult, setSyncResult] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            fetch('/api/settings')
                .then(res => res.json())
                .then(data => {
                    if (data.email) setEmail(data.email);
                })
                .catch(err => console.error('Failed to load settings:', err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    const handleCimeSync = async () => {
        if (isSyncing) return;
        
        setIsSyncing(true);
        setSyncResult(null);
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setSyncResult('오류: 관리자 로그인이 필요합니다.');
                return;
            }

            const res = await fetch('/api/cron/update-cime-replays', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });
            const data = await res.json();
            
            if (data.success) {
                setSyncResult(`성공: ${data.updated}개의 다시보기가 업데이트되었습니다.`);
                // Refresh page after a delay to show results if needed, 
                // but since it's just links, maybe just a message is enough.
            } else {
                setSyncResult(`오류: ${data.error || '알 수 없는 오류가 발생했습니다.'}`);
            }
        } catch {
            setSyncResult('오류: 서버와의 통신에 실패했습니다.');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <BaseModal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="하나비 스케줄 사용 가이드 💡"
            maxWidth="600px"
        >
            <div className={styles.content}>
                {isAdmin && (
                    <section className={styles.adminSection}>
                        <h3 style={{ color: '#8956fb' }}>관리자 전용 도구 🛠️</h3>
                        <div className={styles.adminBox}>
                            <p style={{ fontSize: '0.85rem', marginBottom: '10px' }}>
                                씨미(ci.me) VOD 자동 링크를 수동으로 동기화합니다.
                            </p>
                            <button 
                                className={styles.syncButton}
                                onClick={handleCimeSync}
                                disabled={isSyncing}
                            >
                                {isSyncing ? '동기화 중...' : '씨미 다시보기 수동 동기화'}
                            </button>
                            {syncResult && (
                                <p className={styles.syncResult}>{syncResult}</p>
                            )}
                        </div>
                    </section>
                )}

                <section>
                    <h3>버튼 설명</h3>
                    <ul>
                        <li><strong>필터</strong>: 원하는 멤버의 방송만 골라볼 수 있습니다.</li>
                        <li><strong>이미지로 저장</strong>: 현재 보이는 스케줄을 이미지 파일로 저장합니다.</li>
                        <li><strong>캘린더 추가</strong>: ics 파일을 다운로드하여 내 캘린더에 일정을 등록할 수 있습니다.</li>
                    </ul>
                </section>

                <section>
                    <h3>멤버 프로필 💖</h3>
                    <p>
                        스케줄표의 멤버 프로필 사진이나 이름을 누르면, 해당 멤버의 <strong>치지직 채널</strong>로 바로 이동합니다!
                    </p>
                </section>

                <section>
                    <h3>알림 안내 🔔</h3>
                    <p>
                        웹 앱의 특성상, 앱을 실행했을 때 최신 스케줄 정보를 불러오며 알림이 도착할 수 있습니다.
                    </p>
                </section>

                <section>
                    <h3>화면 모드 안내 📱💻</h3>
                    <ul>
                        <li><strong>모바일</strong>: 좌우로 스와이프하여 요일별 스케줄을 확인할 수 있습니다.</li>
                        <li><strong>데스크탑/태블릿</strong>: 일주일치 스케줄을 한눈에 볼 수 있습니다.</li>
                    </ul>
                </section>

                <section>
                    <h3>다시보기 기능 📺</h3>
                    <p>
                        스케줄에 <strong>YouTube 아이콘</strong>(▶️)이 표시된 경우, 해당 셀을 누르면 그 날의 방송 다시보기를 바로 시청할 수 있습니다!
                    </p>
                </section>

                <section className={styles.contact}>
                    <h3>문의사항 📧</h3>
                    <p>
                        버그 제보나 건의사항은 아래 이메일로 보내주세요.<br />
                        {isLoading ? (
                            <span className="text-gray-400">불러오는 중...</span>
                        ) : (
                            <a href={`mailto:${email}`}>{email || '이메일 정보 없음'}</a>
                        )}
                        <br />
                        <a href="https://github.com/C4NU/hanavi_schedule" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 mt-2 hover:underline">
                            GitHub 이슈 제보하기
                        </a>
                    </p>
                </section>
            </div>
        </BaseModal>
    );
};

export default InfoModal;
