import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const subscription = await request.json();

        if (!subscription || !subscription.endpoint) {
            return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
        }

        // Save subscription to Supabase
        const { error } = await supabase
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
