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
            title="하나비 스케줄 사용 가이드"
            maxWidth="600px"
            variant="sheet"
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
                    <h3>시간표와 메뉴</h3>
                    <ul>
                        <li><strong>보기 전환</strong>으로 멤버별 시간표와 주간 통합 시간표를 바꿔볼 수 있어요.</li>
                        <li><strong>멤버 필터</strong>에서 보고 싶은 멤버를 고를 수 있어요.</li>
                        <li><strong>이미지로 저장</strong>은 현재 시간표를 PNG로 저장해요. <strong>캘린더 추가</strong>는 일정 등록용 ICS 파일을 내려받아요.</li>
                    </ul>
                </section>

                <section>
                    <h3>씨미 방송과 다시보기</h3>
                    <p>
                        멤버의 프로필을 누르면 등록된 플랫폼을 확인할 수 있어요. <strong>씨미(ci.me)</strong>에서 방송을 볼 수 있고,
                        다시보기 링크가 등록된 일정은 상세 화면에서 링크를 열 수 있어요.
                    </p>
                </section>

                <section>
                    <h3>알림</h3>
                    <p>
                        알림을 허용하면 시간표 업데이트 알림을 받을 수 있어요.
                    </p>
                </section>

                <section>
                    <h3>화면별 사용법</h3>
                    <ul>
                        <li><strong>모바일</strong>: 좌우로 스와이프하여 요일별 스케줄을 확인할 수 있습니다.</li>
                        <li><strong>데스크탑/태블릿</strong>: 일주일치 스케줄을 한눈에 볼 수 있습니다.</li>
                    </ul>
                </section>

                <section>
                    <h3>폰트와 이미지 출처</h3>
                    <table className={styles.creditsTable}>
                        <caption className="sr-only">폰트와 이미지 출처</caption>
                        <thead>
                            <tr><th scope="col">항목</th><th scope="col">출처·라이선스</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <th scope="row">
                                    <a href="https://fonts.adobe.com/fonts/210-omnigothic">210 옴니고딕</a>,{' '}
                                    <a href="https://fonts.adobe.com/fonts/hellofont-id-le-yuan">HelloFont ID Le Yuan</a>
                                </th>
                                <td><a href="https://helpx.adobe.com/fonts/web/font-licensing/webfont-licensing.html">Adobe Fonts 웹폰트</a></td>
                            </tr>
                            <tr>
                                <th scope="row">
                                    <a href="https://github.com/orioncactus/pretendard/blob/main/LICENSE">Pretendard</a>,{' '}
                                    <a href="https://fonts.google.com/specimen/Montserrat">Montserrat</a>,{' '}
                                    <a href="https://fonts.google.com/specimen/Inter">Inter</a>,{' '}
                                    <a href="https://fonts.google.com/specimen/Cinzel">Cinzel</a>,{' '}
                                    <a href="https://fonts.google.com/specimen/Caveat">Caveat</a>,{' '}
                                    <a href="https://fonts.google.com/specimen/Libre+Caslon+Display">Libre Caslon Display</a>
                                </th>
                                <td>SIL Open Font License</td>
                            </tr>
                            <tr>
                                <th scope="row"><a href="https://oddatelier.net/notice-board/oa-font-zen-serif/">ZEN SERIF</a></th>
                                <td>OA Entertainment 배포 및 사용 조건</td>
                            </tr>
                            <tr>
                                <th scope="row"><a href="https://fonts.cafe24.com/">Cafe24 Ssurround</a></th>
                                <td>카페24 폰트 이용약관</td>
                            </tr>
                            <tr><th scope="row">하나비 이미지</th><td>© 2026 Uplift Assets. 허가를 받아 사용했어요.</td></tr>
                            <tr><th scope="row">시간표 소스 코드</th><td>제작 반짝이 · MIT 라이선스</td></tr>
                        </tbody>
                    </table>
                </section>

                <section>
                    <h3>문의</h3>
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
