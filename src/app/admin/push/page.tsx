"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import controls from '@/components/ScheduleHeader.module.css';
import cardStyles from '@/components/admin/AdminLoginForm.module.css';
import styles from '@/components/admin/AdminSchedule.module.css';

export default function AdminPushPage() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [feedback, setFeedback] = useState<{ message: string; error?: boolean }>();
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setFeedback({ message: '푸시 알림을 발송 중이에요.' });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setFeedback({ message: '관리자 로그인 후 발송할 수 있어요.', error: true });
                return;
            }

            const res = await fetch('/api/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    title: title || undefined,
                    body: body || undefined,
                }),
            });

            if (res.ok) {
                const result = await res.json();
                setFeedback({ message: `발송 성공 ${result.successCount}건 · 실패 ${result.failureCount}건` });
            } else {
                setFeedback({ message: '푸시 알림을 보내지 못했어요.', error: true });
            }
        } catch (error) {
            setFeedback({ message: '발송 요청을 완료하지 못했어요.', error: true });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className={`${controls.theme} ${cardStyles.page}`}>
            <section className={cardStyles.card} aria-labelledby="push-title">
                <h1 id="push-title" className={cardStyles.title}>수동 푸시 발송</h1>
                <form className={styles.sheetBody} onSubmit={event => { event.preventDefault(); void handleSend(); }}>
                    <label className={styles.field}>
                        제목 (선택)
                        <input
                            value={title}
                            onChange={event => setTitle(event.target.value)}
                            placeholder="하나비 스케줄 업데이트"
                        />
                    </label>
                    <label className={styles.field}>
                        내용 (선택)
                        <textarea
                            rows={3}
                            value={body}
                            onChange={event => setBody(event.target.value)}
                            placeholder="스케줄이 업데이트되었습니다."
                        />
                    </label>
                    {feedback && <p role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
                    <div className={styles.actions}>
                        <button type="submit" disabled={isLoading} className={`${controls.button} ${styles.primary}`}>
                            {isLoading ? '발송 중…' : '푸시 발송'}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}
