import { NextResponse } from 'next/server';
import { getScheduleFromSheet } from '@/utils/googleSheets';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';
import crypto from 'crypto';

const cronSecret = process.env.CRON_SECRET;

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey
    );
}

const LAST_HASH_KEY = 'last_schedule_hash';
const PENDING_HASH_KEY = 'pending_schedule_hash';
const PENDING_FLAG_KEY = 'pending_notification';
const LAST_NOTIFIED_HASH_KEY = 'last_notified_hash';
const LAST_CHANGE_AT_KEY = 'last_schedule_change_at';
const LAST_NOTIFIED_AT_KEY = 'last_notified_at';

async function getStateValue(key: string) {
    const { data, error } = await supabaseAdmin
        .from('system_state')
        .select('value')
        .eq('key', key)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return data?.value as string | undefined;
}

async function setStateValue(key: string, value: string) {
    const { error } = await supabaseAdmin.from('system_state').upsert({
        key,
        value,
        updated_at: new Date().toISOString()
    });

    if (error) {
        throw error;
    }
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
    const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('*');

    if (subError) {
        console.error('[Cron] Failed to fetch subscriptions:', subError);
        return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
        console.log('[Cron] No subscribers to notify.');
        await Promise.all([
            setStateValue(PENDING_FLAG_KEY, 'false'),
            setStateValue(LAST_NOTIFIED_AT_KEY, new Date().toISOString())
        ]);
        return NextResponse.json({ message: 'No subscribers, cleared pending flag' });
    }

    const payload = JSON.stringify({
        title: '[배경 알림] 하나비 스케줄 업데이트 🔔',
        body: '스케줄이 변경되었습니다. 확인해보세요!',
        icon: '/icon-192x192.png'
    });

    const results = await Promise.allSettled(
        subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: sub.keys
            };
            return webpush.sendNotification(pushSubscription, payload)
                .catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        return supabaseAdmin.from('subscriptions').delete().eq('id', sub.id);
                    }
                    throw err;
                });
        })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    await Promise.all([
        setStateValue(PENDING_FLAG_KEY, 'false'),
        pendingHash ? setStateValue(LAST_NOTIFIED_HASH_KEY, pendingHash) : Promise.resolve(),
        setStateValue(LAST_NOTIFIED_AT_KEY, new Date().toISOString())
    ]);

    return NextResponse.json({
        success: true,
        message: `Notifications sent to ${successCount}/${subscriptions.length} devices`,
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
        console.log('[Cron] Direct mode: detect and notify.');
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
