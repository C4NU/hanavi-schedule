import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const subscription = await request.json();

        if (!subscription || !subscription.endpoint) {
            return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
        }

        // Save subscription to Supabase using Admin client (Bypass RLS)
        const { error } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                user_agent: request.headers.get('user-agent') || '',
            }, { onConflict: 'endpoint' });

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
