import { NextResponse } from 'next/server';
import { sendMulticastNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const { secret, title, body } = await request.json();
        const adminSecret = process.env.ADMIN_SECRET;

        // Simple secret check
        if (!adminSecret || secret !== adminSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Trigger notification
        // Use provided title/body or fall back to defaults
        const result = await sendMulticastNotification(
            title || '하나비 스케줄 업데이트',
            body || '새로운 스케줄이 등록되었습니다! 지금 확인해보세요.',
            '/icon-192x192.png'
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
