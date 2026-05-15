import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const UpdateSettingsSchema = z.object({
    email: z.string().email().max(255),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const DEFAULT_EMAIL = process.env.DEFAULT_INQUIRY_EMAIL ?? '';

const getAdminClient = () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return null;
    return createClient(supabaseUrl, serviceKey);
};

export async function GET() {
    try {
        const adminClient = getAdminClient();
        if (!adminClient) {
            console.warn('GET /api/settings: Missing Service Role Key');
            return NextResponse.json({ email: DEFAULT_EMAIL });
        }

        const { data, error } = await adminClient
            .from('global_settings')
            .select('value')
            .eq('key', 'inquiry_email')
            .single();

        if (error) {
            console.error('Error fetching settings:', error);
            return NextResponse.json({ email: DEFAULT_EMAIL });
        }

        return NextResponse.json({ email: data?.value || DEFAULT_EMAIL });
    } catch (error) {
        console.error('Server error fetching settings:', error);
        return NextResponse.json({ email: DEFAULT_EMAIL }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const adminClient = getAdminClient();
    if (!adminClient) {
        console.error('[API Settings] Missing SUPABASE_SERVICE_ROLE_KEY');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.slice(7);
        const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user }, error: authError } = await userClient.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        const { checkIsAdmin } = await import('@/utils/supabase');
        const isUserAdmin = await checkIsAdmin(user.id, adminClient);

        if (!isUserAdmin) {
            console.warn(`Unauthorized settings update attempt by user: ${user.id}`);
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const rawBody = await request.json();
        const parseResult = UpdateSettingsSchema.safeParse(rawBody);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }
        const { email } = parseResult.data;

        const { error } = await adminClient
            .from('global_settings')
            .upsert({ key: 'inquiry_email', value: email });

        if (error) {
            console.error('[API Settings] DB Error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API Settings] Internal Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
