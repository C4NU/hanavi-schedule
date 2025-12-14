import { NextResponse } from 'next/server';
import { sendMulticastNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    try {
        // 1. Authenticate (Supabase JWT)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing token' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const bodyData = await request.json();
        const { title, body } = bodyData;

        // 2. Send Notification using shared library
        const result = await sendMulticastNotification(
            title || '하나비 스케줄 업데이트',
            body || '스케줄이 업데이트되었습니다. 확인해보세요!'
        );

        if (!result.success) {
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in manual push route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
