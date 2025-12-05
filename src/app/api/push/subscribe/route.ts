import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { endpoint: token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        // Save token to Firestore
        // Use token as doc ID to prevent duplicates
        await db.collection('fcm_tokens').doc(token).set({
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
