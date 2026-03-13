import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Helper to get admin client safely
const getAdminClient = () => {
    // Access env var at runtime
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return null;
    return createClient(supabaseUrl, serviceKey);
};

export async function GET() {
    try {
        const adminClient = getAdminClient();
        if (!adminClient) {
            // Fallback if no admin key
            console.warn('GET /api/settings: Missing Service Role Key');
            return NextResponse.json({ email: 'canu1832@gmail.com' });
        }

        const { data, error } = await adminClient
            .from('global_settings')
            .select('value')
            .eq('key', 'inquiry_email')
            .single();

        if (error) {
            console.error('Error fetching settings:', error);
            return NextResponse.json({ email: 'canu1832@gmail.com' });
        }

        return NextResponse.json({ email: data?.value || 'canu1832@gmail.com' });
    } catch (error) {
        console.error('Server error fetching settings:', error);
        return NextResponse.json({ email: 'canu1832@gmail.com' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const adminClient = getAdminClient();
    if (!adminClient) {
        console.error('[API Settings] Missing SUPABASE_SERVICE_ROLE_KEY in environment variables');
        return NextResponse.json({ error: 'Server configuration error: Service Role Key missing' }, { status: 500 });
    }

    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized: No header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user }, error: authError } = await userClient.auth.getUser();

        if (authError || !user) {
            console.error('[API Settings] Auth failed:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        // 2. Check Role Permissions (Admin Only)
        const { checkIsAdmin } = await import('@/utils/supabase');
        const isUserAdmin = await checkIsAdmin(user.id, adminClient);

        if (!isUserAdmin) {
            console.warn(`Unauthorized settings update attempt by user: ${user.id}`);
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const { error } = await adminClient
            .from('global_settings')
            .upsert({ key: 'inquiry_email', value: email });

        if (error) {
            console.error('[API Settings] DB Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API Settings] Internal Error:', error);
        // @ts-ignore
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
