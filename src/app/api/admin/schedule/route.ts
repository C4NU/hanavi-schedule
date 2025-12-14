
import { NextResponse } from 'next/server';
import { saveScheduleToSupabase } from '@/utils/supabase';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Get Token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];

        // 2. Verify Token
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 3. (Optional) Check Role Permissions via user_roles table if strict access control needed
        // For now, any valid logged-in user is considered authorized to save (as per legacy logic)

        // Save to Supabase
        console.log(`Saving schedule... User: ${user.id} (${user.email})`);
        const success = await saveScheduleToSupabase(body);

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            console.error('Failed to save to Supabase');
            return NextResponse.json({ error: 'Failed to save to Supabase' }, { status: 500 });
        }
    } catch (error) {
        console.error('Admin save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
