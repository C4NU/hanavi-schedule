import { NextResponse } from 'next/server';
import { getScheduleFromSheet } from '@/utils/googleSheets';
import { db, messagingAdmin } from '@/lib/firebase-admin';
import crypto from 'crypto';

const cronSecret = process.env.CRON_SECRET;

const LAST_HASH_KEY = 'last_schedule_hash';
const PENDING_HASH_KEY = 'pending_schedule_hash';
const PENDING_FLAG_KEY = 'pending_notification';
const LAST_NOTIFIED_HASH_KEY = 'last_notified_hash';
const LAST_CHANGE_AT_KEY = 'last_schedule_change_at';
const LAST_NOTIFIED_AT_KEY = 'last_notified_at';

async function getStateValue(key: string) {
    const doc = await db.collection('system').doc('state').get();
    return doc.data()?.[key] as string | undefined;
}

async function setStateValue(key: string, value: string) {
    await db.collection('system').doc('state').set({
        [key]: value,
        updated_at: new Date().toISOString()
    }, { merge: true });
}

async function detectScheduleChange() {
    const schedule = await getScheduleFromSheet();
    if (!schedule) {
        throw new Error('Failed to fetch schedule');
    }

    const scheduleString = JSON.stringify(schedule);
    const currentHash = crypto.createHash('sha256').update(scheduleString).digest('hex');

    const lastHash = await getStateValue(LAST_HASH_KEY);

    if (lastHash === currentHash) {
        return { changed: false as const, currentHash };
    }

    await Promise.all([
        setStateValue(LAST_HASH_KEY, currentHash),
        setStateValue(PENDING_HASH_KEY, currentHash),
        setStateValue(PENDING_FLAG_KEY, 'true'),
        setStateValue(LAST_CHANGE_AT_KEY, new Date().toISOString())
    ]);

    return { changed: true as const, currentHash };
}

async function sendPushNotifications(pendingHash?: string) {
    const tokensSnapshot = await db.collection('fcm_tokens').get();

    if (tokensSnapshot.empty) {
        console.log('[Cron] No subscribers to notify.');
        await Promise.all([
            setStateValue(PENDING_FLAG_KEY, 'false'),
            setStateValue(LAST_NOTIFIED_AT_KEY, new Date().toISOString())
        ]);
        return NextResponse.json({ message: 'No subscribers, cleared pending flag' });
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.id); // tokens are stored as doc IDs

    // Create chunks of 500 tokens (FCM multicast limit)
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
                title: '[배경 알림] 하나비 스케줄 업데이트 🔔',
                body: '스케줄이 변경되었습니다. 확인해보세요!',
            },
            webpush: {
                headers: {
                    'Urgency': 'high',
                    'TTL': '86400' // 24 hours
                },
                notification: {
                    icon: '/icon-192x192.png',
                    requireInteraction: true
                }
            },
            tokens: chunk
        };

        try {
            const response = await messagingAdmin.sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;

            if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const error = resp.error;
                        if (error?.code === 'messaging/registration-token-not-registered' ||
                            error?.code === 'messaging/invalid-argument') {
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
        } catch (error) {
            console.error('Error sending multicast:', error);
        }
    }

    await Promise.all([
        setStateValue(PENDING_FLAG_KEY, 'false'),
        pendingHash ? setStateValue(LAST_NOTIFIED_HASH_KEY, pendingHash) : Promise.resolve(),
        setStateValue(LAST_NOTIFIED_AT_KEY, new Date().toISOString())
    ]);

    return NextResponse.json({
        success: true,
        message: `Notifications sent to ${successCount} devices. Failed: ${failureCount}`,
        lastHash: pendingHash
    });
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'direct'; // direct = detect + notify (old behavior), detect = flag only, notify = send if pending

    if (cronSecret) {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    } else {
        console.warn('[Cron] CRON_SECRET is not set. Endpoint is not protected.');
    }

    try {
        if (mode === 'detect') {
            console.log('[Cron] Detect mode: checking for updates.');
            const result = await detectScheduleChange();
            if (!result.changed) {
                return NextResponse.json({ message: 'No changes detected (detect mode).' });
            }
            return NextResponse.json({
                message: 'Change detected. Pending flag set.',
                hash: result.currentHash
            });
        }

        if (mode === 'notify') {
            console.log('[Cron] Notify mode: sending pending updates.');
            const pendingFlag = await getStateValue(PENDING_FLAG_KEY);
            if (pendingFlag !== 'true') {
                return NextResponse.json({ message: 'No pending notifications.' });
            }
            const pendingHash = await getStateValue(PENDING_HASH_KEY) || await getStateValue(LAST_HASH_KEY);
            return await sendPushNotifications(pendingHash);
        }

        // direct: old behavior (detect and immediately notify)
        const result = await detectScheduleChange();
        if (!result.changed) {
            return NextResponse.json({ message: 'No changes detected.' });
        }
        return await sendPushNotifications(result.currentHash);

    } catch (error) {
        console.error('[Cron] Internal error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
