import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { sendMulticastNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const adminSecret = process.env.ADMIN_SECRET;

        if (!adminSecret || !authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const providedSecret = authHeader.slice(7);
        const a = Buffer.from(providedSecret);
        const b = Buffer.from(adminSecret);

        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, body } = await request.json();

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
