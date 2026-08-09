import { NextResponse } from 'next/server';
import { z } from 'zod';
import { saveScheduleToSupabase, checkIsAdmin } from '@/utils/supabase';
import { createClient } from '@supabase/supabase-js';
import { WeeklySchedule } from '@/types/schedule';

const ScheduleItemSchema = z.object({
    id: z.string().optional(),
    time: z.string(),
    content: z.string(),
    type: z.enum(['stream', 'collab', 'collab_maivi', 'collab_hanavi', 'collab_universe', 'off']).optional(),
    videoUrl: z.string().url().optional().or(z.literal('')),
    category: z.string().optional(),
    memo: z.string().optional(),
    memos: z.array(z.any()).optional(),
});

const CharacterScheduleSchema = z.object({
    id: z.string(),
    name: z.string().min(1).max(50),
    schedule: z.record(z.string(), ScheduleItemSchema),
}).passthrough();

const SaveScheduleSchema = z.object({
    weekRange: z.string().regex(/^\d{2}\.\d{2} - \d{2}\.\d{2}$/),
    characters: z.array(CharacterScheduleSchema),
});

export async function POST(request: Request) {
    try {
        const rawBody = await request.json();
        const parseResult = SaveScheduleSchema.safeParse(rawBody);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 });
        }
        const body = parseResult.data;

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

        // 3. Create Admin Client for Database Operations (Service Role Key)
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

        // 4. Check Role Permissions (Admin Only)
        const isUserAdmin = await checkIsAdmin(user.id, adminClient);
        if (!isUserAdmin) {
            console.warn(`Unauthorized attempt to save schedule by user: ${user.id}`);
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const schedule = body as unknown as WeeklySchedule;

        // Save to Supabase using Admin Client
        const success = await saveScheduleToSupabase(schedule, adminClient);

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
