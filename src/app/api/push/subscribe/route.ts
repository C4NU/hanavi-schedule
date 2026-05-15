import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { createHash } from 'crypto';

const FCM_TOKEN_PATTERN = /^[A-Za-z0-9_:%-]{100,500}$/;

export async function POST(request: Request) {
    try {
        const { endpoint: token } = await request.json();

        if (!token || typeof token !== 'string') {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        if (!FCM_TOKEN_PATTERN.test(token)) {
            return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
        }

        const docId = createHash('sha256').update(token).digest('hex');

        await db.collection('fcm_tokens').doc(docId).set({
            token,
            updatedAt: new Date().toISOString(),
            userAgent: request.headers.get('user-agent') || ''
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
