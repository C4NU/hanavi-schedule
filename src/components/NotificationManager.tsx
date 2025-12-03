"use client";

import { useEffect, useRef } from 'react';
import { useSchedule } from '@/hooks/useSchedule';

export default function NotificationManager() {
    const { schedule } = useSchedule();
    const lastScheduleRef = useRef<string>('');
    const isFirstMount = useRef(true);

    useEffect(() => {
        // Request notification permission on mount
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (!schedule) return;

        const currentScheduleStr = JSON.stringify(schedule);

        if (isFirstMount.current) {
            lastScheduleRef.current = currentScheduleStr;
            isFirstMount.current = false;
            return;
        }

        if (lastScheduleRef.current && lastScheduleRef.current !== currentScheduleStr) {
            // Schedule has changed

            // 1. Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('하나비 스케줄 업데이트', {
                    body: '스케줄이 업데이트되었습니다. 확인해보세요!',
                    icon: '/favicon.ico'
                });
            }

            // 2. In-app Alert (Toast)
            // Simple implementation using standard alert for now, or we can add a toast component later
            // For a better UX, we'll just rely on the browser notification or a subtle visual cue.
            // But the user asked for "web app / browser update alarm", so let's add a visual cue.
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce cursor-pointer';
            toast.textContent = '📅 스케줄이 업데이트되었습니다!';
            toast.onclick = () => {
                toast.remove();
                window.location.reload();
            };
            document.body.appendChild(toast);

            // Auto remove after 5 seconds
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 5000);

            lastScheduleRef.current = currentScheduleStr;
        }
    }, [schedule]);

    return null;
}
