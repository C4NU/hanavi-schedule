import type { ReplayPlatform } from '@/utils/scheduleReplay';

export default function ReplayIcon({ platform, size = 19 }: { platform?: ReplayPlatform; size?: number }) {
    const youtube = platform === 'youtube';
    return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect x="2.5" y="4.5" width="19" height="15" rx="4" fill={youtube ? '#d80000' : 'none'} stroke={youtube ? '#d80000' : 'currentColor'} strokeWidth="1.65" />
            <path d="m10 8.5 6 3.5-6 3.5z" fill={youtube ? '#fff' : 'currentColor'} />
        </svg>
    );
}
