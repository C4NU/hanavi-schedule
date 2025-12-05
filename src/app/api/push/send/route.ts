import { NextResponse } from 'next/server';
import { db, messagingAdmin } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        // 1. Verify Admin Secret
        const bodyData = await request.json();
        const { secret, title, body } = bodyData;
        const adminSecret = process.env.ADMIN_SECRET;

        if (!adminSecret || secret !== adminSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Tokens
        const tokensSnapshot = await db.collection('fcm_tokens').get();
        if (tokensSnapshot.empty) {
            return NextResponse.json({ message: 'No subscriptions found' });
        }

        const tokens = tokensSnapshot.docs.map(doc => doc.id);

        // 3. Send Notifications
        // Chunking
        const chunkSize = 500;
        const chunks = [];
        for (let i = 0; i < tokens.length; i += chunkSize) {
            chunks.push(tokens.slice(i, i + chunkSize));
        }

        let successCount = 0;
        let failureCount = 0;

        for (const chunk of chunks) {
            const message = {
                notification: {
                    title: title || '하나비 스케줄 업데이트',
                    body: body || '스케줄이 업데이트되었습니다. 확인해보세요!',
                },
                webpush: {
                    headers: {
                        'Urgency': 'high',
                    },
                    notification: {
                        icon: '/icon-192x192.png',
                    }
                },
                tokens: chunk
            };

            const response = await messagingAdmin.sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;

            if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const error = resp.error;
                        if (error?.code === 'messaging/registration-token-not-registered') {
                            failedTokens.push(chunk[idx]);
                        }
                    }
                });

                if (failedTokens.length > 0) {
                    const batch = db.batch();
                    failedTokens.forEach(t => {
                        batch.delete(db.collection('fcm_tokens').doc(t));
                    });
                    await batch.commit();
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sent to ${successCount} devices, failed ${failureCount}`
        });

    } catch (error) {
        console.error('Error sending push:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
