import styles from './AdminSchedule.module.css';
import type { ReplayCandidate } from '@/types/replay';

const samples: Record<'cime' | 'youtube', ReplayCandidate[]> = {
    cime: [
        { member: '예시 멤버 A', date: '2026-11-24', scheduleTitle: '마인크래프트', videoTitle: '마인크래프트 첫날', changes: ['다시보기 링크', '카테고리 · Minecraft'] },
        { member: '예시 멤버 B', date: '2026-11-25', scheduleTitle: '잡담', videoTitle: '저녁 이야기', changes: ['다시보기 링크'] },
    ],
    youtube: [
        { member: '예시 멤버 A', date: '2026-11-24', scheduleTitle: '스듀', videoTitle: '26.11.24 스타듀 밸리 1일차', changes: ['다시보기 링크'] },
        { member: '예시 멤버 B', date: '2026-11-25', videoTitle: '26.11.25 저녁 방송', changes: ['다시보기 링크', '빈 방송 제목 채우기'] },
    ],
};

export default function ReplayCandidateList({ platform, candidates, sample }: {
    platform: keyof typeof samples;
    candidates: ReplayCandidate[] | null;
    sample: boolean;
}) {
    const rows = sample ? samples[platform] : candidates;
    if (!rows) return null;

    return (
        <section aria-label={sample ? '연결 후보 샘플' : '연결 후보 목록'}>
            <h3>{sample ? '연결 후보 샘플' : `연결 후보 ${rows.length}개`}</h3>
            {sample && <p>가상 데이터예요. API 조회나 시간표 변경 없이 목록을 미리 볼 수 있어요.</p>}
            {rows.length === 0 ? <p>연결할 후보가 없어요.</p> : (
                <ul className={styles.replayCandidates} tabIndex={rows.length > 4 ? 0 : undefined}>
                    {rows.map((candidate, index) => (
                        <li key={`${candidate.member}-${candidate.date}-${index}`}>
                            <span>{candidate.member} · <time dateTime={candidate.date}>{candidate.date}</time></span>
                            <strong>{candidate.scheduleTitle || '제목 없는 일정'}</strong>
                            {candidate.url ? (
                                <a href={candidate.url} target="_blank" rel="noopener noreferrer">{candidate.videoTitle || '다시보기 열기'} ↗</a>
                            ) : <span>{candidate.videoTitle}</span>}
                            <small>{candidate.changes.join(' · ')}</small>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
