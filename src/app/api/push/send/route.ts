import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import webpush from 'web-push';
// import { getScheduleFromSheet } from '@/utils/googleSheets';

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

export async function POST(request: Request) {
    try {
        // 1. Verify Admin Secret (Simple security)
        const { secret, title, body } = await request.json();
        const adminSecret = process.env.ADMIN_SECRET;

        if (!adminSecret || secret !== adminSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Subscriptions using Admin Client (Bypass RLS)
        const { data: subscriptions, error } = await supabaseAdmin
            .from('subscriptions')
            .select('*');

        if (error || !subscriptions) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
        }

        // 3. Send Notifications
        const payload = JSON.stringify({
            title: title || '하나비 스케줄 업데이트',
            body: body || '스케줄이 업데이트되었습니다. 확인해보세요!',
            icon: '/icon-192x192.png'
        });

        const results = await Promise.allSettled(
            subscriptions.map(sub =>
                webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, payload)
                    .catch(err => {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            // Subscription expired or gone, delete from DB
                            return supabaseAdmin.from('subscriptions').delete().eq('id', sub.id);
                        }
                        throw err;
                    })
            )
        );

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.length - successCount;

        return NextResponse.json({
            success: true,
            message: `Sent to ${successCount} devices, failed ${failureCount}`
        });

    } catch (error) {
        console.error('Error sending push:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
