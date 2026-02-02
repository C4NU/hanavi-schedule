
import { NextResponse } from 'next/server';
import { saveScheduleToSupabase } from '@/utils/supabase';
import { createClient } from '@supabase/supabase-js';

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
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        // Client for Auth Verification (Anon Key)
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        const { data: { user }, error } = await authClient.auth.getUser(token);

        if (error || !user) {
            console.error('Auth Error:', error?.message);
            return NextResponse.json({ error: 'Unauthorized: Invalid Token' }, { status: 401 });
        }

        // 3. (Optional) Check Role Permissions
        // For now, any valid logged-in user is considered authorized to save (as per legacy logic)

        // 4. Create Admin Client for Database Operations (Service Role Key)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        // Save to Supabase using Admin Client
        console.log(`Saving schedule... User: ${user.id} (${user.email})`);
        const success = await saveScheduleToSupabase(body, adminClient);

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
