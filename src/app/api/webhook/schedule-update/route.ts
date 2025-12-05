import { NextResponse } from 'next/server';
import { sendMulticastNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const { secret } = await request.json();
        const adminSecret = process.env.ADMIN_SECRET;

        // Simple secret check
        if (!adminSecret || secret !== adminSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Trigger notification
        // In the future, we can parse the request body to distinguish between
        // different types of updates if needed.
        const result = await sendMulticastNotification(
            '하나비 스케줄 업데이트',
            '새로운 스케줄이 등록되었습니다! 지금 확인해보세요.',
            '/icon-192x192.png'
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
